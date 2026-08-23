import { describe, expect, test } from "vitest";
import {
  opportunityAttackLeavesReach,
  type BattleInterruptProcedureSelection,
} from "./index.ts";
import { classLevel, movementFeet } from "@dnd/shared/types";
import {
  attackExecutionSelectionForSubjectForTest,
  attackDamageDispositionFill,
  attackRollFill,
  battleAbilityModifier,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  DieRollResult,
  discoverBattleActs,
  endTurn,
  findHole,
  fighterAttackSubject,
  fighterId,
  goblinId,
  interruptDecisionFill,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  rageResource,
  reactionChoiceWithSubject,
  resistantSkeletonCreatureInit,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  statBlockCreatureInit,
  statBlockAttackSubjectForTest,
  statBlockRecord,
  startBattleSessionRight,
  supportedBattleUnitRef,
  testLongswordAttack,
  targetFill,
  attackTargetDistanceSpatialFact,
  unitLibrary,
  type BattleFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { statBlockWithCreatureType } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  fighterRemarkableAthleteUnitId,
  savageAttackerUnitId,
  speciesHalflingLuckUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";

test("opportunity attacks are provoked only when movement leaves reach", () => {
  expect(
    opportunityAttackLeavesReach({
      beforeDistanceFeet: movementFeet(5),
      afterDistanceFeet: movementFeet(10),
      reachFeet: movementFeet(5),
    }),
  ).toBe(true);
  expect(
    opportunityAttackLeavesReach({
      beforeDistanceFeet: movementFeet(5),
      afterDistanceFeet: movementFeet(5),
      reachFeet: movementFeet(5),
    }),
  ).toBe(false);
  expect(
    opportunityAttackLeavesReach({
      beforeDistanceFeet: movementFeet(10),
      afterDistanceFeet: movementFeet(15),
      reachFeet: movementFeet(5),
    }),
  ).toBe(false);
});

function retaliationBoundarySession(
  input: {
    readonly includeCriticalMovement?: boolean;
    readonly includeWeaponDamageDiceChoice?: boolean;
  } = {},
) {
  const retaliation = unitLibrary.requireUnit("barbarian_retaliation");
  const halflingLuck = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
  const remarkableAthlete = unitLibrary.requireUnit(
    fighterRemarkableAthleteUnitId,
  );
  const savageAttacker = unitLibrary.requireUnit(savageAttackerUnitId);
  const units = [
    retaliation,
    halflingLuck,
    ...(input.includeCriticalMovement === true ? [remarkableAthlete] : []),
    ...(input.includeWeaponDamageDiceChoice === true ? [savageAttacker] : []),
  ];
  return startBattleSessionRight({
    battleId: battleId("battle-opportunity-attack-interrupt-boundaries"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Synthetic Berserker",
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 10 }],
        resources: [rageResource()],
        unitFeatures: [
          characterBattleFeatureInitForTest(retaliation, [
            { className: "barbarian", level: classLevel(10) },
          ]),
          characterBattleFeatureInitForTest(halflingLuck),
          ...(input.includeCriticalMovement === true
            ? [
                characterBattleFeatureInitForTest(remarkableAthlete, [
                  { className: "fighter", level: classLevel(3) },
                ]),
              ]
            : []),
        ],
        characterUnitRefs: units.map(supportedBattleUnitRef),
        attack: testLongswordAttack(),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function startRetaliationAfterSkeletonOpportunityAttack(
  session: ReturnType<typeof retaliationBoundarySession>,
) {
  const rageSubject: BattleSubject = {
    tag: "unitFeature",
    actorId: fighterId,
    procedureRef: requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      "barbarian_rage",
    ),
  };
  const raging = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: rageSubject,
      fills: [],
    }),
  ).state;
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  };
  const movement = requireHole(
    resolveBattleSubject({ state: raging, subject: moveSubject, fills: [] }),
    "movement",
  );
  const skeletonAttack = statBlockAttackSubjectForTest(
    raging,
    skeletonId,
    "Shortsword",
    "actions",
  );
  const awaitingOpportunity = resolveBattleSubject({
    state: raging,
    subject: moveSubject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: skeletonAttack.actorId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(skeletonAttack),
          },
        ],
      }),
    ],
  });
  if (awaitingOpportunity.tag !== "needsHoles") {
    throw new Error("Expected Skeleton Opportunity Attack interrupt.");
  }
  const pendingInterrupt = awaitingOpportunity.snapshot.pendingInterrupt;
  if (pendingInterrupt === null) {
    throw new Error("Expected pending Opportunity Attack interrupt.");
  }
  const rawOpportunityChoice = pendingInterrupt.choices.find(
    (choice) => choice.kind === "opportunityAttack",
  );
  if (rawOpportunityChoice === undefined) {
    throw new Error("Expected Skeleton Opportunity Attack choice.");
  }
  const opportunityChoice = reactionChoiceWithSubject([rawOpportunityChoice]);
  const startedOpportunity = resolveBattleInterrupt({
    state: awaitingOpportunity.state,
    fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
      kind: "resolve",
      responderId: opportunityChoice.reactorId,
      choice: opportunityAttackProcedureSelectionForTest(opportunityChoice),
    }),
  });
  if (startedOpportunity.tag !== "needsHoles") {
    throw new Error("Expected Skeleton Opportunity Attack roll hole.");
  }
  const attackRoll = findHole(startedOpportunity.holes, "attackRoll");
  const retaliationDistanceFact: BattleFill = {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      {
        kind: "retaliationDamagerWithinFiveFeet",
        damagedId: fighterId,
        damageSourceId: skeletonId,
      },
    ],
  };
  const rolled = resolveBattleSubject({
    state: startedOpportunity.state,
    subject: opportunityChoice.subject,
    fills: [
      retaliationDistanceFact,
      attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
    ],
  });
  const damage = requireHole(rolled, "rolledDice");
  const awaitingRetaliation = resolveBattleSubject({
    state: startedOpportunity.state,
    subject: opportunityChoice.subject,
    fills: [
      retaliationDistanceFact,
      attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      damageRollFill(damage, 4),
    ],
  });
  if (awaitingRetaliation.tag !== "needsHoles") {
    throw new Error(
      `Expected after-damage Retaliation interrupt, got ${JSON.stringify(awaitingRetaliation)}.`,
    );
  }
  const retaliationInterrupt = awaitingRetaliation.snapshot.pendingInterrupt;
  if (retaliationInterrupt === null) {
    throw new Error("Expected pending Retaliation interrupt.");
  }
  const rawRetaliationChoice = retaliationInterrupt.choices.find(
    (choice) =>
      choice.kind === "retaliationAttack" && choice.reactorId === fighterId,
  );
  if (rawRetaliationChoice === undefined) {
    throw new Error("Expected fighter Retaliation choice.");
  }
  const retaliationChoice = reactionChoiceWithSubject([rawRetaliationChoice]);
  const retaliationAttack = fighterAttackSubject(
    awaitingRetaliation.state,
    "Longsword",
  );
  const retaliationTargetDistanceFact: BattleFill = {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetDistanceSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(retaliationAttack),
        movementFeet(5),
      ),
    ],
  };
  const selection: BattleInterruptProcedureSelection = {
    kind: "retaliationAttack",
    reactorId: fighterId,
    selection: attackExecutionSelectionForSubjectForTest(retaliationAttack),
    fills: [retaliationTargetDistanceFact],
  };
  const startedRetaliation = resolveBattleInterrupt({
    state: awaitingRetaliation.state,
    fill: interruptDecisionFill(retaliationInterrupt.decisionHole, {
      kind: "resolve",
      responderId: fighterId,
      choice: selection,
    }),
  });
  if (startedRetaliation.tag !== "needsHoles") {
    throw new Error("Expected Retaliation attack-roll hole.");
  }
  return {
    state: startedRetaliation.state,
    subject: retaliationChoice.subject,
    attackRoll: findHole(startedRetaliation.holes, "attackRoll"),
  };
}

