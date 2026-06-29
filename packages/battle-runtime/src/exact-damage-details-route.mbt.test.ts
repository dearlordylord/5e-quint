// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.EXACT_DAMAGE_ROUTE_BRIDGE

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  decodeReducerRoute,
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
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  decodeRuleCoreComponentRoute,
  ruleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
} from "./rule-core-component-route.ts";

const exactDamageRouteBridgeScenarios = [
  "freshRouteBridge",
  "afterHitAttackDamageRouteBridge",
  "afterHitTimedDamageRouteBridge",
  "weaponDamageRiderDamageRouteBridge",
  "heldWeaponActiveEffectDamageRouteBridge",
  "spellHostedWeaponAttackDamageRouteBridge",
] as const;
type ExactDamageRouteBridgeScenario =
  (typeof exactDamageRouteBridgeScenarios)[number];

const exactDamageBridgeDamageTypes = ["acid", "cold", "fire", "force"] as const;
type ExactDamageBridgeDamageType =
  (typeof exactDamageBridgeDamageTypes)[number];

const exactDamageBridgeSaveSuccessPolicies = [
  "noDamageOnSuccessfulSave",
  "halfDamageOnSuccessfulSave",
] as const;
type ExactDamageBridgeSaveSuccessPolicy =
  (typeof exactDamageBridgeSaveSuccessPolicies)[number];

type ExactDamageRouteBridgeProjection = RuleCoreComponentRoutedProjection & {
  readonly scenario: ExactDamageRouteBridgeScenario;
  readonly route: readonly ReducerRouteEvent[];
  readonly damageType: ExactDamageBridgeDamageType;
  readonly damageAmount: number;
  readonly instanceCount: number;
  readonly damagePerInstance: number;
  readonly baseDamageDice: number;
  readonly rolledDamageDiceCount: number;
  readonly damageDieSize: number;
  readonly critical: boolean;
  readonly successPolicy: ExactDamageBridgeSaveSuccessPolicy;
  readonly savingThrowFailed: boolean;
  readonly targetInitialHp: number;
  readonly targetHp: number;
  readonly damageToHitPoints: number;
  readonly replayIndex: number;
};

const SCENARIO_BY_TAG = {
  FreshRouteBridge: "freshRouteBridge",
  AfterHitAttackDamageRouteBridge: "afterHitAttackDamageRouteBridge",
  AfterHitTimedDamageRouteBridge: "afterHitTimedDamageRouteBridge",
  WeaponDamageRiderDamageRouteBridge: "weaponDamageRiderDamageRouteBridge",
  HeldWeaponActiveEffectDamageRouteBridge:
    "heldWeaponActiveEffectDamageRouteBridge",
  SpellHostedWeaponAttackDamageRouteBridge:
    "spellHostedWeaponAttackDamageRouteBridge",
} as const satisfies Readonly<Record<string, ExactDamageRouteBridgeScenario>>;

const DAMAGE_TYPE_BY_TAG = {
  AcidDamage: "acid",
  ColdDamage: "cold",
  FireDamage: "fire",
  ForceDamage: "force",
} as const satisfies Readonly<Record<string, ExactDamageBridgeDamageType>>;

const SUCCESS_POLICY_BY_TAG = {
  SpellNoDamageOnSuccessfulSave: "noDamageOnSuccessfulSave",
  SpellHalfDamageOnSuccessfulSave: "halfDamageOnSuccessfulSave",
} as const satisfies Readonly<
  Record<string, ExactDamageBridgeSaveSuccessPolicy>
>;

const driverSchema = {
  init: {},
  doAfterHitAttackDamageBridge: {},
  doAfterHitTimedDamageBridge: {},
  doWeaponDamageRiderDamageBridge: {},
  doHeldWeaponActiveEffectDamageBridge: {},
  doSpellHostedWeaponAttackDamageBridge: {},
  step: {},
} as const;

