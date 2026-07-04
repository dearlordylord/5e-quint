// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME spiritual_weapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
import { describe, expect, test } from "vitest";
import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  interruptDecisionFill,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleInterruptProcedureChoice,
  BattleResolutionResult,
} from "./index.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spiritualWeaponForcePositionFill,
  spiritualWeaponTargetFill,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  battleTablePositionId,
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import {
  counterspellUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";

describe("L12G deterministic Spiritual Weapon admission", () => {
  test("spiritual weapon casts as a Bonus Action attack proxy with slot scaling", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });
    const secondLevelAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const fourthLevelAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 4,
    });

    expect(secondLevelAct.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        spiritualWeaponUnitId,
        2,
        "spiritualWeaponAttackProxy",
      ),
      mode: { tag: "cast" },
    });
    expect(
      requireHole(secondLevelAct.initialHoles, "spiritualWeaponForcePosition"),
    ).toEqual(
      expect.objectContaining({
        mode: "cast",
        maxDistanceFeet: movementFeet(60),
      }),
    );
    expect(spellHoleInvocation(fourthLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "spiritualWeaponAttackProxy",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 3, dieSize: 8, flat: 3 },
          damageType: "force",
        },
        forceReachFeet: movementFeet(5),
        repeatMoveMaxFeet: movementFeet(20),
      }),
    );
  });

  test("rejects public Action spell subjects for the Bonus Action Spiritual Weapon cast", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const actionSubject: Extract<
      BattleSubject,
      { readonly tag: "actionSpell" }
    > = {
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        spiritualWeaponUnitId,
        2,
        "spiritualWeaponAttackProxy",
      ),
      mode: { tag: "cast" },
    };

    expect(
      resolveBattleSubject({
        state,
        subject: actionSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message: "Prepared Bonus Action spells must use the Bonus Action spell subject.",
    });
  });

  test("rejects authored repeat attacks with mismatched damage", () => {
    const spell = spiritualWeaponWithMismatchedRepeatDamage();
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
          candidate.subject.invocation.procedure ===
            "spiritualWeaponAttackProxy",
      ),
    ).toBe(false);
  });

  test("rejects authored Spiritual Weapon shapes with extra later executable mechanics", () => {
    const spells = [
      spiritualWeaponWithExtraLaterOperation(),
      spiritualWeaponWithExtraCompositeEffect(),
    ];

    for (const spell of spells) {
      const state = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });

      expect(
        discoverBattleActs(state).some(
          (candidate) =>
            candidate.subject.tag === "bonusActionSpell" &&
            candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
            candidate.subject.invocation.procedure ===
              "spiritualWeaponAttackProxy",
        ),
      ).toBe(false);
    }
  });

  test("cast places the force, makes the immediate attack, and records concentration cleanup", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const needsAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [forceFill, targetFill],
    });
    expect(needsAttackRoll).toMatchObject({ tag: "needsHoles" });
    const attackRoll = requireResultHole(needsAttackRoll, "attackRoll");
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          forceFill,
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon cast to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toStrictEqual(
      Hp(12),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({
      sourceSpellId: spiritualWeaponUnitId,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        sourceSpellId: spiritualWeaponUnitId,
        sourceCombatantId: spellCasterId,
        forcePositionId,
        forceReachFeet: movementFeet(5),
        repeatMoveMaxFeet: movementFeet(20),
        startedOn: {
          actorId: spellCasterId,
          round: state.initiative.round,
        },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );

    const cleaned = breakBattleConcentration(resolved.state, spellCasterId);
    expect(
      requireCombatant(cleaned, spellCasterId).activeEffects,
    ).not.toContainEqual(expect.objectContaining({ kind: "spiritualWeapon" }));

    const expiring = withSpiritualWeaponDurationTicks(
      resolved.state,
      elapsedTimeTicks(1),
    );
    const expired = {
      ...expiring,
      combatants: tickDurationEffects(expiring.combatants).value,
    };
    expect(
      requireCombatant(expired, spellCasterId).activeEffects,
    ).not.toContainEqual(expect.objectContaining({ kind: "spiritualWeapon" }));
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
  });

  test("counterspell reaction frame uses the Spiritual Weapon Bonus Action resource", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(counterspellUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      },
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const awaitingCounterspell = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          forceFill,
          targetFill,
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              reactorId: spellTargetId,
              casterId: spellCasterId,
            }),
          ]),
        ],
      }),
    );

    expect(awaitingCounterspell.state.interruptStack.at(-1)).toMatchObject({
      kind: "interruptCheckpoint",
      frame: {
        trigger: "spellCast",
        castingResource: { kind: "bonusAction" },
      },
    });
    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingCounterspell,
      reactorId: spellTargetId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const countered = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        triggeredReactionSpellDecision(spellTargetId, choice, []),
      ),
    });

    expect(countered).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        turn: { bonusActionAvailable: false },
      },
    });
    if (countered.tag !== "resolved") {
      throw new Error("Expected Counterspell to resolve Spiritual Weapon.");
    }
    expect(
      requireCombatant(countered.state, spellCasterId).activeEffects,
    ).not.toContainEqual(expect.objectContaining({ kind: "spiritualWeapon" }));
  });

  test("self-target immediate damage sees the newly created concentration proxy", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellCasterId,
      forcePositionId,
    );
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [forceFill, targetFill],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          forceFill,
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5]]),
      ],
    });
    const concentration = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error("Expected Spiritual Weapon self-damage to need a save.");
    }
    expect(
      requireCombatant(needsConcentration.state, spellCasterId).concentration,
    ).toEqual({
      sourceSpellId: spiritualWeaponUnitId,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(needsConcentration.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId,
      }),
    );

    const concentrationFill = {
      kind: "concentrationSavingThrow",
      holeId: concentration.holeId,
      value: { succeeded: true },
    } satisfies Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    >;
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5]]),
        concentrationFill,
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon self-hit to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toStrictEqual(
      Hp(4),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId,
      }),
    );
  });

  test("Shield replay can turn the immediate Spiritual Weapon hit into a miss without re-spending the cast", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(shieldUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [forceFill, targetFill],
      }),
      "attackRoll",
    );
    const awaitingShield = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          forceFill,
          targetFill,
          attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
    );
    expect(awaitingShield.snapshot.pendingInterrupt).toMatchObject({
      trigger: "attackHit",
    });
    expect(
      requireCombatant(awaitingShield.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId,
      }),
    );

    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingShield,
      reactorId: spellTargetId,
      spellId: shieldUnitId,
      procedure: "shieldReaction",
      slotLevel: 1,
    });
    const resolved = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(spellTargetId, choice, []),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null, turn: { bonusActionAvailable: false } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded Spiritual Weapon cast to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toStrictEqual(
      Hp(20),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId,
      }),
    );
  });

  test("sanctuary loss on cast still spends and records the Spiritual Weapon proxy", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = withSanctuaryWard(
      spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      spellTargetId,
    );
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const needsSanctuary = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [forceFill, targetFill],
      }),
    );
    const lost = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });
    if (lost.tag !== "resolved") {
      throw new Error("Expected Sanctuary-lost Spiritual Weapon to resolve.");
    }
    expect(requireCombatant(lost.state, spellTargetId).hp).toStrictEqual(
      Hp(12),
    );
    expect(
      requireCombatant(lost.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId,
      }),
    );
  });

  test("cast rejects force positions outside the selected hole and SRD range", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const wrongHole = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [{ ...forceFill, holeId: target.holeId }, targetFill],
    });
    expect(wrongHole).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spiritual Weapon force position must use the selected spell act position hole.",
    });

    const overRange = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spiritualWeaponForcePositionFill({
          hole: force,
          positionId: forcePositionId,
          distanceFromCasterFeet: 61,
        }),
        targetFill,
      ],
    });
    expect(overRange).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spiritual Weapon force placement must be within the spell range.",
    });
  });

  test("cast binds target adjacency to the selected force position", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const selectedForceId = battleTablePositionId("spiritual-weapon-force-a");
    const unrelatedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: selectedForceId,
    });
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      unrelatedForceId,
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [forceFill, targetFill],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("same-turn repeat is unavailable even if a Bonus Action is restored", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const force = requireHole(act.initialHoles, "spiritualWeaponForcePosition");
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spiritualWeaponForcePositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const targetFill = spiritualWeaponTargetFill(
      target,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [forceFill, targetFill],
      }),
      "attackRoll",
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon same-turn setup to resolve.");
    }
    const sameTurnWithBonusAction: BattleState = {
      ...cast.state,
      currentTurnResources: {
        ...cast.state.currentTurnResources,
        currentHasBonusAction: true,
      },
    };

    expect(
      discoverBattleActs(sameTurnWithBonusAction).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
          candidate.subject.invocation.procedure ===
            "spiritualWeaponRepeatAttack",
      ),
    ).toBe(false);
  });

  test("later Bonus Action repositions the force and repeats the attack without another slot", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const castAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spiritualWeaponForcePositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spiritualWeaponTargetFill(
      castTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      initialForceId,
    );
    const needsCastAttackRoll = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [castForceFill, castTargetFill],
    });
    expect(needsCastAttackRoll).toMatchObject({ tag: "needsHoles" });
    const castAttackRoll = requireResultHole(needsCastAttackRoll, "attackRoll");
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        castForceFill,
        castTargetFill,
        attackRollFill(castAttackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon miss cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const repeatAct = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
        candidate.subject.invocation.procedure ===
          "spiritualWeaponRepeatAttack",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spiritualWeaponForcePositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spiritualWeaponTargetFill(
      repeatTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      movedForceId,
    );
    const overlongMove = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeatAct.subject,
      fills: [
        spiritualWeaponForcePositionFill({
          hole: repeatForce,
          positionId: movedForceId,
          moveDistanceFeet: 21,
        }),
        repeatTargetFill,
      ],
    });
    expect(overlongMove).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Spiritual Weapon force movement exceeds the spell's maximum.",
    });

    const repeatAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [repeatForceFill, repeatTargetFill],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [
          repeatForceFill,
          repeatTargetFill,
          attackRollFill(repeatAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const repeated = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeatAct.subject,
      fills: [
        repeatForceFill,
        repeatTargetFill,
        attackRollFill(repeatAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });

    expect(repeated).toMatchObject({ tag: "resolved" });
    if (repeated.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon repeat attack to resolve.");
    }
    expect(requireCombatant(repeated.state, spellTargetId).hp).toStrictEqual(
      Hp(23),
    );
    expect(
      requireCombatant(repeated.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId: movedForceId,
      }),
    );
  });

  test("later repeat remains available after a prior level 1+ slot spell on the same turn", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const castAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spiritualWeaponForcePositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spiritualWeaponTargetFill(
      castTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      initialForceId,
    );
    const castAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [castForceFill, castTargetFill],
      }),
      "attackRoll",
    );
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        castForceFill,
        castTargetFill,
        attackRollFill(castAttackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon miss cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const afterPriorSlotSpell: BattleState = {
      ...casterTurn.state,
      currentTurnResources: {
        ...casterTurn.state.currentTurnResources,
        spellSlotUsesThisTurn: [
          { kind: "committed", combatantId: spellCasterId },
        ],
        levelOnePlusSpellCastsThisTurn: [spellCasterId],
        quickenedLevelOnePlusSpellCastsThisTurn: [spellCasterId],
      },
    };

    const repeatAct = discoverBattleActs(afterPriorSlotSpell).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
        candidate.subject.invocation.procedure ===
          "spiritualWeaponRepeatAttack",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spiritualWeaponForcePositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spiritualWeaponTargetFill(
      repeatTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      movedForceId,
    );
    const repeatAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterPriorSlotSpell,
        subject: repeatAct.subject,
        fills: [repeatForceFill, repeatTargetFill],
      }),
      "attackRoll",
    );
    const repeated = resolveBattleSubject({
      state: afterPriorSlotSpell,
      subject: repeatAct.subject,
      fills: [
        repeatForceFill,
        repeatTargetFill,
        attackRollFill(repeatAttackRoll, { total: 3, naturalD20: 2 }),
      ],
    });

    expect(repeated).toMatchObject({ tag: "resolved" });
    if (repeated.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon repeat miss to resolve.");
    }
    expect(repeated.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      afterPriorSlotSpell.currentTurnResources.spellSlotUsesThisTurn,
    );
    expect(
      repeated.state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    ).toEqual(
      afterPriorSlotSpell.currentTurnResources.levelOnePlusSpellCastsThisTurn,
    );
    expect(
      requireCombatant(repeated.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId: movedForceId,
      }),
    );
  });

  test("Shield replay can turn the repeated Spiritual Weapon hit into a miss after repositioning once", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(shieldUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const castAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spiritualWeaponForcePositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spiritualWeaponTargetFill(
      castTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      initialForceId,
    );
    const castAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [castForceFill, castTargetFill],
      }),
      "attackRoll",
    );
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        castForceFill,
        castTargetFill,
        attackRollFill(castAttackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon miss cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const repeatAct = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
        candidate.subject.invocation.procedure ===
          "spiritualWeaponRepeatAttack",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spiritualWeaponForcePositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spiritualWeaponTargetFill(
      repeatTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      movedForceId,
    );
    const repeatAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [repeatForceFill, repeatTargetFill],
      }),
      "attackRoll",
    );
    const awaitingShield = requireNeedsHoles(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [
          repeatForceFill,
          repeatTargetFill,
          attackRollFill(repeatAttackRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
    );
    expect(awaitingShield.snapshot.pendingInterrupt).toMatchObject({
      trigger: "attackHit",
    });

    const choice = requireTriggeredReactionSpellChoice({
      result: awaitingShield,
      reactorId: spellTargetId,
      spellId: shieldUnitId,
      procedure: "shieldReaction",
      slotLevel: 1,
    });
    const resolved = resolveBattleInterrupt({
      state: awaitingShield.state,
      fill: interruptDecisionFill(
        requireHole(awaitingShield.holes, "interruptDecision"),
        triggeredReactionSpellDecision(spellTargetId, choice, []),
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null, turn: { bonusActionAvailable: false } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded Spiritual Weapon repeat to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toStrictEqual(
      Hp(30),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId: movedForceId,
      }),
    );
  });

  test("sanctuary loss on repeat still repositions the Spiritual Weapon proxy", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const castAct = bonusSpellAct({
      state,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spiritualWeaponForcePositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spiritualWeaponTargetFill(
      castTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      initialForceId,
    );
    const castAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [castForceFill, castTargetFill],
      }),
      "attackRoll",
    );
    const cast = resolveBattleSubject({
      state,
      subject: castAct.subject,
      fills: [
        castForceFill,
        castTargetFill,
        attackRollFill(castAttackRoll, { total: 3, naturalD20: 2 }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon miss cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const warded = withSanctuaryWard(casterTurn.state, spellTargetId);

    const repeatAct = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
        candidate.subject.invocation.procedure ===
          "spiritualWeaponRepeatAttack",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spiritualWeaponForcePositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spiritualWeaponTargetFill(
      repeatTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      movedForceId,
    );
    const needsSanctuary = requireNeedsHoles(
      resolveBattleSubject({
        state: warded,
        subject: repeatAct.subject,
        fills: [repeatForceFill, repeatTargetFill],
      }),
    );
    const lost = resolveBattleSubject({
      state: warded,
      subject: repeatAct.subject,
      fills: [
        repeatForceFill,
        repeatTargetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });
    if (lost.tag !== "resolved") {
      throw new Error("Expected Sanctuary-lost repeat attack to resolve.");
    }
    expect(requireCombatant(lost.state, spellTargetId).hp).toStrictEqual(
      Hp(12),
    );
    expect(
      requireCombatant(lost.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        forcePositionId: movedForceId,
      }),
    );
  });
});

type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;
function requireNeedsHoles(result: BattleResolutionResult): NeedsHolesResult {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected battle subject to need holes.");
  }
  return result;
}

