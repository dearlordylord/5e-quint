import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import {
  GUEST_INACTIVITY_RETENTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
  decodeEpochMilliseconds,
  decodePrincipalId,
  generatedGuestAccessGrant,
  guestAccessGrantDigest,
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
  decodePlaySessionDiceSeed,
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";
import { DICE_RANDOM_SOURCE } from "./dice-sampling-service.ts";
import { RECOVERABLE_PLAY_SESSION_FORMAT_VERSION } from "./play-session-repository.ts";

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
      const retired = repository.load(
        playSessionId("play-session:00000000-0000-4000-8000-000000000099"),
      );
      expect(Result.isSuccess(retired)).toBe(true);
      if (Result.isSuccess(retired)) {
        expect(retired.success).toEqual({ tag: "absent" });
      }
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

  test("preserves Effect Random records in a retired format-2 table", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "dnd-effect-random-sessions-"),
    );
    const databasePath = join(directory, "sessions.sqlite");
    const legacy = new DatabaseSync(databasePath);
    legacy.exec(`
      CREATE TABLE play_sessions (
        play_session_id TEXT PRIMARY KEY,
        format_version INTEGER NOT NULL,
        random_seed TEXT NOT NULL,
        revision INTEGER NOT NULL,
        operations_json TEXT NOT NULL,
        tenure_kind TEXT NOT NULL,
        guest_access_grant_digest TEXT,
        principal_id TEXT,
        last_activity_at_ms INTEGER NOT NULL
      ) STRICT;
      INSERT INTO play_sessions VALUES (
        'play-session:00000000-0000-4000-8000-000000000098',
        2,
        '${"1".repeat(64)}',
        0,
        '[]',
        'guest',
        '${"2".repeat(64)}',
        NULL,
        1000
      );
    `);
    legacy.close();
    try {
      const repository = openRepository(databasePath);
      const retired = repository.load(
        playSessionId("play-session:00000000-0000-4000-8000-000000000098"),
      );
      expect(Result.isSuccess(retired)).toBe(true);
      if (Result.isSuccess(retired)) {
        expect(retired.success).toEqual({ tag: "absent" });
      }
      repository.close();
      const inspected = new DatabaseSync(databasePath, { readOnly: true });
      expect(
        inspected
          .prepare(
            "SELECT COUNT(*) AS count FROM retired_effect_random_play_sessions_v2",
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
    const guest = seedLegacyGuest(repository, nowMs);
    const wrongGrant = generatedGuestAccessGrant();
    const owner = principal("principal:owner");
    const other = principal("principal:other");

    const deniedGuest = await registry.run(
      guest.playSessionId,
      { tag: "guest", guestAccessGrant: wrongGrant },
      () => "unreachable",
    );
    expect(deniedGuest).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });

    nowMs += 1;
    const saved = await registry.save(
      guest.playSessionId,
      guest.guestAccessGrant,
      owner,
    );
    expect(Result.isSuccess(saved)).toBe(true);
    if (Result.isSuccess(saved)) {
      expect(saved.success).toMatchObject({
        tag: "saved",
        persistence: "saved",
      });
    }
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "guest", guestAccessGrant: guest.guestAccessGrant },
        () => "stale grant must not run",
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    expect(
      await registry.run(
        guest.playSessionId,
        { tag: "authenticated", principalId: other },
        () => "other principal must not run",
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    const otherSessions = registry.listSaved(other);
    expect(Result.isSuccess(otherSessions)).toBe(true);
    if (Result.isSuccess(otherSessions)) {
      expect(otherSessions.success).toEqual([]);
    }
    const ownerSessions = registry.listSaved(owner);
    expect(Result.isSuccess(ownerSessions)).toBe(true);
    if (Result.isSuccess(ownerSessions)) {
      expect(ownerSessions.success).toMatchObject([
        { playSessionId: guest.playSessionId },
      ]);
    }
    expect(
      await registry.deleteSaved(guest.playSessionId, other),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    const deleted = await registry.deleteSaved(guest.playSessionId, owner);
    expect(Result.isSuccess(deleted)).toBe(true);
    if (Result.isSuccess(deleted)) {
      expect(deleted.success).toEqual({ tag: "playSessionDeleted" });
    }
    const remaining = registry.listSaved(owner);
    expect(Result.isSuccess(remaining)).toBe(true);
    if (Result.isSuccess(remaining)) {
      expect(remaining.success).toEqual([]);
    }
    repository.close();
  });

  test("rejects process-local durable creation while expiring legacy and saved records", async () => {
    let nowMs = 0;
    const repository = openRepository();
    const registry = createRegistry(repository, () => nowMs);
    expect(registry.create({ tag: "localProcess" })).toMatchObject({
      _tag: "Failure",
      failure: { reason: "localProcessRequiresEphemeralRegistry" },
    });
    const expiringGuest = seedLegacyGuest(repository, nowMs);
    nowMs = GUEST_INACTIVITY_RETENTION_MS;
    expect(
      await registry.run(
        expiringGuest.playSessionId,
        { tag: "guest", guestAccessGrant: expiringGuest.guestAccessGrant },
        () => "expired guest must not run",
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    const savedOwner = principal("principal:expiry");
    const saved = registry.create({
      tag: "authenticated",
      principalId: savedOwner,
    });
    if (Result.isFailure(saved)) throw new Error(saved.failure.message);
    nowMs += SAVED_INACTIVITY_RETENTION_MS;
    expect(
      await registry.run(
        saved.success.playSessionId,
        { tag: "authenticated", principalId: savedOwner },
        () => "expired saved session must not run",
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    repository.close();
  });

  test("returns a typed retained-command quota without a partial append", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, Date.now, {
      maximumRetainedCommandsPerSession: 1,
    });
    const owner = principal("principal:command-quota");
    const created = registry.create({
      tag: "authenticated",
      principalId: owner,
    });
    if (Result.isFailure(created)) throw new Error(created.failure.message);
    const command = {
      name: "roll_dice",
      args: {
        groups: [{ dice: 1, dieSize: 4 }],
      },
    } satisfies PlaySessionCommand;
    const retention = { commandFor: () => command, retain: () => true };
    const first = await registry.run(
      created.success.playSessionId,
      { tag: "authenticated", principalId: owner },
      () => "first",
      retention,
    );
    expect(Result.isSuccess(first)).toBe(true);
    if (Result.isSuccess(first)) {
      expect(first.success.value).toBe("first");
    }
    expect(
      await registry.run(
        created.success.playSessionId,
        { tag: "authenticated", principalId: owner },
        () => "second",
        retention,
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
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
    const owner = principal("principal:rate-limit");
    const created = registry.create({
      tag: "authenticated",
      principalId: owner,
    });
    if (Result.isFailure(created)) throw new Error(created.failure.message);
    const caller = {
      tag: "authenticated" as const,
      principalId: owner,
    };
    expect(
      await registry.run(
        created.success.playSessionId,
        caller,
        () => "admitted",
      ),
    ).toMatchObject({ _tag: "Success" });
    expect(
      await registry.run(
        created.success.playSessionId,
        caller,
        () => "not run",
      ),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "playSessionLimitFailure",
        reason: "requestRateExceeded",
        retryAfterSeconds: 60,
      },
    });
    nowMs = 60_000;
    expect(
      await registry.run(
        created.success.playSessionId,
        caller,
        () => "admitted again",
      ),
    ).toMatchObject({ _tag: "Success" });
    repository.close();
  });

  test("authorizes before charging the principal rate bucket", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0, {
      maximumRequestsPerMinute: 1,
    });
    const owner = principal("principal:rate-owner");
    const other = principal("principal:rate-other");
    const created = registry.create({
      tag: "authenticated",
      principalId: owner,
    });
    if (Result.isFailure(created)) throw new Error(created.failure.message);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(
        await registry.run(
          created.success.playSessionId,
          { tag: "authenticated", principalId: other },
          () => "unreachable",
        ),
      ).toMatchObject({
        _tag: "Failure",
        failure: { tag: "playSessionUnavailable" },
      });
    }
    expect(
      await registry.run(
        created.success.playSessionId,
        { tag: "authenticated", principalId: owner },
        () => "admitted",
      ),
    ).toMatchObject({ _tag: "Success" });
    repository.close();
  });

  test("keeps authenticated ownership server-side and preserves actionable limit details", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0, {
      maximumRequestsPerMinute: 1,
    });
    const identity = {
      tag: "authenticated" as const,
      principalId: principal("principal:protocol-limit-owner"),
    };
    const created = handleCreatePlaySession(registry, {}, identity);
    if (!("structuredContent" in created)) {
      throw new Error("Expected successful creation content.");
    }
    const structured = created.structuredContent;
    if (!isJsonObject(structured) || !isJsonObject(structured.operation)) {
      throw new Error("Expected structured creation content.");
    }
    expect(JSON.stringify(structured)).not.toContain("guestAccessGrant");
    expect(JSON.stringify(created.content)).not.toContain("guest-access:");

    const args = {
      playSessionId: structured.playSessionId,
    };
    const firstRead = await handleReadPlaySession(registry, args, identity);
    if (!("structuredContent" in firstRead)) {
      throw new Error("Expected successful read content.");
    }
    expect(firstRead.structuredContent).not.toHaveProperty("tenure.guidance");
    const limited = await handleReadPlaySession(registry, args, identity);
    expect(jsonContentPayload(limited)).toMatchObject({
      details: {
        code: "PLAY_SESSION_LIMIT_EXCEEDED",
        reason: "requestRateExceeded",
        retryAfterSeconds: 60,
      },
    });
    repository.close();
  });

  test("preserves the public saved-session creation-capacity reason", () => {
    const repository = openRepository();
    const registry = createRegistry(repository, () => 0);
    const identity = {
      tag: "authenticated" as const,
      principalId: principal("principal:quota-owner"),
    };
    for (let index = 0; index < 20; index += 1) {
      expect(handleCreatePlaySession(registry, {}, identity).isError).not.toBe(
        true,
      );
    }
    expect(
      jsonContentPayload(handleCreatePlaySession(registry, {}, identity)),
    ).toEqual({
      error: "Unable to create a Play Session.",
      details: {
        code: "PLAY_SESSION_CREATION_FAILED",
        reason: "savedSessionQuotaExceeded",
      },
    });
    repository.close();
  });

  test("settles competing save claims as one owner without copying state", async () => {
    const repository = openRepository();
    const registry = createRegistry(repository, Date.now);
    const guest = seedLegacyGuest(repository, Date.now());
    const firstOwner = principal("principal:first-claim");
    const secondOwner = principal("principal:second-claim");
    const claims = await Promise.all([
      registry.save(guest.playSessionId, guest.guestAccessGrant, firstOwner),
      registry.save(guest.playSessionId, guest.guestAccessGrant, secondOwner),
    ]);
    expect(claims.filter(Result.isSuccess)).toHaveLength(1);
    expect(claims.filter(Result.isFailure)).toEqual([
      expect.objectContaining({
        failure: {
          tag: "playSessionUnavailable",
          restoration: expect.anything(),
        },
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
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
    repository.close();
  });

  test("advertises required auth and emits the tool OAuth challenge", async () => {
    const repository = openRepository();
    const anonymousHost = createDndMcpProtocolServer(undefined, undefined, {
      playSessionRepository: repository,
      requestIdentity: {
        tag: "hostedAnonymous",
        authentication: {
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
        { type: "oauth2", scopes: ["play-sessions"] },
      ]);
      expect(tools.tools.map(({ name }) => name)).not.toContain(
        "save_play_session",
      );
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

  test("returns typed invalid arguments for authenticated saved-session listing", async () => {
    const repository = openRepository();
    const host = createDndMcpProtocolServer(undefined, undefined, {
      playSessionRepository: repository,
      requestIdentity: {
        tag: "authenticated",
        principalId: principal("principal:list-invalid-arguments"),
      },
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({
      name: "public-list-invalid-arguments",
      version: "0.1.0",
    });
    try {
      await host.server.connect(serverTransport);
      await client.connect(clientTransport);
      const rejected = await client.callTool({
        name: "list_saved_play_sessions",
        arguments: { unexpected: true },
      });
      expect(rejected.isError).toBe(true);
      if (!Array.isArray(rejected.content)) {
        throw new Error("Expected a typed invalid-arguments response.");
      }
      const content = rejected.content[0];
      if (
        !isJsonObject(content) ||
        content.type !== "text" ||
        typeof content.text !== "string"
      ) {
        throw new Error("Expected a typed invalid-arguments response.");
      }
      expect(JSON.parse(content.text)).toEqual({
        error: "list_saved_play_sessions expects valid arguments.",
        details: { code: "INVALID_ARGUMENTS" },
      });
    } finally {
      await Promise.allSettled([client.close(), host.server.close()]);
      repository.close();
    }
  }, 30_000);

  test("fails hosted stateful access closed without an OAuth provider", async () => {
    const repository = openRepository();
    const host = createDndMcpProtocolServer(undefined, undefined, {
      playSessionRepository: repository,
      requestIdentity: {
        tag: "hostedAnonymous",
        authentication: { tag: "unavailable" },
      },
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({
      name: "hosted-no-oauth-boundary",
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
        { type: "oauth2", scopes: ["play-sessions"] },
      ]);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(created.isError).toBe(true);
      expect(JSON.stringify(created.content)).toContain(
        "AUTHENTICATION_REQUIRED",
      );
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

let legacyGuestSequence = 800;

function seedLegacyGuest(repository: PlaySessionRepository, nowMs: number) {
  const guestAccessGrant = generatedGuestAccessGrant();
  const seeded = decodePlaySessionDiceSeed([
    "00000001",
    "00000002",
    "00000003",
    "00000004",
  ]);
  if (Result.isFailure(seeded)) throw new Error(seeded.failure.message);
  const id = playSessionId(
    `play-session:00000000-0000-4000-8000-${String(legacyGuestSequence++).padStart(12, "0")}`,
  );
  const created = repository.create(
    {
      playSessionId: id,
      formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
      diceReplay: { seed: seeded.success, randomSource: DICE_RANDOM_SOURCE },
      revision: 0,
      operations: [],
      tenure: {
        tag: "guest",
        guestAccessGrantDigest: guestAccessGrantDigest(guestAccessGrant),
        lastActivityAtMs: testEpochMilliseconds(nowMs),
      },
    },
    {
      maximumGuestSessions: 1_000,
      maximumSavedSessionsPerPrincipal: 20,
    },
  );
  if (Result.isFailure(created) || created.success.tag !== "created") {
    throw new Error("Unable to seed a bounded legacy Guest Play Session.");
  }
  return {
    playSessionId: id,
    guestAccessGrant,
  };
}

function playSessionId(input: string) {
  const decoded = decodePlaySessionId(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure);
  return decoded.success;
}

function principal(input: string) {
  const decoded = decodePrincipalId(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure);
  return decoded.success;
}

function openRepository(databasePath = ":memory:"): PlaySessionRepository {
  const repository = openSqlitePlaySessionRepository(databasePath);
  if (Result.isFailure(repository)) throw new Error(repository.failure.message);
  return repository.success;
}

function testEpochMilliseconds(input: number) {
  const decoded = decodeEpochMilliseconds(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
  return decoded.success;
}

function toolSecuritySchemes(
  listed: Awaited<ReturnType<Client["listTools"]>>,
  name: string,
): unknown {
  const tool = listed.tools.find((candidate) => candidate.name === name);
  if (tool === undefined) throw new Error(`Missing ${name}.`);
  return tool._meta?.securitySchemes;
}

function rightValue<A>(either: Result.Result<A, unknown>): A {
  if (Result.isFailure(either))
    throw new Error("Expected a successful result.");
  return either.success;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
