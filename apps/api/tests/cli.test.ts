import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { seed, validateResetTarget } from "../src/cli.js";
import { PgStore } from "../src/pg-store.js";

function fakeStore() {
  const queries: string[] = [];
  let released = false;
  const client = {
    async query(sql: string) { queries.push(sql); return { rows: [], rowCount: null }; },
    release() { released = true; }
  };
  const pool = { async connect() { return client; }, async end() {} } as unknown as Pool;
  return { store: new PgStore("postgresql://test.example/database", pool), queries, released: () => released };
}

test("normal seeding is idempotent and does not truncate existing demo content", async () => {
  const fake = fakeStore();
  await seed(fake.store, false);
  assert.equal(fake.queries.some((query) => query.startsWith("TRUNCATE")), false);
  assert.equal(fake.queries.filter((query) => query.includes("ON CONFLICT")).length >= 7, true);
  assert.equal(fake.queries.at(0), "BEGIN");
  assert.equal(fake.queries.at(-1), "COMMIT");
  assert.equal(fake.released(), true);
});

test("local reset clears all mutable content, sessions, and audits while preserving users", async () => {
  const fake = fakeStore();
  await seed(fake.store, true);
  const reset = fake.queries.find((query) => query.startsWith("TRUNCATE")) ?? "";
  for (const table of ["sessions", "audit_events", "feedback_forms", "asset_metadata", "support_contacts", "notices", "portal_status"]) assert.match(reset, new RegExp(`\\b${table}\\b`));
  assert.doesNotMatch(reset, /\bportal_users\b/);
  assert.doesNotMatch(reset, /\buser_roles\b/);
});

test("reset requires the exact disposable local database and explicit confirmation", () => {
  const config = { databaseUrl: "postgresql://portal_user:example@127.0.0.1:5432/student_campus_portal_test", writeMode: "local" } as Parameters<typeof validateResetTarget>[0];
  assert.equal(validateResetTarget(config, "--confirm-reset=student_campus_portal_test"), "student_campus_portal_test");
  assert.throws(() => validateResetTarget(config, undefined), /Reset requires/);
  assert.throws(() => validateResetTarget({ ...config, databaseUrl: "postgresql://portal_user:example@db.example:5432/student_campus_portal_test" }, "--confirm-reset=student_campus_portal_test"), /Reset requires/);
  assert.throws(() => validateResetTarget({ ...config, databaseUrl: "postgresql://portal_user:example@127.0.0.1:5432/other_database" }, "--confirm-reset=other_database"), /Reset requires/);
  assert.throws(() => validateResetTarget({ ...config, writeMode: "readonly" }, "--confirm-reset=student_campus_portal_test"), /Reset requires/);
});
