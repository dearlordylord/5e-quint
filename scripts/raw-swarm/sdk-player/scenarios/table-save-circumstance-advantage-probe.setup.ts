import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;

  const quasitId = sdk.combatantId("quasit");
  const wolfId = sdk.combatantId("wolf");
  const goblinId = sdk.combatantId("goblin-warrior");

  const quasitInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: quasitId,
    statBlock: context.statBlockCatalog.requireStatBlock("stat_block_quasit"),
    initiative: sdk.initiativeScore(19),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(quasitInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(quasitInit.left),
      observation: {
        scenarioId: "table-save-circumstance-advantage-probe",
        status: "battle-initialization-failed",
        combatant: "Quasit",
      },
    };
  }

  const wolfInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: context.statBlockCatalog.requireStatBlock("stat_block_wolf"),
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(wolfInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(wolfInit.left),
      observation: {
        scenarioId: "table-save-circumstance-advantage-probe",
        status: "battle-initialization-failed",
        combatant: "Wolf",
      },
    };
  }

  const goblinInit = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinId,
    statBlock: context.statBlockCatalog.requireStatBlock(
      "stat_block_goblin_warrior",
    ),
    initiative: sdk.initiativeScore(10),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
  });
  if (sdk.isLeft(goblinInit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblinInit.left),
      observation: {
        scenarioId: "table-save-circumstance-advantage-probe",
        status: "battle-initialization-failed",
        combatant: "Goblin Warrior",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("table-save-circumstance-advantage-probe-battle"),
    combatants: [quasitInit.right, wolfInit.right, goblinInit.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: {
        scenarioId: "table-save-circumstance-advantage-probe",
        status: "battle-initialization-failed",
      },
    };
  }

  const cells = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => ({
      x,
      y,
      terrain: "ordinary" as const,
    })),
  ).flat();
  const basinEdges = [
    [
      { x: 3, y: 3 },
      { x: 3, y: 2 },
    ],
    [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ],
    [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    ],
    [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
    ],
  ] as const;
  const eastWallEdges = Array.from({ length: 7 }, (_, y) => y)
    .filter((y) => y !== 3)
    .map(
      (y) =>
        [
          { x: 5, y },
          { x: 6, y },
        ] as const,
    );

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells,
        boundaries: [...basinEdges, ...eastWallEdges].map((between) => ({
          between,
          traversal: "blocked" as const,
          sight: "open" as const,
          cover: { kind: "intervening" as const, degree: "none" as const },
        })),
      },
      placements: [
        { tokenId: quasitId, coordinate: { x: 0, y: 3 } },
        { tokenId: wolfId, coordinate: { x: 4, y: 3 } },
        { tokenId: goblinId, coordinate: { x: 4, y: 5 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "dimLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: goblinId, enemyId: quasitId },
    ],
    movementAllyRelationships: [
      { moverId: wolfId, allyId: goblinId },
      { moverId: goblinId, allyId: wolfId },
    ],
    opportunityAttackEnemyRelationships: [
      { reactorId: quasitId, moverId: wolfId },
      { reactorId: quasitId, moverId: goblinId },
      { reactorId: wolfId, moverId: quasitId },
      { reactorId: goblinId, moverId: quasitId },
    ],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: {
        scenarioId: "table-save-circumstance-advantage-probe",
        status: "scenario-session-initialization-failed",
      },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The closest faithful scenario session is initialized, including GM-owned Initiative results and geometry-derived starting placements, but the public setup surface has no per-test circumstance witness with which to grant the Wolf Advantage on the one exact Wisdom saving throw generated by the Quasit's mandatory first Scare action.",
    observation: {
      scenarioId: "table-save-circumstance-advantage-probe",
      status: "unsupported-capability",
      suppliedPreBattleChoices: {
        initiative: {
          Quasit: 19,
          Wolf: 14,
          "Goblin Warrior": 10,
        },
        placements: {
          Quasit: { x: 0, y: 3 },
          Wolf: { x: 4, y: 3 },
          "Goblin Warrior": { x: 4, y: 5 },
        },
      },
      unsupportedFact: {
        owner: "GM",
        test: "Wolf Wisdom saving throw generated by the Quasit's first Scare action",
        circumstance: "Advantage",
        scope: "that saving throw only",
      },
      publicSurfaceGap: "per-test saving-throw circumstance witness",
    },
  };
};
