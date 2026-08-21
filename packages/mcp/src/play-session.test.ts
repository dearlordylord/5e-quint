import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpCompositionRoot,
  createPlaySessionCompositionRoot,
} from "./composition-root.ts";
import { createPlaySessionRegistry } from "./play-session.ts";

describe("Play Session operation scheduling", () => {
  test("serializes calls within one session without coupling another session", async () => {
    const applicationRoot = createMcpCompositionRoot();
    const registry = createPlaySessionRegistry({
      createRoot: () => createPlaySessionCompositionRoot(applicationRoot),
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
});
