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
  GUEST_INACTIVITY_RETENTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
  decodeGuestAccessGrant,
  decodeEpochMilliseconds,
  type EpochMilliseconds,
  type GuestAccessGrant,
} from "../../packages/mcp/src/play-session-access.ts";

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
  const recordedGuestAccessGrants =
    successfulRecordedGuestAccessGrants(exchanges);
  let nextPlaySessionId = 0;
  let nextGuestAccessGrant = 0;
  const initialReplayTime = decodeEpochMilliseconds(0);
  if (Either.isLeft(initialReplayTime)) {
    throw new Error(initialReplayTime.left.message);
  }
  let replayTime = initialReplayTime.right;
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
    guestAccessGrantFactory: () => {
      const recorded = recordedGuestAccessGrants[nextGuestAccessGrant];
      if (recorded === undefined) {
        throw new Error(
          "Replay encountered more anonymous create_play_session calls than the transcript recorded.",
        );
      }
      nextGuestAccessGrant += 1;
      return recorded;
    },
    playSessionNow: () => replayTime,
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
      const recordedTime = recordedActivityTime(exchange.response);
      if (recordedTime !== undefined) replayTime = recordedTime;
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

function recordedActivityTime(
  response: unknown,
): EpochMilliseconds | undefined {
  if (!isJsonRecord(response)) return undefined;
  const structuredContent = response.structuredContent;
  if (!isJsonRecord(structuredContent)) return undefined;
  const tenure = structuredContent.tenure;
  if (!isJsonRecord(tenure)) return undefined;
  const retentionMilliseconds =
    tenure.tag === "guest"
      ? GUEST_INACTIVITY_RETENTION_MS
      : tenure.tag === "saved"
        ? SAVED_INACTIVITY_RETENTION_MS
        : undefined;
  if (
    retentionMilliseconds === undefined ||
    typeof tenure.inactiveExpiresAt !== "string"
  ) {
    return undefined;
  }
  const inactiveExpiresAt = Date.parse(tenure.inactiveExpiresAt);
  if (!Number.isFinite(inactiveExpiresAt)) {
    fail("Replay encountered an invalid Play Session inactivity timestamp.");
  }
  const decoded = decodeEpochMilliseconds(
    inactiveExpiresAt - retentionMilliseconds,
  );
  if (Either.isLeft(decoded)) {
    fail(
      `Replay encountered an invalid Play Session activity time: ${decoded.left.message}`,
    );
  }
  return decoded.right;
}

function successfulRecordedGuestAccessGrants(
  exchanges: readonly McpToolExchange[],
): readonly GuestAccessGrant[] {
  return exchanges.flatMap((exchange) => {
    if (exchange.tool !== "create_play_session") return [];
    const playSessionId = successfulRecordedPlaySessionId(exchange);
    if (playSessionId === undefined) return [];
    if (!isJsonRecord(exchange.response)) {
      fail(
        `Replay requires a create response at transcript seq ${exchange.seq}.`,
      );
    }
    const structuredContent = exchange.response.structuredContent;
    if (!isJsonRecord(structuredContent)) {
      fail(
        `Replay requires create_play_session at transcript seq ${exchange.seq} to return structuredContent.`,
      );
    }
    const operation = structuredContent.operation;
    if (!isJsonRecord(operation)) {
      fail(
        `Replay requires create_play_session at transcript seq ${exchange.seq} to return an operation.`,
      );
    }
    const result = operation.result;
    if (!isJsonRecord(result)) {
      fail(
        `Replay requires create_play_session at transcript seq ${exchange.seq} to return an operation result.`,
      );
    }
    const access = result.access;
    if (!isJsonRecord(access)) {
      fail(
        `Replay requires create_play_session at transcript seq ${exchange.seq} to return access.`,
      );
    }
    if (access.tag === "authenticated") {
      fail(
        `Replay does not support authenticated create_play_session at transcript seq ${exchange.seq}.`,
      );
    }
    if (access.tag !== "guest") {
      fail(
        `Replay requires guest create_play_session access at transcript seq ${exchange.seq}.`,
      );
    }
    const decoded = decodeGuestAccessGrant(access.guestAccessGrant);
    if (Either.isLeft(decoded)) {
      fail(
        `Replay requires a valid Guest Play Session access grant at transcript seq ${exchange.seq}: ${decoded.left}`,
      );
    }
    return [decoded.right];
  });
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
