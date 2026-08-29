import { Brand, Match } from "effect";
import type { SpellProcedureExecution } from "./spell-procedure-execution.ts";
import type { SpellRuleExecutionFacts } from "./spell-rule-facts.ts";
import type {
  PreparedSpellAccess,
  SpellSlotInvocationResource,
} from "./spell-invocation-vocabulary.ts";

const GLYPH_STORED_IMMEDIATE_OR_OCCURRENCE_PROCEDURES = [
  "spellAttackDamage",
  "chainedSpellAttackDamage",
  "saveGatedDamage",
  "attackBurstSaveDamage",
  "saveGatedCondition",
  "persistentAreaSaveCondition",
  "spatialMeleeSpellAttackProxy",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export const GLYPH_STORED_AREA_ONGOING_PROCEDURES = [
  "persistentAreaTrait",
  "magicalDarknessPointOrigin",
  "persistentAreaSaveDamage",
  "areaMovementDistanceDamage",
  "persistentAreaSaveConditionEscape",
  "directionalPersistentArea",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredAreaOngoingProcedure =
  (typeof GLYPH_STORED_AREA_ONGOING_PROCEDURES)[number];
export const GLYPH_STORED_AREA_CONTROL_PROCEDURES = [
  "saveGatedAreaControl",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredAreaControlProcedure =
  (typeof GLYPH_STORED_AREA_CONTROL_PROCEDURES)[number];
export const GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES = [
  "scalarBuff",
  "rollModifier",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "controlledVerticalSuspension",
  "directCondition",
  "compositeTargetBuffWithAftermath",
  "creatureTypeProtection",
  "conditionImmunityAndTurnStartTemporaryHitPoints",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredSingleCreatureActiveEffectProcedure =
  (typeof GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES)[number];
export const GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES = [
  "selfTransformationMode",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredSelfTransformationProcedure =
  (typeof GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES)[number];

const GLYPH_STORED_SPELL_PROCEDURES = [
  ...GLYPH_STORED_IMMEDIATE_OR_OCCURRENCE_PROCEDURES,
  ...GLYPH_STORED_AREA_ONGOING_PROCEDURES,
  ...GLYPH_STORED_AREA_CONTROL_PROCEDURES,
  ...GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  ...GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
type GlyphStoredSpellProcedure = (typeof GLYPH_STORED_SPELL_PROCEDURES)[number];

type PreparedSpellSlotExecution<Execution> =
  Execution extends SpellProcedureExecution
    ? Execution extends {
        readonly access: infer Access;
        readonly resource: infer Resource;
      }
      ? Extract<Access, PreparedSpellAccess> extends never
        ? never
        : Extract<Resource, SpellSlotInvocationResource> extends never
          ? never
          : Omit<Execution, "access" | "resource"> & {
              readonly access: Extract<Access, PreparedSpellAccess>;
              readonly resource: Extract<Resource, SpellSlotInvocationResource>;
            }
      : never
    : never;

/** A spell execution admitted for storage in a glyph Spell Effect. */
type GlyphStoredSpellProcedureExecutionFacts = Extract<
  PreparedSpellSlotExecution<SpellProcedureExecution>,
  {
    readonly procedure: GlyphStoredSpellProcedure;
    readonly spellRuleFacts: SpellRuleExecutionFacts;
  }
>;
export type GlyphStoredSpellProcedureExecution =
  GlyphStoredSpellProcedureExecutionFacts &
    Brand.Brand<"GlyphStoredSpellProcedureExecution">;

type GlyphStoredProcedureFor<
  Procedure extends GlyphStoredSpellProcedureExecution["procedure"],
> = Extract<
  GlyphStoredSpellProcedureExecution,
  { readonly procedure: Procedure }
>;
type GlyphStoredProcedureWithConcentration<Execution> = Execution & {
  readonly spellRuleFacts: {
    readonly duration: { readonly kind: "concentration" };
  };
};
type GlyphStoredProcedureWithoutConcentration<Execution> = Execution & {
  readonly spellRuleFacts: {
    readonly duration: Exclude<
      SpellRuleExecutionFacts["duration"],
      { readonly kind: "concentration" }
    >;
  };
};
type SpellProcedureTargeting = SpellProcedureExecution extends infer Execution
  ? Execution extends { readonly targeting: infer Targeting }
    ? Targeting
    : never
  : never;
type GlyphStoredSingleCreatureTargeting =
  | Extract<
      SpellProcedureTargeting,
      { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
    >
  | (Extract<SpellProcedureTargeting, { readonly kind: "targetList" }> & {
      readonly minTargets: 1;
      readonly maxTargets: 1;
    });
const GLYPH_STORED_AREA_TARGETING_KINDS = [
  "pointOriginSphere",
  "pointOriginSphereDiameter",
  "pointOriginCylinder",
  "pointOriginCubeExcludingCaster",
  "pointOriginCube",
  "pointOriginGroundSquare",
  "selfOriginCube",
  "selfOriginCone",
  "selfOriginLine",
  "selfOriginEmanation",
  "primaryTargetOriginEmanation",
] as const satisfies ReadonlyArray<SpellProcedureTargeting["kind"]>;
type GlyphStoredAreaTargetingKind =
  (typeof GLYPH_STORED_AREA_TARGETING_KINDS)[number];
type GlyphStoredAreaTargeting = Extract<
  SpellProcedureTargeting,
  { readonly kind: GlyphStoredAreaTargetingKind }
>;
type GlyphStoredProcedureWithTargeting<Execution, Targeting> = Execution & {
  readonly targeting: Targeting;
};
type GlyphStoredConcentrationSingleCreatureProcedure<
  Procedure extends GlyphStoredSpellProcedureExecution["procedure"],
> = GlyphStoredProcedureWithTargeting<
  GlyphStoredProcedureWithConcentration<GlyphStoredProcedureFor<Procedure>>,
  GlyphStoredSingleCreatureTargeting
>;
type GlyphStoredConcentrationAreaProcedure<
  Procedure extends GlyphStoredSpellProcedureExecution["procedure"],
> = GlyphStoredProcedureWithTargeting<
  GlyphStoredProcedureWithConcentration<GlyphStoredProcedureFor<Procedure>>,
  GlyphStoredAreaTargeting
>;
type GlyphStoredNonConcentrationAreaProcedure<
  Procedure extends GlyphStoredSpellProcedureExecution["procedure"],
> = GlyphStoredProcedureWithTargeting<
  GlyphStoredProcedureWithoutConcentration<GlyphStoredProcedureFor<Procedure>>,
  GlyphStoredAreaTargeting
>;
type GlyphStoredNonConcentrationSingleCreatureSaveDamageProcedure =
  GlyphStoredProcedureWithTargeting<
    GlyphStoredProcedureWithoutConcentration<
      GlyphStoredProcedureFor<"saveGatedDamage">
    >,
    GlyphStoredSingleCreatureTargeting
  >;
type GlyphStoredNonConcentrationAreaSaveDamageProcedure =
  GlyphStoredProcedureWithTargeting<
    GlyphStoredProcedureWithoutConcentration<
      GlyphStoredProcedureFor<"saveGatedDamage">
    >,
    GlyphStoredAreaTargeting
  >;
type GlyphStoredOrdinaryProcedure = GlyphStoredProcedureFor<
  "spellAttackDamage" | "chainedSpellAttackDamage" | "attackBurstSaveDamage"
>;
type GlyphStoredOrdinaryTriggeringCreatureProcedure =
  | GlyphStoredNonConcentrationSingleCreatureSaveDamageProcedure
  | GlyphStoredProcedureWithConcentration<
      GlyphStoredProcedureFor<"spatialMeleeSpellAttackProxy">
    >
  | GlyphStoredProcedureWithoutConcentration<GlyphStoredOrdinaryProcedure>;

export type GlyphStoredSpellRelease =
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "areaOngoing";
      readonly storedProcedure: GlyphStoredConcentrationAreaProcedure<GlyphStoredAreaOngoingProcedure>;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "areaControl";
      readonly storedProcedure: GlyphStoredConcentrationAreaProcedure<GlyphStoredAreaControlProcedure>;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "persistentAreaSaveCondition";
      readonly storedProcedure: GlyphStoredNonConcentrationAreaProcedure<"persistentAreaSaveCondition">;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "saveGatedCondition";
      readonly storedProcedure: GlyphStoredConcentrationSingleCreatureProcedure<"saveGatedCondition">;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "fullDurationSaveGatedDamage";
      readonly storedProcedure: GlyphStoredConcentrationSingleCreatureProcedure<"saveGatedDamage">;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "ordinaryArea";
      readonly storedProcedure: GlyphStoredNonConcentrationAreaSaveDamageProcedure;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "ordinaryTriggeringCreature";
      readonly storedProcedure: GlyphStoredOrdinaryTriggeringCreatureProcedure;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "singleCreatureActiveEffect";
      readonly storedProcedure: GlyphStoredConcentrationSingleCreatureProcedure<GlyphStoredSingleCreatureActiveEffectProcedure>;
    }
  | {
      readonly kind: "spellGlyph";
      readonly executionKind: "selfTransformation";
      readonly storedProcedure: GlyphStoredProcedureWithConcentration<
        GlyphStoredProcedureFor<GlyphStoredSelfTransformationProcedure>
      >;
    };

const glyphStoredSpellProcedureExecutionBrand =
  Brand.nominal<GlyphStoredSpellProcedureExecution>();
const glyphStoredSpellProcedures: ReadonlySet<
  SpellProcedureExecution["procedure"]
> = new Set(GLYPH_STORED_SPELL_PROCEDURES);

function isGlyphStoredSpellProcedureExecutionFacts(
  execution: SpellProcedureExecution,
): execution is GlyphStoredSpellProcedureExecutionFacts {
  return (
    glyphStoredSpellProcedures.has(execution.procedure) &&
    "spellRuleFacts" in execution &&
    "access" in execution &&
    execution.access.tag === "prepared" &&
    "resource" in execution &&
    execution.resource.tag === "spellSlot"
  );
}

export function glyphStoredSpellProcedureExecution(
  execution: SpellProcedureExecution,
): GlyphStoredSpellProcedureExecution | null {
  return isGlyphStoredSpellProcedureExecutionFacts(execution)
    ? glyphStoredSpellProcedureExecutionBrand(execution)
    : null;
}

function glyphStoredProcedureTargetsOneCreature(
  execution: GlyphStoredSpellProcedureExecution,
): execution is GlyphStoredProcedureWithTargeting<
  GlyphStoredSpellProcedureExecution,
  GlyphStoredSingleCreatureTargeting
> {
  if (!("targeting" in execution)) return false;
  return (
    execution.targeting.kind === "singleCombatant" ||
    execution.targeting.kind === "singleCreatureOrObject" ||
    (execution.targeting.kind === "targetList" &&
      execution.targeting.minTargets === 1 &&
      execution.targeting.maxTargets === 1)
  );
}

function glyphStoredProcedureTargetsArea(
  execution: GlyphStoredSpellProcedureExecution,
): execution is GlyphStoredProcedureWithTargeting<
  GlyphStoredSpellProcedureExecution,
  GlyphStoredAreaTargeting
> {
  if (!("targeting" in execution)) return false;
  return GLYPH_STORED_AREA_TARGETING_KINDS.some(
    (areaKind) => areaKind === execution.targeting.kind,
  );
}

function glyphStoredProcedureRequiresConcentration(
  execution: GlyphStoredSpellProcedureExecution,
): execution is GlyphStoredProcedureWithConcentration<GlyphStoredSpellProcedureExecution> {
  return execution.spellRuleFacts.duration.kind === "concentration";
}

function glyphStoredProcedureDoesNotRequireConcentration(
  execution: GlyphStoredSpellProcedureExecution,
): execution is GlyphStoredProcedureWithoutConcentration<GlyphStoredSpellProcedureExecution> {
  return execution.spellRuleFacts.duration.kind !== "concentration";
}

function glyphStoredOrdinaryRelease(
  storedProcedure: GlyphStoredOrdinaryProcedure,
): Extract<
  GlyphStoredSpellRelease,
  { readonly executionKind: "ordinaryTriggeringCreature" }
> | null {
  if (!glyphStoredProcedureDoesNotRequireConcentration(storedProcedure))
    return null;
  return {
    kind: "spellGlyph",
    executionKind: "ordinaryTriggeringCreature",
    storedProcedure,
  };
}

function glyphStoredProcedureHasProcedure<
  Procedure extends GlyphStoredSpellProcedureExecution["procedure"],
>(
  execution: GlyphStoredSpellProcedureExecution,
  procedures: readonly Procedure[],
): execution is GlyphStoredProcedureFor<Procedure> {
  return procedures.some((procedure) => procedure === execution.procedure);
}

export function glyphStoredSpellRelease(
  execution: SpellProcedureExecution,
): GlyphStoredSpellRelease | null {
  const storedProcedure = glyphStoredSpellProcedureExecution(execution);
  if (storedProcedure === null) return null;

  if (
    glyphStoredProcedureHasProcedure(
      storedProcedure,
      GLYPH_STORED_AREA_ONGOING_PROCEDURES,
    )
  ) {
    if (
      !glyphStoredProcedureRequiresConcentration(storedProcedure) ||
      !glyphStoredProcedureTargetsArea(storedProcedure)
    )
      return null;
    return {
      kind: "spellGlyph",
      executionKind: "areaOngoing",
      storedProcedure,
    };
  } else if (
    glyphStoredProcedureHasProcedure(
      storedProcedure,
      GLYPH_STORED_AREA_CONTROL_PROCEDURES,
    )
  ) {
    if (
      !glyphStoredProcedureRequiresConcentration(storedProcedure) ||
      !glyphStoredProcedureTargetsArea(storedProcedure)
    )
      return null;
    return {
      kind: "spellGlyph",
      executionKind: "areaControl",
      storedProcedure,
    };
  } else if (storedProcedure.procedure === "persistentAreaSaveCondition") {
    if (
      !glyphStoredProcedureDoesNotRequireConcentration(storedProcedure) ||
      !glyphStoredProcedureTargetsArea(storedProcedure)
    )
      return null;
    return {
      kind: "spellGlyph",
      executionKind: "persistentAreaSaveCondition",
      storedProcedure,
    };
  } else if (storedProcedure.procedure === "saveGatedCondition") {
    if (
      !glyphStoredProcedureRequiresConcentration(storedProcedure) ||
      !glyphStoredProcedureTargetsOneCreature(storedProcedure)
    ) {
      return null;
    }
    return {
      kind: "spellGlyph",
      executionKind: "saveGatedCondition",
      storedProcedure,
    };
  } else if (storedProcedure.procedure === "saveGatedDamage") {
    if (glyphStoredProcedureRequiresConcentration(storedProcedure)) {
      if (!glyphStoredProcedureTargetsOneCreature(storedProcedure)) return null;
      return {
        kind: "spellGlyph",
        executionKind: "fullDurationSaveGatedDamage",
        storedProcedure,
      };
    }
    if (!glyphStoredProcedureDoesNotRequireConcentration(storedProcedure))
      return null;
    if (glyphStoredProcedureTargetsArea(storedProcedure)) {
      return {
        kind: "spellGlyph",
        executionKind: "ordinaryArea",
        storedProcedure,
      };
    }
    if (!glyphStoredProcedureTargetsOneCreature(storedProcedure)) return null;
    return {
      kind: "spellGlyph",
      executionKind: "ordinaryTriggeringCreature",
      storedProcedure,
    };
  } else if (
    glyphStoredProcedureHasProcedure(
      storedProcedure,
      GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
    )
  ) {
    if (
      !glyphStoredProcedureRequiresConcentration(storedProcedure) ||
      !glyphStoredProcedureTargetsOneCreature(storedProcedure)
    ) {
      return null;
    }
    return {
      kind: "spellGlyph",
      executionKind: "singleCreatureActiveEffect",
      storedProcedure,
    };
  } else if (
    glyphStoredProcedureHasProcedure(
      storedProcedure,
      GLYPH_STORED_SELF_TRANSFORMATION_PROCEDURES,
    )
  ) {
    if (!glyphStoredProcedureRequiresConcentration(storedProcedure))
      return null;
    return {
      kind: "spellGlyph",
      executionKind: "selfTransformation",
      storedProcedure,
    };
  } else if (storedProcedure.procedure === "spatialMeleeSpellAttackProxy") {
    if (!glyphStoredProcedureRequiresConcentration(storedProcedure))
      return null;
    return {
      kind: "spellGlyph",
      executionKind: "ordinaryTriggeringCreature",
      storedProcedure,
    };
  } else {
    return Match.value(storedProcedure).pipe(
      Match.when(
        { procedure: "spellAttackDamage" },
        glyphStoredOrdinaryRelease,
      ),
      Match.when(
        { procedure: "chainedSpellAttackDamage" },
        glyphStoredOrdinaryRelease,
      ),
      Match.when(
        { procedure: "attackBurstSaveDamage" },
        glyphStoredOrdinaryRelease,
      ),
      Match.exhaustive,
    );
  }
}
