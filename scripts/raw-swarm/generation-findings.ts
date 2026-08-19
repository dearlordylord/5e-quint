import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  addSource,
  authorityFor,
  deduplicateFindings,
  findingsFromGenerationLedger,
  findingsFromScenarioReviewSource,
  findingsFromStagePlanSource,
  makeFinding,
  pointerForSource,
  readSourceRecord,
  sourcePath,
  validateFindingsProjection,
  RAW_SWARM_FINDINGS_SCHEMA_VERSION,
  type Finding,
  type FindingCategory,
  type FindingKind,
  type FindingStage,
  type FindingsProjection,
  type ScenarioReviewIdentityExpectation,
  type StagePlanIdentityExpectation,
  type Source,
} from "./findings.ts";
import {
  scenarioStagePlanFindings,
  ScenarioStagePlanFindingsSchema,
  validateScenarioStagePlan,
  type ScenarioStagePlan,
} from "./scenario-stage-plan.ts";
import {
  canonicalJson,
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
  StartedAtSchema,
} from "./transcript.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

const RunManifestSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("raw-swarm-generation-run"),
    schemaVersion: Schema.Literal(1),
    scenarioId: ScenarioIdSchema,
    gitSha: GitShaSchema,
    startedAt: StartedAtSchema,
    configSha256: Schema.optional(HashSchema),
  }),
  Schema.Struct({
    type: Schema.Literal("raw-swarm-player-run-start"),
    schemaVersion: Schema.Literal(1),
    scenarioId: ScenarioIdSchema,
    gitSha: GitShaSchema,
    startedAt: StartedAtSchema,
  }),
);

type RunManifest = Schema.Schema.Type<typeof RunManifestSchema>;
type RunManifestIdentity = Pick<
  RunManifest,
  "scenarioId" | "gitSha" | "startedAt"
>;

export type GenerationFindingsProjectionInput = {
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly startedAt: string;
  readonly authorityPaths: readonly {
    readonly role: string;
    readonly path: string;
  }[];
  readonly scenarioReviewPaths: readonly string[];
  readonly generationLedgerPaths: readonly string[];
  readonly stagePlanPaths: readonly string[];
  readonly stagePlanFindingsPaths: readonly string[];
  readonly rejectionReason?: string;
  readonly pointerAuthorityRole?: string;
};

