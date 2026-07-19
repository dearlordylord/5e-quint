import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  combatantId,
  spellSlotInvocationRef,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Effect, Schema } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createHttpAdminMirrorPublisher } from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  AdminMirrorProjectionEnvelopeSchema,
  adminMirrorSequence,
  adminMirrorSessionId,
  type AdminMirrorProjectionEnvelope,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Admin Mirror presentation test Unit catalog must build.");
}
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

  test("joins pending and resolved timeline text from selected presentation content without session display strings", () => {
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
      presentation: {
        kind: "spell",
        procedureRef,
        invocation: spellSlotInvocationRef(
          "hunters_mark",
          1,
          "markedDamageRider",
        ),
      },
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

    expect(
      Schema.decodeUnknownEither(AdminMirrorProjectionEnvelopeSchema)(
        envelope({ sequence: 3, projection: pendingProjection }),
      )._tag,
    ).toBe("Left");

    const pendingEntry = createAdminMirrorPresentationTimelineEntry(
      envelope({
        sequence: 3,
        projection: pendingProjection,
        selectedContent: unitCatalogResult.catalog.requireUnit("hunters_mark"),
      }),
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
      envelope({
        sequence: 3,
        projection: pendingProjection,
        selectedContent: unitCatalogResult.catalog.requireUnit("hunters_mark"),
      }),
    );

    expect(pendingEntry.actionSummary).toBe(
      "presentation-actor casts Hunter's Mark",
    );
    expect(resolvedEntry.actionSummary).toBe(
      "presentation-actor casts Hunter's Mark",
    );
  });
});

function envelope(input: {
  readonly sequence: number;
  readonly projection?: AdminMirrorProjectionEnvelope["projection"];
  readonly selectedContent?: AdminMirrorProjectionEnvelope["selectedContent"];
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
    selectedContent: input.selectedContent ?? null,
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
