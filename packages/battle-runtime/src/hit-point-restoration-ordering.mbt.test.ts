// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createHitPointRestorationOrderingDriver,
  focusedMbtMaxSteps,
  hitPointRestorationOrderingStateCheck,
  mbtSpecPath,
  mbtTraceCount,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("Hit Point restoration ordering MBT", () => {
  it("projects healing hole-frontier order and restored-HP lifecycle cleanup", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-hit-point-restoration-ordering.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHitPointRestorationOrderingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: hitPointRestorationOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
