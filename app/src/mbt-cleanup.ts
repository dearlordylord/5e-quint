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
import { execSync } from "node:child_process"

/** Kill all quint_evaluator processes. Safe to call when none exist. */
export function killZombieEvaluators(): void {
  try {
    // pkill returns exit code 1 when no processes match — that's fine
    execSync("pkill -9 -f quint_evaluator", { stdio: "ignore" })
  } catch {
    // No matching processes — expected and fine
  }
}

let signalHandlersRegistered = false

/**
 * Register process-level signal handlers that kill evaluators on exit.
 * Idempotent — safe to call multiple times.
 */
export function registerEvaluatorCleanup(): void {
  if (signalHandlersRegistered) return
  signalHandlersRegistered = true

  const cleanup = () => {
    killZombieEvaluators()
  }

  process.on("exit", cleanup)
  process.on("SIGINT", () => {
    cleanup()
    process.exit(130)
  })
  process.on("SIGTERM", () => {
    cleanup()
    process.exit(143)
  })
  process.on("uncaughtException", (err) => {
    cleanup()
    console.error("Uncaught exception (evaluator cleanup ran):", err)
    process.exit(1)
  })
}
