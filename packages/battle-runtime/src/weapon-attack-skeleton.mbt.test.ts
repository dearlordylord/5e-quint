// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.ATTACK_BRANCHES
import * as path from "node:path";

import { run } from "@firfi/quint-connect";
import { describe, it } from "vitest";

import {
  battleRuntimeStateCheck,
  createBattleRuntimeDriver,
  focusedMbtMaxSteps,
  promotedMbtTraces,
} from "./battle-runtime-mbt-fixtures.ts";

describe("weapon attack skeleton MBT", () => {
  it("replays Rogue weapon Attack and Sneak Attack traces against a Skeleton target", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-weapon-attack-skeleton.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBattleRuntimeDriver(),
      backend: "typescript",
      nTraces: promotedMbtTraces,
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: battleRuntimeStateCheck,
    });
  }, 120_000);
});
