// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { Hp } from "@dnd/shared/types";
import { statBlockId } from "@dnd/shared/game-facts";
import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { describe, expect, test } from "vitest";

import {
  battleId,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  characterSeed,
  discoverBattleActCandidates,
  fighterId,
  goblinId,
  movementFeet,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  type BattleState,
} from "./battle-runtime.test-support.ts";
import type { CombatantId } from "./identity.ts";

const dropProneSubject = (actorId: CombatantId) =>
  ({ tag: "runtimeCommand", actorId, command: "dropProne" }) as const;

function expectDropProneRejected(state: BattleState, actorId: CombatantId) {
  const subject = dropProneSubject(actorId);
  expect(
    discoverBattleActCandidates(state).map((act) => act.subject),
  ).not.toContainEqual(subject);
  expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
  });
}

describe("Drop Prone eligibility", () => {
  test("innate Prone immunity prevents discovery and resolution", () => {
    const session = startBattleSessionRight({
      battleId: battleId("drop-prone-innate-immunity"),
      combatants: [
        statBlockCreatureInit({
          initiative: 20,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_mimic"),
          ),
        }),
        characterSeed({ initiative: 10 }),
      ],
    });
    expectDropProneRejected(session.state, goblinId);
  });

  test("immunity gained after discovery rejects the held Drop Prone subject", () => {
    const session = startBattleSessionRight({
      battleId: battleId("drop-prone-effect-immunity"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = dropProneSubject(fighterId);
    expect(
      discoverBattleActCandidates(session.state).map((act) => act.subject),
    ).toContainEqual(subject);
    const immune = battleStateWithAllocatedEffectForTest({
      state: session.state,
      ownerId: fighterId,
      effect: {
        kind: "conditionImmunity",
        condition: "prone",
        conditionHadNonSpellSource: false,
        expiresAt: { kind: "untilDispelled" },
        sourceCombatantId: fighterId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic_prone_immunity",
        ),
      },
    });
    expectDropProneRejected(immune, fighterId);
  });

  test("a dead Stat Block cannot choose Drop Prone", () => {
    const session = startBattleSessionRight({
      battleId: battleId("drop-prone-dead-stat-block"),
      combatants: [
        statBlockCreatureInit({ initiative: 20, currentHp: 0 }),
        characterSeed({ initiative: 10 }),
      ],
    });
    expectDropProneRejected(session.state, goblinId);
  });

  test("death after discovery invalidates the held Drop Prone subject", () => {
    const session = startBattleSessionRight({
      battleId: battleId("drop-prone-stale-death"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
      ],
    });
    const actor = session.state.combatants.get(goblinId);
    if (actor === undefined || actor.positiveHpUnconscious !== null) {
      throw new Error("Expected the conscious initialized actor.");
    }
    expect(
      discoverBattleActCandidates(session.state).map((act) => act.subject),
    ).toContainEqual(dropProneSubject(goblinId));
    const dead: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(goblinId, {
        ...actor,
        hp: Hp(0),
      }),
    };
    expectDropProneRejected(dead, goblinId);
  });

  test("Incapacitated and spent movement do not prevent a no-cost Drop Prone", () => {
    const actorId = fighterId;
    const session = startBattleSessionRight({
      battleId: battleId("drop-prone-incapacitated-spent-movement"),
      combatants: [
        characterSeed({ initiative: 20, conditions: ["incapacitated"] }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const actor = session.state.combatants.get(actorId);
    if (actor === undefined) throw new Error("Expected the initialized actor.");
    const state: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(actorId, {
        ...actor,
        movementSpentFeet: movementFeet(30),
      }),
    };
    const subject = dropProneSubject(actorId);
    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).toContainEqual(subject);
    const dropped = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    expect(dropped.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: actorId,
        conditions: ["incapacitated", "prone"],
        movement: expect.objectContaining({ spentFeet: movementFeet(30) }),
      }),
    );
    expect(dropped.state.currentTurnResources).toEqual(
      state.currentTurnResources,
    );
  });
});
