// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.open-hand-technique
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME monk_open_hand_technique
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME monk_open_hand_technique doDecline doDenyOpportunityAttacks doPushAwaySaveSucceeded doPushAwaySaveFailed doApplyProneSaveSucceeded doApplyProneSaveFailed doRejectNonFlurry doRejectPushTooFar doRejectApplyPronePushDisposition
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { battleTablePositionId } from "./index.ts";
import type { BattleResolutionResult } from "./index.ts";
import type { BattleShovePushOutcome } from "./battle-reducer.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
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

type OpenHandTechniqueProjection = {
  readonly targetOpportunityAttackDenied: boolean;
  readonly targetProne: boolean;
  readonly pushDistanceFeet: number;
  readonly lastResult: string;
  readonly lastInvalidReason: string;
};

const openHandTechniqueUnit = unitLibrary.requireUnit(
  "monk_open_hand_technique",
);
const openHandTechniqueUnitRef = supportedBattleUnitRef(openHandTechniqueUnit);

defineSelectedIdentityWitness({
  describeLabel: "Open Hand Technique selected identity MBT",
  taskId: "L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-open-hand-technique.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      Decline: "decline",
      DenyOpportunityAttacks: "denyOpportunityAttacks",
      PushAwaySaveSucceeded: "pushAwaySaveSucceeded",
      PushAwaySaveFailed: "pushAwaySaveFailed",
      ApplyProneSaveSucceeded: "applyProneSaveSucceeded",
      ApplyProneSaveFailed: "applyProneSaveFailed",
      RejectNonFlurry: "rejectNonFlurry",
      RejectPushTooFar: "rejectPushTooFar",
      RejectApplyPronePushDisposition: "rejectApplyPronePushDisposition",
    },
  },
  projectionSchema: {
    targetOpportunityAttackDenied: "bool",
    targetProne: "bool",
    pushDistanceFeet: "int",
    lastResult: "variant",
    lastInvalidReason: "str",
  },
  initialProjection: expectedProjection(),
  witnessInvalidScenarioReasons: {
    rejectNonFlurry: "invalidFill",
    rejectPushTooFar: "invalidFill",
    rejectApplyPronePushDisposition: "invalidFill",
  },
  units: [
    {
      unitId: "monk_open_hand_technique",
      procedures: [
        {
          actionName: "doDecline",
          projectionAfter: expectedProjection({
            lastResult: "decline",
          }),
          discover: () => projectChoice("decline", "decline"),
        },
        {
          actionName: "doDenyOpportunityAttacks",
          projectionAfter: expectedProjection({
            targetOpportunityAttackDenied: true,
            lastResult: "denyOpportunityAttacks",
          }),
          discover: () =>
            projectChoice(
              "denyOpportunityAttacks",
              "denyOpportunityAttacks",
            ),
        },
        {
          actionName: "doPushAwaySaveSucceeded",
          projectionAfter: expectedProjection({
            lastResult: "pushAwaySaveSucceeded",
          }),
          discover: () =>
            projectSaveChoice(
              "pushAwayOnFailedSave",
              true,
              "pushAwaySaveSucceeded",
            ),
        },
        {
          actionName: "doPushAwaySaveFailed",
          projectionAfter: expectedProjection({
            pushDistanceFeet: 10,
            lastResult: "pushAwaySaveFailed",
          }),
          discover: () =>
            projectSaveChoice(
              "pushAwayOnFailedSave",
              false,
              "pushAwaySaveFailed",
              openHandPush(10),
            ),
        },
        {
          actionName: "doApplyProneSaveSucceeded",
          projectionAfter: expectedProjection({
            lastResult: "applyProneSaveSucceeded",
          }),
          discover: () =>
            projectSaveChoice(
              "applyConditionOnFailedSave",
              true,
              "applyProneSaveSucceeded",
            ),
        },
        {
          actionName: "doApplyProneSaveFailed",
          projectionAfter: expectedProjection({
            targetProne: true,
            lastResult: "applyProneSaveFailed",
          }),
          discover: () =>
            projectSaveChoice(
              "applyConditionOnFailedSave",
              false,
              "applyProneSaveFailed",
            ),
        },
        {
          actionName: "doRejectNonFlurry",
          projectionAfter: expectedProjection({
            lastResult: "rejectNonFlurry",
            lastInvalidReason: "invalidFill",
          }),
          discover: projectRejectNonFlurry,
        },
        {
          actionName: "doRejectPushTooFar",
          projectionAfter: expectedProjection({
            lastResult: "rejectPushTooFar",
            lastInvalidReason: "invalidFill",
          }),
          discover: projectRejectPushTooFar,
        },
        {
          actionName: "doRejectApplyPronePushDisposition",
          projectionAfter: expectedProjection({
            lastResult: "rejectApplyPronePushDisposition",
            lastInvalidReason: "invalidFill",
          }),
          discover: projectRejectApplyPronePushDisposition,
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<OpenHandTechniqueProjection> = {},
): OpenHandTechniqueProjection {
  return {
    targetOpportunityAttackDenied: false,
    targetProne: false,
    pushDistanceFeet: 0,
    lastResult: "init",
    lastInvalidReason: "",
    ...overrides,
  };
}

function projectChoice(
  choice: "denyOpportunityAttacks" | "decline",
  lastResult: string,
): OpenHandTechniqueProjection {
  const window = openHandTechniqueHitWindow();
  return projectResult(
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, choice),
        ],
      }),
    ),
    lastResult,
  );
}

