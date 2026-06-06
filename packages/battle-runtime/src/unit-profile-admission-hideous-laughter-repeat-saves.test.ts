// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-hideous-laughter-repeat-save-lifecycle
import { describe, expect, test } from "vitest";
import {
  colorSprayUnitId,
  eldritchBlastUnitId,
  ensnaringStrikeUnitId,
  faerieFireUnitId,
  hellishRebukeUnitId,
  hideousLaughterDurationTicks,
  hideousLaughterUnitId,
  iceKnifeUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
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
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  hideousLaughterWithPhase,
  spellRecord,
  spellWithSaveGateRepeatSaves,
} from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleId,
  classLevel,
  Either,
  endTurn,
  hasCondition,
  Hp,
  resolveBattleSubject,
  resourceCount,
  spellSlotLevel,
  startBattle,
  supportedPreparedHellishRebukeReactionSpellProfile,
  supportedPreparedHideousLaughterProfile,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
} from "./unit-profile-admission-test-support.ts";
import type {
  ActivationPhase,
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleState,
  EffectAtom,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic Hideous Laughter repeat-save lifecycle admission", () => {
  test("Hideous Laughter asks for an Advantage repeat save after start-turn spell damage", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const target = requireCombatant(baseState, spellTargetId);
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
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...targetWithConditions,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "spellCondition",
            sourceSpellId: ensnaringStrikeUnitId,
            sourceCombatantId: spellCasterId,
            condition: "restrained",
            conditionHadNonSpellSource: false,
            escape: null,
            turnStartDamage: {
              expr: { dice: 1, dieSize: 6 },
              damageType: "piercing",
            },
            expiresAt: {
              kind: "concentration",
              combatantId: spellCasterId,
            },
          },
          {
            kind: "hideousLaughter",
            sourceSpellId: hideousLaughterUnitId,
            sourceCombatantId: spellCasterId,
            conditionHadNonSpellProneSource: false,
            conditionHadNonSpellIncapacitatedSource: false,
            repeatSaveRollMode: null,
            save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
            expiresAt: {
              kind: "concentration",
              combatantId: spellCasterId,
              durationTicks: hideousLaughterDurationTicks,
            },
          },
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
        hideousLaughterRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(false);
  });
  test("Hideous Laughter asks for a fresh damage repeat save for each same-target Eldritch Blast beam", () => {
    const spell = spellRecord(eldritchBlastUnitId);
    const baseState = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "warlock", level: classLevel(5) }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const target = requireCombatant(baseState, spellTargetId);
    const hideousLaughterEffect = {
      kind: "hideousLaughter",
      sourceSpellId: hideousLaughterUnitId,
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: hideousLaughterDurationTicks,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants)
        .set(spellCasterId, {
          ...requireCombatant(baseState, spellCasterId),
          concentration: {
            sourceSpellId: hideousLaughterUnitId,
            effectKind: "spellEffect",
          },
        })
        .set(spellTargetId, {
          ...affectedTarget,
          activeEffects: [hideousLaughterEffect],
        }),
    };
    const act = spellAct({ state, spellId: eldritchBlastUnitId });
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
        hideousLaughterRepeatSave: expect.objectContaining({
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(false);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });
  test("Hideous Laughter asks for fresh damage repeat saves for Ice Knife attack and burst damage", () => {
    const spell = spellRecord(iceKnifeUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const target = requireCombatant(baseState, spellTargetId);
    const hideousLaughterEffect = {
      kind: "hideousLaughter",
      sourceSpellId: hideousLaughterUnitId,
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: hideousLaughterDurationTicks,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...affectedTarget,
        activeEffects: [hideousLaughterEffect],
      }),
    };
    const act = spellAct({ state, spellId: iceKnifeUnitId });
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
        hideousLaughterRepeatSave: expect.objectContaining({
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
        (effect) => effect.kind === "hideousLaughter",
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
          side: partySide,
          attack: zeroAbilityWeaponAttack("weapon_longsword"),
        }),
        characterCreature({
          combatantId: spellTargetId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    expect(Either.isRight(baseStateResult)).toBe(true);
    if (Either.isLeft(baseStateResult)) {
      throw new Error(baseStateResult.left.message);
    }
    const baseState = baseStateResult.right;
    const target = requireCombatant(baseState, spellTargetId);
    const hideousLaughterEffect = {
      kind: "hideousLaughter",
      sourceSpellId: hideousLaughterUnitId,
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: hideousLaughterDurationTicks,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...affectedTarget,
        activeEffects: [hideousLaughterEffect],
      }),
    };
    const subject = weaponAttackSubject("Longsword");
    const targetHole = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      targetHole,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const attackRollHole = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 18,
      naturalD20: 12,
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
        hideousLaughterRepeatSave: expect.objectContaining({
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(false);
  });
  test("Hideous Laughter admission rejects unsupported failed-save and repeat-save branches", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const spellSlots = [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(0),
      },
    ];

    expect(
      supportedPreparedHideousLaughterProfile(spell, spellSlots),
    ).toHaveLength(1);

    expect(
      supportedPreparedHideousLaughterProfile(
        hideousLaughterWithPhase(spell, (phase) => {
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
        spellSlots,
      ),
    ).toEqual([]);

    expect(
      supportedPreparedHideousLaughterProfile(
        hideousLaughterWithPhase(spell, (phase) => {
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
        colorSprayWithRepeatSave,
        spellSlots,
      ),
    ).toEqual([]);
    expect(
      supportedPreparedSaveGateAttackRollAdvantageProfile(
        spellCasterId,
        faerieFireWithRepeatSave,
        spellSlots,
      ),
    ).toEqual([]);
    expect(
      supportedPreparedHellishRebukeReactionSpellProfile(
        hellishRebukeWithRepeatSave,
        spellSlots,
      ),
    ).toEqual([]);
  });
});
