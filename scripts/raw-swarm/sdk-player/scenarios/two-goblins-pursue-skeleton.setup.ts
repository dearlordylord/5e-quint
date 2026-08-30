import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlockCatalog } = context;

  const nearerGoblinId = sdk.combatantId("nearer-goblin-warrior");
  const fartherGoblinId = sdk.combatantId("farther-goblin-warrior");
  const skeletonId = sdk.combatantId("skeleton");

  const nearerGoblin = sdk.battleCreatureInitFromStatBlock({
    combatantId: nearerGoblinId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
    initiative: sdk.initiativeScore(18),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  const skeleton = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  const fartherGoblin = sdk.battleCreatureInitFromStatBlock({
    combatantId: fartherGoblinId,
    statBlock: statBlockCatalog.requireStatBlock("stat_block_goblin_warrior"),
    initiative: sdk.initiativeScore(9),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });

  const creatureInits = [nearerGoblin, skeleton, fartherGoblin] as const;
  const invalidCreature = creatureInits.find(sdk.isLeft);
  if (invalidCreature !== undefined) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(invalidCreature.failure),
      observation: {
        scenarioId: "two-goblins-pursue-skeleton",
        status: "invalid-canonical-combatant",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("two-goblins-pursue-skeleton"),
    combatants: creatureInits
      .filter((result) => !sdk.isLeft(result))
      .map((result) => result.success),
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.failure),
      observation: {
        scenarioId: "two-goblins-pursue-skeleton",
        status: "invalid-canonical-battle",
      },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The canonical battle can be started after the controller supplies Initiative, but the public scenario-session surface cannot faithfully compose the required spatial facts. Preserving the fixed 60-by-15-foot passage, all three fixed placements, the portcullis, its north-end opening, and later movement-route questions requires a geometryDerived spatial source. That source is required to be the sole source for supported cover questions, while the scenario explicitly makes Three-Quarters Cover through the portcullis a Table-authored ruling that is not derived by tactical-space. A geometryDerived session cannot also accept that Table decision, and a tableAuthored session cannot retain the arena or placements. Result source would discard a scenario-fixed fact or change its ownership.",
    observation: {
      scenarioId: "two-goblins-pursue-skeleton",
      status: "blocked-on-spatial-source-composition",
      publicSurfaceObstruction: {
        operation: "createScenarioSession",
        requiredCombination: [
          "geometryDerived arena and placements",
          "Table-authored Three-Quarters Cover for cross-portcullis attacks",
        ],
        geometryDerivedAllowsTableSpatialDecisions: false,
        tableAuthoredAllowsArenaAndPlacements: false,
      },
      battleStarted: true,
      scenarioSessionCreated: false,
    },
  };
};
