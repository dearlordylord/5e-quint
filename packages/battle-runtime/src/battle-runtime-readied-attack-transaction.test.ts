import { unitId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
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
  battleFrontierInterruptDecisionForState,
  battleObjectId,
  characterBattleFeatureInitForTest,
  combatantId,
  findHole,
  reactionModifierChoice,
  reactionModifierUnitRef,
  testDaggerAttack,
  uncannyDodgeUnit,
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

/**
 * A Fighter readies a Dagger attack for when a level 5 Rogue moves, releases
 * it at the Rogue, and hits. The Rogue's Uncanny Dodge Reaction is offered on
 * the hit; `rogueAnswer` uses it or declines it. Returns the Hit Points the
 * Rogue loses to a damage roll of 4.
 */
function readiedDaggerHitOnUncannyDodgeRogue(
  rogueAnswer: "useUncannyDodge" | "decline",
): number {
  const rogueId = combatantId("readied-attack-rogue");
  let session = startBattleSessionRight({
    battleId: battleId("readied-attack-hit-reaction"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: testDaggerAttack(),
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_dagger"),
            unitId: unitId("weapon_dagger"),
            grip: "one_handed",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 15 }),
      characterSeed({
        combatantId: rogueId,
        displayName: "Rogue Target",
        initiative: 10,
        classLevels: [{ className: "rogue", level: 5 }],
        attack: null,
        unitFeatures: [
          characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
            { className: "rogue", level: classLevel(5) },
          ]),
        ],
        characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
      }),
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
    } else
      throw new Error(
        `Unexpected transaction result: ${
          "message" in result.resolution
            ? result.resolution.message
            : result.tag
        }`,
      );
    return result;
  };
  const subject = (value: BattleSubject, fills: readonly BattleFill[] = []) =>
    settle({ kind: "ordinarySubject", subject: value, fills });
  const frontier = (result: BattleRuntimeTransactionResult) => {
    if (result.tag !== "needsHoles")
      throw new Error("Expected pending transaction");
    return result.resolution.envelope.frontier;
  };
  const ready = { tag: "action", actorId: fighterId, action: "ready" } as const;
  const declarationFrontier = frontier(subject(ready));
  const declaration =
    declarationFrontier.kind === "holes"
      ? declarationFrontier.holes[0]
      : undefined;
  if (declaration?.kind !== "readyDeclaration")
    throw new Error("Expected Ready declaration");
  const response = declaration.responseChoices.find(
    (choice) => choice.kind === "attack",
  );
  if (response?.kind !== "attack") throw new Error("Expected attack response");
  subject(ready, [
    readyDeclarationFillForTest(declaration, "When the Rogue moves", response),
  ]);
  subject({ tag: "runtimeCommand", actorId: fighterId, command: "endTurn" });
  subject({ tag: "runtimeCommand", actorId: goblinId, command: "endTurn" });
  const trigger = frontier(
    subject({
      tag: "runtimeCommand",
      actorId: rogueId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    }),
  );
  if (trigger.kind !== "interruptDecision")
    throw new Error("Expected Ready trigger decision");
  const attackRoll = frontier(
    settle({
      kind: "interruptDecision",
      fill: interruptDecisionFill(trigger.decisionHole, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          targetId: rogueId,
          procedureRef: response.selection.procedureRef,
          fills: [
            {
              kind: "targetSpatialFacts",
              holeId: ATTACK_TARGET_HOLE_ID,
              spatialFacts: [
                attackTargetDistanceSpatialFact(
                  fighterId,
                  rogueId,
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
  if (attackRoll.kind !== "holes") throw new Error("Expected attack roll");
  const hit = frontier(
    subject(attackRoll.replaySubject, [
      attackRollFill(findHole(attackRoll.holes, "attackRoll"), {
        total: 20,
        naturalD20: 10,
      }),
    ]),
  );
  if (hit.kind !== "interruptDecision")
    throw new Error("Expected the attack-hit Reaction decision");
  const pendingDecision = battleFrontierInterruptDecisionForState(
    session.state,
  );
  if (pendingDecision === null)
    throw new Error("Expected a pending interrupt decision");
  const uncannyDodge = reactionModifierChoice(
    pendingDecision.choices,
    "rogue_uncanny_dodge",
    "attackDamageReduction",
  );
  const damage = frontier(
    settle({
      kind: "interruptDecision",
      fill: interruptDecisionFill(
        hit.decisionHole,
        rogueAnswer === "useUncannyDodge"
          ? {
              kind: "resolve",
              responderId: rogueId,
              choice: {
                kind: "reactionRollOrDamageReduction",
                procedureRef: uncannyDodge.modifier.procedureRef,
                modifierKind: "attackDamageReduction",
                fills: [],
              },
            }
          : { kind: "decline", responderId: rogueId },
      ),
    }),
  );
  if (damage.kind !== "holes") throw new Error("Expected damage roll");
  const hpBefore = session.state.combatants.get(rogueId)?.hp ?? 0;
  const finished = subject(damage.replaySubject, [
    damageRollFill(findHole(damage.holes, "rolledDice"), 4),
  ]);
  expect(finished.tag).toBe("settled");
  expect(session.state.readiedResponses.has(fighterId)).toBe(false);
  return hpBefore - (session.state.combatants.get(rogueId)?.hp ?? 0);
}

test("a readied attack resumes to its damage after a Reaction to its hit, used or declined", () => {
  const declinedDamage = readiedDaggerHitOnUncannyDodgeRogue("decline");
  const dodgedDamage = readiedDaggerHitOnUncannyDodgeRogue("useUncannyDodge");

  expect(declinedDamage).toBeGreaterThan(0);
  expect(dodgedDamage).toBe(Math.floor(declinedDamage / 2));
});
