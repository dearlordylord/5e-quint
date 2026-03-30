import { describe, expect, it } from "vitest"

import {
  agonizingBlastBonus,
  canEldritchSmite,
  canUseDarkOnesOwnLuck,
  canUseHurlThroughHell,
  canUseMagicalCunning,
  canUseMysticArcanum,
  darkOnesBlessingTempHp,
  darkOnesOwnLuckMaxUses,
  eldritchSmiteDice,
  eldritchSpearBonusRange,
  giftOfProtectorsMaxNames,
  hasContactPatron,
  hasDevilsSight,
  hasDevouringBlade,
  hasEldritchMaster,
  hasEldritchMind,
  hasFiendishResilience,
  hasLifedrinker,
  hasThirstingBlade,
  hurlThroughHellDice,
  invocationsKnown,
  isValidFiendishResistanceType,
  magicalCunningRecovery,
  mysticArcanumLevels,
  pactSlotCount,
  pactSlotLevel,
  repellingBlastDistance
} from "#/features/class-warlock.ts"

// =============================================================================
// Pact Magic
// =============================================================================

describe("Pact Magic slots", () => {
  it("slot count scales with level", () => {
    expect(pactSlotCount(0)).toBe(0)
    expect(pactSlotCount(1)).toBe(1)
    expect(pactSlotCount(2)).toBe(2)
    expect(pactSlotCount(10)).toBe(2)
    expect(pactSlotCount(11)).toBe(3)
    expect(pactSlotCount(17)).toBe(4)
    expect(pactSlotCount(20)).toBe(4)
  })
  it("slot level scales with level", () => {
    expect(pactSlotLevel(0)).toBe(0)
    expect(pactSlotLevel(1)).toBe(1)
    expect(pactSlotLevel(3)).toBe(2)
    expect(pactSlotLevel(5)).toBe(3)
    expect(pactSlotLevel(7)).toBe(4)
    expect(pactSlotLevel(9)).toBe(5)
    expect(pactSlotLevel(20)).toBe(5)
  })
})

// =============================================================================
// Magical Cunning
// =============================================================================

describe("Magical Cunning", () => {
  it("can use at L2+ if not used", () => {
    expect(canUseMagicalCunning(2, false)).toBe(true)
  })
  it("can't use below L2", () => {
    expect(canUseMagicalCunning(1, false)).toBe(false)
  })
  it("can't use if already used", () => {
    expect(canUseMagicalCunning(5, true)).toBe(false)
  })
  it("recovers half max slots rounded up", () => {
    expect(magicalCunningRecovery(1)).toBe(1)
    expect(magicalCunningRecovery(2)).toBe(1)
    expect(magicalCunningRecovery(3)).toBe(2)
    expect(magicalCunningRecovery(4)).toBe(2)
  })
})

// =============================================================================
// Contact Patron, Mystic Arcanum, Eldritch Master
// =============================================================================

describe("Contact Patron", () => {
  it("available at L9+", () => {
    expect(hasContactPatron(9)).toBe(true)
  })
  it("not available below L9", () => {
    expect(hasContactPatron(8)).toBe(false)
  })
})

describe("Mystic Arcanum", () => {
  it("no arcanum below L11", () => {
    expect(mysticArcanumLevels(10)).toEqual([])
  })
  it("L6 at L11", () => {
    expect(mysticArcanumLevels(11)).toEqual([6])
  })
  it("L6+L7 at L13", () => {
    expect(mysticArcanumLevels(13)).toEqual([6, 7])
  })
  it("L6+L7+L8 at L15", () => {
    expect(mysticArcanumLevels(15)).toEqual([6, 7, 8])
  })
  it("L6-L9 at L17+", () => {
    expect(mysticArcanumLevels(17)).toEqual([6, 7, 8, 9])
  })
  it("can use if not in used set", () => {
    expect(canUseMysticArcanum(6, new Set())).toBe(true)
    expect(canUseMysticArcanum(6, new Set([7]))).toBe(true)
  })
  it("can't use if already used", () => {
    expect(canUseMysticArcanum(6, new Set([6]))).toBe(false)
  })
})

describe("Eldritch Master", () => {
  it("available at L20", () => {
    expect(hasEldritchMaster(20)).toBe(true)
  })
  it("not available below L20", () => {
    expect(hasEldritchMaster(19)).toBe(false)
  })
})

// =============================================================================
// Invocations
// =============================================================================

describe("invocationsKnown", () => {
  it("scales with level", () => {
    expect(invocationsKnown(0)).toBe(0)
    expect(invocationsKnown(1)).toBe(1)
    expect(invocationsKnown(2)).toBe(3)
    expect(invocationsKnown(5)).toBe(5)
    expect(invocationsKnown(7)).toBe(6)
    expect(invocationsKnown(9)).toBe(7)
    expect(invocationsKnown(12)).toBe(8)
    expect(invocationsKnown(15)).toBe(9)
    expect(invocationsKnown(18)).toBe(10)
  })
})

