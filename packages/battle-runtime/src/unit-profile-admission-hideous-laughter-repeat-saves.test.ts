import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-hideous-laughter-repeat-save-lifecycle
import {
  requireCharacterSpellProcedureRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  acidArrowUnitId,
  colorSprayUnitId,
  eldritchBlastUnitId,
  ensnaringStrikeUnitId,
  faerieFireUnitId,
  hellishRebukeUnitId,
  saveGatedConditionWithRepeatDurationTicks,
  saveGatedConditionWithRepeatUnitId,
  iceKnifeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  characterCreature,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { removeSaveGatedConditionWithRepeatEffectFromTarget } from "./battle-reducer/spell-condition-effects-helpers.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  saveGatedConditionWithRepeatWithPhase,
  spellAdmissionSource,
  spellRecord,
  spellWithSaveGateRepeatSaves,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleId,
  classLevel,
  combatantId,
  endTurn,
  hasCondition,
  Hp,
  resolveBattleSubject,
  resourceCount,
  spellSlotLevel,
  spellSlotInvocationRef,
  startBattle,
  supportedPreparedAfterDamageReactionSaveSpellProfile,
  supportedPreparedSaveGatedConditionWithRepeatProfile,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
} from "./unit-profile-admission.test-support.ts";
import type {
  ActivationPhase,
  BattleFill,
  BattleHole,
  BattleState,
  EffectAtom,
} from "./unit-profile-admission.test-support.ts";

function characterWithExpendedSlotAndConcentration(
  state: BattleState,
  actorId: typeof spellCasterId,
  sourceProcedureRef: ReturnType<
    typeof requireCharacterSpellProcedureRefForTest
  >,
) {
  const actor = requireCombatant(state, actorId);
  if (actor.origin.kind !== "character" || actor.origin.spellcasting == null) {
    throw new Error("Expected an admitted spellcasting character.");
  }
  const spellcasting = actor.origin.spellcasting;
  return {
    ...actor,
    origin: {
      ...actor.origin,
      spellcasting: {
        ...spellcasting,
        spellSlots: spellcasting.spellSlots.map((slot) => ({
          ...slot,
          expended: resourceCount(1),
        })),
      },
    },
    concentration: {
      sourceProcedureRef,
      effectKind: "spellEffect" as const,
    },
  };
}

function saveGatedConditionWithRepeatEffectTemplate(
  sourceProcedureRef: ReturnType<
    typeof requireCharacterSpellProcedureRefForTest
  >,
) {
  return {
    kind: "saveGatedConditionWithRepeat",
    sourceProcedureRef,
    sourceCombatantId: spellCasterId,
    conditionHadNonSpellProneSource: false,
    conditionHadNonSpellIncapacitatedSource: false,
    repeatSaveRollMode: null,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: saveGatedConditionWithRepeatDurationTicks,
    },
  } as const;
}

