import { Result, Schema } from "effect";

import {
  selectedSubmissionReviewCaseIdentities,
  sha256,
} from "./submission-candidate-evidence.ts";

const Sha256Schema = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u));
const GitReleaseSchema = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{40}$/u),
);
const IsoTimestampSchema = Schema.String.check(
  Schema.makeFilter((value) => !Number.isNaN(Date.parse(value))),
);
const NonEmptyTextSchema = Schema.Trimmed.check(Schema.isNonEmpty());
const ResolvedTextSchema = NonEmptyTextSchema.pipe(
  Schema.check(
    Schema.makeFilter(
      (value) => !/^(?:unknown|unresolved|tbd|not known)$/iu.test(value),
    ),
  ),
);
const NonEmptyTextArraySchema = Schema.Array(NonEmptyTextSchema).pipe(
  Schema.check(Schema.isMinLength(1)),
);

export const SubmissionCandidateEvidenceSchema = Schema.Struct({
  schema: Schema.Literal("dnd.srd-oracle.submission-candidate.v2"),
  release: GitReleaseSchema,
  publisherName: NonEmptyTextSchema,
  fingerprint: Sha256Schema,
  components: Schema.Struct({
    publicMcpContract: Sha256Schema,
    privacy: Sha256Schema,
    terms: Sha256Schema,
    reviewPolicy: Sha256Schema,
    behaviorResults: Sha256Schema,
    skillSource: Sha256Schema,
    localSkillEvaluation: Sha256Schema,
    submissionCaseInventory: Sha256Schema,
  }),
  localSkillEvaluationStatus: Schema.Literal("passed"),
  generatedAt: IsoTimestampSchema,
});

const DeploymentAttestationSchema = Schema.Struct({
  status: Schema.Literal("verifiedLiveProduction"),
  environment: Schema.Literal("production"),
  origin: NonEmptyTextSchema,
  publisherName: NonEmptyTextSchema,
  release: GitReleaseSchema,
  candidateFingerprint: Sha256Schema,
  domainChallenge: Schema.Literal("servedExact"),
  oauthDiscovery: Schema.Literal("verified"),
  publicSmoke: Schema.Literal("passed"),
  authorizationSmoke: Schema.Literal("passed"),
  verifiedAt: IsoTimestampSchema,
});

const PortalIdentitySchema = Schema.Struct({
  status: Schema.Literal("verifiedInOpenAiPortal"),
  name: NonEmptyTextSchema,
  verifiedAt: IsoTimestampSchema,
  attestedBy: NonEmptyTextSchema,
});
const PublicationAttestationSchema = Schema.Struct({
  publisherIdentity: PortalIdentitySchema,
  reviewerAccess: Schema.Struct({
    status: Schema.Literal("provisionedInOpenAiPortal"),
    mfaRequired: Schema.Literal(false),
    oauthScopes: Schema.Literal("openid email play-sessions"),
    attestedAt: IsoTimestampSchema,
    attestedBy: NonEmptyTextSchema,
  }),
  domainVerification: Schema.Struct({
    status: Schema.Literal("verifiedInOpenAiPortal"),
    origin: NonEmptyTextSchema,
    verifiedAt: IsoTimestampSchema,
    attestedBy: NonEmptyTextSchema,
  }),
  submissionEvidence: Schema.Struct({
    requirementsReview: Schema.Struct({
      officialUrls: NonEmptyTextArraySchema,
      reviewedAt: IsoTimestampSchema,
      reviewedBy: NonEmptyTextSchema,
      changes: Schema.Array(
        Schema.Struct({
          requirement: NonEmptyTextSchema,
          disposition: NonEmptyTextSchema,
        }),
      ),
    }),
    operatorDataHandling: Schema.Union([
      Schema.Struct({
        hostingRecipients: Schema.Array(ResolvedTextSchema).pipe(
          Schema.check(Schema.isMinLength(1)),
        ),
        stderrRetention: ResolvedTextSchema,
        caddyRetention: ResolvedTextSchema,
        budgetMonitoring: Schema.Literal("enabled"),
        alertRecipient: ResolvedTextSchema,
        attestedAt: IsoTimestampSchema,
        attestedBy: NonEmptyTextSchema,
      }),
      Schema.Struct({
        hostingRecipients: Schema.Array(ResolvedTextSchema).pipe(
          Schema.check(Schema.isMinLength(1)),
        ),
        stderrRetention: ResolvedTextSchema,
        caddyRetention: ResolvedTextSchema,
        budgetMonitoring: Schema.Literal("disabled"),
        alertRecipient: Schema.Literal("notApplicable"),
        attestedAt: IsoTimestampSchema,
        attestedBy: NonEmptyTextSchema,
      }),
    ]),
    portalScan: Schema.Struct({
      candidateFingerprint: Sha256Schema,
      packageDigest: Sha256Schema,
      importedSurfaceMatches: Schema.Literal(true),
      scannedAt: IsoTimestampSchema,
      scannedBy: NonEmptyTextSchema,
    }),
    submissionTests: Schema.Struct({
      candidateFingerprint: Sha256Schema,
      packageDigest: Sha256Schema,
      origin: NonEmptyTextSchema,
      submissionCaseInventory: Sha256Schema,
      status: Schema.Literal("passedInInstalledDraft"),
      testedAt: IsoTimestampSchema,
      testedBy: NonEmptyTextSchema,
      caseResults: Schema.Array(
        Schema.Struct({
          caseId: NonEmptyTextSchema,
          kind: Schema.Literals(["positive", "negative"]),
          outcome: Schema.Literal("metExpectation"),
          evidenceReference: NonEmptyTextSchema,
        }),
      ),
    }),
  }),
});

