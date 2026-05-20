// KERNEL-COVERAGE: parity-witness BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
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
import type {
  BattleFill,
  BattleSubject,
} from "./battle-runtime-test-support.ts";

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

const shovePushDispositionKinds = ["none", "pushed", "blocked"] as const;
type ShovePushDispositionKind = (typeof shovePushDispositionKinds)[number];
const shovePushBlockedReasons = [
  "none",
  "blocked",
  "noLegalDestination",
] as const;
type ShovePushBlockedReason = (typeof shovePushBlockedReasons)[number];

type ShoveOutcomeProjection = {
  readonly lastScenario: ShoveOutcomeScenario;
  readonly accepted: boolean;
  readonly targetProne: boolean;
  readonly pushEmitted: boolean;
  readonly pushDispositionKind: ShovePushDispositionKind;
  readonly pushBlockedReason: ShovePushBlockedReason;
  readonly pushDistanceFeet: number;
  readonly pushProvokesOpportunityAttacks: boolean;
  readonly replayIndex: number;
};

type ShoveOutcomeValue = Extract<
  BattleFill,
  { readonly kind: "shoveOutcome" }
>["value"];

const initialProjection: ShoveOutcomeProjection = {
  lastScenario: "init",
  accepted: true,
  targetProne: false,
  pushEmitted: false,
  pushDispositionKind: "none",
  pushBlockedReason: "none",
  pushDistanceFeet: 0,
  pushProvokesOpportunityAttacks: false,
  replayIndex: 0,
};

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
  it("replays Shove Prone and push dispositions against battle-runtime reducers", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../rule-core-shove-outcome.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createShoveOutcomeDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: shoveOutcomeReplayStepCount,
      stateCheck: shoveOutcomeStateCheck,
    });
  }, 120_000);
});

function applyScenario(
  scenario: ShoveOutcomeReplayScenario,
): ShoveOutcomeProjection {
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
      shoveOutcomeFill(outcome, shoveOutcomeValues[scenario]()),
    ],
  });
  if (result.tag === "invalid") {
    const targetAfter = result.snapshot.combatants.find(
      (combatant) => combatant.combatantId === goblinId,
    );
    if (targetAfter === undefined) {
      throw new Error("Missing Shove target after invalid resolution.");
    }
    return {
      ...initialProjection,
      lastScenario: scenario,
      accepted: false,
      targetProne: targetAfter.conditions.includes("prone"),
      replayIndex: replayIndexForScenario(scenario),
    };
  }
  if (result.tag !== "resolved") {
    throw new Error(`Expected Shove resolution, got ${result.tag}.`);
  }
  const pushed = result.shovePushes?.[0];
  const targetAfter = result.state.combatants.get(goblinId);
  if (targetAfter === undefined) {
    throw new Error("Missing Shove target after resolution.");
  }
  return {
    lastScenario: scenario,
    accepted: true,
    targetProne: hasCondition(targetAfter.conditions, "prone"),
    pushEmitted: pushed !== undefined,
    pushDispositionKind: pushed?.disposition.kind ?? "none",
    pushBlockedReason:
      pushed?.disposition.kind === "blocked"
        ? pushed.disposition.reason
        : "none",
    pushDistanceFeet:
      pushed === undefined ? 0 : Number(pushed.disposition.distanceFeet),
    pushProvokesOpportunityAttacks:
      pushed?.disposition.provokesOpportunityAttacks ?? false,
    replayIndex: replayIndexForScenario(scenario),
  };
}

function normalizeShoveOutcomeQuintState(raw: unknown): ShoveOutcomeProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Shove outcome state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastScenario: scenarioField(state["qLastScenario"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
    targetProne: booleanField(state["qTargetProne"], "qTargetProne"),
    pushEmitted: booleanField(state["qPushEmitted"], "qPushEmitted"),
    pushDispositionKind: shovePushDispositionKindField(
      state["qPushDispositionKind"],
    ),
    pushBlockedReason: shovePushBlockedReasonField(state["qPushBlockedReason"]),
    pushDistanceFeet: numberFromQuintInt(
      state["qPushDistanceFeet"],
      "qPushDistanceFeet",
    ),
    pushProvokesOpportunityAttacks: booleanField(
      state["qPushProvokesOpportunityAttacks"],
      "qPushProvokesOpportunityAttacks",
    ),
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

function shovePushDispositionKindField(raw: unknown): ShovePushDispositionKind {
  if (typeof raw === "string" && isShovePushDispositionKind(raw)) {
    return raw;
  }
  throw new Error(`Unknown Shove push disposition kind ${String(raw)}.`);
}

function isShovePushDispositionKind(
  raw: string,
): raw is ShovePushDispositionKind {
  return shovePushDispositionKinds.some((kind) => kind === raw);
}

function shovePushBlockedReasonField(raw: unknown): ShovePushBlockedReason {
  if (typeof raw === "string" && isShovePushBlockedReason(raw)) {
    return raw;
  }
  throw new Error(`Unknown Shove push blocked reason ${String(raw)}.`);
}

function isShovePushBlockedReason(raw: string): raw is ShovePushBlockedReason {
  return shovePushBlockedReasons.some((reason) => reason === raw);
}

function replayIndexForScenario(scenario: ShoveOutcomeReplayScenario): number {
  const index = shoveOutcomeScenarios.indexOf(scenario);
  if (index <= 0) {
    throw new Error(`Unexpected Shove outcome replay scenario ${scenario}.`);
  }
  return index;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}
