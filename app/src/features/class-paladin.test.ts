import { describe, expect, it } from "vitest"

import {
  ABJURE_FOES_RANGE_FEET,
  abjureFoesResult,
  auraOfCourageRange,
  auraOfProtectionBonus,
  auraOfProtectionRange,
  canAbjureFoes,
  canLayOnHandsCure,
  canLayOnHandsHeal,
  canPaladinSmiteFree,
  canUseAuraOfCourage,
  canUseAuraOfProtection,
  canUseFaithfulSteed,
  canUseRestoringTouch,
  curableConditions,
  hasDivineHealth,
  layOnHandsLongRest,
  layOnHandsPoolMax,
  paladinLongRest,
  pDivineSmiteDamage,
  pLayOnHands,
  pLayOnHandsCure,
  pPaladinSmiteFree,
  pRadiantStrikes,
  restoringTouchConditions,
  restoringTouchCost,
  useFaithfulSteed
} from "#/features/class-paladin.ts"

// --- Lay on Hands ---

describe("lay on hands", () => {
  describe("pool size", () => {
    it("pool = paladin level × 5", () => {
      expect(layOnHandsPoolMax(1)).toBe(5)
      expect(layOnHandsPoolMax(5)).toBe(25)
      expect(layOnHandsPoolMax(10)).toBe(50)
      expect(layOnHandsPoolMax(20)).toBe(100)
    })

    it("level 0 or negative returns 0", () => {
      expect(layOnHandsPoolMax(0)).toBe(0)
      expect(layOnHandsPoolMax(-1)).toBe(0)
    })
  })

  describe("healing", () => {
    it("heals correct amount from pool", () => {
      const state = { hp: 10, maxHp: 30, layOnHandsPool: 25, conditions: [] }
      const result = pLayOnHands(state, 15)
      expect(result.hp).toBe(25)
      expect(result.layOnHandsPool).toBe(10)
      expect(result.healedAmount).toBe(15)
    })

    it("pool decrements by healed amount", () => {
      const state = { hp: 5, maxHp: 20, layOnHandsPool: 50, conditions: [] }
      const result = pLayOnHands(state, 10)
      expect(result.layOnHandsPool).toBe(40)
    })

    it("can't exceed pool", () => {
      const state = { hp: 10, maxHp: 50, layOnHandsPool: 8, conditions: [] }
      const result = pLayOnHands(state, 20)
      expect(result.hp).toBe(18)
      expect(result.layOnHandsPool).toBe(0)
      expect(result.healedAmount).toBe(8)
    })

    it("can't exceed max HP", () => {
      const state = { hp: 18, maxHp: 20, layOnHandsPool: 25, conditions: [] }
      const result = pLayOnHands(state, 10)
      expect(result.hp).toBe(20)
      expect(result.layOnHandsPool).toBe(23)
      expect(result.healedAmount).toBe(2)
    })

    it("negative amount treated as 0", () => {
      const state = { hp: 10, maxHp: 20, layOnHandsPool: 25, conditions: [] }
      const result = pLayOnHands(state, -5)
      expect(result.hp).toBe(10)
      expect(result.layOnHandsPool).toBe(25)
      expect(result.healedAmount).toBe(0)
    })

    it("canLayOnHandsHeal returns false when pool empty", () => {
      const state = { hp: 10, maxHp: 20, layOnHandsPool: 0, conditions: [] }
      expect(canLayOnHandsHeal(state)).toBe(false)
    })

    it("canLayOnHandsHeal returns false at full HP", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: [] }
      expect(canLayOnHandsHeal(state)).toBe(false)
    })

    it("canLayOnHandsHeal returns true when pool > 0 and hp < maxHp", () => {
      const state = { hp: 10, maxHp: 20, layOnHandsPool: 5, conditions: [] }
      expect(canLayOnHandsHeal(state)).toBe(true)
    })
  })

  describe("cure conditions", () => {
    it("cure costs 5 from pool", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["poisoned"] as const }
      const result = pLayOnHandsCure(state, "poisoned")
      expect(result.layOnHandsPool).toBe(20)
      expect(result.conditionRemoved).toBe("poisoned")
    })

    it("can cure poisoned condition", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 10, conditions: ["poisoned"] as const }
      expect(canLayOnHandsCure(state, "poisoned", 1)).toBe(true)
    })

    it("can't cure if pool < 5", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 4, conditions: ["poisoned"] as const }
      expect(canLayOnHandsCure(state, "poisoned", 1)).toBe(false)
    })

    it("can't cure non-poisoned conditions before level 14", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["blinded"] as const }
      expect(canLayOnHandsCure(state, "blinded", 10)).toBe(false)
    })

    it("can't cure condition creature doesn't have", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: [] }
      expect(canLayOnHandsCure(state, "poisoned", 5)).toBe(false)
    })
  })

  describe("restoring touch (level 14)", () => {
    it("at level 14+ can remove blinded, charmed, deafened, frightened, paralyzed, stunned", () => {
      const conditions = curableConditions(14)
      expect(conditions).toContain("poisoned")
      expect(conditions).toContain("blinded")
      expect(conditions).toContain("charmed")
      expect(conditions).toContain("deafened")
      expect(conditions).toContain("frightened")
      expect(conditions).toContain("paralyzed")
      expect(conditions).toContain("stunned")
    })

    it("below level 14 only poisoned", () => {
      const conditions = curableConditions(13)
      expect(conditions).toEqual(["poisoned"])
    })

    it("can cure frightened at level 14", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["frightened"] as const }
      expect(canLayOnHandsCure(state, "frightened", 14)).toBe(true)
    })
  })

  describe("long rest", () => {
    it("resets pool to max", () => {
      expect(layOnHandsLongRest(5)).toBe(25)
      expect(layOnHandsLongRest(10)).toBe(50)
    })
  })
})

