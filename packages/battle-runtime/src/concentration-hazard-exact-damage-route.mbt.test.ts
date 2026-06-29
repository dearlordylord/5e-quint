// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  decodeReducerRoute,
  decodeSpatialEffectRouteFacts,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type SpatialEffectRouteFact,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  decodeRuleCoreComponentRoute,
  ruleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
} from "./rule-core-component-route.ts";

const concentrationHazardExactDamageScenarios = [
  "fresh",
  "failedSaveFullHitPointDamage",
  "successfulSaveHalfHitPointDamage",
] as const;
type ConcentrationHazardExactDamageScenario =
  (typeof concentrationHazardExactDamageScenarios)[number];

const concentrationHazardDamageTypes = ["fire", "radiant"] as const;
type ConcentrationHazardDamageType =
  (typeof concentrationHazardDamageTypes)[number];

const concentrationHazardSaveSuccessDamagePolicies = [
  "noDamageOnSuccessfulSave",
  "halfDamageOnSuccessfulSave",
] as const;
type ConcentrationHazardSaveSuccessDamagePolicy =
  (typeof concentrationHazardSaveSuccessDamagePolicies)[number];

type ConcentrationHazardExactDamageFacts = {
  readonly damageType: ConcentrationHazardDamageType;
  readonly successPolicy: ConcentrationHazardSaveSuccessDamagePolicy;
  readonly savingThrowFailed: boolean;
  readonly damageDiceCount: number;
  readonly damageDieSize: number;
  readonly damageRoll: number;
  readonly damageAmount: number;
  readonly targetInitialHp: number;
  readonly targetHp: number;
  readonly damageToHitPoints: number;
};

type ConcentrationHazardExactDamageProjection =
  RuleCoreComponentRoutedProjection & {
    readonly scenario: ConcentrationHazardExactDamageScenario;
    readonly route: readonly ReducerRouteEvent[];
    readonly spatialFacts: readonly SpatialEffectRouteFact[];
    readonly damageFacts: ConcentrationHazardExactDamageFacts;
    readonly replayIndex: number;
  };

const SCENARIO_BY_TAG = {
  FreshConcentrationHazardExactDamageRoute: "fresh",
  FailedSaveFullHitPointDamageRoute: "failedSaveFullHitPointDamage",
  SuccessfulSaveHalfHitPointDamageRoute: "successfulSaveHalfHitPointDamage",
} as const satisfies Readonly<
  Record<string, ConcentrationHazardExactDamageScenario>
>;

const DAMAGE_TYPE_BY_TAG = {
  ConcentrationHazardFireDamage: "fire",
  ConcentrationHazardRadiantDamage: "radiant",
} as const satisfies Readonly<Record<string, ConcentrationHazardDamageType>>;

const SUCCESS_POLICY_BY_TAG = {
  ConcentrationHazardNoDamageOnSuccessfulSave: "noDamageOnSuccessfulSave",
  ConcentrationHazardHalfDamageOnSuccessfulSave: "halfDamageOnSuccessfulSave",
} as const satisfies Readonly<
  Record<string, ConcentrationHazardSaveSuccessDamagePolicy>
>;

const driverSchema = {
  init: {},
  doFailedSaveFullHitPointDamageRoute: {},
  doSuccessfulSaveHalfHitPointDamageRoute: {},
  doStutterAfterTerminalSurface: {},
  step: {},
} as const;

const noHoles = [] as const;
const targetChoiceHoles = [{ kind: "targetChoice" }] as const;
const savingThrowOutcomeHoles = [{ kind: "savingThrowOutcome" }] as const;
const rolledDiceHoles = [{ kind: "rolledDice" }] as const;
const targetInitialHp = 20;
const spellProcedureComponentOwner = "RuleCoreSpellProcedureProfileOwner";
const hitPointDamageComponentOwner = "RuleCoreHitPointDamageOwner";

const concentrationHazardBaseFacts = [
  {
    kind: "battleEffect",
    effect: "areaHazardEffectAdmitted",
  },
  {
    kind: "battleEffect",
    effect: "concentrationBackedEffect",
  },
  {
    kind: "geometry",
    geometry: "areaShapeWitness",
  },
] as const satisfies readonly SpatialEffectRouteFact[];

