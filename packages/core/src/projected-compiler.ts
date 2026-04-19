import { Match } from "effect";

import {
  ACID_SPLASH_PROJECTED_ACTION,
  ACTION_SURGE_PROJECTED_ACTION,
  MAGE_ARMOR_PROJECTED_RECORD,
  SECOND_WIND_PROJECTED_ACTION,
} from "#/projected-action-records.ts";
import {
  type ProjectedExecutableAction,
  type ProjectedPersistentRecord,
} from "#/projected-executable.ts";

import type {
  ClassFeatureRecord,
  SpellRecord,
} from "../../prototype-content-surface/src/surface/types.ts";

type ActivationSpellRecord = SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { readonly family: "activation" }
  >;
};

type OngoingSpellRecord = SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >;
};

type ActivationClassFeatureRecord = ClassFeatureRecord & {
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "activation" }
  >;
};

type SaveGatePhase = ActivationSpellRecord["mechanics"]["phases"][number] & {
  readonly kind: "save_gate";
};

type DirectPhase =
  ActivationClassFeatureRecord["mechanics"]["phases"][number] & {
    readonly kind: "direct";
  };

export type ProjectableSurfaceUnit = SpellRecord | ClassFeatureRecord;

export type CompiledProjectedUnit =
  | {
      readonly tag: "CPUExecutable";
      readonly value: ProjectedExecutableAction;
    }
  | {
      readonly tag: "CPUPersistent";
      readonly value: ProjectedPersistentRecord;
    };

export class UnsupportedProjectionPatternError extends Error {
  readonly unitId: string;

  constructor(unitId: string, reason: string) {
    super(`cannot project ${unitId}: ${reason}`);
    this.name = "UnsupportedProjectionPatternError";
    this.unitId = unitId;
  }
}

const IN_SCOPE_SPELL_IDS = [
  "acid_splash",
  "mage_armor",
] as const satisfies ReadonlyArray<string>;
const IN_SCOPE_CLASS_FEATURE_IDS = [
  "fighter_second_wind",
  "fighter_action_surge_l2",
] as const satisfies ReadonlyArray<string>;

type InScopeSpellId = (typeof IN_SCOPE_SPELL_IDS)[number];
type InScopeClassFeatureId = (typeof IN_SCOPE_CLASS_FEATURE_IDS)[number];

function unsupported(unitId: string, reason: string): never {
  throw new UnsupportedProjectionPatternError(unitId, reason);
}

function require(
  condition: boolean,
  unitId: string,
  reason: string,
): asserts condition {
  if (!condition) unsupported(unitId, reason);
}

function isInScopeSpellId(id: string): id is InScopeSpellId {
  return (IN_SCOPE_SPELL_IDS as ReadonlyArray<string>).includes(id);
}

function isInScopeClassFeatureId(id: string): id is InScopeClassFeatureId {
  return (IN_SCOPE_CLASS_FEATURE_IDS as ReadonlyArray<string>).includes(id);
}

export function compileProjectedUnit(
  unit: ProjectableSurfaceUnit,
): CompiledProjectedUnit {
  return Match.value(unit.kind).pipe(
    Match.when("spell", () => compileProjectedSpell(unit as SpellRecord)),
    Match.when("class_feature", () =>
      compileProjectedClassFeature(unit as ClassFeatureRecord),
    ),
    Match.orElse(() =>
      unsupported(unit.id, `unit kind "${unit.kind}" is out of scope`),
    ),
  );
}

export function compileProjectedExecutable(
  unit: ProjectableSurfaceUnit,
): ProjectedExecutableAction {
  const compiled = compileProjectedUnit(unit);
  if (compiled.tag !== "CPUExecutable") {
    unsupported(
      unit.id,
      "unit compiles to a persistent record, not an executable action",
    );
  }
  return compiled.value;
}