export type SubmissionLiveIssue = {
  readonly code:
    | "INVALID_CANDIDATE_EVIDENCE"
    | "INVALID_DEPLOYMENT_ATTESTATION"
    | "INVALID_PUBLICATION_ATTESTATION"
    | "SOURCE_DEPLOYMENT_MISMATCH"
    | "CANDIDATE_FINGERPRINT_MISMATCH"
    | "LIVE_SURFACE_MISMATCH"
    | "LIVE_PAGE_MISMATCH"
    | "STALE_REQUIREMENTS_REVIEW"
    | "MISSING_OFFICIAL_REQUIREMENT_SOURCE"
    | "PORTAL_SCAN_PREDATES_DEPLOYMENT"
    | "SUBMISSION_OBSERVATION_TIME_INVALID"
    | "OPERATOR_FACT_NOT_DISCLOSED"
    | "PACKAGE_DIGEST_MISMATCH"
    | "SUBMISSION_CASE_EVIDENCE_INCOMPLETE";
  readonly location: string;
  readonly message: string;
};

export type LiveSubmissionObservation = {
  readonly origin: string;
  readonly release: string;
  readonly publisherName: string;
  readonly publicMcpContract: unknown;
  readonly privacy: string;
  readonly terms: string;
};

const REQUIRED_OFFICIAL_URLS = [
  "https://developers.openai.com/plugins/deploy/app-review",
  "https://developers.openai.com/plugins/deploy/submission",
] as const;
const REQUIREMENTS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export function evaluateLiveSubmission(input: {
  readonly candidate: unknown;
  readonly deploymentAttestation: unknown;
  readonly publicationAttestation: unknown;
  readonly live: LiveSubmissionObservation;
  readonly packageDigest: string;
  readonly now: Date;
}): readonly SubmissionLiveIssue[] {
  const boundaries = decodeLiveBoundaries(input);
  if (!boundaries.success) return boundaries.issues;
  const { candidate, deployment, publication } = boundaries;
  return [
    ...candidateIntegrityIssues(candidate),
    ...sourceDeploymentIssues(candidate, deployment, publication, input.live),
    ...candidateBindingIssues(candidate, deployment, publication),
    ...packageBindingIssues(publication, input.packageDigest),
    ...submissionCaseIssues(candidate, publication),
    ...liveArtifactIssues(candidate, input.live),
    ...operatorDisclosureIssues(publication, input.live.privacy),
    ...requirementsReviewIssues(publication, deployment, input.now),
    ...submissionObservationTimingIssues(publication, input.now),
  ];
}

type CandidateEvidence = typeof SubmissionCandidateEvidenceSchema.Type;
type DeploymentAttestation = typeof DeploymentAttestationSchema.Type;
type PublicationAttestation = typeof PublicationAttestationSchema.Type;

