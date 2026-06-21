// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createHitPointRestorationOrderingRouteDriver,
  createMagicMissileRouteDriver,
  createSaveGatedSpellOrderingRouteDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedHitPointRestorationOrderingStateCheck,
  reducerRoutedMagicMissileStateCheck,
  reducerRoutedSaveGatedSpellOrderingStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("battle reducer route connector MBT", () => {
  it("routes Magic Missile through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-magic-missile.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMagicMissileRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: reducerRoutedMagicMissileStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes save-gated spell ordering through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-save-gated-spell-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSaveGatedSpellOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: reducerRoutedSaveGatedSpellOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Hit Point restoration through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-hit-point-restoration-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHitPointRestorationOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: reducerRoutedHitPointRestorationOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
