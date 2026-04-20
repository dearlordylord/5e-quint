/**
 * Compiler from authored unit definitions to execution projections.
 *
 * Responsibility split:
 * - authored unit definition: rich content-surface truth, including fields
 *   needed for authoring fidelity, provenance, validation, and future width
 * - execution projection: smaller runtime-facing IR used only for promoted
 *   executable/persistent semantics
 * - runtime invocation: targets, chosen slot level or equivalent spend,
 *   save/attack outcomes, and rolled amounts
 * - spell/feature effect state: battle-owned live state after application
 *
 * This compiler is intentionally a narrowing step. Unsupported authored shapes
 * fail closed here instead of leaking partially-handled surface language into
 * runtime reducers.
 */
import { Match } from "effect";

import type {
  ProjectedExecutableAction,
  ProjectedPersistentRecord,
  ProjectedSource,
} from "#/projected-executable.ts";

import type {
  ClassFeatureRecord,
  DcSource,
  DiceAmount,
  DurationEndTrigger,
  OngoingOperation,
  ResetCadence,
  SpellRecord,
  UsageLimit,
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

type SaveGatePhase = Extract<
  ActivationSpellRecord["mechanics"]["phases"][number],
  { readonly kind: "save_gate" }
>;
type DirectPhase =
  ActivationClassFeatureRecord["mechanics"]["phases"][number] & {
    readonly kind: "direct";
  };
type UseCountResource = Extract<
  NonNullable<ActivationClassFeatureRecord["mechanics"]["resource"]>,
  { readonly kind: "use_count" }
>;

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

function projectedSource(
  unit: ProjectableSurfaceUnit,
): ProjectedSource {
  return {
    unitId: unit.id,
    unitKind: unit.kind === "spell" ? "PUKSpell" : "PUKClassFeature",
    unitName: unit.name,
  };
}

function compileActivationCost(
  unit: ProjectableSurfaceUnit,
  activation:
    | ActivationSpellRecord["mechanics"]["castingTime"]
    | ActivationClassFeatureRecord["mechanics"]["activationCost"],
): ProjectedExecutableAction["activationCost"] {
  return Match.value(activation.kind).pipe(
    Match.when("action", () => "PACAction" as const),
    Match.when("bonus_action", () => "PACBonusAction" as const),
    Match.when("free", () => "PACFree" as const),
    Match.orElse(() =>
      unsupported(unit.id, `unsupported activation cost "${activation.kind}"`),
    ),
  );
}

function compileAttachment(
  unit: ProjectableSurfaceUnit,
  attachment:
    | SaveGatePhase["attachment"]
    | DirectPhase["attachment"]
    | OngoingSpellRecord["mechanics"]["attachment"],
): ProjectedExecutableAction["attachment"] {
  if (attachment.kind === "self") {
    return { tag: "PEASelf" };
  }
  if (attachment.kind === "target") {
    require(
      attachment.selection.mode === "one",
      unit.id,
      "target attachment must stay a single chosen target",
    );
    return { tag: "PEAOneTarget" };
  }
  if (attachment.kind === "area") {
    require(
      attachment.origin.kind === "point_within_range" &&
        attachment.shape.kind === "sphere",
      unit.id,
      "area attachment must stay a point-within-range sphere",
    );
    return {
      tag: "PEAAreaSpherePointWithinRange",
      value: {
        rangeFeet: 0,
        radiusFeet: attachment.shape.radiusFeet,
      },
    };
  }
  return unsupported(
    unit.id,
    `unsupported projected attachment kind "${attachment.kind}"`,
  );
}

function compileSpellAttachment(
  unit: ActivationSpellRecord,
  phase: SaveGatePhase,
): ProjectedExecutableAction["attachment"] {
  const attachment = compileAttachment(unit, phase.attachment);
  if (attachment.tag === "PEAAreaSpherePointWithinRange") {
    require(
      unit.mechanics.range.kind === "point",
      unit.id,
      "area spell range must stay a point range",
    );
    return {
      ...attachment,
      value: {
        ...attachment.value,
        rangeFeet: unit.mechanics.range.feet,
      },
    };
  }
  return attachment;
}

function compileUsageLimit(
  unit: ProjectableSurfaceUnit,
  usageLimit: UsageLimit | undefined,
): ProjectedExecutableAction["usageLimit"] {
  if (usageLimit == null) return "PULNone";
  return Match.value(usageLimit.kind).pipe(
    Match.when("once_per_turn", () => "PULOncePerTurn" as const),
    Match.orElse(() =>
      unsupported(
        unit.id,
        `unsupported projected usage limit "${usageLimit.kind}"`,
      ),
    ),
  );
}

function compileThresholdCap(
  unit: ProjectableSurfaceUnit,
  cap: UseCountResource["cap"],
): Extract<ProjectedExecutableAction["resourceGate"], { readonly tag: "PRGUseCount" }>["value"]["cap"] {
  require(
    cap.kind === "threshold_tiers",
    unit.id,
    'resource cap must stay "threshold_tiers"',
  );
  require(cap.axis === "class", unit.id, 'resource cap axis must stay "class"');
  return {
    tag: "PRCThresholdTiers",
    value: {
      axis: "PRAClass",
      base: cap.base,
      tiers: cap.tiers.map((tier) => ({
        atLevel: tier.atLevel,
        value: tier.value,
      })),
    },
  };
}

function compileResetCadence(
  unit: ProjectableSurfaceUnit,
  cadence: ResetCadence,
): Extract<ProjectedExecutableAction["resourceGate"], { readonly tag: "PRGUseCount" }>["value"]["resetCadence"] {
  if (cadence.kind === "partial_short_full_long") {
    return {
      tag: "PRCPartialShortFullLong",
      value: { shortRestRefill: cadence.shortRestRefill },
    };
  }
  if (cadence.kind === "short_or_long_rest") {
    return { tag: "PRCShortOrLongRest" };
  }
  return unsupported(
    unit.id,
    `unsupported projected reset cadence "${cadence.kind}"`,
  );
}

function compileResourceGate(
  unit: ActivationClassFeatureRecord,
  pool:
    | Extract<
        ProjectedExecutableAction["resourceGate"],
        { readonly tag: "PRGUseCount" }
      >["value"]["pool"]
    | null,
): ProjectedExecutableAction["resourceGate"] {
  const { resource, resetCadence } = unit.mechanics;
  if (resource == null) return { tag: "PRGNone" };
  require(
    pool != null,
    unit.id,
    "resource-backed projected feature requires a supported resource pool",
  );
  require(
    resetCadence != null,
    unit.id,
    "resource-backed projected feature requires a reset cadence",
  );
  return Match.value(resource.kind).pipe(
    Match.when("use_count", () => ({
      tag: "PRGUseCount" as const,
      value: {
        pool,
        cap: compileThresholdCap(unit, resource.cap),
        resetCadence: compileResetCadence(unit, resetCadence),
      },
    })),
    Match.orElse(() =>
      unsupported(
        unit.id,
        `unsupported projected resource kind "${resource.kind}"`,
      ),
    ),
  );
}

function compileSpellSaveDc(
  unit: ProjectableSurfaceUnit,
  dc: DcSource,
): Extract<ProjectedExecutableAction, { readonly tag: "PEASaveGateDamage" }>["dc"] {
  if (dc.kind === "caster_spell_save_dc") return "PDCSpellSaveDc";
  return unsupported(unit.id, `unsupported projected save DC source "${dc.kind}"`);
}

function compileAmount(
  unit: ProjectableSurfaceUnit,
  amount: DiceAmount,
): Extract<ProjectedExecutableAction, { readonly amount: unknown }>["amount"] {
  if (amount.kind === "threshold_tiers") {
    require(
      amount.axis === "character",
      unit.id,
      'threshold-tier amount axis must stay "character"',
    );
    return {
      tag: "PAThresholdDice",
      value: {
        axis: "PLACharacterLevel",
        base: {
          dice: amount.base.dice,
          dieSize: amount.base.dieSize,
          flat: amount.base.flat ?? 0,
        },
        tiers: amount.tiers.map((tier) => ({
          atLevel: tier.atLevel,
          diceOverride: tier.override.dice ?? amount.base.dice,
        })),
      },
    };
  }
  if (amount.kind === "linear_per_level") {
    require(
      amount.axis === "class",
      unit.id,
      'linear-per-level amount axis must stay "class"',
    );
    return {
      tag: "PALinearDicePlusLevel",
      value: {
        axis: "PLAFighterLevel",
        base: {
          dice: amount.base.dice,
          dieSize: amount.base.dieSize,
          flat: amount.base.flat ?? 0,
        },
        perLevelFlat: amount.perLevel.flat ?? 0,
        startingAtLevel: amount.startingAtLevel,
      },
    };
  }
  return unsupported(unit.id, `unsupported projected amount kind "${amount.kind}"`);
}

function compileActivationSaveGateDamageSpell(
  unit: ActivationSpellRecord,
): ProjectedExecutableAction | null {
  if (unit.mechanics.duration.kind !== "instantaneous") return null;
  if (unit.mechanics.phases.length !== 1) return null;
  const phase = unit.mechanics.phases[0];
  if (phase.kind !== "save_gate") return null;
  if (phase.onSuccess.kind !== "none") return null;
  if (phase.onFail.kind !== "damage") return null;
  require(
    typeof phase.onFail.damageType === "string",
    unit.id,
    "projected damage type must stay a concrete damage type",
  );
  return {
    tag: "PEASaveGateDamage",
    source: projectedSource(unit),
    activationCost: compileActivationCost(unit, unit.mechanics.castingTime),
    resourceGate: { tag: "PRGNone" },
    usageLimit: "PULNone",
    attachment: compileSpellAttachment(unit, phase),
    ability: phase.ability,
    dc: compileSpellSaveDc(unit, phase.dc),
    damageType: phase.onFail.damageType,
    amount: compileAmount(unit, phase.onFail.amount),
  };
}

function compileDirectFeature(
  unit: ActivationClassFeatureRecord,
): ProjectedExecutableAction | null {
  if (unit.mechanics.phases.length !== 1) return null;
  const phase = unit.mechanics.phases[0];
  if (phase.kind !== "direct" || phase.mode !== undefined) return null;
  if (phase.attachment.kind !== "self") return null;
  if ((phase.effects?.length ?? 0) !== 1) return null;
  const effect = phase.effects?.[0];
  if (effect == null) return null;

  const base = {
    source: projectedSource(unit),
    activationCost: compileActivationCost(unit, unit.mechanics.activationCost),
    usageLimit: compileUsageLimit(unit, unit.mechanics.usageLimit),
    attachment: compileAttachment(unit, phase.attachment),
  };

  if (effect.kind === "heal_hp") {
    return {
      tag: "PEADirectHealHp",
      ...base,
      resourceGate: compileResourceGate(unit, "PRPSecondWind"),
      amount: compileAmount(unit, effect.amount),
    };
  }
  if (effect.kind === "grant_extra_action") {
    require(
      effect.restriction.kind === "exclude" &&
        effect.restriction.actions.length === 1 &&
        effect.restriction.actions[0] === "magic",
      unit.id,
      "grant_extra_action restriction must stay exclude magic",
    );
    return {
      tag: "PEADirectGrantExtraAction",
      ...base,
      resourceGate: compileResourceGate(unit, "PRPActionSurge"),
      restriction: "PGARExcludeMagicAction",
    };
  }
  return null;
}

function compilePassiveSetBaseAc(
  unit: OngoingSpellRecord,
): ProjectedPersistentRecord | null {
  if (unit.mechanics.initialPhase !== undefined) return null;
  if (unit.mechanics.operations.length !== 1) return null;
  const operation: OngoingOperation = unit.mechanics.operations[0];
  if (operation.trigger.kind !== "passive") return null;
  if (operation.predicate != null || operation.usageLimit != null) return null;
  if (operation.effect.kind !== "modify_ac_set_base") return null;
  if (unit.mechanics.attachment.kind !== "target") return null;
  if (unit.mechanics.attachment.selection.mode !== "one") return null;
  require(
    unit.mechanics.duration.kind === "timed",
    unit.id,
    'persistent base-AC projection requires a timed duration',
  );

  return {
    tag: "PPRSetBaseAc",
    value: {
      source: projectedSource(unit),
      attachment: "PPAChosenTarget",
      baseArmorClass: operation.effect.const,
      abilityModifier: operation.effect.abilityMod,
      earlyEnds: (unit.mechanics.duration.earlyEnd ?? []).map((trigger) =>
        compileEarlyEnd(unit, trigger)
      ),
    },
  };
}

function compileEarlyEnd(
  unit: ProjectableSurfaceUnit,
  trigger: DurationEndTrigger,
): ProjectedPersistentRecord["value"]["earlyEnds"][number] {
  return Match.value(trigger.kind).pipe(
    Match.when("target_dons_armor", () => "PPEETargetDonsArmor" as const),
    Match.orElse(() =>
      unsupported(
        unit.id,
        `unsupported projected persistent early-end "${trigger.kind}"`,
      ),
    ),
  );
}

function compileProjectedSpell(unit: SpellRecord): CompiledProjectedUnit {
  require(
    unit.kind === "spell",
    unit.id,
    'projected spell compiler requires kind "spell"',
  );
  return Match.value(unit.mechanics.family).pipe(
    Match.when("activation", () => {
      const compiled = compileActivationSaveGateDamageSpell(
        unit as ActivationSpellRecord,
      );
      if (compiled == null) {
        unsupported(unit.id, "activation spell shape is out of projected scope");
      }
      return { tag: "CPUExecutable" as const, value: compiled };
    }),
    Match.when("ongoing_effect", () => {
      const compiled = compilePassiveSetBaseAc(unit as OngoingSpellRecord);
      if (compiled == null) {
        unsupported(
          unit.id,
          "ongoing-effect spell shape is out of projected persistent scope",
        );
      }
      return { tag: "CPUPersistent" as const, value: compiled };
    }),
    Match.orElse(() =>
      unsupported(
        unit.id,
        `spell family "${unit.mechanics.family}" is out of projected scope`,
      ),
    ),
  );
}

function compileProjectedClassFeature(
  unit: ClassFeatureRecord,
): CompiledProjectedUnit {
  require(
    unit.mechanics.family === "activation",
    unit.id,
    'projected class-feature compiler currently supports only "activation"',
  );
  const compiled = compileDirectFeature(unit as ActivationClassFeatureRecord);
  if (compiled == null) {
    unsupported(unit.id, "class-feature shape is out of projected scope");
  }
  return { tag: "CPUExecutable" as const, value: compiled };
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
