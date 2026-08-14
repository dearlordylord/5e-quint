import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: [],
  observation: {
    selectedBuilds: [],
    controllerCreatures: ["Cinder", "Hook", "Spur"],
    explanation:
      "Cinder is an Imp and Hook and Spur are Goblin Warrior stat-block creatures; the scenario delegates no class-based Character Sheets to this controller.",
  },
});