const saveTriggeredDamageFacts = [
  {
    kind: "geometry",
    geometry: "areaMembershipWitness",
  },
  {
    kind: "hazard",
    hazard: "saveTriggeredDamageTrigger",
  },
] as const satisfies readonly SpatialEffectRouteFact[];

const initialProjection: ConcentrationHazardExactDamageProjection =
  bridgeProjection({
    scenario: "fresh",
    route: [reducerRouteStartBattle("battleActionEconomy")],
    spatialFacts: [],
    damageFacts: {
      damageType: "fire",
      successPolicy: "halfDamageOnSuccessfulSave",
      savingThrowFailed: false,
      damageDiceCount: 0,
      damageDieSize: 0,
      damageRoll: 0,
      damageAmount: 0,
      targetInitialHp,
      targetHp: targetInitialHp,
      damageToHitPoints: 0,
    },
    replayIndex: 0,
  });

const routeByAction = {
  doFailedSaveFullHitPointDamageRoute: bridgeProjection({
    scenario: "failedSaveFullHitPointDamage",
    route: exactDamageRoute(),
    spatialFacts: [
      ...concentrationHazardBaseFacts,
      ...saveTriggeredDamageFacts,
    ],
    damageFacts: {
      damageType: "fire",
      successPolicy: "halfDamageOnSuccessfulSave",
      savingThrowFailed: true,
      damageDiceCount: 2,
      damageDieSize: 6,
      damageRoll: 7,
      damageAmount: 7,
      targetInitialHp,
      targetHp: 13,
      damageToHitPoints: 7,
    },
    replayIndex: 1,
  }),
  doSuccessfulSaveHalfHitPointDamageRoute: bridgeProjection({
    scenario: "successfulSaveHalfHitPointDamage",
    route: exactDamageRoute(),
    spatialFacts: [
      ...concentrationHazardBaseFacts,
      ...saveTriggeredDamageFacts,
    ],
    damageFacts: {
      damageType: "radiant",
      successPolicy: "halfDamageOnSuccessfulSave",
      savingThrowFailed: false,
      damageDiceCount: 2,
      damageDieSize: 10,
      damageRoll: 11,
      damageAmount: 5,
      targetInitialHp,
      targetHp: 15,
      damageToHitPoints: 5,
    },
    replayIndex: 2,
  }),
} as const satisfies Readonly<
  Record<
    Exclude<
      keyof typeof driverSchema,
      "init" | "doStutterAfterTerminalSurface" | "step"
    >,
    ConcentrationHazardExactDamageProjection
  >
>;

function bridgeProjection(
  input: Omit<ConcentrationHazardExactDamageProjection, "componentRoute">,
): ConcentrationHazardExactDamageProjection {
  return {
    ...input,
    componentRoute: [
      ...ruleCoreComponentRoute(spellProcedureComponentOwner),
      ...ruleCoreComponentRoute(hitPointDamageComponentOwner),
    ],
  };
}

function exactDamageRoute(): readonly ReducerRouteEvent[] {
  const subject = "spatialEffect";
  return [
    reducerRouteStartBattle("battleActionEconomy"),
    reducerRouteDiscoverBattleActs({
      subject,
      holes: targetChoiceHoles,
      owner: "battleSpellSlotAndActionEconomy",
    }),
    reducerRouteResolveBattleSubject({
      subject,
      fill: "targetChoice",
      holes: noHoles,
      owner: "battleAreaShape",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject,
      holes: noHoles,
      owner: "battleActiveEffect",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject,
      holes: noHoles,
      owner: "battleConcentration",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject,
      holes: noHoles,
      owner: "battleAreaHazard",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject,
      holes: noHoles,
      owner: "battleCreatureSpaceMovement",
    }),
    reducerRouteDiscoverBattleActs({
      subject,
      holes: savingThrowOutcomeHoles,
      owner: "battleAreaHazard",
    }),
    reducerRouteResolveBattleSubject({
      subject,
      fill: "savingThrowOutcome",
      holes: rolledDiceHoles,
      owner: "battleSavingThrowOutcome",
    }),
    reducerRouteResolveBattleSubject({
      subject,
      fill: "rolledDice",
      holes: noHoles,
      owner: "battleHitPoint",
    }),
  ];
}

function createConcentrationHazardExactDamageRouteDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialProjection;

    return {
      init: () => {
        state = initialProjection;
      },
      doFailedSaveFullHitPointDamageRoute: () => {
        state = routeByAction.doFailedSaveFullHitPointDamageRoute;
      },
      doSuccessfulSaveHalfHitPointDamageRoute: () => {
        state = routeByAction.doSuccessfulSaveHalfHitPointDamageRoute;
      },
      doStutterAfterTerminalSurface: () => {},
      step: () => {},
      getState: () => state,
    };
  });
}

const concentrationHazardExactDamageStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("concentration hazard exact damage reducer-route MBT parity", () => {
  it(
    "routes save-triggered concentration hazard damage to Hit Point ownership",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-concentration-hazard-exact-damage.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createConcentrationHazardExactDamageRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: concentrationHazardExactDamageStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeQuintState(
  raw: unknown,
): ConcentrationHazardExactDamageProjection {
  const state = quintStateRecord(raw);
  return {
    scenario: scenarioField(quintField(state, "qScenario")),
    route: decodeReducerRoute(quintField(state, "qRoute")),
    spatialFacts: decodeSpatialEffectRouteFacts(
      quintField(state, "qSpatialFacts"),
    ),
    componentRoute: decodeRuleCoreComponentRoute(
      quintField(state, "qComponentRoute"),
    ),
    damageFacts: damageFactsField(quintField(state, "qDamageFacts")),
    replayIndex: numberFromQuintInt(
      quintField(state, "qReplayIndex"),
      "qReplayIndex",
    ),
  };
}

function damageFactsField(
  raw: unknown,
): ConcentrationHazardExactDamageFacts {
  const facts = quintStateRecord(raw);
  return {
    damageType: damageTypeField(quintField(facts, "damageType")),
    successPolicy: successPolicyField(quintField(facts, "successPolicy")),
    savingThrowFailed: booleanValue(
      quintField(facts, "savingThrowFailed"),
      "qDamageFacts.savingThrowFailed",
    ),
    damageDiceCount: numberFromQuintInt(
      quintField(facts, "damageDiceCount"),
      "qDamageFacts.damageDiceCount",
    ),
    damageDieSize: numberFromQuintInt(
      quintField(facts, "damageDieSize"),
      "qDamageFacts.damageDieSize",
    ),
    damageRoll: numberFromQuintInt(
      quintField(facts, "damageRoll"),
      "qDamageFacts.damageRoll",
    ),
    damageAmount: numberFromQuintInt(
      quintField(facts, "damageAmount"),
      "qDamageFacts.damageAmount",
    ),
    targetInitialHp: numberFromQuintInt(
      quintField(facts, "targetInitialHp"),
      "qDamageFacts.targetInitialHp",
    ),
    targetHp: numberFromQuintInt(
      quintField(facts, "targetHp"),
      "qDamageFacts.targetHp",
    ),
    damageToHitPoints: numberFromQuintInt(
      quintField(facts, "damageToHitPoints"),
      "qDamageFacts.damageToHitPoints",
    ),
  };
}

function compareState(
  runtime: ConcentrationHazardExactDamageProjection,
  quint: ConcentrationHazardExactDamageProjection,
): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function scenarioField(raw: unknown): ConcentrationHazardExactDamageScenario {
  return quintVariantMappedValue(
    raw,
    "qScenario",
    SCENARIO_BY_TAG,
    "concentration hazard exact damage scenario",
  );
}

function damageTypeField(raw: unknown): ConcentrationHazardDamageType {
  return quintVariantMappedValue(
    raw,
    "qDamageFacts.damageType",
    DAMAGE_TYPE_BY_TAG,
    "concentration hazard damage type",
  );
}

function successPolicyField(
  raw: unknown,
): ConcentrationHazardSaveSuccessDamagePolicy {
  return quintVariantMappedValue(
    raw,
    "qDamageFacts.successPolicy",
    SUCCESS_POLICY_BY_TAG,
    "concentration hazard save success damage policy",
  );
}