function counterspellTriggerFact(input: {
  readonly reactorId: typeof spellTargetId;
  readonly casterId: typeof spellCasterId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: counterspellUnitId,
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

function requireTriggeredReactionSpellChoice(input: {
  readonly result: NeedsHolesResult;
  readonly reactorId: typeof spellTargetId;
  readonly spellId: string;
  readonly procedure: string;
  readonly slotLevel: number;
}): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = input.result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === input.reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === input.spellId &&
      candidate.invocation.procedure === input.procedure &&
      Number(candidate.invocation.slotLevel) === input.slotLevel,
  );
  if (choice === undefined) {
    throw new Error(`Expected ${input.spellId} Reaction spell choice.`);
  }
  return choice;
}

function triggeredReactionSpellDecision(
  reactorId: typeof spellTargetId,
  choice: Extract<
    BattleInterruptProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      invocation: choice.invocation,
      fills,
    },
  };
}

function sanctuaryOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "sanctuaryInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  return { kind: "sanctuaryInterdictionOutcome", holeId: hole.holeId, value };
}

function withSanctuaryWard(
  state: BattleState,
  wardedId: typeof spellTargetId,
): BattleState {
  const warded = requireCombatant(state, wardedId);
  const ward: Extract<BattleActiveEffect, { readonly kind: "sanctuaryWard" }> =
    {
      kind: "sanctuaryWard",
      sourceSpellId: "sanctuary",
      sourceCombatantId: spellTargetId,
      save: { ability: "wis", dc: { kind: "fixed", dc: 13 } },
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(10),
      },
    };
  return {
    ...state,
    combatants: new Map(state.combatants).set(wardedId, {
      ...warded,
      activeEffects: [...warded.activeEffects, ward],
    }),
  };
}

