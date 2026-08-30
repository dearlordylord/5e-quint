import { movementFeet } from "@dnd/shared/types";
import type { EffectAtom } from "@dnd/surface/surface/types";

import type {
  BattleIlluminationEmissionFacts,
  BattleLightEmitterOpaqueCoverInteraction,
} from "../../procedure-execution/spell-execution-vocabulary.ts";

type SurfaceLightEmission = Extract<
  EffectAtom,
  { readonly kind: "emit_light" }
>;

export function illuminationEmissionFactsFromSurface(input: {
  readonly effect: SurfaceLightEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
}): BattleIlluminationEmissionFacts | null {
  const brightRadiusFeet = input.effect.brightRadiusFeet;
  const dimAdditionalFeet = input.effect.dimAdditionalFeet ?? 0;
  if (
    !Number.isInteger(brightRadiusFeet) ||
    !Number.isInteger(dimAdditionalFeet) ||
    brightRadiusFeet < 0 ||
    dimAdditionalFeet < 0 ||
    (brightRadiusFeet === 0 && dimAdditionalFeet === 0)
  ) {
    return null;
  }
  return {
    emission:
      brightRadiusFeet === 0
        ? { kind: "dim", radiusFeet: movementFeet(dimAdditionalFeet) }
        : {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(brightRadiusFeet),
            dimAdditionalFeet: movementFeet(dimAdditionalFeet),
          },
    opaqueCoverInteraction: input.opaqueCoverInteraction,
  };
}
