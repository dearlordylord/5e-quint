import { describe, expect, it } from "vitest"

import {
  canRepeatSpellAttack,
  chromaticOrbDamage,
  chromaticOrbMaxLeaps,
  divineSmiteDamage,
  eldritchBlastDamagePerBeam,
  faerieFireActive,
  fireballDamage,
  fireBoltDamage,
  fireShieldResistance,
  fireShieldRetaliationDamage,
  fireShieldRetaliationDamageType,
  magicMissileDamagePerDart,
  magicMissileDarts,
  rayOfFrostDamage,
  rayOfFrostSpeedReduction,
  sacredFlameDamage,
  searingSmiteDamage,
  shockingGraspDamage,
  SPELL_FIRE_SHIELD,
  SPELL_FIREBALL,
  SPELL_MAGIC_MISSILE,
  SPELL_SPIRITUAL_WEAPON,
  spiritualWeaponDamage,
  vitriolicSphereDelayedDamage,
  vitriolicSphereInitialDamage
} from "#/features/spell-evocation.ts"
import { attackRollDamage, autoHitDamage, saveForHalf } from "#/features/spell-patterns.ts"

// --- Core Damage Pattern Tests (from spell-patterns.ts) ---

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

// --- Spell Metadata Tests ---

describe("evocation spell metadata", () => {
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

  it("Spiritual Weapon is L2, force, attackRoll, concentration", () => {
    expect(SPELL_SPIRITUAL_WEAPON.level).toBe(2)
    expect(SPELL_SPIRITUAL_WEAPON.damageType).toBe("force")
    expect(SPELL_SPIRITUAL_WEAPON.pattern).toBe("attackRoll")
    expect(SPELL_SPIRITUAL_WEAPON.concentration).toBe(true)
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

// =============================================================================
// New Evocation spells
// =============================================================================

describe("Chromatic Orb", () => {
  it("returns 3d8 at L1", () => {
    expect(chromaticOrbDamage(1)).toEqual({ dice: 3, dieSize: 8 })
  })

  it("scales +1d8 per slot level above 1", () => {
    expect(chromaticOrbDamage(2)).toEqual({ dice: 4, dieSize: 8 })
    expect(chromaticOrbDamage(5)).toEqual({ dice: 7, dieSize: 8 })
  })

  it("max leaps equals slot level", () => {
    expect(chromaticOrbMaxLeaps(1)).toBe(1)
    expect(chromaticOrbMaxLeaps(3)).toBe(3)
  })
})

describe("Searing Smite", () => {
  it("returns 1d6 at L1", () => {
    expect(searingSmiteDamage(1)).toEqual({ dice: 1, dieSize: 6 })
  })

  it("scales +1d6 per slot level above 1", () => {
    expect(searingSmiteDamage(2)).toEqual({ dice: 2, dieSize: 6 })
    expect(searingSmiteDamage(5)).toEqual({ dice: 5, dieSize: 6 })
  })
})

describe("Vitriolic Sphere", () => {
  it("initial damage is 10d4 at L4", () => {
    expect(vitriolicSphereInitialDamage(4)).toEqual({ dice: 10, dieSize: 4 })
  })

  it("initial scales +2d4 per slot above 4", () => {
    expect(vitriolicSphereInitialDamage(5)).toEqual({ dice: 12, dieSize: 4 })
    expect(vitriolicSphereInitialDamage(6)).toEqual({ dice: 14, dieSize: 4 })
  })

  it("delayed damage is always 5d4", () => {
    expect(vitriolicSphereDelayedDamage()).toEqual({ dice: 5, dieSize: 4 })
  })
})

describe("Divine Smite", () => {
  it("returns 2d8 at L1 vs normal target", () => {
    expect(divineSmiteDamage(1, false)).toEqual({ dice: 2, dieSize: 8 })
  })

  it("returns 3d8 at L1 vs fiend/undead", () => {
    expect(divineSmiteDamage(1, true)).toEqual({ dice: 3, dieSize: 8 })
  })

  it("scales +1d8 per slot above 1", () => {
    expect(divineSmiteDamage(3, false)).toEqual({ dice: 4, dieSize: 8 })
    expect(divineSmiteDamage(3, true)).toEqual({ dice: 5, dieSize: 8 })
  })
})

describe("cantrip damage scaling", () => {
  it("Shocking Grasp: 1d8 at L1, 2d8 at L5", () => {
    expect(shockingGraspDamage(1)).toEqual({ dice: 1, dieSize: 8 })
    expect(shockingGraspDamage(5)).toEqual({ dice: 2, dieSize: 8 })
    expect(shockingGraspDamage(11)).toEqual({ dice: 3, dieSize: 8 })
    expect(shockingGraspDamage(17)).toEqual({ dice: 4, dieSize: 8 })
  })

  it("Sacred Flame: 1d8 at L1, scales same as cantrips", () => {
    expect(sacredFlameDamage(1)).toEqual({ dice: 1, dieSize: 8 })
    expect(sacredFlameDamage(5)).toEqual({ dice: 2, dieSize: 8 })
  })

  it("Fire Bolt: 1d10 at L1, scales at 5/11/17", () => {
    expect(fireBoltDamage(1)).toEqual({ dice: 1, dieSize: 10 })
    expect(fireBoltDamage(5)).toEqual({ dice: 2, dieSize: 10 })
    expect(fireBoltDamage(11)).toEqual({ dice: 3, dieSize: 10 })
    expect(fireBoltDamage(17)).toEqual({ dice: 4, dieSize: 10 })
  })

  it("Ray of Frost: 1d8 at L1, -10 speed", () => {
    expect(rayOfFrostDamage(1)).toEqual({ dice: 1, dieSize: 8 })
    expect(rayOfFrostDamage(5)).toEqual({ dice: 2, dieSize: 8 })
    expect(rayOfFrostSpeedReduction()).toBe(10)
  })

  it("Eldritch Blast: 1d10 per beam", () => {
    expect(eldritchBlastDamagePerBeam()).toEqual({ dice: 1, dieSize: 10 })
  })
})

describe("Faerie Fire", () => {
  it("grants advantage on attacks and prevents invisibility", () => {
    const effect = faerieFireActive()
    expect(effect.cantBeInvisible).toBe(true)
    expect(effect.attackAdvantage).toBe(true)
  })
})
