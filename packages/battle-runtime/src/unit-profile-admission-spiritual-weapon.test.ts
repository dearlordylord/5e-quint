import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME spiritual_weapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPIRITUAL_WEAPON_ATTACK_PROXY
import { describe, expect, test } from "vitest";
import {
  requireCharacterSpellProcedureRefForTest,
  battleFrontierInterruptDecisionForState,
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
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  savingThrowOutcomeFill,
  spatialMeleeSpellAttackProxyPositionFill,
  spatialMeleeSpellAttackProxyTargetFill,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  assertBattleSnapshotCodecRoundTripForTest,
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
  movementDeltaFeet,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import {
  spellCastInterruptionReactionUnitId,
  mirrorImageUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
  spatialMeleeSpellAttackProxyUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";

describe("L12G deterministic Spiritual Weapon admission", () => {
  test("spiritual weapon casts as a Bonus Action attack proxy with slot scaling", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });
    const secondLevelAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const fourthLevelAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
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
          spatialMeleeSpellAttackProxyUnitId,
          2,
          "spatialMeleeSpellAttackProxy",
        ),
      ),
      mode: { tag: "cast" },
    });
    expect(
      requireHole(
        secondLevelAct.initialHoles,
        "spatialMeleeSpellAttackProxyPosition",
      ),
    ).toEqual(
      expect.objectContaining({
        mode: "cast",
        maxDistanceFeet: movementFeet(60),
      }),
    );
    expect(spellHoleInvocation(session, fourthLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "spatialMeleeSpellAttackProxy",
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

  test("a second discovered cast becomes stale after the first cast commits its slot", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 3 }],
    });
    const firstAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const secondAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const firstForce = requireHole(
      firstAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const firstTarget = requireHole(firstAct.initialHoles, "targetChoice");
    const firstPositionId = battleTablePositionId(
      "spiritual-weapon-first-discovery",
    );
    const firstForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: firstForce,
      positionId: firstPositionId,
    });
    const firstTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      firstTarget,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      firstPositionId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [firstForceFill, firstTargetFill],
      }),
      "attackRoll",
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: firstAct.subject,
        fills: [
          firstForceFill,
          firstTargetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const committed = resolveBattleSubject({
      state: session.state,
      subject: firstAct.subject,
      fills: [
        firstForceFill,
        firstTargetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damageRoll, [[4]]),
      ],
    });
    if (committed.tag !== "resolved") {
      throw new Error("Expected first Spiritual Weapon discovery to resolve.");
    }
    expect(committed.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(
      committed.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual(
      expect.objectContaining({
        kind: "committed",
        combatantId: spellCasterId,
      }),
    );

    const secondForce = requireHole(
      secondAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const secondTarget = requireHole(secondAct.initialHoles, "targetChoice");
    const secondPositionId = battleTablePositionId(
      "spiritual-weapon-second-discovery",
    );
    const stale = resolveBattleSubject({
      state: committed.state,
      subject: secondAct.subject,
      fills: [
        spatialMeleeSpellAttackProxyPositionFill({
          hole: secondForce,
          positionId: secondPositionId,
        }),
        spatialMeleeSpellAttackProxyTargetFill(
          secondTarget,
          spatialMeleeSpellAttackProxyUnitId,
          spellCasterId,
          spellTargetId,
          secondPositionId,
        ),
      ],
    });
    expect(stale).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
  });

  test("Mirror Image redirects an immediate Spiritual Weapon hit after the cast commit", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 3 }],
      targetClassLevels: [{ className: "wizard", level: 3 }],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [spellRecord(mirrorImageUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const target = requireCombatant(session.state, spellTargetId);
    const mirrorImage = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "mirrorImageDuplicates",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          spellTargetId,
          spellSlotInvocationRef(
            mirrorImageUnitId,
            2,
            "duplicateHitInterception",
          ),
        ),
        sourceCombatantId: spellTargetId,
        remainingDuplicates: 3,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });
    const mirrorImageState: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellTargetId, {
        ...mirrorImage.owner,
        activeEffects: [...target.activeEffects, mirrorImage.effect],
      }),
    };
    const act = bonusSpellAct({
      session: battleRuntimeSessionForTest({
        ...session,
        state: mirrorImageState,
      }),
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const targetChoice = requireHole(act.initialHoles, "targetChoice");
    const positionId = battleTablePositionId("spiritual-weapon-mirror-force");
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: force,
      positionId,
    });
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      targetChoice,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      positionId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: mirrorImageState,
        subject: act.subject,
        fills: [forceFill, targetFill],
      }),
      "attackRoll",
    );
    const mirrorHoleResult = resolveBattleSubject({
      state: mirrorImageState,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
      ],
    });
    const mirrorHole = requireResultHole(mirrorHoleResult, "rolledDice");
    if (!("mirrorImageDuplicateRoll" in mirrorHole)) {
      throw new Error("Expected Mirror Image duplicate roll hole.");
    }
    const resolved = resolveBattleSubject({
      state: mirrorImageState,
      subject: act.subject,
      fills: [
        forceFill,
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(mirrorHole, [[1, 2, 3]]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mirror Image redirected Spiritual Weapon hit.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(30);
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "mirrorImageDuplicates",
        remainingDuplicates: 2,
      }),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({ kind: "spatialMeleeSpellAttackProxy" }),
    );
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual(
      expect.objectContaining({
        kind: "committed",
        combatantId: spellCasterId,
      }),
    );
  });

  test("rejects public Action spell subjects for the Bonus Action Spiritual Weapon cast", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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
          spatialMeleeSpellAttackProxyUnitId,
          2,
          "spatialMeleeSpellAttackProxy",
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
    const spell = spatialMeleeSpellAttackProxyWithMismatchedRepeatDamage();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            spatialMeleeSpellAttackProxyUnitId &&
          battleActSpellPresentation(candidate)?.invocation.procedure ===
            "spatialMeleeSpellAttackProxy",
      ),
    ).toBe(false);
  });

  test("rejects authored Spiritual Weapon shapes with extra later executable mechanics", () => {
    const spells = [
      spatialMeleeSpellAttackProxyWithExtraLaterOperation(),
      spatialMeleeSpellAttackProxyWithExtraCompositeEffect(),
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
              spatialMeleeSpellAttackProxyUnitId &&
            battleActSpellPresentation(candidate)?.invocation.procedure ===
              "spatialMeleeSpellAttackProxy",
        ),
      ).toBe(false);
    }
  });

  test("cast places the force, makes the immediate attack, and records concentration cleanup", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
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
        kind: "spatialMeleeSpellAttackProxy",
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
    ).not.toContainEqual(
      expect.objectContaining({ kind: "spatialMeleeSpellAttackProxy" }),
    );

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
    ).not.toContainEqual(
      expect.objectContaining({ kind: "spatialMeleeSpellAttackProxy" }),
    );
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
  });

  test("spellCastInterruptionReaction reaction frame uses the Spiritual Weapon Bonus Action resource", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(spellCastInterruptionReactionUnitId)],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      },
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
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
            spellCastInterruptionReactionTriggerFact({
              reactorId: spellTargetId,
              casterId: spellCasterId,
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                session,
                spellTargetId,
                spellSlotInvocationRef(
                  spellCastInterruptionReactionUnitId,
                  3,
                  "spellCastInterruptionReaction",
                ),
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
      spellId: spellCastInterruptionReactionUnitId,
      procedure: "spellCastInterruptionReaction",
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
        turn: { bonusActionQuotaAvailable: false },
      },
    });
    if (countered.tag !== "resolved") {
      throw new Error("Expected Counterspell to resolve Spiritual Weapon.");
    }
    expect(
      requireCombatant(countered.state, spellCasterId).activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ kind: "spatialMeleeSpellAttackProxy" }),
    );
  });

  test("self-target immediate damage sees the newly created concentration proxy", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellCasterId,
      forcePositionId,
    );
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
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
        kind: "spatialMeleeSpellAttackProxy",
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
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId,
      }),
    );
  });

  test("Shield replay can turn the immediate Spiritual Weapon hit into a miss without re-spending the cast", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(shieldUnitId)],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
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
    expect(
      battleFrontierInterruptDecisionForState(awaitingShield.state),
    ).toMatchObject({
      trigger: "attackHit",
    });
    expect(
      requireCombatant(awaitingShield.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId,
      }),
    );

    const choice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: spellTargetId,
      spellId: shieldUnitId,
      procedure: "triggeredArmorDefense",
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
        turn: { bonusActionQuotaAvailable: false },
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
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId,
      }),
    );
  });

  test("sanctuary loss on cast still spends and records the Spiritual Weapon proxy", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = withSanctuaryWard(session.state, spellTargetId);
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
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
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionQuotaAvailable: false } },
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
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId,
      }),
    );
  });

  test("cast rejects force positions outside the selected hole and SRD range", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      forcePositionId,
    );
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
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
        spatialMeleeSpellAttackProxyPositionFill({
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
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const selectedForceId = battleTablePositionId("spiritual-weapon-force-a");
    const unrelatedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: force,
      positionId: selectedForceId,
    });
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
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
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const forcePositionId = battleTablePositionId("spiritual-weapon-force-a");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const force = requireHole(
      act.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const forceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: force,
      positionId: forcePositionId,
    });
    const targetFill = spatialMeleeSpellAttackProxyTargetFill(
      target,
      spatialMeleeSpellAttackProxyUnitId,
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
            spatialMeleeSpellAttackProxyUnitId &&
          battleActSpellPresentation(candidate)?.invocation.procedure ===
            "spatialMeleeSpellAttackProxy",
      ),
    ).toBe(false);
  });

  test("later Bonus Action repositions the force and repeats the attack without another slot", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const casterBeforeCast = requireCombatant(session.state, spellCasterId);
    const unrelatedEffect = allocateBattleEffectOccurrenceForCreature({
      owner: casterBeforeCast,
      effect: {
        kind: "speedDelta",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-spiritual-weapon-composition",
        ),
        sourceCombatantId: spellCasterId,
        deltaFeet: movementDeltaFeet(10),
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
      },
    });
    const state: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...unrelatedEffect.owner,
        activeEffects: [
          ...casterBeforeCast.activeEffects,
          unrelatedEffect.effect,
        ],
      }),
    };
    const castAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      castTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
    const repeatReadyState = casterTurn.state;

    const repeatAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: repeatReadyState,
        context: session.context,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spatialMeleeSpellAttackProxyUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      repeatTarget,
      spatialMeleeSpellAttackProxyUnitId,
      spellCasterId,
      spellTargetId,
      movedForceId,
    );
    const overlongMove = resolveBattleSubject({
      state: repeatReadyState,
      subject: repeatAct.subject,
      fills: [
        spatialMeleeSpellAttackProxyPositionFill({
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
          ...repeatReadyState,
          currentTurnResources: {
            ...repeatReadyState.currentTurnResources,
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
    const unrelatedEffectBeforeRepeat = requireCombatant(
      repeatReadyState,
      spellCasterId,
    ).activeEffects.find(
      (effect) =>
        "sourceProcedureRef" in effect &&
        effect.sourceProcedureRef === unrelatedEffect.effect.sourceProcedureRef,
    );
    if (unrelatedEffectBeforeRepeat === undefined) {
      throw new Error(
        "Expected the unrelated effect before the repeat attack.",
      );
    }
    const repeated = resolveBattleSubject({
      state: repeatReadyState,
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
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spatialMeleeSpellAttackProxy",
          forcePositionId: movedForceId,
        }),
        unrelatedEffectBeforeRepeat,
      ]),
    );
  });

  test("later repeat remains available after a prior level 1+ slot spell on the same turn", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      castTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
          spatialMeleeSpellAttackProxyUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      repeatTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId: movedForceId,
      }),
    );
  });

  test("Shield replay repositions a repeated Spiritual Weapon once and leaves the completed subject stale", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(shieldUnitId)],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    });
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      castTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
          spatialMeleeSpellAttackProxyUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      repeatTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
    const repeatFills = [
      repeatForceFill,
      repeatTargetFill,
      attackRollFill(repeatAttackRoll, { total: 14, naturalD20: 10 }),
    ] as const;
    const awaitingShield = requireNeedsHoles(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: repeatFills,
      }),
    );
    expect(
      battleFrontierInterruptDecisionForState(awaitingShield.state),
    ).toMatchObject({
      trigger: "attackHit",
    });

    const choice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingShield,
      reactorId: spellTargetId,
      spellId: shieldUnitId,
      procedure: "triggeredArmorDefense",
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
        turn: { bonusActionQuotaAvailable: false },
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
        kind: "spatialMeleeSpellAttackProxy",
        forcePositionId: movedForceId,
      }),
    );
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: repeatAct.subject,
        fills: repeatFills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bonus Action spell is no longer available for the current actor.",
    });
  });

  test("sanctuary loss on repeat still repositions the Spiritual Weapon proxy", () => {
    const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
    const initialForceId = battleTablePositionId("spiritual-weapon-force-a");
    const movedForceId = battleTablePositionId("spiritual-weapon-force-b");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const castAct = bonusSpellAct({
      session,
      spellId: spatialMeleeSpellAttackProxyUnitId,
      slotLevel: 2,
    });
    const castForce = requireHole(
      castAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const castTarget = requireHole(castAct.initialHoles, "targetChoice");
    const castForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: castForce,
      positionId: initialForceId,
    });
    const castTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      castTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
          spatialMeleeSpellAttackProxyUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack act.");
    }
    const repeatForce = requireHole(
      repeatAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const repeatTarget = requireHole(repeatAct.initialHoles, "targetChoice");
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: movedForceId,
      moveDistanceFeet: 20,
    });
    const repeatTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      repeatTarget,
      spatialMeleeSpellAttackProxyUnitId,
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
          requireHole(needsSanctuary.holes, "targetingSaveInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionQuotaAvailable: false } },
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
        kind: "spatialMeleeSpellAttackProxy",
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
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;
function requireNeedsHoles(result: BattleResolutionResult): NeedsHolesResult {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected battle subject to need holes.");
  }
  return result;
}

