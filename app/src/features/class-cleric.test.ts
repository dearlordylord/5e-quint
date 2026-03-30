import { describe, expect, it } from "vitest"

import {
  blessedHealerSelfHeal,
  canUseDivineIntervention,
  channelDivinityMax,
  clericChannelDivinityMax,
  discipleOfLifeBonus,
  divineSparkAmount,
  divineSparkDice,
  divineStrikeDice,
  hasGreaterDivineIntervention,
  hasTurnUndead,
  improvedPotentSpellcastingTempHp,
  potentSpellcastingBonus,
  preserveLifePool,
  searUndeadDice,
  supremeHealing,
  thaumaturgeBonus
} from "#/features/class-cleric.ts"

describe("clericChannelDivinityMax", () => {
  it("returns 0 below L2", () => {
    expect(clericChannelDivinityMax(1)).toBe(0)
  })
  it("returns 2 at L2-5", () => {
    expect(clericChannelDivinityMax(2)).toBe(2)
    expect(clericChannelDivinityMax(5)).toBe(2)
  })
  it("returns 3 at L6-17", () => {
    expect(clericChannelDivinityMax(6)).toBe(3)
    expect(clericChannelDivinityMax(17)).toBe(3)
  })
  it("returns 4 at L18+", () => {
    expect(clericChannelDivinityMax(18)).toBe(4)
  })
})

describe("channelDivinityMax", () => {
  it("sums cleric and paladin pools", () => {
    expect(channelDivinityMax({ clericLevel: 6, paladinLevel: 3 })).toBe(5)
  })
  it("returns 0 for non-CD classes", () => {
    expect(channelDivinityMax({ clericLevel: 0, paladinLevel: 0 })).toBe(0)
  })
  it("works for single-class cleric", () => {
    expect(channelDivinityMax({ clericLevel: 18, paladinLevel: 0 })).toBe(4)
  })
  it("works for single-class paladin", () => {
    expect(channelDivinityMax({ clericLevel: 0, paladinLevel: 11 })).toBe(3)
  })
})

// =============================================================================
// Cleric Base Features
// =============================================================================

describe("Thaumaturge", () => {
  it("bonus = WIS mod (min +1)", () => {
    expect(thaumaturgeBonus(3)).toBe(3)
    expect(thaumaturgeBonus(0)).toBe(1)
    expect(thaumaturgeBonus(-1)).toBe(1)
  })
})

describe("Divine Spark", () => {
  it("dice scale with level", () => {
    expect(divineSparkDice(1)).toBe(0)
    expect(divineSparkDice(2)).toBe(1)
    expect(divineSparkDice(7)).toBe(2)
    expect(divineSparkDice(13)).toBe(3)
    expect(divineSparkDice(18)).toBe(4)
  })
  it("amount = dice total + WIS mod", () => {
    expect(divineSparkAmount(5, 3)).toBe(8)
    expect(divineSparkAmount(12, 5)).toBe(17)
  })
})

describe("Turn Undead", () => {
  it("available at L2+", () => {
    expect(hasTurnUndead(2)).toBe(true)
  })
  it("not available below L2", () => {
    expect(hasTurnUndead(1)).toBe(false)
  })
})

describe("Sear Undead", () => {
  it("dice = WIS mod (min 1)", () => {
    expect(searUndeadDice(3)).toBe(3)
    expect(searUndeadDice(0)).toBe(1)
    expect(searUndeadDice(-1)).toBe(1)
  })
})

describe("Blessed Strikes", () => {
  it("Divine Strike: 0 below L7, 1d8 at L7, 2d8 at L14", () => {
    expect(divineStrikeDice(6)).toBe(0)
    expect(divineStrikeDice(7)).toBe(1)
    expect(divineStrikeDice(13)).toBe(1)
    expect(divineStrikeDice(14)).toBe(2)
  })
  it("Potent Spellcasting: +WIS mod", () => {
    expect(potentSpellcastingBonus(4)).toBe(4)
    expect(potentSpellcastingBonus(-1)).toBe(-1)
  })
  it("Improved Potent Spellcasting: temp HP = 2×WIS at L14+", () => {
    expect(improvedPotentSpellcastingTempHp(14, 4)).toBe(8)
    expect(improvedPotentSpellcastingTempHp(13, 4)).toBe(0)
  })
})

describe("Divine Intervention", () => {
  it("can use at L10+ if not used", () => {
    expect(canUseDivineIntervention(10, false)).toBe(true)
  })
  it("can't use below L10", () => {
    expect(canUseDivineIntervention(9, false)).toBe(false)
  })
  it("can't use if already used", () => {
    expect(canUseDivineIntervention(10, true)).toBe(false)
  })
})

describe("Greater Divine Intervention", () => {
  it("available at L20", () => {
    expect(hasGreaterDivineIntervention(20)).toBe(true)
  })
  it("not available below L20", () => {
    expect(hasGreaterDivineIntervention(19)).toBe(false)
  })
})

// =============================================================================
// Life Domain
// =============================================================================

describe("Disciple of Life", () => {
  it("bonus healing = 2 + slot level", () => {
    expect(discipleOfLifeBonus(1)).toBe(3)
    expect(discipleOfLifeBonus(3)).toBe(5)
    expect(discipleOfLifeBonus(5)).toBe(7)
  })
})

describe("Preserve Life", () => {
  it("pool = 5 × cleric level", () => {
    expect(preserveLifePool(3)).toBe(15)
    expect(preserveLifePool(10)).toBe(50)
    expect(preserveLifePool(20)).toBe(100)
  })
})

describe("Blessed Healer", () => {
  it("self-heal = 2 + slot level", () => {
    expect(blessedHealerSelfHeal(1)).toBe(3)
    expect(blessedHealerSelfHeal(5)).toBe(7)
  })
})

describe("Supreme Healing", () => {
  it("max all dice", () => {
    expect(supremeHealing(2, 6)).toBe(12)
    expect(supremeHealing(4, 8)).toBe(32)
    expect(supremeHealing(1, 10)).toBe(10)
  })
})
