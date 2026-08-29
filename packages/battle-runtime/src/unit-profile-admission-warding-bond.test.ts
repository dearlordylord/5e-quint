import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-WARDING-BOND-LINKED-EFFECT-RUNTIME warding_bond
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  requireCharacterUnitProcedureRefForTest,
  unitLibrary,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { damageAmount, DieRollResult, Hp } from "@dnd/shared/types";
import {
  damageLifecycleConcentrationSavingThrowHoles,
  linkedDefenseResistanceDamageShareConcentrationSavingThrowHoles,
} from "./battle-reducer/damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  attackExecutionSelectionForSubjectForTest,
  characterBonusAttackSubjectForTest,
  characterAttackSubjectForTest,
  concentrationSavingThrowFill,
} from "./battle-runtime.test-support.ts";
import { type BattleInterruptedProcedure } from "./battle-state-execution.ts";
import { resumeInterruptedProcedure } from "./battle-reducer/interrupt-continuation.ts";
import { ATTACK_RESOLVERS } from "./battle-reducer/attack-main.ts";
import { attackDamageInterruptionFrame } from "./battle-reducer/attack-damage-events.ts";
import {
  burningHandsUnitId,
  flameStrikeUnitId,
  saveGatedConditionWithRepeatDurationTicks,
  saveGatedConditionWithRepeatUnitId,
  iceKnifeUnitId,
  magicMissileUnitId,
  searingSmiteUnitId,
  spellCasterId,
  spellTargetId,
  linkedDefenseResistanceDamageShareUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  attackDamageDispositionFill,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  sameClubMainAndOffHandLoadout,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  linkedDefenseResistanceDamageShareSpellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { spellActiveEffectExecutionRef } from "./effect-execution-ref.ts";
import {
  applyBattleHitPointDamage,
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantId,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleRuntimeSession,
  BattleState,
  BattleSubject,
  CombatantId,
} from "./unit-profile-admission.test-support.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";

describe("L12G-FOLLOWUP-WARDING-BOND-LINKED-EFFECT-RUNTIME deterministic Warding Bond admission", () => {
  test("casts as a level-2 Magic Action spell with willing target, worn rings, and connection facts", () => {
    const state = linkedDefenseResistanceDamageShareBattle();
    const act = spellAct({
      session: state,
      spellId: linkedDefenseResistanceDamageShareUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          linkedDefenseResistanceDamageShareUnitId,
          2,
          "linkedDefenseResistanceDamageShare",
        ),
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toContain(spellTargetId);
    expect(targetHole.choices).not.toContain(spellCasterId);

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          knownWillingSpellTargetFill(
            targetHole,
            linkedDefenseResistanceDamageShareUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          linkedDefenseResistanceDamageShareSpellTargetFillWithoutWilling(
            targetHole,
            linkedDefenseResistanceDamageShareUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        linkedDefenseResistanceDamageShareSpellTargetFill(
          targetHole,
          linkedDefenseResistanceDamageShareUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: false,
          }),
          expect.objectContaining({
            combatantId: spellTargetId,
            armorClass: 11,
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Warding Bond to resolve.");
    }
    expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([
      { kind: "committed", combatantId: spellCasterId },
    ]);
    expect(
      linkedDefenseResistanceDamageShareEffects(resolved.state, spellTargetId),
    ).toEqual([
      expect.objectContaining({
        kind: "linkedDefenseResistanceDamageShare",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
    expect(savingThrowFlatBonusProjections(resolved.state, "wis")).toEqual([
      {
        targetId: spellTargetId,
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        bonus: 1,
      },
    ]);
  });

  test("does not discover unusable Ready actions", () => {
    const state = linkedDefenseResistanceDamageShareBattle();
    const readyActs = discoverBattleActs(state).flatMap((act) => {
      if (
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId ===
          linkedDefenseResistanceDamageShareUnitId &&
        battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(act)?.invocation.procedure ===
          "linkedDefenseResistanceDamageShare" &&
        act.subject.mode.tag === "ready"
      ) {
        return [
          {
            trigger: act.subject.mode.trigger,
            initialHoles: act.initialHoles,
          },
        ];
      }
      return [];
    });

    expect(readyActs).toEqual([]);
  });

  test("grants all-damage Resistance and shares the final target damage amount to the caster", () => {
    const state = castWardingBond(linkedDefenseResistanceDamageShareBattle());
    const target = requireCombatant(state, spellTargetId);

    expect(damageAmountAfterTargetAdjustments(state, target, 9, "fire")).toBe(
      4,
    );

    const damaged = applyBattleHitPointDamage({
      state,
      target,
      damageAmount: 4,
      deathFailuresAtZeroHp: 1,
    });

    expect(requireCombatant(damaged, spellTargetId).hp).toBe(8);
    expect(requireCombatant(damaged, spellCasterId).hp).toBe(8);
  });

  test("projects the Warding Bond Saving Throw bonus onto target Concentration saves", () => {
    const state = withTargetConcentration(
      castWardingBond(linkedDefenseResistanceDamageShareBattle()),
    );
    const target = requireCombatant(state, spellTargetId);
    const [effect] = linkedDefenseResistanceDamageShareEffects(
      state,
      spellTargetId,
    );
    if (effect === undefined) {
      throw new Error("Expected Warding Bond effect.");
    }

    expect(
      damageLifecycleConcentrationSavingThrowHoles({
        state,
        target,
        damageAmount: 4,
      }),
    ).toEqual([
      expect.objectContaining({
        combatantId: spellTargetId,
        targetFlatBonuses: expect.arrayContaining([
          {
            targetId: spellTargetId,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: effect.sourceProcedureRef,
            bonus: 1,
          },
        ]),
      }),
    ]);
  });

  test("routes shared caster damage through Concentration damage saves", () => {
    const state = withCasterConcentration(
      castWardingBond(linkedDefenseResistanceDamageShareBattle()),
    );
    const target = requireCombatant(state, spellTargetId);
    const casterConcentrationHoles =
      linkedDefenseResistanceDamageShareConcentrationSavingThrowHoles({
        state,
        target,
        damageAmount: 4,
      });
    expect(casterConcentrationHoles).toEqual([
      expect.objectContaining({ combatantId: spellCasterId }),
    ]);
    const failedConcentrationSave = concentrationSavingThrowFill(
      casterConcentrationHoles[0]!,
      false,
    );
    if (failedConcentrationSave.kind !== "concentrationSavingThrow") {
      throw new Error("Expected a Concentration Saving Throw fill.");
    }

    const damaged = applyBattleHitPointDamage({
      state,
      target,
      damageAmount: 4,
      deathFailuresAtZeroHp: 1,
      linkedDefenseResistanceDamageShareConcentrationSavingThrows: [
        failedConcentrationSave,
      ],
    });

    const caster = requireCombatant(damaged, spellCasterId);
    expect(caster.hp).toBe(8);
    expect(caster.concentration).toBeNull();
  });

  test("attack damage continuation carries direct and linked-caster Concentration fills", () => {
    const session = linkedDefenseResistanceDamageShareBattle();
    const state = withTargetConcentration(
      withCasterConcentration(castWardingBond(session)),
    );
    const subject = characterAttackSubjectForTest(
      state,
      spellCasterId,
      "Unarmed Strike",
    );
    const continuation = attackDamageInterruptionFrame({
      participant: subject,
      targetId: spellTargetId,
      targetSpatialFacts: [],
      attackResult: { total: 15, naturalD20: DieRollResult(10) },
      damageInput: {
        kind: "rolledDamage",
        damageRollByType: [
          { damageType: "bludgeoning", amount: damageAmount(8) },
        ],
      },
      critical: false,
      continuation: {
        kind: "damageOnly",
        concentrationSavingThrows: [],
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      },
    }) satisfies Extract<
      BattleInterruptedProcedure,
      { readonly kind: "attackDamage" }
    >;

    const needsTargetSave = resumeInterruptedProcedure(
      state,
      continuation,
      "attackDamage",
      ATTACK_RESOLVERS,
    );
    expect(needsTargetSave).toMatchObject({ tag: "needsHoles" });
    if (needsTargetSave.tag !== "needsHoles") {
      throw new Error("Expected target Concentration save request.");
    }
    const targetSave = requireResultHole(
      needsTargetSave,
      "concentrationSavingThrow",
    );
    expect(targetSave).toMatchObject({
      combatantId: spellTargetId,
      damageAmount: 4,
    });

    const targetSaveFill = concentrationSavingThrowFill(targetSave, true);
    const needsCasterSave = resolveBattleSubject({
      state: needsTargetSave.state,
      subject,
      fills: [targetSaveFill],
    });
    expect(needsCasterSave).toMatchObject({ tag: "needsHoles" });
    if (needsCasterSave.tag !== "needsHoles") {
      throw new Error("Expected linked caster Concentration save request.");
    }
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 4,
    });

    const resolved = resolveBattleSubject({
      state: needsCasterSave.state,
      subject,
      fills: [targetSaveFill, concentrationSavingThrowFill(casterSave, false)],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected attack damage continuation to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(8);
    expect(
      requireCombatant(resolved.state, spellTargetId).concentration,
    ).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(8);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("offhand attack damage requests the linked caster Concentration save", () => {
    const session = linkedDefenseResistanceDamageShareClubBattle();
    const state = withCasterConcentration(
      advanceRound(castWardingBond(session), [spellCasterId, spellTargetId]),
    );
    const attackSubject: BattleSubject = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...session, state }),
      "Club",
    );
    const attackTarget = requireResultHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackTargetFill = attackTargetFillForClub(attackTarget);
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [attackTargetFill],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        attackTargetFill,
        attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    expect(afterQualifyingAttack).toMatchObject({ tag: "resolved" });
    if (afterQualifyingAttack.tag !== "resolved") {
      throw new Error("Expected qualifying Club attack to resolve.");
    }

    const offHandSubject: BattleSubject = characterBonusAttackSubjectForTest(
      afterQualifyingAttack.state,
      spellCasterId,
      "offHandAttack",
    );
    const offHandTarget = requireResultHole(
      resolveBattleSubject({
        state: afterQualifyingAttack.state,
        subject: offHandSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const offHandTargetFill = attackTargetFillForClub(offHandTarget);
    const offHandRoll = requireResultHole(
      resolveBattleSubject({
        state: afterQualifyingAttack.state,
        subject: offHandSubject,
        fills: [offHandTargetFill],
      }),
      "attackRoll",
    );
    const offHandRollFill = attackRollFill(offHandRoll, {
      total: 18,
      naturalD20: 12,
    });
    const offHandDamage = requireResultHole(
      resolveBattleSubject({
        state: afterQualifyingAttack.state,
        subject: offHandSubject,
        fills: [offHandTargetFill, offHandRollFill],
      }),
      "rolledDice",
    );
    const offHandDamageFill = damageRollFillWithGroups(offHandDamage, [[4]]);
    const needsCasterSave = resolveBattleSubject({
      state: afterQualifyingAttack.state,
      subject: offHandSubject,
      fills: [offHandTargetFill, offHandRollFill, offHandDamageFill],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({ combatantId: spellCasterId });

    const resolved = resolveBattleSubject({
      state: afterQualifyingAttack.state,
      subject: offHandSubject,
      fills: [
        offHandTargetFill,
        offHandRollFill,
        offHandDamageFill,
        concentrationSavingThrowFill(casterSave, false),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected offhand Warding Bond damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(10);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("Opportunity Attack damage requests the linked caster Concentration save", () => {
    const session = linkedDefenseResistanceDamageShareClubBattle();
    const state = withCasterConcentration(
      advanceRound(castWardingBond(session), [spellCasterId, spellTargetId]),
    );
    const clubAttack = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...session, state }),
      "Club",
    );
    const subject: Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    > = {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "opportunityAttack",
      reactorId: spellCasterId,
      targetId: spellTargetId,
      distanceFeet: movementFeet(5),
      ...attackExecutionSelectionForSubjectForTest(clubAttack),
    };
    const attackRoll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "attackRoll",
    );
    const attackRollResult = attackRollFill(attackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [attackRollResult],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const needsCasterSave = resolveBattleSubject({
      state,
      subject,
      fills: [attackRollResult, damageFill],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({ combatantId: spellCasterId });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackRollResult,
        damageFill,
        concentrationSavingThrowFill(casterSave, false),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected Opportunity Attack Warding Bond damage to resolve.",
      );
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(10);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("repeated allocation spell damage requests the linked caster Concentration save", () => {
    const session = damageSpellTurnSession(magicMissileUnitId, [
      { spellLevel: 2, count: 1 },
      { spellLevel: 1, count: 1 },
    ]);
    const state = withCasterConcentration(session.state);
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...session, state }),
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      [{ targetId: spellTargetId, count: 3 }],
      act.subject.procedureRef,
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [allocationFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[1, 1, 1]]);
    const needsCasterSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill, damageFill],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageFill,
        concentrationSavingThrowFill(casterSave, false),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile Warding Bond damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(9);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("repeated allocation spell damage asks for a zero-hit-point disposition", () => {
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const baseSession = spellBattle({
      preparedSpells: [
        spellRecord(linkedDefenseResistanceDamageShareUnitId),
        spellRecord(magicMissileUnitId),
      ],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 1, count: 1 },
      ],
      targetHp: 3,
      targetMaxHp: 12,
      targetResources: [{ unit: relentlessEndurance }],
      targetUnitRefs: [
        {
          unit: relentlessEndurance,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const state = advanceRound(castWardingBond(baseSession), [
      spellCasterId,
      spellTargetId,
    ]);
    const actionSession = battleRuntimeSessionForTest({
      ...baseSession,
      state,
    });
    const act = spellAct({
      session: actionSession,
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      [{ targetId: spellTargetId, count: 3 }],
      act.subject.procedureRef,
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [allocationFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[1, 1, 1]]);
    const awaitingDisposition = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill, damageFill],
    });
    const disposition = requireResultHole(
      awaitingDisposition,
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      targetId: spellTargetId,
      choices: expect.arrayContaining([
        expect.objectContaining({ kind: "zeroHitPointReplacement" }),
      ]),
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageFill,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          procedureRef: requireCharacterUnitProcedureRefForTest(
            actionSession,
            spellTargetId,
            "orc_relentless_endurance",
          ),
        }),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile zero-hit-point resolution.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(1));
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(Hp(9));
  });

  test("repeated allocation spell damage requests a Hideous Laughter repeat save", () => {
    const session = damageSpellTurnSession(magicMissileUnitId, [
      { spellLevel: 2, count: 1 },
      { spellLevel: 1, count: 1 },
    ]);
    const state = withHideousLaughterOnTarget(session.state);
    const actionSession = battleRuntimeSessionForTest({ ...session, state });
    const act = spellAct({
      session: actionSession,
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      [{ targetId: spellTargetId, count: 3 }],
      act.subject.procedureRef,
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [allocationFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[1, 1, 1]]);
    const awaitingRepeatSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill, damageFill],
    });
    const concentrationSave = requireResultHole(
      awaitingRepeatSave,
      "concentrationSavingThrow",
    );
    expect(concentrationSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });
    const awaitingLaughterSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageFill,
        concentrationSavingThrowFill(concentrationSave, true),
      ],
    });
    const repeatSave = requireResultHole(
      awaitingLaughterSave,
      "savingThrowOutcome",
    );
    expect(repeatSave).toMatchObject({
      saveGatedConditionWithRepeatDamageRepeatSave: {
        targetId: spellTargetId,
        trigger: "damage",
      },
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageFill,
        concentrationSavingThrowFill(concentrationSave, true),
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile repeat-save resolution.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });

  test("save-gated spell damage requests the linked caster Concentration save", () => {
    const session = damageSpellTurnSession(burningHandsUnitId, [
      { spellLevel: 2, count: 1 },
      { spellLevel: 1, count: 1 },
    ]);
    const state = withCasterConcentration(session.state);
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...session, state }),
      spellId: burningHandsUnitId,
      slotLevel: 1,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[2, 2, 2]]);
    const needsCasterSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageFill],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        saveFill,
        damageFill,
        concentrationSavingThrowFill(casterSave, false),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Burning Hands Warding Bond damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(9);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("multi-target save damage preserves an earlier Warding Bond share on a later direct target", () => {
    const session = damageSpellTurnSession(flameStrikeUnitId, [
      { spellLevel: 5, count: 1 },
      { spellLevel: 2, count: 1 },
    ]);
    const act = spellAct({
      session,
      spellId: flameStrikeUnitId,
      slotLevel: 5,
    });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: spellCasterId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damage, [
          [1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1],
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected multi-target Flame Strike damage to resolve: ${JSON.stringify(resolved)}`,
      );
    }
    expect(resolved).toMatchObject({ tag: "resolved" });
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(8);
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(0);
  });

  test("attack-burst spell damage requests the linked caster Concentration save", () => {
    const session = damageSpellTurnSession(iceKnifeUnitId, [
      { spellLevel: 2, count: 1 },
      { spellLevel: 1, count: 1 },
    ]);
    const state = withCasterConcentration(session.state);
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...session, state }),
      spellId: iceKnifeUnitId,
      slotLevel: 1,
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
    const attackRollResult = attackRollFill(attackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const attackDamage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, attackRollResult],
      }),
      "rolledDice",
    );
    const attackDamageFill = damageRollFillWithGroups(attackDamage, [[4]]);
    const burstSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, attackRollResult, attackDamageFill],
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
        fills: [targetFill, attackRollResult, attackDamageFill, burstSaveFill],
      }),
      "rolledDice",
    );
    const burstDamageFill = damageRollFillWithGroups(burstDamage, [[2, 2]]);
    const needsCasterSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollResult,
        attackDamageFill,
        burstSaveFill,
        burstDamageFill,
      ],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 4,
    });
  });

  test("turn-start spell damage requests the linked caster Concentration save", () => {
    const state = withCasterConcentration(
      withTurnStartDamageOnTarget(
        castWardingBond(linkedDefenseResistanceDamageShareBattle()),
      ),
    );
    const awaitingTurnStart = endTurn({
      state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(awaitingTurnStart, "rolledDice");
    const damageFill = damageRollFillWithGroups(turnStartDamage, [[2, 2, 2]]);
    const awaitingTurnStartSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [damageFill],
    });
    const casterSave = requireResultHole(
      awaitingTurnStartSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });
    expect(awaitingTurnStartSave.routeEvents).toEqual(
      expect.arrayContaining([
        {
          kind: "resolveBattleSubject",
          subject: "concentrationTeardown",
          fill: "rolledDice",
          holes: ["concentrationSavingThrow"],
          owner: "battleConcentration",
        },
      ]),
    );
    const concentrationFill = concentrationSavingThrowFill(casterSave, false);
    const needsTurnStartSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [damageFill, concentrationFill],
    });
    const turnStartSave = requireResultHole(
      needsTurnStartSave,
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(turnStartSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);

    const resolved = endTurn({
      state,
      actorId: spellCasterId,
      fills: [damageFill, saveFill, concentrationFill],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected turn-start Warding Bond damage to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(9);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("turn-start shared caster damage requests the caster Hideous Laughter repeat save", () => {
    const state = withHideousLaughterOnCaster(
      withTurnStartDamageOnTarget(
        castWardingBond(linkedDefenseResistanceDamageShareBattle()),
      ),
    );
    const awaitingTurnStart = endTurn({
      state,
      actorId: spellCasterId,
    });
    if (awaitingTurnStart.tag !== "needsHoles") {
      throw new Error("Expected turn-start damage and save holes.");
    }
    const endTurnRepeatSave = awaitingTurnStart.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "saveGatedConditionWithRepeatDamageRepeatSave" in hole &&
        hole.saveGatedConditionWithRepeatDamageRepeatSave.targetId ===
          spellCasterId &&
        hole.saveGatedConditionWithRepeatDamageRepeatSave.trigger === "endTurn",
    );
    if (endTurnRepeatSave === undefined) {
      throw new Error("Expected Hideous Laughter end-turn save.");
    }
    const endTurnRepeatSaveFill = savingThrowOutcomeFill(endTurnRepeatSave, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const awaitingTurnStartDamage = endTurn({
      state,
      actorId: spellCasterId,
      fills: [endTurnRepeatSaveFill],
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStartDamage,
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(turnStartDamage, [[2, 2, 2]]);
    const awaitingTurnStartSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [endTurnRepeatSaveFill, damageFill],
    });
    const targetConcentrationSave = requireResultHole(
      awaitingTurnStartSave,
      "concentrationSavingThrow",
    );
    expect(targetConcentrationSave).toMatchObject({
      combatantId: spellTargetId,
      damageAmount: 3,
    });
    const targetConcentrationFill = concentrationSavingThrowFill(
      targetConcentrationSave,
      true,
    );
    const needsRepeatSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [endTurnRepeatSaveFill, damageFill, targetConcentrationFill],
    });
    if (needsRepeatSave.tag !== "needsHoles") {
      throw new Error("Expected shared damage Hideous Laughter repeat save.");
    }
    const repeatSave = needsRepeatSave.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "saveGatedConditionWithRepeatDamageRepeatSave" in hole &&
        hole.saveGatedConditionWithRepeatDamageRepeatSave.targetId ===
          spellCasterId,
    );
    if (repeatSave === undefined) {
      throw new Error("Expected caster Hideous Laughter damage repeat save.");
    }
    expect(repeatSave).toMatchObject({
      saveGatedConditionWithRepeatDamageRepeatSave: {
        targetId: spellCasterId,
        sourceProcedureRef: expect.any(String),
        trigger: "damage",
      },
      targetRollModes: [{ targetId: spellCasterId, rollMode: "advantage" }],
    });

    const repeatSaveFill = savingThrowOutcomeFill(repeatSave, [
      { targetId: spellCasterId, succeeded: true },
    ]);
    const needsTurnStartSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [
        endTurnRepeatSaveFill,
        damageFill,
        targetConcentrationFill,
        repeatSaveFill,
      ],
    });
    const turnStartSave = requireResultHole(
      needsTurnStartSave,
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(turnStartSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const resolved = endTurn({
      state,
      actorId: spellCasterId,
      fills: [
        endTurnRepeatSaveFill,
        damageFill,
        targetConcentrationFill,
        repeatSaveFill,
        saveFill,
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected turn-start Warding Bond Hideous Laughter save to resolve.",
      );
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });

  test("cleans up on separation, caster 0 Hit Points, recast, and duration expiry", () => {
    const separated = separateWardingBond(
      castWardingBond(linkedDefenseResistanceDamageShareBattle()),
    );
    expect(
      linkedDefenseResistanceDamageShareEffects(separated, spellTargetId),
    ).toEqual([]);

    const casterZeroState = castWardingBond(
      linkedDefenseResistanceDamageShareBattle(),
    );
    const casterZero = applyBattleHitPointDamage({
      state: casterZeroState,
      target: requireCombatant(casterZeroState, spellCasterId),
      damageAmount: 12,
      deathFailuresAtZeroHp: 1,
    });
    expect(
      linkedDefenseResistanceDamageShareEffects(casterZero, spellTargetId),
    ).toEqual([]);

    const secondTargetId = combatantId("unit-profile-warding-bond-target-2");
    const recastInitial = linkedDefenseResistanceDamageShareBattle({
      spellSlotCount: 2,
      extraTargetIds: [secondTargetId],
    });
    const firstCast = castWardingBond(recastInitial, spellTargetId);
    const nextCasterTurn = advanceRound(firstCast, [
      spellCasterId,
      spellTargetId,
      secondTargetId,
    ]);
    const recast = castWardingBond(
      battleRuntimeSessionForTest({ ...recastInitial, state: nextCasterTurn }),
      secondTargetId,
    );
    expect(
      linkedDefenseResistanceDamageShareEffects(recast, spellTargetId),
    ).toEqual([]);
    expect(
      linkedDefenseResistanceDamageShareEffects(recast, secondTargetId),
    ).toHaveLength(1);

    const durationInitial = withWardingBondDuration(
      castWardingBond(linkedDefenseResistanceDamageShareBattle()),
      spellTargetId,
      1,
    );
    const expired = advanceRound(durationInitial, [
      spellCasterId,
      spellTargetId,
    ]);
    expect(
      linkedDefenseResistanceDamageShareEffects(expired, spellTargetId),
    ).toEqual([]);
  });

  test("Warding Bond creation preserves an unrelated target protection", () => {
    const session = linkedDefenseResistanceDamageShareBattle();
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-warding-bond-unrelated",
    );
    const state = battleStateWithAllocatedEffectForTest({
      state: session.state,
      ownerId: spellTargetId,
      effect: {
        kind: "damageResistance" as const,
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellCasterId,
        damageType: "cold" as const,
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });
    const cast = castWardingBond(
      battleRuntimeSessionForTest({ ...session, state }),
    );
    const effects = requireCombatant(cast, spellTargetId).activeEffects;
    expect(effects).toHaveLength(2);
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "damageResistance",
          sourceProcedureRef: unrelatedSource,
          damageType: "cold",
        }),
        expect.objectContaining({ kind: "linkedDefenseResistanceDamageShare" }),
      ]),
    );
  });
});

function linkedDefenseResistanceDamageShareBattle(
  input: {
    readonly spellSlotCount?: number;
    readonly spellSlots?: Parameters<typeof spellBattle>[0]["spellSlots"];
    readonly additionalPreparedSpells?: Parameters<
      typeof spellBattle
    >[0]["preparedSpells"];
    readonly extraTargetIds?: readonly CombatantId[];
    readonly casterAttack?: Parameters<typeof spellBattle>[0]["attack"];
    readonly casterOffHandAttack?: Parameters<
      typeof spellBattle
    >[0]["offHandAttack"];
    readonly casterSelectedLoadout?: Parameters<
      typeof spellBattle
    >[0]["selectedLoadout"];
  } = {},
): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [
      spellRecord(linkedDefenseResistanceDamageShareUnitId),
      ...(input.additionalPreparedSpells ?? []),
    ],
    spellSlots: input.spellSlots ?? [
      { spellLevel: 2, count: input.spellSlotCount ?? 1 },
    ],
    targetHp: 12,
    targetMaxHp: 12,
    ...(input.casterAttack === undefined ? {} : { attack: input.casterAttack }),
    ...(input.casterOffHandAttack === undefined
      ? {}
      : { offHandAttack: input.casterOffHandAttack }),
    ...(input.casterSelectedLoadout === undefined
      ? {}
      : { selectedLoadout: input.casterSelectedLoadout }),
    ...(input.extraTargetIds === undefined
      ? {}
      : { extraTargetIds: input.extraTargetIds }),
  });
}

function damageSpellTurnSession(
  damageSpellId: string,
  spellSlots: NonNullable<Parameters<typeof spellBattle>[0]["spellSlots"]>,
): BattleRuntimeSession {
  const session = linkedDefenseResistanceDamageShareBattle({
    additionalPreparedSpells: [spellRecord(damageSpellId)],
    spellSlots,
  });
  const state = advanceRound(castWardingBond(session), [
    spellCasterId,
    spellTargetId,
  ]);
  return battleRuntimeSessionForTest({ ...session, state });
}

function linkedDefenseResistanceDamageShareClubBattle(): BattleRuntimeSession {
  const club = zeroAbilityWeaponAttack("weapon_club");
  return linkedDefenseResistanceDamageShareBattle({
    casterAttack: club,
    casterOffHandAttack: club,
    casterSelectedLoadout: sameClubMainAndOffHandLoadout(),
  });
}

function attackTargetFillForClub(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return attackTargetFill(hole, spellCasterId, spellTargetId);
}

function linkedDefenseResistanceDamageShareSpellTargetFillWithoutWilling(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = spellTargetFill(hole, spellId, casterId, targetId);
  const sourceProcedureRef =
    hole.spellTargetSpatialFactRequest?.sourceProcedureRef ?? hole.procedureRef;
  if (sourceProcedureRef === undefined) {
    throw new Error("Expected spell target hole procedure reference.");
  }
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "linkedEffectPairedWornComponents",
        casterId,
        targetId,
        sourceProcedureRef,
      },
      {
        kind: "linkedEffectCreaturesDistance",
        casterId,
        targetId,
        sourceProcedureRef,
        distanceFeet: movementFeet(60),
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
  sourceProcedureRef: BattleProcedureExecutionRef,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId: spellCasterId,
      targetId: allocation.targetId,
      sourceProcedureRef,
    })),
  };
}

function castWardingBond(
  session: BattleRuntimeSession,
  targetId: CombatantId = spellTargetId,
): BattleState {
  const act = spellAct({
    session,
    spellId: linkedDefenseResistanceDamageShareUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      linkedDefenseResistanceDamageShareSpellTargetFill(
        targetHole,
        linkedDefenseResistanceDamageShareUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Warding Bond cast to resolve.");
  }
  return resolved.state;
}

function withCasterConcentration(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(spellId(linkedDefenseResistanceDamageShareUnitId)),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
}

function withTargetConcentration(state: BattleState): BattleState {
  const target = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(spellId(linkedDefenseResistanceDamageShareUnitId)),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
}

function withTurnStartDamageOnTarget(state: BattleState): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: spellTargetId,
    effect: {
      kind: "spellTurnStartDamageAndSave" as const,
      source: "afterHitTimedDamageAndSave" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(searingSmiteUnitId),
      ),
      sourceCombatantId: spellCasterId,
      damage: {
        expr: { dice: 3, dieSize: 6 },
        damageType: "fire",
      },
      save: {
        ability: "con" as const,
        dc: { kind: "caster_spell_save_dc" as const },
        successEnds: "spell" as const,
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(60),
      },
    },
  });
}

function withHideousLaughterOnTarget(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const target = requireCombatant(state, spellTargetId);
  const prepared = {
    ...state,
    combatants: new Map(state.combatants)
      .set(spellCasterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(saveGatedConditionWithRepeatUnitId),
          ),
          effectKind: "spellEffect",
        },
      })
      .set(spellTargetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(
            applyCondition(target.conditions, "prone"),
            "incapacitated",
          ),
        ),
      }),
  };
  return battleStateWithAllocatedEffectForTest({
    state: prepared,
    ownerId: spellTargetId,
    effect: {
      kind: "saveGatedConditionWithRepeat" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(saveGatedConditionWithRepeatUnitId),
      ),
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellCasterId,
        durationTicks: saveGatedConditionWithRepeatDurationTicks,
      },
    },
  });
}

function withHideousLaughterOnCaster(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const target = requireCombatant(state, spellTargetId);
  const prepared = {
    ...state,
    combatants: new Map(state.combatants)
      .set(spellCasterId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          caster,
          applyCondition(
            applyCondition(caster.conditions, "prone"),
            "incapacitated",
          ),
        ),
      })
      .set(spellTargetId, {
        ...target,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(saveGatedConditionWithRepeatUnitId),
          ),
          effectKind: "spellEffect",
        },
      }),
  };
  return battleStateWithAllocatedEffectForTest({
    state: prepared,
    ownerId: spellCasterId,
    effect: {
      kind: "saveGatedConditionWithRepeat" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(saveGatedConditionWithRepeatUnitId),
      ),
      sourceCombatantId: spellTargetId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellTargetId,
        durationTicks: saveGatedConditionWithRepeatDurationTicks,
      },
    },
  });
}

function separateWardingBond(state: BattleState): BattleState {
  const subject = linkedEffectSeparationSubject(state, spellTargetId);
  const hole = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetSpatialFacts",
  );
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [linkedEffectSeparationFactsFill(hole, spellTargetId)],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Warding Bond separation to resolve.");
  }
  expect(
    resolveBattleSubject({
      state: resolved.state,
      subject,
      fills: [linkedEffectSeparationFactsFill(hole, spellTargetId)],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
    message: "Warding Bond is no longer active for this connected target.",
  });
  return resolved.state;
}

function linkedEffectSeparationSubject(
  state: BattleState,
  targetId: CombatantId,
): BattleSubject {
  const effect = state.combatants
    .get(targetId)
    ?.activeEffects.find(
      (candidate) => candidate.kind === "linkedDefenseResistanceDamageShare",
    );
  if (effect === undefined) {
    throw new Error("Expected Warding Bond effect for separation.");
  }
  return {
    tag: "runtimeCommand",
    actorId: spellCasterId,
    command: "linkedDefenseResistanceDamageShareSeparation",
    effectRef: spellActiveEffectExecutionRef(effect),
    targetId,
  };
}

function linkedEffectSeparationFactsFill(
  hole: Extract<BattleHole, { readonly kind: "targetSpatialFacts" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  if (
    !("linkedEffectSeparation" in hole) ||
    hole.linkedEffectSeparation.sourceProcedureRef === undefined
  ) {
    throw new Error("Expected Warding Bond separation facts hole.");
  }
  return {
    kind: "targetSpatialFacts",
    holeId: hole.holeId,
    spatialFacts: [
      {
        kind: "linkedEffectCreaturesDistance",
        casterId: spellCasterId,
        targetId,
        sourceProcedureRef: hole.linkedEffectSeparation.sourceProcedureRef,
        distanceFeet: movementFeet(61),
      },
    ],
  };
}

function withWardingBondDuration(
  state: BattleState,
  targetId: CombatantId,
  durationTicks: number,
): BattleState {
  const target = requireCombatant(state, targetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "linkedDefenseResistanceDamageShare"
          ? {
              ...effect,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(durationTicks),
              },
            }
          : effect,
      ),
    }),
  };
}

function advanceRound(
  state: BattleState,
  actorIds: readonly CombatantId[],
): BattleState {
  return actorIds.reduce((current, actorId) => {
    const result = endTurn({ state: current, actorId });
    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") {
      throw new Error(`Expected ${actorId} end turn to resolve.`);
    }
    return result.state;
  }, state);
}

function linkedDefenseResistanceDamageShareEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<
  BattleActiveEffect,
  { readonly kind: "linkedDefenseResistanceDamageShare" }
>[] {
  return requireCombatant(state, combatantId).activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "linkedDefenseResistanceDamageShare" }
    > => effect.kind === "linkedDefenseResistanceDamageShare",
  );
}
