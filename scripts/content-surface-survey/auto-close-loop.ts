import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildClusters,
  currentVerdictForSlug,
  datasetVerdictForSlug,
  defaultReportPath,
  loadQueue,
  loadRows,
  selectSlugs,
  type CloseLoopArgs,
  type ClusterRecord,
  type DatasetRow,
  type QueueRow,
  type Source,
  type Verdict,
} from "./close-loop.ts";

type Args = {
  source: Source | "all";
  kind?: string;
  backend: "codex" | "claude";
  autoCommit: boolean;
  limit: number;
  maxBatches: number;
  maxNoImprove: number;
  maxErrors: number;
  minClusterSize: number;
  batchTimeoutSeconds: number;
  sleepSeconds: number;
  statePath: string;
  lockPath: string;
  resetState: boolean;
};

type ClosureSummary = {
  improved: number;
  cleanFlips: number;
  changed: number;
};

type ClosureReport = {
  cluster: string | null;
  summary: ClosureSummary;
  deltas: ReadonlyArray<{
    slug: string;
    source: Source;
    kind: string;
    before: Verdict | null;
    after: Verdict | null;
    changed: boolean;
    improved: boolean;
    cleanFlip: boolean;
  }>;
};

type SurfaceAttempt = {
  cluster: string;
  selectedSlugs: ReadonlyArray<string>;
  changedPaths: ReadonlyArray<string>;
};

type EffectiveRow = DatasetRow;

type GlobalSnapshot = {
  recordedAt: string;
  batch: number;
  source: Args["source"];
  kind?: string;
  backend: Args["backend"];
  currentCluster?: string;
  selectedCluster?: string | null;
  summary?: ClosureSummary;
  totals: {
    queueUnits: number;
    observedUnits: number;
    structural_widening: number;
    atom_widening: number;
    surface_widening: number;
    clean: number;
    dm_agenda: number;
    invalid: number;
    refused: number;
    missing: number;
  };
  weightedDebt: number;
  topClusters: ReadonlyArray<{
    canonical: string;
    count: number;
    verdicts: ReadonlyArray<Verdict>;
  }>;
};

type HistoryRecord = {
  recordedAt: string;
  batch: number;
  cluster: string | null;
  source: Args["source"];
  kind?: string;
  backend: Args["backend"];
  summary?: ClosureSummary;
  stopReason?: string;
  error?: string;
  weightedDebt: number;
  totals: GlobalSnapshot["totals"];
  topClusters: GlobalSnapshot["topClusters"];
  reportPath?: string;
};

type PersistedState = {
  version: 1;
  source: Args["source"];
  kind?: string;
  backend: Args["backend"];
  attempted: string[];
  batch: number;
  improvedBatches: number;
  noImproveStreak: number;
  errorStreak: number;
  currentCluster?: string;
  currentBatchStartedAt?: string;
  lastReportPath?: string;
  lastError?: string;
  updatedAt: string;
  stopReason?: string;
};

type LockPayload = {
  pid: number;
  startedAt: string;
  cwd: string;
  statePath: string;
};

const DEFAULT_STATE_PATH = "/workspace/typescript/dnd/.output/content-surface-closure/auto-close-loop.state.json";
const DEFAULT_LOCK_PATH = "/workspace/typescript/dnd/.output/content-surface-closure/auto-close-loop.lock.json";
const DEFAULT_HISTORY_PATH = "/workspace/typescript/dnd/.output/content-surface-closure/auto-close-loop.history.jsonl";
const DEFAULT_LATEST_PATH = "/workspace/typescript/dnd/.output/content-surface-closure/auto-close-loop.latest.json";
const DEFAULT_FAILED_ATTEMPTS_PATH =
  "/workspace/typescript/dnd/.output/content-surface-closure/failed-surface-attempts.jsonl";
const DEFAULT_REPO_ROOT = "/workspace/typescript/dnd";
const RUN_SURVEY_LOCK_PATH = path.join(
  DEFAULT_REPO_ROOT,
  "scripts",
  "content-surface-survey",
  "run-survey.lock",
);

