// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.open-hand-technique
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME monk_open_hand_technique
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-06-MONK-OPEN-HAND-TECHNIQUE-RUNTIME monk_open_hand_technique doAddle doPushSaveSucceeded doPushSaveFailed doToppleSaveSucceeded doToppleSaveFailed doRejectNonFlurry doRejectPushTooFar doRejectTopplePushDisposition
import * as path from "node:path";

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
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-open-hand-technique.mbt.qnt",
  ),
  projectionSchema: {
    targetOpportunityAttackDenied: "bool",
    targetProne: "bool",
    pushDistanceFeet: "int",
    lastResult: "str",
    lastInvalidReason: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "monk_open_hand_technique",
      procedures: [
        {
          actionName: "doAddle",
          projectionAfter: expectedProjection({
            targetOpportunityAttackDenied: true,
            lastResult: "addle",
          }),
          discover: () => projectChoice("addle", "addle"),
        },
        {
          actionName: "doPushSaveSucceeded",
          projectionAfter: expectedProjection({
            lastResult: "pushSaveSucceeded",
          }),
          discover: () => projectSaveChoice("push", true, "pushSaveSucceeded"),
        },
        {
          actionName: "doPushSaveFailed",
          projectionAfter: expectedProjection({
            pushDistanceFeet: 10,
            lastResult: "pushSaveFailed",
          }),
          discover: () =>
            projectSaveChoice(
              "push",
              false,
              "pushSaveFailed",
              openHandPush(10),
            ),
        },
        {
          actionName: "doToppleSaveSucceeded",
          projectionAfter: expectedProjection({
            lastResult: "toppleSaveSucceeded",
          }),
          discover: () =>
            projectSaveChoice("topple", true, "toppleSaveSucceeded"),
        },
        {
          actionName: "doToppleSaveFailed",
          projectionAfter: expectedProjection({
            targetProne: true,
            lastResult: "toppleSaveFailed",
          }),
          discover: () =>
            projectSaveChoice("topple", false, "toppleSaveFailed"),
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
          actionName: "doRejectTopplePushDisposition",
          projectionAfter: expectedProjection({
            lastResult: "rejectTopplePushDisposition",
            lastInvalidReason: "invalidFill",
          }),
          discover: projectRejectTopplePushDisposition,
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
  choice: "addle" | "decline",
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
  choice: "push" | "topple",
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
      unitFeatureDecisionFill(flurry.decision, "addle"),
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
        unitFeatureDecisionFill(window.decision, "push"),
      ],
    }),
    "savingThrowOutcome",
  );
  const result = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: [
      ...window.hitFills,
      unitFeatureDecisionFill(window.decision, "push"),
      openHandSavingThrowFill(save, false, openHandPush(20)),
    ],
  });
  return expectedProjection({
    lastResult: "rejectPushTooFar",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectRejectTopplePushDisposition(): OpenHandTechniqueProjection {
  const window = openHandTechniqueHitWindow();
  const save = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.hitFills,
        unitFeatureDecisionFill(window.decision, "topple"),
      ],
    }),
    "savingThrowOutcome",
  );
  const result = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: [
      ...window.hitFills,
      unitFeatureDecisionFill(window.decision, "topple"),
      openHandSavingThrowFill(save, false, openHandPush(10)),
    ],
  });
  return expectedProjection({
    lastResult: "rejectTopplePushDisposition",
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
    pushDistanceFeet: Number(result.shovePushes?.[0]?.disposition.distanceFeet ?? 0),
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
  const fill = savingThrowOutcomeFill(hole, [{ targetId: goblinId, succeeded }]);
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
