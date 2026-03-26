import { describe, expect, it } from "vitest"

import {
  barkskinAC,
  canCastShield,
  canUseMageArmor,
  fireShieldResistance,
  fireShieldRetaliationDamage,
  fireShieldRetaliationDamageType,
  mageArmorAC,
  mirrorImageDuplicateAC,
  mirrorImageHitsDuplicate,
  mirrorImageThreshold,
  protectionFromEvilAndGoodActive,
  sanctuaryBroken,
  sanctuaryDC,
  shieldACBonus,
  shieldOfFaithACBonus,
  SPELL_BARKSKIN,
  SPELL_FIRE_SHIELD,
  SPELL_MAGE_ARMOR,
  SPELL_MIRROR_IMAGE,
  SPELL_PROTECTION_FROM_EVIL_AND_GOOD,
  SPELL_SANCTUARY,
  SPELL_SHIELD,
  SPELL_SHIELD_OF_FAITH,
  SPELL_STONESKIN,
  stoneskinResistances
} from "#/features/spell-defense.ts"

// --- Shield ---

describe("Shield", () => {
  it("grants +5 AC bonus", () => {
    expect(shieldACBonus()).toBe(5)
  })

  it("can be cast when reaction and spell slots are available", () => {
    expect(canCastShield(true, true)).toBe(true)
  })

  it("cannot be cast without reaction", () => {
    expect(canCastShield(false, true)).toBe(false)
  })

  it("cannot be cast without spell slots", () => {
    expect(canCastShield(true, false)).toBe(false)
  })

  it("cannot be cast without reaction or spell slots", () => {
    expect(canCastShield(false, false)).toBe(false)
  })

  it("has correct spell info", () => {
    expect(SPELL_SHIELD.level).toBe(1)
    expect(SPELL_SHIELD.concentration).toBe(false)
    expect(SPELL_SHIELD.castingTime).toBe("reaction")
  })
})

// --- Mage Armor ---

describe("Mage Armor", () => {
  it("returns 13 + dexMod", () => {
    expect(mageArmorAC(2)).toBe(15)
  })

  it("handles negative dex modifier", () => {
    expect(mageArmorAC(-1)).toBe(12)
  })

  it("handles zero dex modifier", () => {
    expect(mageArmorAC(0)).toBe(13)
  })

  it("is usable without armor", () => {
    expect(canUseMageArmor(false)).toBe(true)
  })

  it("is not usable with armor", () => {
    expect(canUseMageArmor(true)).toBe(false)
  })

  it("has correct spell info", () => {
    expect(SPELL_MAGE_ARMOR.level).toBe(1)
    expect(SPELL_MAGE_ARMOR.concentration).toBe(false)
    expect(SPELL_MAGE_ARMOR.castingTime).toBe("action")
  })
})

// --- Shield of Faith ---

describe("Shield of Faith", () => {
  it("grants +2 AC bonus", () => {
    expect(shieldOfFaithACBonus()).toBe(2)
  })

  it("has correct spell info", () => {
    expect(SPELL_SHIELD_OF_FAITH.level).toBe(1)
    expect(SPELL_SHIELD_OF_FAITH.concentration).toBe(true)
    expect(SPELL_SHIELD_OF_FAITH.castingTime).toBe("bonusAction")
  })
})

// --- Barkskin ---

describe("Barkskin", () => {
  it("raises AC to 17 when current AC is below 17", () => {
    expect(barkskinAC(12)).toBe(17)
  })

  it("keeps AC at 17 when current AC equals 17", () => {
    expect(barkskinAC(17)).toBe(17)
  })

  it("keeps AC above 17 when current AC exceeds 17", () => {
    expect(barkskinAC(20)).toBe(20)
  })

  it("has correct spell info", () => {
    expect(SPELL_BARKSKIN.level).toBe(2)
    expect(SPELL_BARKSKIN.concentration).toBe(false)
    expect(SPELL_BARKSKIN.castingTime).toBe("bonusAction")
  })
})

// --- Fire Shield ---

describe("Fire Shield", () => {
  it("warm shield grants cold resistance", () => {
    expect(fireShieldResistance("warm")).toBe("cold")
  })

  it("chill shield grants fire resistance", () => {
    expect(fireShieldResistance("chill")).toBe("fire")
  })

  it("retaliation damage is 2d8", () => {
    const dmg = fireShieldRetaliationDamage()
    expect(dmg.dice).toBe(2)
    expect(dmg.dieSize).toBe(8)
  })

  it("warm shield deals fire retaliation damage", () => {
    expect(fireShieldRetaliationDamageType("warm")).toBe("fire")
  })

  it("chill shield deals cold retaliation damage", () => {
    expect(fireShieldRetaliationDamageType("chill")).toBe("cold")
  })

  it("has correct spell info", () => {
    expect(SPELL_FIRE_SHIELD.level).toBe(4)
    expect(SPELL_FIRE_SHIELD.concentration).toBe(false)
    expect(SPELL_FIRE_SHIELD.castingTime).toBe("action")
  })
})

