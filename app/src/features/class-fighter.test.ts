import { describe, expect, it } from "vitest"

import {
  actionSurgeMaxCharges,
  canUseActionSurge,
  canUseIndomitable,
  canUseSecondWind,
  canUseTacticalMind,
  championCritRange,
  fighterLongRest,
  fighterShortRest,
  hasRemarkableAthlete,
  heroicWarriorInspiration,
  indomitableLongRest,
  indomitableMaxCharges,
  isBloodied,
  remarkableAthleteCritMovement,
  secondWindMaxCharges,
  survivorDefyDeathAdvantage,
  survivorDefyDeathThreshold,
  survivorHeroicRally,
  useActionSurge,
  useIndomitable,
  useSecondWind,
  useTacticalMind
} from "#/features/class-fighter.ts"

// --- Second Wind ---

describe("secondWindMaxCharges", () => {
  it("returns 0 for level 0", () => {
    expect(secondWindMaxCharges(0)).toBe(0)
  })

  it("returns 2 for levels 1-3", () => {
    expect(secondWindMaxCharges(1)).toBe(2)
    expect(secondWindMaxCharges(2)).toBe(2)
    expect(secondWindMaxCharges(3)).toBe(2)
  })

  it("returns 3 for levels 4-9", () => {
    expect(secondWindMaxCharges(4)).toBe(3)
    expect(secondWindMaxCharges(9)).toBe(3)
  })

  it("returns 4 for levels 10-20", () => {
    expect(secondWindMaxCharges(10)).toBe(4)
    expect(secondWindMaxCharges(20)).toBe(4)
  })
})

describe("canUseSecondWind", () => {
  it("returns true when charges > 0 and bonus action available", () => {
    expect(canUseSecondWind({ hp: 10, maxHp: 20, secondWindCharges: 1, bonusActionUsed: false })).toBe(true)
  })

  it("returns false when charges are 0", () => {
    expect(canUseSecondWind({ hp: 10, maxHp: 20, secondWindCharges: 0, bonusActionUsed: false })).toBe(false)
  })

  it("returns false when bonus action already used", () => {
    expect(canUseSecondWind({ hp: 10, maxHp: 20, secondWindCharges: 2, bonusActionUsed: true })).toBe(false)
  })
})

