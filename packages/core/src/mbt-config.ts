/**
 * Shared MBT runtime policy for local test runs vs CI/fuzz runs.
 *
 * Local `pnpm test` needs bounded, deterministic MBT smoke coverage.
 * CI/fuzz runs are responsible for broader random-seed exploration and should
 * override these defaults explicitly via environment variables.
 */

export interface MbtBattleRunShape {
  traceCount: number;
  stepCount: number;
  maxSamples: number;
}

export interface MbtCreatureRunShape {
  traceCount: number;
  stepCount: number;
}

const DEFAULT_LOCAL_BATTLE_SEED = "0x6f8de156";

export function isCiEnv(): boolean {
  return process.env["CI"] === "true";
}

export function getMbtBackend(): "typescript" | "rust" {
  // Rust remains opt-in via MBT_BACKEND=rust. The default stays on the
  // TypeScript backend because the Rust evaluator path is not reliable in this
  // environment.
  return (process.env["MBT_BACKEND"] ?? "typescript") as "typescript" | "rust";
}

export function getBattleMbtRunShape(isDev: boolean): MbtBattleRunShape {
  const isCi = isCiEnv();
  return {
    traceCount: 1,
    stepCount: isDev ? 5 : isCi ? 10 : 3,
    maxSamples: isDev ? 10 : isCi ? 50 : 1,
  };
}

export function getCreatureMbtRunShape(): MbtCreatureRunShape {
  const isCi = isCiEnv();
  return {
    traceCount: isCi ? 50 : 1,
    stepCount: isCi ? 30 : 10,
  };
}

export async function withDefaultLocalBattleSeed<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const previousSeed = process.env["QUINT_SEED"];
  if (!previousSeed && !isCiEnv()) {
    process.env["QUINT_SEED"] = DEFAULT_LOCAL_BATTLE_SEED;
  }
  try {
    return await fn();
  } finally {
    if (!previousSeed && !isCiEnv()) {
      delete process.env["QUINT_SEED"];
    }
  }
}
