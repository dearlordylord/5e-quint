import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result, Schema } from "effect";

import {
  planAdmittedScenarioStages,
  scenarioStagePlanFindings,
  ScenarioStageFactsSchema,
  ScenarioStagePlanFindingsSchema,
  validateScenarioStagePlan,
  type ScenarioStageFacts,
  type ScenarioStagePlanFinding,
  type ScenarioStagePlan,
} from "./scenario-stage-plan.ts";
import {
  canonicalJson,
  repoRoot,
  ScenarioIdSchema,
  type ScenarioId,
} from "./transcript.ts";
import type { ScenarioCandidateId } from "./raw-swarm-identities.ts";

const HashSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
);

/**
 * Controller-owned facts emitted with a newly generated candidate.
 *
 * This is deliberately adjacent to the scenario rather than embedded in the
 * review artifact: the reviewer did not author these facts, and older review
 * artifacts must remain byte-for-byte historical evidence.
 */
export const ScenarioStageFactsAuthoritySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  scenarioSha256: HashSchema,
  source: Schema.Literal("scenarioGenerationCandidate"),
  facts: ScenarioStageFactsSchema,
});
export type ScenarioStageFactsAuthority = Schema.Schema.Type<
  typeof ScenarioStageFactsAuthoritySchema
>;

export function retainedScenarioStageFactsPath(scenarioPath: string): string {
  return `${scenarioPath}.stage-facts.json`;
}

export function retainedScenarioStagePlanPath(scenarioId: ScenarioId): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/${scenarioId}-stage-plan.json`,
  );
}

export function retainedRejectedScenarioStagePlanPath(
  candidateId: ScenarioCandidateId,
): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/rejected-scenarios/${candidateId}.md.stage-plan.json`,
  );
}

export function retainedScenarioStagePlanFindingsPath(
  scenarioId: ScenarioId,
): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/${scenarioId}-stage-plan-findings.json`,
  );
}

export function retainedRejectedScenarioStagePlanFindingsPath(
  candidateId: ScenarioCandidateId,
): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/rejected-scenarios/${candidateId}.md.stage-plan-findings.json`,
  );
}

