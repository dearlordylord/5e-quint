import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";

import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "./battle-state-execution.ts";
import {
  allocateBattleEffectOccurrenceForCreature,
  type BattleActiveEffectOccurrenceTemplate,
} from "./effect-execution-ref.ts";
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  combatantId,
  elapsedTimeTicks,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  KNOCKED_OUT_UNCONSCIOUS,
} from "./battle-runtime.test-support.ts";
import { difficultyClass } from "./unit-profile-admission.test-support.ts";
import {
  applyProtectionRelevantEffectSaveOutcome,
  battleCreatureAfterConditionRemoval,
  combatantHasSleepEffect,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  concentrationSpellEffectSourcesDirectlyApplyingCondition,
  conditionsAfterExpiringSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
  conditionHasNonSpellSource,
  hypnoticPatternShakeAwakeTargetChoices,
  protectionRelevantEffectsForTarget,
  removeHideousLaughterEffectFromTarget,
  removeHypnoticPatternControlEffectsFromTarget,
  removeSleepEffectsFromTarget,
  removeSpellConditionEffect,
  sleepShakeAwakeTargetChoices,
  spellConcentrationEffectSourceFromEffect,
  validateProtectionRelevantEffectSavingThrowOutcome,
} from "./battle-reducer/spell-condition-effects-helpers.ts";
import {
  battleCreatureStateWithKnockOutPreservedConditions,
  knockedOutConditionState,
  knockedOutOneHp,
} from "./battle-reducer/creature-hit-point-state.ts";

function allocateActiveEffectForTest<
  Owner extends BattleCreatureState,
  Effect extends BattleActiveEffectOccurrenceTemplate,
>(owner: Owner, effect: Effect) {
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner,
    effect,
  });
  return {
    owner: {
      ...allocation.owner,
      activeEffects: [...allocation.owner.activeEffects, allocation.effect],
    },
    effect: allocation.effect,
  };
}

