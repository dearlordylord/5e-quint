import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

describe("Fireball Battle scenario", () => {
  it("replays wizard duel — blue team wins, all red down", () => {
    const actor = createActor(battleMachine)
    actor.start()
    for (const event of FIREBALL_BATTLE) actor.send(event)
    const ctx = actor.getSnapshot().context

    // Blue team: A barely alive, B KO'd by Shatter, C healthy
    expect(ctx.creatures.get("A")!.hp).toBe(8)
    expect(ctx.creatures.get("B")!.unconscious).toBe(true)
    expect(ctx.creatures.get("C")!.hp).toBe(22)

    // Red team: all unconscious. D and F took AoE at 0 HP (death save failures).
    expect(ctx.creatures.get("D")!.unconscious).toBe(true)
    expect(ctx.creatures.get("D")!.deathSaves.failures).toBeGreaterThan(0)
    expect(ctx.creatures.get("E")!.unconscious).toBe(true)
    expect(ctx.creatures.get("F")!.unconscious).toBe(true)
    expect(ctx.creatures.get("F")!.deathSaves.failures).toBeGreaterThan(0)
  })
})
