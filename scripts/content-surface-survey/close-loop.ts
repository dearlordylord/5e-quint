import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const queuePath = path.join(__dirname, "unit-queue.jsonl");
const srdDatasetPath = path.join(__dirname, "survey-results-srd.jsonl");
const phbRoot = path.join(repoRoot, ".references/xphb-srd-pairing/phb-survey");
const phbDatasetPath = path.join(phbRoot, "survey-results-phb.jsonl");

export type Verdict =
  | "clean"
  | "surface_widening"
  | "atom_widening"
  | "structural_widening"
  | "dm_agenda"
  | "refused"
  | "invalid";

export type Source = "srd-5.2.1" | "xphb";

type ProposedWidening = {
  kind?: string;
  name?: string;
  justification?: string;
  evidence?: string;
};

export type DatasetRow = {
  unit_slug: string;
  verdict: Verdict;
  claude_proposed_widenings: ReadonlyArray<ProposedWidening>;
};

export type QueueRow = {
  slug: string;
  name: string;
  source: Source;
  kind: string;
  tier: number;
};

export type CloseLoopArgs = {
  source: Source | "all";
  kind?: string;
  top: number;
  cluster?: string;
  slugs?: ReadonlyArray<string>;
  limit: number;
  execute: boolean;
  backend: "codex" | "claude";
  reportPath?: string;
};

export type ClusterRecord = {
  canonical: string;
  count: number;
  slugs: ReadonlyArray<string>;
  sources: ReadonlyArray<Source>;
  kinds: ReadonlyArray<string>;
  verdicts: ReadonlyArray<Verdict>;
};

type ClosureDelta = {
  slug: string;
  source: Source;
  kind: string;
  before: Verdict | null;
  after: Verdict | null;
  changed: boolean;
  improved: boolean;
  cleanFlip: boolean;
};

const NORMALIZERS: ReadonlyArray<[RegExp, string]> = [
  [/class.?level.?tier|per.?class.?level|scale.*class.*level/i, "class_level_tiers"],
  [/subclass.?level.?tier/i, "subclass_level_tiers"],
  [/linear.?per.?level|5.*class.*level|pool.*class.*level/i, "linear_per_level"],
  [/pb.?linked|proficiency.?bonus.?linked|scales.?with.?pb/i, "pb_linked_scaling"],
  [/bonus.?action.*(cost|activat)|activationcost\.bonus.?action|castingtime.*bonus/i, "bonus_action_activation"],
  [/reaction.*(cost|activat|trigger)|castingtime.*reaction/i, "reaction_activation"],
  [/extended.?casting|ritual.?casting|minute.?casting|casting.?time.*(minute|hour)/i, "extended_casting_time"],
  [/apply.?condition|applycondition.*effect/i, "apply_condition_effect"],
  [/hp.?pool|hit.?point.?pool/i, "hp_pool_resource"],
  [/restore.?hit.?points|heal.?hp|heal.?pool|heal_hp|heal.?effect/i, "heal_hp_effect"],
  [/temp.?hp|temporary.?hit.?points/i, "grant_temp_hp"],
  [/remove.?condition/i, "remove_condition_effect"],
  [/modify.?ac|ac.?modifier|ac.?bonus|flat.*ac/i, "modify_ac_effect"],
  [/grant.?resistance|damage.?resistance|resistance.?grant/i, "grant_resistance_effect"],
  [/grant.?spell.?access|spell.?access|prepared.?spell/i, "grant_spell_access"],
  [/grant.?proficiency|proficiency.?grant/i, "grant_proficiency"],
  [/grant.?sense|darkvision|truesight|tremorsense/i, "grant_sense"],
  [/movement.?speed|modify.?speed|speed.?buff/i, "modify_speed_effect"],
  [/object.?attachment|attachment.*object/i, "object_attachment"],
];

function parseArgs(argv: ReadonlyArray<string>): CloseLoopArgs {
  const args: CloseLoopArgs = {
    source: "srd-5.2.1",
    top: 15,
    limit: 5,
    execute: false,
    backend: "codex",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    switch (arg) {
      case "--source":
        args.source = (argv[++i] as CloseLoopArgs["source"]) ?? args.source;
        break;
      case "--top":
        args.top = Number(argv[++i] ?? args.top);
        break;
      case "--kind":
        args.kind = argv[++i];
        break;
      case "--cluster":
        args.cluster = argv[++i];
        break;
      case "--slugs":
        args.slugs = (argv[++i] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--limit":
        args.limit = Number(argv[++i] ?? args.limit);
        break;
      case "--execute":
        args.execute = true;
        break;
      case "--backend":
        args.backend = (argv[++i] as CloseLoopArgs["backend"]) ?? args.backend;
        break;
      case "--report-path":
        args.reportPath = argv[++i];
        break;
      case "-h":
      case "--help":
        printUsageAndExit(0);
        break;
      default:
        throw new Error(`unknown flag: ${arg}`);
    }
  }

  if (!["srd-5.2.1", "xphb", "all"].includes(args.source)) {
    throw new Error(`invalid --source: ${args.source}`);
  }
  if (!["codex", "claude"].includes(args.backend)) {
    throw new Error(`invalid --backend: ${args.backend}`);
  }
  if (!Number.isFinite(args.top) || args.top <= 0) {
    throw new Error(`invalid --top: ${args.top}`);
  }
  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    throw new Error(`invalid --limit: ${args.limit}`);
  }

  return args;
}