function withSpiritualWeaponDurationTicks(
  state: BattleState,
  durationTicks: ReturnType<typeof elapsedTimeTicks>,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spiritualWeapon"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks,
              },
            }
          : effect,
      ),
    }),
  };
}

function spiritualWeaponWithMismatchedRepeatDamage(): SpellRecord {
  const spell = spellRecord(spiritualWeaponUnitId);
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Spiritual Weapon ongoing mechanics.");
  }
  const [firstOperation, ...laterOperations] = spell.mechanics.operations;
  const mismatchRepeatDamage = (
    operation: (typeof spell.mechanics.operations)[number],
  ) =>
    operation.effect.kind === "composite_ongoing"
      ? {
          ...operation,
          effect: {
            ...operation.effect,
            effects: operation.effect.effects.map((effect) =>
              effect.kind === "attack_roll"
                ? {
                    ...effect,
                    onHit: effect.onHit.map((hit) =>
                      hit.kind === "damage"
                        ? {
                            ...hit,
                            amount:
                              hit.amount.kind === "linear_per_level"
                                ? {
                                    ...hit.amount,
                                    base: {
                                      ...hit.amount.base,
                                      dice: 2,
                                    },
                                  }
                                : hit.amount,
                          }
                        : hit,
                    ),
                  }
                : effect,
            ),
          },
        }
      : operation;
  return decodeSpellRecordSync({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      operations: [
        mismatchRepeatDamage(firstOperation),
        ...laterOperations.map(mismatchRepeatDamage),
      ],
    },
  });
}

