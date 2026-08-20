import { Either, Match, Schema } from "effect";

import { ScenarioIdSchema } from "./transcript.ts";
import {
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
} from "./raw-swarm-identities.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

const ScenarioCharacterRequirementSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("statBlocksOnly"),
    evidence: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterSheetsRequired"),
    evidence: Schema.NonEmptyTrimmedString,
  }),
);

const ScenarioSpatialRequirementSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("notRequired"),
    evidence: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("geometryAssisted"),
    evidence: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("outsideExperimentEnvelope"),
    resolution: Schema.Literal("tableAuthored", "incoherent"),
    evidence: Schema.NonEmptyTrimmedString,
  }),
);

/**
 * Typed facts retained by the generation/controller boundary for the harness
 * pipeline.
 *
 * These are not a scenario DSL and are deliberately not inferred from prose.
 * A typed candidate producer supplies the facts; the planner only chooses
 * harness stages from this closed vocabulary.
 */
export const ScenarioStageFactsSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  characterRequirement: ScenarioCharacterRequirementSchema,
  spatialRequirement: ScenarioSpatialRequirementSchema,
});
export type ScenarioStageFacts = Schema.Schema.Type<
  typeof ScenarioStageFactsSchema
>;

const CandidateIdentitySchema = Schema.Struct({
  tag: Schema.Literal("candidate"),
  campaignId: ScenarioCampaignIdSchema,
  candidateId: ScenarioCandidateIdSchema,
  candidateScenarioSha256: HashSchema,
});
const AdmittedIdentitySchema = Schema.Struct({
  tag: Schema.Literal("admitted"),
  scenarioId: ScenarioIdSchema,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
});
const StagePlanIdentitySchema = Schema.Union(
  CandidateIdentitySchema,
  AdmittedIdentitySchema,
);
export type StagePlanIdentity = Schema.Schema.Type<
  typeof StagePlanIdentitySchema
>;

export const RAW_SWARM_STAGE_NAMES = [
  "scenarioGeneration",
  "scenarioCompositeReview",
  "scenarioCharacterAuthoring",
  "scenarioSetupAuthoring",
  "player",
  "postPlayReview",
] as const;
export type RawSwarmStageName = (typeof RAW_SWARM_STAGE_NAMES)[number];

/** Canonical reasons carried by every current model invocation ledger entry. */
export const RAW_SWARM_STAGE_PLAN_REASONS = {
  scenarioGeneration:
    "Scenario generation is required to produce complete candidate prose and typed stage facts.",
  scenarioCompositeReview:
    "The admitted campaign requires one composite review with independent responsibility fields.",
  scenarioCharacterAuthoring:
    "The admitted scenario stage plan requires Character Sheet authoring.",
  scenarioSetupAuthoring:
    "The admitted scenario setup stage plan requires owner-separated neutral and controller authoring.",
  player:
    "The admitted scenario stage plan requires ordinary public-SDK player execution.",
  postPlayReview:
    "The admitted Execution reached its independent post-play review stage.",
} as const satisfies Record<RawSwarmStageName, string>;

const StagePlanEntryFields = {
  stage: Schema.Literal(...RAW_SWARM_STAGE_NAMES),
  determinedBy: Schema.Literal(
    "admission",
    "characterRequirement",
    "spatialRequirement",
    "pipelineOrder",
  ),
  reason: Schema.NonEmptyTrimmedString,
} as const;

/**
 * A stage decision carries its only valid invocation state.  Keeping these as
 * one discriminated union prevents a decoded plan from claiming that a
 * skipped/rejected stage was recorded, or that a required stage has no
 * invocation obligation.
 */
