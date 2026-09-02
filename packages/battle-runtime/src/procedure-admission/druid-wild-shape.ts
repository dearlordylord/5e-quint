import {
  PositiveInteger,
  type ClassLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  AuthoredUnitSource,
  ClassFeatureRecord,
  StatBlockTransformTargetEffect,
} from "@dnd/surface/surface/types";
import { isStatBlockTransformTargetEffect } from "@dnd/surface/surface/types";
import { Match } from "effect";
import { sameStringSet } from "../same-string-set.ts";

import type { CharacterBattleClassLevels } from "../character-class-level.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import type { BattleResourcePoolExecutionRef } from "../identity.ts";

type DruidWildShapeMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "activation" }
>;

export type DruidWildShapeProcedureExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "druidWildShapeKnownForm" }
>;

export type DruidWildShapeUseCountResourceProjection = {
  readonly kind: "useCount";
  readonly cap: {
    readonly kind: "classLevelThresholdTiers";
    readonly className: "druid";
    readonly base: 2;
    readonly tiers: readonly [
      { readonly atLevel: 6; readonly value: 3 },
      { readonly atLevel: 17; readonly value: 4 },
    ];
  };
  readonly resetCadence: {
    readonly kind: "partialShortFullLong";
    readonly shortRestRefill: 1;
    readonly longRestRefillsAll: true;
  };
};

export type DruidWildShapeProcedureTemplate = {
  readonly kind: "druidWildShapeKnownForm";
  readonly activation: {
    readonly cost: "bonusAction";
    readonly duration: {
      readonly kind: "halfClassLevelRoundedDownHours";
      readonly className: "druid";
    };
    readonly target: "self";
    readonly form: "knownFormsRoster";
    readonly actionRestriction: "noSpellcasting";
    readonly temporaryHitPoints: {
      readonly kind: "classLevel";
      readonly className: "druid";
    };
  };
  readonly knownFormRoster: {
    readonly creatureType: "beast";
    readonly count: {
      readonly kind: "classLevelTotalChoices";
      readonly className: "druid";
      readonly levels: readonly [
        { readonly atLevel: 2; readonly total: 4 },
        { readonly atLevel: 4; readonly total: 6 },
        { readonly atLevel: 8; readonly total: 8 },
      ];
    };
    readonly maxChallengeRating: {
      readonly kind: "classLevelThresholdTiers";
      readonly className: "druid";
      readonly base: 0.25;
      readonly tiers: readonly [
        { readonly atLevel: 4; readonly value: 0.5 },
        { readonly atLevel: 8; readonly value: 1 },
      ];
    };
    readonly flySpeed: {
      readonly kind: "allowedAtClassLevel";
      readonly className: "druid";
      readonly atLevel: 8;
    };
  };
  readonly binding: {
    readonly tag: "required";
    readonly requirements: {
      readonly resource: { readonly kind: "sameSourceUseCountResource" };
      readonly classLevel: {
        readonly kind: "canonicalClassLevel";
        readonly className: "druid";
        readonly minimumLevel: 2;
      };
    };
  };
};

export const DRUID_WILD_SHAPE_FAILED_FACTS = [
  "useCountResource",
  "resetCadence",
  "activationCost",
  "duration",
  "activationPhase",
  "transformation",
  "knownFormRoster",
  "reversion",
  "temporaryHitPoints",
] as const;
export type DruidWildShapeFailedFact =
  (typeof DRUID_WILD_SHAPE_FAILED_FACTS)[number];

export const DRUID_WILD_SHAPE_EVIDENCE_CONSUMERS = [
  "battleUseCountResource",
  "battleRestRecovery",
  "wildShapeActionEconomy",
  "wildShapeDuration",
  "wildShapeKnownFormRoster",
  "wildShapeReversion",
  "wildShapeTemporaryHitPoints",
] as const;
export type DruidWildShapeEvidenceConsumer =
  (typeof DRUID_WILD_SHAPE_EVIDENCE_CONSUMERS)[number];

