// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintList,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  quintVariantValue,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";

const ATTACK_HOST_BY_VARIANT_TAG = {
  HeldWeaponAvailableAttackHost: "heldWeaponAvailableAttackHost",
  SpellProcedureSuppliedWeaponAttackHost:
    "spellProcedureSuppliedWeaponAttackHost",
} as const;
type WeaponHostedAttackHostFact =
  (typeof ATTACK_HOST_BY_VARIANT_TAG)[keyof typeof ATTACK_HOST_BY_VARIANT_TAG];

const COMPONENT_BY_VARIANT_TAG = {
  ComponentWeaponChoiceRequired: "componentWeaponChoiceRequired",
  HeldWeaponAlreadyChosen: "heldWeaponAlreadyChosen",
} as const;
type WeaponHostedComponentFact =
  (typeof COMPONENT_BY_VARIANT_TAG)[keyof typeof COMPONENT_BY_VARIANT_TAG];

const ATTACK_PROFILE_BY_VARIANT_TAG = {
  SpellcastingAbilityAttackProfile: "spellcastingAbilityAttackProfile",
  SpellcastingAbilityDamageProfile: "spellcastingAbilityDamageProfile",
  WeaponDamageDieOverride: "weaponDamageDieOverride",
  DamageTypeChoiceProfile: "damageTypeChoiceProfile",
  ExtraDamageDiceProfile: "extraDamageDiceProfile",
} as const;
type WeaponHostedAttackProfileFact =
  (typeof ATTACK_PROFILE_BY_VARIANT_TAG)[keyof typeof ATTACK_PROFILE_BY_VARIANT_TAG];

const ATTACK_FRONTIER_BY_VARIANT_TAG = {
  TargetChoiceFrontier: "targetChoiceFrontier",
  AttackRollFrontier: "attackRollFrontier",
  DamageRollFrontier: "damageRollFrontier",
  HitPointApplicationFrontier: "hitPointApplicationFrontier",
} as const;
type WeaponHostedAttackFrontierFact =
  (typeof ATTACK_FRONTIER_BY_VARIANT_TAG)[keyof typeof ATTACK_FRONTIER_BY_VARIANT_TAG];

type WeaponHostedCapabilityFact =
  | {
      readonly kind: "attackHost";
      readonly host: WeaponHostedAttackHostFact;
    }
  | {
      readonly kind: "component";
      readonly component: WeaponHostedComponentFact;
    }
  | {
      readonly kind: "attackProfile";
      readonly profile: WeaponHostedAttackProfileFact;
    }
  | {
      readonly kind: "attackFrontier";
      readonly frontier: WeaponHostedAttackFrontierFact;
    };

type WeaponHostedCapabilityProjection = {
  readonly route: readonly ReducerRouteEvent[];
  readonly facts: readonly WeaponHostedCapabilityFact[];
};

const weaponHostedCapabilityDriverSchema = {
  init: {},
  doHeldWeaponHostedAttackCapability: {},
  doSpellHostedWeaponAttackCapability: {},
  doStutterAfterTerminalSurface: {},
  step: {},
} as const;

const START_ROUTE = reducerRouteStartBattle("battleActionEconomy");

const heldWeaponHostedAttackCapabilityFacts = [
  {
    kind: "attackHost",
    host: "heldWeaponAvailableAttackHost",
  },
  {
    kind: "component",
    component: "heldWeaponAlreadyChosen",
  },
  {
    kind: "attackProfile",
    profile: "spellcastingAbilityAttackProfile",
  },
  {
    kind: "attackProfile",
    profile: "spellcastingAbilityDamageProfile",
  },
  {
    kind: "attackProfile",
    profile: "weaponDamageDieOverride",
  },
  {
    kind: "attackProfile",
    profile: "damageTypeChoiceProfile",
  },
  {
    kind: "attackFrontier",
    frontier: "attackRollFrontier",
  },
  {
    kind: "attackFrontier",
    frontier: "damageRollFrontier",
  },
  {
    kind: "attackFrontier",
    frontier: "hitPointApplicationFrontier",
  },
] as const satisfies readonly WeaponHostedCapabilityFact[];

