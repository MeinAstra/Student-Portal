import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";
import type { CollectionName, PublicContent, Role } from "@portal/contracts";
import { createApp } from "../src/app.js";
import { hashPassword, sha256 } from "../src/security.js";
import type { AuditContext, AuthUser, SessionRecord, Store } from "../src/store.js";

const origin = "http://localhost:5173";
const adminId = "10000000-0000-4000-8000-000000000001";
const viewerId = "10000000-0000-4000-8000-000000000002";
const password = randomBytes(24).toString("base64url");

class MemoryStore implements Store {
  users = new Map<string, AuthUser>();
  sessions = new Map<string, SessionRecord>();
  records = new Map<CollectionName, Array<Record<string, unknown>>>();
  audits: Array<{ action: string; entityType: string; entityId: string }> = [];
  ready = true;
  sessionLookupFails = false;

  constructor() {
    this.users.set("admin@campus.example", { id: adminId, email: "admin@campus.example", displayName: "Demo Admin", passwordHash: hashPassword(password), roles: ["viewer", "content_admin"], active: true });
    this.users.set("viewer@campus.example", { id: viewerId, email: "viewer@campus.example", displayName: "Demo Viewer", passwordHash: hashPassword(password), roles: ["viewer"], active: true });
  }
  async readiness() { if (!this.ready) throw new Error("Database unavailable"); }
  async publicContent(): Promise<PublicContent> { return { notices: [], events: [], directory: [], resources: [], support: [], feedbackForms: [], assets: [], campusMap: null, portalStatus: null }; }
  async list(collection: CollectionName) { return this.records.get(collection) ?? []; }
  async create(collection: CollectionName, input: Record<string, unknown>, audit: AuditContext) {
    const record = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.records.set(collection, [...(this.records.get(collection) ?? []), record]); this.audits.push({ ...audit, entityId: String(record.id) }); return record;
  }
  async update(collection: CollectionName, id: string, input: Record<string, unknown>, audit: AuditContext) {
    const existing = (this.records.get(collection) ?? []).find((item) => item.id === id);
    if (!existing) return null;
    Object.assign(existing, input); this.audits.push({ ...audit, entityId: id }); return existing;
  }
  async remove(collection: CollectionName, id: string, audit: AuditContext) {
    const records = this.records.get(collection) ?? [];
    const removed = records.some((item) => item.id === id); this.records.set(collection, records.filter((item) => item.id !== id));
    if (removed) this.audits.push({ ...audit, entityId: id }); return removed;
  }
  async updateSingleton(_name: "campusMap" | "portalStatus", input: Record<string, unknown>, audit: AuditContext) { const record = { id: "30000000-0000-4000-8000-000000000001", ...input }; this.audits.push({ ...audit, entityId: String(record.id) }); return record; }
  async findUserByEmail(email: string) { return this.users.get(email) ?? null; }
  async createUser(input: { email: string; displayName: string; passwordHash: string; roles: Role[] }) { this.users.set(input.email, { id: adminId, active: true, ...input }); }
  async createSession(input: { idHash: string; userId: string; csrfHash: string; expiresAt: Date }) {
    const user = [...this.users.values()].find((candidate) => candidate.id === input.userId)!;
    this.sessions.set(input.idHash, { user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles }, csrfHash: input.csrfHash, expiresAt: input.expiresAt });
  }
  async getSession(idHash: string) {
    if (this.sessionLookupFails) throw new Error("Session database unavailable");
    const session = this.sessions.get(idHash);
    return session && session.expiresAt > new Date() ? session : null;
  }
  async deleteSession(idHash: string) { this.sessions.delete(idHash); }
  async listAuditEvents(limit: number) { return this.audits.slice(-limit).reverse(); }
  async close() {}
}

function config(writeMode: "readonly" | "local" = "local") {
  return { databaseUrl: "unused", host: "127.0.0.1", port: 3000, writeMode, secureCookie: false, allowedOrigin: origin, nodeEnv: "test" } as const;
}

