// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense
// UNIT-IDENTITY-MBT-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense doProjectDangerSenseDexterityAdvantage doSuppressDangerSenseWhileIncapacitated
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import {
  applyCondition,
  barbarianDangerSenseUnitId,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleId,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  startBattle,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import type { BattleState } from "./unit-profile-admission-test-support.ts";

const TASK_ID = "B4-CLASS-FEATURE-IDENTITY-BATCH-1";
const BARBARIAN_DANGER_SENSE_UNIT_ID = "barbarian_danger_sense";

const dangerSenseSelectedIdentityResults = [
  "init",
  "danger-sense-dexterity-advantage",
  "danger-sense-incapacitated-suppressed",
] as const;
type DangerSenseSelectedIdentityResult =
  (typeof dangerSenseSelectedIdentityResults)[number];
type DangerSenseSelectedIdentityProjection = {
  readonly lastResult: DangerSenseSelectedIdentityResult;
  readonly sourceUnitId: typeof BARBARIAN_DANGER_SENSE_UNIT_ID | "none";
  readonly dexterityRollModeCount: number;
  readonly constitutionRollModeCount: number;
  readonly suppressed: boolean;
  readonly accepted: boolean;
};
type DangerSenseSelectedIdentityDriverAction = Exclude<
  keyof typeof dangerSenseSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly DangerSenseSelectedIdentityDriverAction[];
  readonly expected: DangerSenseSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: typeof TASK_ID;
  readonly unitId: typeof BARBARIAN_DANGER_SENSE_UNIT_ID;
  readonly actions: readonly DangerSenseSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const dangerSenseSelectedIdentityDriverSchema = {
  init: {},
  doProjectDangerSenseDexterityAdvantage: {},
  doSuppressDangerSenseWhileIncapacitated: {},
  step: {},
} as const;

const selectedUnitIdentityReplays = [
  {
    taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
    unitId: "barbarian_danger_sense",
    actions: [
      "doProjectDangerSenseDexterityAdvantage",
      "doSuppressDangerSenseWhileIncapacitated",
    ],
    sequences: [
      {
        name: "selected-danger-sense-projects-dexterity-advantage",
        actions: ["doProjectDangerSenseDexterityAdvantage"],
        expected: dangerSenseDexterityAdvantageProjection(),
      },
      {
        name: "selected-danger-sense-suppresses-while-incapacitated",
        actions: ["doSuppressDangerSenseWhileIncapacitated"],
        expected: dangerSenseSuppressedProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const dangerSenseSelectedIdentityStateCheck = stateCheck(
  normalizeDangerSenseSelectedIdentityQuintState,
  compareDangerSenseSelectedIdentityState,
);

describe("Battle Runtime Danger Sense selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<DangerSenseSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createDangerSenseSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Danger Sense selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Danger Sense selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Battle Runtime Danger Sense selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-danger-sense-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDangerSenseSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: dangerSenseSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createDangerSenseSelectedIdentityDriver() {
  return defineDriver(dangerSenseSelectedIdentityDriverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doProjectDangerSenseDexterityAdvantage: () => {
        projection = dangerSenseDexterityAdvantageProjection();
      },
      doSuppressDangerSenseWhileIncapacitated: () => {
        projection = dangerSenseSuppressedProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): DangerSenseSelectedIdentityProjection {
  return {
    lastResult: "init",
    sourceUnitId: "none",
    dexterityRollModeCount: 0,
    constitutionRollModeCount: 0,
    suppressed: false,
    accepted: false,
  };
}

function dangerSenseDexterityAdvantageProjection(): DangerSenseSelectedIdentityProjection {
  const state = dangerSenseBattle();
  return {
    lastResult: "danger-sense-dexterity-advantage",
    sourceUnitId: BARBARIAN_DANGER_SENSE_UNIT_ID,
    dexterityRollModeCount: savingThrowRollModeProjections(state, "dex").length,
    constitutionRollModeCount: savingThrowRollModeProjections(state, "con")
      .length,
    suppressed: false,
    accepted: true,
  };
}

function dangerSenseSuppressedProjection(): DangerSenseSelectedIdentityProjection {
  const state = incapacitatedDangerSenseBattle();
  return {
    lastResult: "danger-sense-incapacitated-suppressed",
    sourceUnitId: BARBARIAN_DANGER_SENSE_UNIT_ID,
    dexterityRollModeCount: savingThrowRollModeProjections(state, "dex").length,
    constitutionRollModeCount: savingThrowRollModeProjections(state, "con")
      .length,
    suppressed: true,
    accepted: true,
  };
}

function dangerSenseBattle(): BattleState {
  const unit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const result = startBattle({
    battleId: battleId("b4-danger-sense-selected-identity"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Caster",
        initiative: 20,
        side: partySide,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Danger Sense Barbarian",
        initiative: 10,
        side: oppositionSide,
        classLevels: [{ className: "barbarian", level: classLevel(2) }],
        unitFeatures: [{ unit }],
        characterUnitRefs: [unitRef.right],
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function incapacitatedDangerSenseBattle(): BattleState {
  const state = dangerSenseBattle();
  const target = state.combatants.get(spellTargetId);
  if (target === undefined) {
    throw new Error("Expected Danger Sense target combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "incapacitated"),
      ),
    }),
  };
}

function normalizeDangerSenseSelectedIdentityQuintState(
  raw: unknown,
): DangerSenseSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: resultField(state["qLastResult"]),
    sourceUnitId: sourceUnitIdField(state["qSourceUnitId"]),
    dexterityRollModeCount: numberFromQuintInt(
      state["qDexterityRollModeCount"],
      "qDexterityRollModeCount",
    ),
    constitutionRollModeCount: numberFromQuintInt(
      state["qConstitutionRollModeCount"],
      "qConstitutionRollModeCount",
    ),
    suppressed: booleanField(state["qSuppressed"], "qSuppressed"),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
  };
}

function compareDangerSenseSelectedIdentityState(
  runtime: DangerSenseSelectedIdentityProjection,
  quint: DangerSenseSelectedIdentityProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function resultField(raw: unknown): DangerSenseSelectedIdentityResult {
  if (
    raw === "init" ||
    raw === "danger-sense-dexterity-advantage" ||
    raw === "danger-sense-incapacitated-suppressed"
  ) {
    return raw;
  }
  throw new Error(`Unknown Danger Sense selected identity result ${String(raw)}.`);
}

function sourceUnitIdField(
  raw: unknown,
): DangerSenseSelectedIdentityProjection["sourceUnitId"] {
  if (raw === "none" || raw === BARBARIAN_DANGER_SENSE_UNIT_ID) return raw;
  throw new Error(
    `Unknown Danger Sense selected identity Unit id ${String(raw)}.`,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Danger Sense selected identity state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected boolean field ${field}.`);
}
