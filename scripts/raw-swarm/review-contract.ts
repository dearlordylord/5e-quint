import { Schema } from "effect";

import { GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

export const VERDICT_CLASSES = [
  "bug",
  "adapter-defect",
  "unsupported-capability",
  "assumption-divergence",
  "corpus-ambiguity",
  "scenario-invalid",
  "player-invalid",
  "reviewer-error",
  "pass",
] as const;

export const ReviewOutputSchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  transcriptSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  reviewer: Schema.NonEmptyTrimmedString,
  verdicts: Schema.Array(
    Schema.Struct({
      class: Schema.Literal(...VERDICT_CLASSES),
      claim: Schema.NonEmptyTrimmedString,
      evidence: Schema.NonEmptyTrimmedString,
    }),
  ).pipe(Schema.minItems(1)),
});
