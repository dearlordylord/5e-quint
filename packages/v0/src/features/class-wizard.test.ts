import { describe, expect, it } from "vitest";

import {
  arcaneRecoveryMaxLevels,
  canArcaneRecoverSlot,
  empoweredEvocationBonus,
  hasMemorizeSpell,
  hasOverchannel,
  hasPotentCantrip,
  hasScholar,
  hasSignatureSpells,
  hasSpellMastery,
  overchannelMaxDamage,
  overchannelNecroticDice,
  potentCantripDamage,
  sculptSpellsMaxCreatures,
  validateArcaneRecovery,
} from "#/features/class-wizard.ts";

// =============================================================================
// Wizard Base Features
// =============================================================================

describe("Arcane Recovery", () => {
  it("max levels = ceil(wizardLevel / 2)", () => {
    expect(arcaneRecoveryMaxLevels(1)).toBe(1);
    expect(arcaneRecoveryMaxLevels(4)).toBe(2);
    expect(arcaneRecoveryMaxLevels(5)).toBe(3);
    expect(arcaneRecoveryMaxLevels(10)).toBe(5);
    expect(arcaneRecoveryMaxLevels(20)).toBe(10);
  });
  it("0 at level 0", () => {
    expect(arcaneRecoveryMaxLevels(0)).toBe(0);
  });
  it("can recover slots 1-5", () => {
    expect(canArcaneRecoverSlot(1)).toBe(true);
    expect(canArcaneRecoverSlot(5)).toBe(true);
  });
  it("cannot recover slots 6+", () => {
    expect(canArcaneRecoverSlot(6)).toBe(false);
    expect(canArcaneRecoverSlot(9)).toBe(false);
  });
  it("cannot recover slot 0", () => {
    expect(canArcaneRecoverSlot(0)).toBe(false);
  });
  it("validates valid recovery selection", () => {
    expect(validateArcaneRecovery(4, [1, 1])).toBe(true); // total 2 <= ceil(4/2)=2
    expect(validateArcaneRecovery(4, [2])).toBe(true);
  });
  it("rejects over-budget recovery", () => {
    expect(validateArcaneRecovery(4, [2, 1])).toBe(false); // total 3 > 2
  });
  it("rejects 6th+ level slots", () => {
    expect(validateArcaneRecovery(20, [6])).toBe(false);
  });
  it("accepts empty selection", () => {
    expect(validateArcaneRecovery(1, [])).toBe(true);
  });
});

describe("Scholar", () => {
  it("available at L2+", () => {
    expect(hasScholar(2)).toBe(true);
  });
  it("not available below L2", () => {
    expect(hasScholar(1)).toBe(false);
  });
});

describe("Memorize Spell", () => {
  it("available at L5+", () => {
    expect(hasMemorizeSpell(5)).toBe(true);
  });
  it("not available below L5", () => {
    expect(hasMemorizeSpell(4)).toBe(false);
  });
});

describe("Spell Mastery", () => {
  it("available at L18+", () => {
    expect(hasSpellMastery(18)).toBe(true);
  });
  it("not available below L18", () => {
    expect(hasSpellMastery(17)).toBe(false);
  });
});

describe("Signature Spells", () => {
  it("available at L20", () => {
    expect(hasSignatureSpells(20)).toBe(true);
  });
  it("not available below L20", () => {
    expect(hasSignatureSpells(19)).toBe(false);
  });
});

// =============================================================================
// Evoker Subclass
// =============================================================================

describe("Potent Cantrip", () => {
  it("available at L3+", () => {
    expect(hasPotentCantrip(3)).toBe(true);
  });
  it("not available below L3", () => {
    expect(hasPotentCantrip(2)).toBe(false);
  });
  it("half damage on miss/save", () => {
    expect(potentCantripDamage(10)).toBe(5);
    expect(potentCantripDamage(7)).toBe(3); // floor
    expect(potentCantripDamage(1)).toBe(0);
    expect(potentCantripDamage(0)).toBe(0);
  });
});

describe("Sculpt Spells", () => {
  it("0 creatures below L6", () => {
    expect(sculptSpellsMaxCreatures(5, 3)).toBe(0);
  });
  it("1 + spell level creatures at L6+", () => {
    expect(sculptSpellsMaxCreatures(6, 1)).toBe(2);
    expect(sculptSpellsMaxCreatures(6, 3)).toBe(4);
    expect(sculptSpellsMaxCreatures(10, 5)).toBe(6);
    expect(sculptSpellsMaxCreatures(6, 0)).toBe(1); // cantrip
  });
});

describe("Empowered Evocation", () => {
  it("0 below L10", () => {
    expect(empoweredEvocationBonus(9, 5)).toBe(0);
  });
  it("+INT mod at L10+", () => {
    expect(empoweredEvocationBonus(10, 5)).toBe(5);
    expect(empoweredEvocationBonus(20, 3)).toBe(3);
  });
  it("negative INT mod passes through", () => {
    expect(empoweredEvocationBonus(10, -1)).toBe(-1);
  });
});

describe("Overchannel", () => {
  it("available at L14+", () => {
    expect(hasOverchannel(14)).toBe(true);
  });
  it("not available below L14", () => {
    expect(hasOverchannel(13)).toBe(false);
  });
  it("max damage = dice × die size", () => {
    expect(overchannelMaxDamage(8, 6)).toBe(48); // 8d6 fireball
    expect(overchannelMaxDamage(3, 8)).toBe(24);
  });
  it("no necrotic on first use", () => {
    expect(overchannelNecroticDice(1, 3)).toBe(0);
  });
  it("2d12/slot level on second use", () => {
    expect(overchannelNecroticDice(2, 3)).toBe(6); // 6d12
    expect(overchannelNecroticDice(2, 5)).toBe(10); // 10d12
  });
  it("3d12/slot level on third use", () => {
    expect(overchannelNecroticDice(3, 3)).toBe(9); // 9d12
  });
  it("escalates further", () => {
    expect(overchannelNecroticDice(4, 3)).toBe(12); // 12d12
  });
});
