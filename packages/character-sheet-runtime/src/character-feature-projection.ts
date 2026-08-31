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

type SourceFreeFeatureFacts<Record> = Omit<
  Record,
  "id" | "kind" | "name" | "provenance"
>;

export type CharacterSheetClassFeatureFacts =
  SourceFreeFeatureFacts<ClassFeatureRecord>;
export type CharacterSheetFeatFacts = SourceFreeFeatureFacts<FeatRecord>;
export type CharacterSheetSpeciesTraitFacts =
  SourceFreeFeatureFacts<SpeciesTraitRecord>;

/** Static, source-free feature facts consumed by Character Sheet owners. */
export type CharacterSheetFeatureProjection =
  | {
      readonly kind: "class_feature";
      readonly facts: CharacterSheetClassFeatureFacts;
    }
  | { readonly kind: "feat"; readonly facts: CharacterSheetFeatFacts }
  | {
      readonly kind: "species_trait";
      readonly facts: CharacterSheetSpeciesTraitFacts;
    };

export const CHARACTER_SHEET_FEATURE_PATH_DISPOSITIONS = [
  "consumed",
  "unowned",
] as const;
export type CharacterSheetFeaturePathDisposition =
  (typeof CHARACTER_SHEET_FEATURE_PATH_DISPOSITIONS)[number];

export const CHARACTER_SHEET_FEATURE_EVIDENCE_BRANCHES = [
  "use-count resource",
  "rest reset cadence",
  "activation execution",
  "duration projection",
  "known-form projection",
  "form execution and reversion",
  "temporary-hit-point execution",
  "point resource",
  "save DC projection",
  "selectable option",
  "option battle execution",
  "point-pool resource",
  "spell-slot conversion procedure",
  "spell-slot creation procedure",
  "selection lifecycle",
  "option selection facts",
  "option spell execution",
  "point-pool composition reference",
  "lineage and ability selection",
  "lineage option identity",
  "selected lineage grants",
  "clockwork-device procedure",
  "long-rest trigger",
  "heroic-inspiration grant",
] as const;
export type CharacterSheetFeatureEvidenceBranch =
  (typeof CHARACTER_SHEET_FEATURE_EVIDENCE_BRANCHES)[number];

export type CharacterSheetFeaturePathEvidence = {
  readonly mechanicsPath: UnitMechanicsPath;
  readonly disposition: CharacterSheetFeaturePathDisposition;
  readonly branch: CharacterSheetFeatureEvidenceBranch;
};

export type PartialCharacterSheetFeatureProjection = {
  readonly projection: CharacterSheetFeatureProjection;
  readonly evidence: readonly [
    CharacterSheetFeaturePathEvidence,
    ...CharacterSheetFeaturePathEvidence[],
  ];
};

export const PARTIAL_CHARACTER_SHEET_FEATURE_PROJECTION_ISSUE_CODES = [
  "completeFeatureRoot",
  "unsupportedFeatureBranch",
  "unsupportedFeatureRoot",
] as const;
export type PartialCharacterSheetFeatureProjectionIssueCode =
  (typeof PARTIAL_CHARACTER_SHEET_FEATURE_PROJECTION_ISSUE_CODES)[number];

