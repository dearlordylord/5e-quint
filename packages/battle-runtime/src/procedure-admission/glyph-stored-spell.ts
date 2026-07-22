import type { SpellRecord } from "@dnd/surface/surface/types";
import type {
  PreparedSpellAccess,
  ReadiedSpellInvocation,
  SpellSlotInvocationResource,
  SpellTargeting,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import {
  GLYPH_STORED_AREA_CONTROL_PROCEDURES,
  GLYPH_STORED_AREA_ONGOING_PROCEDURES,
  GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  type GlyphStoredAreaControlProcedure,
  type GlyphStoredAreaOngoingProcedure,
  type GlyphStoredSelfTransformationProcedure,
  type GlyphStoredSingleCreatureActiveEffectProcedure,
} from "../procedure-execution/glyph-stored-spell.ts";

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

type GlyphStoredConcentrationSaveGatedConditionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
type GlyphStoredNonConcentrationSpellRecord = SpellRecord & {
  readonly mechanics: SpellRecord["mechanics"] & {
    readonly duration: Exclude<
      SpellRecord["mechanics"]["duration"],
      { readonly kind: "concentration" }
    >;
  };
};
type GlyphStoredReadiedSpellInvocation = ReadiedSpellInvocation & {
  readonly spell: GlyphStoredNonConcentrationSpellRecord;
};
type GlyphStoredSingleCreatureTargeting =
  | Extract<SpellTargeting, { readonly kind: "singleCombatant" }>
  | Extract<SpellTargeting, { readonly kind: "singleCreatureOrObject" }>
  | (Extract<SpellTargeting, { readonly kind: "targetList" }> & {
      readonly minTargets: 1;
      readonly maxTargets: 1;
    });
type GlyphStoredConcentrationSaveGatedDamageInvocation = Extract<
  ReadiedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
  readonly targeting: GlyphStoredSingleCreatureTargeting;
};
type GlyphStoredGreaseGroundHazardInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "greaseGroundHazard" }
> & {
  readonly spell: GlyphStoredNonConcentrationSpellRecord;
};
type GlyphStoredConcentrationHarmfulObjectInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spiritualWeaponAttackProxy" }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
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
> = SupportedSpellInvocationForProcedure<P> & {
  readonly access: PreparedSpellAccess;
  readonly resource: SpellSlotInvocationResource;
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
  readonly targeting: GlyphStoredSingleCreatureTargeting;
};
type GlyphStoredAreaOngoingInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: GlyphStoredAreaOngoingProcedure }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
export type GlyphStoredAreaControlInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: GlyphStoredAreaControlProcedure }
> & {
  readonly spell: SpellRecord & {
    readonly mechanics: SpellRecord["mechanics"] & {
      readonly duration: Extract<
        SpellRecord["mechanics"]["duration"],
        { readonly kind: "concentration" }
      >;
    };
  };
};
export type GlyphStoredConcentrationSingleCreatureActiveEffectInvocation = {
  readonly [P in GlyphStoredSingleCreatureActiveEffectProcedure]: GlyphStoredConcentrationSingleCreatureActiveEffectInvocationFor<P>;
}[GlyphStoredSingleCreatureActiveEffectProcedure];
export type GlyphStoredConcentrationSelfTransformationInvocation =
  SupportedSpellInvocationForProcedure<GlyphStoredSelfTransformationProcedure> & {
    readonly access: PreparedSpellAccess;
    readonly resource: SpellSlotInvocationResource;
    readonly spell: SpellRecord & {
      readonly mechanics: SpellRecord["mechanics"] & {
        readonly duration: Extract<
          SpellRecord["mechanics"]["duration"],
          { readonly kind: "concentration" }
        >;
      };
    };
  };
type GlyphStoredSpellInvocationCandidateWithSpellTargeting = Extract<
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