function printUsageAndExit(code: number): never {
  process.stderr.write(
    [
      "usage: close-loop.ts [options]",
      "",
      "Options:",
      "  --source srd-5.2.1|xphb|all   dataset source to inspect (default: srd-5.2.1)",
      "  --top N                        show top N clusters (default: 15)",
      "  --kind KIND                    restrict rows/selection to one queue kind",
      "  --cluster NAME                 rerun a specific canonical cluster",
      "  --slugs a,b,c                  override cluster selection with explicit slugs",
      "  --limit N                      cap rerun batch size (default: 5)",
      "  --execute                      actually rerun the selected slugs",
      "  --backend codex|claude         rerun backend (default: codex)",
      "  --report-path PATH             write JSON report",
    ].join("\n") + "\n",
  );
  process.exit(code);
}

function loadJsonl<T>(filePath: string): ReadonlyArray<T> {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

export function loadQueue(): Map<string, QueueRow> {
  const queue = new Map<string, QueueRow>();
  for (const row of loadJsonl<QueueRow>(queuePath)) queue.set(row.slug, row);
  return queue;
}

export function loadRows(
  source: Args["source"],
  queue: Map<string, QueueRow>,
): ReadonlyArray<DatasetRow> {
  const rows = [
    ...loadJsonl<DatasetRow>(srdDatasetPath),
    ...loadJsonl<DatasetRow>(phbDatasetPath),
  ];
  if (source === "all") return rows;
  return rows.filter((row) => queue.get(row.unit_slug)?.source === source);
}

export function normalize(rawName: string): string {
  for (const [pattern, canonical] of NORMALIZERS) {
    if (pattern.test(rawName)) return canonical;
  }
  return rawName.trim();
}

export function buildClusters(
  rows: ReadonlyArray<DatasetRow>,
  queue: Map<string, QueueRow>,
  kindFilter?: string,
): ReadonlyArray<ClusterRecord> {
  const clusters = new Map<
    string,
    {
      slugs: Set<string>;
      sources: Set<Source>;
      kinds: Set<string>;
      verdicts: Set<Verdict>;
    }
  >();

  for (const row of rows) {
    for (const widening of row.claude_proposed_widenings) {
      const raw = widening.name?.trim();
      if (!raw) continue;
      const canonical = normalize(raw);
      const queueRow = queue.get(row.unit_slug);
      if (!queueRow) continue;
      if (kindFilter && queueRow.kind !== kindFilter) continue;
      const bucket = clusters.get(canonical) ?? {
        slugs: new Set<string>(),
        sources: new Set<Source>(),
        kinds: new Set<string>(),
        verdicts: new Set<Verdict>(),
      };
      bucket.slugs.add(row.unit_slug);
      bucket.sources.add(queueRow.source);
      bucket.kinds.add(queueRow.kind);
      bucket.verdicts.add(row.verdict);
      clusters.set(canonical, bucket);
    }
  }

  return [...clusters.entries()]
    .map(([canonical, bucket]) => ({
      canonical,
      count: bucket.slugs.size,
      slugs: [...bucket.slugs].sort(),
      sources: [...bucket.sources].sort(),
      kinds: [...bucket.kinds].sort(),
      verdicts: [...bucket.verdicts].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.canonical.localeCompare(b.canonical));
}

export function verdictRank(verdict: Verdict | null): number {
  switch (verdict) {
    case "clean":
      return 0;
    case "surface_widening":
      return 1;
    case "atom_widening":
      return 2;
    case "structural_widening":
      return 3;
    case "dm_agenda":
      return 4;
    case "invalid":
    case "refused":
      return 5;
    case null:
      return 6;
  }
}

export function currentVerdictForSlug(source: Source, slug: string): Verdict | null {
  const verdictPath =
    source === "srd-5.2.1"
      ? path.join(__dirname, "results-srd", slug, "verdict.json")
      : path.join(phbRoot, "results", slug, "verdict.json");
  if (!fs.existsSync(verdictPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(verdictPath, "utf8")) as { verdict?: Verdict };
  return parsed.verdict ?? null;
}

export function datasetVerdictForSlug(
  rows: ReadonlyArray<DatasetRow>,
  slug: string,
): Verdict | null {
  const row = rows.findLast((candidate) => candidate.unit_slug === slug);
  return row?.verdict ?? null;
}

export function selectSlugs(
  args: CloseLoopArgs,
  rows: ReadonlyArray<DatasetRow>,
  queue: Map<string, QueueRow>,
  clusters: ReadonlyArray<ClusterRecord>,
): ReadonlyArray<string> {
  if (args.slugs && args.slugs.length > 0) return args.slugs.slice(0, args.limit);
  if (!args.cluster) return [];
  const cluster = clusters.find((candidate) => candidate.canonical === args.cluster);
  if (!cluster) throw new Error(`unknown cluster: ${args.cluster}`);

  const scored = cluster.slugs
    .map((slug) => {
      const queueRow = queue.get(slug)!;
      if (args.kind && queueRow.kind !== args.kind) {
        return null;
      }
      const before = currentVerdictForSlug(queueRow.source, slug) ?? datasetVerdictForSlug(rows, slug);
      return {
        slug,
        rank: verdictRank(before),
      };
    })
    .filter((entry): entry is { slug: string; rank: number } => entry !== null)
    .sort((a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug));

  return scored.slice(0, args.limit).map((entry) => entry.slug);
}

function renderClusterTable(clusters: ReadonlyArray<ClusterRecord>, top: number): string {
  const lines = [
    "# Top widening clusters",
    "",
    "| Cluster | Count | Sources | Kinds | Sample slugs |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const cluster of clusters.slice(0, top)) {
    lines.push(
      `| \`${cluster.canonical}\` | ${cluster.count} | ${cluster.sources.join(", ")} | ${cluster.kinds.join(", ")} | ${cluster.slugs.slice(0, 4).join(", ")}${cluster.slugs.length > 4 ? ", ..." : ""} |`,
    );
  }
  return lines.join("\n");
}

function rerunSlug(source: Source, slug: string, backend: Args["backend"]): void {
  const env = {
    ...process.env,
    SURVEY_BACKEND: backend,
    MAX_PARALLEL: "1",
    CODEX_TIMEOUT_SECONDS: process.env.CODEX_TIMEOUT_SECONDS ?? "600",
    CLAUDE_TIMEOUT_SECONDS: process.env.CLAUDE_TIMEOUT_SECONDS ?? "600",
  };

  const command = path.join(__dirname, "run-survey.sh");
  const result = spawnSync(command, ["--slug", slug, "--force"], {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`rerun failed for ${slug} (source=${source}, exit=${result.status ?? "signal"})`);
  }
}

function writeReport(reportPath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export function defaultReportPath(cluster: string | undefined): string {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const safeCluster = (cluster ?? "manual").replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
  return path.join(repoRoot, ".output", "content-surface-closure", `${stamp}-${safeCluster}.json`);
}

export function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const queue = loadQueue();
  const rows = loadRows(args.source, queue);
  const clusters = buildClusters(rows, queue, args.kind);

  process.stdout.write(renderClusterTable(clusters, args.top) + "\n");

  const selectedSlugs = selectSlugs(args, rows, queue, clusters);
  if (selectedSlugs.length === 0) {
    return;
  }

  const before = selectedSlugs.map((slug) => {
    const queueRow = queue.get(slug);
    if (!queueRow) throw new Error(`slug not found in queue: ${slug}`);
    return {
      slug,
      source: queueRow.source,
      kind: queueRow.kind,
      verdict: currentVerdictForSlug(queueRow.source, slug) ?? datasetVerdictForSlug(rows, slug),
    };
  });

  process.stdout.write("\n# Selected rerun batch\n\n");
  for (const row of before) {
    process.stdout.write(
      `- ${row.slug} (${row.source}, ${row.kind}) before=${row.verdict ?? "missing"}\n`,
    );
  }

  if (!args.execute) return;

  for (const row of before) {
    process.stdout.write(`\n## Rerun ${row.slug}\n\n`);
    rerunSlug(row.source, row.slug, args.backend);
  }

  const deltas: ClosureDelta[] = before.map((row) => {
    const after = currentVerdictForSlug(row.source, row.slug);
    return {
      slug: row.slug,
      source: row.source,
      kind: row.kind,
      before: row.verdict,
      after,
      changed: row.verdict !== after,
      improved: verdictRank(after) < verdictRank(row.verdict),
      cleanFlip: row.verdict !== "clean" && after === "clean",
    };
  });

  const payload = {
    cluster: args.cluster ?? null,
    backend: args.backend,
    source: args.source,
    selectedSlugs,
    summary: {
      improved: deltas.filter((delta) => delta.improved).length,
      cleanFlips: deltas.filter((delta) => delta.cleanFlip).length,
      changed: deltas.filter((delta) => delta.changed).length,
    },
    deltas,
  };

  process.stdout.write("\n# Closure report\n\n");
  for (const delta of deltas) {
    process.stdout.write(
      `- ${delta.slug}: ${delta.before ?? "missing"} -> ${delta.after ?? "missing"}${delta.cleanFlip ? " [clean-flip]" : delta.improved ? " [improved]" : ""}\n`,
    );
  }

  const reportPath = args.reportPath ?? defaultReportPath(args.cluster);
  writeReport(reportPath, payload);
  process.stdout.write(`\nWrote ${reportPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
