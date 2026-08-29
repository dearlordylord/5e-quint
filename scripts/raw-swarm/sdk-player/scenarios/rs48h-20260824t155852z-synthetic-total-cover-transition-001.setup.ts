import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = (context) => {
  const { sdk } = context;
  const skeletonStatBlock = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_skeleton",
  );
  const goblinWarriorStatBlock = context.statBlocks.find(
    (statBlock) => statBlock.id === "stat_block_goblin_warrior",
  );

  if (skeletonStatBlock === undefined || goblinWarriorStatBlock === undefined) {
    return {
      kind: "obstructed",
      obstruction:
        "The supplied stat-block catalog does not contain every scenario-fixed combatant identity.",
      observation: {
        capability: "stat-block-creature-init",
        requiredStatBlockIds: [
          "stat_block_skeleton",
          "stat_block_goblin_warrior",
        ],
      },
    };
  }

  const skeletonOneId = sdk.combatantId("skeleton-one");
  const skeletonTwoId = sdk.combatantId("skeleton-two");
  const goblinWarriorId = sdk.combatantId("goblin-warrior");

  const skeletonOne = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonOneId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(16),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  const skeletonTwo = sdk.battleCreatureInitFromStatBlock({
    combatantId: skeletonTwoId,
    statBlock: skeletonStatBlock,
    initiative: sdk.initiativeScore(12),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  const goblinWarrior = sdk.battleCreatureInitFromStatBlock({
    combatantId: goblinWarriorId,
    statBlock: goblinWarriorStatBlock,
    initiative: sdk.initiativeScore(14),
    ammunitionStocks: [sdk.battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });

  if (sdk.isLeft(skeletonOne)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeletonOne.failure),
      observation: {
        capability: "stat-block-creature-init",
        combatant: "Skeleton One",
      },
    };
  }
  if (sdk.isLeft(skeletonTwo)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(skeletonTwo.failure),
      observation: {
        capability: "stat-block-creature-init",
        combatant: "Skeleton Two",
      },
    };
  }
  if (sdk.isLeft(goblinWarrior)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(goblinWarrior.failure),
      observation: {
        capability: "stat-block-creature-init",
        combatant: "Goblin Warrior",
      },
    };
  }

  const battle = sdk.startBattle({
    battleId: sdk.battleId(
      "rs48h-20260824t155852z-synthetic-total-cover-transition-001",
    ),
    combatants: [
      skeletonOne.success,
      skeletonTwo.success,
      goblinWarrior.success,
    ],
  });

  if (sdk.isLeft(battle)) {
    return {
      kind: "obstructed",
      obstruction: sdk.battleStateInitIssueMessage(battle.failure),
      observation: {
        capability: "battle-setup",
        operation: "startBattle",
      },
    };
  }

  const feetToCell = (feet: number): number => feet / 5;
  const partitionBoundaries = [15, 20, 25, 30].map((x) => ({
    between: [
      { x: feetToCell(x), y: feetToCell(20) },
      { x: feetToCell(x), y: feetToCell(25) },
    ] as const,
    traversal: "blocked" as const,
    sight: "blocked" as const,
    cover: { kind: "intervening" as const, degree: "total" as const },
  }));
  const arenaCells = Array.from({ length: 10 }, (_, xIndex) =>
    Array.from({ length: 10 }, (_, yIndex) => ({
      x: xIndex,
      y: yIndex,
      terrain: "ordinary" as const,
    })),
  ).flat();

  const session = sdk.createScenarioSession({
    battle: battle.success,
    spatial: {
      kind: "geometryDerived",
      arena: {
        cells: arenaCells,
        boundaries: partitionBoundaries,
      },
      placements: [
        {
          tokenId: skeletonOneId,
          coordinate: { x: feetToCell(25), y: feetToCell(35) },
        },
        {
          tokenId: skeletonTwoId,
          coordinate: { x: feetToCell(20), y: feetToCell(35) },
        },
        {
          tokenId: goblinWarriorId,
          coordinate: { x: feetToCell(25), y: feetToCell(15) },
        },
      ],
      spatialDecisions: [],
    },
    ambientIllumination: "brightLight",
    statBlockDamageNotation: "rolled",
    environment: {
      overhead: { kind: "open" },
      barrierHeights: partitionBoundaries.map(({ between }) => ({
        between,
        heightFeet: sdk.movementFeet(10),
      })),
    },
    initialRangedAttackEnemyRelationships: [
      { attackerId: skeletonOneId, enemyId: goblinWarriorId },
      { attackerId: skeletonTwoId, enemyId: goblinWarriorId },
      { attackerId: goblinWarriorId, enemyId: skeletonOneId },
      { attackerId: goblinWarriorId, enemyId: skeletonTwoId },
    ],
    movementAllyRelationships: [],
    opportunityAttackEnemyRelationships: [
      { reactorId: skeletonOneId, moverId: goblinWarriorId },
      { reactorId: skeletonTwoId, moverId: goblinWarriorId },
      { reactorId: goblinWarriorId, moverId: skeletonOneId },
      { reactorId: goblinWarriorId, moverId: skeletonTwoId },
    ],
    objects: [],
  });

  if (sdk.isLeft(session)) {
    return {
      kind: "obstructed",
      obstruction: sdk.scenarioSessionIssueMessage(session.failure),
      observation: {
        capability: "scenario-session",
        operation: "createScenarioSession",
      },
    };
  }

  return {
    kind: "obstructed",
    obstruction:
      "The public SDK can construct the initial combatant geometry, but three required public-surface capabilities remain unsupported: it exposes no pair-specific automatic direct-attack target-eligibility reassessment after Skeleton One's movement, so it cannot establish that the Goblin Warrior becomes eligible for Skeleton One while remaining ineligible for Skeleton Two; it exposes no carried-object attachment or advancement operation, so it cannot retain the seal with the Goblin Warrior or advance it with the Goblin's movement toward the marked recess; and it has no non-object spatial-marker token, so preserving the seal and recess identities and placements without declaring ScenarioBattleObjects is unavailable, while declaring them would require invented target facts.",
    observation: {
      scenarioId: "rs48h-20260824t155852z-synthetic-total-cover-transition-001",
      coordinateUnits: "scenario feet from the southwest corner",
      publicSurfaceGaps: [
        {
          capability: "automatic-direct-attack-target-eligibility-reassessment",
          status: "unsupported",
          afterResolvedMovement: {
            movedCombatant: "Skeleton One",
            destination: { x: 40, y: 20 },
            target: "Goblin Warrior",
          },
          unchangedComparison: {
            combatant: "Skeleton Two",
            position: { x: 20, y: 35 },
            target: "Goblin Warrior",
          },
          consequence:
            "The canonical public surface cannot establish the required asymmetric post-movement target-eligibility result.",
        },
        {
          capability: "carried-object-attachment-and-movement",
          status: "unsupported",
          initialCoLocation: {
            creature: "Goblin Warrior",
            object: "synthetic-blue-ceramic-seal",
            coordinate: { x: 25, y: 15 },
            geometryCanExpressCoLocation: true,
            retainedWithoutScenarioObject: false,
          },
          requiredTransition:
            "Retain the seal as carried by the Goblin Warrior while it moves toward the marked recess.",
          consequence:
            "Initial co-location is representable, but the canonical public surface cannot attach the seal to the Goblin Warrior or advance that attachment with Goblin movement.",
        },
        {
          capability: "non-object-spatial-marker-identity-and-placement",
          status: "unsupported",
          requestedMarkers: [
            {
              markerId: "synthetic-blue-ceramic-seal",
              coordinate: { x: 25, y: 15 },
              retainedInSession: false,
            },
            {
              markerId: "marked-recess",
              coordinate: { x: 25, y: 5 },
              retainedInSession: false,
            },
          ],
          consequence:
            "Geometry placements accept combatants or declared ScenarioBattleObjects, but this scenario supplies no object Armor Class, damage disposition, traversal, sight, or Cover facts for the seal or recess. The setup therefore omits those marker placements rather than fabricating target properties.",
        },
      ],
    },
  };
};
