import { describe, expect, test } from "vitest";

import { validateReviewOutput } from "./review-output-validation.ts";

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
});
