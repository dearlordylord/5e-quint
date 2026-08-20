import { Either, Schema } from "effect";
import { basename, resolve } from "node:path";

const SemanticIdentitySchema = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9][a-z0-9-]*$/),
);

export const ScenarioCampaignIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmScenarioCampaignId"),
);
export type ScenarioCampaignId = Schema.Schema.Type<
  typeof ScenarioCampaignIdSchema
>;

export const ScenarioCandidateIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmScenarioCandidateId"),
);
export type ScenarioCandidateId = Schema.Schema.Type<
  typeof ScenarioCandidateIdSchema
>;

export const ScenarioIdSchema = SemanticIdentitySchema.pipe(
  Schema.filter((value) => !/^generated-battle-[0-9]+$/.test(value), {
    message: () =>
      "scenario id must be semantic; generated-battle sequence ids are evidence history, not scenario identity",
  }),
  Schema.brand("RawSwarmScenarioId"),
);
export type ScenarioId = Schema.Schema.Type<typeof ScenarioIdSchema>;

/** A campaign reservation, which is not a Scenario until admission succeeds. */
export const PlannedScenarioIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmPlannedScenarioId"),
);
export type PlannedScenarioId = Schema.Schema.Type<
  typeof PlannedScenarioIdSchema
>;

export const ExecutionIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmExecutionId"),
);
export type ExecutionId = Schema.Schema.Type<typeof ExecutionIdSchema>;

export const BenchmarkIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmBenchmarkId"),
);
export type BenchmarkId = Schema.Schema.Type<typeof BenchmarkIdSchema>;

export const EvidenceSetIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmEvidenceSetId"),
);
export type EvidenceSetId = Schema.Schema.Type<typeof EvidenceSetIdSchema>;

/**
 * Identity shared by an Execution record and an immutable benchmark execution
 * profile. The profile carries additional benchmark authorities, but these
 * fields are the only relationship facts the scenario catalogue projects.
 */
export const ScenarioExecutionIdentitySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  executionId: ExecutionIdSchema,
  scenarioId: ScenarioIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
});
export type ScenarioExecutionIdentity = Schema.Schema.Type<
  typeof ScenarioExecutionIdentitySchema
>;

function decodeIdentity<A, I>(
  schema: Schema.Schema<A, I>,
  role: string,
  value: unknown,
): Either.Either<A, string> {
  return Schema.decodeUnknownEither(schema)(value).pipe(
    Either.mapLeft(
      () => `${role} must be lowercase letters, digits, and hyphens`,
    ),
  );
}

export const decodeScenarioCampaignId = (value: unknown) =>
  decodeIdentity(ScenarioCampaignIdSchema, "scenario campaign id", value);
export const decodeScenarioCandidateId = (value: unknown) =>
  decodeIdentity(ScenarioCandidateIdSchema, "scenario candidate id", value);
export const decodeScenarioId = (value: unknown) =>
  decodeIdentity(ScenarioIdSchema, "scenario id", value);
export const decodePlannedScenarioId = (value: unknown) =>
  decodeIdentity(PlannedScenarioIdSchema, "planned scenario id", value);
export const decodeExecutionId = (value: unknown) =>
  decodeIdentity(ExecutionIdSchema, "execution id", value);
export const decodeBenchmarkId = (value: unknown) =>
  decodeIdentity(BenchmarkIdSchema, "benchmark id", value);
export const decodeEvidenceSetId = (value: unknown) =>
  decodeIdentity(EvidenceSetIdSchema, "evidence set id", value);

/** Storage is a projection of validated evidence identity, never its owner. */
export function evidenceSetDirectory(
  evidenceRoot: string,
  evidenceSetId: EvidenceSetId,
): string {
  return resolve(evidenceRoot, evidenceSetId);
}

export function decodeEvidenceSetDirectory(
  directory: string,
): Either.Either<EvidenceSetId, string> {
  return decodeEvidenceSetId(basename(directory));
}
