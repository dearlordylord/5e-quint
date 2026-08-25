import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
  decodeEpochMilliseconds,
  decodePrincipalId,
  generatedGuestAccessGrant,
} from "./play-session-access.ts";
import {
  decodePlaySessionId,
  type PlaySessionCommand,
} from "./play-session.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import {
  handleCreatePlaySession,
  handleReadPlaySession,
} from "./play-session-protocol.ts";
import { jsonContentPayload } from "./tool-content.ts";
import {
  createRecoverablePlaySessionRegistry,
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";

describe("public Play Session boundary", () => {
  test("retires pre-ownership rows without treating them as accessible sessions", () => {
    const directory = mkdtempSync(join(tmpdir(), "dnd-unowned-sessions-"));
    const databasePath = join(directory, "sessions.sqlite");
    const legacy = new DatabaseSync(databasePath);
    legacy.exec(`
      CREATE TABLE play_sessions (
        play_session_id TEXT PRIMARY KEY,
        format_version INTEGER NOT NULL,
        random_seed TEXT NOT NULL,
        revision INTEGER NOT NULL,
        operations_json TEXT NOT NULL
      ) STRICT;
      INSERT INTO play_sessions VALUES (
        'play-session:00000000-0000-4000-8000-000000000099',
        1,
        '${"0".repeat(64)}',
        0,
        '[]'
      );
    `);
    legacy.close();
    try {
      const repository = openRepository(databasePath);
      expect(
        repository.load(
          playSessionId("play-session:00000000-0000-4000-8000-000000000099"),
        ),
      ).toMatchObject({ _tag: "Right", right: { tag: "absent" } });
      repository.close();
      const inspected = new DatabaseSync(databasePath, { readOnly: true });
      expect(
        inspected
          .prepare(
            "SELECT COUNT(*) AS count FROM retired_unowned_play_sessions_v1",
          )
          .get(),
      ).toEqual({ count: 1 });
      inspected.close();
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  test("isolates guest access, atomically saves, lists by owner, and deletes", async () => {
    let nowMs = 1_000;
    const repository = openRepository();
    const registry = createRegistry(repository, () => nowMs);
    const guest = guestCreation(registry.create({ tag: "anonymous" }));
    const wrongGrant = generatedGuestAccessGrant();
    const owner = principal("principal:owner");
    const other = principal("principal:other");

    const deniedGuest = await registry.run(
      guest.playSessionId,
      { tag: "guest", guestAccessGrant: wrongGrant },
      () => "unreachable",
    );
    expect(deniedGuest).toMatchObject({
      _tag: "Left",
      left: { tag: "playSessionUnavailable" },
    });

    nowMs += 1;
    const saved = await registry.save(
      guest.playSessionId,
      guest.guestAccessGrant,
      owner,
    );
    expect(saved).toMatchObject({
      _tag: "Right",
      right: { tag: "saved", persistence: "saved" },
    });
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => "stale grant must not run",
      ),
    ).toMatchObject({ _tag: "Left", left: { tag: "playSessionUnavailable" } });
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "authenticated", principalId: other },
        () => "other principal must not run",
      ),
    ).toMatchObject({ _tag: "Left", left: { tag: "playSessionUnavailable" } });
    expect(registry.listSaved(other)).toMatchObject({
      _tag: "Right",
      right: [],
    });
    expect(registry.listSaved(owner)).toMatchObject({
      _tag: "Right",
      right: [{ playSessionId: guest.playSessionId }],
    });
    expect(
      await registry.deleteSaved(guest.playSessionId, other),
    ).toMatchObject({
      _tag: "Left",
      left: { tag: "playSessionUnavailable" },
    });
    expect(
      await registry.deleteSaved(guest.playSessionId, owner),
    ).toMatchObject({
      _tag: "Right",
      right: { tag: "playSessionDeleted" },
    });
    expect(registry.listSaved(owner)).toMatchObject({
      _tag: "Right",
      right: [],
    });
    repository.close();
  });

  test("enforces inactivity expiry and protects guests from early pressure cleanup", async () => {
    let nowMs = 0;
    const repository = openRepository();
    const registry = createRegistry(repository, () => nowMs, {
      maximumGuestSessions: 2,
    });
    const first = guestCreation(registry.create({ tag: "anonymous" }));
    nowMs = 1;
    guestCreation(registry.create({ tag: "anonymous" }));
    nowMs = GUEST_PRESSURE_PROTECTION_MS - 1;
    expect(registry.create({ tag: "anonymous" })).toMatchObject({
      _tag: "Left",
      left: { reason: "guestCapacityExceeded" },
    });
    nowMs = GUEST_PRESSURE_PROTECTION_MS;
    expect(registry.create({ tag: "anonymous" })).toMatchObject({
      _tag: "Right",
    });
    expect(
      await registry.run(
        first.playSessionId,
        { tag: "guest", guestAccessGrant: first.guestAccessGrant },
        () => "removed by pressure cleanup",
      ),
    ).toMatchObject({ _tag: "Left", left: { tag: "playSessionUnavailable" } });

    repository.close();

    nowMs = 0;
    const expiryRepository = openRepository();
    const expiryRegistry = createRegistry(expiryRepository, () => nowMs);
    const expiringGuest = guestCreation(
      expiryRegistry.create({ tag: "anonymous" }),
    );
    nowMs = GUEST_INACTIVITY_RETENTION_MS;
    expect(
      await expiryRegistry.run(
        expiringGuest.playSessionId,
        {
          tag: "guest",
          guestAccessGrant: expiringGuest.guestAccessGrant,
        },
        () => "expired guest must not run",
      ),
    ).toMatchObject({ _tag: "Left", left: { tag: "playSessionUnavailable" } });

    const savedOwner = principal("principal:expiry");
    const saved = expiryRegistry.create({
      tag: "authenticated",
      principalId: savedOwner,
    });
    if (Either.isLeft(saved)) throw new Error(saved.left.message);
    nowMs += SAVED_INACTIVITY_RETENTION_MS;
    expect(
      await expiryRegistry.run(
        saved.right.playSessionId,
        { tag: "authenticated", principalId: savedOwner },
        () => "expired saved session must not run",
      ),
    ).toMatchObject({ _tag: "Left", left: { tag: "playSessionUnavailable" } });
    expiryRepository.close();
  });

  test("returns a typed retained-command quota without a partial append", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, Date.now, {
      maximumRetainedCommandsPerSession: 1,
    });
    const guest = guestCreation(registry.create({ tag: "anonymous" }));
    const command = {
      name: "roll_dice",
      args: { groups: [{ dice: 1, dieSize: 4 }] },
    } satisfies PlaySessionCommand;
    const retention = { command, retain: () => true };
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => "first",
        retention,
      ),
    ).toMatchObject({ _tag: "Right", right: { value: "first" } });
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => "second",
        retention,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "playSessionLimitFailure",
        reason: "retainedCommandQuotaExceeded",
      },
    });
    repository.close();
  });

  test("returns an actionable per-capability request limit", async () => {
    let nowMs = 0;
    const repository = openRepository();
    const registry = createRegistry(repository, () => nowMs, {
      maximumRequestsPerMinute: 1,
    });
    const guest = guestCreation(registry.create({ tag: "anonymous" }));
    const caller = {
      tag: "guest" as const,
      guestAccessGrant: guest.guestAccessGrant,
    };
    expect(
      await registry.run(guest.playSessionId, caller, () => "admitted"),
    ).toMatchObject({ _tag: "Right" });
    expect(
      await registry.run(guest.playSessionId, caller, () => "not run"),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "playSessionLimitFailure",
        reason: "requestRateExceeded",
        retryAfterSeconds: 60,
      },
    });
    nowMs = 60_000;
    expect(
      await registry.run(guest.playSessionId, caller, () => "admitted again"),
    ).toMatchObject({ _tag: "Right" });
    repository.close();
  });

  test("authorizes before charging the canonical guest rate bucket", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0, {
      maximumRequestsPerMinute: 1,
    });
    const guest = guestCreation(registry.create({ tag: "anonymous" }));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(
        await registry.run(
          guest.playSessionId,
          { tag: "guest", guestAccessGrant: generatedGuestAccessGrant() },
          () => "unreachable",
        ),
      ).toMatchObject({
        _tag: "Left",
        left: { tag: "playSessionUnavailable" },
      });
    }
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => "admitted",
      ),
    ).toMatchObject({ _tag: "Right" });
    repository.close();
  });

  test("keeps guest grants out of text and preserves actionable limit details", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0, {
      maximumRequestsPerMinute: 1,
    });
    const created = handleCreatePlaySession(registry, {});
    if (!("structuredContent" in created)) {
      throw new Error("Expected successful creation content.");
    }
    const structured = created.structuredContent;
    if (!isJsonObject(structured) || !isJsonObject(structured.operation)) {
      throw new Error("Expected structured creation content.");
    }
    const operationResult = structured.operation.result;
    if (
      !isJsonObject(operationResult) ||
      !isJsonObject(operationResult.access)
    ) {
      throw new Error("Expected guest creation access.");
    }
    const grant = operationResult.access.guestAccessGrant;
    if (typeof grant !== "string") throw new Error("Expected guest grant.");
    expect(operationResult.guidance).toEqual(
      expect.stringContaining("temporary"),
    );
    expect(JSON.stringify(created.content)).not.toContain(grant);
    expect(JSON.stringify(created.content)).not.toContain("guest-access:");

    const args = {
      playSessionId: structured.playSessionId,
      guestAccessGrant: grant,
    };
    const firstRead = await handleReadPlaySession(registry, args);
    if (!("structuredContent" in firstRead)) {
      throw new Error("Expected successful read content.");
    }
    expect(firstRead.structuredContent).not.toHaveProperty("tenure.guidance");
    const limited = await handleReadPlaySession(registry, args);
    expect(jsonContentPayload(limited)).toMatchObject({
      details: {
        code: "PLAY_SESSION_LIMIT_EXCEEDED",
        reason: "requestRateExceeded",
        retryAfterSeconds: 60,
      },
    });
    repository.close();
  });

  test("preserves the public creation-capacity reason", () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0, {
      maximumGuestSessions: 1,
    });
    expect(handleCreatePlaySession(registry, {}).isError).not.toBe(true);
    expect(jsonContentPayload(handleCreatePlaySession(registry, {}))).toEqual({
      error: "Unable to create a Play Session.",
      details: {
        code: "PLAY_SESSION_CREATION_FAILED",
        reason: "guestCapacityExceeded",
      },
    });
    repository.close();
  });

  test("settles competing save claims as one owner without copying state", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, Date.now);
    const guest = guestCreation(registry.create({ tag: "anonymous" }));
    const firstOwner = principal("principal:first-claim");
    const secondOwner = principal("principal:second-claim");
    const claims = await Promise.all([
      registry.save(guest.playSessionId, guest.guestAccessGrant, firstOwner),
      registry.save(guest.playSessionId, guest.guestAccessGrant, secondOwner),
    ]);
    expect(claims.filter(Either.isRight)).toHaveLength(1);
    expect(claims.filter(Either.isLeft)).toEqual([
      expect.objectContaining({
        left: { tag: "playSessionUnavailable", restoration: expect.anything() },
      }),
    ]);
    const listed = [
      ...rightValue(registry.listSaved(firstOwner)),
      ...rightValue(registry.listSaved(secondOwner)),
    ];
    expect(listed).toMatchObject([{ playSessionId: guest.playSessionId }]);
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => undefined,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { tag: "playSessionUnavailable" },
    });
    repository.close();
  });

  test("advertises optional versus required auth and emits the tool OAuth challenge", async () => {
    const repository = openRepository();
    const anonymousHost = createDndMcpProtocolServer(undefined, undefined, {
      playSessionRepository: repository,
      requestIdentity: {
        tag: "anonymous",
        savedPlaySessions: {
          tag: "oauth",
          resourceMetadataUrl:
            "https://oracle.example.test/.well-known/oauth-protected-resource",
        },
      },
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "public-boundary", version: "0.1.0" });
    try {
      await anonymousHost.server.connect(serverTransport);
      await client.connect(clientTransport);
      const tools = await client.listTools();
      expect(toolSecuritySchemes(tools, "create_play_session")).toEqual([
        { type: "noauth" },
        { type: "oauth2", scopes: ["play-sessions"] },
      ]);
      expect(toolSecuritySchemes(tools, "save_play_session")).toEqual([
        { type: "oauth2", scopes: ["play-sessions"] },
      ]);
      const challenge = await client.callTool({
        name: "list_saved_play_sessions",
        arguments: {},
      });
      expect(challenge.isError).toBe(true);
      expect(challenge._meta?.["mcp/www_authenticate"]).toEqual([
        expect.stringContaining("resource_metadata="),
      ]);
    } finally {
      await Promise.allSettled([client.close(), anonymousHost.server.close()]);
      repository.close();
    }
  }, 30_000);

  test("does not advertise OAuth-only capabilities without an OAuth provider", async () => {
    const repository = openRepository();
    const host = createDndMcpProtocolServer(undefined, undefined, {
      playSessionRepository: repository,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({
      name: "guest-only-boundary",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).not.toContain(
        "save_play_session",
      );
      expect(toolSecuritySchemes(tools, "create_play_session")).toEqual([
        { type: "noauth" },
      ]);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(created.structuredContent).toMatchObject({
        operation: {
          result: {
            guidance: expect.stringContaining(
              "Saving is not available on this server",
            ),
          },
        },
        tenure: {
          tag: "guest",
          save: { tag: "unavailable", reason: "oauthNotConfigured" },
        },
        nextOperations: expect.not.arrayContaining(["save_play_session"]),
      });
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
      repository.close();
    }
  });
});

