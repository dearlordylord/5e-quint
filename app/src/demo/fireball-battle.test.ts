import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts"

describe("Fireball Battle scenario", () => {
  it("replays wizard duel — D and F KO'd, blue team wins", () => {
    const actor = createActor(battleMachine)
    actor.start()
    for (const event of FIREBALL_BATTLE) actor.send(event)
    const ctx = actor.getSnapshot().context

    // Blue team alive: A and C took fireball, B took fireball + shatter
    expect(ctx.creatures.get("A")!.hp).toBe(22)
    expect(ctx.creatures.get("B")!.hp).toBe(8)
    expect(ctx.creatures.get("C")!.hp).toBe(22)

    // Red team: D and F unconscious, E took two half-damage fireballs
    expect(ctx.creatures.get("D")!.hp).toBe(0)
    expect(ctx.creatures.get("D")!.unconscious).toBe(true)
    expect(ctx.creatures.get("E")!.hp).toBe(22)
    expect(ctx.creatures.get("F")!.hp).toBe(0)
    expect(ctx.creatures.get("F")!.unconscious).toBe(true)
  })
})
