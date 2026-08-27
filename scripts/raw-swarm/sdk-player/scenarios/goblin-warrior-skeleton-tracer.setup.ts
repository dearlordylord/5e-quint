import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const goblinStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  if (goblinStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Goblin Warrior Stat Block.",
      observation: { statBlockId: "stat_block_goblin_warrior" },
    };
  }
  const goblin = sdk.battleCreatureInitFromStatBlock({
    combatantId: sdk.combatantId("goblin-warrior"),
    initiative: sdk.initiativeScore(15),
    statBlock: goblinStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(goblin)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(goblin.left),
      observation: { combatant: "goblin-warrior" },
    };
  }
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );
  if (skeletonStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Skeleton Stat Block.",
      observation: { statBlockId: "stat_block_skeleton" },
    };
  }
  const skeleton = sdk.battleCreatureInitFromStatBlock({
    combatantId: sdk.combatantId("skeleton"),
    initiative: sdk.initiativeScore(10),
    statBlock: skeletonStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(skeleton)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(skeleton.left),
      observation: { combatant: "skeleton" },
    };
  }
  const started = sdk.startBattle({
    battleId: sdk.battleId("goblin-warrior-skeleton-tracer"),
    combatants: [goblin.right, skeleton.right],
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.left),
      observation: { operation: "startBattle" },
    };
  }
  const session = sdk.createScenarioSession({
    battle: started.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: [
          { x: 0, y: 0, terrain: "ordinary" },
          { x: 1, y: 0, terrain: "ordinary" },
        ],
        boundaries: [],
      },
      placements: [
        { tokenId: goblin.right.combatantId, coordinate: { x: 0, y: 0 } },
        { tokenId: skeleton.right.combatantId, coordinate: { x: 1, y: 0 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      {
        attackerId: goblin.right.combatantId,
        enemyId: skeleton.right.combatantId,
      },
      {
        attackerId: skeleton.right.combatantId,
        enemyId: goblin.right.combatantId,
      },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      {
        reactorId: goblin.right.combatantId,
        moverId: skeleton.right.combatantId,
      },
      {
        reactorId: skeleton.right.combatantId,
        moverId: goblin.right.combatantId,
      },
    ],
    objects: [],
  });
  return sdk.isLeft(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.left),
        observation: { operation: "createScenarioSession" },
      }
    : {
        kind: "ready",
        session: session.right,
        observation: {
          combatants: ["goblin-warrior", "skeleton"],
          initiatives: [15, 10],
        },
      };
};