function decodeLiveBoundaries(input: {
  readonly candidate: unknown;
  readonly deploymentAttestation: unknown;
  readonly publicationAttestation: unknown;
}):
  | { readonly success: false; readonly issues: readonly SubmissionLiveIssue[] }
  | {
      readonly success: true;
      readonly candidate: CandidateEvidence;
      readonly deployment: DeploymentAttestation;
      readonly publication: PublicationAttestation;
    } {
  const candidate = decode(
    SubmissionCandidateEvidenceSchema,
    input.candidate,
    "INVALID_CANDIDATE_EVIDENCE",
  );
  const deployment = decode(
    DeploymentAttestationSchema,
    input.deploymentAttestation,
    "INVALID_DEPLOYMENT_ATTESTATION",
  );
  const publication = decode(
    PublicationAttestationSchema,
    input.publicationAttestation,
    "INVALID_PUBLICATION_ATTESTATION",
  );
  const issues = [candidate, deployment, publication].flatMap((result) =>
    result.success ? [] : [result.issue],
  );
  return candidate.success && deployment.success && publication.success
    ? {
        success: true,
        candidate: candidate.value,
        deployment: deployment.value,
        publication: publication.value,
      }
    : { success: false, issues };
}

function candidateIntegrityIssues(
  candidate: CandidateEvidence,
): readonly SubmissionLiveIssue[] {
  const expectedFingerprint = sha256({
    release: candidate.release,
    publisherName: candidate.publisherName,
    components: candidate.components,
    localSkillEvaluationStatus: candidate.localSkillEvaluationStatus,
  });
  return expectedFingerprint === candidate.fingerprint
    ? []
    : [issue("CANDIDATE_FINGERPRINT_MISMATCH", "candidate.fingerprint")];
}

function sourceDeploymentIssues(
  candidate: CandidateEvidence,
  deployment: DeploymentAttestation,
  publication: PublicationAttestation,
  live: LiveSubmissionObservation,
): readonly SubmissionLiveIssue[] {
  const matches = [
    [candidate.release, deployment.release],
    [candidate.release, live.release],
    [candidate.publisherName, deployment.publisherName],
    [candidate.publisherName, live.publisherName],
    [candidate.publisherName, publication.publisherIdentity.name],
    [deployment.origin, live.origin],
    [publication.domainVerification.origin, live.origin],
    [publication.submissionEvidence.submissionTests.origin, live.origin],
  ].every(([expected, observed]) => expected === observed);
  return matches ? [] : [issue("SOURCE_DEPLOYMENT_MISMATCH", "release")];
}

function candidateBindingIssues(
  candidate: CandidateEvidence,
  deployment: DeploymentAttestation,
  publication: PublicationAttestation,
): readonly SubmissionLiveIssue[] {
  const matches =
    candidate.fingerprint === deployment.candidateFingerprint &&
    candidate.fingerprint ===
      publication.submissionEvidence.portalScan.candidateFingerprint &&
    candidate.fingerprint ===
      publication.submissionEvidence.submissionTests.candidateFingerprint;
  return matches
    ? []
    : [issue("CANDIDATE_FINGERPRINT_MISMATCH", "fingerprint")];
}

function packageBindingIssues(
  publication: PublicationAttestation,
  packageDigest: string,
): readonly SubmissionLiveIssue[] {
  return publication.submissionEvidence.portalScan.packageDigest ===
    packageDigest &&
    publication.submissionEvidence.submissionTests.packageDigest ===
      packageDigest
    ? []
    : [issue("PACKAGE_DIGEST_MISMATCH", "portalScan.packageDigest")];
}

function submissionCaseIssues(
  candidate: CandidateEvidence,
  publication: PublicationAttestation,
): readonly SubmissionLiveIssue[] {
  const evidence = publication.submissionEvidence.submissionTests;
  if (
    evidence.submissionCaseInventory !==
    candidate.components.submissionCaseInventory
  ) {
    return [
      issue(
        "SUBMISSION_CASE_EVIDENCE_INCOMPLETE",
        "submissionTests.submissionCaseInventory",
      ),
    ];
  }
  const expected = selectedSubmissionReviewCaseIdentities();
  const observed = new Map(
    evidence.caseResults.map((result) => [result.caseId, result]),
  );
  const complete =
    observed.size === evidence.caseResults.length &&
    expected.length === observed.size &&
    expected.every(({ id, kind }) => observed.get(id)?.kind === kind);
  return complete
    ? []
    : [
        issue(
          "SUBMISSION_CASE_EVIDENCE_INCOMPLETE",
          "submissionTests.caseResults",
        ),
      ];
}

