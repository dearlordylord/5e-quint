import { describe, expect, it } from "vitest"

import {
  canMulticlass,
  classHitDie,
  meetsMulticlassPrereq,
} from "#/features/class-tables.ts"
import type { Ability } from "#/types.ts"

// --- classHitDie ---

describe("classHitDie", () => {
  it("returns d12 for Barbarian", () => {
    expect(classHitDie("barbarian")).toBe(12)
  })
  it("returns d10 for Fighter, Paladin, Ranger", () => {
    expect(classHitDie("fighter")).toBe(10)
    expect(classHitDie("paladin")).toBe(10)
    expect(classHitDie("ranger")).toBe(10)
  })
  it("returns d8 for Bard, Cleric, Druid, Monk, Rogue, Warlock", () => {
    for (const c of ["bard", "cleric", "druid", "monk", "rogue", "warlock"] as const) {
      expect(classHitDie(c)).toBe(8)
    }
  })
  it("returns d6 for Sorcerer, Wizard", () => {
    expect(classHitDie("sorcerer")).toBe(6)
    expect(classHitDie("wizard")).toBe(6)
  })
})

// --- meetsMulticlassPrereq ---

function scores(overrides: Partial<Record<Ability, number>> = {}): Record<Ability, number> {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides }
}

describe("meetsMulticlassPrereq", () => {
  it("Barbarian needs STR >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ str: 13 }), "barbarian")).toBe(true)
    expect(meetsMulticlassPrereq(scores({ str: 12 }), "barbarian")).toBe(false)
  })
  it("Fighter needs STR >= 13 OR DEX >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ str: 13 }), "fighter")).toBe(true)
    expect(meetsMulticlassPrereq(scores({ dex: 13 }), "fighter")).toBe(true)
    expect(meetsMulticlassPrereq(scores(), "fighter")).toBe(false)
  })
  it("Monk needs DEX >= 13 AND WIS >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ dex: 13, wis: 13 }), "monk")).toBe(true)
    expect(meetsMulticlassPrereq(scores({ dex: 13 }), "monk")).toBe(false)
    expect(meetsMulticlassPrereq(scores({ wis: 13 }), "monk")).toBe(false)
  })
  it("Paladin needs STR >= 13 AND CHA >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ str: 13, cha: 13 }), "paladin")).toBe(true)
    expect(meetsMulticlassPrereq(scores({ str: 13 }), "paladin")).toBe(false)
  })
  it("Ranger needs DEX >= 13 AND WIS >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ dex: 13, wis: 13 }), "ranger")).toBe(true)
    expect(meetsMulticlassPrereq(scores({ dex: 13 }), "ranger")).toBe(false)
  })
  it("Rogue needs DEX >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ dex: 13 }), "rogue")).toBe(true)
    expect(meetsMulticlassPrereq(scores(), "rogue")).toBe(false)
  })
  it("CHA casters need CHA >= 13", () => {
    for (const c of ["bard", "sorcerer", "warlock"] as const) {
      expect(meetsMulticlassPrereq(scores({ cha: 13 }), c)).toBe(true)
      expect(meetsMulticlassPrereq(scores(), c)).toBe(false)
    }
  })
  it("WIS casters need WIS >= 13", () => {
    for (const c of ["cleric", "druid"] as const) {
      expect(meetsMulticlassPrereq(scores({ wis: 13 }), c)).toBe(true)
      expect(meetsMulticlassPrereq(scores(), c)).toBe(false)
    }
  })
  it("Wizard needs INT >= 13", () => {
    expect(meetsMulticlassPrereq(scores({ int: 13 }), "wizard")).toBe(true)
    expect(meetsMulticlassPrereq(scores(), "wizard")).toBe(false)
  })
})

// --- canMulticlass ---

describe("canMulticlass", () => {
  it("requires both current and new class prereqs", () => {
    const s = scores({ str: 13, cha: 13 })
    expect(canMulticlass(s, "barbarian", "bard")).toBe(true)
  })
  it("fails if current class prereq not met", () => {
    const s = scores({ cha: 13 })
    expect(canMulticlass(s, "barbarian", "bard")).toBe(false)
  })
  it("fails if new class prereq not met", () => {
    const s = scores({ str: 13 })
    expect(canMulticlass(s, "barbarian", "bard")).toBe(false)
  })
})
