import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

describe("Fireball Battle scenario", () => {
  it("replays 6-wizard Fireball + 4-deep CS chain — all but caster unconscious", () => {
    const actor = createActor(battleMachine)
    actor.start()
    for (const event of FIREBALL_BATTLE) actor.send(event)
    const ctx = actor.getSnapshot().context

    // A untouched (caster, not in own AoE)
    expect(ctx.creatures.get("A")!.hp).toBe(25)
    expect(ctx.creatures.get("A")!.unconscious).toBe(false)

    // B,C,D,E,F all unconscious at 0 HP
    for (const id of ["B", "C", "D", "E", "F"]) {
      expect(ctx.creatures.get(id)!.hp).toBe(0)
      expect(ctx.creatures.get(id)!.unconscious).toBe(true)
    }

    expect(ctx.phase.tag).toBe("BPActiveTurn")
  })
})
