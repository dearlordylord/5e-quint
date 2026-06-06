import {
  startBattleRight,
  testBattleCreatureStateWithConditions,
  requireResolved,
  hidePrerequisites,
  fighterVsGoblinBattle,
  fighterGrapplesGoblin,
  fighterAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  requireHole,
  findHole,
  findAct,
  targetFill,
  spellTargetAllocationFill,
  abilityCheckFill,
  attackRollFill,
  interruptDecisionFill,
  movementFill,
  castGroundHazardForMovementTest,
  grappleOutcomeFill,
  shoveOutcomeFill,
  damageRollFillWithGroups,
  characterSeed,
  statBlockCreatureInit,
  statBlockRecord,
  skeletonCreatureInit,
  wizardVsSkeletonBattle,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  ROGUE_CUNNING_ACTION_SUPPORT_PROFILE,
  testCharacterD20Statistics,
  testUnarmedStrikeDamageAttack,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  unitLibrary,
  applyCondition,
  battleBonusActionStandardActionSupportForUnit,
  battleAreaId,
  battleId,
  BattleSubjectSchema,
  battleUnitSupportProfilesForUnit,
  cantripSpellInvocationRef,
  combatantId,
  difficultyClass,
  discoverBattleActs,
  Either,
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  Schema,
  snapshotBattle,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";
import { abilityModifier } from "@dnd/shared/types";
import {
  grappleDragCostExempt,
  targetIsNoMoreThanOneSizeLarger,
} from "./battle-reducer/movement-speed.ts";

describe("battle runtime: movement, Grapple, and Hide", () => {
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

    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "ready",
          readyTrigger: "attackHit",
        },
        fills: [],
      }),
    );
    expect(readied.snapshot.readiedResponses.movements).toEqual([
      expect.objectContaining({
        actorId: fighterId,
        trigger: "attackHit",
      }),
    ]);
  });

  test("Ready subjects require an explicit Reaction trigger", () => {
    const decoded = Schema.decodeUnknownEither(BattleSubjectSchema)({
      tag: "action",
      actorId: fighterId,
      action: "ready",
    });

    expect(Either.isLeft(decoded)).toBe(true);
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

  test("Grease Difficult Terrain facts add extra Movement cost without storing geometry", () => {
    const areaId = battleAreaId("test-grease-area");
    const greased = castGroundHazardForMovementTest(areaId);
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
          sourceSpellId: spellRecord("grease").id,
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

    const moved = requireResolved(
      resolveBattleSubject({
        state: greased,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain,
          }),
        ],
      }),
    ).state;

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
                  sourceSpellId: spellRecord("grease").id,
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

  test("Ready holds executable Reaction movement until its trigger", () => {
    const state = fighterVsGoblinBattle();
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "ready",
          readyTrigger: "attackHit",
        },
        fills: [],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: readied, actorId: fighterId }),
    ).state;
    expect(discoverBattleActs(goblinTurn)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            command: "releaseReadiedMovement",
          }),
        }),
      ]),
    );
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
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: attackSubject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: goblinTurn,
      subject: attackSubject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(roll, { total: 20, naturalD20: 12 }),
      ],
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
    const readiedMovementHole = readiedChoice.initialHoles[0];
    if (readiedMovementHole === undefined) {
      throw new Error("Expected readied movement Reaction movement hole.");
    }
    const readiedMove = movementFill(readiedMovementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
    });

    const decision = requireHole(awaitingReaction, "interruptDecision");
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

    expect(released.state.readiedMovements.has(fighterId)).toBe(false);
    expect(released.state.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
      movementSpentFeet: movementFeet(5),
    });
  });

  test("Help attack grants and consumes Advantage for the selected ally and target", () => {
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
      "targetChoice",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(ally, wizardId)],
      }),
      "targetChoice",
    );
    const helped = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(ally, wizardId), targetFill(target, goblinId)],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({
        state: requireResolved(endTurn({ state: helped, actorId: fighterId }))
          .state,
        actorId: goblinId,
      }),
    ).state;
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: wizardId,
      action: "attack",
      attackName: "Longsword",
    };
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
    const state = fighterVsGoblinBattle();
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
    const stood = requireResolved(
      resolveBattleSubject({
        state: proneState,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "standFromProne",
        },
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
    const acts = discoverBattleActs(
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
            id: "stat_block_unequal_speed_climber",
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
        targetExemptFromDragCost: false,
      }),
    ]);
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
              itemId: "shield:equipment_shield",
              unitId: "equipment_shield",
            },
            weapon: {
              itemId: "main:weapon_longsword",
              unitId: "weapon_longsword",
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
            id: "stat_block_huge_grapple_target",
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

  test("Grapple size helpers match size limit and drag-cost exceptions", () => {
    expect(targetIsNoMoreThanOneSizeLarger("medium", "large")).toBe(true);
    expect(targetIsNoMoreThanOneSizeLarger("medium", "huge")).toBe(false);
    expect(grappleDragCostExempt("medium", "medium")).toBe(false);
    expect(grappleDragCostExempt("large", "tiny")).toBe(true);
    expect(grappleDragCostExempt("huge", "medium")).toBe(true);
  });

  test("Shove resolves the Unarmed Strike save and prone failure effect", () => {
    const state = fighterVsGoblinBattle();
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
      discoverBattleActs(goblinTurn).map((act) => act.subject),
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
  });

  test("grapple drag movement accepts table-supplied Movement cost", () => {
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle());
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: grappled.state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 1,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 2,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
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
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
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

    expect(hiddenRoll).not.toHaveProperty("rollMode");
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
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
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
    const state = startBattleRight({
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
    const spellSubject = magicSubject("ray_of_frost");
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
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideSubject,
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

  test("Hide is unavailable without the RAW obscured/cover and sight prerequisite", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };

    expect(
      discoverBattleActs(state).map((act) => act.subject),
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
      subject: fighterAttackSubject(),
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
        subject: fighterAttackSubject(),
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
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };
    const subject = magicSubject("ray_of_frost");
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
    const state = wizardVsSkeletonBattle();
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
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
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
    const state = wizardVsSkeletonBattle();
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
            sourceSpellId: "mage_armor",
            effectKind: "spellEffect",
          },
        }),
    };
    const subject = magicSubject("magic_missile");
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
    const state = startBattleRight({
      battleId: battleId("battle-rogue-cunning-action-hide"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 1 }],
          characterUnitRefs: [
            {
              unitId: "rogue_cunning_action",
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
    const dashSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "dash",
      speedKind: "walk",
    };
    const disengageSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "disengage",
    };
    const hideSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "hide",
    };
    expect(findAct(state, dashSubject).summary).toBe("Dash as a Bonus Action.");
    expect(findAct(state, disengageSubject).summary).toBe(
      "Disengage as a Bonus Action.",
    );
    const hideAct = findAct(state, hideSubject);

    const dashed = requireResolved(
      resolveBattleSubject({ state, subject: dashSubject, fills: [] }),
    );
    expect(dashed.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      dashMovementBonusFeet: 30,
    });

    const disengaged = requireResolved(
      resolveBattleSubject({ state, subject: disengageSubject, fills: [] }),
    );
    expect(disengaged.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      disengaged: true,
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...dashSubject,
          sourceUnitId: "class_rogue",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
    const noHidePrerequisiteState = startBattleRight({
      battleId: battleId("battle-rogue-cunning-action-no-hide-prerequisite"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 1 }],
          characterUnitRefs: [
            {
              unitId: "rogue_cunning_action",
              supportProfiles: [ROGUE_CUNNING_ACTION_SUPPORT_PROFILE],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(findAct(noHidePrerequisiteState, dashSubject).summary).toBe(
      "Dash as a Bonus Action.",
    );
    expect(findAct(noHidePrerequisiteState, disengageSubject).summary).toBe(
      "Disengage as a Bonus Action.",
    );
    expect(
      discoverBattleActs(noHidePrerequisiteState).some(
        (act) => JSON.stringify(act.subject) === JSON.stringify(hideSubject),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: noHidePrerequisiteState,
        subject: hideSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideSubject,
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
});