const StagePlanEntrySchema = Schema.Union(
  Schema.Struct({
    ...StagePlanEntryFields,
    decision: Schema.Literal("completed"),
    modelInvocation: Schema.Literal("recorded"),
  }),
  Schema.Struct({
    ...StagePlanEntryFields,
    decision: Schema.Literal("required"),
    modelInvocation: Schema.Literal("planned"),
  }),
  Schema.Struct({
    ...StagePlanEntryFields,
    decision: Schema.Literal("skipped"),
    modelInvocation: Schema.Literal("none"),
  }),
  Schema.Struct({
    ...StagePlanEntryFields,
    decision: Schema.Literal("rejected"),
    modelInvocation: Schema.Literal("none"),
  }),
);
export type ScenarioStagePlanEntry = Schema.Schema.Type<
  typeof StagePlanEntrySchema
>;

const StagePlanEntriesSchema = Schema.Array(StagePlanEntrySchema).pipe(
  Schema.filter(
    (stages) =>
      stages.length === RAW_SWARM_STAGE_NAMES.length &&
      stages.every(
        ({ stage }, index) => stage === RAW_SWARM_STAGE_NAMES[index],
      ),
    {
      message: () =>
        "A scenario stage plan must identify each Raw Swarm stage once in canonical order.",
    },
  ),
);

const StagePlanOutcomeSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("admitted") }),
  Schema.Struct({ tag: Schema.Literal("reviewRequired") }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    reason: Schema.NonEmptyTrimmedString,
    determinedBy: Schema.Literal("spatialRequirement", "admission"),
  }),
);

type ScenarioStagePlanOutcome = Schema.Schema.Type<
  typeof StagePlanOutcomeSchema
>;

type ScenarioStagePlanShape = {
  readonly schemaVersion: 1;
  readonly identity: StagePlanIdentity;
  readonly facts: ScenarioStageFacts;
  readonly outcome: ScenarioStagePlanOutcome;
  readonly stages: readonly ScenarioStagePlanEntry[];
};

function stagePlanEntryFor(
  plan: ScenarioStagePlanShape,
  stage: RawSwarmStageName,
): ScenarioStagePlanEntry | undefined {
  return plan.stages.find((candidate) => candidate.stage === stage);
}

function stagePlanIsSemanticallyConsistent(
  plan: ScenarioStagePlanShape,
): boolean {
  const generation = stagePlanEntryFor(plan, "scenarioGeneration");
  const composite = stagePlanEntryFor(plan, "scenarioCompositeReview");
  const characters = stagePlanEntryFor(plan, "scenarioCharacterAuthoring");
  const setup = stagePlanEntryFor(plan, "scenarioSetupAuthoring");
  const player = stagePlanEntryFor(plan, "player");
  const postPlayReview = stagePlanEntryFor(plan, "postPlayReview");
  if (
    generation === undefined ||
    composite === undefined ||
    characters === undefined ||
    setup === undefined ||
    player === undefined ||
    postPlayReview === undefined
  ) {
    return false;
  }
  if (
    generation.decision !== "completed" ||
    generation.determinedBy !== "pipelineOrder"
  ) {
    return false;
  }
  const rejection = spatialRejection(plan.facts);
  const downstream = [characters, setup, player, postPlayReview];
  if (plan.identity.tag === "candidate") {
    if (rejection === undefined) {
      return (
        plan.outcome.tag === "reviewRequired" &&
        composite.decision === "required" &&
        composite.determinedBy === "pipelineOrder" &&
        downstream.every(
          (stage) =>
            stage.decision === "skipped" && stage.determinedBy === "admission",
        )
      );
    }
    return (
      plan.outcome.tag === "rejected" &&
      plan.outcome.determinedBy === "spatialRequirement" &&
      plan.outcome.reason === rejection &&
      composite.decision === "rejected" &&
      composite.determinedBy === "spatialRequirement" &&
      composite.reason === rejection &&
      downstream.every(
        (stage) =>
          stage.decision === "skipped" &&
          stage.determinedBy === "spatialRequirement",
      )
    );
  }
  if (rejection !== undefined) {
    return (
      plan.outcome.tag === "rejected" &&
      plan.outcome.determinedBy === "spatialRequirement" &&
      plan.outcome.reason === rejection &&
      composite.decision === "rejected" &&
      composite.determinedBy === "spatialRequirement" &&
      composite.reason === rejection &&
      downstream.every(
        (stage) =>
          stage.decision === "skipped" &&
          stage.determinedBy === "spatialRequirement",
      )
    );
  }
  const expectedCharacterDecision =
    plan.facts.characterRequirement.tag === "statBlocksOnly"
      ? "skipped"
      : "required";
  return (
    plan.outcome.tag === "admitted" &&
    composite.decision === "completed" &&
    composite.determinedBy === "admission" &&
    characters.decision === expectedCharacterDecision &&
    characters.determinedBy === "characterRequirement" &&
    setup.decision === "required" &&
    setup.determinedBy === "pipelineOrder" &&
    player.decision === "required" &&
    player.determinedBy === "pipelineOrder" &&
    postPlayReview.decision === "required" &&
    postPlayReview.determinedBy === "pipelineOrder"
  );
}

