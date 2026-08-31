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
  const mechanics = unit.mechanics;
  return (
    mechanics.resetCadence?.kind === "partial_short_full_long" ||
    (mechanics.duration?.kind === "timed" &&
      "kind" in mechanics.duration.value &&
      mechanics.duration.value.kind ===
        "half_class_level_rounded_down_hours") ||
    mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        phase.effects?.some(
          (effect) =>
            effect.kind === "transform_target" &&
            effect.newForm.kind === "known_forms_roster",
        ) === true,
    )
  );
}

function druidWildShapeAdmissionIssues(
  mechanics: DruidWildShapeMechanics,
): readonly DruidWildShapeProcedureAdmissionIssue[] {
  const failedFacts: DruidWildShapeFailedFact[] = [];
  if (!hasSupportedUseCountResource(mechanics)) {
    failedFacts.push("useCountResource");
  }
  if (
    mechanics.resetCadence?.kind !== "partial_short_full_long" ||
    mechanics.resetCadence.shortRestRefill !== 1
  ) {
    failedFacts.push("resetCadence");
  }
  if (mechanics.activationCost.kind !== "bonus_action") {
    failedFacts.push("activationCost");
  }
  if (
    mechanics.duration?.kind !== "timed" ||
    !("kind" in mechanics.duration.value) ||
    mechanics.duration.value.kind !== "half_class_level_rounded_down_hours"
  ) {
    failedFacts.push("duration");
  }

  const phase = mechanics.phases[0];
  const directPhase = phase?.kind === "direct" ? phase : undefined;
  if (
    mechanics.phases.length !== 1 ||
    directPhase === undefined ||
    directPhase.attachment.kind !== "self" ||
    directPhase.effects?.length !== 2
  ) {
    failedFacts.push("activationPhase");
  }
  const transform = directPhase?.effects?.[0];
  if (!hasSupportedTransformation(transform)) {
    failedFacts.push("transformation");
  }
  if (!hasSupportedKnownFormRoster(transform)) {
    failedFacts.push("knownFormRoster");
  }
  if (!hasSupportedReversion(transform)) {
    failedFacts.push("reversion");
  }
  if (!hasSupportedTemporaryHitPoints(directPhase?.effects?.[1])) {
    failedFacts.push("temporaryHitPoints");
  }
  return failedFacts.map(druidWildShapeAdmissionIssue);
}

function hasSupportedUseCountResource(
  mechanics: DruidWildShapeMechanics,
): boolean {
  const resource = mechanics.resource;
  if (
    resource?.kind !== "use_count" ||
    resource.cap.kind !== "threshold_tiers" ||
    resource.cap.axis !== "class" ||
    resource.cap.base !== 2
  ) {
    return false;
  }
  const [levelSix, levelSeventeen, ...additionalTiers] = resource.cap.tiers;
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
  const roster = transform.newForm;
  const [levelTwo, levelFour, levelEight, ...additionalChoiceLevels] =
    roster.knownForms.kind === "class_level_total_choices"
      ? roster.knownForms.levels
      : [];
  const [challengeLevelFour, challengeLevelEight, ...additionalChallengeTiers] =
    roster.maxChallengeRating.kind === "threshold_tiers"
      ? roster.maxChallengeRating.tiers
      : [];
  return (
    roster.creatureType === "beast" &&
    roster.flySpeed.kind === "allowed_at_class_level" &&
    roster.flySpeed.atLevel === 8 &&
    roster.knownForms.kind === "class_level_total_choices" &&
    levelTwo?.atLevel === 2 &&
    levelTwo.total === 4 &&
    levelFour?.atLevel === 4 &&
    levelFour.total === 6 &&
    levelEight?.atLevel === 8 &&
    levelEight.total === 8 &&
    additionalChoiceLevels.length === 0 &&
    roster.maxChallengeRating.kind === "threshold_tiers" &&
    roster.maxChallengeRating.axis === "class" &&
    roster.maxChallengeRating.base === 0.25 &&
    challengeLevelFour?.atLevel === 4 &&
    challengeLevelFour.value === 0.5 &&
    challengeLevelEight?.atLevel === 8 &&
    challengeLevelEight.value === 1 &&
    additionalChallengeTiers.length === 0 &&
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
    amount.base.dice === 0 &&
    amount.base.dieSize === 1 &&
    amount.base.flat === 1 &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === undefined &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === 1 &&
    amount.startingAtLevel === 1
  );
}

function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value)) &&
    expected.every((value) => actual.includes(value))
  );
}

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
  const classLevelRequirement =
    admitted.projection.procedure.binding.requirements.classLevel;
  const druidLevel = input.classLevels.find(
    (entry) => entry.className === classLevelRequirement.className,
  )?.level;
  if (resourcePoolRef === undefined && druidLevel === undefined) {
    return {
      tag: "rejected",
      issues: [
        druidWildShapeBindingIssue(
          "sameSourceResourceMissing",
          "Wild Shape binding requires its same-source use-count resource.",
        ),
        druidWildShapeBindingIssue(
          "canonicalClassLevelMissing",
          "Wild Shape binding requires the canonical Druid class level.",
        ),
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
  if (druidLevel === undefined) {
    return {
      tag: "rejected",
      issues: [
        druidWildShapeBindingIssue(
          "canonicalClassLevelMissing",
          "Wild Shape binding requires the canonical Druid class level.",
        ),
      ],
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
    tag: "bound",
    procedure: {
      binding: "ready",
      source: { kind: "sameSourceResource", resourcePoolRef },
      execution: {
        kind: admitted.projection.procedure.kind,
        classLevel: druidLevel,
        knownFormRoster: {
          creatureType:
            admitted.projection.procedure.knownFormRoster.creatureType,
          count: classLevelTotalChoices(
            admitted.projection.procedure.knownFormRoster.count.levels,
            druidLevel,
          ),
          maxChallengeRating: classLevelThresholdValue(
            admitted.projection.procedure.knownFormRoster.maxChallengeRating,
            druidLevel,
          ),
          flySpeed:
            Number(druidLevel) >=
            admitted.projection.procedure.knownFormRoster.flySpeed.atLevel
              ? "allowed"
              : "forbidden",
        },
      },
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
