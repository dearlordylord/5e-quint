import { randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { Either, Match, Option, Schema } from "effect";

import {
  artifactAuthority,
  type ArtifactAuthority,
  readJsonLines,
} from "./artifact-authority.ts";
import {
  BENCHMARK_CONTEXT_ROLES,
  BenchmarkContextDeliveryEvidenceSchema,
  benchmarkContextForRole,
  historicalDeclarationBundleText,
  historicalDocumentDeclarationContextForRole,
  type BenchmarkContextRole,
} from "./benchmark-context.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  FinalScenarioReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
  ScenarioQualityReviewSchema,
} from "./scenario-campaign.ts";
import {
  findingsArtifactPath,
  projectRunFindings,
  writeFindingsProjection,
} from "./findings.ts";
import { parseStrictReadCommand } from "./review-read-validation.ts";
import {
  parseBenchmarkModelInvocationLedgerEntry,
  parseModelInvocationLedgerEntry,
  firstPartyCodexFailureReason,
  readCodexEvents,
  runBenchmarkAuxiliaryInvocation,
  runCodexInvocation,
  type BenchmarkAuxiliaryModelInvocationLedgerEntry,
  type BenchmarkAuxiliaryInvocationKind,
  type CurrentModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  BENCHMARK_IMPLEMENTATION_PROFILES,
  BenchmarkReadinessInputSchema,
  BenchmarkContextSourceManifestDocumentSchema,
  BenchmarkRunDescriptorSchema,
  benchmarkReviewPlan,
  deriveBenchmarkPathOutcome,
  parseBenchmarkMeasurement,
  readCompletePathMeasurement,
  validateCompletePathMeasurement,
  writeCompletePathComparison,
  type BenchmarkImplementationProfile,
  type CurrentBenchmarkMeasurement,
} from "./performance-comparison.ts";
import { admittedScenarioIdentity } from "./scenario-admission.ts";
import {
  ScenarioStageFactsSchema,
  planAdmittedScenarioStages,
  scenarioStagePlanFindings,
  validateScenarioStagePlan,
  type ScenarioStageFacts,
  type ScenarioStagePlan,
} from "./scenario-stage-plan.ts";
import { RetainedScenarioReviewInputSchema } from "./scenario-review-input.ts";
import {
  buildScenarioCharacterDistribution,
  buildScenarioSetupDistribution,
} from "./sdk-player/consumer-distribution.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
  sha256Canonical,
  isJsonRecord,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";
import { RAW_SWARM_STAGE_PLAN_REASONS } from "./scenario-stage-plan.ts";

export const FIXED_SCENARIO_ID = "generated-battle-009" as const;
export const FIXED_BENCHMARK_PROFILES = BENCHMARK_IMPLEMENTATION_PROFILES;
export type FixedBenchmarkProfile = BenchmarkImplementationProfile;

const FIXED_BENCHMARK_ROOT = "scripts/raw-swarm/out/fixed-scenario-benchmark";
export const FIXED_BENCHMARK_CONTEXT_ROLES = BENCHMARK_CONTEXT_ROLES;
const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
type ScenarioCharacterEvaluation = Awaited<
  ReturnType<typeof evaluateScenarioCharacters>
>;
type FixedBenchmarkInvocation =
  CurrentBenchmarkMeasurement["invocations"][number];

function fixedScenarioId(): ScenarioId {
  const decoded = decodeScenarioId(FIXED_SCENARIO_ID);
  if (Either.isLeft(decoded)) fail(decoded.left);
  return decoded.right;
}

export type FixedScenarioCanonicalPaths = Readonly<{
  readonly scenario: string;
  readonly scenarioReview: string;
  readonly characters: string;
  readonly setup: string;
}>;

export type FixedScenarioCanonicalBundle = Readonly<{
  readonly paths: FixedScenarioCanonicalPaths;
  readonly authorities: Readonly<{
    readonly scenario: ArtifactAuthority;
    readonly scenarioReview: ArtifactAuthority;
    readonly characters: ArtifactAuthority;
    readonly setup: ArtifactAuthority;
  }>;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
}>;

export type FixedBenchmarkProfilePaths = Readonly<{
  readonly root: string;
  readonly stageFacts: string;
  readonly stagePlan: string;
  readonly stagePlanFindings: string;
  readonly contextDirectory: string;
  readonly contextManifest: string;
  readonly runDescriptor: string;
  readonly benchmarkLedger: string;
  readonly currentLedger: string;
  readonly auxiliaryLedger: string;
  readonly eventDirectory: string;
  readonly reviewDirectory: string;
  readonly milestoneReviewInput: string;
  readonly finalReviewInput: string;
  readonly readinessResult: string;
  readonly readinessInput: string;
  readonly authoringDirectory: string;
  readonly playerDirectory: string;
  readonly postPlayReview: string;
  readonly postPlayContextDelivery: string;
  readonly postPlayLog: string;
  readonly measurement: string;
  readonly commands: string;
}>;

function fail(message: string): never {
  throw new Error(message);
}

function repoRelative(path: string): string {
  const value = relative(repoRoot, resolve(path));
  if (value === "" || value === ".." || value.startsWith("../")) {
    return fail("Fixed benchmark path escapes the repository: " + path);
  }
  return value;
}

function writeExclusive(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, { flag: "wx" });
}

function writeJsonExclusive(path: string, value: unknown): void {
  writeExclusive(path, JSON.stringify(value, null, 2) + "\n");
}

function fixedCanonicalPaths(): FixedScenarioCanonicalPaths {
  const scenario = resolve(
    repoRoot,
    "scripts/raw-swarm/sdk-player/scenarios/" + FIXED_SCENARIO_ID + ".md",
  );
  return {
    scenario,
    scenarioReview: scenario + ".scenario-review.json",
    characters: scenario.slice(0, -".md".length) + ".characters.ts",
    setup: scenario.slice(0, -".md".length) + ".setup.ts",
  };
}

/** Verify the exact tracked #009 source bundle before any model call. */
export function fixedScenarioCanonicalBundle(): FixedScenarioCanonicalBundle {
  const paths = fixedCanonicalPaths();
  for (const path of Object.values(paths)) {
    if (!existsSync(path)) fail("Fixed scenario source is missing: " + path);
  }
  const admission = admittedScenarioIdentity({
    scenarioId: fixedScenarioId(),
    scenarioPath: paths.scenario,
    reviewPath: paths.scenarioReview,
  });
  if (Either.isLeft(admission)) fail(admission.left);
  const review = Schema.decodeUnknownEither(
    Schema.parseJson(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(readFileSync(paths.scenarioReview, "utf8"));
  if (Either.isLeft(review))
    fail("Tracked scenario review is invalid: " + review.left.message);
  return {
    paths,
    authorities: {
      scenario: artifactAuthority(repoRelative(paths.scenario)),
      scenarioReview: artifactAuthority(repoRelative(paths.scenarioReview)),
      characters: artifactAuthority(repoRelative(paths.characters)),
      setup: artifactAuthority(repoRelative(paths.setup)),
    },
    scenarioSha256: admission.right.scenarioSha256,
    scenarioReviewSha256: admission.right.scenarioReviewSha256,
  };
}

/** Model calls and external runners must not mutate the tracked bundle. */
export function assertFixedScenarioCanonicalBundle(
  expected: FixedScenarioCanonicalBundle,
): void {
  const actual = fixedScenarioCanonicalBundle();
  if (
    sha256Canonical(actual.authorities) !==
    sha256Canonical(expected.authorities)
  ) {
    fail(
      "The tracked generated-battle-009 bundle changed during the benchmark.",
    );
  }
}

type FixedBenchmarkPreparationState = Readonly<{
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly contextAuthorities: readonly ArtifactAuthority[];
  readonly contextManifest: ArtifactAuthority;
  readonly gitSha: GitSha;
  readonly runDescriptor: ArtifactAuthority;
  readonly stageFacts: ArtifactAuthority;
  readonly stagePlan: ArtifactAuthority;
  readonly stagePlanFindings: ArtifactAuthority;
}>;

function authorityAt(path: string): ArtifactAuthority {
  return artifactAuthority(repoRelative(path));
}

function assertAuthorityUnchanged(
  label: string,
  expected: ArtifactAuthority,
  path: string,
): void {
  const actual = authorityAt(path);
  if (sha256Canonical(actual) !== sha256Canonical(expected)) {
    fail(`Fixed benchmark ${label} authority changed during preparation.`);
  }
}

function preparationState(
  bundle: FixedScenarioCanonicalBundle,
  paths: FixedBenchmarkProfilePaths,
  gitSha: GitSha,
): FixedBenchmarkPreparationState {
  return {
    bundle,
    contextAuthorities: FIXED_BENCHMARK_CONTEXT_ROLES.map((role) =>
      authorityAt(resolve(paths.contextDirectory, role + ".md")),
    ),
    contextManifest: authorityAt(paths.contextManifest),
    gitSha,
    runDescriptor: authorityAt(paths.runDescriptor),
    stageFacts: authorityAt(paths.stageFacts),
    stagePlan: authorityAt(paths.stagePlan),
    stagePlanFindings: authorityAt(paths.stagePlanFindings),
  };
}

function assertPreparationState(
  state: FixedBenchmarkPreparationState,
  paths: FixedBenchmarkProfilePaths,
): void {
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail(
      "Fixed benchmark preparation requires the original clean Git worktree.",
    );
  }
  const currentSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(currentSha)) fail(currentSha.left.message);
  if (currentSha.right !== state.gitSha) {
    fail(
      `Fixed benchmark Git revision changed during preparation: expected ${state.gitSha}, got ${currentSha.right}.`,
    );
  }
  assertFixedScenarioCanonicalBundle(state.bundle);
  assertAuthorityUnchanged("stage facts", state.stageFacts, paths.stageFacts);
  assertAuthorityUnchanged("stage plan", state.stagePlan, paths.stagePlan);
  assertAuthorityUnchanged(
    "stage-plan findings",
    state.stagePlanFindings,
    paths.stagePlanFindings,
  );
  assertAuthorityUnchanged(
    "context manifest",
    state.contextManifest,
    paths.contextManifest,
  );
  for (const [index, role] of FIXED_BENCHMARK_CONTEXT_ROLES.entries()) {
    const authority = state.contextAuthorities[index];
    if (authority === undefined)
      fail("Fixed benchmark context authority is missing.");
    assertAuthorityUnchanged(
      `context ${role}`,
      authority,
      resolve(paths.contextDirectory, role + ".md"),
    );
  }
  assertAuthorityUnchanged(
    "run descriptor",
    state.runDescriptor,
    paths.runDescriptor,
  );
}

