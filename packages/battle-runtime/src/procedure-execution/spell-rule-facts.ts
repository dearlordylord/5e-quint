import {
  ClassNameSchema,
  CastingTimeSchema,
  DurationSchema,
  RangeSchema,
  SpellLevelSchema,
} from "@dnd/surface/surface/schema";
import {
  AbilityModifier,
  AttackBonus,
  DifficultyClass,
} from "@dnd/shared/types";
import type { Duration, Range, SpellLevel } from "@dnd/surface/surface/types";
import type { ClassName } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import {
  BattleSpellAccessExecutionRef,
  StatBlockSpellInvocationRefSchema,
} from "../identity.ts";

/** The dynamic caster/access fact joined to a static Spell Definition. */
export type CharacterSpellCastingSource =
  | {
      readonly tag: "classSpellcasting";
      readonly className: ClassName;
      readonly abilityModifier: AbilityModifier;
    }
  | {
      readonly tag: "spellAccess";
      readonly spellAccessRef: BattleSpellAccessExecutionRef;
      readonly abilityModifier: AbilityModifier;
    };

export type StatBlockSpellCastingSource =
  typeof StatBlockSpellCastingSourceSchema.Type;

export type SpellCastingSource =
  | CharacterSpellCastingSource
  | StatBlockSpellCastingSource;

/** Spell Definition facts carried across the admission/execution boundary. */
export type SpellDefinitionRuleFacts = {
  readonly level: SpellLevel;
  readonly range: Range;
  readonly duration: Duration;
  readonly components: {
    readonly verbal: boolean;
    readonly somatic: boolean;
    readonly hasMaterial: boolean;
    readonly hasPricedOrConsumedMaterial: boolean;
  };
  readonly twinnedTargetCount: {
    readonly base: number;
    readonly baseLevel: number;
  } | null;
};

/** Static Definition facts plus the cast's dynamic caster/access source. */
export type SpellRuleExecutionFacts = SpellDefinitionRuleFacts & {
  readonly castingSource: SpellCastingSource;
};

/** Join dynamic caster/access state after static Definition projection. */
export function spellRuleExecutionFactsWithCastingSource(
  definition: SpellDefinitionRuleFacts,
  castingSource: SpellCastingSource,
): SpellRuleExecutionFacts {
  return { ...definition, castingSource };
}

type ShortCastingTime = Exclude<
  typeof CastingTimeSchema.Type,
  { readonly kind: "minutes" | "hours" }
>;
const ShortCastingTimeSchema = Schema.refine<
  typeof CastingTimeSchema,
  ShortCastingTime
>(
  (value): value is ShortCastingTime =>
    value.kind !== "minutes" && value.kind !== "hours",
)(CastingTimeSchema);
const StatBlockCastingSourceFields = {
  tag: Schema.Literal("statBlock"),
  invocationRef: StatBlockSpellInvocationRefSchema,
  abilityModifier: AbilityModifier,
  spellSaveDc: Schema.Option(DifficultyClass),
  spellAttackBonus: Schema.Option(AttackBonus),
};
export const StatBlockSpellCastingSourceSchema = Schema.Union([
  Schema.Struct({
    ...StatBlockCastingSourceFields,
    castingTime: CastingTimeSchema,
    actionCost: Schema.Literal("magicAction"),
  }),
  Schema.Struct({
    ...StatBlockCastingSourceFields,
    castingTime: ShortCastingTimeSchema,
    actionCost: Schema.Literal("bonusAction"),
  }),
]);
export const ClassSpellCastingSourceSchema = Schema.Struct({
  tag: Schema.Literal("classSpellcasting"),
  className: ClassNameSchema,
  abilityModifier: AbilityModifier,
});
export const AccessSpellCastingSourceSchema = Schema.Struct({
  tag: Schema.Literal("spellAccess"),
  spellAccessRef: BattleSpellAccessExecutionRef,
  abilityModifier: AbilityModifier,
});
export const SpellCastingSourceSchema = Schema.Union([
  StatBlockSpellCastingSourceSchema,
  ClassSpellCastingSourceSchema,
  AccessSpellCastingSourceSchema,
]);

export const SpellDefinitionRuleFactsSchema = Schema.Struct({
  level: SpellLevelSchema,
  range: RangeSchema,
  duration: DurationSchema,
  components: Schema.Struct({
    verbal: Schema.Boolean,
    somatic: Schema.Boolean,
    hasMaterial: Schema.Boolean,
    hasPricedOrConsumedMaterial: Schema.Boolean,
  }),
  twinnedTargetCount: Schema.Union([
    Schema.Struct({
      base: Schema.Number,
      baseLevel: Schema.Number,
    }),
    Schema.Null,
  ]),
});

export const SpellRuleExecutionFactsSchema = Schema.Struct({
  castingSource: SpellCastingSourceSchema,
  ...SpellDefinitionRuleFactsSchema.fields,
});
