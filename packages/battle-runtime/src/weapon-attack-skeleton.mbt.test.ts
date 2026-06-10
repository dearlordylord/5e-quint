// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.ATTACK_BRANCHES
import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  battleRuntimeStateCheck,
  createBattleRuntimeDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("weapon attack skeleton MBT", () => {
  it("replays Rogue weapon Attack and Sneak Attack traces against a Skeleton target", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-weapon-attack-skeleton.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBattleRuntimeDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: battleRuntimeStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
