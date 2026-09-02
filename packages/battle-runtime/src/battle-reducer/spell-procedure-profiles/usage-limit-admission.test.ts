import { describe, expect, test } from "vitest";

import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";

describe("shared once-per-turn limit-group admission", () => {
  test("returns the group only when every usage limit is once per turn with the same group", () => {
    expect(
      sharedOncePerTurnLimitGroup([
        { kind: "once_per_turn", limitGroup: "area-save" },
        { kind: "once_per_turn", limitGroup: "area-save" },
      ]),
    ).toBe("area-save");
    expect(
      sharedOncePerTurnLimitGroup([
        { kind: "once_per_turn", limitGroup: "entry-save" },
        { kind: "once_per_turn", limitGroup: "turn-save" },
      ]),
    ).toBeNull();
    expect(
      sharedOncePerTurnLimitGroup([
        { kind: "once_per_turn", limitGroup: "area-save" },
        { kind: "once_per_round", limitGroup: "area-save" },
      ]),
    ).toBeNull();
    expect(
      sharedOncePerTurnLimitGroup([
        { kind: "once_per_turn", limitGroup: "area-save" },
        undefined,
      ]),
    ).toBeNull();
  });

  test("rejects an empty shared group", () => {
    expect(
      sharedOncePerTurnLimitGroup([
        { kind: "once_per_turn", limitGroup: "" },
        { kind: "once_per_turn", limitGroup: "" },
      ]),
    ).toBeNull();
  });
});
