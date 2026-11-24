// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-MULTIATTACK-001
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.MULTIATTACK
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.multiattack
import { decodeStatBlockRecordSync } from "@dnd/surface/surface/schema";
import { expect, test } from "vitest";

import { discoverBattleActCandidates } from "./index.ts";

import brownBearInput from "../../surface/content/stat_block_brown_bear.json";
import {
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetSpatialFact,
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  movementFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

function dropProneSubject(state: BattleState) {
  const subject = discoverBattleActCandidates(state).find(
    ({ subject }) =>
      subject.tag === "runtimeCommand" && subject.command === "dropProne",
  )?.subject;
  if (subject?.tag !== "runtimeCommand" || subject.command !== "dropProne") {
    throw new Error("Expected Drop Prone for the living Brown Bear.");
  }
  return subject;
}

function resolveMiss(state: BattleState): BattleState {
  const subject = discoverBattleActCandidates(state).find(
    ({ subject }) => subject.tag === "action" && subject.action === "attack",
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "attack") {
    throw new Error("Expected a pending Brown Bear Multiattack attack.");
  }
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const choice = targetFill(target, fighterId, [
    attackTargetSpatialFact(
      goblinId,
      fighterId,
      attackExecutionSelectionForSubjectForTest(subject),
    ),
  ]);
  const roll = requireHole(
    resolveBattleSubject({ state, subject, fills: [choice] }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [choice, attackRollFill(roll, { total: 6, naturalD20: 1 })],
    }),
  ).state;
}

function expectFreeDrop(
  state: BattleState,
  subject: BattleSubject,
): BattleState {
  const before = snapshotBattle(state);
  const dropped = requireResolved(
    resolveBattleSubject({ state, subject, fills: [] }),
  );
  const after = snapshotBattle(dropped.state);
  const beforeActor = before.combatants.find(
    (actor) => actor.combatantId === goblinId,
  );
  const afterActor = after.combatants.find(
    (actor) => actor.combatantId === goblinId,
  );
  expect(beforeActor?.movement.speedFeet).toBe(40);
  expect(afterActor?.conditions).toContain("prone");
  expect(afterActor?.movement).toEqual(beforeActor?.movement);
  expect(dropped.state.currentTurnResources).toEqual(
    state.currentTurnResources,
  );
  expect(after.currentActorId).toBe(before.currentActorId);
  expect(
    discoverBattleActCandidates(dropped.state).some(
      ({ subject }) =>
        subject.tag === "runtimeCommand" && subject.command === "dropProne",
    ),
  ).toBe(false);
  return dropped.state;
}

function move(state: BattleState, distanceFeet: number): BattleState {
  const subject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "move",
  } as const;
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          distanceFeet,
          provokedOpportunityAttacks: [],
        }),
      ],
    }),
  ).state;
}

test("Prone transitions preserve Multiattack dispatches before, between, and after completed attacks", () => {
  const initial = startBattleRight({
    battleId: battleId("multiattack-drop-prone"),
    combatants: [
      statBlockCreatureInit({
        initiative: 20,
        statBlock: decodeStatBlockRecordSync(brownBearInput),
      }),
      characterSeed({ initiative: 10 }),
    ],
  });
  const heldDrop = dropProneSubject(initial);
  expectFreeDrop(initial, heldDrop);

  const multiattack = discoverBattleActCandidates(initial).find(
    ({ subject }) =>
      subject.tag === "action" && subject.action === "multiattack",
  )?.subject;
  if (multiattack?.tag !== "action" || multiattack.action !== "multiattack") {
    throw new Error("Expected the Brown Bear's Multiattack.");
  }
  const activated = requireResolved(
    resolveBattleSubject({ state: initial, subject: multiattack, fills: [] }),
  ).state;
  const between = resolveMiss(activated);
  const dropped = expectFreeDrop(between, dropProneSubject(between));
  expectFreeDrop(between, heldDrop);
  const stand = discoverBattleActCandidates(dropped).find(
    ({ subject }) =>
      subject.tag === "runtimeCommand" && subject.command === "standFromProne",
  )?.subject;
  if (stand?.tag !== "runtimeCommand" || stand.command !== "standFromProne") {
    throw new Error("Expected Stand from Prone between completed attacks.");
  }
  const stood = requireResolved(
    resolveBattleSubject({ state: dropped, subject: stand, fills: [] }),
  ).state;
  const stoodActor = snapshotBattle(stood).combatants.find(
    (actor) => actor.combatantId === goblinId,
  );
  expect(stoodActor?.conditions).not.toContain("prone");
  expect(stoodActor?.movement.spentFeet).toBe(20);
  expect(stood.currentTurnResources.actionResources).toEqual(
    between.currentTurnResources.actionResources,
  );
  expect(stood.currentTurnResources.currentHasBonusAction).toBe(
    between.currentTurnResources.currentHasBonusAction,
  );
  expect(stood.currentTurnResources.actionTakenThisTurn).toBe(
    between.currentTurnResources.actionTakenThisTurn,
  );
  const insufficientMovement = move(between, 25);
  const proneWithInsufficientMovement = expectFreeDrop(
    insufficientMovement,
    heldDrop,
  );
  expect(
    discoverBattleActCandidates(proneWithInsufficientMovement).some(
      ({ subject }) =>
        subject.tag === "runtimeCommand" &&
        subject.command === "standFromProne",
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: proneWithInsufficientMovement,
      subject: stand,
      fills: [],
    }).tag,
  ).toBe("invalid");
  const betweenActs = discoverBattleActCandidates(between);
  expect(
    betweenActs.some(
      ({ subject }) => subject.tag === "action" && subject.action === "dash",
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: between,
      subject: {
        tag: "action",
        actorId: goblinId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    }).tag,
  ).toBe("invalid");
  const after = resolveMiss(stood);
  expectFreeDrop(after, dropProneSubject(after));
});