export type DruidWildShapeConsumedEvidence = {
  readonly mechanicsPath: UnitMechanicsPath;
  readonly consumer: DruidWildShapeEvidenceConsumer;
};

export type DruidWildShapeProcedureAdmissionIssue = {
  readonly tag: "druidWildShapeProcedureAdmissionIssue";
  readonly failedFact: DruidWildShapeFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type AdmittedDruidWildShapeProcedure = {
  readonly resource: DruidWildShapeUseCountResourceProjection;
  readonly procedure: DruidWildShapeProcedureTemplate;
  readonly evidence: {
    readonly consumed: readonly [
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "battleUseCountResource";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "battleRestRecovery";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "wildShapeActionEconomy";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "wildShapeDuration";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "wildShapeKnownFormRoster";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "wildShapeReversion";
      },
      DruidWildShapeConsumedEvidence & {
        readonly consumer: "wildShapeTemporaryHitPoints";
      },
    ];
    readonly unowned: readonly [];
  };
};

export type DruidWildShapeProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly source: { readonly unitId: AuthoredUnitSource["id"] };
      readonly projection: AdmittedDruidWildShapeProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<DruidWildShapeProcedureAdmissionIssue>;
    };

const ROOT_NODE = { kind: "singleton", role: "recordMechanics" } as const;
const RESOURCE_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "singleton", role: "resource" },
]);
const RESET_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "occurrence", role: "generalFact", ordinal: PositiveInteger(1) },
]);
const ACTIVATION_COST_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "singleton", role: "bonusAction" },
]);
const DURATION_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "occurrence", role: "generalFact", ordinal: PositiveInteger(2) },
]);
const TRANSFORM_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "occurrence", role: "effect", ordinal: PositiveInteger(1) },
]);
const REVERSION_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "occurrence", role: "effect", ordinal: PositiveInteger(1) },
  { kind: "occurrence", role: "generalFact", ordinal: PositiveInteger(1) },
]);
const TEMPORARY_HIT_POINTS_PATH = unitMechanicsPath([
  ROOT_NODE,
  { kind: "occurrence", role: "effect", ordinal: PositiveInteger(2) },
]);

export function admitDruidWildShapeProcedure(
  unit: AuthoredUnitSource,
): DruidWildShapeProcedureAdmission {
  if (!isRepresentedDruidWildShapeRoot(unit)) {
    return { tag: "notBattleOwned" };
  }
  const issues = druidWildShapeAdmissionIssues(unit.mechanics);
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? {
        tag: "admitted",
        source: { unitId: unit.id },
        projection: admittedDruidWildShapeProcedure(),
      }
    : { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
}

function isRepresentedDruidWildShapeRoot(
  unit: AuthoredUnitSource,
): unit is Extract<AuthoredUnitSource, { readonly kind: "class_feature" }> & {
  readonly mechanics: DruidWildShapeMechanics;
} {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "druid" ||
    unit.mechanics.family !== "activation"
  ) {
    return false;
  }
  return hasRepresentedDruidWildShapeMechanics(unit.mechanics);
}

function hasRepresentedDruidWildShapeMechanics(
  mechanics: DruidWildShapeMechanics,
): boolean {
  return (
    mechanics.resetCadence?.kind === "partial_short_full_long" ||
    hasSupportedDruidWildShapeDuration(mechanics) ||
    mechanics.phases.some(hasKnownFormsRosterTransform)
  );
}

function hasKnownFormsRosterTransform(
  phase: DruidWildShapeMechanics["phases"][number],
): boolean {
  return (
    phase.kind === "direct" &&
    phase.effects?.some(
      (effect) =>
        effect.kind === "transform_target" &&
        effect.newForm.kind === "known_forms_roster",
    ) === true
  );
}

