import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = () => ({
  kind: "obstructed",
  obstruction:
    "The public setup surface cannot defer the four player-owned character builds, their assignment to the four fixed starting squares, or any combatant's Initiative roll. startBattle requires all BattleCreatureInit values and Initiative scores immediately, while ScenarioSetupContext exposes no character builder/composer or pre-battle player-choice continuation. It also exposes no setup representation for the grid, walls, doors, barricades, crystal object, or spatial placement. Creating a BattleRuntimeSession would therefore require inventing required player choices and omitting required initial state.",
  observation: {
    obstruction: "public-setup-surface-insufficient",
    unavailableRequiredFacts: [
      "deferred-character-builds",
      "deferred-character-starting-square-assignment",
      "deferred-initiative-rolls",
      "battle-map-and-starting-positions",
      "beacon-crystal-object",
    ],
  },
});