describe("useSecondWind", () => {
  const baseState = { hp: 10, maxHp: 20, secondWindCharges: 2, bonusActionUsed: false }

  it("heals 1d10 + fighter level", () => {
    const result = useSecondWind(baseState, { fighterLevel: 3, d10Roll: 7 }, 30)
    expect(result.healAmount).toBe(10) // 7 + 3
    expect(result.hp).toBe(20) // 10 + 10, capped at maxHp
  })

  it("cannot exceed maxHp", () => {
    const nearFull = { ...baseState, hp: 18 }
    const result = useSecondWind(nearFull, { fighterLevel: 1, d10Roll: 5 }, 30)
    expect(result.healAmount).toBe(6) // 5 + 1
    expect(result.hp).toBe(20) // capped at 20, not 24
  })

  it("consumes a bonus action", () => {
    const result = useSecondWind(baseState, { fighterLevel: 1, d10Roll: 1 }, 30)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("decrements charges", () => {
    const result = useSecondWind(baseState, { fighterLevel: 1, d10Roll: 1 }, 30)
    expect(result.secondWindCharges).toBe(1)
  })

  it("heals correctly at higher fighter levels", () => {
    const result = useSecondWind(baseState, { fighterLevel: 10, d10Roll: 10 }, 30)
    expect(result.healAmount).toBe(20) // 10 + 10
  })
})

// --- Tactical Shift ---

describe("tactical shift (via useSecondWind)", () => {
  const baseState = { hp: 10, maxHp: 50, secondWindCharges: 2, bonusActionUsed: false }

  it("grants 0 movement at fighter level < 5", () => {
    const result = useSecondWind(baseState, { fighterLevel: 4, d10Roll: 5 }, 30)
    expect(result.tacticalShiftDistance).toBe(0)
  })

  it("grants half speed movement at fighter level 5+", () => {
    const result = useSecondWind(baseState, { fighterLevel: 5, d10Roll: 5 }, 30)
    expect(result.tacticalShiftDistance).toBe(15) // half of 30
  })

  it("floors half speed for odd speeds", () => {
    const result = useSecondWind(baseState, { fighterLevel: 5, d10Roll: 5 }, 25)
    expect(result.tacticalShiftDistance).toBe(12) // floor(25/2)
  })

  it("grants half speed at level 20", () => {
    const result = useSecondWind(baseState, { fighterLevel: 20, d10Roll: 5 }, 30)
    expect(result.tacticalShiftDistance).toBe(15)
  })
})

// --- Tactical Mind ---

describe("canUseTacticalMind", () => {
  it("returns true at level 2+ with charges and a failed check", () => {
    expect(canUseTacticalMind(1, 2, true)).toBe(true)
  })

  it("returns false below level 2", () => {
    expect(canUseTacticalMind(1, 1, true)).toBe(false)
  })

  it("returns false with 0 charges", () => {
    expect(canUseTacticalMind(0, 5, true)).toBe(false)
  })

  it("returns false if check did not fail", () => {
    expect(canUseTacticalMind(1, 5, false)).toBe(false)
  })
})

describe("useTacticalMind", () => {
  it("adds d10 to failed check and succeeds, expending a charge", () => {
    const result = useTacticalMind({
      secondWindCharges: 2,
      originalCheckTotal: 12,
      dc: 15,
      d10Roll: 5
    })
    expect(result.newCheckTotal).toBe(17)
    expect(result.success).toBe(true)
    expect(result.secondWindCharges).toBe(1) // charge consumed
  })

  it("adds d10 to failed check but still fails, charge NOT expended", () => {
    const result = useTacticalMind({
      secondWindCharges: 2,
      originalCheckTotal: 5,
      dc: 20,
      d10Roll: 3
    })
    expect(result.newCheckTotal).toBe(8)
    expect(result.success).toBe(false)
    expect(result.secondWindCharges).toBe(2) // charge preserved
  })

  it("succeeds exactly on the DC boundary", () => {
    const result = useTacticalMind({
      secondWindCharges: 1,
      originalCheckTotal: 10,
      dc: 15,
      d10Roll: 5
    })
    expect(result.newCheckTotal).toBe(15)
    expect(result.success).toBe(true)
    expect(result.secondWindCharges).toBe(0)
  })
})

// --- Action Surge ---

describe("actionSurgeMaxCharges", () => {
  it("returns 0 below level 2", () => {
    expect(actionSurgeMaxCharges(1)).toBe(0)
  })

  it("returns 1 for levels 2-16", () => {
    expect(actionSurgeMaxCharges(2)).toBe(1)
    expect(actionSurgeMaxCharges(16)).toBe(1)
  })

  it("returns 2 at level 17+", () => {
    expect(actionSurgeMaxCharges(17)).toBe(2)
    expect(actionSurgeMaxCharges(20)).toBe(2)
  })
})

describe("canUseActionSurge", () => {
  it("returns true when charges > 0 and not used this turn", () => {
    expect(canUseActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })).toBe(true)
  })

  it("returns false when charges are 0", () => {
    expect(canUseActionSurge({ actionSurgeCharges: 0, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })).toBe(
      false
    )
  })

  it("returns false when already used this turn (even with 2 charges)", () => {
    expect(canUseActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: true, actionsRemaining: 1 })).toBe(false)
  })
})

