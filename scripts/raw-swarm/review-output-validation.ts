import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import { repoRoot } from "./transcript.ts";

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
      readonly reason: "invalidOutput" | "identityMismatch";
      readonly message: string;
    };

export function validateReviewOutput(
  value: unknown,
  identity: ReviewIdentity,
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
  return decoded.right.scenarioId === identity.scenarioId &&
    decoded.right.gitSha === identity.gitSha &&
    decoded.right.transcriptSha256 === identity.transcriptSha256
    ? { tag: "valid", verdictCount: decoded.right.verdicts.length }
    : {
        tag: "invalid",
        reason: "identityMismatch",
        message:
          "Reviewer output scenario, Git revision, or transcript hash does not match the verified audit.",
      };
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
  const result = validateReviewOutput(review, {
    scenarioId: audit.audit.header.scenarioId,
    gitSha: audit.audit.header.gitSha,
    transcriptSha256: audit.audit.header.transcriptSha256,
  });
  if (result.tag === "invalid") fail(result.message);
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("review-output-validation.ts")) {
  main(process.argv.slice(2));
}
