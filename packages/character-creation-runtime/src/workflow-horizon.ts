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
  const supportedClassIds = new Set<string>(
    progressions.flatMap((progression) => [
      String(startingClassUnitId(progression)),
      ...progression.advancements.map((entry) => String(entry.classUnitId)),
    ]),
  );
  const supportedBackgroundIds = new Set(
    supportedBackgroundUnitIds(supportProfile).map(String),
  );
  const supportedSpeciesIds = new Set(supportedSpeciesUnitIds().map(String));
  const supportedClassNames = new Set(
    input.unitLibrary
      .listUnits()
      .filter(
        (unit): unit is Extract<UnitRecord, { readonly kind: "class" }> =>
          unit.kind === "class" && supportedClassIds.has(String(unit.id)),
      )
      .map((unit) => unit.className),
  );
  const rootIds = new Set<UnitRecord["id"]>();

  for (const unit of input.unitLibrary.listUnits()) {
    if (
      (unit.kind === "class" && supportedClassIds.has(String(unit.id))) ||
      (unit.kind === "background" &&
        supportedBackgroundIds.has(String(unit.id))) ||
      (unit.kind === "species" && supportedSpeciesIds.has(String(unit.id))) ||
      (unit.kind === "class_feature" &&
        unit.acquiredAtLevel <=
          CHARACTER_CREATION_WORKFLOW_HORIZON.maxCharacterLevel &&
        supportedClassNames.has(unit.className)) ||
      unit.kind === "species_trait" ||
      unit.kind === "feat" ||
      unit.kind === "mastery" ||
      unit.kind === "armor" ||
      unit.kind === "shield" ||
      unit.kind === "weapon" ||
      (unit.kind === "spell" && unit.mechanics.level <= 1)
    ) {
      rootIds.add(unit.id);
    }
  }

  // Equipment slots are a discovery boundary in their own right. Keep the
  // selected loadout records even if a future catalog changes their kind
  // family, while retaining canonical catalog order below.
  for (const choice of supportedLoadoutChoices(supportProfile)) {
    rootIds.add(choice.unitId);
  }
  for (const unitId of supportProfile.purchasableEquipmentUnitIds) {
    rootIds.add(unitId);
  }
  for (const unitId of supportProfile.characterBuildResourceUnitIds) {
    rootIds.add(unitId);
  }

  return {
    horizon: CHARACTER_CREATION_WORKFLOW_HORIZON,
    progressions,
    unitIds: input.unitLibrary
      .listUnits()
      .filter((unit) => rootIds.has(unit.id))
      .map((unit) => unit.id),
  };
}
