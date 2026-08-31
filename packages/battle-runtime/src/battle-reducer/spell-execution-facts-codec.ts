import { Schema } from "effect";

export const SpellExecutionFactsSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("actionSpell"),
    familiarTouchDelivery: Schema.Boolean,
    readiedSpellCompatible: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("bonusActionSpell"),
    familiarTouchDelivery: Schema.Boolean,
  }),
  Schema.Struct({ kind: Schema.Literal("bonusActionDashSpell") }),
  Schema.Struct({ kind: Schema.Literal("triggeredReactionSpell") }),
  Schema.Struct({ kind: Schema.Literal("attackHitBonusActionSpell") }),
]);

export type SpellExecutionFacts = typeof SpellExecutionFactsSchema.Type;
