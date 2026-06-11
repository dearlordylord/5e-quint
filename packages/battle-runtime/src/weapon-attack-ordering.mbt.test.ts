// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import * as path from "node:path";

import { run } from "@firfi/quint-connect";
import { describe, it } from "vitest";

import {
  createWeaponAttackOrderingDriver,
  focusedMbtMaxSteps,
  mbtTraceCount,
  weaponAttackOrderingStateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("weapon attack ordering MBT", () => {
  it("projects weapon Attack hole-frontier order and ordering rejections", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-weapon-attack-ordering.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponAttackOrderingDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: weaponAttackOrderingStateCheck,
    });
  }, 120_000);
});
