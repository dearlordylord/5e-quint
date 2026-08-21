import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const ridingHorseId = sdk.combatantId("riding-horse");
  const wolfId = sdk.combatantId("wolf");

  const ridingHorse = sdk.battleCreatureInitFromStatBlock({
    combatantId: ridingHorseId,
    statBlock: context.statBlockCatalog.requireStatBlock(
      "stat_block_riding_horse",
    ),
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(ridingHorse)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(ridingHorse.left),
      observation: { stage: "riding-horse-battle-initialization" },
    };
  }

  const wolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: context.statBlockCatalog.requireStatBlock("stat_block_wolf"),
    initiative: sdk.initiativeScore(13),
    ammunitionStocks: [],
  });
  if (sdk.isLeft(wolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(wolf.left),
      observation: { stage: "wolf-battle-initialization" },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("horse-wolf-pursuit"),
    combatants: [ridingHorse.right, wolf.right],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.left),
      observation: { stage: "battle-start" },
    };
  }

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: Array.from({ length: 16 }, (_, x) =>
          Array.from({ length: 4 }, (_, y) => ({
            x,
            y,
            terrain: "ordinary" as const,
          })),
        ).flat(),
        boundaries: [],
      },
      placements: [
        { tokenId: ridingHorseId, coordinate: { x: 12, y: 1 } },
        { tokenId: wolfId, coordinate: { x: 8, y: 1 } },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: ridingHorseId, moverId: wolfId },
      { reactorId: wolfId, moverId: ridingHorseId },
    ],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.left),
      observation: { stage: "scenario-session-creation" },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The public scenario setup surface cannot apply the Table's circumstance Disadvantage to exactly the Wolf's first Bite attack-roll D20 Test. Geometry-derived pursuit, movement, targeting, Bite, Hooves, and ordinary attack resolution are representable, but returning the otherwise complete session as ready would silently omit the scenario's required issue #279 ruling or invent an unsupported per-test witness.",
    observation: {
      issue: 279,
      capability: "table-authored-per-test-circumstance-disadvantage",
      requiredTest: "Wolf's first Bite attack roll against the Riding Horse",
      owner: "Table",
      status: "unsupported-by-public-setup-surface",
    },
  };
};
