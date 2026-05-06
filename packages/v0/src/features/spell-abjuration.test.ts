import { describe, expect, it } from "vitest";

import {
  AID_TARGETS,
  aidHpIncrease,
  BANISHMENT_PERMANENT_TYPES,
  banishmentResult,
  banishmentTargets,
  canCastShield,
  canUseMageArmor,
  counterspellAutoSuccess,
  cureWoundsDice,
  deathWardTriggered,
  dispelMagicAutoSuccess,
  dispelMagicDC,
  FREEDOM_OF_MOVEMENT_IMMUNITIES,
  freedomOfMovementTargets,
  globeBlocksSpellLevel,
  GREATER_RESTORATION_EFFECTS,
  HEAL_REMOVED_CONDITIONS,
  healAmount,
  healingWordDice,
  HOLY_AURA_ATTACK_DISADVANTAGE,
  HOLY_AURA_SAVE_ADVANTAGE,
  LESSER_RESTORATION_CONDITIONS,
  mageArmorAC,
  MASS_CURE_WOUNDS_TARGETS,
  MASS_HEAL_POOL,
  massCureWoundsDice,
  MIND_BLANK_IMMUNITIES,
  PRAYER_OF_HEALING_TARGETS,
  prayerOfHealingDice,
  PROTECTION_FROM_ENERGY_TYPES,
  protectionFromEvilAndGoodActive,
  sanctuaryBroken,
  SHIELD_AC_BONUS,
  SHIELD_OF_FAITH_AC_BONUS,
  SPELL_COUNTERSPELL,
  SPELL_MAGE_ARMOR,
  SPELL_PROTECTION_FROM_EVIL_AND_GOOD,
  SPELL_SANCTUARY,
  SPELL_SHIELD,
  SPELL_SHIELD_OF_FAITH,
  SPELL_STONESKIN,
  STONESKIN_RESISTANCES,
  WARDING_BOND_AC_BONUS,
  WARDING_BOND_SAVE_BONUS,
} from "#/features/spell-abjuration.ts";
import { saveOrNothing } from "#/features/spell-patterns.ts";

// --- saveOrNothing ---

describe("saveOrNothing", () => {
  it("returns full damage on failed save", () => {
    expect(saveOrNothing(75, false)).toBe(75);
  });

  it("returns 0 on successful save", () => {
    expect(saveOrNothing(75, true)).toBe(0);
  });
});

// --- Counterspell ---

describe("counterspellAutoSuccess", () => {
  it("auto-succeeds when slot level >= target spell level", () => {
    expect(counterspellAutoSuccess(5, 5)).toBe(true);
  });

  it("auto-succeeds when slot level > target spell level", () => {
    expect(counterspellAutoSuccess(3, 5)).toBe(true);
  });

  it("does not auto-succeed when slot level < target", () => {
    expect(counterspellAutoSuccess(5, 3)).toBe(false);
  });

  it("does not auto-succeed for level 9 target with level 3 slot", () => {
    expect(counterspellAutoSuccess(9, 3)).toBe(false);
  });
});

// --- Shield ---

describe("Shield", () => {
  it("grants +5 AC bonus", () => {
    expect(SHIELD_AC_BONUS).toBe(5);
  });

  it("can be cast when reaction and spell slots are available", () => {
    expect(canCastShield(true, true)).toBe(true);
  });

  it("cannot be cast without reaction", () => {
    expect(canCastShield(false, true)).toBe(false);
  });

  it("cannot be cast without spell slots", () => {
    expect(canCastShield(true, false)).toBe(false);
  });

  it("cannot be cast without reaction or spell slots", () => {
    expect(canCastShield(false, false)).toBe(false);
  });

  it("has correct spell info", () => {
    expect(SPELL_SHIELD.level).toBe(1);
    expect(SPELL_SHIELD.concentration).toBe(false);
    expect(SPELL_SHIELD.castingTime).toBe("reaction");
  });
});

// --- Mage Armor ---

