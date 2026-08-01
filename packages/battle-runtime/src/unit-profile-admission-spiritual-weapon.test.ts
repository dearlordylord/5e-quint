import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME spiritual_weapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
import { describe, expect, test } from "vitest";
import {
  requireCharacterSpellProcedureRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  interruptDecisionFill,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleInterruptProcedureChoice,
  BattleProcedureExecutionRef,
  BattleResolutionResult,
} from "./index.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  savingThrowOutcomeFill,
  spiritualWeaponForcePositionFill,
  spiritualWeaponTargetFill,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  assertBattleSnapshotCodecRoundTripForTest,
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
} from "./unit-profile-admission.test-support.ts";
import {
  counterspellUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";

describe("L12G deterministic Spiritual Weapon admission", () => {
  test("spiritual weapon casts as a Bonus Action attack proxy with slot scaling", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });
    const secondLevelAct = bonusSpellAct({
      session,
      spellId: spiritualWeaponUnitId,
      slotLevel: 2,
    });
    const fourthLevelAct = bonusSpellAct({
      session,
      spellId: spiritualWeaponUnitId,
      slotLevel: 4,
    });
    const awaitingForcePosition = resolveBattleSubject({
      state: session.state,
      subject: secondLevelAct.subject,
      fills: [],
    });
    if (awaitingForcePosition.tag !== "needsHoles") {
      throw new Error("Expected Spiritual Weapon force position.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingForcePosition.snapshot);

    expect({
      ...secondLevelAct.subject,
      invocation: battleActSpellPresentation(secondLevelAct)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(
          spiritualWeaponUnitId,
          2,
          "spiritualWeaponAttackProxy",
        ),
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
    expect(spellHoleInvocation(session, fourthLevelAct.initialHoles)).toEqual(
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const actionSubject: Extract<
      BattleSubject,
      { readonly tag: "actionSpell" }
    > = {
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(
          spiritualWeaponUnitId,
          2,
          "spiritualWeaponAttackProxy",
        ),
      ),
      mode: { tag: "cast" },
    };

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: actionSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message:
        "Prepared Bonus Action spells must use the Bonus Action spell subject.",
    });
  });

  test("rejects authored repeat attacks with mismatched damage", () => {
    const spell = spiritualWeaponWithMismatchedRepeatDamage();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            spiritualWeaponUnitId &&
          battleActSpellPresentation(candidate)?.invocation.procedure ===
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
      const session = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });

      expect(
        discoverBattleActs(session).some(
          (candidate) =>
            candidate.subject.tag === "bonusActionSpell" &&
            battleActSpellPresentation(candidate)?.invocation.spellId ===
              spiritualWeaponUnitId &&
            battleActSpellPresentation(candidate)?.invocation.procedure ===
              "spiritualWeaponAttackProxy",
        ),
      ).toBe(false);
    }
  });

  test("cast places the force, makes the immediate attack, and records concentration cleanup", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spiritualWeapon",
        sourceProcedureRef: expect.any(String),
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
    const session = spellBattle({
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
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                session,
                spellTargetId,
                spellSlotInvocationRef(counterspellUnitId, 3, "counterspell"),
              ),
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
      session,
      result: awaitingCounterspell,
      reactorId: spellTargetId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const countered = resolveBattleInterrupt({
      state: awaitingCounterspell.state,
      fill: interruptDecisionFill(
        requireHole(awaitingCounterspell.holes, "interruptDecision"),
        triggeredReactionSpellDecision(spellTargetId, choice, [
          savingThrowOutcomeFill(save, [
            { targetId: spellCasterId, succeeded: false },
          ]),
        ]),
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
      sourceProcedureRef: expect.any(String),
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
    const session = spellBattle({
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
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
      session,
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
      snapshot: {
        pendingInterrupt: null,
        turn: { bonusActionAvailable: false },
      },
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = withSanctuaryWard(session.state, spellTargetId);
    const act = bonusSpellAct({
      session,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
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
      discoverBattleActs(
        battleRuntimeSessionForTest({
          state: sameTurnWithBonusAction,
          context: session.context,
        }),
      ).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            spiritualWeaponUnitId &&
          battleActSpellPresentation(candidate)?.invocation.procedure ===
            "spiritualWeaponRepeatAttack",
      ),
    ).toBe(false);
  });

  test("later Bonus Action repositions the force and repeats the attack without another slot", () => {
    const spell = spellRecord(spiritualWeaponUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
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

    const repeatAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: casterTurn.state,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
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
    const completedRepeatFills = [
      repeatForceFill,
      repeatTargetFill,
      attackRollFill(repeatAttackRoll, { total: 18, naturalD20: 12 }),
      damageRollFillWithGroups(damage, [[4]]),
    ];
    // Stale-session counterexample: a later-turn subject must not become usable
    // against its same-turn cast snapshot even if that snapshot is externally
    // supplied with a restored Bonus Action.
    expect(
      resolveBattleSubject({
        state: {
          ...cast.state,
          currentTurnResources: {
            ...cast.state.currentTurnResources,
            currentHasBonusAction: true,
          },
        },
        subject: repeatAct.subject,
        fills: completedRepeatFills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Spiritual Weapon repeat attack is only available on later turns.",
    });
    // The discovered repeat also fails closed if another operation spends the
    // current Bonus Action before this subject resolves.
    expect(
      resolveBattleSubject({
        state: {
          ...casterTurn.state,
          currentTurnResources: {
            ...casterTurn.state.currentTurnResources,
            currentHasBonusAction: false,
          },
        },
        subject: repeatAct.subject,
        fills: completedRepeatFills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
    const repeated = resolveBattleSubject({
      state: casterTurn.state,
      subject: repeatAct.subject,
      fills: completedRepeatFills,
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
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

    const repeatAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: afterPriorSlotSpell,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
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
    const session = spellBattle({
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
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
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

    const repeatAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: casterTurn.state,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
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
      session,
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
      snapshot: {
        pendingInterrupt: null,
        turn: { bonusActionAvailable: false },
      },
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
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

    const repeatAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: warded,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
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
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: input.sourceProcedureRef,
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
  readonly session: ReturnType<typeof spellBattle>;
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
    > => {
      if (
        candidate.kind !== "castTriggeredReactionSpell" ||
        candidate.reactorId !== input.reactorId
      )
        return false;
      const invocation = characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          ...input.session,
          state: input.result.state,
        }),
        candidate.reactorId,
        candidate.subject.procedureRef,
      );
      return (
        invocation.tag === "spellSlot" &&
        invocation.spellId === input.spellId &&
        invocation.procedure === input.procedure &&
        Number(invocation.slotLevel) === input.slotLevel
      );
    },
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
      procedureRef: choice.subject.procedureRef,
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
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("sanctuary"),
      ),
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
  const effects = [firstEffect, ...laterEffects, firstEffect];
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