function druidWildShapeAdmissionIssues(
  mechanics: DruidWildShapeMechanics,
): readonly DruidWildShapeProcedureAdmissionIssue[] {
  const phase = mechanics.phases[0];
  const directPhase = phase?.kind === "direct" ? phase : undefined;
  const transform = directPhase?.effects?.[0];
  const supportChecks: readonly {
    readonly failedFact: DruidWildShapeFailedFact;
    readonly supported: boolean;
  }[] = [
    {
      failedFact: "useCountResource",
      supported: hasSupportedUseCountResource(mechanics),
    },
    {
      failedFact: "resetCadence",
      supported: hasSupportedResetCadence(mechanics),
    },
    {
      failedFact: "activationCost",
      supported: mechanics.activationCost.kind === "bonus_action",
    },
    {
      failedFact: "duration",
      supported: hasSupportedDruidWildShapeDuration(mechanics),
    },
    {
      failedFact: "activationPhase",
      supported: hasSupportedActivationPhase(mechanics, directPhase),
    },
    {
      failedFact: "transformation",
      supported: hasSupportedTransformation(transform),
    },
    {
      failedFact: "knownFormRoster",
      supported: hasSupportedKnownFormRoster(transform),
    },
    {
      failedFact: "reversion",
      supported: hasSupportedReversion(transform),
    },
    {
      failedFact: "temporaryHitPoints",
      supported: hasSupportedTemporaryHitPoints(directPhase?.effects?.[1]),
    },
  ];
  return supportChecks
    .filter(({ supported }) => !supported)
    .map(({ failedFact }) => druidWildShapeAdmissionIssue(failedFact));
}

function hasSupportedResetCadence(mechanics: DruidWildShapeMechanics): boolean {
  return (
    mechanics.resetCadence?.kind === "partial_short_full_long" &&
    mechanics.resetCadence.shortRestRefill === 1
  );
}

function hasSupportedDruidWildShapeDuration(
  mechanics: DruidWildShapeMechanics,
): boolean {
  const duration = mechanics.duration;
  return (
    duration?.kind === "timed" &&
    "kind" in duration.value &&
    duration.value.kind === "half_class_level_rounded_down_hours"
  );
}

function hasSupportedActivationPhase(
  mechanics: DruidWildShapeMechanics,
  phase:
    | Extract<
        DruidWildShapeMechanics["phases"][number],
        { readonly kind: "direct" }
      >
    | undefined,
): boolean {
  return (
    mechanics.phases.length === 1 &&
    phase?.attachment.kind === "self" &&
    phase.effects?.length === 2
  );
}

function hasSupportedUseCountResource(
  mechanics: DruidWildShapeMechanics,
): boolean {
  const resource = mechanics.resource;
  if (
    resource?.kind !== "use_count" ||
    !hasSupportedUseCountCap(resource.cap)
  ) {
    return false;
  }
  return hasSupportedUseCountTiers(resource.cap.tiers);
}

function hasSupportedUseCountCap(
  cap: NonNullable<DruidWildShapeMechanics["resource"]>["cap"],
): cap is Extract<typeof cap, { readonly kind: "threshold_tiers" }> {
  return (
    cap.kind === "threshold_tiers" && cap.axis === "class" && cap.base === 2
  );
}

function hasSupportedUseCountTiers(
  tiers: Extract<
    NonNullable<DruidWildShapeMechanics["resource"]>["cap"],
    { readonly kind: "threshold_tiers" }
  >["tiers"],
): boolean {
  const [levelSix, levelSeventeen, ...additionalTiers] = tiers;
  return (
    levelSix?.atLevel === 6 &&
    levelSix.value === 3 &&
    levelSeventeen?.atLevel === 17 &&
    levelSeventeen.value === 4 &&
    additionalTiers.length === 0
  );
}

type DruidWildShapeEffect = NonNullable<
  Extract<
    DruidWildShapeMechanics["phases"][number],
    { readonly kind: "direct" }
  >["effects"]
>[number];

function supportedTransform(
  effect: DruidWildShapeEffect | undefined,
): StatBlockTransformTargetEffect | undefined {
  return effect?.kind === "transform_target" &&
    isStatBlockTransformTargetEffect(effect)
    ? effect
    : undefined;
}

