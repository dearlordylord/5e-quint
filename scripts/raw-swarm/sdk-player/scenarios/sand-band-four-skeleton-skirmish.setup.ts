import type { BattleCreatureInit } from "@dnd/battle-runtime";
import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const ardenId = sdk.combatantId("arena-evoker-arden");
  const brynId = sdk.combatantId("arena-evoker-bryn");
  const skeletonIds = [
    sdk.combatantId("arena-skeleton-1"),
    sdk.combatantId("arena-skeleton-2"),
    sdk.combatantId("arena-skeleton-3"),
    sdk.combatantId("arena-skeleton-4"),
  ] as const;

  const ardenSheet = context.characterSheets.find(
    (sheet) => sheet.characterId === "arena-evoker-arden",
  );
  const brynSheet = context.characterSheets.find(
    (sheet) => sheet.characterId === "arena-evoker-bryn",
  );
  const skeleton = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_skeleton",
  );

  if (
    ardenSheet === undefined ||
    brynSheet === undefined ||
    skeleton === undefined
  ) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied canonical catalogs are missing one or both completed " +
        "adventurer sheets or the required Skeleton Stat Block.",
      observation: {
        scenarioId: "sand-band-four-skeleton-skirmish",
        ardenSheetFound: ardenSheet !== undefined,
        brynSheetFound: brynSheet !== undefined,
        skeletonStatBlockFound: skeleton !== undefined,
      },
    };
  }

  const ardenInit = sdk.characterSheetBattleInit({
    combatantId: ardenId,
    displayName: "Arden",
    initiative: sdk.initiativeScore(17 + 2),
    ammunitionStocks: [],
    sheet: ardenSheet,
    unitLibrary: context.unitCatalog,
    statBlockCatalog: context.statBlockCatalog,
  });
  const brynInit = sdk.characterSheetBattleInit({
    combatantId: brynId,
    displayName: "Bryn",
    initiative: sdk.initiativeScore(12 + 1),
    ammunitionStocks: [],
    sheet: brynSheet,
    unitLibrary: context.unitCatalog,
    statBlockCatalog: context.statBlockCatalog,
  });

  const combatants: BattleCreatureInit[] = [];
  for (const projected of [ardenInit, brynInit]) {
    if (sdk.isFailure(projected)) {
      return {
        kind: "obstructed",
        obstruction:
          "A completed Character Sheet could not be projected through the " +
          `canonical battle initializer: ${sdk.characterBattleRuntimeIssueMessage(projected.failure)}`,
        observation: {
          scenarioId: "sand-band-four-skeleton-skirmish",
          characterBattleInitializationSucceeded: false,
        },
      };
    }
    combatants.push(projected.success);
  }

  const skeletonInits = skeletonIds.map((combatantId) =>
    sdk.battleCreatureInitFromStatBlock({
      combatantId,
      statBlock: skeleton,
      initiative: sdk.initiativeScore(14 + 3),
      currentHp: sdk.hp(13),
      tempHp: sdk.hp(0),
      ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
      conditions: [],
    }),
  );
  for (const projected of skeletonInits) {
    if (sdk.isFailure(projected)) {
      return {
        kind: "obstructed",
        obstruction:
          "The canonical Skeleton Stat Block could not be initialized: " +
          sdk.battleStateInitIssueMessage(projected.failure),
        observation: {
          scenarioId: "sand-band-four-skeleton-skirmish",
          skeletonBattleInitializationSucceeded: false,
        },
      };
    }
    combatants.push(projected.success);
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("sand-band-four-skeleton-skirmish"),
    combatants,
  });
  if (sdk.isFailure(battle)) {
    return {
      kind: "obstructed",
      obstruction:
        "The canonical battle could not be started: " +
        sdk.battleStateInitIssueMessage(battle.failure),
      observation: {
        scenarioId: "sand-band-four-skeleton-skirmish",
        battleStarted: false,
      },
    };
  }

  const adventurerIds = [ardenId, brynId] as const;
  const initialRangedAttackEnemyRelationships = [
    ...adventurerIds.flatMap((attackerId) =>
      skeletonIds.map((enemyId) => ({ attackerId, enemyId })),
    ),
    ...skeletonIds.flatMap((attackerId) =>
      adventurerIds.map((enemyId) => ({ attackerId, enemyId })),
    ),
  ];
  const movementAllyRelationships = [
    { moverId: ardenId, allyId: brynId },
    { moverId: brynId, allyId: ardenId },
    ...skeletonIds.flatMap((moverId) =>
      skeletonIds
        .filter((allyId) => allyId !== moverId)
        .map((allyId) => ({ moverId, allyId })),
    ),
  ];
  const opportunityAttackEnemyRelationships = [
    ...adventurerIds.flatMap((reactorId) =>
      skeletonIds.map((moverId) => ({ reactorId, moverId })),
    ),
    ...skeletonIds.flatMap((reactorId) =>
      adventurerIds.map((moverId) => ({ reactorId, moverId })),
    ),
  ];

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: Array.from({ length: 13 * 11 }, (_, index) => {
          const x = (index % 13) + 1;
          const y = Math.floor(index / 13) + 1;
          return {
            x,
            y,
            terrain: x >= 6 && x <= 8 ? "difficult" : "ordinary",
          };
        }),
        boundaries: [],
      },
      placements: [
        { tokenId: ardenId, coordinate: { x: 2, y: 5 } },
        { tokenId: brynId, coordinate: { x: 2, y: 7 } },
        { tokenId: skeletonIds[0], coordinate: { x: 11, y: 3 } },
        { tokenId: skeletonIds[1], coordinate: { x: 11, y: 5 } },
        { tokenId: skeletonIds[2], coordinate: { x: 11, y: 7 } },
        { tokenId: skeletonIds[3], coordinate: { x: 11, y: 9 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships,
    movementAllyRelationships,
    opportunityAttackEnemyRelationships,
    objects: [],
  });
  if (sdk.isFailure(session)) {
    return {
      kind: "obstructed",
      obstruction:
        "The canonical scenario session rejected the fixed battlefield facts: " +
        sdk.scenarioSessionIssueMessage(session.failure),
      observation: {
        scenarioId: "sand-band-four-skeleton-skirmish",
        sessionCreated: false,
      },
    };
  }

  return {
    kind: "ready",
    session: session.success,
    observation: {
      scenarioId: "sand-band-four-skeleton-skirmish",
      initiativeRolls: {
        arden: { d20: 17, modifier: 2, total: 19 },
        bryn: { d20: 12, modifier: 1, total: 13 },
        skeletonGroup: { d20: 14, modifier: 3, total: 17 },
      },
      adventurerStartingSquares: {
        arden: { x: 2, y: 5 },
        bryn: { x: 2, y: 7 },
      },
      skeletonDamage: "rolled",
      skeletonAmmunition: {
        ammunition: "arrow",
        quantityPerSkeleton: 20,
      },
      arenaEdges: "finite impassable edges with no Cover contribution",
    },
  };
};
