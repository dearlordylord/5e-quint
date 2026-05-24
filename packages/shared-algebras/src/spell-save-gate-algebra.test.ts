import { describe, expect, test } from "vitest";

import { damageAmount } from "@dnd/shared/types";

import {
  spellSaveGateBranch,
  spellSaveGateDamageAmount,
  spellSaveGateDamageResult,
  spellSaveGateFailedEffectsApply,
  spellSaveGateSuccessEffectsApply,
} from "./spell-save-gate-algebra.ts";

describe("spell save gate algebra", () => {
  test("failed Saving Throws apply failure effects and full damage", () => {
    const branch = spellSaveGateBranch(false);
    const result = spellSaveGateDamageResult({
      branch,
      damageOnSuccess: "halfDamage",
    });

    expect(spellSaveGateFailedEffectsApply(branch)).toBe(true);
    expect(spellSaveGateSuccessEffectsApply(branch)).toBe(false);
    expect(result).toBe("fullDamage");
    expect(spellSaveGateDamageAmount(damageAmount(9), result)).toEqual(
      damageAmount(9),
    );
  });

  test("successful Saving Throws can deal half damage rounded down", () => {
    const branch = spellSaveGateBranch(true);
    const result = spellSaveGateDamageResult({
      branch,
      damageOnSuccess: "halfDamage",
    });

    expect(spellSaveGateFailedEffectsApply(branch)).toBe(false);
    expect(spellSaveGateSuccessEffectsApply(branch)).toBe(true);
    expect(result).toBe("halfDamage");
    expect(spellSaveGateDamageAmount(damageAmount(9), result)).toEqual(
      damageAmount(4),
    );
  });

  test("successful Saving Throws can negate damage", () => {
    const result = spellSaveGateDamageResult({
      branch: spellSaveGateBranch(true),
      damageOnSuccess: "noDamage",
    });

    expect(result).toBe("noDamage");
    expect(spellSaveGateDamageAmount(damageAmount(9), result)).toEqual(
      damageAmount(0),
    );
  });
});
