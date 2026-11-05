import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Git failed");
  return result.stdout;
}

// Tracked files always participate, even under an evidence directory.
// Untracked evidence is output, not source. All other unignored files participate.
export function verificationInputs(root) {
  const tracked = git(root, ["ls-files", "-z", "--cached"])
    .split("\0")
    .filter(Boolean);
  const untracked = git(root, [
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
  ])
    .split("\0")
    .filter((file) => file && !/^(\.audit|\.artifacts)\//u.test(file));
  const files = [...new Set([...tracked, ...untracked])].sort();
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      revision: git(root, ["rev-parse", "HEAD"]).trim(),
    }),
  );
  for (const file of files) {
    hash.update(`${file}\0`);
    try {
      hash.update(`mode:${lstatSync(resolve(root, file)).mode}\0`);
      const bytes = readFileSync(resolve(root, file));
      hash.update(`present:${bytes.length}\0`);
      hash.update(bytes);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("absent\0");
    }
  }
  return hash.digest("hex");
}

export function readReceipt(path) {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return value?.version === 1 &&
      typeof value.inputSha256 === "string" &&
      typeof value.inputsStable === "boolean" &&
      Array.isArray(value.plan) &&
      value.plan.every(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.command === "string" &&
          Array.isArray(entry.args) &&
          entry.args.every((arg) => typeof arg === "string") &&
          Array.isArray(entry.prerequisites) &&
          entry.prerequisites.every((id) => typeof id === "string"),
      ) &&
      Array.isArray(value.outcomes) &&
      value.outcomes.every(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          ["PASS", "FAIL", "BLOCKED"].includes(entry.status),
      )
      ? value
      : null;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export function writeReceipt(path, receipt) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({ version: 1, ...receipt }, null, 2) + "\n",
  );
}

export function receiptCoversSourceCheck(receipt, fingerprint, check) {
  return (
    receipt?.inputsStable === true &&
    receipt.inputSha256 === fingerprint &&
    receipt.plan?.some(
      (entry) => JSON.stringify(entry) === JSON.stringify(check),
    ) &&
    receipt.outcomes.some(
      (entry) => entry.id === check.id && entry.status === "PASS",
    )
  );
}
