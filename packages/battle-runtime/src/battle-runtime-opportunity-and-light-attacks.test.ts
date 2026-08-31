import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { Result, Schema } from "effect";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
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
  concentrationSavingThrowFill,
  attackDamageDispositionFill,
  rolledDiceGroup,
  characterSeed,
  testDaggerAttack,
  testShortswordAttack,
  statBlockCreatureInit,
  authoredProcedureOrdinal,
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
  battleStateWithAllocatedEffectForTest,
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
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import { statBlockAttackDamageSelectionUsesOnlyComponentNotation } from "./stat-block-attack-damage-selection.ts";
import { resolvedAnimalFriendshipState } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  requireSpellDamageReductionHole,
  withResistanceEffect,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  resistanceUnitId,
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
import { classLevel, DieRollResult, movementFeet } from "@dnd/shared/types";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
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
    distanceFeet: movementFeet(5),
    ...attackExecutionSelectionForSubjectForTest(subject),
  };
}

function fighterUnarmedOpportunityAttackThreat(state: BattleState) {
  const subject = fighterAttackSubject(state, "Unarmed Strike");
  return {
    reactorId: fighterId,
    distanceFeet: movementFeet(5),
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
      statBlockAttackDamageSelectionUsesOnlyComponentNotation(
        attackExecutionSelectionForOption(candidate).statBlockDamageSelection,
        "rolled",
      ) && candidate.attack.attackType === "melee",
  );
  if (attack === undefined) {
    throw new Error("Expected the Animal Friendship reactor's melee attack.");
  }
  return {
    reactorId: goblinId,
    distanceFeet: movementFeet(5),
    ...attackExecutionSelectionForOption(attack),
  };
}

type OpportunityAttackThreat = Parameters<
  typeof movementFill
>[1]["provokedOpportunityAttacks"][number];

type NeedsHolesResult = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
>;

function pendingInterruptForNeedsHoles(result: NeedsHolesResult) {
  const pendingInterrupt = battleFrontierInterruptDecisionForState(
    result.state,
  );
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
    pendingInterruptForNeedsHoles(awaitingReaction).choices,
  );
  const startedReaction = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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

function lightPropertyAttackState(
  ...additionalCombatants: Parameters<typeof startBattleRight>[0]["combatants"]
) {
  return startBattleRight({
    battleId: battleId("battle-off-hand-boundaries"),
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
      ...additionalCombatants,
    ],
  });
}

function lightPropertyAttackPrefix(state: BattleState, targetId = goblinId) {
  const qualifyingSubject = fighterAttackSubject(state, "Shortsword");
  const qualifyingTarget = requireHole(
    resolveBattleSubject({ state, subject: qualifyingSubject, fills: [] }),
    "targetChoice",
  );
  const qualifyingRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: qualifyingSubject,
      fills: [targetFill(qualifyingTarget, goblinId)],
    }),
    "attackRoll",
  );
  const qualifiedState = requireResolved(
    resolveBattleSubject({
      state,
      subject: qualifyingSubject,
      fills: [
        targetFill(qualifyingTarget, goblinId),
        attackRollFill(qualifyingRoll, { total: 1, naturalD20: 1 }),
      ],
    }),
  ).state;
  const subject = characterBonusAttackSubjectForTest(
    qualifiedState,
    fighterId,
    "offHandAttack",
  );
  const target = requireHole(
    resolveBattleSubject({ state: qualifiedState, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: qualifiedState,
      subject,
      fills: [targetFill(target, targetId)],
    }),
    "attackRoll",
  );
  return { state: qualifiedState, subject, target, attackRoll };
}

