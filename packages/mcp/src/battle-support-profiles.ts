import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  type BattleUnitRef,
  type BattleUnitSupportProfile,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";

const BONUS_ACTION_HIDE_SUPPORT_PROFILES = [
  "bonusActionHide",
] as const satisfies ReadonlyArray<BattleUnitSupportProfile>;
const WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILES = [
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
] as const satisfies ReadonlyArray<BattleUnitSupportProfile>;
const ATTACK_DAMAGE_RIDER_SUPPORT_PROFILES = [
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
] as const satisfies ReadonlyArray<BattleUnitSupportProfile>;
const SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILES = [
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
] as const satisfies ReadonlyArray<BattleUnitSupportProfile>;

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): readonly BattleUnitRef[] {
  const bonusActionHideClassUnitIds = supportedBonusActionHideClassUnitIds(
    build,
    unitLibrary,
  );
  return characterBuildUnitRefs(build).map((unitRef) =>
    withBattleSupportProfiles(
      unitRef,
      bonusActionHideClassUnitIds,
      unitLibrary,
    ),
  );
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  bonusActionHideClassUnitIds: ReadonlySet<string>,
  unitLibrary: UnitCatalog,
): BattleUnitRef {
  const supportProfiles = battleSupportProfilesForUnit(
    unitRef.unitId,
    bonusActionHideClassUnitIds,
    unitLibrary,
  );
  return supportProfiles.length === 0
    ? { unitId: unitRef.unitId }
    : {
        unitId: unitRef.unitId,
        supportProfiles,
      };
}

function supportedBonusActionHideClassUnitIds(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReadonlySet<string> {
  const supportedClassUnitIds = new Set<string>();
  for (const entry of build.advancement.entries) {
    const unit = unitLibrary.requireUnit(entry.classUnitId);
    if (
      unit.kind === "class" &&
      unit.className === "rogue" &&
      entry.level >= 2
    ) {
      supportedClassUnitIds.add(entry.classUnitId);
    }
  }
  return supportedClassUnitIds;
}

function battleSupportProfilesForUnit(
  unitId: ReturnType<typeof characterBuildUnitRefs>[number]["unitId"],
  bonusActionHideClassUnitIds: ReadonlySet<string>,
  unitLibrary: UnitCatalog,
): readonly BattleUnitSupportProfile[] {
  const supportProfiles: BattleUnitSupportProfile[] = [];
  const unit = unitLibrary.requireUnit(unitId);

  if (bonusActionHideClassUnitIds.has(unitId)) {
    // Class-feature records for Rogue Cunning Action are not yet present in the
    // widened unit catalog. We assign a support profile to the admitted class
    // advancement record so battle-runtime branches on support profile, not on
    // class-name checks inside reducer discovery/resolution.
    supportProfiles.push(...BONUS_ACTION_HIDE_SUPPORT_PROFILES);
  }

  const criticalRangeSupport = supportedCriticalRangeProfileForUnit(unit);
  if (criticalRangeSupport === "unsupported") {
    throw new Error(`Unsupported battle critical-range Unit hook: ${unit.id}.`);
  }
  if (criticalRangeSupport === "criticalRange19") {
    supportProfiles.push(
      ...WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILES,
    );
  }

  const attackDamageRiderSupport =
    supportedAttackDamageRiderProfileForUnit(unit);
  if (attackDamageRiderSupport === "unsupported") {
    throw new Error(
      `Unsupported battle attack-damage rider Unit hook: ${unit.id}.`,
    );
  }
  if (attackDamageRiderSupport === "attackDamageRider") {
    supportProfiles.push(...ATTACK_DAMAGE_RIDER_SUPPORT_PROFILES);
  }

  const saveDamageReplacementSupport =
    supportedSaveDamageReplacementProfileForUnit(unit);
  if (saveDamageReplacementSupport === "unsupported") {
    throw new Error(
      `Unsupported battle save-damage replacement Unit hook: ${unit.id}.`,
    );
  }
  if (saveDamageReplacementSupport === "saveDamageReplacement") {
    supportProfiles.push(...SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILES);
  }

  return supportProfiles;
}

type CriticalRangeSupportProfile = "criticalRange19" | "unsupported" | null;

function supportedCriticalRangeProfileForUnit(
  unit: UnitRecord,
): CriticalRangeSupportProfile {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }

  const criticalRangeEffects = unit.mechanics.grants.filter(
    (effect) => effect.kind === "modify_crit_range",
  );
  if (criticalRangeEffects.length === 0) {
    return null;
  }

  return criticalRangeEffects.every(
    (effect) =>
      effect.threshold === 19 &&
      effect.attackRollFilter === "weapon_or_unarmed_strike" &&
      effect.weaponFilter === undefined,
  )
    ? "criticalRange19"
    : "unsupported";
}

type AttackDamageRiderSupportProfile =
  | "attackDamageRider"
  | "unsupported"
  | null;

function supportedAttackDamageRiderProfileForUnit(
  unit: UnitRecord,
): AttackDamageRiderSupportProfile {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "on_hit_trigger"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  return mechanics.optional === true &&
    mechanics.trigger.kind === "hit_with_attack_roll" &&
    mechanics.trigger.weaponFilter === "finesse_or_ranged" &&
    mechanics.trigger.eligibility ===
      "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage" &&
    "usageLimit" in mechanics &&
    mechanics.usageLimit.kind === "once_per_turn" &&
    mechanics.effect.kind === "add_attack_damage_dice" &&
    mechanics.effect.damageType === "same_as_attack" &&
    mechanics.effect.dice.kind === "class_level_table"
    ? "attackDamageRider"
    : "unsupported";
}

type SaveDamageReplacementSupportProfile =
  | "saveDamageReplacement"
  | "unsupported"
  | null;

function supportedSaveDamageReplacementProfileForUnit(
  unit: UnitRecord,
): SaveDamageReplacementSupportProfile {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "save_damage_replacement"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  return mechanics.trigger.kind === "saving_throw_damage" &&
    mechanics.trigger.ability === "dex" &&
    mechanics.trigger.successDamage === "half_damage" &&
    mechanics.replacement.onSuccess === "no_damage" &&
    mechanics.replacement.onFail === "half_damage" &&
    mechanics.suppressedBy.length === 1 &&
    mechanics.suppressedBy[0]?.kind === "condition" &&
    mechanics.suppressedBy[0].condition === "incapacitated"
    ? "saveDamageReplacement"
    : "unsupported";
}
