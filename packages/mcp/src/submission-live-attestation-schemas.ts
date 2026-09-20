import { Schema } from "effect";

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

const OperatorDataHandlingBaseFields = {
  hostingRecipients: Schema.Array(ResolvedTextSchema).pipe(
    Schema.check(Schema.isMinLength(1)),
  ),
  stderrRetention: ResolvedTextSchema,
  ingressAccessLogRetention: ResolvedTextSchema,
} as const;
const OperatorDataHandlingEnabledFields = {
  budgetMonitoring: Schema.Literal("enabled"),
  alertRecipient: ResolvedTextSchema,
} as const;
const OperatorDataHandlingDisabledFields = {
  budgetMonitoring: Schema.Literal("disabled"),
  alertRecipient: Schema.Literal("notApplicable"),
} as const;
const OperatorDataHandlingFactsSchema = Schema.Union([
  Schema.Struct({
    ...OperatorDataHandlingBaseFields,
    ...OperatorDataHandlingEnabledFields,
  }),
  Schema.Struct({
    ...OperatorDataHandlingBaseFields,
    ...OperatorDataHandlingDisabledFields,
  }),
]);
const OperatorDataHandlingAttestationSchema = Schema.Union([
  Schema.Struct({
    ...OperatorDataHandlingBaseFields,
    ...OperatorDataHandlingEnabledFields,
    attestedAt: IsoTimestampSchema,
    attestedBy: NonEmptyTextSchema,
  }),
  Schema.Struct({
    ...OperatorDataHandlingBaseFields,
    ...OperatorDataHandlingDisabledFields,
    attestedAt: IsoTimestampSchema,
    attestedBy: NonEmptyTextSchema,
  }),
]);

export const DeploymentAttestationSchema = Schema.Struct({
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
  ingressProxy: Schema.Literal("nginx"),
  operatorDataHandling: OperatorDataHandlingFactsSchema,
  verifiedAt: IsoTimestampSchema,
});

const PortalIdentitySchema = Schema.Struct({
  status: Schema.Literal("verifiedInOpenAiPortal"),
  name: NonEmptyTextSchema,
  verifiedAt: IsoTimestampSchema,
  attestedBy: NonEmptyTextSchema,
});
export const PublicationAttestationSchema = Schema.Struct({
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
    operatorDataHandling: OperatorDataHandlingAttestationSchema,
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

export type CandidateEvidence = typeof SubmissionCandidateEvidenceSchema.Type;
export type DeploymentAttestation = typeof DeploymentAttestationSchema.Type;
export type PublicationAttestation = typeof PublicationAttestationSchema.Type;