describe("QMBT14 deterministic Hideous Laughter repeat-save lifecycle admission", () => {
  test("Hideous Laughter asks for an Advantage repeat save after start-turn spell damage", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const ensnaringSourceId = combatantId("synthetic-ensnaring-source");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [ensnaringSourceId],
      extraTargetSpellcasting: wizardSpellcasting({
        preparedSpells: [spellRecord(ensnaringStrikeUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      targetHp: 20,
      targetMaxHp: 20,
    });
    const laughterProcedureRef = spellAct({
      session: baseState,
      spellId: saveGatedConditionWithRepeatUnitId,
    }).subject.procedureRef;
    const ensnaringProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      ensnaringSourceId,
      spellSlotInvocationRef(
        ensnaringStrikeUnitId,
        1,
        "afterHitSaveGatedCondition",
      ),
    );
    const target = requireCombatant(baseState.state, spellTargetId);
    const targetWithConditions =
      battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(
          applyCondition(
            applyCondition(target.conditions, "restrained"),
            "prone",
          ),
          "incapacitated",
        ),
      );
    const conditionAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: targetWithConditions,
      effect: {
        kind: "spellCondition",
        sourceProcedureRef: ensnaringProcedureRef,
        sourceCombatantId: ensnaringSourceId,
        condition: "restrained",
        conditionHadNonSpellSource: false,
        escape: {
          kind: "abilityCheck",
          ability: "str",
          skill: "athletics",
          allowedActor: "targetOrCreatureWithinReach",
          successEnds: "condition",
        },
        turnStartDamage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "piercing",
        },
        expiresAt: {
          kind: "concentration",
          combatantId: ensnaringSourceId,
        },
      },
    });
    const targetWithConditionOccurrence = {
      ...conditionAllocation.owner,
      activeEffects: [
        ...conditionAllocation.owner.activeEffects,
        conditionAllocation.effect,
      ],
    };
    const laughterAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: targetWithConditionOccurrence,
      effect: saveGatedConditionWithRepeatEffectTemplate(laughterProcedureRef),
    });
    const state: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants)
        .set(
          spellCasterId,
          characterWithExpendedSlotAndConcentration(
            baseState.state,
            spellCasterId,
            laughterProcedureRef,
          ),
        )
        .set(
          ensnaringSourceId,
          characterWithExpendedSlotAndConcentration(
            baseState.state,
            ensnaringSourceId,
            ensnaringProcedureRef,
          ),
        )
        .set(spellTargetId, {
          ...laughterAllocation.owner,
          activeEffects: [
            ...laughterAllocation.owner.activeEffects,
            laughterAllocation.effect,
          ],
        }),
    };

    const awaitingTurnStartDamage = endTurn({
      state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStartDamage,
      "rolledDice",
    );
    const awaitingHideousLaughterDamageSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [damageRollFillWithGroups(turnStartDamage, [[4]])],
    });
    const damageRepeatSave = requireResultHole(
      awaitingHideousLaughterDamageSave,
      "savingThrowOutcome",
    );
    expect(damageRepeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          effectRef: laughterAllocation.effect.effectRef,
          trigger: "damage",
        }),
        targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
      }),
    );

    const resolved = endTurn({
      state,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(turnStartDamage, [[4]]),
        savingThrowOutcomeFill(damageRepeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected start-turn damage repeat save to resolve.");
    }
    const resolvedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(resolvedTarget.hp).toBe(Hp(16));
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(resolvedTarget.conditions, "incapacitated")).toBe(
      false,
    );
    expect(
      resolvedTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });

  test("Hideous Laughter asks for an Advantage repeat save after end-turn spell damage", () => {
    const baseState = spellBattle({
      preparedSpells: [spellRecord(saveGatedConditionWithRepeatUnitId)],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [
          spellRecord(saveGatedConditionWithRepeatUnitId),
          spellRecord(acidArrowUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 2, count: 1 },
        ],
      }),
    });
    const targetLaughterProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      spellTargetId,
      spellSlotInvocationRef(
        saveGatedConditionWithRepeatUnitId,
        1,
        "saveGatedConditionWithRepeat",
      ),
    );
    const acidArrowProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      spellTargetId,
      spellSlotInvocationRef(acidArrowUnitId, 2, "spellAttackDamage"),
    );
    const caster = requireCombatant(baseState.state, spellCasterId);
    const casterWithConditions =
      battleCreatureStateWithKnockOutPreservedConditions(
        caster,
        applyCondition(
          applyCondition(caster.conditions, "prone"),
          "incapacitated",
        ),
      );
    const damageAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: casterWithConditions,
      effect: {
        kind: "spellTurnEndDamage",
        sourceProcedureRef: acidArrowProcedureRef,
        sourceCombatantId: spellTargetId,
        damage: {
          expr: { dice: 2, dieSize: 4 },
          damageType: "acid",
        },
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellCasterId,
          round: baseState.state.initiative.round,
        },
      },
    });
    const laughterAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: {
        ...damageAllocation.owner,
        activeEffects: [
          ...damageAllocation.owner.activeEffects,
          damageAllocation.effect,
        ],
      },
      effect: {
        ...saveGatedConditionWithRepeatEffectTemplate(
          targetLaughterProcedureRef,
        ),
        sourceCombatantId: spellTargetId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellTargetId,
          durationTicks: saveGatedConditionWithRepeatDurationTicks,
        },
      },
    });
    const state: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants)
        .set(
          spellTargetId,
          characterWithExpendedSlotAndConcentration(
            baseState.state,
            spellTargetId,
            targetLaughterProcedureRef,
          ),
        )
        .set(spellCasterId, {
          ...laughterAllocation.owner,
          activeEffects: [
            ...laughterAllocation.owner.activeEffects,
            laughterAllocation.effect,
          ],
        }),
    };

    const awaitingDamage = endTurn({
      state,
      actorId: spellCasterId,
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected end-turn damage and repeat-save holes.");
    }
    const damage = requireResultHole(awaitingDamage, "rolledDice");
    const endTurnRepeatSave = awaitingDamage.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "saveGatedConditionRepeatSave" in hole &&
        hole.saveGatedConditionRepeatSave.trigger === "endTurn",
    );
    if (endTurnRepeatSave === undefined) {
      throw new Error("Expected Hideous Laughter end-turn repeat save.");
    }
    const endTurnRepeatSaveFill = savingThrowOutcomeFill(endTurnRepeatSave, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const damageFill = damageRollFillWithGroups(damage, [[4, 4]]);
    const awaitingDamageRepeatSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [endTurnRepeatSaveFill, damageFill],
    });
    const damageRepeatSave = requireResultHole(
      awaitingDamageRepeatSave,
      "savingThrowOutcome",
    );
    expect(damageRepeatSave).toMatchObject({
      saveGatedConditionRepeatSave: {
        targetId: spellCasterId,
        trigger: "damage",
      },
      targetRollModes: [{ targetId: spellCasterId, rollMode: "advantage" }],
    });

    const resolved = endTurn({
      state,
      actorId: spellCasterId,
      fills: [
        endTurnRepeatSaveFill,
        damageFill,
        savingThrowOutcomeFill(damageRepeatSave, [
          { targetId: spellCasterId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected end-turn damage repeat save to resolve.");
    }
    const resolvedCaster = requireCombatant(resolved.state, spellCasterId);
    expect(resolvedCaster.hp).toBe(Hp(4));
    expect(hasCondition(resolvedCaster.conditions, "prone")).toBe(false);
    expect(hasCondition(resolvedCaster.conditions, "incapacitated")).toBe(
      false,
    );
  });

  test("Hideous Laughter asks for a fresh damage repeat save for each same-target Eldritch Blast beam", () => {
    const spell = spellRecord(eldritchBlastUnitId);
    const baseState = spellBattle({
      cantrips: [spell],
      preparedSpells: [spellRecord(saveGatedConditionWithRepeatUnitId)],
      casterClassLevels: [{ className: "warlock", level: classLevel(5) }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const laughterProcedureRef = spellAct({
      session: baseState,
      spellId: saveGatedConditionWithRepeatUnitId,
    }).subject.procedureRef;
    const target = requireCombatant(baseState.state, spellTargetId);
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: affectedTarget,
      effect: saveGatedConditionWithRepeatEffectTemplate(laughterProcedureRef),
    });
    const state: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants)
        .set(spellCasterId, {
          ...characterWithExpendedSlotAndConcentration(
            baseState.state,
            spellCasterId,
            laughterProcedureRef,
          ),
        })
        .set(spellTargetId, {
          ...allocation.owner,
          activeEffects: [...allocation.owner.activeEffects, allocation.effect],
        }),
    };
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...baseState, state }),
      spellId: eldritchBlastUnitId,
    });
    const targetFills = act.initialHoles
      .filter(
        (
          hole,
        ): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
          hole.kind === "targetChoice",
      )
      .map((hole) =>
        spellTargetFill(
          hole,
          eldritchBlastUnitId,
          spellCasterId,
          spellTargetId,
        ),
      );

    const firstAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: targetFills,
      }),
      "attackRoll",
    );
    const afterFirstAttackFills = [
      ...targetFills,
      attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
    ];
    const firstDamage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterFirstAttackFills,
      }),
      "rolledDice",
    );
    const afterFirstDamageFills = [
      ...afterFirstAttackFills,
      damageRollFillWithGroups(firstDamage, [[4]]),
    ];
    const firstRepeatSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterFirstDamageFills,
      }),
      "savingThrowOutcome",
    );
    expect(firstRepeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "damage",
        }),
        targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
      }),
    );

    const afterFirstRepeatSaveFills = [
      ...afterFirstDamageFills,
      savingThrowOutcomeFill(firstRepeatSave, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ];
    const secondAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterFirstRepeatSaveFills,
      }),
      "attackRoll",
    );
    const afterSecondAttackFills = [
      ...afterFirstRepeatSaveFills,
      attackRollFill(secondAttackRoll, { total: 18, naturalD20: 12 }),
    ];
    const secondDamage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterSecondAttackFills,
      }),
      "rolledDice",
    );
    const afterSecondDamageFills = [
      ...afterSecondAttackFills,
      damageRollFillWithGroups(secondDamage, [[4]]),
    ];
    const secondRepeatSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterSecondDamageFills,
      }),
      "savingThrowOutcome",
    );
    expect(String(secondRepeatSave.holeId)).not.toBe(
      String(firstRepeatSave.holeId),
    );

    const removedState = removeSaveGatedConditionWithRepeatEffectFromTarget(
      state,
      spellTargetId,
      allocation.effect.effectRef,
    );
    const removedTarget = requireCombatant(removedState, spellTargetId);
    const replacementTarget =
      battleCreatureStateWithKnockOutPreservedConditions(
        removedTarget,
        applyCondition(
          applyCondition(removedTarget.conditions, "prone"),
          "incapacitated",
        ),
      );
    const replacementAllocation = allocateBattleEffectOccurrenceForCreature({
      owner: replacementTarget,
      effect: saveGatedConditionWithRepeatEffectTemplate(laughterProcedureRef),
    });
    const replacementState: BattleState = {
      ...removedState,
      combatants: new Map(removedState.combatants)
        .set(spellCasterId, requireCombatant(state, spellCasterId))
        .set(spellTargetId, {
          ...replacementAllocation.owner,
          activeEffects: [
            ...replacementAllocation.owner.activeEffects,
            replacementAllocation.effect,
          ],
        }),
    };
    const staleFillResult = resolveBattleSubject({
      state: replacementState,
      subject: act.subject,
      fills: [
        ...afterSecondDamageFills,
        savingThrowOutcomeFill(secondRepeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(staleFillResult.tag).toBe("needsHoles");
    if (staleFillResult.tag !== "needsHoles") {
      throw new Error(
        "Expected the replaced occurrence to request a fresh save.",
      );
    }
    const replacementRepeatSave = staleFillResult.holes.find(
      (hole) => "saveGatedConditionRepeatSave" in hole,
    );
    expect(replacementRepeatSave?.saveGatedConditionRepeatSave).toMatchObject({
      effectRef: replacementAllocation.effect.effectRef,
    });
    expect(replacementAllocation.effect.effectRef).not.toBe(
      allocation.effect.effectRef,
    );
    const staleResultTarget = requireCombatant(
      staleFillResult.state,
      spellTargetId,
    );
    expect(staleResultTarget.activeEffects).toContainEqual(
      replacementAllocation.effect,
    );
    expect(hasCondition(staleResultTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(staleResultTarget.conditions, "incapacitated")).toBe(
      true,
    );
    expect(
      requireCombatant(staleFillResult.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: replacementAllocation.effect.sourceProcedureRef,
      effectKind: "spellEffect",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        ...afterSecondDamageFills,
        savingThrowOutcomeFill(secondRepeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Eldritch Blast beam sequence to resolve.");
    }
    const resolvedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(resolvedTarget.hp).toBe(Hp(12));
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(resolvedTarget.conditions, "incapacitated")).toBe(
      false,
    );
    expect(
      resolvedTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });
  test("Hideous Laughter asks for fresh damage repeat saves for Ice Knife attack and burst damage", () => {
    const spell = spellRecord(iceKnifeUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell, spellRecord(saveGatedConditionWithRepeatUnitId)],
      spellSlots: [{ spellLevel: 1, count: 2 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const laughterProcedureRef = spellAct({
      session: baseState,
      spellId: saveGatedConditionWithRepeatUnitId,
    }).subject.procedureRef;
    const target = requireCombatant(baseState.state, spellTargetId);
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: affectedTarget,
      effect: saveGatedConditionWithRepeatEffectTemplate(laughterProcedureRef),
    });
    const state: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants)
        .set(
          spellCasterId,
          characterWithExpendedSlotAndConcentration(
            baseState.state,
            spellCasterId,
            laughterProcedureRef,
          ),
        )
        .set(spellTargetId, {
          ...allocation.owner,
          activeEffects: [...allocation.owner.activeEffects, allocation.effect],
        }),
    };
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...baseState, state }),
      spellId: iceKnifeUnitId,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      iceKnifeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attackDamage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const afterAttackDamageFills = [
      targetFill,
      attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
      damageRollFillWithGroups(attackDamage, [[5]]),
    ];
    const attackRepeatSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterAttackDamageFills,
      }),
      "savingThrowOutcome",
    );
    expect(attackRepeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "damage",
        }),
        targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
      }),
    );

    const afterAttackRepeatFills = [
      ...afterAttackDamageFills,
      savingThrowOutcomeFill(attackRepeatSave, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ];
    const burstSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterAttackRepeatFills,
      }),
      "savingThrowOutcome",
    );
    const burstSaveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: burstSave.holeId,
      value: {
        area: {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellTargetId],
        },
        outcomes: [{ targetId: spellTargetId, succeeded: false }],
      },
    };
    const burstDamage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [...afterAttackRepeatFills, burstSaveFill],
      }),
      "rolledDice",
    );
    const afterBurstDamageFills = [
      ...afterAttackRepeatFills,
      burstSaveFill,
      damageRollFillWithGroups(burstDamage, [[2, 2]]),
    ];
    const burstRepeatSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: afterBurstDamageFills,
      }),
      "savingThrowOutcome",
    );
    expect(String(burstRepeatSave.holeId)).not.toBe(
      String(attackRepeatSave.holeId),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        ...afterBurstDamageFills,
        savingThrowOutcomeFill(burstRepeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Ice Knife damage repeat saves to resolve.");
    }
    const resolvedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(resolvedTarget.hp).toBe(Hp(11));
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(resolvedTarget.conditions, "incapacitated")).toBe(
      false,
    );
    expect(
      resolvedTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });
  test("Hideous Laughter ordinary weapon damage repeat save can end the effect", () => {
    const baseStateResult = startBattle({
      battleId: battleId("unit-profile-hideous-laughter-weapon-damage"),
      combatants: [
        characterCreature({
          combatantId: spellCasterId,
          displayName: "Attacker",
          initiative: 20,
          attack: zeroAbilityWeaponAttack("weapon_longsword"),
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(saveGatedConditionWithRepeatUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterCreature({
          combatantId: spellTargetId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    expect(Result.isSuccess(baseStateResult)).toBe(true);
    if (Result.isFailure(baseStateResult)) {
      throw new Error(battleStateInitIssueMessage(baseStateResult.failure));
    }
    const baseState = baseStateResult.success;
    const subject = weaponAttackSubject(baseState, "Longsword");
    const laughterProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      spellCasterId,
      spellSlotInvocationRef(
        saveGatedConditionWithRepeatUnitId,
        1,
        "saveGatedConditionWithRepeat",
      ),
    );
    const target = requireCombatant(baseState.state, spellTargetId);
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: affectedTarget,
      effect: saveGatedConditionWithRepeatEffectTemplate(laughterProcedureRef),
    });
    const state: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants)
        .set(
          spellCasterId,
          characterWithExpendedSlotAndConcentration(
            baseState.state,
            spellCasterId,
            laughterProcedureRef,
          ),
        )
        .set(spellTargetId, {
          ...allocation.owner,
          activeEffects: [...allocation.owner.activeEffects, allocation.effect],
        }),
    };
    const targetHole = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      targetHole,
      spellCasterId,
      spellTargetId,
    );
    const attackRollHole = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 18,
      naturalD20: 12,
      rollMode: "advantage",
    });
    const damageHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, attackRoll],
      }),
      "rolledDice",
    );
    const damageRoll = damageRollFillWithGroups(damageHole, [[4]]);
    const repeatSaveHole = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, attackRoll, damageRoll],
      }),
      "savingThrowOutcome",
    );
    expect(repeatSaveHole).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "damage",
        }),
        targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill,
        attackRoll,
        damageRoll,
        savingThrowOutcomeFill(repeatSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected weapon damage repeat save to resolve.");
    }
    const resolvedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(resolvedTarget.hp).toBe(Hp(16));
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(resolvedTarget.conditions, "incapacitated")).toBe(
      false,
    );
    expect(
      resolvedTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });
  test("Hideous Laughter admission rejects unsupported failed-save and repeat-save branches", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const spellSlots = [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(0),
        payment: { tag: "slot" as const },
      },
    ];

    expect(
      supportedPreparedSaveGatedConditionWithRepeatProfile(
        spellAdmissionSource(spell),
        spellSlots,
      ),
    ).toHaveLength(1);

    expect(
      supportedPreparedSaveGatedConditionWithRepeatProfile(
        spellAdmissionSource(
          saveGatedConditionWithRepeatWithPhase(spell, (phase) => {
            if (phase.onFail.kind !== "composite") {
              throw new Error("Expected Hideous Laughter composite failure.");
            }
            return {
              ...phase,
              onFail: {
                ...phase.onFail,
                effects: [
                  ...phase.onFail.effects,
                  { kind: "apply_condition", condition: "charmed" },
                ],
              },
            } satisfies ActivationPhase;
          }),
        ),
        spellSlots,
      ),
    ).toEqual([]);

    expect(
      supportedPreparedSaveGatedConditionWithRepeatProfile(
        spellAdmissionSource(
          saveGatedConditionWithRepeatWithPhase(spell, (phase) => {
            if (phase.repeatSaves === undefined) {
              throw new Error("Expected Hideous Laughter repeat saves.");
            }
            const repeatSaves = phase.repeatSaves.map((repeatSave) =>
              repeatSave.cadence === "on_target_takes_damage"
                ? {
                    ...repeatSave,
                    onFailAgain: {
                      kind: "apply_condition",
                      condition: "charmed",
                    } satisfies EffectAtom,
                  }
                : repeatSave,
            );
            const firstRepeatSave = repeatSaves[0];
            if (firstRepeatSave === undefined) {
              throw new Error("Expected Hideous Laughter repeat save.");
            }
            return {
              ...phase,
              repeatSaves: [firstRepeatSave, ...repeatSaves.slice(1)],
            } satisfies ActivationPhase;
          }),
        ),
        spellSlots,
      ),
    ).toEqual([]);
  });
  test("repeat-save phases are rejected by non-repeat save-gate profiles", () => {
    const spellSlots = [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(0),
        payment: { tag: "slot" as const },
      },
    ];
    const colorSprayWithRepeatSave = spellWithSaveGateRepeatSaves(
      spellRecord(colorSprayUnitId),
      "color_spray_with_repeat_save",
    );
    const faerieFireWithRepeatSave = spellWithSaveGateRepeatSaves(
      spellRecord(faerieFireUnitId),
      "faerie_fire_with_repeat_save",
    );
    const hellishRebukeWithRepeatSave = spellWithSaveGateRepeatSaves(
      spellRecord(hellishRebukeUnitId),
      "hellish_rebuke_with_repeat_save",
    );

    expect(
      supportedPreparedSaveGateConditionProfile(
        spellAdmissionSource(colorSprayWithRepeatSave),
        spellSlots,
      ),
    ).toEqual([]);
    expect(
      supportedPreparedSaveGateAttackRollAdvantageProfile(
        spellCasterId,
        spellAdmissionSource(faerieFireWithRepeatSave),
        spellSlots,
      ),
    ).toEqual([]);
    expect(
      supportedPreparedAfterDamageReactionSaveSpellProfile(
        spellAdmissionSource(hellishRebukeWithRepeatSave),
        spellSlots,
      ),
    ).toEqual([]);
  });
});
