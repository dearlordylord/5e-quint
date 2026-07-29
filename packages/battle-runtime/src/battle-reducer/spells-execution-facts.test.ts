import { spellSlotLevel } from "@dnd/shared/types";
import { expect, test } from "vitest";
import { supportedRepeatedEffectCount } from "./spells-execution-facts.ts";

test("fixed repeated target counts remain unchanged across slot levels", () => {
  const count = supportedRepeatedEffectCount(
    {
      mode: "choose_up_to",
      repeatsAllowed: true,
      targetKinds: ["creature", "object"],
      count: 3,
    },
    2,
  );

  expect(count?.(spellSlotLevel(2))).toBe(3);
  expect(count?.(spellSlotLevel(5))).toBe(3);
});
