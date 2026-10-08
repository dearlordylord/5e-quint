// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-initiative-roll-mode unit-feature.ongoing-feature-activation-movement-rider
import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { movementFeet } from "@dnd/shared/types";
import {
  battleId,
  characterSeed,
  combatantId,
  skeletonId,
  skeletonCreatureInit,
  rageResource,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  startBattleSessionRight,
  supportedBattleUnitRef,
  unitLibrary,
  unitFeatureDecisionFill,
  movementFill,
  endTurn,
  type BattleFill,
  type BattleState,
} from "./battle-runtime.test-support.ts";
import {
  resolveBattleSubject,
  opportunityAttackExecutionCandidates,
  snapshotBattle,
  requiredInitiativeRollModeForCombatant,
} from "./index.ts";

const actorId = combatantId("activation-character");

function activationFixture(selected = true) {
  const unitIds = selected
    ? [
        "barbarian_fast_movement",
        "barbarian_feral_instinct",
        "barbarian_instinctive_pounce",
      ]
    : ["barbarian_fast_movement"];
  const session = startBattleSessionRight({
    battleId: battleId("ongoing-activation-movement"),
    combatants: [
      characterSeed({
        combatantId: actorId,
        displayName: "Synthetic Barbarian",
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 7 }],
        resources: [rageResource()],
        characterUnitRefs: unitIds.map((id) =>
          supportedBattleUnitRef(unitLibrary.requireUnit(id)),
        ),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = {
    tag: "unitFeature" as const,
    actorId,
    procedureRef: requireCharacterUnitProcedureRefForTest(
      session,
      actorId,
      "barbarian_rage",
    ),
  };
  return { state: session.state, subject };
}
function movementFixture() {
  const fixture = activationFixture();
  const decision = unitFeatureDecisionFill(
    requireHole(
      resolveBattleSubject({ ...fixture, fills: [] }),
      "unitFeatureDecision",
    ),
    "use",
  );
  const movement = requireHole(
    resolveBattleSubject({ ...fixture, fills: [decision] }),
    "movement",
  );
  return { ...fixture, decision, movement };
}
function rejectAtomically(
  fixture: ReturnType<typeof activationFixture>,
  fills: readonly BattleFill[],
) {
  const result = resolveBattleSubject({ ...fixture, fills });
  expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  expect(result.snapshot).toEqual(snapshotBattle(fixture.state));
}
function nextActorTurn(state: BattleState) {
  const opponent = requireResolved(endTurn({ state, actorId })).state;
  return requireResolved(endTurn({ state: opponent, actorId: skeletonId }))
    .state;
}

describe("ongoing feature activation movement commands", () => {
  test("selected Initiative and movement support use acquired feature facts", () => {
    const fixture = movementFixture();
    expect(requiredInitiativeRollModeForCombatant(fixture.state, actorId)).toBe(
      "advantage",
    );
    expect(fixture.movement.movementBudgetFeet).toBe(20);
    const resolved = requireResolved(
      resolveBattleSubject({
        ...fixture,
        fills: [
          fixture.decision,
          movementFill(fixture.movement, {
            movementCostFeet: 20,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    );
    expect(resolved.movements).toMatchObject([
      { movementCostFeet: 20, spendsTurnMovement: false },
    ]);
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.combatants.get(actorId)?.movementSpentFeet).toBe(0);
    expect(
      resolved.state.combatants.get(actorId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(1);
  });
  test("declining enters the feature and extending it does not offer movement", () => {
    const fixture = movementFixture();
    const entered = requireResolved(
      resolveBattleSubject({
        ...fixture,
        fills: [{ ...fixture.decision, value: "decline" }],
      }),
    );
    const state = nextActorTurn(entered.state);
    const extended = requireResolved(
      resolveBattleSubject({ state, subject: fixture.subject, fills: [] }),
    );
    expect(extended.movements).toBeUndefined();
    rejectAtomically({ state, subject: fixture.subject }, [fixture.decision]);
  });
  test("an unselected rider does not alter activation and rejects attached movement", () => {
    const fixture = activationFixture(false);
    expect(
      requiredInitiativeRollModeForCombatant(fixture.state, actorId),
    ).toBeUndefined();
    expect(resolveBattleSubject({ ...fixture, fills: [] }).tag).toBe(
      "resolved",
    );
    const selected = movementFixture();
    rejectAtomically(fixture, [selected.decision]);
  });
  test("choice and movement protocol failures preserve the pre-activation state", () => {
    const fixture = movementFixture();
    const move = movementFill(fixture.movement, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
    });
    const effect = { ...fixture.decision, holeId: holeId("unexpected-effect") };
    const cases: readonly (readonly BattleFill[])[] = [
      [move],
      [effect],
      [fixture.decision, fixture.decision],
      [{ ...move, holeId: fixture.decision.holeId }],
      [
        fixture.decision,
        { ...fixture.decision, holeId: fixture.movement.holeId },
      ],
      [{ ...fixture.decision, value: "decline" }, move],
      [fixture.decision, move, move],
      [fixture.decision, effect],
      [
        fixture.decision,
        movementFill(fixture.movement, {
          movementCostFeet: 21,
          provokedOpportunityAttacks: [],
        }),
      ],
      [
        fixture.decision,
        { ...move, value: { ...move.value, speedKind: "fly" } },
      ],
      [fixture.decision, move, effect],
    ];
    for (const fills of cases) rejectAtomically(fixture, fills);
  });
  test("restrained current Speed prevents movement while allowing decline", () => {
    const fixture = movementFixture();
    const actor = fixture.state.combatants.get(actorId);
    if (actor === undefined || actor.positiveHpUnconscious !== null)
      throw Error("Expected conscious actor");
    const state = {
      ...fixture.state,
      combatants: new Map(fixture.state.combatants).set(actorId, {
        ...actor,
        conditions: { ...actor.conditions, restrained: true },
      }),
    };
    rejectAtomically({ state, subject: fixture.subject }, [fixture.decision]);
    expect(
      resolveBattleSubject({
        state,
        subject: fixture.subject,
        fills: [{ ...fixture.decision, value: "decline" }],
      }).tag,
    ).toBe("resolved");
  });
  test("ordinary Opportunity Attacks interrupt committed activation movement", () => {
    const fixture = movementFixture();
    const attack = opportunityAttackExecutionCandidates(
      fixture.state,
      skeletonId,
      actorId,
    )[0];
    if (attack === undefined) throw Error("Expected melee reaction");
    const move = movementFill(fixture.movement, {
      movementCostFeet: 10,
      provokedOpportunityAttacks: [
        {
          reactorId: skeletonId,
          distanceFeet: movementFeet(5),
          ...attack.selection,
        },
      ],
    });
    rejectAtomically(fixture, [
      fixture.decision,
      move,
      { ...fixture.decision, holeId: holeId("unexpected-effect") },
    ]);
    const interrupted = resolveBattleSubject({
      ...fixture,
      fills: [fixture.decision, move],
    });
    if (
      interrupted.tag !== "needsHoles" ||
      interrupted.frontier.kind !== "interruptDecision"
    )
      throw Error("Expected Opportunity Attack frontier");
    expect(interrupted.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    const resumed = requireResolved(
      resolveBattleInterrupt({
        state: interrupted.state,
        fill: {
          kind: "interruptDecision",
          holeId: interrupted.frontier.decisionHole.holeId,
          value: { kind: "decline", responderId: skeletonId },
        },
      }),
    );
    expect(resumed.movements).toMatchObject([
      { movementCostFeet: 10, spendsTurnMovement: false },
    ]);
    expect(
      resumed.state.combatants.get(actorId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(1);
  });
});