function spiritualWeaponWithExtraLaterOperation(): SpellRecord {
  const spell = spellRecord(spiritualWeaponUnitId);
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Spiritual Weapon ongoing mechanics.");
  }
  const [firstOperation, ...laterOperations] = spell.mechanics.operations;
  return decodeSpellRecordSync({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      operations: [firstOperation, ...laterOperations, firstOperation],
    },
  });
}

function spiritualWeaponWithExtraCompositeEffect(): SpellRecord {
  const spell = spellRecord(spiritualWeaponUnitId);
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Spiritual Weapon ongoing mechanics.");
  }
  const [firstOperation, ...laterOperations] = spell.mechanics.operations;
  if (firstOperation.effect.kind !== "composite_ongoing") {
    throw new Error("Expected Spiritual Weapon composite repeat operation.");
  }
  const [firstEffect, ...laterEffects] = firstOperation.effect.effects;
  if (firstEffect === undefined) {
    throw new Error("Expected Spiritual Weapon repeat effect.");
  }
  const effects = [
    firstEffect,
    ...laterEffects,
    firstEffect,
  ];
  const operation = {
    ...firstOperation,
    effect: {
      ...firstOperation.effect,
      effects,
    },
  };
  return decodeSpellRecordSync({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      operations: [operation, ...laterOperations],
    },
  });
}
