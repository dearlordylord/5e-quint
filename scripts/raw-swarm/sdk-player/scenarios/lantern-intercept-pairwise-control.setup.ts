import type { ScenarioPlacement, ScenarioSetup } from "@dnd/scenario-setup-sdk";

const scenarioId = "lantern-intercept-pairwise-control";

const pillarCoordinates = [
  { x: 4, y: 3 },
  { x: 7, y: 3 },
  { x: 4, y: 6 },
  { x: 7, y: 6 },
] as const;

const pillarBoundary = (
  between: readonly [
    { readonly x: number; readonly y: number },
    { readonly x: number; readonly y: number },
  ],
) => ({
  between,
  traversal: "blocked" as const,
  sight: "blocked" as const,
  cover: { kind: "intervening" as const, degree: "total" as const },
});

const pillarBoundaries = pillarCoordinates.flatMap(({ x, y }) => [
  pillarBoundary([
    { x, y },
    { x, y: y - 1 },
  ]),
  pillarBoundary([
    { x, y },
    { x: x + 1, y },
  ]),
  pillarBoundary([
    { x, y },
    { x, y: y + 1 },
  ]),
  pillarBoundary([
    { x, y },
    { x: x - 1, y },
  ]),
]);

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;

  const wolfId = sdk.combatantId("wolf");
  const skeletonId = sdk.combatantId("skeleton");
  const hawkId = sdk.combatantId("hawk");

  const wolf = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_wolf",
  );
  const hawk = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_hawk",
  );
  const skeleton = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_skeleton",
  );
  if (wolf === undefined || hawk === undefined || skeleton === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied Stat Block catalog is missing a required scenario combatant.",
      observation: {
        tag: "required-stat-block-missing",
        scenarioId,
        wolfFound: wolf !== undefined,
        hawkFound: hawk !== undefined,
        skeletonFound: skeleton !== undefined,
      },
    };
  }

  const creatureInputs = [
    {
      combatantId: wolfId,
      statBlock: wolf,
      initiative: sdk.initiativeScore(15),
      ammunitionStocks: [],
      conditions: [],
    },
    {
      combatantId: hawkId,
      statBlock: hawk,
      initiative: sdk.initiativeScore(13),
      ammunitionStocks: [],
      conditions: [],
    },
    {
      combatantId: skeletonId,
      statBlock: skeleton,
      initiative: sdk.initiativeScore(10),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    },
  ] as const;

  const combatants = [];
  for (const input of creatureInputs) {
    const initialized = input;
    combatants.push(initialized);
  }

  const started = sdk.startBattle({
    battleId: sdk.battleId(scenarioId),
    combatants,
  });
  if (sdk.isFailure(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleInitializationIssueMessage(started.failure),
      observation: {
        tag: "battle-start-obstructed",
        scenarioId,
      },
    };
  }

  const placements: readonly ScenarioPlacement[] = [
    { tokenId: wolfId, coordinate: { x: 0, y: 4 } },
    { tokenId: skeletonId, coordinate: { x: 11, y: 4 } },
    { tokenId: hawkId, coordinate: { x: 6, y: 9 } },
  ];

  const created = sdk.createScenarioSession({
    battle: started.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 12 }, (_, x) => ({
            x,
            y,
            terrain: "ordinary" as const,
          })),
        ).flat(),
        boundaries: pillarBoundaries,
      },
      placements,
      spatialDecisions: [],
    },
    ambientIllumination: "dimLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: {
      overhead: {
        kind: "ceiling",
        heightFeet: sdk.movementFeet(20),
      },
      barrierHeights: pillarBoundaries.map(({ between }) => ({
        between,
        heightFeet: sdk.movementFeet(20),
      })),
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: skeletonId, enemyId: wolfId },
      { attackerId: skeletonId, enemyId: hawkId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: wolfId, moverId: skeletonId },
      { reactorId: skeletonId, moverId: wolfId },
      { reactorId: skeletonId, moverId: hawkId },
      { reactorId: hawkId, moverId: skeletonId },
    ],
    objects: [],
  });

  if (sdk.isFailure(created)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(created.failure),
      observation: {
        tag: "scenario-session-construction-obstructed",
        scenarioId,
      },
    };
  }

  return {
    kind: "ready",
    session: created.success,
    observation: {
      tag: "scenario-session-ready",
      scenarioId,
    },
  };
};
