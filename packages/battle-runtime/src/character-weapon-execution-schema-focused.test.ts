import { unitId } from "@dnd/shared/game-facts";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { CharacterWeaponAttackExecutionWeaponSchema } from "./character-weapon-execution-schema.ts";

const syntheticWeapon = {
  weaponUnitId: unitId("synthetic_focus_blade"),
  category: "simple",
  usage: "melee",
  damage: {
    kind: "dice",
    dice: 1,
    dieSize: 4,
    damageType: "slashing",
  },
  properties: [],
  masteryProperty: "sap",
  costGp: 1,
} as const;

describe("character weapon execution codec", () => {
  test("decodes and re-encodes a synthetic weapon without broad runtime imports", () => {
    const decoded = Schema.decodeUnknownResult(
      CharacterWeaponAttackExecutionWeaponSchema,
    )(syntheticWeapon);

    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;

    const encoded = Schema.encodeUnknownResult(
      CharacterWeaponAttackExecutionWeaponSchema,
    )(decoded.success);
    expect(Result.isSuccess(encoded)).toBe(true);
    if (Result.isFailure(encoded)) return;
    expect(encoded.success).toEqual(syntheticWeapon);
  });

  test("preserves the distinct unselected weapon state without a mastery projection", () => {
    const { masteryProperty: _property, ...unselectedWeapon } = syntheticWeapon;
    const decoded = Schema.decodeUnknownResult(
      CharacterWeaponAttackExecutionWeaponSchema,
    )(unselectedWeapon);

    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(decoded.success).not.toHaveProperty("masteryProperty");
  });

  test("rejects a malformed weapon damage type at the precise nested field", () => {
    const malformed = {
      ...syntheticWeapon,
      damage: { ...syntheticWeapon.damage, damageType: "synthetic_invalid" },
    };
    const decoded = Schema.decodeUnknownResult(
      CharacterWeaponAttackExecutionWeaponSchema,
    )(malformed);

    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isSuccess(decoded)) return;
    expect(String(decoded.failure)).toContain("damageType");
  });
});
