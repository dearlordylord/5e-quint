import { execFile, execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Package root holds the `.qnt` corpus; this module lives in `src/`.
const packageRootUrl = new URL("../", import.meta.url);
const packageRootPath = fileURLToPath(packageRootUrl);

// Tests in this corpus are `run test_*` blocks. The lane keys both halves on
// this one prefix -- discovery (which files hold tests) and `--match` (which
// names to run) -- so the two can never disagree about what counts as a test.
const testNamePrefix = "test_";

// A proof module is any package-local `.qnt` file carrying `run test_*` tests.
// Discovering the corpus by content -- not by a hand-maintained import list --
// means a newly added proof slice cannot silently go unrun. The retired
// `battle-runtime-self-tests.qnt` aggregator had already drifted: two slices
// with real tests were never imported, so the per-commit lane skipped them.
const proofModulePattern = new RegExp(`^[ \\t]*run\\s+${testNamePrefix}`, "m");

export function discoverProofModuleNames(): readonly string[] {
  return readdirSync(packageRootPath)
    .filter((name) => name.endsWith(".qnt"))
    .filter((name) =>
      proofModulePattern.test(
        readFileSync(new URL(name, packageRootUrl), "utf8"),
      ),
    )
    .sort();
}

// ~2.5x headroom over the slowest healthy focused slices, which each run their
// own plus transitively-imported `test_` blocks in ~2-2.5 min on the TypeScript
// backend, while still bounding a state-explosion
// blow-up: the whole quint process tree is hard-killed at this deadline, so a
// runaway search surfaces as one module's failure instead of a hang that
// swallows a whole working day unnoticed.
export const proofModuleTimeoutMs = 360_000;

export type ProofModuleOutcome =
  | { readonly tag: "passed"; readonly module: string }
  | { readonly tag: "failed"; readonly module: string; readonly detail: string };

// SIGKILL `rootPid` and every transitive descendant. Node's child_process
// `timeout`/`killSignal` signals only the DIRECT child, so killing `pnpm` at the
// deadline orphaned the `quint` grandchild doing the actual work -- it kept
// burning a core after the test had already reported failure (verified; the same
// zombie hazard CLAUDE.md documents for the Rust evaluator). `detached` +
// negative-pid group kill is unreliable here (the child does not become its own
// group leader in this container), so we enumerate the tree via `ps` -- portable
// across Linux and macOS, with a kill-the-root-alone fallback if `ps` is absent
// -- and kill descendants leaves-first.
function killProcessTree(rootPid: number): void {
  let psLines: readonly string[];
  try {
    psLines = execFileSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" })
      .trim()
      .split("\n");
  } catch {
    try {
      process.kill(rootPid, "SIGKILL");
    } catch {
      // already gone
    }
    return;
  }
  const childrenByParent = new Map<number, number[]>();
  for (const line of psLines) {
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[0]);
    const ppid = Number(parts[1]);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    const siblings = childrenByParent.get(ppid) ?? [];
    siblings.push(pid);
    childrenByParent.set(ppid, siblings);
  }
  const ordered: number[] = [];
  const stack: number[] = [rootPid];
  while (stack.length > 0) {
    const pid = stack.pop();
    if (pid === undefined) break;
    ordered.push(pid);
    for (const child of childrenByParent.get(pid) ?? []) stack.push(child);
  }
  // Leaves-first: a child cannot be re-parented or respawned by a parent we have
  // not killed yet.
  for (const pid of ordered.reverse()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

export async function runProofModule(
  moduleName: string,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(new URL(moduleName, packageRootUrl));
  // Own deadline rather than execFile's built-in `timeout`: the built-in kills
  // only the direct `pnpm` child and orphans the `quint` grandchild, so we run
  // our own timer and kill the whole process tree (see killProcessTree). The
  // explicit `timedOut` flag is the timeout fact at its source -- no sniffing
  // `killed`/`signal` downstream.
  const result = await new Promise<{
    readonly timedOut: boolean;
    readonly error: Error | null;
    readonly stdout: string;
    readonly stderr: string;
  }>((resolve) => {
    let timedOut = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const child = execFile(
      "pnpm",
      // `--match test_` selects the `run test_*` tests by name. Quint runs no
      // tests without it, and `--match .*` pathologically treats every
      // definition as a test (the runaway the monolith risked). Per module the
      // match stays bounded to that file's own in-scope tests.
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        "--match",
        testNamePrefix,
        specPath,
      ],
      {
        encoding: "utf8",
        // Quint prints one line per passing test; the larger slices emit a lot.
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        clearTimeout(deadline);
        resolve({
          timedOut,
          error: error ?? null,
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
        });
      },
    );
    deadline = setTimeout(() => {
      timedOut = true;
      if (child.pid !== undefined) killProcessTree(child.pid);
    }, proofModuleTimeoutMs);
  });

  if (result.error === null) {
    if (!result.stdout.includes("passing")) {
      return {
        tag: "failed",
        module: moduleName,
        detail: `quint test produced no "passing" summary:\n${result.stdout}`,
      };
    }
    return { tag: "passed", module: moduleName };
  }

  // A hard-kill at the deadline is the silent "fast -> forever" blow-up the lane
  // exists to catch. These proofs are deterministic (no nondet), so the work is
  // a pure function of the source closure + quint version: a timeout that is not
  // machine load means the work genuinely grew -- often NOT in this file (a
  // shared import that grew makes every importer pay). The banner says so instead
  // of surfacing a cryptic non-zero exit.
  const banner = result.timedOut
    ? `this module's proofs were hard-killed at ${proofModuleTimeoutMs / 1000}s without finishing -- the "fast -> forever" blow-up this lane exists to catch. These proofs are deterministic: re-run once to rule out machine load, and if it reproduces the work genuinely grew. It need not be a change to THIS file -- a shared import that grew makes every importer pay -- so check the proof's import closure and the quint version, not just the file.`
    : result.error.message;
  return {
    tag: "failed",
    module: moduleName,
    detail: `${banner}\n${result.stderr}${result.stdout}`.trimEnd(),
  };
}
