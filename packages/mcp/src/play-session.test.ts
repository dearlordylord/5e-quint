import { Effect, Either } from "effect";
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
    const first = createdPlaySession(registry).playSessionId;
    const second = createdPlaySession(registry).playSessionId;
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstMayFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let reportFirstStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      reportFirstStarted = resolve;
    });

    const firstCall = registry.run(first, async () => {
      events.push("first:start");
      reportFirstStarted?.();
      await firstMayFinish;
      events.push("first:end");
    });
    await firstStarted;
    const queuedCall = registry.run(first, () => {
      events.push("first:queued");
    });
    const independentCall = registry.run(second, () => {
      events.push("second:complete");
    });

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

    const first = createdPlaySession(registry).playSessionId;
    const second = createdPlaySession(registry).playSessionId;
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

    expect(Either.isRight(registry.create())).toBe(true);
    const collision = registry.create();

    expect(Either.isLeft(collision)).toBe(true);
    if (Either.isRight(collision)) return;
    expect(collision.left).toMatchObject({
      tag: "playSessionCreationFailed",
      reason: "playSessionIdCollision",
    });
  });
});

function createdPlaySession(
  registry: PlaySessionRegistry,
): PlaySessionCreation {
  const created = registry.create();
  if (Either.isLeft(created)) throw new Error(created.left.message);
  return created.right;
}
