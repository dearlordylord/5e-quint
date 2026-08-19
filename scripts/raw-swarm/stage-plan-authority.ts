import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Either, Schema } from "effect";

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

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

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
  scenarioId: ScenarioId,
): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/rejected-scenarios/${scenarioId}.md.stage-plan.json`,
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
  scenarioId: ScenarioId,
): string {
  return resolve(
    repoRoot,
    `scripts/raw-swarm/out/rejected-scenarios/${scenarioId}.md.stage-plan-findings.json`,
  );
}

function writeCanonicalOnce<A>(input: {
  readonly path: string;
  readonly value: A;
  readonly decode: (value: unknown) => Either.Either<A, string>;
}): Either.Either<A, string> {
  try {
    mkdirSync(resolve(input.path, ".."), { recursive: true });
    if (existsSync(input.path)) {
      const existing = input.decode(
        JSON.parse(readFileSync(input.path, "utf8")),
      );
      if (Either.isLeft(existing)) {
        return Either.left(`Retained authority is invalid: ${existing.left}`);
      }
      return canonicalJson(existing.right) === canonicalJson(input.value)
        ? Either.right(input.value)
        : Either.left(`Retained authority diverges: ${input.path}`);
    }
    writeFileSync(input.path, `${JSON.stringify(input.value, null, 2)}\n`, {
      flag: "wx",
    });
    return Either.right(input.value);
  } catch (error) {
    return Either.left(
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
}): Either.Either<ScenarioStageFactsAuthority, string> {
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
      const decoded = Schema.decodeUnknownEither(
        ScenarioStageFactsAuthoritySchema,
        { onExcessProperty: "error" },
      )(value);
      return Either.isLeft(decoded)
        ? Either.left(decoded.left.message)
        : Either.right(decoded.right);
    },
  });
}

function readScenarioStageFacts(input: {
  readonly scenarioId: ScenarioId;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
}): Either.Either<ScenarioStageFacts, string> {
  const path = retainedScenarioStageFactsPath(input.scenarioPath);
  if (!existsSync(path)) {
    return Either.left(
      `Scenario stage facts are unavailable for this historical artifact: ${path}. Regenerate the scenario to create the controller-owned facts authority.`,
    );
  }
  try {
    const decoded = Schema.decodeUnknownEither(
      ScenarioStageFactsAuthoritySchema,
      { onExcessProperty: "error" },
    )(JSON.parse(readFileSync(path, "utf8")));
    if (Either.isLeft(decoded)) {
      return Either.left(
        `Scenario stage facts authority is invalid: ${decoded.left.message}`,
      );
    }
    if (
      decoded.right.scenarioId !== input.scenarioId ||
      decoded.right.scenarioSha256 !== input.scenarioSha256
    ) {
      return Either.left(
        `Scenario stage facts authority does not match the admitted scenario: ${path}`,
      );
    }
    return Either.right(decoded.right.facts);
  } catch (error) {
    return Either.left(
      `Unable to read scenario stage facts authority: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function retainPlanFindings(input: {
  readonly path: string;
  readonly plan: ScenarioStagePlan;
}): Either.Either<readonly ScenarioStagePlanFinding[], string> {
  const findings = scenarioStagePlanFindings(input.plan);
  return writeCanonicalOnce({
    path: input.path,
    value: findings,
    decode: (value) => {
      const decoded = Schema.decodeUnknownEither(
        ScenarioStagePlanFindingsSchema,
        { onExcessProperty: "error" },
      )(value);
      return Either.isLeft(decoded)
        ? Either.left(decoded.left.message)
        : Either.right(decoded.right);
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
}): Either.Either<ScenarioStagePlan, string> {
  const facts = readScenarioStageFacts({
    scenarioId: input.scenarioId,
    scenarioPath: input.scenarioPath,
    scenarioSha256: input.scenarioSha256,
  });
  if (Either.isLeft(facts)) return Either.left(facts.left);
  const planned = planAdmittedScenarioStages({
    scenarioId: input.scenarioId,
    scenarioSha256: input.scenarioSha256,
    scenarioReviewSha256: input.scenarioReviewSha256,
    facts: facts.right,
  });
  if (Either.isLeft(planned)) return Either.left(planned.left);
  const retained = writeCanonicalOnce({
    path: retainedScenarioStagePlanPath(input.scenarioId),
    value: planned.right,
    decode: (value) => {
      return validateScenarioStagePlan(value);
    },
  });
  if (Either.isLeft(retained)) return retained;
  const findings = retainPlanFindings({
    path: retainedScenarioStagePlanFindingsPath(input.scenarioId),
    plan: retained.right,
  });
  return Either.isLeft(findings) ? Either.left(findings.left) : retained;
}

export function retainCandidateScenarioStagePlan(input: {
  readonly scenarioId: ScenarioId;
  readonly candidateScenarioSha256: string;
  readonly plan: ScenarioStagePlan;
}): Either.Either<ScenarioStagePlan, string> {
  const validated = validateScenarioStagePlan(input.plan);
  if (Either.isLeft(validated)) return Either.left(validated.left);
  const plan = validated.right;
  if (plan.identity.tag !== "candidate") {
    return Either.left(
      "Candidate stage-plan retention requires candidate identity.",
    );
  }
  if (plan.identity.scenarioId !== input.scenarioId) {
    return Either.left(
      "Candidate stage plan identity does not match scenario.",
    );
  }
  if (plan.identity.candidateScenarioSha256 !== input.candidateScenarioSha256) {
    return Either.left(
      "Candidate stage plan identity does not match scenario content.",
    );
  }
  const retained = writeCanonicalOnce({
    path: retainedRejectedScenarioStagePlanPath(input.scenarioId),
    value: plan,
    decode: (value) => {
      return validateScenarioStagePlan(value);
    },
  });
  if (Either.isLeft(retained)) return retained;
  const findings = retainPlanFindings({
    path: retainedRejectedScenarioStagePlanFindingsPath(input.scenarioId),
    plan: retained.right,
  });
  return Either.isLeft(findings) ? Either.left(findings.left) : retained;
}

/** Validate the plan/findings pair retained with a replayable admitted run. */
export function validateAdmittedScenarioStagePlanEvidence(input: {
  readonly plan: unknown;
  readonly findings: unknown;
  readonly scenarioId: ScenarioId;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
}): Either.Either<void, string> {
  const plan = validateScenarioStagePlan(input.plan);
  if (Either.isLeft(plan)) return Either.left(plan.left);
  if (
    plan.right.identity.tag !== "admitted" ||
    plan.right.identity.scenarioId !== input.scenarioId ||
    plan.right.identity.scenarioSha256 !== input.scenarioSha256 ||
    plan.right.identity.scenarioReviewSha256 !== input.scenarioReviewSha256
  ) {
    return Either.left("Admitted stage-plan identity does not match replay.");
  }
  const findings = Schema.decodeUnknownEither(ScenarioStagePlanFindingsSchema, {
    onExcessProperty: "error",
  })(input.findings);
  if (Either.isLeft(findings)) {
    return Either.left(`Invalid stage-plan findings: ${findings.left.message}`);
  }
  if (
    canonicalJson(findings.right) !==
    canonicalJson(scenarioStagePlanFindings(plan.right))
  ) {
    return Either.left(
      "Replay stage-plan findings do not match the canonical retained plan.",
    );
  }
  return Either.right(undefined);
}
