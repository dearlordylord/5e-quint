// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.stunning-strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L5-A12-MONK-STUNNING-STRIKE-BATTLE-RUNTIME monk_stunning_strike
// UNIT-IDENTITY-REPLAY: L5-A12-MONK-STUNNING-STRIKE-BATTLE-RUNTIME monk_stunning_strike doFailedSave doSuccessfulSave doDecline doSecondUseGate
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import type { BattleResolutionResult } from "./index.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  discoverBattleActs,
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
  supportedBattleUnitRef,
  targetFill,
  testCharacterD20Statistics,
  unitFeatureDecisionFill,
  unitLibrary,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";

type StunningStrikeProjection = {
  readonly targetStunned: boolean;
  readonly targetSpeedHalved: boolean;
  readonly targetAttackAdvantage: boolean;
  readonly focusUsesRemaining: number;
  readonly usedThisTurn: boolean;
  readonly lastResult: string;
};

const stunningStrikeUnit = unitLibrary.requireUnit("monk_stunning_strike");
const stunningStrikeUnitRef = supportedBattleUnitRef(stunningStrikeUnit);

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Stunning Strike selected identity replay",
  taskId: "L5-A12-MONK-STUNNING-STRIKE-BATTLE-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-stunning-strike.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      FailedSave: "failedSave",
      SuccessfulSave: "successfulSave",
      Decline: "decline",
      SecondUseGate: "secondUseGate",
    },
  },
  projectionSchema: {
    targetStunned: "bool",
    targetSpeedHalved: "bool",
    targetAttackAdvantage: "bool",
    focusUsesRemaining: "int",
    usedThisTurn: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "monk_stunning_strike",
      procedures: [
        {
          actionName: "doFailedSave",
          projectionAfter: expectedProjection({
            targetStunned: true,
            focusUsesRemaining: 1,
            usedThisTurn: true,
            lastResult: "failedSave",
          }),
          discover: () => projectSave(false, "failedSave"),
        },
        {
          actionName: "doSuccessfulSave",
          projectionAfter: expectedProjection({
            targetSpeedHalved: true,
            targetAttackAdvantage: true,
            focusUsesRemaining: 1,
            usedThisTurn: true,
            lastResult: "successfulSave",
          }),
          discover: () => projectSave(true, "successfulSave"),
        },
        {
          actionName: "doDecline",
          projectionAfter: expectedProjection({ lastResult: "decline" }),
          discover: projectDecline,
        },
        {
          actionName: "doSecondUseGate",
          projectionAfter: expectedProjection({
            focusUsesRemaining: 1,
            usedThisTurn: true,
            lastResult: "secondUseGate",
          }),
          discover: projectSecondUseGate,
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<StunningStrikeProjection> = {},
): StunningStrikeProjection {
  return {
    targetStunned: false,
    targetSpeedHalved: false,
    targetAttackAdvantage: false,
    focusUsesRemaining: 2,
    usedThisTurn: false,
    lastResult: "init",
    ...overrides,
  };
}

function projectSave(
  succeeded: boolean,
  lastResult: string,
): StunningStrikeProjection {
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
  return projectResolved(
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "attempt"),
          savingThrowOutcomeFill(save, [{ targetId: goblinId, succeeded }]),
        ],
      }),
    ),
    lastResult,
  );
}

function projectDecline(): StunningStrikeProjection {
  const window = stunningStrikeHitWindow();
  return projectResolved(
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, "decline"),
        ],
      }),
    ),
    "decline",
  );
}

function projectSecondUseGate(): StunningStrikeProjection {
  const state = stunningStrikeBattle({ focusUsesRemaining: 1 });
  const usedState = {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      stunningStrikesUsedThisTurn: [
        { attackerId: fighterId, unitId: "monk_stunning_strike" },
      ],
    },
  };
  const result = resolveBattleSubjectAfterHit(usedState);
  return projectResolved(requireResolved(result), "secondUseGate");
}

function projectResolved(
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  lastResult: string,
): StunningStrikeProjection {
  const target = result.state.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Stunning Strike target.");
  }
  return expectedProjection({
    targetStunned: hasCondition(target.conditions, "stunned"),
    targetSpeedHalved: target.activeEffects.some(
      (effect) =>
        effect.kind === "speedHalved" &&
        "sourceUnitId" in effect &&
        effect.sourceUnitId === "monk_stunning_strike",
    ),
    targetAttackAdvantage: target.activeEffects.some(
      (effect) =>
        effect.kind === "nextAttackRollAgainstSelf" &&
        "sourceUnitId" in effect &&
        effect.sourceUnitId === "monk_stunning_strike" &&
        effect.mode === "advantage",
    ),
    focusUsesRemaining: monkFocusUsesRemaining(result.state),
    usedThisTurn: stunningStrikeUsedThisTurn(result.state),
    lastResult,
  });
}

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
  input: { readonly focusUsesRemaining?: number } = {},
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-stunning-strike-selected-identity"),
    combatants: [
      characterSeed({
        displayName: "Stunning Strike Monk",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "monk", level: 5 }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ str: 16, wis: 16 }),
        resources: [
          monksFocusResource({ usesRemaining: input.focusUsesRemaining ?? 2 }),
        ],
        characterUnitRefs: [stunningStrikeUnitRef],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function attackSubject(state: BattleState): BattleSubject {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack",
  );
  if (act === undefined) {
    throw new Error("Expected attack action.");
  }
  return act.subject;
}

function monkFocusUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Monk character.");
  }
  const focus = actor.origin.resources.find(
    (resource) => resource.unit.id === "monk_monks_focus",
  );
  if (focus === undefined) {
    throw new Error("Expected Monk Focus resource.");
  }
  return Number(focus.usesRemaining);
}

function stunningStrikeUsedThisTurn(state: BattleState): boolean {
  return state.currentTurnResources.stunningStrikesUsedThisTurn.some(
    (usage) =>
      usage.attackerId === fighterId && usage.unitId === "monk_stunning_strike",
  );
}
