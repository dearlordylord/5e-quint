import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { battleMachine } from "#/battle-machine.ts";
import { FIREBALL_BATTLE } from "#/demo/fireball-battle.ts";
import { CreatureId } from "#/types.ts";

describe("Fireball Battle scenario", () => {
  it("replays wizard duel — blue team wins, all red down", () => {
    const actor = createActor(battleMachine);
    actor.start();
    for (const event of FIREBALL_BATTLE) actor.send(event);
    const ctx = actor.getSnapshot().context;

    // Blue team: A barely alive, B dead after follow-up damage, C healthy
    expect(ctx.creatures.get(CreatureId("A"))!.hp).toBe(8);
    expect(ctx.creatures.get(CreatureId("B"))!.unconscious).toBe(true);
    expect(ctx.creatures.get(CreatureId("B"))!.dead).toBe(true);
    expect(ctx.creatures.get(CreatureId("C"))!.hp).toBe(22);

    // Red team: all down. D dies from follow-up damage at 0 HP; E and F remain
    // unconscious, with F not accumulating death-save failures in this script.
    expect(ctx.creatures.get(CreatureId("D"))!.unconscious).toBe(true);
    expect(ctx.creatures.get(CreatureId("D"))!.dead).toBe(true);
    expect(ctx.creatures.get(CreatureId("D"))!.deathSaves.failures).toBe(3);
    expect(ctx.creatures.get(CreatureId("E"))!.unconscious).toBe(true);
    expect(ctx.creatures.get(CreatureId("F"))!.unconscious).toBe(true);
    expect(ctx.creatures.get(CreatureId("F"))!.dead).toBe(false);
    expect(ctx.creatures.get(CreatureId("F"))!.deathSaves.failures).toBe(0);
  });
});
