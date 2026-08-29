import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  Hp,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import type {
  BattleExecutableSpellInvocation,
  BattleFill,
  BattleMovementFillValue,
  BattleSpellSavingThrowOutcomeValue,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import { battleObjectId, combatantId, type CombatantId } from "./identity.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  FRENZY_DAMAGE_TYPE_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_ID,
} from "./battle-reducer/battle-runtime-protocol.ts";
import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
  CUNNING_STRIKE_END_TURN_COVER_HOLE_ID,
  CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID,
  HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
  BRUTAL_STRIKE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
} from "./battle-reducer/domain-constants.ts";
import { SEEKING_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import { attackFillSet } from "./battle-reducer/attack-fill-set.ts";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import {
  saveMetamagicSelectionState,
  validateSavingThrowOutcomes,
} from "./battle-reducer/spells-resolve-save-gates.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import {
  attackRollFill,
  battleId,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterSeed,
  damageRollFillWithGroups,
  fighterId,
  fighterVsGoblinBattle,
  requireHole,
  requireCharacterUnitProcedureRefForTest,
  requireResolved,
  resolveBattleSubject,
  rageResource,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import {
  baneUnitId,
  burningHandsUnitId,
  dissonantWhispersUnitId,
  faerieFireUnitId,
  greaseUnitId,
  holdPersonUnitId,
  rayOfFrostUnitId,
  sleepUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

const wrongHoleId = ATTACK_TARGET_HOLE_ID;
const foreignCombatantId = combatantId("spell-complexity-foreign");

type SavingThrowValue = BattleSpellSavingThrowOutcomeValue;
type SavingThrowInvocation = Parameters<typeof validateSavingThrowOutcomes>[1];
type SaveMetamagicInvocation = Parameters<
  typeof saveMetamagicSelectionState
>[0]["invocation"];
type SpellAct = ReturnType<typeof spellAct>;

function saveOutcome(targetId: CombatantId, succeeded = false) {
  return { targetId, succeeded } as const;
}

function supportedInvocationForAct(
  session: ReturnType<typeof spellBattle>,
  act: SpellAct,
): BattleExecutableSpellInvocation {
  const actor = session.state.combatants.get(act.subject.actorId);
  if (actor === undefined) {
    throw new Error("Expected the spell actor in the battle.");
  }
  const invocation = supportedSpellActs(session.state, actor).find(
    (candidate) => candidate.sourceProcedureRef === act.subject.procedureRef,
  );
  if (invocation === undefined) {
    throw new Error(
      "Expected a supported invocation for the discovered spell act.",
    );
  }
  return invocation;
}

function isSavingThrowInvocation(
  invocation: BattleExecutableSpellInvocation,
): invocation is SavingThrowInvocation {
  switch (invocation.procedure) {
    case "attackBurstSaveDamage":
    case "abilityD20TestRollModeSaveGate":
    case "afterHitSaveGatedCondition":
    case "rollModifier":
    case "creatureSizeIncrease":
    case "creatureSizeDecrease":
    case "controlledVerticalSuspension":
    case "saveGatedDamage":
    case "saveGatedCondition":
    case "saveGatedConditionImmunity":
    case "saveGatedAttackRollAdvantage":
    case "spellCastInterruptionReaction":
    case "stagedSaveCondition":
    case "saveGatedConditionWithRepeat":
    case "saveGatedAreaControl":
    case "saveGatedTurnConstraintBundle":
    case "command":
    case "persistentAreaSaveCondition":
    case "directionalPersistentArea":
      return true;
  }
  return false;
}

function savingThrowInvocationForAct(
  session: ReturnType<typeof spellBattle>,
  act: SpellAct,
): SavingThrowInvocation {
  const invocation = supportedInvocationForAct(session, act);
  if (!isSavingThrowInvocation(invocation)) {
    throw new Error(
      "Expected the discovered spell act to use a save-gate procedure.",
    );
  }
  return invocation;
}

function isSaveMetamagicInvocation(
  invocation: BattleExecutableSpellInvocation,
): invocation is SaveMetamagicInvocation {
  switch (invocation.procedure) {
    case "saveGatedDamage":
    case "saveGatedCondition":
    case "saveGatedConditionImmunity":
    case "saveGatedAttackRollAdvantage":
    case "saveGatedConditionWithRepeat":
    case "saveGatedAreaControl":
    case "saveGatedTurnConstraintBundle":
    case "command":
    case "persistentAreaSaveCondition":
    case "directionalPersistentArea":
      return true;
  }
  return false;
}

function saveMetamagicInvocationForAct(
  session: ReturnType<typeof spellBattle>,
  act: SpellAct,
): SaveMetamagicInvocation {
  const invocation = supportedInvocationForAct(session, act);
  if (!isSaveMetamagicInvocation(invocation)) {
    throw new Error(
      "Expected the discovered spell act to support save Metamagic.",
    );
  }
  return invocation;
}

function spellValidationFixture(
  unitId: string,
  slotLevel: 1 | 2 | 3,
  extraTargetIds: readonly CombatantId[] = [],
) {
  const session = spellBattle({
    preparedSpells: [spellRecord(unitId)],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
    extraTargetIds,
  });
  const act = spellAct({ session, spellId: unitId, slotLevel });
  return {
    session,
    act,
    invocation: savingThrowInvocationForAct(session, act),
  };
}

function attackObjectTargetFill(
  objectId = battleObjectId("spell-complexity-object"),
): Extract<BattleFill, { readonly kind: "objectTargetChoice" }> {
  const spatialFact: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "attackObjectTarget" }
  > = {
    kind: "attackObjectTarget",
    actorId: fighterId,
    objectId,
    range: { kind: "meleeReach" },
    attackerCanSeeObject: true,
    cover: "none",
    armorClass: armorClass(15),
    damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
  };
  return {
    kind: "objectTargetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    value: objectId,
    spatialFacts: [spatialFact],
  };
}

function malformedMovementFill(
  holeId: Extract<BattleFill, { readonly kind: "movement" }>["holeId"],
  value: BattleMovementFillValue = {
    speedKind: "walk",
    movementCostFeet: movementFeet(0),
    provokedOpportunityAttacks: [],
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return { kind: "movement", holeId, value };
}

function malformedAttackRollFill(
  holeId: Extract<BattleFill, { readonly kind: "attackRoll" }>["holeId"],
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId,
    value: { total: 10, naturalD20: DieRollResult(10) },
  };
}

function malformedSavingThrowFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId,
    value: { outcomes: [] },
  };
}

function malformedConcentrationFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }> {
  return {
    kind: "concentrationSavingThrow",
    holeId,
    value: { succeeded: true, withoutRoll: true },
  };
}

function malformedUnitDecisionFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "unitFeatureDecision" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return { kind: "unitFeatureDecision", holeId, value: "decline" };
}

function malformedTargetChoiceFill(
  holeId: Extract<BattleFill, { readonly kind: "targetChoice" }>["holeId"],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return { kind: "targetChoice", holeId, value: foreignCombatantId };
}

function malformedAttackDamageDispositionFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId,
    value: { kind: "ordinaryDamage" },
  };
}

function malformedDamageTypeChoiceFill(
  holeId: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["holeId"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId, value: "acid" };
}

function malformedToolPossessionFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "toolPossessionFacts" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "toolPossessionFacts" }> {
  return {
    kind: "toolPossessionFacts",
    holeId,
    value: { toolIdsOnPerson: [] },
  };
}

function malformedEndTurnCoverFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "cunningStrikeEndTurnCoverFacts" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }> {
  return {
    kind: "cunningStrikeEndTurnCoverFacts",
    holeId,
    value: { cover: "half" },
  };
}

function malformedGrappleOutcomeFill(
  holeId: Extract<BattleFill, { readonly kind: "grappleOutcome" }>["holeId"],
): Extract<BattleFill, { readonly kind: "grappleOutcome" }> {
  return { kind: "grappleOutcome", holeId, value: { succeeded: true } };
}

