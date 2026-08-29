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
  transcriptSha256: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
  ),
  reviewer: Schema.Trimmed.check(Schema.isNonEmpty()),
  verdicts: Schema.Array(
    Schema.Struct({
      class: Schema.Literals(VERDICT_CLASSES),
      claim: Schema.Trimmed.check(Schema.isNonEmpty()),
      evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
    }),
  ).pipe(Schema.check(Schema.isMinLength(1))),
});
