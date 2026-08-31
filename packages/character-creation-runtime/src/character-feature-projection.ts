import { Match, Option } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import type { UnitReaderResult } from "@dnd/surface/surface/character-creation-readers";
import { druidWildShapeKnownFormRosterFromPhase } from "@dnd/surface/surface/druid-wild-shape-readers";
import {
  unitMechanicsPath,
  type MechanicsGraphNodeRole,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  ClassFeatureRecord,
  FeatRecord,
  SpeciesTraitRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";

type SourceFreeFeatureFacts<Record> = Omit<
  Record,
  "id" | "kind" | "name" | "provenance"
>;

export type CharacterCreationClassFeatureFacts =
  SourceFreeFeatureFacts<ClassFeatureRecord>;
export type CharacterCreationFeatFacts = SourceFreeFeatureFacts<FeatRecord>;
export type CharacterCreationSpeciesTraitFacts =
  SourceFreeFeatureFacts<SpeciesTraitRecord>;

/**
 * Character Creation owns one parse-once boundary for the three feature-root
 * roles it consumes. The outer tag is the decoded Surface role; the facts omit
 * authored record identity and protected expression while retaining typed
 * cross-record references needed by selection and composition.
 */
export type CharacterCreationFeatureProjection =
  | {
      readonly kind: "class_feature";
      readonly facts: CharacterCreationClassFeatureFacts;
    }
  | {
      readonly kind: "feat";
      readonly facts: CharacterCreationFeatFacts;
    }
  | {
      readonly kind: "species_trait";
      readonly facts: CharacterCreationSpeciesTraitFacts;
    };

export const CHARACTER_CREATION_FEATURE_PATH_DISPOSITIONS = [
  "consumed",
  "unowned",
] as const;
export type CharacterCreationFeaturePathDisposition =
  (typeof CHARACTER_CREATION_FEATURE_PATH_DISPOSITIONS)[number];

export const CHARACTER_CREATION_FEATURE_EVIDENCE_BRANCHES = [
  "use-count resource",
  "activation execution",
  "duration projection",
  "known-form projection",
  "form execution and reversion",
  "temporary-hit-point execution",
  "familiar spell-cast procedure",
  "familiar cast activation",
  "familiar component override",
  "familiar dismissal",
  "familiar mode override",
  "spell dependency",
  "feature-resource dependency",
  "point resource",
  "save DC projection",
  "selectable option",
  "option battle execution",
  "point-pool resource",
  "spell-slot creation projection",
  "spell-slot conversion execution",
  "selection lifecycle",
  "option selection facts",
  "option spell execution",
  "point-pool composition reference",
  "spellbook composition source",
  "acquisition spellbook choice",
  "later slot-level spellbook choice",
  "lineage and ability selection",
  "lineage option identity",
  "selected lineage grants",
  "clockwork-device procedure",
] as const;
export type CharacterCreationFeatureEvidenceBranch =
  (typeof CHARACTER_CREATION_FEATURE_EVIDENCE_BRANCHES)[number];

export type CharacterCreationFeaturePathEvidence = {
  readonly mechanicsPath: UnitMechanicsPath;
  readonly disposition: CharacterCreationFeaturePathDisposition;
  readonly branch: CharacterCreationFeatureEvidenceBranch;
};

export type PartialCharacterCreationFeatureProjection = {
  readonly projection: CharacterCreationFeatureProjection;
  readonly evidence: readonly [
    CharacterCreationFeaturePathEvidence,
    ...CharacterCreationFeaturePathEvidence[],
  ];
};

export const PARTIAL_CHARACTER_CREATION_FEATURE_PROJECTION_ISSUE_CODES = [
  "completeFeatureRoot",
  "unsupportedFeatureBranch",
  "unsupportedFeatureRoot",
] as const;
export type PartialCharacterCreationFeatureProjectionIssueCode =
  (typeof PARTIAL_CHARACTER_CREATION_FEATURE_PROJECTION_ISSUE_CODES)[number];

export type PartialCharacterCreationFeatureProjectionIssue = {
  readonly code: PartialCharacterCreationFeatureProjectionIssueCode;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type PartialCharacterCreationFeatureProjectionResult =
  | {
      readonly tag: "readable";
      readonly value: PartialCharacterCreationFeatureProjection;
    }
  | {
      readonly tag: "unreadable";
      readonly issues: readonly [
        PartialCharacterCreationFeatureProjectionIssue,
      ];
    };

/** Project one already-decoded feature root without live character state. */
export function projectCharacterCreationFeature(
  unit: UnitRecord,
): UnitReaderResult<CharacterCreationFeatureProjection> {
  return Match.value(unit).pipe(
    Match.when({ kind: "class_feature" }, (feature) => ({
      tag: "readable" as const,
      value: {
        kind: "class_feature" as const,
        facts: projectCharacterCreationClassFeatureFacts(feature),
      },
    })),
    Match.when({ kind: "feat" }, (feat) => ({
      tag: "readable" as const,
      value: {
        kind: "feat" as const,
        facts: sourceFreeFeatureFacts(feat),
      },
    })),
    Match.when({ kind: "species_trait" }, (trait) => ({
      tag: "readable" as const,
      value: {
        kind: "species_trait" as const,
        facts: sourceFreeFeatureFacts(trait),
      },
    })),
    Match.when({ kind: "spell" }, unsupportedFeatureRoot),
    Match.when({ kind: "class" }, unsupportedFeatureRoot),
    Match.when({ kind: "subclass" }, unsupportedFeatureRoot),
    Match.when({ kind: "background" }, unsupportedFeatureRoot),
    Match.when({ kind: "species" }, unsupportedFeatureRoot),
    Match.when({ kind: "mastery" }, unsupportedFeatureRoot),
    Match.when({ kind: "magic_item" }, unsupportedFeatureRoot),
    Match.when({ kind: "armor" }, unsupportedFeatureRoot),
    Match.when({ kind: "armor_template" }, unsupportedFeatureRoot),
    Match.when({ kind: "shield" }, unsupportedFeatureRoot),
    Match.when({ kind: "shield_template" }, unsupportedFeatureRoot),
    Match.when({ kind: "weapon_template" }, unsupportedFeatureRoot),
    Match.when({ kind: "weapon" }, unsupportedFeatureRoot),
    Match.exhaustive,
  );
}

export function projectCharacterCreationClassFeatureFacts<
  Record extends ClassFeatureRecord,
>(record: Record): SourceFreeFeatureFacts<Record> {
  return sourceFreeFeatureFacts(record);
}

export type CharacterCreationClassFeatureSource = {
  readonly unitId: UnitRecord["id"];
  readonly facts: CharacterCreationClassFeatureFacts;
};

export function projectCharacterCreationClassFeatureSources(
  unitIds: readonly UnitRecord["id"][],
  unitLibrary: UnitCatalog,
): readonly CharacterCreationClassFeatureSource[] {
  return unitIds.flatMap((unitId) => {
    const unit = unitLibrary.getUnit(unitId);
    if (Option.isNone(unit)) return [];
    const projection = projectCharacterCreationFeature(unit.value);
    return projection.tag === "readable" &&
      projection.value.kind === "class_feature"
      ? [{ unitId: unit.value.id, facts: projection.value.facts }]
      : [];
  });
}

/**
 * Emit owner-local path evidence for structurally partial creation roots.
 * Complete roots are rejected instead of receiving an accidental partial
 * claim. Families, branch timing, and graph position—not authored identity—
 * determine every disposition.
 */
export function projectPartialCharacterCreationFeature(
  unit: UnitRecord,
): PartialCharacterCreationFeatureProjectionResult {
  const projected = projectCharacterCreationFeature(unit);
  if (projected.tag !== "readable") {
    return partialFeatureRootIssue(
      "unsupportedFeatureRoot",
      projected.issues[0].message,
    );
  }
  const evidence = partialFeatureEvidence(projected.value);
  if (evidence !== undefined) {
    return {
      tag: "readable",
      value: { projection: projected.value, evidence },
    };
  }
  return partialFamilyCandidate(projected.value)
    ? partialFeatureRootIssue(
        "unsupportedFeatureBranch",
        "This structurally partial feature root contains an unsupported represented branch.",
      )
    : partialFeatureRootIssue(
        "completeFeatureRoot",
        "This feature root has no structurally partial Character Creation projection.",
      );
}

function partialFamilyCandidate(
  projection: CharacterCreationFeatureProjection,
): boolean {
  if (projection.kind === "species_trait") {
    return projection.facts.mechanics.family === "species_lineage_choice";
  }
  if (projection.kind !== "class_feature") return false;
  const mechanics = projection.facts.mechanics;
  return (
    (projection.facts.className === "druid" &&
      (mechanics.family === "activation" ||
        mechanics.family === "druid_wild_companion_spell_cast")) ||
    (projection.facts.className === "monk" &&
      mechanics.family === "resource_container") ||
    (projection.facts.className === "sorcerer" &&
      (mechanics.family === "resource_pool" ||
        mechanics.family === "metamagic_options")) ||
    mechanics.family === "wizard_spellbook_learning"
  );
}

function partialFeatureEvidence(
  projection: CharacterCreationFeatureProjection,
): PartialCharacterCreationFeatureProjection["evidence"] | undefined {
  const mechanics = projection.facts.mechanics;
  if (
    projection.kind === "class_feature" &&
    projection.facts.className === "druid" &&
    mechanics.family === "activation" &&
    mechanics.resource?.kind === "use_count" &&
    mechanics.resetCadence?.kind === "partial_short_full_long" &&
    mechanics.duration?.kind === "timed" &&
    "kind" in mechanics.duration.value &&
    mechanics.duration.value.kind === "half_class_level_rounded_down_hours" &&
    mechanics.phases.length === 1 &&
    druidWildShapeKnownFormRosterFromPhase(mechanics.phases[0]) !== undefined
  ) {
    return [
      evidence("consumed", "resource", undefined, "use-count resource"),
      evidence("unowned", "bonusAction", undefined, "activation execution"),
      evidence("consumed", "generalFact", 1, "duration projection"),
      evidence("consumed", "effect", 1, "known-form projection"),
      nestedEvidence(
        "unowned",
        "effect",
        1,
        "generalFact",
        1,
        "form execution and reversion",
      ),
      evidence("unowned", "effect", 2, "temporary-hit-point execution"),
    ];
  }
  if (
    projection.kind === "class_feature" &&
    mechanics.family === "druid_wild_companion_spell_cast"
  ) {
    return [
      evidence(
        "unowned",
        "procedure",
        undefined,
        "familiar spell-cast procedure",
      ),
      evidence("unowned", "generalFact", 1, "familiar cast activation"),
      evidence("unowned", "generalFact", 2, "familiar component override"),
      evidence("unowned", "generalFact", 3, "familiar dismissal"),
      evidence("unowned", "generalFact", 4, "familiar mode override"),
      evidence("unowned", "dependency", 1, "spell dependency"),
      evidence("unowned", "dependency", 2, "feature-resource dependency"),
    ];
  }
  if (
    projection.kind === "class_feature" &&
    projection.facts.className === "monk" &&
    mechanics.family === "resource_container" &&
    mechanics.resource.kind === "use_count" &&
    mechanics.resetCadence.kind === "short_or_long_rest" &&
    mechanics.effectSaveDc?.kind === "class_feature_ability_save_dc" &&
    mechanics.effectSaveDc.ability === "wis"
  ) {
    return [
      evidence("consumed", "resource", undefined, "point resource"),
      evidence("consumed", "generalFact", 1, "save DC projection"),
      ...mechanics.optionSet.initialOptions.flatMap((_, index) => [
        evidence("consumed", "generalFact", index + 2, "selectable option"),
        evidence("unowned", "effect", index + 1, "option battle execution"),
      ]),
    ];
  }
  if (
    projection.kind === "class_feature" &&
    projection.facts.className === "sorcerer" &&
    mechanics.family === "resource_pool" &&
    mechanics.resource.kind === "point_pool"
  ) {
    return [
      evidence("consumed", "resource", undefined, "point-pool resource"),
      ...mechanics.operations.map((operation, index) =>
        evidence(
          operation.kind === "point_pool_to_spell_slot"
            ? "consumed"
            : "unowned",
          "procedure",
          index + 1,
          operation.kind === "point_pool_to_spell_slot"
            ? "spell-slot creation projection"
            : "spell-slot conversion execution",
        ),
      ),
    ];
  }
  if (
    projection.kind === "class_feature" &&
    mechanics.family === "metamagic_options"
  ) {
    return [
      evidence("consumed", "generalFact", 1, "selection lifecycle"),
      ...mechanics.options.flatMap((_, index) => [
        evidence(
          "consumed",
          "generalFact",
          index + 2,
          "option selection facts",
        ),
        evidence("unowned", "effect", index + 1, "option spell execution"),
      ]),
      evidence("consumed", "dependency", 1, "point-pool composition reference"),
    ];
  }
  if (
    projection.kind === "class_feature" &&
    mechanics.family === "wizard_spellbook_learning"
  ) {
    return [
      evidence("consumed", "reference", 1, "spellbook composition source"),
      ...mechanics.grants.map((grant, index) =>
        evidence(
          grant.timing.kind === "class_feature_acquisition"
            ? "consumed"
            : "unowned",
          "generalFact",
          index + 1,
          grant.timing.kind === "class_feature_acquisition"
            ? "acquisition spellbook choice"
            : "later slot-level spellbook choice",
        ),
      ),
    ];
  }
  if (
    projection.kind === "species_trait" &&
    mechanics.family === "species_lineage_choice"
  ) {
    return [
      evidence("consumed", "generalFact", 1, "lineage and ability selection"),
      ...mechanics.options.flatMap((option, index) => [
        evidence(
          "consumed",
          "generalFact",
          index + 2,
          "lineage option identity",
        ),
        evidence("unowned", "effect", index + 1, "selected lineage grants"),
        ...(!("clockworkDevice" in option)
          ? []
          : [
              evidence("unowned", "procedure", 1, "clockwork-device procedure"),
            ]),
      ]),
    ];
  }
  return undefined;
}

function evidence(
  disposition: CharacterCreationFeaturePathDisposition,
  role: MechanicsGraphNodeRole,
  ordinal: number | undefined,
  branch: CharacterCreationFeatureEvidenceBranch,
): CharacterCreationFeaturePathEvidence {
  return {
    disposition,
    branch,
    mechanicsPath: unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      ordinal === undefined
        ? { kind: "singleton", role }
        : { kind: "occurrence", role, ordinal: PositiveInteger(ordinal) },
    ]),
  };
}