export function fixedScenarioStageFacts(): ScenarioStageFacts {
  return {
    schemaVersion: 1,
    characterRequirement: {
      tag: "statBlocksOnly",
      evidence:
        "The tracked generated-battle-009 character source is ready and returns zero Character Sheets.",
    },
    spatialRequirement: {
      tag: "geometryAssisted",
      evidence:
        "The tracked generated-battle-009 setup source owns its open grid through the geometry-derived spatial boundary.",
    },
  };
}

export function fixedBenchmarkProfilePaths(
  runId: string,
  profile: FixedBenchmarkProfile,
): FixedBenchmarkProfilePaths {
  const root = resolve(
    repoRoot,
    FIXED_BENCHMARK_ROOT,
    assertRunId(runId),
    profile,
  );
  return {
    root,
    stageFacts: resolve(root, "bundle/stage-facts.json"),
    stagePlan: resolve(root, "bundle/stage-plan.json"),
    stagePlanFindings: resolve(root, "bundle/stage-plan-findings.json"),
    contextDirectory: resolve(root, "context"),
    contextManifest: resolve(root, "context-manifest.json"),
    runDescriptor: resolve(root, "run.json"),
    benchmarkLedger: resolve(root, "evidence/benchmark-invocations.jsonl"),
    currentLedger: resolve(root, "evidence/current-invocations.jsonl"),
    auxiliaryLedger: resolve(root, "evidence/auxiliary-invocations.jsonl"),
    eventDirectory: resolve(root, "evidence/invocation-events"),
    reviewDirectory: resolve(root, "reviews"),
    milestoneReviewInput: resolve(root, "reviews/milestone.input.json"),
    finalReviewInput: resolve(root, "reviews/final.input.json"),
    readinessResult: resolve(root, "reviews/readiness.json"),
    readinessInput: resolve(root, "reviews/readiness.input.json"),
    authoringDirectory: resolve(root, "authoring"),
    playerDirectory: resolve(root, "player"),
    postPlayReview: resolve(root, "post-play-review.json"),
    postPlayContextDelivery: resolve(
      root,
      "post-play-review.context-delivery.json",
    ),
    postPlayLog: resolve(root, "post-play-review-agent.log"),
    measurement: resolve(root, "measurement.json"),
    commands: resolve(root, "commands.json"),
  };
}

export function initializeFixedBenchmarkProfileDirectory(
  profileRoot: string,
): void {
  mkdirSync(resolve(profileRoot, ".."), { recursive: true });
  mkdirSync(profileRoot, { recursive: false });
}

function assertRunId(runId: string | undefined): string {
  if (runId === undefined || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
    return fail("Fixed benchmark run id has unsafe characters.");
  }
  return runId;
}

/** Canonical unbounded context retained by the historical benchmark profile. */
export function fixedBenchmarkDocumentDeclarationContextForRole(
  role: BenchmarkContextRole,
): string {
  return historicalDocumentDeclarationContextForRole(role);
}

/** Canonical delivered context for one benchmark role and profile. */
export function fixedBenchmarkContextForRole(
  profile: FixedBenchmarkProfile,
  role: BenchmarkContextRole,
): string {
  return benchmarkContextForRole(profile, role);
}

function writeProfileContexts(
  profile: FixedBenchmarkProfile,
  paths: FixedBenchmarkProfilePaths,
): ArtifactAuthority {
  const declarationBundle =
    profile === "documentDeclarationSet"
      ? historicalDeclarationBundleText()
      : undefined;
  const sources = FIXED_BENCHMARK_CONTEXT_ROLES.map((role) => {
    const path = resolve(paths.contextDirectory, role + ".md");
    writeExclusive(
      path,
      benchmarkContextForRole(profile, role, declarationBundle),
    );
    return {
      role,
      sourceKind:
        profile === "documentDeclarationSet"
          ? ("declarationSet" as const)
          : ("capabilityProjection" as const),
      deliveryMode:
        profile === "documentDeclarationSet"
          ? ("document" as const)
          : ("roleProjection" as const),
      authority: artifactAuthority(repoRelative(path)),
    };
  });
  const document = {
    schemaVersion: 1 as const,
    profile,
    scenarioId: fixedScenarioId(),
    sources,
  };
  const decoded = Schema.decodeUnknownEither(
    BenchmarkContextSourceManifestDocumentSchema,
    { onExcessProperty: "error" },
  )(document);
  if (Either.isLeft(decoded)) fail(decoded.left.message);
  writeJsonExclusive(paths.contextManifest, document);
  return artifactAuthority(repoRelative(paths.contextManifest));
}

function retainStagePlan(
  bundle: FixedScenarioCanonicalBundle,
  paths: FixedBenchmarkProfilePaths,
): ScenarioStagePlan {
  const facts = fixedScenarioStageFacts();
  const decodedFacts = Schema.decodeUnknownEither(ScenarioStageFactsSchema, {
    onExcessProperty: "error",
  })(facts);
  if (Either.isLeft(decodedFacts)) fail(decodedFacts.left.message);
  const planned = planAdmittedScenarioStages({
    scenarioId: fixedScenarioId(),
    scenarioSha256: bundle.scenarioSha256,
    scenarioReviewSha256: bundle.scenarioReviewSha256,
    facts: decodedFacts.right,
  });
  if (Either.isLeft(planned)) fail(planned.left);
  writeJsonExclusive(paths.stageFacts, facts);
  writeJsonExclusive(paths.stagePlan, planned.right);
  writeJsonExclusive(
    paths.stagePlanFindings,
    scenarioStagePlanFindings(planned.right),
  );
  return planned.right;
}

function initializeLedger(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeExclusive(path, "");
}

function appendCopiedLedgerEntry(source: string, destination: string): void {
  const value = readJsonLines(source).at(-1);
  if (value === undefined) fail("Invocation ledger is empty: " + source);
  writeFileSync(destination, JSON.stringify(value) + "\n", { flag: "a" });
}

function nonEmpty<A>(
  values: readonly A[],
  label: string,
): readonly [A, ...A[]] {
  const first = values[0];
  if (first === undefined) fail("Schema-3 assembly requires " + label + ".");
  return [first, ...values.slice(1)];
}

function eventPath(
  paths: FixedBenchmarkProfilePaths,
  ordinal: number,
  phase: string,
): string {
  return resolve(
    paths.eventDirectory,
    String(ordinal).padStart(2, "0") +
      "-" +
      phase +
      "-" +
      randomUUID() +
      ".events.jsonl",
  );
}

export function fixedBenchmarkCodexArgs(
  cwd: string,
  model: string,
  reasoningEffort: string,
  prompt: string,
  schemaPath: string | undefined,
  outputPath: string | undefined,
  sandbox: "workspace-write" | "danger-full-access",
): readonly [string, ...string[]] {
  return [
    "exec",
    "-C",
    cwd,
    "--sandbox",
    sandbox,
    "--skip-git-repo-check",
    "--ephemeral",
    "--json",
    "--disable",
    "tool_call_mcp_elicitation",
    "-m",
    model,
    "-c",
    "model_reasoning_effort=" + JSON.stringify(reasoningEffort),
    ...(schemaPath === undefined ? [] : ["--output-schema", schemaPath]),
    ...(outputPath === undefined ? [] : ["--output-last-message", outputPath]),
    prompt,
  ];
}

function copyBenchmarkCallInputs(input: {
  readonly scratch: string;
  readonly contextPath: string;
  readonly bundle: FixedScenarioCanonicalBundle;
}): Readonly<{
  readonly contextPath: string;
  readonly bundlePaths: FixedScenarioCanonicalPaths;
}> {
  const contextPath = resolve(input.scratch, "BENCHMARK_CONTEXT.md");
  const scenario = resolve(input.scratch, "SCENARIO.md");
  const scenarioReview = resolve(input.scratch, "SCENARIO_REVIEW.json");
  const characters = resolve(input.scratch, "CHARACTERS.ts");
  const setup = resolve(input.scratch, "SETUP.ts");
  copyFileSync(input.contextPath, contextPath);
  copyFileSync(input.bundle.paths.scenario, scenario);
  copyFileSync(input.bundle.paths.scenarioReview, scenarioReview);
  copyFileSync(input.bundle.paths.characters, characters);
  copyFileSync(input.bundle.paths.setup, setup);
  return {
    contextPath,
    bundlePaths: { scenario, scenarioReview, characters, setup },
  };
}

function localBenchmarkCallPrompt(input: {
  readonly scratch: string;
  readonly readableFiles: readonly string[];
  readonly prompt: string;
  readonly contextPath: string;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly local: Readonly<{
    readonly contextPath: string;
    readonly bundlePaths: FixedScenarioCanonicalPaths;
  }>;
}): string {
  const replacements = [
    [input.contextPath, input.local.contextPath],
    [
      repoRelative(input.bundle.paths.scenario),
      input.local.bundlePaths.scenario,
    ],
    [
      repoRelative(input.bundle.paths.scenarioReview),
      input.local.bundlePaths.scenarioReview,
    ],
    [
      repoRelative(input.bundle.paths.characters),
      input.local.bundlePaths.characters,
    ],
    [repoRelative(input.bundle.paths.setup), input.local.bundlePaths.setup],
  ] as const;
  const localizedPrompt = replacements.reduce(
    (prompt, [source, destination]) => prompt.split(source).join(destination),
    input.prompt,
  );
  return fixedBenchmarkScratchInputManifestPrompt({
    scratch: input.scratch,
    readableFiles: input.readableFiles,
    taskPrompt: localizedPrompt,
  });
}

export function fixedBenchmarkScratchInputManifestPrompt(input: {
  readonly scratch: string;
  readonly readableFiles: readonly string[];
  readonly taskPrompt: string;
}): string {
  const manifest = [...new Set(input.readableFiles)]
    .sort()
    .map((file) => "- `" + file + "`")
    .join("\n");
  return (
    "The scratch workspace at " +
    input.scratch +
    " is complete and contains the entire benchmark input. The only readable scratch files are this exact manifest:\n" +
    manifest +
    "\nDo not attempt to inspect, read, search, hash, count, or otherwise reference any other filename or path. Do not inspect, read, search, or execute against the repository, parent directories, hidden files outside scratch, or network resources. Run all commands with the scratch workspace as their working directory. You may perform multiple preparation reads. For each read, invoke one read-only command directly: `cat`, `head`, `tail`, `sed` with a numeric print range, `sha256sum`, `wc`, `od`, or `rg` against a file in the manifest. The client records each direct command inside one shell telemetry wrapper; do not invoke Bash or another shell yourself. Do not use Node, Python, another executable, shell expansion, shell operators, pipelines, redirections, loops, scripts, or structured file/search tools.\n\n" +
    input.taskPrompt
  );
}

