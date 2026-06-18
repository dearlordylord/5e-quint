// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT

import * as path from "node:path";

import { run } from "@firfi/quint-connect";
import { describe, it } from "vitest";

import {
  createReducerSpineContractDriver,
  focusedMbtMaxSteps,
  reducerSpineContractStateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("battle reducer spine contract MBT", () => {
  it("projects the reducer lifecycle from battle start through spell, turn, and weapon damage", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-reducer-spine-contract.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createReducerSpineContractDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(9),
      stateCheck: reducerSpineContractStateCheck,
    });
  }, 120_000);
});