const RETAINED_FIELDS = [
  "personality",
  "memories",
  "speech",
  "creature_type",
  "hit_points",
  "hit_point_dice",
  "intelligence",
  "wisdom",
  "charisma",
  "class_features",
  "languages",
  "feats",
  "skill_proficiencies",
  "saving_throw_proficiencies",
] as const;

function hasSupportedTransformation(
  effect: DruidWildShapeEffect | undefined,
): boolean {
  const transform = supportedTransform(effect);
  return (
    transform !== undefined &&
    transform.actionRestriction === "no_spellcasting" &&
    sameStringSet(transform.retainedFields, RETAINED_FIELDS)
  );
}

function hasSupportedKnownFormRoster(
  effect: DruidWildShapeEffect | undefined,
): boolean {
  const transform = supportedTransform(effect);
  if (
    transform === undefined ||
    transform.newForm.kind !== "known_forms_roster"
  ) {
    return false;
  }
  return hasSupportedKnownFormRosterShape(transform.newForm);
}

type KnownFormsRoster = Extract<
  StatBlockTransformTargetEffect["newForm"],
  { readonly kind: "known_forms_roster" }
>;

function hasSupportedKnownFormRosterShape(roster: KnownFormsRoster): boolean {
  return (
    roster.creatureType === "beast" &&
    hasSupportedKnownFormFlySpeed(roster) &&
    hasSupportedKnownFormChoices(roster) &&
    hasSupportedKnownFormChallengeRating(roster) &&
    hasSupportedKnownFormChange(roster)
  );
}

function hasSupportedKnownFormFlySpeed(roster: KnownFormsRoster): boolean {
  return (
    roster.flySpeed.kind === "allowed_at_class_level" &&
    roster.flySpeed.atLevel === 8
  );
}

function hasSupportedKnownFormChoices(roster: KnownFormsRoster): boolean {
  if (roster.knownForms.kind !== "class_level_total_choices") return false;
  const levels = roster.knownForms.levels;
  return (
    levels.length === 3 &&
    hasLevelTwoKnownFormChoice(levels[0]) &&
    hasLevelFourKnownFormChoice(levels[1]) &&
    hasLevelEightKnownFormChoice(levels[2])
  );
}

type KnownFormChoiceLevel =
  | Extract<
      KnownFormsRoster["knownForms"],
      { readonly kind: "class_level_total_choices" }
    >["levels"][number]
  | undefined;

function hasLevelTwoKnownFormChoice(level: KnownFormChoiceLevel): boolean {
  return level?.atLevel === 2 && level.total === 4;
}

function hasLevelFourKnownFormChoice(level: KnownFormChoiceLevel): boolean {
  return level?.atLevel === 4 && level.total === 6;
}

function hasLevelEightKnownFormChoice(level: KnownFormChoiceLevel): boolean {
  return level?.atLevel === 8 && level.total === 8;
}

function hasSupportedKnownFormChallengeRating(
  roster: KnownFormsRoster,
): boolean {
  const challengeRating = roster.maxChallengeRating;
  if (challengeRating.kind !== "threshold_tiers") return false;
  return (
    challengeRating.axis === "class" &&
    challengeRating.base === 0.25 &&
    challengeRating.tiers.length === 2 &&
    hasLevelFourChallengeRatingTier(challengeRating.tiers[0]) &&
    hasLevelEightChallengeRatingTier(challengeRating.tiers[1])
  );
}

type ChallengeRatingTier =
  | Extract<
      KnownFormsRoster["maxChallengeRating"],
      { readonly kind: "threshold_tiers" }
    >["tiers"][number]
  | undefined;

function hasLevelFourChallengeRatingTier(tier: ChallengeRatingTier): boolean {
  return tier?.atLevel === 4 && tier.value === 0.5;
}

function hasLevelEightChallengeRatingTier(tier: ChallengeRatingTier): boolean {
  return tier?.atLevel === 8 && tier.value === 1;
}

function hasSupportedKnownFormChange(roster: KnownFormsRoster): boolean {
  return (
    roster.knownFormChange.kind === "long_rest" &&
    roster.knownFormChange.replacementCount === 1
  );
}

