import type {
  ScenarioSetup,
  ScenarioSetupOutcome,
} from "@dnd/scenario-setup-sdk";

const obstructed = (
  obstruction: string,
  observation: ScenarioSetupOutcome["observation"],
): ScenarioSetupOutcome => ({
  kind: "obstructed",
  obstruction,
  observation,
});

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;

  const fighterId = sdk.combatantId("close-interception-fighter");
  const rogueId = sdk.combatantId("close-interception-rogue");
  const wolfAId = sdk.combatantId("wolf-a");
  const wolfBId = sdk.combatantId("wolf-b");
  const goblinId = sdk.combatantId("goblin-warrior-a");
  const prismId = sdk.battleObjectId("calibration-prism");

  const fighterSheet = context.characterSheets.find(
    (sheet) => sheet.characterId === "close-interception-fighter",
  );
  const rogueSheet = context.characterSheets.find(
    (sheet) => sheet.characterId === "close-interception-rogue",
  );

  if (fighterSheet === undefined || rogueSheet === undefined) {
    return obstructed(
      "The completed Fighter and Rogue Character Sheets required by the scenario were not both supplied.",
      {
        code: "missing-required-character-sheet",
        fighterSheetPresent: fighterSheet !== undefined,
        rogueSheetPresent: rogueSheet !== undefined,
      },
    );
  }

  const fighterInit = sdk.characterSheetBattleInit({
    combatantId: fighterId,
    displayName: "Fighter",
    sheet: fighterSheet,
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [],
    unitLibrary: context.unitCatalog,
    statBlockCatalog: context.statBlockCatalog,
  });
  if (sdk.isLeft(fighterInit)) {
    return obstructed(
      `The canonical battle projection rejected the completed Fighter Character Sheet: ${sdk.characterBattleRuntimeIssueMessage(fighterInit.left)}`,
      { code: "fighter-battle-projection-rejected" },
    );
  }

  const rogueInit = sdk.characterSheetBattleInit({
    combatantId: rogueId,
    displayName: "Rogue",
    sheet: rogueSheet,
    initiative: sdk.initiativeScore(17),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    unitLibrary: context.unitCatalog,
    statBlockCatalog: context.statBlockCatalog,
  });
  if (sdk.isLeft(rogueInit)) {
    return obstructed(
      `The canonical battle projection rejected the completed Rogue Character Sheet: ${sdk.characterBattleRuntimeIssueMessage(rogueInit.left)}`,
      { code: "rogue-battle-projection-rejected" },
    );
  }

  const wolf = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_wolf",
  );
  const goblin = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_goblin_warrior",
  );
  if (wolf === undefined || goblin === undefined) {
    return obstructed(
      "The supplied Stat Block catalog is missing a required scenario combatant.",
      {
        code: "missing-required-stat-block",
        wolfFound: wolf !== undefined,
        goblinWarriorFound: goblin !== undefined,
      },
    );
  }
  const sharedWolfInitiative = sdk.initiativeScore(12);

  const wolfAInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfAId,
    statBlock: wolf,
    initiative: sharedWolfInitiative,
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(wolfAInit)) {
    return obstructed(
      `The canonical battle projection rejected Wolf A: ${sdk.authoredStatBlockBattleInitIssueMessage(wolfAInit.left)}`,
      { code: "wolf-a-battle-projection-rejected" },
    );
  }

  const wolfBInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfBId,
    statBlock: wolf,
    initiative: sharedWolfInitiative,
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(wolfBInit)) {
    return obstructed(
      `The canonical battle projection rejected Wolf B: ${sdk.authoredStatBlockBattleInitIssueMessage(wolfBInit.left)}`,
      { code: "wolf-b-battle-projection-rejected" },
    );
  }

  const goblinInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinId,
    statBlock: goblin,
    initiative: sdk.initiativeScore(15),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (sdk.isLeft(goblinInit)) {
    return obstructed(
      `The canonical battle projection rejected Goblin Warrior A: ${sdk.authoredStatBlockBattleInitIssueMessage(goblinInit.left)}`,
      { code: "goblin-battle-projection-rejected" },
    );
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("orc-fighter-rogue-close-interception"),
    combatants: [
      fighterInit.right,
      rogueInit.right,
      wolfAInit.right,
      wolfBInit.right,
      goblinInit.right,
    ],
  });
  if (sdk.isLeft(battle)) {
    return obstructed(
      `The canonical battle could not start: ${sdk.battleStateInitIssueMessage(battle.left)}`,
      { code: "battle-start-rejected" },
    );
  }

  const cells = [];
  for (let x = 1; x <= 8; x += 1) {
    for (let y = 1; y <= 8; y += 1) {
      cells.push({ x, y, terrain: "ordinary" as const });
    }
  }

  const rackCover = (
    first: { readonly x: number; readonly y: number },
    second: { readonly x: number; readonly y: number },
  ) => ({
    between: [first, second] as const,
    traversal: "open" as const,
    sight: "open" as const,
    cover: { kind: "intervening" as const, degree: "half" as const },
  });

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells,
        boundaries: [
          rackCover({ x: 4, y: 4 }, { x: 5, y: 4 }),
          rackCover({ x: 5, y: 4 }, { x: 6, y: 4 }),
          rackCover({ x: 5, y: 5 }, { x: 6, y: 5 }),
          rackCover({ x: 5, y: 3 }, { x: 5, y: 4 }),
          rackCover({ x: 5, y: 5 }, { x: 5, y: 6 }),
          rackCover({ x: 4, y: 5 }, { x: 5, y: 5 }),
          rackCover({ x: 5, y: 4 }, { x: 5, y: 5 }),
        ],
      },
      placements: [
        { tokenId: fighterId, coordinate: { x: 3, y: 4 } },
        { tokenId: rogueId, coordinate: { x: 3, y: 5 } },
        { tokenId: wolfAId, coordinate: { x: 6, y: 3 } },
        { tokenId: wolfBId, coordinate: { x: 6, y: 6 } },
        { tokenId: goblinId, coordinate: { x: 7, y: 5 } },
        { tokenId: prismId, coordinate: { x: 8, y: 5 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "static" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      { attackerId: goblinId, enemyId: fighterId },
      { attackerId: goblinId, enemyId: rogueId },
      { attackerId: rogueId, enemyId: wolfAId },
      { attackerId: rogueId, enemyId: wolfBId },
      { attackerId: rogueId, enemyId: goblinId },
    ],
    movementAllyRelationships: [
      { moverId: wolfAId, allyId: wolfBId },
      { moverId: wolfBId, allyId: wolfAId },
      { moverId: fighterId, allyId: rogueId },
      { moverId: rogueId, allyId: fighterId },
    ],
    opportunityAttackEnemyRelationships: [
      { reactorId: fighterId, moverId: wolfAId },
      { reactorId: wolfAId, moverId: fighterId },
      { reactorId: fighterId, moverId: wolfBId },
      { reactorId: wolfBId, moverId: fighterId },
      { reactorId: fighterId, moverId: goblinId },
      { reactorId: goblinId, moverId: fighterId },
      { reactorId: rogueId, moverId: wolfAId },
      { reactorId: wolfAId, moverId: rogueId },
      { reactorId: rogueId, moverId: wolfBId },
      { reactorId: wolfBId, moverId: rogueId },
      { reactorId: rogueId, moverId: goblinId },
      { reactorId: goblinId, moverId: rogueId },
    ],
    objects: [
      {
        objectId: prismId,
        armorClass: sdk.armorClass(12),
        damageDisposition: { kind: "hitPoints", hitPoints: sdk.hp(16) },
        traversal: "open",
        sight: "open",
        interveningCover: "none",
      },
    ],
  });
  if (sdk.isLeft(session)) {
    return obstructed(
      `The canonical scenario session rejected the fixed battlefield facts: ${sdk.scenarioSessionIssueMessage(session.left)}`,
      { code: "scenario-session-rejected" },
    );
  }

  return {
    kind: "ready",
    session: session.right,
    observation: { code: "scenario-ready" },
  };
};
