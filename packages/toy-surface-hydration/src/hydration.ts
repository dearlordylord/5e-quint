import { Effect, Layer } from "effect";
import type {
  ClassFeatureRecord,
  SpellRecord,
} from "@dnd/prototype-content-surface/surface/types";

import { ToyRuntimeUnitLibrary, ToySurfaceUnitLibrary } from "#/services.ts";
import type {
  ToyAuthoredUnitId,
  ToyRuntimeExecutable,
  ToyRuntimeUnit,
  ToySurfaceUnit,
} from "#/types.ts";

type CureWoundsSurface = SpellRecord & { readonly id: "cure_wounds" };
type FireballSurface = SpellRecord & { readonly id: "fireball" };
type ActionSurgeSurface = ClassFeatureRecord & {
  readonly id: "fighter_action_surge_l2";
};

function expectToyShape(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function compileCureWoundsExecutable(
  unit: CureWoundsSurface,
): Extract<ToyRuntimeExecutable, { readonly tag: "singleTargetHeal" }> {
  expectToyShape(
    unit.mechanics.family === "activation",
    "cure_wounds must use activation mechanics in the toy package",
  );
  const mechanics = unit.mechanics;
  expectToyShape(
    mechanics.castingTime.kind === "action",
    "cure_wounds must cast as an action in the toy package",
  );
  expectToyShape(
    mechanics.range.kind === "touch",
    "cure_wounds must use touch range in the toy package",
  );
  const phase = mechanics.phases[0];
  expectToyShape(
    phase?.kind === "direct",
    "cure_wounds must use a direct phase in the toy package",
  );
  const effect = phase.effects?.[0];
  expectToyShape(
    effect?.kind === "heal_hp" &&
      effect.target === "target_creature" &&
      effect.amount.kind === "linear_per_level" &&
      effect.amount.base.spellcastingMod != null &&
      effect.amount.perLevel.dice != null,
    "cure_wounds must use linear-per-level heal_hp in the toy package",
  );
  return {
    tag: "singleTargetHeal",
    activation: mechanics.castingTime.kind,
    baseLevel: mechanics.level,
    addsSpellcastingModifier: effect.amount.base.spellcastingMod,
    range: mechanics.range.kind,
    scaling: {
      baseDice: effect.amount.base.dice,
      dieSize: effect.amount.base.dieSize,
      perSlotAboveBaseDice: effect.amount.perLevel.dice,
    },
  };
}

function compileFireballExecutable(
  unit: FireballSurface,
): Extract<ToyRuntimeExecutable, { readonly tag: "areaSaveDamage" }> {
  expectToyShape(
    unit.mechanics.family === "activation",
    "fireball must use activation mechanics in the toy package",
  );
  const mechanics = unit.mechanics;
  expectToyShape(
    mechanics.castingTime.kind === "action",
    "fireball must cast as an action in the toy package",
  );
  expectToyShape(
    mechanics.range.kind === "point",
    "fireball must use point range in the toy package",
  );
  const phase = mechanics.phases[0];
  expectToyShape(
    phase?.kind === "save_gate" &&
      phase.attachment.kind === "area" &&
      phase.attachment.shape.kind === "sphere" &&
      phase.onFail.kind === "damage" &&
      phase.onFail.amount.kind === "linear_per_level" &&
      typeof phase.onFail.damageType === "string" &&
      phase.onFail.amount.perLevel.dice != null,
    "fireball must use the expected save-gated area damage shape in the toy package",
  );
  return {
    tag: "areaSaveDamage",
    activation: mechanics.castingTime.kind,
    baseLevel: mechanics.level,
    rangeFeet: mechanics.range.feet,
    radiusFeet: phase.attachment.shape.radiusFeet,
    saveAbility: phase.ability,
    damageType: phase.onFail.damageType,
    halfOnSuccess: true,
    scaling: {
      baseDice: phase.onFail.amount.base.dice,
      dieSize: phase.onFail.amount.base.dieSize,
      perSlotAboveBaseDice: phase.onFail.amount.perLevel.dice,
    },
    dcSource: "casterSpellSaveDc",
  };
}

function compileActionSurgeExecutable(
  unit: ActionSurgeSurface,
): Extract<ToyRuntimeExecutable, { readonly tag: "grantExtraAction" }> {
  expectToyShape(
    unit.mechanics.family === "activation",
    "fighter_action_surge_l2 must use activation mechanics in the toy package",
  );
  const mechanics = unit.mechanics;
  expectToyShape(
    mechanics.activationCost.kind === "free",
    "fighter_action_surge_l2 must be free in the toy package",
  );
  expectToyShape(
    mechanics.resetCadence.kind === "short_or_long_rest",
    "fighter_action_surge_l2 must reset on short or long rest in the toy package",
  );
  expectToyShape(
    mechanics.usageLimit?.kind === "once_per_turn",
    "fighter_action_surge_l2 must use once_per_turn in the toy package",
  );
  expectToyShape(
    mechanics.resource.kind === "use_count" &&
      mechanics.resource.cap.kind === "threshold_tiers",
    "fighter_action_surge_l2 must use threshold-tier use-count resources in the toy package",
  );
  const phase = mechanics.phases[0];
  expectToyShape(
    phase?.kind === "direct",
    "fighter_action_surge_l2 must use a direct phase in the toy package",
  );
  const effect = phase.effects?.[0];
  expectToyShape(
    effect?.kind === "grant_extra_action" &&
      effect.restriction.kind === "exclude",
    "fighter_action_surge_l2 must grant an extra action with excluded actions in the toy package",
  );
  const usageLimit = mechanics.usageLimit;
  return {
    tag: "grantExtraAction",
    activation: mechanics.activationCost.kind,
    restrictedActions: effect.restriction.actions,
    resetCadence: mechanics.resetCadence.kind,
    usageLimit: usageLimit.kind,
    usesByLevel: [
      {
        atLevel: unit.acquiredAtLevel,
        value: mechanics.resource.cap.base,
      },
      ...mechanics.resource.cap.tiers,
    ],
  };
}

export function hydrateToyRuntimeUnit(unit: ToySurfaceUnit): ToyRuntimeUnit {
  if (unit.kind === "spell" && unit.id === "cure_wounds") {
    return {
      unitId: unit.id,
      sourceKind: "spell",
      name: unit.name,
      provenanceSection: unit.provenance.section,
      executable: compileCureWoundsExecutable(unit as CureWoundsSurface),
    };
  }
  if (unit.kind === "spell" && unit.id === "fireball") {
    return {
      unitId: unit.id,
      sourceKind: "spell",
      name: unit.name,
      provenanceSection: unit.provenance.section,
      executable: compileFireballExecutable(unit as FireballSurface),
    };
  }
  return {
    unitId: "fighter_action_surge_l2",
    sourceKind: "class_feature",
    name: unit.name,
    provenanceSection: unit.provenance.section,
    executable: compileActionSurgeExecutable(unit as ActionSurgeSurface),
  };
}

export function hydrateToyRuntimeLibrary(
  surfaceUnits: ReadonlyMap<ToyAuthoredUnitId, ToySurfaceUnit>,
): ReadonlyMap<ToyAuthoredUnitId, ToyRuntimeUnit> {
  return new Map(
    [...surfaceUnits.entries()].map(([unitId, unit]) => [
      unitId,
      hydrateToyRuntimeUnit(unit),
    ]),
  );
}

export const ToyRuntimeUnitLibraryLive = Layer.effect(
  ToyRuntimeUnitLibrary,
  Effect.gen(function*() {
    const surfaceUnits = yield* ToySurfaceUnitLibrary;
    return hydrateToyRuntimeLibrary(surfaceUnits);
  }),
);
