import { describe, expect, it } from "vitest"

import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

import { deriveSnapshot } from "./scene-snapshot.ts"
import { META, replayTo } from "./test-helpers.ts"

describe("deriveSnapshot", () => {
  it("returns 6 creatures in initiative order after BATTLE_INIT", () => {
    const snap = deriveSnapshot(replayTo(1), META)
    expect(snap.creatures).toHaveLength(6)
    // Initiative order matches CREATURES array order: A,D,B,E,C,F
    expect(snap.creatures.map((c) => c.id)).toEqual(["A", "D", "B", "E", "C", "F"])
  })

  it("marks creature A as active after START_TURN", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    expect(snap.activeCreatureId).toBe("A")
    const a = snap.creatures.find((c) => c.id === "A")!
    expect(a.isActive).toBe(true)
    expect(a.team).toBe("blue")
    expect(a.name).toBe("Laser Wizard")
  })

  it("all creatures start at full HP with correct ratios", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    for (const c of snap.creatures) {
      expect(c.hpRatio).toBe(1)
      expect(c.currentHp).toBe(50)
      expect(c.maxHp).toBe(50)
      expect(c.unconscious).toBe(false)
      expect(c.dead).toBe(false)
    }
  })

  it("shows AoE resolving phase during AoE resolution", () => {
    // After INIT + START + CAST_AOE + 5 CS events = 8 events, AoE starts at event 8
    const snap = deriveSnapshot(replayTo(8), META, "2")
    expect(snap.phase.type).toBe("aoeResolving")
    expect(snap.aoeZones).toHaveLength(1)
    expect(snap.aoeZones[0].spellName).toBe("Fireball")
    expect(snap.aoeZones[0].damageType).toBe("fire")
    expect(snap.aoeZones[0].centerGridPos).toEqual({ row: 5, col: 8 })
    expect(snap.aoeZones[0].radiusFeet).toBe(20)
  })

  it("correct HP after full scenario — D and F KO'd", () => {
    const snap = deriveSnapshot(replayTo(FIREBALL_BATTLE.length), META)
    expect(snap.creatures.find((c) => c.id === "A")!.currentHp).toBe(36)
    expect(snap.creatures.find((c) => c.id === "B")!.currentHp).toBe(22)
    expect(snap.creatures.find((c) => c.id === "C")!.currentHp).toBe(22)
    expect(snap.creatures.find((c) => c.id === "D")!.currentHp).toBe(0)
    expect(snap.creatures.find((c) => c.id === "D")!.unconscious).toBe(true)
    expect(snap.creatures.find((c) => c.id === "E")!.currentHp).toBe(22)
    expect(snap.creatures.find((c) => c.id === "F")!.unconscious).toBe(true)
  })

  it("assigns teams correctly", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    expect(snap.creatures.find((c) => c.id === "A")!.team).toBe("blue")
    expect(snap.creatures.find((c) => c.id === "D")!.team).toBe("red")
    expect(snap.creatures.find((c) => c.id === "F")!.team).toBe("red")
  })

  it("tracks slot totals", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    for (const c of snap.creatures) {
      expect(c.totalSlotsMax).toBe(9)
      expect(c.totalSlotsRemaining).toBe(9)
    }
  })

  it("returns activeTurn phase when not in special phase", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    expect(snap.phase).toEqual({ type: "activeTurn" })
  })

  it("gridPositions come from metadata", () => {
    const snap = deriveSnapshot(replayTo(2), META)
    expect(snap.creatures.find((c) => c.id === "A")!.gridPos).toEqual({ row: 3, col: 2 })
    expect(snap.creatures.find((c) => c.id === "D")!.gridPos).toEqual({ row: 3, col: 8 })
  })
})
