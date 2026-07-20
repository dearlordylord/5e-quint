import { afterEach, describe, expect, test, vi } from "vitest";

import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorStore } from "./admin-mirror-store.ts";

describe("Admin Mirror store", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("ignores stale snapshots from the same publisher", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const store = createAdminMirrorStore();

    expect(store.publish(envelope({ sequence: 1 }))).toBe(true);
    expect(store.publish(envelope({ sequence: 0 }))).toBe(false);
    expect(store.latest()[0]?.envelope.sequence).toBe(1);
  });

  test("keeps multi-source warning while multiple fresh publishers exist", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    vi.setSystemTime(1_000);
    expect(
      store.publish(envelope({ publisher: "publisher-a", sequence: 0 })),
    ).toBe(true);
    expect(store.latest()[0]?.multiSource).toBe(false);

    vi.setSystemTime(2_000);
    expect(
      store.publish(envelope({ publisher: "publisher-b", sequence: 0 })),
    ).toBe(true);
    expect(store.latest()[0]?.multiSource).toBe(true);

    vi.setSystemTime(3_000);
    expect(
      store.publish(envelope({ publisher: "publisher-b", sequence: 1 })),
    ).toBe(true);
    expect(store.latest()[0]?.multiSource).toBe(true);
  });

  test("drops stale publisher identities from the multi-source window", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    vi.setSystemTime(1_000);
    store.publish(envelope({ publisher: "publisher-a", sequence: 0 }));

    vi.setSystemTime(31_001);
    store.publish(envelope({ publisher: "publisher-b", sequence: 0 }));
    expect(store.latest()[0]?.multiSource).toBe(false);
  });

  test("lists newest sessions first", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    vi.setSystemTime(1_000);
    store.publish(envelope({ mirrorSessionId: "older", sequence: 0 }));
    vi.setSystemTime(2_000);
    store.publish(envelope({ mirrorSessionId: "newer", sequence: 0 }));

    expect(
      store.latest().map((session) => session.envelope.mirrorSessionId),
    ).toEqual(["newer", "older"]);
  });

  test("bounds retained mirror sessions", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    for (let index = 0; index < 33; index += 1) {
      vi.setSystemTime(index + 1);
      store.publish(
        envelope({
          mirrorSessionId: `session-${index}`,
          sequence: 0,
        }),
      );
    }

    expect(store.latest()).toHaveLength(32);
    expect(
      store
        .latest()
        .some((session) => session.envelope.mirrorSessionId === "session-0"),
    ).toBe(false);
  });

  test("keeps a newest-first bounded presentation timeline per session", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    for (let index = 0; index < 100; index += 1) {
      vi.setSystemTime(index + 1);
      store.publish(envelope({ sequence: index }));
    }

    const latest = store.latest()[0];
    expect(latest?.presentationTimeline).toHaveLength(96);
    expect(latest?.presentationTimeline?.[0]?.sequence).toBe(99);
    expect(latest?.presentationTimeline?.at(-1)?.sequence).toBe(4);
  });

  test("bounds fresh publisher identities per mirror session", () => {
    vi.useFakeTimers();
    const store = createAdminMirrorStore();

    for (let index = 0; index < 9; index += 1) {
      vi.setSystemTime(index + 1);
      expect(
        store.publish(
          envelope({
            publisher: `publisher-${index}`,
            sequence: 0,
          }),
        ),
      ).toBe(true);
    }

    expect(
      store.publish(envelope({ publisher: "publisher-0", sequence: 0 })),
    ).toBe(true);
  });
});

function envelope(input: {
  readonly mirrorSessionId?: string;
  readonly publisher?: string;
  readonly sequence: number;
}): AdminMirrorProjectionEnvelope {
  return {
    mirrorSessionId: adminMirrorSessionId(input.mirrorSessionId ?? "demo"),
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
    publisherInstanceId: adminMirrorPublisherInstanceId(
      input.publisher ?? "publisher-a",
    ),
    sequence: adminMirrorSequence(input.sequence),
    sourceProcessId: 1,
  };
}