const FIXED_BENCHMARK_PREPARATION_SANDBOX = "danger-full-access" as const;

const READ_ONLY_SOURCE_REVIEW_INSTRUCTION =
  " Do not execute typecheck, Node, or client commands during this preparation call; later deterministic benchmark commands own executable validation. Use only the read commands listed by the scratch isolation instructions.";

export const FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS = {
  scenarioCharacterAuthoring:
    "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_CHARACTERS.md, SCENARIO.md, and SCENARIO_REVIEW.json. Review characters.ts and leave it byte-identical to the existing zero-sheet source. Do not invent Character Sheets." +
    READ_ONLY_SOURCE_REVIEW_INSTRUCTION,
  scenarioSetupNeutralAuthoring:
    "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_SETUP.md, SCENARIO.md, SCENARIO_REVIEW.json, CHARACTERS.json, and STAT_BLOCKS.json. Review setup.ts as the exact neutral source and leave it byte-identical." +
    READ_ONLY_SOURCE_REVIEW_INSTRUCTION,
  scenarioSetupControllerAuthoring:
    "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_SETUP_CONTROLLER.md, NEUTRAL_SETUP.ts, SCENARIO.md, and SCENARIO_REVIEW.json. Review setup.ts as the exact controller-retained source, preserve fixed facts, and leave it byte-identical." +
    READ_ONLY_SOURCE_REVIEW_INSTRUCTION,
} as const;

const BENCHMARK_PREPARATION_RG_OPTIONS = new Set(["-F", "-i", "-n", "-o"]);
const BENCHMARK_PREPARATION_RG_COUNT_OPTIONS = new Set(["-C", "-m"]);
const BENCHMARK_PREPARATION_SAFE_ITEM_TYPES = new Set([
  "agent_message",
  "reasoning",
  "status",
]);
const BENCHMARK_PREPARATION_ITEM_KEYS = new Set([
  "aggregated_output",
  "command",
  "cwd",
  "exit_code",
  "id",
  "status",
  "type",
]);
const BENCHMARK_PREPARATION_EVENT_TYPES = new Set([
  "item.completed",
  "item.started",
  "raw-swarm.invocation.completed",
  "raw-swarm.invocation.started",
  "thread.started",
  "turn.completed",
  "turn.started",
]);

type BenchmarkPreparationEventValidationInput = Readonly<{
  readonly eventPath: string;
  readonly scratch: string;
  readonly namedInputs: readonly string[];
}>;

function isCanonicalUnsignedDecimal(
  value: string | undefined,
): value is string {
  return value !== undefined && /^(?:0|[1-9]\d*)$/.test(value);
}

function scratchNamedFiles(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(relative(root, path));
    }
  };
  visit(root);
  return files.sort();
}

function pathWithinScratch(
  scratch: string,
  candidate: string,
  namedInputs: ReadonlySet<string>,
): boolean {
  if (candidate.includes("\0") || candidate.startsWith("~")) return false;
  if (/^(?:https?|file):\/\//.test(candidate)) return false;
  if (
    candidate
      .split(/[\\/]/u)
      .some((segment) => segment === "." || segment === "..")
  ) {
    return false;
  }
  const root = resolve(scratch);
  const absolute = isAbsolute(candidate)
    ? resolve(candidate)
    : resolve(root, candidate);
  const fromRoot = relative(root, absolute);
  if (
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    return false;
  }
  try {
    const realRoot = realpathSync(root);
    const realCandidate = realpathSync(absolute);
    const fromRealRoot = relative(realRoot, realCandidate);
    if (
      fromRealRoot === ".." ||
      fromRealRoot.startsWith(`..${sep}`) ||
      isAbsolute(fromRealRoot)
    ) {
      return false;
    }
  } catch {
    return false;
  }
  if (fromRoot === "") return true;
  if (namedInputs.has(fromRoot)) return true;
  return [...namedInputs].some((path) => path.startsWith(`${fromRoot}${sep}`));
}

function namedScratchFile(
  scratch: string,
  candidate: string,
  namedInputs: ReadonlySet<string>,
): boolean {
  const root = resolve(scratch);
  const absolute = isAbsolute(candidate)
    ? resolve(candidate)
    : resolve(root, candidate);
  const relativePath = relative(root, absolute);
  if (!namedInputs.has(relativePath)) return false;
  try {
    const realRoot = realpathSync(root);
    const realPath = realpathSync(absolute);
    const fromRealRoot = relative(realRoot, realPath);
    return (
      fromRealRoot !== ".." &&
      !fromRealRoot.startsWith(`..${sep}`) &&
      !isAbsolute(fromRealRoot)
    );
  } catch {
    return false;
  }
}

function scratchRelativePath(
  scratch: string,
  candidate: string,
): string | undefined {
  const root = resolve(scratch);
  const absolute = isAbsolute(candidate)
    ? resolve(candidate)
    : resolve(root, candidate);
  const fromRoot = relative(root, absolute);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    return undefined;
  }
  return fromRoot;
}

function namedInputSet(
  input: BenchmarkPreparationEventValidationInput,
): ReadonlySet<string> {
  return new Set(
    input.namedInputs.flatMap((path) => {
      const relativePath = scratchRelativePath(input.scratch, path);
      return relativePath === undefined ? [] : [relativePath];
    }),
  );
}

function validateNamedFile(
  candidate: string,
  input: BenchmarkPreparationEventValidationInput,
): string | undefined {
  const namedInputs = namedInputSet(input);
  if (!pathWithinScratch(input.scratch, candidate, namedInputs)) {
    return `command references an unnamed or external scratch file: ${candidate}`;
  }
  if (!namedScratchFile(input.scratch, candidate, namedInputs)) {
    return `command references a non-file scratch path: ${candidate}`;
  }
  return undefined;
}

