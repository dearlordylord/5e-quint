import type {
  StatBlockSpellInvocationDelta,
  StatBlockSpellInvocationDeltas,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

type DeltaOfKind<Kind extends StatBlockSpellInvocationDelta["kind"]> = Extract<
  StatBlockSpellInvocationDelta,
  { readonly kind: Kind }
>;

export type StatBlockSpellInvocationDeltaMissingOwner =
  | {
      readonly kind: "missingTransformationFormCreatureTypeLimitOwner";
      readonly delta: DeltaOfKind<"transformation_form_creature_type_limit">;
    }
  | {
      readonly kind: "missingTemporaryHitPointsOwner";
      readonly delta: DeltaOfKind<"temporary_hit_points">;
    }
  | {
      readonly kind: "missingConcentrationRequirementOwner";
      readonly delta: DeltaOfKind<"concentration_requirement">;
    }
  | {
      readonly kind: "missingEffectTerminationOwner";
      readonly delta: DeltaOfKind<"effect_termination">;
    }
  | {
      readonly kind: "missingCreatedSubstanceSubstitutionOwner";
      readonly delta: DeltaOfKind<"created_substance_substitution">;
    }
  | {
      readonly kind: "missingDurationOverrideOwner";
      readonly delta: DeltaOfKind<"duration_override">;
    }
  | {
      readonly kind: "missingTargetLimitOwner";
      readonly delta: DeltaOfKind<"target_limit">;
    }
  | {
      readonly kind: "missingMovementTraceSuppressionOwner";
      readonly delta: DeltaOfKind<"movement_trace_suppression">;
    }
  | {
      readonly kind: "missingAppearanceOptionsOwner";
      readonly delta: DeltaOfKind<"appearance_options">;
    }
  | {
      readonly kind: "missingArmorClassAlreadyIncludesEffectOwner";
      readonly delta: DeltaOfKind<"armor_class_already_includes_effect">;
    }
  | {
      readonly kind: "missingApplicationTimingOwner";
      readonly delta: DeltaOfKind<"application_timing">;
    };

export type UnsupportedStatBlockSpellInvocationDeltas = {
  readonly kind: "unsupported";
  readonly missingOwners: ReadonlyNonEmptyArray<StatBlockSpellInvocationDeltaMissingOwner>;
};

function missingOwnerForDelta(
  delta: StatBlockSpellInvocationDelta,
): StatBlockSpellInvocationDeltaMissingOwner {
  return Match.value(delta).pipe(
    Match.when(
      { kind: "transformation_form_creature_type_limit" },
      (narrowed) => ({
        kind: "missingTransformationFormCreatureTypeLimitOwner" as const,
        delta: narrowed,
      }),
    ),
    Match.when({ kind: "temporary_hit_points" }, (narrowed) => ({
      kind: "missingTemporaryHitPointsOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "concentration_requirement" }, (narrowed) => ({
      kind: "missingConcentrationRequirementOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "effect_termination" }, (narrowed) => ({
      kind: "missingEffectTerminationOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "created_substance_substitution" }, (narrowed) => ({
      kind: "missingCreatedSubstanceSubstitutionOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "duration_override" }, (narrowed) => ({
      kind: "missingDurationOverrideOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "target_limit" }, (narrowed) => ({
      kind: "missingTargetLimitOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "movement_trace_suppression" }, (narrowed) => ({
      kind: "missingMovementTraceSuppressionOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "appearance_options" }, (narrowed) => ({
      kind: "missingAppearanceOptionsOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "armor_class_already_includes_effect" }, (narrowed) => ({
      kind: "missingArmorClassAlreadyIncludesEffectOwner" as const,
      delta: narrowed,
    })),
    Match.when({ kind: "application_timing" }, (narrowed) => ({
      kind: "missingApplicationTimingOwner" as const,
      delta: narrowed,
    })),
    Match.exhaustive,
  );
}

export function admitStatBlockSpellInvocationDeltas(
  deltas: StatBlockSpellInvocationDeltas,
): UnsupportedStatBlockSpellInvocationDeltas {
  const [first, ...rest] = deltas;
  return {
    kind: "unsupported",
    missingOwners: [
      missingOwnerForDelta(first),
      ...rest.map(missingOwnerForDelta),
    ],
  };
}
