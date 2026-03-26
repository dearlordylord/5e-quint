import { describe, expect, it } from "vitest"

import {
  attackRollDamage,
  autoHitDamage,
  canRepeatSpellAttack,
  counterspellCheck,
  disintegrateDamage,
  fireballDamage,
  magicMissileDamagePerDart,
  magicMissileDarts,
  saveForHalf,
  saveOrNothing,
  SPELL_DISINTEGRATE,
  SPELL_FIREBALL,
  SPELL_MAGIC_MISSILE,
  SPELL_SPIRIT_GUARDIANS,
  SPELL_SPIRITUAL_WEAPON,
  SPELL_VAMPIRIC_TOUCH,
  spiritGuardiansDamage,
  spiritualWeaponDamage,
  vampiricTouchDamage,
  vampiricTouchHeal
} from "#/features/spell-damage.ts"

// --- Core Damage Pattern Tests ---

describe("saveForHalf", () => {
  it("returns full damage on failed save", () => {
    expect(saveForHalf(24, false)).toBe(24)
  })

  it("returns floor(damage/2) on successful save", () => {
    expect(saveForHalf(24, true)).toBe(12)
  })

  it("floors odd damage on successful save", () => {
    expect(saveForHalf(25, true)).toBe(12)
  })

  it("handles 0 damage", () => {
    expect(saveForHalf(0, false)).toBe(0)
    expect(saveForHalf(0, true)).toBe(0)
  })

  it("handles 1 damage on successful save (floors to 0)", () => {
    expect(saveForHalf(1, true)).toBe(0)
  })
})

describe("attackRollDamage", () => {
  it("returns damage on hit", () => {
    expect(attackRollDamage(true, 15)).toBe(15)
  })

  it("returns 0 on miss", () => {
    expect(attackRollDamage(false, 15)).toBe(0)
  })
})

describe("autoHitDamage", () => {
  it("returns darts * damagePerDart", () => {
    expect(autoHitDamage(3, 5)).toBe(15)
  })

  it("scales with more darts", () => {
    expect(autoHitDamage(5, 5)).toBe(25)
  })
})

describe("saveOrNothing", () => {
  it("returns full damage on failed save", () => {
    expect(saveOrNothing(75, false)).toBe(75)
  })

  it("returns 0 on successful save", () => {
    expect(saveOrNothing(75, true)).toBe(0)
  })
})

// --- Per-Spell Scaling Tests ---

describe("fireballDamage", () => {
  it("returns 8d6 at base level 3", () => {
    expect(fireballDamage(3)).toEqual({ dice: 8, dieSize: 6 })
  })

  it("scales +1d6 per level above 3", () => {
    expect(fireballDamage(4)).toEqual({ dice: 9, dieSize: 6 })
    expect(fireballDamage(5)).toEqual({ dice: 10, dieSize: 6 })
    expect(fireballDamage(9)).toEqual({ dice: 14, dieSize: 6 })
  })
})

describe("magicMissileDarts", () => {
  it("returns 3 darts at base level 1", () => {
    expect(magicMissileDarts(1)).toBe(3)
  })

  it("scales +1 dart per level above 1", () => {
    expect(magicMissileDarts(2)).toBe(4)
    expect(magicMissileDarts(3)).toBe(5)
    expect(magicMissileDarts(9)).toBe(11)
  })
})

describe("magicMissileDamagePerDart", () => {
  it("always returns 1d4+1", () => {
    expect(magicMissileDamagePerDart()).toEqual({ dieSize: 4, bonus: 1 })
  })
})

describe("vampiricTouchDamage", () => {
  it("returns 3d6 with healFraction 0.5 at base level 3", () => {
    expect(vampiricTouchDamage(3)).toEqual({ dice: 3, dieSize: 6, healFraction: 0.5 })
  })

  it("scales +1d6 per level above 3", () => {
    expect(vampiricTouchDamage(4)).toEqual({ dice: 4, dieSize: 6, healFraction: 0.5 })
    expect(vampiricTouchDamage(5)).toEqual({ dice: 5, dieSize: 6, healFraction: 0.5 })
  })
})

describe("vampiricTouchHeal", () => {
  it("returns floor(damage/2)", () => {
    expect(vampiricTouchHeal(10)).toBe(5)
  })

  it("floors odd damage", () => {
    expect(vampiricTouchHeal(11)).toBe(5)
  })

  it("returns 0 for 0 damage", () => {
    expect(vampiricTouchHeal(0)).toBe(0)
  })

  it("returns 0 for 1 damage", () => {
    expect(vampiricTouchHeal(1)).toBe(0)
  })
})

describe("spiritualWeaponDamage", () => {
  it("returns 1d8 at base level 2", () => {
    expect(spiritualWeaponDamage(2)).toEqual({ dice: 1, dieSize: 8 })
  })

  it("scales +1d8 per 2 slot levels above 2", () => {
    expect(spiritualWeaponDamage(3)).toEqual({ dice: 2, dieSize: 8 })
    expect(spiritualWeaponDamage(4)).toEqual({ dice: 3, dieSize: 8 })
    expect(spiritualWeaponDamage(5)).toEqual({ dice: 4, dieSize: 8 })
    expect(spiritualWeaponDamage(6)).toEqual({ dice: 5, dieSize: 8 })
    expect(spiritualWeaponDamage(8)).toEqual({ dice: 7, dieSize: 8 })
  })
})

