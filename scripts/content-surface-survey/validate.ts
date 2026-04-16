// Harness validator — runs in a worker's working directory after claude
// has written its artifacts. Produces an authoritative verdict that
// doesn't trust claude's self-report.
//
// Expected working directory is a copy of packages/prototype-content-surface/,
// with at least `content/<slug>.json` and optionally `result.json` + `proposal.md`.
//
// Run from worker:
//   tsx <path-to-scripts>/content-surface-survey/validate.ts \
//     --slug <slug> --prototype-dir <path-to-prototype> \
//     [--out <results-dir>/<slug>/verdict.json]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { isKnownAtom, isKnownRelation } from "./atom-whitelist.ts";

type Verdict =
  | "clean"
  | "surface_widening"
  | "atom_widening"
  | "structural_widening"
  | "dm_agenda"
  | "refused"
  | "invalid";

type DatasetRow = {
  readonly unit_slug: string;
  readonly verdict: Verdict;
  readonly typecheck_exit: number;
  readonly tracer_exit: number;
  readonly harness_atoms: ReadonlyArray<string>;
  readonly harness_relations: ReadonlyArray<string>;
  readonly unknown_atoms: ReadonlyArray<string>;
  readonly unknown_relations: ReadonlyArray<string>;
  readonly claude_self_verdict: string | null;
  readonly claude_proposed_widenings: ReadonlyArray<unknown>;
  readonly claude_confidence: string | null;
  readonly discrepancies: ReadonlyArray<string>;
  readonly typecheck_stderr: string;
  readonly tracer_stderr: string;
  readonly wall_seconds: number;
};

function parseArgs(): {
  slug: string;
  prototypeDir: string;
  outPath: string | null;
  resultJsonPath: string | null;
} {
  const args = process.argv.slice(2);
  let slug = "";
  let prototypeDir = "";
  let outPath: string | null = null;
  let resultJsonPath: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--slug") slug = args[++i] ?? "";
    else if (arg === "--prototype-dir") prototypeDir = args[++i] ?? "";
    else if (arg === "--out") outPath = args[++i] ?? null;
    else if (arg === "--result-json") resultJsonPath = args[++i] ?? null;
  }
  if (!slug || !prototypeDir) {
    process.stderr.write(
      "usage: validate.ts --slug <slug> --prototype-dir <path> [--out <verdict.json>] [--result-json <path>]\n",
    );
    process.exit(64);
  }
  return { slug, prototypeDir, outPath, resultJsonPath };
}

