import { defineConfig } from "vitest/config";

// A battle-runtime worker can exceed 1 GiB even when MBT files are excluded,
// because transforming and collecting the runtime corpus is itself expensive.
// Multiple package workers therefore cannot share this 15-GiB environment
// safely. MBT and QNT proof commands have the additional cross-worktree lock;
// these local bounds also keep one Vitest worker or concurrent proof child at a
// time inside the package.
//
// Test files share one module cache so the 150-file suite does not repeatedly
// collect the full reducer and Surface catalog graph. Tests must construct
// fresh runtime state and restore any globals they modify.
export default defineConfig({
  test: {
    isolate: false,
    maxConcurrency: 1,
    pool: "forks",
    maxWorkers: 1,
  },
});
