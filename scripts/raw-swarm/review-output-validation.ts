import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

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
  SDK_REVIEW_PACKET_RUN_ARTIFACT_ROLES,
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

type PacketAuditHeader = Pick<SdkAudit["header"], "transcriptPath"> &
  Partial<
    Pick<
      SdkAudit["header"],
      | "characterOutcome"
      | "setupOutcome"
      | "scenarioSha256"
      | "scenarioReviewSha256"
      | "charactersSha256"
      | "setupSha256"
    >
  >;

function isRunArtifactRole(
  role: string,
): role is (typeof SDK_REVIEW_PACKET_RUN_ARTIFACT_ROLES)[number] {
  return SDK_REVIEW_PACKET_RUN_ARTIFACT_ROLES.some(
    (candidate) => candidate === role,
  );
}

function packetSourceRole(
  runDirectory: string,
  path: string,
): string | undefined {
  const role = relative(runDirectory, resolve(repoRoot, path));
  return role.length === 0 || role.startsWith("..") || role.startsWith("/")
    ? undefined
    : role;
}

function packetRunSourcesMatchAudit(packet: {
  readonly audit: { readonly header: PacketAuditHeader };
  readonly runArtifacts: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly firstLine: number;
  }[];
  readonly domainAuthorities: readonly {
    readonly path: string;
    readonly firstLine: number;
  }[];
  readonly rawAuthorities: readonly {
    readonly path: string;
    readonly firstLine: number;
  }[];
}): string | undefined {
  const runDirectory = resolve(
    repoRoot,
    dirname(dirname(packet.audit.header.transcriptPath)),
  );
  const sourceCoordinates = [
    ...packet.runArtifacts.map(({ path, firstLine }) =>
      JSON.stringify(["run", path, firstLine]),
    ),
    ...packet.domainAuthorities.map(({ path, firstLine }) =>
      JSON.stringify(["domain", path, firstLine]),
    ),
    ...packet.rawAuthorities.map(({ path, firstLine }) =>
      JSON.stringify(["raw", path, firstLine]),
    ),
  ];
  if (new Set(sourceCoordinates).size !== sourceCoordinates.length) {
    return "Review evidence packet contains duplicate source coordinates.";
  }
  const runRoles = packet.runArtifacts.map(({ path }) =>
    packetSourceRole(runDirectory, path),
  );
  if (
    runRoles.some((role) => role === undefined) ||
    runRoles.some((role) => role !== undefined && !isRunArtifactRole(role))
  ) {
    return "Review evidence packet contains a run artifact outside the audited run roles.";
  }
  const domainPaths = packet.domainAuthorities.map(({ path }) =>
    relative(repoRoot, resolve(repoRoot, path)),
  );
  if (
    domainPaths.some(
      (path) => path !== "ASSUMPTIONS.md" && path !== "UBIQUITOUS_LANGUAGE.md",
    )
  ) {
    return "Review evidence packet contains an unauthorized domain authority.";
  }
  const rawPaths = packet.rawAuthorities.map(({ path }) =>
    relative(repoRoot, resolve(repoRoot, path)),
  );
  if (
    rawPaths.some(
      (path) =>
        path !== ".references/srd-5.2.1" &&
        !path.startsWith(".references/srd-5.2.1/"),
    )
  ) {
    return "Review evidence packet contains a raw authority outside the SRD root.";
  }
  const header = packet.audit.header;
  const sourceByRole = new Map(
    packet.runArtifacts.flatMap((source, index) => {
      const role = runRoles[index];
      return role === undefined ? [] : [[role, source] as const];
    }),
  );
  const auditedHashes = new Map<string, string | undefined>([
    ["SCENARIO.md", header.scenarioSha256],
    ["SCENARIO_REVIEW.json", header.scenarioReviewSha256],
    ["evidence/characters.ts", header.charactersSha256],
    ["evidence/setup.ts", header.setupSha256],
  ]);
  for (const [role, source] of sourceByRole) {
    const expectedHash = auditedHashes.get(role);
    if (expectedHash !== undefined && source.sha256 !== expectedHash) {
      return `Review evidence packet source ${role} does not match the audit header hash.`;
    }
  }
  return undefined;
}

export function reviewEvidenceCatalogForPacket(packet: {
  readonly audit: {
    readonly header: PacketAuditHeader;
    readonly calls: readonly Pick<SdkAudit["calls"][number], "seq">[];
  };
  readonly retainedHeaderEvidence: JsonValue;
  readonly runArtifacts: readonly Pick<
    SdkReviewPacketSource,
    "path" | "numberedContent" | "sha256" | "firstLine"
  >[];
  readonly domainAuthorities?: readonly Pick<
    SdkReviewPacketSource,
    "path" | "firstLine"
  >[];
  readonly rawAuthorities?: readonly Pick<
    SdkReviewPacketSource,
    "path" | "firstLine"
  >[];
}): ReviewEvidenceSourceValidation {
  const sourceBindingFailure = packetRunSourcesMatchAudit({
    audit: packet.audit,
    runArtifacts: packet.runArtifacts,
    domainAuthorities: packet.domainAuthorities ?? [],
    rawAuthorities: packet.rawAuthorities ?? [],
  });
  if (sourceBindingFailure !== undefined) {
    return { tag: "invalid", message: sourceBindingFailure };
  }
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
      const parsed: unknown = JSON.parse(
        readFileSync(resolve(repoRoot, reviewInput), "utf8"),
      );
      return parsed;
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
