import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve("apps/web/dist");
const files = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else files.push(path);
  }
}
visit(root);
const html = readFileSync(join(root, "index.html"), "utf8");
if (!html.includes("/Student-Portal/assets/") || files.length < 2) throw new Error("Pages output is missing its repository-base assets.");
for (const path of files) {
  const content = readFileSync(path, "utf8");
  if (/\/api\/v1|\/admin|postgresql:\/\/|session_token|csrfToken|DATABASE_URL/i.test(content)) {
    throw new Error("Pages output contains an application-only endpoint or configuration field: " + path.replace(root, ""));
  }
}
console.log("Read-only Pages output check passed.");
