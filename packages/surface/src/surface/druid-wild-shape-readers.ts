// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
import type {
  AreaDirectEffectAtom,
  ClassFeatureRecord,
  ShapeShiftFormSource,
  UnitRecord,
  UseCountResource,
} from "./types.ts";
import { isEffectAtom } from "./types.ts";

export type DruidWildShapeFeatureRecord = ClassFeatureRecord & {
  readonly className: "druid";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  > & {
    readonly resource: UseCountResource;
    readonly resetCadence: {
      readonly kind: "partial_short_full_long";
      readonly shortRestRefill: number;
    };
    readonly duration: {
      readonly kind: "timed";
      readonly value: { readonly kind: "half_class_level_rounded_down_hours" };
    };
  };
};

export type DruidWildShapeActivationMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "activation" }
>;
export type DruidWildShapeActivationPhase =
  DruidWildShapeActivationMechanics["phases"][number];
export type DruidWildShapeKnownFormsRoster = Extract<
  ShapeShiftFormSource,
  { readonly kind: "known_forms_roster" }
>;

type DruidWildShapeTransformEffect = Extract<
  AreaDirectEffectAtom,
  { readonly kind: "transform_target" }
>;

export function isDruidWildShapeFeatureRecord(
  unit: UnitRecord,
): unit is DruidWildShapeFeatureRecord {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "druid" ||
    unit.mechanics.family !== "activation"
  ) {
    return false;
  }
  const mechanics = unit.mechanics;
  const duration = mechanics.duration;
  const durationValue =
    duration !== undefined && "kind" in duration && duration.kind === "timed"
      ? duration.value
      : undefined;
  const phase = mechanics.phases[0];
  return (
    mechanics.activationCost.kind === "bonus_action" &&
    mechanics.resource?.kind === "use_count" &&
    mechanics.resource.cap.kind === "threshold_tiers" &&
    mechanics.resetCadence?.kind === "partial_short_full_long" &&
    mechanics.resetCadence.shortRestRefill === 1 &&
    durationValue !== undefined &&
    "kind" in durationValue &&
    durationValue.kind === "half_class_level_rounded_down_hours" &&
    mechanics.phases.length === 1 &&
    phase?.kind === "direct" &&
    phase.attachment.kind === "self" &&
    phase.effects?.length === 2 &&
    druidWildShapeKnownFormRosterFromPhase(phase) !== undefined &&
    phase.effects.some((effect) => druidWildShapeTemporaryHitPoints(effect))
  );
}

export function druidWildShapeDurationHoursForClassLevel(
  classLevel: number,
): number {
  return Math.floor(classLevel / 2);
}

export function druidWildShapeKnownFormRosterFromPhase(
  phase: DruidWildShapeActivationPhase | undefined,
): DruidWildShapeKnownFormsRoster | undefined {
  if (
    phase === undefined ||
    phase.kind !== "direct" ||
    phase.effects === undefined
  ) {
    return undefined;
  }
  for (const effect of phase.effects) {
    if (effect.kind !== "transform_target") continue;
    const form = effect.newForm;
    if (
      form.kind === "known_forms_roster" &&
      form.creatureType === "beast" &&
      form.flySpeed.kind === "allowed_at_class_level" &&
      form.flySpeed.atLevel === 8 &&
      effect.actionRestriction === "no_spellcasting" &&
      druidWildShapeRetainedFieldsMatchAdmittedShape(effect.retainedFields) &&
      druidWildShapeRevertTriggersAreSupported(effect.revertTriggers)
    ) {
      return form;
    }
  }
  return undefined;
}

const ADMITTED_WILD_SHAPE_RETAINED_FIELDS = [
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

function druidWildShapeRetainedFieldsMatchAdmittedShape(
  retainedFields: readonly string[],
): boolean {
  return sameStringSet(retainedFields, ADMITTED_WILD_SHAPE_RETAINED_FIELDS);
}

function druidWildShapeRevertTriggersAreSupported(
  revertTriggers: DruidWildShapeTransformEffect["revertTriggers"],
): boolean {
  return (
    revertTriggers.length === 5 &&
    revertTriggers.some((trigger) => trigger.kind === "duration_expires") &&
    revertTriggers.some((trigger) => trigger.kind === "source_used_again") &&
    revertTriggers.some(
      (trigger) =>
        trigger.kind === "condition_active" &&
        trigger.condition === "incapacitated",
    ) &&
    revertTriggers.some((trigger) => trigger.kind === "death") &&
    revertTriggers.some(
      (trigger) =>
        trigger.kind === "dismissed_by_target" &&
        trigger.action === "bonus_action",
    )
  );
}

function druidWildShapeTemporaryHitPoints(
  effect: AreaDirectEffectAtom,
): boolean {
  if (!isEffectAtom(effect)) return false;
  return (
    effect.kind === "grant_temp_hp" &&
    effect.amount.kind === "linear_per_level" &&
    effect.amount.axis === "class" &&
    effect.amount.base.dice === 0 &&
    effect.amount.base.dieSize === 1 &&
    effect.amount.base.flat === 1 &&
    effect.amount.base.spellcastingMod === undefined &&
    effect.amount.base.abilityModifier === undefined &&
    effect.amount.perLevel.dice === undefined &&
    effect.amount.perLevel.dieSize === undefined &&
    effect.amount.perLevel.flat === 1 &&
    effect.amount.startingAtLevel === 1
  );
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value)) &&
    right.every((value) => left.includes(value))
  );
}
