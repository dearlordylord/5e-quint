import { battleObjectId } from "./identity.ts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import {
  unitId as parseSharedUnitId,
  statBlockId as parseSharedStatBlockId,
} from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.creature-space-movement-permission unit-feature.grappler
// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GRAPPLER-RUNTIME feat_grappler
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-CREATURE-SPACE-TABLE-SPATIAL-DERIVATION species_halfling_nimbleness
import { abilityModifier, Hp } from "@dnd/shared/types";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import {
  BattleInterruptProcedureChoiceSchema,
  BattleSnapshotSchema,
} from "./index.ts";
import {
  deriveCreatureSpaceTraversalMovementFactFromTableRoute,
  deriveOrdinaryMovementTableRouteFacts,
} from "./battle-reducer/creature-space-table-route.ts";
import { resolveReplayContinuationFromState } from "./battle-execution-composition.ts";
import {
  grappleDragCostExempt,
  grappleEscapeDc,
  targetIsNoMoreThanOneSizeLarger,
} from "./battle-reducer/movement-speed.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  abilityCheckFill,
  applyCondition,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetDistanceSpatialFact,
  attackTargetSpatialFact,
  battleAreaId,
  battleBonusActionStandardActionSupportForUnit,
  BattleFillSchema,
  battleId,
  battleTablePositionId,
  battleUnitSupportProfilesForUnit,
  cantripSpellInvocationRef,
  castGroundHazardForMovementTest,
  characterAttackSubjectForTest,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  difficultyClass,
  discoverBattleActCandidates,
  discoverBattleActs,
  Either,
  elapsedTimeTicks,
  endTurn,
  fighterAttackSubject,
  fighterGrapplesGoblin,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  findHole,
  goblinAttackSubject,
  goblinId,
  grappleOutcomeFill,
  grapplerUnitRefs,
  halflingNimblenessUnitRefs,
  hidePrerequisites,
  interruptDecisionFill,
  magicSubject,
  movementFeet,
  movementFill,
  removeBattleCombatantsRight,
  rageResource,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  ROGUE_CUNNING_ACTION_SUPPORT_PROFILE,
  Schema,
  shoveOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  snapshotBattle,
  spellRecord,
  spellTargetAllocationFill,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  statBlockRecord,
  targetFill,
  testBattleCreatureStateWithConditions,
  testCharacterD20Statistics,
  testUnarmedStrikeDamageAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleProcedureExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: movement, Grapple, and Hide", () => {
  test("rejects a stale Move subject after the action economy blocks Movement", () => {
    const state = fighterVsGoblinBattle();
    const staleState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        movementActionBonusActionExclusion: {
          kind: "restricted" as const,
          choice: "action" as const,
        },
      },
    } satisfies BattleState;

    expect(
      resolveBattleSubject({
        state: staleState,
        subject: { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Movement is no longer available for the current actor.",
    });
  });

  test("Surface rejects malformed same-family Grappler mechanics", () => {
    const unit = unitLibrary.requireUnit("feat_grappler");
    if (unit.kind !== "feat" || unit.mechanics.family !== "grappler") {
      throw new Error("Expected Grappler mechanics.");
    }
    const grapplerMechanics = unit.mechanics;
    expect(() =>
      decodeUnitRecordSync({
        ...unit,
        id: "synthetic_grappler_wrong_advantage",
        mechanics: {
          ...grapplerMechanics,
          attackAdvantage: {
            ...grapplerMechanics.attackAdvantage,
            mode: "normal",
          },
        },
      }),
    ).toThrow();
  });

  test("generic combat actions spend the Action and expose typed battle state", () => {
    const state = fighterVsGoblinBattle();

    const dashed = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "dash",
          speedKind: "walk",
        },
        fills: [],
      }),
    );
    expect(dashed.snapshot.turn.actionResources).toEqual([]);
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(30);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        movement: expect.objectContaining({ remainingFeet: movementFeet(60) }),
      }),
    );

    const dodged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "dodge" },
        fills: [],
      }),
    );
    expect(dodged.state.combatants.get(fighterId)?.dodging).toBe(true);

    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const readyHole = findAct(state, readySubject).initialHoles[0]!;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(readyHole, "the goblin attacks", {
            kind: "movement",
          }),
        ],
      }),
    );
    expect(readied.snapshot.readiedResponses.actionsOrMovements).toEqual([
      expect.objectContaining({
        actorId: fighterId,
        trigger: "the goblin attacks",
        response: { kind: "movement" },
      }),
    ]);
  });

  test("Dash rejects a speed the combatant does not represent", () => {
    const state = fighterVsGoblinBattle();
    const dashSubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "dash" as const,
      speedKind: "walk" as const,
    };

    expect(
      resolveBattleSubject({
        state,
        subject: { ...dashSubject, speedKind: "fly" },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message: "Dash speed kind is not represented for this combatant.",
    });
  });

  test("Grappler Attack Advantage uses the existing grapple link", () => {
    const state = {
      ...fighterVsGoblinBattle({
        characterUnitRefs: grapplerUnitRefs(),
      }),
      grapples: [
        {
          grapplerId: fighterId,
          targetId: goblinId,
          escapeDc: difficultyClass(13),
          reachFeet: movementFeet(5),
          hand: "left" as const,
        },
      ],
    };
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      goblinId,
    );

    expect(attackRoll).toMatchObject({
      kind: "attackRoll",
      rollMode: "advantage",
    });
  });

  test("Grappler Punch and Grab can add a grapple on an Attack action Unarmed Strike hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: grapplerUnitRefs(),
    });
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(state, subject);
    const unarmedTargetFill = targetFill(target, goblinId, [
      attackTargetSpatialFact(
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
    ]);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      goblinId,
    );
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          unarmedTargetFill,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
        ],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Punch and Grab",
      choices: ["use", "decline"],
    });
    expect(decision).not.toHaveProperty("unitFeature");
    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          unarmedTargetFill,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "decline"),
        ],
      }),
    );
    expect(declined.state.grapples).toEqual([]);
    expect(
      declined.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn,
    ).toEqual([]);
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          unarmedTargetFill,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "grappleOutcome",
    );
    expect(outcome).not.toHaveProperty("relationshipFactRequest");
    expect(outcome).toMatchObject({
      actorId: fighterId,
      targetId: goblinId,
      dc: difficultyClass(13),
      mode: "grappleSave",
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          unarmedTargetFill,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "use"),
          grappleOutcomeFill(outcome, false, [
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: fighterId,
              targetId: goblinId,
              targetIsEnemy: true,
            },
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: fighterId,
              targetId: goblinId,
              targetIsEnemy: false,
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Grappler Punch and Grab relationship facts must answer the saving-throw hole request.",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          unarmedTargetFill,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "use"),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );

    expect(result.state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
      }),
    ]);
    expect(
      result.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn,
    ).toEqual([fighterId]);
    expect(result.snapshot.turn.actionResources).toEqual([]);
  });

  test("Grappler does not offer Punch and Grab for an already Grappled target", () => {
    const grappled = fighterGrapplesGoblin(
      startBattleRight({
        battleId: battleId("battle-grappler-already-grappled"),
        combatants: [
          characterSeed({
            initiative: 20,
            classLevel: 4,
            d20Statistics: testCharacterD20Statistics({
              str: 16,
              dex: 13,
            }),
            characterUnitRefs: grapplerUnitRefs(),
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const state = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      goblinId,
    );
    if (attackRoll.kind !== "attackRoll") {
      throw new Error("Expected Unarmed Strike attack-roll hole.");
    }

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attackRoll, {
            naturalD20: 12,
            total: 17,
            rollMode: attackRoll.rollMode ?? "normal",
          }),
        ],
      }),
    );

    expect(result.state.grapples).toEqual(state.grapples);
    expect(result.state.combatants.get(goblinId)?.hp).toBe(6);
    expect(
      result.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn,
    ).toEqual([]);
  });

  test("Grappler Punch and Grab extends enemy-saving-throw ongoing features through the Grapple lifecycle", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-grappler-punch-and-grab-save-lifecycle"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
          characterUnitRefs: grapplerUnitRefs(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const rageProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      "barbarian_rage",
    );
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: rageProcedureRef,
        },
        fills: [],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: raging, actorId: fighterId }),
    ).state;
    const fighterRoundTwo = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    const beforePunch = fighterRoundTwo.combatants
      .get(fighterId)
      ?.activeOngoingFeatureOccurrences.get(rageProcedureRef);
    if (beforePunch?.kind !== "roundExtended") {
      throw new Error("Expected Rage to be active before Punch and Grab.");
    }
    expect(Number(beforePunch.expiresAt.round)).toBe(2);

    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(fighterRoundTwo, subject);
    const targetSelection = targetFill(target, goblinId);
    if (targetSelection.kind !== "targetChoice") {
      throw new Error("Expected attack target choice fill.");
    }
    const attackRoll = attackRollHoleAfterTarget(
      fighterRoundTwo,
      target,
      subject,
      goblinId,
    );
    const decision = requireHole(
      resolveBattleSubject({
        state: fighterRoundTwo,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
        ],
      }),
      "unitFeatureDecision",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state: fighterRoundTwo,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "grappleOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state: fighterRoundTwo,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
          unitFeatureDecisionFill(decision, "use"),
          grappleOutcomeFill(outcome, false, [
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: fighterId,
              targetId: goblinId,
              targetIsEnemy: true,
            },
          ]),
        ],
      }),
    );

    const afterPunch = result.state.combatants
      .get(fighterId)
      ?.activeOngoingFeatureOccurrences.get(rageProcedureRef);
    if (afterPunch?.kind !== "roundExtended") {
      throw new Error("Expected Rage to remain active after Punch and Grab.");
    }
    expect(Number(afterPunch.expiresAt.round)).toBe(3);
    expect(result.state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
      }),
    ]);
  });

  test("Ready asks for the player's perceivable trigger and response", () => {
    const state = fighterVsGoblinBattle();
    const subject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const act = findAct(state, subject);

    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "readyDeclaration",
        actorId: fighterId,
        responseChoices: expect.arrayContaining([
          { kind: "movement" },
          expect.objectContaining({ kind: "attack" }),
          {
            kind: "action",
            subject: {
              tag: "action",
              actorId: fighterId,
              action: "dash",
              speedKind: "walk",
            },
          },
          {
            kind: "action",
            subject: {
              tag: "action",
              actorId: fighterId,
              action: "disengage",
            },
          },
          {
            kind: "action",
            subject: {
              tag: "action",
              actorId: fighterId,
              action: "dodge",
            },
          },
          {
            kind: "action",
            subject: {
              tag: "action",
              actorId: fighterId,
              action: "grapple",
            },
          },
        ]),
      }),
    ]);
    expect(
      Schema.decodeUnknownEither(BattleFillSchema)({
        kind: "readyDeclaration",
        holeId: act.initialHoles[0]?.holeId,
        value: { trigger: "   ", response: { kind: "movement" } },
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("Disengage suppresses Opportunity Attacks for current-turn Movement", () => {
    const state = fighterVsGoblinBattle();
    const disengaged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "disengage" },
        fills: [],
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: disengaged, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: disengaged,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved", snapshot: { pendingInterrupt: null } });
  });

  test("BattleFillSchema decodes creature-space traversal Movement facts", () => {
    const decodeFill = Schema.decodeUnknownEither(BattleFillSchema);
    const unoccupiedDestination = decodeFill({
      kind: "movement",
      holeId: "battle:movement",
      value: {
        speedKind: "walk",
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        creatureSpaceTraversal: {
          kind: "occupiedCreatureSpaceTraversal",
          occupiedSpaces: [
            {
              occupantId: "goblin",
              positionId: "medium-blocker-space",
            },
          ],
          destination: {
            kind: "unoccupiedSpace",
            positionId: "beyond-medium-blocker",
          },
        },
      },
    });

    if (Either.isLeft(unoccupiedDestination)) {
      throw new Error(String(unoccupiedDestination.left));
    }
    expect(unoccupiedDestination.right).toMatchObject({
      kind: "movement",
      value: {
        creatureSpaceTraversal: {
          kind: "occupiedCreatureSpaceTraversal",
          occupiedSpaces: [
            {
              occupantId: "goblin",
              positionId: "medium-blocker-space",
            },
          ],
          destination: {
            kind: "unoccupiedSpace",
            positionId: "beyond-medium-blocker",
          },
        },
      },
    });
    expect(
      Either.isLeft(
        decodeFill({
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [],
              destination: {
                kind: "unoccupiedSpace",
                positionId: "beyond-medium-blocker",
              },
            },
          },
        }),
      ),
    ).toBe(true);

    expect(
      Either.isRight(
        decodeFill({
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: "goblin",
                  positionId: "medium-blocker-space",
                },
              ],
              destination: {
                kind: "occupiedCreatureSpace",
                occupantId: "goblin",
                positionId: "medium-blocker-space",
              },
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("BattleFillSchema rejects empty Grapple Drag Movement facts", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            grappleDrag: {
              kind: "grappleDrag",
              totalDistanceFeet: 10,
              targets: [],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("BattleFillSchema admits only non-empty procedure-specific roll relationship facts", () => {
    const decodeFill = Schema.decodeUnknownEither(BattleFillSchema);
    const valid = decodeFill({
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
      relationshipFacts: [
        {
          kind: "attackRollTargetIsEnemy",
          attackerId: "fighter",
          targetId: "goblin",
          targetIsEnemy: true,
        },
      ],
    });
    const empty = decodeFill({
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
      relationshipFacts: [],
    });
    const wrongProcedure = decodeFill({
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { naturalD20: 10, total: 15 },
      relationshipFacts: [
        {
          kind: "savingThrowTargetIsEnemy",
          actorId: "fighter",
          targetId: "goblin",
          targetIsEnemy: true,
        },
      ],
    });

    expect(Either.isRight(valid)).toBe(true);
    expect(Either.isLeft(empty)).toBe(true);
    expect(Either.isLeft(wrongProcedure)).toBe(true);
  });

  test("Halfling Nimbleness Movement facts admit traversal through a larger occupied creature space", () => {
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-movement"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    const moved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: battleTablePositionId("medium-blocker-space"),
                },
              ],
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId("beyond-medium-blocker"),
              },
            },
          }),
        ],
      }),
    ).state;

    expect(moved.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(10),
    });
  });

  test("Halfling Nimbleness Movement facts reject contradictory occupied creatures", () => {
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-occupant-validation"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const destination = {
      kind: "unoccupiedSpace" as const,
      positionId: battleTablePositionId("beyond-medium-blocker"),
    };
    const invalidTraversals = [
      {
        occupiedSpaces: [
          {
            occupantId: fighterId,
            positionId: battleTablePositionId("mover-space"),
          },
        ],
        message:
          "Creature-space traversal cannot name the mover as the occupied creature.",
      },
      {
        occupiedSpaces: [
          {
            occupantId: goblinId,
            positionId: battleTablePositionId("medium-blocker-front"),
          },
          {
            occupantId: goblinId,
            positionId: battleTablePositionId("medium-blocker-back"),
          },
        ],
        message:
          "Creature-space traversal movement fact repeats an occupied creature.",
      },
      {
        occupiedSpaces: [
          {
            occupantId: combatantId("missing-occupant"),
            positionId: battleTablePositionId("missing-occupant-space"),
          },
        ],
        message:
          "Creature-space traversal references an unknown occupied creature.",
      },
    ] as const;

    for (const invalidTraversal of invalidTraversals) {
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            movementFill(hole, {
              movementCostFeet: 10,
              provokedOpportunityAttacks: [],
              creatureSpaceTraversal: {
                kind: "occupiedCreatureSpaceTraversal",
                occupiedSpaces: invalidTraversal.occupiedSpaces,
                destination,
              },
            }),
          ],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: invalidTraversal.message,
      });
    }
  });

  test("table route facts derive Nimbleness traversal through a larger creature footprint", () => {
    const firstBlockerPositionId = battleTablePositionId(
      "large-blocker-front-space",
    );
    const secondBlockerPositionId = battleTablePositionId(
      "large-blocker-back-space",
    );
    const destinationPositionId = battleTablePositionId("beyond-large-blocker");
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-route-derived-movement"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Large Blocker",
          initiative: 10,
          size: "large",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const derivation = deriveCreatureSpaceTraversalMovementFactFromTableRoute({
      moverId: fighterId,
      route: {
        positionsEnteredBeforeDestination: [
          firstBlockerPositionId,
          secondBlockerPositionId,
        ],
        destination: { positionId: destinationPositionId },
      },
      occupiedCreatureFootprints: [
        {
          occupantId: goblinId,
          creatureSizeRelationToMover: "larger",
          occupiedPositions: [firstBlockerPositionId, secondBlockerPositionId],
        },
      ],
    });

    expect(derivation).toMatchObject({
      tag: "movementFact",
      creatureSpaceTraversal: {
        occupiedSpaces: [
          {
            occupantId: goblinId,
            positionId: firstBlockerPositionId,
          },
        ],
        destination: {
          kind: "unoccupiedSpace",
          positionId: destinationPositionId,
        },
      },
    });
    if (derivation.tag !== "movementFact") {
      throw new Error(
        `Expected route-derived Movement fact, got ${derivation.tag}.`,
      );
    }

    const moved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: derivation.creatureSpaceTraversal,
          }),
        ],
      }),
    ).state;

    expect(moved.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(10),
    });
  });

  test("Halfling Nimbleness Movement facts reject stopping in an occupied creature space", () => {
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-occupied-stop"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: battleTablePositionId("medium-blocker-space"),
                },
              ],
              destination: {
                kind: "occupiedCreatureSpace",
                occupantId: goblinId,
                positionId: battleTablePositionId("medium-blocker-space"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal cannot end in an occupied creature space.",
    });
    const incapacitatedOccupant = state.combatants.get(goblinId);
    expect(incapacitatedOccupant).toBeDefined();
    if (
      incapacitatedOccupant === undefined ||
      incapacitatedOccupant.positiveHpUnconscious !== null
    )
      return;
    const terminalState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...testBattleCreatureStateWithConditions(
          incapacitatedOccupant,
          applyCondition(incapacitatedOccupant.conditions, "incapacitated"),
        ),
        hp: Hp(0),
        zeroHpLifecycle: { policy: "diesAtZeroHp" as const },
      }),
    };
    expect(
      resolveBattleSubject({
        state: terminalState,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: battleTablePositionId("terminal-space"),
                },
              ],
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId("beyond-corpse"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal cannot classify a terminal zero-Hit-Point combatant as an occupied creature.",
    });
  });

  test("table route facts derive an occupied destination witness for Movement rejection", () => {
    const occupiedPositionId = battleTablePositionId("medium-blocker-space");
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-route-derived-stop"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const derivation = deriveCreatureSpaceTraversalMovementFactFromTableRoute({
      moverId: fighterId,
      route: {
        positionsEnteredBeforeDestination: [],
        destination: { positionId: occupiedPositionId },
      },
      occupiedCreatureFootprints: [
        {
          occupantId: goblinId,
          creatureSizeRelationToMover: "larger",
          occupiedPositions: [occupiedPositionId],
        },
      ],
    });

    expect(derivation).toMatchObject({
      tag: "movementFact",
      creatureSpaceTraversal: {
        destination: {
          kind: "occupiedCreatureSpace",
          occupantId: goblinId,
          positionId: occupiedPositionId,
        },
      },
    });
    if (derivation.tag !== "movementFact") {
      throw new Error(
        `Expected route-derived Movement fact, got ${derivation.tag}.`,
      );
    }

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: derivation.creatureSpaceTraversal,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal cannot end in an occupied creature space.",
    });
  });

  test("Halfling Nimbleness Movement facts reject an unoccupied destination at a traversed occupied position", () => {
    const occupiedPositionId = battleTablePositionId("medium-blocker-space");
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-unoccupied-stop-witness"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: occupiedPositionId,
                },
              ],
              destination: {
                kind: "unoccupiedSpace",
                positionId: occupiedPositionId,
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal cannot end in an occupied creature space.",
    });
  });

  test("table route creature-space derivation requires larger occupied creatures", () => {
    const occupiedPositionId = battleTablePositionId("small-blocker-space");

    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        moverId: fighterId,
        route: {
          positionsEnteredBeforeDestination: [occupiedPositionId],
          destination: {
            positionId: battleTablePositionId("beyond-small-blocker"),
          },
        },
        occupiedCreatureFootprints: [
          {
            occupantId: goblinId,
            creatureSizeRelationToMover: "notLarger",
            occupiedPositions: [occupiedPositionId],
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "occupiedRouteCreatureIsNotLarger",
      message:
        "Creature-space route derivation requires occupied route creatures to be larger than the mover.",
    });
  });

  test("ordinary table routes distinguish enemy, ally, Tiny, Incapacitated, and corpse occupants", () => {
    const occupied = battleTablePositionId("ordinary-occupied-space");
    const destination = battleTablePositionId("ordinary-destination");
    const occupantId = combatantId("ordinary-occupant");
    const route = {
      positionsEnteredBeforeDestination: [
        { positionId: occupied, distanceFeet: movementFeet(5) },
      ],
      destination: {
        positionId: destination,
        distanceFeet: movementFeet(10),
      },
    };
    const living = {
      kind: "livingCreature" as const,
      occupantId,
      creatureSize: "medium" as const,
      incapacitated: false,
      allyOfMover: false,
      occupiedPositions: [occupied] as const,
    };
    const derive = (
      occupant: Parameters<
        typeof deriveOrdinaryMovementTableRouteFacts
      >[0]["occupants"][number],
      moverSize: Parameters<
        typeof deriveOrdinaryMovementTableRouteFacts
      >[0]["moverSize"] = "medium",
    ) =>
      deriveOrdinaryMovementTableRouteFacts({
        moverId: fighterId,
        moverSize,
        route,
        occupants: [occupant],
      });
    const deriveAtDestination = (
      occupant: Parameters<
        typeof deriveOrdinaryMovementTableRouteFacts
      >[0]["occupants"][number],
    ) =>
      deriveOrdinaryMovementTableRouteFacts({
        moverId: fighterId,
        moverSize: "medium",
        route: {
          positionsEnteredBeforeDestination: [],
          destination: {
            positionId: destination,
            distanceFeet: movementFeet(10),
          },
        },
        occupants: [occupant],
      });

    expect(derive(living)).toMatchObject({
      tag: "invalid",
      reason: "livingCreatureBlocksTraversal",
    });
    expect(derive({ ...living, allyOfMover: true })).toEqual({
      tag: "routeFacts",
      difficultTerrainSteps: [],
    });
    expect(derive({ ...living, creatureSize: "tiny" })).toEqual({
      tag: "routeFacts",
      difficultTerrainSteps: [],
    });
    expect(derive({ ...living, creatureSize: "large" }, "small")).toEqual({
      tag: "routeFacts",
      difficultTerrainSteps: [
        { positionId: occupied, distanceFeet: movementFeet(5) },
      ],
    });
    expect(derive({ ...living, creatureSize: "small" }, "large")).toEqual({
      tag: "routeFacts",
      difficultTerrainSteps: [
        { positionId: occupied, distanceFeet: movementFeet(5) },
      ],
    });
    expect(derive({ ...living, incapacitated: true })).toMatchObject({
      tag: "routeFacts",
      difficultTerrainSteps: [
        { positionId: occupied, distanceFeet: movementFeet(5) },
      ],
      creatureSpaceTraversal: {
        occupiedSpaces: [{ occupantId, positionId: occupied }],
      },
    });
    expect(
      derive({
        kind: "corpse",
        tokenId: occupantId,
        occupiedPositions: [occupied],
      }),
    ).toEqual({ tag: "routeFacts", difficultTerrainSteps: [] });
    expect(
      deriveAtDestination({
        ...living,
        occupiedPositions: [destination],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "livingCreatureDestination",
      tokenId: occupantId,
      message:
        "A creature cannot willingly end its movement in another creature's space.",
    });
    expect(
      deriveAtDestination({
        kind: "corpse",
        tokenId: occupantId,
        occupiedPositions: [destination],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "corpseDestinationUnsupported",
      tokenId: occupantId,
      message:
        "Scenario movement does not yet adjudicate ending in a corpse's space.",
    });
  });

  test("Creature-space Movement facts require an Incapacitated occupant or an admitted permission profile", () => {
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-missing-profile"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Small Mover",
          initiative: 20,
          size: "small",
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Medium Blocker",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: battleTablePositionId("medium-blocker-space"),
                },
              ],
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId("beyond-medium-blocker"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal requires an Incapacitated occupant or a selected occupied-creature-space movement permission profile.",
    });
  });

  test("ordinary Movement crosses an Incapacitated creature space but cannot stop there", () => {
    const initial = startBattleRight({
      battleId: battleId("battle-incapacitated-creature-space"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Mover",
          initiative: 20,
          size: "medium",
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Incapacitated Occupant",
          initiative: 10,
          size: "medium",
        }),
      ],
    });
    const occupant = initial.combatants.get(goblinId);
    expect(occupant).toBeDefined();
    if (occupant === undefined) return;
    const state = {
      ...initial,
      combatants: new Map(initial.combatants).set(goblinId, {
        ...testBattleCreatureStateWithConditions(
          occupant,
          applyCondition(occupant.conditions, "incapacitated"),
        ),
      }),
    };
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const traversal = {
      kind: "occupiedCreatureSpaceTraversal" as const,
      occupiedSpaces: [
        {
          occupantId: goblinId,
          positionId: battleTablePositionId("incapacitated-space"),
        },
      ] as const,
    };

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              ...traversal,
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId("beyond-occupant"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      movements: [{ creatureSpaceTraversal: traversal }],
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              ...traversal,
              destination: {
                kind: "occupiedCreatureSpace",
                occupantId: goblinId,
                positionId: battleTablePositionId("incapacitated-space"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal cannot end in an occupied creature space.",
    });
  });

  test("Creature-space Movement facts require each occupied creature to be larger than the mover", () => {
    const state = startBattleRight({
      battleId: battleId("battle-halfling-nimbleness-same-size"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Nimble Mover",
          initiative: 20,
          size: "small",
          characterUnitRefs: halflingNimblenessUnitRefs(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Small Blocker",
          initiative: 10,
          size: "small",
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            creatureSpaceTraversal: {
              kind: "occupiedCreatureSpaceTraversal",
              occupiedSpaces: [
                {
                  occupantId: goblinId,
                  positionId: battleTablePositionId("small-blocker-space"),
                },
              ],
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId("beyond-small-blocker"),
              },
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Creature-space traversal requires each occupied creature to be larger than the mover.",
    });
  });

  test("Grease Difficult Terrain facts add extra Movement cost without storing geometry", () => {
    const areaId = battleAreaId("test-grease-area");
    const greased = castGroundHazardForMovementTest(areaId);
    const greaseEffect = greased.combatants
      .get(wizardId)
      ?.activeEffects.find((effect) => effect.kind === "greaseGroundHazard");
    if (greaseEffect === undefined || greaseEffect.areaId !== areaId) {
      throw new Error("Expected the admitted Grease ground hazard.");
    }
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: greased, subject, fills: [] }),
      "movement",
    );
    const areaDifficultTerrain = {
      kind: "areaDifficultTerrain" as const,
      sources: [
        {
          kind: "greaseGroundHazard" as const,
          sourceCombatantId: wizardId,
          sourceProcedureRef: greaseEffect.sourceProcedureRef,
          areaId,
        },
      ],
      totalDistanceFeet: movementFeet(10),
      difficultTerrainDistanceFeet: movementFeet(5),
    };

    expect(
      resolveBattleSubject({
        state: greased,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain.",
    });

    const movementResult = resolveBattleSubject({
      state: greased,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain,
        }),
      ],
    });
    expect(movementResult).toMatchObject({
      tag: "resolved",
      movements: [
        {
          moverId: wizardId,
          movementCostFeet: movementFeet(15),
          spendsTurnMovement: true,
        },
      ],
    });
    const moved = requireResolved(movementResult).state;

    expect(moved.combatants.get(wizardId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
    const effect = moved.combatants
      .get(wizardId)
      ?.activeEffects.find(
        (candidate) => candidate.kind === "greaseGroundHazard",
      );
    expect(effect).toMatchObject({ kind: "greaseGroundHazard", areaId });
    expect(effect).not.toHaveProperty("originAnchorId");
    expect(effect).not.toHaveProperty("affectedTargetIds");
    expect(effect).not.toHaveProperty("shape");
  });

  test("Grease Difficult Terrain movement facts expire with the Grease ground hazard", () => {
    const areaId = battleAreaId("test-expiring-grease-area");
    const greased = castGroundHazardForMovementTest(areaId);
    let expired = greased;
    for (let i = 0; i < 20; i += 1) {
      expired = requireResolved(
        endTurn({
          state: expired,
          actorId: snapshotBattle(expired).currentActorId,
        }),
      ).state;
    }

    expect(
      expired.combatants
        .get(wizardId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "greaseGroundHazard" && effect.areaId === areaId,
        ),
    ).toBe(false);

    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: expired, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: expired,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain: {
              kind: "areaDifficultTerrain",
              sources: [
                {
                  kind: "greaseGroundHazard",
                  sourceCombatantId: wizardId,
                  sourceProcedureRef: expect.any(String),
                  areaId,
                },
              ],
              totalDistanceFeet: movementFeet(10),
              difficultTerrainDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
    });
  });

  test("Ready holds chosen Reaction movement until the table reports its trigger or the actor's next turn", () => {
    // SRD 5.2.1, Rules Glossary, Ready [Action]: choose a perceivable
    // circumstance and an action or movement; when it occurs, react or ignore.
    const state = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0]!;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin raises its scimitar",
            { kind: "movement" },
          ),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: readied, actorId: fighterId }),
    ).state;
    const reportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    expect(findAct(goblinTurn, reportSubject)).toBeDefined();
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedMovement" as const,
      readiedMovementActorId: fighterId,
    };
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const nextFighterTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    expect(nextFighterTurn.readiedResponses.has(fighterId)).toBe(false);

    const awaitingReaction = resolveBattleSubject({
      state: goblinTurn,
      subject: reportSubject,
      fills: [],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const readiedChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "releaseReadiedMovement" &&
          choice.readiedMovementActorId === fighterId,
      );
    expect(awaitingReaction.snapshot.pendingInterrupt?.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "releaseReadiedMovement",
          reactorId: fighterId,
          readiedMovementActorId: fighterId,
        }),
      ]),
    );
    if (readiedChoice === undefined) {
      throw new Error("Expected a readied movement Reaction choice.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)(
        readiedChoice,
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(
        Schema.encodeSync(BattleSnapshotSchema)(awaitingReaction.snapshot),
      ),
    ).not.toThrow();
    const readiedMovementHole = readiedChoice.initialHoles[0];
    if (readiedMovementHole === undefined) {
      throw new Error("Expected readied movement Reaction movement hole.");
    }
    const readiedMove = movementFill(readiedMovementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
    });

    const decision = requireHole(awaitingReaction, "interruptDecision");
    expect(
      resolveBattleInterrupt({
        state: {
          ...awaitingReaction.state,
          readiedResponses: new Map(),
        },
        fill: interruptDecisionFill(decision, {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "releaseReadiedMovement",
            readiedMovementActorId: fighterId,
            fills: [readiedMove],
          },
        }),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "No readied movement is currently being held.",
    });

    const goblinThreat = {
      reactorId: goblinId,
      distanceFeet: movementFeet(5),
      ...attackExecutionSelectionForSubjectForTest(
        goblinAttackSubject(awaitingReaction.state, "Scimitar"),
      ),
    };
    const provokingReadiedMove = movementFill(readiedMovementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [goblinThreat],
    });
    const opportunityWindow = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(decision, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedMovement",
          readiedMovementActorId: fighterId,
          fills: [provokingReadiedMove],
        },
      }),
    });
    expect(opportunityWindow).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingInterrupt: {
          trigger: "opportunityAttack",
        },
      },
    });
    if (opportunityWindow.tag !== "needsHoles") {
      throw new Error("Expected nested Opportunity Attack interrupt.");
    }
    expect(opportunityWindow.state.readiedResponses.has(fighterId)).toBe(false);

    const released = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(decision, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedMovement",
          readiedMovementActorId: fighterId,
          fills: [readiedMove],
        },
      }),
    });
    if (released.tag === "invalid") {
      throw new Error(
        `Expected readied movement release, got ${released.message}.`,
      );
    }

    expect(released.state.readiedResponses.has(fighterId)).toBe(false);
    expect(released.state.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
      movementSpentFeet: movementFeet(0),
    });
  });

  test("Ready stores a chosen Attack and begins it only after the table reports the trigger", () => {
    // SRD 5.2.1, Rules Glossary, Ready [Action]: the response may be an
    // action, and taking it after the chosen circumstance spends a Reaction.
    const state = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const attackResponse = declarationHole.responseChoices.find(
      (response) => response.kind === "attack",
    );
    if (attackResponse?.kind !== "attack") {
      throw new Error("Expected an offered Ready Attack response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin comes within reach",
            attackResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const reportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: reportSubject,
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected reported Ready trigger interrupt.");
    }
    const choice = reported.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        candidate.kind === "releaseReadiedAttack" &&
        candidate.subject.targetId === goblinId,
    );
    if (choice?.kind !== "releaseReadiedAttack") {
      throw new Error("Expected the chosen readied Attack response.");
    }
    const targetSpatialFacts = {
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetDistanceSpatialFact(
          fighterId,
          goblinId,
          attackResponse.selection,
          movementFeet(5),
        ),
      ],
    };
    const begun = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          reactorId: fighterId,
          targetId: goblinId,
          procedureRef: attackResponse.selection.procedureRef,
          fills: [targetSpatialFacts],
        },
      }),
    });
    if (begun.tag === "invalid") {
      throw new Error(`Expected readied Attack release, got ${begun.message}.`);
    }

    expect(begun).toMatchObject({
      tag: "needsHoles",
      subject: { command: "releaseReadiedAttack", targetId: goblinId },
      holes: [{ kind: "attackRoll" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("Ready releases a chosen ordinary action after the table reports the trigger", () => {
    const state = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const dodgeResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "action" && response.subject.action === "dodge",
    );
    if (dodgeResponse?.kind !== "action") {
      throw new Error("Expected an offered Dodge response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin raises its weapon",
            dodgeResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a reported Ready trigger interrupt.");
    }
    const released = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAction",
          reactorId: fighterId,
          fills: [],
        },
      }),
    });
    if (released.tag !== "resolved") {
      throw new Error("Expected the readied Dodge to resolve.");
    }
    expect(released.state.combatants.get(fighterId)).toMatchObject({
      dodging: true,
      reactionAvailable: false,
    });
    expect(released.state.readiedResponses.has(fighterId)).toBe(false);
  });

  test("Ready restores the interrupted turn while a released Help action requests its fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-ready-help-release-frontier"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: combatantId("ready-help-ally"),
          initiative: 5,
        }),
      ],
    });
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const helpResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "action" && response.subject.action === "helpAttack",
    );
    if (helpResponse?.kind !== "action") {
      throw new Error("Expected an offered Help response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin raises its weapon",
            helpResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a reported Ready trigger interrupt.");
    }
    const released = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAction",
          reactorId: fighterId,
          fills: [],
        },
      }),
    });
    expect(released).toMatchObject({
      tag: "needsHoles",
      subject: { command: "releaseReadiedAction", reactorId: fighterId },
      holes: [{ kind: "helpAttackAllyDecision" }],
    });
    if (released.tag !== "needsHoles") {
      throw new Error("Expected the released Help action to request an ally.");
    }
    expect(released.state.readiedResponses.has(fighterId)).toBe(true);
    expect(released.state.currentTurnResources).toEqual(
      reported.state.currentTurnResources,
    );
  });

  test("a multi-step Ready response restores the subject that was already awaiting fills", () => {
    const state = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const attackResponse = declarationHole.responseChoices.find(
      (response) => response.kind === "attack",
    );
    if (attackResponse?.kind !== "attack") {
      throw new Error("Expected an offered Attack response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin attacks",
            attackResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const goblinAttack = goblinAttackSubject(goblinTurn.state, "Scimitar");
    const awaitingTarget = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttack,
      fills: [],
    });
    if (awaitingTarget.tag !== "needsHoles") {
      throw new Error("Expected the Goblin attack target frontier.");
    }
    const reported = resolveBattleSubject({
      state: awaitingTarget.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected the nested Ready trigger frontier.");
    }
    const targetSpatialFacts = {
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetDistanceSpatialFact(
          fighterId,
          goblinId,
          attackResponse.selection,
          movementFeet(5),
        ),
      ],
    };
    const begun = resolveBattleInterrupt({
      state: reported.state,
      fill: interruptDecisionFill(requireHole(reported, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          reactorId: fighterId,
          targetId: goblinId,
          procedureRef: attackResponse.selection.procedureRef,
          fills: [targetSpatialFacts],
        },
      }),
    });
    if (begun.tag !== "needsHoles") {
      throw new Error("Expected the readied Attack Roll frontier.");
    }
    const attackRoll = requireHole(begun, "attackRoll");
    const completed = resolveBattleSubject({
      state: begun.state,
      subject: begun.subject,
      fills: [
        attackRollFill(attackRoll, {
          total: 1,
          naturalD20: 2,
        }),
      ],
    });
    if (completed.tag !== "resolved") {
      throw new Error("Expected the readied Attack miss to resolve.");
    }
    expect(completed.state.subjectResolutionPhase).toEqual({
      kind: "subjectContinuation",
      subject: goblinAttack,
    });
    expect(
      completed.snapshot.acts.every(
        ({ subject }) =>
          subject.tag === "runtimeCommand" &&
          subject.command === "reportReadyTrigger",
      ),
    ).toBe(true);
    expect(
      resolveBattleSubject({
        state: completed.state,
        subject: goblinAttack,
        fills: [],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ kind: "targetChoice" }] });

    const removedResponder = removeBattleCombatantsRight({
      state: begun.state,
      combatantIds: [fighterId],
    });
    expect(removedResponder.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
  });

  test("Help attack consumes procedure-local ally and enemy decisions", () => {
    const state = startBattleRight({
      battleId: battleId("battle-help-attack"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 5,
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "helpAttack",
    };
    const ally = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "helpAttackAllyDecision",
    );
    const allyFill = {
      kind: "helpAttackAllyDecision" as const,
      holeId: ally.holeId,
      allyId: wizardId,
    };
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [allyFill],
      }),
      "helpAttackEnemyDecision",
    );
    const enemyFill = {
      kind: "helpAttackEnemyDecision" as const,
      holeId: target.holeId,
      targetEnemyId: goblinId,
      targetWithinFiveFeetOfHelper: true,
    };
    const helped = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [allyFill, enemyFill],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({
        state: requireResolved(endTurn({ state: helped, actorId: fighterId }))
          .state,
        actorId: goblinId,
      }),
    ).state;
    const attackSubject: BattleSubject = characterAttackSubjectForTest(
      wizardTurn,
      wizardId,
      "Longsword",
    );
    const attackTarget = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    const missed = requireResolved(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.helpAttackMarkers).toEqual([]);
  });

  test("Stand from Prone spends half Speed as Movement and clears Prone", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-stand-from-prone"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const fighter = state.combatants.get(fighterId)!;
    const proneState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "prone"),
        ),
      ),
    };
    const standAct = findAct(
      battleRuntimeSessionForTest({
        state: proneState,
        context: session.context,
      }),
      {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "standFromProne",
      },
    );
    expect(standAct.routeEvents).toEqual([
      { kind: "startBattle", owner: "battleCreatureState" },
      {
        kind: "discoverBattleActs",
        subject: "creatureStatProjection",
        holes: [],
        owner: "battleCreatureState",
      },
    ]);
    const stood = requireResolved(
      resolveBattleSubject({
        state: proneState,
        subject: standAct.subject,
        fills: [],
      }),
    );

    expect(stood.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        conditions: expect.not.arrayContaining(["prone"]),
        movement: expect.objectContaining({
          spentFeet: movementFeet(15),
          remainingFeet: movementFeet(15),
        }),
      }),
    );
    expect(stood.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "creatureStatProjection",
        holes: [],
        owner: "battleCreatureState",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "creatureStatProjection",
        holes: [],
        owner: "battleMovementResource",
      },
    ]);
  });

  test("Stand from Prone requires positive Speed and enough remaining Movement", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const moved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 20,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;
    const movedFighter = moved.combatants.get(fighterId)!;
    const proneWithoutBudget: BattleState = {
      ...moved,
      combatants: new Map(moved.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          movedFighter,
          applyCondition(movedFighter.conditions, "prone"),
        ),
      ),
    };

    expect(
      resolveBattleSubject({
        state: proneWithoutBudget,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "standFromProne",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle()).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const goblin = goblinTurn.combatants.get(goblinId)!;
    const proneGrappledTarget: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(
        goblinId,
        testBattleCreatureStateWithConditions(
          goblin,
          applyCondition(goblin.conditions, "prone"),
        ),
      ),
    };

    expect(
      resolveBattleSubject({
        state: proneGrappledTarget,
        subject: {
          tag: "runtimeCommand",
          actorId: goblinId,
          command: "standFromProne",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("discoverBattleActs omits attack when the current character is Unconscious at 0 HP", () => {
    const acts = discoverBattleActCandidates(
      startBattleRight({
        battleId: battleId("battle-unconscious-actor"),
        combatants: [
          characterSeed({ initiative: 20, currentHp: 0 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
  });

  test("movement replay spends Movement from caller-provided movement cost", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(hole).toMatchObject({
      kind: "movement",
      movementBudgetFeet: 30,
    });

    const moved = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
        }),
      ],
    });

    expect(moved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            movement: expect.objectContaining({
              speedFeet: 30,
              spentFeet: 10,
              remainingFeet: 20,
            }),
          }),
        ]),
      },
    });
    if (moved.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${moved.tag}.`);
    }
  });

  test("Dash extends the Movement budget without resetting spent Movement", () => {
    const state = fighterVsGoblinBattle();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const moved = requireResolved(
      resolveBattleSubject({
        state,
        subject: moveSubject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 20,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;

    const dashed = requireResolved(
      resolveBattleSubject({
        state: moved,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "dash",
          speedKind: "walk",
        },
        fills: [],
      }),
    );

    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(30);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        movement: expect.objectContaining({
          spentFeet: movementFeet(20),
          remainingFeet: movementFeet(40),
        }),
      }),
    );
  });

  test("movement cost cannot exceed the derived remaining Movement budget", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 35,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("movement discovery stays available when only a special Speed has remaining budget", () => {
    const climberId = combatantId("unequal-speed-climber");
    const base = statBlockRecord();
    const state = startBattleRight({
      battleId: battleId("battle-unequal-special-speed"),
      combatants: [
        statBlockCreatureInit({
          combatantId: climberId,
          displayName: "Unequal Speed Climber",
          initiative: 20,
          statBlock: {
            ...base,
            id: parseSharedStatBlockId("stat_block_unequal_speed_climber"),
            name: "Unequal Speed Climber",
            statBlock: {
              ...base.statBlock,
              displayName: "Unequal Speed Climber",
              speeds: [
                { kind: "walk", feet: { kind: "literal", value: 30 } },
                { kind: "climb", feet: { kind: "literal", value: 40 } },
              ],
            },
          },
        }),
        characterSeed({ combatantId: fighterId, initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: climberId,
      command: "move",
    };
    const initialMoveHole = findHole(
      findAct(state, subject).initialHoles,
      "movement",
    );
    const walked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(initialMoveHole, {
            speedKind: "walk",
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;

    const remainingMoveHole = findHole(
      findAct(walked, subject).initialHoles,
      "movement",
    );
    expect(remainingMoveHole).toMatchObject({
      speedKinds: [
        { kind: "walk", movementBudgetFeet: 0 },
        { kind: "climb", movementBudgetFeet: 10 },
      ],
    });
    expect(
      resolveBattleSubject({
        state: walked,
        subject,
        fills: [
          movementFill(remainingMoveHole, {
            speedKind: "climb",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("battle state projects typed Grapple links", () => {
    const state = fighterVsGoblinBattle();

    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false, [
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: wizardId,
              targetId: goblinId,
              targetIsEnemy: true,
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Grapple relationship facts must answer the saving-throw hole request.",
    });

    expect(grappled.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["grappled"]),
          movement: expect.objectContaining({ speedFeet: 0 }),
        }),
      ]),
    );
    expect(grappled.state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
      }),
    ]);
  });

  test("Grapple and Shove reject duplicate fills from their discovered holes", () => {
    const state = fighterVsGoblinBattle();
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const grappleTarget = requireHole(
      resolveBattleSubject({ state, subject: grappleSubject, fills: [] }),
      "targetChoice",
    );
    const grappleTargetFill = targetFill(grappleTarget, goblinId);
    expect(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [grappleTargetFill, grappleTargetFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Grapple target was filled twice.",
    });
    const grappleOutcome = requireHole(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [grappleTargetFill],
      }),
      "grappleOutcome",
    );
    const grappleOutcomeFillValue = grappleOutcomeFill(grappleOutcome, false);
    expect(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [
          grappleTargetFill,
          grappleOutcomeFillValue,
          grappleOutcomeFillValue,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Grapple outcome was filled twice.",
    });

    const shoveSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "shove",
    };
    const shoveTarget = requireHole(
      resolveBattleSubject({ state, subject: shoveSubject, fills: [] }),
      "targetChoice",
    );
    const shoveTargetFill = targetFill(shoveTarget, goblinId);
    expect(
      resolveBattleSubject({
        state,
        subject: shoveSubject,
        fills: [shoveTargetFill, shoveTargetFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Shove target was filled twice.",
    });
    const shoveOutcome = requireHole(
      resolveBattleSubject({
        state,
        subject: shoveSubject,
        fills: [shoveTargetFill],
      }),
      "shoveOutcome",
    );
    const shoveOutcomeFillValue = shoveOutcomeFill(shoveOutcome, {
      succeeded: true,
    });
    expect(
      resolveBattleSubject({
        state,
        subject: shoveSubject,
        fills: [shoveTargetFill, shoveOutcomeFillValue, shoveOutcomeFillValue],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Shove outcome was filled twice.",
    });
  });

  test("Grapple admission requires a free hand, size limit, and failed save", () => {
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const shielded = startBattleRight({
      battleId: battleId("battle-grapple-no-free-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          selectedLoadout: {
            shield: {
              itemId: battleObjectId("shield:equipment_shield"),
              unitId: parseSharedUnitId("equipment_shield"),
            },
            weapon: {
              itemId: battleObjectId("main:weapon_longsword"),
              unitId: parseSharedUnitId("weapon_longsword"),
              grip: "one_handed",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const shieldedTarget = requireHole(
      resolveBattleSubject({
        state: shielded,
        subject: grappleSubject,
        fills: [],
      }),
      "targetChoice",
    );
    expect(
      resolveBattleSubject({
        state: shielded,
        subject: grappleSubject,
        fills: [targetFill(shieldedTarget, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Grapple requires a free hand.",
    });

    const baseTarget = statBlockRecord();
    const hugeTargetId = combatantId("huge-grapple-target");
    const hugeTarget = startBattleRight({
      battleId: battleId("battle-grapple-target-too-large"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          combatantId: hugeTargetId,
          displayName: "Huge Grapple Target",
          initiative: 10,
          statBlock: {
            ...baseTarget,
            id: parseSharedStatBlockId("stat_block_huge_grapple_target"),
            name: "Huge Grapple Target",
            statBlock: {
              ...baseTarget.statBlock,
              displayName: "Huge Grapple Target",
              size: "huge",
            },
          },
        }),
      ],
    });
    const hugeTargetHole = requireHole(
      resolveBattleSubject({
        state: hugeTarget,
        subject: grappleSubject,
        fills: [],
      }),
      "targetChoice",
    );
    expect(
      resolveBattleSubject({
        state: hugeTarget,
        subject: grappleSubject,
        fills: [targetFill(hugeTargetHole, hugeTargetId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Grapple target cannot be more than one size larger.",
    });

    const state = fighterVsGoblinBattle();
    const target = requireHole(
      resolveBattleSubject({ state, subject: grappleSubject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "grappleOutcome",
    );
    expect(outcome).toMatchObject({ dc: 13 });
    const saved = requireResolved(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, true),
        ],
      }),
    );
    expect(saved.state.grapples).toEqual([]);

    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );
    expect(grappled.state.grapples).toEqual([
      expect.objectContaining({ targetId: goblinId, escapeDc: 13 }),
    ]);
  });

  test("Grapple escape DC derives from the attacker's Strength", () => {
    const fighter = fighterVsGoblinBattle().combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the Grapple helper fighter.");
    }
    expect(grappleEscapeDc(fighter)).toBe(13);
  });

  test("Grapple size helpers match size limit and drag-cost exceptions", () => {
    expect(targetIsNoMoreThanOneSizeLarger("medium", "large")).toBe(true);
    expect(targetIsNoMoreThanOneSizeLarger("medium", "huge")).toBe(false);
    expect(grappleDragCostExempt("medium", "medium")).toBe(false);
    expect(grappleDragCostExempt("large", "tiny")).toBe(true);
    expect(grappleDragCostExempt("huge", "medium")).toBe(true);
  });

  test("Shove resolves the Unarmed Strike save and prone failure effect", () => {
    const state = fighterVsGoblinBattle();
    const targetBefore = state.combatants.get(goblinId);
    if (targetBefore === undefined) {
      throw new Error("Expected the Shove target combatant.");
    }
    const targetSnapshotBefore = snapshotBattle(state).combatants.find(
      (combatant) => combatant.combatantId === goblinId,
    );
    if (targetSnapshotBefore === undefined) {
      throw new Error("Expected the Shove target snapshot.");
    }
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "shove",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "shoveOutcome",
    );
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(
            outcome,
            { succeeded: false, failedEffect: { kind: "prone" } },
            [
              {
                kind: "savingThrowTargetIsEnemy",
                actorId: fighterId,
                targetId: goblinId,
                targetIsEnemy: true,
              },
              {
                kind: "savingThrowTargetIsEnemy",
                actorId: fighterId,
                targetId: goblinId,
                targetIsEnemy: false,
              },
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Shove relationship facts must answer the saving-throw hole request.",
    });
    const shoved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(outcome, {
            succeeded: false,
            failedEffect: { kind: "prone" },
          }),
        ],
      }),
    );

    expect(outcome).toMatchObject({ dc: 13 });
    expect(shoved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["prone"]),
        }),
      ]),
    );
    const pushDestinationId = battleTablePositionId("shove-push-destination");
    const pushed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(outcome, {
            succeeded: false,
            failedEffect: {
              kind: "pushAway",
              disposition: {
                kind: "pushed",
                distanceFeet: movementFeet(5),
                destinationId: pushDestinationId,
                provokesOpportunityAttacks: false,
              },
            },
          }),
        ],
      }),
    );
    expect(pushed.shovePushes).toEqual([
      {
        targetId: goblinId,
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(5),
          destinationId: pushDestinationId,
          provokesOpportunityAttacks: false,
        },
      },
    ]);

    const succeeded = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(outcome, { succeeded: true }),
        ],
      }),
    );
    expect(succeeded.shovePushes).toBeUndefined();
    expect(succeeded.state.combatants.get(goblinId)).toBe(targetBefore);
    expect(succeeded.state.combatants.get(goblinId)?.movementSpentFeet).toBe(
      targetBefore.movementSpentFeet,
    );
    expect(
      snapshotBattle(succeeded.state).combatants.find(
        (combatant) => combatant.combatantId === goblinId,
      ),
    ).toEqual(targetSnapshotBefore);
    expect(succeeded.state.combatants.get(goblinId)?.conditions).not.toContain(
      "prone",
    );
  });

  test("forcing an enemy to save against Shove extends Rage through the public frontier", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-shove-save-lifecycle"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      "barbarian_rage",
    );
    const raging = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: rageProcedureRef,
        },
        fills: [],
      }),
    ).state;
    const fighterRoundTwo = requireResolved(
      endTurn({
        state: requireResolved(endTurn({ state: raging, actorId: fighterId }))
          .state,
        actorId: goblinId,
      }),
    ).state;
    const subject = discoverBattleActCandidates(fighterRoundTwo).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "shove",
    )?.subject;
    if (subject?.tag !== "action" || subject.action !== "shove") {
      throw new Error("Expected a discovered Shove action.");
    }
    const target = requireHole(
      resolveBattleSubject({ state: fighterRoundTwo, subject, fills: [] }),
      "targetChoice",
    );
    const targetSelection = targetFill(target, goblinId);
    const outcome = requireHole(
      resolveBattleSubject({
        state: fighterRoundTwo,
        subject,
        fills: [targetSelection],
      }),
      "shoveOutcome",
    );

    expect(outcome).toMatchObject({
      actorId: fighterId,
      targetId: goblinId,
      relationshipFactRequest: {
        kind: "savingThrowTargetIsEnemy",
        actorId: fighterId,
      },
    });

    const shoved = requireResolved(
      resolveBattleSubject({
        state: fighterRoundTwo,
        subject,
        fills: [
          targetSelection,
          shoveOutcomeFill(outcome, { succeeded: true }, [
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: fighterId,
              targetId: goblinId,
              targetIsEnemy: true,
            },
          ]),
        ],
      }),
    );
    const extendedRage = shoved.state.combatants
      .get(fighterId)
      ?.activeOngoingFeatureOccurrences.get(rageProcedureRef);
    if (extendedRage?.kind !== "roundExtended") {
      throw new Error("Expected Shove to extend Rage.");
    }

    expect(Number(extendedRage.expiresAt.round)).toBe(3);
    expect(extendedRage.expiresAt).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 3,
    });
  });

  test("true-form Shove DC uses the projected Unarmed Strike ability modifier", () => {
    const state = startBattleRight({
      battleId: battleId("battle-dexterous-shove"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          d20Statistics: testCharacterD20Statistics({ str: 10, dex: 16 }),
          unarmedStrike: {
            ...testUnarmedStrikeDamageAttack(),
            attackAbility: "dex",
            attackAbilityModifier: abilityModifier(3),
            damageAbilityModifier: abilityModifier(3),
          },
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "shove",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "shoveOutcome",
    );

    expect(outcome).toMatchObject({ dc: 13 });
  });

  test("release and Escape Grapple end the typed grapple link", () => {
    const state = fighterVsGoblinBattle();
    const grappled = fighterGrapplesGoblin(state);

    const released = requireResolved(
      resolveBattleSubject({
        state: grappled.state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    );
    expect(released.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.not.arrayContaining(["grappled"]),
        }),
      ]),
    );
    expect(released.state.grapples).toEqual([]);

    const goblinTurn = requireResolved(
      endTurn({ state: grappled.state, actorId: fighterId }),
    ).state;
    expect(
      discoverBattleActCandidates(goblinTurn).map((act) => act.subject),
    ).toContainEqual({
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "releaseGrapple",
      targetId: goblinId,
    });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "resolved" });

    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };
    const escape = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "grappleOutcome",
    );
    const failed = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [grappleOutcomeFill(escape, false)],
      }),
    );
    expect(failed.state.grapples).toHaveLength(1);
    expect(failed.snapshot.turn.actionResources).toEqual([]);

    const escaped = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    );
    expect(escaped.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.not.arrayContaining(["grappled"]),
        }),
      ]),
    );
    expect(escaped.state.grapples).toEqual([]);
    const ungrappledGoblinTurn = requireResolved(
      endTurn({ state: released.state, actorId: fighterId }),
    ).state;
    expect(
      resolveBattleSubject({
        state: ungrappledGoblinTurn,
        subject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "No Grapple is available to escape.",
    });
  });

  test("grapple drag movement enforces extra cost unless Fast Wrestler exempts the target", () => {
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const grappleDrag = {
      kind: "grappleDrag" as const,
      totalDistanceFeet: movementFeet(10),
      targets: [
        {
          targetId: goblinId,
          distanceFeet: movementFeet(10),
        },
      ] as const,
    };
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle()).state;
    const normalHole = requireHole(
      resolveBattleSubject({ state: grappled, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: grappled,
        subject,
        fills: [
          movementFill(normalHole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            grappleDrag,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Grapple drag movement must spend total distance plus 1 extra foot for every foot a non-exempt Grappled target is dragged.",
    });

    const normalMoved = requireResolved(
      resolveBattleSubject({
        state: grappled,
        subject,
        fills: [
          movementFill(normalHole, {
            movementCostFeet: 20,
            provokedOpportunityAttacks: [],
            grappleDrag,
          }),
        ],
      }),
    ).state;

    expect(normalMoved.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(20),
    });

    const grapplerGrappled = fighterGrapplesGoblin(
      fighterVsGoblinBattle({
        characterUnitRefs: grapplerUnitRefs(),
      }),
    ).state;
    const grapplerHole = requireHole(
      resolveBattleSubject({
        state: grapplerGrappled,
        subject,
        fills: [],
      }),
      "movement",
    );
    const grapplerMoved = requireResolved(
      resolveBattleSubject({
        state: grapplerGrappled,
        subject,
        fills: [
          movementFill(grapplerHole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            grappleDrag,
          }),
        ],
      }),
    ).state;

    expect(grapplerMoved.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(10),
    });
  });

  test("Fast Wrestler drag cost uses current target size after size changes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-grappler-fast-wrestler-current-size"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: grapplerUnitRefs(),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject: grappleSubject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [targetFill(target, skeletonId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [
          targetFill(target, skeletonId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    ).state;
    const skeleton = grappled.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected skeleton target.");
    }
    const enlarged = {
      ...grappled,
      combatants: new Map(grappled.combatants).set(skeletonId, {
        ...skeleton,
        activeEffects: [
          ...skeleton.activeEffects,
          {
            kind: "spellCreatureSizeChange" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(spellRecord("enlarge_reduce").id),
            ),
            sourceCombatantId: fighterId,
            direction: "increase" as const,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: fighterId,
              durationTicks: elapsedTimeTicks(60),
            },
          },
        ],
      }),
    };
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({
        state: enlarged,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const grappleDrag = {
      kind: "grappleDrag" as const,
      totalDistanceFeet: movementFeet(10),
      targets: [
        {
          targetId: skeletonId,
          distanceFeet: movementFeet(10),
        },
      ] as const,
    };

    expect(
      resolveBattleSubject({
        state: enlarged,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            grappleDrag,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Grapple drag movement must spend total distance plus 1 extra foot for every foot a non-exempt Grappled target is dragged.",
    });

    const moved = requireResolved(
      resolveBattleSubject({
        state: enlarged,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 20,
            provokedOpportunityAttacks: [],
            grappleDrag,
          }),
        ],
      }),
    ).state;

    expect(moved.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(20),
    });
  });

  test("Grappled attack rolls have disadvantage against targets other than the grappler", () => {
    const state = startBattleRight({
      battleId: battleId("battle-grappled-attack-disadvantage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Skeleton",
          initiative: 5,
        }),
      ],
    });
    const grappled = fighterGrapplesGoblin(state).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const rollAgainstGrappler = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({ rollMode: "disadvantage" });
    if (rollAgainstGrappler.kind !== "attackRoll") {
      throw new Error("Expected attack roll hole against grappler.");
    }
    expect(rollAgainstGrappler.rollMode ?? "normal").toBe("normal");
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "disadvantage",
          }),
        ],
      }),
    ).not.toMatchObject({ tag: "invalid" });

    const hiddenGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblinTurn.combatants.get(goblinId)!,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const hiddenTarget = requireHole(
      resolveBattleSubject({ state: hiddenGoblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const hiddenRoll = requireHole(
      resolveBattleSubject({
        state: hiddenGoblinTurn,
        subject,
        fills: [targetFill(hiddenTarget, skeletonId)],
      }),
      "attackRoll",
    );

    expect(hiddenRoll).toHaveProperty("rollMode", "normal");
  });

  test("Dodge attack-roll Disadvantage requires seeing the attacker", () => {
    const state = fighterVsGoblinBattle();
    const dodged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "dodge" },
        fills: [],
      }),
    ).state;
    const fighter = dodged.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected Fighter combatant.");
    }
    const blindedDodger: BattleState = {
      ...dodged,
      combatants: new Map(dodged.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "blinded"),
        ),
      ),
    };
    const goblinTurn = requireResolved(
      endTurn({ state: blindedDodger, actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );

    expect(roll).not.toHaveProperty("rollMode");
  });

  test("Grappled spell attack rolls have disadvantage against targets other than the grappler", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-grappled-spell-attack-disadvantage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 10,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const state = session.state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, wizardId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const spellSubject = findAct(
      battleRuntimeSessionForTest({ ...session, state: wizardTurn }),
      magicSubject("ray_of_frost"),
    ).subject;
    const spellTarget = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [targetFill(spellTarget, skeletonId)],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({ rollMode: "disadvantage" });
    expect(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, skeletonId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("Hide stores discovery DC, grants Invisible while hidden, and Search can find the hidden creature", () => {
    const state = fighterVsGoblinBattle({
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
      ]),
    });
    const hideSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };
    const hide = findAct(state, hideSubject);
    const failedHide = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide.subject,
        fills: [
          abilityCheckFill(findHole(hide.initialHoles, "abilityCheck"), 10),
        ],
      }),
    );
    expect(failedHide.state.combatants.get(fighterId)?.hidden).toBeNull();

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hide.subject,
        fills: [
          abilityCheckFill(findHole(hide.initialHoles, "abilityCheck"), 18),
        ],
      }),
    ).state;

    expect(snapshotBattle(hidden).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hidden, actorId: fighterId }),
    ).state;
    const searchSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "search",
    };
    const searchTarget = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [],
      }),
      "targetChoice",
    );
    expect(searchTarget).toMatchObject({ choices: [fighterId] });
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [targetFill(searchTarget, fighterId)],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      kind: "abilityCheck",
      skill: "perception",
      dc: 18,
    });
    const notFound = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [
          targetFill(searchTarget, fighterId),
          abilityCheckFill(searchCheck, 17),
        ],
      }),
    );
    expect(notFound.state.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });

    const found = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [
          targetFill(searchTarget, fighterId),
          abilityCheckFill(searchCheck, 18),
        ],
      }),
    );
    expect(found.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          conditions: expect.not.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(found.state.combatants.get(fighterId)?.hidden).toBeNull();
  });

  test("Hide rejects a duplicate ability-check fill from its discovered hole", () => {
    const state = fighterVsGoblinBattle({
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
      ]),
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };
    const act = findAct(state, subject);
    const check = abilityCheckFill(
      findHole(act.initialHoles, "abilityCheck"),
      18,
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [check, check],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Hide check was filled twice.",
    });
  });

  test("Hide is unavailable without the RAW obscured/cover and sight prerequisite", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };

    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("hidden attackers have Advantage and reveal when the attack roll is made", () => {
    const state = fighterVsGoblinBattle();
    const actor = state.combatants.get(fighterId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...actor,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };
    const target = attackInitialTargetHole(hiddenState);
    const roll = attackRollHoleAfterTarget(hiddenState, target);
    expect(roll).toMatchObject({ rollMode: "advantage" });

    const damageHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject: fighterAttackSubject(state),
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 20,
          naturalD20: 17,
          rollMode: "advantage",
        }),
      ],
    });
    expect(damageHoleResult).toMatchObject({
      tag: "needsHoles",
    });
    if (damageHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden attack damage holes.");
    }
    expect(damageHoleResult.state.combatants.get(fighterId)?.hidden).toBeNull();

    const missed = requireResolved(
      resolveBattleSubject({
        state: hiddenState,
        subject: fighterAttackSubject(state),
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
      ]),
    );
    expect(missed.state.combatants.get(fighterId)?.hidden).toBeNull();
  });

  test("hidden verbal spell attackers reveal through staged no-reaction spell-attack holes", () => {
    const session = wizardVsSkeletonBattle();
    const state = session.state;
    const wizard = state.combatants.get(wizardId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };
    const subject = findAct(session, magicSubject("ray_of_frost")).subject;
    const targetHole = requireHole(
      resolveBattleSubject({ state: hiddenState, subject, fills: [] }),
      "targetChoice",
    );
    const attackHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [targetFill(targetHole, skeletonId)],
    });

    expect(attackHoleResult).toMatchObject({
      tag: "needsHoles",
      holes: [expect.not.objectContaining({ rollMode: "advantage" })],
    });
    if (attackHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden spell attack holes.");
    }
    expect(attackHoleResult.state.combatants.get(wizardId)?.hidden).toBeNull();
    const attackHole = requireHole(attackHoleResult, "attackRoll");
    const damageHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(attackHole, { total: 20, naturalD20: 17 }),
      ],
    });
    expect(damageHoleResult).toMatchObject({
      tag: "needsHoles",
    });
    if (damageHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden spell damage holes.");
    }
    expect(damageHoleResult.state.combatants.get(wizardId)?.hidden).toBeNull();
  });

  test("readied verbal spells reveal hidden casters when the spell is cast into readiness", () => {
    const session = wizardVsSkeletonBattle();
    const state = session.state;
    const wizard = state.combatants.get(wizardId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };

    const readied = resolveBattleSubject({
      state: hiddenState,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({ ...session, state: hiddenState }),
          wizardId,
          cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });

    expect(readied).toMatchObject({
      tag: "resolved",
    });
    if (readied.tag !== "resolved") {
      throw new Error("Expected readied hidden spell to resolve.");
    }
    expect(readied.state.combatants.get(wizardId)?.hidden).toBeNull();
  });

  test("staged verbal spell damage keeps the caster revealed while requesting Concentration saves", () => {
    const session = wizardVsSkeletonBattle();
    const state = session.state;
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          hidden: { discoveryDc: difficultyClass(17) },
        })
        .set(skeletonId, {
          ...skeleton,
          concentration: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("mage_armor"),
            ),
            effectKind: "spellEffect",
          },
        }),
    };
    const subject = findAct(session, magicSubject("magic_missile")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: hiddenState, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: hiddenState,
        subject,
        fills: [
          spellTargetAllocationFill(target, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );

    const concentration = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [
        spellTargetAllocationFill(target, [{ targetId: skeletonId, count: 3 }]),
        damageRollFillWithGroups(damage, [[2, 2, 2]]),
      ],
    });

    expect(concentration).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
    });
    if (concentration.tag !== "needsHoles") {
      throw new Error("Expected hidden caster concentration holes.");
    }
    expect(concentration.state.combatants.get(wizardId)?.hidden).toBeNull();
  });

  test("Rogue Cunning Action exposes Dash, Disengage, and Hide as Bonus Actions", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rogue-cunning-action-hide"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "rogue", level: 2 },
            { className: "barbarian", level: 1 },
          ],
          d20Statistics: testCharacterD20Statistics({ str: 16, dex: 16 }),
          resources: [rageResource()],
          characterUnitRefs: [
            {
              unit: unitLibrary.requireUnit("rogue_cunning_action"),
              supportProfiles: [ROGUE_CUNNING_ACTION_SUPPORT_PROFILE],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "coverOutOfEnemyLineOfSight", cover: "total" }],
      ]),
    });
    const state = session.state;
    const cunningActs = discoverBattleActs(session).filter(
      (act) =>
        battleActUnitPresentation(act)?.unitId === "rogue_cunning_action",
    );
    const dashAct = cunningActs.find(
      (act) =>
        act.subject.tag === "bonusActionStandardAction" &&
        act.subject.action === "dash",
    );
    const disengageAct = cunningActs.find(
      (act) =>
        act.subject.tag === "bonusActionStandardAction" &&
        act.subject.action === "disengage",
    );
    const hideAct = cunningActs.find(
      (act) =>
        act.subject.tag === "bonusActionStandardAction" &&
        act.subject.action === "hide",
    );
    if (
      dashAct === undefined ||
      disengageAct === undefined ||
      hideAct === undefined
    )
      throw new Error("Expected Cunning Action acts.");
    if (dashAct.subject.tag !== "bonusActionStandardAction") {
      throw new Error("Expected a Bonus Action Dash subject.");
    }
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(state));
    const dashSubject = dashAct.subject;
    const unrelatedProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      "barbarian_rage",
    );
    expect(
      resolveReplayContinuationFromState(
        state,
        {
          kind: "replay",
          subject: {
            ...dashSubject,
            procedureRef: unrelatedProcedureRef,
          },
          fills: [],
        },
        "attackHit",
        [],
      ),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(dashAct.summary).toBe("Dash as a Bonus Action.");
    expect(disengageAct.summary).toBe("Disengage as a Bonus Action.");
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusActionStandardAction",
          actorId: dashSubject.actorId,
          procedureRef: dashSubject.procedureRef,
          action: "dash",
          speedKind: "fly",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message: "Dash speed kind is not represented for this combatant.",
    });

    const dashed = requireResolved(
      resolveBattleSubject({ state, subject: dashAct.subject, fills: [] }),
    );
    expect(dashed.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      dashMovementBonusFeet: 30,
    });

    const disengaged = requireResolved(
      resolveBattleSubject({ state, subject: disengageAct.subject, fills: [] }),
    );
    expect(disengaged.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      disengaged: true,
    });
    const noHidePrerequisiteSession = startBattleSessionRight({
      battleId: battleId("battle-rogue-cunning-action-no-hide-prerequisite"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 2 }],
          characterUnitRefs: [
            {
              unit: unitLibrary.requireUnit("rogue_cunning_action"),
              supportProfiles: [ROGUE_CUNNING_ACTION_SUPPORT_PROFILE],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const noHidePrerequisiteState = noHidePrerequisiteSession.state;
    expect(
      discoverBattleActs(noHidePrerequisiteSession).find(
        (act) =>
          act.subject.tag === "bonusActionStandardAction" &&
          act.subject.action === "dash",
      )?.summary,
    ).toBe("Dash as a Bonus Action.");
    expect(
      discoverBattleActs(noHidePrerequisiteSession).find(
        (act) =>
          act.subject.tag === "bonusActionStandardAction" &&
          act.subject.action === "disengage",
      )?.summary,
    ).toBe("Disengage as a Bonus Action.");
    expect(
      discoverBattleActs(noHidePrerequisiteSession).some(
        (act) =>
          act.subject.tag === "bonusActionStandardAction" &&
          act.subject.action === "hide" &&
          battleActUnitPresentation(act)?.unitId === "rogue_cunning_action",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: noHidePrerequisiteState,
        subject: hideAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideAct.subject,
        fills: [
          abilityCheckFill(findHole(hideAct.initialHoles, "abilityCheck"), 16),
        ],
      }),
    );
    expect(hidden.snapshot).toMatchObject({
      turn: { bonusActionAvailable: false },
      combatants: expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
      ]),
    });
    expect(hidden.state.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });
  });

  test("Rogue Cunning Action support comes from alternate action cost mechanics", () => {
    const unit = unitLibrary.requireUnit("rogue_cunning_action");

    expect(battleBonusActionStandardActionSupportForUnit(unit)).toEqual(
      ROGUE_CUNNING_ACTION_SUPPORT_PROFILE,
    );
    expect(battleUnitSupportProfilesForUnit({ unit })).toEqual(
      Either.right([ROGUE_CUNNING_ACTION_SUPPORT_PROFILE]),
    );
  });

  test("Escape Grapple rejects a stale subject when only an Extra Attack slot remains", () => {
    const grappled = fighterGrapplesGoblin(
      startBattleRight({
        battleId: battleId("battle-escape-grapple-extra-attack-slot"),
        combatants: [
          characterSeed({ initiative: 20 }),
          characterSeed({
            combatantId: goblinId,
            displayName: "Synthetic Extra Attacker",
            initiative: 10,
            classLevel: 5,
          }),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const extraAttackOnly: BattleState = {
      ...goblinTurn,
      currentTurnResources: {
        ...goblinTurn.currentTurnResources,
        actionResources: [
          {
            kind: "action",
            source: "classFeatureExtraAttack",
            sourceOwnerId: goblinId,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "escape-grapple-extra-attack",
            ),
            restriction: { kind: "none" },
          },
        ],
      },
    };
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };

    expect(
      discoverBattleActCandidates(extraAttackOnly).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: extraAttackOnly, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});