function malformedTargetSpatialFactsFill(
  holeId: Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["holeId"],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return { kind: "targetSpatialFacts", holeId, spatialFacts: [] };
}

function forcefulBlowMovementFill(
  targetId: CombatantId = combatantId("spell-complexity-forceful-target"),
): Extract<BattleFill, { readonly kind: "movement" }> {
  const value: Extract<BattleFill, { readonly kind: "movement" }>["value"] = {
    speedKind: "walk",
    movementCostFeet: movementFeet(0),
    provokedOpportunityAttacks: [],
    additionalSpeedSegments: [],
    brutalStrikeForcefulBlow: {
      kind: "brutalStrikeForcefulBlowStraightTowardTarget",
      targetId,
    },
  };
  return {
    kind: "movement",
    holeId: BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID,
    value,
  };
}

function redirectTargetChoiceWithRelationshipFacts(): Extract<
  BattleFill,
  { readonly kind: "targetChoice" }
> {
  return {
    ...malformedTargetChoiceFill(
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
    ),
    relationshipFacts: [
      {
        kind: "attackRollTargetIsEnemy" as const,
        attackerId: fighterId,
        targetId: foreignCombatantId,
        targetIsEnemy: true,
      },
    ],
  };
}

function objectTargetWithNonObjectSpatialFact(): Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
> {
  return {
    ...attackObjectTargetFill(),
    spatialFacts: [
      {
        kind: "spellObjectTarget" as const,
        casterId: fighterId,
        objectId: battleObjectId("spell-complexity-object-target-other"),
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "spell-complexity-object-target",
        ),
        rangeFeet: movementFeet(30),
        armorClass: armorClass(15),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
      },
    ],
  };
}

function battleWithRequiredAttackRelationshipFacts() {
  const session = startBattleSessionRight({
    battleId: battleId("battle-spell-complexity-relationship-frontier"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 1 }],
        resources: [rageResource()],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const raging = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "barbarian_rage",
        ),
      },
      fills: [],
    }),
  );
  return raging.state;
}