export const ScenarioStagePlanSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  identity: StagePlanIdentitySchema,
  facts: ScenarioStageFactsSchema,
  outcome: StagePlanOutcomeSchema,
  stages: StagePlanEntriesSchema,
}).pipe(
  Schema.filter(stagePlanIsSemanticallyConsistent, {
    message: () =>
      "Scenario stage plan facts, outcome, and stage decisions are inconsistent.",
  }),
  Schema.brand("ScenarioStagePlan"),
);
export type ScenarioStagePlan = Schema.Schema.Type<
  typeof ScenarioStagePlanSchema
>;

export type ScenarioStagePlanInput = {
  readonly identity: StagePlanIdentity;
  readonly facts: ScenarioStageFacts;
};

export type ScenarioStagePlanFinding = {
  readonly schemaVersion: 1;
  readonly identity: StagePlanIdentity;
  readonly stage: RawSwarmStageName;
  readonly disposition: "skipped" | "rejected";
  readonly determinedBy: ScenarioStagePlanEntry["determinedBy"];
  readonly reason: string;
};

export const ScenarioStagePlanFindingSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  identity: StagePlanIdentitySchema,
  stage: Schema.Literal(...RAW_SWARM_STAGE_NAMES),
  disposition: Schema.Literal("skipped", "rejected"),
  determinedBy: Schema.Literal(
    "admission",
    "characterRequirement",
    "spatialRequirement",
    "pipelineOrder",
  ),
  reason: Schema.NonEmptyTrimmedString,
});
export const ScenarioStagePlanFindingsSchema = Schema.Array(
  ScenarioStagePlanFindingSchema,
);

export type ScenarioStagePlanFindingSink = (
  finding: ScenarioStagePlanFinding,
) => void;

function completedEntry(input: {
  readonly stage: RawSwarmStageName;
  readonly determinedBy: ScenarioStagePlanEntry["determinedBy"];
  readonly reason: string;
}): ScenarioStagePlanEntry {
  return {
    ...input,
    decision: "completed",
    modelInvocation: "recorded",
  };
}

function requiredEntry(input: {
  readonly stage: RawSwarmStageName;
  readonly determinedBy: ScenarioStagePlanEntry["determinedBy"];
  readonly reason: string;
}): ScenarioStagePlanEntry {
  return {
    ...input,
    decision: "required",
    modelInvocation: "planned",
  };
}

function skippedOrRejectedEntry(input: {
  readonly stage: RawSwarmStageName;
  readonly determinedBy: ScenarioStagePlanEntry["determinedBy"];
  readonly reason: string;
  readonly decision: "skipped" | "rejected";
}): ScenarioStagePlanEntry {
  return { ...input, modelInvocation: "none" };
}

function spatialRejection(facts: ScenarioStageFacts): string | undefined {
  return Match.value(facts.spatialRequirement).pipe(
    Match.when(
      { tag: "outsideExperimentEnvelope", resolution: "incoherent" },
      ({ evidence }) =>
        `Rejected before whole-scenario review: the candidate is outside the geometry experiment envelope and is internally incoherent (${evidence}).`,
    ),
    Match.when({ tag: "notRequired" }, () => undefined),
    Match.when({ tag: "geometryAssisted" }, () => undefined),
    Match.when(
      { tag: "outsideExperimentEnvelope", resolution: "tableAuthored" },
      () => undefined,
    ),
    Match.exhaustive,
  );
}