describe("Mage Armor", () => {
  it("returns 13 + dexMod", () => {
    expect(mageArmorAC(2)).toBe(15);
  });

  it("handles negative dex modifier", () => {
    expect(mageArmorAC(-1)).toBe(12);
  });

  it("handles zero dex modifier", () => {
    expect(mageArmorAC(0)).toBe(13);
  });

  it("is usable without armor", () => {
    expect(canUseMageArmor(false)).toBe(true);
  });

  it("is not usable with armor", () => {
    expect(canUseMageArmor(true)).toBe(false);
  });

  it("has correct spell info", () => {
    expect(SPELL_MAGE_ARMOR.level).toBe(1);
    expect(SPELL_MAGE_ARMOR.concentration).toBe(false);
    expect(SPELL_MAGE_ARMOR.castingTime).toBe("action");
  });
});

// --- Shield of Faith ---

describe("Shield of Faith", () => {
  it("grants +2 AC bonus", () => {
    expect(SHIELD_OF_FAITH_AC_BONUS).toBe(2);
  });

  it("has correct spell info", () => {
    expect(SPELL_SHIELD_OF_FAITH.level).toBe(1);
    expect(SPELL_SHIELD_OF_FAITH.concentration).toBe(true);
    expect(SPELL_SHIELD_OF_FAITH.castingTime).toBe("bonusAction");
  });
});

// --- Stoneskin ---

describe("Stoneskin", () => {
  it("grants resistance to bludgeoning, piercing, and slashing", () => {
    expect(STONESKIN_RESISTANCES).toContain("bludgeoning");
    expect(STONESKIN_RESISTANCES).toContain("piercing");
    expect(STONESKIN_RESISTANCES).toContain("slashing");
    expect(STONESKIN_RESISTANCES).toHaveLength(3);
  });

  it("has correct spell info", () => {
    expect(SPELL_STONESKIN.level).toBe(4);
    expect(SPELL_STONESKIN.concentration).toBe(true);
    expect(SPELL_STONESKIN.castingTime).toBe("action");
  });
});

// --- Sanctuary ---

describe("Sanctuary", () => {
  it("is broken when warded creature attacks", () => {
    expect(sanctuaryBroken(true, false)).toBe(true);
  });

  it("is broken when warded creature casts harmful spell", () => {
    expect(sanctuaryBroken(false, true)).toBe(true);
  });

  it("is broken when both conditions are true", () => {
    expect(sanctuaryBroken(true, true)).toBe(true);
  });

  it("is not broken when neither condition is true", () => {
    expect(sanctuaryBroken(false, false)).toBe(false);
  });

  it("has correct spell info", () => {
    expect(SPELL_SANCTUARY.level).toBe(1);
    expect(SPELL_SANCTUARY.concentration).toBe(false);
    expect(SPELL_SANCTUARY.castingTime).toBe("bonusAction");
  });
});

// --- Protection from Evil and Good ---

describe("Protection from Evil and Good", () => {
  it("is active against aberrations", () => {
    expect(protectionFromEvilAndGoodActive("aberration")).toBe(true);
  });

  it("is active against celestials", () => {
    expect(protectionFromEvilAndGoodActive("celestial")).toBe(true);
  });

  it("is active against elementals", () => {
    expect(protectionFromEvilAndGoodActive("elemental")).toBe(true);
  });

  it("is active against fey", () => {
    expect(protectionFromEvilAndGoodActive("fey")).toBe(true);
  });

  it("is active against fiends", () => {
    expect(protectionFromEvilAndGoodActive("fiend")).toBe(true);
  });

  it("is active against undead", () => {
    expect(protectionFromEvilAndGoodActive("undead")).toBe(true);
  });

  it("is not active against humanoids", () => {
    expect(protectionFromEvilAndGoodActive("humanoid")).toBe(false);
  });

  it("is not active against beasts", () => {
    expect(protectionFromEvilAndGoodActive("beast")).toBe(false);
  });

  it("is not active against dragons", () => {
    expect(protectionFromEvilAndGoodActive("dragon")).toBe(false);
  });

  it("has correct spell info", () => {
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.level).toBe(1);
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.concentration).toBe(true);
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.castingTime).toBe("action");
  });
});

