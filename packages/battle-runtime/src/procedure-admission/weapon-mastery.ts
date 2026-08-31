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
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === false &&
    unit.mechanics.effect.kind === "modify_roll_advantage" &&
    unit.mechanics.effect.mode === "disadvantage" &&
    unit.mechanics.effect.count === 1 &&
    unit.mechanics.effect.on.length === 1 &&
    unit.mechanics.effect.on[0] === "attack_roll" &&
    unit.mechanics.effect.expiresOn.kind === "target_uses_or_turn_start";
  if (supported) return WEAPON_MASTERY_SAP_SUPPORT_PROFILE;
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "modify_roll_advantage"
    ? "unsupported"
    : null;
}

export function battleWeaponMasteryPushSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryPushSupport {
  if (unit.kind !== "mastery") return null;
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "push_creature" &&
    unit.mechanics.effect.maxDistanceFeet === 10 &&
    unit.mechanics.effect.direction === "straight_away_from_self" &&
    unit.mechanics.effect.maximumTargetSize === "large";
  if (supported) return WEAPON_MASTERY_PUSH_SUPPORT_PROFILE;
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "push_creature"
    ? "unsupported"
    : null;
}

export function battleWeaponMasteryToppleSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryToppleSupport {
  if (unit.kind !== "mastery") return null;
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "save_gate" &&
    unit.mechanics.effect.ability === "con" &&
    unit.mechanics.effect.dc.kind === "weapon_attack_dc" &&
    unit.mechanics.effect.dc.base === 8 &&
    unit.mechanics.effect.onFail.kind === "apply_condition" &&
    unit.mechanics.effect.onFail.condition === "prone" &&
    unit.mechanics.effect.onSuccess.kind === "none";
  if (supported) return WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE;
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "save_gate"
    ? "unsupported"
    : null;
}

export function battleWeaponMasterySlowSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasterySlowSupport {
  if (unit.kind !== "mastery") return null;
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit_with_damage" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "speed_delta" &&
    unit.mechanics.effect.deltaFeet === -10 &&
    unit.mechanics.effect.maximumReductionFeet === 10 &&
    unit.mechanics.effect.expiresOn.kind === "start_of_attacker_next_turn";
  if (supported) return WEAPON_MASTERY_SLOW_SUPPORT_PROFILE;
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "speed_delta"
    ? "unsupported"
    : null;
}

export function battleWeaponMasteryCleaveSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryCleaveSupport {
  if (unit.kind !== "mastery") return null;
  if (
    unit.mechanics.family !== "on_hit_trigger" ||
    unit.mechanics.effect.kind !== "grant_weapon_attack" ||
    !("usageLimit" in unit.mechanics)
  ) {
    return null;
  }
  return unit.mechanics.trigger.kind === "weapon_hit_melee_only" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.attackKind === "melee_weapon_attack" &&
    unit.mechanics.effect.secondaryTarget.kind === "adjacent_to_primary" &&
    unit.mechanics.effect.secondaryTarget.constraint ===
      "within_5ft_and_reach" &&
    unit.mechanics.effect.onHit.kind === "weapon_damage" &&
    unit.mechanics.effect.onHit.abilityModifier === "negative_only" &&
    unit.mechanics.usageLimit.kind === "once_per_turn"
    ? WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE
    : "unsupported";
}
