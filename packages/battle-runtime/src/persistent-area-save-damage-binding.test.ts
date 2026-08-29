import { describe, expect, test } from "vitest";
import { persistentAreaSaveDamageRepositionKind } from "./battle-reducer/persistent-area-save-damage-binding.ts";

describe("persistent area save-damage binding", () => {
  test("classifies reposition behavior independently of its action cost", () => {
    expect(
      persistentAreaSaveDamageRepositionKind({
        actionCost: "magicAction",
        collisionDisposition: "stopAndAffectAdjacent",
      }),
    ).toBe("collisionReposition");
    expect(
      persistentAreaSaveDamageRepositionKind({
        actionCost: "bonusAction",
        collisionDisposition: "ignoreObstacles",
      }),
    ).toBe("directedReposition");
  });
});
