// KERNEL-COVERAGE: parity-witness BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY
import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue as booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import { battleTablePositionId } from "./index.ts";
import {
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  hasCondition,
  movementFeet,
  requireHole,
  resolveBattleSubject,
  shoveOutcomeFill,
  targetFill,
} from "./battle-runtime-test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import type {
  BattleFill,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import type { BattleShovePushOutcome } from "./battle-reducer.ts";

const shoveOutcomeScenarios = [
  "init",
  "save-succeeds",
  "save-fails-prone",
  "save-fails-push",
  "save-fails-push-blocked",
  "save-fails-push-no-legal-destination",
  "invalid-push-distance",
] as const;
type ShoveOutcomeScenario = (typeof shoveOutcomeScenarios)[number];
type ShoveOutcomeReplayScenario = Exclude<ShoveOutcomeScenario, "init">;
const shoveOutcomeReplayStepCount = shoveOutcomeScenarios.length - 1;

const shovePushBlockedReasonByQntTag = {
  ShovePushBlocked: "blocked",
  ShovePushNoLegalDestination: "noLegalDestination",
} as const;
type ShovePushBlockedReason =
  (typeof shovePushBlockedReasonByQntTag)[keyof typeof shovePushBlockedReasonByQntTag];

type ShoveOutcomeProjection = RuleCoreComponentRoutedProjection & {
  readonly lastScenario: ShoveOutcomeScenario;
  readonly outcome: ShoveOutcomeReplayProjection;
  readonly replayIndex: number;
};

type ShoveOutcomeReplayProjection =
  | { readonly tag: "init" }
  | ShoveOutcomeRecordedProjection;

type ShoveOutcomeRecordedProjection =
  | {
      readonly tag: "rejected";
      readonly targetProne: boolean;
    }
  | {
      readonly tag: "acceptedWithoutEffect";
      readonly targetProne: boolean;
    }
  | { readonly tag: "acceptedTopple" }
  | {
      readonly tag: "acceptedPush";
      readonly targetProne: boolean;
      readonly push: ShovePushProjection;
    };

type ShovePushProjection =
  | { readonly tag: "pushed" }
  | {
      readonly tag: "blocked";
      readonly reason: ShovePushBlockedReason;
    };

type ShoveOutcomeValue = Extract<
  BattleFill,
  { readonly kind: "shoveOutcome" }
>["value"];

const componentOwner = "RuleCoreShoveOutcomeOwner";

const initialProjection: ShoveOutcomeProjection = withRuleCoreComponentRoute(
  componentOwner,
  {
    lastScenario: "init",
    outcome: { tag: "init" },
    replayIndex: 0,
  },
);

const shoveSubject: BattleSubject = {
  tag: "action",
  actorId: fighterId,
  action: "shove",
};

const shoveOutcomeValues = {
  "save-succeeds": () => ({ succeeded: true }) satisfies ShoveOutcomeValue,
  "save-fails-prone": () =>
    ({
      succeeded: false,
      failedEffect: { kind: "prone" },
    }) satisfies ShoveOutcomeValue,
  "save-fails-push": () =>
    ({
      succeeded: false,
      failedEffect: {
        kind: "pushAway",
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(5),
          destinationId: battleTablePositionId("rule-core-shove-pushed"),
          provokesOpportunityAttacks: false,
        },
      },
    }) satisfies ShoveOutcomeValue,
  "save-fails-push-blocked": () =>
    ({
      succeeded: false,
      failedEffect: {
        kind: "pushAway",
        disposition: {
          kind: "blocked",
          distanceFeet: movementFeet(5),
          reason: "blocked",
          provokesOpportunityAttacks: false,
        },
      },
    }) satisfies ShoveOutcomeValue,
  "save-fails-push-no-legal-destination": () =>
    ({
      succeeded: false,
      failedEffect: {
        kind: "pushAway",
        disposition: {
          kind: "blocked",
          distanceFeet: movementFeet(5),
          reason: "noLegalDestination",
          provokesOpportunityAttacks: false,
        },
      },
    }) satisfies ShoveOutcomeValue,
  "invalid-push-distance": () =>
    ({
      succeeded: false,
      failedEffect: {
        kind: "pushAway",
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(10),
          destinationId: battleTablePositionId("rule-core-shove-too-far"),
          provokesOpportunityAttacks: false,
        },
      },
    }) satisfies ShoveOutcomeValue,
} satisfies Record<ShoveOutcomeReplayScenario, () => ShoveOutcomeValue>;

const driverSchema = {
  init: {},
  doSaveSucceeds: {},
  doSaveFailsProne: {},
  doSaveFailsPush: {},
  doSaveFailsPushBlocked: {},
  doSaveFailsPushNoLegalDestination: {},
  doInvalidPushDistance: {},
  step: {},
} as const;

function createShoveOutcomeDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function replay(scenario: ShoveOutcomeReplayScenario): void {
      projection = applyScenario(scenario);
    }

    return {
      init: reset,
      doSaveSucceeds: () => replay("save-succeeds"),
      doSaveFailsProne: () => replay("save-fails-prone"),
      doSaveFailsPush: () => replay("save-fails-push"),
      doSaveFailsPushBlocked: () => replay("save-fails-push-blocked"),
      doSaveFailsPushNoLegalDestination: () =>
        replay("save-fails-push-no-legal-destination"),
      doInvalidPushDistance: () => replay("invalid-push-distance"),
      step: () => {},
      getState: () => projection,
    };
  });
}

const shoveOutcomeStateCheck = stateCheck(
  normalizeShoveOutcomeQuintState,
  compareShoveOutcomeState,
);

describe("rule-core Shove outcome deterministic QNT replay", () => {
  it(
    "replays Shove Prone and push dispositions against battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-shove-outcome.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createShoveOutcomeDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(shoveOutcomeReplayStepCount),
        stateCheck: shoveOutcomeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function applyScenario(
  scenario: ShoveOutcomeReplayScenario,
): ShoveOutcomeProjection {
  const outcomeValue = shoveOutcomeValues[scenario]();
  const state = fighterVsGoblinBattle();
  const target = requireHole(
    resolveBattleSubject({ state, subject: shoveSubject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject: shoveSubject,
      fills: [targetFill(target, goblinId)],
    }),
    "shoveOutcome",
  );
  const result = resolveBattleSubject({
    state,
    subject: shoveSubject,
    fills: [
      targetFill(target, goblinId),
      shoveOutcomeFill(outcome, outcomeValue),
    ],
  });
  if (result.tag === "invalid") {
    assertRejectedActionAvailability(
      result.snapshot.turn.actionResources.length > 0,
      scenario,
    );
    const targetAfter = result.snapshot.combatants.find(
      (combatant) => combatant.combatantId === goblinId,
    );
    if (targetAfter === undefined) {
      throw new Error("Missing Shove target after invalid resolution.");
    }
    return {
      ...initialProjection,
      lastScenario: scenario,
      outcome: {
        tag: "rejected",
        targetProne: targetAfter.conditions.includes("prone"),
      },
      replayIndex: replayIndexForScenario(scenario),
    };
  }
  if (result.tag !== "resolved") {
    throw new Error(`Expected Shove resolution, got ${result.tag}.`);
  }
  assertAcceptedActionAvailability(
    result.snapshot.turn.actionResources.length > 0,
    scenario,
  );
  const pushed = result.shovePushes?.[0];
  const targetAfter = result.state.combatants.get(goblinId);
  if (targetAfter === undefined) {
    throw new Error("Missing Shove target after resolution.");
  }
  const targetProne = hasCondition(targetAfter.conditions, "prone");
  return withRuleCoreComponentRoute(componentOwner, {
    lastScenario: scenario,
    outcome: projectResolvedShoveOutcome(outcomeValue, pushed, targetProne),
    replayIndex: replayIndexForScenario(scenario),
  });
}

function assertRejectedActionAvailability(
  actionAvailable: boolean,
  scenario: ShoveOutcomeReplayScenario,
): void {
  if (!actionAvailable) {
    throw new Error(`Rejected Shove consumed the attack in ${scenario}.`);
  }
}

function assertAcceptedActionAvailability(
  actionAvailable: boolean,
  scenario: ShoveOutcomeReplayScenario,
): void {
  if (actionAvailable) {
    throw new Error(`Accepted Shove left the attack available in ${scenario}.`);
  }
}

function projectResolvedShoveOutcome(
  outcomeValue: ShoveOutcomeValue,
  pushed: BattleShovePushOutcome | undefined,
  targetProne: boolean,
): ShoveOutcomeRecordedProjection {
  if (outcomeValue.succeeded) {
    assertNoShovePush(pushed, "successful Shove save");
    return { tag: "acceptedWithoutEffect", targetProne };
  }

  if (outcomeValue.failedEffect.kind === "prone") {
    assertNoShovePush(pushed, "Shove topple");
    if (!targetProne) {
      throw new Error("Shove topple resolved without the Prone condition.");
    }
    return { tag: "acceptedTopple" };
  }

  if (pushed === undefined) {
    throw new Error("Accepted Shove push resolved without a push outcome.");
  }

  return {
    tag: "acceptedPush",
    targetProne,
    push: projectShovePush(pushed),
  };
}

function assertNoShovePush(
  pushed: BattleShovePushOutcome | undefined,
  label: string,
): void {
  if (pushed !== undefined) {
    throw new Error(`${label} unexpectedly emitted a push outcome.`);
  }
}

function projectShovePush(push: BattleShovePushOutcome): ShovePushProjection {
  const disposition = push.disposition;
  assertShovePushDispositionConstants(push);
  if (disposition.kind === "pushed") {
    return { tag: "pushed" };
  }

  return {
    tag: "blocked",
    reason: disposition.reason,
  };
}

function assertShovePushDispositionConstants(
  push: BattleShovePushOutcome,
): void {
  const disposition = push.disposition;
  if (Number(disposition.distanceFeet) !== 5) {
    throw new Error(
      "Accepted Shove push projected a distance other than 5 feet.",
    );
  }
  if (disposition.provokesOpportunityAttacks) {
    throw new Error("Accepted Shove push projected opportunity attacks.");
  }
}

function normalizeShoveOutcomeQuintState(raw: unknown): ShoveOutcomeProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Shove outcome state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    lastScenario: scenarioField(state["qLastScenario"]),
    outcome: decodeShoveOutcomeReplayProjection(state["qOutcome"]),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareShoveOutcomeState(
  runtime: ShoveOutcomeProjection,
  quint: ShoveOutcomeProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): ShoveOutcomeScenario {
  if (typeof raw === "string" && isShoveOutcomeScenario(raw)) {
    return raw;
  }
  throw new Error(`Unknown Shove outcome scenario ${String(raw)}.`);
}

function isShoveOutcomeScenario(raw: string): raw is ShoveOutcomeScenario {
  return shoveOutcomeScenarios.some((scenario) => scenario === raw);
}

function decodeShoveOutcomeReplayProjection(
  raw: unknown,
): ShoveOutcomeReplayProjection {
  const tag = quintVariantTag(raw, "qOutcome");
  if (tag === "ShoveOutcomeReplayInit") {
    return { tag: "init" };
  }
  if (tag === "ShoveOutcomeReplayRecorded") {
    return decodeShoveOutcomeRecordedProjection(
      quintVariantValue(raw, tag, "qOutcome"),
    );
  }

  throw new Error(`Unknown Shove outcome replay projection tag: ${tag}.`);
}

function decodeShoveOutcomeRecordedProjection(
  raw: unknown,
): ShoveOutcomeRecordedProjection {
  const tag = quintVariantTag(raw, "qOutcome.value");
  if (tag === "ShoveOutcomeRejectedProjection") {
    const payload = quintVariantRecordValue(raw, tag, "qOutcome.value");
    return {
      tag: "rejected",
      targetProne: booleanField(payload["targetProne"], "targetProne"),
    };
  }
  if (tag === "ShoveOutcomeAcceptedWithoutEffectProjection") {
    const payload = quintVariantRecordValue(raw, tag, "qOutcome.value");
    return {
      tag: "acceptedWithoutEffect",
      targetProne: booleanField(payload["targetProne"], "targetProne"),
    };
  }
  if (tag === "ShoveOutcomeAcceptedToppleProjection") {
    return { tag: "acceptedTopple" };
  }
  if (tag === "ShoveOutcomeAcceptedPushProjection") {
    const payload = quintVariantRecordValue(raw, tag, "qOutcome.value");
    return {
      tag: "acceptedPush",
      targetProne: booleanField(payload["targetProne"], "targetProne"),
      push: decodeShovePushProjection(payload["push"]),
    };
  }

  throw new Error(`Unknown Shove outcome projection tag: ${tag}.`);
}

function decodeShovePushProjection(raw: unknown): ShovePushProjection {
  const tag = quintVariantTag(raw, "push");
  if (tag === "ShovePushCompletedProjection") {
    return { tag: "pushed" };
  }
  if (tag === "ShovePushBlockedProjection") {
    const payload = quintVariantRecordValue(raw, tag, "push");
    return {
      tag: "blocked",
      reason: shovePushBlockedReasonField(payload["reason"]),
    };
  }

  throw new Error(`Unknown Shove push projection tag: ${tag}.`);
}

function quintVariantRecordValue(
  raw: unknown,
  tag: string,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag, field);
  if (isReadonlyRecord(value)) {
    return value;
  }
  throw new Error(`Expected Quint ${tag} record payload at ${field}.`);
}

function isReadonlyRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function shovePushBlockedReasonField(raw: unknown): ShovePushBlockedReason {
  const tag = quintVariantTag(raw, "push.reason");
  if (isShovePushBlockedReasonQntTag(tag)) {
    return shovePushBlockedReasonByQntTag[tag];
  }

  throw new Error(`Unknown Shove push blocked reason tag: ${tag}.`);
}

function isShovePushBlockedReasonQntTag(
  tag: string,
): tag is keyof typeof shovePushBlockedReasonByQntTag {
  return Object.hasOwn(shovePushBlockedReasonByQntTag, tag);
}

function replayIndexForScenario(scenario: ShoveOutcomeReplayScenario): number {
  const index = shoveOutcomeScenarios.indexOf(scenario);
  if (index <= 0) {
    throw new Error(`Unexpected Shove outcome replay scenario ${scenario}.`);
  }
  return index;
}
