import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";
import {
  reviewEvidenceIsExact,
  type ReviewEvidenceCatalog,
} from "./review-evidence.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import { repoRoot, sha256Text } from "./transcript.ts";

const ReviewComparisonSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  scenarioId: Schema.NonEmptyTrimmedString,
  transcriptSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  mappings: Schema.Array(
    Schema.Struct({
      baselineVerdict: Schema.Number.pipe(Schema.int(), Schema.positive()),
      disposition: Schema.Literal("reproduced", "rejected", "superseded"),
      candidateVerdicts: Schema.Array(
        Schema.Number.pipe(Schema.int(), Schema.positive()),
      ),
      claim: Schema.NonEmptyTrimmedString,
      evidence: Schema.NonEmptyTrimmedString,
    }),
  ),
  newCandidateVerdicts: Schema.Array(
    Schema.Number.pipe(Schema.int(), Schema.positive()),
  ),
});

type ReviewComparison = Schema.Schema.Type<typeof ReviewComparisonSchema>;

function fail(message: string): never {
  throw new Error(message);
}

function decodeReview(
  path: string,
): Schema.Schema.Type<typeof ReviewOutputSchema> {
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")));
  return Either.isRight(decoded)
    ? decoded.right
    : fail(`Invalid review ${path}: ${decoded.left.message}`);
}

export function verifyReviewComparison(input: {
  readonly baselineReviewPath: string;
  readonly candidateReviewPath: string;
  readonly comparison: unknown;
  readonly evidenceCatalog: ReviewEvidenceCatalog;
}): ReviewComparison {
  const baseline = decodeReview(input.baselineReviewPath);
  const candidate = decodeReview(input.candidateReviewPath);
  const decoded = Schema.decodeUnknownEither(ReviewComparisonSchema, {
    onExcessProperty: "error",
  })(input.comparison);
  if (Either.isLeft(decoded))
    fail(`Invalid review comparison: ${decoded.left.message}`);
  const comparison = decoded.right;
  if (
    baseline.scenarioId !== candidate.scenarioId ||
    baseline.gitSha !== candidate.gitSha ||
    baseline.transcriptSha256 !== candidate.transcriptSha256 ||
    comparison.scenarioId !== baseline.scenarioId ||
    comparison.transcriptSha256 !== baseline.transcriptSha256
  ) {
    fail("Review comparison identities do not match.");
  }
  const baselineOrdinals = comparison.mappings.map(
    ({ baselineVerdict }) => baselineVerdict,
  );
  if (
    baselineOrdinals.length !== baseline.verdicts.length ||
    new Set(baselineOrdinals).size !== baseline.verdicts.length ||
    baselineOrdinals.some((ordinal) => ordinal > baseline.verdicts.length)
  ) {
    fail("Every baseline verdict must be mapped exactly once.");
  }
  const mappedCandidate = new Set(
    comparison.mappings.flatMap(({ candidateVerdicts }) => candidateVerdicts),
  );
  const newCandidate = new Set(comparison.newCandidateVerdicts);
  const coveredCandidate = new Set([...mappedCandidate, ...newCandidate]);
  if (
    newCandidate.size !== comparison.newCandidateVerdicts.length ||
    [...newCandidate].some((ordinal) => mappedCandidate.has(ordinal)) ||
    coveredCandidate.size !== candidate.verdicts.length ||
    [...coveredCandidate].some((ordinal) => ordinal > candidate.verdicts.length)
  ) {
    fail("Every candidate verdict must be mapped or classified as new.");
  }
  if (
    comparison.mappings.some(
      ({ evidence, disposition, candidateVerdicts }) =>
        !reviewEvidenceIsExact(evidence, input.evidenceCatalog) ||
        (disposition !== "rejected" && candidateVerdicts.length === 0),
    ) ||
    candidate.verdicts.some(
      ({ evidence }) => !reviewEvidenceIsExact(evidence, input.evidenceCatalog),
    )
  ) {
    fail(
      "Review comparison claims require exact setup or call-sequence evidence.",
    );
  }
  return comparison;
}

function main(args: readonly string[]): void {
  const [
    baselinePath,
    candidatePath,
    comparisonPath,
    verifiedPath,
    auditPath,
    setupPath,
    charactersPath,
    ...unexpected
  ] = args;
  if (
    baselinePath === undefined ||
    candidatePath === undefined ||
    comparisonPath === undefined ||
    verifiedPath === undefined ||
    auditPath === undefined ||
    setupPath === undefined ||
    charactersPath === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: review-comparison.ts <baseline-review.json> <candidate-review.json> <comparison.json> <verified.json> <audit.jsonl> <setup.ts> <characters.ts>",
    );
  }
  const comparison: unknown = JSON.parse(
    readFileSync(resolve(repoRoot, comparisonPath), "utf8"),
  );
  const audit = readSdkAudit(auditPath);
  if (audit.tag === "invalid") fail(audit.message);
  const comparisonIdentity = Schema.decodeUnknownEither(
    ReviewComparisonSchema,
    {
      onExcessProperty: "error",
    },
  )(comparison);
  if (
    Either.isLeft(comparisonIdentity) ||
    comparisonIdentity.right.transcriptSha256 !==
      audit.audit.header.transcriptSha256
  )
    fail("Review comparison audit identity does not match.");
  const setupText = readFileSync(resolve(repoRoot, setupPath), "utf8");
  const charactersText = readFileSync(
    resolve(repoRoot, charactersPath),
    "utf8",
  );
  if (
    audit.audit.header.setupSha256 !== sha256Text(setupText) ||
    audit.audit.header.charactersSha256 !== sha256Text(charactersText)
  )
    fail("Review evidence files do not match the audited transcript header.");
  const verified = verifyReviewComparison({
    baselineReviewPath: baselinePath,
    candidateReviewPath: candidatePath,
    comparison,
    evidenceCatalog: {
      sequences: new Set(audit.audit.calls.map(({ seq }) => seq)),
      setupLineCount: setupText.split("\n").length,
      charactersLineCount: charactersText.split("\n").length,
      hasTranscriptHeader: true,
    },
  });
  writeFileSync(
    resolve(repoRoot, verifiedPath),
    `${JSON.stringify(verified, null, 2)}\n`,
    {
      flag: "wx",
    },
  );
}

if (process.argv[1]?.endsWith("review-comparison.ts"))
  main(process.argv.slice(2));
