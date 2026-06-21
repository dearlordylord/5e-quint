// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createConcentrationBreakTeardownRouteDriver,
  createDeathSavingThrowRouteDriver,
  createHitPointRestorationOrderingRouteDriver,
  createMagicMissileRouteDriver,
  createSaveGatedSpellOrderingRouteDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedConcentrationBreakTeardownStateCheck,
  reducerRoutedDeathSavingThrowStateCheck,
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

  it("routes Death Saving Throw through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-death-saving-throw.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDeathSavingThrowRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: reducerRoutedDeathSavingThrowStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Concentration teardown through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-concentration-break-teardown.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createConcentrationBreakTeardownRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: reducerRoutedConcentrationBreakTeardownStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