async function login(agent: ReturnType<typeof request.agent>, email = "admin@campus.example") {
  const response = await agent.post("/api/v1/auth/login").set("Origin", origin).send({ email, password });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, email);
  return response.body.csrfToken as string;
}

test("public content is available without a session", async () => {
  const response = await request(createApp(new MemoryStore(), config())).get("/api/v1/content");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.feedbackForms, []);
  assert.match(String(response.headers["content-security-policy"]), /frame-ancestors 'none'/);
  assert.doesNotMatch(String(response.headers["content-security-policy"]), /img-src[^;]*data:/);
  assert.equal(response.headers["permissions-policy"], "camera=(), microphone=(), geolocation=()");
  assert.equal(response.headers["strict-transport-security"], undefined);
});

test("production headers enable HSTS while production remains read-only", async () => {
  const response = await request(createApp(new MemoryStore(), { ...config("readonly"), nodeEnv: "production", secureCookie: true })).get("/api/v1/health");
  assert.equal(response.status, 200);
  assert.match(String(response.headers["strict-transport-security"]), /max-age=31536000/);
});

test("health endpoints bypass session lookup and readiness reflects storage", async () => {
  const store = new MemoryStore();
  store.sessionLookupFails = true;
  const app = createApp(store, config());
  assert.equal((await request(app).get("/api/v1/health/live").set("Cookie", "portal_session=example")).status, 200);
  assert.equal((await request(app).get("/api/v1/health/ready").set("Cookie", "portal_session=example")).status, 200);
  store.ready = false;
  assert.equal((await request(app).get("/api/v1/health/ready")).status, 503);
  assert.equal((await request(app).get("/api/v1/health/live")).status, 200);
});

test("auth errors remain uncached before origin rejection", async () => {
  const response = await request(createApp(new MemoryStore(), config())).post("/api/v1/auth/login").set("Origin", "http://unauthorized.example").send({});
  assert.equal(response.status, 403);
  assert.equal(response.headers["cache-control"], "no-store");
});

test("request logs omit untrusted paths and failures retain the request ID", async () => {
  const lines: string[] = [];
  const errors: string[] = [];
  const originalInfo = console.info;
  const originalError = console.error;
  console.info = (value: string) => { lines.push(value); };
  console.error = (value: string) => { errors.push(value); };
  try {
    const store = new MemoryStore();
    const app = createApp(store, config());
    const missing = await request(app).get("/api/v1/private-marker");
    assert.equal(missing.status, 404);
    assert.equal(lines.some((line) => line.includes("private-marker")), false);
    store.publicContent = async () => { throw new Error("private-database-marker"); };
    const failed = await request(app).get("/api/v1/content");
    assert.equal(failed.status, 500);
    assert.equal(errors.some((line) => line.includes("private-database-marker")), false);
    assert.equal(errors.some((line) => line.includes(String(failed.headers["x-request-id"]))), true);
  } finally {
    console.info = originalInfo;
    console.error = originalError;
  }
});

test("read-only mode fails closed for demo login", async () => {
  const store = new MemoryStore();
  const response = await request(createApp(store, config("readonly"))).post("/api/v1/auth/login").set("Origin", origin).send({ email: "admin@campus.example", password });
  assert.equal(response.status, 403);
  const user = store.users.get("admin@campus.example")!;
  store.sessions.set(sha256("existing-session"), { user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles }, csrfHash: sha256("csrf"), expiresAt: new Date(Date.now() + 60_000) });
  const hiddenAdminData = await request(createApp(store, config("readonly"))).get("/api/v1/admin/notices").set("Cookie", "portal_session=existing-session");
  assert.equal(hiddenAdminData.status, 403);
});

