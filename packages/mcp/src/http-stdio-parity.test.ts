import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { verifyCompleteNewcomerJourney } from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpHttpServer } from "./public-http-server.ts";
import {
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";

const PARITY_TIMEOUT_MS = 240_000;
const repositoryRoot = resolve(import.meta.dirname, "../../..");

describe("public HTTP and stdio MCP parity", () => {
  test(
    "exposes one protocol and completes the newcomer journey over HTTP",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "dnd-http-parity-"));
      const repository = openRepository(join(directory, "sessions.sqlite"));
      const httpServer = createDndMcpHttpServer({
        playSessionRepository: repository,
      });
      const endpoint = await httpServer.listen();
      if (Result.isFailure(endpoint)) throw new Error(endpoint.failure.message);

      const httpClient = new Client({
        name: "dnd-http-parity",
        version: "0.1.0",
      });
      const stdioClient = new Client({
        name: "dnd-stdio-parity",
        version: "0.1.0",
      });
      const httpTransport = new StreamableHTTPClientTransport(endpoint.success);
      const stdioTransport = new StdioClientTransport({
        command: process.execPath,
        args: ["--import", "tsx", "packages/mcp/src/index.ts"],
        cwd: repositoryRoot,
        stderr: "pipe",
      });

      try {
        await Promise.all([
          httpClient.connect(httpTransport as Transport),
          stdioClient.connect(stdioTransport),
        ]);

        expect(httpClient.getInstructions()).toBe(
          stdioClient.getInstructions(),
        );
        expect(await httpClient.listTools()).toEqual(
          await stdioClient.listTools(),
        );

        await expectEquivalentResult(
          httpClient,
          stdioClient,
          "describe_mcp_workflow",
          {},
        );
        await expectEquivalentResult(
          httpClient,
          stdioClient,
          "list_catalog_units",
          {},
        );
        await expectEquivalentEmptyPlaySession(httpClient, stdioClient);

        const journey = await verifyCompleteNewcomerJourney(httpClient);
        expect(journey.shortRestHealing).toEqual({
          currentHp: 10,
          spentHitDice: 1,
        });
      } finally {
        await Promise.allSettled([
          httpClient.close(),
          stdioClient.close(),
          stdioTransport.close(),
        ]);
        const closed = await httpServer.close();
        repository.close();
        await rm(directory, { recursive: true, force: true });
        if (Result.isFailure(closed)) throw new Error(closed.failure.message);
      }
    },
    PARITY_TIMEOUT_MS,
  );
});

async function expectEquivalentResult(
  httpClient: Client,
  stdioClient: Client,
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<void> {
  const [httpResult, stdioResult] = await Promise.all([
    httpClient.callTool({ name, arguments: args }),
    stdioClient.callTool({ name, arguments: args }),
  ]);
  expect(httpResult).toEqual(stdioResult);
}

async function expectEquivalentEmptyPlaySession(
  httpClient: Client,
  stdioClient: Client,
): Promise<void> {
  const [httpCreated, stdioCreated] = await Promise.all([
    httpClient.callTool({ name: "create_play_session", arguments: {} }),
    stdioClient.callTool({ name: "create_play_session", arguments: {} }),
  ]);
  const httpPlaySessionId = playSessionId(httpCreated.structuredContent);
  const stdioPlaySessionId = playSessionId(stdioCreated.structuredContent);
  const httpGuestAccessGrant = guestAccessGrant(httpCreated.structuredContent);
  const stdioGuestAccessGrant = guestAccessGrant(
    stdioCreated.structuredContent,
  );
  const [httpListed, stdioListed] = await Promise.all([
    httpClient.callTool({
      name: "list_characters",
      arguments: {
        playSessionId: httpPlaySessionId,
        guestAccessGrant: httpGuestAccessGrant,
      },
    }),
    stdioClient.callTool({
      name: "list_characters",
      arguments: {
        playSessionId: stdioPlaySessionId,
        guestAccessGrant: stdioGuestAccessGrant,
      },
    }),
  ]);
  expect(normalizePlaySessionId(httpListed, httpPlaySessionId)).toEqual(
    normalizePlaySessionId(stdioListed, stdioPlaySessionId),
  );
}

function playSessionId(input: unknown): string {
  return Schema.decodeUnknownSync(
    Schema.Struct({ playSessionId: Schema.String }),
  )(input).playSessionId;
}

function guestAccessGrant(input: unknown): string {
  return Schema.decodeUnknownSync(
    Schema.Struct({
      operation: Schema.Struct({
        result: Schema.Struct({
          access: Schema.Struct({ guestAccessGrant: Schema.String }),
        }),
      }),
    }),
  )(input).operation.result.access.guestAccessGrant;
}

function normalizePlaySessionId(
  input: unknown,
  playSessionId: string,
): unknown {
  if (typeof input === "string") {
    return input
      .replaceAll(playSessionId, "<play-session-id>")
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/gu,
        "<server-time>",
      );
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizePlaySessionId(item, playSessionId));
  }
  if (input !== null && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        normalizePlaySessionId(value, playSessionId),
      ]),
    );
  }
  return input;
}

function openRepository(databasePath: string): PlaySessionRepository {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Result.isFailure(repository)) throw new Error(repository.failure.message);
  return repository.success;
}
