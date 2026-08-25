import type {
  ScenarioBarrierHeight,
  ScenarioSetup,
  ScenarioSpatialSetupInput,
} from "@dnd/scenario-setup-sdk";

type GeometrySpatialSetup = Extract<
  ScenarioSpatialSetupInput,
  { readonly kind: "geometryDerived" }
>;
type ArenaBoundary = GeometrySpatialSetup["arena"]["boundaries"][number];

const COURTYARD_X_MIN = -6;
const COURTYARD_X_MAX = 5;
const COURTYARD_Y_MIN = -4;
const COURTYARD_Y_MAX = 3;

const courtyardCoordinates = (): readonly {
  readonly x: number;
  readonly y: number;
}[] => {
  const coordinates: { x: number; y: number }[] = [];
  for (let y = COURTYARD_Y_MIN; y <= COURTYARD_Y_MAX; y += 1) {
    for (let x = COURTYARD_X_MIN; x <= COURTYARD_X_MAX; x += 1) {
      coordinates.push({ x, y });
    }
  }
  return coordinates;
};

const isPillarCoordinate = (coordinate: {
  readonly x: number;
  readonly y: number;
}): boolean =>
  coordinate.x >= -1 &&
  coordinate.x <= 0 &&
  ((coordinate.y >= -4 && coordinate.y <= -3) ||
    (coordinate.y >= 2 && coordinate.y <= 3));

const pillarBoundaries = (): readonly ArenaBoundary[] => {
  const boundaries: ArenaBoundary[] = [];
  const coordinates = courtyardCoordinates();

  for (const from of coordinates) {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const to = { x: from.x + dx, y: from.y + dy };
      if (to.x > COURTYARD_X_MAX || to.y > COURTYARD_Y_MAX) continue;
      if (isPillarCoordinate(from) === isPillarCoordinate(to)) continue;

      boundaries.push({
        between: [from, to],
        traversal: "blocked",
        sight: "blocked",
        cover: { kind: "intervening", degree: "total" },
      });
    }
  }

  return boundaries;
};

export const setupScenario: ScenarioSetup = (context) => {
  const goblinId = context.sdk.combatantId("goblin-warrior");
  const skeletonId = context.sdk.combatantId("skeleton");
  const wolfId = context.sdk.combatantId("wolf");
  const horseId = context.sdk.combatantId("riding-horse");

  const combatantInputs = [
    {
      combatantId: goblinId,
      statBlockId: "stat_block_goblin_warrior",
      initiative: 18,
      ammunitionStocks: [context.sdk.battleAmmunitionStock("arrow", 20)],
    },
    {
      combatantId: wolfId,
      statBlockId: "stat_block_wolf",
      initiative: 15,
      ammunitionStocks: [],
    },
    {
      combatantId: skeletonId,
      statBlockId: "stat_block_skeleton",
      initiative: 11,
      ammunitionStocks: [context.sdk.battleAmmunitionStock("arrow", 20)],
    },
    {
      combatantId: horseId,
      statBlockId: "stat_block_riding_horse",
      initiative: 7,
      ammunitionStocks: [],
    },
  ] as const;

  const combatants = [];
  for (const input of combatantInputs) {
    const statBlock = context.statBlockCatalog.getStatBlock(input.statBlockId);
    if (statBlock._tag === "None") {
      return {
        kind: "obstructed",
        obstruction: `The supplied public stat-block catalog does not contain ${input.statBlockId}.`,
        observation: {
          setup: "stat-block-catalog-lookup",
          statBlockId: input.statBlockId,
        },
      };
    }

    const initialized = context.sdk.battleCreatureInitFromStatBlock({
      combatantId: input.combatantId,
      statBlock: statBlock.value,
      initiative: context.sdk.initiativeScore(input.initiative),
      ammunitionStocks: input.ammunitionStocks,
      conditions: [],
    });
    if (context.sdk.isLeft(initialized)) {
      return {
        kind: "obstructed",
        obstruction: context.sdk.battleStateInitIssueMessage(initialized.left),
        observation: {
          setup: "stat-block-combatant-initialization",
          statBlockId: input.statBlockId,
        },
      };
    }
    combatants.push(initialized.right);
  }

  const battle = context.sdk.startBattle({
    battleId: context.sdk.battleId(
      "rs48h-20260824t155852z-synthetic-watchfire-rotation-retry-001",
    ),
    combatants,
  });
  if (context.sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: context.sdk.battleStateInitIssueMessage(battle.left),
      observation: { setup: "battle-start" },
    };
  }

  const boundaries = pillarBoundaries();
  const barrierHeights: readonly ScenarioBarrierHeight[] = boundaries.map(
    (boundary) => ({
      between: boundary.between,
      heightFeet: context.sdk.movementFeet(30),
    }),
  );

  const session = context.sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: courtyardCoordinates().map((coordinate) => ({
          ...coordinate,
          terrain: "ordinary" as const,
        })),
        boundaries,
      },
      placements: [
        { tokenId: goblinId, coordinate: { x: -5, y: 3 } },
        { tokenId: skeletonId, coordinate: { x: 5, y: 3 } },
        { tokenId: wolfId, coordinate: { x: -5, y: -3 } },
        { tokenId: horseId, coordinate: { x: 5, y: -3 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights,
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: goblinId, enemyId: skeletonId },
      { attackerId: goblinId, enemyId: wolfId },
      { attackerId: skeletonId, enemyId: goblinId },
      { attackerId: skeletonId, enemyId: horseId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: goblinId, moverId: skeletonId },
      { reactorId: goblinId, moverId: wolfId },
      { reactorId: skeletonId, moverId: goblinId },
      { reactorId: skeletonId, moverId: horseId },
      { reactorId: wolfId, moverId: goblinId },
      { reactorId: wolfId, moverId: horseId },
      { reactorId: horseId, moverId: skeletonId },
      { reactorId: horseId, moverId: wolfId },
    ],
    objects: [],
  });
  if (context.sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: context.sdk.scenarioSessionIssueMessage(session.left),
      observation: { setup: "scenario-session-composition" },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: {
      setup: "ready",
      geometrySource: "geometryDerived",
      characterSheetsConsumed: 0,
    },
  };
};