describe("spiritGuardiansDamage", () => {
  it("returns 3d8 at base level 3", () => {
    expect(spiritGuardiansDamage(3)).toEqual({ dice: 3, dieSize: 8 })
  })

  it("scales +1d8 per level above 3", () => {
    expect(spiritGuardiansDamage(4)).toEqual({ dice: 4, dieSize: 8 })
    expect(spiritGuardiansDamage(5)).toEqual({ dice: 5, dieSize: 8 })
    expect(spiritGuardiansDamage(9)).toEqual({ dice: 9, dieSize: 8 })
  })
})

describe("counterspellCheck (SRD 5.2.1: CON save)", () => {
  it("auto-succeeds when slot level >= target spell level", () => {
    const result = counterspellCheck(5, 5)
    expect(result.autoSuccess).toBe(true)
    expect(result.requiresSave).toBe(false)
  })

  it("auto-succeeds when slot level > target spell level", () => {
    const result = counterspellCheck(3, 5)
    expect(result.autoSuccess).toBe(true)
    expect(result.requiresSave).toBe(false)
  })

  it("requires CON save when slot level < target spell level", () => {
    const result = counterspellCheck(5, 3)
    expect(result.autoSuccess).toBe(false)
    expect(result.requiresSave).toBe(true)
  })

  it("requires save for level 9 target with level 3 slot", () => {
    const result = counterspellCheck(9, 3)
    expect(result.autoSuccess).toBe(false)
    expect(result.requiresSave).toBe(true)
  })
})

describe("disintegrateDamage", () => {
  it("returns 10d6+40 at base level 6", () => {
    expect(disintegrateDamage(6)).toEqual({ dice: 10, dieSize: 6, flatBonus: 40 })
  })

  it("scales +3d6 per level above 6", () => {
    expect(disintegrateDamage(7)).toEqual({ dice: 13, dieSize: 6, flatBonus: 40 })
    expect(disintegrateDamage(8)).toEqual({ dice: 16, dieSize: 6, flatBonus: 40 })
    expect(disintegrateDamage(9)).toEqual({ dice: 19, dieSize: 6, flatBonus: 40 })
  })
})

// --- Spell Metadata Tests ---

describe("spell metadata", () => {
  it("Fireball is L3, fire, saveForHalf, no concentration", () => {
    expect(SPELL_FIREBALL.level).toBe(3)
    expect(SPELL_FIREBALL.damageType).toBe("fire")
    expect(SPELL_FIREBALL.pattern).toBe("saveForHalf")
    expect(SPELL_FIREBALL.concentration).toBe(false)
    expect(SPELL_FIREBALL.saveAbility).toBe("dex")
  })

  it("Magic Missile is L1, force, autoHit, no concentration", () => {
    expect(SPELL_MAGIC_MISSILE.level).toBe(1)
    expect(SPELL_MAGIC_MISSILE.damageType).toBe("force")
    expect(SPELL_MAGIC_MISSILE.pattern).toBe("autoHit")
    expect(SPELL_MAGIC_MISSILE.concentration).toBe(false)
  })

  it("Vampiric Touch is L3, necrotic, attackRoll, concentration", () => {
    expect(SPELL_VAMPIRIC_TOUCH.level).toBe(3)
    expect(SPELL_VAMPIRIC_TOUCH.damageType).toBe("necrotic")
    expect(SPELL_VAMPIRIC_TOUCH.pattern).toBe("attackRoll")
    expect(SPELL_VAMPIRIC_TOUCH.concentration).toBe(true)
  })

  it("Spiritual Weapon is L2, force, attackRoll, concentration", () => {
    expect(SPELL_SPIRITUAL_WEAPON.level).toBe(2)
    expect(SPELL_SPIRITUAL_WEAPON.damageType).toBe("force")
    expect(SPELL_SPIRITUAL_WEAPON.pattern).toBe("attackRoll")
    expect(SPELL_SPIRITUAL_WEAPON.concentration).toBe(true)
  })

  it("Spirit Guardians is L3, radiant, saveForHalf, concentration, WIS save", () => {
    expect(SPELL_SPIRIT_GUARDIANS.level).toBe(3)
    expect(SPELL_SPIRIT_GUARDIANS.damageType).toBe("radiant")
    expect(SPELL_SPIRIT_GUARDIANS.pattern).toBe("saveForHalf")
    expect(SPELL_SPIRIT_GUARDIANS.concentration).toBe(true)
    expect(SPELL_SPIRIT_GUARDIANS.saveAbility).toBe("wis")
  })

  it("Disintegrate is L6, force, saveOrNothing, DEX save", () => {
    expect(SPELL_DISINTEGRATE.level).toBe(6)
    expect(SPELL_DISINTEGRATE.damageType).toBe("force")
    expect(SPELL_DISINTEGRATE.pattern).toBe("saveOrNothing")
    expect(SPELL_DISINTEGRATE.concentration).toBe(false)
    expect(SPELL_DISINTEGRATE.saveAbility).toBe("dex")
  })
})

// --- Repeatable Attack Spell Tests ---

describe("canRepeatSpellAttack", () => {
  it("returns true when effect is active", () => {
    expect(canRepeatSpellAttack("vampiricTouch", true)).toBe(true)
    expect(canRepeatSpellAttack("spiritualWeapon", true)).toBe(true)
  })

  it("returns false when effect is not active", () => {
    expect(canRepeatSpellAttack("vampiricTouch", false)).toBe(false)
    expect(canRepeatSpellAttack("spiritualWeapon", false)).toBe(false)
  })
})
