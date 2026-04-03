import { describe, expect, it } from "vitest"

import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

import { EMPTY_CUES } from "./director.ts"
import { computeLayout, DEFAULT_LAYOUT_CONFIG } from "./layout.ts"
import { snapshotAt } from "./test-helpers.ts"

const CFG = DEFAULT_LAYOUT_CONFIG

describe("computeLayout", () => {
  it("produces correct viewBox dimensions", () => {
    const layout = computeLayout(snapshotAt(2), EMPTY_CUES, CFG)
    expect(layout.viewBox.width).toBe(CFG.gridCols * CFG.cellSize)
    expect(layout.viewBox.height).toBe(CFG.gridRows * CFG.cellSize)
  })

  it("generates grid lines for rows and columns", () => {
    const layout = computeLayout(snapshotAt(2), EMPTY_CUES, CFG)
    expect(layout.gridLines).toHaveLength(CFG.gridRows + 1 + (CFG.gridCols + 1))
  })

  it("places creatures at correct pixel positions", () => {
    const layout = computeLayout(snapshotAt(2), EMPTY_CUES, CFG)
    const a = layout.creatures.find((c) => c.id === "A")!
    // A is at grid (3,2) → pixel center (2*60+30, 3*60+30) = (150, 210)
    expect(a.cx).toBe(150)
    expect(a.cy).toBe(210)
    expect(a.teamColor).toBe("#3b82f6")
  })

  it("unconscious creatures have reduced opacity", () => {
    const layout = computeLayout(snapshotAt(FIREBALL_BATTLE.length), EMPTY_CUES, CFG)
    const a = layout.creatures.find((c) => c.id === "A")!
    expect(a.opacity).toBe(1)
    const b = layout.creatures.find((c) => c.id === "B")!
    expect(b.opacity).toBe(0.3)
  })

  it("HP bar fill scales with hpRatio", () => {
    const layout = computeLayout(snapshotAt(2), EMPTY_CUES, CFG)
    const a = layout.creatures.find((c) => c.id === "A")!
    expect(a.hpBar.fillWidth).toBe(a.hpBar.totalWidth)
  })

  it("computes AoE zone layout from feet to pixels", () => {
    const layout = computeLayout(snapshotAt(8, "2"), EMPTY_CUES, CFG)
    expect(layout.aoeZones).toHaveLength(1)
    const zone = layout.aoeZones[0]
    expect(zone.cx).toBe(330)
    expect(zone.cy).toBe(330)
    expect(zone.r).toBe(240)
  })

  it("slot pips reflect total slots", () => {
    const layout = computeLayout(snapshotAt(2), EMPTY_CUES, CFG)
    const a = layout.creatures.find((c) => c.id === "A")!
    expect(a.slotPips.total).toBe(9)
    expect(a.slotPips.filled).toBe(9)
  })
})
