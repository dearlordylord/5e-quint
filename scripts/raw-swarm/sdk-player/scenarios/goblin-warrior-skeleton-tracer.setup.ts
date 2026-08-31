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
  const goblin = {
    combatantId: sdk.combatantId("goblin-warrior"),
    initiative: sdk.initiativeScore(15),
    statBlock: goblinStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
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
  const skeleton = {
    combatantId: sdk.combatantId("skeleton"),
    initiative: sdk.initiativeScore(10),
    statBlock: skeletonStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
  const started = sdk.startBattle({
    battleId: sdk.battleId("goblin-warrior-skeleton-tracer"),
    combatants: [goblin, skeleton],
  });
  if (sdk.isFailure(started)) {
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
        { tokenId: goblin.combatantId, coordinate: { x: 0, y: 0 } },
        { tokenId: skeleton.combatantId, coordinate: { x: 1, y: 0 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      {
        attackerId: goblin.combatantId,
        enemyId: skeleton.combatantId,
      },
      {
        attackerId: skeleton.combatantId,
        enemyId: goblin.combatantId,
      },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      {
        reactorId: goblin.combatantId,
        moverId: skeleton.combatantId,
      },
      {
        reactorId: skeleton.combatantId,
        moverId: goblin.combatantId,
      },
    ],
    objects: [],
  });
  return sdk.isFailure(session)
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
