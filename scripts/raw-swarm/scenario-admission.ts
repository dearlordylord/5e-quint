import { readFileSync } from "node:fs";
import { Either, Schema } from "effect";

import { FinalScenarioReviewSchema } from "./scenario-campaign.ts";
import { sha256Text, type ScenarioId } from "./transcript.ts";

export type AdmittedScenarioIdentity = {
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
};

export function admittedScenarioIdentity(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly reviewPath: string;
}): Either.Either<AdmittedScenarioIdentity, string> {
  const files = Either.try({
    try: () => ({
      scenarioBytes: readFileSync(input.scenarioPath, "utf8"),
      reviewBytes: readFileSync(input.reviewPath, "utf8"),
    }),
    catch: () =>
      "Scenario and its adjacent admission review must both be readable.",
  });
  if (Either.isLeft(files)) return Either.left(files.left);
  const { scenarioBytes, reviewBytes } = files.right;
  const decoded = Schema.decodeUnknownEither(
    Schema.parseJson(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(reviewBytes);
  if (
    Either.isLeft(decoded) ||
    decoded.right.disposition !== "admitted" ||
    decoded.right.scenarioId !== input.scenarioId ||
    decoded.right.scenarioSha256 !== sha256Text(scenarioBytes)
  ) {
    return Either.left(
      "Scenario requires the matching admitted scenario review and prose hash.",
    );
  }
  return Either.right({
    scenarioSha256: decoded.right.scenarioSha256,
    scenarioReviewSha256: sha256Text(reviewBytes),
  });
}
