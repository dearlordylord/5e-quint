import { damageAmount, DieRollResult, Hp } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  battleId,
  battleStateWithAllSpellSlotsExpended,
  battleProcedureExecutionRefForTest,
  cantripSpellInvocationRef,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  elapsedTimeTicks,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  requireCharacterSpellProcedureRefForTest,
  requireElapsedHours,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
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
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageAllowsKnockOut,
  deathSavingThrowHole,
  hpDamageProjection,
  removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly,
  resolveBattleConcentrationDamage,
  startTurnDeathSavingThrowRequired,
} from "./battle-reducer/damage-apply.ts";
import {
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
} from "./battle-reducer/creature-hit-point-state.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";

function admittedDamageEffectSession() {
  const session = startBattleSessionRight({
    battleId: battleId("battle-damage-hp-admitted-effects"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Spellcaster",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord("chill_touch")],
          preparedSpells: [
            spellRecord("aid"),
            spellRecord("charm_person"),
            spellRecord("hideous_laughter"),
          ],
          spellSlots: [
            { spellLevel: 1, count: 2 },
            { spellLevel: 2, count: 1 },
          ],
        }),
      }),
      statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
    ],
  });
  return {
    ...session,
    state: battleStateWithAllSpellSlotsExpended(session.state, fighterId),
  };
}