function nestedEvidence(
  disposition: CharacterCreationFeaturePathDisposition,
  outerRole: MechanicsGraphNodeRole,
  outerOrdinal: number,
  innerRole: MechanicsGraphNodeRole,
  innerOrdinal: number,
  branch: CharacterCreationFeatureEvidenceBranch,
): CharacterCreationFeaturePathEvidence {
  return {
    disposition,
    branch,
    mechanicsPath: unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      {
        kind: "occurrence",
        role: outerRole,
        ordinal: PositiveInteger(outerOrdinal),
      },
      {
        kind: "occurrence",
        role: innerRole,
        ordinal: PositiveInteger(innerOrdinal),
      },
    ]),
  };
}

function partialFeatureRootIssue(
  code: PartialCharacterCreationFeatureProjectionIssue["code"],
  message: string,
): PartialCharacterCreationFeatureProjectionResult {
  return {
    tag: "unreadable",
    issues: [
      {
        code,
        mechanicsPath: unitMechanicsPath([
          { kind: "singleton", role: "recordMechanics" },
        ]),
        message,
      },
    ],
  };
}

function sourceFreeFeatureFacts<
  Record extends ClassFeatureRecord | FeatRecord | SpeciesTraitRecord,
>(record: Record): SourceFreeFeatureFacts<Record> {
  const {
    id: _id,
    kind: _kind,
    name: _name,
    provenance: _provenance,
    ...facts
  } = record;
  return facts;
}

function unsupportedFeatureRoot(unit: UnitRecord): UnitReaderResult<never> {
  return {
    tag: "unreadable",
    issues: [
      {
        code: "unsupportedUnitKind",
        message: `Expected a Character Creation feature root, received ${unit.kind}.`,
        unitId: unit.id,
      },
    ],
  };
}