export type TranscriptlessFindingsProjectionInput = {
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly startedAt: string;
  readonly authorityPaths: readonly {
    readonly role: string;
    readonly path: string;
  }[];
  readonly stage: FindingStage;
  readonly category: FindingCategory;
  readonly kind: FindingKind;
  readonly summary: string;
  readonly detail?: string;
  readonly pointerAuthorityRole?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function sourceFindingsFromScenarioReview(
  path: string,
  role: string,
  findings: Finding[],
  expectedIdentity: ScenarioReviewIdentityExpectation,
): void {
  findings.push(
    ...findingsFromScenarioReviewSource(path, role, expectedIdentity),
  );
}

function runManifestIdentity(sources: readonly Source[]): RunManifestIdentity {
  const source = sources.find((candidate) => candidate.role === "run");
  if (source === undefined) {
    fail(
      "Transcriptless findings require a run manifest authority with role run.",
    );
  }
  const decoded = Schema.decodeUnknownEither(RunManifestSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(source.path));
  if (Either.isLeft(decoded)) {
    fail(`Run manifest is invalid: ${source.path}: ${decoded.left.message}`);
  }
  return {
    scenarioId: decoded.right.scenarioId,
    gitSha: decoded.right.gitSha,
    startedAt: decoded.right.startedAt,
  };
}

function assertRunManifestIdentity(input: {
  readonly expected: RunManifestIdentity;
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly startedAt: string;
}): void {
  if (
    input.expected.scenarioId !== input.scenarioId ||
    input.expected.gitSha !== input.gitSha ||
    input.expected.startedAt !== input.startedAt
  ) {
    fail(
      "Transcriptless findings identity does not match the retained run manifest.",
    );
  }
}

function makeProjection(input: {
  readonly run: {
    readonly scenarioId: string;
    readonly gitSha: string;
    readonly startedAt: string;
  };
  readonly authorities: readonly Source[];
  readonly findings: readonly Finding[];
  readonly pointerAuthorityRole?: string;
}): FindingsProjection {
  const run = { ...input.run, callCount: 0 };
  const pointerRole =
    input.pointerAuthorityRole === undefined
      ? input.authorities.find((source) => source.role === "run")?.role
      : input.authorities.find(
          (source) => source.role === input.pointerAuthorityRole,
        )?.role;
  if (pointerRole === undefined && input.findings.length > 0) {
    fail("Generation findings require a pointer authority.");
  }
  const projection: FindingsProjection = {
    type: "raw-swarm-findings",
    schemaVersion: RAW_SWARM_FINDINGS_SCHEMA_VERSION,
    runIdentity: sha256Canonical(run),
    run,
    authorities: input.authorities
      .map(authorityFor)
      .sort((left, right) => left.role.localeCompare(right.role)),
    findings: deduplicateFindings(input.findings),
  };
  const validation = validateFindingsProjection(projection);
  if (validation.tag === "invalid") fail(validation.message);
  return projection;
}

export function projectGenerationFindings(
  input: GenerationFindingsProjectionInput,
): FindingsProjection {
  const sources: Source[] = [];
  const sourceFindings: Finding[] = [];
  for (const authority of input.authorityPaths) {
    addSource(sources, authority.path, authority.role);
  }
  const manifestIdentity = runManifestIdentity(sources);
  assertRunManifestIdentity({
    expected: manifestIdentity,
    scenarioId: input.scenarioId,
    gitSha: input.gitSha,
    startedAt: input.startedAt,
  });
  if (input.rejectionReason !== undefined) {
    const pointerRole =
      input.pointerAuthorityRole === undefined
        ? sources.find((source) => source.role === "run")?.role
        : sources.find((source) => source.role === input.pointerAuthorityRole)
            ?.role;
    if (pointerRole === undefined) {
      fail("A generation rejection requires at least one authority.");
    }
    sourceFindings.push(
      makeFinding({
        stage: "generation",
        category: "scenario-author-defect",
        kind: "generation-rejection",
        summary: "Scenario generation was rejected before a playable run.",
        detail: input.rejectionReason,
        pointer: pointerForSource(pointerRole),
      }),
    );
  }
  for (const [index, path] of input.scenarioReviewPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `scenarioReview-${String(index + 1)}`,
    );
    if (role !== undefined) {
      const scenarioSource = sources.find(
        (source) =>
          source.role === "scenario" || source.role.startsWith("scenario-"),
      );
      if (scenarioSource === undefined) {
        fail(
          `Scenario-review authority requires the matching scenario authority: ${canonical}`,
        );
      }
      const expectedIdentity: ScenarioReviewIdentityExpectation = {
        scenarioId: input.scenarioId,
        gitSha: input.gitSha,
        scenarioSha256: authorityFor(scenarioSource).sha256,
        scenarioReviewSha256: authorityFor({ role, path: canonical }).sha256,
      };
      sourceFindingsFromScenarioReview(
        canonical,
        role,
        sourceFindings,
        expectedIdentity,
      );
    }
  }
  for (const [index, path] of input.generationLedgerPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `generationLedger-${String(index + 1)}`,
    );
    if (role !== undefined) {
      sourceFindings.push(
        ...findingsFromGenerationLedger(
          { role, path: canonical },
          {
            scenarioId: input.scenarioId,
            gitSha: input.gitSha,
          },
        ),
      );
    }
  }
  const scenarioSource = sources.find(
    (source) =>
      source.role === "scenario" || source.role.startsWith("scenario-"),
  );
  const scenarioSha256 =
    scenarioSource === undefined
      ? undefined
      : authorityFor(scenarioSource).sha256;
  const scenarioReviewSource = sources.find(
    (source) => source.role === "scenarioReview",
  );
  const scenarioReviewSha256 =
    scenarioReviewSource === undefined
      ? undefined
      : authorityFor(scenarioReviewSource).sha256;
  const stagePlanIdentity: StagePlanIdentityExpectation | undefined =
    scenarioSha256 !== undefined && scenarioReviewSha256 !== undefined
      ? {
          tag: "admitted",
          scenarioId: input.scenarioId,
          scenarioSha256,
          scenarioReviewSha256,
        }
      : scenarioSha256 === undefined
        ? undefined
        : {
            tag: "candidate",
            scenarioId: input.scenarioId,
            candidateScenarioSha256: scenarioSha256,
          };
  const retainedPlans: ScenarioStagePlan[] = [];
  for (const path of input.stagePlanPaths) {
    const canonical = sourcePath(path);
    if (stagePlanIdentity === undefined) {
      fail(
        `Stage-plan authority requires a matching scenario authority: ${canonical}`,
      );
    }
    const plan = validateScenarioStagePlan(
      JSON.parse(readFileSync(resolve(repoRoot, canonical), "utf8")),
    );
    if (Either.isLeft(plan)) fail(plan.left);
    retainedPlans.push(plan.right);
    const identity = plan.right.identity;
    if (
      identity.tag !== stagePlanIdentity.tag ||
      identity.scenarioId !== stagePlanIdentity.scenarioId ||
      (identity.tag === "candidate" &&
        stagePlanIdentity.tag === "candidate" &&
        identity.candidateScenarioSha256 !==
          stagePlanIdentity.candidateScenarioSha256) ||
      (identity.tag === "admitted" &&
        stagePlanIdentity.tag === "admitted" &&
        (identity.scenarioSha256 !== stagePlanIdentity.scenarioSha256 ||
          identity.scenarioReviewSha256 !==
            stagePlanIdentity.scenarioReviewSha256))
    ) {
      fail(
        `Stage-plan authority identity does not match generation: ${canonical}`,
      );
    }
  }
  if (input.stagePlanFindingsPaths.length !== retainedPlans.length) {
    if (input.stagePlanFindingsPaths.length > 0 || retainedPlans.length > 0) {
      fail(
        "Retained stage-plan authorities must include one findings authority for each plan.",
      );
    }
  }
  for (const [index, path] of input.stagePlanFindingsPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      index === 0
        ? "stagePlanFindings"
        : `stagePlanFindings-${String(index + 1)}`,
    );
    if (role !== undefined) {
      if (scenarioSha256 === undefined) {
        fail(
          `Candidate stage-plan findings require a scenario authority: ${canonical}`,
        );
      }
      if (stagePlanIdentity === undefined) {
        fail(`Stage-plan findings require a scenario authority: ${canonical}`);
      }
      const retainedPlan = retainedPlans[index];
      if (retainedPlan === undefined) {
        fail(
          `Stage-plan findings have no matching retained plan: ${canonical}`,
        );
      }
      const decodedFindings = Schema.decodeUnknownEither(
        ScenarioStagePlanFindingsSchema,
        { onExcessProperty: "error" },
      )(readSourceRecord(canonical));
      if (Either.isLeft(decodedFindings)) {
        fail(
          `Invalid stage-plan findings authority: ${canonical}: ${decodedFindings.left.message}`,
        );
      }
      if (
        canonicalJson(decodedFindings.right) !==
        canonicalJson(scenarioStagePlanFindings(retainedPlan))
      ) {
        fail(
          `Stage-plan findings authority does not match the retained plan: ${canonical}`,
        );
      }
      sourceFindings.push(
        ...findingsFromStagePlanSource(
          { role, path: canonical },
          stagePlanIdentity,
        ),
      );
    }
  }
  return makeProjection({
    run: {
      scenarioId: manifestIdentity.scenarioId,
      gitSha: manifestIdentity.gitSha,
      startedAt: manifestIdentity.startedAt,
    },
    authorities: sources,
    findings: sourceFindings,
    ...(input.pointerAuthorityRole === undefined
      ? {}
      : { pointerAuthorityRole: input.pointerAuthorityRole }),
  });
}

