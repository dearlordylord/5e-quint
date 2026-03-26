import { describe, expect, it } from "vitest"

import {
  canLayOnHandsCure,
  canLayOnHandsHeal,
  canPaladinSmiteFree,
  curableConditions,
  layOnHandsLongRest,
  layOnHandsPoolMax,
  paladinLongRest,
  pDivineSmiteDamage,
  pLayOnHands,
  pLayOnHandsCure,
  pPaladinSmiteFree,
  pRadiantStrikes
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
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["poisoned"] }
      const result = pLayOnHandsCure(state, "poisoned")
      expect(result.layOnHandsPool).toBe(20)
      expect(result.conditionRemoved).toBe("poisoned")
    })

    it("can cure poisoned condition", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 10, conditions: ["poisoned"] }
      expect(canLayOnHandsCure(state, "poisoned", 1)).toBe(true)
    })

    it("can't cure if pool < 5", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 4, conditions: ["poisoned"] }
      expect(canLayOnHandsCure(state, "poisoned", 1)).toBe(false)
    })

    it("can't cure non-poisoned conditions before level 14", () => {
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["blinded"] }
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
      const state = { hp: 20, maxHp: 20, layOnHandsPool: 25, conditions: ["frightened"] }
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

// --- Combined long rest ---

describe("paladin long rest", () => {
  it("restores pool and free smite", () => {
    const result = paladinLongRest(10)
    expect(result.layOnHandsPool).toBe(50)
    expect(result.paladinSmiteFreeUseAvailable).toBe(true)
  })
})
