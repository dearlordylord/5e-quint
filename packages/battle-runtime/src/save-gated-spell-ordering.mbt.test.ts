// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createSaveGatedSpellOrderingDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
  saveGatedSpellOrderingStateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("save-gated spell ordering MBT", () => {
  it("projects save-gated spell hole-frontier order and ordering labels", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-save-gated-spell-ordering.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSaveGatedSpellOrderingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: saveGatedSpellOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
