import { describe, expect, it } from "vitest"

import {
  ARCANE_SWORD_DAMAGE,
  chromaticOrbDamage,
  divineSmiteDamage,
  divineWordEffect,
  ELDRITCH_BLAST_PER_BEAM,
  FAERIE_FIRE_EFFECT,
  FIRE_SHIELD_RETALIATION,
  fireballDamage,
  fireBoltDamage,
  fireShieldResistance,
  fireShieldRetaliationDamageType,
  flameBladeDamage,
  MAGIC_MISSILE_DART,
  magicMissileDarts,
  moonbeamDamage,
  RAY_OF_FROST_SPEED_REDUCTION,
  rayOfFrostDamage,
  sacredFlameDamage,
  searingSmiteDamage,
  shockingGraspDamage,
  SPELL_FIRE_SHIELD,
  SPELL_FIREBALL,
  SPELL_MAGIC_MISSILE,
  SPELL_SPIRITUAL_WEAPON,
  spiritualWeaponDamage,
  VITRIOLIC_SPHERE_DELAYED,
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
    expect(magicMissileDarts(9)).toBe(11)
  })
})

describe("magicMissileDamagePerDart", () => {
  it("always returns 1d4+1", () => {
    expect(MAGIC_MISSILE_DART).toEqual({ dieSize: 4, bonus: 1 })
  })
})

describe("spiritualWeaponDamage", () => {
  it("returns 1d8 at base level 2", () => {
    expect(spiritualWeaponDamage(2)).toEqual({ dice: 1, dieSize: 8 })
  })

  it("scales +1d8 per slot level above 2", () => {
    expect(spiritualWeaponDamage(3)).toEqual({ dice: 2, dieSize: 8 })
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
    expect(FIRE_SHIELD_RETALIATION).toEqual({ dice: 2, dieSize: 8 })
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

// --- Spell Metadata ---

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
    expect(VITRIOLIC_SPHERE_DELAYED).toEqual({ dice: 5, dieSize: 4 })
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
    expect(fireBoltDamage(17)).toEqual({ dice: 4, dieSize: 10 })
  })

  it("Ray of Frost: 1d8 at L1, -10 speed", () => {
    expect(rayOfFrostDamage(1)).toEqual({ dice: 1, dieSize: 8 })
    expect(RAY_OF_FROST_SPEED_REDUCTION).toBe(10)
  })

  it("Eldritch Blast: 1d10 per beam", () => {
    expect(ELDRITCH_BLAST_PER_BEAM).toEqual({ dice: 1, dieSize: 10 })
  })
})

describe("Faerie Fire", () => {
  it("grants advantage on attacks and prevents invisibility", () => {
    expect(FAERIE_FIRE_EFFECT.cantBeInvisible).toBe(true)
    expect(FAERIE_FIRE_EFFECT.attackAdvantage).toBe(true)
  })
})

// --- New Evocation spells ---

describe("Flame Blade", () => {
  it("3d6 at L2", () => {
    expect(flameBladeDamage(2)).toEqual({ dice: 3, dieSize: 6 })
  })

  it("scales +1d6 per slot above 2", () => {
    expect(flameBladeDamage(4)).toEqual({ dice: 5, dieSize: 6 })
  })
})

describe("Moonbeam", () => {
  it("2d10 at L2", () => {
    expect(moonbeamDamage(2)).toEqual({ dice: 2, dieSize: 10 })
  })

  it("scales +1d10 per slot above 2", () => {
    expect(moonbeamDamage(4)).toEqual({ dice: 4, dieSize: 10 })
  })
})

describe("Arcane Sword", () => {
  it("4d12 Force", () => {
    expect(ARCANE_SWORD_DAMAGE).toEqual({ dice: 4, dieSize: 12 })
  })
})

describe("Divine Word", () => {
  it("kills at 0-20 HP", () => {
    expect(divineWordEffect(15)?.dies).toBe(true)
  })

  it("blinds+deafens+stuns at 21-30 HP", () => {
    const effect = divineWordEffect(25)
    expect(effect?.dies).toBe(false)
    expect(effect?.conditions).toContain("stunned")
  })

  it("blinds+deafens at 31-40 HP", () => {
    const effect = divineWordEffect(35)
    expect(effect?.conditions).toEqual(["blinded", "deafened"])
  })

  it("deafens at 41-50 HP", () => {
    const effect = divineWordEffect(45)
    expect(effect?.conditions).toEqual(["deafened"])
  })

  it("no effect above 50 HP", () => {
    expect(divineWordEffect(51)).toBeNull()
  })
})