export function compileProjectedPersistent(
  unit: SpellRecord,
): ProjectedPersistentRecord {
  const compiled = compileProjectedUnit(unit);
  if (compiled.tag !== "CPUPersistent") {
    unsupported(
      unit.id,
      "unit compiles to an executable action, not a persistent record",
    );
  }
  return compiled.value;
}

function compileProjectedSpell(unit: SpellRecord): CompiledProjectedUnit {
  if (!isInScopeSpellId(unit.id)) {
    unsupported(
      unit.id,
      "spell is not in the first-slice scope (acid_splash, mage_armor only)",
    );
  }

  return Match.value(unit.id).pipe(
    Match.when("acid_splash", () => {
      requireAcidSplash(unit);
      return {
        tag: "CPUExecutable" as const,
        value: ACID_SPLASH_PROJECTED_ACTION,
      };
    }),
    Match.when("mage_armor", () => {
      requireMageArmor(unit);
      return {
        tag: "CPUPersistent" as const,
        value: MAGE_ARMOR_PROJECTED_RECORD,
      };
    }),
    Match.exhaustive,
  );
}

function compileProjectedClassFeature(
  unit: ClassFeatureRecord,
): CompiledProjectedUnit {
  if (!isInScopeClassFeatureId(unit.id)) {
    unsupported(
      unit.id,
      "class feature is not in the first-slice scope (fighter_second_wind, fighter_action_surge_l2 only)",
    );
  }

  return Match.value(unit.id).pipe(
    Match.when("fighter_second_wind", () => {
      requireSecondWind(unit);
      return {
        tag: "CPUExecutable" as const,
        value: SECOND_WIND_PROJECTED_ACTION,
      };
    }),
    Match.when("fighter_action_surge_l2", () => {
      requireActionSurge(unit);
      return {
        tag: "CPUExecutable" as const,
        value: ACTION_SURGE_PROJECTED_ACTION,
      };
    }),
    Match.exhaustive,
  );
}

function requireAcidSplash(unit: SpellRecord): void {
  require(unit.mechanics.family ===
    "activation", unit.id, 'Acid Splash must use the "activation" family');
  const mechanics = (unit as ActivationSpellRecord).mechanics;
  require(mechanics.castingTime.kind ===
    "action", unit.id, 'Acid Splash casting time must stay "action"');
  require(mechanics.duration.kind ===
    "instantaneous", unit.id, 'Acid Splash duration must stay "instantaneous"');
  require(mechanics.range.kind === "point" &&
    mechanics.range.feet ===
      60, unit.id, "Acid Splash range must stay a 60-foot point");
  require(mechanics.phases.length ===
    1, unit.id, "Acid Splash must have exactly one phase");

  require(mechanics.phases[0].kind ===
    "save_gate", unit.id, 'Acid Splash phase must stay "save_gate"');
  const phase = mechanics.phases[0] as SaveGatePhase;
  require(phase.ability ===
    "dex", unit.id, 'Acid Splash save ability must stay "dex"');
  require(phase.dc.kind ===
    "caster_spell_save_dc", unit.id, 'Acid Splash save DC source must stay "caster_spell_save_dc"');
  require(phase.attachment.kind === "area" &&
    phase.attachment.origin.kind === "point_within_range" &&
    phase.attachment.shape.kind === "sphere" &&
    phase.attachment.shape.radiusFeet ===
      5, unit.id, "Acid Splash attachment must stay a 5-foot sphere at a point within range");
  require(phase.onSuccess.kind ===
    "none", unit.id, 'Acid Splash save success must stay "none"');
  require(phase.onFail.kind === "damage" &&
    phase.onFail.damageType === "acid" &&
    phase.onFail.amount.kind === "threshold_tiers" &&
    phase.onFail.amount.axis === "character" &&
    phase.onFail.amount.base.dice === 1 &&
    phase.onFail.amount.base.dieSize === 6 &&
    (phase.onFail.amount.base.flat ?? 0) === 0 &&
    phase.onFail.amount.tiers.length === 3 &&
    phase.onFail.amount.tiers[0].atLevel === 5 &&
    phase.onFail.amount.tiers[0].override.dice === 2 &&
    phase.onFail.amount.tiers[0].override.dieSize === undefined &&
    phase.onFail.amount.tiers[0].override.flat === undefined &&
    phase.onFail.amount.tiers[1].atLevel === 11 &&
    phase.onFail.amount.tiers[1].override.dice === 3 &&
    phase.onFail.amount.tiers[1].override.dieSize === undefined &&
    phase.onFail.amount.tiers[1].override.flat === undefined &&
    phase.onFail.amount.tiers[2].atLevel === 17 &&
    phase.onFail.amount.tiers[2].override.dice === 4 &&
    phase.onFail.amount.tiers[2].override.dieSize === undefined &&
    phase.onFail.amount.tiers[2].override.flat ===
      undefined, unit.id, "Acid Splash damage must stay the frozen 1d6/2d6/3d6/4d6 acid threshold-tiers shape");
}

