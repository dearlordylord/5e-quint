// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.scalar-buff
import * as path from "node:path";

import { run } from "@firfi/quint-connect";
import { describe, it } from "vitest";

import {
  createScalarBuffDriver,
  focusedMbtMaxSteps,
  promotedMbtTraces,
  scalarBuffStateCheck,
} from "./battle-runtime-mbt-fixtures.ts";

describe("scalar buff MBT", () => {
  it("replays Longstrider target-specific Speed increase", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-scalar-buff.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createScalarBuffDriver(),
      backend: "typescript",
      nTraces: promotedMbtTraces,
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: scalarBuffStateCheck,
    });
  }, 120_000);
});
