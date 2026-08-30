import { Schema } from "effect";

import { ScenarioIdSchema } from "../transcript.ts";

const HashSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
);
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
);

/** Immutable proof that the retained SDK transcript replay completed. */
export const SdkReplayResultEvidenceSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm-sdk-replay-result"),
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  transcriptSha256: HashSchema,
  replaySupervisorSha256: HashSchema,
  matchedCallCount: NonNegativeIntegerSchema,
  status: Schema.Literal("succeeded"),
});

export type SdkReplayResultEvidence = Schema.Schema.Type<
  typeof SdkReplayResultEvidenceSchema
>;