function startFighterOpportunityAttackAfterMovement(
  state: BattleState,
  moverId: CombatantId,
) {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: moverId,
    command: "move",
  };
  const movement = requireHole(
    resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
    "movement",
  );
  const fighterAttack = fighterAttackSubject(state, "Longsword");
  const awaitingOpportunity = resolveBattleSubject({
    state,
    subject: moveSubject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: fighterAttack.actorId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(fighterAttack),
          },
        ],
      }),
    ],
  });
  if (awaitingOpportunity.tag !== "needsHoles") {
    throw new Error("Expected fighter Opportunity Attack interrupt.");
  }
  const pendingInterrupt = awaitingOpportunity.snapshot.pendingInterrupt;
  if (pendingInterrupt === null) {
    throw new Error("Expected pending fighter Opportunity Attack interrupt.");
  }
  const rawOpportunityChoice = pendingInterrupt.choices.find(
    (choice) =>
      choice.kind === "opportunityAttack" && choice.reactorId === fighterId,
  );
  if (rawOpportunityChoice === undefined) {
    throw new Error("Expected fighter Opportunity Attack choice.");
  }
  const opportunityChoice = reactionChoiceWithSubject([rawOpportunityChoice]);
  const startedOpportunity = resolveBattleInterrupt({
    state: awaitingOpportunity.state,
    fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
      kind: "resolve",
      responderId: fighterId,
      choice: opportunityAttackProcedureSelectionForTest(opportunityChoice),
    }),
  });
  if (startedOpportunity.tag !== "needsHoles") {
    throw new Error("Expected fighter Opportunity Attack roll hole.");
  }
  return {
    state: startedOpportunity.state,
    subject: opportunityChoice.subject,
    attackRoll: findHole(startedOpportunity.holes, "attackRoll"),
  };
}

