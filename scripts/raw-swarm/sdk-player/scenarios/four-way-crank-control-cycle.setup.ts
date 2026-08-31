import type { ScenarioDirection, ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const brineId = sdk.combatantId("brine");
  const sootId = sdk.combatantId("soot");
  const rivetId = sdk.combatantId("rivet");
  const tangleId = sdk.combatantId("tangle");

  const brineStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  if (brineStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Goblin Warrior Stat Block.",
      observation: {
        scenarioId: "four-way-crank-control-cycle",
        statBlockId: "stat_block_goblin_warrior",
      },
    };
  }
  const rivetStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );
  if (rivetStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Skeleton Stat Block.",
      observation: {
        scenarioId: "four-way-crank-control-cycle",
        statBlockId: "stat_block_skeleton",
      },
    };
  }
  const tangleStatBlock = statBlocks.find(({ id }) => id === "stat_block_wolf");
  if (tangleStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Wolf Stat Block.",
      observation: {
        scenarioId: "four-way-crank-control-cycle",
        statBlockId: "stat_block_wolf",
      },
    };
  }

  const combatantInits = [
    {
      combatantId: brineId,
      statBlock: brineStatBlock,
      initiative: sdk.initiativeScore(22),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    },
    {
      combatantId: rivetId,
      statBlock: rivetStatBlock,
      initiative: sdk.initiativeScore(17),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    },
    {
      combatantId: sootId,
      statBlock: brineStatBlock,
      initiative: sdk.initiativeScore(12),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    },
    {
      combatantId: tangleId,
      statBlock: tangleStatBlock,
      initiative: sdk.initiativeScore(7),
      ammunitionStocks: [],
      conditions: [],
    },
  ];

  const started = sdk.startBattle({
    battleId: sdk.battleId("four-way-crank-control-cycle"),
    combatants: combatantInits,
  });
  if (sdk.isFailure(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleInitializationIssueMessage(started.failure),
      observation: {
        scenarioId: "four-way-crank-control-cycle",
        status: "battle-start-obstructed",
      },
    };
  }

  const adjacentDistance = sdk.scenarioDistanceFeet(5);
  if (sdk.isFailure(adjacentDistance)) {
    return {
      kind: "obstructed",
      obstruction: adjacentDistance.failure.message,
      observation: {
        scenarioId: "four-way-crank-control-cycle",
        status: "spatial-distance-obstructed",
      },
    };
  }
  const adjacentAnswer = (direction: ScenarioDirection) => ({
    direction,
    distanceFeet: adjacentDistance.success,
    attackerCanSeeTarget: true,
    cover: "none" as const,
    traversal: "open" as const,
  });
  const spatialDecisions = [
    {
      decisionId: "brine-shove-rivet",
      question: {
        kind: "shoveTarget" as const,
        shoverId: brineId,
        targetId: rivetId,
      },
      answer: adjacentAnswer("east"),
    },
    {
      decisionId: "rivet-grapple-soot",
      question: {
        kind: "grappleTarget" as const,
        grapplerId: rivetId,
        targetId: sootId,
      },
      answer: adjacentAnswer("south"),
    },
    {
      decisionId: "soot-shove-tangle",
      question: {
        kind: "shoveTarget" as const,
        shoverId: sootId,
        targetId: tangleId,
      },
      answer: adjacentAnswer("west"),
    },
    {
      decisionId: "tangle-shove-brine",
      question: {
        kind: "shoveTarget" as const,
        shoverId: tangleId,
        targetId: brineId,
      },
      answer: adjacentAnswer("north"),
    },
    {
      decisionId: "tangle-shove-soot",
      question: {
        kind: "shoveTarget" as const,
        shoverId: tangleId,
        targetId: sootId,
      },
      answer: adjacentAnswer("east"),
    },
  ] as const;
  const session = sdk.createScenarioSession({
    battle: started.success,
    spatial: { kind: "tableAuthored", spatialDecisions },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  return sdk.isFailure(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.failure),
        observation: {
          scenarioId: "four-way-crank-control-cycle",
          status: "scenario-session-obstructed",
        },
      }
    : {
        kind: "ready",
        session: session.success,
        observation: {
          scenarioId: "four-way-crank-control-cycle",
          status: "ready",
          spatialSource: "table-authored",
          spatialDecisionIds: spatialDecisions.map(
            ({ decisionId }) => decisionId,
          ),
        },
      };
};
