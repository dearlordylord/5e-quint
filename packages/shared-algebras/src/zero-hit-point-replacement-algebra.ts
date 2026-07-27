import type {
  ActivationResource,
  UnitRecord,
} from "@dnd/surface/surface/types";

export const ZERO_HIT_POINT_REPLACEMENT_RESOURCE = {
  kind: "use_count",
  cap: { kind: "fixed", uses: 1 },
} as const satisfies ActivationResource;

type ZeroHitPointReplacementUnit = Extract<
  UnitRecord,
  { readonly kind: "species_trait" }
> & {
  readonly mechanics: Extract<
    Extract<UnitRecord, { readonly kind: "species_trait" }>["mechanics"],
    { readonly family: "triggered_replacement" }
  > & {
    readonly trigger: {
      readonly kind: "reduced_to_0_hp_not_killed_outright";
    };
    readonly effect: {
      readonly kind: "prevent_drop_to_0_hp";
      readonly replacementHp: 1;
    };
    readonly optional: true;
    readonly resetCadence: { readonly kind: "long_rest" };
  };
};

export type ZeroHitPointReplacementUnitProfile = {
  readonly unit: ZeroHitPointReplacementUnit;
  readonly optional: true;
  readonly trigger: "reducedToZeroHitPointsNotKilledOutright";
  readonly replacementHp: 1;
  readonly resetCadence: "longRest";
  readonly resource: typeof ZERO_HIT_POINT_REPLACEMENT_RESOURCE;
};

export function zeroHitPointReplacementUnitProfile(
  unit: UnitRecord,
): ZeroHitPointReplacementUnitProfile | null {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "triggered_replacement"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "reduced_to_0_hp_not_killed_outright" ||
    mechanics.effect.kind !== "prevent_drop_to_0_hp" ||
    mechanics.effect.replacementHp !== 1 ||
    mechanics.optional !== true ||
    mechanics.resetCadence.kind !== "long_rest"
  ) {
    return null;
  }
  return {
    unit: {
      ...unit,
      mechanics: {
        family: "triggered_replacement",
        trigger: { kind: "reduced_to_0_hp_not_killed_outright" },
        effect: { kind: "prevent_drop_to_0_hp", replacementHp: 1 },
        optional: true,
        resetCadence: { kind: "long_rest" },
      },
    },
    optional: true,
    trigger: "reducedToZeroHitPointsNotKilledOutright",
    replacementHp: 1,
    resetCadence: "longRest",
    resource: ZERO_HIT_POINT_REPLACEMENT_RESOURCE,
  };
}