test("admin mutations require authentication, role, origin, and CSRF", async () => {
  const store = new MemoryStore();
  const app = createApp(store, config());
  const unauthenticated = await request(app).post("/api/v1/admin/feedbackForms").set("Origin", origin).send({ name: "General feedback", url: "https://forms.example/general", visible: true });
  assert.equal(unauthenticated.status, 401);

  const viewer = request.agent(app);
  const viewerCsrf = await login(viewer, "viewer@campus.example");
  const forbidden = await viewer.post("/api/v1/admin/feedbackForms").set("Origin", origin).set("X-CSRF-Token", viewerCsrf).send({ name: "General feedback", url: "https://forms.example/general", visible: true });
  assert.equal(forbidden.status, 403);

  const admin = request.agent(app);
  await login(admin);
  const missingCsrf = await admin.post("/api/v1/admin/feedbackForms").set("Origin", origin).send({ name: "General feedback", url: "https://forms.example/general", visible: true });
  assert.equal(missingCsrf.status, 403);
  const wrongOrigin = await admin.post("/api/v1/admin/feedbackForms").set("Origin", "https://attacker.example").send({ name: "General feedback", url: "https://forms.example/general", visible: true });
  assert.equal(wrongOrigin.status, 403);
});

test("expired, malformed, and client-forged sessions cannot reach Admin data", async () => {
  const store = new MemoryStore();
  const user = store.users.get("admin@campus.example")!;
  store.sessions.set(sha256("expired"), { user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles }, csrfHash: sha256("csrf"), expiresAt: new Date(Date.now() - 1) });
  const app = createApp(store, config());
  const expired = await request(app).get("/api/v1/admin/notices").set("Cookie", "portal_session=expired");
  assert.equal(expired.status, 401);
  const malformed = await request(app).get("/api/v1/admin/notices").set("Cookie", "portal_session=%E0%A4%A");
  assert.equal(malformed.status, 401);
  const forged = await request(app).get("/api/v1/admin/notices").set("Cookie", `portal_session=${Buffer.from(JSON.stringify({ roles: ["content_admin"] })).toString("base64url")}`);
  assert.equal(forged.status, 401);
});

test("malformed, oversized, and unknown API requests fail with bounded responses", async () => {
  const app = createApp(new MemoryStore(), config());
  const malformed = await request(app).post("/api/v1/auth/login").set("Origin", origin).set("Content-Type", "application/json").send("{");
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, "Malformed JSON request body.");
  const oversized = await request(app).post("/api/v1/auth/login").set("Origin", origin).set("Content-Type", "application/json").send(JSON.stringify({ email: "admin@campus.example", password: "x".repeat(40_000) }));
  assert.equal(oversized.status, 413);
  const unknown = await request(app).get("/api/v1/does-not-exist");
  assert.equal(unknown.status, 404);
  assert.deepEqual(unknown.body, { error: "Not found." });
});

test("login rate limiting bounds repeated password attempts", async () => {
  const app = createApp(new MemoryStore(), config());
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await request(app).post("/api/v1/auth/login").set("Origin", origin).send({ email: "admin@campus.example", password: "incorrect password example" });
    assert.equal(response.status, 401);
  }
  const limited = await request(app).post("/api/v1/auth/login").set("Origin", origin).send({ email: "admin@campus.example", password: "incorrect password example" });
  assert.equal(limited.status, 429);
});

test("logout invalidates the server session and clears both cookies", async () => {
  const agent = request.agent(createApp(new MemoryStore(), config()));
  const csrf = await login(agent);
  assert.equal((await agent.get("/api/v1/admin/notices")).status, 200);
  const logout = await agent.post("/api/v1/auth/logout").set("Origin", origin).set("X-CSRF-Token", csrf);
  assert.equal(logout.status, 204);
  assert.equal((await agent.get("/api/v1/admin/notices")).status, 401);
  const cleared = logout.headers["set-cookie"] as unknown as string[];
  assert.equal(cleared.filter((value) => /portal_(?:session|csrf)=;/.test(value)).length, 2);
});