function hasSupportedReversion(
  effect: DruidWildShapeEffect | undefined,
): boolean {
  const transform = supportedTransform(effect);
  if (transform === undefined || transform.revertTriggers.length !== 5) {
    return false;
  }
  return (
    transform.revertTriggers.some(
      (trigger) => trigger.kind === "duration_expires",
    ) &&
    transform.revertTriggers.some(
      (trigger) => trigger.kind === "source_used_again",
    ) &&
    transform.revertTriggers.some(
      (trigger) =>
        trigger.kind === "condition_active" &&
        trigger.condition === "incapacitated",
    ) &&
    transform.revertTriggers.some((trigger) => trigger.kind === "death") &&
    transform.revertTriggers.some(
      (trigger) =>
        trigger.kind === "dismissed_by_target" &&
        trigger.action === "bonus_action",
    )
  );
}

function hasSupportedTemporaryHitPoints(
  effect: DruidWildShapeEffect | undefined,
): boolean {
  if (effect?.kind !== "grant_temp_hp") return false;
  const amount = effect.amount;
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "class" &&
    hasSupportedTemporaryHitPointBase(amount.base) &&
    hasSupportedTemporaryHitPointsPerLevel(amount.perLevel) &&
    amount.startingAtLevel === 1
  );
}

function hasSupportedTemporaryHitPointBase(
  base: LinearPerLevelTemporaryHitPointAmount["base"],
): boolean {
  return (
    base.dice === 0 &&
    base.dieSize === 1 &&
    base.flat === 1 &&
    base.spellcastingMod === undefined &&
    base.abilityModifier === undefined
  );
}

function hasSupportedTemporaryHitPointsPerLevel(
  perLevel: LinearPerLevelTemporaryHitPointAmount["perLevel"],
): boolean {
  return (
    perLevel.dice === undefined &&
    perLevel.dieSize === undefined &&
    perLevel.flat === 1
  );
}

type LinearPerLevelTemporaryHitPointAmount = Extract<
  Extract<DruidWildShapeEffect, { readonly kind: "grant_temp_hp" }>["amount"],
  { readonly kind: "linear_per_level" }
>;

function druidWildShapeAdmissionIssue(
  failedFact: DruidWildShapeFailedFact,
): DruidWildShapeProcedureAdmissionIssue {
  return {
    tag: "druidWildShapeProcedureAdmissionIssue",
    failedFact,
    mechanicsPath: druidWildShapeFailedFactPath(failedFact),
    message: `Unsupported Wild Shape mechanics fact: ${failedFact}.`,
  };
}

function druidWildShapeFailedFactPath(
  failedFact: DruidWildShapeFailedFact,
): UnitMechanicsPath {
  return Match.value(failedFact).pipe(
    Match.when("useCountResource", () => RESOURCE_PATH),
    Match.when("resetCadence", () => RESET_PATH),
    Match.when("activationCost", () => ACTIVATION_COST_PATH),
    Match.when("duration", () => DURATION_PATH),
    Match.when("activationPhase", () => TRANSFORM_PATH),
    Match.when("transformation", () => TRANSFORM_PATH),
    Match.when("knownFormRoster", () => TRANSFORM_PATH),
    Match.when("reversion", () => REVERSION_PATH),
    Match.when("temporaryHitPoints", () => TEMPORARY_HIT_POINTS_PATH),
    Match.exhaustive,
  );
}

