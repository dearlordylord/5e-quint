import { Schema } from "effect";

export const BattleDamageRelationshipQuestionIdSchema = Schema.String.pipe(
  Schema.brand("BattleDamageRelationshipQuestionId"),
);
export type BattleDamageRelationshipQuestionId =
  typeof BattleDamageRelationshipQuestionIdSchema.Type;

export function damageRelationshipQuestionId(
  semanticParts: readonly string[],
): BattleDamageRelationshipQuestionId {
  return BattleDamageRelationshipQuestionIdSchema.make(
    JSON.stringify(semanticParts),
  );
}
