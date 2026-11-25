// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
} from "@dnd/shared/game-facts";
import { d20Roll } from "@dnd/shared/types";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { BattleFillSchema } from "./battle-reducer/battle-codecs.ts";
import { abilityCheckValueThatStands } from "./battle-reducer/d20-test-rolls-that-stand.ts";
import {
  abilityCheckFill,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  combatantId,
  endTurn,
  fighterId,
  findAct,
  findHole,
  hidePrerequisites,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterD20Statistics,
} from "./battle-runtime.test-support.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleAbilityCheckD20TestRerollDecision,
  type BattleD20TestMultipleRoll,
  type BattleD20TestRolledDieKey,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { requireResultHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

const helperId = combatantId("physical-die-help-provider");

function multiple(
  first: number,
  second: number,
  rollMode: BattleD20TestMultipleRoll["rollMode"] = "advantage",
): BattleD20TestMultipleRoll {
  return {
    tag: "multiple",
    first: d20Roll(first),
    second: d20Roll(second),
    rollMode,
  };
}

function helpedHide(luck: boolean) {
  const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
  const admitted = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(admitted)) throw new Error(admitted.failure.message);
  const state = startBattleRight({
    battleId: battleId("heroic-inspiration-physical-die"),
    combatants: [
      characterSeed({
        combatantId: helperId,
        initiative: 20,
        d20Statistics: {
          ...testCharacterD20Statistics(),
          skillProficiencies: ["stealth"],
        },
      }),
      characterSeed({
        initiative: 10,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        ...(luck
          ? {
              characterUnitRefs: [admitted.success],
              unitFeatures: [characterBattleFeatureInitForTest(unit)],
            }
          : {}),
      }),
      statBlockCreatureInit({ initiative: 5 }),
    ],
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
  const help = {
    tag: "action",
    actorId: helperId,
    action: "helpAbilityCheck",
  } satisfies BattleSubject;
  const helpHole = findHole(
    findAct(state, help).initialHoles,
    "helpAbilityCheckDecision",
  );
  const helped = requireResolved(
    resolveBattleSubject({
      state,
      subject: help,
      fills: [
        {
          kind: "helpAbilityCheckDecision",
          holeId: helpHole.holeId,
          allyId: fighterId,
          skill: "stealth",
          allyCanBeAssisted: true,
        },
      ],
    }),
  ).state;
  const active = requireResolved(
    endTurn({ state: helped, actorId: helperId }),
  ).state;
  const subject = {
    tag: "action",
    actorId: fighterId,
    action: "hide",
  } satisfies BattleSubject;
  const hole = requireResultHole(
    resolveBattleSubject({ state: active, subject, fills: [] }),
    "abilityCheck",
  );
  expect(hole.rollMode).toBe("advantage");
  return { state: active, subject, hole };
}

function inspirationReplacement(
  first: number,
  second = 3,
): Extract<
  BattleAbilityCheckD20TestRerollDecision,
  { readonly kind: "rerollRolledDie" }
> {
  return {
    kind: "rerollRolledDie",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: {
      die: "first",
      result: {
        total: Math.max(first, second) + 4,
        d20TestRoll: multiple(first, second),
      },
    },
  };
}

function hideFill(
  fixture: ReturnType<typeof helpedHide>,
  decisions: readonly [
    BattleAbilityCheckD20TestRerollDecision,
    ...BattleAbilityCheckD20TestRerollDecision[],
  ],
) {
  return abilityCheckFill(fixture.hole, {
    total: 22,
    d20TestRoll: multiple(18, 3),
    d20TestRerolls: decisions,
  });
}

describe("Heroic Inspiration preserves the chosen physical d20", () => {
  test("Help Advantage with a higher replacement still resolves and spends Inspiration", () => {
    const fixture = helpedHide(false);
    const resolved = requireResolved(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [hideFill(fixture, [inspirationReplacement(20)])],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)?.hidden).toMatchObject({
      discoveryDc: 24,
    });
    const actor = resolved.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character")
      throw new Error("Expected fixture character.");
    expect(actor.origin.heroicInspiration).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("a new physical one offers Luck, which can replace that die after Inspiration", () => {
    const fixture = helpedHide(true);
    const inspiration = inspirationReplacement(1);
    const asked = resolveBattleSubject({
      state: fixture.state,
      subject: fixture.subject,
      fills: [hideFill(fixture, [inspiration])],
    });
    expect(requireResultHole(asked, "abilityCheck")).toHaveProperty(
      "d20TestNaturalOneRerolls",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [
          hideFill(fixture, [
            inspiration,
            {
              kind: "rerollRolledDie",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
              replacement: {
                die: "first",
                result: { total: 24, d20TestRoll: multiple(20, 3) },
              },
            },
          ]),
        ],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)?.hidden).toMatchObject({
      discoveryDc: 24,
    });
    const actor = resolved.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character")
      throw new Error("Expected fixture character.");
    expect(actor.origin.heroicInspiration).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("the untouched die cannot change with the chosen die", () => {
    const fixture = helpedHide(false);
    expect(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [hideFill(fixture, [inspirationReplacement(20, 4)])],
      }).tag,
    ).toBe("invalid");
  });

  test("a chosen-die reroll cannot change the original roll mode", () => {
    const fixture = helpedHide(false);
    const decision = inspirationReplacement(20);
    expect(
      resolveBattleSubject({
        state: fixture.state,
        subject: fixture.subject,
        fills: [
          hideFill(fixture, [
            {
              ...decision,
              replacement: {
                ...decision.replacement,
                result: {
                  total: 7,
                  d20TestRoll: multiple(20, 3, "disadvantage"),
                },
              },
            },
          ]),
        ],
      }).tag,
    ).toBe("invalid");
  });

  test("the chosen-die codec requires the complete final pair", () => {
    const fixture = helpedHide(false);
    const valid = hideFill(fixture, [inspirationReplacement(2)]);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(valid)).toEqual(valid);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleFillSchema)({
          ...valid,
          value: {
            ...valid.value,
            d20TestRerolls: [
              {
                kind: "rerollRolledDie",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: {
                  die: "first",
                  result: {
                    total: 7,
                    d20TestRoll: { tag: "single", naturalD20: 2 },
                  },
                },
              },
            ],
          },
        }),
      ),
    ).toBe(true);
  });

  test.each<{
    readonly rollMode: BattleD20TestMultipleRoll["rollMode"];
    readonly die: BattleD20TestRolledDieKey;
    readonly first: number;
    readonly second: number;
  }>([
    { rollMode: "advantage", die: "first", first: 2, second: 3 },
    { rollMode: "advantage", die: "second", first: 3, second: 2 },
    { rollMode: "disadvantage", die: "first", first: 20, second: 18 },
    { rollMode: "disadvantage", die: "second", first: 18, second: 20 },
  ])(
    "$rollMode keeps both faces when rerolling $die",
    ({ rollMode, die, first, second }) => {
      const original =
        die === "first"
          ? multiple(18, second, rollMode)
          : multiple(first, 18, rollMode);
      const replacement = multiple(first, second, rollMode);
      const selected = rollMode === "advantage" ? Math.max : Math.min;
      const outcome = abilityCheckValueThatStands({
        total: selected(Number(original.first), Number(original.second)) + 4,
        d20TestRoll: original,
        d20TestRerolls: [
          {
            kind: "rerollRolledDie",
            effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
            replacement: {
              die,
              result: {
                total: selected(first, second) + 4,
                d20TestRoll: replacement,
              },
            },
          },
        ],
      });
      expect(outcome.d20TestRoll).toEqual(replacement);
    },
  );
});
