import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

/**
 * Retained public-SDK transcript fixture: the Table owns one exact movement
 * route and its canonical post-move spatial boundary.  The player still
 * enters the ordinary route; the supervisor projects the Table answer.
 */
export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const goblinStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );
  if (goblinStatBlock === undefined || skeletonStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The public catalog lacks the retained movement fixture Stat Blocks.",
      observation: {
        goblinStatBlock: goblinStatBlock !== undefined,
        skeletonStatBlock: skeletonStatBlock !== undefined,
      },
    };
  }
  const goblin = {
    combatantId: sdk.combatantId("goblin-warrior"),
    initiative: sdk.initiativeScore(15),
    statBlock: goblinStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
  const skeleton = {
    combatantId: sdk.combatantId("skeleton"),
    initiative: sdk.initiativeScore(10),
    statBlock: skeletonStatBlock,
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
  const started = sdk.startBattle({
    battleId: sdk.battleId("table-authored-movement-transcript"),
    combatants: [goblin, skeleton],
  });
  if (sdk.isFailure(started)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleInitializationIssueMessage(started.failure),
      observation: { phase: "start-battle" },
    };
  }
  const route = [{ x: 1, y: 0 }] as const;
  const postMoveSpatialFingerprint = sdk.scenarioTableSpatialFingerprint({
    kind: "table-authored-post-move",
    battleId: "table-authored-movement-transcript",
    route,
  });
  const session = sdk.createScenarioSession({
    battle: started.success,
    spatial: {
      kind: "tableAuthored",
      spatialDecisions: [
        {
          decisionId: "table-authored-movement-route",
          question: {
            kind: "movementRoute",
            moverId: goblin.combatantId,
            route,
            speedKind: "walk",
          },
          answer: {
            kind: "movementRoute",
            movementCostFeet: sdk.movementFeet(5),
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: { kind: "notRequired" },
            postMoveSpatialState: {
              kind: "tableAuthored",
              spatialFingerprint: postMoveSpatialFingerprint,
              tableAuthoredDecisions: [],
            },
          },
        },
      ],
    },
    ambientIllumination: "brightLight",
    statBlockDamageSelectionPolicy: { preferredComponentNotation: "rolled" },
    environment: { overhead: { kind: "open" }, barrierHeights: [] },
    initialRangedAttackEnemyRelationships: [],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [],
    objects: [],
  });
  return sdk.isFailure(session)
    ? {
        kind: "obstructed",
        obstruction: sdk.scenarioSessionIssueMessage(session.failure),
        observation: { phase: "scenario-session" },
      }
    : {
        kind: "ready",
        session: session.success,
        observation: {
          spatialSource: "table-authored",
          movementDecisionId: "table-authored-movement-route",
        },
      };
};
