import { describe, expect, test } from "vitest";

import {
  selectedSubmissionReviewCaseIdentities,
  sha256,
} from "./submission-candidate-evidence.ts";
import { evaluateLiveSubmission } from "./submission-live-gate.ts";

const release = "a".repeat(40);
const origin = "https://oracle.publisher.dev";
const publisherName = "Verified Publisher";
const packageDigest = "e".repeat(64);
const live = {
  origin,
  release,
  publisherName,
  publicMcpContract: { tools: ["synthetic"] },
  privacy:
    '<section id="request-observations">30 days</section><section id="budget-monitoring">Budget monitoring is enabled for this deployment; publisher operations address</section><section id="access-logs">publisher hosting operator; 14 days</section>',
  terms: "reviewed terms",
};
const components = {
  publicMcpContract: sha256(live.publicMcpContract),
  privacy: sha256(live.privacy),
  terms: sha256(live.terms),
  reviewPolicy: sha256({ policy: true }),
  behaviorResults: sha256({ behavior: true }),
  skillSource: sha256({ skill: true }),
  localSkillEvaluation: sha256({ evaluation: true }),
  submissionCaseInventory: sha256({ cases: true }),
};
const fingerprint = sha256({
  release,
  publisherName,
  components,
  localSkillEvaluationStatus: "passed",
});
const candidate = {
  schema: "dnd.srd-oracle.submission-candidate.v2",
  release,
  publisherName,
  fingerprint,
  components,
  localSkillEvaluationStatus: "passed",
  generatedAt: "2026-09-18T10:00:00.000Z",
};
const deploymentAttestation = {
  status: "verifiedLiveProduction",
  environment: "production",
  origin,
  publisherName,
  release,
  candidateFingerprint: fingerprint,
  domainChallenge: "servedExact",
  oauthDiscovery: "verified",
  publicSmoke: "passed",
  authorizationSmoke: "passed",
  ingressProxy: "nginx",
  operatorDataHandling: {
    hostingRecipients: ["publisher hosting operator"],
    stderrRetention: "30 days",
    ingressAccessLogRetention: "14 days",
    budgetMonitoring: "enabled",
    alertRecipient: "publisher operations address",
  },
  verifiedAt: "2026-09-19T10:00:00.000Z",
};
const publicationAttestation = {
  publisherIdentity: {
    status: "verifiedInOpenAiPortal",
    name: publisherName,
    verifiedAt: "2026-09-19T10:01:00.000Z",
    attestedBy: "operator",
  },
  reviewerAccess: {
    status: "provisionedInOpenAiPortal",
    mfaRequired: false,
    oauthScopes: "openid email play-sessions",
    attestedAt: "2026-09-19T10:02:00.000Z",
    attestedBy: "operator",
  },
  domainVerification: {
    status: "verifiedInOpenAiPortal",
    origin,
    verifiedAt: "2026-09-19T10:03:00.000Z",
    attestedBy: "operator",
  },
  submissionEvidence: {
    requirementsReview: {
      officialUrls: [
        "https://developers.openai.com/plugins/deploy/app-review",
        "https://developers.openai.com/plugins/deploy/submission",
      ],
      reviewedAt: "2026-09-19T11:00:00.000Z",
      reviewedBy: "operator",
      changes: [],
    },
    operatorDataHandling: {
      hostingRecipients: ["publisher hosting operator"],
      stderrRetention: "30 days",
      ingressAccessLogRetention: "14 days",
      budgetMonitoring: "enabled",
      alertRecipient: "publisher operations address",
      attestedAt: "2026-09-19T11:01:00.000Z",
      attestedBy: "operator",
    },
    portalScan: {
      candidateFingerprint: fingerprint,
      packageDigest,
      importedSurfaceMatches: true,
      scannedAt: "2026-09-19T12:00:00.000Z",
      scannedBy: "operator",
    },
    submissionTests: {
      candidateFingerprint: fingerprint,
      packageDigest,
      origin,
      submissionCaseInventory: components.submissionCaseInventory,
      status: "passedInInstalledDraft",
      testedAt: "2026-09-19T12:01:00.000Z",
      testedBy: "operator",
      caseResults: selectedSubmissionReviewCaseIdentities().map(
        ({ id, kind }) => ({
          caseId: id,
          kind,
          outcome: "metExpectation",
          evidenceReference: `conversation:${id}`,
        }),
      ),
    },
  },
};

