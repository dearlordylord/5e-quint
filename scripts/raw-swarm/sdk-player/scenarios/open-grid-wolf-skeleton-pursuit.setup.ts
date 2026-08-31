import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({ sdk, statBlocks }) => {
  const wolfStatBlock = statBlocks.find(({ id }) => id === "stat_block_wolf");
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );

  if (wolfStatBlock === undefined || skeletonStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied public stat-block collection does not contain both the Wolf and Skeleton required by the scenario.",
      observation: {
        missingStatBlocks: [
          ...(wolfStatBlock === undefined ? ["stat_block_wolf"] : []),
          ...(skeletonStatBlock === undefined ? ["stat_block_skeleton"] : []),
        ],
      },
    };
  }

  const wolfId = sdk.combatantId("wolf");
  const skeletonId = sdk.combatantId("skeleton");

  const wolfInit = {
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(19),
    currentHp: sdk.hp(11),
    ammunitionStocks: [],
    conditions: [],
  };
  const skeletonInit = {
    combatantId: skeletonId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(9),
    currentHp: sdk.hp(13),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 0)],
    conditions: [],
  };
  const battle = sdk.startBattle({
    battleId: sdk.battleId("open-grid-wolf-skeleton-pursuit"),
    combatants: [wolfInit, skeletonInit],
  });
  if (sdk.isFailure(battle)) {
    return {
      kind: "obstructed",
      obstruction: `The public battle initializer could not start the required encounter: ${sdk.battleStateInitIssueMessage(battle.failure)}`,
      observation: { stage: "battle-start" },
    };
  }

  const cells = Array.from({ length: 7 * 7 }, (_, index) => ({
    x: index % 7,
    y: Math.floor(index / 7),
    terrain: "ordinary" as const,
  }));

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: { cells, boundaries: [] },
      placements: [
        { tokenId: wolfId, coordinate: { x: 3, y: 3 } },
        { tokenId: skeletonId, coordinate: { x: 3, y: 6 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: wolfId, moverId: skeletonId },
      { reactorId: skeletonId, moverId: wolfId },
    ],
    objects: [],
  });
  if (sdk.isFailure(session)) {
    return {
      kind: "obstructed",
      obstruction: `The public scenario-session surface rejected the required battlefield: ${sdk.scenarioSessionIssueMessage(session.failure)}`,
      observation: { stage: "scenario-session" },
    };
  }

  return {
    kind: "ready",
    session: session.success,
    observation: {
      scenarioId: "open-grid-wolf-skeleton-pursuit",
      combatants: ["wolf", "skeleton"],
      statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    },
  };
};