describe("Agonizing Blast", () => {
  it("+CHA at L2+", () => {
    expect(agonizingBlastBonus(2, 4)).toBe(4)
    expect(agonizingBlastBonus(10, 5)).toBe(5)
  })
  it("0 below L2", () => {
    expect(agonizingBlastBonus(1, 4)).toBe(0)
  })
  it("negative CHA passes through", () => {
    expect(agonizingBlastBonus(2, -1)).toBe(-1)
  })
})

describe("Thirsting Blade / Devouring Blade", () => {
  it("Thirsting at L5+", () => {
    expect(hasThirstingBlade(5)).toBe(true)
    expect(hasThirstingBlade(4)).toBe(false)
  })
  it("Devouring at L12+", () => {
    expect(hasDevouringBlade(12)).toBe(true)
    expect(hasDevouringBlade(11)).toBe(false)
  })
})

describe("Eldritch Smite", () => {
  it("available at L5+", () => {
    expect(canEldritchSmite(5)).toBe(true)
    expect(canEldritchSmite(4)).toBe(false)
  })
  it("dice = 1 + slot level", () => {
    expect(eldritchSmiteDice(1)).toBe(2)
    expect(eldritchSmiteDice(3)).toBe(4)
    expect(eldritchSmiteDice(5)).toBe(6)
  })
})

describe("Repelling Blast", () => {
  it("pushes 10ft", () => {
    expect(repellingBlastDistance()).toBe(10)
  })
})

describe("Eldritch Spear", () => {
  it("+30ft per level at L2+", () => {
    expect(eldritchSpearBonusRange(2)).toBe(60)
    expect(eldritchSpearBonusRange(10)).toBe(300)
    expect(eldritchSpearBonusRange(20)).toBe(600)
  })
  it("0 below L2", () => {
    expect(eldritchSpearBonusRange(1)).toBe(0)
  })
})

describe("Passive invocations", () => {
  it("Eldritch Mind at L1+", () => {
    expect(hasEldritchMind(1)).toBe(true)
    expect(hasEldritchMind(0)).toBe(false)
  })
  it("Devil's Sight at L2+", () => {
    expect(hasDevilsSight(2)).toBe(true)
    expect(hasDevilsSight(1)).toBe(false)
  })
  it("Lifedrinker at L9+", () => {
    expect(hasLifedrinker(9)).toBe(true)
    expect(hasLifedrinker(8)).toBe(false)
  })
  it("Gift of Protectors max names = CHA (min 1)", () => {
    expect(giftOfProtectorsMaxNames(4)).toBe(4)
    expect(giftOfProtectorsMaxNames(0)).toBe(1)
    expect(giftOfProtectorsMaxNames(-1)).toBe(1)
  })
})

// =============================================================================
// Fiend Patron
// =============================================================================

describe("Dark One's Blessing", () => {
  it("temp HP = CHA + warlock level (min 1) at L3+", () => {
    expect(darkOnesBlessingTempHp(3, 3)).toBe(6)
    expect(darkOnesBlessingTempHp(10, 5)).toBe(15)
    expect(darkOnesBlessingTempHp(3, -3)).toBe(1) // min 1
  })
  it("0 below L3", () => {
    expect(darkOnesBlessingTempHp(2, 5)).toBe(0)
  })
})

describe("Dark One's Own Luck", () => {
  it("max uses = CHA mod (min 1)", () => {
    expect(darkOnesOwnLuckMaxUses(4)).toBe(4)
    expect(darkOnesOwnLuckMaxUses(0)).toBe(1)
    expect(darkOnesOwnLuckMaxUses(-1)).toBe(1)
  })
  it("can use at L6+ with uses remaining", () => {
    expect(canUseDarkOnesOwnLuck(6, 1)).toBe(true)
  })
  it("can't use below L6", () => {
    expect(canUseDarkOnesOwnLuck(5, 1)).toBe(false)
  })
  it("can't use with 0 uses", () => {
    expect(canUseDarkOnesOwnLuck(6, 0)).toBe(false)
  })
})

describe("Fiendish Resilience", () => {
  it("available at L10+", () => {
    expect(hasFiendishResilience(10)).toBe(true)
    expect(hasFiendishResilience(9)).toBe(false)
  })
  it("any damage type except Force is valid", () => {
    expect(isValidFiendishResistanceType("fire")).toBe(true)
    expect(isValidFiendishResistanceType("necrotic")).toBe(true)
    expect(isValidFiendishResistanceType("force")).toBe(false)
  })
})

describe("Hurl Through Hell", () => {
  it("can use at L14+ if not used", () => {
    expect(canUseHurlThroughHell(14, false)).toBe(true)
  })
  it("can't use below L14", () => {
    expect(canUseHurlThroughHell(13, false)).toBe(false)
  })
  it("can't use if already used", () => {
    expect(canUseHurlThroughHell(14, true)).toBe(false)
  })
  it("deals 8d10", () => {
    const dice = hurlThroughHellDice()
    expect(dice.count).toBe(8)
    expect(dice.size).toBe(10)
  })
})
