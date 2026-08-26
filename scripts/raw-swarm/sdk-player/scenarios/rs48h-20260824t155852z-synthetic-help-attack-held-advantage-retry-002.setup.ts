import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const scenarioId =
  "rs48h-20260824t155852z-synthetic-help-attack-held-advantage-retry-002";
const GOBLIN_WARRIOR_STAT_BLOCK_ID = "stat_block_goblin_warrior";
const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const WOLF_STAT_BLOCK_ID = "stat_block_wolf";
const REQUIRED_STAT_BLOCK_IDS = [
  GOBLIN_WARRIOR_STAT_BLOCK_ID,
  SKELETON_STAT_BLOCK_ID,
  WOLF_STAT_BLOCK_ID,
] as const;

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const goblinStatBlock = statBlocks.find(
    ({ id }) => id === GOBLIN_WARRIOR_STAT_BLOCK_ID,
  );
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === SKELETON_STAT_BLOCK_ID,
  );
  const wolfStatBlock = statBlocks.find(({ id }) => id === WOLF_STAT_BLOCK_ID);
  const missingStatBlockIds = [
    ...(goblinStatBlock === undefined ? [GOBLIN_WARRIOR_STAT_BLOCK_ID] : []),
    ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
    ...(wolfStatBlock === undefined ? [WOLF_STAT_BLOCK_ID] : []),
  ];
  if (
    goblinStatBlock === undefined ||
    skeletonStatBlock === undefined ||
    wolfStatBlock === undefined
  ) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied canonical SRD stat-block catalog is missing one or more scenario-fixed combatant records.",
      observation: {
        scenarioId,
        blockedOperation: "battleCreatureInitFromStatBlock",
        requiredStatBlockIds: REQUIRED_STAT_BLOCK_IDS,
        missingStatBlockIds,
      },
    };
  }

  const goblinId = sdk.combatantId("goblin-warrior");
  const skeletonId = sdk.combatantId("skeleton");
  const wolfId = sdk.combatantId("wolf");

  const goblin = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinId,
    statBlock: goblinStatBlock,
    initiative: sdk.initiativeScore(17),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(goblin)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblin.left),
      observation: { stage: "goblin-warrior-initialization" },
    };
  }

  const skeleton = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(12),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(skeleton)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeleton.left),
      observation: { stage: "skeleton-initialization" },
    };
  }

  const wolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(8),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(wolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(wolf.left),
      observation: { stage: "wolf-initialization" },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(scenarioId),
    combatants: [goblin.right, skeleton.right, wolf.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: { stage: "battle-start" },
    };
  }

  const cells = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) => ({
      x,
      y,
      terrain: "ordinary" as const,
    })),
  ).flat();

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: { cells, boundaries: [] },
      placements: [
        { tokenId: goblinId, coordinate: { x: 1, y: 4 } },
        { tokenId: wolfId, coordinate: { x: 1, y: 3 } },
        { tokenId: skeletonId, coordinate: { x: 1, y: 1 } },
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
      { attackerId: skeletonId, enemyId: wolfId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: { stage: "scenario-session-composition" },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: {
      setup: "geometry-derived-help-attack",
      delegatedChoices: [
        "help-target",
        "shortbow-attack",
        "attack-and-damage-dice",
      ],
    },
  };
};
