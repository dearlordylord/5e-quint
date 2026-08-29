import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  emitScenarioStagePlanFindings,
  planAdmittedScenarioStages,
  planScenarioStages,
  ScenarioStageFactsSchema,
  ScenarioStagePlanFindingsSchema,
  ScenarioStagePlanSchema,
  scenarioStagePlanFindings,
  stagePlanEntry,
  stageRequiresModelInvocation,
  validateScenarioStagePlan,
  type ScenarioStageFacts,
} from "./scenario-stage-plan.ts";
import { ScenarioIdSchema } from "./transcript.ts";

const scenarioId =
  Schema.decodeUnknownSync(ScenarioIdSchema)("stage-plan-fixture");
const identity = {
  tag: "admitted" as const,
  scenarioId,
  scenarioSha256: "a".repeat(64),
  scenarioReviewSha256: "b".repeat(64),
};

function facts(
  characterRequirement: ScenarioStageFacts["characterRequirement"],
  spatialRequirement: ScenarioStageFacts["spatialRequirement"],
): ScenarioStageFacts {
  const decoded = Schema.decodeUnknownSync(ScenarioStageFactsSchema)({
    schemaVersion: 1,
    characterRequirement,
    spatialRequirement,
  });
  return decoded;
}

describe("Raw Swarm deterministic stage planning", () => {
  test("skips Character Sheet authoring for stat-block-only admitted scenarios", () => {
    const planned = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        {
          tag: "statBlocksOnly",
          evidence: "The admitted setup names only canonical stat blocks.",
        },
        {
          tag: "notRequired",
          evidence: "The scenario does not require a spatial witness.",
        },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    const characterStage = stagePlanEntry(
      planned.success,
      "scenarioCharacterAuthoring",
    );
    expect(characterStage).toMatchObject({
      decision: "skipped",
      determinedBy: "characterRequirement",
      modelInvocation: "none",
    });
    expect(
      stageRequiresModelInvocation(
        planned.success,
        "scenarioCharacterAuthoring",
      ),
    ).toBe(false);
    expect(
      stageRequiresModelInvocation(planned.success, "scenarioSetupAuthoring"),
    ).toBe(true);
  });

  test("requires Character Sheet authoring when the admitted scenario bears characters", () => {
    const planned = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        {
          tag: "characterSheetsRequired",
          evidence: "The scenario delegates two character builds.",
        },
        {
          tag: "geometryAssisted",
          evidence: "The simple grid helper answers the spatial questions.",
        },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    expect(
      stagePlanEntry(planned.success, "scenarioCharacterAuthoring"),
    ).toMatchObject({
      decision: "required",
      modelInvocation: "planned",
    });
    expect(planned.success.outcome).toEqual({ tag: "admitted" });
  });

  test("keeps geometry-assisted and coherent Table-authored decisions executable", () => {
    const geometry = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        { tag: "statBlocksOnly", evidence: "No sheets." },
        { tag: "geometryAssisted", evidence: "Simple supported grid." },
      ),
    });
    const table = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        { tag: "statBlocksOnly", evidence: "No sheets." },
        {
          tag: "outsideExperimentEnvelope",
          resolution: "tableAuthored",
          evidence: "The Table supplies one coherent distance witness.",
        },
      ),
    });
    expect(Result.isSuccess(geometry)).toBe(true);
    expect(Result.isSuccess(table)).toBe(true);
    if (Result.isFailure(geometry) || Result.isFailure(table)) return;
    expect(geometry.success.outcome).toEqual({ tag: "admitted" });
    expect(table.success.outcome).toEqual({ tag: "admitted" });
    expect(
      stagePlanEntry(table.success, "scenarioSetupAuthoring"),
    ).toMatchObject({
      decision: "required",
      determinedBy: "pipelineOrder",
    });
  });

  test("rejects an incoherent outside-envelope candidate before whole-scenario review", () => {
    const planned = planScenarioStages({
      identity: {
        tag: "candidate",
        campaignId: "stage-plan-campaign",
        candidateId: "stage-plan-candidate",
        candidateScenarioSha256: "c".repeat(64),
      },
      facts: facts(
        { tag: "statBlocksOnly", evidence: "The candidate uses stat blocks." },
        {
          tag: "outsideExperimentEnvelope",
          resolution: "incoherent",
          evidence: "The candidate contradicts its own spatial objective.",
        },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    expect(planned.success.outcome.tag).toBe("rejected");
    expect(planned.success.identity).toEqual({
      tag: "candidate",
      campaignId: "stage-plan-campaign",
      candidateId: "stage-plan-candidate",
      candidateScenarioSha256: "c".repeat(64),
    });
    const invalidCandidateIdentity = Schema.decodeUnknownResult(
      ScenarioStagePlanSchema,
    )({
      ...planned.success,
      identity: { tag: "candidate", candidateId: "stage-plan-candidate" },
    });
    expect(Result.isFailure(invalidCandidateIdentity)).toBe(true);
    expect(
      stagePlanEntry(planned.success, "scenarioCompositeReview"),
    ).toMatchObject({
      decision: "rejected",
      modelInvocation: "none",
    });
    expect(
      stageRequiresModelInvocation(planned.success, "scenarioCompositeReview"),
    ).toBe(false);
    const findings: unknown[] = [];
    emitScenarioStagePlanFindings(planned.success, (finding) =>
      findings.push(finding),
    );
    expect(findings).toHaveLength(5);
    expect(findings).toContainEqual(
      expect.objectContaining({
        stage: "scenarioCompositeReview",
        disposition: "rejected",
      }),
    );
    const retained = scenarioStagePlanFindings(planned.success);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ScenarioStagePlanFindingsSchema)(retained),
      ),
    ).toBe(true);
  });

  test("does not create a model/token ledger obligation for a skipped stage", () => {
    const planned = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        { tag: "statBlocksOnly", evidence: "Only stat blocks are admitted." },
        { tag: "notRequired", evidence: "No spatial witness is needed." },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    const ledgerEntries: string[] = [];
    if (
      stageRequiresModelInvocation(
        planned.success,
        "scenarioCharacterAuthoring",
      )
    ) {
      ledgerEntries.push("scenarioCharacterAuthoring");
    }
    expect(ledgerEntries).toEqual([]);
    expect(
      stagePlanEntry(planned.success, "scenarioCharacterAuthoring"),
    ).toMatchObject({ modelInvocation: "none", decision: "skipped" });
  });

  test("rejects a contradictory decision and invocation state at the schema boundary", () => {
    const planned = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        { tag: "statBlocksOnly", evidence: "Only stat blocks are admitted." },
        { tag: "notRequired", evidence: "No spatial witness is needed." },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    const character = stagePlanEntry(
      planned.success,
      "scenarioCharacterAuthoring",
    );
    expect(character).toBeDefined();
    if (character === undefined) return;
    const invalid = {
      ...planned.success,
      stages: planned.success.stages.map((stage) =>
        stage.stage === "scenarioCharacterAuthoring"
          ? { ...stage, modelInvocation: "recorded" }
          : stage,
      ),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(ScenarioStagePlanSchema)(invalid),
      ),
    ).toBe(true);
    expect(Result.isFailure(validateScenarioStagePlan(invalid))).toBe(true);
  });

  test("parses empty invocation evidence as an explicit zero-invocation stream", async () => {
    const { modelInvocationEvidenceFromEvents } =
      await import("./model-telemetry.ts");
    const evidence = modelInvocationEvidenceFromEvents([]);
    expect(evidence).toMatchObject({ tag: "invalid" });
    const planned = planAdmittedScenarioStages({
      ...identity,
      facts: facts(
        { tag: "statBlocksOnly", evidence: "Only stat blocks are admitted." },
        { tag: "notRequired", evidence: "No spatial witness is needed." },
      ),
    });
    expect(Result.isSuccess(planned)).toBe(true);
    if (Result.isFailure(planned)) return;
    expect(
      stagePlanEntry(planned.success, "scenarioCharacterAuthoring"),
    ).toMatchObject({ decision: "skipped", modelInvocation: "none" });
  });
});
