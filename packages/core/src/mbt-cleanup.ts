/**
 * Kill orphaned quint_evaluator processes.
 *
 * The Rust evaluator runs as a detached child process. When the test runner
 * exits abnormally (timeout, SIGKILL, OOM), the evaluator survives at 100% CPU.
 * Multiple zombies accumulate and starve subsequent runs — the single biggest
 * performance confound in MBT testing (see QUINT_CONNECT_TROUBLESHOOT.md Finding 12).
 *
 * This module provides cleanup hooks for vitest to kill evaluators on:
 * - Normal test completion (afterAll)
 * - Test timeout (vitest's onTestFailed)
 * - Process signals (SIGINT, SIGTERM)
 * - Uncaught exceptions
 */
import { execSync } from "node:child_process";

// The repo's local evaluator compatibility script builds and validates v0.5.0.
// Pin MBT runs to the same version so quint-connect doesn't auto-pick a newer
// installed evaluator with different runtime behavior.
process.env["QUINT_EVALUATOR_VERSION"] ??= "v0.5.0";

/** Kill all MBT subprocesses. Safe to call when none exist. */
export function killZombieEvaluators(): void {
  try {
    // pkill returns exit code 1 when no processes match — that's fine
    execSync("pkill -9 -f quint_evaluator", { stdio: "ignore" });
  } catch {
    // No matching processes — expected and fine
  }
  try {
    // TypeScript-backend MBT runs spawn `quint run ... --mbt` children.
    execSync("pkill -9 -f 'quint run .* --mbt'", { stdio: "ignore" });
  } catch {
    // No matching processes — expected and fine
  }
}

let signalHandlersRegistered = false;

function runningUnderVitest(): boolean {
  return (
    "VITEST" in process.env ||
    "VITEST_POOL_ID" in process.env ||
    "VITEST_WORKER_ID" in process.env
  );
}

/**
 * Register process-level signal handlers that kill evaluators on exit.
 * Idempotent — safe to call multiple times.
 */
export function registerEvaluatorCleanup(): void {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  const cleanup = () => {
    killZombieEvaluators();
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    if (runningUnderVitest()) {
      process.exitCode = 130;
      return;
    }
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    if (runningUnderVitest()) {
      process.exitCode = 143;
      return;
    }
    process.exit(143);
  });
  process.on("uncaughtException", (err) => {
    cleanup();
    console.error("Uncaught exception (evaluator cleanup ran):", err);
    if (runningUnderVitest()) {
      process.exitCode = 1;
      return;
    }
    process.exit(1);
  });
}
