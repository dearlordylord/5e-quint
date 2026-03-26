import { describe, expect, it } from "vitest"

import {
  applyCunningStrike,
  applySneakAttack,
  applySteadyAim,
  canApplyCunningStrike,
  canSneakAttack,
  canSteadyAim,
  cunningStrikeDC,
  maxCunningStrikeEffects,
  resetRogueTurnState,
  sneakAttackDice,
  strikeDieCost
} from "#/features/class-rogue.ts"

// --- Sneak Attack dice ---

describe("sneakAttackDice", () => {
  it("returns 0 for level 0", () => {
    expect(sneakAttackDice(0)).toBe(0)
  })

  it("returns ceil(level/2) for each level 1-20", () => {
    const expected = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]
    for (let level = 1; level <= 20; level++) {
      expect(sneakAttackDice(level)).toBe(expected[level - 1])
    }
  })

  it("matches SRD table values", () => {
    expect(sneakAttackDice(1)).toBe(1)
    expect(sneakAttackDice(3)).toBe(2)
    expect(sneakAttackDice(5)).toBe(3)
    expect(sneakAttackDice(11)).toBe(6)
    expect(sneakAttackDice(14)).toBe(7)
    expect(sneakAttackDice(20)).toBe(10)
  })
})

// --- canSneakAttack ---

describe("canSneakAttack", () => {
  const base = {
    hasAdvantage: false,
    hasDisadvantage: false,
    allyAdjacentAndNotIncapacitated: false,
    isFinesse: false,
    isRanged: false,
    sneakAttackUsedThisTurn: false
  }

  it("requires finesse or ranged weapon", () => {
    expect(canSneakAttack({ ...base, hasAdvantage: true })).toBe(false)
    expect(canSneakAttack({ ...base, hasAdvantage: true, isFinesse: true })).toBe(true)
    expect(canSneakAttack({ ...base, hasAdvantage: true, isRanged: true })).toBe(true)
  })

  it("allows with advantage", () => {
    expect(canSneakAttack({ ...base, hasAdvantage: true, isFinesse: true })).toBe(true)
  })

  it("allows with adjacent ally (no disadvantage)", () => {
    expect(canSneakAttack({ ...base, allyAdjacentAndNotIncapacitated: true, isFinesse: true })).toBe(true)
  })

  it("denies with adjacent ally if has disadvantage", () => {
    expect(
      canSneakAttack({
        ...base,
        allyAdjacentAndNotIncapacitated: true,
        hasDisadvantage: true,
        isFinesse: true
      })
    ).toBe(false)
  })

  it("allows with advantage even if has disadvantage", () => {
    // SRD: advantage is sufficient on its own
    expect(canSneakAttack({ ...base, hasAdvantage: true, hasDisadvantage: true, isFinesse: true })).toBe(true)
  })

  it("once per turn", () => {
    expect(canSneakAttack({ ...base, hasAdvantage: true, isFinesse: true, sneakAttackUsedThisTurn: true })).toBe(false)
  })
})

// --- applySneakAttack ---

describe("applySneakAttack", () => {
  it("returns dice result as extra damage and marks used", () => {
    const result = applySneakAttack(14)
    expect(result.extraDamage).toBe(14)
    expect(result.sneakAttackUsedThisTurn).toBe(true)
  })
})

// --- Steady Aim ---

describe("canSteadyAim", () => {
  it("requires rogue level 3+", () => {
    expect(canSteadyAim({ rogueLevel: 2, hasMovedThisTurn: false, steadyAimUsedThisTurn: false })).toBe(false)
    expect(canSteadyAim({ rogueLevel: 3, hasMovedThisTurn: false, steadyAimUsedThisTurn: false })).toBe(true)
  })

  it("denies if already moved this turn", () => {
    expect(canSteadyAim({ rogueLevel: 5, hasMovedThisTurn: true, steadyAimUsedThisTurn: false })).toBe(false)
  })

  it("denies if already used this turn", () => {
    expect(canSteadyAim({ rogueLevel: 5, hasMovedThisTurn: false, steadyAimUsedThisTurn: true })).toBe(false)
  })
})

describe("applySteadyAim", () => {
  it("grants advantage, sets speed to 0, marks used", () => {
    const result = applySteadyAim()
    expect(result.hasAdvantage).toBe(true)
    expect(result.speed).toBe(0)
    expect(result.steadyAimUsedThisTurn).toBe(true)
  })
})

// --- Cunning Strike ---

describe("strikeDieCost", () => {
  it("L5 effects cost 1d6", () => {
    expect(strikeDieCost("poison")).toBe(1)
    expect(strikeDieCost("trip")).toBe(1)
    expect(strikeDieCost("withdraw")).toBe(1)
  })

  it("Devious Strikes effects have correct costs", () => {
    expect(strikeDieCost("daze")).toBe(2)
    expect(strikeDieCost("knockOut")).toBe(6)
    expect(strikeDieCost("obscure")).toBe(3)
  })
})

describe("cunningStrikeDC", () => {
  it("computes 8 + dex mod + prof bonus", () => {
    expect(cunningStrikeDC(3, 3)).toBe(14)
    expect(cunningStrikeDC(5, 2)).toBe(15)
    expect(cunningStrikeDC(0, 2)).toBe(10)
  })
})

