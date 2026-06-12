import { Effect } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createHttpAdminMirrorPublisher } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";

describe("Admin Mirror publisher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("coalesces slow publishes to the latest pending snapshot", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const publisher = createHttpAdminMirrorPublisher({
      endpoint: new URL("http://mirror.local"),
      timeoutMs: 50,
    });

    const first = Effect.runPromise(
      publisher.publish(envelope({ sequence: 0 })),
    );
    await Promise.resolve();
    await Effect.runPromise(publisher.publish(envelope({ sequence: 1 })));
    await Effect.runPromise(publisher.publish(envelope({ sequence: 2 })));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      sequence: 2,
    });
    await vi.advanceTimersByTimeAsync(50);
    await first;
  });
});

function envelope(input: {
  readonly sequence: number;
}): AdminMirrorProjectionEnvelope {
  return {
    mirrorSessionId: adminMirrorSessionId("demo"),
    projection: {
      battle: null,
      characters: [],
      session: {
        activeBattle: null,
        draftIds: [],
        selectedStatBlockId: null,
        transientBattleFills: null,
      },
    },
    publisherInstanceId: adminMirrorPublisherInstanceId("publisher-a"),
    sequence: adminMirrorSequence(input.sequence),
    sourceProcessId: 1,
  };
}
