import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({
  sdk,
  characterSheets,
  statBlockCatalog,
  statBlocks,
  unitCatalog,
}) => {
  if (characterSheets.length !== 1) {
    return {
      kind: "obstructed",
      obstruction:
        "Mixed setup requires exactly one controller-authored Character Sheet.",
      observation: {
        phase: "character-cardinality",
        count: characterSheets.length,
      },
    };
  }
  const [characterSheet] = characterSheets;
  const character = sdk.characterSheetBattleInit({
    sheet: characterSheet,
    unitLibrary: unitCatalog,
    statBlockCatalog,
    combatantId: sdk.combatantId("external-fighter"),
    displayName: "External Fighter",
    initiative: sdk.initiativeScore(15),
    ammunitionStocks: [],
  });
  const statBlock = statBlocks.find(
    (candidate) => candidate.id === "stat_block_skeleton",
  );
  if (sdk.isFailure(character) || statBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "Mixed composition projection failed.",
      observation: { phase: "projection" },
    };
  }
  const monster = {
    combatantId: sdk.combatantId("external-skeleton"),
    statBlock,
    initiative: sdk.initiativeScore(10),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
  const started = sdk.startBattle({
    battleId: sdk.battleId("external-mixed-session"),
    combatants: [character.success, monster],
  });
  if (sdk.isFailure(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.failure),
      observation: { phase: "start" },
    };
  }
  const session = sdk.createScenarioSession({
    battle: started.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: [
          { x: 0, y: 0, terrain: "ordinary" },
          { x: 1, y: 0, terrain: "ordinary" },
          { x: 2, y: 0, terrain: "ordinary" },
        ],
        boundaries: [],
      },
      placements: [
        { tokenId: character.success.combatantId, coordinate: { x: 0, y: 0 } },
        { tokenId: monster.combatantId, coordinate: { x: 1, y: 0 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      {
        attackerId: character.success.combatantId,
        enemyId: monster.combatantId,
      },
      {
        attackerId: monster.combatantId,
        enemyId: character.success.combatantId,
      },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      {
        reactorId: character.success.combatantId,
        moverId: monster.combatantId,
      },
    ],
    objects: [],
  });
  return sdk.isFailure(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.failure),
        observation: { phase: "scenario-session" },
      }
    : {
        kind: "ready",
        session: session.success,
        observation: { combatants: 2 },
      };
};