describe("battle replay and spell route frontiers", () => {
  test("rejects object-only attacks when creature fills are present", () => {
    const state = fighterVsGoblinBattle();
    const objectTarget = attackObjectTargetFill();

    expect(attackFillSet([objectTarget], fighterId, state)).toEqual({
      tag: "invalid",
      message: "This attack procedure does not accept an object target.",
    });
    expect(
      attackFillSet(
        [objectTarget, malformedAttackRollFill(ATTACK_ROLL_HOLE_ID)],
        fighterId,
        state,
      ),
    ).toMatchObject({ tag: "invalid" });
    expect(
      attackFillSet(
        [objectTarget, malformedTargetSpatialFactsFill(wrongHoleId)],
        fighterId,
        state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("targetSpatialFacts"),
    });
  });

  test("rejects malformed attack fill kinds at their public parser boundary", () => {
    const state = fighterVsGoblinBattle();
    const cases: readonly [BattleFill, string][] = [
      [
        malformedUnitDecisionFill(ATTACK_TARGET_HOLE_ID),
        "Unit feature decision fill uses an unexpected Attack hole.",
      ],
      [
        malformedMovementFill(ATTACK_TARGET_HOLE_ID),
        "Movement fill uses an unexpected Attack hole.",
      ],
      [
        malformedTargetChoiceFill(FRENZY_DAMAGE_TYPE_HOLE_ID),
        "Target choice fill uses an unexpected Attack hole.",
      ],
      [
        malformedAttackRollFill(ATTACK_TARGET_HOLE_ID),
        "Attack roll fill uses an unexpected Attack hole.",
      ],
      [
        malformedSavingThrowFill(ATTACK_TARGET_HOLE_ID),
        "Saving throw fill uses an unexpected Attack hole.",
      ],
      [
        malformedAttackDamageDispositionFill(ATTACK_TARGET_HOLE_ID),
        "Attack damage disposition fill uses the wrong hole.",
      ],
      [
        malformedDamageTypeChoiceFill(ATTACK_TARGET_HOLE_ID),
        "Damage type choice fill uses an unexpected Attack hole.",
      ],
      [
        malformedToolPossessionFill(ATTACK_TARGET_HOLE_ID),
        "Tool-possession fill uses an unexpected Attack hole.",
      ],
      [
        malformedEndTurnCoverFill(ATTACK_TARGET_HOLE_ID),
        "Cunning Strike end-turn cover facts use an unexpected Attack hole.",
      ],
      [
        malformedGrappleOutcomeFill(ATTACK_TARGET_HOLE_ID),
        "Grapple outcome fill uses an unexpected Attack hole.",
      ],
    ];

    for (const [fill, message] of cases) {
      expect(attackFillSet([fill], fighterId, state)).toEqual({
        tag: "invalid",
        message,
      });
    }
  });

  test("rejects duplicate and contradictory attack target facts", () => {
    const state = fighterVsGoblinBattle();
    const objectTarget = attackObjectTargetFill();
    expect(
      attackFillSet([objectTarget, objectTarget], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Attack target was filled twice.",
    });

    const target = malformedTargetChoiceFill(ATTACK_TARGET_HOLE_ID);
    expect(attackFillSet([target, target], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Attack target was filled twice.",
    });

    const spatialFacts = malformedTargetSpatialFactsFill(ATTACK_TARGET_HOLE_ID);
    expect(
      attackFillSet([spatialFacts, spatialFacts], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Attack target spatial facts were filled twice.",
    });

    const concentration = malformedConcentrationFill(ATTACK_TARGET_HOLE_ID);
    expect(
      attackFillSet([concentration, concentration], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Concentration Saving Throw hole was filled twice.",
    });
  });

  test("rejects duplicate feature and special-purpose fills", () => {
    const state = fighterVsGoblinBattle();
    const decision = malformedUnitDecisionFill(BRUTAL_STRIKE_DECISION_HOLE_ID);
    expect(attackFillSet([decision, decision], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Brutal Strike decision was filled twice.",
    });

    const tool = malformedToolPossessionFill(
      CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID,
    );
    expect(attackFillSet([tool, tool], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Cunning Strike tool-possession facts were filled twice.",
    });

    const cover = malformedEndTurnCoverFill(
      CUNNING_STRIKE_END_TURN_COVER_HOLE_ID,
    );
    expect(attackFillSet([cover, cover], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Cunning Strike end-turn cover facts were filled twice.",
    });

    const openHand = malformedUnitDecisionFill(
      OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
    );
    expect(attackFillSet([openHand, openHand], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Open Hand Technique decision was filled twice.",
    });

    const grapple = malformedGrappleOutcomeFill(GRAPPLE_OUTCOME_HOLE_ID);
    expect(attackFillSet([grapple, grapple], fighterId, state)).toEqual({
      tag: "invalid",
      message: "Grappler Punch and Grab outcome was filled twice.",
    });
  });

  test("rejects special attack parser duplicate and contradiction frontiers", () => {
    const state = fighterVsGoblinBattle();

    const forcefulMovement = forcefulBlowMovementFill();
    expect(
      attackFillSet([forcefulMovement, forcefulMovement], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Brutal Strike Forceful Blow movement was filled twice.",
    });

    const targetSpatialFacts = malformedTargetSpatialFactsFill(
      ATTACK_TARGET_HOLE_ID,
    );
    const primaryTarget = malformedTargetChoiceFill(ATTACK_TARGET_HOLE_ID);
    expect(
      attackFillSet([targetSpatialFacts, primaryTarget], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Attack target spatial facts were filled twice.",
    });

    expect(
      attackFillSet(
        [redirectTargetChoiceWithRelationshipFacts()],
        fighterId,
        battleWithRequiredAttackRelationshipFacts(),
      ),
    ).toEqual({
      tag: "invalid",
      message:
        "Attack damage redirect target relationship facts do not match a requested target decision.",
    });

    expect(
      attackFillSet([objectTargetWithNonObjectSpatialFact()], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Ordinary object attacks require object attack table facts.",
    });

    const saveGatedConditionWithRepeatRepeat = malformedSavingThrowFill(
      holeId(`${HIDEOUS_LAUGHTER_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX}synthetic`),
    );
    expect(
      attackFillSet(
        [
          saveGatedConditionWithRepeatRepeat,
          saveGatedConditionWithRepeatRepeat,
        ],
        fighterId,
        state,
      ),
    ).toEqual({
      tag: "invalid",
      message: "Hideous Laughter damage repeat save was filled twice.",
    });

    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "spell-complexity-source-penalty",
    );
    const allocatedSourcePenalty =
      battleStateWithAllocatedEffectOccurrencesForTest({
        state,
        occurrences: [
          {
            kind: "activeEffect",
            ownerId: fighterId,
            effect: {
              kind: "sourceDamageRollPenalty",
              sourceProcedureRef,
              sourceCombatantId: fighterId,
              amount: { dice: 1, dieSize: 8 },
              expiresAt: { kind: "concentration", combatantId: fighterId },
            },
          },
        ],
      });
    const sourcePenaltyOccurrence = allocatedSourcePenalty.occurrences[0];
    if (
      sourcePenaltyOccurrence?.kind !== "activeEffect" ||
      sourcePenaltyOccurrence.effect.kind !== "sourceDamageRollPenalty"
    ) {
      throw new Error("Expected allocated source damage roll penalty.");
    }
    const sourcePenaltyHole = sourceDamageRollPenaltyRollHole({
      effectRef: sourcePenaltyOccurrence.effect.effectRef,
      sourceProcedureRef,
      sourceCombatantId: fighterId,
      affectedCombatantId: fighterId,
      damageRollHoleId: holeId("battle:spell-complexity:damage"),
      amount: { dice: 1, dieSize: 8 },
    });
    const sourcePenalty = damageRollFillWithGroups(sourcePenaltyHole, [[1]]);
    expect(
      attackFillSet([sourcePenalty, sourcePenalty], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Source damage roll penalty was filled twice.",
    });

    const cleaveDisposition = malformedAttackDamageDispositionFill(
      WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
    );
    expect(
      attackFillSet([cleaveDisposition, cleaveDisposition], fighterId, state),
    ).toEqual({
      tag: "invalid",
      message: "Weapon Mastery Cleave damage disposition was filled twice.",
    });

    const huntersPreyDisposition = malformedAttackDamageDispositionFill(
      HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
    );
    expect(
      attackFillSet(
        [huntersPreyDisposition, huntersPreyDisposition],
        fighterId,
        state,
      ),
    ).toEqual({
      tag: "invalid",
      message:
        "Hunter's Prey Horde Breaker damage disposition was filled twice.",
    });
  });
});

