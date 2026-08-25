import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Either } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { createDndMcpHttpServer } from "./public-http-server.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("recoverable Play Session protocol", () => {
  test("continues an accepted Character Draft mutation after reconstructing the application store", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-play-session-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const firstConnection = await connectClient(firstRepository);

    const created = await callStructuredTool(firstConnection.client, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    const draftId = "draft:recoverable-character-mutation";
    const draftCreated = await callStructuredTool(firstConnection.client, {
      name: "create_character_draft",
      arguments: { playSessionId, draftId },
    });
    const createdHoles = arrayField(operationResult(draftCreated), "holes");
    const progressionHole = createdHoles.find(
      (hole) =>
        isJsonObject(hole) &&
        hole.holeId === "cc:draft:draft.progression.initial",
    );
    if (!isJsonObject(progressionHole)) {
      throw new Error("Expected the initial Character Progression hole.");
    }
    const progressionOption = arrayField(progressionHole, "options")[0];
    if (!isJsonObject(progressionOption)) {
      throw new Error("Expected a Character Progression option.");
    }

    await callStructuredTool(firstConnection.client, {
      name: "fill_creation_holes",
      arguments: {
        playSessionId,
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: stringField(progressionHole, "holeId"),
            optionIds: [stringField(progressionOption, "optionId")],
          },
        ],
      },
    });
    await firstConnection.close();
    firstRepository.close();

    const recoveredRepository = openRepository(databasePath);
    const recoveredConnection = await connectClient(recoveredRepository);
    try {
      const resumed = await callStructuredTool(recoveredConnection.client, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(resumed).toMatchObject({
        tag: "playSessionAvailable",
        projection: { draftIds: [draftId] },
        restoration: { tag: "retained" },
      });

      const discovered = await callStructuredTool(recoveredConnection.client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(discovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await recoveredConnection.close();
      recoveredRepository.close();
    }
  });

  test("exposes the recoverable Play Session through the public /mcp route", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-public-mcp-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const firstServer = createDndMcpHttpServer({
      playSessionRepository: firstRepository,
    });
    const firstEndpoint = await listen(firstServer);
    const firstClient = await connectHttpClient(firstEndpoint);
    const created = await callStructuredTool(firstClient, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    const draftId = "draft:public-http-recovery";
    const draftCreated = await callStructuredTool(firstClient, {
      name: "create_character_draft",
      arguments: { playSessionId, draftId },
    });
    const progressionHole = arrayField(
      operationResult(draftCreated),
      "holes",
    ).find(
      (hole) =>
        isJsonObject(hole) &&
        hole.holeId === "cc:draft:draft.progression.initial",
    );
    if (!isJsonObject(progressionHole)) {
      throw new Error("Expected the initial Character Progression hole.");
    }
    const progressionOption = arrayField(progressionHole, "options")[0];
    if (!isJsonObject(progressionOption)) {
      throw new Error("Expected a Character Progression option.");
    }
    await callStructuredTool(firstClient, {
      name: "fill_creation_holes",
      arguments: {
        playSessionId,
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: stringField(progressionHole, "holeId"),
            optionIds: [stringField(progressionOption, "optionId")],
          },
        ],
      },
    });
    await firstClient.close();
    await close(firstServer);
    firstRepository.close();

    const recoveredRepository = openRepository(databasePath);
    const recoveredServer = createDndMcpHttpServer({
      playSessionRepository: recoveredRepository,
    });
    const recoveredEndpoint = await listen(recoveredServer);
    const recoveredClient = await connectHttpClient(recoveredEndpoint);
    try {
      const resumed = await callStructuredTool(recoveredClient, {
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(resumed).toMatchObject({
        tag: "playSessionAvailable",
        projection: { draftIds: [draftId] },
      });
      const discovered = await callStructuredTool(recoveredClient, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(discovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await recoveredClient.close();
      await close(recoveredServer);
      recoveredRepository.close();
    }
  });

  test("settles concurrent mutations as one accepted revision and one stale rejection", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-concurrent-mcp-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "play-sessions.sqlite");
    const firstRepository = openRepository(databasePath);
    const secondRepository = openRepository(databasePath);
    const firstConnection = await connectClient(firstRepository);
    const secondConnection = await connectClient(secondRepository);
    try {
      const created = await callStructuredTool(firstConnection.client, {
        name: "create_play_session",
        arguments: {},
      });
      const playSessionId = stringField(created, "playSessionId");
      const draftId = "draft:concurrent-recoverable-mutation";
      const draftCreated = await callStructuredTool(firstConnection.client, {
        name: "create_character_draft",
        arguments: { playSessionId, draftId },
      });
      const progressionHole = arrayField(
        operationResult(draftCreated),
        "holes",
      ).find(
        (hole) =>
          isJsonObject(hole) &&
          hole.holeId === "cc:draft:draft.progression.initial",
      );
      if (!isJsonObject(progressionHole)) {
        throw new Error("Expected the initial Character Progression hole.");
      }
      const options = arrayField(progressionHole, "options").slice(0, 2);
      if (!isJsonObject(options[0]) || !isJsonObject(options[1])) {
        throw new Error("Expected two Character Progression options.");
      }
      const operation = (optionId: string) => ({
        name: "fill_creation_holes",
        arguments: {
          playSessionId,
          draftId,
          expectedRevision: 0,
          fills: [
            {
              kind: "choice",
              holeId: stringField(progressionHole, "holeId"),
              optionIds: [optionId],
            },
          ],
        },
      });

      const results = await Promise.all([
        callStructuredTool(
          firstConnection.client,
          operation(stringField(options[0], "optionId")),
        ),
        callStructuredTool(
          secondConnection.client,
          operation(stringField(options[1], "optionId")),
        ),
      ]);
      expect(
        results
          .map((result) =>
            stringField(objectField(operationResult(result), "result"), "tag"),
          )
          .sort(),
      ).toEqual(["accepted", "rejected"]);

      const recovered = await callStructuredTool(firstConnection.client, {
        name: "discover_creation_holes",
        arguments: { playSessionId, draftId },
      });
      expect(operationResult(recovered)).toMatchObject({
        draft: { draftId, revision: 1 },
      });
    } finally {
      await Promise.all([firstConnection.close(), secondConnection.close()]);
      firstRepository.close();
      secondRepository.close();
    }
  });

  test("returns a typed storage failure without treating it as session absence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-storage-failure-"));
    temporaryDirectories.push(directory);
    const repository = openRepository(join(directory, "play-sessions.sqlite"));
    const connection = await connectClient(repository);
    const created = await callStructuredTool(connection.client, {
      name: "create_play_session",
      arguments: {},
    });
    const playSessionId = stringField(created, "playSessionId");
    repository.close();
    try {
      const failed = await connection.client.callTool({
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(failed.isError).toBe(true);
      expect(failed.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Play Session storage is unavailable.",
              details: {
                code: "PLAY_SESSION_STORAGE_FAILURE",
                reason: "closed",
              },
            },
            null,
            2,
          ),
        },
      ]);
      expect(failed.structuredContent).toBeUndefined();
    } finally {
      await connection.close();
    }
  });
});

