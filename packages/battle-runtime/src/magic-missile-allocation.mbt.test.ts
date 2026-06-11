import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  battleRuntimeStateCheck,
  createMagicMissileDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("Magic Missile allocation MBT", () => {
  it("replays target allocation against a Skeleton target", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-magic-missile.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMagicMissileDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: battleRuntimeStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
