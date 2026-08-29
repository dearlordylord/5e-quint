import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  planAdmittedScenarioStages,
  scenarioStagePlanFindings,
} from "./scenario-stage-plan.ts";
import { validateAdmittedScenarioStagePlanEvidence } from "./stage-plan-authority.ts";

const identity = {
  tag: "admitted" as const,
  scenarioId: "stage-authority-test",
  scenarioSha256: "a".repeat(64),
  scenarioReviewSha256: "b".repeat(64),
};

describe("retained stage-plan authorities", () => {
  test("validates the admitted plan and its exact findings projection", () => {
    const plan = planAdmittedScenarioStages({
      ...identity,
      facts: {
        schemaVersion: 1,
        characterRequirement: {
          tag: "statBlocksOnly",
          evidence: "The authority test has no authored sheets.",
        },
        spatialRequirement: {
          tag: "notRequired",
          evidence: "No geometry witness is required.",
        },
      },
    });
    expect(Result.isSuccess(plan)).toBe(true);
    if (Result.isFailure(plan)) return;
    const findings = scenarioStagePlanFindings(plan.success);
    expect(
      validateAdmittedScenarioStagePlanEvidence({
        plan: plan.success,
        findings,
        scenarioId: identity.scenarioId,
        scenarioSha256: identity.scenarioSha256,
        scenarioReviewSha256: identity.scenarioReviewSha256,
      }),
    ).toEqual(Result.succeed(undefined));
    expect(
      validateAdmittedScenarioStagePlanEvidence({
        plan: plan.success,
        findings: findings.slice(1),
        scenarioId: identity.scenarioId,
        scenarioSha256: identity.scenarioSha256,
        scenarioReviewSha256: identity.scenarioReviewSha256,
      }),
    ).toMatchObject({ _tag: "Failure" });
  });
});
