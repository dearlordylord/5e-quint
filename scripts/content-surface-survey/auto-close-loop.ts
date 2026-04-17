import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildClusters,
  currentVerdictForSlug,
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
  minClusterSize: number;
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

function parseArgs(argv: ReadonlyArray<string>): Args {
  const args: Args = {
    source: "srd-5.2.1",
    backend: "codex",
    limit: 2,
    maxBatches: 10,
    maxNoImprove: 2,
    minClusterSize: 2,
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
      case "--min-cluster-size":
        args.minClusterSize = Number(argv[++i] ?? args.minClusterSize);
        break;
      case "-h":
      case "--help":
        usage(0);
        break;
      default:
        throw new Error(`unknown flag: ${arg}`);
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
      "  --max-batches N                stop after N batches (default: 10)",
      "  --max-no-improve N             stop after N no-improve batches (default: 2)",
      "  --min-cluster-size N           skip clusters smaller than N (default: 2)",
    ].join("\n") + "\n",
  );
  process.exit(code);
}

function repoRoot(): string {
  return path.join(path.dirname(new URL(import.meta.url).pathname), "../..");
}

function clusterEligible(
  cluster: ClusterRecord,
  queueKind?: string,
  minClusterSize = 2,
): boolean {
  if (cluster.count < minClusterSize) return false;
  if (queueKind && !cluster.kinds.includes(queueKind)) return false;
  return true;
}

function clusterScore(cluster: ClusterRecord): number {
  const verdictPenalty =
    cluster.verdicts.includes("dm_agenda") || cluster.verdicts.includes("refused") ? 1 : 0;
  const structuralBias = cluster.verdicts.includes("structural_widening") ? 1 : 0;
  return cluster.count * 10 + structuralBias - verdictPenalty;
}

function pickNextCluster(
  args: Args,
  attempted: Set<string>,
): ClusterRecord | null {
  const queue = loadQueue();
  const rows = loadRows(args.source, queue);
  const clusters = buildClusters(rows, queue, args.kind)
    .filter((cluster) => clusterEligible(cluster, args.kind, args.minClusterSize))
    .filter((cluster) => !attempted.has(cluster.canonical))
    .sort((a, b) => clusterScore(b) - clusterScore(a) || a.canonical.localeCompare(b.canonical));
  return clusters[0] ?? null;
}

function runBatch(args: Args, cluster: string): ClosureReport {
  const reportPath = defaultReportPath(cluster);
  const command = [
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
    throw new Error(`close-loop batch failed for ${cluster} (exit=${result.status ?? "signal"})`);
  }

  return JSON.parse(require("node:fs").readFileSync(reportPath, "utf8")) as ClosureReport;
}

function summarizeStop(reason: string, batches: number, improvements: number): void {
  process.stdout.write(
    `\nAuto loop stop: ${reason}. batches=${batches}, improved_batches=${improvements}\n`,
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const attempted = new Set<string>();
  let noImproveStreak = 0;
  let improvedBatches = 0;

  for (let batch = 1; batch <= args.maxBatches; batch += 1) {
    const cluster = pickNextCluster(args, attempted);
    if (!cluster) {
      summarizeStop("no eligible clusters left", batch - 1, improvedBatches);
      return;
    }
    attempted.add(cluster.canonical);
    process.stdout.write(
      `\n=== Auto batch ${batch}/${args.maxBatches}: ${cluster.canonical} (${cluster.count} units) ===\n`,
    );

    const report = runBatch(args, cluster.canonical);
    if (report.summary.improved > 0) {
      improvedBatches += 1;
      noImproveStreak = 0;
    } else {
      noImproveStreak += 1;
    }

    if (noImproveStreak >= args.maxNoImprove) {
      summarizeStop("too many no-improve batches", batch, improvedBatches);
      return;
    }
  }

  summarizeStop("reached max batches", args.maxBatches, improvedBatches);
}

main();
