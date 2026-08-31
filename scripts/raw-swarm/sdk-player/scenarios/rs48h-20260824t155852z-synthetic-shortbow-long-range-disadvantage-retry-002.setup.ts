import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const SCENARIO_ID =
  "rs48h-20260824t155852z-synthetic-shortbow-long-range-disadvantage-retry-002";
const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const WOLF_STAT_BLOCK_ID = "stat_block_wolf";

const arenaCells = Array.from({ length: 10 }, (_, xIndex) =>
  Array.from({ length: 26 }, (_, yIndex) => ({
    x: xIndex,
    y: yIndex,
    terrain: "ordinary" as const,
  })),
).flat();

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const skeletonId = sdk.combatantId("skeleton");
  const wolfId = sdk.combatantId("wolf");
  const skeletonInitiative = sdk.initiativeScore(13);
  const wolfInitiative = sdk.initiativeScore(12);
  const skeletonStatBlock = context.statBlocks.find(
    ({ id }) => id === SKELETON_STAT_BLOCK_ID,
  );
  const wolfStatBlock = context.statBlocks.find(
    ({ id }) => id === WOLF_STAT_BLOCK_ID,
  );

  if (skeletonStatBlock === undefined || wolfStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied stat-block collection does not contain both scenario-fixed combatants.",
      observation: {
        missingStatBlocks: [
          ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
          ...(wolfStatBlock === undefined ? [WOLF_STAT_BLOCK_ID] : []),
        ],
      },
    };
  }

  const skeletonInit = {
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: skeletonInitiative,
    currentHp: sdk.hp(13),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };

  const wolfInit = {
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: wolfInitiative,
    currentHp: sdk.hp(11),
    ammunitionStocks: [],
    conditions: [],
  };

  const battle = sdk.startBattle({
    battleId: sdk.battleId(SCENARIO_ID),
    combatants: [skeletonInit, wolfInit],
  });

  if (sdk.isFailure(battle)) {
    return {
      kind: "obstructed",
      obstruction: `The canonical battle could not be started: ${sdk.battleStateInitIssueMessage(battle.failure)}`,
      observation: { stage: "battle-setup" },
    };
  }

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: arenaCells,
        boundaries: [],
      },
      placements: [
        { tokenId: skeletonId, coordinate: { x: 5, y: 23 } },
        { tokenId: wolfId, coordinate: { x: 5, y: 3 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
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

  if (sdk.isFailure(session)) {
    return {
      kind: "obstructed",
      obstruction: `The public scenario-session surface rejected the fixed battlefield: ${sdk.scenarioSessionIssueMessage(session.failure)}`,
      observation: { stage: "scenario-session" },
    };
  }

  return {
    kind: "ready",
    session: session.success,
    observation: {
      scenarioId: SCENARIO_ID,
      spatialSource: "geometryDerived",
      delegated: ["player act", "player target", "player dice"],
    },
  };
};
