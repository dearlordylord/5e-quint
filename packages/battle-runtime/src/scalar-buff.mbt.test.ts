// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.scalar-buff
import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createScalarBuffDriver,
  createScalarBuffRouteDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedScalarBuffStateCheck,
  run,
  scalarBuffStateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("scalar buff MBT", () => {
  it("replays Longstrider target-specific Speed increase", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-scalar-buff.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createScalarBuffDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: scalarBuffStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("observes Longstrider qRoute through public reducer entrypoints", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-scalar-buff.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createScalarBuffRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: reducerRoutedScalarBuffStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
