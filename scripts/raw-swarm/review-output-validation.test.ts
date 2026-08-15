import { describe, expect, test } from "vitest";

import { validateReviewOutput } from "./review-output-validation.ts";

const identity = {
  scenarioId: "review-example",
  gitSha: "a".repeat(40),
  transcriptSha256: "b".repeat(64),
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
    expect(validateReviewOutput(review, identity)).toEqual({
      tag: "valid",
      verdictCount: 1,
    });
    expect(
      validateReviewOutput(
        { ...review, transcriptSha256: "c".repeat(64) },
        identity,
      ),
    ).toEqual({
      tag: "invalid",
      reason: "identityMismatch",
      message:
        "Reviewer output scenario, Git revision, or transcript hash does not match the verified audit.",
    });
    expect(
      validateReviewOutput({ ...review, verdicts: [] }, identity),
    ).toMatchObject({ tag: "invalid", reason: "invalidOutput" });
  });
});