export type PartialCharacterSheetFeatureProjectionIssue = {
  readonly code: PartialCharacterSheetFeatureProjectionIssueCode;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type PartialCharacterSheetFeatureProjectionResult =
  | {
      readonly tag: "readable";
      readonly value: PartialCharacterSheetFeatureProjection;
    }
  | {
      readonly tag: "unreadable";
      readonly issues: readonly [
        PartialCharacterSheetFeatureProjectionIssue,
        ...PartialCharacterSheetFeatureProjectionIssue[],
      ];
    };

/** Project one already-decoded feature root without live sheet state. */
export function projectCharacterSheetFeature(
  unit: UnitRecord,
): UnitReaderResult<CharacterSheetFeatureProjection> {
  return Match.value(unit).pipe(
    Match.when({ kind: "class_feature" }, (feature) => ({
      tag: "readable" as const,
      value: {
        kind: "class_feature" as const,
        facts: projectCharacterSheetClassFeatureFacts(feature),
      },
    })),
    Match.when({ kind: "feat" }, (feat) => ({
      tag: "readable" as const,
      value: { kind: "feat" as const, facts: sourceFreeFeatureFacts(feat) },
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

export function projectCharacterSheetClassFeatureFacts<
  Record extends ClassFeatureRecord,
>(record: Record): SourceFreeFeatureFacts<Record> {
  return sourceFreeFeatureFacts(record);
}

/** Narrow the owner projection to class-feature facts for production consumers. */
export function projectCharacterSheetClassFeature(
  unit: UnitRecord,
): Option.Option<CharacterSheetClassFeatureFacts> {
  return Match.value(projectCharacterSheetFeature(unit)).pipe(
    Match.when(
      { tag: "readable", value: { kind: "class_feature" } },
      ({ value }) => Option.some(value.facts),
    ),
    Match.orElse(() => Option.none()),
  );
}

/** Narrow the owner projection to species-trait facts for production consumers. */
export function projectCharacterSheetSpeciesTrait(
  unit: UnitRecord,
): Option.Option<CharacterSheetSpeciesTraitFacts> {
  return Match.value(projectCharacterSheetFeature(unit)).pipe(
    Match.when(
      { tag: "readable", value: { kind: "species_trait" } },
      ({ value }) => Option.some(value.facts),
    ),
    Match.orElse(() => Option.none()),
  );
}

/** Emit path evidence only for structurally partial Character Sheet roots. */
export function projectPartialCharacterSheetFeature(
  unit: UnitRecord,
): PartialCharacterSheetFeatureProjectionResult {
  const projected = projectCharacterSheetFeature(unit);
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
  const branchIssues = partialFeatureBranchIssues(projected.value);
  const firstBranchIssue = branchIssues[0];
  if (firstBranchIssue !== undefined) {
    return {
      tag: "unreadable",
      issues: [firstBranchIssue, ...branchIssues.slice(1)],
    };
  }
  return partialFeatureRootIssue(
    "completeFeatureRoot",
    "This feature root has no structurally partial Character Sheet projection.",
  );
}

function partialFeatureEvidence(
  projection: CharacterSheetFeatureProjection,
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  return Match.value(projection).pipe(
    Match.when({ kind: "class_feature" }, ({ facts }) =>
      partialClassFeatureEvidence(facts.mechanics),
    ),
    Match.when({ kind: "species_trait" }, ({ facts }) =>
      partialSpeciesTraitEvidence(facts.mechanics),
    ),
    Match.when({ kind: "feat" }, () => undefined),
    Match.exhaustive,
  );
}

function partialFeatureBranchIssues(
  projection: CharacterSheetFeatureProjection,
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  return Match.value(projection).pipe(
    Match.when({ kind: "class_feature" }, ({ facts }) =>
      partialClassFeatureBranchIssues(facts.mechanics),
    ),
    Match.when({ kind: "species_trait" }, ({ facts }) =>
      partialSpeciesTraitBranchIssues(facts.mechanics),
    ),
    Match.when({ kind: "feat" }, () => []),
    Match.exhaustive,
  );
}

function partialClassFeatureEvidence(
  mechanics: CharacterSheetClassFeatureFacts["mechanics"],
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, partialWildShapeEvidence),
    Match.when({ family: "resource_container" }, partialMonkFocusEvidence),
    Match.when({ family: "resource_pool" }, partialFontOfMagicEvidence),
    Match.when({ family: "metamagic_options" }, metamagicEvidence),
    Match.orElse(() => undefined),
  );
}

function partialSpeciesTraitEvidence(
  mechanics: CharacterSheetSpeciesTraitFacts["mechanics"],
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  return Match.value(mechanics).pipe(
    Match.when({ family: "species_lineage_choice" }, lineageEvidence),
    Match.when(
      { family: "rest_triggered_heroic_inspiration" },
      partialHeroicInspirationEvidence,
    ),
    Match.orElse(() => undefined),
  );
}

function partialClassFeatureBranchIssues(
  mechanics: CharacterSheetClassFeatureFacts["mechanics"],
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (value) =>
      hasWildShapeSignature(value) ? wildShapeBranchIssues(value) : [],
    ),
    Match.when({ family: "resource_container" }, (value) =>
      hasMonkFocusSignature(value) ? monkFocusBranchIssues(value) : [],
    ),
    Match.when({ family: "resource_pool" }, fontOfMagicBranchIssues),
    Match.orElse(() => []),
  );
}

function partialSpeciesTraitBranchIssues(
  mechanics: CharacterSheetSpeciesTraitFacts["mechanics"],
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  return Match.value(mechanics).pipe(
    Match.when(
      { family: "rest_triggered_heroic_inspiration" },
      heroicInspirationBranchIssues,
    ),
    Match.orElse(() => []),
  );
}

function partialWildShapeEvidence(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  if (!hasWildShapeSignature(mechanics)) return undefined;
  if (wildShapeBranchIssues(mechanics).length > 0) return undefined;
  return [
    evidence("consumed", "resource", undefined, "use-count resource"),
    evidence("consumed", "generalFact", 1, "rest reset cadence"),
    evidence("unowned", "bonusAction", undefined, "activation execution"),
    evidence("consumed", "generalFact", 2, "duration projection"),
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

function partialMonkFocusEvidence(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_container" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  if (!hasMonkFocusSignature(mechanics)) return undefined;
  if (monkFocusBranchIssues(mechanics).length > 0) return undefined;
  return [
    evidence("consumed", "resource", undefined, "point resource"),
    evidence("consumed", "generalFact", 1, "rest reset cadence"),
    evidence("consumed", "generalFact", 2, "save DC projection"),
    ...mechanics.optionSet.initialOptions.flatMap((_, index) => [
      evidence("consumed", "generalFact", index + 3, "selectable option"),
      evidence("unowned", "effect", index + 1, "option battle execution"),
    ]),
  ];
}

function partialFontOfMagicEvidence(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_pool" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  if (fontOfMagicBranchIssues(mechanics).length > 0) return undefined;
  return [
    evidence("consumed", "resource", undefined, "point-pool resource"),
    evidence("consumed", "generalFact", 1, "rest reset cadence"),
    ...mechanics.operations.map((operation, index) =>
      evidence(
        "consumed",
        "procedure",
        index + 1,
        operation.kind === "spell_slot_to_point_pool"
          ? "spell-slot conversion procedure"
          : "spell-slot creation procedure",
      ),
    ),
  ];
}

function metamagicEvidence(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "metamagic_options" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] {
  return [
    evidence("consumed", "generalFact", 1, "selection lifecycle"),
    ...mechanics.options.flatMap((_, index) => [
      evidence("consumed", "generalFact", index + 2, "option selection facts"),
      evidence("unowned", "effect", index + 1, "option spell execution"),
    ]),
    evidence("consumed", "dependency", 1, "point-pool composition reference"),
  ];
}

function lineageEvidence(
  mechanics: Extract<
    SpeciesTraitRecord["mechanics"],
    { readonly family: "species_lineage_choice" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] {
  return [
    evidence("unowned", "generalFact", 1, "lineage and ability selection"),
    ...mechanics.options.flatMap((option, index) => [
      evidence("consumed", "generalFact", index + 2, "lineage option identity"),
      evidence("consumed", "effect", index + 1, "selected lineage grants"),
      ...(!("clockworkDevice" in option)
        ? []
        : [evidence("unowned", "procedure", 1, "clockwork-device procedure")]),
    ]),
  ];
}

function partialHeroicInspirationEvidence(
  mechanics: Extract<
    SpeciesTraitRecord["mechanics"],
    { readonly family: "rest_triggered_heroic_inspiration" }
  >,
): PartialCharacterSheetFeatureProjection["evidence"] | undefined {
  if (heroicInspirationBranchIssues(mechanics).length > 0) return undefined;
  return [
    evidence("consumed", "generalFact", 1, "long-rest trigger"),
    evidence("consumed", "effect", 1, "heroic-inspiration grant"),
  ];
}

function hasWildShapeSignature(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  return (
    mechanics.resetCadence?.kind === "partial_short_full_long" ||
    (mechanics.duration?.kind === "timed" &&
      "kind" in mechanics.duration.value &&
      mechanics.duration.value.kind ===
        "half_class_level_rounded_down_hours") ||
    mechanics.phases.some(
      (phase) => druidWildShapeKnownFormRosterFromPhase(phase) !== undefined,
    )
  );
}

function hasMonkFocusSignature(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_container" }
  >,
): boolean {
  return (
    (mechanics.effectSaveDc?.kind === "class_feature_ability_save_dc" &&
      mechanics.effectSaveDc.ability === "wis") ||
    mechanics.optionSet.initialOptions.some(
      (option) => "battleExecution" in option,
    )
  );
}

function wildShapeBranchIssues(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  const issues: PartialCharacterSheetFeatureProjectionIssue[] = [];
  if (!hasWildShapeResource(mechanics))
    issues.push(
      branchIssue(
        "resource",
        undefined,
        "Wild Shape requires its threshold-tier use-count resource.",
      ),
    );
  if (!hasWildShapeResetCadence(mechanics))
    issues.push(
      branchIssue(
        "generalFact",
        1,
        "Wild Shape requires one-use Short Rest and full Long Rest recovery.",
      ),
    );
  if (!hasWildShapeDuration(mechanics))
    issues.push(
      branchIssue(
        "generalFact",
        2,
        "Wild Shape requires its class-level duration projection.",
      ),
    );
  if (!hasWildShapeActivationCost(mechanics))
    issues.push(
      branchIssue(
        "bonusAction",
        undefined,
        "Wild Shape requires its represented Bonus Action branch.",
      ),
    );
  if (!hasWildShapeKnownFormEffect(mechanics))
    issues.push(
      branchIssue(
        "effect",
        1,
        "Wild Shape requires one supported self-attached known-form transformation.",
      ),
    );
  if (!hasWildShapeTemporaryHitPointEffect(mechanics))
    issues.push(
      branchIssue(
        "effect",
        2,
        "Wild Shape requires its represented Temporary Hit Point branch.",
      ),
    );
  return issues;
}

function hasWildShapeResource(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  return (
    mechanics.resource?.kind === "use_count" &&
    mechanics.resource.cap.kind === "threshold_tiers"
  );
}

function hasWildShapeResetCadence(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  return (
    mechanics.resetCadence?.kind === "partial_short_full_long" &&
    mechanics.resetCadence.shortRestRefill === 1
  );
}

function hasWildShapeDuration(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  return (
    mechanics.duration?.kind === "timed" &&
    "kind" in mechanics.duration.value &&
    mechanics.duration.value.kind === "half_class_level_rounded_down_hours"
  );
}

function hasWildShapeActivationCost(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  return mechanics.activationCost?.kind === "bonus_action";
}

function hasWildShapeKnownFormEffect(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  const phase = singleDirectSelfActivationPhase(mechanics);
  if (phase === undefined) return false;
  if (phase.effects === undefined) return false;
  if (phase.effects.length !== 2) return false;
  if (phase.effects[0]?.kind !== "transform_target") return false;
  return druidWildShapeKnownFormRosterFromPhase(phase) !== undefined;
}

function singleDirectSelfActivationPhase(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
):
  | Extract<(typeof mechanics.phases)[number], { readonly kind: "direct" }>
  | undefined {
  if (mechanics.phases.length !== 1) return undefined;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return undefined;
  return phase.attachment.kind === "self" ? phase : undefined;
}

function hasWildShapeTemporaryHitPointEffect(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >,
): boolean {
  const phase = mechanics.phases[0];
  return (
    phase?.kind === "direct" && phase.effects?.[1]?.kind === "grant_temp_hp"
  );
}

function monkFocusBranchIssues(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_container" }
  >,
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  const issues: PartialCharacterSheetFeatureProjectionIssue[] = [];
  if (mechanics.resource.kind !== "use_count")
    issues.push(
      branchIssue(
        "resource",
        undefined,
        "Monk's Focus requires a use-count point resource.",
      ),
    );
  if (mechanics.resetCadence.kind !== "short_or_long_rest")
    issues.push(
      branchIssue(
        "generalFact",
        1,
        "Monk's Focus requires Short or Long Rest recovery.",
      ),
    );
  if (
    mechanics.effectSaveDc?.kind !== "class_feature_ability_save_dc" ||
    mechanics.effectSaveDc.ability !== "wis"
  )
    issues.push(
      branchIssue(
        "generalFact",
        2,
        "Monk's Focus requires its Wisdom save DC projection.",
      ),
    );
  mechanics.optionSet.initialOptions.forEach((option, index) => {
    if (!("battleExecution" in option))
      issues.push(
        branchIssue(
          "effect",
          index + 1,
          "Each Monk's Focus option requires its represented battle execution branch.",
        ),
      );
  });
  return issues;
}

function fontOfMagicBranchIssues(
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "resource_pool" }
  >,
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  const issues: PartialCharacterSheetFeatureProjectionIssue[] = [];
  if (mechanics.resource.kind !== "point_pool")
    issues.push(
      branchIssue(
        "resource",
        undefined,
        "Font of Magic requires its point-pool resource.",
      ),
    );
  if (mechanics.resetCadence.kind !== "long_rest")
    issues.push(
      branchIssue(
        "generalFact",
        1,
        "Font of Magic requires Long Rest point-pool recovery.",
      ),
    );
  if (mechanics.operations[0]?.kind !== "spell_slot_to_point_pool")
    issues.push(
      branchIssue(
        "procedure",
        1,
        "Font of Magic requires the Spell Slot conversion procedure first.",
      ),
    );
  if (
    mechanics.operations.length !== 2 ||
    mechanics.operations[1]?.kind !== "point_pool_to_spell_slot"
  )
    issues.push(
      branchIssue(
        "procedure",
        2,
        "Font of Magic requires one Spell Slot creation procedure second.",
      ),
    );
  return issues;
}

function heroicInspirationBranchIssues(
  mechanics: Extract<
    SpeciesTraitRecord["mechanics"],
    { readonly family: "rest_triggered_heroic_inspiration" }
  >,
): readonly PartialCharacterSheetFeatureProjectionIssue[] {
  const issues: PartialCharacterSheetFeatureProjectionIssue[] = [];
  if (
    mechanics.trigger.kind !== "finish_rest" ||
    mechanics.trigger.rest !== "long"
  )
    issues.push(
      branchIssue(
        "generalFact",
        1,
        "Heroic Inspiration requires a Long Rest completion trigger.",
      ),
    );
  if (mechanics.grant.kind !== "heroic_inspiration")
    issues.push(
      branchIssue(
        "effect",
        1,
        "The rest-triggered branch must grant Heroic Inspiration.",
      ),
    );
  return issues;
}

function evidence(
  disposition: CharacterSheetFeaturePathDisposition,
  role: MechanicsGraphNodeRole,
  ordinal: number | undefined,
  branch: CharacterSheetFeatureEvidenceBranch,
): CharacterSheetFeaturePathEvidence {
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
  disposition: CharacterSheetFeaturePathDisposition,
  outerRole: MechanicsGraphNodeRole,
  outerOrdinal: number,
  innerRole: MechanicsGraphNodeRole,
  innerOrdinal: number,
  branch: CharacterSheetFeatureEvidenceBranch,
): CharacterSheetFeaturePathEvidence {
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

function branchIssue(
  role: MechanicsGraphNodeRole,
  ordinal: number | undefined,
  message: string,
): PartialCharacterSheetFeatureProjectionIssue {
  return {
    code: "unsupportedFeatureBranch",
    mechanicsPath: unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      ordinal === undefined
        ? { kind: "singleton", role }
        : { kind: "occurrence", role, ordinal: PositiveInteger(ordinal) },
    ]),
    message,
  };
}

function partialFeatureRootIssue(
  code: PartialCharacterSheetFeatureProjectionIssue["code"],
  message: string,
): PartialCharacterSheetFeatureProjectionResult {
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
        message: `Expected a Character Sheet feature root, received ${unit.kind}.`,
        unitId: unit.id,
      },
    ],
  };
}
