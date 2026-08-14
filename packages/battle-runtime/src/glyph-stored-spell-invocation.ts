import type { SpellMechanics } from "@dnd/surface/surface/types";
import type {
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  ReadiedSpellInvocation,
  SpellSlotInvocationResource,
  SpellTargeting,
  SupportedSpellInvocation,
} from "./battle-state-execution.ts";
import {
  GLYPH_STORED_AREA_CONTROL_PROCEDURES,
  GLYPH_STORED_AREA_ONGOING_PROCEDURES,
  GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  type GlyphStoredAreaControlProcedure,
  type GlyphStoredAreaOngoingProcedure,
  type GlyphStoredSelfTransformationProcedure,
  type GlyphStoredSingleCreatureActiveEffectProcedure,
} from "./procedure-execution/glyph-stored-spell.ts";

export {
  GLYPH_STORED_AREA_CONTROL_PROCEDURES,
  GLYPH_STORED_AREA_ONGOING_PROCEDURES,
  GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
};
export type {
  GlyphStoredAreaControlProcedure,
  GlyphStoredAreaOngoingProcedure,
  GlyphStoredSelfTransformationProcedure,
  GlyphStoredSingleCreatureActiveEffectProcedure,
};

type GlyphStoredSpellExecutionSource = SupportedSpellInvocation["spell"];
type GlyphStoredConcentrationSpellExecutionSource =
  GlyphStoredSpellExecutionSource & {
    readonly mechanics: SpellMechanics & {
      readonly duration: Extract<
        SpellMechanics["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
type GlyphStoredNonConcentrationSpellExecutionSource =
  GlyphStoredSpellExecutionSource & {
    readonly mechanics: SpellMechanics & {
      readonly duration: Exclude<
        SpellMechanics["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };

type GlyphStoredPreparedSlotInvocation<Invocation> = Invocation extends {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
}
  ? Omit<Invocation, "access" | "resource"> & {
      readonly access: PreparedSpellAccess;
      readonly resource: SpellSlotInvocationResource;
    }
  : never;

type GlyphStoredConcentrationSaveGatedConditionInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<SupportedSpellInvocation>,
  { readonly procedure: "saveGatedCondition" }
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
};
type GlyphStoredReadiedSpellInvocation =
  GlyphStoredPreparedSlotInvocation<ReadiedSpellInvocation> & {
    readonly spell: GlyphStoredNonConcentrationSpellExecutionSource;
  };
type GlyphStoredSingleCreatureTargeting =
  | Extract<SpellTargeting, { readonly kind: "singleCombatant" }>
  | Extract<SpellTargeting, { readonly kind: "singleCreatureOrObject" }>
  | (Extract<SpellTargeting, { readonly kind: "targetList" }> & {
      readonly minTargets: 1;
      readonly maxTargets: 1;
    });
type GlyphStoredConcentrationSaveGatedDamageInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<ReadiedSpellInvocation>,
  { readonly procedure: "saveGatedDamage" }
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
  readonly targeting: GlyphStoredSingleCreatureTargeting;
};
type GlyphStoredGreaseGroundHazardInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<SupportedSpellInvocation>,
  { readonly procedure: "greaseGroundHazard" }
> & {
  readonly spell: GlyphStoredNonConcentrationSpellExecutionSource;
};
type GlyphStoredConcentrationHarmfulObjectInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<SupportedSpellInvocation>,
  { readonly procedure: "spiritualWeaponAttackProxy" }
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
};
type SupportedSpellInvocationForProcedure<
  P extends SupportedSpellInvocation["procedure"],
  I extends SupportedSpellInvocation = SupportedSpellInvocation,
> = I extends { readonly procedure: infer Procedure }
  ? P extends Procedure
    ? I & { readonly procedure: P }
    : never
  : never;
type GlyphStoredConcentrationSingleCreatureActiveEffectInvocationFor<
  P extends GlyphStoredSingleCreatureActiveEffectProcedure,
> = GlyphStoredPreparedSlotInvocation<
  SupportedSpellInvocationForProcedure<P>
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
  readonly targeting: GlyphStoredSingleCreatureTargeting;
};
type GlyphStoredAreaOngoingInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<SupportedSpellInvocation>,
  { readonly procedure: GlyphStoredAreaOngoingProcedure }
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
};
export type GlyphStoredAreaControlInvocation = Extract<
  GlyphStoredPreparedSlotInvocation<SupportedSpellInvocation>,
  { readonly procedure: GlyphStoredAreaControlProcedure }
> & {
  readonly spell: GlyphStoredConcentrationSpellExecutionSource;
};
export type GlyphStoredConcentrationSingleCreatureActiveEffectInvocation = {
  readonly [P in GlyphStoredSingleCreatureActiveEffectProcedure]: GlyphStoredConcentrationSingleCreatureActiveEffectInvocationFor<P>;
}[GlyphStoredSingleCreatureActiveEffectProcedure];
export type GlyphStoredConcentrationSelfTransformationInvocation =
  GlyphStoredPreparedSlotInvocation<
    SupportedSpellInvocationForProcedure<GlyphStoredSelfTransformationProcedure>
  > & {
    readonly spell: GlyphStoredConcentrationSpellExecutionSource;
  };
type GlyphStoredSpellInvocationCandidateWithSpellTargeting = Extract<
  GlyphStoredPreparedSlotInvocation<
    | ReadiedSpellInvocation
    | Extract<
        SupportedSpellInvocation,
        {
          readonly procedure:
            | "greaseGroundHazard"
            | "saveGatedCondition"
            | "spiritualWeaponAttackProxy"
            | GlyphStoredAreaOngoingProcedure
            | GlyphStoredAreaControlProcedure;
        }
      >
  >,
  {
    readonly access: PreparedSpellAccess;
    readonly resource: SpellSlotInvocationResource;
    readonly targeting: SpellTargeting;
  }
>;
export type GlyphStoredSpellInvocationCandidate =
  | GlyphStoredSpellInvocationCandidateWithSpellTargeting
  | GlyphStoredConcentrationSingleCreatureActiveEffectInvocation
  | GlyphStoredConcentrationSelfTransformationInvocation;
export type GlyphStoredSpellInvocation =
  | Extract<
      | GlyphStoredReadiedSpellInvocation
      | GlyphStoredGreaseGroundHazardInvocation
      | GlyphStoredConcentrationSaveGatedDamageInvocation
      | GlyphStoredConcentrationSaveGatedConditionInvocation
      | GlyphStoredConcentrationHarmfulObjectInvocation
      | GlyphStoredAreaOngoingInvocation
      | GlyphStoredAreaControlInvocation,
      {
        readonly access: PreparedSpellAccess;
        readonly resource: SpellSlotInvocationResource;
        readonly targeting: SpellTargeting;
      }
    >
  | GlyphStoredConcentrationSingleCreatureActiveEffectInvocation
  | GlyphStoredConcentrationSelfTransformationInvocation;