describe("canApplyCunningStrike", () => {
  it("requires rogue level 5+", () => {
    expect(canApplyCunningStrike({ rogueLevel: 4, sneakAttackDiceRemaining: 5, effect: "poison" })).toBe(false)
    expect(canApplyCunningStrike({ rogueLevel: 5, sneakAttackDiceRemaining: 5, effect: "poison" })).toBe(true)
  })

  it("requires sufficient remaining dice", () => {
    expect(canApplyCunningStrike({ rogueLevel: 5, sneakAttackDiceRemaining: 0, effect: "poison" })).toBe(false)
    expect(canApplyCunningStrike({ rogueLevel: 5, sneakAttackDiceRemaining: 1, effect: "poison" })).toBe(true)
  })

  it("Devious Strikes require level 14+", () => {
    expect(canApplyCunningStrike({ rogueLevel: 13, sneakAttackDiceRemaining: 10, effect: "daze" })).toBe(false)
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 10, effect: "daze" })).toBe(true)
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 10, effect: "knockOut" })).toBe(true)
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 10, effect: "obscure" })).toBe(true)
  })

  it("Knock Out requires 6 remaining dice", () => {
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 5, effect: "knockOut" })).toBe(false)
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 6, effect: "knockOut" })).toBe(true)
  })

  it("Obscure requires 3 remaining dice", () => {
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 2, effect: "obscure" })).toBe(false)
    expect(canApplyCunningStrike({ rogueLevel: 14, sneakAttackDiceRemaining: 3, effect: "obscure" })).toBe(true)
  })
})

describe("maxCunningStrikeEffects", () => {
  it("returns 0 below level 5", () => {
    expect(maxCunningStrikeEffects(4)).toBe(0)
  })

  it("returns 1 at levels 5-10", () => {
    expect(maxCunningStrikeEffects(5)).toBe(1)
    expect(maxCunningStrikeEffects(10)).toBe(1)
  })

  it("returns 2 at level 11+ (Improved Cunning Strike)", () => {
    expect(maxCunningStrikeEffects(11)).toBe(2)
    expect(maxCunningStrikeEffects(20)).toBe(2)
  })
})

describe("applyCunningStrike", () => {
  const baseParams = {
    sneakAttackDiceRemaining: 5,
    savePassed: false,
    targetSize: "medium" as const,
    halfSpeed: 15
  }

  describe("Poison", () => {
    it("applies poisoned condition on failed save", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "poison" })
      expect(result.remainingDice).toBe(4)
      expect(result.appliedCondition).toBe("poisoned")
    })

    it("no condition on passed save", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "poison", savePassed: true })
      expect(result.remainingDice).toBe(4)
      expect(result.appliedCondition).toBeNull()
    })
  })

  describe("Trip", () => {
    it("applies prone on failed save for Large or smaller", () => {
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "large" }).appliedCondition).toBe("prone")
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "small" }).appliedCondition).toBe("prone")
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "tiny" }).appliedCondition).toBe("prone")
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "medium" }).appliedCondition).toBe("prone")
    })

    it("fails for Huge or Gargantuan targets even on failed save", () => {
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "huge" }).appliedCondition).toBeNull()
      expect(
        applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "gargantuan" }).appliedCondition
      ).toBeNull()
    })

    it("deducts cost even if target is too large", () => {
      expect(applyCunningStrike({ ...baseParams, effect: "trip", targetSize: "huge" }).remainingDice).toBe(4)
    })
  })

  describe("Withdraw", () => {
    it("grants half speed movement with no save required", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "withdraw" })
      expect(result.remainingDice).toBe(4)
      expect(result.withdrawMovement).toBe(15)
      expect(result.appliedCondition).toBeNull()
    })

    it("works even if save would pass (no save needed)", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "withdraw", savePassed: true })
      expect(result.withdrawMovement).toBe(15)
    })
  })

  describe("Daze (Devious)", () => {
    it("applies daze flag on failed save, costs 2d6", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "daze", sneakAttackDiceRemaining: 7 })
      expect(result.remainingDice).toBe(5)
      expect(result.dazeApplied).toBe(true)
    })

    it("no effect on passed save", () => {
      const result = applyCunningStrike({
        ...baseParams,
        effect: "daze",
        savePassed: true,
        sneakAttackDiceRemaining: 7
      })
      expect(result.dazeApplied).toBe(false)
    })
  })

  describe("Knock Out (Devious)", () => {
    it("applies unconscious on failed save, costs 6d6", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "knockOut", sneakAttackDiceRemaining: 7 })
      expect(result.remainingDice).toBe(1)
      expect(result.appliedCondition).toBe("unconscious")
    })
  })

  describe("Obscure (Devious)", () => {
    it("applies blinded on failed save, costs 3d6", () => {
      const result = applyCunningStrike({ ...baseParams, effect: "obscure", sneakAttackDiceRemaining: 7 })
      expect(result.remainingDice).toBe(4)
      expect(result.appliedCondition).toBe("blinded")
    })
  })

  describe("dice deduction", () => {
    it("deducts dice before applying effect", () => {
      // With 3 dice remaining, poison (1d6 cost) leaves 2
      const result = applyCunningStrike({ ...baseParams, effect: "poison", sneakAttackDiceRemaining: 3 })
      expect(result.remainingDice).toBe(2)
    })

    it("multiple effects deduct cumulatively", () => {
      // Simulate two effects: first poison (1d6), then trip (1d6) from remaining
      const first = applyCunningStrike({ ...baseParams, effect: "poison", sneakAttackDiceRemaining: 6 })
      expect(first.remainingDice).toBe(5)
      const second = applyCunningStrike({
        ...baseParams,
        effect: "trip",
        sneakAttackDiceRemaining: first.remainingDice
      })
      expect(second.remainingDice).toBe(4)
    })
  })
})

// --- Turn reset ---

describe("resetRogueTurnState", () => {
  it("resets sneak attack and steady aim flags", () => {
    const state = resetRogueTurnState()
    expect(state.sneakAttackUsedThisTurn).toBe(false)
    expect(state.steadyAimUsedThisTurn).toBe(false)
  })
})
