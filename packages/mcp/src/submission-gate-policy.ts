import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Result, Schema } from "effect";

import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";
import { RETAINED_AUTHORIZATION_TABLES } from "./saved-session-authorization/capacity.ts";
import { OWNED_PLAY_SESSION_COLUMNS } from "./sqlite-play-session-schema.ts";

export const HIGH_RISK_CLASSIFICATIONS = [
  "workflowCorrelationIdentifier",
  "authoredContentIdentifier",
  "userVisibleTimestamp",
  "modelFacingDiagnostic",
  "personalData",
  "unconstrainedText",
] as const;
const HighRiskClassificationSchema = Schema.Literals(HIGH_RISK_CLASSIFICATIONS);

export const DATA_HANDLING_CATEGORIES = [
  "playSessionStorage",
  "oauthAuthorizationRecords",
  "rateLimitAndCapacityState",
  "requestObservationsAndProcessMetrics",
  "budgetCollectorStateAndAlerts",
  "hostingAndIngressAccessLogs",
] as const;
const DataHandlingCategorySchema = Schema.Literals(DATA_HANDLING_CATEGORIES);

const NonEmptyTextSchema = Schema.Trimmed.check(Schema.isNonEmpty());
const NonEmptyTextArraySchema = Schema.Array(NonEmptyTextSchema).pipe(
  Schema.check(Schema.isMinLength(1)),
);

const HighRiskSurfaceDecisionSchema = Schema.Struct({
  schemaOwners: NonEmptyTextArraySchema,
  directions: Schema.Array(Schema.Literals(["input", "output"] as const)).pipe(
    Schema.check(Schema.isMinLength(1)),
  ),
  classification: HighRiskClassificationSchema,
  userGoal: NonEmptyTextSchema,
  recipients: NonEmptyTextArraySchema,
  retentionOwner: NonEmptyTextSchema,
  privacyAnchor: NonEmptyTextSchema,
  scopeDigest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
});

const OpaqueNodeDecisionSchema = Schema.Struct({
  schemaOwners: NonEmptyTextArraySchema,
  directions: Schema.Array(Schema.Literals(["input", "output"] as const)).pipe(
    Schema.check(Schema.isMinLength(1)),
  ),
  evidence: Schema.Literals([
    "canonicalCodec",
    "representativeResult",
  ] as const),
  owner: NonEmptyTextSchema,
  scopeDigest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
});

const DisclosureImplementationEvidenceSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("canonicalInventory"),
    digest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
  }),
  Schema.Struct({
    tag: Schema.Literal("scopedHumanReview"),
    scope: NonEmptyTextSchema,
    sourceDigest: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
  }),
]);

const DataHandlingDisclosureSchema = Schema.Struct({
  category: DataHandlingCategorySchema,
  data: NonEmptyTextArraySchema,
  purposes: NonEmptyTextArraySchema,
  recipients: NonEmptyTextArraySchema,
  retentionSource: NonEmptyTextSchema,
  controls: NonEmptyTextArraySchema,
  implementationOwner: NonEmptyTextSchema,
  implementationEvidence: DisclosureImplementationEvidenceSchema,
  privacyAnchor: NonEmptyTextSchema,
  privacyEvidence: Schema.Struct({
    data: NonEmptyTextSchema,
    purpose: NonEmptyTextSchema,
    recipients: NonEmptyTextSchema,
    retention: NonEmptyTextSchema,
    controls: NonEmptyTextSchema,
  }),
});

export const SubmissionReviewPolicySchema = Schema.Struct({
  version: Schema.Literal(1),
  highRiskSurfaceDecisions: Schema.Array(HighRiskSurfaceDecisionSchema),
  opaqueNodeDecisions: Schema.Array(OpaqueNodeDecisionSchema),
  dataHandlingDisclosures: Schema.Array(DataHandlingDisclosureSchema),
});
export type SubmissionReviewPolicy = typeof SubmissionReviewPolicySchema.Type;

export type PolicyIssue = {
  readonly code:
    | "DUPLICATE_HIGH_RISK_DECISION"
    | "DUPLICATE_DISCLOSURE_CATEGORY"
    | "MISSING_DISCLOSURE_CATEGORY"
    | "MISSING_IMPLEMENTATION_OWNER"
    | "MISSING_OPAQUE_SCHEMA_OWNER"
    | "DISCLOSURE_EVIDENCE_KIND_MISMATCH"
    | "STALE_DISCLOSURE_EVIDENCE"
    | "MISSING_PRIVACY_ANCHOR"
    | "MISSING_PRIVACY_DISCLOSURE";
  readonly location: string;
  readonly message: string;
};

