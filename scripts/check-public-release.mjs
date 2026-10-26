import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { URL } from "node:url";

const root = resolve(".");
const excludedDirectories = new Set(["node_modules", "dist", ".git"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".sql", ".yml", ".yaml", ".example"]);
const blockedContent = [
  ["vendor-shaped product identifier", /\b[A-Z][A-Za-z]{3,}[0-9]{2,}\b/],
  ["vendor SDK-shaped reference", /(?:(?:\bfrom\s+|\bimport\s+|\brequire\s*\()\s*["'][a-z@][a-z0-9_./-]*[a-z-]+[0-9]{2,}[a-z0-9_./-]*["']|\b[A-Z][A-Za-z]+[0-9]{2,}\s+SDK\b)/],
  ["institution-shaped package name", /\b[a-z]{2,8}-student-portal\b/i],
  ["archive reference", /\b[a-z0-9._-]+\.zip\b/i],
  ["tenant configuration", /tenant[_ -]?id/i],
  ["hidden tool artifact path", /(?:^|[\\/])\.[a-z0-9_-]+[\\/](?:attachments|sessions)[\\/]/i],
  ["temporary capture artifact", /(?:TemporaryItems|screencaptureui|screenshot[ _-]20\d{2})/i],
  ["private absolute path", /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Z]:\\Users\\[^\\\s]+)/],
  ["SHA-256-like identifier", /\b[a-f0-9]{64}\b/i],
  ["private-key material", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["credential-shaped assignment", /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'](?!YOUR_|<REDACTED>)[^"'\s]+["']/i]
];
const blockedFileNames = /(?:screenshot|\.zip$|\.pem$|\.key$|\.p12$|\.tsbuildinfo$)/i;
const allowedEmail = /@(?:example\.(?:com|edu)|[^@]+\.example)$/i;
const allowedAcronyms = new Set(["API", "CSP", "DOM", "GET", "PUT", "SCP", "SHA", "SQL", "TLS", "TTY", "URL", "UTF"]);
const allowedHosts = new Set(["127.0.0.1", "localhost", "example.com", "example.edu", "registry.npmjs.org"]);
const findings = [];

function isIgnored(relativePath) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", relativePath], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    if (existsSync(join(root, ".git"))) return false;
    const patterns = readFileSync(join(root, ".gitignore"), "utf8").split("\n");
    return relativePath.endsWith(".tsbuildinfo") && patterns.includes("*.tsbuildinfo");
  }
}

function checkContent(path) {
  const relativePath = relative(root, path);
  if (relativePath === "scripts/check-public-release.mjs") return;
  const content = readFileSync(path, "utf8");
  for (const [category, pattern] of blockedContent) {
    if (relativePath === "package-lock.json" && category.startsWith("vendor")) continue;
    if (pattern.test(content)) findings.push(`${relativePath}: ${category}`);
  }
  for (const email of content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
    if (!allowedEmail.test(email)) findings.push(`${relativePath}: non-reserved email address`);
  }
  if (/\.(?:md|html|tsx)$/.test(relativePath)) {
    for (const acronym of content.match(/\b[A-Z]{3}\b/g) ?? []) {
      if (!allowedAcronyms.has(acronym)) findings.push(`${relativePath}: unapproved three-letter acronym`);
    }
  }
  if (relativePath === "package-lock.json") return;
  for (const candidate of content.match(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)]+/gi) ?? []) {
    try {
      const hostname = new URL(candidate).hostname.toLowerCase();
      if (!allowedHosts.has(hostname) && !hostname.endsWith(".example")) findings.push(`${relativePath}: unapproved external host`);
    } catch {
      findings.push(`${relativePath}: malformed HTTPS URL literal`);
    }
  }
}

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    const relativePath = relative(root, path);
    if (entry.isDirectory()) visit(path);
    else {
      if (entry.name.startsWith(".env") && entry.name !== ".env.example" && !isIgnored(relativePath)) findings.push(`${relativePath}: unignored local environment file`);
      if (blockedFileNames.test(entry.name) && !isIgnored(relativePath)) findings.push(`${relativePath}: unignored blocked release filename`);
      if (textExtensions.has(extname(entry.name)) || entry.name === ".env.example") checkContent(path);
    }
  }
}

visit(root);
try {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
  for (const path of tracked) {
    if (/^(?:\.env(?:\.|$)|.*\.tsbuildinfo$|.*(?:screenshot|\.zip$|\.pem$|\.key$|\.p12$))/i.test(path) && path !== ".env.example") {
      findings.push(`${path}: unsafe tracked metadata or artifact`);
    }
  }
} catch {
  // The content scan remains useful outside a Git worktree.
}

if (findings.length) {
  console.error("Public-release check failed:\n" + [...new Set(findings)].join("\n"));
  process.exitCode = 1;
} else {
  console.log("Public-release check passed: no blocked identifiers, private paths, credentials, or unsafe release artifacts found.");
}
