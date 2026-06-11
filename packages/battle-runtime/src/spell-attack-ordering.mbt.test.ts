// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createSpellAttackOrderingDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
  spellAttackOrderingStateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("spell attack ordering MBT", () => {
  it("projects spell attack hole-frontier order and earlier-frontier requests", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spell-attack-ordering.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellAttackOrderingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: spellAttackOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
