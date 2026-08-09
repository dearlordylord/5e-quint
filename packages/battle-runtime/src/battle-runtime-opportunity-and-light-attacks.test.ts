import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { Either, Schema } from "effect";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import {
  BattleInterruptProcedureChoiceSchema,
  BattleSnapshotSchema,
} from "./index.ts";
import {
  characterBattleFeatureInitForTest,
  startBattleRight,
  startBattleSessionRight,
  requireResolved,
  fighterVsGoblinBattle,
  fighterAttackSubject,
  attackExecutionSelectionForSubjectForTest,
  characterBonusAttackSubjectForTest,
  criticalRange19UnitRefs,
  goblinAttackSubject,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  interruptDecisionFill,
  movementFill,
  monsterResourceStatBlock,
  statBlockRecord,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionFill,
  rolledDiceGroup,
  characterSeed,
  testDaggerAttack,
  testShortswordAttack,
  statBlockCreatureInit,
  reactionModifierUnitRef,
  cuttingWordsResource,
  reactionModifierChoice,
  reactionChoiceWithSubject,
  opportunityAttackProcedureSelectionForTest,
  uncannyDodgeUnit,
  cuttingWordsDamageOnlyUnit,
  fighterId,
  goblinId,
  battleId,
  combatantId,
  difficultyClass,
  discoverBattleActs,
  endTurn,
  fighterTurnWithReadiedRay,
  resolveBattleInterrupt,
  resolveBattleSubject,
  wizardId,
} from "./battle-runtime.test-support.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { resolvedAnimalFriendshipState } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  requireSpellDamageReductionHole,
  withResistanceEffect,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import type {
  BattleState,
  BattleSubject,
  CombatantId,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { classLevel, DieRollResult } from "@dnd/shared/types";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import { BattleStatBlockProcedureExecutionRef } from "./identity.ts";
import { D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND } from "./battle-state-execution.ts";
import {
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

function goblinOpportunityAttackThreat(state: BattleState) {
  const subject = goblinAttackSubject(state, "Scimitar");
  return {
    reactorId: goblinId,
    ...attackExecutionSelectionForSubjectForTest(subject),
  };
}

function fighterUnarmedOpportunityAttackThreat(state: BattleState) {
  const subject = fighterAttackSubject(state, "Unarmed Strike");
  return {
    reactorId: fighterId,
    ...attackExecutionSelectionForSubjectForTest(subject),
  };
}

function goblinMeleeOpportunityAttackThreatFromExecution(state: BattleState) {
  const goblin = state.combatants.get(goblinId);
  if (goblin?.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block reactor.");
  }
  const attack = statBlockAttackActionOptions(goblin.origin.execution).find(
    (candidate) =>
      candidate.damageNotation === "rolled" &&
      candidate.attack.attackType === "melee",
  );
  if (attack === undefined) {
    throw new Error("Expected the Animal Friendship reactor's melee attack.");
  }
  return { reactorId: goblinId, procedureRef: attack.procedureRef };
}

type OpportunityAttackThreat = Parameters<
  typeof movementFill
>[1]["provokedOpportunityAttacks"][number];

type NeedsHolesResult = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
>;

function pendingInterruptForNeedsHoles(result: NeedsHolesResult) {
  const pendingInterrupt = result.snapshot.pendingInterrupt;
  if (pendingInterrupt === null) {
    throw new Error("Expected a pending interrupt for the needsHoles result.");
  }
  return pendingInterrupt;
}

function resolveGoblinOpportunityAttackDamage(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly threat: OpportunityAttackThreat;
  readonly damageRollTotal: number;
}) {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: input.actorId,
    command: "move",
  };
  const movement = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject: moveSubject,
      fills: [],
    }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state: input.state,
    subject: moveSubject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [input.threat],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected the movement to open an Opportunity Attack.");
  }
  const pendingInterrupt = pendingInterruptForNeedsHoles(awaitingReaction);
  const choice = reactionChoiceWithSubject(pendingInterrupt.choices);
  const started = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
      kind: "resolve",
      responderId: goblinId,
      choice: opportunityAttackProcedureSelectionForTest(choice),
    }),
  });
  if (started.tag !== "needsHoles") {
    throw new Error("Expected the Opportunity Attack attack roll hole.");
  }
  const attackRoll = findHole(started.holes, "attackRoll");
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 18,
  });
  const damageHole = requireHole(
    resolveBattleSubject({
      state: started.state,
      subject: choice.subject,
      fills: [attackFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFill(damageHole, input.damageRollTotal);
  const damageResult = resolveBattleSubject({
    state: started.state,
    subject: choice.subject,
    fills: [attackFill, damageFill],
  });
  if (damageResult.tag !== "needsHoles") {
    throw new Error("Expected a post-damage Opportunity Attack hole.");
  }
  return {
    state: started.state,
    subject: choice.subject,
    attackRoll,
    attackFill,
    damageFill,
    damageResult,
  };
}

function startFighterUnarmedOpportunityAttack(state: BattleState) {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "move",
  };
  const moveHole = requireHole(
    resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state,
    subject: moveSubject,
    fills: [
      movementFill(moveHole, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          fighterUnarmedOpportunityAttackThreat(state),
        ],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected unarmed Opportunity Attack Reaction window.");
  }
  const choice = reactionChoiceWithSubject(
    awaitingReaction.snapshot.pendingInterrupt!.choices,
  );
  const startedReaction = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
      {
        kind: "resolve",
        responderId: fighterId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      },
    ),
  });
  if (startedReaction.tag !== "needsHoles") {
    throw new Error("Expected unarmed Opportunity Attack roll hole.");
  }
  return {
    state: startedReaction.state,
    subject: choice.subject,
    attackRoll: findHole(startedReaction.holes, "attackRoll"),
  };
}