test("validated admin CRUD records an audit event without request bodies", async () => {
  const store = new MemoryStore();
  const agent = request.agent(createApp(store, config()));
  const csrf = await login(agent);
  const unsafe = await agent.post("/api/v1/admin/feedbackForms").set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "Unsafe", url: "javascript:alert(1)", visible: true });
  assert.equal(unsafe.status, 400);
  const massAssignment = await agent.post("/api/v1/admin/feedbackForms").set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "Extra field", url: "https://forms.example/extra", visible: true, responses: ["must not be stored"] });
  assert.equal(massAssignment.status, 400);

  const created = await agent.post("/api/v1/admin/feedbackForms").set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "General feedback", url: "https://forms.example/general", visible: true });
  assert.equal(created.status, 201);
  assert.equal(store.audits[0]?.action, "create");
  assert.deepEqual(Object.keys(store.audits[0]!).sort(), ["action", "actorUserId", "entityId", "entityType", "requestId"]);
  assert.equal(JSON.stringify(store.audits[0]).includes("forms.example"), false);

  const session = await agent.get("/api/v1/auth/session");
  assert.equal(session.body.user.roles.includes("content_admin"), true);
  assert.equal(typeof session.body.csrfToken, "string");
  assert.equal(session.headers["cache-control"], "no-store");

  const injectionShaped = await agent.post("/api/v1/admin/resources").set("Origin", origin).set("X-CSRF-Token", csrf).send({ title: "<script>alert(1)</script>", description: "Example'); DROP TABLE resources; --", category: "Test", url: "", visible: true });
  assert.equal(injectionShaped.status, 201);
  assert.equal(injectionShaped.body.title, "<script>alert(1)</script>");
  assert.equal(store.audits.some((event) => JSON.stringify(event).includes("DROP TABLE")), false);

  const updated = await agent.put(`/api/v1/admin/feedbackForms/${created.body.id}`).set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "General feedback", url: "https://forms.example/general", visible: false });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.visible, false);
  assert.equal(store.audits[2]?.action, "update");

  const duplicateUpdate = await agent.put(`/api/v1/admin/feedbackForms/${created.body.id}`).set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "General feedback", url: "https://forms.example/general", visible: false });
  assert.equal(duplicateUpdate.status, 200);
  assert.equal((await store.list("feedbackForms")).length, 1);

  const auditList = await agent.get("/api/v1/admin/audit-events");
  assert.equal(auditList.status, 200);
  assert.equal(auditList.body.length, 4);

  const invalidId = await agent.put("/api/v1/admin/feedbackForms/not-a-uuid").set("Origin", origin).set("X-CSRF-Token", csrf).send({ name: "General feedback", url: "https://forms.example/general", visible: false });
  assert.equal(invalidId.status, 400);

  const deleted = await agent.delete(`/api/v1/admin/feedbackForms/${created.body.id}`).set("Origin", origin).set("X-CSRF-Token", csrf);
  assert.equal(deleted.status, 204);
  assert.equal(store.audits[4]?.action, "delete");
});

test("secure session cookie flags are set when secure cookies are configured", async () => {
  const response = await request(createApp(new MemoryStore(), { ...config(), secureCookie: true })).post("/api/v1/auth/login").set("Origin", origin).send({ email: "admin@campus.example", password });
  assert.equal(response.status, 200);
  const cookies = response.headers["set-cookie"] as unknown as string[];
  const session = cookies.find((value) => value.startsWith("portal_session=")) ?? "";
  const csrf = cookies.find((value) => value.startsWith("portal_csrf=")) ?? "";
  assert.match(session, /HttpOnly/); assert.match(session, /Secure/); assert.match(session, /SameSite=Lax/);
  assert.doesNotMatch(csrf, /HttpOnly/); assert.match(csrf, /Secure/); assert.match(csrf, /SameSite=Strict/);
});
