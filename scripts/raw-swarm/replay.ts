import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createMcpCompositionRoot,
  handleToolCall,
} from "../../packages/mcp/src/server.ts";

import {
  parseScriptedTranscript,
  repoRoot,
  sha256Canonical,
  toolResultPayload,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function main(): void {
  const transcriptPath = process.argv[2];
  if (transcriptPath === undefined) {
    fail("Usage: replay.ts <transcript.jsonl>");
  }
  const records = readFileSync(resolve(repoRoot, transcriptPath), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
  const parsed = parseScriptedTranscript(records);
  if (parsed.tag === "invalid") fail(parsed.message);

  const root = createMcpCompositionRoot();
  let checked = 0;
  for (const step of parsed.value.steps) {
    const result = handleToolCall(root, step.tool, step.args);
    const payload = toolResultPayload(result);
    const actualSha = sha256Canonical(payload);
    checked++;
    if (actualSha !== step.responseSha256) {
      console.log(`DIVERGENCE at seq ${step.seq} (tool ${step.tool})`);
      console.log(`  expected sha256: ${step.responseSha256}`);
      console.log(`  actual   sha256: ${actualSha}`);
      console.log(
        `  expected response: ${JSON.stringify(step.response)?.slice(0, 400)}`,
      );
      console.log(
        `  actual   response: ${JSON.stringify(payload)?.slice(0, 400)}`,
      );
      process.exitCode = 1;
      return;
    }
  }
  console.log(
    `Replay deterministic: ${checked} step(s) matched recorded hashes.`,
  );
}

main();
