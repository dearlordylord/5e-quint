import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const SCENARIO_ID =
  "rs48h-20260824t155852z-synthetic-dodge-defense-lifetime-retry-002";
const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const GOBLIN_WARRIOR_STAT_BLOCK_ID = "stat_block_goblin_warrior";

const arenaCells = Array.from({ length: 8 }, (_, row) =>
  Array.from({ length: 6 }, (_, column) => ({
    x: column,
    y: row,
    terrain: "ordinary" as const,
  })),
).flat();

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const skeletonId = sdk.combatantId("skeleton");
  const goblinId = sdk.combatantId("goblin-warrior");
  const skeletonStatBlock = context.statBlocks.find(
    ({ id }) => id === SKELETON_STAT_BLOCK_ID,
  );
  const goblinWarriorStatBlock = context.statBlocks.find(
    ({ id }) => id === GOBLIN_WARRIOR_STAT_BLOCK_ID,
  );

  if (skeletonStatBlock === undefined || goblinWarriorStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied stat-block collection does not contain both scenario-fixed combatants.",
      observation: {
        missingStatBlocks: [
          ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
          ...(goblinWarriorStatBlock === undefined
            ? [GOBLIN_WARRIOR_STAT_BLOCK_ID]
            : []),
        ],
      },
    };
  }

  const skeletonResult = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(17),
    currentHp: sdk.hp(13),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(skeletonResult)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeletonResult.left),
      observation: {
        operation: "battleCreatureInitFromStatBlock",
        combatant: "Skeleton",
      },
    };
  }

  const goblinResult = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinId,
    statBlock: goblinWarriorStatBlock,
    initiative: sdk.initiativeScore(12),
    currentHp: sdk.hp(10),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(goblinResult)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblinResult.left),
      observation: {
        operation: "battleCreatureInitFromStatBlock",
        combatant: "Goblin Warrior",
      },
    };
  }

  const battleResult = sdk.startBattle({
    battleId: sdk.battleId(SCENARIO_ID),
    combatants: [skeletonResult.right, goblinResult.right],
  });
  if (sdk.isLeft(battleResult)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battleResult.left),
      observation: { operation: "startBattle" },
    };
  }

  const sessionResult = sdk.createScenarioSession({
    battle: battleResult.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: arenaCells,
        boundaries: [],
      },
      placements: [
        { tokenId: skeletonId, coordinate: { x: 2, y: 4 } },
        { tokenId: goblinId, coordinate: { x: 5, y: 4 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: goblinId, enemyId: skeletonId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  if (sdk.isLeft(sessionResult)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(sessionResult.left),
      observation: { operation: "createScenarioSession" },
    };
  }

  return {
    kind: "ready",
    session: sessionResult.right,
    observation: {
      scenarioId: SCENARIO_ID,
      spatialSource: "geometryDerived",
      delegatedChoices: ["legal attack target", "all dice rolls"],
    },
  };
};
