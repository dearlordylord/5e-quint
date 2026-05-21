// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-WARDING-BOND-LINKED-EFFECT-RUNTIME warding_bond
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import { describe, expect, test } from "vitest";
import {
  damageLifecycleConcentrationSavingThrowHoles,
  wardingBondSharedDamageConcentrationSavingThrowHoles,
} from "./battle-reducer/damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import { concentrationSavingThrowFill } from "./battle-runtime-test-support.ts";
import {
  resumeInterruptedProcedure,
  type BattleInterruptedProcedure,
} from "./battle-reducer.ts";
import {
  burningHandsUnitId,
  hideousLaughterDurationTicks,
  hideousLaughterUnitId,
  iceKnifeUnitId,
  magicMissileUnitId,
  searingSmiteUnitId,
  spellCasterId,
  spellTargetId,
  wardingBondUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  withSameClubMainAndOffHand,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  wardingBondSpellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyBattleHitPointDamage,
  combatantId,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleState,
  BattleSubject,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";

describe("L12G-FOLLOWUP-WARDING-BOND-LINKED-EFFECT-RUNTIME deterministic Warding Bond admission", () => {
  test("casts as a level-2 Magic Action spell with willing target, worn rings, and connection facts", () => {
    const state = wardingBondBattle();
    const act = spellAct({ state, spellId: wardingBondUnitId, slotLevel: 2 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(wardingBondUnitId, 2, "wardingBond"),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toContain(spellTargetId);
    expect(targetHole.choices).not.toContain(spellCasterId);

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          knownWillingSpellTargetFill(
            targetHole,
            wardingBondUnitId,
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
        state,
        subject: act.subject,
        fills: [
          wardingBondSpellTargetFillWithoutWilling(
            targetHole,
            wardingBondUnitId,
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
      state,
      subject: act.subject,
      fills: [
        wardingBondSpellTargetFill(
          targetHole,
          wardingBondUnitId,
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
    expect(wardingBondEffects(resolved.state, spellTargetId)).toEqual([
      expect.objectContaining({
        kind: "wardingBond",
        sourceSpellId: wardingBondUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
    expect(savingThrowFlatBonusProjections(resolved.state)).toEqual([
      {
        targetId: spellTargetId,
        sourceSpellId: wardingBondUnitId,
        bonus: 1,
      },
    ]);
  });

  test("grants all-damage Resistance and shares the final target damage amount to the caster", () => {
    const state = castWardingBond(wardingBondBattle());
    const target = requireCombatant(state, spellTargetId);

    expect(damageAmountAfterTargetAdjustments(target, 9, "fire")).toBe(4);

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
    const state = withTargetConcentration(castWardingBond(wardingBondBattle()));
    const target = requireCombatant(state, spellTargetId);

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
            sourceSpellId: wardingBondUnitId,
            bonus: 1,
          },
        ]),
      }),
    ]);
  });

  test("routes shared caster damage through Concentration damage saves", () => {
    const state = withCasterConcentration(castWardingBond(wardingBondBattle()));
    const target = requireCombatant(state, spellTargetId);
    const casterConcentrationHoles =
      wardingBondSharedDamageConcentrationSavingThrowHoles({
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
      wardingBondDamageShareConcentrationSavingThrows: [
        failedConcentrationSave,
      ],
    });

    const caster = requireCombatant(damaged, spellCasterId);
    expect(caster.hp).toBe(8);
    expect(caster.concentration).toBeNull();
  });

  test("attack damage continuation carries direct and linked-caster Concentration fills", () => {
    const state = withTargetConcentration(
      withCasterConcentration(castWardingBond(wardingBondBattle())),
    );
    const subject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Club",
    } satisfies Extract<BattleSubject, { readonly tag: "action" }>;
    const continuation = {
      kind: "attackDamage",
      subject,
      attackerId: spellCasterId,
      targetId: spellTargetId,
      damageEvent: {
        kind: "rolledDamage",
        damageRollByType: [{ damageType: "bludgeoning", amount: 8 }],
      },
      fills: [],
      concentrationSavingThrows: [],
      deathFailuresAtZeroHp: 1,
      damageDisposition: { kind: "ordinaryDamage" },
      attackDamageRiders: [],
    } satisfies Extract<
      BattleInterruptedProcedure,
      { readonly kind: "attackDamage" }
    >;

    const needsTargetSave = resumeInterruptedProcedure(
      state,
      continuation,
      "attackDamage",
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
    expect(requireCombatant(resolved.state, spellTargetId).concentration).toEqual(
      {
        sourceSpellId: spellId(wardingBondUnitId),
        effectKind: "spellEffect",
      },
    );
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(8);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("offhand attack damage requests the linked caster Concentration save", () => {
    const state = withCasterConcentration(
      advanceRound(castWardingBond(wardingBondClubBattle()), [
        spellCasterId,
        spellTargetId,
      ]),
    );
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Club",
    };
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

    const offHandSubject: BattleSubject = {
      tag: "bonusAction",
      actorId: spellCasterId,
      action: "offHandAttack",
      attackName: "Club",
    };
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
    const state = withCasterConcentration(
      advanceRound(castWardingBond(wardingBondClubBattle()), [
        spellCasterId,
        spellTargetId,
      ]),
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
      attackName: "Club",
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
    const state = withCasterConcentration(
      damageSpellTurnState(magicMissileUnitId, [
        { spellLevel: 2, count: 1 },
        { spellLevel: 1, count: 1 },
      ]),
    );
    const act = spellAct({ state, spellId: magicMissileUnitId, slotLevel: 1 });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocationHole, [
      { targetId: spellTargetId, count: 3 },
    ]);
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

  test("save-gated spell damage requests the linked caster Concentration save", () => {
    const state = withCasterConcentration(
      damageSpellTurnState(burningHandsUnitId, [
        { spellLevel: 2, count: 1 },
        { spellLevel: 1, count: 1 },
      ]),
    );
    const act = spellAct({ state, spellId: burningHandsUnitId, slotLevel: 1 });
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

  test("attack-burst spell damage requests the linked caster Concentration save", () => {
    const state = withCasterConcentration(
      damageSpellTurnState(iceKnifeUnitId, [
        { spellLevel: 2, count: 1 },
        { spellLevel: 1, count: 1 },
      ]),
    );
    const act = spellAct({ state, spellId: iceKnifeUnitId, slotLevel: 1 });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      iceKnifeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
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
        fills: [
          targetFill,
          attackRollResult,
          attackDamageFill,
          burstSaveFill,
        ],
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
      withTurnStartDamageOnTarget(castWardingBond(wardingBondBattle())),
    );
    const awaitingTurnStart = endTurn({
      state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStart,
      "rolledDice",
    );
    const turnStartSave = requireResultHole(
      awaitingTurnStart,
      "savingThrowOutcome",
    );
    const damageFill = damageRollFillWithGroups(turnStartDamage, [[2, 2, 2]]);
    const saveFill = savingThrowOutcomeFill(turnStartSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const needsCasterSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [damageFill, saveFill],
    });
    const casterSave = requireResultHole(
      needsCasterSave,
      "concentrationSavingThrow",
    );
    expect(casterSave).toMatchObject({
      combatantId: spellCasterId,
      damageAmount: 3,
    });

    const resolved = endTurn({
      state,
      actorId: spellCasterId,
      fills: [
        damageFill,
        saveFill,
        concentrationSavingThrowFill(casterSave, false),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected turn-start Warding Bond damage to resolve.",
      );
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(9);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("turn-start shared caster damage requests the caster Hideous Laughter repeat save", () => {
    const state = withHideousLaughterOnCaster(
      withTurnStartDamageOnTarget(castWardingBond(wardingBondBattle())),
    );
    const awaitingTurnStart = endTurn({
      state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStart,
      "rolledDice",
    );
    if (awaitingTurnStart.tag !== "needsHoles") {
      throw new Error("Expected turn-start damage and save holes.");
    }
    const endTurnRepeatSave = awaitingTurnStart.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "hideousLaughterRepeatSave" in hole &&
        hole.hideousLaughterRepeatSave.targetId === spellCasterId &&
        hole.hideousLaughterRepeatSave.trigger === "endTurn",
    );
    const turnStartSave = awaitingTurnStart.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "spellTurnStartSave" in hole &&
        hole.spellTurnStartSave.targetId === spellTargetId,
    );
    if (endTurnRepeatSave === undefined || turnStartSave === undefined) {
      throw new Error("Expected Hideous Laughter end-turn and turn-start saves.");
    }
    const damageFill = damageRollFillWithGroups(turnStartDamage, [[2, 2, 2]]);
    const endTurnRepeatSaveFill = savingThrowOutcomeFill(endTurnRepeatSave, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const saveFill = savingThrowOutcomeFill(turnStartSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const needsRepeatSave = endTurn({
      state,
      actorId: spellCasterId,
      fills: [endTurnRepeatSaveFill, damageFill, saveFill],
    });
    if (needsRepeatSave.tag !== "needsHoles") {
      throw new Error("Expected shared damage Hideous Laughter repeat save.");
    }
    const repeatSave = needsRepeatSave.holes.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome" &&
        "hideousLaughterRepeatSave" in hole &&
        hole.hideousLaughterRepeatSave.targetId === spellCasterId,
    );
    if (repeatSave === undefined) {
      throw new Error("Expected caster Hideous Laughter damage repeat save.");
    }
    expect(repeatSave).toMatchObject({
      hideousLaughterRepeatSave: {
        targetId: spellCasterId,
        sourceSpellId: hideousLaughterUnitId,
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
        saveFill,
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellCasterId, succeeded: true },
        ]),
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(false);
  });

  test("cleans up on separation, caster 0 Hit Points, recast, and duration expiry", () => {
    const separated = separateWardingBond(castWardingBond(wardingBondBattle()));
    expect(wardingBondEffects(separated, spellTargetId)).toEqual([]);

    const casterZeroState = castWardingBond(wardingBondBattle());
    const casterZero = applyBattleHitPointDamage({
      state: casterZeroState,
      target: requireCombatant(casterZeroState, spellCasterId),
      damageAmount: 12,
      deathFailuresAtZeroHp: 1,
    });
    expect(wardingBondEffects(casterZero, spellTargetId)).toEqual([]);

    const secondTargetId = combatantId("unit-profile-warding-bond-target-2");
    const recastInitial = wardingBondBattle({
      spellSlotCount: 2,
      extraTargetIds: [secondTargetId],
    });
    const firstCast = castWardingBond(recastInitial, spellTargetId);
    const nextCasterTurn = advanceRound(firstCast, [
      spellCasterId,
      spellTargetId,
      secondTargetId,
    ]);
    const recast = castWardingBond(nextCasterTurn, secondTargetId);
    expect(wardingBondEffects(recast, spellTargetId)).toEqual([]);
    expect(wardingBondEffects(recast, secondTargetId)).toHaveLength(1);

    const durationInitial = withWardingBondDuration(
      castWardingBond(wardingBondBattle()),
      spellTargetId,
      1,
    );
    const expired = advanceRound(durationInitial, [spellCasterId, spellTargetId]);
    expect(wardingBondEffects(expired, spellTargetId)).toEqual([]);
  });
});

function wardingBondBattle(input: {
  readonly spellSlotCount?: number;
  readonly spellSlots?: Parameters<typeof spellBattle>[0]["spellSlots"];
  readonly additionalPreparedSpells?: Parameters<
    typeof spellBattle
  >[0]["preparedSpells"];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly casterAttack?: Parameters<typeof spellBattle>[0]["attack"];
} = {}): BattleState {
  return spellBattle({
    preparedSpells: [
      spellRecord(wardingBondUnitId),
      ...(input.additionalPreparedSpells ?? []),
    ],
    spellSlots:
      input.spellSlots ?? [{ spellLevel: 2, count: input.spellSlotCount ?? 1 }],
    targetHp: 12,
    targetMaxHp: 12,
    ...(input.casterAttack === undefined
      ? {}
      : { attack: input.casterAttack }),
    ...(input.extraTargetIds === undefined
      ? {}
      : { extraTargetIds: input.extraTargetIds }),
  });
}

function damageSpellTurnState(
  damageSpellId: string,
  spellSlots: NonNullable<Parameters<typeof spellBattle>[0]["spellSlots"]>,
): BattleState {
  return advanceRound(
    castWardingBond(
      wardingBondBattle({
        additionalPreparedSpells: [spellRecord(damageSpellId)],
        spellSlots,
      }),
    ),
    [spellCasterId, spellTargetId],
  );
}

function wardingBondClubBattle(): BattleState {
  const club = zeroAbilityWeaponAttack("weapon_club");
  return withSameClubMainAndOffHand(
    wardingBondBattle({ casterAttack: club }),
    club,
  );
}

function attackTargetFillForClub(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return attackTargetFill(hole, spellCasterId, spellTargetId, "Club");
}

function wardingBondSpellTargetFillWithoutWilling(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = spellTargetFill(hole, spellId, casterId, targetId);
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "wardingBondPairedWornPlatinumRings",
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "wardingBondCreaturesDistance",
        casterId,
        targetId,
        spellId,
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
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId: spellCasterId,
      targetId: allocation.targetId,
      spellId: hole.spell.spell.id,
    })),
  };
}

function castWardingBond(
  state: BattleState,
  targetId: CombatantId = spellTargetId,
): BattleState {
  const act = spellAct({ state, spellId: wardingBondUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      wardingBondSpellTargetFill(
        targetHole,
        wardingBondUnitId,
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
        sourceSpellId: spellId(wardingBondUnitId),
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
        sourceSpellId: spellId(wardingBondUnitId),
        effectKind: "spellEffect",
      },
    }),
  };
}

function withTurnStartDamageOnTarget(state: BattleState): BattleState {
  const target = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "spellTurnStartDamageAndSave" as const,
          sourceSpellId: searingSmiteUnitId,
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
      ],
    }),
  };
}

function withHideousLaughterOnCaster(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects,
        {
          kind: "hideousLaughter" as const,
          sourceSpellId: hideousLaughterUnitId,
          sourceCombatantId: spellTargetId,
          conditionHadNonSpellProneSource: false,
          conditionHadNonSpellIncapacitatedSource: false,
          save: {
            ability: "wis" as const,
            dc: { kind: "caster_spell_save_dc" as const },
          },
          expiresAt: {
            kind: "concentration" as const,
            combatantId: spellTargetId,
            durationTicks: hideousLaughterDurationTicks,
          },
        },
      ],
    }),
  };
}

function separateWardingBond(state: BattleState): BattleState {
  const subject = wardingBondSeparationSubject(spellTargetId);
  const hole = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetSpatialFacts",
  );
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [wardingBondSeparationFactsFill(hole, spellTargetId)],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Warding Bond separation to resolve.");
  }
  return resolved.state;
}

function wardingBondSeparationSubject(targetId: CombatantId): BattleSubject {
  return {
    tag: "runtimeCommand",
    actorId: spellCasterId,
    command: "wardingBondSeparation",
    sourceCombatantId: spellCasterId,
    sourceSpellId: spellId(wardingBondUnitId),
    targetId,
  };
}

function wardingBondSeparationFactsFill(
  hole: Extract<BattleHole, { readonly kind: "targetSpatialFacts" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: hole.holeId,
    spatialFacts: [
      {
        kind: "wardingBondCreaturesDistance",
        casterId: spellCasterId,
        targetId,
        spellId: wardingBondUnitId,
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
        effect.kind === "wardingBond"
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

function wardingBondEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<BattleActiveEffect, { readonly kind: "wardingBond" }>[] {
  return requireCombatant(state, combatantId).activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "wardingBond" }
    > => effect.kind === "wardingBond",
  );
}
