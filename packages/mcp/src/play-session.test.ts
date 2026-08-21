import { Effect, Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpCompositionRoot,
  createPlaySessionCompositionRoot,
  type McpCompositionRoot,
} from "./composition-root.ts";
import { enabledAdminMirrorPublication } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSessionId,
} from "./admin-mirror-contract.ts";
import { createPlaySessionRegistry } from "./play-session.ts";

describe("Play Session operation scheduling", () => {
  test("serializes calls within one session without coupling another session", async () => {
    const applicationRoot = createMcpCompositionRoot();
    const registry = createPlaySessionRegistry({
      createRoot: (playSessionId) =>
        createPlaySessionCompositionRoot(
          applicationRoot,
          adminMirrorSessionId(playSessionId),
        ),
    });
    const first = registry.create().playSessionId;
    const second = registry.create().playSessionId;
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
    const roots: McpCompositionRoot[] = [];
    let publisherIndex = 0;
    const applicationRoot: McpCompositionRoot = {
      ...createMcpCompositionRoot(),
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
        const root = createPlaySessionCompositionRoot(
          applicationRoot,
          adminMirrorSessionId(playSessionId),
        );
        roots.push(root);
        return root;
      },
    });

    const first = registry.create().playSessionId;
    const second = registry.create().playSessionId;
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
});
