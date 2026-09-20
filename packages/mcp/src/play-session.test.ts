import { Effect, Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
  type McpApplicationServices,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
import { enabledAdminMirrorPublication } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSessionId,
} from "./admin-mirror-contract.ts";
import {
  createPlaySessionRegistry,
  decodePlaySessionId,
  type PlaySessionCreation,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  decodeGuestAccessGrant,
  decodeEpochMilliseconds,
} from "./play-session-access.ts";

describe("Play Session operation scheduling", () => {
  test("serializes calls within one session without coupling another session", async () => {
    const applicationServices = createMcpApplicationServices();
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          applicationServices,
          adminMirrorSessionId(playSessionId),
        ),
    });
    const first = createdLocalPlaySession(registry);
    const second = createdLocalPlaySession(registry);
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstMayFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let reportFirstStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      reportFirstStarted = resolve;
    });

    const firstCall = registry.run(
      first.playSessionId,
      first.caller,
      async () => {
        events.push("first:start");
        reportFirstStarted?.();
        await firstMayFinish;
        events.push("first:end");
      },
    );
    await firstStarted;
    const queuedCall = registry.run(first.playSessionId, first.caller, () => {
      events.push("first:queued");
    });
    const independentCall = registry.run(
      second.playSessionId,
      second.caller,
      () => {
        events.push("second:complete");
      },
    );

    const independentResult = await independentCall;
    expect(Result.isSuccess(independentResult)).toBe(true);
    expect(events).toEqual(["first:start", "second:complete"]);

    releaseFirst?.();
    const [firstResult, queuedResult] = await Promise.all([
      firstCall,
      queuedCall,
    ]);
    expect(Result.isSuccess(firstResult)).toBe(true);
    expect(Result.isSuccess(queuedResult)).toBe(true);
    expect(events).toEqual([
      "first:start",
      "second:complete",
      "first:end",
      "first:queued",
    ]);
  });

  test("creates independent enabled Admin Mirror publishers for each session", () => {
    const roots: McpPlaySessionRoot[] = [];
    let publisherIndex = 0;
    const applicationServices: McpApplicationServices = {
      ...createMcpApplicationServices(),
      createAdminMirrorPublication: (mirrorSessionId) => {
        const publisherInstanceId = adminMirrorPublisherInstanceId(
          `play-session-publisher:${publisherIndex++}`,
        );
        return enabledAdminMirrorPublication({
          mirrorSessionId,
          publisherInstanceId,
          publisher: { publish: () => Effect.void },
        });
      },
    };
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) => {
        const root = createMcpPlaySessionRoot(
          applicationServices,
          adminMirrorSessionId(playSessionId),
        );
        roots.push(root);
        return root;
      },
    });

    const first = createdLocalPlaySession(registry).playSessionId;
    const second = createdLocalPlaySession(registry).playSessionId;
    const [firstPublication, secondPublication] = roots.map(
      (root) => root.adminMirrorPublication,
    );

    expect(firstPublication).toMatchObject({
      tag: "enabled",
      mirrorSessionId: first,
    });
    expect(secondPublication).toMatchObject({
      tag: "enabled",
      mirrorSessionId: second,
    });
    expect(firstPublication).not.toBe(secondPublication);
    if (
      firstPublication?.tag !== "enabled" ||
      secondPublication?.tag !== "enabled"
    ) {
      throw new Error("Expected enabled per-session mirror publications.");
    }
    expect(firstPublication.publisher).not.toBe(secondPublication.publisher);
    expect(firstPublication.nextSequence()).toBe(0);
    expect(secondPublication.nextSequence()).toBe(0);
  });

  test("returns a typed failure when an injected ID keeps colliding", () => {
    const decoded = decodePlaySessionId(
      "play-session:00000000-0000-4000-8000-000000000000",
    );
    if (Result.isFailure(decoded)) throw new Error(decoded.failure);
    const applicationServices = createMcpApplicationServices();
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          applicationServices,
          adminMirrorSessionId(playSessionId),
        ),
      playSessionIdFactory: () => decoded.success,
    });

    expect(Result.isSuccess(registry.create({ tag: "localProcess" }))).toBe(
      true,
    );
    const collision = registry.create({ tag: "localProcess" });

    expect(Result.isFailure(collision)).toBe(true);
    if (Result.isSuccess(collision)) return;
    expect(collision.failure).toMatchObject({
      tag: "playSessionCreationFailed",
      reason: "playSessionIdCollision",
    });
  });

  test("does not authorize a local session through a guest-shaped caller", async () => {
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          undefined,
          adminMirrorSessionId(playSessionId),
        ),
    });
    const local = createdLocalPlaySession(registry);
    const guestAccessGrant = decodeGuestAccessGrant(
      `guest-access:${"a".repeat(64)}`,
    );
    if (Result.isFailure(guestAccessGrant)) {
      throw new Error(guestAccessGrant.failure);
    }
    const guestCaller = {
      tag: "guest" as const,
      guestAccessGrant: guestAccessGrant.success,
    };
    expect(
      await registry.run(local.playSessionId, guestCaller, () => "forbidden"),
    ).toMatchObject({
      _tag: "Failure",
      failure: { tag: "playSessionUnavailable" },
    });
  });

  test("keeps local sessions for the process lifetime", async () => {
    let nowMs = 0;
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          undefined,
          adminMirrorSessionId(playSessionId),
        ),
      now: () => testEpochMilliseconds(nowMs),
    });
    const local = createdLocalPlaySession(registry);
    nowMs = Number.MAX_SAFE_INTEGER;
    expect(
      await registry.run(local.playSessionId, local.caller, () => "available", {
        commandFor: () => ({
          name: "roll_dice",
          args: {
            groups: [{ dice: 1, dieSize: 6 }],
          },
        }),
        retain: () => false,
        succeeded: () => true,
      }),
    ).toMatchObject({ _tag: "Success" });
  });
});

function createdPlaySession(
  registry: PlaySessionRegistry,
): PlaySessionCreation {
  const created = registry.create({ tag: "localProcess" });
  if (Result.isFailure(created)) throw new Error(created.failure.message);
  return created.success;
}

function createdLocalPlaySession(registry: PlaySessionRegistry) {
  const creation = createdPlaySession(registry);
  if (creation.access.tag !== "localProcess") {
    throw new Error("Expected a process-local Play Session.");
  }
  return {
    playSessionId: creation.playSessionId,
    caller: { tag: "localProcess" as const },
  };
}

function testEpochMilliseconds(input: number) {
  const decoded = decodeEpochMilliseconds(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
  return decoded.success;
}
