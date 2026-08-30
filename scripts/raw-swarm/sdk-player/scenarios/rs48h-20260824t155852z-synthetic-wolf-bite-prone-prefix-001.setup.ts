import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const SCENARIO_ID =
  "rs48h-20260824t155852z-synthetic-wolf-bite-prone-prefix-001";
const WOLF_STAT_BLOCK_ID = "stat_block_wolf";
const BITING_WOLF_ID = "biting-wolf";
const TARGET_WOLF_ID = "target-wolf";
const ARENA_SIDE_LENGTH_FEET = 25;
const CELL_SIDE_LENGTH_FEET = 5;
const ARENA_SIDE_CELL_COUNT = ARENA_SIDE_LENGTH_FEET / CELL_SIDE_LENGTH_FEET;

const INITIAL_PLACEMENT_CELLS = {
  bitingWolf: { x: 1, y: 2 },
  targetWolf: { x: 2, y: 2 },
} as const;

const SHARED_INITIATIVE_SCORE = 14;
const INITIATIVE_SCORES = {
  bitingWolf: SHARED_INITIATIVE_SCORE,
  targetWolf: SHARED_INITIATIVE_SCORE,
} as const;

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const wolfStatBlock = statBlocks.find(({ id }) => id === WOLF_STAT_BLOCK_ID);
  if (wolfStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied canonical SRD stat-block catalog does not contain the Wolf required by this scenario.",
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        requiredStatBlockIds: [WOLF_STAT_BLOCK_ID],
        missingStatBlockIds: [WOLF_STAT_BLOCK_ID],
      },
    };
  }

  const bitingWolfId = sdk.combatantId(BITING_WOLF_ID);
  const targetWolfId = sdk.combatantId(TARGET_WOLF_ID);
  const bitingWolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: bitingWolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.bitingWolf),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(bitingWolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(bitingWolf.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        combatant: BITING_WOLF_ID,
      },
    };
  }

  const targetWolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: targetWolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(INITIATIVE_SCORES.targetWolf),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(targetWolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(targetWolf.left),
      observation: {
        scenarioId: SCENARIO_ID,
        capability: "canonical-stat-block-battle-initialization",
        combatant: TARGET_WOLF_ID,
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(SCENARIO_ID),
    combatants: [bitingWolf.right, targetWolf.right],
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
        {
          tokenId: bitingWolfId,
          coordinate: INITIAL_PLACEMENT_CELLS.bitingWolf,
        },
        {
          tokenId: targetWolfId,
          coordinate: INITIAL_PLACEMENT_CELLS.targetWolf,
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
    // Bite is melee-only and neither combatant moves in this scenario, so no
    // ranged-proximity, movement-ally, or Opportunity Attack relationship is
    // required at the setup boundary.
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
      initiativeScores: INITIATIVE_SCORES,
      startingSquares: INITIAL_PLACEMENT_CELLS,
      arena: {
        sideLengthFeet: ARENA_SIDE_LENGTH_FEET,
        cellSizeFeet: CELL_SIDE_LENGTH_FEET,
        cellCount: arenaCells.length,
      },
    },
  };
};
