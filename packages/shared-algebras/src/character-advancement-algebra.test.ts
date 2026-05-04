import { describe, expect, it } from "vitest";

import {
  ZERO_CLASS_LEVELS,
  advancementToClassLevels,
  normalizeClassLevels,
  primaryClassFromAdvancement,
  singleClassAdvancement,
  totalClassLevels,
} from "@dnd/shared-algebras/character-advancement-algebra";

describe("character-advancement-algebra", () => {
  it("normalizes partial class levels against the full class vocabulary", () => {
    expect(normalizeClassLevels({ fighter: 2, wizard: 1 })).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 2,
      wizard: 1,
    });
  });

  it("derives class levels from ordered progression entries", () => {
    const classLevels = advancementToClassLevels([
      { className: "fighter" },
      { className: "fighter" },
      { className: "wizard" },
    ]);

    expect(classLevels).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 2,
      wizard: 1,
    });
    expect(totalClassLevels(classLevels)).toBe(3);
  });

  it("derives primary class and single-class progression from one source", () => {
    const advancement = singleClassAdvancement("cleric", 3);

    expect(primaryClassFromAdvancement(advancement)).toBe("cleric");
    expect(advancementToClassLevels(advancement).cleric).toBe(3);
  });
});
