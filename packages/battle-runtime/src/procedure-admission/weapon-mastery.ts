import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";

import {
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
} from "../unit-feature-execution-constants.ts";

export type BattleWeaponMasterySapSupport =
  | typeof WEAPON_MASTERY_SAP_SUPPORT_PROFILE
  | "unsupported"
  | null;
export type BattleWeaponMasteryToppleSupport =
  | typeof WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE
  | "unsupported"
  | null;
export type BattleWeaponMasteryCleaveSupport =
  | typeof WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE
  | "unsupported"
  | null;
export type BattleWeaponMasteryPushSupport =
  | typeof WEAPON_MASTERY_PUSH_SUPPORT_PROFILE
  | "unsupported"
  | null;
export type BattleWeaponMasterySlowSupport =
  | typeof WEAPON_MASTERY_SLOW_SUPPORT_PROFILE
  | "unsupported"
  | null;

export type BattleWeaponMasteryProcedureFacts = Exclude<
  | BattleWeaponMasterySapSupport
  | BattleWeaponMasteryToppleSupport
  | BattleWeaponMasteryCleaveSupport
  | BattleWeaponMasteryPushSupport
  | BattleWeaponMasterySlowSupport,
  "unsupported" | null
>;

const WEAPON_MASTERY_ROOT_MECHANICS_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);

export type WeaponMasteryProcedureAdmissionIssue = {
  readonly tag: "weaponMasteryProcedureAdmissionIssue";
  readonly procedure:
    | BattleWeaponMasteryProcedureFacts
    | "unrecognizedWeaponMastery";
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type AdmittedWeaponMasteryProcedure = {
  readonly binding: "ready";
  readonly facts: BattleWeaponMasteryProcedureFacts;
  readonly evidence: {
    readonly consumed: readonly [UnitMechanicsPath];
    readonly unowned: readonly [];
  };
};

export type WeaponMasteryProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly procedure: AdmittedWeaponMasteryProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<WeaponMasteryProcedureAdmissionIssue>;
    };

export function admitWeaponMasteryProcedure(
  unit: AuthoredUnitSource,
): WeaponMasteryProcedureAdmission {
  const inspection = weaponMasterySupportForUnit(unit);
  if (inspection === null) return { tag: "notBattleOwned" };
  if (inspection.support === "unsupported") {
    return {
      tag: "rejected",
      issues: [
        {
          tag: "weaponMasteryProcedureAdmissionIssue",
          procedure: inspection.procedure,
          mechanicsPath: WEAPON_MASTERY_ROOT_MECHANICS_PATH,
          message:
            "The represented atomic Weapon Mastery procedure is not completely supported by Battle.",
        },
      ],
    };
  }
  return {
    tag: "admitted",
    procedure: {
      binding: "ready",
      facts: inspection.support,
      evidence: {
        consumed: [WEAPON_MASTERY_ROOT_MECHANICS_PATH],
        unowned: [],
      },
    },
  };
}

type WeaponMasterySupportInspection = {
  readonly procedure:
    | BattleWeaponMasteryProcedureFacts
    | "unrecognizedWeaponMastery";
  readonly support: BattleWeaponMasteryProcedureFacts | "unsupported";
};

function inspectedMasterySupport(
  procedure: BattleWeaponMasteryProcedureFacts,
  support: BattleWeaponMasteryProcedureFacts | "unsupported" | null,
): WeaponMasterySupportInspection {
  return { procedure, support: support ?? "unsupported" };
}

function unrecognizedMasterySupport(): WeaponMasterySupportInspection {
  return {
    procedure: "unrecognizedWeaponMastery",
    support: "unsupported",
  };
}

function weaponMasterySupportForUnit(
  unit: AuthoredUnitSource,
): WeaponMasterySupportInspection | null {
  if (unit.kind !== "mastery") {
    return null;
  }
  if (unit.mechanics.family !== "on_hit_trigger") {
    return unrecognizedMasterySupport();
  }
  return Match.value(unit.mechanics).pipe(
    Match.when(
      { effect: { kind: "modify_roll_advantage", mode: "disadvantage" } },
      () =>
        inspectedMasterySupport(
          WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
          battleWeaponMasterySapSupportForUnit(unit),
        ),
    ),
    Match.when(
      { effect: { kind: "modify_roll_advantage", mode: "advantage" } },
      unrecognizedMasterySupport,
    ),
    Match.when({ effect: { kind: "push_creature" } }, () =>
      inspectedMasterySupport(
        WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
        battleWeaponMasteryPushSupportForUnit(unit),
      ),
    ),
    Match.when({ effect: { kind: "save_gate" } }, () =>
      inspectedMasterySupport(
        WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
        battleWeaponMasteryToppleSupportForUnit(unit),
      ),
    ),
    Match.when({ effect: { kind: "speed_delta" } }, () =>
      inspectedMasterySupport(
        WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
        battleWeaponMasterySlowSupportForUnit(unit),
      ),
    ),
    Match.when({ effect: { kind: "grant_weapon_attack" } }, () =>
      inspectedMasterySupport(
        WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
        battleWeaponMasteryCleaveSupportForUnit(unit),
      ),
    ),
    Match.exhaustive,
  );
}

export function battleWeaponMasterySapSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasterySapSupport {
  if (unit.kind !== "mastery") return null;
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "on_hit_trigger" ||
    mechanics.effect.kind !== "modify_roll_advantage"
  ) {
    return null;
  }
  return hasSupportedSapMechanics(mechanics, mechanics.effect)
    ? WEAPON_MASTERY_SAP_SUPPORT_PROFILE
    : "unsupported";
}

export function battleWeaponMasteryPushSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryPushSupport {
  if (unit.kind !== "mastery") return null;
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "on_hit_trigger" ||
    mechanics.effect.kind !== "push_creature"
  ) {
    return null;
  }
  return hasSupportedPushMechanics(mechanics, mechanics.effect)
    ? WEAPON_MASTERY_PUSH_SUPPORT_PROFILE
    : "unsupported";
}

export function battleWeaponMasteryToppleSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryToppleSupport {
  if (unit.kind !== "mastery") return null;
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "on_hit_trigger" ||
    mechanics.effect.kind !== "save_gate"
  ) {
    return null;
  }
  return hasSupportedToppleMechanics(mechanics, mechanics.effect)
    ? WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE
    : "unsupported";
}

export function battleWeaponMasterySlowSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasterySlowSupport {
  if (unit.kind !== "mastery") return null;
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "on_hit_trigger" ||
    mechanics.effect.kind !== "speed_delta"
  ) {
    return null;
  }
  return hasSupportedSlowMechanics(mechanics, mechanics.effect)
    ? WEAPON_MASTERY_SLOW_SUPPORT_PROFILE
    : "unsupported";
}

export function battleWeaponMasteryCleaveSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryCleaveSupport {
  if (unit.kind !== "mastery") return null;
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "on_hit_trigger" ||
    mechanics.effect.kind !== "grant_weapon_attack" ||
    !("usageLimit" in mechanics)
  ) {
    return null;
  }
  return hasSupportedCleaveMechanics(
    mechanics,
    mechanics.effect,
    mechanics.usageLimit,
  )
    ? WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE
    : "unsupported";
}

type OnHitTriggerMasteryMechanics = Extract<
  Extract<AuthoredUnitSource, { readonly kind: "mastery" }>["mechanics"],
  { readonly family: "on_hit_trigger" }
>;

type MasteryEffect<
  Kind extends OnHitTriggerMasteryMechanics["effect"]["kind"],
> = Extract<OnHitTriggerMasteryMechanics["effect"], { readonly kind: Kind }>;

function hasSupportedSapMechanics(
  mechanics: OnHitTriggerMasteryMechanics,
  effect: MasteryEffect<"modify_roll_advantage">,
): boolean {
  return (
    mechanics.trigger.kind === "weapon_hit" &&
    mechanics.optional === false &&
    effect.mode === "disadvantage" &&
    effect.count === 1 &&
    effect.on.length === 1 &&
    effect.on[0] === "attack_roll" &&
    effect.expiresOn.kind === "target_uses_or_turn_start"
  );
}

function hasSupportedPushMechanics(
  mechanics: OnHitTriggerMasteryMechanics,
  effect: MasteryEffect<"push_creature">,
): boolean {
  return (
    mechanics.trigger.kind === "weapon_hit" &&
    mechanics.optional === true &&
    effect.maxDistanceFeet === 10 &&
    effect.direction === "straight_away_from_self" &&
    effect.maximumTargetSize === "large"
  );
}

function hasSupportedToppleMechanics(
  mechanics: OnHitTriggerMasteryMechanics,
  effect: MasteryEffect<"save_gate">,
): boolean {
  return (
    mechanics.trigger.kind === "weapon_hit" &&
    mechanics.optional === true &&
    effect.ability === "con" &&
    hasSupportedToppleDifficultyClass(effect) &&
    hasSupportedToppleOutcome(effect)
  );
}

type ToppleEffect = MasteryEffect<"save_gate">;

function hasSupportedToppleDifficultyClass(effect: ToppleEffect): boolean {
  return effect.dc.kind === "weapon_attack_dc" && effect.dc.base === 8;
}

function hasSupportedToppleOutcome(effect: ToppleEffect): boolean {
  return (
    effect.onFail.kind === "apply_condition" &&
    effect.onFail.condition === "prone" &&
    effect.onSuccess.kind === "none"
  );
}

function hasSupportedSlowMechanics(
  mechanics: OnHitTriggerMasteryMechanics,
  effect: MasteryEffect<"speed_delta">,
): boolean {
  return (
    mechanics.trigger.kind === "weapon_hit_with_damage" &&
    mechanics.optional === true &&
    effect.deltaFeet === -10 &&
    effect.maximumReductionFeet === 10 &&
    effect.expiresOn.kind === "start_of_attacker_next_turn"
  );
}

function hasSupportedCleaveMechanics(
  mechanics: OnHitTriggerMasteryMechanics,
  effect: MasteryEffect<"grant_weapon_attack">,
  usageLimit: CleaveUsageLimit,
): boolean {
  return (
    mechanics.trigger.kind === "weapon_hit_melee_only" &&
    mechanics.optional === true &&
    effect.attackKind === "melee_weapon_attack" &&
    hasSupportedCleaveSecondaryTarget(effect) &&
    hasSupportedCleaveDamage(effect) &&
    usageLimit.kind === "once_per_turn"
  );
}

type CleaveEffect = MasteryEffect<"grant_weapon_attack">;
type CleaveUsageLimit = Extract<
  OnHitTriggerMasteryMechanics,
  { readonly usageLimit: unknown }
>["usageLimit"];

function hasSupportedCleaveSecondaryTarget(effect: CleaveEffect): boolean {
  return (
    effect.secondaryTarget.kind === "adjacent_to_primary" &&
    effect.secondaryTarget.constraint === "within_5ft_and_reach"
  );
}

function hasSupportedCleaveDamage(effect: CleaveEffect): boolean {
  return (
    effect.onHit.kind === "weapon_damage" &&
    effect.onHit.abilityModifier === "negative_only"
  );
}