function admittedDruidWildShapeProcedure(): AdmittedDruidWildShapeProcedure {
  return {
    resource: {
      kind: "useCount",
      cap: {
        kind: "classLevelThresholdTiers",
        className: "druid",
        base: 2,
        tiers: [
          { atLevel: 6, value: 3 },
          { atLevel: 17, value: 4 },
        ],
      },
      resetCadence: {
        kind: "partialShortFullLong",
        shortRestRefill: 1,
        longRestRefillsAll: true,
      },
    },
    procedure: {
      kind: "druidWildShapeKnownForm",
      activation: {
        cost: "bonusAction",
        duration: {
          kind: "halfClassLevelRoundedDownHours",
          className: "druid",
        },
        target: "self",
        form: "knownFormsRoster",
        actionRestriction: "noSpellcasting",
        temporaryHitPoints: { kind: "classLevel", className: "druid" },
      },
      knownFormRoster: {
        creatureType: "beast",
        count: {
          kind: "classLevelTotalChoices",
          className: "druid",
          levels: [
            { atLevel: 2, total: 4 },
            { atLevel: 4, total: 6 },
            { atLevel: 8, total: 8 },
          ],
        },
        maxChallengeRating: {
          kind: "classLevelThresholdTiers",
          className: "druid",
          base: 0.25,
          tiers: [
            { atLevel: 4, value: 0.5 },
            { atLevel: 8, value: 1 },
          ],
        },
        flySpeed: {
          kind: "allowedAtClassLevel",
          className: "druid",
          atLevel: 8,
        },
      },
      binding: {
        tag: "required",
        requirements: {
          resource: { kind: "sameSourceUseCountResource" },
          classLevel: {
            kind: "canonicalClassLevel",
            className: "druid",
            minimumLevel: 2,
          },
        },
      },
    },
    evidence: {
      consumed: [
        { mechanicsPath: RESOURCE_PATH, consumer: "battleUseCountResource" },
        { mechanicsPath: RESET_PATH, consumer: "battleRestRecovery" },
        {
          mechanicsPath: ACTIVATION_COST_PATH,
          consumer: "wildShapeActionEconomy",
        },
        { mechanicsPath: DURATION_PATH, consumer: "wildShapeDuration" },
        {
          mechanicsPath: TRANSFORM_PATH,
          consumer: "wildShapeKnownFormRoster",
        },
        { mechanicsPath: REVERSION_PATH, consumer: "wildShapeReversion" },
        {
          mechanicsPath: TEMPORARY_HIT_POINTS_PATH,
          consumer: "wildShapeTemporaryHitPoints",
        },
      ],
      unowned: [],
    },
  };
}

export type DruidWildShapeProcedureBindingInput = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly classLevels: CharacterBattleClassLevels;
};

export const DRUID_WILD_SHAPE_BINDING_ISSUE_REASONS = [
  "sameSourceResourceMissing",
  "canonicalClassLevelMissing",
] as const;
export type DruidWildShapeBindingIssueReason =
  (typeof DRUID_WILD_SHAPE_BINDING_ISSUE_REASONS)[number];

export type DruidWildShapeProcedureBindingIssue = {
  readonly tag: "druidWildShapeProcedureBindingIssue";
  readonly reason: DruidWildShapeBindingIssueReason;
  readonly message: string;
};

export type ReadyDruidWildShapeProcedure = {
  readonly binding: "ready";
  readonly source: {
    readonly kind: "sameSourceResource";
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  };
  readonly execution: DruidWildShapeProcedureExecution;
};

export type DruidWildShapeProcedureBinding =
  | {
      readonly tag: "bound";
      readonly procedure: ReadyDruidWildShapeProcedure;
    }
  | {
      readonly tag: "notAvailable";
      readonly reason: "belowAcquisitionLevel";
      readonly className: "druid";
      readonly minimumLevel: 2;
      readonly actualLevel: ClassLevel;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<DruidWildShapeProcedureBindingIssue>;
    };

export type DruidWildShapeClassLevelProjection =
  | {
      readonly tag: "projected";
      readonly execution: DruidWildShapeProcedureExecution;
    }
  | {
      readonly tag: "notAvailable";
      readonly reason: "belowAcquisitionLevel";
      readonly className: "druid";
      readonly minimumLevel: 2;
      readonly actualLevel: ClassLevel;
    }
  | {
      readonly tag: "rejected";
      readonly issue: DruidWildShapeProcedureBindingIssue;
    };

