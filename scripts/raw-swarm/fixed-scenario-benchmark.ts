import { randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  artifactAuthority,
  type ArtifactAuthority,
  readJsonLines,
} from "./artifact-authority.ts";
import {
  capabilityContextForRole,
  type CapabilityRole,
} from "./capability-projection.ts";
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
import {
  parseBenchmarkModelInvocationLedgerEntry,
  parseModelInvocationLedgerEntry,
  runBenchmarkAuxiliaryInvocation,
  runCodexInvocation,
  type BenchmarkAuxiliaryModelInvocationLedgerEntry,
  type BenchmarkAuxiliaryInvocationKind,
  type CurrentModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  BENCHMARK_IMPLEMENTATION_PROFILES,
  BenchmarkContextSourceManifestDocumentSchema,
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
  emitPublicDeclarations,
} from "./sdk-player/consumer-distribution.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
  sha256Canonical,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";
import { RAW_SWARM_STAGE_PLAN_REASONS } from "./scenario-stage-plan.ts";

export const FIXED_SCENARIO_ID = "generated-battle-009" as const;
export const FIXED_BENCHMARK_PROFILES = BENCHMARK_IMPLEMENTATION_PROFILES;
export type FixedBenchmarkProfile = BenchmarkImplementationProfile;

const FIXED_BENCHMARK_ROOT = "scripts/raw-swarm/out/fixed-scenario-benchmark";
export const FIXED_BENCHMARK_CONTEXT_ROLES = [
  "scenarioGeneration",
  "scenarioReview",
  "characterAuthoring",
  "setupAuthoring",
  "player",
  "postPlayReview",
] as const;
export type BenchmarkContextRole =
  (typeof FIXED_BENCHMARK_CONTEXT_ROLES)[number];
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
  readonly scenarioReviewGitSha: GitSha;
}>;