describe("public spell-resolution frontiers", () => {
  test("offers Seeking Spell after a missed single-target cantrip attack", () => {
    const session = spellBattle({
      cantrips: [spellRecord(rayOfFrostUnitId)],
      casterClassLevels: [{ className: "sorcerer", level: 5 }],
      casterSpellcastingSourceClassName: "sorcerer",
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(4),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [
          {
            effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            stackingMode: "can_combine_with_different_metamagic",
            sorceryPointCost: resourceCount(1),
          },
        ],
      },
    });
    const act = spellAct({ session, spellId: rayOfFrostUnitId });
    const targetHole = act.initialHoles.find(
      (
        hole,
      ): hole is Extract<
        (typeof act.initialHoles)[number],
        { readonly kind: "targetChoice" }
      > => hole.kind === "targetChoice",
    );
    expect(targetHole).toBeDefined();
    if (targetHole === undefined) return;
    const target = spellTargetFill(
      targetHole,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackHole = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [target],
      }),
      "attackRoll",
    );
    const afterMiss = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target, attackRollFill(attackHole, { total: 5, naturalD20: 2 })],
    });

    expect(afterMiss.tag).toBe("needsHoles");
    expect(afterMiss.tag === "needsHoles" ? afterMiss.holes : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "attackRoll",
          spellAttackRerolls: [
            expect.objectContaining({
              effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
              label: "Seeking Spell",
              sorceryPointCost: resourceCount(1),
            }),
          ],
        }),
      ]),
    );

    const seekingHole = requireHole(afterMiss, "attackRoll");
    const continued = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        target,
        attackRollFill(seekingHole, {
          total: 5,
          naturalD20: 2,
          activatedOngoingFeatureProcedureRef:
            battleProcedureExecutionRefForTest(
              "spell-complexity-activated-feature",
            ),
          spellAttackReroll: {
            kind: "reroll",
            effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            replacement: { total: 20, naturalD20: DieRollResult(15) },
          },
        }),
      ],
    });
    expect(requireHole(continued, "rolledDice").kind).toBe("rolledDice");
  });
});

