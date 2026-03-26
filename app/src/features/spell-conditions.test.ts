import { describe, expect, it } from "vitest"

import {
  BLINDNESS_DEAFNESS_INFO,
  blindnessDeafnessResult,
  blindnessDeafnessTargets,
  CONFUSION_INFO,
  confusionBehavior,
  confusionRadius,
  ENTANGLE_INFO,
  entangleResult,
  FEAR_INFO,
  fearResult,
  HOLD_MONSTER_INFO,
  HOLD_PERSON_INFO,
  holdMonsterResult,
  holdMonsterTargets,
  holdPersonResult,
  holdPersonTargets,
  HYPNOTIC_PATTERN_INFO,
  hypnoticPatternResult,
  SLEEP_INFO,
  sleepMaxTargets,
  sleepResult,
  sleepSecondSaveResult,
  SLOW_INFO,
  slowMaxTargets,
  slowResult,
  WEB_INFO,
  webBreakFreeDC,
  webResult
} from "#/features/spell-conditions.ts"

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
