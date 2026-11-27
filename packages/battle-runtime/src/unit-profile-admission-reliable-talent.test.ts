// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.d20-test-die-minimum
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.DIE_MINIMUM

import { DieRollResult, difficultyClass } from "@dnd/shared/types";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  D20_TEST_DIE_MINIMUM_EFFECT_KIND,
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleD20TestDieMinimumDecision,
  type BattleD20TestNaturalOneRerollDecision,
  type BattleHole,
  type BattleResolutionResult,
} from "./battle-state-execution.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  D20_TEST_DIE_MINIMUM_DECISION_REQUIRED_MESSAGE,
  D20_TEST_DIE_MINIMUM_UNAVAILABLE_MESSAGE,
} from "./battle-reducer/d20-test-die-minimum.ts";
import { D20_TEST_NATURAL_ONE_REROLL_MODIFIER_MESSAGE } from "./battle-reducer/d20-test-natural-one-reroll.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import {
  D20_TEST_DIE_MINIMUM_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  abilityCheckFill,
  characterBattleFeatureInitForTest,
  characterSeed,
  fighterId,
  hidePrerequisites,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

const reliableTalentUnitId = "rogue_reliable_talent";

const expectedDieMinimum = {
  appliesTo: "abilityCheckUsingOwnProficiency",
  minimumDieFace: 10,
} as const;

const hide = {
  tag: "action",
  actorId: fighterId,
  action: "hide",
} satisfies BattleSubject;

const useMinimum = {
  kind: "use",
  effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
} as const satisfies BattleD20TestDieMinimumDecision;

const declineMinimum = {
  kind: "decline",
  effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
} as const satisfies BattleD20TestDieMinimumDecision;

describe("D20 Test die minimum (Reliable Talent)", () => {
  test("the record admits a d20 minimum of 10 on ability checks that use the roller's own proficiency", () => {
    const unit = unitLibrary.requireUnit(reliableTalentUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Result.isSuccess(unitRef)).toBe(true);
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    expect(unitRef.success.supportProfiles).toEqual([
      {
        kind: D20_TEST_DIE_MINIMUM_SUPPORT_PROFILE,
        dieMinimum: expectedDieMinimum,
      },
    ]);
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual({
      kind: "d20TestDieMinimum",
      unit,
      dieMinimum: expectedDieMinimum,
    });
  });

  test("a check with a proficient skill offers the minimum, and the hole round-trips through its codec", () => {
    const check = hideCheck(battleWith({ stealthProficient: true }));
    expect(check.d20TestDieMinimum).toEqual({
      effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
      label: "D20 Test d20 minimum 10",
      minimumDieFace: 10,
    });
    const encoded = Schema.encodeSync(BattleHoleSchema)(check);
    expect(Schema.decodeUnknownSync(BattleHoleSchema)(encoded)).toEqual(check);
  });

  test("an unproficient check, or a roller without the feature, is not offered the minimum", () => {
    expect(
      hideCheck(battleWith({ stealthProficient: false })).d20TestDieMinimum,
    ).toBeUndefined();
    expect(
      hideCheck(battleWith({ stealthProficient: true, reliableTalent: false }))
        .d20TestDieMinimum,
    ).toBeUndefined();
  });

  test("the fill must decide on an offered minimum, and may not decide on one it was not offered", () => {
    const offered = battleWith({ stealthProficient: true });
    expect(
      resolveBattleSubject({
        state: offered,
        subject: hide,
        fills: [abilityCheckFill(hideCheck(offered), { total: 17 })],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_DIE_MINIMUM_DECISION_REQUIRED_MESSAGE,
    });

    const unproficient = battleWith({ stealthProficient: false });
    expect(
      resolveBattleSubject({
        state: unproficient,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(unproficient), {
            total: 17,
            naturalD20: 3,
            d20TestDieMinimum: useMinimum,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_DIE_MINIMUM_UNAVAILABLE_MESSAGE,
    });
  });

  test("the table's total with the minimum used is the check's total", () => {
    const state = battleWith({ stealthProficient: true });
    const fill = abilityCheckFill(hideCheck(state), {
      total: 17,
      naturalD20: 3,
      d20TestDieMinimum: useMinimum,
    });
    expect(
      Schema.decodeUnknownSync(BattleFillSchema)(
        Schema.encodeSync(BattleFillSchema)(fill),
      ),
    ).toEqual(fill);
    const hidden = requireResolved(
      resolveBattleSubject({ state, subject: hide, fills: [fill] }),
    ).state;
    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });

    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(state), {
            total: 10,
            naturalD20: 3,
            d20TestDieMinimum: declineMinimum,
          }),
        ],
      }),
    ).state;
    // Declined, the natural 3 counts: 10 fails the Hide DC of 15.
    expect(declined.combatants.get(fighterId)?.hidden).toBeNull();
  });

  test("a reroll keeps the modifiers of a total that counts the minimum", () => {
    // Natural 1 counted as 10, +7: 17. The natural-1 reroll shows 15: 22.
    const state = battleWith({ stealthProficient: true, halflingLuck: true });
    const rerolled = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(state), {
            total: 17,
            naturalD20: 1,
            d20TestDieMinimum: useMinimum,
            d20TestRerolls: [naturalOneReroll({ total: 22, naturalD20: 15 })],
          }),
        ],
      }),
    ).state;
    expect(rerolled.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(22),
    });

    // The reroll shows 4, which also counts as 10: the total stays 17.
    const lowReroll = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(state), {
            total: 17,
            naturalD20: 1,
            d20TestDieMinimum: useMinimum,
            d20TestRerolls: [naturalOneReroll({ total: 17, naturalD20: 4 })],
          }),
        ],
      }),
    ).state;
    expect(lowReroll.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });

    // A reroll total that adds the natural face to a minimum-counted
    // original changes the modifiers.
    expect(
      resolveBattleSubject({
        state,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(state), {
            total: 17,
            naturalD20: 1,
            d20TestDieMinimum: useMinimum,
            d20TestRerolls: [naturalOneReroll({ total: 11, naturalD20: 4 })],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_MODIFIER_MESSAGE,
    });

    // Declined, the natural faces count.
    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide,
        fills: [
          abilityCheckFill(hideCheck(state), {
            total: 8,
            naturalD20: 1,
            d20TestDieMinimum: declineMinimum,
            d20TestRerolls: [naturalOneReroll({ total: 19, naturalD20: 12 })],
          }),
        ],
      }),
    ).state;
    expect(declined.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(19),
    });
  });
});

