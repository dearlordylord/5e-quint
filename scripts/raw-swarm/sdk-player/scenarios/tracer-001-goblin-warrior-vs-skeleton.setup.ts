import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const goblinStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  if (goblinStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Goblin Warrior Stat Block.",
      observation: { statBlockId: "stat_block_goblin_warrior" },
    };
  }
  const goblin = sdk.battleCreatureInitFromStatBlock({
    combatantId: sdk.combatantId("goblin-warrior"),
    initiative: sdk.initiativeScore(15),
    statBlock: goblinStatBlock,
  });
  if (sdk.isLeft(goblin)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblin.left),
      observation: { combatant: "goblin-warrior" },
    };
  }
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );
  if (skeletonStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction: "The public catalog has no Skeleton Stat Block.",
      observation: { statBlockId: "stat_block_skeleton" },
    };
  }
  const skeleton = sdk.battleCreatureInitFromStatBlock({
    combatantId: sdk.combatantId("skeleton"),
    initiative: sdk.initiativeScore(10),
    statBlock: skeletonStatBlock,
  });
  if (sdk.isLeft(skeleton)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeleton.left),
      observation: { combatant: "skeleton" },
    };
  }
  const started = sdk.startBattle({
    battleId: sdk.battleId("tracer-001-goblin-warrior-vs-skeleton"),
    combatants: [goblin.right, skeleton.right],
  });
  return sdk.isLeft(started)
    ? {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(started.left),
        observation: { operation: "startBattle" },
      }
    : {
        kind: "ready",
        session: started.right,
        observation: {
          combatants: ["goblin-warrior", "skeleton"],
          initiatives: [15, 10],
        },
      };
};