function commandArguments(
  command: string,
  input: BenchmarkPreparationEventValidationInput,
): Either.Either<readonly string[], string> {
  const parsed = parseStrictReadCommand(command);
  if (Either.isLeft(parsed)) return Either.left(parsed.left);
  const { executable, args, words } = parsed.right;
  const validateFiles = (files: readonly string[]): string | undefined => {
    for (const file of files) {
      const issue = validateNamedFile(file, input);
      if (issue !== undefined) return issue;
    }
    return undefined;
  };
  switch (executable) {
    case "cat":
    case "sha256sum": {
      const files = args.filter((value) => !value.startsWith("-"));
      if (files.length === 0 || files.length !== args.length) {
        return Either.left(`${executable} has unsupported arguments`);
      }
      const issue = validateFiles(files);
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
    case "head":
    case "tail": {
      const files =
        args[0] === "-n"
          ? isCanonicalUnsignedDecimal(args[1])
            ? args.slice(2)
            : []
          : args;
      if (files.length === 0 || files.some((value) => value.startsWith("-"))) {
        return Either.left(`${executable} has unsupported arguments`);
      }
      const issue = validateFiles(files);
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
    case "sed": {
      const [option, script, ...files] = args;
      if (
        option !== "-n" ||
        script === undefined ||
        !/^\d+(?:,\d+)?p$/.test(script) ||
        files.length === 0
      ) {
        return Either.left(
          "sed must use only a numeric print range and named files",
        );
      }
      const issue = validateFiles(files);
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
    case "wc": {
      const files = args.filter((value) => !value.startsWith("-"));
      const options = args.filter((value) => value.startsWith("-"));
      if (
        files.length === 0 ||
        options.some((value) => !["-c", "-l", "-m", "-w"].includes(value))
      ) {
        return Either.left("wc has unsupported arguments");
      }
      const issue = validateFiles(files);
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
    case "od": {
      const files = args.filter((value) => !value.startsWith("-"));
      const options = args.filter((value) => value.startsWith("-"));
      if (
        files.length !== 1 ||
        options.some((value) => !/^(?:-An|-tx[0-9]+|-N\d+|-j\d+)$/.test(value))
      ) {
        return Either.left("od has unsupported arguments");
      }
      const issue = validateFiles(files);
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
    case "rg": {
      let operandIndex = 0;
      while (operandIndex < args.length) {
        const argument = args[operandIndex] ?? "";
        if (argument === "--") {
          operandIndex += 1;
          break;
        }
        if (BENCHMARK_PREPARATION_RG_COUNT_OPTIONS.has(argument)) {
          const count = args[operandIndex + 1];
          if (!isCanonicalUnsignedDecimal(count)) {
            return Either.left("rg has unsupported arguments");
          }
          operandIndex += 2;
          continue;
        }
        if (BENCHMARK_PREPARATION_RG_OPTIONS.has(argument)) {
          operandIndex += 1;
          continue;
        }
        if (argument.startsWith("-")) {
          return Either.left("rg has unsupported arguments");
        }
        break;
      }
      const operands = args.slice(operandIndex);
      if (operands.length < 2) {
        return Either.left("rg must name a scratch file after its pattern");
      }
      const issue = validateFiles(operands.slice(1));
      return issue === undefined ? Either.right(words) : Either.left(issue);
    }
  }
  return Either.left(
    `preparation command uses an unsupported read operation: ${executable}`,
  );
}

function validatePreparationStructuredPath(
  value: string,
  input: BenchmarkPreparationEventValidationInput,
): string | undefined {
  const namedInputs = new Set(
    input.namedInputs.map((path) =>
      relative(resolve(input.scratch), resolve(path)),
    ),
  );
  return pathWithinScratch(input.scratch, value, namedInputs)
    ? undefined
    : `tool references path outside scratch: ${value}`;
}

function validatePreparationEventItem(
  item: Readonly<Record<string, unknown>>,
  eventType: "item.started" | "item.completed",
  input: BenchmarkPreparationEventValidationInput,
): string | undefined {
  const type = item.type;
  if (typeof type !== "string") return "event item has no type";
  if (type === "command_execution") {
    if (typeof item.command !== "string")
      return "command execution has no structured command";
    const command = commandArguments(item.command, input);
    if (Either.isLeft(command)) return command.left;
    if (eventType === "item.completed") {
      const completed = item.status === "completed" && item.exit_code === 0;
      const noRipgrepMatches =
        command.right[0] === "rg" &&
        item.status === "failed" &&
        item.exit_code === 1;
      if (!completed && !noRipgrepMatches) {
        return "preparation read command did not complete successfully";
      }
    }
    if (typeof item.cwd === "string") {
      const cwdIssue = validatePreparationStructuredPath(item.cwd, input);
      if (cwdIssue !== undefined) return cwdIssue;
    } else if ("cwd" in item) {
      return "command execution has a non-string cwd";
    }
    for (const key of Object.keys(item)) {
      if (!BENCHMARK_PREPARATION_ITEM_KEYS.has(key)) {
        return `command execution has an unsupported field: ${key}`;
      }
    }
    return undefined;
  }
  if (BENCHMARK_PREPARATION_SAFE_ITEM_TYPES.has(type)) return undefined;
  return `preparation event uses an unsupported tool item: ${type}`;
}

/**
 * Validate first-party preparation telemetry as an execution boundary. Model
 * prose is intentionally ignored; structured tool items, path-bearing fields,
 * and terminal first-party failure records can make this check fail.
 */
export function validateBenchmarkPreparationEventStream(
  input: BenchmarkPreparationEventValidationInput,
): Either.Either<void, string> {
  const parsed = readCodexEvents(input.eventPath);
  if (parsed.tag === "invalid") return Either.left(parsed.message);
  const invocationFailure = firstPartyCodexFailureReason(parsed.events);
  if (Either.isLeft(invocationFailure)) return invocationFailure;
  let completedReadCount = 0;
  for (const [index, event] of parsed.events.entries()) {
    if (!isJsonRecord(event)) {
      return Either.left(
        `Preparation event line ${String(index + 1)} must be a JSON record.`,
      );
    }
    const eventType = event.type;
    if (typeof eventType !== "string") {
      return Either.left(
        `Preparation event line ${String(index + 1)} has no event type.`,
      );
    }
    if (eventType === "error" || eventType === "turn.failed") {
      continue;
    }
    if (!BENCHMARK_PREPARATION_EVENT_TYPES.has(eventType)) {
      return Either.left(
        `Preparation event line ${String(index + 1)} has an unsupported event type: ${eventType}`,
      );
    }
    if (eventType === "item.started" || eventType === "item.completed") {
      if (!isJsonRecord(event.item)) {
        return Either.left(
          `Preparation event line ${String(index + 1)} has no item.`,
        );
      }
      const itemIssue = validatePreparationEventItem(
        event.item,
        eventType,
        input,
      );
      if (itemIssue !== undefined) {
        return Either.left(
          `Preparation event line ${String(index + 1)}: ${itemIssue}`,
        );
      }
      if (
        eventType === "item.completed" &&
        event.item.type === "command_execution"
      ) {
        completedReadCount += 1;
      }
    }
  }
  if (Option.isSome(invocationFailure.right)) {
    return Either.left(
      `Preparation model invocation failed: ${invocationFailure.right.value}`,
    );
  }
  if (completedReadCount === 0) {
    return Either.left(
      "Preparation event stream has no successfully completed scratch read.",
    );
  }
  return Either.right(undefined);
}

function assertBenchmarkPreparationEventStream(
  input: BenchmarkPreparationEventValidationInput,
): void {
  const validation = validateBenchmarkPreparationEventStream(input);
  if (Either.isLeft(validation)) fail(validation.left);
}

type StructuredCallResult<A> = Readonly<{
  readonly value: A;
  readonly eventPath: string;
  readonly currentEntry?: CurrentModelInvocationLedgerEntry;
  readonly auxiliaryEntry?: BenchmarkAuxiliaryModelInvocationLedgerEntry;
}>;

function runStructuredCall<A, I>(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly preparation: FixedBenchmarkPreparationState;
  readonly contextPath: string;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly ordinal: number;
  readonly phase:
    | "scenarioGeneration"
    | "scenarioCompositeReview"
    | "scenarioSetupNeutralAuthoring"
    | "scenarioSetupControllerAuthoring";
  readonly schema: Schema.Schema<A, I>;
  readonly prompt: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly stagePlanReason: string;
  readonly gitSha: GitSha;
  readonly scenarioId: ScenarioId;
}): StructuredCallResult<A> {
  assertPreparationState(input.preparation, input.profilePaths);
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-benchmark-call-"));
  const local = copyBenchmarkCallInputs({
    scratch,
    contextPath: input.contextPath,
    bundle: input.bundle,
  });
  const schemaPath = resolve(scratch, "output-schema.json");
  const outputPath = resolve(scratch, "output.json");
  const logPath = resolve(
    input.profilePaths.root,
    "logs",
    String(input.ordinal).padStart(2, "0") + "-" + input.phase + ".log",
  );
  const events = eventPath(input.profilePaths, input.ordinal, input.phase);
  writeJsonExclusive(schemaPath, codexOutputJsonSchema(input.schema));
  const readableFiles = scratchNamedFiles(scratch);
  const namedInputs = readableFiles.map((path) => resolve(scratch, path));
  try {
    const result = runCodexInvocation({
      args: fixedBenchmarkCodexArgs(
        scratch,
        input.model,
        input.reasoningEffort,
        localBenchmarkCallPrompt({
          ...input,
          scratch,
          readableFiles,
          local,
        }),
        schemaPath,
        outputPath,
        FIXED_BENCHMARK_PREPARATION_SANDBOX,
      ),
      cwd: scratch,
      env: process.env,
      eventPath: events,
      logPath,
      ledgerPath: input.profilePaths.currentLedger,
      phase: input.phase,
      stagePlanReason: input.stagePlanReason,
      scenarioId: input.scenarioId,
      gitSha: input.gitSha,
      fallbackInvocationId:
        input.scenarioId + "-" + input.phase + "-" + String(input.ordinal),
      model: input.model,
      reasoningEffort: input.reasoningEffort,
    });
    assertBenchmarkPreparationEventStream({
      eventPath: events,
      scratch,
      namedInputs,
    });
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null) fail("Codex stopped by " + result.signal + ".");
    if (result.status !== 0) {
      fail(
        input.phase +
          " Codex invocation exited with status " +
          String(result.status) +
          ".",
      );
    }
    const decoded = Schema.decodeUnknownEither(
      Schema.Struct({ result: input.schema }),
      { onExcessProperty: "error" },
    )(JSON.parse(readFileSync(outputPath, "utf8")));
    if (Either.isLeft(decoded)) fail(decoded.left.message);
    appendCopiedLedgerEntry(
      input.profilePaths.currentLedger,
      input.profilePaths.benchmarkLedger,
    );
    const row = readJsonLines(input.profilePaths.currentLedger).at(-1);
    if (row === undefined) fail("Current invocation row was not retained.");
    const entry = parseModelInvocationLedgerEntry(row);
    if (Either.isLeft(entry) || entry.right.schemaVersion !== 2) {
      fail("Current invocation row is not schema v2.");
    }
    return {
      value: decoded.right.result,
      eventPath: events,
      currentEntry: entry.right,
    };
  } finally {
    assertPreparationState(input.preparation, input.profilePaths);
    rmSync(scratch, { recursive: true });
  }
}

function runCompositeReviewCall(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly preparation: FixedBenchmarkPreparationState;
  readonly ordinal: number;
  readonly profile: FixedBenchmarkProfile;
  readonly contextPath: string;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly prompt: string;
  readonly gitSha: GitSha;
}): StructuredCallResult<unknown> {
  const common = {
    profilePaths: input.profilePaths,
    preparation: input.preparation,
    contextPath: input.contextPath,
    bundle: input.bundle,
    ordinal: input.ordinal,
    phase: "scenarioCompositeReview" as const,
    prompt: input.prompt,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCompositeReview,
    gitSha: input.gitSha,
    scenarioId: fixedScenarioId(),
  };
  return input.profile === "documentDeclarationSet"
    ? runStructuredCall({
        ...common,
        schema: HistoricalScenarioCompositeReviewSchema,
      })
    : runStructuredCall({
        ...common,
        schema: CurrentScenarioCompositeReviewSchema,
      });
}

function runAuxiliaryStructuredCall<A, I>(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly preparation: FixedBenchmarkPreparationState;
  readonly contextPath: string;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly ordinal: number;
  readonly kind: BenchmarkAuxiliaryInvocationKind;
  readonly schema: Schema.Schema<A, I>;
  readonly prompt: string;
  readonly gitSha: GitSha;
  readonly scenarioId: ScenarioId;
}): StructuredCallResult<A> {
  assertPreparationState(input.preparation, input.profilePaths);
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-benchmark-aux-"));
  const local = copyBenchmarkCallInputs({
    scratch,
    contextPath: input.contextPath,
    bundle: input.bundle,
  });
  const schemaPath = resolve(scratch, "output-schema.json");
  const outputPath = resolve(scratch, "output.json");
  const logPath = resolve(
    input.profilePaths.root,
    "logs",
    String(input.ordinal).padStart(2, "0") + "-" + input.kind.phase + ".log",
  );
  const events = eventPath(input.profilePaths, input.ordinal, input.kind.phase);
  writeJsonExclusive(schemaPath, codexOutputJsonSchema(input.schema));
  const readableFiles = scratchNamedFiles(scratch);
  const namedInputs = readableFiles.map((path) => resolve(scratch, path));
  const execution =
    input.kind.responsibility === "scenarioQuality"
      ? { model: "gpt-5.6-luna", reasoningEffort: "max" }
      : { model: "gpt-5.6-sol", reasoningEffort: "medium" };
  try {
    const result = runBenchmarkAuxiliaryInvocation({
      args: fixedBenchmarkCodexArgs(
        scratch,
        execution.model,
        execution.reasoningEffort,
        localBenchmarkCallPrompt({
          ...input,
          scratch,
          readableFiles,
          local,
        }),
        schemaPath,
        outputPath,
        FIXED_BENCHMARK_PREPARATION_SANDBOX,
      ),
      cwd: scratch,
      env: process.env,
      eventPath: events,
      logPath,
      ledgerPath: input.profilePaths.auxiliaryLedger,
      kind: input.kind,
      stagePlanReason:
        input.kind.responsibility === "scenarioQuality"
          ? "The document-declaration benchmark retains the separate historical scenario-quality readiness call."
          : "The document-declaration benchmark retains redundant character preparation calls.",
      scenarioId: input.scenarioId,
      gitSha: input.gitSha,
      fallbackInvocationId:
        input.scenarioId + "-" + input.kind.phase + "-" + String(input.ordinal),
      model: execution.model,
      reasoningEffort: execution.reasoningEffort,
    });
    assertBenchmarkPreparationEventStream({
      eventPath: events,
      scratch,
      namedInputs,
    });
    if (Either.isLeft(result)) fail(result.left);
    if (result.right.error !== undefined) throw result.right.error;
    if (result.right.signal !== null)
      fail("Codex stopped by " + result.right.signal + ".");
    if (result.right.status !== 0) {
      fail(
        input.kind.phase +
          " Codex invocation exited with status " +
          String(result.right.status) +
          ".",
      );
    }
    const decoded = Schema.decodeUnknownEither(
      Schema.Struct({ result: input.schema }),
      { onExcessProperty: "error" },
    )(JSON.parse(readFileSync(outputPath, "utf8")));
    if (Either.isLeft(decoded)) fail(decoded.left.message);
    appendCopiedLedgerEntry(
      input.profilePaths.auxiliaryLedger,
      input.profilePaths.benchmarkLedger,
    );
    const row = readJsonLines(input.profilePaths.auxiliaryLedger).at(-1);
    if (row === undefined) fail("Auxiliary invocation row was not retained.");
    const entry = parseBenchmarkModelInvocationLedgerEntry(row);
    if (Either.isLeft(entry)) fail(entry.left.message);
    return {
      value: decoded.right.result,
      eventPath: events,
      auxiliaryEntry: entry.right,
    };
  } finally {
    assertPreparationState(input.preparation, input.profilePaths);
    rmSync(scratch, { recursive: true });
  }
}

const GenerationPreparationSchema = Schema.Struct({
  scenarioId: Schema.Literal(FIXED_SCENARIO_ID),
  scenario: Schema.String,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
  stageFacts: ScenarioStageFactsSchema,
});

/**
 * Profile-aware review boundary. Baseline review results intentionally remain
 * four-field historical composites; bounded results require the fifth field.
 */
export function validateBenchmarkReviewAuthority(input: {
  readonly profile: FixedBenchmarkProfile;
  readonly reviewStage: "milestone" | "final";
  readonly result: unknown;
  readonly outputJsonSchema: unknown;
}): Either.Either<void, string> {
  if (
    input.profile === "boundedCapabilityProjection" &&
    input.reviewStage === "milestone"
  ) {
    return Either.left(
      "The bounded capability-projection benchmark retains only its final composite review.",
    );
  }
  const parsed =
    input.profile === "documentDeclarationSet"
      ? Schema.decodeUnknownEither(HistoricalScenarioCompositeReviewSchema, {
          onExcessProperty: "error",
        })(input.result)
      : Schema.decodeUnknownEither(CurrentScenarioCompositeReviewSchema, {
          onExcessProperty: "error",
        })(input.result);
  if (Either.isLeft(parsed)) return Either.left(parsed.left.message);
  const expectedOutputJsonSchema =
    input.profile === "documentDeclarationSet"
      ? codexOutputJsonSchema(HistoricalScenarioCompositeReviewSchema)
      : codexOutputJsonSchema(CurrentScenarioCompositeReviewSchema);
  if (
    sha256Canonical(input.outputJsonSchema) !==
    sha256Canonical(expectedOutputJsonSchema)
  ) {
    return Either.left("Benchmark review retained the wrong output schema.");
  }
  if (
    input.profile === "documentDeclarationSet" &&
    "scenarioQuality" in parsed.right
  ) {
    return Either.left(
      "Baseline composite review must not include scenarioQuality.",
    );
  }
  if (
    input.profile === "boundedCapabilityProjection" &&
    !("scenarioQuality" in parsed.right)
  ) {
    return Either.left(
      "Bounded composite review must include scenarioQuality.",
    );
  }
  return Either.right(undefined);
}

function reviewPrompt(
  profile: FixedBenchmarkProfile,
  stage: "milestone" | "final",
  contextPath: string,
  bundle: FixedScenarioCanonicalBundle,
): string {
  const fields =
    profile === "documentDeclarationSet"
      ? "raw, contentAvailability, sdkCapability, and artifactPolicy"
      : "raw, contentAvailability, sdkCapability, artifactPolicy, and scenarioQuality";
  const responsibility =
    stage === "milestone"
      ? "This is the initial admission authority, before any profile-specific auxiliary preparation."
      : "This is the final admission authority, after profile-specific review work and immediately before source preparation; independently re-establish every classification.";
  return (
    "Read the exact delivered context at " +
    contextPath +
    ". Review the tracked " +
    FIXED_SCENARIO_ID +
    " scenario for the " +
    stage +
    " stage. Return only JSON with exactly these independent fields: " +
    fields +
    ". " +
    responsibility +
    " Do not rewrite prose, choose tactics, or predict an outcome. The scenario authority is " +
    repoRelative(bundle.paths.scenario) +
    " with SHA-256 " +
    bundle.authorities.scenario.sha256 +
    "."
  );
}

function generationPrompt(
  contextPath: string,
  bundle: FixedScenarioCanonicalBundle,
  facts: ScenarioStageFacts,
): string {
  return (
    "First read SCENARIO.md directly and run sha256sum on SCENARIO.md and SCENARIO_REVIEW.json so the canonical scenario bytes and both hashes cannot be lost to context-output truncation. Then read the exact delivered context at " +
    contextPath +
    ". Return a generation-preparation JSON record for " +
    FIXED_SCENARIO_ID +
    ". Copy the scenario bytes exactly from " +
    repoRelative(bundle.paths.scenario) +
    ", including its final newline; copy its exact scenario and review SHA-256 values. Return these exact typed stage facts: " +
    JSON.stringify(facts) +
    ". Do not edit tracked files."
  );
}

function retainReviewEnvelope(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly profile: FixedBenchmarkProfile;
  readonly stage: "milestone" | "final";
  readonly result: unknown;
  readonly entry: CurrentModelInvocationLedgerEntry;
  readonly eventPath: string;
  readonly prompt: string;
}): string {
  const outputJsonSchema =
    input.profile === "documentDeclarationSet"
      ? codexOutputJsonSchema(HistoricalScenarioCompositeReviewSchema)
      : codexOutputJsonSchema(CurrentScenarioCompositeReviewSchema);
  const valid = validateBenchmarkReviewAuthority({
    profile: input.profile,
    reviewStage: input.stage,
    result: input.result,
    outputJsonSchema,
  });
  if (Either.isLeft(valid)) fail(valid.left);
  const envelope = {
    schemaVersion: 2 as const,
    phase: "scenarioCompositeReview" as const,
    reviewStage: input.stage,
    scenarioId: fixedScenarioId(),
    sourceGitSha: input.entry.gitSha,
    invocationId: input.entry.invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: input.prompt,
    outputJsonSchema,
    result: input.result,
  };
  const parsed = Schema.decodeUnknownEither(RetainedScenarioReviewInputSchema, {
    onExcessProperty: "error",
  })(envelope);
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  const replayPath =
    input.stage === "milestone"
      ? input.profilePaths.milestoneReviewInput
      : input.profilePaths.finalReviewInput;
  writeJsonExclusive(replayPath, parsed.right);
  retainBenchmarkReviewReplayEvents(input.eventPath, replayPath);
  return replayPath;
}

