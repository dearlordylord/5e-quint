// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { describe, expect, test } from "vitest";
import { difficultyClass, type Condition } from "@dnd/shared/types";
import {
  battleId,
  characterSeed,
  discoverBattleActCandidates,
  fighterGrapplesGoblin,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  movementFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  type BattleState,
} from "./battle-runtime.test-support.ts";

const speedZeroConditions = [
  "grappled",
  "paralyzed",
  "petrified",
  "restrained",
] as const satisfies readonly Condition[];

// A battle starts Grappled only through an initial grapple, which names the
// grappler and escape DC; every other condition is an initial condition.
function battleWithCondition(condition: Condition): BattleState {
  return startBattleRight({
    battleId: battleId(`condition-speed-${condition}`),
    combatants: [
      characterSeed({
        initiative: 20,
        conditions: condition === "grappled" ? [] : [condition],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    ...(condition === "grappled"
      ? {
          initialGrapples: [
            {
              grapplerId: goblinId,
              targetId: fighterId,
              escapeDc: difficultyClass(13),
            },
          ],
        }
      : {}),
  });
}

function actorMovement(state: BattleState) {
  const actor = snapshotBattle(state).combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (actor === undefined) throw new Error("Expected the initialized actor.");
  return actor.movement;
}

function hasCommand(state: BattleState, command: "move" | "dropProne") {
  return discoverBattleActCandidates(state).some(
    ({ subject }) =>
      subject.tag === "runtimeCommand" &&
      subject.actorId === fighterId &&
      subject.command === command,
  );
}

describe("condition Speed projection", () => {
  test.each(speedZeroConditions)(
    "initial %s sets Speed 0 and blocks movement and Drop Prone",
    (condition) => {
      const state = battleWithCondition(condition);

      expect(actorMovement(state)).toMatchObject({
        speedFeet: 0,
        remainingFeet: 0,
      });
      expect(hasCommand(state, "move")).toBe(false);
      expect(hasCommand(state, "dropProne")).toBe(false);
      expect(
        resolveBattleSubject({
          state,
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "dropProne",
          },
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
      const subject = {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "move",
      } as const;
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
              distanceFeet: 1,
              provokedOpportunityAttacks: [],
            }),
          ],
        }),
      ).toMatchObject({ tag: "invalid" });
      if (condition === "grappled") {
        expect(state.grapples).toEqual([
          expect.objectContaining({
            grapplerId: goblinId,
            targetId: fighterId,
          }),
        ]);
      }
    },
  );

  test.each(["stunned", "incapacitated"] as const)(
    "%s preserves Speed, movement and costless Drop Prone",
    (condition) => {
      const state = battleWithCondition(condition);
      expect(actorMovement(state)).toMatchObject({
        speedFeet: 30,
        remainingFeet: 30,
      });
      expect(hasCommand(state, "move")).toBe(true);
      expect(hasCommand(state, "dropProne")).toBe(true);

      const subject = {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "move",
      } as const;
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
              distanceFeet: 30,
              provokedOpportunityAttacks: [],
            }),
          ],
        }),
      );
      expect(actorMovement(moved.state)).toMatchObject({
        speedFeet: 30,
        spentFeet: 30,
        remainingFeet: 0,
      });
      expect(hasCommand(moved.state, "dropProne")).toBe(true);

      const dropped = requireResolved(
        resolveBattleSubject({
          state: moved.state,
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "dropProne",
          },
          fills: [],
        }),
      );
      expect(dropped.snapshot.combatants).toContainEqual(
        expect.objectContaining({
          combatantId: fighterId,
          conditions: expect.arrayContaining([
            condition,
            "incapacitated",
            "prone",
          ]),
        }),
      );
      expect(actorMovement(dropped.state)).toEqual(actorMovement(moved.state));
      expect(dropped.state.currentTurnResources).toEqual(
        moved.state.currentTurnResources,
      );
    },
  );

  test("releasing a procedure-applied grapple restores the target's Speed", () => {
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle());
    expect(grappled.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: goblinId,
        movement: expect.objectContaining({ speedFeet: 0 }),
      }),
    );

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
    expect(released.state.grapples).toEqual([]);
    expect(released.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: goblinId,
        conditions: expect.not.arrayContaining(["grappled"]),
        movement: expect.objectContaining({ speedFeet: 30 }),
      }),
    );
  });
});
