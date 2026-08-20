import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Either, Schema } from "effect";

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

export const AdmittedScenarioRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  title: Schema.NonEmptyTrimmedString,
  purpose: Schema.NonEmptyTrimmedString,
  authoredSource: ArtifactAuthoritySchema,
  admissionReview: ArtifactAuthoritySchema,
  stageFacts: ArtifactAuthoritySchema,
});
export type AdmittedScenarioRecord = Schema.Schema.Type<
  typeof AdmittedScenarioRecordSchema
>;

export type AdmittedScenarioIdentity = {
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
};

function authorityMatches(
  authority: ArtifactAuthority,
  expectedPath: string,
  bytes: string,
): boolean {
  return (
    resolve(repoRoot, authority.path) === resolve(expectedPath) &&
    authority.byteLength === Buffer.byteLength(bytes) &&
    authority.sha256 === sha256Text(bytes)
  );
}

export function admittedScenarioIdentity(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly reviewPath: string;
  readonly recordPath: string;
}): Either.Either<AdmittedScenarioIdentity, string> {
  const files = Either.try({
    try: () => ({
      scenarioBytes: readFileSync(input.scenarioPath, "utf8"),
      reviewBytes: readFileSync(input.reviewPath, "utf8"),
      recordBytes: readFileSync(input.recordPath, "utf8"),
    }),
    catch: () =>
      "Scenario, admitted-scenario record, and admission review must be readable.",
  });
  if (Either.isLeft(files)) return Either.left(files.left);
  const { scenarioBytes, reviewBytes, recordBytes } = files.right;
  const decoded = Schema.decodeUnknownEither(
    Schema.parseJson(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(reviewBytes);
  const record = Schema.decodeUnknownEither(
    Schema.parseJson(AdmittedScenarioRecordSchema),
    { onExcessProperty: "error" },
  )(recordBytes);
  if (
    Either.isLeft(decoded) ||
    Either.isLeft(record) ||
    finalScenarioDisposition(decoded.right) !== "admitted" ||
    decoded.right.scenarioId !== input.scenarioId ||
    decoded.right.scenarioSha256 !== sha256Text(scenarioBytes) ||
    record.right.scenarioId !== input.scenarioId ||
    !authorityMatches(
      record.right.authoredSource,
      input.scenarioPath,
      scenarioBytes,
    ) ||
    !authorityMatches(
      record.right.admissionReview,
      input.reviewPath,
      reviewBytes,
    )
  ) {
    return Either.left(
      "Scenario requires the matching admitted scenario review and prose hash.",
    );
  }
  const stageFactsPath = resolve(repoRoot, record.right.stageFacts.path);
  const stageFactsBytes = Either.try({
    try: () => readFileSync(stageFactsPath, "utf8"),
    catch: () => "Scenario stage-facts authority must be readable.",
  });
  if (Either.isLeft(stageFactsBytes)) return Either.left(stageFactsBytes.left);
  const stageFacts = Schema.decodeUnknownEither(
    Schema.parseJson(ScenarioStageFactsAuthoritySchema),
    { onExcessProperty: "error" },
  )(stageFactsBytes.right);
  if (
    Either.isLeft(stageFacts) ||
    !authorityMatches(
      record.right.stageFacts,
      stageFactsPath,
      stageFactsBytes.right,
    ) ||
    stageFacts.right.scenarioId !== input.scenarioId ||
    stageFacts.right.scenarioSha256 !== sha256Text(scenarioBytes)
  ) {
    return Either.left(
      "Scenario requires matching retained stage-facts identity and authority.",
    );
  }
  return Either.right({
    scenarioSha256: decoded.right.scenarioSha256,
    scenarioReviewSha256: sha256Text(reviewBytes),
  });
}
