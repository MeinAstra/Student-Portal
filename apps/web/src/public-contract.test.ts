import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./pages/PublicPages.tsx", import.meta.url), "utf8");
const linkSource = readFileSync(new URL("./components/Page.tsx", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("./pages/AdminPage.tsx", import.meta.url), "utf8");

test("external links open with opener protections", () => {
  assert.match(linkSource, /target="_blank" rel="noopener noreferrer"/);
});

test("public support pages disclose their fictional directory boundary", () => {
  assert.match(pageSource, /not a reporting route/i);
  assert.match(pageSource, /must not be used for real emergencies, counseling, or safety reporting/i);
});

test("feedback page states that responses remain outside the portal", () => {
  assert.match(pageSource, /Form responses remain outside this application/);
});

test("broken map images collapse to an availability message", () => {
  assert.match(pageSource, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(pageSource, /Configured image is currently unavailable/);
});

test("Admin mutations expose a pending state that disables action buttons", () => {
  assert.match(adminSource, /disabled=\{pending\}/);
  assert.match(adminSource, /aria-busy=\{pending\}/);
});
