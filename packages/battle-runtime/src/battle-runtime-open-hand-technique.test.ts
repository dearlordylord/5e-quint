// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.open-hand-technique
import { describe, expect, test } from "vitest";

import { battleTablePositionId } from "./index.ts";
import type { BattleShovePushOutcome } from "./battle-reducer.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  damageRollFill,
  discoverBattleActs,
  fighterId,
  goblinId,
  hasCondition,
  monksFocusResource,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testUnarmedStrikeDieAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import { battleOpenHandTechniqueSupportForUnit } from "./unit-feature-support.ts";

describe("battle runtime: Open Hand Technique", () => {
  test("Addle applies Opportunity Attack denial after an eligible Flurry hit", () => {
    const window = openHandTechniqueHitWindow();
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "denyOpportunityAttacks"),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);

    expect(target?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "opportunityAttackDenied",
          sourceUnitId: "monk_open_hand_technique",
          sourceCombatantId: fighterId,
          expiresAt: { kind: "startOfTurn", combatantId: goblinId },
        }),
      ]),
    );
  });

  test("decline leaves an eligible Flurry hit without an Open Hand rider", () => {
    const window = openHandTechniqueHitWindow();
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "decline"),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Open Hand target.");
    }

    expect(resolved.shovePushes).toBeUndefined();
    expect(hasCondition(target.conditions, "prone")).toBe(false);
    expect(target.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "opportunityAttackDenied",
          sourceUnitId: "monk_open_hand_technique",
          sourceCombatantId: fighterId,
        }),
      ]),
    );
  });

  test("Push validates the Strength save and caller-supplied forced movement", () => {
    const success = resolveOpenHandSave("pushAwayOnFailedSave", true);
    expect(success.resolved.shovePushes).toBeUndefined();

    const shorterLegalPush = openHandPush(10);
    const failure = resolveOpenHandSave(
      "pushAwayOnFailedSave",
      false,
      shorterLegalPush,
    );
    expect(failure.resolved.shovePushes).toEqual([shorterLegalPush]);
    expect(hasCondition(failure.target.conditions, "prone")).toBe(false);
  });

  test("Push result is preserved through rolled damage resolution", () => {
    const window = openHandTechniqueHitWindow(
      openHandTechniqueBattle({ unarmedStrike: testUnarmedStrikeDieAttack() }),
    );
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "pushAwayOnFailedSave"),
        ],
      }),
      "savingThrowOutcome",
    );
    const push = openHandPush(10);
    const damage = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "pushAwayOnFailedSave"),
          openHandSavingThrowFill(save, false, push),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "pushAwayOnFailedSave"),
          openHandSavingThrowFill(save, false, push),
          damageRollFill(damage, 4),
        ],
      }),
    );

    expect(resolved.shovePushes).toEqual([push]);
  });

  test("Topple validates the Dexterity save and applies Prone only on failure", () => {
    const success = resolveOpenHandSave("applyConditionOnFailedSave", true);
    expect(hasCondition(success.target.conditions, "prone")).toBe(false);

    const failure = resolveOpenHandSave("applyConditionOnFailedSave", false);
    expect(hasCondition(failure.target.conditions, "prone")).toBe(true);
    expect(failure.resolved.shovePushes).toBeUndefined();
  });

  test("Topple rejects Push disposition facts", () => {
    const window = openHandTechniqueHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(
            window.decision,
            "applyConditionOnFailedSave",
          ),
        ],
      }),
      "savingThrowOutcome",
    );

    const result = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.hitFills,
        unitFeatureDecisionFill(window.decision, "applyConditionOnFailedSave"),
        openHandSavingThrowFill(save, false, openHandPush(10)),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Open Hand Technique Push disposition is only valid for failed Push saves.",
    });
  });

  test("Open Hand Technique rejects non-Flurry and stale hit windows", () => {
    const flurry = openHandTechniqueHitWindow();
    const genericState = openHandTechniqueBattle();
    const genericSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const genericTarget = requireHole(
      resolveBattleSubject({
        state: genericState,
        subject: genericSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const genericRoll = requireHole(
      resolveBattleSubject({
        state: genericState,
        subject: genericSubject,
        fills: [targetFill(genericTarget, goblinId)],
      }),
      "attackRoll",
    );
    const nonFlurry = resolveBattleSubject({
      state: genericState,
      subject: genericSubject,
      fills: [
        targetFill(genericTarget, goblinId),
        attackRollFill(genericRoll, { total: 20, naturalD20: 15 }),
        unitFeatureDecisionFill(flurry.decision, "denyOpportunityAttacks"),
      ],
    });

    expect(nonFlurry).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Open Hand Technique is only valid for an eligible Flurry of Blows hit.",
    });

    const stale = resolveBattleSubject({
      state: withoutFlurryResources(flurry.state),
      subject: flurry.subject,
      fills: flurry.hitFills,
    });
    expect(stale).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Open Hand Technique rejects unsupported Push disposition states", () => {
    const window = openHandTechniqueHitWindow();
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "pushAwayOnFailedSave"),
        ],
      }),
      "savingThrowOutcome",
    );

    const result = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.hitFills,
        unitFeatureDecisionFill(window.decision, "pushAwayOnFailedSave"),
        openHandSavingThrowFill(save, false, {
          ...openHandPush(),
          disposition: {
            kind: "blocked",
            distanceFeet: movementFeet(20),
            reason: "blocked",
            provokesOpportunityAttacks: false,
          },
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Open Hand Technique Push disposition must not exceed the feature's 15-foot maximum.",
    });
  });
});

