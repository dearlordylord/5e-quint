import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

describe("Fireball Battle scenario", () => {
  it("replays two-fireball wizard duel — everyone alive, correct HP", () => {
    const actor = createActor(battleMachine)
    actor.start()
    for (const event of FIREBALL_BATTLE) actor.send(event)
    const ctx = actor.getSnapshot().context

    // After A's fireball: D=22, E=36, F=22
    // After D's fireball: A=36, B=22, C=22
    expect(ctx.creatures.get("A")!.hp).toBe(36)
    expect(ctx.creatures.get("B")!.hp).toBe(22)
    expect(ctx.creatures.get("C")!.hp).toBe(22)
    expect(ctx.creatures.get("D")!.hp).toBe(22)
    expect(ctx.creatures.get("E")!.hp).toBe(36)
    expect(ctx.creatures.get("F")!.hp).toBe(22)

    // Nobody unconscious
    for (const id of ["A", "B", "C", "D", "E", "F"]) {
      expect(ctx.creatures.get(id)!.unconscious).toBe(false)
    }

    expect(ctx.phase.tag).toBe("BPActiveTurn")
  })
})
