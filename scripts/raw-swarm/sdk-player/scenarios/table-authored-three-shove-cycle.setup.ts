import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const wolfId = sdk.combatantId("wolf");
  const skeletonId = sdk.combatantId("skeleton");
  const goblinId = sdk.combatantId("goblin-warrior");

  const wolfStatBlock = statBlocks.find(({ id }) => id === "stat_block_wolf");
  if (wolfStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Wolf Stat Block.",
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        statBlockId: "stat_block_wolf",
      },
    };
  }
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );
  if (skeletonStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Skeleton Stat Block.",
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        statBlockId: "stat_block_skeleton",
      },
    };
  }
  const goblinStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  if (goblinStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Goblin Warrior Stat Block.",
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        statBlockId: "stat_block_goblin_warrior",
      },
    };
  }

  const shoveDistance = sdk.scenarioDistanceFeet(5);
  if (sdk.isLeft(shoveDistance)) {
    return {
      kind: "obstructed",
      obstruction: shoveDistance.left.message,
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        obstruction: "invalid-shove-distance",
      },
    };
  }

  const shoveDecisionInputs = [
    {
      decisionId: "wolf-shoves-skeleton",
      question: {
        kind: "shoveTarget",
        shoverId: wolfId,
        targetId: skeletonId,
      },
      answer: {
        direction: "north",
        distanceFeet: shoveDistance.right,
        attackerCanSeeTarget: true,
        cover: "none",
        traversal: "open",
      },
    },
    {
      decisionId: "skeleton-shoves-goblin-warrior",
      question: {
        kind: "shoveTarget",
        shoverId: skeletonId,
        targetId: goblinId,
      },
      answer: {
        direction: "east",
        distanceFeet: shoveDistance.right,
        attackerCanSeeTarget: true,
        cover: "none",
        traversal: "open",
      },
    },
    {
      decisionId: "goblin-warrior-shoves-wolf",
      question: {
        kind: "shoveTarget",
        shoverId: goblinId,
        targetId: wolfId,
      },
      answer: {
        direction: "south-west",
        distanceFeet: shoveDistance.right,
        attackerCanSeeTarget: true,
        cover: "none",
        traversal: "open",
      },
    },
  ] as const;

  const spatialDecisions = [];
  for (const input of shoveDecisionInputs) {
    const decision = sdk.tableAuthoredSpatialDecision(input);
    if (sdk.isLeft(decision)) {
      return {
        kind: "obstructed",
        obstruction: decision.left.message,
        observation: {
          scenarioId: "table-authored-three-shove-cycle",
          obstruction: "invalid-table-authored-spatial-decision",
          decisionId: input.decisionId,
        },
      };
    }
    spatialDecisions.push(decision.right);
  }

  const combatantInits = [
    sdk.battleCreatureInitFromStatBlock({
      combatantId: wolfId,
      statBlock: wolfStatBlock,
      initiative: sdk.initiativeScore(18),
      ammunitionStocks: [],
      conditions: [],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: skeletonId,
      statBlock: skeletonStatBlock,
      initiative: sdk.initiativeScore(12),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: goblinId,
      statBlock: goblinStatBlock,
      initiative: sdk.initiativeScore(6),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    }),
  ];
  const invalidCombatant = combatantInits.find(sdk.isLeft);
  if (invalidCombatant !== undefined) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(invalidCombatant.left),
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        obstruction: "stat-block-battle-initialization-failed",
      },
    };
  }
  const combatants = combatantInits
    .filter((combatant) => !sdk.isLeft(combatant))
    .map((combatant) => combatant.right);

  const battle = sdk.startBattle({
    battleId: sdk.battleId("table-authored-three-shove-cycle"),
    combatants,
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        obstruction: "battle-start-failed",
      },
    };
  }

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "tableAuthored",
      spatialDecisions,
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: {
        scenarioId: "table-authored-three-shove-cycle",
        obstruction: "scenario-session-composition-failed",
      },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: { scenarioId: "table-authored-three-shove-cycle" },
  };
};