function parseArgs(argv: ReadonlyArray<string>): Args {
  const args: Args = {
    source: "srd-5.2.1",
    backend: "codex",
    autoCommit: false,
    limit: 2,
    maxBatches: 999,
    maxNoImprove: 4,
    maxErrors: 3,
    minClusterSize: 2,
    batchTimeoutSeconds: 1800,
    sleepSeconds: 5,
    statePath: DEFAULT_STATE_PATH,
    lockPath: DEFAULT_LOCK_PATH,
    resetState: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    switch (arg) {
      case "--source":
        args.source = (argv[++i] as Args["source"]) ?? args.source;
        break;
      case "--kind":
        args.kind = argv[++i];
        break;
      case "--backend":
        args.backend = (argv[++i] as Args["backend"]) ?? args.backend;
        break;
      case "--auto-commit":
        args.autoCommit = true;
        break;
      case "--limit":
        args.limit = Number(argv[++i] ?? args.limit);
        break;
      case "--max-batches":
        args.maxBatches = Number(argv[++i] ?? args.maxBatches);
        break;
      case "--max-no-improve":
        args.maxNoImprove = Number(argv[++i] ?? args.maxNoImprove);
        break;
      case "--max-errors":
        args.maxErrors = Number(argv[++i] ?? args.maxErrors);
        break;
      case "--min-cluster-size":
        args.minClusterSize = Number(argv[++i] ?? args.minClusterSize);
        break;
      case "--batch-timeout-seconds":
        args.batchTimeoutSeconds = Number(argv[++i] ?? args.batchTimeoutSeconds);
        break;
      case "--sleep-seconds":
        args.sleepSeconds = Number(argv[++i] ?? args.sleepSeconds);
        break;
      case "--state-path":
        args.statePath = argv[++i] ?? args.statePath;
        break;
      case "--lock-path":
        args.lockPath = argv[++i] ?? args.lockPath;
        break;
      case "--reset-state":
        args.resetState = true;
        break;
      case "-h":
      case "--help":
        usage(0);
        break;
      default:
        throw new Error(`unknown flag: ${arg}`);
    }
  }

  for (const [label, value] of [
    ["limit", args.limit],
    ["maxBatches", args.maxBatches],
    ["maxNoImprove", args.maxNoImprove],
    ["maxErrors", args.maxErrors],
    ["minClusterSize", args.minClusterSize],
    ["batchTimeoutSeconds", args.batchTimeoutSeconds],
    ["sleepSeconds", args.sleepSeconds],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`invalid --${label}: ${value}`);
    }
  }

  return args;
}

function usage(code: number): never {
  process.stderr.write(
    [
      "usage: auto-close-loop.ts [options]",
      "",
      "Options:",
      "  --source srd-5.2.1|xphb|all   dataset source (default: srd-5.2.1)",
      "  --kind KIND                    restrict to one queue kind",
      "  --backend codex|claude         backend for reruns (default: codex)",
      "  --auto-commit                  commit each completed batch atom",
      "  --limit N                      slugs per batch (default: 2)",
      "  --max-batches N                stop after N batches (default: 999)",
      "  --max-no-improve N             stop after N no-improve batches (default: 4)",
      "  --max-errors N                 stop after N failed batches (default: 3)",
      "  --min-cluster-size N           skip clusters smaller than N (default: 2)",
      "  --batch-timeout-seconds N      per-batch hard timeout (default: 1800)",
      "  --sleep-seconds N              sleep between batches (default: 5)",
      "  --state-path PATH              persisted resume state path",
      "  --lock-path PATH               single-run lock path",
      "  --reset-state                  discard previous persisted state",
    ].join("\n") + "\n",
  );
  process.exit(code);
}

function repoRoot(): string {
  return DEFAULT_REPO_ROOT;
}

