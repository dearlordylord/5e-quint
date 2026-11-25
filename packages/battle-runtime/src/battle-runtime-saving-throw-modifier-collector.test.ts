// KERNEL-COVERAGE: parity-witness BATTLE.SAVING_THROW.MODIFIER_COLLECTOR
// RAW: .references/srd-5.2.1/rules-glossary.md, "Restrained": "You have
// Disadvantage on Dexterity saving throws." "Advantage": "If circumstances
// cause a roll to have both Advantage and Disadvantage, ... you don't have
// either of them." spells.md, Haste: "Advantage on Dexterity saving throws".
import type { Condition } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
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

function withDexteritySaveAdvantage(state: BattleState): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: skeletonId,
    effect: {
      kind: "savingThrowRollMode",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-save-advantage",
      ),
      sourceCombatantId: wizardId,
      ability: "dex",
      mode: "advantage",
      expiresAt: { kind: "concentration", combatantId: wizardId },
    },
  });
}

// Acid Splash asks for a Dexterity saving throw.
function acidSplashRollModes(state: BattleState) {
  return requireHole(
    resolveBattleSubject({
      session: battleRuntimeSessionForTest({ state, context: base.context }),
      subject: magicSubject("acid_splash"),
      fills: [],
    }),
    "savingThrowOutcome",
  ).targetRollModes;
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
    const state = withDexteritySaveAdvantage(
      skeletonWith(base.state, "restrained"),
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
});
