// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  commandOrderingStateCheck,
  createCommandOrderingDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("Command ordering MBT", () => {
  it("projects Command cast and next-turn hole-frontier order", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-command-ordering.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createCommandOrderingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: commandOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
