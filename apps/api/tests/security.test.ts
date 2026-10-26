import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import { hashPassword, sha256, verifyPassword } from "../src/security.js";

test("password hashing uses a unique salt and verifies in constant-time comparison", () => {
  const password = "a sufficiently long local passphrase";
  const first = hashPassword(password);
  const second = hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(verifyPassword(password, first), true);
  assert.equal(verifyPassword("incorrect password", first), false);
  assert.equal(first.includes(password), false);
});

test("session identifiers can be stored as fixed-length hashes", () => {
  assert.equal(sha256("opaque token").length, 64);
});

test("production refuses the local writable demo mode", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production", PORTAL_WRITE_MODE: "local" }), /startup refused/i);
  assert.throws(() => loadConfig({ NODE_ENV: " Production ", PORTAL_WRITE_MODE: "local" }), /startup refused/i);
  assert.equal(loadConfig({ NODE_ENV: "production" }).writeMode, "readonly");
});

test("network binding defaults to loopback and requires an explicit override", () => {
  assert.equal(loadConfig({}).host, "127.0.0.1");
  assert.equal(loadConfig({ HOST: "0.0.0.0" }).host, "0.0.0.0");
});