function requireMageArmor(unit: SpellRecord): void {
  require(unit.mechanics.family ===
    "ongoing_effect", unit.id, 'Mage Armor must use the "ongoing_effect" family');
  const mechanics = (unit as OngoingSpellRecord).mechanics;
  require(mechanics.castingTime.kind ===
    "action", unit.id, 'Mage Armor casting time must stay "action"');
  require(mechanics.range.kind ===
    "touch", unit.id, 'Mage Armor range must stay "touch"');
  require(mechanics.initialPhase ===
    undefined, unit.id, "Mage Armor must not gain an initial phase");
  require(mechanics.attachment.kind === "target" &&
    mechanics.attachment.selection.mode ===
      "one", unit.id, "Mage Armor attachment must stay a single chosen target");
  require(mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "hour" &&
    mechanics.duration.value.amount === 8 &&
    mechanics.duration.earlyEnd?.length === 1 &&
    mechanics.duration.earlyEnd[0].kind ===
      "target_dons_armor", unit.id, "Mage Armor duration must stay timed 8 hours with exactly target_dons_armor early-end");
  require(mechanics.operations.length ===
    1, unit.id, "Mage Armor must have exactly one ongoing operation");

  const operation = mechanics.operations[0];
  require(operation.trigger.kind ===
    "passive", unit.id, 'Mage Armor trigger must stay "passive"');
  require(operation.predicate ===
    undefined, unit.id, "Mage Armor must not gain a predicate gate");
  require(operation.usageLimit ===
    undefined, unit.id, "Mage Armor must not gain a usage limit");
  require(operation.effect.kind === "modify_ac_set_base" &&
    operation.effect.const === 13 &&
    operation.effect.abilityMod ===
      "dex", unit.id, "Mage Armor effect must stay modify_ac_set_base(13 + Dex)");
}

