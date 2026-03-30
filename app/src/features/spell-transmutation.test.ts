import { describe, expect, it } from "vitest"

import {
  barkskinAC,
  BLINDNESS_DEAFNESS_INFO,
  blindnessDeafnessResult,
  blindnessDeafnessTargets,
  disintegrateDamage,
  divineFavorDamage,
  enhanceAbilityTargets,
  enlargeDamageBonus,
  fleshToStoneProgress,
  hasteEffects,
  magicWeaponBonus,
  reduceDamageReduction,
  regenerateInitialHeal,
  regeneratePerRoundHeal,
  SLOW_INFO,
  slowMaxTargets,
  slowResult,
  SPELL_BARKSKIN,
  SPELL_DISINTEGRATE
} from "#/features/spell-transmutation.ts"

// --- Disintegrate ---

describe("disintegrateDamage", () => {
  it("returns 10d6+40 at base level 6", () => {
    expect(disintegrateDamage(6)).toEqual({ dice: 10, dieSize: 6, flatBonus: 40 })
  })

  it("scales +3d6 per level above 6", () => {
    expect(disintegrateDamage(7)).toEqual({ dice: 13, dieSize: 6, flatBonus: 40 })
    expect(disintegrateDamage(8)).toEqual({ dice: 16, dieSize: 6, flatBonus: 40 })
    expect(disintegrateDamage(9)).toEqual({ dice: 19, dieSize: 6, flatBonus: 40 })
  })
})

describe("Disintegrate metadata", () => {
  it("is L6, force, saveOrNothing, DEX save", () => {
    expect(SPELL_DISINTEGRATE.level).toBe(6)
    expect(SPELL_DISINTEGRATE.damageType).toBe("force")
    expect(SPELL_DISINTEGRATE.pattern).toBe("saveOrNothing")
    expect(SPELL_DISINTEGRATE.concentration).toBe(false)
    expect(SPELL_DISINTEGRATE.saveAbility).toBe("dex")
  })
})

// --- Blindness/Deafness ---

describe("blindnessDeafness", () => {
  it("applies blinded on failed save when blinded chosen", () => {
    const result = blindnessDeafnessResult(false, "blinded")
    expect(result.conditionApplied).toBe("blinded")
    expect(result.savePassed).toBe(false)
  })

  it("applies deafened on failed save when deafened chosen", () => {
    const result = blindnessDeafnessResult(false, "deafened")
    expect(result.conditionApplied).toBe("deafened")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save regardless of choice", () => {
    expect(blindnessDeafnessResult(true, "blinded").conditionApplied).toBeNull()
    expect(blindnessDeafnessResult(true, "deafened").conditionApplied).toBeNull()
  })

  it("targets 1 at base level 2", () => {
    expect(blindnessDeafnessTargets(2)).toBe(1)
  })

  it("scales +1 target per level above 2nd", () => {
    expect(blindnessDeafnessTargets(3)).toBe(2)
    expect(blindnessDeafnessTargets(5)).toBe(4)
  })

  it("info: no concentration", () => {
    expect(BLINDNESS_DEAFNESS_INFO.concentration).toBe(false)
    expect(BLINDNESS_DEAFNESS_INFO.saveAbility).toBe("con")
  })
})

// --- Slow ---

describe("slow", () => {
  it("applies all debuffs on failed save", () => {
    const result = slowResult(false)
    expect(result.affected).toBe(true)
    expect(result.savePassed).toBe(false)
    expect(result.speedHalved).toBe(true)
    expect(result.acPenalty).toBe(-2)
    expect(result.dexSavePenalty).toBe(-2)
    expect(result.noReactions).toBe(true)
    expect(result.oneAttackOnly).toBe(true)
    expect(result.spellFailChance).toBe(25)
  })

  it("applies nothing on successful save", () => {
    const result = slowResult(true)
    expect(result.affected).toBe(false)
    expect(result.savePassed).toBe(true)
    expect(result.speedHalved).toBe(false)
    expect(result.acPenalty).toBe(0)
    expect(result.spellFailChance).toBe(0)
  })

  it("max targets is always 6", () => {
    expect(slowMaxTargets()).toBe(6)
  })

  it("info matches SRD 5.2.1", () => {
    expect(SLOW_INFO.level).toBe(3)
    expect(SLOW_INFO.concentration).toBe(true)
    expect(SLOW_INFO.conditionApplied).toBe("special")
  })
})

