import { describe, expect, it } from "vitest"

import {
  actionSurgeMaxCharges,
  canUseActionSurge,
  canUseSecondWind,
  canUseTacticalMind,
  fighterLongRest,
  fighterShortRest,
  secondWindMaxCharges,
  useActionSurge,
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
    expect(canUseActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionUsed: true })).toBe(true)
  })

  it("returns false when charges are 0", () => {
    expect(canUseActionSurge({ actionSurgeCharges: 0, actionSurgeUsedThisTurn: false, actionUsed: true })).toBe(false)
  })

  it("returns false when already used this turn (even with 2 charges)", () => {
    expect(canUseActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: true, actionUsed: false })).toBe(false)
  })
})

describe("useActionSurge", () => {
  it("resets actionUsed to false (grants second action)", () => {
    const result = useActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionUsed: true })
    expect(result.actionUsed).toBe(false)
  })

  it("decrements charges", () => {
    const result = useActionSurge({ actionSurgeCharges: 2, actionSurgeUsedThisTurn: false, actionUsed: true })
    expect(result.actionSurgeCharges).toBe(1)
  })

  it("marks action surge used this turn", () => {
    const result = useActionSurge({ actionSurgeCharges: 1, actionSurgeUsedThisTurn: false, actionUsed: true })
    expect(result.actionSurgeUsedThisTurn).toBe(true)
  })

  it("can only use once per turn even with 2 charges", () => {
    // Use first charge
    const first = useActionSurge({ actionSurgeCharges: 2, actionSurgeUsedThisTurn: false, actionUsed: true })
    expect(first.actionSurgeCharges).toBe(1)
    expect(first.actionSurgeUsedThisTurn).toBe(true)

    // Cannot use second charge same turn
    expect(
      canUseActionSurge({
        actionSurgeCharges: first.actionSurgeCharges,
        actionSurgeUsedThisTurn: first.actionSurgeUsedThisTurn,
        actionUsed: true
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
