// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-prepared-spell-access
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  progressionClassUnitIds,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import type {
  ClassLevelPreparedSpellAccessGrant,
  PassiveMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Option } from "effect";

import type { CharacterSheetClassFeaturePreparedSpellAccess } from "./sheet-types.ts";

export function characterSheetClassFeaturePreparedSpellAccessesForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): readonly CharacterSheetClassFeaturePreparedSpellAccess[] {
  const accesses: CharacterSheetClassFeaturePreparedSpellAccess[] = [];
  for (const unitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const classLevel = classLevelForClassFeatureUnit({
      build: input.build,
      unitLibrary: input.unitLibrary,
      featureUnit: unit.value,
    });
    const spellIds = unit.value.mechanics.grants.flatMap((grant) =>
      preparedSpellIdsForClassFeatureGrant(grant, classLevel),
    );
    if (spellIds.length > 0) {
      accesses.push({ sourceUnitId: unit.value.id, spellIds });
    }
  }
  return accesses;
}

function classLevelForClassFeatureUnit(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly featureUnit: Extract<UnitRecord, { readonly kind: "class_feature" }>;
}): number {
  for (const progressionClassUnitId of progressionClassUnitIds(
    input.build.progression,
  )) {
    const classUnit = input.unitLibrary.getUnit(progressionClassUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.featureUnit.className
    ) {
      return classLevelForUnit(input.build.progression, progressionClassUnitId);
    }
  }
  return 0;
}

function preparedSpellIdsForClassFeatureGrant(
  grant: PassiveMechanics["grants"][number],
  classLevel: number,
): readonly UnitRecord["id"][] {
  if (grant.kind === "grant_spell_access" && grant.mode === "prepared") {
    return [grant.spellId];
  }
  if (grant.kind === "grant_class_level_prepared_spell_access") {
    return classLevelPreparedSpellAccessSpellIds(grant, classLevel);
  }
  return [];
}

function classLevelPreparedSpellAccessSpellIds(
  grant: ClassLevelPreparedSpellAccessGrant,
  classLevel: number,
): readonly UnitRecord["id"][] {
  return grant.tiers
    .filter((tier) => tier.minimumClassLevel <= classLevel)
    .flatMap((tier) => tier.spellIds);
}

export function featurePreparedSpellIdsForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return characterSheetClassFeaturePreparedSpellAccessesForBuild({
    build,
    unitLibrary,
  }).flatMap((access) => access.spellIds);
}
