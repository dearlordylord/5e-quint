import { describe, expect, it } from "vitest"

import {
  bardicInspirationDie,
  bardicInspirationMaxCharges,
  hasCountercharm,
  hasCuttingWords,
  hasFontOfInspiration,
  hasLoreBonusProficiencies,
  hasMagicalDiscoveries,
  hasPeerlessSkill,
  hasWordsOfCreation,
  jackOfAllTradesBonus,
  peerlessSkillResult,
  songOfRestDie,
  superiorInspirationRestore
} from "#/features/class-bard.ts"

// =============================================================================
// Bard Base Features
// =============================================================================

describe("Bardic Inspiration die", () => {
  it("d6 at L1-4", () => {
    expect(bardicInspirationDie(1)).toBe(6)
    expect(bardicInspirationDie(4)).toBe(6)
  })
  it("d8 at L5-9", () => {
    expect(bardicInspirationDie(5)).toBe(8)
    expect(bardicInspirationDie(9)).toBe(8)
  })
  it("d10 at L10-14", () => {
    expect(bardicInspirationDie(10)).toBe(10)
    expect(bardicInspirationDie(14)).toBe(10)
  })
  it("d12 at L15-20", () => {
    expect(bardicInspirationDie(15)).toBe(12)
    expect(bardicInspirationDie(20)).toBe(12)
  })
  it("0 at L0", () => {
    expect(bardicInspirationDie(0)).toBe(0)
  })
})

describe("Bardic Inspiration charges", () => {
  it("= CHA mod (min 1)", () => {
    expect(bardicInspirationMaxCharges(3)).toBe(3)
    expect(bardicInspirationMaxCharges(5)).toBe(5)
    expect(bardicInspirationMaxCharges(0)).toBe(1)
    expect(bardicInspirationMaxCharges(-1)).toBe(1)
  })
})

describe("Jack of All Trades", () => {
  it("adds half prof bonus to unproficient checks at L2+", () => {
    expect(jackOfAllTradesBonus(2, 2, false)).toBe(1)
    expect(jackOfAllTradesBonus(5, 3, false)).toBe(1)
    expect(jackOfAllTradesBonus(10, 4, false)).toBe(2)
    expect(jackOfAllTradesBonus(17, 6, false)).toBe(3)
  })
  it("no bonus if already proficient", () => {
    expect(jackOfAllTradesBonus(5, 3, true)).toBe(0)
  })
  it("no bonus below L2", () => {
    expect(jackOfAllTradesBonus(1, 2, false)).toBe(0)
  })
})

describe("Song of Rest", () => {
  it("same die as Bardic Inspiration", () => {
    expect(songOfRestDie(1)).toBe(6)
    expect(songOfRestDie(5)).toBe(8)
    expect(songOfRestDie(10)).toBe(10)
    expect(songOfRestDie(15)).toBe(12)
  })
})

describe("Font of Inspiration", () => {
  it("available at L5+", () => {
    expect(hasFontOfInspiration(5)).toBe(true)
  })
  it("not available below L5", () => {
    expect(hasFontOfInspiration(4)).toBe(false)
  })
})

describe("Countercharm", () => {
  it("available at L7+", () => {
    expect(hasCountercharm(7)).toBe(true)
  })
  it("not available below L7", () => {
    expect(hasCountercharm(6)).toBe(false)
  })
})

describe("Superior Inspiration", () => {
  it("restores to 2 if below 2 at L18+", () => {
    expect(superiorInspirationRestore(18, 0)).toBe(2)
    expect(superiorInspirationRestore(18, 1)).toBe(2)
    expect(superiorInspirationRestore(20, 0)).toBe(2)
  })
  it("no change if already at 2+", () => {
    expect(superiorInspirationRestore(18, 2)).toBe(2)
    expect(superiorInspirationRestore(18, 5)).toBe(5)
  })
  it("no restore below L18", () => {
    expect(superiorInspirationRestore(17, 0)).toBe(0)
    expect(superiorInspirationRestore(17, 1)).toBe(1)
  })
})

describe("Words of Creation", () => {
  it("available at L20", () => {
    expect(hasWordsOfCreation(20)).toBe(true)
  })
  it("not available below L20", () => {
    expect(hasWordsOfCreation(19)).toBe(false)
  })
})

// =============================================================================
// College of Lore
// =============================================================================

describe("Lore Bonus Proficiencies", () => {
  it("available at L3+", () => {
    expect(hasLoreBonusProficiencies(3)).toBe(true)
  })
  it("not available below L3", () => {
    expect(hasLoreBonusProficiencies(2)).toBe(false)
  })
})

describe("Cutting Words", () => {
  it("available at L3+", () => {
    expect(hasCuttingWords(3)).toBe(true)
  })
  it("not available below L3", () => {
    expect(hasCuttingWords(2)).toBe(false)
  })
})

describe("Magical Discoveries", () => {
  it("available at L6+", () => {
    expect(hasMagicalDiscoveries(6)).toBe(true)
  })
  it("not available below L6", () => {
    expect(hasMagicalDiscoveries(5)).toBe(false)
  })
})

describe("Peerless Skill availability", () => {
  it("available at L14+", () => {
    expect(hasPeerlessSkill(14)).toBe(true)
  })
  it("not available below L14", () => {
    expect(hasPeerlessSkill(13)).toBe(false)
  })
})

describe("Peerless Skill", () => {
  it("adds BI die to failed roll — success expends BI", () => {
    const result = peerlessSkillResult(12, 15, 5)
    expect(result.newTotal).toBe(17)
    expect(result.success).toBe(true)
    expect(result.biExpended).toBe(true)
  })
  it("adds BI die but still fails — BI NOT expended", () => {
    const result = peerlessSkillResult(10, 20, 3)
    expect(result.newTotal).toBe(13)
    expect(result.success).toBe(false)
    expect(result.biExpended).toBe(false)
  })
  it("exactly meets DC — success, BI expended", () => {
    const result = peerlessSkillResult(10, 15, 5)
    expect(result.newTotal).toBe(15)
    expect(result.success).toBe(true)
    expect(result.biExpended).toBe(true)
  })
})
