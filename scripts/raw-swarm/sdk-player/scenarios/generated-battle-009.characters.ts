import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: [],
  observation: {
    characters:
      "No Character Sheets are delegated: Wolf and Skeleton are canonical stat-block creatures.",
  },
});
