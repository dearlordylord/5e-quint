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

  const creatureInputs = [
    {
      combatantId: wolfId,
      statBlock: context.statBlockCatalog.requireStatBlock("stat_block_wolf"),
      initiative: sdk.initiativeScore(15),
      ammunitionStocks: [],
    },
    {
      combatantId: hawkId,
      statBlock: context.statBlockCatalog.requireStatBlock("stat_block_hawk"),
      initiative: sdk.initiativeScore(13),
      ammunitionStocks: [],
    },
    {
      combatantId: skeletonId,
      statBlock: context.statBlockCatalog.requireStatBlock(
        "stat_block_skeleton",
      ),
      initiative: sdk.initiativeScore(10),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    },
  ] as const;

  const combatants = [];
  for (const input of creatureInputs) {
    const initialized = sdk.battleCreatureInitFromStatBlock(input);
    if (sdk.isLeft(initialized)) {
      return {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(initialized.left),
        observation: {
          tag: "stat-block-combatant-initialization-obstructed",
          scenarioId,
          combatantId: input.combatantId,
        },
      };
    }
    combatants.push(initialized.right);
  }

  const started = sdk.startBattle({
    battleId: sdk.battleId(scenarioId),
    combatants,
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.left),
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
    battle: started.right,
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
    statBlockDamageNotation: "rolled",
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

  if (sdk.isLeft(created)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(created.left),
      observation: {
        tag: "scenario-session-construction-obstructed",
        scenarioId,
      },
    };
  }

  return {
    kind: "ready",
    session: created.right,
    observation: {
      tag: "scenario-session-ready",
      scenarioId,
    },
  };
};
