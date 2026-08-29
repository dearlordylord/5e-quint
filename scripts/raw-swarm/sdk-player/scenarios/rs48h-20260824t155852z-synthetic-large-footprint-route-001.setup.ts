import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk, statBlocks } = context;
  const arrowStock = () => [sdk.battleAmmunitionStock("arrow", 20)];

  const ridingHorseStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_riding_horse",
  );
  const goblinWarriorStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  const wolfStatBlock = statBlocks.find(({ id }) => id === "stat_block_wolf");
  const skeletonStatBlock = statBlocks.find(
    ({ id }) => id === "stat_block_skeleton",
  );

  if (
    ridingHorseStatBlock === undefined ||
    goblinWarriorStatBlock === undefined ||
    wolfStatBlock === undefined ||
    skeletonStatBlock === undefined
  ) {
    const missingStatBlockIds = [
      ...(ridingHorseStatBlock === undefined
        ? ["stat_block_riding_horse"]
        : []),
      ...(goblinWarriorStatBlock === undefined
        ? ["stat_block_goblin_warrior"]
        : []),
      ...(wolfStatBlock === undefined ? ["stat_block_wolf"] : []),
      ...(skeletonStatBlock === undefined ? ["stat_block_skeleton"] : []),
    ];

    return {
      kind: "obstructed",
      obstruction:
        "The supplied stat-block collection does not contain every combatant required by the scenario.",
      observation: {
        capability: "canonical-stat-block-battle-initialization",
        missingStatBlockIds,
      },
    };
  }

  const createStatBlockCombatant = (
    combatantId: string,
    statBlock: (typeof statBlocks)[number],
    initiative: number,
    ammunitionStocks: ReturnType<typeof arrowStock> | readonly [] = [],
  ) =>
    sdk.battleCreatureInitFromStatBlock({
      combatantId: sdk.combatantId(combatantId),
      statBlock,
      initiative: sdk.initiativeScore(initiative),
      ammunitionStocks,
      conditions: [],
    });

  const ridingHorse = createStatBlockCombatant(
    "riding-horse",
    ridingHorseStatBlock,
    15,
  );
  const westGoblin = createStatBlockCombatant(
    "west-goblin-warrior",
    goblinWarriorStatBlock,
    19,
    arrowStock(),
  );
  const eastGoblin = createStatBlockCombatant(
    "east-goblin-warrior",
    goblinWarriorStatBlock,
    10,
    arrowStock(),
  );
  const wolf = createStatBlockCombatant("wolf", wolfStatBlock, 13);
  const northwestSkeleton = createStatBlockCombatant(
    "northwest-skeleton",
    skeletonStatBlock,
    14,
    arrowStock(),
  );
  const southeastSkeleton = createStatBlockCombatant(
    "southeast-skeleton",
    skeletonStatBlock,
    6,
    arrowStock(),
  );

  const combatants = [
    ridingHorse,
    westGoblin,
    eastGoblin,
    wolf,
    northwestSkeleton,
    southeastSkeleton,
  ];
  const initializedCombatants = [];
  for (const combatant of combatants) {
    if (sdk.isLeft(combatant)) {
      return {
        kind: "obstructed",
        obstruction: sdk.battleStateInitIssueMessage(combatant.failure),
        observation: {
          capability: "canonical-stat-block-battle-initialization",
        },
      };
    }
    initializedCombatants.push(combatant.success);
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(
      "rs48h-20260824t155852z-synthetic-large-footprint-route-001",
    ),
    combatants: initializedCombatants,
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.failure),
      observation: { capability: "canonical-battle-start" },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The public geometry-derived setup surface places each combatant at one coordinate and provides no way to declare the Riding Horse's canonical 10-foot-by-10-foot occupied footprint. Consequently it cannot faithfully derive footprint adjacency, route clearance, movement distance, reach entries or exits, or Opportunity Attack participation from every square occupied by the Large horse. Representing the horse as a one-cell token or as multiple substitute tokens would change the scenario, so setup is obstructed.",
    observation: {
      capability: "large-creature-footprint-aware-geometry",
      scenarioCombatant: "Riding Horse",
      requiredFootprintFeet: { width: 10, height: 10 },
      publicPlacementShape: "one-coordinate-per-combatant",
      affectedQuestions: [
        "footprint-adjacency",
        "route-clearance",
        "movement-distance",
        "reach-entry-and-exit",
        "opportunity-attack-participation",
      ],
      unsupportedSubstitutionsRejected: [
        "one-cell-large-creature",
        "multiple-tokens-for-one-creature",
      ],
    },
  };
};