// --- Mirror Image ---

describe("Mirror Image", () => {
  it("threshold is 6 for 3 duplicates", () => {
    expect(mirrorImageThreshold(3)).toBe(6)
  })

  it("threshold is 8 for 2 duplicates", () => {
    expect(mirrorImageThreshold(2)).toBe(8)
  })

  it("threshold is 11 for 1 duplicate", () => {
    expect(mirrorImageThreshold(1)).toBe(11)
  })

  it("threshold is 21 (impossible) for 0 duplicates", () => {
    expect(mirrorImageThreshold(0)).toBe(21)
  })

  it("d20 roll meets threshold — hits duplicate", () => {
    expect(mirrorImageHitsDuplicate(6, 3)).toBe(true)
    expect(mirrorImageHitsDuplicate(15, 2)).toBe(true)
    expect(mirrorImageHitsDuplicate(11, 1)).toBe(true)
  })

  it("d20 roll below threshold — misses duplicate", () => {
    expect(mirrorImageHitsDuplicate(5, 3)).toBe(false)
    expect(mirrorImageHitsDuplicate(7, 2)).toBe(false)
    expect(mirrorImageHitsDuplicate(10, 1)).toBe(false)
  })

  it("never hits duplicate when 0 remain", () => {
    expect(mirrorImageHitsDuplicate(20, 0)).toBe(false)
    expect(mirrorImageHitsDuplicate(1, 0)).toBe(false)
  })

  it("duplicate AC is 10 + dexMod", () => {
    expect(mirrorImageDuplicateAC(3)).toBe(13)
    expect(mirrorImageDuplicateAC(0)).toBe(10)
    expect(mirrorImageDuplicateAC(-1)).toBe(9)
  })

  it("has correct spell info", () => {
    expect(SPELL_MIRROR_IMAGE.level).toBe(2)
    expect(SPELL_MIRROR_IMAGE.concentration).toBe(false)
    expect(SPELL_MIRROR_IMAGE.castingTime).toBe("action")
  })
})

// --- Stoneskin ---

describe("Stoneskin", () => {
  it("grants resistance to bludgeoning, piercing, and slashing", () => {
    const resistances = stoneskinResistances()
    expect(resistances).toContain("bludgeoning")
    expect(resistances).toContain("piercing")
    expect(resistances).toContain("slashing")
    expect(resistances).toHaveLength(3)
  })

  it("has correct spell info", () => {
    expect(SPELL_STONESKIN.level).toBe(4)
    expect(SPELL_STONESKIN.concentration).toBe(true)
    expect(SPELL_STONESKIN.castingTime).toBe("action")
  })
})

// --- Sanctuary ---

describe("Sanctuary", () => {
  it("DC is the caster's spell save DC (passthrough)", () => {
    expect(sanctuaryDC(15)).toBe(15)
    expect(sanctuaryDC(8)).toBe(8)
  })

  it("is broken when warded creature attacks", () => {
    expect(sanctuaryBroken(true, false)).toBe(true)
  })

  it("is broken when warded creature casts harmful spell", () => {
    expect(sanctuaryBroken(false, true)).toBe(true)
  })

  it("is broken when both conditions are true", () => {
    expect(sanctuaryBroken(true, true)).toBe(true)
  })

  it("is not broken when neither condition is true", () => {
    expect(sanctuaryBroken(false, false)).toBe(false)
  })

  it("has correct spell info", () => {
    expect(SPELL_SANCTUARY.level).toBe(1)
    expect(SPELL_SANCTUARY.concentration).toBe(false)
    expect(SPELL_SANCTUARY.castingTime).toBe("bonusAction")
  })
})

// --- Protection from Evil and Good ---

describe("Protection from Evil and Good", () => {
  it("is active against aberrations", () => {
    expect(protectionFromEvilAndGoodActive("aberration")).toBe(true)
  })

  it("is active against celestials", () => {
    expect(protectionFromEvilAndGoodActive("celestial")).toBe(true)
  })

  it("is active against elementals", () => {
    expect(protectionFromEvilAndGoodActive("elemental")).toBe(true)
  })

  it("is active against fey", () => {
    expect(protectionFromEvilAndGoodActive("fey")).toBe(true)
  })

  it("is active against fiends", () => {
    expect(protectionFromEvilAndGoodActive("fiend")).toBe(true)
  })

  it("is active against undead", () => {
    expect(protectionFromEvilAndGoodActive("undead")).toBe(true)
  })

  it("is not active against humanoids", () => {
    expect(protectionFromEvilAndGoodActive("humanoid")).toBe(false)
  })

  it("is not active against beasts", () => {
    expect(protectionFromEvilAndGoodActive("beast")).toBe(false)
  })

  it("is not active against dragons", () => {
    expect(protectionFromEvilAndGoodActive("dragon")).toBe(false)
  })

  it("has correct spell info", () => {
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.level).toBe(1)
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.concentration).toBe(true)
    expect(SPELL_PROTECTION_FROM_EVIL_AND_GOOD.castingTime).toBe("action")
  })
})
