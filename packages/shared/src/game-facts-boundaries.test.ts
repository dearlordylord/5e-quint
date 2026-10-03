import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import {
  AttackRollDefenseSelectionSchema,
  CharacterClassLevelSchema,
  isAttackRollDefenseSelection,
} from "./game-facts.ts";

test("defense selection boundaries accept runtime facts and reject authored options or malformed values", () => {
  for (const value of [
    "opportunityAttackDisadvantage",
    "repeatAttackerAfterHitDisadvantage",
  ]) {
    expect(isAttackRollDefenseSelection(value)).toBe(true);
    expect(
      Schema.decodeUnknownResult(AttackRollDefenseSelectionSchema)(value),
    ).toMatchObject({ _tag: "Success", success: value });
  }
  for (const value of [
    "escape_the_horde",
    "multiattack_defense",
    "",
    null,
    undefined,
    { selection: "opportunityAttackDisadvantage" },
  ]) {
    expect(isAttackRollDefenseSelection(value)).toBe(false);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(AttackRollDefenseSelectionSchema)(value),
      ),
    ).toBe(true);
  }
});

test("stored class levels admit finite integer endpoints without coercion", () => {
  for (const value of [1, 6, 20])
    expect(
      Schema.decodeUnknownResult(CharacterClassLevelSchema)(value),
    ).toMatchObject({ _tag: "Success", success: value });
  for (const value of [0, 21, 1.5, NaN, Infinity, "6", null])
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(CharacterClassLevelSchema)(value),
      ),
    ).toBe(true);
});
