import { Brand } from "effect";
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
  "greaseGroundHazard",
  "spiritualWeaponAttackProxy",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export const GLYPH_STORED_AREA_ONGOING_PROCEDURES = [
  "fogCloudObscurement",
  "magicalDarknessPointOrigin",
  "flamingSphere",
  "spikeGrowthMovementHazard",
  "moonbeam",
  "webRestraintHazard",
  "gustOfWindLine",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredAreaOngoingProcedure =
  (typeof GLYPH_STORED_AREA_ONGOING_PROCEDURES)[number];
export const GLYPH_STORED_AREA_CONTROL_PROCEDURES = [
  "hypnoticPattern",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;
export type GlyphStoredAreaControlProcedure =
  (typeof GLYPH_STORED_AREA_CONTROL_PROCEDURES)[number];
export const GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES = [
  "scalarBuff",
  "rollModifier",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "levitatedCreature",
  "directCondition",
  "hastePositive",
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
