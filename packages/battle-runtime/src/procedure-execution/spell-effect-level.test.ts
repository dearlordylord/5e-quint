import { describe, expect, test } from "vitest";

import { parseBattleSpellEffectLevel } from "./spell-effect-level.ts";

describe("battle spell effect level parsing", () => {
  test("accepts only integer spell levels from zero through nine", () => {
    expect(parseBattleSpellEffectLevel(0)).toBe(0);
    expect(parseBattleSpellEffectLevel(9)).toBe(9);
    expect(parseBattleSpellEffectLevel(-1)).toBeNull();
    expect(parseBattleSpellEffectLevel(10)).toBeNull();
    expect(parseBattleSpellEffectLevel(0.5)).toBeNull();
  });
});
