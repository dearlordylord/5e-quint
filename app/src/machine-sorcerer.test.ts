import { describe, expect, it } from "vitest"

import {
  canConvertPointsToSlot,
  canConvertSlotToPoints,
  canUseInnateSorcery,
  canUseSorcerousRestoration,
  convertPointsToSlot,
  convertSlotToPoints,
  slotCreationCost,
  sorcererLongRest,
  sorcerousRestoration,
  sorceryPointsMax,
  useInnateSorcery
} from "#/machine-sorcerer.ts"

// --- Sorcery Points Max ---

describe("sorceryPointsMax", () => {
  it("returns 0 for level 0 and level 1 (Font of Magic is L2)", () => {
    expect(sorceryPointsMax(0)).toBe(0)
    expect(sorceryPointsMax(1)).toBe(0)
  })

  it("returns sorcerer level for L2+", () => {
    expect(sorceryPointsMax(2)).toBe(2)
    expect(sorceryPointsMax(5)).toBe(5)
    expect(sorceryPointsMax(10)).toBe(10)
    expect(sorceryPointsMax(20)).toBe(20)
  })
})

// --- Innate Sorcery ---

describe("canUseInnateSorcery", () => {
  const base = {
    innateSorceryActive: false,
    innateSorceryCharges: 2,
    sorceryPoints: 0,
    sorcererLevel: 1,
    bonusActionUsed: false
  }

  it("returns true when charges available", () => {
    expect(canUseInnateSorcery(base)).toBe(true)
  })

  it("returns false when bonus action used", () => {
    expect(canUseInnateSorcery({ ...base, bonusActionUsed: true })).toBe(false)
  })

  it("returns false when no charges and below L7", () => {
    expect(canUseInnateSorcery({ ...base, innateSorceryCharges: 0 })).toBe(false)
  })

  it("returns true at L7+ with 0 charges but 2+ SP (Sorcery Incarnate)", () => {
    expect(canUseInnateSorcery({ ...base, innateSorceryCharges: 0, sorcererLevel: 7, sorceryPoints: 2 })).toBe(true)
  })

  it("returns false at L7+ with 0 charges and < 2 SP", () => {
    expect(canUseInnateSorcery({ ...base, innateSorceryCharges: 0, sorcererLevel: 7, sorceryPoints: 1 })).toBe(false)
  })
})

describe("useInnateSorcery", () => {
  it("decrements charges when available", () => {
    const result = useInnateSorcery({
      innateSorceryActive: false,
      innateSorceryCharges: 2,
      sorceryPoints: 5,
      sorcererLevel: 3,
      bonusActionUsed: false
    })
    expect(result.innateSorceryActive).toBe(true)
    expect(result.innateSorceryCharges).toBe(1)
    expect(result.sorceryPoints).toBe(5)
    expect(result.bonusActionUsed).toBe(true)
    expect(result.spellSaveDCBonus).toBe(1)
    expect(result.spellAttackAdvantage).toBe(true)
  })

  it("spends 2 SP via Sorcery Incarnate when no charges", () => {
    const result = useInnateSorcery({
      innateSorceryActive: false,
      innateSorceryCharges: 0,
      sorceryPoints: 7,
      sorcererLevel: 7,
      bonusActionUsed: false
    })
    expect(result.innateSorceryCharges).toBe(0)
    expect(result.sorceryPoints).toBe(5)
    expect(result.innateSorceryActive).toBe(true)
  })

  it("grants +1 spell save DC while active", () => {
    const result = useInnateSorcery({
      innateSorceryActive: false,
      innateSorceryCharges: 1,
      sorceryPoints: 0,
      sorcererLevel: 1,
      bonusActionUsed: false
    })
    expect(result.spellSaveDCBonus).toBe(1)
  })
})

// --- Flexible Casting: Slot to Points ---

describe("canConvertSlotToPoints", () => {
  const slots = [2, 1, 0, 0, 0, 0, 0, 0, 0]

  it("returns true for a slot with remaining uses", () => {
    expect(canConvertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 5, slotsCurrent: slots }, 1)).toBe(true)
  })

  it("returns false for empty slot", () => {
    expect(canConvertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 5, slotsCurrent: slots }, 3)).toBe(false)
  })

  it("returns false when at max SP", () => {
    expect(canConvertSlotToPoints({ sorceryPoints: 5, sorceryPointsMax: 5, slotsCurrent: slots }, 1)).toBe(false)
  })

  it("returns false for invalid slot level", () => {
    expect(canConvertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 5, slotsCurrent: slots }, 0)).toBe(false)
    expect(canConvertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 5, slotsCurrent: slots }, 10)).toBe(false)
  })
})

