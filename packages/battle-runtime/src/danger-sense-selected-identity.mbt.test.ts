// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense
// UNIT-IDENTITY-REPLAY: B4-CLASS-FEATURE-IDENTITY-BATCH-1 barbarian_danger_sense doProjectDangerSenseDexterityAdvantage doSuppressDangerSenseWhileIncapacitated
import { describe, expect, it } from "vitest";

import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
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

const BARBARIAN_DANGER_SENSE_UNIT_ID = "barbarian_danger_sense";

type DangerSenseProjection = {
  readonly lastResult:
    | "init"
    | "danger-sense-dexterity-advantage"
    | "danger-sense-incapacitated-suppressed";
  readonly sourceUnitId: typeof BARBARIAN_DANGER_SENSE_UNIT_ID | "none";
  readonly dexterityRollModeCount: number;
  readonly constitutionRollModeCount: number;
  readonly suppressed: boolean;
  readonly accepted: boolean;
};

const DANGER_SENSE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  DangerSenseDexterityAdvantage: "danger-sense-dexterity-advantage",
  DangerSenseIncapacitatedSuppressed: "danger-sense-incapacitated-suppressed",
} as const;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Battle Runtime Danger Sense selected identity replay",
  taskId: "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-danger-sense-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DANGER_SENSE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    lastResult: "variant",
    sourceUnitId: "str",
    dexterityRollModeCount: "int",
    constitutionRollModeCount: "int",
    suppressed: "bool",
    accepted: "bool",
  },
  initialProjection: initialProjection(),
  units: [
    {
      unitId: barbarianDangerSenseUnitId,
      procedures: [
        {
          actionName: "doProjectDangerSenseDexterityAdvantage",
          projectionAfter: dangerSenseDexterityAdvantageProjection(),
          discover: () => dangerSenseDexterityAdvantageProjection(),
        },
        {
          actionName: "doSuppressDangerSenseWhileIncapacitated",
          projectionAfter: dangerSenseSuppressedProjection(),
          discover: () => dangerSenseSuppressedProjection(),
        },
      ],
    },
  ],
});

function initialProjection(): DangerSenseProjection {
  return {
    lastResult: "init",
    sourceUnitId: "none",
    dexterityRollModeCount: 0,
    constitutionRollModeCount: 0,
    suppressed: false,
    accepted: false,
  };
}

function dangerSenseDexterityAdvantageProjection(): DangerSenseProjection {
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

function dangerSenseSuppressedProjection(): DangerSenseProjection {
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

type DangerSenseSubstrateRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

const dangerSenseSubstrateRouteDriverSchema = {
  init: {},
  doRouteDangerSenseDexterityAdvantage: {},
  doRouteDangerSenseIncapacitatedSuppression: {},
  step: {},
} as const;

describe("Danger Sense substrate route MBT", () => {
  it(
    "routes passive save roll mode and Incapacitated suppression through generic owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-danger-sense-substrates.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDangerSenseSubstrateRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: dangerSenseSubstrateRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createDangerSenseSubstrateRouteDriver() {
  return defineDriver<
    typeof dangerSenseSubstrateRouteDriverSchema,
    DangerSenseSubstrateRouteProjection
  >(dangerSenseSubstrateRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      route = [reducerRouteStartBattle("battleSavingThrowRollMode")];
    }

    reset();

    return {
      init: reset,
      doRouteDangerSenseDexterityAdvantage: () => {
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "passiveSavingThrowRollMode",
            holes: [{ kind: "savingThrowOutcome" }],
            owner: "battleSavingThrowRollMode",
          }),
          reducerRouteResolveBattleSubject({
            subject: "passiveSavingThrowRollMode",
            fill: "savingThrowOutcome",
            holes: [],
            owner: "battleSavingThrowRollMode",
          }),
        ];
      },
      doRouteDangerSenseIncapacitatedSuppression: () => {
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "passiveSavingThrowRollMode",
            holes: [],
            owner: "battleSavingThrowRollMode",
          }),
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: "passiveSavingThrowRollMode",
            holes: [],
            owner: "battleConditionLifecycle",
          }),
        ];
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

const dangerSenseSubstrateRouteStateCheck = stateCheck(
  normalizeDangerSenseSubstrateRouteQuintState,
  compareDangerSenseSubstrateRouteStates,
);

function normalizeDangerSenseSubstrateRouteQuintState(
  raw: unknown,
): DangerSenseSubstrateRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareDangerSenseSubstrateRouteStates(
  spec: DangerSenseSubstrateRouteProjection,
  impl: DangerSenseSubstrateRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}