describe("spell condition effect source ownership", () => {
  test("an Unconscious unit-feature effect also owns its derived Prone condition", () => {
    const target = fighterVsGoblinBattle().combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the conscious synthetic target.");
    }
    const unconsciousEffect = {
      kind: "unitFeatureCondition",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-unconscious-unit-feature",
      ),
      sourceCombatantId: fighterId,
      condition: "unconscious",
      conditionHadNonSpellSource: false,
      earlyEnd: null,
      turnRestriction: null,
      expiresAt: { kind: "startOfTurn", combatantId: goblinId },
    } as const;
    const withEffect = allocateActiveEffectForTest(
      {
        ...target,
        conditions: applyCondition(target.conditions, "unconscious"),
      },
      unconsciousEffect,
    ).owner;

    expect(conditionHasNonSpellSource(withEffect, "unconscious")).toBe(false);
    expect(conditionHasNonSpellSource(withEffect, "prone")).toBe(false);
    const afterUnconsciousEnds: BattleCreatureState = {
      ...withEffect,
      conditions: removeCondition(withEffect.conditions, "unconscious"),
      activeEffects: target.activeEffects,
    };
    expect(hasCondition(afterUnconsciousEnds.conditions, "unconscious")).toBe(
      false,
    );
    expect(hasCondition(afterUnconsciousEnds.conditions, "prone")).toBe(true);
    expect(conditionHasNonSpellSource(afterUnconsciousEnds, "prone")).toBe(
      true,
    );
  });

  test("condition cleanup preserves knocked-out state and deduplicates concentration sources", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected the synthetic target.");
    }
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-condition-source",
    );
    const spellConditionEffect = {
      kind: "spellCondition",
      effectRef: battleEffectExecutionRefForTest("synthetic-condition-effect"),
      sourceProcedureRef,
      sourceCombatantId: fighterId,
      condition: "unconscious",
      conditionHadNonSpellSource: false,
      escape: null,
      turnStartDamage: null,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: fighterId,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const;
    const sharedSenseEffect = {
      kind: "findFamiliarSharedSenses",
      effectRef: battleEffectExecutionRefForTest(
        "synthetic-shared-senses-effect",
      ),
      source: {
        kind: "companionSharedSenses" as const,
        ownerId: fighterId,
        companionId: goblinId,
      },
      sourceCombatantId: fighterId,
      familiarId: goblinId,
      canSeeThroughFamiliar: true as const,
      canHearThroughFamiliar: true as const,
      familiarSenses: [],
      expiresAt: { kind: "startOfTurn" as const, combatantId: fighterId },
    } as const satisfies BattleActiveEffect;
    expect(
      spellConcentrationEffectSourceFromEffect(spellConditionEffect),
    ).toEqual({
      sourceCombatantId: fighterId,
      sourceProcedureRef,
    });
    expect(spellConcentrationEffectSourceFromEffect(sharedSenseEffect)).toBe(
      null,
    );

    const duplicateSourceTarget = {
      ...target,
      activeEffects: [spellConditionEffect, spellConditionEffect],
    };
    expect(
      concentrationSpellEffectSourcesDirectlyApplyingCondition(
        duplicateSourceTarget,
        "unconscious",
      ),
    ).toEqual([{ sourceCombatantId: fighterId, sourceProcedureRef }]);

    const knockedOutTarget = {
      ...duplicateSourceTarget,
      hp: knockedOutOneHp(),
      positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      conditions: knockedOutConditionState(
        applyCondition(target.conditions, "unconscious"),
      ),
    };
    const removed = battleCreatureAfterConditionRemoval(
      knockedOutTarget,
      "unconscious",
    );
    expect(hasCondition(removed.conditions, "unconscious")).toBe(true);
    expect(removed.activeEffects).toEqual([]);

    const withExpiringCondition = applyCondition(
      target.conditions,
      "unconscious",
    );
    const afterSpellConditionExpires =
      conditionsAfterExpiringSpellConditionEffects(
        withExpiringCondition,
        [],
        [spellConditionEffect],
      );
    expect(hasCondition(afterSpellConditionExpires, "unconscious")).toBe(false);
    expect(hasCondition(afterSpellConditionExpires, "prone")).toBe(true);
    const nonSpellSourceEffect = {
      ...spellConditionEffect,
      conditionHadNonSpellSource: true,
    } as const satisfies BattleActiveEffect;
    expect(
      conditionsAfterExpiringSpellConditionEffects(
        withExpiringCondition,
        [],
        [nonSpellSourceEffect],
      ),
    ).toEqual(withExpiringCondition);

    const withSpellEffectState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(target.combatantId, {
        ...target,
        activeEffects: [spellConditionEffect],
      }),
    };
    expect(
      removeSpellConditionEffect(
        withSpellEffectState,
        target.combatantId,
        spellConditionEffect,
      ).combatants.get(target.combatantId)?.activeEffects,
    ).toEqual([]);
    expect(
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        withSpellEffectState.combatants,
        { sourceCombatantId: fighterId, sourceProcedureRef },
      ),
    ).toBe(withSpellEffectState.combatants);

    expect(removeSleepEffectsFromTarget(state, combatantId("missing"))).toBe(
      state,
    );
    expect(
      hasCondition(
        battleCreatureStateWithKnockOutPreservedConditions(
          knockedOutTarget,
          target.conditions,
        ).conditions,
        "unconscious",
      ),
    ).toBe(true);
  });

  test("covers protection-save and sleep/control cleanup edges", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the conscious synthetic target.");
    }
    const charmedSourceEffect = {
      kind: "spellCondition",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-charmed-procedure",
      ),
      sourceCombatantId: fighterId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      escape: null,
      turnStartDamage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const;
    const immunityEffect = {
      kind: "conditionImmunity",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-condition-immunity",
      ),
      sourceCombatantId: fighterId,
      condition: "charmed",
      conditionHadNonSpellSource: true,
      expiresAt: { kind: "untilDispelled" as const },
    } as const;
    const charmedAllocation = allocateActiveEffectForTest(
      {
        ...target,
        conditions: applyCondition(target.conditions, "charmed"),
      },
      charmedSourceEffect,
    );
    const sourceTarget = allocateActiveEffectForTest(
      charmedAllocation.owner,
      immunityEffect,
    ).owner;
    expect(
      conditionHadNonSpellSourceBeforeSpellEffect(sourceTarget, "charmed"),
    ).toBe(true);

    const repeatSaveEffect = {
      kind: "spellConditionRepeatSave",
      effectRef: battleEffectExecutionRefForTest("synthetic-repeat-save"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-repeat-save-procedure",
      ),
      sourceCombatantId: fighterId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      save: {
        ability: "wis" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(13) },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const possessionEffect = {
      kind: "possession",
      effectRef: battleEffectExecutionRefForTest("synthetic-possession"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-possession-procedure",
      ),
      sourceCombatantId: fighterId,
      save: {
        ability: "cha" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(14) },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    expect(
      applyProtectionRelevantEffectSaveOutcome(
        state,
        goblinId,
        repeatSaveEffect,
        false,
      ),
    ).toBe(state);
    expect(
      applyProtectionRelevantEffectSaveOutcome(
        state,
        combatantId("missing-target"),
        possessionEffect,
        true,
      ),
    ).toBe(state);
    expect(protectionRelevantEffectsForTarget(state, goblinId)).toEqual([]);
    expect(
      protectionRelevantEffectsForTarget(state, combatantId("missing-target")),
    ).toEqual([]);
    expect(
      validateProtectionRelevantEffectSavingThrowOutcome(
        {
          area: {
            originAnchorId: fighterId,
            affectedTargetIds: [goblinId],
          },
          outcomes: [],
        },
        goblinId,
      ),
    ).toContain("must not include area facts");
    expect(
      validateProtectionRelevantEffectSavingThrowOutcome(
        { outcomes: [] },
        goblinId,
      ),
    ).toContain("exactly once");
    expect(
      removeSpellConditionEffect(
        state,
        goblinId,
        repeatSaveEffect,
      ).combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);
    expect(
      removeSpellConditionEffect(
        state,
        combatantId("missing-target"),
        repeatSaveEffect,
      ),
    ).toBe(state);

    const sleepEffect = {
      kind: "sleepUnconscious",
      effectRef: battleEffectExecutionRefForTest("synthetic-sleep-unconscious"),
      sourceProcedureRef: battleProcedureExecutionRefForTest("synthetic-sleep"),
      sourceCombatantId: fighterId,
      conditionHadNonSpellSource: false,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: fighterId,
      },
    } as const satisfies BattleActiveEffect;
    const sleeping = {
      ...target,
      conditions: applyCondition(target.conditions, "unconscious"),
      activeEffects: [sleepEffect],
    };
    const sleepingState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, sleeping),
    };
    expect(combatantHasSleepEffect(sleeping)).toBe(true);
    expect(sleepShakeAwakeTargetChoices(sleepingState, fighterId)).toEqual([
      goblinId,
    ]);
    expect(removeSleepEffectsFromTarget(sleepingState, goblinId)).toMatchObject(
      {
        combatants: expect.any(Map),
      },
    );
    const knockedOutSleeping = {
      ...sleeping,
      hp: knockedOutOneHp(),
      positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      conditions: knockedOutConditionState(sleeping.conditions),
    };
    expect(
      removeSleepEffectsFromTarget(
        {
          ...state,
          combatants: new Map(state.combatants).set(
            goblinId,
            knockedOutSleeping,
          ),
        },
        goblinId,
      ).combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);

    const hypnoticEffect = {
      kind: "hypnoticPatternControl",
      sourceProcedureRef:
        battleProcedureExecutionRefForTest("synthetic-hypnotic"),
      sourceCombatantId: fighterId,
      conditionHadNonSpellCharmedSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const;
    const hypnotized = allocateActiveEffectForTest(
      {
        ...target,
        conditions: applyCondition(
          applyCondition(target.conditions, "charmed"),
          "incapacitated",
        ),
      },
      hypnoticEffect,
    ).owner;
    const hypnotizedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, hypnotized),
    };
    expect(
      hypnoticPatternShakeAwakeTargetChoices(hypnotizedState, fighterId),
    ).toEqual([goblinId]);
    expect(
      removeHypnoticPatternControlEffectsFromTarget(
        hypnotizedState,
        goblinId,
      ).combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);

    const hideousLaughterEffect = {
      kind: "hideousLaughter",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-hideous-laughter",
      ),
      sourceCombatantId: fighterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(13) },
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: fighterId,
      },
    } as const;
    const laughterAllocation = allocateActiveEffectForTest(
      {
        ...target,
        conditions: applyCondition(
          applyCondition(target.conditions, "prone"),
          "incapacitated",
        ),
      },
      hideousLaughterEffect,
    );
    const laughing = laughterAllocation.owner;
    const laughingState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, laughing),
    };
    expect(
      removeHideousLaughterEffectFromTarget(
        laughingState,
        goblinId,
        laughterAllocation.effect.effectRef,
      ).combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);
    const knockedOutLaughing = {
      ...laughing,
      hp: knockedOutOneHp(),
      positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      conditions: knockedOutConditionState(laughing.conditions),
    };
    expect(
      removeHideousLaughterEffectFromTarget(
        {
          ...state,
          combatants: new Map(state.combatants).set(
            goblinId,
            knockedOutLaughing,
          ),
        },
        goblinId,
        laughterAllocation.effect.effectRef,
      ).combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);
  });

  test("Hideous Laughter cleanup reads the exact current occurrence instead of a stale same-ref clone", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    const source = state.combatants.get(fighterId);
    if (
      target === undefined ||
      target.positiveHpUnconscious !== null ||
      source === undefined
    ) {
      throw new Error("Expected the synthetic cleanup combatants.");
    }
    const allocation = allocateActiveEffectForTest(
      {
        ...target,
        conditions: applyCondition(
          applyCondition(target.conditions, "prone"),
          "incapacitated",
        ),
      },
      {
        kind: "hideousLaughter",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-stale-laughter-source",
        ),
        sourceCombatantId: fighterId,
        conditionHadNonSpellProneSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        repeatSaveRollMode: null,
        save: {
          ability: "wis",
          dc: { kind: "fixed", dc: difficultyClass(13) },
        },
        expiresAt: { kind: "concentration", combatantId: fighterId },
      },
    );
    const staleClone = allocation.effect;
    const currentProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-current-laughter-source",
    );
    const currentEffect = {
      ...staleClone,
      sourceProcedureRef: currentProcedureRef,
      conditionHadNonSpellProneSource: true,
      conditionHadNonSpellIncapacitatedSource: true,
    };
    const currentState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...source,
          concentration: {
            sourceProcedureRef: currentProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(goblinId, {
          ...allocation.owner,
          activeEffects: [currentEffect],
        }),
    };

    const cleaned = removeHideousLaughterEffectFromTarget(
      currentState,
      goblinId,
      staleClone.effectRef,
    );
    const cleanedTarget = cleaned.combatants.get(goblinId);
    expect(cleanedTarget?.activeEffects).toEqual([]);
    expect(
      hasCondition(cleanedTarget?.conditions ?? target.conditions, "prone"),
    ).toBe(true);
    expect(
      hasCondition(
        cleanedTarget?.conditions ?? target.conditions,
        "incapacitated",
      ),
    ).toBe(true);
    expect(cleaned.combatants.get(fighterId)?.concentration).toBeNull();
  });
});