describe("live submission gate", () => {
  test("accepts one coherent post-deployment evidence set", () => {
    expect(
      evaluateLiveSubmission({
        candidate,
        deploymentAttestation,
        publicationAttestation,
        live,
        packageDigest,
        now: new Date("2026-09-19T13:00:00.000Z"),
      }),
    ).toEqual([]);
  });

  test("accumulates mismatched, stale, and incomplete evidence", () => {
    const issues = evaluateLiveSubmission({
      candidate: {
        ...candidate,
        fingerprint: "0".repeat(64),
      },
      deploymentAttestation: {
        ...deploymentAttestation,
        release: "b".repeat(40),
        candidateFingerprint: "c".repeat(64),
      },
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          requirementsReview: {
            ...publicationAttestation.submissionEvidence.requirementsReview,
            officialUrls: [
              "https://developers.openai.com/plugins/deploy/submission",
            ],
            reviewedAt: "2026-09-01T00:00:00.000Z",
          },
          portalScan: {
            ...publicationAttestation.submissionEvidence.portalScan,
            candidateFingerprint: "d".repeat(64),
            scannedAt: "2026-09-18T00:00:00.000Z",
          },
          submissionTests: {
            ...publicationAttestation.submissionEvidence.submissionTests,
            candidateFingerprint: "d".repeat(64),
            caseResults:
              publicationAttestation.submissionEvidence.submissionTests.caseResults.slice(
                1,
              ),
          },
        },
      },
      live: { ...live, privacy: "changed privacy" },
      packageDigest: "9".repeat(64),
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(new Set(issues.map((issue) => issue.code))).toEqual(
      new Set([
        "SOURCE_DEPLOYMENT_MISMATCH",
        "CANDIDATE_FINGERPRINT_MISMATCH",
        "LIVE_PAGE_MISMATCH",
        "OPERATOR_FACT_NOT_DISCLOSED",
        "STALE_REQUIREMENTS_REVIEW",
        "MISSING_OFFICIAL_REQUIREMENT_SOURCE",
        "PORTAL_SCAN_PREDATES_DEPLOYMENT",
        "PACKAGE_DIGEST_MISMATCH",
        "SUBMISSION_CASE_EVIDENCE_INCOMPLETE",
      ]),
    );
  });

  test("rejects unresolved operator retention facts at the boundary", () => {
    const issues = evaluateLiveSubmission({
      candidate,
      deploymentAttestation,
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          operatorDataHandling: {
            ...publicationAttestation.submissionEvidence.operatorDataHandling,
            stderrRetention: "unknown",
          },
        },
      },
      live,
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_PUBLICATION_ATTESTATION" }),
    );
  });

  test("does not satisfy a log-retention fact from an unrelated privacy section", () => {
    const misplacedPrivacy = live.privacy.replace(
      '<section id="request-observations">30 days</section>',
      '<section id="play-session-data">30 days</section><section id="request-observations">operator controlled</section>',
    );
    const changedComponents = {
      ...candidate.components,
      privacy: sha256(misplacedPrivacy),
    };
    const changedFingerprint = sha256({
      release,
      publisherName,
      components: changedComponents,
      localSkillEvaluationStatus: "passed",
    });
    const issues = evaluateLiveSubmission({
      candidate: {
        ...candidate,
        components: changedComponents,
        fingerprint: changedFingerprint,
      },
      deploymentAttestation: {
        ...deploymentAttestation,
        candidateFingerprint: changedFingerprint,
      },
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          portalScan: {
            ...publicationAttestation.submissionEvidence.portalScan,
            candidateFingerprint: changedFingerprint,
          },
        },
      },
      live: { ...live, privacy: misplacedPrivacy },
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "OPERATOR_FACT_NOT_DISCLOSED",
        location: "request-observations:30 days",
      }),
    );
  });

  test("rejects unverified portal identity and reviewer access states", () => {
    const issues = evaluateLiveSubmission({
      candidate,
      deploymentAttestation,
      publicationAttestation: {
        ...publicationAttestation,
        publisherIdentity: {
          ...publicationAttestation.publisherIdentity,
          status: "pending",
        },
        reviewerAccess: {
          ...publicationAttestation.reviewerAccess,
          mfaRequired: true,
        },
      },
      live,
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_PUBLICATION_ATTESTATION" }),
    );
  });

  test("rejects incomplete installed submission-case evidence", () => {
    const issues = evaluateLiveSubmission({
      candidate,
      deploymentAttestation,
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          submissionTests: {
            ...publicationAttestation.submissionEvidence.submissionTests,
            caseResults:
              publicationAttestation.submissionEvidence.submissionTests.caseResults.slice(
                1,
              ),
          },
        },
      },
      live,
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "SUBMISSION_CASE_EVIDENCE_INCOMPLETE",
      }),
    );
  });

  test("binds installed submission tests to package, origin, and observation order", () => {
    const packageIssues = evaluateLiveSubmission({
      candidate,
      deploymentAttestation,
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          submissionTests: {
            ...publicationAttestation.submissionEvidence.submissionTests,
            packageDigest: "0".repeat(64),
          },
        },
      },
      live,
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(packageIssues).toContainEqual(
      expect.objectContaining({ code: "PACKAGE_DIGEST_MISMATCH" }),
    );

    const originIssues = evaluateLiveSubmission({
      candidate,
      deploymentAttestation,
      publicationAttestation: {
        ...publicationAttestation,
        submissionEvidence: {
          ...publicationAttestation.submissionEvidence,
          submissionTests: {
            ...publicationAttestation.submissionEvidence.submissionTests,
            origin: "https://different.publisher.dev",
          },
        },
      },
      live,
      packageDigest,
      now: new Date("2026-09-19T13:00:00.000Z"),
    });
    expect(originIssues).toContainEqual(
      expect.objectContaining({ code: "SOURCE_DEPLOYMENT_MISMATCH" }),
    );

    for (const testedAt of [
      "2026-09-19T11:59:00.000Z",
      "2026-09-19T14:00:00.000Z",
    ]) {
      const timingIssues = evaluateLiveSubmission({
        candidate,
        deploymentAttestation,
        publicationAttestation: {
          ...publicationAttestation,
          submissionEvidence: {
            ...publicationAttestation.submissionEvidence,
            submissionTests: {
              ...publicationAttestation.submissionEvidence.submissionTests,
              testedAt,
            },
          },
        },
        live,
        packageDigest,
        now: new Date("2026-09-19T13:00:00.000Z"),
      });
      expect(timingIssues).toContainEqual(
        expect.objectContaining({
          code: "SUBMISSION_OBSERVATION_TIME_INVALID",
        }),
      );
    }
  });
});
