import { damageAmount, DieRollResult, Hp } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import type { BattleActiveEffect } from "./battle-state-execution.ts";
import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  combatantId,
  elapsedTimeTicks,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
} from "./battle-runtime.test-support.ts";
import {
  applyBattleHitPointDamage,
  applyAttackDamageAmount,
  applyHitPointMaximumIncrease,
  applyHitPointMaximumIncreaseExpiration,
  applyHpDamage,
  applyHpHealing,
  applyInitialZeroHpLifecycle,
  applyStartTurnDeathSavingThrow,
  applyTemporaryHitPoints,
  breakCombatantConcentration,
  concentrationSavingThrowHole,
  damageAllowsKnockOut,
  deathSavingThrowHole,
  hpDamageProjection,
  removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly,
  startTurnDeathSavingThrowRequired,
} from "./battle-reducer/damage-apply.ts";
import {
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
} from "./battle-reducer/creature-hit-point-state.ts";

const hpMaximumEffect = {
  kind: "hitPointMaximumIncrease",
  sourceProcedureRef: battleProcedureExecutionRefForTest("synthetic-aid"),
  sourceCombatantId: fighterId,
  amount: 5,
  expiresAt: {
    kind: "duration" as const,
    durationTicks: elapsedTimeTicks(1),
  },
} as const satisfies BattleActiveEffect;