describe("save-gate outcome validation frontiers", () => {
  test("validates roll-modifier lists before the normal fill adapter", () => {
    const secondTargetId = combatantId("spell-complexity-bane-second");
    const thirdTargetId = combatantId("spell-complexity-bane-third");
    const fixture = spellValidationFixture(baneUnitId, 1, [
      secondTargetId,
      thirdTargetId,
    ]);

    const validate = (
      value: SavingThrowValue,
      targetListIds: readonly CombatantId[] = [
        spellTargetId,
        secondTargetId,
        thirdTargetId,
      ],
    ) =>
      validateSavingThrowOutcomes(
        value,
        fixture.invocation,
        fixture.session.state,
        spellCasterId,
        undefined,
        targetListIds,
      );

    expect(validate({ outcomes: [] })).toContain("at least one");
    expect(
      validate({
        area: {
          originAnchorId: spellCasterId,
          affectedTargetIds: [spellTargetId],
        },
        outcomes: [saveOutcome(spellTargetId)],
      }),
    ).toContain("must not include area facts");
    expect(
      validate({
        outcomes: [saveOutcome(foreignCombatantId)],
      }),
    ).toContain("must be a combatant");
    expect(
      validate({
        outcomes: [saveOutcome(spellTargetId), saveOutcome(spellTargetId)],
      }),
    ).toContain("must not duplicate");
    expect(
      validate(
        {
          outcomes: [
            saveOutcome(spellTargetId),
            saveOutcome(secondTargetId),
            saveOutcome(thirdTargetId),
            saveOutcome(spellCasterId),
          ],
        },
        [spellTargetId, secondTargetId, thirdTargetId, spellCasterId],
      ),
    ).toContain("exceed");
  });

  test("validates single-target and target-list outcomes independently", () => {
    const single = spellValidationFixture(dissonantWhispersUnitId, 1);
    const singleValue: SavingThrowValue = {
      outcomes: [saveOutcome(spellTargetId)],
    };
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [] },
        single.invocation,
        single.session.state,
        spellCasterId,
        spellTargetId,
      ),
    ).toContain("at least one");
    expect(
      validateSavingThrowOutcomes(
        {
          area: {
            originAnchorId: spellCasterId,
            affectedTargetIds: [spellTargetId],
          },
          outcomes: [saveOutcome(spellTargetId)],
        },
        single.invocation,
        single.session.state,
        spellCasterId,
        spellTargetId,
      ),
    ).toContain("must not include area");
    expect(
      validateSavingThrowOutcomes(
        singleValue,
        single.invocation,
        single.session.state,
        spellCasterId,
        undefined,
      ),
    ).toContain("requires one target");
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [saveOutcome(foreignCombatantId)] },
        single.invocation,
        single.session.state,
        spellCasterId,
        foreignCombatantId,
      ),
    ).toContain("must be a combatant");
    expect(
      validateSavingThrowOutcomes(
        singleValue,
        single.invocation,
        single.session.state,
        spellCasterId,
        spellTargetId,
      ),
    ).toBeNull();

    const secondTargetId = combatantId("spell-complexity-hold-second");
    const list = spellValidationFixture(holdPersonUnitId, 3, [secondTargetId]);
    const listValue: SavingThrowValue = {
      outcomes: [saveOutcome(spellTargetId)],
    };
    expect(
      validateSavingThrowOutcomes(
        listValue,
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
      ),
    ).toContain("requires target choices");
    expect(
      validateSavingThrowOutcomes(
        {
          area: {
            originAnchorId: spellCasterId,
            affectedTargetIds: [spellTargetId],
          },
          outcomes: [saveOutcome(spellTargetId)],
        },
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [spellTargetId],
      ),
    ).toContain("must not include area");
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [] },
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [spellTargetId],
      ),
    ).toContain("at least one");
    expect(
      validateSavingThrowOutcomes(
        listValue,
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [],
      ),
    ).toContain("outside");
    expect(
      validateSavingThrowOutcomes(
        {
          outcomes: [saveOutcome(spellTargetId), saveOutcome(secondTargetId)],
        },
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [spellTargetId],
      ),
    ).toContain("exceed");
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [saveOutcome(foreignCombatantId)] },
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [foreignCombatantId],
      ),
    ).toContain("must be a combatant");
    expect(
      validateSavingThrowOutcomes(
        {
          outcomes: [saveOutcome(spellTargetId), saveOutcome(spellTargetId)],
        },
        list.invocation,
        list.session.state,
        spellCasterId,
        undefined,
        [spellTargetId, secondTargetId],
      ),
    ).toContain("must not duplicate");
  });

  test("validates area, Sleep, Grease, and Metamagic frontier facts directly", () => {
    const areaFixture = spellValidationFixture(faerieFireUnitId, 1);
    expect(
      validateSavingThrowOutcomes(
        {
          area: {
            kind: "saveGatedTargetProjectionArea",
            originAnchorId: spellCasterId,
            affectedTargetIds: [spellTargetId],
            affectedObjectIds: [],
          },
          outcomes: [saveOutcome(spellTargetId, true)],
        },
        areaFixture.invocation,
        areaFixture.session.state,
        spellCasterId,
        undefined,
      ),
    ).toBeNull();

    const sleep = spellValidationFixture(sleepUnitId, 1);
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [saveOutcome(spellTargetId)] },
        sleep.invocation,
        sleep.session.state,
        spellCasterId,
        undefined,
      ),
    ).toContain("point-origin Sphere");

    const grease = spellValidationFixture(greaseUnitId, 1);
    expect(
      validateSavingThrowOutcomes(
        { outcomes: [saveOutcome(spellTargetId)] },
        grease.invocation,
        grease.session.state,
        spellCasterId,
        undefined,
      ),
    ).toContain("ground-area facts");

    const burningHands = spellValidationFixture(burningHandsUnitId, 1);
    const burningHandsInvocation = saveMetamagicInvocationForAct(
      burningHands.session,
      burningHands.act,
    );
    const careful = {
      effectKind: "saving_throw_protection" as const,
      stackingMode: "one_per_spell" as const,
      sorceryPointCost: resourceCount(1),
    };
    const heightened = {
      effectKind: "saving_throw_disadvantage" as const,
      stackingMode: "one_per_spell" as const,
      sorceryPointCost: resourceCount(2),
    };
    expect(
      saveMetamagicSelectionState({
        state: burningHands.session.state,
        actorId: spellCasterId,
        invocation: burningHandsInvocation,
        fills: [],
        metamagicApplications: undefined,
        targetId: undefined,
      }),
    ).toEqual({
      tag: "ok",
      carefulSpellProtectedTargetIds: [],
      heightenedSpellTargetId: undefined,
    });
    expect(
      saveMetamagicSelectionState({
        state: burningHands.session.state,
        actorId: spellCasterId,
        invocation: burningHandsInvocation,
        fills: [],
        metamagicApplications: [careful],
        targetId: undefined,
      }),
    ).toMatchObject({ tag: "needsHoles" });
    expect(
      saveMetamagicSelectionState({
        state: burningHands.session.state,
        actorId: spellCasterId,
        invocation: burningHandsInvocation,
        fills: [],
        metamagicApplications: [heightened],
        targetId: undefined,
      }),
    ).toMatchObject({ tag: "needsHoles" });
  });
});
