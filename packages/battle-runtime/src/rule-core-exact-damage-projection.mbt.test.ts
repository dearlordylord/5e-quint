// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintVariantMappedValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  decodeRuleCoreComponentRoute,
  ruleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";

const exactDamageProjectionScenarios = [
  "directInstanceDamageProjection",
  "attackCriticalDamageProjection",
  "saveSuccessHalfDamageProjection",
  "saveSuccessNoDamageProjection",
] as const;
type ExactDamageProjectionScenario =
  (typeof exactDamageProjectionScenarios)[number];

const damageTypes = ["acid", "cold", "fire", "force"] as const;
type DamageType = (typeof damageTypes)[number];

const saveSuccessDamagePolicies = [
  "noDamageOnSuccessfulSave",
  "halfDamageOnSuccessfulSave",
] as const;
type SaveSuccessDamagePolicy = (typeof saveSuccessDamagePolicies)[number];

type Projection = RuleCoreComponentRoutedProjection & {
  readonly scenario: ExactDamageProjectionScenario;
  readonly damageType: DamageType;
  readonly damageAmount: number;
  readonly instanceCount: number;
  readonly damagePerInstance: number;
  readonly baseDamageDice: number;
  readonly rolledDamageDiceCount: number;
  readonly damageDieSize: number;
  readonly critical: boolean;
  readonly successPolicy: SaveSuccessDamagePolicy;
  readonly savingThrowFailed: boolean;
  readonly targetInitialHp: number;
  readonly targetHp: number;
  readonly damageToHitPoints: number;
  readonly replayIndex: number;
};

const SCENARIO_BY_TAG = {
  DirectInstanceDamageProjection: "directInstanceDamageProjection",
  AttackCriticalDamageProjection: "attackCriticalDamageProjection",
  SaveSuccessHalfDamageProjection: "saveSuccessHalfDamageProjection",
  SaveSuccessNoDamageProjection: "saveSuccessNoDamageProjection",
} as const satisfies Readonly<Record<string, ExactDamageProjectionScenario>>;

const DAMAGE_TYPE_BY_TAG = {
  AcidDamage: "acid",
  ColdDamage: "cold",
  FireDamage: "fire",
  ForceDamage: "force",
} as const satisfies Readonly<Record<string, DamageType>>;

const SUCCESS_POLICY_BY_TAG = {
  SpellNoDamageOnSuccessfulSave: "noDamageOnSuccessfulSave",
  SpellHalfDamageOnSuccessfulSave: "halfDamageOnSuccessfulSave",
} as const satisfies Readonly<Record<string, SaveSuccessDamagePolicy>>;

const targetInitialHp = 20;
const spellProcedureComponentOwner = "RuleCoreSpellProcedureProfileOwner";
const hitPointDamageComponentOwner = "RuleCoreHitPointDamageOwner";
const replayStepCount = exactDamageProjectionScenarios.length;

const driverSchema = {
  init: {},
  doDirectInstanceDamage: {},
  doAttackCriticalDamage: {},
  doSaveSuccessHalfDamage: {},
  doSaveSuccessNoDamage: {},
  step: {},
} as const;

const initialProjection: Projection = exactDamageProjection({
  scenario: "directInstanceDamageProjection",
  damageType: "force",
  damageAmount: 0,
  instanceCount: 0,
  damagePerInstance: 0,
  baseDamageDice: 0,
  rolledDamageDiceCount: 0,
  damageDieSize: 0,
  critical: false,
  successPolicy: "noDamageOnSuccessfulSave",
  savingThrowFailed: false,
  targetInitialHp,
  targetHp: targetInitialHp,
  damageToHitPoints: 0,
  replayIndex: 0,
});

const directInstanceDamageProjection: Projection = exactDamageProjection({
  scenario: "directInstanceDamageProjection",
  damageType: "force",
  damageAmount: 12,
  instanceCount: 3,
  damagePerInstance: 4,
  baseDamageDice: 0,
  rolledDamageDiceCount: 0,
  damageDieSize: 0,
  critical: false,
  successPolicy: "noDamageOnSuccessfulSave",
  savingThrowFailed: false,
  targetInitialHp,
  targetHp: 8,
  damageToHitPoints: 12,
  replayIndex: 1,
});

const attackCriticalDamageProjection: Projection = exactDamageProjection({
  scenario: "attackCriticalDamageProjection",
  damageType: "cold",
  damageAmount: 7,
  instanceCount: 0,
  damagePerInstance: 0,
  baseDamageDice: 1,
  rolledDamageDiceCount: 2,
  damageDieSize: 8,
  critical: true,
  successPolicy: "noDamageOnSuccessfulSave",
  savingThrowFailed: false,
  targetInitialHp,
  targetHp: 13,
  damageToHitPoints: 7,
  replayIndex: 2,
});

