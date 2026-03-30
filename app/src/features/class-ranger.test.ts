import { describe, expect, it } from "vitest"

import {
  canColossusSlayer,
  canHordeBreaker,
  canUseNaturesVeil,
  canUseSuperiorHuntersDefense,
  canUseTireless,
  colossusSlayerDieSize,
  favoredEnemyFreeUses,
  foeSlayerHuntersMarkDie,
  hasDeftExplorer,
  hasEscapeTheHorde,
  hasFeralSenses,
  hasHuntersLore,
  hasMultiattackDefense,
  hasPreciseHunter,
  hasRangerExpertise,
  hasRelentlessHunter,
  hasSuperiorHuntersPrey,
  naturesVeilMaxCharges,
  rovingClimbSpeed,
  rovingSpeedBonus,
  rovingSwimSpeed,
  tirelessMaxCharges,
  tirelessTempHp
} from "#/features/class-ranger.ts"

// =============================================================================
// Base Ranger Features
// =============================================================================

describe("Favored Enemy", () => {
  it("free uses scale with level", () => {
    expect(favoredEnemyFreeUses(1)).toBe(2)
    expect(favoredEnemyFreeUses(4)).toBe(2)
    expect(favoredEnemyFreeUses(5)).toBe(3)
    expect(favoredEnemyFreeUses(9)).toBe(4)
    expect(favoredEnemyFreeUses(13)).toBe(5)
    expect(favoredEnemyFreeUses(17)).toBe(6)
    expect(favoredEnemyFreeUses(20)).toBe(6)
  })
  it("0 at level 0", () => {
    expect(favoredEnemyFreeUses(0)).toBe(0)
  })
})

describe("Deft Explorer", () => {
  it("available at L2+", () => {
    expect(hasDeftExplorer(2)).toBe(true)
  })
  it("not available below L2", () => {
    expect(hasDeftExplorer(1)).toBe(false)
    expect(hasDeftExplorer(0)).toBe(false)
  })
})

describe("Roving", () => {
  it("+10ft speed at L6+ without heavy armor", () => {
    expect(rovingSpeedBonus(6, false)).toBe(10)
    expect(rovingSpeedBonus(20, false)).toBe(10)
  })
  it("no bonus below L6", () => {
    expect(rovingSpeedBonus(5, false)).toBe(0)
  })
  it("no bonus in heavy armor", () => {
    expect(rovingSpeedBonus(6, true)).toBe(0)
  })
  it("climb speed = walk speed at L6+", () => {
    expect(rovingClimbSpeed(6, 30)).toBe(30)
    expect(rovingClimbSpeed(10, 35)).toBe(35)
  })
  it("no climb speed below L6", () => {
    expect(rovingClimbSpeed(5, 30)).toBe(0)
  })
  it("swim speed = walk speed at L6+", () => {
    expect(rovingSwimSpeed(6, 30)).toBe(30)
  })
  it("no swim speed below L6", () => {
    expect(rovingSwimSpeed(5, 30)).toBe(0)
  })
})

describe("Ranger Expertise", () => {
  it("available at L9+", () => {
    expect(hasRangerExpertise(9)).toBe(true)
  })
  it("not available below L9", () => {
    expect(hasRangerExpertise(8)).toBe(false)
  })
})

describe("Tireless", () => {
  it("can use at L10+ with charges", () => {
    expect(canUseTireless(10, 1)).toBe(true)
  })
  it("can't use below L10", () => {
    expect(canUseTireless(9, 1)).toBe(false)
  })
  it("can't use with 0 charges", () => {
    expect(canUseTireless(10, 0)).toBe(false)
  })
  it("temp HP = d8 + WIS mod (min 1)", () => {
    expect(tirelessTempHp(5, 3)).toBe(8)
    expect(tirelessTempHp(8, 5)).toBe(13)
    expect(tirelessTempHp(1, 0)).toBe(2) // WIS 0 → min 1
    expect(tirelessTempHp(1, -1)).toBe(2) // WIS -1 → min 1
  })
  it("max charges = WIS mod (min 1)", () => {
    expect(tirelessMaxCharges(3)).toBe(3)
    expect(tirelessMaxCharges(5)).toBe(5)
    expect(tirelessMaxCharges(0)).toBe(1)
    expect(tirelessMaxCharges(-1)).toBe(1)
  })
})