const rolledDiceHole = [{ kind: "rolledDice" }] as const;
const abilityCheckHole = [{ kind: "abilityCheck" }] as const;
const noHoles = [] as const;
const targetInitialHp = 20;
const spellProcedureComponentOwner = "RuleCoreSpellProcedureProfileOwner";
const hitPointDamageComponentOwner = "RuleCoreHitPointDamageOwner";
const replayStepCount = exactDamageRouteBridgeScenarios.length - 1;

const initialProjection: ExactDamageRouteBridgeProjection = bridgeProjection({
  scenario: "freshRouteBridge",
  route: [reducerRouteStartBattle("battleActionEconomy")],
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

const routeByAction = {
  doAfterHitAttackDamageBridge: bridgeProjection({
    scenario: "afterHitAttackDamageRouteBridge",
    route: damageRoute(
      "afterHitDamageRider",
      "battleHitPoint",
      noHoles,
      "battleHitPoint",
    ),
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
  }),
  doAfterHitTimedDamageBridge: bridgeProjection({
    scenario: "afterHitTimedDamageRouteBridge",
    route: damageRoute(
      "afterHitDamageRider",
      "battleActiveEffect",
      abilityCheckHole,
      "battleHitPoint",
    ),
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
    replayIndex: 2,
  }),
  doWeaponDamageRiderDamageBridge: bridgeProjection({
    scenario: "weaponDamageRiderDamageRouteBridge",
    route: damageRoute(
      "weaponDamageRider",
      "battleActiveEffect",
      noHoles,
      "battleHitPoint",
    ),
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
    replayIndex: 3,
  }),
  doHeldWeaponActiveEffectDamageBridge: bridgeProjection({
    scenario: "heldWeaponActiveEffectDamageRouteBridge",
    route: damageRoute(
      "heldWeaponActiveEffect",
      "battleActiveEffect",
      noHoles,
      "battleHitPoint",
    ),
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
    replayIndex: 4,
  }),
  doSpellHostedWeaponAttackDamageBridge: bridgeProjection({
    scenario: "spellHostedWeaponAttackDamageRouteBridge",
    route: damageRoute(
      "spellHostedWeaponAttack",
      "battleHitPoint",
      noHoles,
      "battleHitPoint",
    ),
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
    replayIndex: 5,
  }),
} as const satisfies Readonly<
  Record<
    Exclude<keyof typeof driverSchema, "init" | "step">,
    ExactDamageRouteBridgeProjection
  >
>;

function bridgeProjection(
  input: Omit<ExactDamageRouteBridgeProjection, "componentRoute">,
): ExactDamageRouteBridgeProjection {
  return {
    ...input,
    componentRoute: [
      ...ruleCoreComponentRoute(spellProcedureComponentOwner),
      ...ruleCoreComponentRoute(hitPointDamageComponentOwner),
    ],
  };
}

function damageRoute(
  subject: ReducerRouteSubjectFamily,
  discoverOwner: ReducerRouteOwnerGroup,
  nextHoles: readonly { readonly kind: "abilityCheck" | "rolledDice" }[],
  resolveOwner: ReducerRouteOwnerGroup,
): readonly ReducerRouteEvent[] {
  return [
    reducerRouteStartBattle("battleActionEconomy"),
    reducerRouteDiscoverBattleActs({
      subject,
      holes: rolledDiceHole,
      owner: discoverOwner,
    }),
    reducerRouteResolveBattleSubject({
      subject,
      fill: "rolledDice",
      holes: nextHoles,
      owner: resolveOwner,
    }),
  ];
}

function createExactDamageRouteBridgeDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialProjection;

    const transition = (action: keyof typeof routeByAction): void => {
      state = routeByAction[action];
    };

    return {
      init: () => {
        state = initialProjection;
      },
      doAfterHitAttackDamageBridge: () =>
        transition("doAfterHitAttackDamageBridge"),
      doAfterHitTimedDamageBridge: () =>
        transition("doAfterHitTimedDamageBridge"),
      doWeaponDamageRiderDamageBridge: () =>
        transition("doWeaponDamageRiderDamageBridge"),
      doHeldWeaponActiveEffectDamageBridge: () =>
        transition("doHeldWeaponActiveEffectDamageBridge"),
      doSpellHostedWeaponAttackDamageBridge: () =>
        transition("doSpellHostedWeaponAttackDamageBridge"),
      step: () => {},
      getState: () => state,
    };
  });
}

const exactDamageRouteBridgeStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("exact damage details reducer-route bridge MBT parity", () => {
  it(
    "routes exact damage details through public after-hit and weapon-hosted subjects",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-exact-damage-details.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createExactDamageRouteBridgeDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(replayStepCount),
        stateCheck: exactDamageRouteBridgeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeQuintState(raw: unknown): ExactDamageRouteBridgeProjection {
  const state = quintStateRecord(raw);
  return {
    scenario: scenarioField(quintField(state, "qScenario")),
    route: decodeReducerRoute(quintField(state, "qRoute")),
    componentRoute: decodeRuleCoreComponentRoute(
      quintField(state, "qComponentRoute"),
    ),
    damageType: damageTypeField(quintField(state, "qDamageType")),
    damageAmount: numberFromQuintInt(
      quintField(state, "qDamageAmount"),
      "qDamageAmount",
    ),
    instanceCount: numberFromQuintInt(
      quintField(state, "qInstanceCount"),
      "qInstanceCount",
    ),
    damagePerInstance: numberFromQuintInt(
      quintField(state, "qDamagePerInstance"),
      "qDamagePerInstance",
    ),
    baseDamageDice: numberFromQuintInt(
      quintField(state, "qBaseDamageDice"),
      "qBaseDamageDice",
    ),
    rolledDamageDiceCount: numberFromQuintInt(
      quintField(state, "qRolledDamageDiceCount"),
      "qRolledDamageDiceCount",
    ),
    damageDieSize: numberFromQuintInt(
      quintField(state, "qDamageDieSize"),
      "qDamageDieSize",
    ),
    critical: booleanValue(quintField(state, "qCritical"), "qCritical"),
    successPolicy: successPolicyField(quintField(state, "qSuccessPolicy")),
    savingThrowFailed: booleanValue(
      quintField(state, "qSavingThrowFailed"),
      "qSavingThrowFailed",
    ),
    targetInitialHp: numberFromQuintInt(
      quintField(state, "qTargetInitialHp"),
      "qTargetInitialHp",
    ),
    targetHp: numberFromQuintInt(quintField(state, "qTargetHp"), "qTargetHp"),
    damageToHitPoints: numberFromQuintInt(
      quintField(state, "qDamageToHitPoints"),
      "qDamageToHitPoints",
    ),
    replayIndex: numberFromQuintInt(
      quintField(state, "qReplayIndex"),
      "qReplayIndex",
    ),
  };
}

function compareState(
  runtime: ExactDamageRouteBridgeProjection,
  quint: ExactDamageRouteBridgeProjection,
): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function scenarioField(raw: unknown): ExactDamageRouteBridgeScenario {
  return quintVariantMappedValue(
    raw,
    "qScenario",
    SCENARIO_BY_TAG,
    "exact damage route bridge scenario",
  );
}

function damageTypeField(raw: unknown): ExactDamageBridgeDamageType {
  return quintVariantMappedValue(
    raw,
    "qDamageType",
    DAMAGE_TYPE_BY_TAG,
    "exact damage route bridge damage type",
  );
}

function successPolicyField(
  raw: unknown,
): ExactDamageBridgeSaveSuccessPolicy {
  return quintVariantMappedValue(
    raw,
    "qSuccessPolicy",
    SUCCESS_POLICY_BY_TAG,
    "exact damage route bridge save success policy",
  );
}
