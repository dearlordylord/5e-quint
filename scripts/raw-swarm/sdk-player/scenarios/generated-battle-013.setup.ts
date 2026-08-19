import type { ScenarioDirection, ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlockCatalog } = context;
  const brineId = sdk.combatantId("brine");
  const sootId = sdk.combatantId("soot");
  const rivetId = sdk.combatantId("rivet");
  const tangleId = sdk.combatantId("tangle");

  const combatantInits = [
    sdk.battleCreatureInitFromStatBlock({
      combatantId: brineId,
      statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
      initiative: sdk.initiativeScore(22),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: rivetId,
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      initiative: sdk.initiativeScore(17),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: sootId,
      statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
      initiative: sdk.initiativeScore(12),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: tangleId,
      statBlock: statBlockCatalog.requireStatBlock("stat_block_wolf"),
      initiative: sdk.initiativeScore(7),
      ammunitionStocks: [],
    }),
  ];

  const invalidCombatant = combatantInits.find(sdk.isLeft);
  if (invalidCombatant !== undefined) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(invalidCombatant.left),
      observation: {
        scenarioId: "generated-battle-013",
        status: "stat-block-initialization-obstructed",
      },
    };
  }
  const combatants = combatantInits
    .filter((combatant) => !sdk.isLeft(combatant))
    .map((combatant) => combatant.right);

  const started = sdk.startBattle({
    battleId: sdk.battleId("generated-battle-013"),
    combatants,
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.left),
      observation: {
        scenarioId: "generated-battle-013",
        status: "battle-start-obstructed",
      },
    };
  }

  const adjacentDistance = sdk.scenarioDistanceFeet(5);
  if (sdk.isLeft(adjacentDistance)) {
    return {
      kind: "obstructed",
      obstruction: adjacentDistance.left.message,
      observation: {
        scenarioId: "generated-battle-013",
        status: "spatial-distance-obstructed",
      },
    };
  }
  const adjacentAnswer = (direction: ScenarioDirection) => ({
    direction,
    distanceFeet: adjacentDistance.right,
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
    battle: started.right,
    spatial: { kind: "tableAuthored", spatialDecisions },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  return sdk.isLeft(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.left),
        observation: {
          scenarioId: "generated-battle-013",
          status: "scenario-session-obstructed",
        },
      }
    : {
        kind: "ready",
        session: session.right,
        observation: {
          scenarioId: "generated-battle-013",
          status: "ready",
          spatialSource: "table-authored",
          spatialDecisionIds: spatialDecisions.map(
            ({ decisionId }) => decisionId,
          ),
        },
      };
};
