import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

const scenarioId = "rs48h-20260824t155852z-synthetic-dash-extended-route-001";
const SKELETON_STAT_BLOCK_ID = "stat_block_skeleton";
const WOLF_STAT_BLOCK_ID = "stat_block_wolf";
const REQUIRED_STAT_BLOCK_IDS = [
  SKELETON_STAT_BLOCK_ID,
  WOLF_STAT_BLOCK_ID,
] as const;

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === SKELETON_STAT_BLOCK_ID,
  );
  const wolfStatBlock = statBlocks.find(({ id }) => id === WOLF_STAT_BLOCK_ID);
  const missingStatBlockIds = [
    ...(skeletonStatBlock === undefined ? [SKELETON_STAT_BLOCK_ID] : []),
    ...(wolfStatBlock === undefined ? [WOLF_STAT_BLOCK_ID] : []),
  ];
  if (skeletonStatBlock === undefined || wolfStatBlock === undefined) {
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

  const skeletonId = sdk.combatantId("skeleton");
  const wolfId = sdk.combatantId("wolf");

  const skeletonInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(16),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isFailure(skeletonInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeletonInit.failure),
      observation: {
        scenarioId,
        blockedOperation: "battleCreatureInitFromStatBlock",
        combatant: "Skeleton",
      },
    };
  }

  const wolfInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(11),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isFailure(wolfInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(wolfInit.failure),
      observation: {
        scenarioId,
        blockedOperation: "battleCreatureInitFromStatBlock",
        combatant: "Wolf",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(scenarioId),
    combatants: [skeletonInit.success, wolfInit.success],
  });
  if (sdk.isFailure(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.failure),
      observation: { scenarioId, blockedOperation: "startBattle" },
    };
  }

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: Array.from({ length: 25 }, (_, x) =>
          Array.from({ length: 25 }, (_, y) => ({
            x,
            y,
            terrain: "ordinary" as const,
          })),
        ).flat(),
        boundaries: [],
      },
      placements: [
        { tokenId: skeletonId, coordinate: { x: 2, y: 12 } },
        { tokenId: wolfId, coordinate: { x: 24, y: 12 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  if (sdk.isFailure(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.failure),
      observation: { scenarioId, blockedOperation: "createScenarioSession" },
    };
  }

  return {
    kind: "ready",
    session: session.success,
    observation: {
      scenarioId,
      initiative: { Skeleton: 16, Wolf: 11 },
      blockingPosition: { x: 12, y: 12 },
      fixedDistanceFeet: 50,
      preservedPlayerChoices: [
        "Skeleton Dash action",
        "Skeleton movement route",
      ],
    },
  };
};
