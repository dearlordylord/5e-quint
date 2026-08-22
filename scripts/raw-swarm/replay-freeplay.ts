import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { Either } from "effect";

import { createDndMcpProtocolServer } from "../../packages/mcp/src/protocol-server.ts";
import {
  decodePlaySessionId,
  type PlaySessionId,
} from "../../packages/mcp/src/play-session.ts";

import {
  currentGitRevision,
  isJsonRecord,
  parsePlayerTranscript,
  repoRoot,
  sha256Canonical,
  type McpToolExchange,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

export async function replayMcpExchanges(
  exchanges: readonly McpToolExchange[],
): Promise<number> {
  const recordedPlaySessionIds = successfulRecordedPlaySessionIds(exchanges);
  let nextPlaySessionId = 0;
  const { server } = createDndMcpProtocolServer(undefined, undefined, {
    playSessionIdFactory: () => {
      const recorded = recordedPlaySessionIds[nextPlaySessionId];
      if (recorded === undefined) {
        throw new Error(
          "Replay encountered more create_play_session calls than the transcript recorded.",
        );
      }
      nextPlaySessionId += 1;
      return recorded;
    },
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "raw-swarm-replay-client",
    version: "0.1.0",
  });

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    for (const exchange of exchanges) {
      if (!isJsonRecord(exchange.args)) {
        fail(
          `Replay cannot route non-object arguments for ${exchange.tool} at transcript seq ${exchange.seq}.`,
        );
      }
      const actual = await client.callTool({
        name: exchange.tool,
        arguments: exchange.args,
      });
      const actualSha = sha256Canonical(actual);
      if (actualSha !== exchange.responseSha256) {
        fail(
          `DIVERGENCE at transcript seq ${exchange.seq} (${exchange.tool}): expected ${exchange.responseSha256}, received ${actualSha}`,
        );
      }
    }
    return exchanges.length;
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}

function successfulRecordedPlaySessionIds(
  exchanges: readonly McpToolExchange[],
): readonly PlaySessionId[] {
  const recordedPlaySessionIds: PlaySessionId[] = [];
  const seen = new Set<PlaySessionId>();
  for (const exchange of exchanges) {
    if (exchange.tool !== "create_play_session") continue;
    const recordedPlaySessionId = successfulRecordedPlaySessionId(exchange);
    if (recordedPlaySessionId === undefined) continue;
    if (seen.has(recordedPlaySessionId)) {
      fail(
        `Replay cannot allocate duplicate successful Play Session handle ${recordedPlaySessionId} at transcript seq ${exchange.seq}.`,
      );
    }
    seen.add(recordedPlaySessionId);
    recordedPlaySessionIds.push(recordedPlaySessionId);
  }
  return recordedPlaySessionIds;
}

function successfulRecordedPlaySessionId(
  exchange: McpToolExchange,
): PlaySessionId | undefined {
  if (!isJsonRecord(exchange.response)) return undefined;
  if (exchange.response.isError === true || "error" in exchange.response) {
    return undefined;
  }
  const structuredContent = exchange.response.structuredContent;
  if (!isJsonRecord(structuredContent)) {
    fail(
      `Replay requires create_play_session at transcript seq ${exchange.seq} to return structuredContent.`,
    );
  }
  const decoded = decodePlaySessionId(structuredContent.playSessionId);
  if (Either.isLeft(decoded)) {
    fail(
      `Replay requires a valid Play Session handle at transcript seq ${exchange.seq}: ${decoded.left}`,
    );
  }
  return decoded.right;
}

async function main(): Promise<void> {
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

  const exchangeCount = await replayMcpExchanges(parsed.value.exchanges);
  console.log(
    `Player replay deterministic: ${exchangeCount} tool call(s) matched recorded responses.`,
  );
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