const spellHostedWeaponAttackCapabilityFacts = [
  {
    kind: "attackHost",
    host: "spellProcedureSuppliedWeaponAttackHost",
  },
  {
    kind: "component",
    component: "componentWeaponChoiceRequired",
  },
  {
    kind: "attackProfile",
    profile: "spellcastingAbilityAttackProfile",
  },
  {
    kind: "attackProfile",
    profile: "spellcastingAbilityDamageProfile",
  },
  {
    kind: "attackProfile",
    profile: "damageTypeChoiceProfile",
  },
  {
    kind: "attackProfile",
    profile: "extraDamageDiceProfile",
  },
  {
    kind: "attackFrontier",
    frontier: "targetChoiceFrontier",
  },
  {
    kind: "attackFrontier",
    frontier: "attackRollFrontier",
  },
  {
    kind: "attackFrontier",
    frontier: "damageRollFrontier",
  },
  {
    kind: "attackFrontier",
    frontier: "hitPointApplicationFrontier",
  },
] as const satisfies readonly WeaponHostedCapabilityFact[];

function createWeaponHostedCapabilityRouteDriver() {
  return defineDriver(weaponHostedCapabilityDriverSchema, () => {
    let projection = initialProjection();

    return {
      init: () => {
        projection = initialProjection();
      },
      doHeldWeaponHostedAttackCapability: () => {
        projection = {
          route: heldWeaponHostedAttackCapabilityRoute(),
          facts: heldWeaponHostedAttackCapabilityFacts,
        };
      },
      doSpellHostedWeaponAttackCapability: () => {
        projection = {
          route: spellHostedWeaponAttackCapabilityRoute(),
          facts: spellHostedWeaponAttackCapabilityFacts,
        };
      },
      doStutterAfterTerminalSurface: () => {},
      step: () => {},
      getState: (): WeaponHostedCapabilityProjection => projection,
    };
  });
}

