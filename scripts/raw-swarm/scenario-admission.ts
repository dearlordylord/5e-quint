import { readFileSync } from "node:fs";
import { Result, Schema } from "effect";

import {
  finalScenarioDisposition,
  FinalScenarioReviewSchema,
} from "./scenario-campaign.ts";
import { sha256Text, type ScenarioId } from "./transcript.ts";
import {
  ArtifactAuthoritySchema,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import { ScenarioIdSchema, repoRoot } from "./transcript.ts";
import { ScenarioStageFactsAuthoritySchema } from "./stage-plan-authority.ts";
import { canonicalRepositoryReadPath } from "./repository-path.ts";

const AdmittedScenarioRecordCommonFields = {
  scenarioId: ScenarioIdSchema,
  title: Schema.Trimmed.check(Schema.isNonEmpty()),
  purpose: Schema.Trimmed.check(Schema.isNonEmpty()),
  authoredSource: ArtifactAuthoritySchema,
  admissionReview: ArtifactAuthoritySchema,
  stageFacts: ArtifactAuthoritySchema,
} as const;

const HistoricalAdmittedScenarioRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  ...AdmittedScenarioRecordCommonFields,
});

const CurrentAdmittedScenarioRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  ...AdmittedScenarioRecordCommonFields,
  predecessorScenarioIds: Schema.Array(ScenarioIdSchema).pipe(
    Schema.check(
      Schema.makeFilter(
        (scenarioIds) => new Set(scenarioIds).size === scenarioIds.length,
        {
          message:
            "an admitted Scenario record cannot repeat a predecessor Scenario",
        },
      ),
    ),
  ),
});

export const AdmittedScenarioRecordSchema = Schema.Union([
  CurrentAdmittedScenarioRecordSchema,
  HistoricalAdmittedScenarioRecordSchema,
]);
export type CurrentAdmittedScenarioRecord = Schema.Schema.Type<
  typeof CurrentAdmittedScenarioRecordSchema
>;
export type HistoricalAdmittedScenarioRecord = Schema.Schema.Type<
  typeof HistoricalAdmittedScenarioRecordSchema
>;
export type AdmittedScenarioRecord = Schema.Schema.Type<
  typeof AdmittedScenarioRecordSchema
>;

export function isCurrentAdmittedScenarioRecord(
  record: AdmittedScenarioRecord,
): record is CurrentAdmittedScenarioRecord {
  return record.schemaVersion === 2;
}

export type AdmittedScenarioIdentity = {
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
};

function authorityMatches(
  repositoryRoot: string,
  authority: ArtifactAuthority,
  expectedPath: string,
  bytes: string,
): boolean {
  const authorityPath = canonicalRepositoryReadPath(
    repositoryRoot,
    authority.path,
  );
  const expectedCanonicalPath = canonicalRepositoryReadPath(
    repositoryRoot,
    expectedPath,
  );
  return (
    Result.isSuccess(authorityPath) &&
    Result.isSuccess(expectedCanonicalPath) &&
    authorityPath.success === expectedCanonicalPath.success &&
    authority.byteLength === Buffer.byteLength(bytes) &&
    authority.sha256 === sha256Text(bytes)
  );
}

export function admittedScenarioIdentity(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly reviewPath: string;
  readonly recordPath: string;
}): Result.Result<AdmittedScenarioIdentity, string> {
  const scenarioPath = canonicalRepositoryReadPath(
    repoRoot,
    input.scenarioPath,
  );
  const reviewPath = canonicalRepositoryReadPath(repoRoot, input.reviewPath);
  const recordPath = canonicalRepositoryReadPath(repoRoot, input.recordPath);
  if (
    Result.isFailure(scenarioPath) ||
    Result.isFailure(reviewPath) ||
    Result.isFailure(recordPath)
  ) {
    return Result.fail(
      "Scenario authorities must remain inside the repository.",
    );
  }
  const files = Result.try({
    try: () => ({
      scenarioBytes: readFileSync(scenarioPath.success, "utf8"),
      reviewBytes: readFileSync(reviewPath.success, "utf8"),
      recordBytes: readFileSync(recordPath.success, "utf8"),
    }),
    catch: () =>
      "Scenario, admitted-scenario record, and admission review must be readable.",
  });
  if (Result.isFailure(files)) return Result.fail(files.failure);
  const { scenarioBytes, reviewBytes, recordBytes } = files.success;
  const decoded = Schema.decodeUnknownResult(
    Schema.fromJsonString(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(reviewBytes);
  const record = Schema.decodeUnknownResult(
    Schema.fromJsonString(AdmittedScenarioRecordSchema),
    { onExcessProperty: "error" },
  )(recordBytes);
  if (
    Result.isFailure(decoded) ||
    Result.isFailure(record) ||
    finalScenarioDisposition(decoded.success) !== "admitted" ||
    decoded.success.scenarioId !== input.scenarioId ||
    decoded.success.scenarioSha256 !== sha256Text(scenarioBytes) ||
    record.success.scenarioId !== input.scenarioId ||
    !authorityMatches(
      repoRoot,
      record.success.authoredSource,
      scenarioPath.success,
      scenarioBytes,
    ) ||
    !authorityMatches(
      repoRoot,
      record.success.admissionReview,
      reviewPath.success,
      reviewBytes,
    )
  ) {
    return Result.fail(
      "Scenario requires the matching admitted scenario review and prose hash.",
    );
  }
  const stageFactsPathResult = canonicalRepositoryReadPath(
    repoRoot,
    record.success.stageFacts.path,
  );
  if (Result.isFailure(stageFactsPathResult)) {
    return Result.fail(
      "Scenario stage-facts authority must remain inside the repository.",
    );
  }
  const stageFactsPath = stageFactsPathResult.success;
  const stageFactsBytes = Result.try({
    try: () => readFileSync(stageFactsPath, "utf8"),
    catch: () => "Scenario stage-facts authority must be readable.",
  });
  if (Result.isFailure(stageFactsBytes))
    return Result.fail(stageFactsBytes.failure);
  const stageFacts = Schema.decodeUnknownResult(
    Schema.fromJsonString(ScenarioStageFactsAuthoritySchema),
    { onExcessProperty: "error" },
  )(stageFactsBytes.success);
  if (
    Result.isFailure(stageFacts) ||
    !authorityMatches(
      repoRoot,
      record.success.stageFacts,
      stageFactsPath,
      stageFactsBytes.success,
    ) ||
    stageFacts.success.scenarioId !== input.scenarioId ||
    stageFacts.success.scenarioSha256 !== sha256Text(scenarioBytes)
  ) {
    return Result.fail(
      "Scenario requires matching retained stage-facts identity and authority.",
    );
  }
  return Result.succeed({
    scenarioSha256: decoded.success.scenarioSha256,
    scenarioReviewSha256: sha256Text(reviewBytes),
  });
}
