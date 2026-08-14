import {
  ClassNameSchema,
  DurationSchema,
  RangeSchema,
  SpellLevelSchema,
} from "@dnd/surface/surface/schema";
import { AbilityModifier } from "@dnd/shared/types";
import type { Duration, Range, SpellLevel } from "@dnd/surface/surface/types";
import type { ClassName } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { BattleSpellAccessExecutionRef } from "../identity.ts";

/** Mechanical Spell Definition facts retained for reducer execution. */
export type SpellRuleExecutionFacts = {
  readonly castingSource:
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

export const SpellRuleExecutionFactsSchema = Schema.Struct({
  castingSource: Schema.Union(
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
  ),
  level: SpellLevelSchema,
  range: RangeSchema,
  duration: DurationSchema,
  components: Schema.Struct({
    verbal: Schema.Boolean,
    somatic: Schema.Boolean,
    hasMaterial: Schema.Boolean,
    hasPricedOrConsumedMaterial: Schema.Boolean,
  }),
  twinnedTargetCount: Schema.Union(
    Schema.Struct({
      base: Schema.Number,
      baseLevel: Schema.Number,
    }),
    Schema.Null,
  ),
});