describe("battle runtime: Light property and Opportunity Attacks", () => {
  test("Light Property Bonus Action Attack applies spell reduction before damage and still spends the Bonus Action at zero damage", () => {
    const resistanceProcedureRef =
      battleProcedureExecutionRefForTest(resistanceUnitId);
    const base = lightPropertyAttackState(
      characterSeed({ combatantId: spellCasterId, initiative: 5 }),
    );
    const caster = base.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected the synthetic Resistance caster.");
    }
    const concentratingBase: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(spellCasterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: resistanceProcedureRef,
          effectKind: "spellEffect",
        },
      }),
    };
    const prefix = lightPropertyAttackPrefix(
      withResistanceEffect(concentratingBase, goblinId, "piercing", false),
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: prefix.state,
        subject: prefix.subject,
        fills: [
          targetFill(prefix.target, goblinId),
          attackRollFill(prefix.attackRoll, {
            total: 15,
            naturalD20: 10,
          }),
        ],
      }),
      "rolledDice",
    );
    const needsReduction = resolveBattleSubject({
      state: prefix.state,
      subject: prefix.subject,
      fills: [
        targetFill(prefix.target, goblinId),
        attackRollFill(prefix.attackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    if (needsReduction.tag !== "needsHoles") {
      throw new Error("Expected spell damage reduction roll.");
    }
    const reduction = requireSpellDamageReductionHole(needsReduction.holes);

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsReduction.state,
        subject: prefix.subject,
        fills: [
          targetFill(prefix.target, goblinId),
          attackRollFill(prefix.attackRoll, {
            total: 15,
            naturalD20: 10,
          }),
          damageRollFill(damage, 4),
          damageRollFillWithGroups(reduction, [[4]]),
        ],
      }),
    );

    expect(resolved.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 10 }),
      ]),
    );
  });

  test("Light Property Bonus Action Attack resolves a target Concentration save before applying damage", () => {
    const base = lightPropertyAttackState(
      characterSeed({ combatantId: wizardId, initiative: 5 }),
    );
    const concentrator = base.combatants.get(wizardId);
    if (concentrator === undefined) {
      throw new Error("Expected synthetic concentrator.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(wizardId, {
        ...concentrator,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-offhand-concentration",
          ),
          effectKind: "spellEffect",
        },
      }),
    };
    const prefix = lightPropertyAttackPrefix(state, wizardId);
    const damage = requireHole(
      resolveBattleSubject({
        state: prefix.state,
        subject: prefix.subject,
        fills: [
          targetFill(prefix.target, wizardId),
          attackRollFill(prefix.attackRoll, {
            total: 15,
            naturalD20: 10,
          }),
        ],
      }),
      "rolledDice",
    );
    const needsSave = resolveBattleSubject({
      state: prefix.state,
      subject: prefix.subject,
      fills: [
        targetFill(prefix.target, wizardId),
        attackRollFill(prefix.attackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Concentration Saving Throw.");
    }
    const concentration = findHole(needsSave.holes, "concentrationSavingThrow");

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsSave.state,
        subject: prefix.subject,
        fills: [
          targetFill(prefix.target, wizardId),
          attackRollFill(prefix.attackRoll, {
            total: 15,
            naturalD20: 10,
          }),
          damageRollFill(damage, 4),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );

    expect(resolved.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
    expect(resolved.state.combatants.get(wizardId)).toMatchObject({
      hp: 8,
      concentration: null,
    });
  });

  test("a completed Light Property Bonus Action Attack subject is stale", () => {
    const prefix = lightPropertyAttackPrefix(lightPropertyAttackState());
    const miss = [
      targetFill(prefix.target, goblinId),
      attackRollFill(prefix.attackRoll, { total: 1, naturalD20: 1 }),
    ];
    const completed = requireResolved(
      resolveBattleSubject({
        state: prefix.state,
        subject: prefix.subject,
        fills: miss,
      }),
    );

    expect(
      resolveBattleSubject({
        state: completed.state,
        subject: prefix.subject,
        fills: miss,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Bonus Action is no longer available for the current actor.",
    });
  });

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
        turn: { bonusActionQuotaAvailable: false },
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
        turn: { bonusActionQuotaAvailable: false },
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
    if (!("sourceDamageRollPenalty" in penalty)) {
      throw new Error("Expected source damage roll penalty hole.");
    }
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      effectRef: penalty.sourceDamageRollPenalty.effectRef,
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
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
            procedureRef: damageReductionChoice.modifier.procedureRef,
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
    expect(completed.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
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
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("attack target facts are scoped to the selected attack option and exact distance", () => {
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
              kind: "attackTargetDistance",
              actorId: goblinId,
              targetId: fighterId,
              distanceFeet: movementFeet(5),
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
              kind: "attackTargetDistance",
              actorId: goblinId,
              targetId: fighterId,
              ...attackExecutionSelectionForSubjectForTest(subject),
              distanceFeet: movementFeet(5),
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
        kind: "attackTargetDistance",
        actorId: goblinId,
        targetId: fighterId,
        ...attackExecutionSelectionForSubjectForTest(subject),
        distanceFeet: movementFeet(100),
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

  test("contradictory distances for the same attack target are rejected", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(state, "Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const normalRangeFact = {
      kind: "attackTargetDistance" as const,
      actorId: goblinId,
      targetId: fighterId,
      ...attackExecutionSelectionForSubjectForTest(subject),
      distanceFeet: movementFeet(5),
    };
    const longRangeFact = {
      ...normalRangeFact,
      distanceFeet: movementFeet(100),
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
          "Attack target distance facts must contain at most one distance for each actor, target, and attack.",
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
        kind: "attackTargetDistance",
        actorId: goblinId,
        targetId: fighterId,
        ...attackExecutionSelectionForSubjectForTest(subject),
        distanceFeet: movementFeet(100),
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state: hiddenGoblinTurn,
      subject,
      fills: [longRangeTargetFill],
    });

    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(attackRoll).toHaveProperty("rollMode", "normal");
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
                distanceFeet: movementFeet(5),
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
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
        { kind: "decline", responderId: goblinId },
      ),
    });

    if (declined.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${declined.tag}.`);
    }
    expect(battleFrontierInterruptDecisionForState(declined.state)).toBeNull();
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
    expect(battleFrontierInterruptDecisionForState(completed.state)).toBeNull();
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
    if (Result.isFailure(halflingLuckRef)) {
      throw new Error(halflingLuckRef.failure.message);
    }
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-halfling-opportunity-attack"),
          combatants: [
            characterSeed({
              initiative: 20,
              characterUnitRefs: [halflingLuckRef.success],
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
    const meleeAttack = base.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.attackType === "melee",
    );
    if (
      meleeAttack === undefined ||
      meleeAttack.kind !== "executable" ||
      meleeAttack.procedure.kind !== "attack_roll"
    ) {
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
              actions: [
                meleeAttack,
                {
                  ...meleeAttack,
                  procedureOrdinal: authoredProcedureOrdinal(2),
                  procedure: {
                    ...meleeAttack.procedure,
                    name: "Synthetic Echo Strike",
                  },
                },
              ],
            },
          },
        }),
      ],
    });
    const reactor = state.combatants.get(reactorId);
    if (reactor?.origin.kind !== "statBlock") {
      throw new Error("Expected the synthetic Stat Block reactor.");
    }
    const attacks = statBlockAttackActionOptions(
      reactor.origin.execution,
    ).filter(
      (attack) =>
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          attackExecutionSelectionForOption(attack).statBlockDamageSelection,
          "rolled",
        ) && attack.attack.attackType === "melee",
    );
    const firstAttack = attacks[0];
    const secondAttack = attacks[1];
    if (firstAttack === undefined || secondAttack === undefined) {
      throw new Error("Expected two admitted melee procedure refs.");
    }
    const firstSelection = attackExecutionSelectionForOption(firstAttack);
    const secondSelection = attackExecutionSelectionForOption(secondAttack);
    const secondProcedureRef = secondSelection.procedureRef;
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
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...firstSelection,
        },
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...secondSelection,
        },
      ],
    });
    const movementWithReorderedProcedureRefs = movementFill(moveHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...secondSelection,
        },
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...firstSelection,
        },
      ],
    });
    const movementWithChangedMultiplicity = movementFill(moveHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...firstSelection,
        },
        {
          reactorId,
          distanceFeet: movementFeet(5),
          ...firstSelection,
        },
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
    const choices = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.filter(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.tag === "runtimeCommand" &&
        choice.subject.command === "opportunityAttack",
    );
    expect(choices).toHaveLength(2);
    const secondChoice = choices?.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.tag === "runtimeCommand" &&
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
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
    if (!("sourceDamageRollPenalty" in penalty)) {
      throw new Error("Expected source damage roll penalty hole.");
    }
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      effectRef: penalty.sourceDamageRollPenalty.effectRef,
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
      pendingInterruptForNeedsHoles(awaitingDamageReaction).choices,
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
            procedureRef: damageChoice.modifier.procedureRef,
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
    expect(battleFrontierInterruptDecisionForState(completed.state)).toBeNull();
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
      pendingInterruptForNeedsHoles(awaitingOpportunityAttack).choices,
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
      pendingInterruptForNeedsHoles(awaitingHitReaction).choices,
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
            procedureRef: damageReductionChoice.modifier.procedureRef,
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
    expect(battleFrontierInterruptDecisionForState(completed.state)).toBeNull();
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
      pendingInterruptForNeedsHoles(awaitingOpportunityAttack).choices,
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
      pendingInterruptForNeedsHoles(awaitingHitReaction).choices,
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
            procedureRef: damageReductionChoice.modifier.procedureRef,
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
      pendingInterruptForNeedsHoles(awaitingReaction).choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        pendingInterruptForNeedsHoles(awaitingReaction).decisionHole,
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
    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, {
            total: 10,
            naturalD20: 10,
            rollMode: "normal",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Opportunity Attack attack roll mode does not match the current attack-roll rule.",
    });

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
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: affectedId,
    effect: {
      kind: "sourceDamageRollPenalty",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("ray_of_enfeeblement"),
      ),
      sourceCombatantId: sourceId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: {
        kind: "concentration",
        combatantId: sourceId,
      },
    },
  });
}
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
