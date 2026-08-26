import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const SCENARIO_ID =
  "rs48h-20260824t155852z-synthetic-disengage-multiple-reactors-001";

const WOLF_STAT_BLOCK_ID = "stat_block_wolf";
const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const GOBLIN_WARRIOR_STAT_BLOCK_ID = "stat_block_goblin_warrior";
const REQUIRED_STAT_BLOCK_IDS = [
  WOLF_STAT_BLOCK_ID,
  SKELETON_STAT_BLOCK_ID,
  GOBLIN_WARRIOR_STAT_BLOCK_ID,
] as const;

const WOLF_ID = "wolf";
const SKELETON_ID = "skeleton";
const GOBLIN_WARRIOR_ID = "goblin-warrior";

const ARENA_SIDE_LENGTH_FEET = 50;
const CELL_SIDE_LENGTH_FEET = 5;
const ARENA_SIDE_CELL_COUNT = ARENA_SIDE_LENGTH_FEET / CELL_SIDE_LENGTH_FEET;

const INITIAL_PLACEMENTS_FEET = {
  wolf: { x: 25, y: 20 },
  skeleton: { x: 20, y: 20 },
  goblinWarrior: { x: 25, y: 25 },
} as const;
const DEN_ENTRANCE_FEET = { x: 25, y: 45 } as const;

const INITIATIVE_SCORES = {
  wolf: 18,
  skeleton: 14,
  goblinWarrior: 10,
} as const;

const feetToCell = (feet: number): number => feet / CELL_SIDE_LENGTH_FEET;

const coordinateFromFeet = (coordinate: {
  readonly x: number;
  readonly y: number;
}) => ({
  x: feetToCell(coordinate.x),
  y: feetToCell(coordinate.y),
});

const INITIAL_PLACEMENTS_CELLS = {
  wolf: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.wolf),
  skeleton: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.skeleton),
  goblinWarrior: coordinateFromFeet(INITIAL_PLACEMENTS_FEET.goblinWarrior),
} as const;
const DEN_ENTRANCE_CELL = coordinateFromFeet(DEN_ENTRANCE_FEET);

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const wolfStatBlock = statBlocks.find(({ id }) => id === WOLF_STAT_BLOCK_ID);
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === SKELETON_STAT_BLOCK_ID,
  );
  const goblinWarriorStatBlock = statBlocks.find(
    ({ id }) => id === GOBLIN_WARRIOR_STAT_BLOCK_ID,
  );
  const missingStatBlockIds = [
    ...(wolfStatBlock === undefined ? [WOLF_STAT_BLOCK_ID] : []),
    ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
    ...(goblinWarriorStatBlock === undefined
      ? [GOBLIN_WARRIOR_STAT_BLOCK_ID]
      : []),
  ];
  if (
    wolfStatBlock === undefined ||
    skeletonStatBlock === undefined ||
    goblinWarriorStatBlock === undefined
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

  const wolfId = sdk.combatantId(WOLF_ID);
  const skeletonId = sdk.combatantId(SKELETON_ID);
  const goblinWarriorId = sdk.combatantId(GOBLIN_WARRIOR_ID);
  const arrowStock = () => [sdk.battleAmmunitionStock("arrow", 20)];

  const wolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.wolf),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(wolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(wolf.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        combatant: WOLF_ID,
      },
    };
  }

  const skeleton = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.skeleton),
    ammunitionStocks: arrowStock(),
    conditions: [],
  });
  if (sdk.isLeft(skeleton)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeleton.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        combatant: SKELETON_ID,
      },
    };
  }

  const goblinWarrior = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinWarriorId,
    statBlock: goblinWarriorStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.goblinWarrior),
    ammunitionStocks: arrowStock(),
    conditions: [],
  });
  if (sdk.isLeft(goblinWarrior)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblinWarrior.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        combatant: GOBLIN_WARRIOR_ID,
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(SCENARIO_ID),
    combatants: [wolf.right, skeleton.right, goblinWarrior.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-battle-start",
        battleId: SCENARIO_ID,
      },
    };
  }

  const arenaCells = Array.from(
    { length: ARENA_SIDE_CELL_COUNT * ARENA_SIDE_CELL_COUNT },
    (_, index) => ({
      x: index % ARENA_SIDE_CELL_COUNT,
      y: Math.floor(index / ARENA_SIDE_CELL_COUNT),
      terrain: "ordinary" as const,
    }),
  );
  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: arenaCells,
        boundaries: [],
      },
      placements: [
        { tokenId: wolfId, coordinate: INITIAL_PLACEMENTS_CELLS.wolf },
        {
          tokenId: skeletonId,
          coordinate: INITIAL_PLACEMENTS_CELLS.skeleton,
        },
        {
          tokenId: goblinWarriorId,
          coordinate: INITIAL_PLACEMENTS_CELLS.goblinWarrior,
        },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: skeletonId, moverId: wolfId },
      { reactorId: goblinWarriorId, moverId: wolfId },
    ],
    // The den entrance and carried food are narrative objectives here, not
    // supported tactical objects or markers; neither is resolved in setup.
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "scenario-session-composition",
      },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: {
      scenarioId: SCENARIO_ID,
      setup: "ready",
      battleId: SCENARIO_ID,
      initiatives: INITIATIVE_SCORES,
      geometry: {
        coordinateUnits: "five-foot cells",
        arenaSideFeet: ARENA_SIDE_LENGTH_FEET,
        arenaCellCount: arenaCells.length,
        placementsInFeet: INITIAL_PLACEMENTS_FEET,
        placementsInCells: INITIAL_PLACEMENTS_CELLS,
        denEntrance: {
          coordinateFeet: DEN_ENTRANCE_FEET,
          coordinateCell: DEN_ENTRANCE_CELL,
          representation: "narrative-objective-only",
        },
      },
      carriedFood: "narrative-objective-only",
    },
  };
};
