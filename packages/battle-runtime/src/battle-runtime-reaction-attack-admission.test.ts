import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { expect, test } from "vitest";
import { resolveOpportunityAttackCommand } from "./battle-reducer/opportunity-attacks.ts";
import { HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID } from "./battle-reducer/domain-constants.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackTargetSpatialFact,
  battleFrontierInterruptDecisionForState,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  movementFeet,
  movementFill,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  targetFill,
  type BattleFill,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

function discoveredOpportunityAttack() {
  const state = requireResolved(
    endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
  ).state;
  const movementSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "move",
  };
  const movement = requireHole(
    resolveBattleSubject({ state, subject: movementSubject, fills: [] }),
    "movement",
  );
  const selection = attackExecutionSelectionForSubjectForTest(
    fighterAttackSubject(state),
  );
  const pending = resolveBattleSubject({
    state,
    subject: movementSubject,
    fills: [
      movementFill(movement, {
        distanceFeet: 5,
        provokedOpportunityAttacks: [
          { reactorId: fighterId, distanceFeet: movementFeet(5), ...selection },
        ],
      }),
    ],
  });
  if (pending.tag !== "needsHoles")
    throw new Error("Expected the movement's reaction window.");
  const choice = battleFrontierInterruptDecisionForState(
    pending.state,
  )?.choices.find(
    (candidate) =>
      candidate.kind === "nestedProcedure" &&
      candidate.subject.command === "opportunityAttack" &&
      candidate.subject.reactorId === fighterId,
  );
  if (
    choice?.kind !== "nestedProcedure" ||
    choice.subject.command !== "opportunityAttack"
  )
    throw new Error("Expected the discovered Opportunity Attack.");
  return { state: pending.state, subject: choice.subject, selection };
}

test.each(["contradictoryDistance", "foreignGraze"] as const)(
  "an admitted Opportunity Attack rejects %s without spending resources",
  (scenario) => {
    const admitted = discoveredOpportunityAttack();
    requireHole(
      resolveOpportunityAttackCommand({
        state: admitted.state,
        subject: admitted.subject,
        fills: [],
      }),
      "attackRoll",
    );
    const state = admitted.state;
    const fills: readonly BattleFill[] =
      scenario === "contradictoryDistance"
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: ATTACK_TARGET_HOLE_ID,
              spatialFacts: [
                attackTargetSpatialFact(
                  fighterId,
                  goblinId,
                  admitted.selection,
                  movementFeet(10),
                ),
              ],
            },
          ]
        : scenario === "foreignGraze"
          ? [
              {
                kind: "unitFeatureDecision",
                holeId: HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID,
                value: "use",
              },
            ]
          : [];
    const expected = {
      foreignGraze:
        "Opportunity Attack does not include a Horde Breaker attack.",
      contradictoryDistance:
        "Opportunity Attack target distance must match the reach-leaving trigger distance.",
    };
    expect(
      resolveOpportunityAttackCommand({
        state,
        subject: admitted.subject,
        fills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expected[scenario],
      snapshot: snapshotBattle(state),
    });
  },
);

test("an admitted readied attack requires its exact target distance before requesting a roll", () => {
  const initial = fighterVsGoblinBattle();
  const readySubject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "ready",
  };
  const declaration = requireHole(
    resolveBattleSubject({ state: initial, subject: readySubject, fills: [] }),
    "readyDeclaration",
  );
  const response = declaration.responseChoices.find(
    (candidate) => candidate.kind === "attack",
  );
  if (response?.kind !== "attack")
    throw new Error("Expected an offered readied Attack.");
  const ready = requireResolved(
    resolveBattleSubject({
      state: initial,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          declaration,
          "the target approaches",
          response,
        ),
      ],
    }),
  );
  const goblinTurn = requireResolved(
    endTurn({ state: ready.state, actorId: fighterId }),
  );
  const pending = resolveBattleSubject({
    state: goblinTurn.state,
    subject: {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    },
    fills: [],
  });
  if (pending.tag !== "needsHoles")
    throw new Error("Expected the reported Ready reaction window.");
  const choice = battleFrontierInterruptDecisionForState(
    pending.state,
  )?.choices.find(
    (candidate) =>
      candidate.kind === "nestedProcedure" &&
      candidate.subject.command === "releaseReadiedAttack" &&
      candidate.subject.targetId === goblinId,
  );
  if (
    choice?.kind !== "nestedProcedure" ||
    choice.subject.command !== "releaseReadiedAttack"
  )
    throw new Error("Expected the admitted readied Attack.");
  const state = pending.state;
  const spatial: BattleFill = {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetSpatialFact(
        fighterId,
        goblinId,
        response.selection,
        movementFeet(5),
      ),
    ],
  };
  requireHole(
    resolveOpportunityAttackCommand({
      state,
      subject: choice.subject,
      fills: [spatial],
    }),
    "attackRoll",
  );
  // With no input, the release asks for its fixed target's facts; a target
  // fill without the distance fact can't request a roll.
  const targetHole = requireHole(
    resolveOpportunityAttackCommand({
      state,
      subject: choice.subject,
      fills: [],
    }),
    "targetChoice",
  );
  expect(targetHole.choices).toEqual([goblinId]);
  expect(
    resolveOpportunityAttackCommand({
      state,
      subject: choice.subject,
      fills: [targetFill(targetHole, goblinId, [])],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Fixed-target reaction attacks require an exact attack target distance fact.",
    snapshot: snapshotBattle(state),
  });
});
