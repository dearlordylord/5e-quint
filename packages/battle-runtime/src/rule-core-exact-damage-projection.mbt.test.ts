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
  applyBattleHitPointDamage,
  hpDamageProjection,
} from "./battle-reducer/damage-apply.ts";
import {
  characterSeed,
  startBattleRight,
} from "./battle-runtime-test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import {
  battleId,
  combatantId,
  type BattleCreatureState,
  type BattleState,
  type CombatantId,
} from "./index.ts";

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

type DirectDamageFacts = {
  readonly damageType: DamageType;
  readonly instanceCount: number;
  readonly damagePerInstance: number;
};

type AttackDamageFacts = {
  readonly damageType: DamageType;
  readonly naturalD20: number;
  readonly total: number;
  readonly armorClass: number;
  readonly criticalThreshold: 19 | 20;
  readonly baseDamageDice: number;
  readonly rolledDamageDiceCount: number;
  readonly damageDieSize: number;
  readonly damageRoll: number;
};

type SaveDamageFacts = {
  readonly damageType: DamageType;
  readonly successPolicy: SaveSuccessDamagePolicy;
  readonly savingThrowFailed: boolean;
  readonly damageRoll: number;
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
const componentOwner = "RuleCoreSpellProcedureProfileOwner";
const targetId = combatantId("rule-core-exact-damage-target");
const replayStepCount = exactDamageProjectionScenarios.length;

const driverSchema = {
  init: {},
  doDirectInstanceDamage: {},
  doAttackCriticalDamage: {},
  doSaveSuccessHalfDamage: {},
  doSaveSuccessNoDamage: {},
  step: {},
} as const;

const initialProjection: Projection = withRuleCoreComponentRoute(
  componentOwner,
  {
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
  },
);

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    return {
      init: reset,
      doDirectInstanceDamage: () => {
        projection = projectDirectDamage({
          damageType: "force",
          instanceCount: 3,
          damagePerInstance: 4,
        });
      },
      doAttackCriticalDamage: () => {
        projection = projectAttackDamage({
          damageType: "cold",
          naturalD20: 20,
          total: 20,
          armorClass: 13,
          criticalThreshold: 20,
          baseDamageDice: 1,
          rolledDamageDiceCount: 2,
          damageDieSize: 8,
          damageRoll: 7,
        });
      },
      doSaveSuccessHalfDamage: () => {
        projection = projectSaveDamage({
          damageType: "fire",
          successPolicy: "halfDamageOnSuccessfulSave",
          savingThrowFailed: false,
          damageRoll: 9,
        });
      },
      doSaveSuccessNoDamage: () => {
        projection = projectSaveDamage({
          damageType: "acid",
          successPolicy: "noDamageOnSuccessfulSave",
          savingThrowFailed: false,
          damageRoll: 6,
        });
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

function projectDirectDamage(facts: DirectDamageFacts): Projection {
  const damageAmount = facts.instanceCount * facts.damagePerInstance;
  return projectAppliedDamage({
    scenario: "directInstanceDamageProjection",
    damageType: facts.damageType,
    damageAmount,
    instanceCount: facts.instanceCount,
    damagePerInstance: facts.damagePerInstance,
    baseDamageDice: 0,
    rolledDamageDiceCount: 0,
    damageDieSize: 0,
    critical: false,
    successPolicy: "noDamageOnSuccessfulSave",
    savingThrowFailed: false,
  });
}

function projectAttackDamage(facts: AttackDamageFacts): Projection {
  const critical = facts.naturalD20 >= facts.criticalThreshold;
  const expectedRolledDiceCount = critical
    ? facts.baseDamageDice * 2
    : facts.baseDamageDice;
  if (facts.rolledDamageDiceCount !== expectedRolledDiceCount) {
    throw new Error(
      "Attack fixture rolled dice count must match its critical outcome.",
    );
  }
  return projectAppliedDamage({
    scenario: "attackCriticalDamageProjection",
    damageType: facts.damageType,
    damageAmount:
      facts.naturalD20 === 1
        ? 0
        : critical || facts.total >= facts.armorClass
          ? facts.damageRoll
          : 0,
    instanceCount: 0,
    damagePerInstance: 0,
    baseDamageDice: facts.baseDamageDice,
    rolledDamageDiceCount: facts.rolledDamageDiceCount,
    damageDieSize: facts.damageDieSize,
    critical,
    successPolicy: "noDamageOnSuccessfulSave",
    savingThrowFailed: false,
  });
}

function projectSaveDamage(facts: SaveDamageFacts): Projection {
  const damageAmount = facts.savingThrowFailed
    ? facts.damageRoll
    : successDamageAmount(facts.successPolicy, facts.damageRoll);
  const scenario =
    facts.successPolicy === "halfDamageOnSuccessfulSave"
      ? "saveSuccessHalfDamageProjection"
      : "saveSuccessNoDamageProjection";
  return projectAppliedDamage({
    scenario,
    damageType: facts.damageType,
    damageAmount,
    instanceCount: 0,
    damagePerInstance: 0,
    baseDamageDice: 0,
    rolledDamageDiceCount: 0,
    damageDieSize: 0,
    critical: false,
    successPolicy: facts.successPolicy,
    savingThrowFailed: facts.savingThrowFailed,
  });
}

function successDamageAmount(
  policy: SaveSuccessDamagePolicy,
  damageRoll: number,
): number {
  return policy === "halfDamageOnSuccessfulSave"
    ? Math.trunc(Math.max(0, damageRoll) / 2)
    : 0;
}

function projectAppliedDamage(input: {
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
}): Projection {
  const { state, target } = battleWithTarget(input.scenario);
  const afterDamage = applyBattleHitPointDamage({
    state,
    target,
    damageAmount: input.damageAmount,
    deathFailuresAtZeroHp: 1,
  });
  const damaged = requireCombatant(afterDamage, targetId);
  const hpProjection = hpDamageProjection(target, input.damageAmount);
  return withRuleCoreComponentRoute(componentOwner, {
    scenario: input.scenario,
    damageType: input.damageType,
    damageAmount: input.damageAmount,
    instanceCount: input.instanceCount,
    damagePerInstance: input.damagePerInstance,
    baseDamageDice: input.baseDamageDice,
    rolledDamageDiceCount: input.rolledDamageDiceCount,
    damageDieSize: input.damageDieSize,
    critical: input.critical,
    successPolicy: input.successPolicy,
    savingThrowFailed: input.savingThrowFailed,
    targetInitialHp,
    targetHp: Number(damaged.hp),
    damageToHitPoints: hpProjection.hpDamage,
    replayIndex: replayIndexForScenario(input.scenario),
  });
}

function battleWithTarget(scenario: ExactDamageProjectionScenario): {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
} {
  const state = startBattleRight({
    battleId: battleId(`rule-core-exact-damage-${scenario}`),
    combatants: [
      characterSeed({
        combatantId: targetId,
        displayName: "Exact Damage Target",
        initiative: 20,
        currentHp: targetInitialHp,
        maxHp: targetInitialHp,
        tempHp: 0,
        attack: null,
      }),
    ],
  });
  return { state, target: requireCombatant(state, targetId) };
}

function requireCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error(`Missing combatant ${combatantIdValue}.`);
  }
  return combatant;
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

function replayIndexForScenario(
  scenario: ExactDamageProjectionScenario,
): number {
  const index = exactDamageProjectionScenarios.indexOf(scenario);
  if (index < 0) {
    throw new Error(`Unknown exact damage projection scenario ${scenario}.`);
  }
  return index + 1;
}