const weaponHostedCapabilityStateCheck = stateCheck(
  normalizeWeaponHostedCapabilityQuintState,
  (
    spec: WeaponHostedCapabilityProjection,
    impl: WeaponHostedCapabilityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("weapon-hosted item attack capability route MBT", () => {
  it(
    "routes generic held-weapon and spell-hosted weapon attack capability facts",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-weapon-hosted-item-attack-capability.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createWeaponHostedCapabilityRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: weaponHostedCapabilityStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialProjection(): WeaponHostedCapabilityProjection {
  return {
    route: [START_ROUTE],
    facts: [],
  };
}

function heldWeaponHostedAttackCapabilityRoute(): readonly ReducerRouteEvent[] {
  return [
    START_ROUTE,
    reducerRouteDiscoverBattleActs({
      subject: "heldWeaponActiveEffect",
      holes: [],
      owner: "battleActionEconomy",
    }),
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "heldWeaponActiveEffect",
      holes: [],
      owner: "battleActiveEffect",
    }),
    reducerRouteDiscoverBattleActs({
      subject: "heldWeaponActiveEffect",
      holes: [{ kind: "attackRoll" }],
      owner: "battleActiveEffect",
    }),
    reducerRouteResolveBattleSubject({
      subject: "heldWeaponActiveEffect",
      fill: "attackRoll",
      holes: [{ kind: "rolledDice" }],
      owner: "battleAttackRoll",
    }),
    reducerRouteDiscoverBattleActs({
      subject: "heldWeaponActiveEffect",
      holes: [{ kind: "rolledDice" }],
      owner: "battleActiveEffect",
    }),
    reducerRouteResolveBattleSubject({
      subject: "heldWeaponActiveEffect",
      fill: "rolledDice",
      holes: [],
      owner: "battleHitPoint",
    }),
  ];
}

function spellHostedWeaponAttackCapabilityRoute(): readonly ReducerRouteEvent[] {
  return [
    START_ROUTE,
    reducerRouteDiscoverBattleActs({
      subject: "spellHostedWeaponAttack",
      holes: [{ kind: "damageTypeChoice" }, { kind: "targetChoice" }],
      owner: "battleActionEconomy",
    }),
    reducerRouteResolveBattleSubject({
      subject: "spellHostedWeaponAttack",
      fill: "damageTypeChoice",
      holes: [{ kind: "targetChoice" }],
      owner: "battleHoleFrontier",
    }),
    reducerRouteDiscoverBattleActs({
      subject: "spellHostedWeaponAttack",
      holes: [{ kind: "targetChoice" }],
      owner: "battleTargetSelection",
    }),
    reducerRouteResolveBattleSubject({
      subject: "spellHostedWeaponAttack",
      fill: "targetChoice",
      holes: [{ kind: "attackRoll" }],
      owner: "battleTargetSelection",
    }),
    reducerRouteDiscoverBattleActs({
      subject: "spellHostedWeaponAttack",
      holes: [{ kind: "attackRoll" }],
      owner: "battleAttackRoll",
    }),
    reducerRouteResolveBattleSubject({
      subject: "spellHostedWeaponAttack",
      fill: "attackRoll",
      holes: [{ kind: "rolledDice" }],
      owner: "battleAttackRoll",
    }),
    reducerRouteDiscoverBattleActs({
      subject: "spellHostedWeaponAttack",
      holes: [{ kind: "rolledDice" }],
      owner: "battleHitPoint",
    }),
    reducerRouteResolveBattleSubject({
      subject: "spellHostedWeaponAttack",
      fill: "rolledDice",
      holes: [],
      owner: "battleHitPoint",
    }),
  ];
}

function normalizeWeaponHostedCapabilityQuintState(
  raw: unknown,
): WeaponHostedCapabilityProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
    facts: decodeWeaponHostedCapabilityFacts(quintField(state, "qFacts")),
  };
}

function decodeWeaponHostedCapabilityFacts(
  raw: unknown,
): readonly WeaponHostedCapabilityFact[] {
  return quintList(raw, "qFacts").map(decodeWeaponHostedCapabilityFact);
}

function decodeWeaponHostedCapabilityFact(
  raw: unknown,
): WeaponHostedCapabilityFact {
  const tag = quintVariantTag(raw, "qFacts[]");
  if (tag === "RouteWeaponHostedAttackHost") {
    const payload = weaponHostedFactPayload(raw, tag);
    return {
      kind: "attackHost",
      host: quintVariantMappedValue(
        quintRecordField(payload, "host"),
        "qFacts[].host",
        ATTACK_HOST_BY_VARIANT_TAG,
        "weapon-hosted attack host",
      ),
    };
  }
  if (tag === "RouteWeaponHostedComponent") {
    const payload = weaponHostedFactPayload(raw, tag);
    return {
      kind: "component",
      component: quintVariantMappedValue(
        quintRecordField(payload, "component"),
        "qFacts[].component",
        COMPONENT_BY_VARIANT_TAG,
        "weapon-hosted component",
      ),
    };
  }
  if (tag === "RouteWeaponHostedAttackProfile") {
    const payload = weaponHostedFactPayload(raw, tag);
    return {
      kind: "attackProfile",
      profile: quintVariantMappedValue(
        quintRecordField(payload, "profile"),
        "qFacts[].profile",
        ATTACK_PROFILE_BY_VARIANT_TAG,
        "weapon-hosted attack profile",
      ),
    };
  }
  if (tag === "RouteWeaponHostedAttackFrontier") {
    const payload = weaponHostedFactPayload(raw, tag);
    return {
      kind: "attackFrontier",
      frontier: quintVariantMappedValue(
        quintRecordField(payload, "frontier"),
        "qFacts[].frontier",
        ATTACK_FRONTIER_BY_VARIANT_TAG,
        "weapon-hosted attack frontier",
      ),
    };
  }

  throw new Error(`Unknown weapon-hosted capability fact: ${tag}.`);
}

function weaponHostedFactPayload(
  raw: unknown,
  tag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag, "qFacts[]");
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Readonly<Record<string, unknown>>;
  }

  throw new Error(`Expected weapon-hosted capability ${tag} payload record.`);
}
