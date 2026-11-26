// KERNEL-COVERAGE: parity-witness BATTLE.SAVING_THROW.MODIFIER_COLLECTOR
// RAW: .references/srd-5.2.1/rules-glossary.md, "Restrained": "You have
// Disadvantage on Dexterity saving throws." "Advantage": "If circumstances
// cause a roll to have both Advantage and Disadvantage, ... you don't have
// either of them." spells.md, Haste: "Advantage on Dexterity saving throws".
// "Paralyzed", "Petrified", "Stunned" and "Unconscious": "You automatically
// fail Strength and Dexterity saving throws."
import type { Condition } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { concentrationSavingThrowHole } from "./battle-reducer/damage-apply.ts";
import { savingThrowContributions } from "./battle-reducer/saving-throw-modifier-collector.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleState } from "./battle-state-execution.ts";
import {
  applyCondition,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  magicSubject,
  requireHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonId,
  testBattleCreatureStateWithConditions,
  wizardId,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";

const base = wizardVsSkeletonBattle();

function skeletonWith(state: BattleState, condition: Condition): BattleState {
  const skeleton = requireCombatant(state, skeletonId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      skeletonId,
      testBattleCreatureStateWithConditions(
        skeleton,
        applyCondition(skeleton.conditions, condition),
      ),
    ),
  };
}

function withSaveAdvantage(
  state: BattleState,
  ability: "dex" | "con",
): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: skeletonId,
    effect: {
      kind: "savingThrowRollMode",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        `synthetic-${ability}-save-advantage`,
      ),
      sourceCombatantId: wizardId,
      ability,
      mode: "advantage",
      expiresAt: { kind: "concentration", combatantId: wizardId },
    },
  });
}

// Acid Splash asks for a Dexterity saving throw.
function acidSplash(
  state: BattleState,
  fills: Parameters<typeof resolveBattleSubject>[0]["fills"] = [],
) {
  return resolveBattleSubject({
    session: battleRuntimeSessionForTest({ state, context: base.context }),
    subject: magicSubject("acid_splash"),
    fills,
  });
}

function acidSplashSaveHole(state: BattleState) {
  return requireHole(acidSplash(state), "savingThrowOutcome");
}

function acidSplashRollModes(state: BattleState) {
  return acidSplashSaveHole(state).targetRollModes;
}

describe("saving throw modifier collector", () => {
  test("Restrained gives Disadvantage on a Dexterity saving throw", () => {
    const state = skeletonWith(base.state, "restrained");
    expect(acidSplashRollModes(state)).toEqual([
      { targetId: skeletonId, rollMode: "disadvantage" },
    ]);
    expect(
      savingThrowContributions(state, requireCombatant(state, skeletonId), {
        ability: "dex",
      }),
    ).toEqual([
      { role: "rollMode", source: "targetCondition", mode: "disadvantage" },
    ]);
  });

  test("Restrained doesn't touch a Strength saving throw", () => {
    const state = skeletonWith(base.state, "restrained");
    expect(
      savingThrowContributions(state, requireCombatant(state, skeletonId), {
        ability: "str",
      }),
    ).toEqual([]);
  });

  test("an effect's Advantage and Restrained's Disadvantage cancel", () => {
    const state = withSaveAdvantage(
      skeletonWith(base.state, "restrained"),
      "dex",
    );
    expect(acidSplashRollModes(state)).toEqual([
      { targetId: skeletonId, rollMode: "normal" },
    ]);
    expect(
      savingThrowContributions(state, requireCombatant(state, skeletonId), {
        ability: "dex",
      }),
    ).toEqual([
      { role: "rollMode", source: "targetCondition", mode: "disadvantage" },
      { role: "rollMode", source: "activeEffect", mode: "advantage" },
    ]);
  });

  test("a procedure's own source joins the general ones", () => {
    const state = skeletonWith(base.state, "restrained");
    expect(
      savingThrowContributions(state, requireCombatant(state, skeletonId), {
        ability: "dex",
        procedureSources: {
          rollModes: [{ targetId: skeletonId, rollMode: "advantage" }],
          bonuses: [],
        },
      }),
    ).toEqual([
      { role: "rollMode", source: "targetCondition", mode: "disadvantage" },
      { role: "rollMode", source: "procedureRule", mode: "advantage" },
    ]);
  });

  test.each(["paralyzed", "petrified", "stunned", "unconscious"] as const)(
    "a %s target fails a Dexterity saving throw without rolling",
    (condition) => {
      const state = skeletonWith(base.state, condition);
      const hole = acidSplashSaveHole(state);
      expect(hole.targetAutomaticFailures).toEqual([
        { targetId: skeletonId, conditions: [condition] },
      ]);
      expect(
        acidSplash(state, [
          savingThrowOutcomeFill(hole, [
            { targetId: skeletonId, succeeded: true, naturalD20: 15 },
          ]),
        ]),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: `${skeletonId} automatically fails this saving throw; its outcome is a failure without a roll.`,
      });
      expect(
        acidSplash(state, [
          savingThrowOutcomeFill(hole, [
            { targetId: skeletonId, succeeded: false, naturalD20: 2 },
          ]),
        ]).tag,
      ).toBe("invalid");
      expect(
        acidSplash(state, [
          savingThrowOutcomeFill(hole, [
            { targetId: skeletonId, succeeded: false, withoutRoll: true },
          ]),
        ]).tag,
      ).not.toBe("invalid");
    },
  );

  test("automatic failure reaches only Strength and Dexterity saving throws", () => {
    const state = skeletonWith(base.state, "stunned");
    const skeleton = requireCombatant(state, skeletonId);
    expect(
      savingThrowContributions(state, skeleton, { ability: "str" }),
    ).toEqual([
      {
        role: "automaticFailure",
        source: "targetCondition",
        condition: "stunned",
      },
    ]);
    expect(
      savingThrowContributions(state, skeleton, { ability: "con" }),
    ).toEqual([]);
  });

  test("a Concentration save takes the same sources as any Constitution save", () => {
    const concentrating = (state: BattleState) => ({
      ...requireCombatant(state, skeletonId),
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-concentration",
        ),
        effectKind: "spellEffect" as const,
      },
    });
    expect(
      concentrationSavingThrowHole(concentrating(base.state), 4)?.rollMode,
    ).toBeUndefined();
    expect(
      concentrationSavingThrowHole(
        concentrating(withSaveAdvantage(base.state, "con")),
        4,
      )?.rollMode,
    ).toBe("advantage");
    expect(
      concentrationSavingThrowHole(
        concentrating(withSaveAdvantage(base.state, "dex")),
        4,
      )?.rollMode,
    ).toBeUndefined();
  });
});
