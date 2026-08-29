import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "@dnd/battle-runtime/test-support";
import { Effect, Result } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  adminProjection,
  createHttpAdminMirrorPublisher,
  disabledAdminMirrorPublication,
  enabledAdminMirrorPublication,
  publishAdminProjectionBestEffort,
} from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";

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

  test("publishes successful requests and exposes explicit publication states", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const publisher = createHttpAdminMirrorPublisher({
      endpoint: new URL("http://mirror.local/base"),
    });
    await Effect.runPromise(publisher.publish(envelope({ sequence: 0 })));
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://mirror.local/admin-projections"),
      expect.objectContaining({ method: "POST" }),
    );

    const disabled = disabledAdminMirrorPublication();
    expect(disabled.tag).toBe("disabled");
    await Effect.runPromise(
      disabled.publisher.publish(envelope({ sequence: 1 })),
    );

    const enabled = enabledAdminMirrorPublication({
      mirrorSessionId: adminMirrorSessionId("enabled"),
      publisher,
      publisherInstanceId: adminMirrorPublisherInstanceId("publisher"),
    });
    expect(enabled.nextSequence()).toBe(0);
    expect(enabled.nextSequence()).toBe(1);
  });

  test("keeps authored presentation out of timeline state", () => {
    const pendingProjection = projectionWithoutBattle();

    expect(JSON.stringify(pendingProjection)).not.toContain("Hunter's Mark");

    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 3, projection: pendingProjection }),
      100,
      envelope({
        sequence: 2,
        projection: projectionWithoutBattle(),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 4,
        projection: projectionWithoutBattle(),
      }),
      101,
      envelope({ sequence: 3, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBeNull();
    expect(resolvedEntry.actionSummary).toBeNull();
  });

  test("does not reconstruct authored attack names from mechanical execution selectors", () => {
    const pendingProjection = projectionWithoutBattle();

    expect(JSON.stringify(pendingProjection)).not.toContain("attackName");
    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 5, projection: pendingProjection }),
      102,
      envelope({
        sequence: 4,
        projection: projectionWithoutBattle(),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 6,
        projection: projectionWithoutBattle(),
      }),
      103,
      envelope({ sequence: 5, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBeNull();
    expect(resolvedEntry.actionSummary).toBeNull();
    expect(String(pendingEntry.actionSummary)).not.toContain("undefined");
    expect(String(resolvedEntry.actionSummary)).not.toContain("undefined");
  });

  test("skips projections when an active battle lacks presentation context", () => {
    const publish = vi.fn(() => Effect.void);
    const root = {
      ...createMcpPlaySessionRoot(),
      adminMirrorPublication: enabledAdminMirrorPublication({
        mirrorSessionId: adminMirrorSessionId("invalid-projection"),
        publisher: { publish },
        publisherInstanceId: adminMirrorPublisherInstanceId(
          "invalid-projection-publisher",
        ),
      }),
    };
    handleToolCall(root, "start_battle", {
      battleId: "battle:invalid-admin-projection",
      initiativeMode: "direct",
      companionAdmissions: [],
      initialCombatants: [
        {
          admissionSource: { kind: "encounterParticipant" },
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          combatantId: "goblin",
          initiative: 10,
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
        },
      ],
    });
    const session = root.sessionStore.battleSession;
    if (session === null) {
      throw new Error("Expected an active Admin Mirror test battle.");
    }
    root.sessionStore.storeActiveBattle(
      battleRuntimeSessionForTest({
        state: session.state,
        context: battleRuntimeContextForTest(session.context.characters),
      }),
    );

    publish.mockClear();
    expect(Result.isFailure(adminProjection(root))).toBe(true);
    publishAdminProjectionBestEffort(root);
    expect(publish).not.toHaveBeenCalled();
  });
});

function envelope(input: {
  readonly sequence: number;
  readonly projection?: AdminMirrorProjectionEnvelope["projection"];
}): AdminMirrorProjectionEnvelope {
  return {
    mirrorSessionId: adminMirrorSessionId("demo"),
    projection: input.projection ?? {
      battle: null,
      characters: [],
      session: {
        battleState: { tag: "none" },
        draftIds: [],
        selectedStatBlockId: null,
      },
    },
    publisherInstanceId: adminMirrorPublisherInstanceId("publisher-a"),
    sequence: adminMirrorSequence(input.sequence),
    sourceProcessId: 1,
  };
}

function projectionWithoutBattle(): AdminMirrorProjectionEnvelope["projection"] {
  return {
    battle: null,
    characters: [],
    session: {
      battleState: { tag: "none" },
      draftIds: [],
      selectedStatBlockId: null,
    },
  };
}