describe("convertSlotToPoints", () => {
  it("gains points equal to slot level", () => {
    const slots = [2, 1, 0, 0, 0, 0, 0, 0, 0]
    const result = convertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 10, slotsCurrent: slots }, 1)
    expect(result.sorceryPoints).toBe(1)
    expect(result.slotsCurrent[0]).toBe(1) // expended one L1 slot
  })

  it("gains 2 points for a level 2 slot", () => {
    const slots = [2, 1, 0, 0, 0, 0, 0, 0, 0]
    const result = convertSlotToPoints({ sorceryPoints: 3, sorceryPointsMax: 10, slotsCurrent: slots }, 2)
    expect(result.sorceryPoints).toBe(5)
    expect(result.slotsCurrent[1]).toBe(0)
  })

  it("gains 5 points for a level 5 slot", () => {
    const slots = [4, 3, 2, 1, 1, 0, 0, 0, 0]
    const result = convertSlotToPoints({ sorceryPoints: 0, sorceryPointsMax: 20, slotsCurrent: slots }, 5)
    expect(result.sorceryPoints).toBe(5)
    expect(result.slotsCurrent[4]).toBe(0)
  })

  it("caps points at max", () => {
    const slots = [2, 1, 1, 0, 0, 0, 0, 0, 0]
    const result = convertSlotToPoints({ sorceryPoints: 4, sorceryPointsMax: 5, slotsCurrent: slots }, 3)
    expect(result.sorceryPoints).toBe(5) // 4 + 3 = 7, capped to 5
  })
})

// --- Flexible Casting: Points to Slot ---

describe("slotCreationCost", () => {
  it("returns correct costs per level", () => {
    expect(slotCreationCost(1)).toBe(2)
    expect(slotCreationCost(2)).toBe(3)
    expect(slotCreationCost(3)).toBe(5)
    expect(slotCreationCost(4)).toBe(6)
    expect(slotCreationCost(5)).toBe(7)
  })

  it("returns 0 for invalid levels", () => {
    expect(slotCreationCost(0)).toBe(0)
    expect(slotCreationCost(6)).toBe(0)
  })
})

describe("canConvertPointsToSlot", () => {
  const base = {
    sorceryPoints: 10,
    slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    sorcererLevel: 9,
    bonusActionUsed: false
  }

  it("returns true when enough SP and level requirement met", () => {
    expect(canConvertPointsToSlot(base, 1)).toBe(true)
    expect(canConvertPointsToSlot(base, 5)).toBe(true)
  })

  it("returns false when bonus action used", () => {
    expect(canConvertPointsToSlot({ ...base, bonusActionUsed: true }, 1)).toBe(false)
  })

  it("returns false for slot level above 5", () => {
    expect(canConvertPointsToSlot(base, 6)).toBe(false)
  })

  it("returns false when not enough SP", () => {
    expect(canConvertPointsToSlot({ ...base, sorceryPoints: 1 }, 1)).toBe(false) // needs 2
    expect(canConvertPointsToSlot({ ...base, sorceryPoints: 4 }, 3)).toBe(false) // needs 5
  })

  it("returns false when below minimum sorcerer level", () => {
    // L2 min for 1st, L3 for 2nd, L5 for 3rd, L7 for 4th, L9 for 5th
    expect(canConvertPointsToSlot({ ...base, sorcererLevel: 2 }, 2)).toBe(false) // needs L3
    expect(canConvertPointsToSlot({ ...base, sorcererLevel: 4 }, 3)).toBe(false) // needs L5
    expect(canConvertPointsToSlot({ ...base, sorcererLevel: 6 }, 4)).toBe(false) // needs L7
    expect(canConvertPointsToSlot({ ...base, sorcererLevel: 8 }, 5)).toBe(false) // needs L9
  })
})

