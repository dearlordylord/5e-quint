import { Effect, Layer } from "effect";

import { ToyRuntimeUnitLibrary, ToySurfaceUnitLibrary } from "#/services.ts";
import type {
  ActionSurgeSurface,
  CureWoundsSurface,
  FireballSurface,
  ToySurfaceUnit,
} from "#/surface-subset-schema.ts";
import type {
  ToyAuthoredUnitId,
  ToyRuntimeExecutable,
  ToyRuntimeUnit,
} from "#/types.ts";

function compileCureWoundsExecutable(
  unit: CureWoundsSurface,
): Extract<ToyRuntimeExecutable, { readonly tag: "singleTargetHeal" }> {
  const phase = unit.mechanics.phases[0];
  const effect = phase.effects[0];
  return {
    tag: "singleTargetHeal",
    activation: unit.mechanics.castingTime.kind,
    baseLevel: unit.mechanics.level,
    addsSpellcastingModifier: effect.amount.base.spellcastingMod,
    range: unit.mechanics.range.kind,
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
  const phase = unit.mechanics.phases[0];
  return {
    tag: "areaSaveDamage",
    activation: unit.mechanics.castingTime.kind,
    baseLevel: unit.mechanics.level,
    rangeFeet: unit.mechanics.range.feet,
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
  const phase = unit.mechanics.phases[0];
  const effect = phase.effects[0];
  return {
    tag: "grantExtraAction",
    activation: unit.mechanics.activationCost.kind,
    restrictedActions: effect.restriction.actions,
    resetCadence: unit.mechanics.resetCadence.kind,
    usageLimit: unit.mechanics.usageLimit.kind,
    usesByLevel: [
      {
        atLevel: unit.acquiredAtLevel,
        value: unit.mechanics.resource.cap.base,
      },
      ...unit.mechanics.resource.cap.tiers,
    ],
  };
}

export function hydrateToyRuntimeUnit(unit: ToySurfaceUnit): ToyRuntimeUnit {
  if (unit.id === "cure_wounds") {
    return {
      unitId: unit.id,
      sourceKind: unit.kind,
      name: unit.name,
      provenanceSection: unit.provenance.section,
      executable: compileCureWoundsExecutable(unit),
    };
  }
  if (unit.id === "fireball") {
    return {
      unitId: unit.id,
      sourceKind: unit.kind,
      name: unit.name,
      provenanceSection: unit.provenance.section,
      executable: compileFireballExecutable(unit),
    };
  }
  return {
    unitId: unit.id,
    sourceKind: unit.kind,
    name: unit.name,
    provenanceSection: unit.provenance.section,
    executable: compileActionSurgeExecutable(unit),
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