function resolveOpenHandSave(
  choice: "pushAwayOnFailedSave" | "applyConditionOnFailedSave",
  succeeded: boolean,
  push?: NonNullable<
    BattleShovePushOutcome
  >,
) {
  const window = openHandTechniqueHitWindow();
  const save = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.hitFills,
        unitFeatureDecisionFill(window.decision, choice),
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
        unitFeatureDecisionFill(window.decision, choice),
        openHandSavingThrowFill(save, succeeded, push),
      ],
    }),
  );
  const target = resolved.state.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Open Hand target.");
  }
  return { resolved, target };
}

function openHandTechniqueHitWindow(state = openHandTechniqueBattle()): {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hitFills: readonly BattleFill[];
  readonly decision: BattleHole;
} {
  const activated = activateFlurryOfBlows(state);
  const subject = openHandSubject(
    activated.state,
    (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
  );
  const target = requireHole(
    resolveBattleSubject({ state: activated.state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: activated.state,
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
    resolveBattleSubject({
      state: activated.state,
      subject,
      fills: hitFills,
    }),
    "unitFeatureDecision",
  );
  return { state: activated.state, subject, hitFills, decision };
}

function activateFlurryOfBlows(state: BattleState) {
  const subject = openHandSubject(
    state,
    (candidate) =>
      candidate.tag === "monkFocusOption" &&
      candidate.option === "flurryOfBlows",
  );
  return requireResolved(resolveBattleSubject({ state, subject, fills: [] }));
}

function openHandTechniqueBattle(
  input: {
    readonly unarmedStrike?: ReturnType<typeof testUnarmedStrikeDieAttack>;
  } = {},
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-open-hand-technique"),
    combatants: [
      characterSeed({
        displayName: "Open Hand Monk",
        initiative: 20,
        classLevels: [{ className: "monk", level: 3 }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ str: 16, wis: 16 }),
        ...(input.unarmedStrike === undefined
          ? {}
          : { unarmedStrike: input.unarmedStrike }),
        resources: [monksFocusResource({ usesRemaining: 2 })],
        characterUnitRefs: [openHandTechniqueUnitRef()],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function openHandTechniqueUnitRef() {
  const unit = unitLibrary.requireUnit("monk_open_hand_technique");
  const support = battleOpenHandTechniqueSupportForUnit(unit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Open Hand Technique support profile.");
  }
  return { unitId: unit.id, supportProfiles: [support] };
}

function openHandSubject(
  state: BattleState,
  predicate: (subject: BattleSubject) => boolean,
): BattleSubject {
  const act = discoverBattleActs(state).find((candidate) =>
    predicate(candidate.subject),
  );
  if (act === undefined) {
    throw new Error("Expected Open Hand battle act.");
  }
  return act.subject;
}

function openHandSavingThrowFill(
  hole: BattleHole,
  succeeded: boolean,
  push?: NonNullable<
    BattleShovePushOutcome
  >,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const fill = savingThrowOutcomeFill(hole, [{ targetId: goblinId, succeeded }]);
  return push === undefined
    ? fill
    : { ...fill, value: { ...fill.value, openHandTechniquePush: push } };
}

function openHandPush(distanceFeet = 15) {
  return {
    targetId: goblinId,
    disposition: {
      kind: "pushed" as const,
      distanceFeet: movementFeet(distanceFeet),
      destinationId: battleTablePositionId("open-hand-push-destination"),
      provokesOpportunityAttacks: false as const,
    },
  };
}

function withoutFlurryResources(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource.source !== "monkFocusFlurryOfBlows",
      ),
    },
  };
}
