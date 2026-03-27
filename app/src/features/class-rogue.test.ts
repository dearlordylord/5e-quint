import { describe, expect, it } from "vitest"

import {
  applyCunningStrike,
  applySneakAttack,
  applySteadyAim,
  canApplyCunningStrike,
  canSneakAttack,
  canSteadyAim,
  canUncannyDodge,
  canUseCunningAction,
  canUseStrokeOfLuck,
  cunningStrikeDC,
  ELUSIVE_LEVEL,
  elusiveCancelsAdvantage,
  evasionDamage,
  hasSlipperyMind,
  maxCunningStrikeEffects,
  RELIABLE_TALENT_LEVEL,
  reliableTalent,
  resetRogueTurnState,
  SLIPPERY_MIND_LEVEL,
  sneakAttackDice,
  strikeDieCost,
  STROKE_OF_LUCK_LEVEL,
  strokeOfLuckAbilityCheck,
  strokeOfLuckAttack,
  uncannyDodgeDamage,
  useCunningAction
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

// --- Cunning Action ---

describe("canUseCunningAction", () => {
  it("requires rogue level 2+", () => {
    expect(canUseCunningAction(1, false)).toBe(false)
    expect(canUseCunningAction(2, false)).toBe(true)
    expect(canUseCunningAction(5, false)).toBe(true)
  })

  it("denies if bonus action already used", () => {
    expect(canUseCunningAction(2, true)).toBe(false)
    expect(canUseCunningAction(10, true)).toBe(false)
  })
})

describe("useCunningAction", () => {
  it("dash choice: bonusActionUsed=true, dashGranted=true, others false", () => {
    const result = useCunningAction("dash")
    expect(result.bonusActionUsed).toBe(true)
    expect(result.action).toBe("dash")
    expect(result.dashGranted).toBe(true)
    expect(result.disengageGranted).toBe(false)
    expect(result.hideGranted).toBe(false)
  })

  it("disengage choice: bonusActionUsed=true, disengageGranted=true, others false", () => {
    const result = useCunningAction("disengage")
    expect(result.bonusActionUsed).toBe(true)
    expect(result.action).toBe("disengage")
    expect(result.dashGranted).toBe(false)
    expect(result.disengageGranted).toBe(true)
    expect(result.hideGranted).toBe(false)
  })

  it("hide choice: bonusActionUsed=true, hideGranted=true, others false", () => {
    const result = useCunningAction("hide")
    expect(result.bonusActionUsed).toBe(true)
    expect(result.action).toBe("hide")
    expect(result.dashGranted).toBe(false)
    expect(result.disengageGranted).toBe(false)
    expect(result.hideGranted).toBe(true)
  })
})

// --- Steady Aim ---

describe("canSteadyAim", () => {
  const base = { rogueLevel: 5, hasMovedThisTurn: false, steadyAimUsedThisTurn: false, bonusActionUsed: false }

  it("requires rogue level 3+", () => {
    expect(canSteadyAim({ ...base, rogueLevel: 2 })).toBe(false)
    expect(canSteadyAim({ ...base, rogueLevel: 3 })).toBe(true)
  })

  it("denies if already moved this turn", () => {
    expect(canSteadyAim({ ...base, hasMovedThisTurn: true })).toBe(false)
  })

  it("denies if already used this turn", () => {
    expect(canSteadyAim({ ...base, steadyAimUsedThisTurn: true })).toBe(false)
  })

  it("denies if bonus action already used", () => {
    expect(canSteadyAim({ ...base, bonusActionUsed: true })).toBe(false)
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

// --- Passive Feature Constants ---

describe("passive feature constants", () => {
  it("has correct level thresholds", () => {
    expect(RELIABLE_TALENT_LEVEL).toBe(7)
    expect(SLIPPERY_MIND_LEVEL).toBe(15)
    expect(ELUSIVE_LEVEL).toBe(18)
    expect(STROKE_OF_LUCK_LEVEL).toBe(20)
  })
})

// --- Reliable Talent (L7) ---

describe("reliableTalent", () => {
  it("treats a roll of 9 as 10 when proficient and L7+", () => {
    expect(reliableTalent(7, 9, true)).toBe(10)
  })

  it("treats a roll of 10 as 10 (no change needed)", () => {
    expect(reliableTalent(7, 10, true)).toBe(10)
  })

  it("does not change a roll of 11 or higher", () => {
    expect(reliableTalent(7, 11, true)).toBe(11)
    expect(reliableTalent(7, 20, true)).toBe(20)
  })

  it("does not apply when not proficient", () => {
    expect(reliableTalent(7, 5, false)).toBe(5)
    expect(reliableTalent(20, 1, false)).toBe(1)
  })

  it("does not apply below L7", () => {
    expect(reliableTalent(6, 5, true)).toBe(5)
    expect(reliableTalent(3, 3, true)).toBe(3)
  })

  it("applies at L7 and above", () => {
    expect(reliableTalent(7, 4, true)).toBe(10)
    expect(reliableTalent(15, 1, true)).toBe(10)
    expect(reliableTalent(20, 8, true)).toBe(10)
  })
})

// --- Slippery Mind (L15) ---

describe("hasSlipperyMind", () => {
  it("returns false below L15", () => {
    expect(hasSlipperyMind(14)).toBe(false)
    expect(hasSlipperyMind(1)).toBe(false)
  })

  it("returns true at L15+", () => {
    expect(hasSlipperyMind(15)).toBe(true)
    expect(hasSlipperyMind(16)).toBe(true)
    expect(hasSlipperyMind(20)).toBe(true)
  })
})

// --- Elusive (L18) ---

describe("elusiveCancelsAdvantage", () => {
  it("cancels advantage at L18+", () => {
    expect(elusiveCancelsAdvantage(18, false)).toBe(true)
    expect(elusiveCancelsAdvantage(20, false)).toBe(true)
  })

  it("does not cancel below L18", () => {
    expect(elusiveCancelsAdvantage(17, false)).toBe(false)
    expect(elusiveCancelsAdvantage(1, false)).toBe(false)
  })

  it("does not cancel when incapacitated", () => {
    expect(elusiveCancelsAdvantage(18, true)).toBe(false)
    expect(elusiveCancelsAdvantage(20, true)).toBe(false)
  })
})

// --- Stroke of Luck (L20) ---

describe("canUseStrokeOfLuck", () => {
  it("requires L20+", () => {
    expect(canUseStrokeOfLuck(19, false)).toBe(false)
    expect(canUseStrokeOfLuck(20, false)).toBe(true)
  })

  it("cannot use when already used", () => {
    expect(canUseStrokeOfLuck(20, true)).toBe(false)
  })

  it("can use at L20 when not yet used", () => {
    expect(canUseStrokeOfLuck(20, false)).toBe(true)
  })
})

describe("strokeOfLuckAttack", () => {
  it("turns miss into hit and marks used", () => {
    const result = strokeOfLuckAttack()
    expect(result.turnMissIntoHit).toBe(true)
    expect(result.strokeOfLuckUsed).toBe(true)
  })
})

describe("strokeOfLuckAbilityCheck", () => {
  it("treats as 20 and marks used", () => {
    const result = strokeOfLuckAbilityCheck()
    expect(result.treatAs20).toBe(true)
    expect(result.strokeOfLuckUsed).toBe(true)
  })
})

// --- Uncanny Dodge (L5) ---

describe("uncannyDodgeDamage", () => {
  it("halves damage (round down)", () => {
    expect(uncannyDodgeDamage(10)).toBe(5)
    expect(uncannyDodgeDamage(15)).toBe(7)
    expect(uncannyDodgeDamage(1)).toBe(0)
  })
})

describe("canUncannyDodge", () => {
  it("requires L5+, reaction, visible attacker, not incapacitated", () => {
    expect(canUncannyDodge({
      rogueLevel: 5, reactionAvailable: true, attackerVisible: true, isIncapacitated: false
    })).toBe(true)
  })
  it("fails below L5", () => {
    expect(canUncannyDodge({
      rogueLevel: 4, reactionAvailable: true, attackerVisible: true, isIncapacitated: false
    })).toBe(false)
  })
  it("fails without reaction", () => {
    expect(canUncannyDodge({
      rogueLevel: 5, reactionAvailable: false, attackerVisible: true, isIncapacitated: false
    })).toBe(false)
  })
  it("fails if attacker not visible", () => {
    expect(canUncannyDodge({
      rogueLevel: 5, reactionAvailable: true, attackerVisible: false, isIncapacitated: false
    })).toBe(false)
  })
  it("fails if incapacitated", () => {
    expect(canUncannyDodge({
      rogueLevel: 5, reactionAvailable: true, attackerVisible: true, isIncapacitated: true
    })).toBe(false)
  })
})

// --- Evasion (L7) ---

describe("evasionDamage", () => {
  it("returns 0 on successful DEX save with evasion", () => {
    expect(evasionDamage(true, false, true, 20)).toBe(0)
  })
  it("returns half on failed DEX save with evasion", () => {
    expect(evasionDamage(true, false, false, 20)).toBe(10)
  })
  it("rounds down odd damage on fail", () => {
    expect(evasionDamage(true, false, false, 15)).toBe(7)
  })
  it("returns full damage when incapacitated", () => {
    expect(evasionDamage(true, true, true, 20)).toBe(20)
  })
  it("returns full damage without evasion feature", () => {
    expect(evasionDamage(false, false, true, 20)).toBe(20)
  })
})