describe("Relentless Hunter", () => {
  it("available at L13+", () => {
    expect(hasRelentlessHunter(13)).toBe(true)
  })
  it("not available below L13", () => {
    expect(hasRelentlessHunter(12)).toBe(false)
  })
})

describe("Nature's Veil", () => {
  it("can use at L14+ with charges and BA", () => {
    expect(canUseNaturesVeil(14, 1, true)).toBe(true)
  })
  it("can't use below L14", () => {
    expect(canUseNaturesVeil(13, 1, true)).toBe(false)
  })
  it("can't use with 0 charges", () => {
    expect(canUseNaturesVeil(14, 0, true)).toBe(false)
  })
  it("can't use without BA", () => {
    expect(canUseNaturesVeil(14, 1, false)).toBe(false)
  })
  it("max charges = WIS mod (min 1)", () => {
    expect(naturesVeilMaxCharges(4)).toBe(4)
    expect(naturesVeilMaxCharges(0)).toBe(1)
  })
})

describe("Precise Hunter", () => {
  it("available at L17+", () => {
    expect(hasPreciseHunter(17)).toBe(true)
  })
  it("not available below L17", () => {
    expect(hasPreciseHunter(16)).toBe(false)
  })
})

describe("Feral Senses", () => {
  it("available at L18+", () => {
    expect(hasFeralSenses(18)).toBe(true)
  })
  it("not available below L18", () => {
    expect(hasFeralSenses(17)).toBe(false)
  })
})

describe("Foe Slayer", () => {
  it("Hunter's Mark die is d10 at L20", () => {
    expect(foeSlayerHuntersMarkDie(20)).toBe(10)
  })
  it("Hunter's Mark die is d6 below L20", () => {
    expect(foeSlayerHuntersMarkDie(19)).toBe(6)
    expect(foeSlayerHuntersMarkDie(1)).toBe(6)
  })
})

// =============================================================================
// Hunter Subclass
// =============================================================================

describe("Hunter's Lore", () => {
  it("available at L3+", () => {
    expect(hasHuntersLore(3)).toBe(true)
  })
  it("not available below L3", () => {
    expect(hasHuntersLore(2)).toBe(false)
  })
})

describe("Colossus Slayer", () => {
  it("triggers when target below max HP", () => {
    expect(canColossusSlayer("colossusSlayer", true)).toBe(true)
  })
  it("doesn't trigger at full HP", () => {
    expect(canColossusSlayer("colossusSlayer", false)).toBe(false)
  })
  it("doesn't trigger with wrong choice", () => {
    expect(canColossusSlayer("hordeBreaker", true)).toBe(false)
  })
  it("deals d8 damage", () => {
    expect(colossusSlayerDieSize()).toBe(8)
  })
})

describe("Horde Breaker", () => {
  it("triggers with valid target", () => {
    expect(canHordeBreaker("hordeBreaker", true)).toBe(true)
  })
  it("doesn't trigger without valid target", () => {
    expect(canHordeBreaker("hordeBreaker", false)).toBe(false)
  })
  it("doesn't trigger with wrong choice", () => {
    expect(canHordeBreaker("colossusSlayer", true)).toBe(false)
  })
})

describe("Escape the Horde", () => {
  it("active when selected", () => {
    expect(hasEscapeTheHorde("escapeTheHorde")).toBe(true)
  })
  it("inactive when other choice selected", () => {
    expect(hasEscapeTheHorde("multiattackDefense")).toBe(false)
  })
})

describe("Multiattack Defense", () => {
  it("active when selected", () => {
    expect(hasMultiattackDefense("multiattackDefense")).toBe(true)
  })
  it("inactive when other choice selected", () => {
    expect(hasMultiattackDefense("escapeTheHorde")).toBe(false)
  })
})

describe("Superior Hunter's Prey", () => {
  it("available at L11+", () => {
    expect(hasSuperiorHuntersPrey(11)).toBe(true)
  })
  it("not available below L11", () => {
    expect(hasSuperiorHuntersPrey(10)).toBe(false)
  })
})

describe("Superior Hunter's Defense", () => {
  it("can use at L15+ with reaction", () => {
    expect(canUseSuperiorHuntersDefense(15, true)).toBe(true)
  })
  it("can't use below L15", () => {
    expect(canUseSuperiorHuntersDefense(14, true)).toBe(false)
  })
  it("can't use without reaction", () => {
    expect(canUseSuperiorHuntersDefense(15, false)).toBe(false)
  })
})
