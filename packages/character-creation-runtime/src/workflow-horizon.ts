import { characterClassLevel } from "@dnd/shared/game-facts";
import {
  computeTotalLevel,
  startingClassUnitId,
} from "./character-progression-types.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  supportedBackgroundUnitIds,
  supportedCharacterProgressions,
  supportedLoadoutChoices,
  supportedSpeciesUnitIds,
  type CharacterCreationSupportProfile,
} from "./support-gates.ts";
import type { CharacterProgression } from "./character-progression-types.ts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

/**
 * The public character-creation workflow currently composes characters only
 * through character level two. This is a workflow boundary, not a content or
 * spell-level truncation: retained records remain whole.
 */
export const CHARACTER_CREATION_WORKFLOW_HORIZON = {
  maxCharacterLevel: characterClassLevel(2),
} as const;

export type CharacterCreationWorkflowHorizon =
  typeof CHARACTER_CREATION_WORKFLOW_HORIZON;

export type CharacterCreationWorkflowRoots = {
  readonly horizon: CharacterCreationWorkflowHorizon;
  readonly progressions: readonly CharacterProgression[];
  readonly unitIds: readonly UnitRecord["id"][];
};

/**
 * Derive the progression paths that the production creation reducer can
 * discover inside the level-one/two workflow horizon. Filtering the existing
 * support profile's progression capabilities keeps this operation tied to the
 * one admission owner while retaining the first multiclass gains.
 */
export function characterCreationWorkflowProgressions(
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CharacterProgression[] {
  return supportedCharacterProgressions(supportProfile).filter(
    (progression) =>
      computeTotalLevel(progression) <=
      CHARACTER_CREATION_WORKFLOW_HORIZON.maxCharacterLevel,
  );
}

/**
 * Return every catalog record that production creation discovery can select or
 * consult at levels one and two. The operation intentionally asks the catalog
 * about mechanics/category families (spells, feats, equipment, and species
 * traits) instead of maintaining a second id allowlist.
 */
export function deriveCharacterCreationWorkflowRoots(input: {
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile?: CharacterCreationSupportProfile;
}): CharacterCreationWorkflowRoots {
  const supportProfile =
    input.supportProfile ?? CHARACTER_CREATION_SUPPORT_PROFILE;
  const progressions = characterCreationWorkflowProgressions(supportProfile);
  const supportedClassIds = supportedClassIdsFor(progressions);
  const supportedBackgroundIds = new Set<UnitRecord["id"]>(
    supportedBackgroundUnitIds(supportProfile),
  );
  const supportedSpeciesIds = new Set<UnitRecord["id"]>(
    supportedSpeciesUnitIds(),
  );
  const supportedClassNames = supportedClassNamesFor(
    input.unitLibrary,
    supportedClassIds,
  );
  const rootIds = new Set<UnitRecord["id"]>();

  for (const unit of input.unitLibrary.listUnits()) {
    if (
      isCharacterCreationWorkflowRootUnit(unit, {
        supportedClassIds,
        supportedBackgroundIds,
        supportedSpeciesIds,
        supportedClassNames,
      })
    )
      rootIds.add(unit.id);
  }

  addExplicitWorkflowRootIds(rootIds, supportProfile);

  return {
    horizon: CHARACTER_CREATION_WORKFLOW_HORIZON,
    progressions,
    unitIds: input.unitLibrary
      .listUnits()
      .filter((unit) => rootIds.has(unit.id))
      .map((unit) => unit.id),
  };
}

function supportedClassIdsFor(
  progressions: readonly CharacterProgression[],
): ReadonlySet<UnitRecord["id"]> {
  return new Set<UnitRecord["id"]>(
    progressions.flatMap((progression) => [
      startingClassUnitId(progression),
      ...progression.advancements.map((entry) => entry.classUnitId),
    ]),
  );
}

function supportedClassNamesFor(
  unitLibrary: UnitCatalog,
  supportedClassIds: ReadonlySet<UnitRecord["id"]>,
): ReadonlySet<string> {
  return new Set(
    unitLibrary
      .listUnits()
      .filter(
        (unit): unit is Extract<UnitRecord, { readonly kind: "class" }> =>
          unit.kind === "class" && supportedClassIds.has(unit.id),
      )
      .map((unit) => unit.className),
  );
}

type WorkflowRootUnitContext = {
  readonly supportedClassIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedBackgroundIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedSpeciesIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedClassNames: ReadonlySet<string>;
};

function isCharacterCreationWorkflowRootUnit(
  unit: UnitRecord,
  context: WorkflowRootUnitContext,
): boolean {
  return (
    isSupportedClassRoot(unit, context.supportedClassIds) ||
    isSupportedBackgroundRoot(unit, context.supportedBackgroundIds) ||
    isSupportedSpeciesRoot(unit, context.supportedSpeciesIds) ||
    isSupportedClassFeatureRoot(unit, context.supportedClassNames) ||
    isUnconditionalWorkflowRootUnit(unit) ||
    (unit.kind === "spell" && unit.mechanics.level <= 1)
  );
}

function isSupportedClassRoot(
  unit: UnitRecord,
  supportedClassIds: ReadonlySet<UnitRecord["id"]>,
): boolean {
  return unit.kind === "class" && supportedClassIds.has(unit.id);
}

function isSupportedBackgroundRoot(
  unit: UnitRecord,
  supportedBackgroundIds: ReadonlySet<UnitRecord["id"]>,
): boolean {
  return unit.kind === "background" && supportedBackgroundIds.has(unit.id);
}

function isSupportedSpeciesRoot(
  unit: UnitRecord,
  supportedSpeciesIds: ReadonlySet<UnitRecord["id"]>,
): boolean {
  return unit.kind === "species" && supportedSpeciesIds.has(unit.id);
}

function isSupportedClassFeatureRoot(
  unit: UnitRecord,
  supportedClassNames: ReadonlySet<string>,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.acquiredAtLevel <=
      CHARACTER_CREATION_WORKFLOW_HORIZON.maxCharacterLevel &&
    supportedClassNames.has(unit.className)
  );
}

function isUnconditionalWorkflowRootUnit(unit: UnitRecord): boolean {
  return (
    unit.kind === "species_trait" ||
    unit.kind === "feat" ||
    unit.kind === "mastery" ||
    unit.kind === "armor" ||
    unit.kind === "shield" ||
    unit.kind === "weapon"
  );
}

function addExplicitWorkflowRootIds(
  rootIds: Set<UnitRecord["id"]>,
  supportProfile: CharacterCreationSupportProfile,
): void {
  for (const choice of supportedLoadoutChoices(supportProfile)) {
    rootIds.add(choice.unitId);
  }
  for (const unitId of supportProfile.purchasableEquipmentUnitIds) {
    rootIds.add(unitId);
  }
  for (const unitId of supportProfile.characterBuildResourceUnitIds) {
    rootIds.add(unitId);
  }
}
