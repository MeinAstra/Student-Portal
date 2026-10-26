import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(".env");
if (existsSync(target)) {
  console.error(".env already exists; no changes made.");
  process.exitCode = 1;
} else {
  const password = randomBytes(24).toString("base64url");
  const encoded = encodeURIComponent(password);
  writeFileSync(target, [
    `DATABASE_URL=postgresql://portal_user:${encoded}@127.0.0.1:5432/student_campus_portal`,
    `POSTGRES_PASSWORD=${password}`,
    "HOST=127.0.0.1",
    "PORT=3000",
    "PORTAL_WRITE_MODE=local",
    "SESSION_COOKIE_SECURE=false",
    "ALLOWED_ORIGIN=http://localhost:5173",
    ""
  ].join("\n"), { mode: 0o600 });
  console.log("Created .env with locally generated database credentials. Values were not printed.");
}
