import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: "ignore" });
} catch {
  console.log("Repository-metadata check not applicable: this publication candidate has no Git repository or history yet.");
  process.exit(0);
}

function git(args) {
  try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
}

const findings = [];
const localAuthorName = git(["config", "--local", "--get", "user.name"]);
const localAuthorEmail = git(["config", "--local", "--get", "user.email"]);
if (localAuthorName) findings.push("repository-local Git author name is configured and requires explicit public approval");
if (localAuthorEmail) findings.push("repository-local Git author email is configured and requires explicit public approval");

const allowedPublicEmail = /@(?:example\.(?:com|edu)|[^@]+\.example|users\.noreply\.github\.com)$/i;
for (const line of git(["log", "--format=%ae"]).split("\n").filter(Boolean)) {
  if (!allowedPublicEmail.test(line)) findings.push("Git history contains a non-reserved author email");
}
for (const line of git(["remote", "-v"]).split("\n").filter(Boolean)) {
  const url = line.split(/\s+/)[1] ?? "";
  if (/^(?:file:|\/|[A-Z]:\\)/i.test(url) || /https?:\/\/[^/@\s]+:[^/@\s]+@/i.test(url)) findings.push("Git remote contains a local path or embedded credentials");
}

if (findings.length) {
  console.error("Repository-metadata check failed:\n" + [...new Set(findings)].join("\n"));
  process.exitCode = 1;
} else {
  console.log("Repository-metadata check passed: no local author override, unsafe history email, or credential-bearing/local remote found.");
}
