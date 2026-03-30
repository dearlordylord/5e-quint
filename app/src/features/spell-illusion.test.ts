import { describe, expect, it } from "vitest"

import {
  blurActive,
  colorSprayResult,
  FEAR_INFO,
  fearResult,
  HYPNOTIC_PATTERN_INFO,
  hypnoticPatternResult,
  invisibilityTargets,
  mirrorImageDuplicateAC,
  mirrorImageHitsDuplicate,
  mirrorImageThreshold,
  phantasmalKillerDamage,
  SPELL_MIRROR_IMAGE
} from "#/features/spell-illusion.ts"

// --- Fear ---

describe("fear", () => {
  it("applies frightened on failed save with dash-away special effect", () => {
    const result = fearResult(false)
    expect(result.conditionApplied).toBe("frightened")
    expect(result.specialEffect).toContain("Dash away")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save", () => {
    const result = fearResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.specialEffect).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("info matches SRD 5.2.1", () => {
    expect(FEAR_INFO.level).toBe(3)
    expect(FEAR_INFO.concentration).toBe(true)
    expect(FEAR_INFO.saveAbility).toBe("wis")
    expect(FEAR_INFO.conditionApplied).toBe("frightened")
  })
})

// --- Hypnotic Pattern ---

describe("hypnoticPattern", () => {
  it("applies charmed on failed save with incapacitated + speed 0 note", () => {
    const result = hypnoticPatternResult(false)
    expect(result.conditionApplied).toBe("charmed")
    expect(result.specialEffect).toContain("Incapacitated")
    expect(result.specialEffect).toContain("speed 0")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save", () => {
    const result = hypnoticPatternResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.specialEffect).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("info matches SRD 5.2.1", () => {
    expect(HYPNOTIC_PATTERN_INFO.level).toBe(3)
    expect(HYPNOTIC_PATTERN_INFO.concentration).toBe(true)
    expect(HYPNOTIC_PATTERN_INFO.conditionApplied).toBe("charmed")
  })
})

// --- Mirror Image ---

describe("Mirror Image", () => {
  it("threshold is 6 for 3 duplicates", () => {
    expect(mirrorImageThreshold(3)).toBe(6)
  })

  it("threshold is 8 for 2 duplicates", () => {
    expect(mirrorImageThreshold(2)).toBe(8)
  })

  it("threshold is 11 for 1 duplicate", () => {
    expect(mirrorImageThreshold(1)).toBe(11)
  })

  it("threshold is 21 (impossible) for 0 duplicates", () => {
    expect(mirrorImageThreshold(0)).toBe(21)
  })

  it("d20 roll meets threshold — hits duplicate", () => {
    expect(mirrorImageHitsDuplicate(6, 3)).toBe(true)
    expect(mirrorImageHitsDuplicate(15, 2)).toBe(true)
    expect(mirrorImageHitsDuplicate(11, 1)).toBe(true)
  })

  it("d20 roll below threshold — misses duplicate", () => {
    expect(mirrorImageHitsDuplicate(5, 3)).toBe(false)
    expect(mirrorImageHitsDuplicate(7, 2)).toBe(false)
    expect(mirrorImageHitsDuplicate(10, 1)).toBe(false)
  })

  it("never hits duplicate when 0 remain", () => {
    expect(mirrorImageHitsDuplicate(20, 0)).toBe(false)
    expect(mirrorImageHitsDuplicate(1, 0)).toBe(false)
  })

  it("duplicate AC is 10 + dexMod", () => {
    expect(mirrorImageDuplicateAC(3)).toBe(13)
    expect(mirrorImageDuplicateAC(0)).toBe(10)
    expect(mirrorImageDuplicateAC(-1)).toBe(9)
  })

  it("has correct spell info", () => {
    expect(SPELL_MIRROR_IMAGE.level).toBe(2)
    expect(SPELL_MIRROR_IMAGE.concentration).toBe(false)
    expect(SPELL_MIRROR_IMAGE.castingTime).toBe("action")
  })
})

// =============================================================================
// New Illusion spells
// =============================================================================

describe("Blur", () => {
  it("grants attack disadvantage against caster", () => {
    expect(blurActive().attackDisadvantage).toBe(true)
  })
})

describe("Invisibility", () => {
  it("targets 1 at L2, scales +1 per upcast", () => {
    expect(invisibilityTargets(2)).toBe(1)
    expect(invisibilityTargets(3)).toBe(2)
    expect(invisibilityTargets(5)).toBe(4)
  })
})

describe("Color Spray", () => {
  it("blinds on failed save", () => {
    const result = colorSprayResult(false)
    expect(result.conditionApplied).toBe("blinded")
    expect(result.savePassed).toBe(false)
  })

  it("no effect on passed save", () => {
    const result = colorSprayResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.savePassed).toBe(true)
  })
})

describe("Phantasmal Killer", () => {
  it("4d10 at L4", () => {
    expect(phantasmalKillerDamage(4)).toEqual({ dice: 4, dieSize: 10 })
  })

  it("scales +1d10 per slot above 4", () => {
    expect(phantasmalKillerDamage(5)).toEqual({ dice: 5, dieSize: 10 })
    expect(phantasmalKillerDamage(9)).toEqual({ dice: 9, dieSize: 10 })
  })
})
