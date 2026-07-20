import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  combatantId,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import { Effect } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createHttpAdminMirrorPublisher } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";

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

  test("keeps authored presentation out of pending and resolved timeline state", () => {
    const actorId = combatantId("presentation-actor");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("presentation-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const pendingProjection = projectionWithTransientBattleFills({
      fills: [],
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef,
        mode: { tag: "cast" },
      },
    });

    expect(pendingProjection.session.transientBattleFills).not.toHaveProperty(
      "label",
    );
    expect(pendingProjection.session.transientBattleFills).not.toHaveProperty(
      "summary",
    );
    expect(
      JSON.stringify(pendingProjection.session.transientBattleFills),
    ).not.toContain("Hunter's Mark");

    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 3, projection: pendingProjection }),
      100,
      envelope({
        sequence: 2,
        projection: projectionWithTransientBattleFills(null),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 4,
        projection: projectionWithTransientBattleFills(null),
      }),
      101,
      envelope({ sequence: 3, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBe("Battle action pending");
    expect(resolvedEntry.actionSummary).toBe("Battle action resolved");
  });

  test("does not reconstruct authored attack names from mechanical execution selectors", () => {
    const actorId = combatantId("presentation-attacker");
    const procedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("presentation-attack-battle"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const pendingProjection = projectionWithTransientBattleFills({
      fills: [],
      subject: {
        tag: "action",
        action: "attack",
        actorId,
        procedureRef,
        attackAbility: "dex",
        attackDamageType: "force",
      },
    });

    expect(
      pendingProjection.session.transientBattleFills?.subject,
    ).not.toHaveProperty("attackName");
    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({ sequence: 5, projection: pendingProjection }),
      102,
      envelope({
        sequence: 4,
        projection: projectionWithTransientBattleFills(null),
      }),
    );
    const resolvedEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 6,
        projection: projectionWithTransientBattleFills(null),
      }),
      103,
      envelope({ sequence: 5, projection: pendingProjection }),
    );

    expect(pendingEntry.actionSummary).toBe("Battle action pending");
    expect(resolvedEntry.actionSummary).toBe("Battle action resolved");
    expect(pendingEntry.actionSummary).not.toContain("undefined");
    expect(resolvedEntry.actionSummary).not.toContain("undefined");
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

function projectionWithTransientBattleFills(
  transientBattleFills: AdminMirrorProjectionEnvelope["projection"]["session"]["transientBattleFills"],
): AdminMirrorProjectionEnvelope["projection"] {
  return {
    battle: null,
    characters: [],
    session: {
      activeBattle: null,
      draftIds: [],
      selectedStatBlockId: null,
      transientBattleFills,
    },
  };
}
