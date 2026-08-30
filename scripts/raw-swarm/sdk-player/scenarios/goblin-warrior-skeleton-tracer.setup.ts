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
      obstruction: sdk.battleStateInitIssueMessage(goblin.failure),
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
      obstruction: sdk.battleStateInitIssueMessage(skeleton.failure),
      observation: { combatant: "skeleton" },
    };
  }
  const started = sdk.startBattle({
    battleId: sdk.battleId("goblin-warrior-skeleton-tracer"),
    combatants: [goblin.success, skeleton.success],
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.failure),
      observation: { operation: "startBattle" },
    };
  }
  const session = sdk.createScenarioSession({
    battle: started.success,
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
        { tokenId: goblin.success.combatantId, coordinate: { x: 0, y: 0 } },
        { tokenId: skeleton.success.combatantId, coordinate: { x: 1, y: 0 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      {
        attackerId: goblin.success.combatantId,
        enemyId: skeleton.success.combatantId,
      },
      {
        attackerId: skeleton.success.combatantId,
        enemyId: goblin.success.combatantId,
      },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      {
        reactorId: goblin.success.combatantId,
        moverId: skeleton.success.combatantId,
      },
      {
        reactorId: skeleton.success.combatantId,
        moverId: goblin.success.combatantId,
      },
    ],
    objects: [],
  });
  return sdk.isLeft(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.failure),
        observation: { operation: "createScenarioSession" },
      }
    : {
        kind: "ready",
        session: session.success,
        observation: {
          combatants: ["goblin-warrior", "skeleton"],
          initiatives: [15, 10],
        },
      };
};
