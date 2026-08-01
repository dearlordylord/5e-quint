import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import type { BattleFill } from "../battle-state-execution.ts";
import { combatantId } from "../battle-runtime.test-support.ts";
import { reconstructReplayContinuationFills } from "./replay-continuation.ts";

describe("reconstructReplayContinuationFills", () => {
  test("keeps the recorded prefix and appends only new submitted suffix fills", () => {
    const target = {
      kind: "targetChoice",
      holeId: holeId("replay-target"),
      value: combatantId("target"),
    } satisfies BattleFill;
    const damageType = {
      kind: "damageTypeChoice",
      holeId: holeId("replay-damage-type"),
      value: "fire",
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills([target], [{ ...target }, damageType]),
    ).toEqual([target, damageType]);
  });

  test("does not collapse separately submitted non-semantic fills", () => {
    const damageType = {
      kind: "damageTypeChoice",
      holeId: holeId("replay-damage-type"),
      value: "fire",
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills([damageType], [{ ...damageType }]),
    ).toEqual([damageType, { ...damageType }]);
  });

  test("matches recorded semantic fills in order before retaining the suffix", () => {
    const firstTarget = {
      kind: "targetChoice",
      holeId: holeId("first-replay-target"),
      value: combatantId("first-target"),
    } satisfies BattleFill;
    const secondTarget = {
      kind: "targetChoice",
      holeId: holeId("second-replay-target"),
      value: combatantId("second-target"),
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills(
        [firstTarget, secondTarget],
        [{ ...secondTarget }, { ...firstTarget }],
      ),
    ).toEqual([firstTarget, secondTarget, { ...firstTarget }]);
  });
});