// --- Paladin's Smite + Divine Smite ---

describe("divine smite damage", () => {
  it("1st level slot -> 2d8", () => {
    expect(pDivineSmiteDamage(1, false)).toBe(2)
  })

  it("2nd level slot -> 3d8", () => {
    expect(pDivineSmiteDamage(2, false)).toBe(3)
  })

  it("3rd level slot -> 4d8", () => {
    expect(pDivineSmiteDamage(3, false)).toBe(4)
  })

  it("4th level slot -> 5d8 (cap)", () => {
    expect(pDivineSmiteDamage(4, false)).toBe(5)
  })

  it("5th level slot -> 5d8 (still capped)", () => {
    expect(pDivineSmiteDamage(5, false)).toBe(5)
  })

  it("1st level slot vs undead -> 3d8", () => {
    expect(pDivineSmiteDamage(1, true)).toBe(3)
  })

  it("4th level slot vs undead -> 6d8 (cap + 1 for undead)", () => {
    expect(pDivineSmiteDamage(4, true)).toBe(6)
  })

  it("5th level slot vs fiend -> 6d8 (cap + 1)", () => {
    expect(pDivineSmiteDamage(5, true)).toBe(6)
  })
})

describe("paladin's smite free use", () => {
  it("free cast available initially", () => {
    const state = { paladinSmiteFreeUseAvailable: true }
    expect(canPaladinSmiteFree(state)).toBe(true)
  })

  it("using free cast sets it to unavailable", () => {
    const state = { paladinSmiteFreeUseAvailable: true }
    const result = pPaladinSmiteFree(state)
    expect(result.paladinSmiteFreeUseAvailable).toBe(false)
  })

  it("can't use free cast twice", () => {
    const state = { paladinSmiteFreeUseAvailable: false }
    expect(canPaladinSmiteFree(state)).toBe(false)
  })

  it("free cast restored on long rest", () => {
    const result = paladinLongRest(5)
    expect(result.paladinSmiteFreeUseAvailable).toBe(true)
  })
})

// --- Radiant Strikes ---

describe("radiant strikes", () => {
  it("no bonus below level 11", () => {
    expect(pRadiantStrikes({ paladinLevel: 10, isMeleeOrUnarmed: true })).toBe(0)
  })

  it("+1d8 on melee hit at level 11+", () => {
    expect(pRadiantStrikes({ paladinLevel: 11, isMeleeOrUnarmed: true })).toBe(1)
  })

  it("+1d8 on unarmed strike at level 11+", () => {
    expect(pRadiantStrikes({ paladinLevel: 11, isMeleeOrUnarmed: true })).toBe(1)
  })

  it("no bonus on ranged attack even at level 11+", () => {
    expect(pRadiantStrikes({ paladinLevel: 11, isMeleeOrUnarmed: false })).toBe(0)
  })

  it("works at level 20", () => {
    expect(pRadiantStrikes({ paladinLevel: 20, isMeleeOrUnarmed: true })).toBe(1)
  })
})

// --- Divine Health ---

describe("divine health", () => {
  it("false below level 3", () => {
    expect(hasDivineHealth(1)).toBe(false)
    expect(hasDivineHealth(2)).toBe(false)
  })

  it("true at level 3+", () => {
    expect(hasDivineHealth(3)).toBe(true)
    expect(hasDivineHealth(10)).toBe(true)
    expect(hasDivineHealth(20)).toBe(true)
  })
})

// --- Faithful Steed ---

describe("faithful steed", () => {
  it("not available below level 5", () => {
    expect(canUseFaithfulSteed(4, false)).toBe(false)
  })

  it("available at level 5+ when not used", () => {
    expect(canUseFaithfulSteed(5, false)).toBe(true)
    expect(canUseFaithfulSteed(10, false)).toBe(true)
  })

  it("not available when already used", () => {
    expect(canUseFaithfulSteed(5, true)).toBe(false)
  })

  it("useFaithfulSteed marks it as used", () => {
    const result = useFaithfulSteed()
    expect(result.faithfulSteedUsed).toBe(true)
  })
})