export function projectTranscriptlessFindings(
  input: TranscriptlessFindingsProjectionInput,
): FindingsProjection {
  const sources: Source[] = [];
  const addedRoles = new Map<string, string>();
  for (const authority of input.authorityPaths) {
    const role = addSource(sources, authority.path, authority.role);
    if (role !== undefined) addedRoles.set(authority.role, role);
  }
  const manifestIdentity = runManifestIdentity(sources);
  assertRunManifestIdentity({
    expected: manifestIdentity,
    scenarioId: input.scenarioId,
    gitSha: input.gitSha,
    startedAt: input.startedAt,
  });
  const pointerRole =
    input.pointerAuthorityRole === undefined
      ? sources[0]?.role
      : addedRoles.get(input.pointerAuthorityRole);
  if (pointerRole === undefined) {
    fail(
      input.pointerAuthorityRole === undefined
        ? "A transcriptless finding requires at least one authority."
        : `A transcriptless finding requires the requested authority: ${input.pointerAuthorityRole}`,
    );
  }
  const finding = makeFinding({
    stage: input.stage,
    category: input.category,
    kind: input.kind,
    summary: input.summary,
    pointer: pointerForSource(pointerRole),
    ...(input.detail === undefined ? {} : { detail: input.detail }),
  });
  return makeProjection({
    run: {
      scenarioId: manifestIdentity.scenarioId,
      gitSha: manifestIdentity.gitSha,
      startedAt: manifestIdentity.startedAt,
    },
    authorities: sources,
    findings: [finding],
  });
}