function spellCastInterruptionReactionTriggerFact(input: {
  readonly reactorId: typeof spellTargetId;
  readonly casterId: typeof spellCasterId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}): CounterspellTriggerFact {
  return {
    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
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
  const choice = battleFrontierInterruptDecisionForState(
    input.result.state,
  )?.choices.find(
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
  hole: Extract<
    BattleHole,
    { readonly kind: "targetingSaveInterdictionOutcome" }
  >,
  value: Extract<
    BattleFill,
    { readonly kind: "targetingSaveInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "targetingSaveInterdictionOutcome" }> {
  return {
    kind: "targetingSaveInterdictionOutcome",
    holeId: hole.holeId,
    value,
  };
}

function withSanctuaryWard(
  state: BattleState,
  wardedId: typeof spellTargetId,
): BattleState {
  const warded = requireCombatant(state, wardedId);
  const ward = allocateBattleEffectOccurrenceForCreature({
    owner: warded,
    effect: {
      kind: "targetingSaveInterdiction",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("sanctuary"),
      ),
      sourceCombatantId: spellTargetId,
      save: { ability: "wis", dc: { kind: "fixed", dc: 13 } },
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(10),
      },
    },
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(wardedId, {
      ...ward.owner,
      activeEffects: [...warded.activeEffects, ward.effect],
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
        effect.kind === "spatialMeleeSpellAttackProxy"
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

function spatialMeleeSpellAttackProxyWithMismatchedRepeatDamage(): SpellRecord {
  const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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

function spatialMeleeSpellAttackProxyWithExtraLaterOperation(): SpellRecord {
  const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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

function spatialMeleeSpellAttackProxyWithExtraCompositeEffect(): SpellRecord {
  const spell = spellRecord(spatialMeleeSpellAttackProxyUnitId);
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
