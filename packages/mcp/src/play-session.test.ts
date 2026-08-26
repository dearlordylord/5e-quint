import { Effect, Either } from "effect";
import { describe, expect, test } from "vitest";
import { decodeDiceRollRequestId } from "./dice-tool-input.ts";

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
  GUEST_INACTIVITY_RETENTION_MS,
  decodeEpochMilliseconds,
  decodePrincipalId,
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
    const first = createdGuestPlaySession(registry);
    const second = createdGuestPlaySession(registry);
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
    expect(Either.isRight(independentResult)).toBe(true);
    expect(events).toEqual(["first:start", "second:complete"]);

    releaseFirst?.();
    const [firstResult, queuedResult] = await Promise.all([
      firstCall,
      queuedCall,
    ]);
    expect(Either.isRight(firstResult)).toBe(true);
    expect(Either.isRight(queuedResult)).toBe(true);
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

    const first = createdGuestPlaySession(registry).playSessionId;
    const second = createdGuestPlaySession(registry).playSessionId;
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
    if (Either.isLeft(decoded)) throw new Error(decoded.left);
    const applicationServices = createMcpApplicationServices();
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          applicationServices,
          adminMirrorSessionId(playSessionId),
        ),
      playSessionIdFactory: () => decoded.right,
    });

    expect(Either.isRight(registry.create({ tag: "anonymous" }))).toBe(true);
    const collision = registry.create({ tag: "anonymous" });

    expect(Either.isLeft(collision)).toBe(true);
    if (Either.isRight(collision)) return;
    expect(collision.left).toMatchObject({
      tag: "playSessionCreationFailed",
      reason: "playSessionIdCollision",
    });
  });

  test("rechecks guest ownership behind a queued save", async () => {
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          undefined,
          adminMirrorSessionId(playSessionId),
        ),
    });
    const guest = createdGuestPlaySession(registry);
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: (() => void) | undefined;
    const operationStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const first = registry.run(guest.playSessionId, guest.caller, async () => {
      started?.();
      await blocked;
    });
    await operationStarted;
    const owner = decodePrincipalId("principal:queued-save");
    if (Either.isLeft(owner)) throw new Error(owner.left);
    const saved = registry.save(
      guest.playSessionId,
      guest.caller.guestAccessGrant,
      owner.right,
    );
    const stale = registry.run(
      guest.playSessionId,
      guest.caller,
      () => "stale",
    );
    release?.();
    await first;
    expect(await saved).toMatchObject({ _tag: "Right" });
    expect(await stale).toMatchObject({
      _tag: "Left",
      left: { tag: "playSessionUnavailable" },
    });
  });

  test("does not refresh inactivity after an unsuccessful operation", async () => {
    let nowMs = 0;
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createMcpPlaySessionRoot(
          undefined,
          adminMirrorSessionId(playSessionId),
        ),
      now: () => testEpochMilliseconds(nowMs),
    });
    const guest = createdGuestPlaySession(registry);
    nowMs = GUEST_INACTIVITY_RETENTION_MS - 1;
    expect(
      await registry.run(guest.playSessionId, guest.caller, () => "failed", {
        commandFor: () => ({
          name: "roll_dice",
          args: {
            requestId: requireDiceRollRequestId(
              "00000000-0000-4000-8000-000000000401",
            ),
            groups: [{ dice: 1, dieSize: 6 }],
          },
        }),
        retain: () => false,
        succeeded: () => false,
      }),
    ).toMatchObject({ _tag: "Right" });
    nowMs = GUEST_INACTIVITY_RETENTION_MS;
    expect(
      await registry.run(guest.playSessionId, guest.caller, () => "expired"),
    ).toMatchObject({
      _tag: "Left",
      left: { tag: "playSessionUnavailable" },
    });
  });
});

function createdPlaySession(
  registry: PlaySessionRegistry,
): PlaySessionCreation {
  const created = registry.create({ tag: "anonymous" });
  if (Either.isLeft(created)) throw new Error(created.left.message);
  return created.right;
}

function createdGuestPlaySession(registry: PlaySessionRegistry) {
  const creation = createdPlaySession(registry);
  if (creation.access.tag !== "guest") {
    throw new Error("Expected a Guest Play Session.");
  }
  return {
    playSessionId: creation.playSessionId,
    caller: {
      tag: "guest" as const,
      guestAccessGrant: creation.access.guestAccessGrant,
    },
  };
}

function testEpochMilliseconds(input: number) {
  const decoded = decodeEpochMilliseconds(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}

function requireDiceRollRequestId(input: string) {
  const decoded = decodeDiceRollRequestId(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}