function battleWith(input: {
  readonly stealthProficient: boolean;
  readonly reliableTalent?: boolean;
  readonly halflingLuck?: boolean;
}) {
  const unitIds = [
    ...(input.reliableTalent === false ? [] : [reliableTalentUnitId]),
    ...(input.halflingLuck === true ? [speciesHalflingLuckUnitId] : []),
  ];
  const units = unitIds.map((id) => unitLibrary.requireUnit(id));
  const unitRefs = units.map((unit) => {
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    return unitRef.success;
  });
  return startBattleRight({
    battleId: battleId("reliable-talent-d20-test"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevel: 7,
        characterUnitRefs: unitRefs,
        unitFeatures: units.map((unit) =>
          characterBattleFeatureInitForTest(unit),
        ),
        d20Statistics: {
          ...testCharacterD20Statistics({ dex: 16 }),
          skillProficiencies: input.stealthProficient ? ["stealth"] : [],
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
}

function hideCheck(
  state: ReturnType<typeof battleWith>,
): Extract<BattleHole, { readonly kind: "abilityCheck" }> {
  return requireAbilityCheck(
    resolveBattleSubject({ state, subject: hide, fills: [] }),
  );
}

function requireAbilityCheck(
  result: BattleResolutionResult,
): Extract<BattleHole, { readonly kind: "abilityCheck" }> {
  const hole = requireHole(result, "abilityCheck");
  if (hole.kind !== "abilityCheck") throw new Error("Expected abilityCheck.");
  return hole;
}

function naturalOneReroll(input: {
  readonly total: number;
  readonly naturalD20: number;
}): BattleD20TestNaturalOneRerollDecision {
  return {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      total: input.total,
      d20TestRoll: {
        tag: "single",
        naturalD20: DieRollResult(input.naturalD20),
      },
    },
  };
}
