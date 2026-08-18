import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Either, Schema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";
import {
  reviewEvidenceIsExact,
  type ReviewEvidenceCatalog,
} from "./review-evidence.ts";
import { readSdkAudit, type SdkAudit } from "./sdk-player/sdk-audit.ts";
import { repoRoot, sha256Text } from "./transcript.ts";

export type ReviewIdentity = {
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly transcriptSha256: string;
};

export type ReviewOutputValidation =
  | {
      readonly tag: "valid";
      readonly verdictCount: number;
    }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "invalidOutput"
        | "identityMismatch"
        | "evidenceMismatch";
      readonly message: string;
    };

export type ReviewEvidenceSourceValidation =
  | { readonly tag: "valid"; readonly catalog: ReviewEvidenceCatalog }
  | { readonly tag: "invalid"; readonly message: string };

export function reviewEvidenceCatalogForAudit(
  audit: SdkAudit,
): ReviewEvidenceSourceValidation {
  const runDirectory = dirname(dirname(audit.header.transcriptPath));
  const setupPath = resolve(repoRoot, runDirectory, "evidence/setup.ts");
  const charactersPath = resolve(
    repoRoot,
    runDirectory,
    "evidence/characters.ts",
  );
  try {
    const setupText =
      audit.header.setupSha256 === undefined
        ? undefined
        : readFileSync(setupPath, "utf8");
    const charactersText = readFileSync(charactersPath, "utf8");
    if (
      (setupText !== undefined &&
        sha256Text(setupText) !== audit.header.setupSha256) ||
      sha256Text(charactersText) !== audit.header.charactersSha256
    ) {
      return {
        tag: "invalid",
        message: "Reviewer citation sources do not match the verified audit.",
      };
    }
    return {
      tag: "valid",
      catalog: {
        sequences: new Set(audit.calls.map(({ seq }) => seq)),
        setupLineCount: setupText?.split("\n").length ?? 0,
        charactersLineCount: charactersText.split("\n").length,
        hasTranscriptHeader: true,
      },
    };
  } catch {
    return {
      tag: "invalid",
      message: "Reviewer citation sources are unreadable.",
    };
  }
}

export function validateReviewOutput(
  value: unknown,
  identity: ReviewIdentity,
  evidenceCatalog: ReviewEvidenceCatalog,
): ReviewOutputValidation {
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isLeft(decoded)) {
    return {
      tag: "invalid",
      reason: "invalidOutput",
      message: `Reviewer output is invalid: ${decoded.left.message}`,
    };
  }
  if (
    decoded.right.scenarioId !== identity.scenarioId ||
    decoded.right.gitSha !== identity.gitSha ||
    decoded.right.transcriptSha256 !== identity.transcriptSha256
  ) {
    return {
      tag: "invalid",
      reason: "identityMismatch",
      message:
        "Reviewer output scenario, Git revision, or transcript hash does not match the verified audit.",
    };
  }
  if (
    decoded.right.verdicts.some(
      ({ evidence }) => !reviewEvidenceIsExact(evidence, evidenceCatalog),
    )
  ) {
    return {
      tag: "invalid",
      reason: "evidenceMismatch",
      message:
        "Every reviewer verdict requires an exact audited sequence, setup line, character line, or transcript-header citation.",
    };
  }
  return { tag: "valid", verdictCount: decoded.right.verdicts.length };
}

function fail(message: string): never {
  throw new Error(message);
}

function main(args: readonly string[]): void {
  const [reviewInput, auditInput, ...unexpected] = args;
  if (
    reviewInput === undefined ||
    auditInput === undefined ||
    unexpected.length > 0
  ) {
    fail("Usage: review-output-validation.ts <review.json> <audit.jsonl>");
  }
  const audit = readSdkAudit(resolve(repoRoot, auditInput));
  if (audit.tag === "invalid") fail(audit.message);
  let review: unknown;
  try {
    review = JSON.parse(readFileSync(resolve(repoRoot, reviewInput), "utf8"));
  } catch {
    fail(`Reviewer output is unreadable or malformed: ${reviewInput}`);
  }
  const evidence = reviewEvidenceCatalogForAudit(audit.audit);
  if (evidence.tag === "invalid") fail(evidence.message);
  const result = validateReviewOutput(
    review,
    {
      scenarioId: audit.audit.header.scenarioId,
      gitSha: audit.audit.header.gitSha,
      transcriptSha256: audit.audit.header.transcriptSha256,
    },
    evidence.catalog,
  );
  if (result.tag === "invalid") fail(result.message);
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("review-output-validation.ts")) {
  main(process.argv.slice(2));
}
