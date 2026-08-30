import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { canonicalBaselineJson } from "./effect3-baseline.ts";
import {
  decodeOracleDeltaCertificateFixtureBytes,
  readOracleDeltaCertificateFixture,
} from "./effect4-oracle-delta.test-support.ts";
import {
  calculateOracleDeltaEvidence,
  calculateReviewedReasonEvidence,
  compareOracleDeltaCertificate,
  decodeOracleDeltaCertificate,
  oracleDeltaSite,
  summarizeOracleDeltas,
  verifyEffect4OracleDelta,
  type OracleDelta,
  type OracleDeltaCertificate,
  type OracleDeltaEvidence,
  type ReviewedOracleDeltaIdentity,
  type ReviewedReasonId,
} from "./effect4-oracle-delta.ts";

const TEST_REASON_ID: ReviewedReasonId =
  "surface-authored-contract-convergence";
const EFFECT3_BASELINE_PATH =
  "docs/migrations/effect-4/effect3-behavioral-oracle.json";

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const artifact = (path: string, digest: string) => ({
  path,
  byteLength: digest.length,
  sha256: digest,
});

function evidenceFor(
  baseline: Parameters<typeof calculateOracleDeltaEvidence>[0],
  candidate: Parameters<typeof calculateOracleDeltaEvidence>[1],
): OracleDeltaEvidence {
  const result = calculateOracleDeltaEvidence(baseline, candidate);
  expect(result.tag).toBe("evidence");
  if (result.tag === "invalid") {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.value;
}

function certificateFor(
  evidence: OracleDeltaEvidence,
  reasonId: ReviewedReasonId = TEST_REASON_ID,
): OracleDeltaCertificate {
  const identities: readonly ReviewedOracleDeltaIdentity[] =
    evidence.delta.identities.map((delta) => ({ reasonId, delta }));
  return {
    formatVersion: 2,
    baseline: {
      path: EFFECT3_BASELINE_PATH,
      artifact: evidence.baseline,
    },
    candidate: evidence.candidate,
    delta: {
      algorithm: "canonical-keyed-collection-delta-v2",
      totalCount: evidence.delta.totalCount,
      identitySha256: evidence.delta.identitySha256,
      identities,
      reviewedReasons: calculateReviewedReasonEvidence(
        identities,
        evidence.delta.collectionAuthorities,
      ),
      collectionAuthorities: evidence.delta.collectionAuthorities,
      arrayComparisonAuthorities: evidence.delta.arrayComparisonAuthorities,
    },
  };
}

const surfaceContent = (entries: readonly ReturnType<typeof artifact>[]) => ({
  surface: { content: entries },
});

describe("Effect 4 finite oracle delta", () => {
  test("keys manifest insertions and removals without positional churn", () => {
    const first = artifact("a.json", "a".repeat(64));
    const second = artifact("b.json", "b".repeat(64));
    const inserted = artifact("between.json", "c".repeat(64));
    const insertion = evidenceFor(
      surfaceContent([first, second]),
      surfaceContent([first, inserted, second]),
    );
    expect(insertion.delta.identities).toEqual([
      expect.objectContaining({
        operation: "added",
        segments: ["surface", "content", "@path=between.json"],
      }),
    ]);

    const removal = evidenceFor(
      surfaceContent([first, inserted, second]),
      surfaceContent([first, second]),
    );
    expect(removal.delta.identities).toEqual([
      expect.objectContaining({
        operation: "removed",
        segments: ["surface", "content", "@path=between.json"],
      }),
    ]);
  });

  test("detects keyed reorder only through ordered-key authority", () => {
    const first = {
      ...artifact("a.json", "a".repeat(64)),
      nestedSequence: ["only-on-first"],
    };
    const second = artifact("b.json", "b".repeat(64));
    const unchanged = evidenceFor(
      surfaceContent([first, second]),
      surfaceContent([first, second]),
    );
    const evidence = evidenceFor(
      surfaceContent([first, second]),
      surfaceContent([second, first]),
    );
    expect(evidence.delta.identities).toEqual([]);
    expect(evidence.delta.arrayComparisonAuthorities).toEqual(
      unchanged.delta.arrayComparisonAuthorities,
    );
    const authority = evidence.delta.collectionAuthorities[0];
    expect(authority).toBeDefined();
    if (authority === undefined) return;
    expect(authority.baseline.count).toBe(authority.candidate.count);
    expect(authority.baseline.membershipSha256).toBe(
      authority.candidate.membershipSha256,
    );
    expect(authority.baseline.memberOrderSha256).not.toBe(
      authority.candidate.memberOrderSha256,
    );
  });

  test("detects object-keyed reorder only through explicit order authority", () => {
    const baseline = {
      mcp: {
        registered: { first: { title: "First" }, second: { title: "Second" } },
        registeredOrder: ["first", "second"],
      },
    };
    const candidate = {
      mcp: {
        registered: baseline.mcp.registered,
        registeredOrder: ["second", "first"],
      },
    };
    const evidence = evidenceFor(baseline, candidate);
    expect(evidence.delta.identities).toEqual([]);
    expect(evidence.delta.collectionAuthorities).toEqual([
      expect.objectContaining({
        id: "mcp-registered-tools",
        baseline: expect.objectContaining({ count: 2 }),
        candidate: expect.objectContaining({ count: 2 }),
      }),
    ]);
    const authority = evidence.delta.collectionAuthorities[0];
    expect(authority).toBeDefined();
    if (authority === undefined) return;
    expect(authority.baseline.membershipSha256).toBe(
      authority.candidate.membershipSha256,
    );
    expect(authority.baseline.memberOrderSha256).not.toBe(
      authority.candidate.memberOrderSha256,
    );
    expect(
      certificateFor(evidence, "mcp-registration-contract-migration").delta
        .reviewedReasons,
    ).toContainEqual(
      expect.objectContaining({
        id: "mcp-registration-contract-migration",
        changedCollectionAuthorityIds: ["mcp-registered-tools"],
      }),
    );
  });

  test("preserves positional comparison where order is the contract", () => {
    const evidence = evidenceFor(
      {
        persistence: {
          fixtures: {
            guest: {
              value: {
                operations: [{ name: "first" }, { name: "second" }],
              },
            },
          },
        },
      },
      {
        persistence: {
          fixtures: {
            guest: {
              value: {
                operations: [{ name: "second" }, { name: "first" }],
              },
            },
          },
        },
      },
    );
    expect(
      evidence.delta.identities.map(({ segments }) =>
        oracleDeltaSite(segments),
      ),
    ).toEqual([
      "/persistence/fixtures/guest/value/operations/0/name",
      "/persistence/fixtures/guest/value/operations/1/name",
    ]);
  });

  test("rejects undeclared identity-bearing arrays", () => {
    expect(
      calculateOracleDeltaEvidence(
        { sequence: [{ id: "first" }] },
        { sequence: [{ id: "second" }] },
      ),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          kind: "invalid-collection-authority",
          message: "/sequence has undeclared id-keyed collection semantics",
        },
      ],
    });
  });

  test("rejects an unreviewed positional array site", () => {
    const reviewed = evidenceFor(
      { sequence: ["first"] },
      { sequence: ["second"] },
    );
    const certificate = certificateFor(reviewed);
    const observed = evidenceFor(
      { sequence: ["first"], extra: [1] },
      { sequence: ["second"], extra: [1] },
    );
    expect(compareOracleDeltaCertificate(certificate, observed)).toContainEqual(
      expect.objectContaining({ kind: "array-comparison-certificate-stale" }),
    );
  });

  test("certifies exact classified addition, removal, and reorder", () => {
    const first = artifact("a.json", "a".repeat(64));
    const second = artifact("b.json", "b".repeat(64));
    const scenarios = [
      evidenceFor(surfaceContent([first]), surfaceContent([first, second])),
      evidenceFor(surfaceContent([first, second]), surfaceContent([first])),
      evidenceFor(
        surfaceContent([first, second]),
        surfaceContent([second, first]),
      ),
    ];
    for (const evidence of scenarios) {
      expect(
        compareOracleDeltaCertificate(certificateFor(evidence), evidence),
      ).toEqual([]);
    }
  });

  test("rejects duplicate sites even when their values differ", () => {
    const segments = ["surface", "content", "@path=a.json", "sha256"];
    const first: OracleDelta = {
      operation: "changed",
      segments,
      baselineSha256: "a".repeat(64),
      candidateSha256: "b".repeat(64),
    };
    const second: OracleDelta = {
      ...first,
      candidateSha256: "c".repeat(64),
    };
    expect(summarizeOracleDeltas([first, second])).toEqual({
      tag: "invalid",
      issues: [
        {
          kind: "duplicate-delta-site",
          site: "/surface/content/@path=a.json/sha256",
        },
      ],
    });
  });

  test("rejects path duplication and wrong operation-side shapes", () => {
    const evidence = evidenceFor(
      surfaceContent([]),
      surfaceContent([artifact("a.json", "a".repeat(64))]),
    );
    const certificate = certificateFor(evidence);
    const added = evidence.delta.identities[0];
    expect(added?.operation).toBe("added");
    if (added === undefined) return;
    const wrongSide = {
      ...certificate,
      delta: {
        ...certificate.delta,
        identities: [
          {
            reasonId: TEST_REASON_ID,
            delta: { ...added, baselineSha256: "b".repeat(64) },
          },
        ],
      },
    };
    const duplicatedPath = {
      ...certificate,
      delta: {
        ...certificate.delta,
        identities: [
          {
            reasonId: TEST_REASON_ID,
            delta: { ...added, path: "/different" },
          },
        ],
      },
    };
    expect(Result.isFailure(decodeOracleDeltaCertificate(wrongSide))).toBe(
      true,
    );
    expect(Result.isFailure(decodeOracleDeltaCertificate(duplicatedPath))).toBe(
      true,
    );
  });

  test("rejects copied, surplus, removed, substituted, and stale authorities", () => {
    const evidence = evidenceFor(
      surfaceContent([]),
      surfaceContent([artifact("a.json", "a".repeat(64))]),
    );
    const certificate = certificateFor(evidence);
    const reviewed = certificate.delta.identities[0];
    expect(reviewed).toBeDefined();
    if (reviewed === undefined) return;
    const copiedToAnotherSite: ReviewedOracleDeltaIdentity = {
      reasonId: reviewed.reasonId,
      delta: {
        ...reviewed.delta,
        segments: ["surface", "content", "@path=b.json"],
      },
    };
    const substituted: ReviewedOracleDeltaIdentity = {
      reasonId: reviewed.reasonId,
      delta:
        reviewed.delta.operation === "added"
          ? { ...reviewed.delta, candidateSha256: "c".repeat(64) }
          : reviewed.delta,
    };
    const identitySets = [
      [reviewed, reviewed],
      [reviewed, copiedToAnotherSite],
      [copiedToAnotherSite],
      [],
      [substituted],
    ];
    for (const identities of identitySets) {
      const modified: OracleDeltaCertificate = {
        ...certificate,
        delta: {
          ...certificate.delta,
          identities,
          reviewedReasons: calculateReviewedReasonEvidence(
            identities,
            certificate.delta.collectionAuthorities,
          ),
        },
      };
      expect(compareOracleDeltaCertificate(modified, evidence)).toContainEqual(
        expect.objectContaining({ kind: "delta-certificate-stale" }),
      );
    }

    const authority = certificate.delta.collectionAuthorities[0];
    expect(authority).toBeDefined();
    if (authority === undefined) return;
    for (const candidateAuthority of [
      {
        ...authority.candidate,
        count: authority.candidate.count + 1,
      },
      {
        ...authority.candidate,
        membershipSha256: "d".repeat(64),
      },
      {
        ...authority.candidate,
        memberOrderSha256: "e".repeat(64),
      },
    ]) {
      const staleMembership: OracleDeltaCertificate = {
        ...certificate,
        delta: {
          ...certificate.delta,
          collectionAuthorities: [
            {
              ...authority,
              candidate: candidateAuthority,
            },
          ],
        },
      };
      expect(
        compareOracleDeltaCertificate(staleMembership, evidence),
      ).toContainEqual(
        expect.objectContaining({ kind: "collection-certificate-stale" }),
      );
    }
  });

  test("derives reviewed-reason evidence from exact certificate identities", () => {
    const evidence = evidenceFor(
      surfaceContent([]),
      surfaceContent([artifact("a.json", "a".repeat(64))]),
    );
    const certificate = certificateFor(evidence);
    const reason = certificate.delta.reviewedReasons[0];
    expect(reason).toBeDefined();
    if (reason === undefined) return;
    const staleReason: OracleDeltaCertificate = {
      ...certificate,
      delta: {
        ...certificate.delta,
        reviewedReasons: [{ ...reason, deltaCount: reason.deltaCount + 1 }],
      },
    };
    expect(compareOracleDeltaCertificate(staleReason, evidence)).toContainEqual(
      expect.objectContaining({ kind: "reviewed-reason-certificate-stale" }),
    );
  });

  test("rejects wrong certificate digests and malformed certificate bytes", () => {
    const malformed = new TextEncoder().encode("{}");
    expect(
      decodeOracleDeltaCertificateFixtureBytes(malformed, "0".repeat(64)),
    ).toMatchObject({
      tag: "invalid",
      issue: { kind: "certificate-digest-mismatch" },
    });
    expect(
      decodeOracleDeltaCertificateFixtureBytes(malformed, sha256(malformed)),
    ).toMatchObject({
      tag: "invalid",
      issue: { kind: "certificate-invalid" },
    });
  });

  test("rejects final and ancestor symlink authority redirection", () => {
    const repositoryFixture = mkdtempSync(
      resolve(".effect4-oracle-authority-fixture-"),
    );
    const externalFixture = mkdtempSync(
      join(tmpdir(), "effect4-oracle-authority-target-"),
    );
    try {
      const externalCertificate = join(externalFixture, "certificate.json");
      writeFileSync(externalCertificate, "{}\n");
      symlinkSync(
        externalCertificate,
        join(repositoryFixture, "certificate.json"),
      );
      symlinkSync(externalFixture, join(repositoryFixture, "redirect"));
      const fixtureName = basename(repositoryFixture);
      for (const repositoryPath of [
        `${fixtureName}/certificate.json`,
        `${fixtureName}/redirect/certificate.json`,
      ]) {
        expect(
          readOracleDeltaCertificateFixture({
            repositoryPath,
            expectedSha256: sha256("{}\n"),
          }),
        ).toMatchObject({
          tag: "invalid",
          issue: { kind: "certificate-unreadable" },
        });
      }
    } finally {
      rmSync(repositoryFixture, { recursive: true, force: true });
      rmSync(externalFixture, { recursive: true, force: true });
    }
  });

  test("rejects runtime surplus production authority", async () => {
    const result = await Reflect.apply(verifyEffect4OracleDelta, undefined, [
      { certificatePath: "untrusted.json" },
    ]);
    expect(result).toEqual({
      tag: "invalid",
      issues: [
        {
          kind: "production-authority-override",
          message: "production verification accepts only pinned authority",
        },
      ],
    });
  });

  test("keeps certificate serialization deterministic", () => {
    const evidence = evidenceFor(
      surfaceContent([]),
      surfaceContent([artifact("a.json", "a".repeat(64))]),
    );
    const certificate = certificateFor(evidence);
    expect(canonicalBaselineJson(certificate)).toBe(
      canonicalBaselineJson(JSON.parse(canonicalBaselineJson(certificate))),
    );
  });
});
