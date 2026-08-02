import { describe, expect, test } from "vitest";

import { fighterVsGoblinBattle } from "../battle-runtime.test-support.ts";
import { invalidResult, resolutionFromStateResult } from "./result-helpers.ts";

describe("battle resolution result conversion", () => {
  test("preserves an invalid result and its failure snapshot", () => {
    const invalid = invalidResult(
      fighterVsGoblinBattle(),
      "invalidFill",
      "Synthetic invalid fill.",
    );

    expect(resolutionFromStateResult(invalid)).toBe(invalid);
  });

  test("adds the canonical snapshot to a resolved state", () => {
    const state = fighterVsGoblinBattle();
    const result = resolutionFromStateResult({ tag: "resolved", state });

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    expect(result.state).toBe(state);
    expect(result.snapshot.battleId).toBe(state.battleId);
  });
});
