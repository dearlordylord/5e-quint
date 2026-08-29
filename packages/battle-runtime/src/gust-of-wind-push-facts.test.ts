// RAW trace: .references/srd-5.2.1/Spells/Descriptions-E-L.md#Gust of Wind
// A failed Strength save pushes the creature 15 feet away along the Line.
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { validateGustOfWindLineAreaPushFacts } from "./battle-reducer/gust-of-wind-push-facts.ts";
import type {
  BattleGustOfWindLineCreaturePushOutcome,
  BattleSpellAreaChoice,
} from "./battle-state-execution.ts";
import {
  battleAreaId,
  battleTablePositionId,
  combatantId,
} from "./unit-profile-admission.test-support.ts";
import {
  greaseAreaId,
  gustOfWindEastDirectionId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";

const gustOfWindAreaId = battleAreaId("gust-of-wind-push-facts-area");
const gustOfWindSecondTargetId = combatantId(
  "gust-of-wind-push-facts-second-target",
);
const pushDistanceFeet = movementFeet(15);

describe("Gust of Wind Line push facts", () => {
  test.each([
    { name: "omitted", area: undefined },
    {
      name: "for another spell area",
      area: {
        kind: "persistentAreaSaveConditionArea",
        areaId: greaseAreaId,
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      } satisfies BattleSpellAreaChoice,
    },
  ])(
    "requires caller-supplied Line facts when the area is $name",
    ({ area }) => {
      expect(
        validateGustOfWindLineAreaPushFacts({
          area,
          failedTargetIds: [spellTargetId],
          pushDistanceFeet,
        }),
      ).toBe(
        "Gust of Wind requires caller-supplied Line area, direction, and failed-save push facts.",
      );
    },
  );

  test("rejects a push for a creature that did not fail its save", () => {
    expect(
      validateGustOfWindLineAreaPushFacts({
        area: gustOfWindArea([pushedCreature(gustOfWindSecondTargetId)]),
        failedTargetIds: [spellTargetId],
        pushDistanceFeet,
      }),
    ).toBe("Gust of Wind push facts must match failed-save targets.");
  });

  test("rejects duplicate push facts for one creature", () => {
    expect(
      validateGustOfWindLineAreaPushFacts({
        area: gustOfWindArea([
          pushedCreature(spellTargetId),
          pushedCreature(spellTargetId),
        ]),
        failedTargetIds: [spellTargetId],
        pushDistanceFeet,
      }),
    ).toBe("Gust of Wind push facts must not duplicate targets.");
  });

  test("requires one push disposition for every failed save", () => {
    expect(
      validateGustOfWindLineAreaPushFacts({
        area: gustOfWindArea([pushedCreature(spellTargetId)]),
        failedTargetIds: [spellTargetId, gustOfWindSecondTargetId],
        pushDistanceFeet,
      }),
    ).toBe("Gust of Wind push facts must cover every failed-save target.");
  });

  test("rejects a disposition with the wrong push distance", () => {
    expect(
      validateGustOfWindLineAreaPushFacts({
        area: gustOfWindArea([
          {
            ...pushedCreature(spellTargetId),
            disposition: {
              ...pushedCreature(spellTargetId).disposition,
              distanceFeet: movementFeet(10),
            },
          },
        ]),
        failedTargetIds: [spellTargetId],
        pushDistanceFeet,
      }),
    ).toBe(
      "Gust of Wind push disposition must use the spell's 15-foot distance.",
    );
  });

  test("accepts both a supplied destination and a blocked push", () => {
    expect(
      validateGustOfWindLineAreaPushFacts({
        area: gustOfWindArea([
          pushedCreature(spellTargetId),
          {
            targetId: gustOfWindSecondTargetId,
            disposition: {
              kind: "blocked",
              distanceFeet: pushDistanceFeet,
              reason: "noLegalDestination",
              provokesOpportunityAttacks: false,
            },
          },
        ]),
        failedTargetIds: [spellTargetId, gustOfWindSecondTargetId],
        pushDistanceFeet,
      }),
    ).toBeNull();
  });
});

function gustOfWindArea(
  creaturePushes: readonly BattleGustOfWindLineCreaturePushOutcome[],
): Extract<
  BattleSpellAreaChoice,
  { readonly kind: "directionalPersistentAreaArea" }
> {
  return {
    kind: "directionalPersistentAreaArea",
    areaId: gustOfWindAreaId,
    directionId: gustOfWindEastDirectionId,
    originAnchorId: spellCasterId,
    affectedTargetIds: creaturePushes.map((push) => push.targetId),
    creaturePushes,
  };
}

function pushedCreature(
  targetId: BattleGustOfWindLineCreaturePushOutcome["targetId"],
): BattleGustOfWindLineCreaturePushOutcome {
  return {
    targetId,
    disposition: {
      kind: "pushed",
      distanceFeet: pushDistanceFeet,
      destinationId: battleTablePositionId(`gust-pushed:${targetId}`),
      provokesOpportunityAttacks: false,
    },
  };
}
