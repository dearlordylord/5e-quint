import { movementFeet } from "@dnd/shared/types";
import type { EffectAtom } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type {
  BattleIlluminationEmissionFacts,
  BattleLightEmitterOpaqueCoverInteraction,
} from "../../procedure-execution/spell-execution-vocabulary.ts";

type SurfaceIlluminationEmission = Extract<
  EffectAtom,
  {
    readonly kind:
      | "emit_bright_and_dim_illumination"
      | "emit_bright_illumination"
      | "emit_dim_illumination";
  }
>;

export function illuminationEmissionFactsFromSurface(input: {
  readonly effect: SurfaceIlluminationEmission;
  readonly opaqueCoverInteraction: BattleLightEmitterOpaqueCoverInteraction;
}): BattleIlluminationEmissionFacts | null {
  return Match.value(input.effect).pipe(
    Match.when({ kind: "emit_bright_illumination" }, ({ radiusFeet }) =>
      Number.isInteger(radiusFeet) && radiusFeet > 0
        ? {
            emission: {
              kind: "bright" as const,
              radiusFeet: movementFeet(radiusFeet),
            },
            opaqueCoverInteraction: input.opaqueCoverInteraction,
          }
        : null,
    ),
    Match.when({ kind: "emit_dim_illumination" }, ({ radiusFeet }) =>
      Number.isInteger(radiusFeet) && radiusFeet > 0
        ? {
            emission: {
              kind: "dim" as const,
              radiusFeet: movementFeet(radiusFeet),
            },
            opaqueCoverInteraction: input.opaqueCoverInteraction,
          }
        : null,
    ),
    Match.when(
      { kind: "emit_bright_and_dim_illumination" },
      ({ brightRadiusFeet, dimAdditionalFeet }) => {
        if (
          !Number.isInteger(brightRadiusFeet) ||
          !Number.isInteger(dimAdditionalFeet) ||
          brightRadiusFeet <= 0 ||
          dimAdditionalFeet <= 0
        ) {
          return null;
        }
        return {
          emission: {
            kind: "brightAndDim" as const,
            brightRadiusFeet: movementFeet(brightRadiusFeet),
            dimAdditionalFeet: movementFeet(dimAdditionalFeet),
          },
          opaqueCoverInteraction: input.opaqueCoverInteraction,
        };
      },
    ),
    Match.exhaustive,
  );
}
