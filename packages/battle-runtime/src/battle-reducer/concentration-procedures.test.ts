import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";
import type { BattleFill, BattleSubject } from "../index.ts";
import {
  wizardId,
  wizardTurnWithReadiedRay,
} from "../battle-runtime.test-support.ts";
import { resolveEndConcentrationCommand } from "./concentration-procedures.ts";

describe("End Concentration procedure owner", () => {
  test("rejects fills, resolves an active Concentration, and rejects stale replay", () => {
    const state = wizardTurnWithReadiedRay("attackHit").state;
    const subject: Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
    > = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "endConcentration",
    };
    const unexpectedFill = {
      kind: "heldObjectFacts",
      holeId: holeId("test:end-concentration:unexpected-fill"),
      value: { objectIds: [] },
    } as const satisfies BattleFill;

    expect(
      resolveEndConcentrationCommand({
        state,
        subject,
        fills: [unexpectedFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "End Concentration does not accept fills.",
    });

    const resolved = resolveEndConcentrationCommand({
      state,
      subject,
      fills: [],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected End Concentration to resolve.");
    }
    expect(resolved.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(
      resolveEndConcentrationCommand({
        state: resolved.state,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "End Concentration is no longer available.",
    });
  });
});
