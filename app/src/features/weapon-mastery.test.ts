import { describe, expect, it } from "vitest"

import {
  canCleave,
  canGraze,
  canNick,
  canPush,
  canSap,
  canSlow,
  canTopple,
  canVex,
  cleaveExtraDamage,
  grazeDamage,
  masteryActive,
  pushDistance,
  sapResult,
  slowSpeedReduction,
  toppleDC,
  toppleResult,
  vexResult,
  WEAPON_MASTERY_MAP
} from "#/features/weapon-mastery.ts"

// --- masteryActive shared precondition ---

describe("masteryActive", () => {
  it("returns true when character has mastery and property matches", () => {
    expect(masteryActive(true, "cleave", "cleave")).toBe(true)
  })

  it("returns false without Weapon Mastery feature", () => {
    expect(masteryActive(false, "cleave", "cleave")).toBe(false)
  })

  it("returns false when mastery property does not match", () => {
    expect(masteryActive(true, "graze", "cleave")).toBe(false)
  })
})

// --- Cleave ---

describe("cleave", () => {
  it("canCleave returns true on hit with cleave weapon and mastery", () => {
    expect(canCleave(true, "cleave", true)).toBe(true)
  })

  it("canCleave returns false on miss", () => {
    expect(canCleave(true, "cleave", false)).toBe(false)
  })

  it("canCleave returns false without weapon mastery", () => {
    expect(canCleave(false, "cleave", true)).toBe(false)
  })

  it("canCleave returns false with wrong mastery property", () => {
    expect(canCleave(true, "graze", true)).toBe(false)
  })

  it("cleaveExtraDamage returns the weapon die size", () => {
    expect(cleaveExtraDamage(12)).toBe(12)
    expect(cleaveExtraDamage(6)).toBe(6)
  })
})

// --- Graze ---

describe("graze", () => {
  it("canGraze returns true on miss with graze weapon and mastery", () => {
    expect(canGraze(true, "graze", true)).toBe(true)
  })

  it("canGraze returns false on hit (missedTarget = false)", () => {
    expect(canGraze(true, "graze", false)).toBe(false)
  })

  it("canGraze returns false without weapon mastery", () => {
    expect(canGraze(false, "graze", true)).toBe(false)
  })

  it("canGraze returns false with wrong mastery property", () => {
    expect(canGraze(true, "cleave", true)).toBe(false)
  })

  it("grazeDamage returns ability modifier", () => {
    expect(grazeDamage(3)).toBe(3)
    expect(grazeDamage(5)).toBe(5)
  })

  it("grazeDamage returns minimum 1 with 0 modifier", () => {
    expect(grazeDamage(0)).toBe(1)
  })

  it("grazeDamage returns minimum 1 with negative modifier", () => {
    expect(grazeDamage(-2)).toBe(1)
  })
})

// --- Nick ---

describe("nick", () => {
  it("canNick returns true with mastery, nick property, and extra attack", () => {
    expect(canNick(true, "nick", true)).toBe(true)
  })

  it("canNick returns false without extra attack", () => {
    expect(canNick(true, "nick", false)).toBe(false)
  })

  it("canNick returns false without weapon mastery", () => {
    expect(canNick(false, "nick", true)).toBe(false)
  })

  it("canNick returns false with wrong mastery property", () => {
    expect(canNick(true, "vex", true)).toBe(false)
  })
})

// --- Push ---

describe("push", () => {
  it("canPush returns true on hit with push weapon and mastery", () => {
    expect(canPush(true, "push", true)).toBe(true)
  })

  it("canPush returns false on miss", () => {
    expect(canPush(true, "push", false)).toBe(false)
  })

  it("canPush returns false without weapon mastery", () => {
    expect(canPush(false, "push", true)).toBe(false)
  })

  it("pushDistance is always 10 feet", () => {
    expect(pushDistance()).toBe(10)
  })
})

// --- Sap ---