export function decodeSubmissionReviewPolicy(
  value: unknown,
): Result.Result<SubmissionReviewPolicy, string> {
  return Result.mapError(
    Schema.decodeUnknownResult(SubmissionReviewPolicySchema, {
      onExcessProperty: "error",
    })(value),
    (issue) => issue.message,
  );
}

export function validateSubmissionReviewPolicy(input: {
  readonly policy: SubmissionReviewPolicy;
  readonly repositoryRoot: string;
  readonly privacyHtml: string;
}): readonly PolicyIssue[] {
  return [
    ...duplicateDecisionIssues(input.policy),
    ...opaqueOwnerIssues(input.policy, input.repositoryRoot),
    ...disclosureIssues(input),
  ];
}

function duplicateDecisionIssues(
  policy: SubmissionReviewPolicy,
): readonly PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  const decisionKeys = new Set<string>();
  for (const decision of policy.highRiskSurfaceDecisions) {
    const key = `${decision.classification}:${decision.directions.join(",")}:${decision.schemaOwners.join(",")}`;
    if (decisionKeys.has(key)) {
      issues.push({
        code: "DUPLICATE_HIGH_RISK_DECISION",
        location: key,
        message: "High-risk decision groups must be unique.",
      });
    }
    decisionKeys.add(key);
  }
  return issues;
}

function disclosureIssues(input: {
  readonly policy: SubmissionReviewPolicy;
  readonly repositoryRoot: string;
  readonly privacyHtml: string;
}): readonly PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  const disclosures = new Map(
    input.policy.dataHandlingDisclosures.map((entry) => [
      entry.category,
      entry,
    ]),
  );
  if (disclosures.size !== input.policy.dataHandlingDisclosures.length) {
    issues.push({
      code: "DUPLICATE_DISCLOSURE_CATEGORY",
      location: "dataHandlingDisclosures",
      message: "Each data-handling category must have exactly one disclosure.",
    });
  }
  for (const category of DATA_HANDLING_CATEGORIES) {
    const disclosure = disclosures.get(category);
    if (disclosure === undefined) {
      issues.push({
        code: "MISSING_DISCLOSURE_CATEGORY",
        location: category,
        message: `Missing disclosure category: ${category}.`,
      });
      continue;
    }
    issues.push(...validateDisclosure(category, disclosure, input));
  }
  return issues;
}

function opaqueOwnerIssues(
  policy: SubmissionReviewPolicy,
  repositoryRoot: string,
): readonly PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  for (const decision of policy.opaqueNodeDecisions) {
    if (!existsSync(resolve(repositoryRoot, decision.owner))) {
      issues.push({
        code: "MISSING_OPAQUE_SCHEMA_OWNER",
        location: decision.owner,
        message: "The opaque-node canonical owner does not exist.",
      });
    }
  }
  return issues;
}

type DataHandlingDisclosure = typeof DataHandlingDisclosureSchema.Type;

function validateDisclosure(
  category: (typeof DATA_HANDLING_CATEGORIES)[number],
  disclosure: DataHandlingDisclosure,
  input: { readonly repositoryRoot: string; readonly privacyHtml: string },
): readonly PolicyIssue[] {
  return [
    ...implementationEvidenceIssues(category, disclosure, input.repositoryRoot),
    ...privacyEvidenceIssues(disclosure, input.privacyHtml),
  ];
}

function implementationEvidenceIssues(
  category: (typeof DATA_HANDLING_CATEGORIES)[number],
  disclosure: DataHandlingDisclosure,
  repositoryRoot: string,
): readonly PolicyIssue[] {
  if (
    disclosure.implementationOwner !== "operatorAttestation" &&
    !existsSync(resolve(repositoryRoot, disclosure.implementationOwner))
  ) {
    return [
      {
        code: "MISSING_IMPLEMENTATION_OWNER",
        location: disclosure.implementationOwner,
        message: "The disclosure implementation owner does not exist.",
      },
    ];
  }
  const expected = expectedDisclosureEvidence(
    category,
    disclosure.implementationOwner,
    repositoryRoot,
  );
  if (expected.tag !== disclosure.implementationEvidence.tag) {
    return [
      {
        code: "DISCLOSURE_EVIDENCE_KIND_MISMATCH",
        location: category,
        message: `Disclosure ${category} must use ${expected.tag} evidence.`,
      },
    ];
  }
  return staleEvidenceIssue(
    category,
    expected,
    disclosure.implementationEvidence,
  );
}