export function retainBenchmarkReviewReplayEvents(
  eventPath: string,
  replayPath: string,
): string {
  const retainedPath = benchmarkReviewReplayEventsPath(replayPath);
  copyFileSync(eventPath, retainedPath, constants.COPYFILE_EXCL);
  return retainedPath;
}

export function benchmarkReviewReplayEventsPath(replayPath: string): string {
  return replayPath.endsWith(".json")
    ? replayPath.slice(0, -".json".length) + ".events.jsonl"
    : replayPath + ".events.jsonl";
}

function retainReadinessEnvelope(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly result: unknown;
  readonly entry: BenchmarkAuxiliaryModelInvocationLedgerEntry;
  readonly prompt: string;
}): string {
  const outputJsonSchema = codexOutputJsonSchema(ScenarioQualityReviewSchema);
  const envelope = {
    schemaVersion: 1 as const,
    profile: "documentDeclarationSet" as const,
    scenarioId: FIXED_SCENARIO_ID,
    responsibility: "scenarioQuality" as const,
    phase: "scenarioReadiness" as const,
    sourceGitSha: input.entry.gitSha,
    invocationId: input.entry.invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: input.prompt,
    outputJsonSchema,
    result: input.result,
  };
  const parsed = Schema.decodeUnknownEither(BenchmarkReadinessInputSchema, {
    onExcessProperty: "error",
  })(envelope);
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  const path = input.profilePaths.readinessInput;
  writeJsonExclusive(path, parsed.right);
  return path;
}

