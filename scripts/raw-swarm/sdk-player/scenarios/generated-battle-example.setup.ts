import type { BattleCreatureInit } from "@dnd/battle-runtime";
import type { ScenarioPlacement, ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({
  sdk,
  characterSheets,
  statBlocks,
  statBlockCatalog,
  unitCatalog,
}) => {
  const row = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 } as const;
  const characterChoices = [
    {
      characterId: "beacon-warden-ember",
      combatantId: "beacon-warden-ember",
      displayName: "Beacon Warden Ember",
      initiative: 18,
      coordinate: { x: 10, y: row.B },
    },
    {
      characterId: "beacon-warden-veil",
      combatantId: "beacon-warden-veil",
      displayName: "Beacon Warden Veil",
      initiative: 16,
      coordinate: { x: 10, y: row.E },
    },
    {
      characterId: "beacon-warden-aegis",
      combatantId: "beacon-warden-aegis",
      displayName: "Beacon Warden Aegis",
      initiative: 13,
      coordinate: { x: 12, y: row.B },
    },
    {
      characterId: "beacon-warden-arc",
      combatantId: "beacon-warden-arc",
      displayName: "Beacon Warden Arc",
      initiative: 11,
      coordinate: { x: 12, y: row.E },
    },
  ] as const;
  const combatants: BattleCreatureInit[] = [];
  const placements: ScenarioPlacement[] = [];
  for (const choice of characterChoices) {
    const sheet = characterSheets.find(
      ({ characterId }) => characterId === choice.characterId,
    );
    if (sheet === undefined) {
      return {
        kind: "obstructed",
        obstruction: `The completed Character Sheet ${choice.characterId} is missing.`,
        observation: { missingCharacterId: choice.characterId },
      };
    }
    const projected = sdk.characterSheetBattleInit({
      sheet,
      unitLibrary: unitCatalog,
      statBlockCatalog,
      combatantId: sdk.combatantId(choice.combatantId),
      displayName: choice.displayName,
      initiative: sdk.initiativeScore(choice.initiative),
      ammunitionStocks: [],
    });
    if (sdk.isLeft(projected)) {
      return {
        kind: "obstructed",
        obstruction: sdk.characterBattleRuntimeIssueMessage(projected.left),
        observation: { characterId: choice.characterId },
      };
    }
    combatants.push(projected.right);
    placements.push({
      tokenId: projected.right.combatantId,
      coordinate: choice.coordinate,
    });
  }

  const statBlockChoices = [
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-2c",
      initiative: 14,
      coordinate: { x: 2, y: row.C },
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-2d",
      initiative: 14,
      coordinate: { x: 2, y: row.D },
    },
    {
      statBlockId: "stat_block_wolf",
      combatantId: "wolf-3b",
      initiative: 10,
      coordinate: { x: 3, y: row.B },
    },
    {
      statBlockId: "stat_block_wolf",
      combatantId: "wolf-3e",
      initiative: 10,
      coordinate: { x: 3, y: row.E },
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-5c",
      initiative: 14,
      coordinate: { x: 5, y: row.C },
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-5d",
      initiative: 14,
      coordinate: { x: 5, y: row.D },
    },
  ] as const;
  for (const choice of statBlockChoices) {
    const statBlock = statBlocks.find(({ id }) => id === choice.statBlockId);
    if (statBlock === undefined) {
      return {
        kind: "obstructed",
        obstruction: `The public catalog has no ${choice.statBlockId} Stat Block.`,
        observation: { missingStatBlockId: choice.statBlockId },
      };
    }
    const projected = sdk.battleCreatureInitFromStatBlock({
      combatantId: sdk.combatantId(choice.combatantId),
      statBlock,
      initiative: sdk.initiativeScore(choice.initiative),
      ammunitionStocks:
        choice.statBlockId === "stat_block_goblin_warrior"
          ? [sdk.battleAmmunitionStock("arrow", 20)]
          : [],
    });
    if (sdk.isLeft(projected)) {
      return {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(projected.left),
        observation: { combatantId: choice.combatantId },
      };
    }
    combatants.push(projected.right);
    placements.push({
      tokenId: projected.right.combatantId,
      coordinate: choice.coordinate,
    });
  }

  const started = sdk.startBattle({
    battleId: sdk.battleId("generated-battle-example"),
    combatants,
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.left),
      observation: { operation: "startBattle" },
    };
  }

  const barricadeSquare = (x: number, y: number): boolean =>
    (x === 8 || x === 13) && (y === row.C || y === row.D);
  const cells = Array.from({ length: 20 }, (_, columnIndex) =>
    Array.from({ length: row.F }, (_, rowIndex) => {
      const x = columnIndex + 1;
      const y = rowIndex + 1;
      return {
        x,
        y,
        terrain: barricadeSquare(x, y)
          ? ("difficult" as const)
          : ("ordinary" as const),
      };
    }),
  ).flat();
  const wall = (
    first: { readonly x: number; readonly y: number },
    second: { readonly x: number; readonly y: number },
  ) => ({
    between: [first, second] as const,
    traversal: "blocked" as const,
    sight: "blocked" as const,
    cover: { kind: "intervening" as const, degree: "total" as const },
  });
  const barricadeEdge = (
    x: number,
    adjacentX: number,
    protectedX: number,
    y: number,
  ) => ({
    between: [
      { x, y },
      { x: adjacentX, y },
    ] as const,
    traversal: "open" as const,
    sight: "open" as const,
    cover: {
      kind: "protected-occupant" as const,
      degree: "half" as const,
      protectedCell: { x: protectedX, y },
    },
  });
  const boundaries = [
    ...Array.from({ length: 8 }, (_, offset) =>
      wall({ x: offset + 7, y: row.A }, { x: offset + 7, y: row.B }),
    ),
    ...Array.from({ length: 8 }, (_, offset) =>
      wall({ x: offset + 7, y: row.E }, { x: offset + 7, y: row.F }),
    ),
    wall({ x: 6, y: row.B }, { x: 7, y: row.B }),
    wall({ x: 6, y: row.E }, { x: 7, y: row.E }),
    wall({ x: 14, y: row.B }, { x: 15, y: row.B }),
    wall({ x: 14, y: row.E }, { x: 15, y: row.E }),
    ...[row.C, row.D].flatMap((y) => [
      barricadeEdge(7, 8, 8, y),
      barricadeEdge(8, 9, 8, y),
      barricadeEdge(12, 13, 13, y),
      barricadeEdge(13, 14, 13, y),
    ]),
  ];
  const crystalId = sdk.battleObjectId("beacon-crystal");
  placements.push({
    tokenId: crystalId,
    coordinate: { x: 11, y: row.C },
  });
  const defenderIds = combatants
    .slice(0, characterChoices.length)
    .map(({ combatantId }) => combatantId);
  const attackerIds = combatants
    .slice(characterChoices.length)
    .map(({ combatantId }) => combatantId);
  const scenarioSession = sdk.createScenarioSession({
    battle: started.right,
    arena: { cells, boundaries },
    placements,
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: boundaries
        .filter(({ traversal }) => traversal === "blocked")
        .map(({ between }) => ({
          between,
          heightFeet: sdk.movementFeet(15),
        })),
    },
    initialRangedAttackEnemyRelationships: [
      ...defenderIds.flatMap((attackerId) =>
        attackerIds.map((enemyId) => ({ attackerId, enemyId })),
      ),
      ...attackerIds.flatMap((attackerId) =>
        defenderIds.map((enemyId) => ({ attackerId, enemyId })),
      ),
    ],
    movementAllyRelationships: [
      ...defenderIds.flatMap((moverId) =>
        defenderIds
          .filter((allyId) => allyId !== moverId)
          .map((allyId) => ({ moverId, allyId })),
      ),
      ...attackerIds.flatMap((moverId) =>
        attackerIds
          .filter((allyId) => allyId !== moverId)
          .map((allyId) => ({ moverId, allyId })),
      ),
    ],
    opportunityAttackEnemyRelationships: [
      ...defenderIds.flatMap((reactorId) =>
        attackerIds.map((moverId) => ({ reactorId, moverId })),
      ),
      ...attackerIds.flatMap((reactorId) =>
        defenderIds.map((moverId) => ({ reactorId, moverId })),
      ),
    ],
    objects: [
      {
        objectId: crystalId,
        armorClass: sdk.armorClass(15),
        damageDisposition: { kind: "hitPoints", hitPoints: sdk.hp(30) },
        traversal: "blocked",
        sight: "open",
        interveningCover: "half",
      },
    ],
  });
  return sdk.isLeft(scenarioSession)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(scenarioSession.left),
        observation: { operation: "createScenarioSession" },
      }
    : {
        kind: "ready",
        session: scenarioSession.right,
        observation: {
          setup: "ready",
          combatantCount: combatants.length,
          arenaCellCount: cells.length,
          battlefieldObjectIds: [crystalId],
        },
      };
};
