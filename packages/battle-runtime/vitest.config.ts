import { defineConfig } from "vitest/config"

// Reliability bound for the MBT (model-based test) lane.
//
// This package has ~70 *.mbt.test.ts files. Each MBT test drives quint-connect,
// which spawns a Quint evaluator that instantiates the spec's whole import
// closure in memory for every generated trace. When many heavy MBT files run at
// once, the concurrent evaluators oversubscribe CPU and RAM -- the load-dependent
// reason the suite "sometimes" stalls for a long time. Capping the fork pool
// keeps at most a few evaluators alive together, so wall-clock is predictable and
// the run does not thrash. Unit tests are sub-second, so the lower fork count
// barely affects them.
//
// Discovery, resolution, and globals are left at vitest defaults on purpose:
// this file only adds execution bounds, nothing else.
//
// maxForks 6: each fork that is running an MBT file also has one live Quint
// evaluator subprocess, so ~6 forks keeps total processes near the core count
// (one evaluator per core) instead of oversubscribing. Tune for your machine's
// RAM if needed -- lower is safer, higher is faster on idle hardware.
//
// maxConcurrency 3: the opt-in QNT proof lane is one Vitest file with
// `test.concurrent.each(...)`; this keeps its child `quint test` processes
// attributable without launching the whole proof corpus at once.
export default defineConfig({
  test: {
    maxConcurrency: 3,
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 6,
      },
    },
  },
})