const saveSuccessHalfDamageProjection: Projection = exactDamageProjection({
  scenario: "saveSuccessHalfDamageProjection",
  damageType: "fire",
  damageAmount: 4,
  instanceCount: 0,
  damagePerInstance: 0,
  baseDamageDice: 0,
  rolledDamageDiceCount: 0,
  damageDieSize: 0,
  critical: false,
  successPolicy: "halfDamageOnSuccessfulSave",
  savingThrowFailed: false,
  targetInitialHp,
  targetHp: 16,
  damageToHitPoints: 4,
  replayIndex: 3,
});

const saveSuccessNoDamageProjection: Projection = exactDamageProjection({
  scenario: "saveSuccessNoDamageProjection",
  damageType: "acid",
  damageAmount: 0,
  instanceCount: 0,
  damagePerInstance: 0,
  baseDamageDice: 0,
  rolledDamageDiceCount: 0,
  damageDieSize: 0,
  critical: false,
  successPolicy: "noDamageOnSuccessfulSave",
  savingThrowFailed: false,
  targetInitialHp,
  targetHp: targetInitialHp,
  damageToHitPoints: 0,
  replayIndex: 4,
});

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    return {
      init: reset,
      doDirectInstanceDamage: () => {
        projection = directInstanceDamageProjection;
      },
      doAttackCriticalDamage: () => {
        projection = attackCriticalDamageProjection;
      },
      doSaveSuccessHalfDamage: () => {
        projection = saveSuccessHalfDamageProjection;
      },
      doSaveSuccessNoDamage: () => {
        projection = saveSuccessNoDamageProjection;
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const exactDamageProjectionStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("rule-core exact damage projection deterministic QNT replay", () => {
  it(
    "replays generic exact damage facts and target HP application",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-exact-damage-projection.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(replayStepCount),
        stateCheck: exactDamageProjectionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function exactDamageProjection(
  input: Omit<Projection, "componentRoute">,
): Projection {
  const spellProjection = withRuleCoreComponentRoute(
    spellProcedureComponentOwner,
    input,
  );
  return {
    ...spellProjection,
    componentRoute: [
      ...spellProjection.componentRoute,
      ...ruleCoreComponentRoute(hitPointDamageComponentOwner),
    ],
  };
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected exact damage projection Quint state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    scenario: scenarioField(state["qScenario"]),
    damageType: damageTypeField(state["qDamageType"]),
    damageAmount: numberFromQuintInt(state["qDamageAmount"], "qDamageAmount"),
    instanceCount: numberFromQuintInt(state["qInstanceCount"], "qInstanceCount"),
    damagePerInstance: numberFromQuintInt(
      state["qDamagePerInstance"],
      "qDamagePerInstance",
    ),
    baseDamageDice: numberFromQuintInt(
      state["qBaseDamageDice"],
      "qBaseDamageDice",
    ),
    rolledDamageDiceCount: numberFromQuintInt(
      state["qRolledDamageDiceCount"],
      "qRolledDamageDiceCount",
    ),
    damageDieSize: numberFromQuintInt(
      state["qDamageDieSize"],
      "qDamageDieSize",
    ),
    critical: booleanValue(state["qCritical"], "qCritical"),
    successPolicy: successPolicyField(state["qSuccessPolicy"]),
    savingThrowFailed: booleanValue(
      state["qSavingThrowFailed"],
      "qSavingThrowFailed",
    ),
    targetInitialHp: numberFromQuintInt(
      state["qTargetInitialHp"],
      "qTargetInitialHp",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    damageToHitPoints: numberFromQuintInt(
      state["qDamageToHitPoints"],
      "qDamageToHitPoints",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareState(runtime: Projection, quint: Projection): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function scenarioField(raw: unknown): ExactDamageProjectionScenario {
  return quintVariantMappedValue(
    raw,
    "qScenario",
    SCENARIO_BY_TAG,
    "exact damage projection scenario",
  );
}

function damageTypeField(raw: unknown): DamageType {
  return quintVariantMappedValue(
    raw,
    "qDamageType",
    DAMAGE_TYPE_BY_TAG,
    "damage type",
  );
}

function successPolicyField(raw: unknown): SaveSuccessDamagePolicy {
  return quintVariantMappedValue(
    raw,
    "qSuccessPolicy",
    SUCCESS_POLICY_BY_TAG,
    "save success damage policy",
  );
}
