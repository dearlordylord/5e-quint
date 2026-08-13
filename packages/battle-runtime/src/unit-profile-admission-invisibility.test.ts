import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-INVISIBILITY invisibility
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-direct-condition
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  blurUnitId,
  counterspellUnitId,
  invisibilityDurationTicks,
  invisibilityUnitId,
  magicMissileUnitId,
  shieldUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  characterCreature,
  requireCombatant,
  requireHole,
  requireResultHole,
  interruptDecisionFill,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellActInvocation,
  savingThrowOutcomeFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  applyBattleHitPointDamage,
  battleId,
  combatantId,
  Either,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  movementFeet,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
} from "./unit-profile-admission.test-support.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

describe("L12G-SPELL-INVISIBILITY deterministic Invisibility admission", () => {
  test("invisibility admits as a touch target-list condition spell with slot-scaled targets", () => {
    const extraTargetId = combatantId("unit-profile-invisibility-extra-target");
    const spell = spellRecord(invisibilityUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [extraTargetId],
    });
    const act = spellAct({
      session,
      spellId: invisibilityUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(invisibilityUnitId, 3, "directCondition"),
      ),
      mode: { tag: "cast" },
    });
    const state = session.state;
    expect(spellActInvocation(session, act)).toEqual(
      expect.objectContaining({
        procedure: "directCondition",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
        activeEffect: expect.objectContaining({
          kind: "targetActionEndedSpellCondition",
          sourceCombatantId: spellCasterId,
          condition: "invisible",
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: invisibilityDurationTicks,
          },
        }),
        rangeFeet: 5,
      }),
    );

    const targetList = requireHole(act.initialHoles, "spellTargetList");
    const cast = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(targetList, spellCasterId, invisibilityUnitId, [
            spellTargetId,
            extraTargetId,
          ]),
        ],
      }),
    );

    expectInvisibilityEffect(cast.state, spellTargetId);
    expectInvisibilityEffect(cast.state, extraTargetId);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });

    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: requireCombatant(cast.state, spellCasterId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellTargetId,
    });

    expectNoInvisibilityEffect(damaged, spellTargetId);
    expectNoInvisibilityEffect(damaged, extraTargetId);
    expect(requireCombatant(damaged, spellCasterId).concentration).toBeNull();
  });

  test("invisibility duration expiry removes the spell-owned condition and caster concentration", () => {
    const cast = castInvisibilityOnTargets(
      spellBattle({
        preparedSpells: [spellRecord(invisibilityUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      [spellTargetId],
    );

    const expiredCombatants = tickDurationEffects(
      combatantsWithInvisibilityDurationTicks(cast.state, [spellTargetId]),
    ).value;

    const expiredState = { ...cast.state, combatants: expiredCombatants };
    expectNoInvisibilityEffect(expiredState, spellTargetId);
    expect(expiredCombatants.get(spellCasterId)?.concentration).toBeNull();
  });

  test("recasting Invisibility replaces the same spell-owned condition effect", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(invisibilityUnitId)],
      spellSlots: [{ spellLevel: 2, count: 2 }],
    });
    const firstCast = castInvisibilityOnTargets(session, [spellTargetId]);
    const targetTurn = requireResolved(
      endTurn({ state: firstCast.state, actorId: spellCasterId }),
    );
    const casterTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    );
    const agedEffect = invisibilityEffects(casterTurn.state, spellTargetId)[0];
    if (agedEffect === undefined) {
      throw new Error("Expected aged Invisibility effect before recast.");
    }
    expect(agedEffect.expiresAt).toEqual({
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(Number(invisibilityDurationTicks) - 1),
    });
    const recast = castInvisibilityOnTargets(
      battleRuntimeSessionForTest({
        state: casterTurn.state,
        context: session.context,
      }),
      [spellTargetId],
    );

    expectInvisibilityEffect(recast.state, spellTargetId);
    const recastEffect = invisibilityEffects(recast.state, spellTargetId)[0];
    if (recastEffect === undefined) {
      throw new Error("Expected recast Invisibility effect.");
    }
    expect(requireCombatant(recast.state, spellCasterId).concentration).toEqual(
      {
        sourceProcedureRef: recastEffect.sourceProcedureRef,
        effectKind: "spellEffect",
      },
    );
  });

  test("invisibility ends immediately after the target makes an attack roll", () => {
    const attackerId = combatantId("unit-profile-invisibility-attacker");
    const session = spellBattle({
      preparedSpells: [spellRecord(invisibilityUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: attackerId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 19,
        },
      ],
    });
    const cast = castInvisibilityOnTargets(session, [attackerId]);
    expectInvisibilityEffect(cast.state, attackerId);

    const attackerTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const attack = statBlockAttackAct(
      battleRuntimeSessionForTest({
        state: attackerTurn.state,
        context: session.context,
      }),
      attackerId,
      "Scimitar",
    );
    const target = requireResultHole(
      resolveBattleSubject({
        state: attackerTurn.state,
        subject: attack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, attackerId, spellCasterId, [
      {
        kind: "attackTargetCannotSeeAttacker",
        attackerId,
        targetId: spellCasterId,
      },
    ]);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: attackerTurn.state,
        subject: attack.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    expect(roll.rollMode).toBe("advantage");

    const awaitingDamage = resolveBattleSubject({
      state: attackerTurn.state,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
      ],
    });

    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected attack damage after Invisibility attack roll.");
    }
    expectNoInvisibilityEffect(awaitingDamage.state, attackerId);
    expect(
      requireCombatant(awaitingDamage.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("invisibility ends immediately after the target casts a spell", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(invisibilityUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(blurUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = castInvisibilityOnTargets(session, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);

    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const blur = spellAct({
      session: battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      spellId: blurUnitId,
      slotLevel: 2,
    });
    const blurred = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: blur.subject,
        fills: [],
      }),
    );

    expectNoInvisibilityEffect(blurred.state, spellTargetId);
    expect(
      requireCombatant(blurred.state, spellCasterId).concentration,
    ).toBeNull();
    expect(requireCombatant(blurred.state, spellTargetId)).toEqual(
      expect.objectContaining({
        concentration: {
          sourceProcedureRef: blur.subject.procedureRef,
          effectKind: "spellEffect",
        },
        activeEffects: expect.arrayContaining([
          expect.objectContaining({
            kind: "blurred",
            sourceProcedureRef: blur.subject.procedureRef,
          }),
        ]),
      }),
    );
  });

  test("invisibility ends when the target casts a spell that is counterspelled", () => {
    const counterspellerId = combatantId(
      "unit-profile-invisibility-counterspeller",
    );
    const session = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(blurUnitId)],
      targetSpellSlots: [{ spellLevel: 2, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: counterspellerId,
          displayName: "Counterspeller",
          initiative: 5,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(counterspellUnitId)],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(session, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);

    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const blur = spellAct({
      session: battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
      spellId: blurUnitId,
      slotLevel: 2,
    });
    const awaitingCounterspell = requireNeedsHoles(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: blur.subject,
        fills: [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              session: battleRuntimeSessionForTest({
                state: targetTurn.state,
                context: session.context,
              }),
              reactorId: counterspellerId,
              casterId: spellTargetId,
            }),
          ]),
        ],
      }),
    );

    expectNoInvisibilityEffect(awaitingCounterspell.state, spellTargetId);
    expect(
      requireCombatant(awaitingCounterspell.state, spellCasterId).concentration,
    ).toBeNull();

    const choice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingCounterspell,
      reactorId: counterspellerId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const countered = requireResolved(
      resolveBattleInterrupt({
        state: awaitingCounterspell.state,
        fill: interruptDecisionFill(
          requireHole(awaitingCounterspell.holes, "interruptDecision"),
          triggeredReactionSpellDecision(counterspellerId, choice, [
            savingThrowOutcomeFill(save, [
              { targetId: spellTargetId, succeeded: false },
            ]),
          ]),
        ),
      }),
    );

    expectNoInvisibilityEffect(countered.state, spellTargetId);
    expect(
      requireCombatant(countered.state, spellTargetId).concentration,
    ).toBeNull();
  });

  test("invisibility ends when the target casts Shield as a reaction", () => {
    const magicMissileCasterId = combatantId(
      "unit-profile-invisibility-magic-missile-caster",
    );
    const session = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(shieldUnitId)],
      targetSpellSlots: [{ spellLevel: 1, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: magicMissileCasterId,
          displayName: "Magic Missile caster",
          initiative: 5,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(magicMissileUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(session, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const missileTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    );

    const magicMissile = spellAct({
      session: battleRuntimeSessionForTest({
        state: missileTurn.state,
        context: session.context,
      }),
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const targetAllocation = requireResultHole(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const awaitingShield = requireNeedsHoles(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [
          magicMissileTargetAllocationFill({
            hole: targetAllocation,
            procedureRef: magicMissile.subject.procedureRef,
            casterId: magicMissileCasterId,
            targetId: spellTargetId,
            dartCount: targetAllocation.allocationCount,
          }),
          spellCastReactionFactsFill([]),
        ],
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
    const afterShield = requireNeedsHoles(
      resolveBattleInterrupt({
        state: awaitingShield.state,
        fill: interruptDecisionFill(
          requireHole(awaitingShield.holes, "interruptDecision"),
          triggeredReactionSpellDecision(spellTargetId, choice, []),
        ),
      }),
    );

    expectNoInvisibilityEffect(afterShield.state, spellTargetId);
    expect(
      requireCombatant(afterShield.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(afterShield.state, spellTargetId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellArmorClassBonus",
          sourceProcedureRef: choice.subject.procedureRef,
        }),
      ]),
    );
  });

  test("invisibility ends when the target casts Counterspell as a reaction", () => {
    const magicMissileCasterId = combatantId(
      "unit-profile-invisibility-counterspell-trigger-caster",
    );
    const session = invisibilityReactionBattle({
      targetPreparedSpells: [spellRecord(counterspellUnitId)],
      targetSpellSlots: [{ spellLevel: 3, count: 1 }],
      extraCombatants: [
        characterCreature({
          combatantId: magicMissileCasterId,
          displayName: "Counterspell trigger caster",
          initiative: 5,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord(magicMissileUnitId)],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const cast = castInvisibilityOnTargets(session, [spellTargetId]);
    expectInvisibilityEffect(cast.state, spellTargetId);
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const missileTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    );

    const magicMissile = spellAct({
      session: battleRuntimeSessionForTest({
        state: missileTurn.state,
        context: session.context,
      }),
      spellId: magicMissileUnitId,
      slotLevel: 1,
    });
    const targetAllocation = requireResultHole(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const awaitingCounterspell = requireNeedsHoles(
      resolveBattleSubject({
        state: missileTurn.state,
        subject: magicMissile.subject,
        fills: [
          magicMissileTargetAllocationFill({
            hole: targetAllocation,
            procedureRef: magicMissile.subject.procedureRef,
            casterId: magicMissileCasterId,
            targetId: spellCasterId,
            dartCount: targetAllocation.allocationCount,
          }),
          spellCastReactionFactsFill([
            counterspellTriggerFact({
              session: battleRuntimeSessionForTest({
                state: missileTurn.state,
                context: session.context,
              }),
              reactorId: spellTargetId,
              casterId: magicMissileCasterId,
            }),
          ]),
        ],
      }),
    );
    const choice = requireTriggeredReactionSpellChoice({
      session,
      result: awaitingCounterspell,
      reactorId: spellTargetId,
      spellId: counterspellUnitId,
      procedure: "counterspell",
      slotLevel: 3,
    });
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const countered = requireResolved(
      resolveBattleInterrupt({
        state: awaitingCounterspell.state,
        fill: interruptDecisionFill(
          requireHole(awaitingCounterspell.holes, "interruptDecision"),
          triggeredReactionSpellDecision(spellTargetId, choice, [
            savingThrowOutcomeFill(save, [
              { targetId: magicMissileCasterId, succeeded: false },
            ]),
          ]),
        ),
      }),
    );

    expectNoInvisibilityEffect(countered.state, spellTargetId);
    expect(
      requireCombatant(countered.state, spellCasterId).concentration,
    ).toBeNull();
  });
});

function castInvisibilityOnTargets(
  session: BattleRuntimeSession,
  targetIds: readonly CombatantId[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const act = spellAct({
    session,
    spellId: invisibilityUnitId,
    slotLevel: 2,
  });
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  return requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetList,
          spellCasterId,
          invisibilityUnitId,
          targetIds,
        ),
      ],
    }),
  );
}

type CharacterSpellcastingInit = NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
>;

function wizardSpellcasting(input: {
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: CharacterSpellcastingInit["spellSlots"];
}): CharacterSpellcastingInit {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: input.preparedSpells,
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: input.spellSlots,
  };
}

function invisibilityReactionBattle(input: {
  readonly targetPreparedSpells: readonly SpellRecord[];
  readonly targetSpellSlots: CharacterSpellcastingInit["spellSlots"];
  readonly extraCombatants: readonly BattleCreatureInit[];
}): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("unit-profile-invisibility-reactions"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Invisibility caster",
        initiative: 30,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(invisibilityUnitId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Invisible spell target",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: input.targetPreparedSpells,
          spellSlots: input.targetSpellSlots,
        }),
      }),
      ...input.extraCombatants,
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