// --- Aura of Protection ---

describe("aura of protection", () => {
  describe("bonus", () => {
    it("0 below level 6", () => {
      expect(auraOfProtectionBonus(5, 3)).toBe(0)
    })

    it("equals CHA mod at level 6+", () => {
      expect(auraOfProtectionBonus(6, 3)).toBe(3)
      expect(auraOfProtectionBonus(10, 5)).toBe(5)
    })

    it("minimum +1 even with negative CHA mod", () => {
      expect(auraOfProtectionBonus(6, -1)).toBe(1)
      expect(auraOfProtectionBonus(6, 0)).toBe(1)
    })
  })

  describe("range", () => {
    it("0 below level 6", () => {
      expect(auraOfProtectionRange(5)).toBe(0)
    })

    it("10 at level 6+", () => {
      expect(auraOfProtectionRange(6)).toBe(10)
      expect(auraOfProtectionRange(17)).toBe(10)
    })

    it("30 at level 18+ (Aura Expansion)", () => {
      expect(auraOfProtectionRange(18)).toBe(30)
      expect(auraOfProtectionRange(20)).toBe(30)
    })
  })

  describe("requires conscious", () => {
    it("active when conscious at level 6+", () => {
      expect(canUseAuraOfProtection(6, true)).toBe(true)
    })

    it("inactive when not conscious", () => {
      expect(canUseAuraOfProtection(6, false)).toBe(false)
    })

    it("inactive below level 6", () => {
      expect(canUseAuraOfProtection(5, true)).toBe(false)
    })
  })
})

// --- Abjure Foes ---

describe("abjure foes", () => {
  it("requires level 9+", () => {
    expect(canAbjureFoes(8, 2, 1)).toBe(false)
    expect(canAbjureFoes(9, 2, 1)).toBe(true)
  })

  it("requires channel divinity charges", () => {
    expect(canAbjureFoes(9, 0, 1)).toBe(false)
    expect(canAbjureFoes(9, 1, 1)).toBe(true)
  })

  it("requires action available", () => {
    expect(canAbjureFoes(9, 2, 0)).toBe(false)
  })

  it("target fails save: frightened and restricted actions", () => {
    const result = abjureFoesResult(false)
    expect(result.frightened).toBe(true)
    expect(result.restrictedActions).toBe(true)
  })

  it("target passes save: no effects", () => {
    const result = abjureFoesResult(true)
    expect(result.frightened).toBe(false)
    expect(result.restrictedActions).toBe(false)
  })

  it("range is 60 feet", () => {
    expect(ABJURE_FOES_RANGE_FEET).toBe(60)
  })
})

// --- Aura of Courage ---

describe("aura of courage", () => {
  it("requires level 10+ and conscious", () => {
    expect(canUseAuraOfCourage(9, true)).toBe(false)
    expect(canUseAuraOfCourage(10, true)).toBe(true)
    expect(canUseAuraOfCourage(10, false)).toBe(false)
  })

  describe("range", () => {
    it("0 below level 10", () => {
      expect(auraOfCourageRange(9)).toBe(0)
    })

    it("10 at level 10+", () => {
      expect(auraOfCourageRange(10)).toBe(10)
      expect(auraOfCourageRange(17)).toBe(10)
    })

    it("30 at level 18+ (Aura Expansion)", () => {
      expect(auraOfCourageRange(18)).toBe(30)
      expect(auraOfCourageRange(20)).toBe(30)
    })
  })
})

// --- Restoring Touch ---

describe("restoring touch", () => {
  it("costs 5 HP from pool", () => {
    expect(restoringTouchCost()).toBe(5)
  })

  it("correct condition list", () => {
    const conditions = restoringTouchConditions()
    expect(conditions).toContain("blinded")
    expect(conditions).toContain("charmed")
    expect(conditions).toContain("deafened")
    expect(conditions).toContain("frightened")
    expect(conditions).toContain("paralyzed")
    expect(conditions).toContain("stunned")
    expect(conditions).toHaveLength(6)
  })

  it("requires level 14+ and pool >= 5", () => {
    expect(canUseRestoringTouch(13, 10)).toBe(false)
    expect(canUseRestoringTouch(14, 4)).toBe(false)
    expect(canUseRestoringTouch(14, 5)).toBe(true)
    expect(canUseRestoringTouch(20, 100)).toBe(true)
  })
})

// --- Combined long rest ---

describe("paladin long rest", () => {
  it("restores pool, free smite, and faithful steed", () => {
    const result = paladinLongRest(10)
    expect(result.layOnHandsPool).toBe(50)
    expect(result.paladinSmiteFreeUseAvailable).toBe(true)
    expect(result.faithfulSteedUsed).toBe(false)
  })
})
