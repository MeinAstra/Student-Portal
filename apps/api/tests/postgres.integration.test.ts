import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { migrate, PgStore } from "../src/pg-store.js";
import { hashPassword } from "../src/security.js";

const databaseUrl = process.env.PORTAL_TEST_DATABASE_URL;
const isIsolatedTestDatabase = databaseUrl ? new URL(databaseUrl).pathname.endsWith("_test") : false;
const origin = "http://localhost:5173";

function dateFromToday(offset: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("PostgreSQL enforces visibility, expiry, and parameterized content storage", { skip: !isIsolatedTestDatabase }, async () => {
  const store = new PgStore(databaseUrl!);
  await migrate(store);
  const password = randomBytes(24).toString("base64url");
  await store.createUser({ email: "admin@integration.example", displayName: "Integration Admin Example", passwordHash: hashPassword(password), roles: ["viewer", "content_admin"] });
  const app = createApp(store, { databaseUrl: databaseUrl!, host: "127.0.0.1", port: 3000, writeMode: "local", secureCookie: false, allowedOrigin: origin, nodeEnv: "test" });
  const agent = request.agent(app);
  const login = await agent.post("/api/v1/auth/login").set("Origin", origin).send({ email: "admin@integration.example", password });
  assert.equal(login.status, 200);
  const csrf = login.body.csrfToken as string;
  const marker = randomUUID().slice(0, 8);

  const notices = [
    { title: `Visible ${marker}`, summary: "Current fictional content.", category: "Test", publishDate: dateFromToday(-1), expiryDate: dateFromToday(1), imageUrl: "", visible: true },
    { title: `Hidden ${marker}`, summary: "Hidden fictional content.", category: "Test", publishDate: dateFromToday(-1), expiryDate: dateFromToday(1), imageUrl: "", visible: false },
    { title: `Expired ${marker}`, summary: "Expired fictional content.", category: "Test", publishDate: dateFromToday(-2), expiryDate: dateFromToday(-1), imageUrl: "", visible: true }
  ];
  for (const notice of notices) {
    const response = await agent.post("/api/v1/admin/notices").set("Origin", origin).set("X-CSRF-Token", csrf).send(notice);
    assert.equal(response.status, 201);
  }

  const shapedTitle = `Example ${marker}'); DROP TABLE resources; --`;
  const sqlShaped = await agent.post("/api/v1/admin/resources").set("Origin", origin).set("X-CSRF-Token", csrf).send({ title: shapedTitle, description: "Stored as plain content.", category: "Test", url: "", visible: true });
  assert.equal(sqlShaped.status, 201);
  const publicContent = await agent.get("/api/v1/content");
  const titles = publicContent.body.notices.map((item: { title: string }) => item.title) as string[];
  assert.equal(titles.includes(`Visible ${marker}`), true);
  assert.equal(titles.includes(`Hidden ${marker}`), false);
  assert.equal(titles.includes(`Expired ${marker}`), false);
  assert.equal(publicContent.body.resources.some((item: { title: string }) => item.title === shapedTitle), true);
  await store.close();
});
