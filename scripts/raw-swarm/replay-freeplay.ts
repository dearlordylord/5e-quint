import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createMcpCompositionRoot,
  handleToolCall,
} from "../../packages/mcp/src/server.ts";

import {
  isMcpTranscriptStep,
  isTranscriptHeader,
  mcpToolExchanges,
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
  const [header, ...steps] = records;
  if (!isTranscriptHeader(header) || header.kind !== "freeplay") {
    fail("Freeplay replay requires a valid freeplay transcript header");
  }
  if (!steps.every(isMcpTranscriptStep)) {
    fail("Freeplay transcript contains an invalid MCP record");
  }
  const parsed = mcpToolExchanges(steps);
  if (parsed.tag === "invalid") fail(parsed.message);

  const root = createMcpCompositionRoot();
  for (const exchange of parsed.exchanges) {
    const actual = handleToolCall(root, exchange.tool, exchange.args);
    const actualSha = sha256Canonical(actual);
    if (actualSha !== exchange.responseSha256) {
      fail(
        `DIVERGENCE at transcript seq ${exchange.seq} (${exchange.tool}): expected ${exchange.responseSha256}, received ${actualSha}`,
      );
    }
  }
  console.log(
    `Freeplay replay deterministic: ${parsed.exchanges.length} tool call(s) matched recorded responses.`,
  );
}

main();
