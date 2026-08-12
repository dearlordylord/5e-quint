import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { currentGitRevision, isJsonRecord, repoRoot } from "./transcript.ts";

const transcriptInput = process.argv[2];
if (transcriptInput === undefined) {
  throw new Error("Usage: review-preflight.ts <transcript.jsonl>");
}
const firstLine = readFileSync(
  resolve(repoRoot, transcriptInput),
  "utf8",
).split("\n", 1)[0];
const header: unknown = JSON.parse(firstLine ?? "null");
if (!isJsonRecord(header) || typeof header.gitSha !== "string") {
  throw new Error("Review transcript has no recorded Git revision.");
}
const revision = currentGitRevision();
if (revision.tag === "dirty") {
  throw new Error("RAW review requires a clean Git worktree.");
}
if (revision.sha !== header.gitSha) {
  throw new Error(
    `RAW review requires recorded revision ${header.gitSha}; current checkout is ${revision.sha}.`,
  );
}