function skippedEntry(
  stage: RawSwarmStageName,
  determinedBy: ScenarioStagePlanEntry["determinedBy"],
  reason: string,
): ScenarioStagePlanEntry {
  return skippedOrRejectedEntry({
    stage,
    determinedBy,
    reason,
    decision: "skipped",
  });
}

function candidatePlan(input: ScenarioStagePlanInput): ScenarioStagePlanShape {
  const rejection = spatialRejection(input.facts);
  const downstreamReason =
    rejection ??
    "Candidate has not completed admission; downstream stages wait for the retained review.";
  return {
    schemaVersion: 1,
    identity: input.identity,
    facts: input.facts,
    outcome:
      rejection === undefined
        ? { tag: "reviewRequired" }
        : {
            tag: "rejected",
            reason: rejection,
            determinedBy: "spatialRequirement",
          },
    stages: [
      completedEntry({
        stage: "scenarioGeneration",
        determinedBy: "pipelineOrder",
        reason: "The candidate was produced by the generation stage.",
      }),
      ...(rejection === undefined
        ? [
            requiredEntry({
              stage: "scenarioCompositeReview",
              determinedBy: "pipelineOrder",
              reason:
                "The candidate remains coherent enough for the independent composite review.",
            }),
          ]
        : [
            skippedOrRejectedEntry({
              stage: "scenarioCompositeReview",
              decision: "rejected",
              determinedBy: "spatialRequirement",
              reason: rejection,
            }),
          ]),
      skippedEntry(
        "scenarioCharacterAuthoring",
        rejection === undefined ? "admission" : "spatialRequirement",
        downstreamReason,
      ),
      skippedEntry(
        "scenarioSetupAuthoring",
        rejection === undefined ? "admission" : "spatialRequirement",
        downstreamReason,
      ),
      skippedEntry(
        "player",
        rejection === undefined ? "admission" : "spatialRequirement",
        downstreamReason,
      ),
      skippedEntry(
        "postPlayReview",
        rejection === undefined ? "admission" : "spatialRequirement",
        downstreamReason,
      ),
    ],
  };
}

function admittedPlan(input: ScenarioStagePlanInput): ScenarioStagePlanShape {
  const rejection = spatialRejection(input.facts);
  if (rejection !== undefined) {
    return {
      schemaVersion: 1,
      identity: input.identity,
      facts: input.facts,
      outcome: {
        tag: "rejected",
        reason: rejection,
        determinedBy: "spatialRequirement",
      },
      stages: [
        completedEntry({
          stage: "scenarioGeneration",
          determinedBy: "pipelineOrder",
          reason: "The retained artifact records the generation stage.",
        }),
        skippedOrRejectedEntry({
          stage: "scenarioCompositeReview",
          decision: "rejected",
          determinedBy: "spatialRequirement",
          reason: rejection,
        }),
        skippedEntry(
          "scenarioCharacterAuthoring",
          "spatialRequirement",
          rejection,
        ),
        skippedEntry("scenarioSetupAuthoring", "spatialRequirement", rejection),
        skippedEntry("player", "spatialRequirement", rejection),
        skippedEntry("postPlayReview", "spatialRequirement", rejection),
      ],
    };
  }

  const characterEntry = Match.value(input.facts.characterRequirement).pipe(
    Match.when({ tag: "statBlocksOnly" }, ({ evidence }) =>
      skippedEntry(
        "scenarioCharacterAuthoring",
        "characterRequirement",
        `Character Sheet authoring is skipped: the admitted scenario contains only stat-block creatures (${evidence}).`,
      ),
    ),
    Match.when({ tag: "characterSheetsRequired" }, ({ evidence }) =>
      requiredEntry({
        stage: "scenarioCharacterAuthoring",
        determinedBy: "characterRequirement",
        reason: `Character Sheet authoring is required by the admitted scenario (${evidence}).`,
      }),
    ),
    Match.exhaustive,
  );
  return {
    schemaVersion: 1,
    identity: input.identity,
    facts: input.facts,
    outcome: { tag: "admitted" },
    stages: [
      completedEntry({
        stage: "scenarioGeneration",
        determinedBy: "pipelineOrder",
        reason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioGeneration,
      }),
      completedEntry({
        stage: "scenarioCompositeReview",
        determinedBy: "admission",
        reason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCompositeReview,
      }),
      characterEntry,
      requiredEntry({
        stage: "scenarioSetupAuthoring",
        determinedBy: "pipelineOrder",
        reason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioSetupAuthoring,
      }),
      requiredEntry({
        stage: "player",
        determinedBy: "pipelineOrder",
        reason: RAW_SWARM_STAGE_PLAN_REASONS.player,
      }),
      requiredEntry({
        stage: "postPlayReview",
        determinedBy: "pipelineOrder",
        reason: RAW_SWARM_STAGE_PLAN_REASONS.postPlayReview,
      }),
    ],
  };
}

