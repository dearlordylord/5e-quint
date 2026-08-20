import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: [],
  observation: {
    characterIds: [],
    reason: "This scenario contains only Stat Block combatants.",
  },
});