export type FixedBenchmarkProfilePaths = Readonly<{
  readonly root: string;
  readonly stageFacts: string;
  readonly stagePlan: string;
  readonly stagePlanFindings: string;
  readonly contextDirectory: string;
  readonly contextManifest: string;
  readonly benchmarkLedger: string;
  readonly currentLedger: string;
  readonly auxiliaryLedger: string;
  readonly eventDirectory: string;
  readonly reviewDirectory: string;
  readonly milestoneReviewInput: string;
  readonly finalReviewInput: string;
  readonly milestoneReviewSource: string;
  readonly finalReviewSource: string;
  readonly readinessResult: string;
  readonly readinessInput: string;
  readonly authoringDirectory: string;
  readonly playerDirectory: string;
  readonly postPlayReview: string;
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
    scenarioReviewGitSha: review.right.gitSha,
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
  const root = resolve(repoRoot, FIXED_BENCHMARK_ROOT, runId, profile);
  return {
    root,
    stageFacts: resolve(root, "bundle/stage-facts.json"),
    stagePlan: resolve(root, "bundle/stage-plan.json"),
    stagePlanFindings: resolve(root, "bundle/stage-plan-findings.json"),
    contextDirectory: resolve(root, "context"),
    contextManifest: resolve(root, "context-manifest.json"),
    benchmarkLedger: resolve(root, "evidence/benchmark-invocations.jsonl"),
    currentLedger: resolve(root, "evidence/current-invocations.jsonl"),
    auxiliaryLedger: resolve(root, "evidence/auxiliary-invocations.jsonl"),
    eventDirectory: resolve(root, "evidence/invocation-events"),
    reviewDirectory: resolve(root, "reviews"),
    milestoneReviewInput: resolve(root, "reviews/milestone.input.json"),
    finalReviewInput: resolve(root, "reviews/final.input.json"),
    milestoneReviewSource: resolve(root, "reviews/milestone.source.input.json"),
    finalReviewSource: resolve(root, "reviews/final.source.input.json"),
    readinessResult: resolve(root, "reviews/readiness.json"),
    readinessInput: resolve(root, "reviews/readiness.input.json"),
    authoringDirectory: resolve(root, "authoring"),
    playerDirectory: resolve(root, "player"),
    postPlayReview: resolve(root, "post-play-review.json"),
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

function roleCapability(role: BenchmarkContextRole): CapabilityRole {
  if (role === "scenarioGeneration") return "generation";
  if (role === "scenarioReview" || role === "postPlayReview") return "review";
  return role;
}

const HISTORICAL_SDK_CAPABILITY_DOCUMENTS = [
  {
    label: "SCENARIO_CHARACTERS.md",
    path: "scripts/raw-swarm/sdk-player/SCENARIO_CHARACTERS.md",
  },
  {
    label: "CHARACTER_CREATION_SDK.md",
    path: "packages/character-creation-runtime/README.md",
  },
  {
    label: "CHARACTER_SHEET_SDK.md",
    path: "packages/character-sheet-runtime/README.md",
  },
  {
    label: "@dnd/scenario-character-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/scenario-character-contract.ts",
  },
  {
    label: "SCENARIO_SETUP.md",
    path: "scripts/raw-swarm/sdk-player/SCENARIO_SETUP.md",
  },
  {
    label: "@dnd/scenario-setup-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/scenario-setup-contract.ts",
  },
  {
    label: "PLAYER.md",
    path: "scripts/raw-swarm/sdk-player/PLAYER.md",
  },
  {
    label: "@dnd/player-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/continuation-contract.ts",
  },
  {
    label: "PUBLIC_SDK.md",
    path: "packages/battle-runtime/README.md",
  },
] as const;

type ContextSource =
  | {
      readonly profile: "documentDeclarationSet";
      readonly declarationBundle: string;
    }
  | { readonly profile: "boundedCapabilityProjection" };

function declarationFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return declarationFiles(path);
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

function publicDeclarationBundleText(): string {
  const scratch = mkdtempSync(
    resolve(tmpdir(), "dnd-fixed-benchmark-declarations-"),
  );
  const declarations = resolve(scratch, "declarations");
  try {
    emitPublicDeclarations(scratch);
    return declarationFiles(declarations)
      .map((path) => {
        const label = relative(scratch, path);
        return "\n--- " + label + " ---\n" + readFileSync(path, "utf8");
      })
      .sort()
      .join("\n");
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function historicalDocumentSetText(): string {
  return HISTORICAL_SDK_CAPABILITY_DOCUMENTS.map(
    ({ label, path }) =>
      "## " + label + "\n\n" + readFileSync(resolve(repoRoot, path), "utf8"),
  ).join("\n\n");
}

function baselineContextForRole(
  role: BenchmarkContextRole,
  declarationBundle: string,
): string {
  return [
    "Raw Swarm fixed benchmark document declaration set",
    "Role: " + role,
    "Current public SDK capability documentation:",
    historicalDocumentSetText(),
    "Full emitted public declaration bundle (compiler-readable declarations only):",
    declarationBundle,
  ].join("\n\n");
}

/** Canonical unbounded context retained by the historical benchmark profile. */
export function fixedBenchmarkDocumentDeclarationContextForRole(
  role: BenchmarkContextRole,
): string {
  return baselineContextForRole(role, publicDeclarationBundleText());
}

/** Canonical delivered context for one benchmark role and profile. */
export function fixedBenchmarkContextForRole(
  profile: FixedBenchmarkProfile,
  role: BenchmarkContextRole,
): string {
  return profile === "documentDeclarationSet"
    ? fixedBenchmarkDocumentDeclarationContextForRole(role)
    : capabilityContextForRole(roleCapability(role));
}

function profileContextText(
  source: ContextSource,
  role: BenchmarkContextRole,
): string {
  return source.profile === "documentDeclarationSet"
    ? baselineContextForRole(role, source.declarationBundle)
    : capabilityContextForRole(roleCapability(role));
}

function writeProfileContexts(
  profile: FixedBenchmarkProfile,
  paths: FixedBenchmarkProfilePaths,
): ArtifactAuthority {
  const source: ContextSource =
    profile === "documentDeclarationSet"
      ? {
          profile,
          declarationBundle: publicDeclarationBundleText(),
        }
      : { profile };
  const sources = FIXED_BENCHMARK_CONTEXT_ROLES.map((role) => {
    const path = resolve(paths.contextDirectory, role + ".md");
    writeExclusive(path, profileContextText(source, role));
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
  schemaPath?: string,
  outputPath?: string,
): readonly [string, ...string[]] {
  return [
    "exec",
    "-C",
    cwd,
    "--sandbox",
    "danger-full-access",
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

type StructuredCallResult<A> = Readonly<{
  readonly value: A;
  readonly eventPath: string;
  readonly currentEntry?: CurrentModelInvocationLedgerEntry;
  readonly auxiliaryEntry?: BenchmarkAuxiliaryModelInvocationLedgerEntry;
}>;

function runStructuredCall<A, I>(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
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
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-benchmark-call-"));
  const schemaPath = resolve(scratch, "output-schema.json");
  const outputPath = resolve(scratch, "output.json");
  const logPath = resolve(
    input.profilePaths.root,
    "logs",
    String(input.ordinal).padStart(2, "0") + "-" + input.phase + ".log",
  );
  const events = eventPath(input.profilePaths, input.ordinal, input.phase);
  writeJsonExclusive(schemaPath, codexOutputJsonSchema(input.schema));
  try {
    const result = runCodexInvocation({
      args: fixedBenchmarkCodexArgs(
        repoRoot,
        input.model,
        input.reasoningEffort,
        input.prompt,
        schemaPath,
        outputPath,
      ),
      cwd: repoRoot,
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
    rmSync(scratch, { recursive: true });
  }
}

function runCompositeReviewCall(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly ordinal: number;
  readonly profile: FixedBenchmarkProfile;
  readonly prompt: string;
  readonly gitSha: GitSha;
}): StructuredCallResult<unknown> {
  const common = {
    profilePaths: input.profilePaths,
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
  readonly ordinal: number;
  readonly kind: BenchmarkAuxiliaryInvocationKind;
  readonly schema: Schema.Schema<A, I>;
  readonly prompt: string;
  readonly gitSha: GitSha;
  readonly scenarioId: ScenarioId;
}): StructuredCallResult<A> {
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-benchmark-aux-"));
  const schemaPath = resolve(scratch, "output-schema.json");
  const outputPath = resolve(scratch, "output.json");
  const logPath = resolve(
    input.profilePaths.root,
    "logs",
    String(input.ordinal).padStart(2, "0") + "-" + input.kind.phase + ".log",
  );
  const events = eventPath(input.profilePaths, input.ordinal, input.kind.phase);
  writeJsonExclusive(schemaPath, codexOutputJsonSchema(input.schema));
  const execution =
    input.kind.responsibility === "scenarioQuality"
      ? { model: "gpt-5.6-luna", reasoningEffort: "max" }
      : { model: "gpt-5.6-sol", reasoningEffort: "medium" };
  try {
    const result = runBenchmarkAuxiliaryInvocation({
      args: fixedBenchmarkCodexArgs(
        repoRoot,
        execution.model,
        execution.reasoningEffort,
        input.prompt,
        schemaPath,
        outputPath,
      ),
      cwd: repoRoot,
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
  return (
    "Read the exact delivered context at " +
    contextPath +
    ". Review the tracked " +
    FIXED_SCENARIO_ID +
    " scenario for the " +
    stage +
    " stage. Return only JSON with exactly these independent fields: " +
    fields +
    ". Do not rewrite prose, choose tactics, or predict an outcome. The scenario authority is " +
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
    "Read the exact delivered context at " +
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
  readonly scenarioReviewGitSha: GitSha;
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
  const sourceEnvelope = {
    ...parsed.right,
    sourceGitSha: input.scenarioReviewGitSha,
    invocationId: "source-" + parsed.right.invocationId,
  };
  const sourceParsed = Schema.decodeUnknownEither(
    RetainedScenarioReviewInputSchema,
    { onExcessProperty: "error" },
  )(sourceEnvelope);
  if (Either.isLeft(sourceParsed)) fail(sourceParsed.left.message);
  const sourcePath =
    input.stage === "milestone"
      ? input.profilePaths.milestoneReviewSource
      : input.profilePaths.finalReviewSource;
  writeJsonExclusive(sourcePath, sourceParsed.right);
  return replayPath;
}

export function retainBenchmarkReviewReplayEvents(
  eventPath: string,
  replayPath: string,
): string {
  const retainedPath = replayPath.endsWith(".json")
    ? replayPath.slice(0, -".json".length) + ".events.jsonl"
    : replayPath + ".events.jsonl";
  copyFileSync(eventPath, retainedPath, constants.COPYFILE_EXCL);
  return retainedPath;
}

const BenchmarkReadinessInputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  profile: Schema.Literal("documentDeclarationSet"),
  scenarioId: Schema.Literal(FIXED_SCENARIO_ID),
  responsibility: Schema.Literal("scenarioQuality"),
  phase: Schema.Literal("scenarioReadiness"),
  sourceGitSha: GitShaSchema,
  invocationId: Schema.NonEmptyString,
  model: Schema.Literal("gpt-5.6-luna"),
  reasoningEffort: Schema.Literal("max"),
  prompt: Schema.NonEmptyString,
  outputJsonSchema: Schema.Unknown,
  result: ScenarioQualityReviewSchema,
});

function retainReadinessEnvelope(input: {
  readonly profilePaths: FixedBenchmarkProfilePaths;
  readonly result: unknown;
  readonly entry: BenchmarkAuxiliaryModelInvocationLedgerEntry;
  readonly scenarioReviewGitSha: GitSha;
  readonly prompt: string;
}): string {
  const outputJsonSchema = codexOutputJsonSchema(ScenarioQualityReviewSchema);
  const envelope = {
    schemaVersion: 1 as const,
    profile: "documentDeclarationSet" as const,
    scenarioId: FIXED_SCENARIO_ID,
    responsibility: "scenarioQuality" as const,
    phase: "scenarioReadiness" as const,
    sourceGitSha: input.scenarioReviewGitSha,
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
  readonly ordinal: number;
  readonly context: string;
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
        content: input.context,
      },
    });
    const sourcePath = resolve(scratch, "characters.ts");
    writeFileSync(sourcePath, readFileSync(input.bundle.paths.characters));
    const events = eventPath(
      input.paths,
      input.ordinal,
      "scenarioCharacterAuthoring",
    );
    const result = runBenchmarkAuxiliaryInvocation({
      args: fixedBenchmarkCodexArgs(
        scratch,
        "gpt-5.6-sol",
        "medium",
        "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_CHARACTERS.md, SCENARIO.md, and SCENARIO_REVIEW.json. Review characters.ts, run its documented typecheck, and leave it byte-identical to the existing zero-sheet source. Do not invent Character Sheets.",
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
  readonly context: string;
  readonly bundle: FixedScenarioCanonicalBundle;
  readonly gitSha: GitSha;
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
        content: input.context,
      },
    });
    const sourcePath = resolve(scratch, "setup.ts");
    writeFileSync(sourcePath, readFileSync(input.bundle.paths.setup));
    writeFileSync(
      resolve(scratch, "NEUTRAL_SETUP.ts"),
      readFileSync(input.bundle.paths.setup),
    );
    const run = (
      ordinal: number,
      phase:
        | "scenarioSetupNeutralAuthoring"
        | "scenarioSetupControllerAuthoring",
      prompt: string,
    ): void => {
      const events = eventPath(input.paths, ordinal, phase);
      const result = runCodexInvocation({
        args: fixedBenchmarkCodexArgs(scratch, "gpt-5.6-sol", "medium", prompt),
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
        stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioSetupAuthoring,
        scenarioId: fixedScenarioId(),
        gitSha: input.gitSha,
        fallbackInvocationId: FIXED_SCENARIO_ID + "-" + phase,
        model: "gpt-5.6-sol",
        reasoningEffort: "medium",
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
      8,
      "scenarioSetupNeutralAuthoring",
      "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_SETUP.md, SCENARIO.md, SCENARIO_REVIEW.json, CHARACTERS.json, and STAT_BLOCKS.json. Review setup.ts as the exact neutral source, run the documented typecheck, and leave it byte-identical.",
    );
    run(
      9,
      "scenarioSetupControllerAuthoring",
      "Read BENCHMARK_CONTEXT.md, including its complete emitted public declaration bundle, plus SCENARIO_SETUP_CONTROLLER.md, NEUTRAL_SETUP.ts, SCENARIO.md, and SCENARIO_REVIEW.json. Review setup.ts as the exact controller-retained source, preserve fixed facts, run the documented typecheck, and leave it byte-identical.",
    );
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

export function benchmarkCommands(input: {
  readonly runId: string;
  readonly profile: FixedBenchmarkProfile;
  readonly paths: FixedBenchmarkProfilePaths;
  readonly bundle: FixedScenarioCanonicalBundle;
}): Readonly<
  Record<"player" | "replay" | "postPlayReview" | "assemble", string>
> {
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
    " --benchmark-context-path " +
    contextPlayer +
    " --instructional-isolation";
  return {
    player,
    replay:
      "pnpm exec tsx scripts/raw-swarm/replay-sdk-player.ts " +
      repoRelative(input.paths.playerDirectory),
    postPlayReview:
      "RAW_REVIEW_CONTEXT_PATH=" +
      repoRelative(resolve(input.paths.contextDirectory, "postPlayReview.md")) +
      " scripts/raw-swarm/run-raw-review.sh scripts/raw-swarm/reviews/sdk-player.prompt.txt " +
      repoRelative(input.paths.playerDirectory) +
      "/evidence/sdk-calls.jsonl " +
      repoRelative(input.paths.postPlayReview) +
      " " +
      repoRelative(input.paths.postPlayLog),
    assemble:
      "pnpm exec tsx scripts/raw-swarm/fixed-scenario-benchmark.ts assemble " +
      input.runId +
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
  writeJsonExclusive(resolve(paths.root, "run.json"), {
    schemaVersion: 1,
    runId: input.runId,
    profile: input.profile,
    scenarioId: FIXED_SCENARIO_ID,
    gitSha: gitSha.right,
    bundle: bundle.authorities,
    stageFacts: artifactAuthority(repoRelative(paths.stageFacts)),
    stagePlan: artifactAuthority(repoRelative(paths.stagePlan)),
    contextManifest,
  });
  const generationContext = resolve(
    paths.contextDirectory,
    "scenarioGeneration.md",
  );
  for (const ordinal of [1, 2] as const) {
    const result = runStructuredCall({
      profilePaths: paths,
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
  const milestone = runCompositeReviewCall({
    profilePaths: paths,
    ordinal: 3,
    profile: input.profile,
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
    scenarioReviewGitSha: bundle.scenarioReviewGitSha,
    prompt: reviewPrompt(input.profile, "milestone", reviewContext, bundle),
  });
  if (input.profile === "documentDeclarationSet") {
    const readiness = runAuxiliaryStructuredCall({
      profilePaths: paths,
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
      scenarioReviewGitSha: bundle.scenarioReviewGitSha,
      prompt:
        "Read " +
        reviewContext +
        " and return the separate historical scenario-quality readiness result. Do not add it to a composite review.",
    });
  }
  const finalOrdinal = input.profile === "documentDeclarationSet" ? 5 : 4;
  const final = runCompositeReviewCall({
    profilePaths: paths,
    ordinal: finalOrdinal,
    profile: input.profile,
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
    scenarioReviewGitSha: bundle.scenarioReviewGitSha,
    prompt: reviewPrompt(input.profile, "final", reviewContext, bundle),
  });
  const characterResult = await evaluateScenarioCharacters(
    bundle.paths.characters,
  );
  if (characterResult.tag !== "ready")
    fail("Tracked characters are not ready.");
  if (input.profile === "documentDeclarationSet") {
    const characterContext = readFileSync(
      resolve(paths.contextDirectory, "characterAuthoring.md"),
      "utf8",
    );
    characterSourceCall({
      paths,
      ordinal: 6,
      context: characterContext,
      bundle,
      gitSha: gitSha.right,
    });
    characterSourceCall({
      paths,
      ordinal: 7,
      context: characterContext,
      bundle,
      gitSha: gitSha.right,
    });
  }
  setupSourceCalls({
    paths,
    context: readFileSync(
      resolve(paths.contextDirectory, "setupAuthoring.md"),
      "utf8",
    ),
    bundle,
    gitSha: gitSha.right,
    characters: characterResult,
  });
  assertFixedScenarioCanonicalBundle(bundle);
  const commands = benchmarkCommands({
    runId: input.runId,
    profile: input.profile,
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
): void {
  if (!existsSync(path)) fail("Missing retained " + stage + " review input.");
  const parsed = Schema.decodeUnknownEither(RetainedScenarioReviewInputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(path, "utf8")));
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  if (
    parsed.right.scenarioId !== FIXED_SCENARIO_ID ||
    parsed.right.reviewStage !== stage
  ) {
    fail("Retained review input is bound to a different scenario or stage.");
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
  if (parsed.right.scenarioId !== FIXED_SCENARIO_ID) {
    fail("Retained scenario readiness is bound to a different scenario.");
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

function assembleProfile(runId: string, profile: FixedBenchmarkProfile): void {
  const bundle = fixedScenarioCanonicalBundle();
  const paths = fixedBenchmarkProfilePaths(assertRunId(runId), profile);
  const plan = validateScenarioStagePlan(
    JSON.parse(readFileSync(paths.stagePlan, "utf8")),
  );
  if (Either.isLeft(plan)) fail(plan.left);
  const transcript = resolve(paths.playerDirectory, "evidence/sdk-calls.jsonl");
  const replay = resolve(paths.playerDirectory, "evidence/replay-result.json");
  const postLedger =
    paths.postPlayReview.slice(0, -".json".length) + ".invocations.jsonl";
  if (
    !existsSync(transcript) ||
    !existsSync(replay) ||
    !existsSync(paths.postPlayReview) ||
    !existsSync(postLedger)
  ) {
    fail(
      "Player, replay, and post-play authorities are all required before assembly.",
    );
  }
  validateRetainedReviewAuthority(
    profile,
    paths.milestoneReviewInput,
    "milestone",
  );
  validateRetainedReviewAuthority(profile, paths.finalReviewInput, "final");
  validateRetainedReviewAuthority(
    profile,
    paths.milestoneReviewSource,
    "milestone",
  );
  validateRetainedReviewAuthority(profile, paths.finalReviewSource, "final");
  validateRetainedReadinessAuthority(profile, paths);
  const benchmarkLedger = artifactAuthority(
    repoRelative(paths.benchmarkLedger),
  );
  const playerLedger = artifactAuthority(
    repoRelative(resolve(paths.playerDirectory, "evidence/invocations.jsonl")),
  );
  const postPlayLedger = artifactAuthority(repoRelative(postLedger));
  const ledgers = [benchmarkLedger, playerLedger, postPlayLedger] as const;
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
  const eventCandidates = [
    ...readdirSync(paths.eventDirectory).map((name) =>
      resolve(paths.eventDirectory, name),
    ),
    resolve(paths.playerDirectory, "evidence/player-events.jsonl"),
    paths.postPlayLog + ".events.jsonl",
  ];
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
    reviewPaths: [repoRelative(paths.postPlayReview)],
    scenarioReviewPaths: [repoRelative(bundle.paths.scenarioReview)],
    generationLedgerPaths: [repoRelative(paths.currentLedger)],
    reviewReplayPaths: [
      repoRelative(paths.milestoneReviewInput),
      repoRelative(paths.finalReviewInput),
    ],
    issueLinks: [],
  });
  const sourceReviewAuthorities = [
    {
      role: "prePlayReviewSourceInput-milestone",
      ...artifactAuthority(repoRelative(paths.milestoneReviewSource)),
    },
    {
      role: "prePlayReviewSourceInput-final",
      ...artifactAuthority(repoRelative(paths.finalReviewSource)),
    },
  ] as const;
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
      ...sourceReviewAuthorities,
      ...readinessAuthorities,
    ].sort((left, right) => left.role.localeCompare(right.role)),
  };
  writeFindingsProjection({
    projection: findings,
    path: findingsArtifactPath(repoRelative(paths.playerDirectory)),
  });
  const measurement: CurrentBenchmarkMeasurement = {
    schemaVersion: 3,
    pathId: runId + "-" + profile,
    profile,
    scenarioId: fixedScenarioId(),
    scenarioBundle: {
      scenario: bundle.authorities.scenario,
      scenarioReview: bundle.authorities.scenarioReview,
      stageFacts: artifactAuthority(repoRelative(paths.stageFacts)),
      stagePlan: artifactAuthority(repoRelative(paths.stagePlan)),
      characters: bundle.authorities.characters,
      setup: bundle.authorities.setup,
    },
    contextSourceManifest: artifactAuthority(
      repoRelative(paths.contextManifest),
    ),
    stagePlan: plan.right,
    invocationLedgers: ledgers,
    invocations,
    invocationEvents,
    findings,
    outcome: { tag: "completed" },
  };
  const parsed = parseBenchmarkMeasurement(measurement);
  if (Either.isLeft(parsed)) fail(parsed.left.message);
  const validated = validateCompletePathMeasurement(measurement);
  if (Either.isLeft(validated)) fail(validated.left);
  writeJsonExclusive(paths.measurement, measurement);
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
        : FIXED_BENCHMARK_PROFILES.includes(
              profileInput as FixedBenchmarkProfile,
            )
          ? [profileInput as FixedBenchmarkProfile]
          : fail("Unknown fixed benchmark profile: " + profileInput);
    for (const profile of profiles) {
      await prepareProfile({ runId: assertRunId(runId), profile });
    }
    return;
  }
  if (command === "assemble") {
    if (runId === undefined || profileInput === undefined || args.length > 3) {
      fail("Usage: fixed-scenario-benchmark.ts assemble <run-id> <profile>");
    }
    if (
      !FIXED_BENCHMARK_PROFILES.includes(profileInput as FixedBenchmarkProfile)
    ) {
      fail("Unknown fixed benchmark profile: " + profileInput);
    }
    assembleProfile(runId, profileInput as FixedBenchmarkProfile);
    return;
  }
  if (command === "compare") {
    if (runId === undefined || profileInput === undefined || args.length > 3) {
      fail("Usage: fixed-scenario-benchmark.ts compare <run-id> <output.json>");
    }
    const baseline = readCompletePathMeasurement(
      FIXED_BENCHMARK_ROOT +
        "/" +
        runId +
        "/documentDeclarationSet/measurement.json",
    );
    const candidate = readCompletePathMeasurement(
      FIXED_BENCHMARK_ROOT +
        "/" +
        runId +
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
