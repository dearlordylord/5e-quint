// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.stunning-strike
import { describe, expect, test } from "vitest";

import type { BattleFill, BattleHole, BattleState } from "./battle-reducer.ts";
import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  discoverBattleActs,
  endTurn,
  fighterId,
  goblinId,
  hasCondition,
  monksFocusResource,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testLongswordAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import { battleStunningStrikeSupportForUnit } from "./unit-feature-support.ts";

describe("battle runtime: Stunning Strike", () => {
  test("failed save spends Focus and Stuns until the start of the Monk's next turn", () => {
    const window = stunningStrikeHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
        ],
      }),
      "savingThrowOutcome",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
          stunningStrikeSavingThrowFill(save, false),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    const actor = resolved.state.combatants.get(fighterId);

    if (target === undefined) {
      throw new Error("Expected Stunning Strike target.");
    }
    expect(hasCondition(target.conditions, "stunned")).toBe(true);
    expect(target?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureCondition",
          sourceUnitId: "monk_stunning_strike",
          sourceCombatantId: fighterId,
          condition: "stunned",
          expiresAt: { kind: "startOfTurn", combatantId: fighterId },
        }),
      ]),
    );
    expect(
      actor?.origin.kind === "character" ? actor.origin.resources : [],
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "monk_monks_focus" }),
          usesRemaining: 1,
        }),
      ]),
    );
    expect(
      resolved.state.currentTurnResources.stunningStrikesUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "monk_stunning_strike" }]);

    const goblinTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: fighterId }),
    ).state;
    const goblinTurnTarget = goblinTurn.combatants.get(goblinId);
    if (goblinTurnTarget === undefined) {
      throw new Error("Expected Stunning Strike target after Monk turn.");
    }
    expect(hasCondition(goblinTurnTarget.conditions, "stunned")).toBe(true);
    const monkTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    const monkTurnTarget = monkTurn.combatants.get(goblinId);
    if (monkTurnTarget === undefined) {
      throw new Error("Expected Stunning Strike target after target turn.");
    }
    expect(hasCondition(monkTurnTarget.conditions, "stunned")).toBe(false);
  });

  test("successful save halves Speed and gives the next attack roll against the target Advantage", () => {
    const window = stunningStrikeHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
        ],
      }),
      "savingThrowOutcome",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
          stunningStrikeSavingThrowFill(save, true),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);

    if (target === undefined) {
      throw new Error("Expected Stunning Strike target.");
    }
    expect(hasCondition(target.conditions, "stunned")).toBe(false);
    expect(effectiveWalkSpeed(target)).toBe(15);
    expect(requiredAttackRollMode(resolved.state, fighterId, goblinId)).toBe(
      "advantage",
    );
  });

  test("does not offer the rider after one Stunning Strike use in the same turn", () => {
    const state = stunningStrikeBattle();
    const usedState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        stunningStrikesUsedThisTurn: [
          { attackerId: fighterId, unitId: "monk_stunning_strike" },
        ],
      },
    };
    const target = requireHole(
      resolveBattleSubject({
        state: usedState,
        subject: attackSubject(usedState),
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: usedState,
        subject: attackSubject(usedState),
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state: usedState,
      subject: attackSubject(usedState),
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
      ],
    });

    expect(result.tag).toBe("resolved");
  });

  test("does not offer the rider without an available Focus Point or on non-Monk weapon hits", () => {
    expect(
      resolveBattleSubjectAfterHit(
        stunningStrikeBattle({ focusUsesRemaining: 0 }),
      ).tag,
    ).toBe("resolved");
    const nonMonkWeaponResult = resolveBattleSubjectAfterHit(
      stunningStrikeBattle({ attack: testLongswordAttack() }),
    );

    expect(nonMonkWeaponResult.tag).toBe("needsHoles");
    if (nonMonkWeaponResult.tag === "needsHoles") {
      expect(nonMonkWeaponResult.holes[0]?.kind).not.toBe(
        "unitFeatureDecision",
      );
    }
  });
});

function stunningStrikeHitWindow(state = stunningStrikeBattle()): {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hitFills: readonly BattleFill[];
  readonly decision: BattleHole;
} {
  const subject = attackSubject(state);
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  const hitFills = [
    targetFill(target, goblinId),
    attackRollFill(roll, { total: 20, naturalD20: 15 }),
  ];
  const decision = requireHole(
    resolveBattleSubject({ state, subject, fills: hitFills }),
    "unitFeatureDecision",
  );
  return { state, subject, hitFills, decision };
}

function resolveBattleSubjectAfterHit(state: BattleState) {
  const subject = attackSubject(state);
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
    ],
  });
}

function stunningStrikeBattle(
  input: {
    readonly focusUsesRemaining?: number;
    readonly attack?: ReturnType<typeof testLongswordAttack> | null;
  } = {},
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-stunning-strike"),
    combatants: [
      characterSeed({
        displayName: "Stunning Strike Monk",
        initiative: 20,
        attack: input.attack ?? null,
        classLevels: [{ className: "monk", level: 5 }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ str: 16, wis: 16 }),
        resources: [
          monksFocusResource({ usesRemaining: input.focusUsesRemaining ?? 2 }),
        ],
        characterUnitRefs: [stunningStrikeUnitRef()],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function stunningStrikeUnitRef() {
  const unit = unitLibrary.requireUnit("monk_stunning_strike");
  const support = battleStunningStrikeSupportForUnit(unit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Stunning Strike support profile.");
  }
  return { unitId: unit.id, supportProfiles: [support] };
}

function attackSubject(state: BattleState): BattleSubject {
  const act = resolveAttackAct(state);
  return act.subject;
}

function resolveAttackAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack",
  );
  if (act === undefined) {
    throw new Error("Expected attack action.");
  }
  return act;
}

function stunningStrikeSavingThrowFill(
  hole: BattleHole,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return savingThrowOutcomeFill(hole, [{ targetId: goblinId, succeeded }]);
}