function writeCanonicalOnce<A>(input: {
  readonly path: string;
  readonly value: A;
  readonly decode: (value: unknown) => Result.Result<A, string>;
}): Result.Result<A, string> {
  try {
    mkdirSync(resolve(input.path, ".."), { recursive: true });
    if (existsSync(input.path)) {
      const existing = input.decode(
        JSON.parse(readFileSync(input.path, "utf8")),
      );
      if (Result.isFailure(existing)) {
        return Result.fail(
          `Retained authority is invalid: ${existing.failure}`,
        );
      }
      return canonicalJson(existing.success) === canonicalJson(input.value)
        ? Result.succeed(input.value)
        : Result.fail(`Retained authority diverges: ${input.path}`);
    }
    writeFileSync(input.path, `${JSON.stringify(input.value, null, 2)}\n`, {
      flag: "wx",
    });
    return Result.succeed(input.value);
  } catch (error) {
    return Result.fail(
      `Unable to retain authority: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/** Retain candidate facts after the scenario prose hash is known. */
export function retainScenarioStageFacts(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
  readonly facts: ScenarioStageFacts;
}): Result.Result<ScenarioStageFactsAuthority, string> {
  const authority: ScenarioStageFactsAuthority = {
    schemaVersion: 1,
    scenarioId: input.scenarioId,
    scenarioSha256: input.scenarioSha256,
    source: "scenarioGenerationCandidate",
    facts: input.facts,
  };
  return writeCanonicalOnce({
    path: retainedScenarioStageFactsPath(input.scenarioPath),
    value: authority,
    decode: (value) => {
      const decoded = Schema.decodeUnknownResult(
        ScenarioStageFactsAuthoritySchema,
        { onExcessProperty: "error" },
      )(value);
      return Result.isFailure(decoded)
        ? Result.fail(decoded.failure.message)
        : Result.succeed(decoded.success);
    },
  });
}

function readScenarioStageFacts(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
}): Result.Result<ScenarioStageFacts, string> {
  const path = retainedScenarioStageFactsPath(input.scenarioPath);
  if (!existsSync(path)) {
    return Result.fail(
      `Scenario stage facts are unavailable for this historical artifact: ${path}. Regenerate the scenario to create the controller-owned facts authority.`,
    );
  }
  try {
    const decoded = Schema.decodeUnknownResult(
      ScenarioStageFactsAuthoritySchema,
      { onExcessProperty: "error" },
    )(JSON.parse(readFileSync(path, "utf8")));
    if (Result.isFailure(decoded)) {
      return Result.fail(
        `Scenario stage facts authority is invalid: ${decoded.failure.message}`,
      );
    }
    if (
      decoded.success.scenarioId !== input.scenarioId ||
      decoded.success.scenarioSha256 !== input.scenarioSha256
    ) {
      return Result.fail(
        `Scenario stage facts authority does not match the admitted scenario: ${path}`,
      );
    }
    return Result.succeed(decoded.success.facts);
  } catch (error) {
    return Result.fail(
      `Unable to read scenario stage facts authority: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function retainPlanFindings(input: {
  readonly path: string;
  readonly plan: ScenarioStagePlan;
}): Result.Result<readonly ScenarioStagePlanFinding[], string> {
  const findings = scenarioStagePlanFindings(input.plan);
  return writeCanonicalOnce({
    path: input.path,
    value: findings,
    decode: (value) => {
      const decoded = Schema.decodeUnknownResult(
        ScenarioStagePlanFindingsSchema,
        { onExcessProperty: "error" },
      )(value);
      return Result.isFailure(decoded)
        ? Result.fail(decoded.failure.message)
        : Result.succeed(decoded.success);
    },
  });
}

/**
 * Retain the one deterministic plan for an admitted scenario.
 *
 * The plan consumes the controller-owned candidate facts and independently
 * checks the admitted review identity; it never infers facts from prose or
 * attributes them to a historical reviewer.
 */
export function retainAdmittedScenarioStagePlan(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
}): Result.Result<ScenarioStagePlan, string> {
  return retainAdmittedScenarioStagePlanAtPaths({
    ...input,
    stagePlanPath: retainedScenarioStagePlanPath(input.scenarioId),
    stagePlanFindingsPath: retainedScenarioStagePlanFindingsPath(
      input.scenarioId,
    ),
  });
}

export function retainAdmittedScenarioStagePlanAtPaths(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
  readonly stagePlanPath: string;
  readonly stagePlanFindingsPath: string;
}): Result.Result<ScenarioStagePlan, string> {
  const facts = readScenarioStageFacts({
    scenarioId: input.scenarioId,
    scenarioPath: input.scenarioPath,
    scenarioSha256: input.scenarioSha256,
  });
  if (Result.isFailure(facts)) return Result.fail(facts.failure);
  const planned = planAdmittedScenarioStages({
    scenarioId: input.scenarioId,
    scenarioSha256: input.scenarioSha256,
    scenarioReviewSha256: input.scenarioReviewSha256,
    facts: facts.success,
  });
  if (Result.isFailure(planned)) return Result.fail(planned.failure);
  const retained = writeCanonicalOnce({
    path: input.stagePlanPath,
    value: planned.success,
    decode: (value) => {
      return validateScenarioStagePlan(value);
    },
  });
  if (Result.isFailure(retained)) return retained;
  const findings = retainPlanFindings({
    path: input.stagePlanFindingsPath,
    plan: retained.success,
  });
  return Result.isFailure(findings) ? Result.fail(findings.failure) : retained;
}

export function retainCandidateScenarioStagePlan(input: {
  readonly candidateId: ScenarioCandidateId;
  readonly candidateScenarioSha256: string;
  readonly plan: ScenarioStagePlan;
}): Result.Result<ScenarioStagePlan, string> {
  return retainCandidateScenarioStagePlanAtPaths({
    ...input,
    stagePlanPath: retainedRejectedScenarioStagePlanPath(input.candidateId),
    stagePlanFindingsPath: retainedRejectedScenarioStagePlanFindingsPath(
      input.candidateId,
    ),
  });
}

/** Retain a candidate plan in a caller-owned staging directory. */
export function retainCandidateScenarioStagePlanAtPaths(input: {
  readonly candidateId: ScenarioCandidateId;
  readonly candidateScenarioSha256: string;
  readonly plan: ScenarioStagePlan;
  readonly stagePlanPath: string;
  readonly stagePlanFindingsPath: string;
}): Result.Result<ScenarioStagePlan, string> {
  const validated = validateScenarioStagePlan(input.plan);
  if (Result.isFailure(validated)) return Result.fail(validated.failure);
  const plan = validated.success;
  if (plan.identity.tag !== "candidate") {
    return Result.fail(
      "Candidate stage-plan retention requires candidate identity.",
    );
  }
  if (plan.identity.candidateId !== input.candidateId) {
    return Result.fail(
      "Candidate stage plan identity does not match the retained candidate.",
    );
  }
  if (plan.identity.candidateScenarioSha256 !== input.candidateScenarioSha256) {
    return Result.fail(
      "Candidate stage plan identity does not match scenario content.",
    );
  }
  const retained = writeCanonicalOnce({
    path: input.stagePlanPath,
    value: plan,
    decode: (value) => {
      return validateScenarioStagePlan(value);
    },
  });
  if (Result.isFailure(retained)) return retained;
  const findings = retainPlanFindings({
    path: input.stagePlanFindingsPath,
    plan: retained.success,
  });
  return Result.isFailure(findings) ? Result.fail(findings.failure) : retained;
}

/** Validate the plan/findings pair retained with a replayable Execution. */
export function validateAdmittedScenarioStagePlanEvidence(input: {
  readonly plan: unknown;
  readonly findings: unknown;
  readonly scenarioId: ScenarioId;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
}): Result.Result<void, string> {
  const plan = validateScenarioStagePlan(input.plan);
  if (Result.isFailure(plan)) return Result.fail(plan.failure);
  if (
    plan.success.identity.tag !== "admitted" ||
    plan.success.identity.scenarioId !== input.scenarioId ||
    plan.success.identity.scenarioSha256 !== input.scenarioSha256 ||
    plan.success.identity.scenarioReviewSha256 !== input.scenarioReviewSha256
  ) {
    return Result.fail("Admitted stage-plan identity does not match replay.");
  }
  const findings = Schema.decodeUnknownResult(ScenarioStagePlanFindingsSchema, {
    onExcessProperty: "error",
  })(input.findings);
  if (Result.isFailure(findings)) {
    return Result.fail(
      `Invalid stage-plan findings: ${findings.failure.message}`,
    );
  }
  if (
    canonicalJson(findings.success) !==
    canonicalJson(scenarioStagePlanFindings(plan.success))
  ) {
    return Result.fail(
      "Replay stage-plan findings do not match the canonical retained plan.",
    );
  }
  return Result.succeed(undefined);
}