function requireSecondWind(unit: ClassFeatureRecord): void {
  require(unit.mechanics.family ===
    "activation", unit.id, 'Second Wind must use the "activation" family');
  const mechanics = (unit as ActivationClassFeatureRecord).mechanics;
  require(unit.className ===
    "fighter", unit.id, 'Second Wind className must stay "fighter"');
  require(mechanics.activationCost.kind ===
    "bonus_action", unit.id, 'Second Wind activation cost must stay "bonus_action"');
  require(mechanics.phases.length ===
    1, unit.id, "Second Wind must have exactly one phase");
  require(mechanics.resource.kind ===
    "use_count", unit.id, 'Second Wind resource must stay "use_count"');
  require(mechanics.resource.cap.kind === "threshold_tiers" &&
    mechanics.resource.cap.axis === "class" &&
    mechanics.resource.cap.base === 2 &&
    mechanics.resource.cap.tiers.length === 2 &&
    mechanics.resource.cap.tiers[0].atLevel === 4 &&
    mechanics.resource.cap.tiers[0].value === 3 &&
    mechanics.resource.cap.tiers[1].atLevel === 10 &&
    mechanics.resource.cap.tiers[1].value ===
      4, unit.id, "Second Wind resource cap must stay the frozen fighter threshold tiers");
  require(mechanics.resetCadence.kind === "partial_short_full_long" &&
    mechanics.resetCadence.shortRestRefill ===
      1, unit.id, "Second Wind reset cadence must stay partial_short_full_long with shortRestRefill 1");
  require(mechanics.usageLimit ===
    undefined, unit.id, "Second Wind must not gain a usage limit");

  const phase = mechanics.phases[0] as DirectPhase;
  require(phase.kind === "direct" &&
    phase.mode === undefined &&
    phase.attachment.kind === "self" &&
    phase.effects?.length ===
      1, unit.id, "Second Wind phase must stay a direct self attachment with exactly one effect");

  const effects = phase.effects;
  require(effects !==
    undefined, unit.id, "Second Wind direct phase must keep its effect list");
  const effect = effects[0];
  require(effect.kind === "heal_hp" &&
    effect.target === "self" &&
    effect.amount.kind === "linear_per_level" &&
    effect.amount.axis === "class" &&
    effect.amount.base.dice === 1 &&
    effect.amount.base.dieSize === 10 &&
    effect.amount.base.flat === 1 &&
    effect.amount.perLevel.flat === 1 &&
    effect.amount.perLevel.dice === undefined &&
    effect.amount.perLevel.dieSize === undefined &&
    effect.amount.startingAtLevel ===
      1, unit.id, "Second Wind heal amount must stay the frozen 1d10 + fighter level shape");
}

function requireActionSurge(unit: ClassFeatureRecord): void {
  require(unit.mechanics.family ===
    "activation", unit.id, 'Action Surge must use the "activation" family');
  const mechanics = (unit as ActivationClassFeatureRecord).mechanics;
  require(unit.className ===
    "fighter", unit.id, 'Action Surge className must stay "fighter"');
  require(mechanics.activationCost.kind ===
    "free", unit.id, 'Action Surge activation cost must stay "free"');
  require(mechanics.phases.length ===
    1, unit.id, "Action Surge must have exactly one phase");
  require(mechanics.resource.kind ===
    "use_count", unit.id, 'Action Surge resource must stay "use_count"');
  require(mechanics.resource.cap.kind === "threshold_tiers" &&
    mechanics.resource.cap.axis === "class" &&
    mechanics.resource.cap.base === 1 &&
    mechanics.resource.cap.tiers.length === 1 &&
    mechanics.resource.cap.tiers[0].atLevel === 17 &&
    mechanics.resource.cap.tiers[0].value ===
      2, unit.id, "Action Surge resource cap must stay the frozen fighter threshold tiers");
  require(mechanics.resetCadence.kind ===
    "short_or_long_rest", unit.id, 'Action Surge reset cadence must stay "short_or_long_rest"');
  require(mechanics.usageLimit?.kind ===
    "once_per_turn", unit.id, 'Action Surge usage limit must stay "once_per_turn"');

  const phase = mechanics.phases[0] as DirectPhase;
  require(phase.kind === "direct" &&
    phase.mode === undefined &&
    phase.attachment.kind === "self" &&
    phase.effects?.length ===
      1, unit.id, "Action Surge phase must stay a direct self attachment with exactly one effect");

  const effects = phase.effects;
  require(effects !==
    undefined, unit.id, "Action Surge direct phase must keep its effect list");
  const effect = effects[0];
  require(effect.kind === "grant_extra_action" &&
    effect.restriction.kind === "exclude" &&
    effect.restriction.actions.length === 1 &&
    effect.restriction.actions[0] ===
      "magic", unit.id, "Action Surge extra action restriction must stay exclude[magic]");
}
