import { describe, expect, it } from "vitest"

import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

import { diffSnapshots } from "./snapshot-diff.ts"
import { snapshotAt } from "./test-helpers.ts"

describe("diffSnapshots", () => {
  it("detects no changes between identical snapshots", () => {
    const snap = snapshotAt(2)
    const delta = diffSnapshots(snap, snap)
    expect(delta.damageTaken).toEqual({})
    expect(delta.healingReceived).toEqual({})
    expect(delta.becameUnconscious).toEqual([])
    expect(delta.reactionsSpent).toEqual([])
    expect(delta.slotsExpended).toEqual([])
    expect(delta.phaseChanged).toBe(false)
    expect(delta.newAoeZones).toEqual([])
  })

  it("detects phase change from activeTurn to interrupt (CS chain)", () => {
    const preCast = snapshotAt(2) // activeTurn
    const postCast = snapshotAt(3) // interrupt
    const delta = diffSnapshots(preCast, postCast)
    expect(delta.phaseChanged).toBe(true)
  })

  it("detects reactions spent during CS chain", () => {
    const before = snapshotAt(3) // after CAST_AOE (D has reaction)
    const after = snapshotAt(4) // after D counterspells
    const delta = diffSnapshots(before, after)
    expect(delta.reactionsSpent).toContain("D")
    expect(delta.slotsExpended).toContain("D")
  })

  it("detects damage and unconscious after AoE target resolution", () => {
    const before = snapshotAt(8)
    const after = snapshotAt(9) // B resolved
    const delta = diffSnapshots(before, after)
    // Effective HP loss is 25 (HP clamped at 0, not raw 28 damage)
    expect(delta.damageTaken["B"]).toBe(25)
    expect(delta.becameUnconscious).toContain("B")
  })

  it("detects all 5 creatures unconscious after full resolution", () => {
    const before = snapshotAt(2) // all healthy
    const after = snapshotAt(FIREBALL_BATTLE.length) // all resolved
    const delta = diffSnapshots(before, after)
    expect(delta.becameUnconscious).toHaveLength(5)
    expect(delta.becameUnconscious).toContain("B")
    expect(delta.becameUnconscious).toContain("F")
    expect(delta.becameUnconscious).not.toContain("A")
  })

  it("detects new AoE zones", () => {
    const before = snapshotAt(2) // no AoE
    const after = snapshotAt(8, "2") // AoE resolving
    const delta = diffSnapshots(before, after)
    expect(delta.newAoeZones).toHaveLength(1)
    expect(delta.newAoeZones[0].spellName).toBe("Fireball")
  })
})
