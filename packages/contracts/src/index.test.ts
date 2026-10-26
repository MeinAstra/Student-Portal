import assert from "node:assert/strict";
import test from "node:test";
import { demoAccountInput, feedbackFormInput, noticeInput, safeExternalUrl } from "./index.js";

test("external links require HTTPS", () => {
  assert.equal(safeExternalUrl.safeParse("https://forms.example/feedback").success, true);
  for (const value of ["http://example.test", "javascript:alert(1)", "data:text/plain,x", "file:///tmp/x", "not a url"]) {
    assert.equal(safeExternalUrl.safeParse(value).success, false, value);
  }
});

test("external links are canonical and cannot contain credentials", () => {
  assert.equal(safeExternalUrl.parse("HTTPS://EXAMPLE.COM/resource"), "https://example.com/resource");
  assert.equal(safeExternalUrl.safeParse("https://user:password@example.com/resource").success, false);
  assert.equal(safeExternalUrl.safeParse("//example.com/resource").success, false);
});

test("feedback form metadata is constrained to name, URL, and visibility", () => {
  assert.equal(feedbackFormInput.safeParse({ name: "General feedback", url: "https://forms.example/feedback", visible: true }).success, true);
  assert.equal(feedbackFormInput.safeParse({ name: "General feedback", url: "https://forms.example/feedback", visible: true, responses: [] }).success, false);
});

test("notices reject invalid date formats", () => {
  const result = noticeInput.safeParse({ title: "Library hours", summary: "Extended this week.", category: "Campus", publishDate: "next week", visible: true });
  assert.equal(result.success, false);
});

test("notice expiry cannot precede its publish date", () => {
  const result = noticeInput.safeParse({ title: "Library hours", summary: "Extended this week.", category: "Campus", publishDate: "2026-09-05", expiryDate: "2026-09-04", visible: true });
  assert.equal(result.success, false);
});

test("demo account identities require reserved domains and non-empty names", () => {
  assert.equal(demoAccountInput.safeParse({ email: "admin@demo.example", displayName: "Admin Example" }).success, true);
  assert.equal(demoAccountInput.safeParse({ email: "not-an-email.example", displayName: "Admin Example" }).success, false);
  assert.equal(demoAccountInput.safeParse({ email: ["admin", "non-example.invalid"].join("@"), displayName: "Admin Example" }).success, false);
  assert.equal(demoAccountInput.safeParse({ email: "admin@example.com", displayName: "" }).success, false);
});
