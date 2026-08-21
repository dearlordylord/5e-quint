import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlockCatalog } = context;
  const ridingHorseId = sdk.combatantId("riding-horse");
  const pseudodragonId = sdk.combatantId("pseudodragon");
  const quasitId = sdk.combatantId("quasit");

  const ridingHorse = sdk.battleCreatureInitFromStatBlock({
    combatantId: ridingHorseId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
    initiative: sdk.initiativeScore(11),
    ammunitionStocks: [],
  });
  const pseudodragon = sdk.battleCreatureInitFromStatBlock({
    combatantId: pseudodragonId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_pseudodragon"),
    initiative: sdk.initiativeScore(16),
    ammunitionStocks: [],
  });
  const quasit = sdk.battleCreatureInitFromStatBlock({
    combatantId: quasitId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_quasit"),
    initiative: sdk.initiativeScore(13),
    ammunitionStocks: [],
  });

  if (sdk.isLeft(ridingHorse)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(ridingHorse.left),
      observation: { code: "stat-block-battle-init-rejected" },
    };
  }
  if (sdk.isLeft(pseudodragon)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(pseudodragon.left),
      observation: { code: "stat-block-battle-init-rejected" },
    };
  }
  if (sdk.isLeft(quasit)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(quasit.left),
      observation: { code: "stat-block-battle-init-rejected" },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("synthetic-wake-interruption"),
    combatants: [ridingHorse.right, pseudodragon.right, quasit.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: { code: "battle-start-rejected" },
    };
  }

  const arena = {
    cells: Array.from({ length: 9 * 5 }, (_, index) => ({
      x: (index % 9) * 5,
      y: Math.floor(index / 9) * 5,
      terrain: "ordinary" as const,
    })),
    boundaries: [],
  };
  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena,
      placements: [
        { tokenId: ridingHorseId, coordinate: { x: 5, y: 10 } },
        { tokenId: pseudodragonId, coordinate: { x: 25, y: 10 } },
        { tokenId: quasitId, coordinate: { x: 30, y: 10 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [
      { moverId: ridingHorseId, allyId: quasitId },
      { moverId: quasitId, allyId: ridingHorseId },
    ],
    opportunityAttackEnemyRelationships: [
      { reactorId: ridingHorseId, moverId: pseudodragonId },
      { reactorId: pseudodragonId, moverId: ridingHorseId },
      { reactorId: pseudodragonId, moverId: quasitId },
      { reactorId: quasitId, moverId: pseudodragonId },
    ],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: { code: "scenario-session-rejected" },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: { code: "scenario-setup-ready" },
  };
};
