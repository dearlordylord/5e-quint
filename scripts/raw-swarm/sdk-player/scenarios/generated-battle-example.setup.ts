import type { BattleCreatureInit } from "@dnd/battle-runtime";
import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({
  sdk,
  characterSheets,
  statBlocks,
  statBlockCatalog,
  unitCatalog,
}) => {
  const characterChoices = [
    {
      characterId: "beacon-warden-ember",
      combatantId: "beacon-warden-ember",
      displayName: "Beacon Warden Ember",
      initiative: 18,
    },
    {
      characterId: "beacon-warden-veil",
      combatantId: "beacon-warden-veil",
      displayName: "Beacon Warden Veil",
      initiative: 16,
    },
    {
      characterId: "beacon-warden-aegis",
      combatantId: "beacon-warden-aegis",
      displayName: "Beacon Warden Aegis",
      initiative: 13,
    },
    {
      characterId: "beacon-warden-arc",
      combatantId: "beacon-warden-arc",
      displayName: "Beacon Warden Arc",
      initiative: 11,
    },
  ] as const;
  const combatants: BattleCreatureInit[] = [];
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
    });
    if (sdk.isLeft(projected)) {
      return {
        kind: "obstructed",
        obstruction: sdk.characterBattleRuntimeIssueMessage(projected.left),
        observation: { characterId: choice.characterId },
      };
    }
    combatants.push(projected.right);
  }

  const statBlockChoices = [
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-2c",
      initiative: 14,
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-2d",
      initiative: 14,
    },
    {
      statBlockId: "stat_block_wolf",
      combatantId: "wolf-3b",
      initiative: 10,
    },
    {
      statBlockId: "stat_block_wolf",
      combatantId: "wolf-3e",
      initiative: 10,
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-5c",
      initiative: 14,
    },
    {
      statBlockId: "stat_block_goblin_warrior",
      combatantId: "goblin-warrior-5d",
      initiative: 14,
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
    });
    if (sdk.isLeft(projected)) {
      return {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(projected.left),
        observation: { combatantId: choice.combatantId },
      };
    }
    combatants.push(projected.right);
  }

  return {
    kind: "obstructed",
    obstruction:
      "The controller supplied Initiative for all ten projected combatants, but the public ScenarioSetup SDK cannot assign the four Character Sheets to their delegated starting squares or represent the required grid, walls, doors, barricades, and attackable beacon crystal. Starting the battle would silently discard those scenario-fixed facts.",
    observation: {
      setup: "obstructed",
      projectedCombatants: combatants.map(({ combatantId, initiative }) => ({
        combatantId,
        initiative,
      })),
      remainingUnavailablePublicCapability:
        "initial spatial and interactive battlefield state",
    },
  };
};
