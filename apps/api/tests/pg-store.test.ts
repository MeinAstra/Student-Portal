import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { PgStore } from "../src/pg-store.js";

test("an audit insertion failure rolls back its content mutation", async () => {
  const queries: string[] = [];
  let pendingRecord = false;
  let committedRecord = false;
  let released = false;
  const client = {
    async query(sql: string) {
      queries.push(sql);
      if (sql === "BEGIN") return { rows: [], rowCount: null };
      if (sql.startsWith("INSERT INTO feedback_forms")) {
        pendingRecord = true;
        return { rows: [{ id: "20000000-0000-4000-8000-000000000001", name: "Example", url: "https://forms.example/", visible: true }], rowCount: 1 };
      }
      if (sql.startsWith("INSERT INTO audit_events")) throw new Error("simulated audit failure");
      if (sql === "COMMIT") { committedRecord = pendingRecord; return { rows: [], rowCount: null }; }
      if (sql === "ROLLBACK") { pendingRecord = false; return { rows: [], rowCount: null }; }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() { released = true; }
  };
  const pool = { async connect() { return client; }, async end() {} } as unknown as Pool;
  const store = new PgStore("postgresql://test.example/database", pool);
  await assert.rejects(
    store.create("feedbackForms", { name: "Example", url: "https://forms.example/", visible: true }, { actorUserId: "10000000-0000-4000-8000-000000000001", action: "create", entityType: "feedbackForms", requestId: "30000000-0000-4000-8000-000000000001" }),
    /simulated audit failure/
  );
  assert.equal(committedRecord, false);
  assert.equal(pendingRecord, false);
  assert.equal(queries.includes("ROLLBACK"), true);
  assert.equal(queries.includes("COMMIT"), false);
  assert.equal(released, true);
});

test("replacing a local user revokes sessions in the same transaction", async () => {
  const queries: string[] = [];
  const client = {
    async query(sql: string) {
      queries.push(sql);
      if (sql.startsWith("INSERT INTO portal_users")) return { rows: [{ id: "10000000-0000-4000-8000-000000000001" }] };
      return { rows: [] };
    },
    release() {}
  };
  const pool = { async connect() { return client; }, async end() {} } as unknown as Pool;
  await new PgStore("postgresql://test.example/database", pool).createUser({
    email: "demo@example.com", displayName: "Demo", passwordHash: "fake-hash", roles: ["viewer"]
  });
  const revoke = queries.findIndex((sql) => sql.startsWith("DELETE FROM sessions"));
  assert.equal(queries[0], "BEGIN");
  assert.equal(revoke > 0 && revoke < queries.indexOf("COMMIT"), true);
});
