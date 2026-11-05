import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Load the policy from the read-only snapshot, not from the writable workspace.
const { verificationInputs, verificationRuntime } =
  await import("file:///input/scripts/verification-receipts.mjs");

export function verifyFrozenSource(input, phase) {
  if (
    !input.sourceRuntime ||
    Object.keys(verificationRuntime()).some(
      (key) => typeof input.sourceRuntime[key] !== "string",
    )
  )
    throw new Error(
      "Frozen input is missing its source fingerprint environment",
    );
  const actual = verificationInputs("/workspace", input.sourceRuntime);
  appendFileSync(
    "/output/source-verification.jsonl",
    JSON.stringify({
      phase,
      expected: input.sourceSha256,
      actual,
      matches: actual === input.sourceSha256,
    }) + "\n",
  );
  if (actual !== input.sourceSha256) {
    const diagnostic = spawnSync("git", ["diff", "--stat", "HEAD"], {
      cwd: "/workspace",
      encoding: "utf8",
    });
    appendFileSync(
      "/output/source-diff.txt",
      diagnostic.stdout ||
        diagnostic.stderr ||
        "No tracked content diff; inspect source fingerprint metadata.\n",
    );
    console.error(diagnostic.stdout || diagnostic.stderr);
    throw new Error(
      `Frozen source changed during ${phase}; this run cannot qualify the original checkout`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const input = JSON.parse(readFileSync("/job/input.json", "utf8"));
    verifyFrozenSource(input, process.argv[2] ?? "preparation");
  } catch (error) {
    console.error(error.message);
    process.exitCode = error?.exitCode === 137 ? 137 : 1;
  }
}
