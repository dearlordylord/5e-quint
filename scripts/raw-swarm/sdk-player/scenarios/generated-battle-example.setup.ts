import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({ statBlocks }) => {
  const requiredStatBlocks = ["Commoner", "Skeleton", "Zombie", "Wolf"];
  const availableStatBlockNames = new Set(statBlocks.map(({ name }) => name));
  const missingStatBlocks = requiredStatBlocks.filter(
    (name) => !availableStatBlockNames.has(name),
  );

  return {
    kind: "obstructed",
    obstruction:
      "The public setup surface cannot faithfully construct this scenario. " +
      `The supplied stat-block catalog is missing the required ${missingStatBlocks.join(" and ")} records, ` +
      "and substitutes are forbidden. ScenarioSetupContext also provides no character-composition input or deferred-choice mechanism for the five player-built adventurers and their unresolved Initiative rolls, starting resources, equipment assignments, and light carrier. Finally, BattleRuntimeSession initialization exposes combatants and Initiative but no setup representation for the fixed grid, walls, terrain, cover, braziers, or one-use lift.",
    observation: {
      scenarioId: "generated-battle-example",
      setup: "obstructed",
      requiredStatBlocks,
      missingStatBlocks,
      unavailablePublicSetupFacts: [
        "player-owned character composition and deferred choices",
        "unresolved Initiative rolls",
        "map, terrain, cover, and facing",
        "interactive braziers and one-use lift",
      ],
    },
  };
};
