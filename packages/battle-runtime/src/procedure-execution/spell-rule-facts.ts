import {
  DurationSchema,
  RangeSchema,
  SpellLevelSchema,
} from "@dnd/surface/surface/schema";
import type { Duration, Range, SpellLevel } from "@dnd/surface/surface/types";
import { Schema } from "effect";

/** Mechanical Spell Definition facts retained for reducer execution. */
export type SpellRuleExecutionFacts = {
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

export const SpellRuleExecutionFactsSchema: Schema.Schema<SpellRuleExecutionFacts> =
  Schema.Struct({
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