// --- Barkskin ---

describe("Barkskin", () => {
  it("raises AC to 17 when current AC is below 17", () => {
    expect(barkskinAC(12)).toBe(17)
  })

  it("keeps AC at 17 when current AC equals 17", () => {
    expect(barkskinAC(17)).toBe(17)
  })

  it("keeps AC above 17 when current AC exceeds 17", () => {
    expect(barkskinAC(20)).toBe(20)
  })

  it("has correct spell info", () => {
    expect(SPELL_BARKSKIN.level).toBe(2)
    expect(SPELL_BARKSKIN.concentration).toBe(false)
    expect(SPELL_BARKSKIN.castingTime).toBe("bonusAction")
  })
})

// =============================================================================
// New Transmutation spells
// =============================================================================

describe("Haste", () => {
  it("grants doubled speed, +2 AC, DEX advantage, extra action", () => {
    const effects = hasteEffects()
    expect(effects.speedMultiplier).toBe(2)
    expect(effects.acBonus).toBe(2)
    expect(effects.dexSaveAdvantage).toBe(true)
    expect(effects.extraAction).toBe(true)
  })
})

describe("Enlarge/Reduce", () => {
  it("Enlarge adds 1d4 damage", () => {
    expect(enlargeDamageBonus()).toEqual({ dice: 1, dieSize: 4 })
  })

  it("Reduce subtracts 1d4 damage", () => {
    expect(reduceDamageReduction()).toEqual({ dice: 1, dieSize: 4 })
  })
})

describe("Flesh to Stone", () => {
  it("3 failures = petrified", () => {
    const state = fleshToStoneProgress(3, 1)
    expect(state.petrified).toBe(true)
    expect(state.spellEnded).toBe(false)
  })

  it("3 successes = spell ends", () => {
    const state = fleshToStoneProgress(1, 3)
    expect(state.petrified).toBe(false)
    expect(state.spellEnded).toBe(true)
  })

  it("mid-progress — neither", () => {
    const state = fleshToStoneProgress(2, 2)
    expect(state.petrified).toBe(false)
    expect(state.spellEnded).toBe(false)
  })
})

describe("Enhance Ability", () => {
  it("targets 1 at L2, scales +1 per upcast", () => {
    expect(enhanceAbilityTargets(2)).toBe(1)
    expect(enhanceAbilityTargets(3)).toBe(2)
    expect(enhanceAbilityTargets(5)).toBe(4)
  })
})

describe("Magic Weapon", () => {
  it("+1 at L2", () => {
    expect(magicWeaponBonus(2)).toBe(1)
  })

  it("+2 at L3-L5", () => {
    expect(magicWeaponBonus(3)).toBe(2)
    expect(magicWeaponBonus(5)).toBe(2)
  })

  it("+3 at L6+", () => {
    expect(magicWeaponBonus(6)).toBe(3)
    expect(magicWeaponBonus(9)).toBe(3)
  })
})

describe("Divine Favor", () => {
  it("+1d4 Radiant", () => {
    expect(divineFavorDamage()).toEqual({ dice: 1, dieSize: 4 })
  })
})

describe("Regenerate", () => {
  it("initial heal is 4d8 + 15", () => {
    expect(regenerateInitialHeal()).toEqual({ dice: 4, dieSize: 8, flatBonus: 15 })
  })

  it("per-round heal is 1", () => {
    expect(regeneratePerRoundHeal()).toBe(1)
  })
})
