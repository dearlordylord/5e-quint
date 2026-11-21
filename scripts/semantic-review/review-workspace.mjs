import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const runtime = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [operation = "status", ...args] = process.argv.slice(2);
const cwd = process.cwd();
const git = (...argv) =>
  execFileSync("git", argv, { cwd, encoding: "utf8" }).trim();
const config = JSON.parse(
  readFileSync(
    resolve(cwd, ".artifacts/semantic-review/workspace.json"),
    "utf8",
  ),
);
const snapshot = JSON.parse(readFileSync(config.snapshot, "utf8"));
if (operation === "select") {
  if (git("status", "--porcelain"))
    throw new Error(
      "Commit or preserve your changes before switching PRs; nothing was switched.",
    );
  const pr = snapshot.prs.find((item) => String(item.pr) === args[0]);
  if (!pr) throw new Error("PR is absent from the review snapshot.");
  const branch = `review/${pr.pr}-nits`;
  const exists = spawnSync(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    { cwd },
  );
  if (exists.status !== 0 && exists.status !== 1)
    throw new Error("Cannot inspect review branch.");
  git("switch", ...(exists.status === 0 ? [branch] : ["-c", branch, pr.head]));
} else if (operation === "traits" || operation === "hapsland") {
  const path = args[0];
  if (!path || !git("ls-files", "--error-unmatch", "--", path))
    throw new Error("Supply a tracked source file.");
  if (operation === "hapsland") {
    copyFileSync(
      resolve(runtime, ".hapsland.jsonc"),
      resolve(cwd, ".hapsland.jsonc"),
    );
    copyFileSync(
      resolve(runtime, ".hapsland/rules/custom/preserve-failure-meaning.jsonc"),
      resolve(cwd, ".hapsland/rules/custom/preserve-failure-meaning.jsonc"),
    );
  }
  const directory = resolve(cwd, ".artifacts/semantic-review/runs");
  mkdirSync(directory, { recursive: true });
  const receipt = resolve(
    directory,
    `${Date.now()}-${operation}-${randomUUID()}.json`,
  );
  const hash = () =>
    createHash("sha256")
      .update(readFileSync(resolve(cwd, path)))
      .digest("hex");
  const before = hash();
  const head = git("rev-parse", "HEAD");
  const branch = git("branch", "--show-current");
  const input = `${receipt}.input.json`;
  const output = `${receipt}.result.json`;
  if (operation === "traits")
    writeFileSync(input, JSON.stringify({ include: [path] }));
  const command = operation === "traits" ? process.execPath : "hapsland";
  const argv =
    operation === "traits"
      ? [
          resolve(runtime, "scripts/semantic-review/traits-client.mjs"),
          "--project",
          cwd,
          "--output",
          output,
          "check_traits",
          input,
        ]
      : ["rules", "check", "--path", path, "--line", args[1] ?? "1", "--json"];
  const result = spawnSync(command, argv, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const unchanged = before === hash() && head === git("rev-parse", "HEAD");
  const assessment =
    operation === "traits" && result.status === 0
      ? JSON.parse(readFileSync(output, "utf8"))
      : undefined;
  const assessedFile = assessment?.structuredContent?.files?.find(
    (file) => resolve(cwd, file.path) === resolve(cwd, path),
  );
  const selection =
    operation === "traits"
      ? assessedFile?.revision === `sha256:${before}`
        ? "matching-returned-revision"
        : "not-confirmed-by-response"
      : "inspect-declaration-and-analysis-in-output";
  writeFileSync(
    receipt,
    JSON.stringify(
      {
        operation,
        branch,
        head,
        path,
        sha256: before,
        unchanged,
        outcome:
          result.status === 0
            ? "completed-needs-review"
            : result.status === 6 && operation === "hapsland"
              ? "skipped-or-unavailable"
              : "tool-error",
        exitCode: result.status,
        signal: result.signal,
        error: result.error?.message,
        assessment,
        selection,
        stdout: result.stdout,
        stderr: result.stderr,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(receipt);
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exitCode = unchanged ? (result.status ?? 1) : 1;
} else if (operation !== "status") {
  throw new Error(
    "Use status, select <PR>, traits <file>, or hapsland <file> <line>.",
  );
}
console.log(
  JSON.stringify(
    {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      changes: git("status", "--short"),
      reviewPack: config.reviewPack,
      issue: config.issue,
    },
    null,
    2,
  ),
);