describe("useActionSurge", () => {
  it("grants additional action (increments actionsRemaining)", () => {
    const result = useActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })
    expect(result.actionsRemaining).toBe(1)
  })

  it("decrements charges", () => {
    const result = useActionSurge({ actionSurgeCharges: 2, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })
    expect(result.actionSurgeCharges).toBe(1)
  })

  it("marks action surge used this turn", () => {
    const result = useActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })
    expect(result.actionSurgeUsedThisTurn).toBe(true)
  })

  it("can only use once per turn even with 2 charges", () => {
    // Use first charge
    const first = useActionSurge({ actionSurgeCharges: 2, actionSurgeUsedThisTurn: false, actionsRemaining: 0 })
    expect(first.actionSurgeCharges).toBe(1)
    expect(first.actionSurgeUsedThisTurn).toBe(true)

    // Cannot use second charge same turn
    expect(
      canUseActionSurge({
        actionSurgeCharges: first.actionSurgeCharges,
        actionSurgeUsedThisTurn: first.actionSurgeUsedThisTurn,
        actionsRemaining: 0
      })
    ).toBe(false)
  })
})

// --- Rest recovery ---

describe("fighterShortRest", () => {
  it("regains one Second Wind use (not exceeding max)", () => {
    const result = fighterShortRest({
      secondWindCharges: 0,
      secondWindMax: 2,
      actionSurgeCharges: 0,
      actionSurgeMax: 1
    })
    expect(result.secondWindCharges).toBe(1)
  })

  it("does not exceed Second Wind max on short rest", () => {
    const result = fighterShortRest({
      secondWindCharges: 2,
      secondWindMax: 2,
      actionSurgeCharges: 0,
      actionSurgeMax: 1
    })
    expect(result.secondWindCharges).toBe(2)
  })

  it("regains all Action Surge uses on short rest", () => {
    const result = fighterShortRest({
      secondWindCharges: 1,
      secondWindMax: 3,
      actionSurgeCharges: 0,
      actionSurgeMax: 2
    })
    expect(result.actionSurgeCharges).toBe(2)
  })
})

describe("fighterLongRest", () => {
  it("regains all Second Wind uses", () => {
    const result = fighterLongRest({
      secondWindCharges: 0,
      secondWindMax: 3,
      actionSurgeCharges: 0,
      actionSurgeMax: 1
    })
    expect(result.secondWindCharges).toBe(3)
  })

  it("regains all Action Surge uses", () => {
    const result = fighterLongRest({
      secondWindCharges: 0,
      secondWindMax: 3,
      actionSurgeCharges: 0,
      actionSurgeMax: 2
    })
    expect(result.actionSurgeCharges).toBe(2)
  })
})

// =============================================================================
// Champion Subclass
// =============================================================================

// --- Improved Critical / Superior Critical ---

describe("championCritRange", () => {
  it("returns 20 (default) below level 3", () => {
    expect(championCritRange(1)).toBe(20)
    expect(championCritRange(2)).toBe(20)
  })

  it("returns 19 at level 3 (Improved Critical)", () => {
    expect(championCritRange(3)).toBe(19)
  })

  it("returns 19 for levels 3-14", () => {
    expect(championCritRange(7)).toBe(19)
    expect(championCritRange(14)).toBe(19)
  })

  it("returns 18 at level 15 (Superior Critical)", () => {
    expect(championCritRange(15)).toBe(18)
  })

  it("returns 18 at level 20", () => {
    expect(championCritRange(20)).toBe(18)
  })
})

// --- Remarkable Athlete ---

describe("hasRemarkableAthlete", () => {
  it("returns false below Champion level 3", () => {
    expect(hasRemarkableAthlete(1)).toBe(false)
    expect(hasRemarkableAthlete(2)).toBe(false)
  })

  it("returns true at Champion level 3+ (grants Advantage on Initiative and Athletics)", () => {
    expect(hasRemarkableAthlete(3)).toBe(true)
    expect(hasRemarkableAthlete(10)).toBe(true)
    expect(hasRemarkableAthlete(15)).toBe(true)
  })
})