// --- Counterspell metadata ---

describe("Counterspell metadata", () => {
  it("is L3, saveOrNothing, CON save", () => {
    expect(SPELL_COUNTERSPELL.level).toBe(3);
    expect(SPELL_COUNTERSPELL.pattern).toBe("saveOrNothing");
    expect(SPELL_COUNTERSPELL.saveAbility).toBe("con");
    expect(SPELL_COUNTERSPELL.concentration).toBe(false);
  });
});

// =============================================================================
// Healing spells
// =============================================================================

describe("Cure Wounds", () => {
  it("returns 2d8 at L1", () => {
    expect(cureWoundsDice(1)).toEqual({ dice: 2, dieSize: 8 });
  });

  it("scales +2d8 per slot level above 1", () => {
    expect(cureWoundsDice(2)).toEqual({ dice: 4, dieSize: 8 });
    expect(cureWoundsDice(3)).toEqual({ dice: 6, dieSize: 8 });
    expect(cureWoundsDice(5)).toEqual({ dice: 10, dieSize: 8 });
  });
});

describe("Healing Word", () => {
  it("returns 2d4 at L1", () => {
    expect(healingWordDice(1)).toEqual({ dice: 2, dieSize: 4 });
  });

  it("scales +2d4 per slot level above 1", () => {
    expect(healingWordDice(2)).toEqual({ dice: 4, dieSize: 4 });
    expect(healingWordDice(3)).toEqual({ dice: 6, dieSize: 4 });
  });
});

describe("Heal", () => {
  it("restores 70 HP at L6", () => {
    expect(healAmount(6)).toBe(70);
  });

  it("scales +10 per slot level above 6", () => {
    expect(healAmount(7)).toBe(80);
    expect(healAmount(9)).toBe(100);
  });

  it("removes blinded, deafened, poisoned", () => {
    expect(HEAL_REMOVED_CONDITIONS).toContain("blinded");
    expect(HEAL_REMOVED_CONDITIONS).toContain("deafened");
    expect(HEAL_REMOVED_CONDITIONS).toContain("poisoned");
    expect(HEAL_REMOVED_CONDITIONS).toHaveLength(3);
  });
});

describe("Mass Cure Wounds", () => {
  it("returns 5d8 at L5", () => {
    expect(massCureWoundsDice(5)).toEqual({ dice: 5, dieSize: 8 });
  });

  it("scales +1d8 per slot level above 5", () => {
    expect(massCureWoundsDice(6)).toEqual({ dice: 6, dieSize: 8 });
    expect(massCureWoundsDice(9)).toEqual({ dice: 9, dieSize: 8 });
  });

  it("targets 6 creatures", () => {
    expect(MASS_CURE_WOUNDS_TARGETS).toBe(6);
  });
});

describe("Mass Heal", () => {
  it("provides a 700 HP pool", () => {
    expect(MASS_HEAL_POOL).toBe(700);
  });
});

describe("Prayer of Healing", () => {
  it("returns 2d8 at L2", () => {
    expect(prayerOfHealingDice(2)).toEqual({ dice: 2, dieSize: 8 });
  });

  it("scales +1d8 per slot level above 2", () => {
    expect(prayerOfHealingDice(3)).toEqual({ dice: 3, dieSize: 8 });
    expect(prayerOfHealingDice(5)).toEqual({ dice: 5, dieSize: 8 });
  });

  it("targets 5 creatures", () => {
    expect(PRAYER_OF_HEALING_TARGETS).toBe(5);
  });
});

// =============================================================================
// Protection / Condition Removal
// =============================================================================

describe("Aid", () => {
  it("increases HP by 5 at L2", () => {
    expect(aidHpIncrease(2)).toBe(5);
  });

  it("scales +5 per slot level above 2", () => {
    expect(aidHpIncrease(3)).toBe(10);
    expect(aidHpIncrease(4)).toBe(15);
    expect(aidHpIncrease(9)).toBe(40);
  });

  it("targets 3 creatures", () => {
    expect(AID_TARGETS).toBe(3);
  });
});

