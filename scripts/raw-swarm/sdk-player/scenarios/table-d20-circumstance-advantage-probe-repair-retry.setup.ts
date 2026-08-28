import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const ridingHorseId = sdk.combatantId("riding-horse");
  const wolfId = sdk.combatantId("wolf");

  const ridingHorseStatBlock = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_riding_horse",
  );
  const wolfStatBlock = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_wolf",
  );
  if (ridingHorseStatBlock === undefined || wolfStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied Stat Block catalog is missing a required scenario combatant.",
      observation: {
        stage: "required-stat-block-selection",
        ridingHorseFound: ridingHorseStatBlock !== undefined,
        wolfFound: wolfStatBlock !== undefined,
      },
    };
  }

  const ridingHorse = sdk.battleCreatureInitFromStatBlock({
    combatantId: ridingHorseId,
    statBlock: ridingHorseStatBlock,
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(ridingHorse)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(
        ridingHorse.left,
      ),
      observation: { stage: "riding-horse-battle-initialization" },
    };
  }

  const wolf = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: wolfStatBlock,
    initiative: sdk.initiativeScore(13),
    ammunitionStocks: [],
    conditions: [],
  });
  if (sdk.isLeft(wolf)) {
    return {
      kind: "obstructed",
      obstruction: sdk.authoredStatBlockBattleInitIssueMessage(wolf.left),
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
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
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

  const tableCircumstance = sdk.scenarioSessionWithTableD20TestCircumstance({
    session: session.right,
    binding: {
      selection: {
        kind: "nextD20TestForActor",
        testKind: "attackRoll",
        actorId: wolfId,
      },
      targetId: ridingHorseId,
      source: "disadvantage",
    },
  });
  if (sdk.isLeft(tableCircumstance)) {
    return {
      kind: "obstructed",
      obstruction: tableCircumstance.left.message,
      observation: { stage: "table-d20-test-circumstance-binding" },
    };
  }

  return {
    kind: "ready",
    session: tableCircumstance.right,
    observation: {
      issue: 279,
      capability: "table-authored-per-test-circumstance-disadvantage",
      requiredTest: "Wolf's first Bite attack roll against the Riding Horse",
      owner: "Table",
      status: "bound-to-next-matching-d20-test",
    },
  };
};