describe("sap", () => {
  it("canSap returns true on hit with sap weapon and mastery", () => {
    expect(canSap(true, "sap", true)).toBe(true)
  })

  it("canSap returns false on miss", () => {
    expect(canSap(true, "sap", false)).toBe(false)
  })

  it("canSap returns false without weapon mastery", () => {
    expect(canSap(false, "sap", true)).toBe(false)
  })

  it("sapResult gives target disadvantage on next attack", () => {
    expect(sapResult()).toEqual({ targetDisadvantageOnNextAttack: true })
  })
})

// --- Slow ---

describe("slow", () => {
  it("canSlow returns true on hit with slow weapon and mastery", () => {
    expect(canSlow(true, "slow", true)).toBe(true)
  })

  it("canSlow returns false on miss", () => {
    expect(canSlow(true, "slow", false)).toBe(false)
  })

  it("canSlow returns false without weapon mastery", () => {
    expect(canSlow(false, "slow", true)).toBe(false)
  })

  it("slowSpeedReduction is always 10 feet", () => {
    expect(slowSpeedReduction()).toBe(10)
  })
})

// --- Topple ---

describe("topple", () => {
  it("canTopple returns true on hit with topple weapon and mastery", () => {
    expect(canTopple(true, "topple", true)).toBe(true)
  })

  it("canTopple returns false on miss", () => {
    expect(canTopple(true, "topple", false)).toBe(false)
  })

  it("canTopple returns false without weapon mastery", () => {
    expect(canTopple(false, "topple", true)).toBe(false)
  })

  it("toppleDC equals 8 + ability mod + proficiency bonus", () => {
    expect(toppleDC(3, 2)).toBe(13) // 8 + 3 + 2
    expect(toppleDC(5, 6)).toBe(19) // 8 + 5 + 6
    expect(toppleDC(0, 2)).toBe(10) // 8 + 0 + 2
  })

  it("toppleResult returns prone on failed save", () => {
    expect(toppleResult(false)).toEqual({ targetProne: true })
  })

  it("toppleResult returns not prone on passed save", () => {
    expect(toppleResult(true)).toEqual({ targetProne: false })
  })
})

// --- Vex ---

describe("vex", () => {
  it("canVex returns true on hit with vex weapon and mastery", () => {
    expect(canVex(true, "vex", true)).toBe(true)
  })

  it("canVex returns false on miss", () => {
    expect(canVex(true, "vex", false)).toBe(false)
  })

  it("canVex returns false without weapon mastery", () => {
    expect(canVex(false, "vex", true)).toBe(false)
  })

  it("vexResult grants advantage on next attack vs target", () => {
    expect(vexResult()).toEqual({ advantageOnNextAttackVsTarget: true })
  })
})

// --- Weapon mastery map ---

describe("WEAPON_MASTERY_MAP", () => {
  it("maps greataxe to cleave", () => {
    expect(WEAPON_MASTERY_MAP.greataxe).toBe("cleave")
  })

  it("maps greatsword to graze", () => {
    expect(WEAPON_MASTERY_MAP.greatsword).toBe("graze")
  })

  it("maps dagger to nick", () => {
    expect(WEAPON_MASTERY_MAP.dagger).toBe("nick")
  })

  it("maps greatclub to push", () => {
    expect(WEAPON_MASTERY_MAP.greatclub).toBe("push")
  })

  it("maps longsword to sap", () => {
    expect(WEAPON_MASTERY_MAP.longsword).toBe("sap")
  })

  it("maps club to slow", () => {
    expect(WEAPON_MASTERY_MAP.club).toBe("slow")
  })

  it("maps quarterstaff to topple", () => {
    expect(WEAPON_MASTERY_MAP.quarterstaff).toBe("topple")
  })

  it("maps rapier to vex", () => {
    expect(WEAPON_MASTERY_MAP.rapier).toBe("vex")
  })
})