describe("damage and hit point lifecycle helpers", () => {
  test("projects temporary hit points, maximum increases, and expiration edges", () => {
    const session = admittedDamageEffectSession();
    const state = session.state;
    const target = state.combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic target.");
    }
    const hpMaximumAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "hitPointMaximumIncrease",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          fighterId,
          spellSlotInvocationRef("aid", 2, "scalarBuff"),
        ),
        sourceCombatantId: fighterId,
        amount: 5,
        expiresAt: {
          kind: "duration",
          durationTicks: requireElapsedHours(8),
        },
      },
    });
    const hpMaximumEffect = hpMaximumAllocation.effect;
    expect(Number(hpMaximumAllocation.owner.nextEffectOrdinal)).toBe(
      Number(target.nextEffectOrdinal) + 1,
    );

    expect(Number(applyTemporaryHitPoints(target, 0).tempHp)).toBe(0);
    expect(Number(applyTemporaryHitPoints(target, 4).tempHp)).toBe(4);

    const increased = applyHitPointMaximumIncrease(
      hpMaximumAllocation.owner,
      hpMaximumEffect,
    );
    expect(Number(increased.maxHp)).toBe(Number(target.maxHp));
    expect(Number(increased.hp)).toBe(Number(target.hp) + 5);

    const lowerSameSourceAllocation =
      allocateBattleEffectOccurrenceForCreature({
        owner: increased,
        effect: {
          kind: "hitPointMaximumIncrease",
          sourceProcedureRef: hpMaximumEffect.sourceProcedureRef,
          sourceCombatantId: fighterId,
          amount: 5,
          expiresAt: hpMaximumEffect.expiresAt,
        },
      });
    expect(lowerSameSourceAllocation.effect.effectRef).not.toBe(
      hpMaximumEffect.effectRef,
    );
    const retainedMaximum = applyHitPointMaximumIncrease(
      lowerSameSourceAllocation.owner,
      lowerSameSourceAllocation.effect,
    );
    expect(retainedMaximum.activeEffects).toHaveLength(2);
    expect(Number(retainedMaximum.maxHp)).toBe(Number(increased.maxHp));

    const expired = applyHitPointMaximumIncreaseExpiration(
      { ...hpMaximumAllocation.owner, activeEffects: [] },
      [hpMaximumEffect],
    );
    expect(Number(expired.hp)).toBe(Math.max(0, Number(target.hp) - 5));
    expect(Number(expired.maxHp)).toBe(Number(target.maxHp));

    const zeroHpExpiration = applyHitPointMaximumIncreaseExpiration(
      { ...hpMaximumAllocation.owner, hp: Hp(1), activeEffects: [] },
      [hpMaximumEffect],
    );
    expect(Number(zeroHpExpiration.hp)).toBe(0);
    expect(zeroHpExpiration.positiveHpUnconscious).toBeNull();

    expect(applyHitPointMaximumIncreaseExpiration(target, [])).toBe(target);
  });

  test("covers damage projection, healing gates, and death-save transitions", () => {
    const session = admittedDamageEffectSession();
    const state = session.state;
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

    const regainPreventedEffect = allocateBattleEffectOccurrenceForCreature({
      owner: goblin,
      effect: {
        kind: "hitPointRegainPrevented",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          fighterId,
          cantripSpellInvocationRef("chill_touch", "spellAttackDamage"),
        ),
        sourceCombatantId: fighterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: fighterId,
          round: 2,
        },
      },
    });
    const regainPrevented = {
      ...regainPreventedEffect.owner,
      hp: Hp(1),
      activeEffects: [regainPreventedEffect.effect],
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

  test("damage at 0 Hit Points advances failures, and massive damage kills", () => {
    const fighter = fighterVsGoblinBattle().combatants.get(fighterId);
    if (fighter === undefined || fighter.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic character.");
    }

    const atZero = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
    });
    const oneFailure = applyHpDamage(atZero, 1, {
      deathFailuresAtZeroHp: 1,
    });
    expect(oneFailure.zeroHpLifecycle).toMatchObject({
      policy: "usesDeathSavingThrows",
      deathSaves: { deathSaves: { failures: 1 }, dead: false },
    });

    const killedByCriticalDamage = applyHpDamage(oneFailure, 1, {
      deathFailuresAtZeroHp: 2,
    });
    expect(killedByCriticalDamage.zeroHpLifecycle).toMatchObject({
      policy: "usesDeathSavingThrows",
      deathSaves: { deathSaves: { failures: 3 }, dead: true },
    });
    expect(
      applyHpDamage(killedByCriticalDamage, 1, {
        deathFailuresAtZeroHp: 1,
      }),
    ).toBe(killedByCriticalDamage);

    const killedByMassiveDamage = applyHpDamage(
      fighter,
      Number(fighter.hp) + Number(fighter.maxHp),
      { deathFailuresAtZeroHp: 1 },
    );
    expect(killedByMassiveDamage.zeroHpLifecycle).toMatchObject({
      policy: "usesDeathSavingThrows",
      deathSaves: { deathSaves: { failures: 3 }, dead: true },
    });
  });

  test("only a character awaiting a Death Saving Throw consumes a start-turn roll", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined || fighter.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic character.");
    }

    expect(
      applyStartTurnDeathSavingThrow(
        state.combatants,
        fighterId,
        DieRollResult(10),
      ),
    ).toBe(state.combatants);

    const atZero = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
    });
    if (atZero.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
      throw new Error("Expected the character Death Saving Throw lifecycle.");
    }
    const stable = {
      ...atZero,
      zeroHpLifecycle: {
        ...atZero.zeroHpLifecycle,
        deathSaves: { ...atZero.zeroHpLifecycle.deathSaves, stable: true },
      },
    };
    const stableCombatants = new Map(state.combatants).set(fighterId, stable);
    expect(startTurnDeathSavingThrowRequired(stable)).toBe(false);
    expect(
      applyStartTurnDeathSavingThrow(
        stableCombatants,
        fighterId,
        DieRollResult(20),
      ),
    ).toBe(stableCombatants);
  });

  test("healing, but not Temporary Hit Points, ends a knocked-out rest", () => {
    const target = fighterVsGoblinBattle().combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the synthetic target.");
    }
    const knockedOut = applyHpDamage(target, Number(target.hp), {
      deathFailuresAtZeroHp: 1,
      damageDisposition: { kind: "knockOut" },
    });

    const buffered = applyTemporaryHitPoints(knockedOut, 4);
    expect(buffered.positiveHpUnconscious).not.toBeNull();
    expect(Number(buffered.tempHp)).toBe(4);

    const healed = applyHpHealing(buffered, 2);
    expect(Number(healed.hp)).toBe(3);
    expect(healed.positiveHpUnconscious).toBeNull();
  });

  test("Concentration damage resolution ignores near-misses and rejects unrelated fills", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected the synthetic combatants.");
    }
    const fighterProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-fighter-concentration-damage",
    );
    const goblinProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-goblin-concentration-damage",
    );
    const concentratingFighter = {
      ...fighter,
      concentration: {
        sourceProcedureRef: fighterProcedureRef,
        effectKind: "spellEffect" as const,
      },
    };
    const concentratingGoblin = {
      ...goblin,
      concentration: {
        sourceProcedureRef: goblinProcedureRef,
        effectKind: "spellEffect" as const,
      },
    };
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, concentratingFighter)
        .set(goblinId, concentratingGoblin),
    };

    expect(
      resolveBattleConcentrationDamage({
        state: concentratingState,
        combatantId: fighterId,
        damageAmount: 0,
        savingThrowSucceeded: false,
      }),
    ).toBe(concentratingState);
    expect(
      resolveBattleConcentrationDamage({
        state: concentratingState,
        combatantId: combatantId("absent-combatant"),
        damageAmount: 4,
        savingThrowSucceeded: false,
      }),
    ).toBe(concentratingState);

    const fighterHole = concentrationSavingThrowHole(concentratingFighter, 4);
    const goblinHole = concentrationSavingThrowHole(concentratingGoblin, 4);
    if (fighterHole === null || goblinHole === null) {
      throw new Error("Expected Concentration Saving Throw holes.");
    }
    const fighterFill = concentrationSavingThrowFill(fighterHole, true);
    const goblinFill = concentrationSavingThrowFill(goblinHole, true);
    if (
      fighterFill.kind !== "concentrationSavingThrow" ||
      goblinFill.kind !== "concentrationSavingThrow"
    ) {
      throw new Error("Expected Concentration Saving Throw fills.");
    }

    expect(
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: concentratingState,
        target: concentratingGoblin,
        damageAmount: 4,
        fills: [],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ combatantId: goblinId }] });
    expect(
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: concentratingState,
        target: concentratingGoblin,
        damageAmount: 4,
        fills: [goblinFill, fighterFill],
      }),
    ).toEqual({
      tag: "invalid",
      message:
        "Concentration Saving Throw fill does not match the damaged target or linked Warding Bond caster.",
    });
    expect(
      damageLifecycleConcentrationSavingThrowFillCheck({
        state,
        target: goblin,
        damageAmount: 4,
        fills: [fighterFill],
      }),
    ).toEqual({
      tag: "invalid",
      message:
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    });
  });

  test("damage application returns the original state for zero-damage and unknown targets", () => {
    const session = admittedDamageEffectSession();
    const state = session.state;
    const target = state.combatants.get(goblinId);
    const fighter = state.combatants.get(fighterId);
    if (
      target === undefined ||
      target.positiveHpUnconscious !== null ||
      fighter === undefined
    ) {
      throw new Error("Expected the synthetic combatants.");
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
    expect(
      removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly(
        state,
        fighterId,
        combatantId("missing-target"),
        [],
      ),
    ).toBe(state);

    const unsupportedReplacement = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
      damageDisposition: {
        kind: "zeroHitPointReplacement",
        procedureRef: battleProcedureExecutionRefForTest(
          "synthetic-unavailable-replacement",
        ),
      },
    });
    const ordinaryDrop = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
      damageDisposition: { kind: "ordinaryDamage" },
    });
    expect(unsupportedReplacement).toEqual(ordinaryDrop);

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
    const escapeEffect = allocateBattleEffectOccurrenceForCreature({
      owner: knockout,
      effect: {
        kind: "spellCondition",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          fighterId,
          spellSlotInvocationRef("charm_person", 1, "conditionSave"),
        ),
        sourceCombatantId: fighterId,
        condition: "charmed",
        conditionHadNonSpellSource: false,
        escape: { kind: "targetDamagedByCasterOrAlly" },
        turnStartDamage: null,
        expiresAt: {
          kind: "duration",
          durationTicks: requireElapsedHours(1),
        },
      },
    });
    const knockedOutWithEscape = {
      ...escapeEffect.owner,
      activeEffects: [escapeEffect.effect],
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

    const concentrationProcedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      fighterId,
      spellSlotInvocationRef("hideous_laughter", 1, "hideousLaughter"),
    );
    const concentrationEscapeEffect =
      allocateBattleEffectOccurrenceForCreature({
        owner: knockout,
        effect: {
          kind: "hideousLaughter",
          sourceProcedureRef: concentrationProcedureRef,
          sourceCombatantId: fighterId,
          conditionHadNonSpellProneSource: false,
          conditionHadNonSpellIncapacitatedSource: false,
          repeatSaveRollMode: null,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: {
            kind: "concentration",
            combatantId: fighterId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      });
    const concentrationState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          concentration: {
            sourceProcedureRef: concentrationProcedureRef,
            effectKind: "spellEffect" as const,
          },
        })
        .set(goblinId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            concentrationEscapeEffect.owner,
            applyCondition(
              applyCondition(knockout.conditions, "prone"),
              "incapacitated",
            ),
          ),
          activeEffects: [concentrationEscapeEffect.effect],
        }),
    };
    const broken = breakCombatantConcentration(
      concentrationState,
      concentrationState.combatants,
      fighterId,
    );
    expect(broken.value.get(fighterId)?.concentration).toBeNull();
    expect(broken.value.get(goblinId)?.activeEffects).toEqual([]);
    expect(broken.value.get(goblinId)?.positiveHpUnconscious).not.toBeNull();
  });
});
