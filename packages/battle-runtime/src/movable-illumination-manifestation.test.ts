import { describe, expect, test } from "vitest";
import { movableLightResolutionSubjectMatchesOperation } from "./battle-reducer/spell-procedure-profiles/movable-illumination-manifestation.ts";

describe("movable illumination resolution", () => {
  test("rejects subject action kinds that do not match the lifecycle operation", () => {
    expect(
      movableLightResolutionSubjectMatchesOperation({
        operation: "create",
        subjectTag: "bonusActionSpell",
      }),
    ).toBe(false);
    expect(
      movableLightResolutionSubjectMatchesOperation({
        operation: "reposition",
        subjectTag: "actionSpell",
      }),
    ).toBe(false);
    expect(
      movableLightResolutionSubjectMatchesOperation({
        operation: "create",
        subjectTag: "actionSpell",
      }),
    ).toBe(true);
    expect(
      movableLightResolutionSubjectMatchesOperation({
        operation: "reposition",
        subjectTag: "bonusActionSpell",
      }),
    ).toBe(true);
  });
});
