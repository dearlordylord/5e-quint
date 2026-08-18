import { describe, expect, test } from "vitest";

import {
  reviewEvidenceCatalogForPacket,
  validateReviewOutput,
} from "./review-output-validation.ts";

const identity = {
  scenarioId: "review-example",
  gitSha: "a".repeat(40),
  transcriptSha256: "b".repeat(64),
};
const evidenceCatalog = {
  sequences: new Set([1]),
  setupLineCount: 10,
  charactersLineCount: 10,
  hasTranscriptHeader: true,
};

const review = {
  ...identity,
  reviewer: "Evidence reviewer",
  verdicts: [
    {
      class: "pass",
      claim: "The retained fact survives review.",
      evidence: "SDK sequence 1 records it.",
    },
  ],
};

describe("review output validation", () => {
  test("requires a decoded review with the verified audit identity", () => {
    expect(validateReviewOutput(review, identity, evidenceCatalog)).toEqual({
      tag: "valid",
      verdictCount: 1,
    });
    expect(
      validateReviewOutput(
        { ...review, transcriptSha256: "c".repeat(64) },
        identity,
        evidenceCatalog,
      ),
    ).toEqual({
      tag: "invalid",
      reason: "identityMismatch",
      message:
        "Reviewer output scenario, Git revision, or transcript hash does not match the verified audit.",
    });
    expect(
      validateReviewOutput(
        { ...review, verdicts: [] },
        identity,
        evidenceCatalog,
      ),
    ).toMatchObject({ tag: "invalid", reason: "invalidOutput" });
    expect(
      validateReviewOutput(
        {
          ...review,
          verdicts: [
            {
              ...review.verdicts[0],
              evidence: "SCENARIO_REVIEW.json:5 claims it.",
            },
          ],
        },
        identity,
        evidenceCatalog,
      ),
    ).toMatchObject({ tag: "invalid", reason: "evidenceMismatch" });
    expect(
      validateReviewOutput(
        {
          ...review,
          verdicts: [
            {
              class: "pass",
              claim: "The retained fact survives review.",
              evidence: "SDK sequences 1 and 999 claim it.",
            },
          ],
        },
        identity,
        evidenceCatalog,
      ),
    ).toMatchObject({ tag: "invalid", reason: "evidenceMismatch" });
    expect(
      validateReviewOutput(
        {
          ...review,
          verdicts: [
            {
              class: "pass",
              claim: "The retained fact survives review.",
              evidence: "setup.ts:1-999 claims it.",
            },
          ],
        },
        identity,
        evidenceCatalog,
      ),
    ).toMatchObject({ tag: "invalid", reason: "evidenceMismatch" });
  });

  test("bounds setup and character citations to packet sources", () => {
    const packet = {
      audit: {
        header: {
          transcriptPath:
            "scripts/raw-swarm/out/review-example/evidence/sdk-calls.jsonl",
        },
        calls: [{ seq: 1 }],
      },
      retainedHeaderEvidence: {},
      runArtifacts: [],
    };
    const emptyPacketCatalog = reviewEvidenceCatalogForPacket(packet);
    expect(emptyPacketCatalog).toMatchObject({
      tag: "valid",
      catalog: {
        sequences: new Set([1]),
        setupLineCount: 0,
        charactersLineCount: 0,
        hasTranscriptHeader: true,
      },
    });
    if (emptyPacketCatalog.tag === "invalid") return;
    expect(
      validateReviewOutput(
        {
          ...review,
          verdicts: [
            {
              ...review.verdicts[0],
              evidence: "setup.ts:1 claims it.",
            },
          ],
        },
        identity,
        emptyPacketCatalog.catalog,
      ),
    ).toMatchObject({ tag: "invalid", reason: "evidenceMismatch" });

    const packetWithSources = {
      ...packet,
      runArtifacts: [
        {
          path: "scripts/raw-swarm/out/review-example/evidence/setup.ts",
          byteLength: 7,
          sha256: "0".repeat(64),
          firstLine: 1,
          numberedContent: "1|setup\n2|",
        },
        {
          path: "scripts/raw-swarm/out/review-example/evidence/characters.ts",
          byteLength: 5,
          sha256: "1".repeat(64),
          firstLine: 1,
          numberedContent: "1|chars",
        },
      ],
    };
    const packetCatalog = reviewEvidenceCatalogForPacket(packetWithSources);
    expect(packetCatalog).toMatchObject({
      tag: "valid",
      catalog: { setupLineCount: 2, charactersLineCount: 1 },
    });
  });

  test("binds packet source roles to the audited run and authority roots", () => {
    const packet = {
      audit: {
        header: {
          transcriptPath:
            "scripts/raw-swarm/out/review-example/evidence/sdk-calls.jsonl",
          scenarioSha256: "a".repeat(64),
          scenarioReviewSha256: "b".repeat(64),
          charactersSha256: "c".repeat(64),
          setupSha256: "d".repeat(64),
          characterOutcome: "ready" as const,
          setupOutcome: "ready" as const,
        },
        calls: [{ seq: 1 }],
      },
      retainedHeaderEvidence: {},
      runArtifacts: [
        {
          path: "scripts/raw-swarm/out/review-example/SCENARIO.md",
          sha256: "f".repeat(64),
          numberedContent: "1|scenario",
        },
      ],
      domainAuthorities: [],
      rawAuthorities: [],
    };
    expect(reviewEvidenceCatalogForPacket(packet)).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("does not match the audit header hash"),
    });
    expect(
      reviewEvidenceCatalogForPacket({
        ...packet,
        runArtifacts: [],
        rawAuthorities: [{ path: "docs/not-raw.md" }],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("outside the SRD root"),
    });
  });
});
