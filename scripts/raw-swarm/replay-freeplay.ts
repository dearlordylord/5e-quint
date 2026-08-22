import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createMcpPlaySessionRoot } from "../../packages/mcp/src/composition-root.ts";
import { handleToolCall } from "../../packages/mcp/src/server.ts";

import {
  currentGitRevision,
  parsePlayerTranscript,
  repoRoot,
  sha256Canonical,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function main(): void {
  const transcriptPath = process.argv[2];
  if (transcriptPath === undefined) {
    fail("Usage: replay-freeplay.ts <freeplay-transcript.jsonl>");
  }
  const records = readFileSync(resolve(repoRoot, transcriptPath), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
  const parsed = parsePlayerTranscript(records);
  if (parsed.tag === "invalid") fail(parsed.message);
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Player replay requires a clean Git worktree");
  }
  if (parsed.value.header.gitSha !== revision.sha) {
    fail(
      `Replay requires recorded revision ${parsed.value.header.gitSha}; current checkout is ${revision.sha}`,
    );
  }

  const root = createMcpPlaySessionRoot();
  for (const exchange of parsed.value.exchanges) {
    const actual = handleToolCall(root, exchange.tool, exchange.args);
    const actualSha = sha256Canonical(actual);
    if (actualSha !== exchange.responseSha256) {
      fail(
        `DIVERGENCE at transcript seq ${exchange.seq} (${exchange.tool}): expected ${exchange.responseSha256}, received ${actualSha}`,
      );
    }
  }
  console.log(
    `Player replay deterministic: ${parsed.value.exchanges.length} tool call(s) matched recorded responses.`,
  );
}

main();
