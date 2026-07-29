import { describe, expect, test } from "vitest";

import { classLevelChoiceCountAtLevel } from "./class-level-scaling.ts";

describe("class-level choice scaling", () => {
  test("returns zero before the first total-choice threshold", () => {
    expect(
      classLevelChoiceCountAtLevel(
        {
          kind: "class_level_total_choices",
          levels: [{ atLevel: 2, total: 2 }],
        },
        1,
      ),
    ).toBe(0);
  });
});
