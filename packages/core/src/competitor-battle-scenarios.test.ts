import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { armorClass, CreatureId } from "#/types.ts"

const DEFAULT_ATTACK_CONTEXT = {
  knockOut: false,
  isMelee: true,
  isFinesse: false,
  attackerWithin5ft: true,
  hostileWithin5ft: false,
  targetCanSeeAttacker: true,
  attackerCanSeeTarget: true,
  frightSourceInLOS: false,
  hasAllyAdjacentToTarget: false,
  saDmg: 0
} as const

const ZERO_SOT: Pick<
  BattleEvent & { type: "BATTLE_START_TURN" },
  "sotDmg" | "sotDt" | "sotHeal" | "sotSaveResult" | "sotConSave" | "rechargeD6" | "deathSaveRoll"
> = {
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "bludgeoning",
  sotHeal: 0,
  sotSaveResult: false,
  sotConSave: true,
  deathSaveRoll: 0
}

function send(actor: ReturnType<typeof createActor<typeof battleMachine>>, ...events: Array<BattleEvent>) {
  for (const event of events) actor.send(event)
}

function ctx(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  return actor.getSnapshot().context
}

function creature(actor: ReturnType<typeof createActor<typeof battleMachine>>, id: string) {
  return ctx(actor).creatures.get(CreatureId(id))!
}

function initTwoPcBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC" },
      { id: CreatureId("B"), maxHp: 20, kind: "PC" }
    ]
  })
  return actor
}

function startTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT })
}

describe("competitor-sourced battle regressions", () => {
  it("natural_20: Shield negates the triggering hit and spends the reaction", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(15),
      ...DEFAULT_ATTACK_CONTEXT
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit")
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("B"))).toBe(true)

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RShield" }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "B").hp).toBe(20)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
  })

  it("opencombatengine: an opportunity attack spends the reaction and prevents a second OA before next turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).not.toBeNull()
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(true)

    send(actor, {
      type: "BATTLE_MOVEMENT_OA_ATTACK",
      reactorId: CreatureId("B"),
      oaAtkRoll: 5,
      oaDmg: 4,
      oaDt: "slashing",
      oaCrit: false,
      oaTgtAc: armorClass(20),
      knockOut: false,
      isMelee: true,
      isFinesse: false,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0
    })
    send(actor, {
      type: "BATTLE_MOVEMENT_OA_PASS",
      reactorId: null
    })

    expect(ctx(actor).movementCtx).toBeNull()
    expect(creature(actor, "B").reactionAvailable).toBe(false)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).toBeNull()
    expect(creature(actor, "A").movementRemaining).toBe(20)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
  })
})
