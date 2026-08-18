import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const taroSheets = context.characterSheets.filter(
    (sheet) => sheet.characterId === "taro",
  );

  if (taroSheets.length !== 1) {
    return {
      kind: "obstructed",
      obstruction:
        taroSheets.length === 0
          ? "Taro's completed player-owned Character Sheet was not supplied; setup cannot choose the delegated character-creation selections."
          : "More than one completed Character Sheet was supplied for Taro; setup cannot choose which player-owned sheet to use.",
      observation: {
        stage: "character-sheet-selection",
        characterId: "taro",
        matchingSheetCount: taroSheets.length,
      },
    };
  }

  const taroId = sdk.combatantId("taro");
  const flintId = sdk.combatantId("flint");
  const cinderId = sdk.combatantId("cinder");

  const taroInit = sdk.characterSheetBattleInit({
    sheet: taroSheets[0],
    unitLibrary: context.unitCatalog,
    statBlockCatalog: context.statBlockCatalog,
    combatantId: taroId,
    displayName: "Taro",
    initiative: sdk.initiativeScore(16),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(taroInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.characterBattleRuntimeIssueMessage(taroInit.left),
      observation: {
        stage: "character-battle-initialization",
        characterId: "taro",
      },
    };
  }

  const flintInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: flintId,
    statBlock: context.statBlockCatalog.requireStatBlock("stat_block_wolf"),
    initiative: sdk.initiativeScore(13),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(flintInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(flintInit.left),
      observation: {
        stage: "stat-block-battle-initialization",
        combatantId: "flint",
        statBlockId: "stat_block_wolf",
      },
    };
  }

  const cinderInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: cinderId,
    statBlock: context.statBlockCatalog.requireStatBlock(
      "stat_block_goblin_warrior",
    ),
    initiative: sdk.initiativeScore(10),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(cinderInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(cinderInit.left),
      observation: {
        stage: "stat-block-battle-initialization",
        combatantId: "cinder",
        statBlockId: "stat_block_goblin_warrior",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("generated-battle-005"),
    combatants: [taroInit.right, flintInit.right, cinderInit.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: { stage: "battle-start" },
    };
  }

  const session = sdk.createScenarioSession({
    battle: battle.right,
    arena: {
      cells: Array.from({ length: 12 * 6 }, (_, index) => ({
        x: index % 12,
        y: Math.floor(index / 12),
        terrain: "ordinary" as const,
      })),
      boundaries: [],
    },
    placements: [
      { tokenId: taroId, coordinate: { x: 1, y: 4 } },
      { tokenId: flintId, coordinate: { x: 5, y: 4 } },
      { tokenId: cinderId, coordinate: { x: 8, y: 1 } },
    ],
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: taroId, enemyId: flintId },
      { attackerId: taroId, enemyId: cinderId },
    ],
    movementAllyRelationships: [
      { moverId: flintId, allyId: cinderId },
      { moverId: cinderId, allyId: flintId },
    ],
    opportunityAttackEnemyRelationships: [
      { reactorId: flintId, moverId: taroId },
      { reactorId: cinderId, moverId: taroId },
      { reactorId: taroId, moverId: flintId },
      { reactorId: taroId, moverId: cinderId },
    ],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: { stage: "scenario-session-creation" },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: {
      scenarioId: "generated-battle-005",
      characterSheetId: "taro",
      statBlockIds: ["stat_block_wolf", "stat_block_goblin_warrior"],
    },
  };
};
