import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildClusters,
  defaultReportPath,
  loadQueue,
  loadRows,
  type ClusterRecord,
  type Source,
  type Verdict,
} from "./close-loop.ts";

type Args = {
  source: Source | "all";
  kind?: string;
  backend: "codex" | "claude";
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
    before: Verdict | null;
    after: Verdict | null;
    improved: boolean;
    cleanFlip: boolean;
  }>;
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
  return cluster.count * 10 + structuralBias + surfaceBias - verdictPenalty;
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
        const { reportPath, report } = runBatch(args, cluster.canonical);
        state.lastReportPath = reportPath;
        state.lastError = undefined;
        state.errorStreak = 0;
        attempted.add(cluster.canonical);
        state.attempted = [...attempted];

        if (report.summary.improved > 0) {
          state.improvedBatches += 1;
          state.noImproveStreak = 0;
        } else {
          state.noImproveStreak += 1;
        }
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        process.stderr.write(`auto-close-loop: ${state.lastError}\n`);
        if (isTransientBatchError(state.lastError)) {
          process.stderr.write("auto-close-loop: transient batch failure; will retry after sleep\n");
        } else {
          attempted.add(cluster.canonical);
          state.attempted = [...attempted];
          state.errorStreak += 1;
        }
      } finally {
        state.currentCluster = undefined;
        state.currentBatchStartedAt = undefined;
        saveState(args.statePath, state);
      }

      if (state.errorStreak >= args.maxErrors) {
        summarizeStop("too many failed batches", state);
        saveState(args.statePath, state);
        return;
      }

      if (state.noImproveStreak >= args.maxNoImprove) {
        summarizeStop("too many no-improve batches", state);
        saveState(args.statePath, state);
        return;
      }

      sleep(args.sleepSeconds);
    }

    summarizeStop("reached max batches", state);
    saveState(args.statePath, state);
  } finally {
    releaseLock();
  }
}

main();
