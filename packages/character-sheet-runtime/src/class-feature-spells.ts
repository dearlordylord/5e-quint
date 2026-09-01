// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-prepared-spell-access
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  progressionClassUnitIds,
  type CharacterBuild,
  type UnitCatalog,
} from "../../character-creation-runtime/src/consumer-protocol.ts";
import type {
  ClassLevelPreparedSpellAccessGrant,
  PassiveMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import type {
  CharacterSheet,
  CharacterSheetClassFeaturePreparedSpellAccess,
  CharacterSheetClassFeatureSelectedReferenceProjection,
  CharacterSheetClassFeatureSelectedReferenceProjectionRoute,
  CharacterSheetSpellAccess,
} from "./sheet-types.ts";

const CHARACTER_SHEET_CLASS_FEATURE_SELECTED_REFERENCE_ROUTE = [
  {
    kind: "retainCharacterSheetSelectedReferences",
    subject: "selectedReferenceProjection",
    owner: "selectedReference",
  },
  {
    kind: "projectCharacterSheetFacts",
    subject: "selectedReferenceProjection",
    owner: "buildProjection",
  },
] as const satisfies CharacterSheetClassFeatureSelectedReferenceProjectionRoute;

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
    const feature = Option.isSome(unit)
      ? projectCharacterSheetClassFeature(unit.value)
      : Option.none();
    if (
      Option.isNone(feature) ||
      feature.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const classLevel = classLevelForClassFeatureUnit({
      build: input.build,
      unitLibrary: input.unitLibrary,
      featureFacts: feature.value,
    });
    const spellIds = feature.value.mechanics.grants.flatMap((grant) =>
      preparedSpellIdsForClassFeatureGrant(grant, classLevel),
    );
    if (spellIds.length > 0) {
      accesses.push({ sourceUnitId: unitId, spellIds });
    }
  }
  return accesses;
}

export function characterSheetSpellAccessesForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): readonly CharacterSheetSpellAccess[] {
  const classFeatureAccesses =
    characterSheetClassFeaturePreparedSpellAccessesForBuild(input).flatMap(
      (access) => {
        const source = input.unitLibrary.getUnit(access.sourceUnitId);
        const feature = Option.isSome(source)
          ? projectCharacterSheetClassFeature(source.value)
          : Option.none();
        if (Option.isNone(feature)) {
          return [];
        }
        const sourceClassName = feature.value.className;
        const spellcastingSource = input.build.spellcasting?.sources.find(
          ({ sourceUnitId }) => {
            const unit = input.unitLibrary.getUnit(sourceUnitId);
            return (
              Option.isSome(unit) &&
              unit.value.kind === "class" &&
              unit.value.className === sourceClassName
            );
          },
        );
        if (spellcastingSource === undefined) return [];
        return access.spellIds.map(
          (spellId): CharacterSheetSpellAccess => ({
            source: "classFeature",
            sourceUnitId: access.sourceUnitId,
            spellId,
            spellcastingAbility: spellcastingSource.spellcastingAbility,
            preparation: "alwaysPrepared",
          }),
        );
      },
    );
  const magicInitiateAccesses = input.build.magicInitiateSpellAccesses.flatMap(
    (access): readonly CharacterSheetSpellAccess[] => [
      ...access.cantrips.map(
        (spellId): CharacterSheetSpellAccess => ({
          source: "magicInitiate",
          sourceUnitId: access.featUnitId,
          spellId,
          spellcastingAbility: access.spellcastingAbility,
          preparation: "learnedCantrip",
        }),
      ),
      {
        source: "magicInitiate",
        sourceUnitId: access.featUnitId,
        spellId: access.levelOneSpell,
        spellcastingAbility: access.spellcastingAbility,
        preparation: "alwaysPrepared",
      },
    ],
  );
  return [...classFeatureAccesses, ...magicInitiateAccesses];
}

export function characterSheetClassFeatureSelectedReferenceProjection(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): CharacterSheetClassFeatureSelectedReferenceProjection {
  return {
    classFeatureUnitIds: characterBuildFeatureUnitIds(
      input.sheet.build,
      input.unitLibrary,
    ),
    selectedClassChoiceUnitIds: input.sheet.build.features.flatMap(
      (selection) =>
        selection.kind === "selectedClassChoice" ? [selection.unitId] : [],
    ),
    qRoute: CHARACTER_SHEET_CLASS_FEATURE_SELECTED_REFERENCE_ROUTE,
  };
}

function classLevelForClassFeatureUnit(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly featureFacts: CharacterSheetClassFeatureFacts;
}): number {
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: V8 maps the exhausted-scan edge to this loop, but an admitted class feature's owning class must occur in the same build progression. */
  for (const progressionClassUnitId of progressionClassUnitIds(
    input.build.progression,
  )) {
    const classUnit = input.unitLibrary.getUnit(progressionClassUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.featureFacts.className
    ) {
      return classLevelForUnit(input.build.progression, progressionClassUnitId);
    }
  }
  return 0;
  /* v8 ignore stop -- @preserve */
}

function preparedSpellIdsForClassFeatureGrant(
  grant: PassiveMechanics["grants"][number],
  classLevel: number,
): readonly UnitRecord["id"][] {
  if (grant.kind === "grant_spell_access" && grant.mode === "prepared") {
    return [authoredUnitId(grant.spellId)];
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
    .flatMap((tier) => tier.spellIds.map(authoredUnitId));
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