export function projectDruidWildShapeAtClassLevels(
  admitted: AdmittedDruidWildShapeProcedure,
  classLevels: CharacterBattleClassLevels,
): DruidWildShapeClassLevelProjection {
  const classLevelRequirement =
    admitted.procedure.binding.requirements.classLevel;
  const druidLevel = classLevels.find(
    (entry) => entry.className === classLevelRequirement.className,
  )?.level;
  if (druidLevel === undefined) {
    return {
      tag: "rejected",
      issue: druidWildShapeBindingIssue(
        "canonicalClassLevelMissing",
        "Wild Shape binding requires the canonical Druid class level.",
      ),
    };
  }
  if (Number(druidLevel) < classLevelRequirement.minimumLevel) {
    return {
      tag: "notAvailable",
      reason: "belowAcquisitionLevel",
      className: classLevelRequirement.className,
      minimumLevel: classLevelRequirement.minimumLevel,
      actualLevel: druidLevel,
    };
  }
  return {
    tag: "projected",
    execution: {
      kind: admitted.procedure.kind,
      classLevel: druidLevel,
      knownFormRoster: {
        creatureType: admitted.procedure.knownFormRoster.creatureType,
        count: classLevelTotalChoices(
          admitted.procedure.knownFormRoster.count.levels,
          druidLevel,
        ),
        maxChallengeRating: classLevelThresholdValue(
          admitted.procedure.knownFormRoster.maxChallengeRating,
          druidLevel,
        ),
        flySpeed:
          Number(druidLevel) >=
          admitted.procedure.knownFormRoster.flySpeed.atLevel
            ? "allowed"
            : "forbidden",
      },
    },
  };
}

export function bindDruidWildShapeProcedure(
  admitted: {
    readonly sourceUnitId: AuthoredUnitSource["id"];
    readonly projection: AdmittedDruidWildShapeProcedure;
  },
  input: DruidWildShapeProcedureBindingInput,
): DruidWildShapeProcedureBinding {
  const resourcePoolRef = input.resourcePoolRefsByUnitId.get(
    admitted.sourceUnitId,
  );
  const classLevelProjection = projectDruidWildShapeAtClassLevels(
    admitted.projection,
    input.classLevels,
  );
  if (
    resourcePoolRef === undefined &&
    classLevelProjection.tag === "rejected"
  ) {
    return {
      tag: "rejected",
      issues: [
        druidWildShapeBindingIssue(
          "sameSourceResourceMissing",
          "Wild Shape binding requires its same-source use-count resource.",
        ),
        classLevelProjection.issue,
      ],
    };
  }
  if (resourcePoolRef === undefined) {
    return {
      tag: "rejected",
      issues: [
        druidWildShapeBindingIssue(
          "sameSourceResourceMissing",
          "Wild Shape binding requires its same-source use-count resource.",
        ),
      ],
    };
  }
  if (classLevelProjection.tag === "rejected") {
    return { tag: "rejected", issues: [classLevelProjection.issue] };
  }
  if (classLevelProjection.tag === "notAvailable") return classLevelProjection;
  return {
    tag: "bound",
    procedure: {
      binding: "ready",
      source: { kind: "sameSourceResource", resourcePoolRef },
      execution: classLevelProjection.execution,
    },
  };
}

function classLevelTotalChoices(
  levels: DruidWildShapeProcedureTemplate["knownFormRoster"]["count"]["levels"],
  classLevel: ClassLevel,
): number {
  return levels.reduce(
    (total, tier) => (Number(classLevel) >= tier.atLevel ? tier.total : total),
    0,
  );
}

function classLevelThresholdValue(
  threshold: DruidWildShapeProcedureTemplate["knownFormRoster"]["maxChallengeRating"],
  classLevel: ClassLevel,
): number {
  return threshold.tiers.reduce<number>(
    (value, tier) => (Number(classLevel) >= tier.atLevel ? tier.value : value),
    threshold.base,
  );
}

function druidWildShapeBindingIssue(
  reason: DruidWildShapeBindingIssueReason,
  message: string,
): DruidWildShapeProcedureBindingIssue {
  return { tag: "druidWildShapeProcedureBindingIssue", reason, message };
}