function staleEvidenceIssue(
  category: (typeof DATA_HANDLING_CATEGORIES)[number],
  expected: DisclosureImplementationEvidence,
  observed: DisclosureImplementationEvidence,
): readonly PolicyIssue[] {
  if (
    expected.tag === "canonicalInventory" &&
    observed.tag === "canonicalInventory" &&
    expected.digest !== observed.digest
  ) {
    return [
      {
        code: "STALE_DISCLOSURE_EVIDENCE",
        location: category,
        message: `The canonical inventory for ${category} changed after its disclosure review.`,
      },
    ];
  }
  if (
    expected.tag === "scopedHumanReview" &&
    observed.tag === "scopedHumanReview" &&
    expected.sourceDigest !== observed.sourceDigest
  ) {
    return [
      {
        code: "STALE_DISCLOSURE_EVIDENCE",
        location: category,
        message: `The reviewed implementation scope for ${category} changed.`,
      },
    ];
  }
  return [];
}

function privacyEvidenceIssues(
  disclosure: DataHandlingDisclosure,
  privacyHtml: string,
): readonly PolicyIssue[] {
  if (!privacyHtml.includes(`id="${disclosure.privacyAnchor}"`)) {
    return [
      {
        code: "MISSING_PRIVACY_ANCHOR",
        location: disclosure.privacyAnchor,
        message: "The privacy notice does not contain the declared anchor.",
      },
    ];
  }
  const section = privacySection(privacyHtml, disclosure.privacyAnchor);
  return Object.entries(disclosure.privacyEvidence).flatMap(
    ([disclosureClass, evidence]) =>
      section.includes(evidence)
        ? []
        : [
            {
              code: "MISSING_PRIVACY_DISCLOSURE" as const,
              location: `${disclosure.privacyAnchor}.${disclosureClass}`,
              message: `The privacy section does not contain its reviewed ${disclosureClass} disclosure.`,
            },
          ],
  );
}

function privacySection(html: string, anchor: string): string {
  const start = html.indexOf(`id="${anchor}"`);
  if (start < 0) return "";
  const end = html.indexOf("</section>", start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

type DisclosureImplementationEvidence =
  typeof DisclosureImplementationEvidenceSchema.Type;

export function expectedDisclosureEvidence(
  category: (typeof DATA_HANDLING_CATEGORIES)[number],
  implementationOwner: string,
  repositoryRoot: string,
): DisclosureImplementationEvidence {
  if (category === "playSessionStorage") {
    return {
      tag: "canonicalInventory",
      digest: stableDigest({
        table: "play_sessions",
        columns: OWNED_PLAY_SESSION_COLUMNS,
        guestInactivityRetentionMs: GUEST_INACTIVITY_RETENTION_MS,
        guestPressureProtectionMs: GUEST_PRESSURE_PROTECTION_MS,
        savedInactivityRetentionMs: SAVED_INACTIVITY_RETENTION_MS,
        repositorySource: sourceDigest(
          repositoryRoot,
          "packages/mcp/src/sqlite-play-session-repository.ts",
        ),
        schemaSource: sourceDigest(
          repositoryRoot,
          "packages/mcp/src/sqlite-play-session-schema.ts",
        ),
      }),
    };
  }
  if (category === "oauthAuthorizationRecords") {
    return {
      tag: "canonicalInventory",
      digest: stableDigest({
        tables: RETAINED_AUTHORIZATION_TABLES,
        refreshTokenLifetimeMs: SAVED_INACTIVITY_RETENTION_MS,
        capacitySource: sourceDigest(
          repositoryRoot,
          "packages/mcp/src/saved-session-authorization/capacity.ts",
        ),
        serviceSource: sourceDigest(
          repositoryRoot,
          "packages/mcp/src/saved-session-authorization/service.ts",
        ),
      }),
    };
  }
  if (category === "rateLimitAndCapacityState") {
    return {
      tag: "scopedHumanReview",
      scope:
        "Play Session rate-limit repository, SQLite actions, and window policy",
      sourceDigest: stableDigest([
        sourceDigest(
          repositoryRoot,
          "packages/mcp/src/play-session-repository.ts",
        ),
        sourceDigest(
          repositoryRoot,
          "packages/mcp/src/sqlite-play-session-repository.ts",
        ),
        sourceDigest(
          repositoryRoot,
          "packages/mcp/src/sqlite-play-session-actions.ts",
        ),
        sourceDigest(repositoryRoot, "packages/mcp/src/play-session-access.ts"),
      ]),
    };
  }
  return {
    tag: "scopedHumanReview",
    scope: implementationOwner,
    sourceDigest: sourceDigest(repositoryRoot, implementationOwner),
  };
}

function sourceDigest(repositoryRoot: string, path: string): string {
  return createHash("sha256")
    .update(readFileSync(resolve(repositoryRoot, path)))
    .digest("hex");
}

function stableDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