describe("remarkableAthleteCritMovement", () => {
  it("returns 0 below Champion level 3", () => {
    expect(remarkableAthleteCritMovement(2, 30)).toBe(0)
  })

  it("returns half speed at Champion level 3+", () => {
    expect(remarkableAthleteCritMovement(3, 30)).toBe(15)
  })

  it("floors half speed for odd speeds", () => {
    expect(remarkableAthleteCritMovement(5, 25)).toBe(12)
  })

  it("returns 0 distance for 0 speed", () => {
    expect(remarkableAthleteCritMovement(3, 0)).toBe(0)
  })
})

// --- Heroic Warrior ---

describe("heroicWarriorInspiration", () => {
  it("returns false below Champion level 10", () => {
    expect(heroicWarriorInspiration(9, false)).toBe(false)
  })

  it("returns true at Champion level 10+ without inspiration", () => {
    expect(heroicWarriorInspiration(10, false)).toBe(true)
    expect(heroicWarriorInspiration(15, false)).toBe(true)
  })

  it("returns false if already has Heroic Inspiration", () => {
    expect(heroicWarriorInspiration(10, true)).toBe(false)
    expect(heroicWarriorInspiration(20, true)).toBe(false)
  })
})

// --- Survivor: Defy Death ---

describe("survivorDefyDeathAdvantage", () => {
  it("returns false below Champion level 18", () => {
    expect(survivorDefyDeathAdvantage(17)).toBe(false)
  })

  it("returns true at Champion level 18+", () => {
    expect(survivorDefyDeathAdvantage(18)).toBe(true)
    expect(survivorDefyDeathAdvantage(20)).toBe(true)
  })
})

describe("survivorDefyDeathThreshold", () => {
  it("returns 21 (never triggers) below Champion level 18", () => {
    expect(survivorDefyDeathThreshold(17)).toBe(21)
  })

  it("returns 18 at Champion level 18+ (18-20 count as 20)", () => {
    expect(survivorDefyDeathThreshold(18)).toBe(18)
    expect(survivorDefyDeathThreshold(20)).toBe(18)
  })
})

// --- isBloodied ---

describe("isBloodied", () => {
  it("returns true when hp is exactly half maxHp", () => {
    expect(isBloodied(10, 20)).toBe(true)
  })

  it("returns true when hp is below half maxHp", () => {
    expect(isBloodied(5, 20)).toBe(true)
    expect(isBloodied(1, 20)).toBe(true)
  })

  it("returns false when hp is above half maxHp", () => {
    expect(isBloodied(11, 20)).toBe(false)
    expect(isBloodied(20, 20)).toBe(false)
  })

  it("returns false when hp is 0 (unconscious)", () => {
    expect(isBloodied(0, 20)).toBe(false)
  })

  it("handles odd maxHp (floor of half)", () => {
    // floor(21/2) = 10
    expect(isBloodied(10, 21)).toBe(true)
    expect(isBloodied(11, 21)).toBe(false)
  })

  it("handles maxHp of 1", () => {
    // floor(1/2) = 0, so hp must be > 0 AND <= 0 — never true
    expect(isBloodied(1, 1)).toBe(false)
    expect(isBloodied(0, 1)).toBe(false)
  })
})

// --- Survivor: Heroic Rally ---

describe("survivorHeroicRally", () => {
  it("returns 0 below Champion level 18", () => {
    expect(survivorHeroicRally(17, 5, 20, 3)).toBe(0)
  })

  it("heals 5 + CON mod when Bloodied at level 18+", () => {
    expect(survivorHeroicRally(18, 5, 20, 3)).toBe(8) // 5 + 3
  })

  it("heals with negative CON mod", () => {
    expect(survivorHeroicRally(18, 5, 20, -1)).toBe(4) // 5 + (-1)
  })

  it("does not heal at full HP", () => {
    expect(survivorHeroicRally(18, 20, 20, 3)).toBe(0)
  })

  it("does not heal at 0 HP (unconscious)", () => {
    expect(survivorHeroicRally(18, 0, 20, 3)).toBe(0)
  })

  it("does not heal when above half HP", () => {
    expect(survivorHeroicRally(18, 11, 20, 3)).toBe(0)
  })

  it("heals at exactly half HP", () => {
    expect(survivorHeroicRally(18, 10, 20, 3)).toBe(8)
  })

  it("respects floor for odd maxHp Bloodied threshold", () => {
    // floor(21/2) = 10, so hp=10 is Bloodied, hp=11 is not
    expect(survivorHeroicRally(18, 10, 21, 2)).toBe(7) // 5 + 2
    expect(survivorHeroicRally(18, 11, 21, 2)).toBe(0)
  })

  it("heals at level 20", () => {
    expect(survivorHeroicRally(20, 5, 40, 4)).toBe(9) // 5 + 4
  })
})