function liveArtifactIssues(
  candidate: CandidateEvidence,
  live: LiveSubmissionObservation,
): readonly SubmissionLiveIssue[] {
  const issues: SubmissionLiveIssue[] = [];
  if (candidate.components.publicMcpContract !== sha256(live.publicMcpContract))
    issues.push(issue("LIVE_SURFACE_MISMATCH", "publicMcpContract"));
  for (const [name, value] of [
    ["privacy", live.privacy],
    ["terms", live.terms],
  ] as const) {
    if (candidate.components[name] !== sha256(value)) {
      issues.push(issue("LIVE_PAGE_MISMATCH", name));
    }
  }
  return issues;
}

function operatorDisclosureIssues(
  publication: PublicationAttestation,
  privacy: string,
): readonly SubmissionLiveIssue[] {
  const operatorData = publication.submissionEvidence.operatorDataHandling;
  const operatorPrivacyFacts = [
    ...operatorData.hostingRecipients.map(
      (fact) => ["access-logs", fact] as const,
    ),
    ["request-observations", operatorData.stderrRetention] as const,
    ["access-logs", operatorData.caddyRetention] as const,
    [
      "budget-monitoring",
      operatorData.budgetMonitoring === "enabled"
        ? "Budget monitoring is enabled for this deployment"
        : "Budget monitoring is disabled for this deployment",
    ] as const,
    ...(operatorData.budgetMonitoring === "enabled"
      ? [["budget-monitoring", operatorData.alertRecipient] as const]
      : []),
  ];
  return operatorPrivacyFacts.flatMap(([anchor, fact]) =>
    privacySection(privacy, anchor).includes(escapeHtml(fact))
      ? []
      : [issue("OPERATOR_FACT_NOT_DISCLOSED", `${anchor}:${fact}`)],
  );
}

function requirementsReviewIssues(
  publication: PublicationAttestation,
  deployment: DeploymentAttestation,
  now: Date,
): readonly SubmissionLiveIssue[] {
  const issues: SubmissionLiveIssue[] = [];
  const requirements = publication.submissionEvidence.requirementsReview;
  const reviewedAt = Date.parse(requirements.reviewedAt);
  if (
    reviewedAt > now.getTime() ||
    now.getTime() - reviewedAt > REQUIREMENTS_MAX_AGE_MS
  ) {
    issues.push(
      issue("STALE_REQUIREMENTS_REVIEW", "requirementsReview.reviewedAt"),
    );
  }
  for (const url of REQUIRED_OFFICIAL_URLS) {
    if (!requirements.officialUrls.includes(url)) {
      issues.push(issue("MISSING_OFFICIAL_REQUIREMENT_SOURCE", url));
    }
  }
  if (
    Date.parse(publication.submissionEvidence.portalScan.scannedAt) <=
    Date.parse(deployment.verifiedAt)
  ) {
    issues.push(
      issue("PORTAL_SCAN_PREDATES_DEPLOYMENT", "portalScan.scannedAt"),
    );
  }
  return issues;
}

function submissionObservationTimingIssues(
  publication: PublicationAttestation,
  now: Date,
): readonly SubmissionLiveIssue[] {
  const scannedAt = Date.parse(
    publication.submissionEvidence.portalScan.scannedAt,
  );
  const testedAt = Date.parse(
    publication.submissionEvidence.submissionTests.testedAt,
  );
  if (
    scannedAt > now.getTime() ||
    testedAt <= scannedAt ||
    testedAt > now.getTime()
  ) {
    return [
      issue("SUBMISSION_OBSERVATION_TIME_INVALID", "submissionTests.testedAt"),
    ];
  }
  return [];
}

function privacySection(html: string, anchor: string): string {
  const start = html.indexOf(`id="${anchor}"`);
  if (start < 0) return "";
  const end = html.indexOf("</section>", start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decode<A, I>(
  schema: Schema.Codec<A, I, never>,
  value: unknown,
  code: SubmissionLiveIssue["code"],
):
  | { readonly success: true; readonly value: A }
  | { readonly success: false; readonly issue: SubmissionLiveIssue } {
  const decoded = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "error",
  })(value);
  return Result.isSuccess(decoded)
    ? { success: true, value: decoded.success }
    : {
        success: false,
        issue: {
          code,
          location: "/",
          message: decoded.failure.message,
        },
      };
}

function issue(
  code: SubmissionLiveIssue["code"],
  location: string,
): SubmissionLiveIssue {
  return {
    code,
    location,
    message:
      "The live pre-submission evidence does not match the reviewed candidate.",
  };
}