describe("battle runtime: Opportunity Attack interrupt boundaries", () => {
  test("Rage retaliation asks for the enemy relationship fact at both attack-roll checkpoints", () => {
    const session = retaliationBoundarySession();
    const retaliation = startRetaliationAfterSkeletonOpportunityAttack(session);

    expect(retaliation.attackRoll).toMatchObject({
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: fighterId,
      },
    });

    const missingRelationship = attackRollFill(retaliation.attackRoll, {
      total: 20,
      naturalD20: 15,
    });
    if (missingRelationship.kind !== "attackRoll") {
      throw new Error("Expected attack roll fill.");
    }
    const {
      relationshipFacts: _relationshipFacts,
      ...withoutRelationshipFacts
    } = missingRelationship;
    expect(
      resolveBattleSubject({
        state: retaliation.state,
        subject: retaliation.subject,
        fills: [withoutRelationshipFacts],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Retaliation relationship facts must answer the attack-roll hole request.",
    });

    const naturalOne = attackRollFill(retaliation.attackRoll, {
      total: 2,
      naturalD20: 1,
    });
    const rerollDecision = resolveBattleSubject({
      state: retaliation.state,
      subject: retaliation.subject,
      fills: [naturalOne],
    });
    expect(rerollDecision).toMatchObject({ tag: "needsHoles" });
    if (rerollDecision.tag !== "needsHoles") {
      throw new Error("Expected the natural-one reroll checkpoint.");
    }
    expect(findHole(rerollDecision.holes, "attackRoll")).toMatchObject({
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: fighterId,
      },
    });
  });

  test("a Critical Opportunity Attack carries Remarkable Athlete movement through damage", () => {
    const session = retaliationBoundarySession({
      includeCriticalMovement: true,
    });
    const retaliation = startRetaliationAfterSkeletonOpportunityAttack(session);
    const criticalRoll = attackRollFill(retaliation.attackRoll, {
      total: 30,
      naturalD20: 20,
    });
    const decisionResult = resolveBattleSubject({
      state: retaliation.state,
      subject: retaliation.subject,
      fills: [criticalRoll],
    });
    expect(decisionResult).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "unitFeatureDecision" })],
    });
    if (decisionResult.tag !== "needsHoles") {
      throw new Error("Expected Remarkable Athlete movement decision.");
    }
    const movementDecision = findHole(
      decisionResult.holes,
      "unitFeatureDecision",
    );
    const declined = resolveBattleSubject({
      state: decisionResult.state,
      subject: retaliation.subject,
      fills: [
        criticalRoll,
        {
          kind: "unitFeatureDecision",
          holeId: movementDecision.holeId,
          value: "decline",
        },
      ],
    });
    const damage = requireHole(declined, "rolledDice");
    const resolved = resolveBattleSubject({
      state: decisionResult.state,
      subject: retaliation.subject,
      fills: [
        criticalRoll,
        {
          kind: "unitFeatureDecision",
          holeId: movementDecision.holeId,
          value: "decline",
        },
        damageRollFillWithGroups(damage, [[2, 2]]),
      ],
    });
    if (resolved.tag === "invalid") {
      throw new Error(resolved.message);
    }
    if (resolved.tag === "needsHoles") {
      throw new Error(
        `Unexpected holes: ${resolved.holes.map((hole) => hole.kind).join(",")}`,
      );
    }
    expect(resolved.tag).toBe("resolved");
  });

  test("a normal Opportunity Attack carries Savage Attacker's weapon-dice choice through both damage continuations", () => {
    const session = retaliationBoundarySession({
      includeWeaponDamageDiceChoice: true,
    });
    const retaliation = startRetaliationAfterSkeletonOpportunityAttack(session);
    const attack = attackRollFill(retaliation.attackRoll, {
      total: 30,
      naturalD20: 15,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state: retaliation.state,
        subject: retaliation.subject,
        fills: [attack],
      }),
      "rolledDice",
    );
    if (!("weaponDamageDiceRollChoiceProcedureRefs" in damage)) {
      throw new Error("Expected Savage Attacker weapon-dice choice refs.");
    }
    expect(damage.weaponDamageDiceRollChoiceProcedureRefs).toHaveLength(1);
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      savageAttackerUnitId,
    );
    const selectedDamage = {
      ...damageRollFillWithGroups(damage, [[8]]),
      weaponDamageDiceRollChoice: {
        procedureRef,
        selection: "second" as const,
        candidates: [
          { results: [DieRollResult(2)] },
          { results: [DieRollResult(8)] },
        ],
      },
    } satisfies Extract<BattleFill, { readonly kind: "rolledDice" }>;
    const resolved = resolveBattleSubject({
      state: retaliation.state,
      subject: retaliation.subject,
      fills: [
        attack,
        selectedDamage,
        attackDamageDispositionFill(
          requireHole(
            resolveBattleSubject({
              state: retaliation.state,
              subject: retaliation.subject,
              fills: [attack, selectedDamage],
            }),
            "attackDamageDisposition",
          ),
          { kind: "ordinaryDamage" },
        ),
      ],
    });
    if (resolved.tag === "invalid") {
      throw new Error(resolved.message);
    }
    if (resolved.tag === "needsHoles") {
      throw new Error(
        `Unexpected holes: ${resolved.holes.map((hole) => hole.kind).join(",")}`,
      );
    }
    expect(resolved.tag).toBe("resolved");
  });

  test("a slashing-resistant Opportunity Attack with zero reduced damage skips relationship targets", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-opportunity-attack-zero-reduced-damage"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: {
            ...testLongswordAttack(),
            abilityModifier: battleAbilityModifier(-1),
          },
        }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const skeletonTurn = requireResolved(
      endTurn({ state: session.state, actorId: fighterId }),
    );
    const opportunity = startFighterOpportunityAttackAfterMovement(
      skeletonTurn.state,
      skeletonId,
    );
    const attack = attackRollFill(opportunity.attackRoll, {
      total: 30,
      naturalD20: 15,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [attack],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [attack, damageRollFill(damage, 1)],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("a marked target moving away opens a marked-damage Opportunity Attack rider", () => {
    const markedTargetStatBlock = statBlockRecord();
    const session = startBattleSessionRight({
      battleId: battleId("battle-opportunity-attack-marked-damage-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testLongswordAttack(),
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({
          initiative: 10,
          currentHp: 20,
          statBlock: {
            ...markedTargetStatBlock,
            statBlock: {
              ...markedTargetStatBlock.statBlock,
              hp: { kind: "literal" as const, value: 20 },
            },
          },
        }),
      ],
    });
    const markAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark bonus-action spell act.");
    }
    const marked = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: markAct.subject,
        fills: [
          targetFill(findHole(markAct.initialHoles, "targetChoice"), goblinId),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: marked.state, actorId: fighterId }),
    );
    const opportunity = startFighterOpportunityAttackAfterMovement(
      goblinTurn.state,
      goblinId,
    );
    const attack = attackRollFill(opportunity.attackRoll, {
      total: 30,
      naturalD20: 15,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [attack],
      }),
      "rolledDice",
    );
    const resolved = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [attack, damageRollFillWithGroups(damage, [[4], [3]])],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("a Hideous Laughter target repeats its save after an Opportunity Attack", () => {
    const hideousLaughter = spellRecord("hideous_laughter");
    const baseTarget = statBlockWithCreatureType("humanoid");
    const incapacitatedImmuneTarget = {
      ...baseTarget,
      statBlock: {
        ...baseTarget.statBlock,
        immunities: { conditions: ["incapacitated"] as const },
        hp: { kind: "literal" as const, value: 20 },
      },
    };
    const session = startBattleSessionRight({
      battleId: battleId("battle-opportunity-attack-hideous-laughter"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Hideous Laughter caster",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [hideousLaughter],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({
          combatantId: goblinId,
          displayName: "Incapacitated-immune target",
          initiative: 20,
          statBlock: incapacitatedImmuneTarget,
          currentHp: 20,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Synthetic Opportunity reactor",
          initiative: 10,
          attack: testLongswordAttack(),
        }),
      ],
    });
    const casterId = wizardId;
    const castAct = spellAct({
      session,
      spellId: "hideous_laughter",
      slotLevel: 1,
    });
    const target = findHole(castAct.initialHoles, "spellTargetList");
    const targeted = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        spellTargetListFill(target, casterId, "hideous_laughter", [goblinId]),
      ],
    });
    if (targeted.tag !== "needsHoles") {
      throw new Error("Expected Hideous Laughter saving throw hole.");
    }
    const save = requireHole(targeted, "savingThrowOutcome");
    const cast = requireResolved(
      resolveBattleSubject({
        state: targeted.state,
        subject: castAct.subject,
        fills: [
          spellTargetListFill(target, casterId, "hideous_laughter", [goblinId]),
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: casterId }),
    );
    const opportunity = startFighterOpportunityAttackAfterMovement(
      targetTurn.state,
      goblinId,
    );
    const attack = attackRollFill(opportunity.attackRoll, {
      total: 30,
      naturalD20: 15,
      rollMode: "advantage",
    });
    const damage = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [attack],
      }),
      "rolledDice",
    );
    const afterDamage = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [attack, damageRollFillWithGroups(damage, [[4]])],
    });
    expect(afterDamage).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          hideousLaughterRepeatSave: {
            targetId: goblinId,
            trigger: "damage",
          },
        },
      ],
    });
    if (afterDamage.tag !== "needsHoles") {
      throw new Error("Expected Hideous Laughter repeat save hole.");
    }
    const repeatSave = requireHole(afterDamage, "savingThrowOutcome");
    const completed = resolveBattleSubject({
      state: afterDamage.state,
      subject: opportunity.subject,
      fills: [
        attack,
        damageRollFillWithGroups(damage, [[4]]),
        savingThrowOutcomeFill(repeatSave, [
          { targetId: goblinId, succeeded: true },
        ]),
      ],
    });
    expect(completed).toMatchObject({ tag: "resolved" });
  });
});
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