function createRegistry(
  repository: PlaySessionRepository,
  now: () => number,
  limits: {
    readonly maximumGuestSessions?: number;
    readonly maximumRetainedCommandsPerSession?: number;
    readonly maximumRequestsPerMinute?: number;
  } = {},
) {
  let sequence = 0;
  return createRecoverablePlaySessionRegistry({
    applicationServices: createMcpApplicationServices(),
    repository,
    playSessionIdFactory: () =>
      playSessionId(
        `play-session:00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`,
      ),
    now: () => testEpochMilliseconds(now()),
    ...limits,
  });
}

function guestCreation(
  creation: ReturnType<ReturnType<typeof createRegistry>["create"]>,
) {
  if (Either.isLeft(creation) || creation.right.access.tag !== "guest") {
    throw new Error("Expected a Guest Play Session creation.");
  }
  return {
    playSessionId: creation.right.playSessionId,
    guestAccessGrant: creation.right.access.guestAccessGrant,
  };
}

function playSessionId(input: string) {
  const decoded = decodePlaySessionId(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  return decoded.right;
}

function principal(input: string) {
  const decoded = decodePrincipalId(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  return decoded.right;
}

function openRepository(databasePath = ":memory:"): PlaySessionRepository {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  return repository.right;
}

function testEpochMilliseconds(input: number) {
  const decoded = decodeEpochMilliseconds(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}

function toolSecuritySchemes(
  listed: Awaited<ReturnType<Client["listTools"]>>,
  name: string,
): unknown {
  const tool = listed.tools.find((candidate) => candidate.name === name);
  if (tool === undefined) throw new Error(`Missing ${name}.`);
  return tool._meta?.securitySchemes;
}

function rightValue<A>(either: Either.Either<A, unknown>): A {
  if (Either.isLeft(either)) throw new Error("Expected a successful result.");
  return either.right;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
