import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { verifyCompleteNewcomerJourney } from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpHttpServer } from "./public-http-server.ts";
import {
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";

const PARITY_TIMEOUT_MS = 240_000;
const repositoryRoot = resolve(import.meta.dirname, "../../..");

describe("public HTTP and stdio MCP transport boundaries", () => {
  test(
    "shares stateless tools while hosted sessions fail closed and local sessions remain ephemeral",
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
        const httpTools = await httpClient.listTools();
        const stdioTools = await stdioClient.listTools();
        expect(
          httpTools.tools.find(({ name }) => name === "list_catalog_units"),
        ).toEqual(
          stdioTools.tools.find(({ name }) => name === "list_catalog_units"),
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
        const hostedCreation = await httpClient.callTool({
          name: "create_play_session",
          arguments: {},
        });
        expect(hostedCreation.isError).toBe(true);
        expect(JSON.stringify(hostedCreation.content)).toContain(
          "AUTHENTICATION_REQUIRED",
        );

        const journey = await verifyCompleteNewcomerJourney(stdioClient);
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

function openRepository(databasePath: string): PlaySessionRepository {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Result.isFailure(repository)) throw new Error(repository.failure.message);
  return repository.success;
}
