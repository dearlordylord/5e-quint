import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import evaluationInventoryJson from "../../../plugins/dnd-srd-oracle/evals/evaluation-inventory.json" with { type: "json" };
import forwardTestResultsJson from "../../../plugins/dnd-srd-oracle/evals/forward-test-results.json" with { type: "json" };
import submissionSourceJson from "../../../plugins/dnd-srd-oracle/publication/submission-source.json" with { type: "json" };
import {
  buildSubmissionCandidateEvidence,
  validateLocalSkillEvaluationBinding,
  validateSubmissionReviewCaseSelection,
} from "./submission-candidate-evidence.ts";

const skillSource = {
  files: [
    "skills/dnd-srd-oracle/SKILL.md",
    "skills/dnd-srd-oracle/agents/openai.yaml",
  ].map((path) => ({
    path,
    content: readFileSync(
      new URL(`../../../plugins/dnd-srd-oracle/${path}`, import.meta.url),
      "utf8",
    ),
  })),
};

describe("submission candidate evidence", () => {
  test("binds local candidate facts without promoting historical installed evidence", async () => {
    const first = await buildSubmissionCandidateEvidence({
      release: "a".repeat(40),
      publisherName: "Verified Publisher",
      generatedAt: "2026-09-19T20:00:00.000Z",
    });
    const second = await buildSubmissionCandidateEvidence({
      release: "a".repeat(40),
      publisherName: "Verified Publisher",
      generatedAt: "2026-09-19T21:00:00.000Z",
    });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.components).toEqual(second.components);
    expect(first.generatedAt).not.toBe(second.generatedAt);
    expect(first.localSkillEvaluationStatus).toBe("passed");
    expect(first.components).toHaveProperty("skillSource");
    expect(first.components).toHaveProperty("submissionCaseInventory");
    expect(first.components).not.toHaveProperty("installedEvaluation");
  });

  test("rejects local Skill results for changed source, prompts, or failed outcomes", () => {
    const current = {
      evidence: forwardTestResultsJson,
      skillActivationInventory: evaluationInventoryJson.skillActivation,
      skillSource,
    };
    expect(() => validateLocalSkillEvaluationBinding(current)).not.toThrow();
    expect(() =>
      validateLocalSkillEvaluationBinding({
        ...current,
        skillSource: {
          files: [
            ...skillSource.files,
            { path: "changed", content: "changed" },
          ],
        },
      }),
    ).toThrow("does not bind");

    const changedInventory = structuredClone(
      evaluationInventoryJson.skillActivation,
    );
    const firstInventoryCase = changedInventory[0];
    if (firstInventoryCase === undefined) throw new Error("Missing test case.");
    firstInventoryCase.prompt = `${firstInventoryCase.prompt} changed`;
    expect(() =>
      validateLocalSkillEvaluationBinding({
        ...current,
        skillActivationInventory: changedInventory,
      }),
    ).toThrow("does not bind");

    const failedEvidence = structuredClone(forwardTestResultsJson);
    const firstEvidenceCase = failedEvidence.cases[0];
    if (firstEvidenceCase === undefined) throw new Error("Missing test case.");
    firstEvidenceCase.outcome = "missedExpectation";
    expect(() =>
      validateLocalSkillEvaluationBinding({
        ...current,
        evidence: failedEvidence,
      }),
    ).toThrow("Invalid local Skill evaluation");
  });

  test("requires exactly five positive and three negative unique submission cases", () => {
    expect(() =>
      validateSubmissionReviewCaseSelection({
        inventory: evaluationInventoryJson,
        source: submissionSourceJson,
      }),
    ).not.toThrow();

    for (const submissionReviewCaseIds of [
      [],
      submissionSourceJson.submissionReviewCaseIds.slice(1),
    ]) {
      expect(() =>
        validateSubmissionReviewCaseSelection({
          inventory: evaluationInventoryJson,
          source: { ...submissionSourceJson, submissionReviewCaseIds },
        }),
      ).toThrow("five positive and three negative");
    }

    const wrongKinds = structuredClone(evaluationInventoryJson);
    const firstReviewCase = wrongKinds.submissionReview[0];
    if (firstReviewCase === undefined) throw new Error("Missing review case.");
    firstReviewCase.kind = "negative";
    expect(() =>
      validateSubmissionReviewCaseSelection({
        inventory: wrongKinds,
        source: submissionSourceJson,
      }),
    ).toThrow("five positive and three negative");

    const duplicateInventory = structuredClone(evaluationInventoryJson);
    const duplicateCase = duplicateInventory.submissionReview[0];
    if (duplicateCase === undefined) throw new Error("Missing review case.");
    duplicateInventory.submissionReview.push(duplicateCase);
    expect(() =>
      validateSubmissionReviewCaseSelection({
        inventory: duplicateInventory,
        source: submissionSourceJson,
      }),
    ).toThrow("duplicate ids");
  });
}, 90_000);
