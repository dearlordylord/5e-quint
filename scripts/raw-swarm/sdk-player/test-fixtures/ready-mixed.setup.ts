import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({
  sdk,
  characterSheets,
  statBlockCatalog,
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
  });
  const statBlock = statBlockCatalog.getStatBlock("stat_block_skeleton");
  if (sdk.isLeft(character) || statBlock._tag === "None") {
    return {
      kind: "obstructed",
      obstruction: "Mixed composition projection failed.",
      observation: { phase: "projection" },
    };
  }
  const monster = sdk.battleCreatureInitFromStatBlock({
    combatantId: sdk.combatantId("external-skeleton"),
    statBlock: statBlock.value,
    initiative: sdk.initiativeScore(10),
  });
  if (sdk.isLeft(monster)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(monster.left),
      observation: { phase: "stat-block" },
    };
  }
  const started = sdk.startBattle({
    battleId: sdk.battleId("external-mixed-session"),
    combatants: [character.right, monster.right],
  });
  if (sdk.isLeft(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(started.left),
      observation: { phase: "start" },
    };
  }
  const session = sdk.createScenarioSession({
    battle: started.right,
    arena: {
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1, y: 0, terrain: "ordinary" },
        { x: 2, y: 0, terrain: "ordinary" },
      ],
      boundaries: [],
    },
    placements: [
      { tokenId: character.right.combatantId, coordinate: { x: 0, y: 0 } },
      { tokenId: monster.right.combatantId, coordinate: { x: 1, y: 0 } },
    ],
    ambientIllumination: "brightLight",
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [
      {
        attackerId: character.right.combatantId,
        enemyId: monster.right.combatantId,
      },
      {
        attackerId: monster.right.combatantId,
        enemyId: character.right.combatantId,
      },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      {
        reactorId: character.right.combatantId,
        moverId: monster.right.combatantId,
      },
    ],
    objects: [],
  });
  return sdk.isLeft(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.left),
        observation: { phase: "scenario-session" },
      }
    : {
        kind: "ready",
        session: session.right,
        observation: { combatants: 2 },
      };
};
