import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Either, Schema } from "effect";

import type { JsonValue } from "./sdk-player/continuation-contract.ts";
import { ReviewOutputSchema } from "./review-contract.ts";
import {
  reviewEvidenceIsExact,
  type ReviewEvidenceCatalog,
} from "./review-evidence.ts";
import { readSdkAudit, type SdkAudit } from "./sdk-player/sdk-audit.ts";
import type { SdkReviewPacketSource } from "./sdk-player/sdk-review-packet.ts";
import {
  SDK_REVIEW_PACKET_MAX_BYTES,
  validateSdkReviewPacket,
} from "./sdk-player/sdk-review-packet.ts";
import { repoRoot } from "./transcript.ts";

export type ReviewIdentity = Pick<
  SdkAudit["header"],
  "scenarioId" | "gitSha" | "transcriptSha256"
>;

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

export function reviewEvidenceCatalogForPacket(packet: {
  readonly audit: {
    readonly header: Pick<SdkAudit["header"], "transcriptPath">;
    readonly calls: readonly Pick<SdkAudit["calls"][number], "seq">[];
  };
  readonly retainedHeaderEvidence: JsonValue;
  readonly runArtifacts: readonly Pick<
    SdkReviewPacketSource,
    "path" | "numberedContent"
  >[];
}): ReviewEvidenceSourceValidation {
  const runDirectory = dirname(dirname(packet.audit.header.transcriptPath));
  const expectedPath = (name: "setup.ts" | "characters.ts") =>
    resolve(repoRoot, runDirectory, "evidence", name);
  const sourceFor = (name: "setup.ts" | "characters.ts") =>
    packet.runArtifacts.find(
      (source) => resolve(repoRoot, source.path) === expectedPath(name),
    );
  const setup = sourceFor("setup.ts");
  const characters = sourceFor("characters.ts");
  return {
    tag: "valid",
    catalog: {
      sequences: new Set(packet.audit.calls.map(({ seq }) => seq)),
      setupLineCount: setup?.numberedContent.split("\n").length ?? 0,
      charactersLineCount: characters?.numberedContent.split("\n").length ?? 0,
      hasTranscriptHeader: packet.retainedHeaderEvidence !== undefined,
    },
  };
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
  const [reviewInput, auditInput, packetInput, ...unexpected] = args;
  if (
    reviewInput === undefined ||
    auditInput === undefined ||
    packetInput === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: review-output-validation.ts <review.json> <audit.jsonl> <packet.json>",
    );
  }
  const audit = readSdkAudit(resolve(repoRoot, auditInput));
  if (audit.tag === "invalid") fail(audit.message);
  const packetPath = resolve(repoRoot, packetInput);
  const packetBytes = readFileSync(packetPath);
  if (packetBytes.byteLength > SDK_REVIEW_PACKET_MAX_BYTES) {
    fail("Review evidence packet exceeds its public byte limit.");
  }
  let packetInputValue: unknown;
  try {
    packetInputValue = JSON.parse(packetBytes.toString("utf8"));
  } catch {
    fail(`Review evidence packet is unreadable or malformed: ${packetInput}`);
  }
  const packet = validateSdkReviewPacket(packetInputValue, audit.audit);
  if (packet.tag === "invalid") fail(packet.message);
  const review = (() => {
    try {
      return JSON.parse(
        readFileSync(resolve(repoRoot, reviewInput), "utf8"),
      ) as unknown;
    } catch {
      return fail(`Reviewer output is unreadable or malformed: ${reviewInput}`);
    }
  })();
  const evidence = reviewEvidenceCatalogForPacket(packet.packet);
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
