import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Page } from "./components/Page.js";

test("React renders content-shaped HTML as text rather than executable markup", () => {
  const payload = '<script data-example="x">alert(1)</script><img src=x onerror=alert(2)>';
  const markup = renderToStaticMarkup(<Page eyebrow={payload} title={payload} intro={payload}><p>{payload}</p></Page>);
  assert.doesNotMatch(markup, /<script data-example/);
  assert.doesNotMatch(markup, /<img src=x/);
  assert.match(markup, /&lt;script/);
  assert.match(markup, /&lt;img/);
});
