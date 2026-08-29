import { Result, Schema } from "effect";
import { basename, resolve } from "node:path";

const SemanticIdentitySchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]*$/)),
);

const HISTORICAL_GENERATED_BATTLE_PREFIX = "generated-battle";

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
  Schema.check(
    Schema.makeFilter(
      (value) => !value.startsWith(HISTORICAL_GENERATED_BATTLE_PREFIX),
      {
        message:
          "scenario id must be semantic; generated-battle-prefixed ids are evidence history, not scenario identity",
      },
    ),
  ),
  Schema.brand("RawSwarmScenarioId"),
);
export type ScenarioId = Schema.Schema.Type<typeof ScenarioIdSchema>;

/**
 * Legacy evidence may identify a generated battle sequence. That identity is
 * readable historical evidence, not an admitted current Scenario.
 */
export const HistoricalScenarioIdSchema = SemanticIdentitySchema.pipe(
  Schema.brand("RawSwarmHistoricalScenarioId"),
);
export type HistoricalScenarioId = Schema.Schema.Type<
  typeof HistoricalScenarioIdSchema
>;

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

/** Identity of a persisted performance comparison path. */
export const PerformancePathIdSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
).pipe(Schema.brand("RawSwarmPerformancePathId"));
export type PerformancePathId = Schema.Schema.Type<
  typeof PerformancePathIdSchema
>;

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
  schema: Schema.Codec<A, I>,
  role: string,
  value: unknown,
): Result.Result<A, string> {
  return Schema.decodeUnknownResult(schema)(value).pipe(
    Result.mapError(
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
export const decodeHistoricalScenarioId = (value: unknown) =>
  decodeIdentity(HistoricalScenarioIdSchema, "historical scenario id", value);
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
): Result.Result<EvidenceSetId, string> {
  return decodeEvidenceSetId(basename(directory));
}
