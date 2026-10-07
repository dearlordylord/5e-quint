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
  type StatBlockSpellInvocationRef,
} from "../identity.ts";

/** The dynamic caster/access fact joined to a static Spell Definition. */
export type SpellCastingSource =
  | StatBlockSpellCastingSource
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

export type StatBlockSpellCastingSource = {
  readonly tag: "statBlock";
  readonly castingTime: import("@dnd/surface/surface/types").CastingTime;
  readonly invocationRef: StatBlockSpellInvocationRef;
  readonly abilityModifier: AbilityModifier;
  readonly spellSaveDc: import("effect").Option.Option<
    import("@dnd/shared/types").DifficultyClass
  >;
  readonly spellAttackBonus: import("effect").Option.Option<
    import("@dnd/shared/types").AttackBonus
  >;
};

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

export const SpellCastingSourceSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("statBlock"),
    castingTime: CastingTimeSchema,
    invocationRef: StatBlockSpellInvocationRefSchema,
    abilityModifier: AbilityModifier,
    spellSaveDc: Schema.Option(DifficultyClass),
    spellAttackBonus: Schema.Option(AttackBonus),
  }),
  Schema.Struct({
    tag: Schema.Literal("classSpellcasting"),
    className: ClassNameSchema,
    abilityModifier: AbilityModifier,
  }),
  Schema.Struct({
    tag: Schema.Literal("spellAccess"),
    spellAccessRef: BattleSpellAccessExecutionRef,
    abilityModifier: AbilityModifier,
  }),
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