describe("damage and hit point lifecycle helpers", () => {
  test("projects temporary hit points, maximum increases, and expiration edges", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic target.");
    }

    expect(Number(applyTemporaryHitPoints(target, 0).tempHp)).toBe(0);
    expect(Number(applyTemporaryHitPoints(target, 4).tempHp)).toBe(4);

    const zeroAmountEffect = { ...hpMaximumEffect, amount: 0 } as const;
    expect(applyHitPointMaximumIncrease(target, zeroAmountEffect)).toBe(target);

    const increased = applyHitPointMaximumIncrease(target, hpMaximumEffect);
    expect(Number(increased.maxHp)).toBe(Number(target.maxHp));
    expect(Number(increased.hp)).toBe(Number(target.hp) + 5);

    const lowerSameSourceEffect = { ...hpMaximumEffect, amount: 2 } as const;
    const retainedMaximum = applyHitPointMaximumIncrease(
      increased,
      lowerSameSourceEffect,
    );
    expect(retainedMaximum.activeEffects).toHaveLength(2);
    expect(Number(retainedMaximum.maxHp)).toBe(Number(increased.maxHp));

    const expired = applyHitPointMaximumIncreaseExpiration(
      { ...target, activeEffects: [] },
      [hpMaximumEffect],
    );
    expect(Number(expired.hp)).toBe(Math.max(0, Number(target.hp) - 5));
    expect(Number(expired.maxHp)).toBe(Number(target.maxHp));

    const zeroHpExpiration = applyHitPointMaximumIncreaseExpiration(
      { ...target, hp: Hp(1), activeEffects: [] },
      [hpMaximumEffect],
    );
    expect(Number(zeroHpExpiration.hp)).toBe(0);
    expect(zeroHpExpiration.positiveHpUnconscious).toBeNull();

    expect(applyHitPointMaximumIncreaseExpiration(target, [])).toBe(target);
  });

  test("covers damage projection, healing gates, and death-save transitions", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (
      fighter === undefined ||
      goblin === undefined ||
      fighter.positiveHpUnconscious !== null ||
      goblin.positiveHpUnconscious !== null
    ) {
      throw new Error("Expected synthetic combatants.");
    }

    expect(hpDamageProjection(goblin, 0)).toMatchObject({
      effectiveDamage: 0,
      hpDamage: 0,
      nextHp: goblin.hp,
    });
    expect(damageAllowsKnockOut(goblin, Number(goblin.hp))).toBe(true);
    expect(applyHpDamage(goblin, 0, { deathFailuresAtZeroHp: 1 })).toBe(goblin);

    const healed = applyHpHealing({ ...goblin, hp: Hp(1) }, 3);
    expect(Number(healed.hp)).toBe(4);
    expect(applyHpHealing(goblin, 0)).toBe(goblin);
    expect(applyHpHealing(goblin, 100)).toBe(goblin);

    const regainPreventedEffect = {
      kind: "hitPointRegainPrevented",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-chill-touch",
      ),
      sourceCombatantId: fighterId,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const regainPrevented = {
      ...goblin,
      hp: Hp(1),
      activeEffects: [regainPreventedEffect],
    };
    expect(applyHpHealing(regainPrevented, 3)).toBe(regainPrevented);

    const terminalGoblin = applyHpDamage(goblin, 100, {
      deathFailuresAtZeroHp: 1,
    });
    expect(applyHpHealing(terminalGoblin, 3)).toBe(terminalGoblin);

    const zeroFighter = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
    });
    const healedFromZero = applyHpHealing(zeroFighter, 1);
    expect(healedFromZero.hp).toBe(Hp(1));
    expect(startTurnDeathSavingThrowRequired(zeroFighter)).toBe(true);
    expect(startTurnDeathSavingThrowRequired(undefined)).toBe(false);

    const recovered = applyStartTurnDeathSavingThrow(
      new Map([[fighterId, zeroFighter]]),
      fighterId,
      DieRollResult(20),
    ).get(fighterId);
    expect(recovered?.hp).toBe(Hp(1));

    const failedSave = applyStartTurnDeathSavingThrow(
      new Map([[fighterId, zeroFighter]]),
      fighterId,
      DieRollResult(1),
    ).get(fighterId);
    expect(failedSave?.hp).toBe(zeroFighter.hp);
    expect(deathSavingThrowHole(fighterId)).toMatchObject({
      kind: "deathSavingThrow",
      combatantId: fighterId,
    });

    const concentrating = {
      ...goblin,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-concentration",
        ),
        effectKind: "spellEffect" as const,
      },
    };
    expect(concentrationSavingThrowHole(goblin, 0)).toBeNull();
    expect(concentrationSavingThrowHole(concentrating, 4)).toMatchObject({
      kind: "concentrationSavingThrow",
      combatantId: goblinId,
      damageAmount: 4,
    });

    expect(applyInitialZeroHpLifecycle(goblin)).toBe(goblin);
    expect(
      battleCreatureStateWithKnockOutPreservedConditions(
        goblin,
        goblin.conditions,
      ).conditions,
    ).toEqual(goblin.conditions);
    expect(
      battleCreatureStateWithDamageProjection(goblin, {
        effectiveDamage: 1,
        currentTempHp: 2,
        tempHpAbsorbed: 1,
        currentHp: Number(goblin.hp),
        hpDamage: 0,
        nextHp: goblin.hp,
        massiveDamageKills: false,
      }),
    ).toMatchObject({ tempHp: 1 });
  });

  test("damage application returns the original state for zero-damage and unknown targets", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic target.");
    }
    const zeroDamage = applyBattleHitPointDamage({
      state,
      target,
      damageAmount: 0,
      deathFailuresAtZeroHp: 1,
    });
    expect(zeroDamage.combatants.get(goblinId)).toBe(target);

    expect(
      applyAttackDamageAmount({
        state,
        attackerId: fighterId,
        targetId: combatantId("missing-target"),
        damageAmount: damageAmount(1),
        deathFailuresAtZeroHp: 1,
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      }),
    ).toBe(state);

    const knockout = applyHpDamage(target, Number(target.hp), {
      deathFailuresAtZeroHp: 1,
      damageDisposition: { kind: "knockOut" },
    });
    const preservedKnockout = battleCreatureStateWithDamageProjection(
      knockout,
      {
        effectiveDamage: 0,
        currentTempHp: 0,
        tempHpAbsorbed: 0,
        currentHp: 1,
        hpDamage: 0,
        nextHp: Hp(1),
        massiveDamageKills: false,
      },
    );
    expect(preservedKnockout.positiveHpUnconscious).not.toBeNull();
    const releasedKnockout = battleCreatureStateWithDamageProjection(knockout, {
      effectiveDamage: 0,
      currentTempHp: 0,
      tempHpAbsorbed: 0,
      currentHp: 1,
      hpDamage: 0,
      nextHp: Hp(2),
      massiveDamageKills: false,
    });
    expect(releasedKnockout.positiveHpUnconscious).toBeNull();
    const escapeEffect = {
      kind: "spellCondition",
      effectRef: battleActiveEffectExecutionRefForTest(
        "synthetic-charm-effect",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-charm-source",
      ),
      sourceCombatantId: fighterId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" as const },
      turnStartDamage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const knockedOutWithEscape = {
      ...knockout,
      activeEffects: [escapeEffect],
    };
    const escaped = removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly(
      {
        ...state,
        combatants: new Map(state.combatants).set(
          goblinId,
          knockedOutWithEscape,
        ),
      },
      fighterId,
      goblinId,
      [],
    );
    expect(escaped.combatants.get(goblinId)?.activeEffects).toEqual([]);

    const zeroGoblin = applyHpDamage(target, Number(target.hp), {
      deathFailuresAtZeroHp: 1,
    });
    const damagedAtZero = applyHpDamage(zeroGoblin, 1, {
      deathFailuresAtZeroHp: 1,
    });
    expect(damagedAtZero.hp).toBe(zeroGoblin.hp);

    const wardingBondEffect = {
      kind: "wardingBond",
      effectRef: battleActiveEffectExecutionRefForTest(
        "synthetic-missing-warding-bond",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-missing-warding-bond-source",
      ),
      sourceCombatantId: combatantId("missing-caster"),
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const stateWithMissingBond = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...target,
        activeEffects: [wardingBondEffect],
      }),
    };
    const missingBondTarget = stateWithMissingBond.combatants.get(goblinId);
    if (missingBondTarget === undefined) {
      throw new Error("Expected the synthetic target with Warding Bond.");
    }
    expect(
      applyBattleHitPointDamage({
        state: stateWithMissingBond,
        target: missingBondTarget,
        damageAmount: 1,
        deathFailuresAtZeroHp: 1,
      }).combatants.get(goblinId)?.hp,
    ).toBe(Hp(Number(target.hp) - 1));

    const concentrationState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...knockout,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-knockout-concentration",
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const broken = breakCombatantConcentration(
      concentrationState,
      concentrationState.combatants,
      goblinId,
    );
    expect(broken.value.get(goblinId)?.concentration).toBeNull();
  });
});