function ensureParent(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleep(seconds: number): void {
  if (seconds <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function activeSurveyProcesses(): number[] {
  const result = spawnSync(
    "bash",
    [
      "-lc",
      "pgrep -f 'scripts/content-surface-survey/(run-survey\\.sh|worker\\.sh)|content-surface-survey/close-loop\\.ts' || true",
    ],
    {
      cwd: repoRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  return (result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => Number(line))
    .filter((pid) => Number.isInteger(pid) && pid !== process.pid);
}

function surveyRunActive(): boolean {
  return activeSurveyProcesses().length > 0;
}

function waitForSurveyIdle(args: Args, state: PersistedState): void {
  let warned = false;
  while (surveyRunActive()) {
    if (!warned) {
      const pids = activeSurveyProcesses();
      process.stdout.write(
        `survey already active; waiting for idle before next batch (pids: ${pids.join(", ")})\n`,
      );
      warned = true;
    }
    state.lastError = "waiting for existing survey activity to finish";
    saveState(args.statePath, state);
    sleep(Math.max(args.sleepSeconds, 5));
  }
  if (warned && fs.existsSync(RUN_SURVEY_LOCK_PATH)) {
    fs.rmSync(RUN_SURVEY_LOCK_PATH, { force: true });
  }
}

function acquireLock(lockPath: string, statePath: string): () => void {
  ensureParent(lockPath);

  if (fs.existsSync(lockPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(lockPath, "utf8")) as LockPayload;
      if (processAlive(existing.pid)) {
        throw new Error(`auto-close-loop already running with pid ${existing.pid}`);
      }
    } catch (error) {
      if (error instanceof Error && /already running/.test(error.message)) {
        throw error;
      }
    }
    fs.rmSync(lockPath, { force: true });
  }

  const payload: LockPayload = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    cwd: repoRoot(),
    statePath,
  };
  fs.writeFileSync(lockPath, JSON.stringify(payload, null, 2) + "\n", { flag: "wx" });

  const release = () => {
    fs.rmSync(lockPath, { force: true });
  };

  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(143);
  });

  return release;
}

function initialState(args: Args): PersistedState {
  return {
    version: 1,
    source: args.source,
    kind: args.kind,
    backend: args.backend,
    attempted: [],
    batch: 0,
    improvedBatches: 0,
    noImproveStreak: 0,
    errorStreak: 0,
    updatedAt: new Date().toISOString(),
  };
}

function loadState(args: Args): PersistedState {
  if (args.resetState || !fs.existsSync(args.statePath)) {
    return initialState(args);
  }

  const parsed = JSON.parse(fs.readFileSync(args.statePath, "utf8")) as PersistedState;
  if (
    parsed.version !== 1 ||
    parsed.source !== args.source ||
    parsed.kind !== args.kind ||
    parsed.backend !== args.backend
  ) {
    return initialState(args);
  }
  return parsed;
}

function saveState(statePath: string, state: PersistedState): void {
  ensureParent(statePath);
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function resultPathForSlug(source: Source, slug: string): string {
  return source === "srd-5.2.1"
    ? path.join(DEFAULT_REPO_ROOT, "scripts", "content-surface-survey", "results-srd", slug, "result.json")
    : path.join(
        DEFAULT_REPO_ROOT,
        ".references",
        "xphb-srd-pairing",
        "phb-survey",
        "results",
        slug,
        "result.json",
      );
}

function effectiveRowForSlug(
  queueRow: QueueRow,
  datasetRows: ReadonlyArray<DatasetRow>,
): EffectiveRow | null {
  const verdict = currentVerdictForSlug(queueRow.source, queueRow.slug) ?? datasetVerdictForSlug(datasetRows, queueRow.slug);
  const resultPath = resultPathForSlug(queueRow.source, queueRow.slug);
  if (fs.existsSync(resultPath)) {
    const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8")) as {
      proposed_widenings?: ReadonlyArray<{
        kind?: string;
        name?: string;
        justification?: string;
        evidence?: string;
      }>;
    };
    return {
      unit_slug: queueRow.slug,
      verdict: verdict ?? "invalid",
      claude_proposed_widenings: parsed.proposed_widenings ?? [],
    };
  }
  if (!verdict) return null;
  const datasetRow = datasetRows.findLast((row) => row.unit_slug === queueRow.slug);
  if (!datasetRow) {
    return {
      unit_slug: queueRow.slug,
      verdict,
      claude_proposed_widenings: [],
    };
  }
  return {
    unit_slug: queueRow.slug,
    verdict,
    claude_proposed_widenings: datasetRow.claude_proposed_widenings,
  };
}

function loadEffectiveRows(args: Args): {
  queue: Map<string, QueueRow>;
  rows: ReadonlyArray<EffectiveRow>;
  queueUnits: number;
} {
  const queue = loadQueue();
  const datasetRows = loadRows(args.source, queue);
  const eligibleQueueRows = [...queue.values()].filter((row) => {
    if (args.source !== "all" && row.source !== args.source) return false;
    if (args.kind && row.kind !== args.kind) return false;
    return true;
  });

  const rows = eligibleQueueRows
    .map((row) => effectiveRowForSlug(row, datasetRows))
    .filter((row): row is EffectiveRow => row !== null);

  return {
    queue,
    rows,
    queueUnits: eligibleQueueRows.length,
  };
}

function weightedDebtForVerdict(verdict: Verdict): number {
  switch (verdict) {
    case "structural_widening":
      return 4;
    case "atom_widening":
      return 3;
    case "surface_widening":
      return 2;
    case "dm_agenda":
      return 2;
    case "invalid":
      return 2;
    case "refused":
      return 1;
    case "clean":
      return 0;
  }
}

function git(args: string[], cwd = repoRoot()): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function gitOk(args: string[], cwd = repoRoot()): string {
  const result = git(args, cwd);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`.trim());
  }
  return result.stdout;
}

function assertAutoCommitReady(args: Args): void {
  if (!args.autoCommit) return;
  const status = git(["status", "--porcelain", "--untracked-files=no"]);
  if (status.status !== 0) {
    throw new Error(`git status failed before auto-commit: ${status.stderr || status.stdout}`.trim());
  }
  if (status.stdout.trim().length > 0) {
    throw new Error("auto-commit requires a clean tracked worktree before start");
  }
}

function batchCommitPaths(report: ClosureReport): string[] {
  const paths = new Set<string>(["scripts/content-surface-survey/survey-results-srd.jsonl"]);
  for (const delta of report.deltas) {
    if (delta.source !== "srd-5.2.1") continue;
    const slug = delta.slug;
    for (const rel of [
      `scripts/content-surface-survey/results-srd/${slug}/proposal.md`,
      `scripts/content-surface-survey/results-srd/${slug}/result.json`,
      `scripts/content-surface-survey/results-srd/${slug}/verdict.json`,
    ]) {
      if (fs.existsSync(path.join(repoRoot(), rel))) {
        paths.add(rel);
      }
    }
    if (delta.after === "invalid" || delta.after === "refused" || delta.after === "dm_agenda") {
      continue;
    }
    for (const rel of [
      `packages/prototype-content-surface/content/${slug}.dhall`,
      `packages/prototype-content-surface/content/${slug}.json`,
      `packages/prototype-content-surface/content/${slug}.trace.md`,
    ]) {
      if (fs.existsSync(path.join(repoRoot(), rel))) {
        paths.add(rel);
      }
    }
  }
  return [...paths];
}

function maybeCommitBatch(
  args: Args,
  state: PersistedState,
  report: ClosureReport,
  extraPaths: ReadonlyArray<string>,
): void {
  if (!args.autoCommit) return;
  const paths = [...new Set([...extraPaths, ...batchCommitPaths(report)])];
  if (paths.length === 0) return;

  const add = git(["add", "--", ...paths]);
  if (add.status !== 0) {
    throw new Error(`git add failed for batch commit: ${add.stderr || add.stdout}`.trim());
  }

  const staged = git(["diff", "--cached", "--name-only"]);
  if (staged.status !== 0) {
    throw new Error(`git diff --cached failed: ${staged.stderr || staged.stdout}`.trim());
  }
  if (staged.stdout.trim().length === 0) {
    return;
  }

  const cluster = (report.cluster ?? state.currentCluster ?? "manual").replaceAll(/\s+/g, " ");
  const message = [
    `chore(survey): close-loop batch ${state.batch} ${cluster}`,
    "",
    `Improved: ${report.summary.improved}`,
    `Changed: ${report.summary.changed}`,
    `Clean flips: ${report.summary.cleanFlips}`,
  ].join("\n");
  const commit = git(["commit", "-m", message]);
  if (commit.status !== 0) {
    throw new Error(`git commit failed for batch commit: ${commit.stderr || commit.stdout}`.trim());
  }
}

function worktreeChanges(): {
  tracked: string[];
  untracked: string[];
} {
  const status = gitOk(["status", "--porcelain"]);
  const tracked: string[] = [];
  const untracked: string[] = [];
  for (const line of status.split("\n").filter(Boolean)) {
    if (line.startsWith("?? ")) {
      untracked.push(line.slice(3));
    } else if (line.length >= 4) {
      tracked.push(line.slice(3));
    }
  }
  return { tracked, untracked };
}

function touchesPrototypeTypeScript(paths: ReadonlyArray<string>): boolean {
  return paths.some(
    (rel) =>
      rel.startsWith("packages/prototype-content-surface/src/") &&
      rel.endsWith(".ts"),
  );
}

function assertPrototypeTypecheckPasses(): void {
  const result = spawnSync("pnpm", ["--filter", "@dnd/prototype-content-surface", "typecheck"], {
    cwd: repoRoot(),
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `surface-change attempt left @dnd/prototype-content-surface untypecheckable (exit=${result.status ?? "signal"})`,
    );
  }
}

function trackedInGit(relPath: string): boolean {
  return git(["ls-files", "--error-unmatch", "--", relPath]).status === 0;
}

function restoreTracked(paths: ReadonlyArray<string>): void {
  const tracked = paths.filter((rel) => trackedInGit(rel));
  if (tracked.length === 0) return;
  gitOk(["restore", "--staged", "--worktree", "--", ...tracked]);
}

function removeUntracked(paths: ReadonlyArray<string>): void {
  for (const rel of paths) {
    if (trackedInGit(rel)) continue;
    fs.rmSync(path.join(repoRoot(), rel), { force: true, recursive: true });
  }
}

function restoreOrDelete(relPath: string): void {
  if (trackedInGit(relPath)) {
    restoreTracked([relPath]);
  } else {
    fs.rmSync(path.join(repoRoot(), relPath), { force: true, recursive: true });
  }
}

function resultDirForSlug(source: Source, slug: string): string {
  return source === "srd-5.2.1"
    ? `scripts/content-surface-survey/results-srd/${slug}`
    : `.references/xphb-srd-pairing/phb-survey/results/${slug}`;
}

function contentPathsForSlug(slug: string): string[] {
  return [
    `packages/prototype-content-surface/content/${slug}.dhall`,
    `packages/prototype-content-surface/content/${slug}.json`,
    `packages/prototype-content-surface/content/${slug}.trace.md`,
  ];
}

function cleanupBatchNoise(report: ClosureReport): void {
  for (const delta of report.deltas) {
    restoreOrDelete(`${resultDirForSlug(delta.source, delta.slug)}/codex-out.json`);
    if (delta.after === "invalid" || delta.after === "refused" || delta.after === "dm_agenda") {
      for (const rel of contentPathsForSlug(delta.slug)) {
        restoreOrDelete(rel);
      }
    }
  }
}

function revertBatchArtifacts(report: ClosureReport): void {
  const paths = new Set<string>(["scripts/content-surface-survey/survey-results-srd.jsonl"]);
  for (const delta of report.deltas) {
    for (const rel of [
      `${resultDirForSlug(delta.source, delta.slug)}/proposal.md`,
      `${resultDirForSlug(delta.source, delta.slug)}/result.json`,
      `${resultDirForSlug(delta.source, delta.slug)}/verdict.json`,
      `${resultDirForSlug(delta.source, delta.slug)}/codex-out.json`,
      ...contentPathsForSlug(delta.slug),
    ]) {
      paths.add(rel);
    }
  }
  restoreTracked([...paths]);
  removeUntracked([...paths]);
}

function effectiveDebt(verdict: Verdict | null): number {
  return verdict === null ? 5 : weightedDebtForVerdict(verdict);
}

function batchOutcome(report: ClosureReport): {
  beforeDebt: number;
  afterDebt: number;
  improvedCount: number;
  regressionCount: number;
  success: boolean;
} {
  let beforeDebt = 0;
  let afterDebt = 0;
  let improvedCount = 0;
  let regressionCount = 0;
  for (const delta of report.deltas) {
    const before = effectiveDebt(delta.before);
    const after = effectiveDebt(delta.after);
    beforeDebt += before;
    afterDebt += after;
    if (after < before) improvedCount += 1;
    if (after > before) regressionCount += 1;
  }
  return {
    beforeDebt,
    afterDebt,
    improvedCount,
    regressionCount,
    success: afterDebt < beforeDebt && improvedCount > 0 && regressionCount < improvedCount,
  };
}

function appendFailureLog(payload: unknown): void {
  ensureParent(DEFAULT_FAILED_ATTEMPTS_PATH);
  fs.appendFileSync(DEFAULT_FAILED_ATTEMPTS_PATH, JSON.stringify(payload) + "\n", "utf8");
}

function closeLoopArgsForCluster(args: Args, cluster: string): CloseLoopArgs {
  return {
    source: args.source,
    kind: args.kind,
    top: 15,
    cluster,
    limit: args.limit,
    execute: false,
    backend: args.backend,
  };
}

function selectedSlugsForCluster(args: Args, cluster: string): ReadonlyArray<string> {
  const queue = loadQueue();
  const rows = loadRows(args.source, queue);
  const clusters = buildClusters(rows, queue, args.kind);
  return selectSlugs(closeLoopArgsForCluster(args, cluster), rows, queue, clusters);
}

function resultSummaryForSlug(source: Source, slug: string): string {
  const resultPath = resultPathForSlug(source, slug);
  const verdict = currentVerdictForSlug(source, slug);
  if (!fs.existsSync(resultPath)) {
    return `- ${slug}: no result.json, current verdict=${verdict ?? "missing"}`;
  }
  const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8")) as {
    outcome?: string;
    proposed_widenings?: ReadonlyArray<{
      name?: string;
      justification?: string;
    }>;
    notes?: string;
  };
  const widenings = (parsed.proposed_widenings ?? [])
    .slice(0, 3)
    .map((w) => `${w.name ?? "unnamed"}: ${w.justification ?? "no justification"}`)
    .join(" | ");
  return `- ${slug}: verdict=${verdict ?? "missing"}, outcome=${parsed.outcome ?? "unknown"}, widenings=${widenings || "none"}, notes=${parsed.notes ?? "none"}`;
}

function surfaceAttemptPrompt(args: Args, cluster: string, selectedSlugs: ReadonlyArray<string>): string {
  const queue = loadQueue();
  const evidence = selectedSlugs
    .map((slug) => {
      const row = queue.get(slug);
      if (!row) return `- ${slug}: missing queue row`;
      return resultSummaryForSlug(row.source, slug);
    })
    .join("\n");
  return [
    "You are editing the real repository to reduce one reusable surface gap.",
    "",
    `Target cluster: ${cluster}`,
    `Target source: ${args.source}`,
    `Target kind: ${args.kind ?? "all"}`,
    `Target slugs: ${selectedSlugs.join(", ")}`,
    "",
    "Goal:",
    "- make one bounded reusable TS/package surface change that can reduce pressure for this cluster",
    "- avoid per-slug hacks or slug checks",
    "- if you add a new atom kind, update scripts/content-surface-survey/atom-whitelist.ts",
    "- you may edit packages/prototype-content-surface/src/**, scripts/content-surface-survey/atom-whitelist.ts, and content files for the target slugs if needed",
    "- do not commit",
    "- keep the change as small and reusable as possible",
    "- do not read broad plans or README files unless blocked; inspect the concrete files below first",
    "",
    "Inspect these files first:",
    "- packages/prototype-content-surface/src/surface/types.ts",
    "- packages/prototype-content-surface/src/interpreter/tracer.ts",
    "- packages/prototype-content-surface/src/interpreter/mermaid.ts",
    "- scripts/content-surface-survey/atom-whitelist.ts",
    "- scripts/content-surface-survey/results-srd/<slug>/{result.json,verdict.json} for the target slugs",
    "",
    "Evidence:",
    evidence,
    "",
    "If the cluster is too composite or no reusable change is justified, make no code changes and exit.",
  ].join("\n");
}

function assertBatchBaselineReady(): void {
  const status = git(["status", "--porcelain", "--untracked-files=no"]);
  if (status.status !== 0) {
    throw new Error(`git status failed before batch: ${status.stderr || status.stdout}`.trim());
  }
  if (status.stdout.trim().length > 0) {
    throw new Error("surface-change loop requires a clean tracked worktree at batch start");
  }
}

function attemptSurfaceChange(args: Args, cluster: string): SurfaceAttempt {
  const selectedSlugs = selectedSlugsForCluster(args, cluster);
  if (selectedSlugs.length === 0) {
    throw new Error(`no selected slugs for cluster ${cluster}`);
  }
  assertBatchBaselineReady();
  const prompt = surfaceAttemptPrompt(args, cluster, selectedSlugs);
  const timeoutSeconds = Number(process.env.SURFACE_AGENT_TIMEOUT_SECONDS ?? "240");
  const codexCmd = process.env.CODEX_CMD ?? "codex";
  const codexArgs = ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", repoRoot()];
  if (process.env.CODEX_MODEL && process.env.CODEX_MODEL.length > 0) {
    codexArgs.push("-m", process.env.CODEX_MODEL);
  }
  codexArgs.push("-");

  const result = spawnSync(
    "timeout",
    ["--kill-after=30s", `${timeoutSeconds}s`, codexCmd, ...codexArgs],
    {
      cwd: repoRoot(),
      input: prompt,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) {
    if (result.status === 124) {
      throw new Error(`surface-change attempt timed out for ${cluster}`);
    }
    throw new Error(`surface-change attempt failed for ${cluster} (exit=${result.status ?? "signal"})`);
  }
  const changes = worktreeChanges();
  const changedPaths = [...new Set([...changes.tracked, ...changes.untracked])];
  if (touchesPrototypeTypeScript(changedPaths)) {
    assertPrototypeTypecheckPasses();
  }
  return {
    cluster,
    selectedSlugs,
    changedPaths,
  };
}

function buildGlobalSnapshot(
  args: Args,
  state: PersistedState,
  report?: ClosureReport,
): GlobalSnapshot {
  const { queue, rows, queueUnits } = loadEffectiveRows(args);
  const clusters = buildClusters(rows, queue, args.kind).slice(0, 10);
  const totals = {
    queueUnits,
    observedUnits: rows.length,
    structural_widening: rows.filter((row) => row.verdict === "structural_widening").length,
    atom_widening: rows.filter((row) => row.verdict === "atom_widening").length,
    surface_widening: rows.filter((row) => row.verdict === "surface_widening").length,
    clean: rows.filter((row) => row.verdict === "clean").length,
    dm_agenda: rows.filter((row) => row.verdict === "dm_agenda").length,
    invalid: rows.filter((row) => row.verdict === "invalid").length,
    refused: rows.filter((row) => row.verdict === "refused").length,
    missing: queueUnits - rows.length,
  };
  return {
    recordedAt: new Date().toISOString(),
    batch: state.batch,
    source: args.source,
    kind: args.kind,
    backend: args.backend,
    currentCluster: state.currentCluster,
    selectedCluster: report?.cluster ?? state.currentCluster ?? null,
    summary: report?.summary,
    totals,
    weightedDebt: rows.reduce((sum, row) => sum + weightedDebtForVerdict(row.verdict), 0),
    topClusters: clusters.map((cluster) => ({
      canonical: cluster.canonical,
      count: cluster.count,
      verdicts: cluster.verdicts,
    })),
  };
}

function writeObservability(args: Args, state: PersistedState, report?: ClosureReport): void {
  const snapshot = buildGlobalSnapshot(args, state, report);
  ensureParent(DEFAULT_LATEST_PATH);
  fs.writeFileSync(DEFAULT_LATEST_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  const history: HistoryRecord = {
    recordedAt: snapshot.recordedAt,
    batch: snapshot.batch,
    cluster: snapshot.selectedCluster ?? null,
    source: snapshot.source,
    kind: snapshot.kind,
    backend: snapshot.backend,
    summary: snapshot.summary,
    stopReason: state.stopReason,
    error: state.lastError,
    weightedDebt: snapshot.weightedDebt,
    totals: snapshot.totals,
    topClusters: snapshot.topClusters,
    reportPath: state.lastReportPath,
  };
  ensureParent(DEFAULT_HISTORY_PATH);
  fs.appendFileSync(DEFAULT_HISTORY_PATH, JSON.stringify(history) + "\n", "utf8");
}

function clusterEligible(cluster: ClusterRecord, queueKind?: string, minClusterSize = 2): boolean {
  if (cluster.count < minClusterSize) return false;
  if (queueKind && !cluster.kinds.includes(queueKind)) return false;
  return true;
}

function clusterScore(cluster: ClusterRecord): number {
  const verdictPenalty =
    cluster.verdicts.includes("dm_agenda") || cluster.verdicts.includes("refused") ? 2 : 0;
  const structuralBias = cluster.verdicts.includes("structural_widening") ? 2 : 0;
  const surfaceBias = cluster.verdicts.includes("surface_widening") ? 1 : 0;
  const namePenalty =
    (/Record|UnitRecord|family|\+/.test(cluster.canonical) ? 12 : 0) +
    (/[A-Z]/.test(cluster.canonical) ? 4 : 0);
  return cluster.count * 10 + structuralBias + surfaceBias - verdictPenalty - namePenalty;
}

function pickNextCluster(args: Args, attempted: Set<string>): ClusterRecord | null {
  const queue = loadQueue();
  const rows = loadRows(args.source, queue);
  const clusters = buildClusters(rows, queue, args.kind)
    .filter((cluster) => clusterEligible(cluster, args.kind, args.minClusterSize))
    .filter((cluster) => !attempted.has(cluster.canonical))
    .sort((a, b) => clusterScore(b) - clusterScore(a) || a.canonical.localeCompare(b.canonical));
  return clusters[0] ?? null;
}

function runBatch(args: Args, cluster: string): { reportPath: string; report: ClosureReport } {
  const reportPath = defaultReportPath(cluster);
  const command = [
    "timeout",
    "--kill-after=30s",
    `${args.batchTimeoutSeconds}s`,
    "pnpm",
    "--filter",
    "@dnd/prototype-content-surface",
    "exec",
    "tsx",
    "../../scripts/content-surface-survey/close-loop.ts",
    "--source",
    args.source,
    "--cluster",
    cluster,
    "--limit",
    String(args.limit),
    "--execute",
    "--backend",
    args.backend,
    "--report-path",
    reportPath,
  ];
  if (args.kind) {
    command.push("--kind", args.kind);
  }

  const result = spawnSync(command[0]!, command.slice(1), {
    cwd: repoRoot(),
    stdio: "inherit",
    env: {
      ...process.env,
      MAX_PARALLEL: "1",
    },
  });

  if (result.status !== 0) {
    if (result.status === 124) {
      throw new Error(`close-loop batch timed out for ${cluster}`);
    }
    throw new Error(`close-loop batch failed for ${cluster} (exit=${result.status ?? "signal"})`);
  }

  return {
    reportPath,
    report: JSON.parse(fs.readFileSync(reportPath, "utf8")) as ClosureReport,
  };
}

function summarizeStop(reason: string, state: PersistedState): void {
  state.stopReason = reason;
  process.stdout.write(
    `\nAuto loop stop: ${reason}. batches=${state.batch}, improved_batches=${state.improvedBatches}, error_streak=${state.errorStreak}\n`,
  );
}

function isTransientBatchError(message: string): boolean {
  return (
    /another survey run is already active/.test(message) ||
    /exit=67/.test(message) ||
    /timed out/.test(message)
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  assertAutoCommitReady(args);
  const releaseLock = acquireLock(args.lockPath, args.statePath);
  try {
    const state = loadState(args);
    const attempted = new Set<string>(state.attempted);

    while (state.batch < args.maxBatches) {
      waitForSurveyIdle(args, state);

      const cluster = pickNextCluster(args, attempted);
      if (!cluster) {
        summarizeStop("no eligible clusters left", state);
        saveState(args.statePath, state);
        return;
      }

      state.batch += 1;
      state.currentCluster = cluster.canonical;
      state.currentBatchStartedAt = new Date().toISOString();
      saveState(args.statePath, state);

      process.stdout.write(
        `\n=== Auto batch ${state.batch}/${args.maxBatches}: ${cluster.canonical} (${cluster.count} units) ===\n`,
      );

      try {
        const surfaceAttempt = attemptSurfaceChange(args, cluster.canonical);
        if (surfaceAttempt.changedPaths.length === 0) {
          throw new Error(`surface-change attempt made no changes for ${cluster.canonical}`);
        }
        const { reportPath, report } = runBatch(args, cluster.canonical);
        state.lastReportPath = reportPath;
        state.lastError = undefined;
        state.errorStreak = 0;
        cleanupBatchNoise(report);
        const outcome = batchOutcome(report);
        if (outcome.success) {
          attempted.add(cluster.canonical);
          state.attempted = [...attempted];
          state.improvedBatches += 1;
          state.noImproveStreak = 0;
          writeObservability(args, state, report);
          maybeCommitBatch(args, state, report, surfaceAttempt.changedPaths);
        } else {
          appendFailureLog({
            recordedAt: new Date().toISOString(),
            cluster: cluster.canonical,
            source: args.source,
            kind: args.kind,
            selectedSlugs: surfaceAttempt.selectedSlugs,
            changedPaths: surfaceAttempt.changedPaths,
            reportPath,
            outcome,
            reason: "surface change did not reduce weighted debt enough",
          });
          revertBatchArtifacts(report);
          restoreTracked(surfaceAttempt.changedPaths);
          removeUntracked(surfaceAttempt.changedPaths);
          attempted.add(cluster.canonical);
          state.attempted = [...attempted];
          state.noImproveStreak += 1;
          writeObservability(args, state, report);
        }
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        process.stderr.write(`auto-close-loop: ${state.lastError}\n`);
        if (isTransientBatchError(state.lastError)) {
          process.stderr.write("auto-close-loop: transient batch failure; will retry after sleep\n");
        } else {
          const changes = worktreeChanges();
          restoreTracked(changes.tracked);
          removeUntracked(changes.untracked);
          appendFailureLog({
            recordedAt: new Date().toISOString(),
            cluster: cluster.canonical,
            source: args.source,
            kind: args.kind,
            error: state.lastError,
            changedPaths: [...changes.tracked, ...changes.untracked],
          });
          attempted.add(cluster.canonical);
          state.attempted = [...attempted];
          state.errorStreak += 1;
          writeObservability(args, state);
        }
      } finally {
        state.currentCluster = undefined;
        state.currentBatchStartedAt = undefined;
        saveState(args.statePath, state);
      }

      if (state.errorStreak >= args.maxErrors) {
        summarizeStop("too many failed batches", state);
        saveState(args.statePath, state);
        writeObservability(args, state);
        return;
      }

      if (state.noImproveStreak >= args.maxNoImprove) {
        summarizeStop("too many no-improve batches", state);
        saveState(args.statePath, state);
        writeObservability(args, state);
        return;
      }

      sleep(args.sleepSeconds);
    }

    summarizeStop("reached max batches", state);
    saveState(args.statePath, state);
    writeObservability(args, state);
  } finally {
    releaseLock();
  }
}

main();
