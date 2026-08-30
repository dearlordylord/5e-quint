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
import { Result } from "effect";

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

export type CharacterCreationWorkflowRootIssue =
  | {
      readonly tag: "missingCharacterCreationWorkflowRoot";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly tag: "characterCreationWorkflowRootKindMismatch";
      readonly unitId: UnitRecord["id"];
      readonly expectedKind: "class" | "background" | "species";
      readonly actualKind: UnitRecord["kind"];
    };

export type CharacterCreationWorkflowRootIssues = readonly [
  CharacterCreationWorkflowRootIssue,
  ...CharacterCreationWorkflowRootIssue[],
];

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
}): Result.Result<
  CharacterCreationWorkflowRoots,
  CharacterCreationWorkflowRootIssues
> {
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
  const units = input.unitLibrary.listUnits();
  const unitsById = new Map(units.map((unit) => [unit.id, unit] as const));
  const explicitRootIds = explicitWorkflowRootIds(supportProfile);
  const requiredRootIds = new Set([
    ...supportedClassIds,
    ...supportedBackgroundIds,
    ...supportedSpeciesIds,
    ...explicitRootIds,
  ]);
  const issues = requiredWorkflowRootIssues({
    unitsById,
    requiredRootIds,
    supportedClassIds,
    supportedBackgroundIds,
    supportedSpeciesIds,
  });
  if (issues.length > 0) {
    return Result.fail([issues[0], ...issues.slice(1)]);
  }
  const supportedClassNames = supportedClassNamesFor(units, supportedClassIds);
  const rootIds = new Set<UnitRecord["id"]>();

  for (const unit of units) {
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

  for (const unitId of explicitRootIds) rootIds.add(unitId);

  return Result.succeed({
    horizon: CHARACTER_CREATION_WORKFLOW_HORIZON,
    progressions,
    unitIds: units
      .filter((unit) => rootIds.has(unit.id))
      .map((unit) => unit.id),
  });
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
  units: readonly UnitRecord[],
  supportedClassIds: ReadonlySet<UnitRecord["id"]>,
): ReadonlySet<string> {
  return new Set(
    units
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

function explicitWorkflowRootIds(
  supportProfile: CharacterCreationSupportProfile,
): ReadonlySet<UnitRecord["id"]> {
  const rootIds = new Set<UnitRecord["id"]>();
  for (const choice of supportedLoadoutChoices(supportProfile)) {
    rootIds.add(choice.unitId);
  }
  for (const unitId of supportProfile.purchasableEquipmentUnitIds) {
    rootIds.add(unitId);
  }
  for (const unitId of supportProfile.characterBuildResourceUnitIds) {
    rootIds.add(unitId);
  }
  return rootIds;
}

function requiredWorkflowRootIssues(input: {
  readonly unitsById: ReadonlyMap<UnitRecord["id"], UnitRecord>;
  readonly requiredRootIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedClassIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedBackgroundIds: ReadonlySet<UnitRecord["id"]>;
  readonly supportedSpeciesIds: ReadonlySet<UnitRecord["id"]>;
}): readonly CharacterCreationWorkflowRootIssue[] {
  const issues: CharacterCreationWorkflowRootIssue[] = [];
  for (const unitId of input.requiredRootIds) {
    if (!input.unitsById.has(unitId)) {
      issues.push({ tag: "missingCharacterCreationWorkflowRoot", unitId });
    }
  }
  for (const [expectedKind, unitIds] of [
    ["class", input.supportedClassIds],
    ["background", input.supportedBackgroundIds],
    ["species", input.supportedSpeciesIds],
  ] as const) {
    for (const unitId of unitIds) {
      const unit = input.unitsById.get(unitId);
      if (unit !== undefined && unit.kind !== expectedKind) {
        issues.push({
          tag: "characterCreationWorkflowRootKindMismatch",
          unitId,
          expectedKind,
          actualKind: unit.kind,
        });
      }
    }
  }
  return issues;
}