function runCmd(
  cmd: string,
  args: ReadonlyArray<string>,
  cwd: string,
): { exit: number; stdout: string; stderr: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return {
    exit: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function extractAtomsAndRelations(trace: string): {
  atoms: ReadonlyArray<string>;
  relations: ReadonlyArray<string>;
} {
  // Trace is a markdown file with a "## Atoms referenced" section and a
  // "## Relations referenced" section, each listing `- \`atom_name\``.
  const lines = trace.split("\n");
  const atoms: string[] = [];
  const relations: string[] = [];
  let current: "none" | "atoms" | "relations" = "none";
  for (const line of lines) {
    if (line.startsWith("## Atoms referenced")) current = "atoms";
    else if (line.startsWith("## Relations referenced")) current = "relations";
    else if (line.startsWith("## ")) current = "none";
    else if (line.startsWith("- `") && line.endsWith("`")) {
      const name = line.slice(3, -1);
      if (current === "atoms") atoms.push(name);
      else if (current === "relations") relations.push(name);
    }
  }
  return { atoms, relations };
}

function loadClaudeSelfReport(
  prototypeDir: string,
  slug: string,
  explicitPath: string | null,
): {
  verdict: string | null;
  atoms: ReadonlyArray<string>;
  relations: ReadonlyArray<string>;
  proposedWidenings: ReadonlyArray<unknown>;
  confidence: string | null;
} {
  // Preferred name is slug-prefixed (avoids concurrent-worker collisions
  // when Claude resolves relative paths to a shared root). Fall back to
  // the unprefixed name for legacy runs.
  const candidates = [
    ...(explicitPath ? [explicitPath] : []),
    path.join(prototypeDir, `result-${slug}.json`),
    path.join(prototypeDir, "result.json"),
  ];
  const p = candidates.find((c) => fs.existsSync(c));
  if (!p) {
    return { verdict: null, atoms: [], relations: [], proposedWidenings: [], confidence: null };
  }
  try {
    const raw = fs.readFileSync(p, "utf8");
    const obj = JSON.parse(raw) as {
      outcome?: string;
      atoms_used?: ReadonlyArray<string>;
      relations_used?: ReadonlyArray<string>;
      proposed_widenings?: ReadonlyArray<unknown>;
      confidence?: string;
    };
    return {
      verdict: obj.outcome ?? null,
      atoms: obj.atoms_used ?? [],
      relations: obj.relations_used ?? [],
      proposedWidenings: obj.proposed_widenings ?? [],
      confidence: obj.confidence ?? null,
    };
  } catch {
    return { verdict: null, atoms: [], relations: [], proposedWidenings: [], confidence: null };
  }
}

// Verdict priority — higher = more attention needed. The final harness
// verdict is the max over the two signals (tracer + claude). The tracer
// catches invalid JSON / unknown atoms; claude catches semantic-mismatch
// that the tracer can't see (e.g., using `grant_extra_action` to stand
// in for a missing `restore_hit_points` atom — JSON passes, encoding
// is semantically wrong).
const VERDICT_PRIORITY: Record<Verdict, number> = {
  clean: 0,
  dm_agenda: 1,
  surface_widening: 2,
  atom_widening: 3,
  structural_widening: 4,
  refused: 5,
  invalid: 6,
};

function verdictFromTracer(
  typecheckExit: number,
  tracerExit: number,
  unknownAtoms: ReadonlyArray<string>,
  unknownRelations: ReadonlyArray<string>,
): Verdict {
  if (typecheckExit !== 0) return "invalid";
  if (tracerExit !== 0) return "atom_widening";
  if (unknownAtoms.length > 0 || unknownRelations.length > 0) return "atom_widening";
  return "clean";
}

function verdictFromClaude(
  selfVerdict: string | null,
  proposedWidenings: ReadonlyArray<unknown>,
): Verdict {
  if (!selfVerdict) return "clean";
  const hasProposals = proposedWidenings.length > 0;
  switch (selfVerdict) {
    case "refused":
      return "refused";
    case "dm_agenda":
      return "dm_agenda";
    case "invalid":
      return "invalid";
    case "atom_widening":
      return hasProposals ? "atom_widening" : "clean";
    case "surface_widening":
      return hasProposals ? "surface_widening" : "clean";
    case "structural_widening":
      return hasProposals ? "structural_widening" : "clean";
    case "clean":
      return "clean";
    default:
      return "clean";
  }
}

function classify(
  typecheckExit: number,
  tracerExit: number,
  unknownAtoms: ReadonlyArray<string>,
  unknownRelations: ReadonlyArray<string>,
  claudeSelfVerdict: string | null,
  claudeProposedWidenings: ReadonlyArray<unknown>,
): Verdict {
  const fromTracer = verdictFromTracer(
    typecheckExit,
    tracerExit,
    unknownAtoms,
    unknownRelations,
  );
  const fromClaude = verdictFromClaude(claudeSelfVerdict, claudeProposedWidenings);
  return VERDICT_PRIORITY[fromTracer] >= VERDICT_PRIORITY[fromClaude]
    ? fromTracer
    : fromClaude;
}

function main(): void {
  const { slug, prototypeDir, outPath, resultJsonPath } = parseArgs();
  const started = Date.now();

  const jsonPath = path.join(prototypeDir, "content", `${slug}.json`);
  const selfReport = loadClaudeSelfReport(prototypeDir, slug, resultJsonPath);
  if (!fs.existsSync(jsonPath)) {
    const selfOnlyVerdict = verdictFromClaude(
      selfReport.verdict,
      selfReport.proposedWidenings,
    );
    const missingJsonIsAcceptable =
      selfOnlyVerdict !== "clean" && selfOnlyVerdict !== "invalid";
    emit(slug, outPath, {
      unit_slug: slug,
      verdict: missingJsonIsAcceptable ? selfOnlyVerdict : "invalid",
      typecheck_exit: -1,
      tracer_exit: -1,
      harness_atoms: [],
      harness_relations: [],
      unknown_atoms: [],
      unknown_relations: [],
      claude_self_verdict: selfReport.verdict,
      claude_proposed_widenings: selfReport.proposedWidenings,
      claude_confidence: selfReport.confidence,
      discrepancies: [
        missingJsonIsAcceptable
          ? `no content/${slug}.json authored; accepted self-report-only widening path`
          : `missing content/${slug}.json`,
      ],
      typecheck_stderr: "",
      tracer_stderr: "",
      wall_seconds: (Date.now() - started) / 1000,
    });
    return;
  }

  const typecheck = runCmd("pnpm", ["typecheck"], prototypeDir);
  const tracer = runCmd(
    "pnpm",
    ["exec", "tsx", "src/run.ts", `content/${slug}.json`, "--out", `content/${slug}.trace.md`],
    prototypeDir,
  );

  const tracePath = path.join(prototypeDir, "content", `${slug}.trace.md`);
  const trace = fs.existsSync(tracePath) ? fs.readFileSync(tracePath, "utf8") : "";
  const { atoms, relations } = extractAtomsAndRelations(trace);

  const unknownAtoms = atoms.filter((a) => !isKnownAtom(a));
  const unknownRelations = relations.filter((r) => !isKnownRelation(r));

  const discrepancies: string[] = [];
  const selfAtomSet = new Set(selfReport.atoms);
  const harnessAtomSet = new Set(atoms);
  for (const a of selfReport.atoms) {
    if (!harnessAtomSet.has(a)) discrepancies.push(`claude claimed atom '${a}' not in tracer output`);
  }
  for (const a of atoms) {
    if (!selfAtomSet.has(a) && selfReport.atoms.length > 0) {
      discrepancies.push(`tracer emitted atom '${a}' not in claude's claim`);
    }
  }

  const verdict = classify(
    typecheck.exit,
    tracer.exit,
    unknownAtoms,
    unknownRelations,
    selfReport.verdict,
    selfReport.proposedWidenings,
  );

  emit(slug, outPath, {
    unit_slug: slug,
    verdict,
    typecheck_exit: typecheck.exit,
    tracer_exit: tracer.exit,
    harness_atoms: atoms,
    harness_relations: relations,
    unknown_atoms: unknownAtoms,
    unknown_relations: unknownRelations,
    claude_self_verdict: selfReport.verdict,
    claude_proposed_widenings: selfReport.proposedWidenings,
    claude_confidence: selfReport.confidence,
    discrepancies,
    typecheck_stderr: typecheck.stderr.slice(0, 2000),
    tracer_stderr: tracer.stderr.slice(0, 2000),
    wall_seconds: (Date.now() - started) / 1000,
  });
}

function emit(slug: string, outPath: string | null, row: DatasetRow): void {
  const line = JSON.stringify(row);
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, line + "\n", "utf8");
  }
  process.stdout.write(line + "\n");
}

main();