function characterSourceCall(input: {
  readonly paths: FixedBenchmarkProfilePaths;
  readonly preparation: FixedBenchmarkPreparationState;
  readonly ordinal: number;
  readonly profile: FixedBenchmarkProfile;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly gitSha: GitSha;
}): string {
  const scratch = mkdtempSync(
    resolve(tmpdir(), "dnd-fixed-benchmark-characters-"),
  );
  try {
    buildScenarioCharacterDistribution({
      destination: scratch,
      scenarioPath: input.bundle.paths.scenario,
      scenarioReviewPath: input.bundle.paths.scenarioReview,
      contextDelivery: {
        tag: "benchmarkContext",
        profile: input.profile,
        role: "characterAuthoring",
      },
    });
    const sourcePath = resolve(scratch, "characters.ts");
    writeFileSync(sourcePath, readFileSync(input.bundle.paths.characters));
    const events = eventPath(
      input.paths,
      input.ordinal,
      "scenarioCharacterAuthoring",
    );
    const readableFiles = scratchNamedFiles(scratch);
    const namedInputs = readableFiles.map((path) => resolve(scratch, path));
    assertPreparationState(input.preparation, input.paths);
    const result = (() => {
      try {
        return runBenchmarkAuxiliaryInvocation({
          args: fixedBenchmarkCodexArgs(
            scratch,
            "gpt-5.6-sol",
            "medium",
            fixedBenchmarkScratchInputManifestPrompt({
              scratch,
              readableFiles,
              taskPrompt:
                FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS.scenarioCharacterAuthoring,
            }),
            undefined,
            undefined,
            FIXED_BENCHMARK_PREPARATION_SANDBOX,
          ),
          cwd: scratch,
          env: process.env,
          eventPath: events,
          logPath: resolve(
            input.paths.root,
            "logs",
            String(input.ordinal) + "-characters.log",
          ),
          ledgerPath: input.paths.auxiliaryLedger,
          kind: {
            responsibility: "redundantCharacterPreparation",
            phase: "scenarioCharacterAuthoring",
          },
          stagePlanReason:
            "The document-declaration benchmark retains redundant character preparation calls.",
          scenarioId: fixedScenarioId(),
          gitSha: input.gitSha,
          fallbackInvocationId:
            FIXED_SCENARIO_ID + "-redundant-character-" + String(input.ordinal),
          model: "gpt-5.6-sol",
          reasoningEffort: "medium",
        });
      } finally {
        assertPreparationState(input.preparation, input.paths);
      }
    })();
    assertBenchmarkPreparationEventStream({
      eventPath: events,
      scratch,
      namedInputs,
    });
    if (Either.isLeft(result)) fail(result.left);
    if (result.right.status !== 0)
      fail("Redundant character preparation failed.");
    if (
      readFileSync(sourcePath).compare(
        readFileSync(input.bundle.paths.characters),
      ) !== 0
    ) {
      fail("Redundant character preparation changed canonical source bytes.");
    }
    appendCopiedLedgerEntry(
      input.paths.auxiliaryLedger,
      input.paths.benchmarkLedger,
    );
    copyFileSync(
      sourcePath,
      resolve(
        input.paths.authoringDirectory,
        "characters-" + String(input.ordinal) + ".ts",
      ),
      constants.COPYFILE_EXCL,
    );
    return events;
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function setupSourceCalls(input: {
  readonly paths: FixedBenchmarkProfilePaths;
  readonly preparation: FixedBenchmarkPreparationState;
  readonly profile: FixedBenchmarkProfile;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly gitSha: GitSha;
  readonly firstOrdinal: number;
  readonly characters: Extract<
    ScenarioCharacterEvaluation,
    { readonly tag: "ready" }
  >;
}): void {
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-benchmark-setup-"));
  try {
    const statBlocks = scenarioSetupStatBlocks();
    if (statBlocks.tag === "invalid") fail(statBlocks.message);
    buildScenarioSetupDistribution({
      destination: scratch,
      scenarioPath: input.bundle.paths.scenario,
      scenarioReviewPath: input.bundle.paths.scenarioReview,
      statBlocks: statBlocks.statBlocks,
      characterObservation: input.characters.observation,
      contextDelivery: {
        tag: "benchmarkContext",
        profile: input.profile,
        role: "setupAuthoring",
      },
    });
    const sourcePath = resolve(scratch, "setup.ts");
    writeFileSync(sourcePath, readFileSync(input.bundle.paths.setup));
    writeFileSync(
      resolve(scratch, "NEUTRAL_SETUP.ts"),
      readFileSync(input.bundle.paths.setup),
    );
    const readableFiles = scratchNamedFiles(scratch);
    const namedInputs = readableFiles.map((path) => resolve(scratch, path));
    const run = (
      ordinal: number,
      phase:
        | "scenarioSetupNeutralAuthoring"
        | "scenarioSetupControllerAuthoring",
      prompt: string,
    ): void => {
      const events = eventPath(input.paths, ordinal, phase);
      assertPreparationState(input.preparation, input.paths);
      const result = (() => {
        try {
          return runCodexInvocation({
            args: fixedBenchmarkCodexArgs(
              scratch,
              "gpt-5.6-sol",
              "medium",
              fixedBenchmarkScratchInputManifestPrompt({
                scratch,
                readableFiles,
                taskPrompt: prompt,
              }),
              undefined,
              undefined,
              FIXED_BENCHMARK_PREPARATION_SANDBOX,
            ),
            cwd: scratch,
            env: process.env,
            eventPath: events,
            logPath: resolve(
              input.paths.root,
              "logs",
              String(ordinal) + "-" + phase + ".log",
            ),
            ledgerPath: input.paths.currentLedger,
            phase,
            stagePlanReason:
              RAW_SWARM_STAGE_PLAN_REASONS.scenarioSetupAuthoring,
            scenarioId: fixedScenarioId(),
            gitSha: input.gitSha,
            fallbackInvocationId: FIXED_SCENARIO_ID + "-" + phase,
            model: "gpt-5.6-sol",
            reasoningEffort: "medium",
          });
        } finally {
          assertPreparationState(input.preparation, input.paths);
        }
      })();
      assertBenchmarkPreparationEventStream({
        eventPath: events,
        scratch,
        namedInputs,
      });
      if (result.status !== 0) fail(phase + " authoring failed.");
      appendCopiedLedgerEntry(
        input.paths.currentLedger,
        input.paths.benchmarkLedger,
      );
      if (
        readFileSync(sourcePath).compare(
          readFileSync(input.bundle.paths.setup),
        ) !== 0
      ) {
        fail(phase + " changed canonical setup source bytes.");
      }
      copyFileSync(
        sourcePath,
        resolve(input.paths.authoringDirectory, phase + ".ts"),
        constants.COPYFILE_EXCL,
      );
    };
    run(
      input.firstOrdinal,
      "scenarioSetupNeutralAuthoring",
      FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS.scenarioSetupNeutralAuthoring,
    );
    run(
      input.firstOrdinal + 1,
      "scenarioSetupControllerAuthoring",
      FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS.scenarioSetupControllerAuthoring,
    );
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

export function benchmarkCommands(input: {
  readonly runId: string;
  readonly profile: FixedBenchmarkProfile;
  readonly implementationGitSha: GitSha;
  readonly paths: FixedBenchmarkProfilePaths;
  readonly bundle: FixedScenarioCanonicalBundle;
}): Readonly<
  Record<"player" | "replay" | "postPlayReview" | "assemble", string>
> {
  const runId = assertRunId(input.runId);
  const contextPlayer = repoRelative(
    resolve(input.paths.contextDirectory, "player.md"),
  );
  const player =
    "pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts " +
    FIXED_SCENARIO_ID +
    " --output-path " +
    repoRelative(input.paths.playerDirectory) +
    " --scenario-path " +
    repoRelative(input.bundle.paths.scenario) +
    " --scenario-review-path " +
    repoRelative(input.bundle.paths.scenarioReview) +
    " --characters-path " +
    repoRelative(input.bundle.paths.characters) +
    " --setup-path " +
    repoRelative(input.bundle.paths.setup) +
    " --stage-plan-path " +
    repoRelative(input.paths.stagePlan) +
    " --stage-plan-findings-path " +
    repoRelative(input.paths.stagePlanFindings) +
    " --implementation-git-sha " +
    input.implementationGitSha +
    " --benchmark-profile " +
    input.profile +
    " --benchmark-context-path " +
    contextPlayer +
    " --instructional-isolation";
  return {
    player,
    replay:
      "pnpm exec tsx scripts/raw-swarm/replay-sdk-player.ts " +
      repoRelative(input.paths.playerDirectory),
    postPlayReview:
      "RAW_REVIEW_IMPLEMENTATION_GIT_SHA=" +
      input.implementationGitSha +
      " RAW_REVIEW_CONTEXT_PROFILE=" +
      input.profile +
      " RAW_REVIEW_CONTEXT_ROLE=postPlayReview" +
      " RAW_REVIEW_CONTEXT_PATH=" +
      repoRelative(resolve(input.paths.contextDirectory, "postPlayReview.md")) +
      " scripts/raw-swarm/run-raw-review.sh scripts/raw-swarm/reviews/sdk-player.prompt.txt " +
      repoRelative(input.paths.playerDirectory) +
      "/evidence/sdk-calls.jsonl " +
      repoRelative(input.paths.postPlayReview) +
      " " +
      repoRelative(input.paths.postPlayLog),
    assemble:
      "pnpm exec tsx scripts/raw-swarm/fixed-scenario-benchmark.ts assemble " +
      runId +
      " " +
      input.profile,
  };
}

async function prepareProfile(input: {
  readonly runId: string;
  readonly profile: FixedBenchmarkProfile;
}): Promise<void> {
  const bundle = fixedScenarioCanonicalBundle();
  const revision = currentGitRevision();
  if (revision.tag === "dirty")
    fail("Fixed benchmark preparation requires a clean Git worktree.");
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
  const paths = fixedBenchmarkProfilePaths(
    assertRunId(input.runId),
    input.profile,
  );
  initializeFixedBenchmarkProfileDirectory(paths.root);
  mkdirSync(paths.contextDirectory, { recursive: true });
  mkdirSync(paths.eventDirectory, { recursive: true });
  mkdirSync(paths.reviewDirectory, { recursive: true });
  mkdirSync(paths.authoringDirectory, { recursive: true });
  mkdirSync(resolve(paths.root, "logs"), { recursive: true });
  initializeLedger(paths.benchmarkLedger);
  initializeLedger(paths.currentLedger);
  initializeLedger(paths.auxiliaryLedger);
  const facts = fixedScenarioStageFacts();
  retainStagePlan(bundle, paths);
  const contextManifest = writeProfileContexts(input.profile, paths);
  const scenarioBundle = {
    ...bundle.authorities,
    stageFacts: artifactAuthority(repoRelative(paths.stageFacts)),
    stagePlan: artifactAuthority(repoRelative(paths.stagePlan)),
  };
  writeJsonExclusive(resolve(paths.root, "run.json"), {
    schemaVersion: 1,
    runId: input.runId,
    profile: input.profile,
    scenarioId: FIXED_SCENARIO_ID,
    implementationGitSha: gitSha.right,
    scenarioBundle,
    contextManifest,
  });
  const preparation = preparationState(bundle, paths, gitSha.right);
  assertPreparationState(preparation, paths);
  const generationContext = resolve(
    paths.contextDirectory,
    "scenarioGeneration.md",
  );
  for (const ordinal of [1, 2] as const) {
    const result = runStructuredCall({
      profilePaths: paths,
      preparation,
      contextPath: generationContext,
      bundle,
      ordinal,
      phase: "scenarioGeneration",
      schema: GenerationPreparationSchema,
      prompt: generationPrompt(generationContext, bundle, facts),
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioGeneration,
      gitSha: gitSha.right,
      scenarioId: fixedScenarioId(),
    });
    if (
      result.value.scenario !== readFileSync(bundle.paths.scenario, "utf8") ||
      result.value.scenarioSha256 !== bundle.authorities.scenario.sha256 ||
      result.value.scenarioReviewSha256 !==
        bundle.authorities.scenarioReview.sha256 ||
      sha256Canonical(result.value.stageFacts) !== sha256Canonical(facts)
    ) {
      fail(
        "Generation preparation did not reproduce the exact tracked bundle.",
      );
    }
  }
  const reviewContext = resolve(paths.contextDirectory, "scenarioReview.md");
  if (input.profile === "documentDeclarationSet") {
    const milestone = runCompositeReviewCall({
      profilePaths: paths,
      preparation,
      ordinal: 3,
      profile: input.profile,
      contextPath: reviewContext,
      bundle,
      prompt: reviewPrompt(input.profile, "milestone", reviewContext, bundle),
      gitSha: gitSha.right,
    });
    if (milestone.currentEntry === undefined)
      fail("Milestone review row is missing.");
    retainReviewEnvelope({
      profilePaths: paths,
      profile: input.profile,
      stage: "milestone",
      result: milestone.value,
      entry: milestone.currentEntry,
      eventPath: milestone.eventPath,
      prompt: reviewPrompt(input.profile, "milestone", reviewContext, bundle),
    });
  }
  if (input.profile === "documentDeclarationSet") {
    const readiness = runAuxiliaryStructuredCall({
      profilePaths: paths,
      preparation,
      contextPath: reviewContext,
      bundle,
      ordinal: 4,
      kind: { responsibility: "scenarioQuality", phase: "scenarioReadiness" },
      schema: ScenarioQualityReviewSchema,
      prompt:
        "Read " +
        reviewContext +
        " and return the separate historical scenario-quality readiness result. Do not add it to a composite review.",
      gitSha: gitSha.right,
      scenarioId: fixedScenarioId(),
    });
    writeJsonExclusive(paths.readinessResult, readiness.value);
    if (readiness.auxiliaryEntry === undefined) {
      fail("Scenario readiness row is missing.");
    }
    retainReadinessEnvelope({
      profilePaths: paths,
      result: readiness.value,
      entry: readiness.auxiliaryEntry,
      prompt:
        "Read " +
        reviewContext +
        " and return the separate historical scenario-quality readiness result. Do not add it to a composite review.",
    });
  }
  const finalOrdinal = input.profile === "documentDeclarationSet" ? 5 : 3;
  const final = runCompositeReviewCall({
    profilePaths: paths,
    preparation,
    ordinal: finalOrdinal,
    profile: input.profile,
    contextPath: reviewContext,
    bundle,
    prompt: reviewPrompt(input.profile, "final", reviewContext, bundle),
    gitSha: gitSha.right,
  });
  if (final.currentEntry === undefined) fail("Final review row is missing.");
  retainReviewEnvelope({
    profilePaths: paths,
    profile: input.profile,
    stage: "final",
    result: final.value,
    entry: final.currentEntry,
    eventPath: final.eventPath,
    prompt: reviewPrompt(input.profile, "final", reviewContext, bundle),
  });
  const characterResult = await evaluateScenarioCharacters(
    bundle.paths.characters,
  );
  if (characterResult.tag !== "ready")
    fail("Tracked characters are not ready.");
  if (input.profile === "documentDeclarationSet") {
    characterSourceCall({
      paths,
      preparation,
      ordinal: 6,
      profile: input.profile,
      bundle,
      gitSha: gitSha.right,
    });
    characterSourceCall({
      paths,
      preparation,
      ordinal: 7,
      profile: input.profile,
      bundle,
      gitSha: gitSha.right,
    });
  }
  setupSourceCalls({
    paths,
    preparation,
    profile: input.profile,
    bundle,
    gitSha: gitSha.right,
    firstOrdinal: input.profile === "documentDeclarationSet" ? 8 : 4,
    characters: characterResult,
  });
  assertFixedScenarioCanonicalBundle(bundle);
  const commands = benchmarkCommands({
    runId: input.runId,
    profile: input.profile,
    implementationGitSha: gitSha.right,
    paths,
    bundle,
  });
  writeJsonExclusive(paths.commands, {
    schemaVersion: 1,
    runId: input.runId,
    profile: input.profile,
    scenarioId: FIXED_SCENARIO_ID,
    commands,
  });
  console.log(JSON.stringify(commands, null, 2));
}

function eventAuthorityForHash(
  candidates: readonly string[],
  sha256: string,
): ArtifactAuthority {
  for (const candidate of candidates) {
    const authority = artifactAuthority(repoRelative(candidate));
    if (authority.sha256 === sha256) return authority;
  }
  return fail("No event authority matches invocation hash " + sha256 + ".");
}

function validateRetainedReviewAuthority(
  profile: FixedBenchmarkProfile,
  path: string,
  stage: "milestone" | "final",
  implementationGitSha: GitSha,
): void {
  if (!existsSync(path)) fail("Missing retained " + stage + " review input.");
  const parsed = Schema.decodeUnknownEither(RetainedScenarioReviewInputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(path, "utf8")));
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  if (
    parsed.right.scenarioId !== FIXED_SCENARIO_ID ||
    parsed.right.reviewStage !== stage ||
    parsed.right.sourceGitSha !== implementationGitSha
  ) {
    fail(
      "Retained review input is bound to a different scenario, stage, or implementation revision.",
    );
  }
  const valid = validateBenchmarkReviewAuthority({
    profile,
    reviewStage: stage,
    result: parsed.right.result,
    outputJsonSchema: parsed.right.outputJsonSchema,
  });
  if (Either.isLeft(valid)) fail(valid.left);
}

function validateRetainedReadinessAuthority(
  profile: FixedBenchmarkProfile,
  paths: FixedBenchmarkProfilePaths,
  implementationGitSha: GitSha,
): void {
  if (profile !== "documentDeclarationSet") return;
  if (!existsSync(paths.readinessInput))
    fail("Missing retained scenario readiness input.");
  if (!existsSync(paths.readinessResult))
    fail("Missing retained scenario readiness result.");
  const parsed = Schema.decodeUnknownEither(BenchmarkReadinessInputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(paths.readinessInput, "utf8")));
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  if (
    parsed.right.scenarioId !== FIXED_SCENARIO_ID ||
    parsed.right.sourceGitSha !== implementationGitSha
  ) {
    fail(
      "Retained scenario readiness is bound to a different scenario or implementation revision.",
    );
  }
  const result = JSON.parse(readFileSync(paths.readinessResult, "utf8"));
  if (sha256Canonical(result) !== sha256Canonical(parsed.right.result)) {
    fail(
      "Retained scenario readiness result does not match its input envelope.",
    );
  }
  if (
    sha256Canonical(parsed.right.outputJsonSchema) !==
    sha256Canonical(codexOutputJsonSchema(ScenarioQualityReviewSchema))
  ) {
    fail("Retained scenario readiness used the wrong output schema.");
  }
}

function validateContextDeliveryEvidence(input: {
  readonly path: string;
  readonly profile: FixedBenchmarkProfile;
  readonly role: "player" | "postPlayReview";
  readonly manifest: Schema.Schema.Type<
    typeof BenchmarkContextSourceManifestDocumentSchema
  >;
}): void {
  if (!existsSync(input.path)) {
    fail(`Missing retained ${input.role} context-delivery evidence.`);
  }
  const parsed = Schema.decodeUnknownEither(
    BenchmarkContextDeliveryEvidenceSchema,
    { onExcessProperty: "error" },
  )(JSON.parse(readFileSync(input.path, "utf8")));
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  if (
    parsed.right.profile !== input.profile ||
    parsed.right.role !== input.role
  ) {
    fail(
      `Retained ${input.role} context delivery is bound to another profile or role.`,
    );
  }
  const source = input.manifest.sources.find(({ role }) => role === input.role);
  if (source === undefined) {
    fail(`Context manifest has no ${input.role} authority.`);
  }
  if (
    parsed.right.path !== source.authority.path ||
    parsed.right.byteLength !== source.authority.byteLength ||
    parsed.right.sha256 !== source.authority.sha256
  ) {
    fail(
      `Retained ${input.role} context delivery does not match its manifest authority.`,
    );
  }
  const actual = artifactAuthority(source.authority.path);
  if (
    actual.path !== source.authority.path ||
    actual.byteLength !== source.authority.byteLength ||
    actual.sha256 !== source.authority.sha256
  ) {
    fail(`Context manifest ${input.role} authority is no longer canonical.`);
  }
}

function assembleProfile(runId: string, profile: FixedBenchmarkProfile): void {
  const bundle = fixedScenarioCanonicalBundle();
  const paths = fixedBenchmarkProfilePaths(assertRunId(runId), profile);
  const runDescriptor = Schema.decodeUnknownEither(
    BenchmarkRunDescriptorSchema,
    { onExcessProperty: "error" },
  )(JSON.parse(readFileSync(paths.runDescriptor, "utf8")));
  if (Either.isLeft(runDescriptor)) fail(runDescriptor.left.message);
  if (
    runDescriptor.right.runId !== runId ||
    runDescriptor.right.profile !== profile ||
    runDescriptor.right.scenarioId !== FIXED_SCENARIO_ID
  ) {
    fail(
      "Fixed benchmark run descriptor is bound to another run, profile, or scenario.",
    );
  }
  const plan = validateScenarioStagePlan(
    JSON.parse(readFileSync(paths.stagePlan, "utf8")),
  );
  if (Either.isLeft(plan)) fail(plan.left);
  const preparedBundle = {
    scenario: bundle.authorities.scenario,
    scenarioReview: bundle.authorities.scenarioReview,
    stageFacts: artifactAuthority(repoRelative(paths.stageFacts)),
    stagePlan: artifactAuthority(repoRelative(paths.stagePlan)),
    characters: bundle.authorities.characters,
    setup: bundle.authorities.setup,
  };
  const contextManifestAuthority = artifactAuthority(
    repoRelative(paths.contextManifest),
  );
  const contextManifest = Schema.decodeUnknownEither(
    BenchmarkContextSourceManifestDocumentSchema,
    { onExcessProperty: "error" },
  )(JSON.parse(readFileSync(paths.contextManifest, "utf8")));
  if (Either.isLeft(contextManifest)) fail(contextManifest.left.message);
  const playerContextDelivery = resolve(
    paths.playerDirectory,
    "evidence/context-delivery.json",
  );
  if (!existsSync(playerContextDelivery)) {
    fail(
      "Every assembly-eligible benchmark path requires retained player context-delivery evidence.",
    );
  }
  validateContextDeliveryEvidence({
    path: playerContextDelivery,
    profile,
    role: "player",
    manifest: contextManifest.right,
  });
  const transcript = resolve(paths.playerDirectory, "evidence/sdk-calls.jsonl");
  const observations = resolve(
    paths.playerDirectory,
    "evidence/observations.jsonl",
  );
  const frozenPrefix = resolve(
    paths.playerDirectory,
    "evidence/frozen-prefix.json",
  );
  const finalArtifact = resolve(paths.playerDirectory, "evidence/final.json");
  const replay = resolve(paths.playerDirectory, "evidence/replay-result.json");
  const postLedger =
    paths.postPlayReview.slice(0, -".json".length) + ".invocations.jsonl";
  const postPlayRan =
    existsSync(paths.postPlayReview) ||
    existsSync(postLedger) ||
    existsSync(paths.postPlayLog) ||
    existsSync(paths.postPlayLog + ".events.jsonl");
  if (existsSync(paths.postPlayContextDelivery)) {
    validateContextDeliveryEvidence({
      path: paths.postPlayContextDelivery,
      profile,
      role: "postPlayReview",
      manifest: contextManifest.right,
    });
  } else if (postPlayRan) {
    fail(
      "A benchmark path that ran post-play review requires retained post-play context-delivery evidence.",
    );
  }
  if (
    sha256Canonical(runDescriptor.right.scenarioBundle) !==
      sha256Canonical(preparedBundle) ||
    sha256Canonical(runDescriptor.right.contextManifest) !==
      sha256Canonical(contextManifestAuthority)
  ) {
    fail(
      "Fixed benchmark run descriptor does not match retained preparation authorities.",
    );
  }
  if (!existsSync(transcript) || !existsSync(frozenPrefix)) {
    fail(
      "Player transcript and frozen-prefix authorities are required before assembly.",
    );
  }
  const derivedOutcome = deriveBenchmarkPathOutcome({
    transcriptPath: repoRelative(transcript),
    frozenPrefixPath: repoRelative(frozenPrefix),
    continuationObservationPath: repoRelative(observations),
    finalArtifactPath: repoRelative(finalArtifact),
  });
  if (Either.isLeft(derivedOutcome)) fail(derivedOutcome.left);
  const completed = derivedOutcome.right.tag === "completed";
  if (
    completed &&
    (!existsSync(replay) ||
      !existsSync(paths.postPlayReview) ||
      !existsSync(paths.postPlayContextDelivery) ||
      !existsSync(postLedger))
  ) {
    fail(
      "A completed benchmark path requires replay and post-play authorities before assembly.",
    );
  }
  const reviewPlan = benchmarkReviewPlan(profile);
  const reviewStages = reviewPlan.stages;
  for (const stage of reviewStages) {
    validateRetainedReviewAuthority(
      profile,
      stage === "milestone"
        ? paths.milestoneReviewInput
        : paths.finalReviewInput,
      stage,
      runDescriptor.right.implementationGitSha,
    );
  }
  validateRetainedReadinessAuthority(
    profile,
    paths,
    runDescriptor.right.implementationGitSha,
  );
  const benchmarkLedger = artifactAuthority(
    repoRelative(paths.benchmarkLedger),
  );
  const playerLedgerPath = resolve(
    paths.playerDirectory,
    "evidence/invocations.jsonl",
  );
  const ledgers = [
    benchmarkLedger,
    ...(existsSync(playerLedgerPath)
      ? [artifactAuthority(repoRelative(playerLedgerPath))]
      : []),
    ...(existsSync(postLedger)
      ? [artifactAuthority(repoRelative(postLedger))]
      : []),
  ] as const;
  const values = ledgers.flatMap((authority) => readJsonLines(authority.path));
  const invocations = values.flatMap(
    (value): readonly FixedBenchmarkInvocation[] => {
      const current = parseModelInvocationLedgerEntry(value);
      if (Either.isRight(current)) {
        if (current.right.schemaVersion !== 2) {
          return fail(
            "Historical v1 invocation rows cannot enter schema-3 assembly.",
          );
        }
        return [current.right];
      }
      const auxiliary = parseBenchmarkModelInvocationLedgerEntry(value);
      if (Either.isRight(auxiliary)) return [auxiliary.right];
      return fail("A retained benchmark invocation row is invalid.");
    },
  );
  if (
    new Set(invocations.map(({ eventsSha256 }) => eventsSha256)).size !==
    invocations.length
  ) {
    fail(
      "Schema-3 assembly requires one distinct event authority per invocation.",
    );
  }
  const retainedInvocations = nonEmpty(invocations, "invocations");
  const eventCandidates = [
    ...reviewStages.map((stage) =>
      benchmarkReviewReplayEventsPath(
        stage === "milestone"
          ? paths.milestoneReviewInput
          : paths.finalReviewInput,
      ),
    ),
    ...readdirSync(paths.eventDirectory).map((name) =>
      resolve(paths.eventDirectory, name),
    ),
    resolve(paths.playerDirectory, "evidence/player-events.jsonl"),
    paths.postPlayLog + ".events.jsonl",
  ].filter((path) => existsSync(path));
  const events = invocations.map((invocation) =>
    eventAuthorityForHash(eventCandidates, invocation.eventsSha256),
  );
  if (events.length === 0)
    fail("Schema-3 assembly requires invocation events.");
  if (new Set(events.map(({ sha256 }) => sha256)).size !== events.length) {
    fail(
      "Schema-3 assembly requires a bijection between invocations and event authorities.",
    );
  }
  const firstEvent = events[0];
  if (firstEvent === undefined)
    fail("Schema-3 assembly requires invocation events.");
  const invocationEvents = [firstEvent, ...events.slice(1)] as const;
  const baseFindings = projectRunFindings({
    transcriptPath: repoRelative(transcript),
    runDirectory: repoRelative(paths.playerDirectory),
    reviewPaths: existsSync(paths.postPlayReview)
      ? [repoRelative(paths.postPlayReview)]
      : [],
    scenarioReviewPaths: [repoRelative(bundle.paths.scenarioReview)],
    generationLedgerPaths: [repoRelative(paths.currentLedger)],
    reviewReplay: Match.value(reviewPlan).pipe(
      Match.when({ tag: "milestoneAndFinal" }, () => ({
        tag: "milestoneAndFinal" as const,
        milestonePath: repoRelative(paths.milestoneReviewInput),
        finalPath: repoRelative(paths.finalReviewInput),
      })),
      Match.when({ tag: "finalOnly" }, () => ({
        tag: "finalOnly" as const,
        finalPath: repoRelative(paths.finalReviewInput),
      })),
      Match.exhaustive,
    ),
    issueLinks: [],
  });
  const readinessAuthorities =
    profile === "documentDeclarationSet"
      ? (() => {
          const readinessInvocation = invocations.find(
            (invocation) =>
              invocation.schemaVersion === 3 &&
              invocation.responsibility === "scenarioQuality",
          );
          if (readinessInvocation === undefined) {
            return fail("Scenario readiness invocation is missing.");
          }
          const readinessEvent = eventAuthorityForHash(
            eventCandidates,
            readinessInvocation.eventsSha256,
          );
          return [
            {
              role: "prePlayReviewReadinessSource",
              ...artifactAuthority(repoRelative(paths.readinessInput)),
            },
            {
              role: "prePlayReviewReadinessResult",
              ...artifactAuthority(repoRelative(paths.readinessResult)),
            },
            {
              role: "prePlayReviewReadinessEvents",
              ...readinessEvent,
            },
          ] as const;
        })()
      : [];
  const findings = {
    ...baseFindings,
    authorities: [
      ...baseFindings.authorities,
      {
        role: "playerContextDelivery",
        ...artifactAuthority(repoRelative(playerContextDelivery)),
      },
      ...(existsSync(paths.postPlayContextDelivery)
        ? [
            {
              role: "postPlayReviewContextDelivery",
              ...artifactAuthority(repoRelative(paths.postPlayContextDelivery)),
            },
          ]
        : []),
      ...readinessAuthorities,
    ].sort((left, right) => left.role.localeCompare(right.role)),
  };
  writeFindingsProjection({
    projection: findings,
    path: findingsArtifactPath(repoRelative(paths.playerDirectory)),
  });
  const measurementCommon = {
    schemaVersion: 3 as const,
    pathId: runId + "-" + profile,
    scenarioId: fixedScenarioId(),
    implementationGitSha: runDescriptor.right.implementationGitSha,
    scenarioBundle: preparedBundle,
    contextSourceManifest: contextManifestAuthority,
    stagePlan: plan.right,
    invocationLedgers: ledgers,
    invocationEvents,
    findings,
    outcome: derivedOutcome.right,
  };
  const measurement: CurrentBenchmarkMeasurement =
    profile === "documentDeclarationSet"
      ? { ...measurementCommon, profile, invocations: retainedInvocations }
      : {
          ...measurementCommon,
          profile,
          invocations: nonEmpty(
            retainedInvocations.filter(
              (invocation): invocation is CurrentModelInvocationLedgerEntry =>
                invocation.schemaVersion === 2,
            ),
            "bounded invocations",
          ),
        };
  const parsed = parseBenchmarkMeasurement(measurement);
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  const validated = validateCompletePathMeasurement(measurement);
  if (Either.isLeft(validated)) fail(validated.left);
  writeJsonExclusive(paths.measurement, measurement);
}

export function parseFixedBenchmarkProfile(
  value: unknown,
): Either.Either<FixedBenchmarkProfile, string> {
  if (
    value === "documentDeclarationSet" ||
    value === "boundedCapabilityProjection"
  ) {
    return Either.right(value);
  }
  return Either.left("Unknown fixed benchmark profile: " + String(value));
}

async function main(args: readonly string[]): Promise<void> {
  const command = args[0];
  const runId = args[1];
  const profileInput = args[2];
  if (command === "prepare") {
    if (runId === undefined || args.length > 3) {
      fail("Usage: fixed-scenario-benchmark.ts prepare <run-id> [profile]");
    }
    const profiles =
      profileInput === undefined
        ? FIXED_BENCHMARK_PROFILES
        : (() => {
            const parsed = parseFixedBenchmarkProfile(profileInput);
            if (Either.isLeft(parsed)) fail(parsed.left);
            return [parsed.right] as const;
          })();
    for (const profile of profiles) {
      await prepareProfile({ runId: assertRunId(runId), profile });
    }
    return;
  }
  if (command === "assemble") {
    if (runId === undefined || profileInput === undefined || args.length > 3) {
      fail("Usage: fixed-scenario-benchmark.ts assemble <run-id> <profile>");
    }
    const parsed = parseFixedBenchmarkProfile(profileInput);
    if (Either.isLeft(parsed)) fail(parsed.left);
    assembleProfile(runId, parsed.right);
    return;
  }
  if (command === "compare") {
    if (runId === undefined || profileInput === undefined || args.length > 3) {
      fail("Usage: fixed-scenario-benchmark.ts compare <run-id> <output.json>");
    }
    const acceptedRunId = assertRunId(runId);
    const baseline = readCompletePathMeasurement(
      FIXED_BENCHMARK_ROOT +
        "/" +
        acceptedRunId +
        "/documentDeclarationSet/measurement.json",
    );
    const candidate = readCompletePathMeasurement(
      FIXED_BENCHMARK_ROOT +
        "/" +
        acceptedRunId +
        "/boundedCapabilityProjection/measurement.json",
    );
    const result = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath: profileInput,
    });
    if (Either.isLeft(result)) fail(result.left);
    return;
  }
  fail("Expected prepare, assemble, or compare command.");
}

if (process.argv[1]?.endsWith("fixed-scenario-benchmark.ts")) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
