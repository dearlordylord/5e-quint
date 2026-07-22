// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ranger-tireless
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L10-SHEET-RANGER-TIRELESS ranger_tireless
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L10-SHEET-RANGER-TIRELESS ranger_tireless
// UNIT-IDENTITY-REPLAY: L10-SHEET-RANGER-TIRELESS ranger_tireless doUseRangerTireless
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  DieRollResult,
  Hp,
  characterSheetId,
  completeLongRest,
  completeShortRest,
  rebuildCharacterSheetFixture,
  armorClassBuild,
  requireRight,
  resourceCount,
  unitLibrary,
  useRangerTirelessTemporaryHitPoints,
} from "./test-support.ts";

export const rangerTirelessTemporaryHitPointsTestName =
  "Tireless spends a Wisdom-based use to grant minimum-one Temporary Hit Points";
export const rangerTirelessRestRecoveryTestName =
  "Tireless recovers uses on Long Rest and reduces Exhaustion on Short Rest";

const rangerTirelessSelectedIdentityDriverSchema = {
  doUseRangerTireless: {},
} as const;

type RangerTirelessSelectedIdentityDriverAction =
  keyof typeof rangerTirelessSelectedIdentityDriverSchema;

type RangerTirelessSelectedIdentityProjection = {
  readonly unitId: "ranger_tireless";
  readonly tempHp: number;
  readonly expendedUses: number;
  readonly exhaustionAfterShortRest: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RangerTirelessSelectedIdentityDriverAction[];
  readonly expected: RangerTirelessSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L10-SHEET-RANGER-TIRELESS";
  readonly unitId: "ranger_tireless";
  readonly actions: readonly RangerTirelessSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L10-SHEET-RANGER-TIRELESS",
    unitId: "ranger_tireless",
    actions: ["doUseRangerTireless"],
    sequences: [
      {
        name: "selected-ranger-tireless-spends-use-and-short-rest-reduces-exhaustion",
        actions: ["doUseRangerTireless"],
        expected: {
          unitId: "ranger_tireless",
          tempHp: 4,
          expendedUses: 1,
          exhaustionAfterShortRest: 1,
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Ranger Tireless", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<RangerTirelessSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: RangerTirelessSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = rangerTirelessSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test(rangerTirelessTemporaryHitPointsTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:ranger-tireless"),
        build: rangerTirelessBuild(),
        currentHp: Hp(58),
        tempHp: Hp(5),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary,
      }),
    );

    const used = requireRight(
      useRangerTirelessTemporaryHitPoints({
        sheet,
        unitLibrary,
        tirelessRoll: DieRollResult(1),
      }),
    );

    expect(used.hitPoints.tempHp).toBe(Hp(5));
    expect(used.resourceExpenditures).toContainEqual({
      tag: "useCountResource",
      unitId: authoredUnitId("ranger_tireless"),
      expended: resourceCount(1),
    });

    expect(
      useRangerTirelessTemporaryHitPoints({
        sheet: used,
        unitLibrary,
        tirelessRoll: DieRollResult(9),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Tireless roll must be within d8." },
    });
  });

  test(rangerTirelessRestRecoveryTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:ranger-tireless-rest"),
        build: rangerTirelessBuild(),
        currentHp: Hp(58),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        exhaustionLevel: 2,
        conditions: [],
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: authoredUnitId("ranger_tireless"),
            expended: resourceCount(3),
          },
        ],
      }),
    );

    const shortRested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
      }),
    );

    expect(shortRested.exhaustionLevel).toBe(1);
    expect(shortRested.resourceExpenditures).toContainEqual({
      tag: "useCountResource",
      unitId: authoredUnitId("ranger_tireless"),
      expended: resourceCount(3),
    });

    const longRested = requireRight(
      completeLongRest({
        sheet: shortRested,
        timing: { tag: "noPriorLongRest" },
        unitLibrary,
      }),
    );

    expect(longRested.exhaustionLevel).toBe(0);
    expect(longRested.resourceExpenditures).not.toContainEqual(
      expect.objectContaining({
        tag: "useCountResource",
        unitId: authoredUnitId("ranger_tireless"),
      }),
    );
  });
});

const rangerTirelessSelectedIdentityActions = {
  doUseRangerTireless: (): RangerTirelessSelectedIdentityProjection => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:ranger-tireless-replay"),
        build: rangerTirelessBuild(),
        currentHp: Hp(58),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        exhaustionLevel: 2,
        conditions: [],
        unitLibrary,
      }),
    );
    const used = requireRight(
      useRangerTirelessTemporaryHitPoints({
        sheet,
        unitLibrary,
        tirelessRoll: DieRollResult(1),
      }),
    );
    const rested = requireRight(
      completeShortRest({ sheet: used, unitLibrary }),
    );
    return {
      unitId: "ranger_tireless",
      tempHp: Number(used.hitPoints.tempHp),
      expendedUses: Number(
        used.resourceExpenditures.find(
          (expenditure) =>
            expenditure.tag === "useCountResource" &&
            expenditure.unitId === "ranger_tireless",
        )?.expended ?? 0,
      ),
      exhaustionAfterShortRest: rested.exhaustionLevel,
    };
  },
} as const satisfies Record<
  RangerTirelessSelectedIdentityDriverAction,
  () => RangerTirelessSelectedIdentityProjection
>;

function rangerTirelessBuild() {
  return armorClassBuild({
    startingClass: "class_ranger",
    advancements: Array.from({ length: 9 }, () => "class_ranger"),
  });
}
