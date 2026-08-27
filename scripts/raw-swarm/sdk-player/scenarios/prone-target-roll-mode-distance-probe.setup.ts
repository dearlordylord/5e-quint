import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = ({ sdk, statBlocks }) => {
  const meleeGoblinWarriorId = sdk.combatantId("melee-goblin-warrior");
  const rangedGoblinWarriorId = sdk.combatantId("ranged-goblin-warrior");
  const wolfId = sdk.combatantId("wolf");
  const goblinWarrior = statBlocks.find(
    ({ id }) => id === "stat_block_goblin_warrior",
  );
  const wolf = statBlocks.find(({ id }) => id === "stat_block_wolf");

  if (goblinWarrior === undefined || wolf === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied public stat-block collection does not contain both the Goblin Warrior and Wolf required by the scenario.",
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        missingStatBlocks: [
          ...(goblinWarrior === undefined ? ["stat_block_goblin_warrior"] : []),
          ...(wolf === undefined ? ["stat_block_wolf"] : []),
        ],
      },
    };
  }

  const arrowStock = () => sdk.battleAmmunitionStock("arrow", 20);
  const meleeGoblinWarrior = sdk.battleCreatureInitFromStatBlock({
    combatantId: meleeGoblinWarriorId,
    statBlock: goblinWarrior,
    initiative: sdk.initiativeScore(18),
    ammunitionStocks: [arrowStock()],
    conditions: [],
  });
  if (sdk.isLeft(meleeGoblinWarrior)) {
    return {
      kind: "obstructed",
      obstruction: `The public battle initializer rejected the melee Goblin Warrior: ${sdk.authoredStatBlockBattleInitIssueMessage(meleeGoblinWarrior.left)}`,
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        stage: "melee-goblin-warrior-initialization",
      },
    };
  }

  const rangedGoblinWarrior = sdk.battleCreatureInitFromStatBlock({
    combatantId: rangedGoblinWarriorId,
    statBlock: goblinWarrior,
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [arrowStock()],
    conditions: [],
  });
  if (sdk.isLeft(rangedGoblinWarrior)) {
    return {
      kind: "obstructed",
      obstruction: `The public battle initializer rejected the ranged Goblin Warrior: ${sdk.authoredStatBlockBattleInitIssueMessage(rangedGoblinWarrior.left)}`,
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        stage: "ranged-goblin-warrior-initialization",
      },
    };
  }

  const wolfCreature = sdk.battleCreatureInitFromStatBlock({
    combatantId: wolfId,
    statBlock: wolf,
    initiative: sdk.initiativeScore(7),
    ammunitionStocks: [],
    conditions: ["prone"],
  });
  if (sdk.isLeft(wolfCreature)) {
    return {
      kind: "obstructed",
      obstruction: `The public battle initializer rejected the Wolf's initial Prone condition: ${sdk.authoredStatBlockBattleInitIssueMessage(wolfCreature.left)}`,
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        stage: "wolf-initialization",
        requiredCondition: "prone",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId("prone-target-roll-mode-distance-probe"),
    combatants: [
      meleeGoblinWarrior.right,
      rangedGoblinWarrior.right,
      wolfCreature.right,
    ],
  });
  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: `The public battle initializer could not start the required encounter: ${sdk.battleStateInitIssueMessage(battle.left)}`,
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        stage: "battle-start",
      },
    };
  }

  const arenaSizeCells = 20;
  const cells = Array.from(
    { length: arenaSizeCells * arenaSizeCells },
    (_, index) => ({
      x: index % arenaSizeCells,
      y: Math.floor(index / arenaSizeCells),
      terrain: "ordinary" as const,
    }),
  );
  const wolfCoordinate = { x: 8, y: 10 };
  const meleeGoblinWarriorCoordinate = { x: 9, y: 10 };
  const rangedGoblinWarriorCoordinate = { x: 14, y: 10 };

  const session = sdk.createScenarioSession({
    battle: battle.right,
    spatial: {
      kind: "geometryDerived",
      arena: { cells, boundaries: [] },
      placements: [
        { tokenId: wolfId, coordinate: wolfCoordinate },
        {
          tokenId: meleeGoblinWarriorId,
          coordinate: meleeGoblinWarriorCoordinate,
        },
        {
          tokenId: rangedGoblinWarriorId,
          coordinate: rangedGoblinWarriorCoordinate,
        },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: [],
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: rangedGoblinWarriorId, enemyId: wolfId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: meleeGoblinWarriorId, moverId: wolfId },
      { reactorId: rangedGoblinWarriorId, moverId: wolfId },
      { reactorId: wolfId, moverId: meleeGoblinWarriorId },
      { reactorId: wolfId, moverId: rangedGoblinWarriorId },
    ],
    objects: [],
  });
  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: `The public scenario-session surface rejected the required battlefield: ${sdk.scenarioSessionIssueMessage(session.left)}`,
      observation: {
        scenarioId: "prone-target-roll-mode-distance-probe",
        stage: "scenario-session",
      },
    };
  }

  return {
    kind: "ready",
    session: session.right,
    observation: {
      scenarioId: "prone-target-roll-mode-distance-probe",
      arena: {
        kind: "bright-open-geometry",
        sideLengthFeet: 100,
        cellSizeFeet: 5,
        cover: "none",
      },
      paintedLine: {
        kind: "passive-table-observation",
        orientation: "vertical",
        column: 10,
        span: { fromY: 0, toY: 19 },
      },
      placements: {
        wolf: { coordinate: wolfCoordinate, distanceToLineFeet: 10 },
        meleeGoblinWarrior: {
          coordinate: meleeGoblinWarriorCoordinate,
          distanceFromWolfFeet: 5,
        },
        rangedGoblinWarrior: {
          coordinate: rangedGoblinWarriorCoordinate,
          distanceFromWolfFeet: 30,
        },
      },
      initiative: {
        meleeGoblinWarrior: 18,
        rangedGoblinWarrior: 14,
        wolf: 7,
      },
      conditions: {
        meleeGoblinWarrior: [],
        rangedGoblinWarrior: [],
        wolf: ["prone"],
      },
      statBlockDamageNotation: "rolled",
    },
  };
};
