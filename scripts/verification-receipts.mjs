import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
const RECEIPT_VERSION = 2;
export function verificationRuntime() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    const reason = result.signal
      ? `signal ${result.signal}`
      : `exit ${result.status}`;
    const error = new Error(
      `git ${args.join(" ")} failed (${reason}, pid ${result.pid}): ${result.stderr || result.error?.message || "no diagnostic output"}`,
    );
    error.exitCode =
      result.signal === "SIGKILL" || result.status === 137 ? 137 : 1;
    throw error;
  }
  return result.stdout;
}

// Tracked files always participate, even under an evidence directory.
// Untracked evidence and macOS AppleDouble metadata are outputs, not source.
export function verificationSourceFiles(root) {
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
    .filter(
      (file) =>
        file &&
        !/^(\.audit|\.artifacts)\//u.test(file) &&
        !/(^|\/)\._[^/]*$/u.test(file),
    );
  return [...new Set([...tracked, ...untracked])].sort();
}

export function verificationIndex(root) {
  return git(root, ["ls-files", "--stage", "-z"]);
}

export function verificationInputs(root, runtime = verificationRuntime()) {
  const files = verificationSourceFiles(root);
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      node: runtime.node,
      platform: runtime.platform,
      arch: runtime.arch,
      revision: git(root, ["rev-parse", "HEAD"]).trim(),
      index: verificationIndex(root),
    }),
  );
  for (const file of files) {
    hash.update(`${file}\0`);
    try {
      const stat = lstatSync(resolve(root, file));
      if (stat.isSymbolicLink()) {
        hash.update(`link:${readlinkSync(resolve(root, file))}\0`);
        continue;
      }
      if (!stat.isFile())
        throw new Error(
          `Verification source is not a regular file or symlink: ${file}`,
        );
      hash.update(`mode:${stat.mode}\0`);
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
    return value?.version === RECEIPT_VERSION &&
      typeof value.runtime?.node === "string" &&
      typeof value.runtime?.platform === "string" &&
      typeof value.runtime?.arch === "string" &&
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
    JSON.stringify(
      { ...receipt, version: RECEIPT_VERSION, runtime: verificationRuntime() },
      null,
      2,
    ) + "\n",
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
