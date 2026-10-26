import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { originalPages } from "./content.js";
import { StaticApp } from "./StaticApp.js";

test("public original edition has distinct content destinations without active contact links", () => {
  assert.deepEqual(originalPages.map((page) => page.id), ["health", "wellbeing", "safety", "daily-life"]);
  const text = JSON.stringify(originalPages);
  assert.ok(text.includes("You can ask for help before you have the right label."));
  assert.ok(text.includes("Preparing for Your Conversation (Optional)"));
  assert.ok(text.includes("Your health profile should not be public"));
  assert.doesNotMatch(text, /https?:|mailto:|@|\+86|[0-9]{3}[- ]?[0-9]{3}[- ]?[0-9]{4}/i);
});

test("static navigation provides keyboard landmarks without changing original content", () => {
  const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StaticApp)));
  assert.match(markup, /href="#static-main">Skip to main content/);
  assert.match(markup, /<main id="static-main"[^>]*tabindex="-1"/);
  assert.match(markup, /aria-controls="static-navigation"/);
});