function projectSaveChoice(
  choice: "pushAwayOnFailedSave" | "applyConditionOnFailedSave",
  succeeded: boolean,
  lastResult: string,
  push?: BattleShovePushOutcome,
): OpenHandTechniqueProjection {
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
  return projectResult(
    requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.hitFills,
          unitFeatureDecisionFill(window.decision, choice),
          openHandSavingThrowFill(save, succeeded, push),
        ],
      }),
    ),
    lastResult,
  );
}

function projectRejectNonFlurry(): OpenHandTechniqueProjection {
  const flurry = openHandTechniqueHitWindow();
  const state = openHandTechniqueBattle();
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Longsword",
  };
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
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
      unitFeatureDecisionFill(flurry.decision, "denyOpportunityAttacks"),
    ],
  });
  return expectedProjection({
    lastResult: "rejectNonFlurry",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectRejectPushTooFar(): OpenHandTechniqueProjection {
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
      openHandSavingThrowFill(save, false, openHandPush(20)),
    ],
  });
  return expectedProjection({
    lastResult: "rejectPushTooFar",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectRejectApplyPronePushDisposition(): OpenHandTechniqueProjection {
  const window = openHandTechniqueHitWindow();
  const save = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.hitFills,
        unitFeatureDecisionFill(window.decision, "applyConditionOnFailedSave"),
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
  return expectedProjection({
    lastResult: "rejectApplyPronePushDisposition",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectResult(
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  lastResult: string,
): OpenHandTechniqueProjection {
  const target = result.state.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Open Hand target.");
  }
  return expectedProjection({
    targetOpportunityAttackDenied: target.activeEffects.some(
      (effect) =>
        effect.kind === "opportunityAttackDenied" &&
        "sourceUnitId" in effect &&
        effect.sourceUnitId === "monk_open_hand_technique",
    ),
    targetProne: hasCondition(target.conditions, "prone"),
    pushDistanceFeet: Number(
      result.shovePushes?.[0]?.disposition.distanceFeet ?? 0,
    ),
    lastResult,
  });
}

function openHandTechniqueHitWindow(): {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly hitFills: readonly BattleFill[];
  readonly decision: BattleHole;
} {
  const activated = activateFlurryOfBlows(openHandTechniqueBattle());
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

function openHandTechniqueBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-open-hand-technique-selected-identity"),
    combatants: [
      characterSeed({
        displayName: "Open Hand Monk",
        initiative: 20,
        classLevels: [{ className: "monk", level: 3 }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ str: 16, wis: 16 }),
        resources: [monksFocusResource({ usesRemaining: 2 })],
        characterUnitRefs: [openHandTechniqueUnitRef],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
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
  push?: BattleShovePushOutcome,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const fill = savingThrowOutcomeFill(hole, [
    { targetId: goblinId, succeeded },
  ]);
  return push === undefined
    ? fill
    : { ...fill, value: { ...fill.value, openHandTechniquePush: push } };
}

function openHandPush(distanceFeet = 15): BattleShovePushOutcome {
  return {
    targetId: goblinId,
    disposition: {
      kind: "pushed",
      distanceFeet: movementFeet(distanceFeet),
      destinationId: battleTablePositionId("open-hand-push-destination"),
      provokesOpportunityAttacks: false,
    },
  };
}