describe("Death Ward", () => {
  it("triggers when would drop to 0 and ward is active", () => {
    expect(deathWardTriggered(true, true)).toBe(true);
  });

  it("does not trigger when ward is inactive", () => {
    expect(deathWardTriggered(true, false)).toBe(false);
  });

  it("does not trigger when not dropping to 0", () => {
    expect(deathWardTriggered(false, true)).toBe(false);
  });
});

describe("Lesser Restoration", () => {
  it("can remove blinded, deafened, paralyzed, poisoned", () => {
    expect(LESSER_RESTORATION_CONDITIONS).toHaveLength(4);
  });
});

describe("Greater Restoration", () => {
  it("can remove 6 effect types", () => {
    expect(GREATER_RESTORATION_EFFECTS).toHaveLength(6);
  });
});

describe("Dispel Magic", () => {
  it("auto-succeeds when slot level >= target spell level", () => {
    expect(dispelMagicAutoSuccess(3, 3)).toBe(true);
    expect(dispelMagicAutoSuccess(3, 5)).toBe(true);
  });

  it("does not auto-succeed when slot < target", () => {
    expect(dispelMagicAutoSuccess(5, 3)).toBe(false);
  });

  it("DC = 10 + target spell level", () => {
    expect(dispelMagicDC(4)).toBe(14);
    expect(dispelMagicDC(9)).toBe(19);
  });
});

describe("Protection from Energy", () => {
  it("offers acid, cold, fire, lightning, thunder", () => {
    expect(PROTECTION_FROM_ENERGY_TYPES).toHaveLength(5);
  });
});

describe("Warding Bond", () => {
  it("grants +1 AC and +1 saves", () => {
    expect(WARDING_BOND_AC_BONUS).toBe(1);
    expect(WARDING_BOND_SAVE_BONUS).toBe(1);
  });
});

describe("Holy Aura", () => {
  it("grants advantage on saves and disadvantage on attacks against", () => {
    expect(HOLY_AURA_SAVE_ADVANTAGE).toBe(true);
    expect(HOLY_AURA_ATTACK_DISADVANTAGE).toBe(true);
  });
});

describe("Globe of Invulnerability", () => {
  it("blocks spells level 5 or lower at L6", () => {
    expect(globeBlocksSpellLevel(6)).toBe(5);
  });

  it("scales +1 per slot level above 6", () => {
    expect(globeBlocksSpellLevel(7)).toBe(6);
    expect(globeBlocksSpellLevel(9)).toBe(8);
  });
});

// --- Banishment ---

describe("Banishment", () => {
  it("targets 1 at L4, scales +1 per upcast", () => {
    expect(banishmentTargets(4)).toBe(1);
    expect(banishmentTargets(5)).toBe(2);
  });

  it("incapacitates on failed save", () => {
    const result = banishmentResult(false);
    expect(result.conditionApplied).toBe("incapacitated");
    expect(result.savePassed).toBe(false);
  });

  it("no effect on passed save", () => {
    expect(banishmentResult(true).conditionApplied).toBeNull();
  });

  it("permanent types include fiend and celestial", () => {
    expect(BANISHMENT_PERMANENT_TYPES).toContain("fiend");
    expect(BANISHMENT_PERMANENT_TYPES).toContain("celestial");
  });
});

// --- Freedom of Movement ---

describe("Freedom of Movement", () => {
  it("targets 1 at L4, scales +1 per upcast", () => {
    expect(freedomOfMovementTargets(4)).toBe(1);
    expect(freedomOfMovementTargets(6)).toBe(3);
  });

  it("grants immunity to paralyzed and restrained", () => {
    expect(FREEDOM_OF_MOVEMENT_IMMUNITIES).toContain("paralyzed");
    expect(FREEDOM_OF_MOVEMENT_IMMUNITIES).toContain("restrained");
  });
});

// --- Mind Blank ---

describe("Mind Blank", () => {
  it("grants psychic damage immunity and charmed immunity", () => {
    expect(MIND_BLANK_IMMUNITIES.psychicDamage).toBe(true);
    expect(MIND_BLANK_IMMUNITIES.charmed).toBe(true);
  });
});
