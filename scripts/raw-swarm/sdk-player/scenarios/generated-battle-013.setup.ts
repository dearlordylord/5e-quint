import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const brineId = context.sdk.combatantId("brine");
  const sootId = context.sdk.combatantId("soot");
  const rivetId = context.sdk.combatantId("rivet");
  const tangleId = context.sdk.combatantId("tangle");

  const combatants = [
    context.sdk.battleCreatureInitFromStatBlock({
      combatantId: brineId,
      statBlock: context.statBlockCatalog.requireStatBlock(
        "stat_block_goblin_warrior",
      ),
      initiative: context.sdk.initiativeScore(22),
      ammunitionStocks: [context.sdk.battleAmmunitionStock("arrow", 20)],
    }),
    context.sdk.battleCreatureInitFromStatBlock({
      combatantId: rivetId,
      statBlock: context.statBlockCatalog.requireStatBlock(
        "stat_block_skeleton",
      ),
      initiative: context.sdk.initiativeScore(17),
      ammunitionStocks: [],
    }),
    context.sdk.battleCreatureInitFromStatBlock({
      combatantId: sootId,
      statBlock: context.statBlockCatalog.requireStatBlock(
        "stat_block_goblin_warrior",
      ),
      initiative: context.sdk.initiativeScore(12),
      ammunitionStocks: [context.sdk.battleAmmunitionStock("arrow", 20)],
    }),
    context.sdk.battleCreatureInitFromStatBlock({
      combatantId: tangleId,
      statBlock: context.statBlockCatalog.requireStatBlock("stat_block_wolf"),
      initiative: context.sdk.initiativeScore(7),
      ammunitionStocks: [],
    }),
  ];

  for (const combatant of combatants) {
    if (context.sdk.isLeft(combatant)) {
      return {
        kind: "obstructed",
        obstruction:
          "A canonical stat-block combatant could not be initialized after " +
          "the delegated Initiative results were supplied: " +
          context.sdk.battleStateInitIssueMessage(combatant.left),
        observation: {
          scenarioId: "generated-battle-013",
          status: "stat-block-initialization-obstructed",
        },
      };
    }
  }

  return {
    kind: "obstructed",
    obstruction:
      "The public setup surface cannot faithfully start this battle: " +
      "battleCreatureInitFromStatBlock provides no supported input for the " +
      "required stat-block instance names Brine, Soot, Rivet, and Tangle. The " +
      "delegated Initiative results have been supplied through the canonical " +
      "initializer, but rewriting its output to add those names would bypass " +
      "the public operations.",
    observation: {
      scenarioId: "generated-battle-013",
      status: "public-setup-surface-obstructed",
      blockers: [
        {
          operation: "battleCreatureInitFromStatBlock",
          missingRepresentation: "stat-block combatant instance display name",
          requiredNames: ["Brine", "Soot", "Rivet", "Tangle"],
        },
      ],
      preservedOwnerChoices: ["Tangle target choice"],
    },
  };
};