// =============================================================================
// Indomitable (Level 9 Fighter)
// =============================================================================

describe("indomitableMaxCharges", () => {
  it("returns 0 below level 9", () => {
    expect(indomitableMaxCharges(0)).toBe(0)
    expect(indomitableMaxCharges(1)).toBe(0)
    expect(indomitableMaxCharges(8)).toBe(0)
  })

  it("returns 1 for levels 9-12", () => {
    expect(indomitableMaxCharges(9)).toBe(1)
    expect(indomitableMaxCharges(10)).toBe(1)
    expect(indomitableMaxCharges(12)).toBe(1)
  })

  it("returns 2 for levels 13-16", () => {
    expect(indomitableMaxCharges(13)).toBe(2)
    expect(indomitableMaxCharges(14)).toBe(2)
    expect(indomitableMaxCharges(16)).toBe(2)
  })

  it("returns 3 at level 17+", () => {
    expect(indomitableMaxCharges(17)).toBe(3)
    expect(indomitableMaxCharges(18)).toBe(3)
    expect(indomitableMaxCharges(20)).toBe(3)
  })
})

describe("canUseIndomitable", () => {
  it("returns true at level 9+ with charges > 0", () => {
    expect(canUseIndomitable(9, 1)).toBe(true)
    expect(canUseIndomitable(13, 2)).toBe(true)
    expect(canUseIndomitable(20, 3)).toBe(true)
  })

  it("returns false below level 9", () => {
    expect(canUseIndomitable(8, 1)).toBe(false)
    expect(canUseIndomitable(1, 1)).toBe(false)
  })

  it("returns false with 0 charges", () => {
    expect(canUseIndomitable(9, 0)).toBe(false)
    expect(canUseIndomitable(17, 0)).toBe(false)
  })

  it("returns false below level 9 even with charges", () => {
    expect(canUseIndomitable(5, 3)).toBe(false)
  })
})

describe("useIndomitable", () => {
  it("decrements charges and returns the new roll", () => {
    const result = useIndomitable(2, 15)
    expect(result.indomitableCharges).toBe(1)
    expect(result.newSaveResult).toBe(15)
  })

  it("works down to 1 charge", () => {
    const result = useIndomitable(1, 8)
    expect(result.indomitableCharges).toBe(0)
    expect(result.newSaveResult).toBe(8)
  })

  it("returns the exact new roll value", () => {
    const result = useIndomitable(3, 20)
    expect(result.newSaveResult).toBe(20)
    expect(result.indomitableCharges).toBe(2)
  })
})

describe("indomitableLongRest", () => {
  it("returns 0 below level 9", () => {
    expect(indomitableLongRest(8)).toBe(0)
    expect(indomitableLongRest(1)).toBe(0)
  })

  it("restores to 1 at level 9", () => {
    expect(indomitableLongRest(9)).toBe(1)
  })

  it("restores to 2 at level 13", () => {
    expect(indomitableLongRest(13)).toBe(2)
  })

  it("restores to 3 at level 17", () => {
    expect(indomitableLongRest(17)).toBe(3)
  })

  it("restores to 3 at level 20", () => {
    expect(indomitableLongRest(20)).toBe(3)
  })
})
