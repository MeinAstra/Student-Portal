import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { demoAccountInput, loginInput } from "@portal/contracts";
import type { PoolClient } from "pg";
import { loadConfig, type Config } from "./config.js";
import { migrate, PgStore } from "./pg-store.js";
import { hashPassword } from "./security.js";

const seedStatements = [
  `INSERT INTO notices (id, title, summary, category, publish_date, expiry_date, visible) VALUES
    ('10000000-0000-4000-8000-000000000001', 'Library hours extended', 'The fictional campus library stays open later during project week.', 'Campus update', CURRENT_DATE, CURRENT_DATE + 14, true),
    ('10000000-0000-4000-8000-000000000002', 'Garden path maintenance', 'Use the east walkway while the demonstration map route is updated.', 'Facilities', CURRENT_DATE, CURRENT_DATE + 7, true)
   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, category = EXCLUDED.category, publish_date = EXCLUDED.publish_date, expiry_date = EXCLUDED.expiry_date, visible = EXCLUDED.visible`,
  `INSERT INTO events (id, title, description, event_date, location, category, visible) VALUES
    ('20000000-0000-4000-8000-000000000001', 'Clubs showcase', 'Explore fictional student clubs in this portfolio demonstration.', CURRENT_DATE + 10, 'Commons Hall', 'Campus life', true)
   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, event_date = EXCLUDED.event_date, location = EXCLUDED.location, category = EXCLUDED.category, visible = EXCLUDED.visible`,
  `INSERT INTO directory_entries (id, name, role, department, email, location, visible) VALUES
    ('30000000-0000-4000-8000-000000000001', 'Alex Example', 'Learning resources coordinator', 'Learning Services', 'alex@example.com', 'Learning Hub', true),
    ('30000000-0000-4000-8000-000000000002', 'Taylor Example', 'Activities coordinator', 'Student Experience', 'taylor@example.edu', 'Commons Office', true)
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department, email = EXCLUDED.email, location = EXCLUDED.location, visible = EXCLUDED.visible`,
  `INSERT INTO resources (id, title, description, category, url, visible) VALUES
    ('40000000-0000-4000-8000-000000000001', 'Technology help desk', 'Fictional walk-in support for account and device questions.', 'Campus services', '', true),
    ('40000000-0000-4000-8000-000000000002', 'Transport information', 'Example guidance for checking campus transport notices.', 'Daily life', '', true),
    ('40000000-0000-4000-8000-000000000003', 'Student handbook', 'A fictional placeholder for an institution-configured handbook.', 'Policies', '', true)
   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, url = EXCLUDED.url, visible = EXCLUDED.visible`,
  `INSERT INTO support_contacts (id, section, title, description, contact_label, url, visible) VALUES
    ('50000000-0000-4000-8000-000000000001', 'health_emergency', 'Campus health desk', 'Fictional directory entry showing where approved contact metadata could appear.', 'Example location: Wellness Building', '', true),
    ('50000000-0000-4000-8000-000000000002', 'wellbeing', 'Well-being support', 'Fictional directory entry showing where approved support metadata could appear.', 'Example hours: weekdays', '', true),
    ('50000000-0000-4000-8000-000000000003', 'community_safety', 'Community safety contact', 'Fictional directory entry showing where approved contact metadata could appear. This is not a reporting channel.', 'Example location: Welcome Desk', '', true)
   ON CONFLICT (id) DO UPDATE SET section = EXCLUDED.section, title = EXCLUDED.title, description = EXCLUDED.description, contact_label = EXCLUDED.contact_label, url = EXCLUDED.url, visible = EXCLUDED.visible`,
  `INSERT INTO campus_map (singleton, id, title, description, image_url, visible) VALUES
    (true, '60000000-0000-4000-8000-000000000001', 'Demonstration campus map', 'A fictional map configuration. No real campus locations are represented.', '', true)
   ON CONFLICT (singleton) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = EXCLUDED.image_url, visible = EXCLUDED.visible`,
  `INSERT INTO portal_status (singleton, id, message) VALUES (true, '70000000-0000-4000-8000-000000000001', '')
   ON CONFLICT (singleton) DO UPDATE SET message = EXCLUDED.message`
] as const;

async function applySeed(client: PoolClient) {
  for (const statement of seedStatements) await client.query(statement);
}

export async function seed(store: PgStore, reset: boolean) {
  const client = await store.pool.connect();
  try {
    await client.query("BEGIN");
    if (reset) {
      await client.query("TRUNCATE sessions, audit_events, notices, events, directory_entries, resources, support_contacts, feedback_forms, asset_metadata, campus_map, portal_status RESTART IDENTITY CASCADE");
    }
    await applySeed(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function readPassword(label: string): string {
  if (!stdin.isTTY) throw new Error("Run this command in an interactive terminal.");
  const result = spawnSync("/bin/bash", ["--noprofile", "--norc", "-c",
    'IFS= read -r -s -p "$1" portal_password || exit 1; printf "\\n" >&2; printf "%s" "$portal_password"',
    "portal-password", label], {
    stdio: ["inherit", "pipe", "inherit"], encoding: "utf8", env: { PATH: process.env.PATH }
  });
  if (result.error || result.status !== 0) throw new Error("Password entry cancelled or unavailable; an interactive terminal and /bin/bash are required.");
  return result.stdout;
}

async function createDemoUser(store: PgStore) {
  const prompt = createInterface({ input: stdin, output: stdout });
  const email = (await prompt.question("Fictional demo email (use a reserved example domain): ")).trim().toLowerCase();
  const displayName = (await prompt.question("Fictional display name: ")).trim();
  prompt.close();
  const identity = demoAccountInput.parse({ email, displayName });
  const password = readPassword("Password (12–200 characters; input hidden): ");
  if (!loginInput.shape.password.safeParse(password).success) throw new Error("Password must be between 12 and 200 characters.");
  const confirmation = readPassword("Confirm password (input hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  await store.createUser({ ...identity, passwordHash: hashPassword(password), roles: ["viewer", "content_admin"] });
  console.log("Local content administrator created. The plaintext password was not stored or logged.");
}

export function validateResetTarget(config: Config, confirmation: string | undefined): string {
  const message = "Reset requires local mode, a direct loopback PostgreSQL URL on port 5432, database student_campus_portal or student_campus_portal_test, and --confirm-reset=<database>.";
  let target: URL;
  try { target = new URL(config.databaseUrl); } catch { throw new Error(message); }
  const database = target.pathname.slice(1);
  if (config.writeMode !== "local" || !["postgres:", "postgresql:"].includes(target.protocol) ||
      !["127.0.0.1", "[::1]"].includes(target.hostname) || (target.port && target.port !== "5432") ||
      target.search || target.hash || !["student_campus_portal", "student_campus_portal_test"].includes(database) ||
      confirmation !== `--confirm-reset=${database}`) throw new Error(message);
  return database;
}

async function main() {
  const command = process.argv[2];
  const config = loadConfig();
  const resetDatabase = command === "reset" ? validateResetTarget(config, process.argv[3]) : undefined;
  const store = new PgStore(config.databaseUrl);
  try {
    if (command === "migrate") await migrate(store);
    else if (command === "seed") { await migrate(store); await seed(store, false); }
    else if (command === "reset") {
      const target = await store.pool.query("SELECT current_database() AS name");
      if (target.rows[0]?.name !== resetDatabase) throw new Error("Reset refused: connected database does not match the confirmed target.");
      await migrate(store); await seed(store, true);
    } else if (command === "user") { await migrate(store); await createDemoUser(store); }
    else throw new Error("Expected one of: migrate, seed, reset, user.");
  } finally { await store.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
