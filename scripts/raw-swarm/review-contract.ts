import { Schema } from "effect";

export const VERDICT_CLASSES = [
  "bug",
  "assumption-divergence",
  "corpus-ambiguity",
  "scenario-invalid",
  "reviewer-error",
  "pass",
] as const;

export const ReviewOutputSchema = Schema.Struct({
  reviewer: Schema.NonEmptyTrimmedString,
  verdicts: Schema.Array(
    Schema.Struct({
      class: Schema.Literal(...VERDICT_CLASSES),
      claim: Schema.NonEmptyTrimmedString,
      evidence: Schema.NonEmptyTrimmedString,
    }),
  ).pipe(Schema.minItems(1)),
});
