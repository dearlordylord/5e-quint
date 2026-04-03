import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import { FIREBALL_SELFISHNESS } from "#/demo/fireball-selfishness.ts"

describe("Wizard Duel scenario", () => {
  it("replays the full 6-wizard Fireball + CS chain sequence", () => {
    const actor = createActor(battleMachine)
    actor.start()
    for (const event of FIREBALL_SELFISHNESS) actor.send(event)
    const ctx = actor.getSnapshot().context

    // B,C,D,E unconscious at 0 HP; A untouched; F alive at half
    expect(ctx.creatures.get("A")!.hp).toBe(25)
    expect(ctx.creatures.get("A")!.unconscious).toBe(false)
    for (const id of ["B", "C", "D", "E"]) {
      expect(ctx.creatures.get(id)!.hp).toBe(0)
      expect(ctx.creatures.get(id)!.unconscious).toBe(true)
    }
    expect(ctx.creatures.get("F")!.hp).toBe(11)
    expect(ctx.creatures.get("F")!.unconscious).toBe(false)

    // Back to active turn after AoE completes
    expect(ctx.phase.tag).toBe("BPActiveTurn")
  })
})
