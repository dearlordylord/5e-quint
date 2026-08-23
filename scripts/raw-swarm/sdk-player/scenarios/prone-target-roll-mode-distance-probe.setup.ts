import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlockCatalog } = context;
  const meleeGoblinWarriorId = sdk.combatantId("melee-goblin-warrior");
  const rangedGoblinWarriorId = sdk.combatantId("ranged-goblin-warrior");
  const wolfId = sdk.combatantId("wolf");
  const goblinWarrior = statBlockCatalog.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  const wolf = statBlockCatalog.requireStatBlock("stat_block_wolf");
  const arrowStock = () => sdk.battleAmmunitionStock("arrow", 20);

  const creatureInits = [
    sdk.battleCreatureInitFromStatBlock({
      combatantId: meleeGoblinWarriorId,
      statBlock: goblinWarrior,
      initiative: sdk.initiativeScore(18),
      ammunitionStocks: [arrowStock()],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: rangedGoblinWarriorId,
      statBlock: goblinWarrior,
      initiative: sdk.initiativeScore(14),
      ammunitionStocks: [arrowStock()],
    }),
    sdk.battleCreatureInitFromStatBlock({
      combatantId: wolfId,
      statBlock: wolf,
      initiative: sdk.initiativeScore(7),
      ammunitionStocks: [],
    }),
  ] as const;

  const initializationIssue = creatureInits.find(sdk.isLeft);
  if (initializationIssue !== undefined && sdk.isLeft(initializationIssue)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(initializationIssue.left),
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        status: "combatant-initialization-failed",
      },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The public stat-block creature initialization surface cannot set the Wolf's required initial Prone condition. The scenario's caller-supplied initiative totals have been supplied through battleCreatureInitFromStatBlock, but its public input has no initial-condition field. Omitting Prone would change the required Scimitar and Shortbow attack roll modes, so no faithful ScenarioSession can be constructed without inventing support.",
    observation: {
      scenarioId: "prone-target-roll-mode-distance-probe",
      status: "unsupported-initial-condition",
      unsupportedFact: {
        combatant: "Wolf",
        condition: "Prone",
        timing: "initial",
        requiredFor: [
          "Scimitar attack from 5 feet has Advantage",
          "Shortbow attack from 30 feet has Disadvantage",
        ],
      },
      suppliedFact: {
        callerSuppliedInitiativeTotals: {
          meleeGoblinWarrior: 18,
          rangedGoblinWarrior: 14,
          wolf: 7,
        },
      },
    },
  };
};
