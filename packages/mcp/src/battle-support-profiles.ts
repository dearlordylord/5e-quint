import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  battleAttackDamageRiderSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleSaveDamageReplacementSupportForUnit,
  type BattleUnitRef,
  type BattleUnitSupportProfile,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  progressionClassLevels,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

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
const REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILES = [
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
] as const satisfies ReadonlyArray<BattleUnitSupportProfile>;

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<readonly BattleUnitRef[], BattleSupportProfileIssue> {
  const bonusActionHideClassUnitIds = supportedBonusActionHideClassUnitIds(
    build,
    unitLibrary,
  );
  const refs: BattleUnitRef[] = [];
  for (const unitRef of characterBuildUnitRefs(build, unitLibrary)) {
    const profiled = withBattleSupportProfiles(
      unitRef,
      bonusActionHideClassUnitIds,
      unitLibrary,
    );
    if (Either.isLeft(profiled)) return Either.left(profiled.left);
    refs.push(profiled.right);
  }
  return Either.right(refs);
}

export type BattleSupportProfileIssue = {
  readonly tag: "battleSupportProfileIssue";
  readonly message: string;
};

function battleSupportProfileIssue(
  message: string,
): Either.Either<never, BattleSupportProfileIssue> {
  return Either.left({ tag: "battleSupportProfileIssue", message });
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  bonusActionHideClassUnitIds: ReadonlySet<string>,
  unitLibrary: UnitCatalog,
): Either.Either<BattleUnitRef, BattleSupportProfileIssue> {
  const supportProfiles = battleSupportProfilesForUnit(
    unitRef.unitId,
    bonusActionHideClassUnitIds,
    unitLibrary,
  );
  if (Either.isLeft(supportProfiles)) return Either.left(supportProfiles.left);
  return supportProfiles.right.length === 0
    ? Either.right({ unitId: unitRef.unitId })
    : Either.right({
        unitId: unitRef.unitId,
        supportProfiles: supportProfiles.right,
      });
}

function supportedBonusActionHideClassUnitIds(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReadonlySet<string> {
  const rogueLevel = progressionClassLevels(build.progression).rogue;
  if (rogueLevel === undefined || rogueLevel < 2) {
    return new Set();
  }

  return new Set(
    unitLibrary
      .listUnits()
      .filter((unit) => unit.kind === "class" && unit.className === "rogue")
      .map((unit) => unit.id),
  );
}

function battleSupportProfilesForUnit(
  unitId: ReturnType<typeof characterBuildUnitRefs>[number]["unitId"],
  bonusActionHideClassUnitIds: ReadonlySet<string>,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly BattleUnitSupportProfile[],
  BattleSupportProfileIssue
> {
  const supportProfiles: BattleUnitSupportProfile[] = [];
  const unitOption = unitLibrary.getUnit(unitId);
  if (Option.isNone(unitOption)) {
    return battleSupportProfileIssue(
      `Unknown Unit for battle support profile: ${unitId}.`,
    );
  }
  const unit = unitOption.value;

  if (bonusActionHideClassUnitIds.has(unitId)) {
    // Class-feature records for Rogue Cunning Action are not yet present in the
    // widened unit catalog. We assign a support profile to the admitted class
    // advancement record so battle-runtime branches on support profile, not on
    // class-name checks inside reducer discovery/resolution.
    supportProfiles.push(...BONUS_ACTION_HIDE_SUPPORT_PROFILES);
  }

  const criticalRangeSupport = supportedCriticalRangeProfileForUnit(unit);
  if (criticalRangeSupport === "unsupported") {
    return battleSupportProfileIssue(
      `Unsupported battle critical-range Unit hook: ${unit.id}.`,
    );
  }
  if (criticalRangeSupport === "criticalRange19") {
    supportProfiles.push(
      ...WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILES,
    );
  }

  const attackDamageRiderSupport = battleAttackDamageRiderSupportForUnit(unit);
  if (attackDamageRiderSupport === "unsupported") {
    return battleSupportProfileIssue(
      `Unsupported battle attack-damage rider Unit hook: ${unit.id}.`,
    );
  }
  if (attackDamageRiderSupport === "attackDamageRider") {
    supportProfiles.push(...ATTACK_DAMAGE_RIDER_SUPPORT_PROFILES);
  }

  const saveDamageReplacementSupport =
    battleSaveDamageReplacementSupportForUnit(unit);
  if (saveDamageReplacementSupport === "unsupported") {
    return battleSupportProfileIssue(
      `Unsupported battle save-damage replacement Unit hook: ${unit.id}.`,
    );
  }
  if (saveDamageReplacementSupport === "saveDamageReplacement") {
    supportProfiles.push(...SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILES);
  }

  const reactionRollOrDamageReductionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(unit);
  if (reactionRollOrDamageReductionSupport === "unsupported") {
    return battleSupportProfileIssue(
      `Unsupported battle reaction roll or damage reduction Unit hook: ${unit.id}.`,
    );
  }
  if (
    reactionRollOrDamageReductionSupport === "reactionRollOrDamageReduction"
  ) {
    supportProfiles.push(...REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILES);
  }

  return Either.right(supportProfiles);
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
