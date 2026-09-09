import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Hp, Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
} from "../battle-runtime.test-support.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleState,
} from "../battle-state-execution.ts";
import { resolveEndTurnCommand } from "./turn-boundary-lifecycle.ts";

describe("turn-boundary lifecycle SR-04G coverage", () => {
  test("orders simultaneous start-turn temporary hit point grants", () => {
    const state = fighterVsGoblinBattle();
    const goblin = state.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected the Goblin combatant.");
    }
    const withExistingTemporaryHitPoints: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblin,
        tempHp: Hp(7),
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: withExistingTemporaryHitPoints,
      occurrences: [3, 5].map((amount, index) => ({
        kind: "activeEffect" as const,
        ownerId: goblinId,
        effect: {
          kind: "turnStartTemporaryHitPoints" as const,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            `sr04g-turn-start-temporary-hit-points-${index}`,
          ),
          sourceCombatantId: fighterId,
          amount,
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      })),
    });
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: fighterId,
      command: "endTurn" as const,
    };

    const orderFrontier = resolveEndTurnCommand({
      state: allocated.state,
      subject,
      fills: [],
    });
    expect(orderFrontier.tag).toBe("needsHoles");
    if (orderFrontier.tag !== "needsHoles") return;
    const orderHole = orderFrontier.holes.find(
      (hole) => hole.kind === "startTurnOccurrenceOrder",
    );
    if (orderHole === undefined) {
      throw new Error("Expected the simultaneous start-turn order hole.");
    }
    expect(orderHole.actorId).toBe(goblinId);
    expect(orderHole.occurrences).toHaveLength(2);
    const [first, second] = orderHole.occurrences;
    if (first === undefined || second === undefined) {
      throw new Error("Expected two start-turn occurrences.");
    }

    const choiceFrontier = resolveEndTurnCommand({
      state: allocated.state,
      subject,
      fills: [
        {
          kind: "startTurnOccurrenceOrder",
          holeId: orderHole.holeId,
          value: {
            occurrenceIds: [second.occurrenceId, first.occurrenceId],
          },
        },
      ],
    });
    expect(choiceFrontier.tag).toBe("needsHoles");
    if (choiceFrontier.tag !== "needsHoles") return;
    const choiceHole = choiceFrontier.holes.find(
      (hole) => hole.kind === "temporaryHitPointChoice",
    );
    expect(choiceHole).toMatchObject({
      kind: "temporaryHitPointChoice",
      sourceCombatantId: fighterId,
      sourceTurn: { actorId: goblinId, round: Round(1) },
      existingTemporaryHitPoints: Hp(7),
      grantedTemporaryHitPoints: Hp(5),
    });
  });

  test("expires actor-bound ongoing features and applies the next-turn restriction", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected the Fighter and Goblin combatants.");
    }
    const currentRound = state.initiative.round;
    const expiresAtEndOfFighterTurn = battleProcedureExecutionRefForTest(
      "sr04g-end-of-turn-expiry",
    );
    const retainedForLaterRound = battleProcedureExecutionRefForTest(
      "sr04g-retained-later-round",
    );
    const expiresAtStartOfGoblinTurn = battleProcedureExecutionRefForTest(
      "sr04g-start-of-turn-expiry",
    );
    const stateWithOngoingFeatures: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          activeOngoingFeatureOccurrences: new Map<
            typeof expiresAtEndOfFighterTurn,
            ActiveOngoingFeatureOccurrence
          >([
            [
              expiresAtEndOfFighterTurn,
              {
                kind: "fixedDuration",
                expiresAt: {
                  kind: "endOfTurn",
                  combatantId: fighterId,
                  round: currentRound,
                },
              },
            ],
            [
              retainedForLaterRound,
              {
                kind: "fixedDuration",
                expiresAt: {
                  kind: "endOfTurn",
                  combatantId: fighterId,
                  round: Round(Number(currentRound) + 1),
                },
              },
            ],
          ]),
        })
        .set(goblinId, {
          ...goblin,
          activeOngoingFeatureOccurrences: new Map<
            typeof expiresAtStartOfGoblinTurn,
            ActiveOngoingFeatureOccurrence
          >([
            [
              expiresAtStartOfGoblinTurn,
              {
                kind: "turnBoundary",
                expiresAt: { kind: "startOfTurn", combatantId: goblinId },
              },
            ],
          ]),
        }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: stateWithOngoingFeatures,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: goblinId,
          effect: {
            kind: "unitFeatureCondition",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "sr04g-move-action-or-bonus-action-restriction",
            ),
            sourceCombatantId: fighterId,
            condition: "frightened",
            conditionHadNonSpellSource: false,
            earlyEnd: null,
            turnRestriction: { kind: "moveActionOrBonusAction" },
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(2),
            },
          },
        },
      ],
    });

    const result = resolveEndTurnCommand({
      state: allocated.state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    expect(
      result.state.combatants
        .get(fighterId)
        ?.activeOngoingFeatureOccurrences.has(expiresAtEndOfFighterTurn),
    ).toBe(false);
    expect(
      result.state.combatants
        .get(fighterId)
        ?.activeOngoingFeatureOccurrences.has(retainedForLaterRound),
    ).toBe(true);
    expect(
      result.state.combatants
        .get(goblinId)
        ?.activeOngoingFeatureOccurrences.has(expiresAtStartOfGoblinTurn),
    ).toBe(false);
    expect(result.state.currentTurnResources).toMatchObject({
      movementActionBonusActionExclusion: {
        kind: "restricted",
        choice: "notChosen",
      },
    });
  });
});
