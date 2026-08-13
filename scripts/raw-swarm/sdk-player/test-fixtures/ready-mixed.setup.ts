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
  return sdk.isLeft(started)
    ? {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(started.left),
        observation: { phase: "start" },
      }
    : {
        kind: "ready",
        session: started.right,
        observation: { combatants: 2 },
      };
};
