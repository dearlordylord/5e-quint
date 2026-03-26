import { describe, expect, it } from "vitest"

import type { FocusPoolState } from "#/features/class-monk.ts"
import {
  pBonusUnarmedStrikeEligible,
  pDexterousAttacks,
  pExpendFocus,
  pFocusMax,
  pFocusSaveDC,
  pInitFocusPool,
  pMartialArtsDamage,
  pMartialArtsDie,
  pPerfectFocus,
  pRestoreFocus,
  pRestoreFocusLongRest,
  pRollInitiative,
  pUncannyMetabolism
} from "#/features/class-monk.ts"

// --- Helpers ---

function mkFocusPool(focusPoints: number, focusMax: number, uncannyMetabolismUsed = false): FocusPoolState {
  return { focusPoints, focusMax, uncannyMetabolismUsed }
}

// --- Focus Pool (T40) ---

describe("Focus Pool", () => {
  describe("pFocusMax", () => {
    it("returns 0 for level 1 (no focus at level 1)", () => {
      expect(pFocusMax(1)).toBe(0)
    })

    it("returns monk level for level 2+", () => {
      expect(pFocusMax(2)).toBe(2)
      expect(pFocusMax(5)).toBe(5)
      expect(pFocusMax(10)).toBe(10)
      expect(pFocusMax(20)).toBe(20)
    })
  })

  describe("pInitFocusPool", () => {
    it("initializes at full focus points", () => {
      const pool = pInitFocusPool(5)
      expect(pool.focusPoints).toBe(5)
      expect(pool.focusMax).toBe(5)
      expect(pool.uncannyMetabolismUsed).toBe(false)
    })

    it("level 1 has no focus", () => {
      const pool = pInitFocusPool(1)
      expect(pool.focusPoints).toBe(0)
      expect(pool.focusMax).toBe(0)
    })
  })

  describe("pExpendFocus", () => {
    it("decrements focus points on valid expenditure", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 1)
      expect(result.focusPoints).toBe(4)
      expect(result.success).toBe(true)
    })

    it("can expend multiple points at once", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 3)
      expect(result.focusPoints).toBe(2)
      expect(result.success).toBe(true)
    })

    it("can expend all remaining points", () => {
      const state = mkFocusPool(2, 5)
      const result = pExpendFocus(state, 2)
      expect(result.focusPoints).toBe(0)
      expect(result.success).toBe(true)
    })

    it("cannot expend below 0", () => {
      const state = mkFocusPool(1, 5)
      const result = pExpendFocus(state, 2)
      expect(result.focusPoints).toBe(1)
      expect(result.success).toBe(false)
    })

    it("cannot expend when at 0", () => {
      const state = mkFocusPool(0, 5)
      const result = pExpendFocus(state, 1)
      expect(result.focusPoints).toBe(0)
      expect(result.success).toBe(false)
    })

    it("rejects zero cost", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 0)
      expect(result.success).toBe(false)
    })

    it("rejects negative cost", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, -1)
      expect(result.success).toBe(false)
    })
  })

  describe("pRestoreFocus (short rest)", () => {
    it("restores to max on short rest", () => {
      const state = mkFocusPool(2, 5)
      const result = pRestoreFocus(state)
      expect(result.focusPoints).toBe(5)
      expect(result.focusMax).toBe(5)
    })

    it("preserves uncannyMetabolismUsed on short rest", () => {
      const state = mkFocusPool(0, 5, true)
      const result = pRestoreFocus(state)
      expect(result.focusPoints).toBe(5)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })
  })

  describe("pRestoreFocusLongRest", () => {
    it("restores to max and resets Uncanny Metabolism on long rest", () => {
      const state = mkFocusPool(0, 5, true)
      const result = pRestoreFocusLongRest(state)
      expect(result.focusPoints).toBe(5)
      expect(result.focusMax).toBe(5)
      expect(result.uncannyMetabolismUsed).toBe(false)
    })
  })

  describe("pUncannyMetabolism", () => {
    it("restores all FP and heals at initiative (1/LR)", () => {
      const state = mkFocusPool(1, 5)
      const dieRoll = 4
      const monkLevel = 5
      const result = pUncannyMetabolism(state, monkLevel, dieRoll)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(9) // monkLevel(5) + dieRoll(4)
      expect(result.uncannyMetabolismUsed).toBe(true)
      expect(result.triggered).toBe(true)
    })

    it("does not trigger if already used this long rest", () => {
      const state = mkFocusPool(1, 5, true)
      const result = pUncannyMetabolism(state, 5, 4)
      expect(result.focusPoints).toBe(1)
      expect(result.hpHealed).toBe(0)
      expect(result.triggered).toBe(false)
    })

    it("does not trigger below level 2", () => {
      const state = mkFocusPool(0, 0)
      const result = pUncannyMetabolism(state, 1, 4)
      expect(result.triggered).toBe(false)
    })

    it("healing = monk level + die roll", () => {
      const state = mkFocusPool(3, 10)
      const result = pUncannyMetabolism(state, 10, 6)
      expect(result.hpHealed).toBe(16) // 10 + 6
    })
  })

  describe("pPerfectFocus", () => {
    it("raises FP to 4 when below threshold at initiative (level 15+)", () => {
      const state = mkFocusPool(2, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("raises FP to 4 when at 0", () => {
      const state = mkFocusPool(0, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("raises FP to 4 when at exactly 3", () => {
      const state = mkFocusPool(3, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("does not trigger when already at 4 or higher", () => {
      const state = mkFocusPool(4, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(false)
    })

    it("does not trigger below level 15", () => {
      const state = mkFocusPool(1, 14)
      const result = pPerfectFocus(state, 14)
      expect(result.focusPoints).toBe(1)
      expect(result.triggered).toBe(false)
    })
  })

  describe("pRollInitiative (combined)", () => {
    it("uses Uncanny Metabolism when available", () => {
      const state = mkFocusPool(1, 5)
      const result = pRollInitiative(state, 5, 4)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(9)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })

    it("falls back to Perfect Focus when UM already used (level 15+)", () => {
      const state = mkFocusPool(2, 15, true)
      const result = pRollInitiative(state, 15, 4)
      expect(result.focusPoints).toBe(4)
      expect(result.hpHealed).toBe(0)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })

    it("no effect when UM used and below Perfect Focus level", () => {
      const state = mkFocusPool(2, 5, true)
      const result = pRollInitiative(state, 5, 4)
      expect(result.focusPoints).toBe(2)
      expect(result.hpHealed).toBe(0)
    })

    it("Perfect Focus does not trigger when FP >= 4 even if UM used", () => {
      const state = mkFocusPool(5, 15, true)
      const result = pRollInitiative(state, 15, 4)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(0)
    })
  })

  describe("pFocusSaveDC", () => {
    it("computes 8 + WIS mod + proficiency bonus", () => {
      expect(pFocusSaveDC(3, 2)).toBe(13)
      expect(pFocusSaveDC(5, 4)).toBe(17)
      expect(pFocusSaveDC(0, 2)).toBe(10)
    })
  })
})

// --- Martial Arts (T41) ---

describe("Martial Arts", () => {
  describe("pMartialArtsDie", () => {
    it("d6 at level 1", () => {
      expect(pMartialArtsDie(1)).toBe(6)
    })

    it("d6 at level 4", () => {
      expect(pMartialArtsDie(4)).toBe(6)
    })

    it("d8 at level 5", () => {
      expect(pMartialArtsDie(5)).toBe(8)
    })

    it("d8 at level 10", () => {
      expect(pMartialArtsDie(10)).toBe(8)
    })

    it("d10 at level 11", () => {
      expect(pMartialArtsDie(11)).toBe(10)
    })

    it("d10 at level 16", () => {
      expect(pMartialArtsDie(16)).toBe(10)
    })

    it("d12 at level 17", () => {
      expect(pMartialArtsDie(17)).toBe(12)
    })

    it("d12 at level 20", () => {
      expect(pMartialArtsDie(20)).toBe(12)
    })
  })

  describe("pDexterousAttacks", () => {
    it("uses DEX when DEX mod is higher for unarmed", () => {
      expect(pDexterousAttacks(2, 4, "unarmed")).toBe("dex")
    })

    it("uses STR when STR mod is higher for unarmed", () => {
      expect(pDexterousAttacks(4, 2, "unarmed")).toBe("str")
    })

    it("uses DEX when equal for unarmed", () => {
      expect(pDexterousAttacks(3, 3, "unarmed")).toBe("dex")
    })

    it("uses DEX when DEX mod is higher for monk weapon", () => {
      expect(pDexterousAttacks(1, 3, "monkWeapon")).toBe("dex")
    })

    it("always uses STR for non-monk weapons", () => {
      expect(pDexterousAttacks(1, 5, "other")).toBe("str")
    })
  })

  describe("pMartialArtsDamage", () => {
    it("uses MA die when larger than weapon die", () => {
      // Level 5 monk (d8) with d6 weapon
      expect(pMartialArtsDamage(5, 6)).toBe(8)
    })

    it("uses weapon die when larger than MA die", () => {
      // Level 1 monk (d6) with d8 weapon
      expect(pMartialArtsDamage(1, 8)).toBe(8)
    })

    it("uses MA die when equal to weapon die", () => {
      expect(pMartialArtsDamage(5, 8)).toBe(8)
    })

    it("unarmed strike (d1) always uses MA die", () => {
      expect(pMartialArtsDamage(1, 1)).toBe(6)
    })
  })

  describe("pBonusUnarmedStrikeEligible", () => {
    it("eligible after Attack action with unarmed strike, no armor/shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", false, false)).toBe(true)
    })

    it("eligible after Attack action with monk weapon, no armor/shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "monkWeapon", false, false)).toBe(true)
    })

    it("not eligible with non-monk weapon", () => {
      expect(pBonusUnarmedStrikeEligible(true, "other", false, false)).toBe(false)
    })

    it("not eligible without Attack action", () => {
      expect(pBonusUnarmedStrikeEligible(false, "unarmed", false, false)).toBe(false)
    })

    it("not eligible when wearing armor", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", true, false)).toBe(false)
    })

    it("not eligible when wielding shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", false, true)).toBe(false)
    })
  })
})
