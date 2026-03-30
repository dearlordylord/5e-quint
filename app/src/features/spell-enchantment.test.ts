import { describe, expect, it } from "vitest"

import {
  baneTargets,
  BLESS_BANE_DIE,
  blessTargets,
  CONFUSION_INFO,
  confusionBehavior,
  confusionRadius,
  heroismTargets,
  heroismTempHp,
  HEX_DAMAGE,
  hexDuration,
  HOLD_MONSTER_INFO,
  HOLD_PERSON_INFO,
  holdMonsterResult,
  holdMonsterTargets,
  holdPersonResult,
  holdPersonTargets,
  irresistibleDanceResult,
  POWER_WORD_HEAL_REMOVED_CONDITIONS,
  POWER_WORD_KILL_OVERFLOW,
  POWER_WORD_KILL_THRESHOLD,
  POWER_WORD_STUN_THRESHOLD,
  SLEEP_INFO,
  sleepMaxTargets,
  sleepResult,
  sleepSecondSaveResult,
  viciousMockeryDamage
} from "#/features/spell-enchantment.ts"

// --- Hold Person ---

describe("holdPerson", () => {
  it("applies paralyzed on failed save", () => {
    const result = holdPersonResult(false)
    expect(result.conditionApplied).toBe("paralyzed")
    expect(result.savePassed).toBe(false)
    expect(result.specialEffect).toBeNull()
  })

  it("applies nothing on successful save", () => {
    const result = holdPersonResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("targets 1 at base level 2", () => {
    expect(holdPersonTargets(2)).toBe(1)
  })

  it("scales +1 target per level above 2nd", () => {
    expect(holdPersonTargets(3)).toBe(2)
    expect(holdPersonTargets(5)).toBe(4)
    expect(holdPersonTargets(9)).toBe(8)
  })

  it("info matches SRD 5.2.1", () => {
    expect(HOLD_PERSON_INFO.level).toBe(2)
    expect(HOLD_PERSON_INFO.concentration).toBe(true)
    expect(HOLD_PERSON_INFO.saveAbility).toBe("wis")
    expect(HOLD_PERSON_INFO.conditionApplied).toBe("paralyzed")
  })
})

// --- Hold Monster ---

describe("holdMonster", () => {
  it("applies paralyzed on failed save", () => {
    const result = holdMonsterResult(false)
    expect(result.conditionApplied).toBe("paralyzed")
    expect(result.savePassed).toBe(false)
  })

  it("applies nothing on successful save", () => {
    const result = holdMonsterResult(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.savePassed).toBe(true)
  })

  it("targets 1 at base level 5", () => {
    expect(holdMonsterTargets(5)).toBe(1)
  })

  it("scales +1 target per level above 5th", () => {
    expect(holdMonsterTargets(6)).toBe(2)
    expect(holdMonsterTargets(7)).toBe(3)
    expect(holdMonsterTargets(9)).toBe(5)
  })

  it("info matches SRD 5.2.1", () => {
    expect(HOLD_MONSTER_INFO.level).toBe(5)
    expect(HOLD_MONSTER_INFO.concentration).toBe(true)
    expect(HOLD_MONSTER_INFO.saveAbility).toBe("wis")
  })
})

// --- Sleep ---

describe("sleep (SRD 5.2.1: WIS save, Concentration)", () => {
  it("base targets is 5 at level 1", () => {
    expect(sleepMaxTargets(1)).toBe(5)
  })

  it("scales +1 target per slot level above 1st", () => {
    expect(sleepMaxTargets(2)).toBe(6)
    expect(sleepMaxTargets(3)).toBe(7)
    expect(sleepMaxTargets(5)).toBe(9)
  })

  it("first save fail = incapacitated until end of next turn", () => {
    const result = sleepResult(false)
    expect(result.savePassed).toBe(false)
    expect(result.specialEffect).toBe("incapacitatedUntilEndOfNextTurn")
    expect(result.conditionApplied).toBeNull()
  })

  it("first save pass = no effect", () => {
    const result = sleepResult(true)
    expect(result.savePassed).toBe(true)
    expect(result.conditionApplied).toBeNull()
    expect(result.specialEffect).toBeNull()
  })

  it("second save fail = unconscious", () => {
    const result = sleepSecondSaveResult(false)
    expect(result.conditionApplied).toBe("unconscious")
  })

  it("second save pass = no effect", () => {
    const result = sleepSecondSaveResult(true)
    expect(result.conditionApplied).toBeNull()
  })

  it("info matches SRD 5.2.1", () => {
    expect(SLEEP_INFO.level).toBe(1)
    expect(SLEEP_INFO.concentration).toBe(true)
    expect(SLEEP_INFO.saveAbility).toBe("wis")
    expect(SLEEP_INFO.conditionApplied).toBe("unconscious")
  })
})

// --- Confusion ---

describe("confusion", () => {
  it("base radius is 10ft at level 4", () => {
    expect(confusionRadius(4)).toBe(10)
  })

  it("scales +5ft per level above 4th", () => {
    expect(confusionRadius(5)).toBe(15)
    expect(confusionRadius(6)).toBe(20)
    expect(confusionRadius(9)).toBe(35)
  })

  it("d10 roll 1 = moveRandom", () => {
    expect(confusionBehavior(1)).toBe("moveRandom")
  })

  it("d10 rolls 2-6 = doNothing", () => {
    expect(confusionBehavior(2)).toBe("doNothing")
    expect(confusionBehavior(3)).toBe("doNothing")
    expect(confusionBehavior(4)).toBe("doNothing")
    expect(confusionBehavior(5)).toBe("doNothing")
    expect(confusionBehavior(6)).toBe("doNothing")
  })

  it("d10 rolls 7-8 = attackRandom", () => {
    expect(confusionBehavior(7)).toBe("attackRandom")
    expect(confusionBehavior(8)).toBe("attackRandom")
  })

  it("d10 rolls 9-10 = actNormally", () => {
    expect(confusionBehavior(9)).toBe("actNormally")
    expect(confusionBehavior(10)).toBe("actNormally")
  })

  it("info matches SRD 5.2.1", () => {
    expect(CONFUSION_INFO.level).toBe(4)
    expect(CONFUSION_INFO.concentration).toBe(true)
    expect(CONFUSION_INFO.saveAbility).toBe("wis")
  })
})

// =============================================================================
// New Enchantment spells
// =============================================================================

describe("Bless", () => {
  it("targets 3 at L1", () => {
    expect(blessTargets(1)).toBe(3)
  })

  it("scales +1 target per slot level above 1", () => {
    expect(blessTargets(2)).toBe(4)
    expect(blessTargets(5)).toBe(7)
  })

  it("bonus/penalty die is d4", () => {
    expect(BLESS_BANE_DIE).toBe(4)
  })
})

describe("Bane", () => {
  it("targets 3 at L1", () => {
    expect(baneTargets(1)).toBe(3)
  })

  it("scales +1 target per slot level above 1", () => {
    expect(baneTargets(2)).toBe(4)
    expect(baneTargets(5)).toBe(7)
  })

  it("uses same die as Bless", () => {
    expect(BLESS_BANE_DIE).toBe(4)
  })
})

describe("Heroism", () => {
  it("temp HP equals spellcasting mod", () => {
    expect(heroismTempHp(3)).toBe(3)
    expect(heroismTempHp(5)).toBe(5)
  })

  it("temp HP floors at 0 for negative mod", () => {
    expect(heroismTempHp(-1)).toBe(0)
  })

  it("targets 1 at L1, +1 per upcast", () => {
    expect(heroismTargets(1)).toBe(1)
    expect(heroismTargets(3)).toBe(3)
  })
})

describe("Hex", () => {
  it("deals 1d6 necrotic per hit", () => {
    expect(HEX_DAMAGE).toEqual({ dice: 1, dieSize: 6 })
  })

  it("duration scales with slot level", () => {
    expect(hexDuration(1)).toBe(1)
    expect(hexDuration(2)).toBe(4)
    expect(hexDuration(3)).toBe(8)
    expect(hexDuration(4)).toBe(8)
    expect(hexDuration(5)).toBe(24)
  })
})

describe("Power Word Kill", () => {
  it("threshold is 100 HP", () => {
    expect(POWER_WORD_KILL_THRESHOLD).toBe(100)
  })

  it("overflow damage is 12d12", () => {
    expect(POWER_WORD_KILL_OVERFLOW).toEqual({ dice: 12, dieSize: 12 })
  })
})

describe("Power Word Stun", () => {
  it("threshold is 150 HP", () => {
    expect(POWER_WORD_STUN_THRESHOLD).toBe(150)
  })
})

describe("Power Word Heal", () => {
  it("removes charmed, frightened, paralyzed, poisoned, stunned", () => {
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toContain("charmed")
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toContain("frightened")
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toContain("paralyzed")
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toContain("poisoned")
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toContain("stunned")
    expect(POWER_WORD_HEAL_REMOVED_CONDITIONS).toHaveLength(5)
  })
})

describe("Irresistible Dance", () => {
  it("on failed save: charmed with full debuffs", () => {
    const result = irresistibleDanceResult(false)
    expect(result.charmed).toBe(true)
    expect(result.mustDanceInPlace).toBe(true)
    expect(result.disadvantageOnDexSaves).toBe(true)
    expect(result.disadvantageOnAttackRolls).toBe(true)
    expect(result.advantageOnAttacksAgainst).toBe(true)
  })

  it("on passed save: dances but not charmed", () => {
    const result = irresistibleDanceResult(true)
    expect(result.charmed).toBe(false)
    expect(result.mustDanceInPlace).toBe(true)
    expect(result.disadvantageOnDexSaves).toBe(false)
    expect(result.advantageOnAttacksAgainst).toBe(false)
  })
})

describe("Vicious Mockery", () => {
  it("1d6 at L1, scales at 5/11/17", () => {
    expect(viciousMockeryDamage(1)).toEqual({ dice: 1, dieSize: 6 })
    expect(viciousMockeryDamage(5)).toEqual({ dice: 2, dieSize: 6 })
    expect(viciousMockeryDamage(11)).toEqual({ dice: 3, dieSize: 6 })
    expect(viciousMockeryDamage(17)).toEqual({ dice: 4, dieSize: 6 })
  })
})