function requireNeedsHoles(result: BattleResolutionResult): NeedsHolesResult {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected battle subject to need holes.");
  }
  return result;
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(input: {
  readonly session: BattleRuntimeSession;
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      input.session,
      input.reactorId,
      spellSlotInvocationRef(counterspellUnitId, 3, "counterspell"),
    ),
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
  readonly session: BattleRuntimeSession;
  readonly result: NeedsHolesResult;
  readonly reactorId: CombatantId;
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
          state: input.result.state,
          context: input.session.context,
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
  reactorId: CombatantId,
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

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: {
      allocations: [{ targetId: input.targetId, count: input.dartCount }],
    },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.casterId,
        targetId: input.targetId,
        sourceProcedureRef: input.procedureRef,
      },
    ],
  };
}

function expectInvisibilityEffect(
  state: BattleState,
  targetId: CombatantId,
): void {
  const target = requireCombatant(state, targetId);
  expect(hasCondition(target.conditions, "invisible")).toBe(true);
  expect(invisibilityEffects(state, targetId)).toEqual([
    expect.objectContaining({
      kind: "targetActionEndedSpellCondition",
      sourceCombatantId: spellCasterId,
      condition: "invisible",
      conditionHadNonSpellSource: false,
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: invisibilityDurationTicks,
      },
    }),
  ]);
}

function expectNoInvisibilityEffect(
  state: BattleState,
  targetId: CombatantId,
): void {
  const target = requireCombatant(state, targetId);
  expect(hasCondition(target.conditions, "invisible")).toBe(false);
  expect(invisibilityEffects(state, targetId)).toEqual([]);
}

function invisibilityEffects(
  state: BattleState,
  targetId: CombatantId,
): readonly Extract<
  BattleActiveEffect,
  { readonly kind: "targetActionEndedSpellCondition" }
>[] {
  return requireCombatant(state, targetId).activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "targetActionEndedSpellCondition" }
    > =>
      effect.kind === "targetActionEndedSpellCondition" &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function combatantsWithInvisibilityDurationTicks(
  state: BattleState,
  targetIds: readonly CombatantId[],
): BattleState["combatants"] {
  return targetIds.reduce((combatants, targetId) => {
    const target = requireCombatant({ ...state, combatants }, targetId);
    return new Map(combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "targetActionEndedSpellCondition" &&
        effect.sourceCombatantId === spellCasterId
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    });
  }, state.combatants);
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected battle subject to resolve.");
  }
  return result;
}
