import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

// ~2.5x headroom over the slowest healthy module (measured: the full-shell
// slices each run their own plus transitively-imported `test_` blocks in
// ~2-2.5 min on the typescript backend) while still bounding a state-explosion
// regression: the child Quint process is hard-killed at this deadline, so a
// runaway search surfaces as one module's failure instead of a hang that
// swallows a whole working day unnoticed.
export const proofModuleTimeoutMs = 360_000;

export type ProofModuleOutcome =
  | { readonly tag: "passed"; readonly module: string }
  | { readonly tag: "failed"; readonly module: string; readonly detail: string };

export async function runProofModule(
  moduleName: string,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(new URL(moduleName, packageRootUrl));
  try {
    const { stdout } = await execFileAsync(
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
        // Kill the child at the deadline so "forever" becomes a bounded,
        // attributable per-module failure rather than a process that lingers.
        timeout: proofModuleTimeoutMs,
        killSignal: "SIGKILL",
        // Quint prints one line per passing test; the larger slices emit a lot.
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    if (!stdout.includes("passing")) {
      return {
        tag: "failed",
        module: moduleName,
        detail: `quint test produced no "passing" summary:\n${stdout}`,
      };
    }
    return { tag: "passed", module: moduleName };
  } catch (error) {
    const proc = error as {
      stdout?: unknown;
      stderr?: unknown;
      killed?: boolean;
      signal?: string;
    };
    const stdout = typeof proc.stdout === "string" ? proc.stdout : "";
    const stderr = typeof proc.stderr === "string" ? proc.stderr : "";
    // A hard-kill at the deadline means the proof ran away (likely a
    // state-explosion regression); say so plainly so the failure is actionable
    // rather than a cryptic non-zero exit.
    const timedOut = proc.killed === true || proc.signal === "SIGKILL";
    const banner = timedOut
      ? `exceeded ${proofModuleTimeoutMs}ms and was killed -- likely a runaway/state-explosion regression`
      : error instanceof Error
        ? error.message
        : String(error);
    return {
      tag: "failed",
      module: moduleName,
      detail: `${banner}\n${stderr}${stdout}`.trimEnd(),
    };
  }
}
