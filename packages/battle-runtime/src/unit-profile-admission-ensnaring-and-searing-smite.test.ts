import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  readyDeclarationFillForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31D ensnaring_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31E searing_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save
import { describe, expect, test } from "vitest";
import { characterSpellInvocationRefForProcedureRefForTest } from "./battle-runtime.test-support.ts";
import type {
  BattleInterruptProcedureChoice,
  BattleRuntimeSession,
} from "./index.ts";
import {
  ensnaringStrikeHelperId,
  ensnaringStrikeUnitId,
  rayOfFrostUnitId,
  searingSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  abilityCheckFill,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockWithCreatureType,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { savingThrowOutcomeFill } from "./unit-profile-admission-spell-fill.test-support.ts";
import { afterHitSpellSavingThrowCompletionRoutes } from "./battle-reducer/after-hit-spell-routes.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  cantripSpellInvocationRef,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";

function afterHitChoiceMatchesSpell(
  session: BattleRuntimeSession,
  candidate: BattleInterruptProcedureChoice,
  spellId: string,
): boolean {
  if (
    candidate.kind !== "nestedProcedure" ||
    candidate.subject.command !== "castAttackHitBonusActionSpell"
  ) {
    return false;
  }
  return (
    characterSpellInvocationRefForProcedureRefForTest(
      session,
      candidate.subject.casterId,
      candidate.subject.procedureRef,
    ).spellId === spellId
  );
}

describe("SRDINV31 deterministic Ensnaring Strike and Searing Smite admission", () => {
  test("ensnaring_strike gives a Large target Advantage on its saving throw", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const targetStatBlock = statBlockWithCreatureType("humanoid");
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      targetStatBlock: {
        ...targetStatBlock,
        statBlock: { ...targetStatBlock.statBlock, size: "large" },
      },
    });
    const subject = weaponAttackSubject(state, "Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, attackRollFill(roll, { total: 15, naturalD20: 10 })],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...state,
            state: awaitingReaction.state,
          }),
          candidate,
          ensnaringStrikeUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }

    expect(
      requireHole(choice.initialHoles, "savingThrowOutcome"),
    ).toMatchObject({
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });
  });

  test("ensnaring_strike restrains after a weapon hit, damages at turn start, and can be escaped", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      extraTargetIds: [ensnaringStrikeHelperId],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const subject = weaponAttackSubject(state, "Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...state,
            state: awaitingReaction.state,
          }),
          candidate,
          ensnaringStrikeUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    expect(save).toMatchObject({ ability: "str" });
    const afterEnsnaring = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    if (afterEnsnaring.tag !== "needsHoles") {
      throw new Error(
        "Expected Ensnaring Strike replay to need attack damage.",
      );
    }
    const damage = requireHole(afterEnsnaring.holes, "rolledDice");
    const afterWeaponDamage = resolveBattleSubject({
      state: afterEnsnaring.state,
      subject,
      fills: [targetFill, rollFill, damageRollFillWithGroups(damage, [[3]])],
    });
    if (afterWeaponDamage.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike host attack to resolve.");
    }
    expect(
      requireCombatant(afterWeaponDamage.state, spellTargetId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });

    const awaitingTurnStartDamage = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStartDamage,
      "rolledDice",
    );
    expect(turnStartDamage).toMatchObject({
      spellTurnStartDamage: {
        sourceProcedureRef: choice.subject.procedureRef,
        targetId: spellTargetId,
        trigger: { kind: "condition", condition: "restrained" },
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "piercing" },
      },
    });
    const targetTurn = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
      fills: [damageRollFillWithGroups(turnStartDamage, [[4]])],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error(
        "Expected Ensnaring Strike turn-start damage to resolve.",
      );
    }
    expect(requireCombatant(targetTurn.state, spellTargetId).hp).toBe(Hp(13));

    const escapeAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...state,
        state: targetTurn.state,
      }),
    ).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint" ||
      escapeAct.subject.targetId !== spellTargetId
    ) {
      throw new Error("Expected Ensnaring Strike escape action.");
    }
    expect(escapeAct.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "afterHitSpell",
        holes: ["abilityCheck"],
        owner: "battleAbilityCheck",
      },
      {
        kind: "discoverBattleActs",
        subject: "afterHitSpell",
        holes: ["abilityCheck"],
        owner: "battleConditionLifecycle",
      },
      {
        kind: "discoverBattleActs",
        subject: "afterHitSpell",
        holes: ["abilityCheck"],
        owner: "battleConcentration",
      },
    ]);
    const escaped = resolveBattleSubject({
      state: targetTurn.state,
      subject: escapeAct.subject,
      fills: [
        abilityCheckFill(
          requireHole(escapeAct.initialHoles, "abilityCheck"),
          13,
        ),
      ],
    });
    if (escaped.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike escape to resolve.");
    }
    expect(requireCombatant(escaped.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(escaped.state, spellCasterId).concentration,
    ).toBeNull();

    const helperTurnResult = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (helperTurnResult.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike helper turn to start.");
    }
    const helperTurn = helperTurnResult.state;
    const helperEscapeAct = discoverBattleActCandidates(helperTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.actorId === ensnaringStrikeHelperId &&
        act.subject.targetId === spellTargetId,
    );
    if (
      helperEscapeAct?.subject.tag !== "action" ||
      helperEscapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Ensnaring Strike helper escape action.");
    }
    const helperEscapeCheck = requireHole(
      helperEscapeAct.initialHoles,
      "abilityCheck",
    );
    expect(helperEscapeCheck).toMatchObject({
      requiresTableSpatialFact: true,
    });
    expect(
      resolveBattleSubject({
        state: helperTurn,
        subject: helperEscapeAct.subject,
        fills: [abilityCheckFill(helperEscapeCheck, 13)],
      }),
    ).toMatchObject({ tag: "invalid" });

    const helperEscaped = resolveBattleSubject({
      state: helperTurn,
      subject: helperEscapeAct.subject,
      fills: [
        abilityCheckFill(helperEscapeCheck, 13, [
          {
            kind: "spellRestraintEscapeActorWithinTargetReach",
            actorId: ensnaringStrikeHelperId,
            targetId: spellTargetId,
          },
        ]),
      ],
    });
    if (helperEscaped.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike helper escape to resolve.");
    }
    expect(requireCombatant(helperEscaped.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(helperEscaped.state, spellCasterId).concentration,
    ).toBeNull();
  });
  test("searing_smite adds Fire damage after a melee hit, burns at turn start, and a Constitution save ends it", () => {
    const spell = spellRecord(searingSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Searing Smite attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...state,
            state: awaitingReaction.state,
          }),
          candidate,
          searingSmiteUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Searing Smite after-hit choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...state,
          state: awaitingReaction.state,
        }),
        choice.subject.casterId,
        choice.subject.procedureRef,
      ),
    ).toEqual(
      spellSlotInvocationRef(
        searingSmiteUnitId,
        3,
        "afterHitTimedDamageAndSave",
      ),
    );

    const afterSearing = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    if (afterSearing.tag !== "needsHoles") {
      throw new Error("Expected Searing Smite replay to need attack damage.");
    }
    expect(
      afterHitSpellSavingThrowCompletionRoutes({
        state: state.state,
        fills: ["rolledDice", "savingThrowOutcome"],
      }),
    ).toBeUndefined();
    expect(
      afterHitSpellSavingThrowCompletionRoutes({
        state: afterSearing.state,
        fills: ["rolledDice", "savingThrowOutcome"],
      }),
    ).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "afterHitSpell",
        fill: "rolledDice",
        holes: ["savingThrowOutcome"],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubject",
        subject: "afterHitSpell",
        fill: "savingThrowOutcome",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    const damage = requireHole(afterSearing.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceProcedureRef: choice.subject.procedureRef,
            damage: {
              expr: { dice: 3, dieSize: 6 },
              damageType: "fire",
            },
          }),
        ],
      }),
    );
    const afterWeaponDamage = resolveBattleSubject({
      state: afterSearing.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [1, 2, 3]]),
      ],
    });
    if (afterWeaponDamage.tag !== "resolved") {
      throw new Error("Expected Searing Smite host attack to resolve.");
    }
    expect(requireCombatant(afterWeaponDamage.state, spellTargetId).hp).toBe(
      Hp(20),
    );

    const damagedTarget = requireCombatant(
      afterWeaponDamage.state,
      spellTargetId,
    );
    const mixedEscapeState = {
      ...afterWeaponDamage.state,
      combatants: new Map(afterWeaponDamage.state.combatants).set(
        spellTargetId,
        {
          ...damagedTarget,
          activeEffects: [
            ...damagedTarget.activeEffects,
            {
              kind: "spellCondition" as const,
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                "unrelated-escapable-condition",
              ),
              sourceCombatantId: spellCasterId,
              effectRef: battleActiveEffectExecutionRefForTest(
                "unrelated-escapable-condition",
              ),
              condition: "restrained" as const,
              conditionHadNonSpellSource: false,
              escape: {
                kind: "abilityCheck" as const,
                ability: "str" as const,
                skill: "athletics" as const,
                allowedActor: "target" as const,
                successEnds: "condition" as const,
              },
              turnStartDamage: null,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(600),
              },
            },
          ],
        },
      ),
    };
    const mixedTurnStart = endTurn({
      state: mixedEscapeState,
      actorId: spellCasterId,
    });
    const mixedDamage = requireResultHole(mixedTurnStart, "rolledDice");
    const mixedSave = requireResultHole(mixedTurnStart, "savingThrowOutcome");
    const mixedResolved = endTurn({
      state: mixedEscapeState,
      actorId: spellCasterId,
      fills: [
        savingThrowOutcomeFill(mixedSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        damageRollFillWithGroups(mixedDamage, [[1, 1, 1]]),
      ],
    });
    if (mixedResolved.tag !== "resolved") {
      throw new Error("Expected mixed Searing Smite turn start to resolve.");
    }
    expect(mixedResolved.routeEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "afterHitSpell",
          fill: "rolledDice",
          holes: [],
        }),
      ]),
    );
    expect(mixedResolved.routeEvents).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "afterHitSpell",
          holes: ["abilityCheck"],
        }),
      ]),
    );

    const awaitingTurnStart = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(awaitingTurnStart, "rolledDice");
    expect(turnStartDamage).toMatchObject({
      spellTurnStartDamage: {
        sourceProcedureRef: choice.subject.procedureRef,
        targetId: spellTargetId,
        trigger: {
          kind: "saveToEnd",
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
        },
        damage: { expr: { dice: 3, dieSize: 6 }, damageType: "fire" },
      },
    });
    const turnStartSave = requireResultHole(
      awaitingTurnStart,
      "savingThrowOutcome",
    );
    expect(turnStartSave).toMatchObject({
      spellTurnStartSave: {
        sourceProcedureRef: choice.subject.procedureRef,
        targetId: spellTargetId,
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
      },
    });

    const targetTurn = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(turnStartDamage, [[2, 3, 4]]),
        savingThrowOutcomeFill(turnStartSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Searing Smite turn-start damage to resolve.");
    }
    expect(requireCombatant(targetTurn.state, spellTargetId).hp).toBe(Hp(11));
    expect(
      requireCombatant(targetTurn.state, spellTargetId).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(false);

    const burnedTarget = requireCombatant(
      afterWeaponDamage.state,
      spellTargetId,
    );
    const oneRoundBurning = {
      ...afterWeaponDamage.state,
      combatants: new Map(afterWeaponDamage.state.combatants).set(
        spellTargetId,
        {
          ...burnedTarget,
          activeEffects: burnedTarget.activeEffects.map((effect) =>
            effect.kind === "spellTurnStartDamageAndSave" &&
            effect.sourceCombatantId === spellCasterId
              ? {
                  ...effect,
                  expiresAt: {
                    kind: "duration" as const,
                    durationTicks: elapsedTimeTicks(1),
                  },
                }
              : effect,
          ),
        },
      ),
    };
    const expiringTurnStart = endTurn({
      state: oneRoundBurning,
      actorId: spellCasterId,
    });
    const expiringDamage = requireResultHole(expiringTurnStart, "rolledDice");
    const expiringSave = requireResultHole(
      expiringTurnStart,
      "savingThrowOutcome",
    );
    const failedSaveTargetTurn = endTurn({
      state: oneRoundBurning,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(expiringDamage, [[1, 1, 1]]),
        savingThrowOutcomeFill(expiringSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (failedSaveTargetTurn.tag !== "resolved") {
      throw new Error("Expected Searing Smite failed save to resolve.");
    }
    expect(
      requireCombatant(
        failedSaveTargetTurn.state,
        spellTargetId,
      ).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(true);

    const durationExpired = endTurn({
      state: failedSaveTargetTurn.state,
      actorId: spellTargetId,
    });
    if (durationExpired.tag !== "resolved") {
      throw new Error("Expected Searing Smite duration tick to resolve.");
    }
    expect(
      requireCombatant(durationExpired.state, spellTargetId).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(false);
  });
  test("ensnaring_strike does not reopen save-failed reactions after decline", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const readiedRay = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: targetTurn.state,
            context: initialState.context,
          }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "saveFailed" },
      },
      fills: [],
    });
    if (readiedRay.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const casterTurn = endTurn({
      state: readiedRay.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }

    const subject = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...initialState, state: casterTurn.state }),
      "Shortbow",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingAttackHit = resolveBattleSubject({
      state: casterTurn.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingAttackHit.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...initialState,
            state: awaitingAttackHit.state,
          }),
          candidate,
          ensnaringStrikeUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSaveFailedReaction = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    expect(awaitingSaveFailedReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    if (awaitingSaveFailedReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike save-failed reaction.");
    }

    const afterDecline = resolveBattleInterrupt({
      state: awaitingSaveFailedReaction.state,
      fill: interruptDecisionFill(
        awaitingSaveFailedReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: spellTargetId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingInterrupt: null },
    });
  });
  test("ensnaring_strike opens a post-cast Ready spell-cast reaction before attack damage", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const readiedRay = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: targetTurn.state,
            context: initialState.context,
          }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    if (readiedRay.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const casterTurn = endTurn({
      state: readiedRay.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }

    const subject = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...initialState, state: casterTurn.state }),
      "Shortbow",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingAttackHit = resolveBattleSubject({
      state: casterTurn.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingAttackHit.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...initialState,
            state: awaitingAttackHit.state,
          }),
          candidate,
          ensnaringStrikeUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSpellCastReaction = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    expect(awaitingSpellCastReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "spellCast",
          choices: [
            expect.objectContaining({
              kind: "nestedProcedure",
              subject: expect.objectContaining({
                command: "releaseReadiedSpell",
                readiedSpellCasterId: spellTargetId,
              }),
            }),
          ],
        },
      },
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike post-cast Ready window.");
    }
    const afterDecline = resolveBattleInterrupt({
      state: awaitingSpellCastReaction.state,
      fill: interruptDecisionFill(
        awaitingSpellCastReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: spellTargetId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingInterrupt: null },
    });
  });
  test("engine spell events do not guess whether a table-authored Ready trigger occurred", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      extraTargetIds: [ensnaringStrikeHelperId],
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const readiedSaveFailed = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: targetTurn.state,
            context: initialState.context,
          }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "saveFailed" },
      },
      fills: [],
    });
    if (readiedSaveFailed.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const helperTurn = endTurn({
      state: readiedSaveFailed.state,
      actorId: spellTargetId,
    });
    if (helperTurn.tag !== "resolved") {
      throw new Error("Expected helper turn to begin.");
    }
    const readySubject = {
      tag: "action" as const,
      actorId: ensnaringStrikeHelperId,
      action: "ready" as const,
    };
    const readyDeclaration = resolveBattleSubject({
      state: helperTurn.state,
      subject: readySubject,
      fills: [],
    });
    if (readyDeclaration.tag !== "needsHoles") {
      throw new Error("Expected helper Ready declaration hole.");
    }
    const readiedSpellCast = resolveBattleSubject({
      state: helperTurn.state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          readyDeclaration.holes[0]!,
          "a spell is cast",
          { kind: "movement" },
        ),
      ],
    });
    if (readiedSpellCast.tag !== "resolved") {
      throw new Error("Expected helper to ready movement.");
    }
    const casterTurn = endTurn({
      state: readiedSpellCast.state,
      actorId: ensnaringStrikeHelperId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }

    const subject = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...initialState, state: casterTurn.state }),
      "Shortbow",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingAttackHit = resolveBattleSubject({
      state: casterTurn.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingAttackHit.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        afterHitChoiceMatchesSpell(
          battleRuntimeSessionForTest({
            ...initialState,
            state: awaitingAttackHit.state,
          }),
          candidate,
          ensnaringStrikeUnitId,
        ),
    );
    if (
      choice === undefined ||
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSaveFailedReaction = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    if (awaitingSaveFailedReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike save-failed reaction.");
    }
    const afterSaveFailedDecline = resolveBattleInterrupt({
      state: awaitingSaveFailedReaction.state,
      fill: interruptDecisionFill(
        awaitingSaveFailedReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: spellTargetId },
      ),
    });
    expect(afterSaveFailedDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingInterrupt: null,
        readiedResponses: {
          actionsOrMovements: [
            expect.objectContaining({ actorId: ensnaringStrikeHelperId }),
          ],
        },
      },
    });
  });
});
