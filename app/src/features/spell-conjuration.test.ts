import { describe, expect, it } from "vitest"

import {
  ENTANGLE_INFO,
  entangleResult,
  goodberryCount,
  goodberryHealPerBerry,
  iceKnifeExplosionDamage,
  iceKnifeImpactDamage,
  SPELL_SPIRIT_GUARDIANS,
  spiritGuardiansDamage,
  WEB_INFO,
  webBreakFreeDC,
  webResult
} from "#/features/spell-conjuration.ts"

// --- Spirit Guardians ---

describe("spiritGuardiansDamage", () => {
  it("returns 3d8 at base level 3", () => {
    expect(spiritGuardiansDamage(3)).toEqual({ dice: 3, dieSize: 8 })
  })

  it("scales +1d8 per level above 3", () => {
    expect(spiritGuardiansDamage(4)).toEqual({ dice: 4, dieSize: 8 })
    expect(spiritGuardiansDamage(5)).toEqual({ dice: 5, dieSize: 8 })
    expect(spiritGuardiansDamage(9)).toEqual({ dice: 9, dieSize: 8 })
  })
})

describe("Spirit Guardians metadata", () => {
  it("is L3, radiant, saveForHalf, concentration, WIS save", () => {
    expect(SPELL_SPIRIT_GUARDIANS.level).toBe(3)
    expect(SPELL_SPIRIT_GUARDIANS.damageType).toBe("radiant")
    expect(SPELL_SPIRIT_GUARDIANS.pattern).toBe("saveForHalf")
    expect(SPELL_SPIRIT_GUARDIANS.concentration).toBe(true)
    expect(SPELL_SPIRIT_GUARDIANS.saveAbility).toBe("wis")
  })
})

// --- Entangle ---

describe("entangle", () => {
  it("applies restrained on failed save", () => {
    const result = entangleResult(false)
    expect(result.conditionApplied).toBe("restrained")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save", () => {
    const result = entangleResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("info matches SRD 5.2.1", () => {
    expect(ENTANGLE_INFO.level).toBe(1)
    expect(ENTANGLE_INFO.concentration).toBe(true)
    expect(ENTANGLE_INFO.saveAbility).toBe("str")
    expect(ENTANGLE_INFO.conditionApplied).toBe("restrained")
  })
})

// --- Web ---

describe("web", () => {
  it("applies restrained on failed save", () => {
    const result = webResult(false)
    expect(result.conditionApplied).toBe("restrained")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save", () => {
    const result = webResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("break free DC equals spell save DC", () => {
    expect(webBreakFreeDC(15)).toBe(15)
    expect(webBreakFreeDC(17)).toBe(17)
  })

  it("info matches SRD 5.2.1", () => {
    expect(WEB_INFO.level).toBe(2)
    expect(WEB_INFO.concentration).toBe(true)
    expect(WEB_INFO.saveAbility).toBe("dex")
    expect(WEB_INFO.conditionApplied).toBe("restrained")
    expect(WEB_INFO.durationDescription).toBe("Concentration, up to 1 hour")
  })
})

// =============================================================================
// New Conjuration spells
// =============================================================================

describe("Goodberry", () => {
  it("creates 10 berries", () => {
    expect(goodberryCount()).toBe(10)
  })

  it("each berry heals 1 HP", () => {
    expect(goodberryHealPerBerry()).toBe(1)
  })
})

describe("Ice Knife", () => {
  it("impact damage is 1d10 Piercing", () => {
    expect(iceKnifeImpactDamage()).toEqual({ dice: 1, dieSize: 10 })
  })

  it("explosion damage is 2d6 Cold at L1", () => {
    expect(iceKnifeExplosionDamage(1)).toEqual({ dice: 2, dieSize: 6 })
  })

  it("explosion scales +1d6 per slot above 1", () => {
    expect(iceKnifeExplosionDamage(2)).toEqual({ dice: 3, dieSize: 6 })
    expect(iceKnifeExplosionDamage(5)).toEqual({ dice: 6, dieSize: 6 })
  })
})