describe("convertPointsToSlot", () => {
  const base = {
    sorceryPoints: 10,
    slotsCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    sorcererLevel: 9,
    bonusActionUsed: false
  }

  it("creates a level 1 slot for 2 SP", () => {
    const result = convertPointsToSlot(base, 1)
    expect(result.sorceryPoints).toBe(8)
    expect(result.slotsCurrent[0]).toBe(1)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("creates a level 2 slot for 3 SP", () => {
    const result = convertPointsToSlot(base, 2)
    expect(result.sorceryPoints).toBe(7)
    expect(result.slotsCurrent[1]).toBe(1)
  })

  it("creates a level 3 slot for 5 SP", () => {
    const result = convertPointsToSlot(base, 3)
    expect(result.sorceryPoints).toBe(5)
    expect(result.slotsCurrent[2]).toBe(1)
  })

  it("creates a level 4 slot for 6 SP", () => {
    const result = convertPointsToSlot(base, 4)
    expect(result.sorceryPoints).toBe(4)
    expect(result.slotsCurrent[3]).toBe(1)
  })

  it("creates a level 5 slot for 7 SP", () => {
    const result = convertPointsToSlot(base, 5)
    expect(result.sorceryPoints).toBe(3)
    expect(result.slotsCurrent[4]).toBe(1)
  })

  it("adds to existing slots", () => {
    const result = convertPointsToSlot({ ...base, slotsCurrent: [2, 0, 0, 0, 0, 0, 0, 0, 0] }, 1)
    expect(result.slotsCurrent[0]).toBe(3)
  })
})

// --- Long Rest ---

describe("sorcererLongRest", () => {
  it("restores all sorcery points to max", () => {
    const result = sorcererLongRest({ sorcererLevel: 5 })
    expect(result.sorceryPoints).toBe(5)
    expect(result.sorceryPointsMax).toBe(5)
  })

  it("restores Innate Sorcery charges to 2", () => {
    const result = sorcererLongRest({ sorcererLevel: 3 })
    expect(result.innateSorceryCharges).toBe(2)
  })

  it("deactivates Innate Sorcery", () => {
    const result = sorcererLongRest({ sorcererLevel: 1 })
    expect(result.innateSorceryActive).toBe(false)
  })

  it("L1 sorcerer has 0 SP max (no Font of Magic yet)", () => {
    const result = sorcererLongRest({ sorcererLevel: 1 })
    expect(result.sorceryPoints).toBe(0)
    expect(result.sorceryPointsMax).toBe(0)
  })
})

// --- Sorcerous Restoration (L5 Short Rest) ---

describe("canUseSorcerousRestoration", () => {
  const base = {
    sorceryPoints: 0,
    sorceryPointsMax: 5,
    sorcererLevel: 5,
    sorcerousRestorationUsed: false
  }

  it("returns true at L5+ with SP below max and not yet used", () => {
    expect(canUseSorcerousRestoration(base)).toBe(true)
  })

  it("returns false below L5", () => {
    expect(canUseSorcerousRestoration({ ...base, sorcererLevel: 4 })).toBe(false)
  })

  it("returns false if already used", () => {
    expect(canUseSorcerousRestoration({ ...base, sorcerousRestorationUsed: true })).toBe(false)
  })

  it("returns false if already at max SP", () => {
    expect(canUseSorcerousRestoration({ ...base, sorceryPoints: 5 })).toBe(false)
  })
})

describe("sorcerousRestoration", () => {
  it("regains SP equal to half sorcerer level (rounded down)", () => {
    const result = sorcerousRestoration({
      sorceryPoints: 0,
      sorceryPointsMax: 5,
      sorcererLevel: 5,
      sorcerousRestorationUsed: false
    })
    expect(result.sorceryPoints).toBe(2) // floor(5/2) = 2
    expect(result.sorcerousRestorationUsed).toBe(true)
  })

  it("caps at max SP", () => {
    const result = sorcerousRestoration({
      sorceryPoints: 9,
      sorceryPointsMax: 10,
      sorcererLevel: 10,
      sorcerousRestorationUsed: false
    })
    expect(result.sorceryPoints).toBe(10) // 9 + 5 = 14, capped to 10
  })

  it("regains correctly at L20", () => {
    const result = sorcerousRestoration({
      sorceryPoints: 0,
      sorceryPointsMax: 20,
      sorcererLevel: 20,
      sorcerousRestorationUsed: false
    })
    expect(result.sorceryPoints).toBe(10) // floor(20/2) = 10
  })
})
