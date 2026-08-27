import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { BattleMechanicalHoleSchema } from "./battle-mechanical-frontier.ts";

const mechanicalHole = {
  holeInstanceKey: "mechanical-frontier-instance",
  holeId: "mechanical-frontier-hole",
  kind: "abilityCheck" as const,
  ability: "dex" as const,
  skill: "stealth" as const,
  dc: 12,
};

describe("battle mechanical frontier", () => {
  test("round-trips a presentation-free mechanical hole", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)(
      mechanicalHole,
    );

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalHole });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation fields at the mechanical boundary", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)({
      ...mechanicalHole,
      label: "must not cross the boundary",
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});
