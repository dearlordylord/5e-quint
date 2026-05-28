import { Schema } from "effect";
import type {
  DamageReductionSpellInvocation,
  SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import {
  BATTLE_SURFACE_ABILITIES,
  BATTLE_SURFACE_SKILLS,
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  RollModifierSpellInvocationBaseSchemaFields,
} from "../codec-building-blocks.ts";

type RollModifierInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
>;

export const DamageReductionInvocationSchema = Schema.Struct({
  access: ClassCantripSpellAccessSchema,
  resource: NoSpellInvocationResourceSchema,
  procedure: Schema.Literal("damageReduction"),
  spell: BattleRuntimeObjectSchema,
  actionCost: Schema.Literal("magicAction"),
  targeting: Schema.Struct({
    kind: Schema.Literal("targetList"),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
  }),
  damageTypeChoices: Schema.Array(DamageTypeSchema),
  amount: Schema.Struct({
    dice: Schema.Literal(1),
    dieSize: Schema.Literal(4),
  }),
  expiresAt: BattleRuntimeObjectSchema,
  rangeFeet: MovementFeet,
  // BattleRuntimeObjectSchema preserves runtime decoding for the authored spell
  // record and expiration payload, but Effect Schema infers those fields as
  // generic records rather than the reducer's branded/domain aliases. The
  // discriminant and every damageReduction-specific field here match the
  // previous battle-codecs.ts branch, so the cast only restores the exported
  // invocation alias after the parser has the same runtime shape.
}) as unknown as Schema.Schema<DamageReductionSpellInvocation>;

export const RollModifierInvocationSchema = Schema.Union(
  Schema.Struct({
    ...RollModifierSpellInvocationBaseSchemaFields,
    skillChoices: Schema.NullOr(
      Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
    ),
    abilityChoices: Schema.Literal(null),
    abilityChoiceApplication: Schema.optionalWith(Schema.Never, {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...RollModifierSpellInvocationBaseSchemaFields,
    skillChoices: Schema.Literal(null),
    abilityChoices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_ABILITIES)),
    abilityChoiceApplication: Schema.Literal("single", "perTarget"),
  }),
  // RollModifierInvocation is a structural union over nullable
  // skillChoices/abilityChoices plus abilityChoiceApplication, not a separately
  // tagged Effect Schema union. The two branches mirror the previous
  // battle-codecs.ts branches exactly; the cast restores the reducer alias after
  // Effect Schema has enforced the same runtime discriminants and shared base
  // fields.
) as unknown as Schema.Schema<RollModifierInvocation>;
