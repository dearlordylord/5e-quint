import * as path from "node:path";

import { run } from "@firfi/quint-connect";
import { describe, it } from "vitest";

import {
  battleRuntimeStateCheck,
  createMagicMissileDriver,
  focusedMbtMaxSteps,
  promotedMbtTraces,
} from "./battle-runtime-mbt-fixtures.ts";

describe("Magic Missile allocation MBT", () => {
  it("replays target allocation against a Skeleton target", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-magic-missile.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMagicMissileDriver(),
      backend: "typescript",
      nTraces: promotedMbtTraces,
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: battleRuntimeStateCheck,
    });
  }, 120_000);
});