async function listen(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<URL> {
  const endpoint = await server.listen();
  if (Either.isLeft(endpoint)) throw new Error(endpoint.left.message);
  return endpoint.right;
}

async function close(
  server: ReturnType<typeof createDndMcpHttpServer>,
): Promise<void> {
  const closed = await server.close();
  if (Either.isLeft(closed)) throw new Error(closed.left.message);
}

async function connectHttpClient(endpoint: URL): Promise<Client> {
  const client = new Client({
    name: "recoverable-http-client",
    version: "0.1.0",
  });
  const transport = new StreamableHTTPClientTransport(endpoint);
  // SDK 1.29's transport declarations do not satisfy exactOptionalPropertyTypes,
  // although StreamableHTTPClientTransport explicitly implements Transport.
  await client.connect(transport as Transport);
  return client;
}

async function connectClient(
  playSessionRepository: ReturnType<typeof openRepository>,
) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const host = createDndMcpProtocolServer(undefined, undefined, {
    playSessionRepository,
  });
  const client = new Client({
    name: "recoverable-play-session-client",
    version: "0.1.0",
  });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await Promise.allSettled([client.close(), host.server.close()]);
    },
  };
}

function openRepository(databasePath: string) {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  return repository.right;
}

async function callStructuredTool(
  client: Client,
  input: {
    readonly name: string;
    readonly arguments: Record<string, unknown>;
  },
): Promise<Readonly<Record<string, unknown>>> {
  const result = await client.callTool(input);
  expect(result.isError).not.toBe(true);
  if (!isJsonObject(result.structuredContent)) {
    throw new Error(`${input.name} did not return an object payload.`);
  }
  return result.structuredContent;
}

function operationResult(
  envelope: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (!isJsonObject(envelope.operation)) {
    throw new Error("Expected a Play Session operation.");
  }
  if (!isJsonObject(envelope.operation.result)) {
    throw new Error("Expected a Play Session operation result.");
  }
  return envelope.operation.result;
}

function arrayField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): readonly unknown[] {
  const result = value[field];
  if (!Array.isArray(result)) throw new Error(`Expected ${field} array.`);
  return result;
}

function stringField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const result = value[field];
  if (typeof result !== "string") throw new Error(`Expected ${field} string.`);
  return result;
}

function objectField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const result = value[field];
  if (!isJsonObject(result)) throw new Error(`Expected ${field} object.`);
  return result;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