/** Plan the harness pipeline without reading or interpreting scenario prose. */
export function planScenarioStages(
  input: ScenarioStagePlanInput,
): Either.Either<ScenarioStagePlan, string> {
  const decoded = Schema.decodeUnknownEither(ScenarioStageFactsSchema, {
    onExcessProperty: "error",
  })(input.facts);
  if (Either.isLeft(decoded)) {
    return Either.left(`Invalid scenario stage facts: ${decoded.left.message}`);
  }
  const plan =
    input.identity.tag === "candidate"
      ? candidatePlan({ ...input, facts: decoded.right })
      : admittedPlan({ ...input, facts: decoded.right });
  return validateScenarioStagePlan(plan);
}

/**
 * Decode and validate a retained plan at every authority boundary.  The
 * cross-stage checks below complement the entry union: the union protects
 * each entry, while this function protects the deterministic pipeline shape.
 */
export function validateScenarioStagePlan(
  value: unknown,
): Either.Either<ScenarioStagePlan, string> {
  const decoded = Schema.decodeUnknownEither(ScenarioStagePlanSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isLeft(decoded)) {
    return Either.left(`Invalid scenario stage plan: ${decoded.left.message}`);
  }
  return Either.right(decoded.right);
}

export function planAdmittedScenarioStages(input: {
  readonly scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
  readonly facts: ScenarioStageFacts;
}): Either.Either<ScenarioStagePlan, string> {
  return planScenarioStages({
    identity: {
      tag: "admitted",
      scenarioId: input.scenarioId,
      scenarioSha256: input.scenarioSha256,
      scenarioReviewSha256: input.scenarioReviewSha256,
    },
    facts: input.facts,
  });
}

export function stagePlanEntry(
  plan: ScenarioStagePlan,
  stage: RawSwarmStageName,
): ScenarioStagePlanEntry | undefined {
  return plan.stages.find((candidate) => candidate.stage === stage);
}

export function stageRequiresModelInvocation(
  plan: ScenarioStagePlan,
  stage: RawSwarmStageName,
): boolean {
  return stagePlanEntry(plan, stage)?.decision === "required";
}

export function emitScenarioStagePlanFindings(
  plan: ScenarioStagePlan,
  sink: ScenarioStagePlanFindingSink,
): void {
  for (const stage of plan.stages) {
    if (stage.decision !== "skipped" && stage.decision !== "rejected") {
      continue;
    }
    sink({
      schemaVersion: 1,
      identity: plan.identity,
      stage: stage.stage,
      disposition: stage.decision,
      determinedBy: stage.determinedBy,
      reason: stage.reason,
    });
  }
}

export function scenarioStagePlanFindings(
  plan: ScenarioStagePlan,
): readonly ScenarioStagePlanFinding[] {
  const findings: ScenarioStagePlanFinding[] = [];
  emitScenarioStagePlanFindings(plan, (finding) => findings.push(finding));
  return findings;
}
