import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";
import { expect, test } from "vitest";
import {
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  battleId,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  fighterId,
  goblinId,
  readyDeclarationFillForTest,
  attackTargetDistanceSpatialFact,
  movementFeet,
  attackRollFill,
  damageRollFill,
  interruptDecisionFill,
} from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleFill } from "./battle-state-execution.ts";

test("readied attack transaction retains spatial evidence exactly once across attack and damage", () => {
  let session = startBattleSessionRight({
    battleId: battleId("readied-attack-transaction"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  let transaction: Parameters<
    typeof settleBattleRuntimeTransaction
  >[0]["transaction"] = null;
  const settle = (
    operation: Parameters<
      typeof settleBattleRuntimeTransaction
    >[0]["operation"],
  ) => {
    const result = settleBattleRuntimeTransaction({
      session,
      transaction,
      operation,
    });
    if (result.tag === "needsHoles") {
      session = result.resolution.session;
      transaction = result.transaction;
    } else if (result.tag === "settled") {
      session = result.session;
      transaction = null;
    } else throw new Error(`Unexpected transaction result: ${result.tag}`);
    return result;
  };
  const subject = (value: BattleSubject, fills: readonly BattleFill[] = []) =>
    settle({ kind: "ordinarySubject", subject: value, fills });
  const pending = (result: BattleRuntimeTransactionResult) => {
    if (result.tag !== "needsHoles")
      throw new Error("Expected pending transaction");
    return result;
  };
  const ready = { tag: "action", actorId: fighterId, action: "ready" } as const;
  const started = pending(subject(ready));
  const frontier = started.resolution.envelope.frontier;
  if (
    frontier.kind !== "holes" ||
    frontier.holes[0]?.kind !== "readyDeclaration"
  )
    throw new Error("Expected Ready declaration");
  const declaration = frontier.holes[0];
  const response = declaration.responseChoices.find(
    (choice) => choice.kind === "attack",
  );
  if (response?.kind !== "attack") throw new Error("Expected attack response");
  subject(ready, [
    readyDeclarationFillForTest(
      declaration,
      "When the opponent approaches",
      response,
    ),
  ]);
  subject({ tag: "runtimeCommand", actorId: fighterId, command: "endTurn" });
  const reported = pending(
    subject({
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    }),
  );
  const decision = reported.resolution.envelope.frontier;
  if (decision.kind !== "interruptDecision")
    throw new Error("Expected interrupt decision");
  const released = pending(
    settle({
      kind: "interruptDecision",
      fill: interruptDecisionFill(decision.decisionHole, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          targetId: goblinId,
          procedureRef: response.selection.procedureRef,
          fills: [
            {
              kind: "targetSpatialFacts",
              holeId: ATTACK_TARGET_HOLE_ID,
              spatialFacts: [
                attackTargetDistanceSpatialFact(
                  fighterId,
                  goblinId,
                  response.selection,
                  movementFeet(5),
                ),
              ],
            },
          ],
        },
      }),
    }),
  );
  const attackFrontier = released.resolution.envelope.frontier;
  if (
    attackFrontier.kind !== "holes" ||
    attackFrontier.holes[0]?.kind !== "attackRoll"
  )
    throw new Error("Expected attack roll");
  const spatial = (distance: number): BattleFill => ({
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        response.selection,
        movementFeet(distance),
      ),
    ],
  });
  const observedRoll = attackRollFill(attackFrontier.holes[0], {
    total: 30,
    naturalD20: 15,
  });
  // Direct owner callers must not replace an admitted distance. Transaction
  // replay supplies the exact retained fill; both paths share native validation.
  const conflict = resolveBattleRuntimeSubject({
    session,
    subject: attackFrontier.replaySubject,
    fills: [spatial(10), observedRoll],
  });
  expect(conflict.tag).toBe("invalid");
  const duplicate = resolveBattleRuntimeSubject({
    session,
    subject: attackFrontier.replaySubject,
    fills: [spatial(5), spatial(5), observedRoll],
  });
  expect(duplicate.tag).toBe("invalid");
  const exactReplay = resolveBattleRuntimeSubject({
    session,
    subject: attackFrontier.replaySubject,
    fills: [spatial(5), observedRoll],
  });
  expect(exactReplay.tag).toBe("needsHoles");
  const hit = pending(
    subject(attackFrontier.replaySubject, [
      attackRollFill(attackFrontier.holes[0], { total: 30, naturalD20: 15 }),
    ]),
  );
  const damageFrontier = hit.resolution.envelope.frontier;
  if (
    damageFrontier.kind !== "holes" ||
    damageFrontier.holes[0]?.kind !== "rolledDice"
  )
    throw new Error("Expected damage");
  const finished = subject(damageFrontier.replaySubject, [
    damageRollFill(damageFrontier.holes[0], 1),
  ]);
  expect(finished.tag).toBe("settled");
  expect(session.state.combatants.get(fighterId)?.reactionAvailable).toBe(
    false,
  );
  expect(session.state.readiedResponses.has(fighterId)).toBe(false);
});
