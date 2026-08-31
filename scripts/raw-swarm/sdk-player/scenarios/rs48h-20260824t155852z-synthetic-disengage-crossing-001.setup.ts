import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const SCENARIO_ID = "rs48h-20260824t155852z-synthetic-disengage-crossing-001";

const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const WOLF_STAT_BLOCK_ID = "stat_block_wolf";
const GOBLIN_STAT_BLOCK_ID = "stat_block_goblin_warrior";
const REQUIRED_STAT_BLOCK_IDS = [
  SKELETON_STAT_BLOCK_ID,
  WOLF_STAT_BLOCK_ID,
  GOBLIN_STAT_BLOCK_ID,
] as const;

const ARENA_SIDE_LENGTH_FEET = 50;
const CELL_SIDE_LENGTH_FEET = 5;
const ARENA_SIDE_CELL_COUNT = ARENA_SIDE_LENGTH_FEET / CELL_SIDE_LENGTH_FEET;
const INITIAL_PLACEMENTS_FEET = {
  skeleton: { x: 10, y: 10 },
  wolf: { x: 15, y: 10 },
  goblinWarrior: { x: 35, y: 35 },
} as const;
const INITIATIVE_SCORES = {
  skeleton: 18,
  wolf: 13,
  goblinWarrior: 9,
} as const;

const feetToCell = (feet: number): number => feet / CELL_SIDE_LENGTH_FEET;

const coordinateFromFeet = (coordinate: {
  readonly x: number;
  readonly y: number;
}) => ({
  x: feetToCell(coordinate.x),
  y: feetToCell(coordinate.y),
});

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const findStatBlock = (statBlockId: string) =>
    statBlocks.find(({ id }) => id === statBlockId);
  const skeletonStatBlock = findStatBlock(SKELETON_STAT_BLOCK_ID);
  const wolfStatBlock = findStatBlock(WOLF_STAT_BLOCK_ID);
  const goblinStatBlock = findStatBlock(GOBLIN_STAT_BLOCK_ID);
  const missingStatBlockIds = [
    ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
    ...(wolfStatBlock === undefined ? [WOLF_STAT_BLOCK_ID] : []),
    ...(goblinStatBlock === undefined ? [GOBLIN_STAT_BLOCK_ID] : []),
  ];
  if (
    skeletonStatBlock === undefined ||
    wolfStatBlock === undefined ||
    goblinStatBlock === undefined
  ) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied canonical SRD stat-block catalog is missing one or more scenario-fixed combatant records.",
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        requiredStatBlockIds: REQUIRED_STAT_BLOCK_IDS,
        missingStatBlockIds,
      },
    };
  }

  const skeletonId = sdk.combatantId("skeleton");
  const wolfId = sdk.combatantId("wolf");
  const goblinId = sdk.combatantId("goblin-warrior");

  const arrowStock = () => [sdk.battleAmmunitionStock("arrow", 20)];
  const skeleton = {
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.skeleton),
    ammunitionStocks: arrowStock(),
    conditions: [],
  };
  const wolf = {
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.wolf),
    ammunitionStocks: [],
    conditions: [],
  };
  const goblin = {
    combatantId: goblinId,
    statBlock: goblinStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.goblinWarrior),
    ammunitionStocks: arrowStock(),
    conditions: [],
  };
  const battle = sdk.startBattle({
    battleId: sdk.battleId(SCENARIO_ID),
    combatants: [skeleton, wolf, goblin],
  });
  if (sdk.isFailure(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleInitializationIssueMessage(battle.failure),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-battle-start",
        battleId: SCENARIO_ID,
      },
    };
  }

  const arenaCells = Array.from({ length: ARENA_SIDE_CELL_COUNT }, (_, x) =>
    Array.from({ length: ARENA_SIDE_CELL_COUNT }, (_, y) => ({
      x,
      y,
      terrain: "ordinary" as const,
    })),
  ).flat();

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: arenaCells,
        boundaries: [],
      },
      placements: [
        {
          tokenId: skeletonId,
          coordinate: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.skeleton),
        },
        {
          tokenId: wolfId,
          coordinate: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.wolf),
        },
        {
          tokenId: goblinId,
          coordinate: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.goblinWarrior),
        },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    // These are directed only for the two creatures with ranged attacks. The
    // melee-only Wolf remains represented in the independent OA channel.
    initialRangedAttackEnemyRelationships: [
      { attackerId: skeletonId, enemyId: wolfId },
      { attackerId: skeletonId, enemyId: goblinId },
      { attackerId: goblinId, enemyId: skeletonId },
      { attackerId: goblinId, enemyId: wolfId },
    ],
    // Every pair is hostile, so no mover/ally crossing relation is authored.
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: skeletonId, moverId: wolfId },
      { reactorId: skeletonId, moverId: goblinId },
      { reactorId: wolfId, moverId: skeletonId },
      { reactorId: wolfId, moverId: goblinId },
      { reactorId: goblinId, moverId: skeletonId },
      { reactorId: goblinId, moverId: wolfId },
    ],
    objects: [],
  });
  if (sdk.isFailure(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.failure),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "scenario-session-composition",
      },
    };
  }

  return {
    kind: "ready",
    session: session.success,
    observation: {
      scenarioId: SCENARIO_ID,
      setup: "ready",
      battleId: SCENARIO_ID,
      initiatives: INITIATIVE_SCORES,
      geometry: {
        coordinateUnits: "five-foot cells",
        arenaSideFeet: ARENA_SIDE_LENGTH_FEET,
        arenaCellCount: ARENA_SIDE_CELL_COUNT * ARENA_SIDE_CELL_COUNT,
        placementsInFeet: INITIAL_PLACEMENTS_FEET,
      },
    },
  };
};