function statBlockAttackProcedureRef(
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
) {
  if (subject.procedureRef === undefined) {
    throw new Error("Expected Stat Block attack procedure ref.");
  }
  return BattleStatBlockProcedureExecutionRef.make(subject.procedureRef);
}

describe("battle runtime: Light property and Opportunity Attacks", () => {
  test("Light Property Bonus Action Attack requires a prior Attack action Light weapon attack and omits a positive damage modifier", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      state,
      fighterId,
      "offHandAttack",
    );

    expect(
      discoverBattleActs(session).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const attackSubject: BattleSubject = fighterAttackSubject(
      state,
      "Shortsword",
    );
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
    });
    const completed = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionAvailable: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(
      resolveBattleSubject({
        state: completed.state,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Bonus Action is no longer available for the current actor.",
    });
  });

  test("Light Property Bonus Action Attack spends its Bonus Action after a miss", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-miss"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject(state, "Shortsword");
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject = characterBonusAttackSubjectForTest(
      afterQualifyingAttack,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    const completed = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionAvailable: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 10 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack requests a zero-Hit-Point disposition", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-zero-hit-point-disposition"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const attackSubject = fighterAttackSubject(state, "Shortsword");
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject = characterBonusAttackSubjectForTest(
      afterQualifyingAttack,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const needsDisposition = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    expect(needsDisposition).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackDamageDisposition",
          targetId: goblinId,
          choices: expect.arrayContaining([
            { kind: "ordinaryDamage" },
            { kind: "knockOut" },
          ]),
        }),
      ],
    });
  });

  test("Light Property Bonus Action Attack rejects stale source damage penalty fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-stale-source-penalty"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = fighterAttackSubject(
      state,
      "Shortsword",
    );
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const weakenedFighter = combatantWithSourceDamagePenalty(
      afterQualifyingAttack,
      fighterId,
      goblinId,
    );
    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      state,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({ state: weakenedFighter, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: weakenedFighter,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attack, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    const penalty = requireHole(penaltyRequest, "rolledDice");
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("ray_of_enfeeblement"),
      ),
      sourceCombatantId: goblinId,
      affectedCombatantId: fighterId,
      damageRollHoleId: holeId("battle:test:offhand-stale-source-penalty"),
      amount: { dice: 1, dieSize: 8 },
    });
    expect(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 1, naturalD20: 1 }),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Light Property Bonus Action Attack damage can only be filled after a hit.",
    });

    expect(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
          damageRollFillWithGroups(penalty, [[2]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("Light Property Bonus Action Attack opens hit-triggered Reaction replay and spends the Bonus Action", () => {
    const rogueTargetId = combatantId("rogue-target");
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-hit-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: rogueTargetId,
          displayName: "Rogue Target",
          initiative: 10,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const attackSubject: BattleSubject = fighterAttackSubject(
      state,
      "Shortsword",
    );
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      state,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, rogueTargetId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack hit Reaction window.",
      );
    }
    expect(awaitingReaction).toMatchObject({
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });
    const damageReductionChoice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
      "rogue_uncanny_dodge",
      "attackDamageReduction",
    );

    const afterReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: rogueTargetId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: damageReductionChoice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack damage roll after Reaction.",
      );
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: rogueTargetId,
          hp: 10,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("admitted authored critical-range support makes a natural 19 Light Property Bonus Action Attack critical", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = fighterAttackSubject(
      state,
      "Shortsword",
    );
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      state,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      critical: true,
      label: "weapon_dagger damage (2d4-piercing)",
    });
    expect(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
          damageRollFillWithGroups(damage, [[2, 3]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 5 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack distinguishes held weapon identity from weapon kind", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-off-hand-two-daggers"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testDaggerAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:dagger-1"),
              unitId: parseSharedUnitId("weapon_dagger"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:dagger-2"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const attackSubject: BattleSubject = fighterAttackSubject(state, "Dagger");
    const target = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const afterMainDagger = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({ ...session, state: afterMainDagger }),
      ).map((act) => act.subject),
    ).toContainEqual(
      characterBonusAttackSubjectForTest(
        afterMainDagger,
        fighterId,
        "offHandAttack",
      ),
    );
  });

  test("table-provided reach-exit movement facts open an Opportunity Attack window", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
      snapshot: {
        pendingInterrupt: {
          choices: [
            {
              kind: "opportunityAttack",
              reactorId: goblinId,
              subject: {
                command: "opportunityAttack",
                reactorId: goblinId,
                targetId: fighterId,
                procedureRef: goblinOpportunityAttackThreat(state).procedureRef,
              },
            },
          ],
        },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("attack target facts are scoped to the selected attack option and range band", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(state, "Shortbow");
    const mismatchedSubject = goblinAttackSubject(state, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInMeleeReach",
              actorId: goblinId,
              targetId: fighterId,
              ...attackExecutionSelectionForSubjectForTest(mismatchedSubject),
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInRangedRange",
              actorId: goblinId,
              targetId: fighterId,
              procedureRef: statBlockAttackProcedureRef(subject),
              rangeBand: "normal",
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ kind: "attackRoll" }] });
  });

  test("long-range attack target facts are legal and require Disadvantage", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(state, "Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        procedureRef: statBlockAttackProcedureRef(subject),
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state,
      subject,
      fills: [longRangeTargetFill],
    });

    expect(afterTarget).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", rollMode: "disadvantage" }],
    });
    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack roll mode does not match the current attack-roll rule.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
            rollMode: "disadvantage",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("contradictory range bands for the same attack target are rejected", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(state, "Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const normalRangeFact = {
      kind: "attackTargetInRangedRange" as const,
      actorId: goblinId,
      targetId: fighterId,
      procedureRef: statBlockAttackProcedureRef(subject),
      rangeBand: "normal" as const,
    };
    const longRangeFact = {
      ...normalRangeFact,
      rangeBand: "long" as const,
    };

    for (const spatialFacts of [
      [normalRangeFact, longRangeFact],
      [longRangeFact, normalRangeFact],
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, fighterId, spatialFacts)],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Attack target range facts must contain at most one range band for each actor, target, and attack.",
      });
    }
  });

  test("long-range Disadvantage cancels with an Advantage source", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const goblin = goblinTurn.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected Goblin combatant.");
    }
    const hiddenGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const subject = goblinAttackSubject(hiddenGoblinTurn, "Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state: hiddenGoblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        procedureRef: statBlockAttackProcedureRef(subject),
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state: hiddenGoblinTurn,
      subject,
      fills: [longRangeTargetFill],
    });

    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(attackRoll).not.toHaveProperty("rollMode");
    expect(
      resolveBattleSubject({
        state: hiddenGoblinTurn,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("Opportunity Attack movement facts must name a qualifying melee option", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              {
                reactorId: goblinId,
                ...attackExecutionSelectionForSubjectForTest(
                  goblinAttackSubject(state, "Shortbow"),
                ),
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("stale movement fill data cannot suppress an Opportunity Attack", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const staleMovementValue = {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
      provokesOpportunityAttacks: false,
    };
    const staleSuppressionFill = movementFill(hole, staleMovementValue);

    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [staleSuppressionFill],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("declining an Opportunity Attack resumes the interrupted movement", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: goblinId },
      ),
    });

    if (declined.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${declined.tag}.`);
    }
    expect(declined.snapshot.pendingInterrupt).toBeNull();
    expect(declined.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: true,
        }),
      ]),
    );
  });

  test("resolving an Opportunity Attack spends reaction, applies damage, then resumes movement", () => {
    const state = fighterVsGoblinBattle();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice),
        },
      ),
    });
    expect(startedReaction).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "attackRoll" }],
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 6,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack carries an Animal Friendship damage relationship through movement", () => {
    const movingBeastId = combatantId("opportunity-animal-friendship-beast");
    const charmedState = resolvedAnimalFriendshipState(movingBeastId, [
      {
        combatantId: goblinId,
        statBlock: statBlockRecord(),
        initiative: 8,
      },
    ]);
    const afterCasterTurn = requireResolved(
      endTurn({ state: charmedState, actorId: spellCasterId }),
    ).state;
    const state = requireResolved(
      endTurn({ state: afterCasterTurn, actorId: spellTargetId }),
    ).state;
    const damaged = resolveGoblinOpportunityAttackDamage({
      state,
      actorId: movingBeastId,
      threat: goblinMeleeOpportunityAttackThreatFromExecution(state),
      damageRollTotal: 1,
    });
    const relationship = requireHole(
      damaged.damageResult,
      "damageRelationshipDecisions",
    );
    expect(relationship.questions).toEqual([
      expect.objectContaining({
        kind: "targetDamagedByCasterOrAlly",
        targetId: movingBeastId,
      }),
    ]);
    const question = relationship.questions[0];
    if (question === undefined) {
      throw new Error("Expected the Animal Friendship relationship question.");
    }
    const completed = resolveBattleSubject({
      state: damaged.damageResult.state,
      subject: damaged.subject,
      fills: [
        damaged.attackFill,
        damaged.damageFill,
        {
          kind: "damageRelationshipDecisions",
          holeId: relationship.holeId,
          answers: [{ questionId: question.questionId, answer: false }],
        },
      ],
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: movingBeastId,
            hp: 7,
            conditions: expect.arrayContaining(["charmed"]),
            movement: expect.objectContaining({ spentFeet: 5 }),
          }),
          expect.objectContaining({
            combatantId: goblinId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("Opportunity Attack opens a Ready after-damage window before movement resumes", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const awaitingAfterDamage = resolveGoblinOpportunityAttackDamage({
      state,
      actorId: fighterId,
      threat: goblinOpportunityAttackThreat(state),
      damageRollTotal: 4,
    });
    expect(awaitingAfterDamage.damageResult).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    const pendingInterrupt = pendingInterruptForNeedsHoles(
      awaitingAfterDamage.damageResult,
    );
    const readyChoice = reactionChoiceWithSubject(pendingInterrupt.choices);
    if (
      readyChoice.subject.tag !== "runtimeCommand" ||
      readyChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied-spell release subject.");
    }
    const completed = resolveBattleInterrupt({
      state: awaitingAfterDamage.damageResult.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: wizardId,
      }),
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            movement: expect.objectContaining({ spentFeet: 5 }),
          }),
          expect.objectContaining({
            combatantId: goblinId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("a Halfling Opportunity Attack rerolls a natural 1 and resolves fixed damage without a damage-roll hole", () => {
    const halflingLuck = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const halflingLuckRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: halflingLuck.id },
      unit: halflingLuck,
    });
    if (Either.isLeft(halflingLuckRef)) {
      throw new Error(halflingLuckRef.left.message);
    }
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-halfling-opportunity-attack"),
          combatants: [
            characterSeed({
              initiative: 20,
              characterUnitRefs: [halflingLuckRef.right],
              unitFeatures: [characterBattleFeatureInitForTest(halflingLuck)],
            }),
            statBlockCreatureInit({ initiative: 10 }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const startedReaction = startFighterUnarmedOpportunityAttack(state);
    const originalRoll = {
      total: 5,
      naturalD20: 1,
    } as const;

    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: startedReaction.subject,
        fills: [attackRollFill(startedReaction.attackRoll, originalRoll)],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          d20TestNaturalOneRerolls: expect.any(Array),
        }),
      ],
    });

    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: startedReaction.subject,
      fills: [
        attackRollFill(startedReaction.attackRoll, {
          ...originalRoll,
          d20TestNaturalOneReroll: {
            kind: "reroll",
            effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            replacement: {
              total: 20,
              naturalD20: DieRollResult(18),
            },
          },
        }),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: goblinId,
            hp: 6,
            movement: expect.objectContaining({
              spentFeet: 5,
              remainingFeet: 25,
            }),
          }),
          expect.objectContaining({
            combatantId: fighterId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("Opportunity Attack interrupt selection distinguishes two procedures from one reactor", () => {
    const reactorId = combatantId("opportunity-attack-two-procedure-reactor");
    const base = monsterResourceStatBlock();
    const meleeAttack = base.statBlock.actions?.attacks?.find(
      (attack) => attack.attackType === "melee",
    );
    if (meleeAttack === undefined) {
      throw new Error(
        "Expected the synthetic reactor fixture to have a melee attack.",
      );
    }
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-procedure-selection"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          combatantId: reactorId,
          initiative: 10,
          statBlock: {
            ...base,
            statBlock: {
              ...base.statBlock,
              actions: {
                ...base.statBlock.actions,
                attacks: [
                  meleeAttack,
                  { ...meleeAttack, name: "Synthetic Echo Strike" },
                ],
              },
            },
          },
        }),
      ],
    });
    const reactor = state.combatants.get(reactorId);
    if (reactor?.origin.kind !== "statBlock") {
      throw new Error("Expected the synthetic Stat Block reactor.");
    }
    const procedureRefs = statBlockAttackActionOptions(reactor.origin.execution)
      .filter(
        (attack) =>
          attack.damageNotation === "rolled" &&
          attack.attack.attackType === "melee",
      )
      .map((attack) => attack.procedureRef);
    const firstProcedureRef = procedureRefs[0];
    const secondProcedureRef = procedureRefs[1];
    if (firstProcedureRef === undefined || secondProcedureRef === undefined) {
      throw new Error("Expected two admitted melee procedure refs.");
    }
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const movementWithProcedureRefs = movementFill(moveHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        { reactorId, procedureRef: firstProcedureRef },
        { reactorId, procedureRef: secondProcedureRef },
      ],
    });
    const movementWithReorderedProcedureRefs = movementFill(moveHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        { reactorId, procedureRef: secondProcedureRef },
        { reactorId, procedureRef: firstProcedureRef },
      ],
    });
    const movementWithChangedMultiplicity = movementFill(moveHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        { reactorId, procedureRef: firstProcedureRef },
        { reactorId, procedureRef: firstProcedureRef },
      ],
    });
    expect(
      battleContinuationFillEquals(
        movementWithProcedureRefs,
        movementWithReorderedProcedureRefs,
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        movementWithChangedMultiplicity,
        movementWithProcedureRefs,
      ),
    ).toBe(false);
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [movementWithProcedureRefs],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected an Opportunity Attack interrupt window.");
    }
    const choices = awaitingReaction.snapshot.pendingInterrupt?.choices.filter(
      (choice) => choice.kind === "opportunityAttack",
    );
    expect(choices).toHaveLength(2);
    const secondChoice = choices?.find(
      (choice) =>
        choice.kind === "opportunityAttack" &&
        choice.subject.command === "opportunityAttack" &&
        choice.subject.procedureRef === secondProcedureRef,
    );
    if (secondChoice === undefined) {
      throw new Error("Expected the second procedure's interrupt choice.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)(
        secondChoice,
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(
        Schema.encodeSync(BattleSnapshotSchema)(awaitingReaction.snapshot),
      ),
    ).not.toThrow();
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: reactorId,
          choice: opportunityAttackProcedureSelectionForTest(secondChoice),
        },
      ),
    });

    expect(startedReaction).toMatchObject({
      tag: "needsHoles",
      subject: {
        command: "opportunityAttack",
        reactorId,
        procedureRef: secondProcedureRef,
      },
    });
  });

  test("Opportunity Attack rejects stale source damage penalty fills", () => {
    const state = combatantWithSourceDamagePenalty(
      fighterVsGoblinBattle(),
      goblinId,
      fighterId,
    );
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice),
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 4),
      ],
    });
    const penalty = requireHole(penaltyRequest, "rolledDice");
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("ray_of_enfeeblement"),
      ),
      sourceCombatantId: fighterId,
      affectedCombatantId: goblinId,
      damageRollHoleId: holeId("battle:test:oa-stale-source-penalty"),
      amount: { dice: 1, dieSize: 8 },
    });
    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Opportunity Attack damage can only be filled after a hit.",
    });

    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 4),
          damageRollFillWithGroups(penalty, [[2]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("Opportunity Attack preserves Resistance reduction through an attack-damage Reaction", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const baseState = startBattleRight({
      battleId: battleId("battle-opportunity-attack-damage-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "bard", level: 3 }],
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWordsDamageOnly, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [
            {
              unit: cuttingWordsDamageOnly,
              supportProfiles: ["reactionRollOrDamageReduction"],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = withResistanceEffect(baseState, fighterId, "slashing", false);
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice),
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );

    const needsResistanceReduction = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });
    if (needsResistanceReduction.tag !== "needsHoles") {
      throw new Error("Expected Resistance reduction roll.");
    }
    const resistanceReduction = requireSpellDamageReductionHole(
      needsResistanceReduction.holes,
    );
    const resistanceReductionFill = damageRollFillWithGroups(
      resistanceReduction,
      [[3]],
    );
    const awaitingDamageReaction = resolveBattleSubject({
      state: needsResistanceReduction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
        resistanceReductionFill,
      ],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack damage Reaction window.");
    }
    expect(awaitingDamageReaction).toMatchObject({
      holes: [{ kind: "interruptDecision", trigger: "attackDamage" }],
    });

    const damageChoice = reactionModifierChoice(
      awaitingDamageReaction.snapshot.pendingInterrupt!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const completed = resolveBattleInterrupt({
      state: awaitingDamageReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingDamageReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: damageChoice.choice.procedureRef,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: damageChoice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 10,
          reactionAvailable: false,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
    expect(
      completed.state.combatants.get(fighterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        usedThisTurn: true,
      }),
    );
  });

  test("Opportunity Attack attack-hit damage reductions apply before movement resumes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingInterrupt!.choices,
    );
    const startedOpportunityAttack = resolveBattleInterrupt({
      state: awaitingOpportunityAttack.state,
      fill: interruptDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(
            opportunityAttackChoice,
          ),
        },
      ),
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const damageReductionChoice = reactionModifierChoice(
      awaitingHitReaction.snapshot.pendingInterrupt!.choices,
      "rogue_uncanny_dodge",
      "attackDamageReduction",
    );
    const afterUncannyDodge = resolveBattleInterrupt({
      state: awaitingHitReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingHitReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: damageReductionChoice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 8,
          reactionAvailable: false,
          movement: expect.objectContaining({ spentFeet: 5 }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack attack-hit damage reductions narrow Knock Out disposition eligibility", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction-ko-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 5,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingInterrupt!.choices,
    );
    const startedOpportunityAttack = resolveBattleInterrupt({
      state: awaitingOpportunityAttack.state,
      fill: interruptDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(
            opportunityAttackChoice,
          ),
        },
      ),
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const damageReductionChoice = reactionModifierChoice(
      awaitingHitReaction.snapshot.pendingInterrupt!.choices,
      "rogue_uncanny_dodge",
      "attackDamageReduction",
    );
    const afterUncannyDodge = resolveBattleInterrupt({
      state: awaitingHitReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingHitReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: damageReductionChoice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 1,
          reactionAvailable: false,
          conditions: [],
        }),
      ]),
    );
  });

  test("Opportunity Attack exposes Knock Out as an attack damage disposition", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-knock-out"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 3 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice),
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 1),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      kind: "attackDamageDisposition",
      attackerId: goblinId,
      targetId: fighterId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 1),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          }),
          expect.objectContaining({
            combatantId: goblinId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("hidden opportunity attackers roll with Advantage and reveal after the attack roll", () => {
    const base = fighterVsGoblinBattle();
    const goblin = base.combatants.get(goblinId)!;
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [goblinOpportunityAttackThreat(state)],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: opportunityAttackProcedureSelectionForTest(choice),
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = requireHole(startedReaction, "attackRoll");
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });

    const missed = requireResolved(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId }),
      ]),
    );
    expect(missed.state.combatants.get(goblinId)?.hidden).toBeNull();
  });
});

function combatantWithSourceDamagePenalty(
  state: BattleState,
  affectedId: typeof fighterId | typeof goblinId,
  sourceId: typeof fighterId | typeof goblinId,
): BattleState {
  const affected = state.combatants.get(affectedId);
  if (affected === undefined) {
    throw new Error("Expected affected combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(affectedId, {
      ...affected,
      activeEffects: [
        ...affected.activeEffects,
        {
          kind: "sourceDamageRollPenalty" as const,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("ray_of_enfeeblement"),
          ),
          sourceCombatantId: sourceId,
          amount: { dice: 1 as const, dieSize: 8 as const },
          expiresAt: {
            kind: "concentration" as const,
            combatantId: sourceId,
          },
        },
      ],
    }),
  };
}
