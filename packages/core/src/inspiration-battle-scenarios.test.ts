import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { armorClass, CreatureId, difficultyClass, spellId, spellSlotLevel } from "#/types.ts"

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

function initTwoCasterBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) }
    ]
  })
  return actor
}

function initSneakAttackBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("A"), maxHp: 20, kind: "PC", rogueLevel: 5, sneakAttackDice: 3, initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 }
    ]
  })
  return actor
}

function startTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT })
}

function resolveAttackWindows(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAttackHit") {
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })
  }
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAttackDamage") {
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })
  }
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAfterDamage") {
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_PASS",
      reactorId: null
    })
  }
}

describe("inspiration-sourced battle regressions", () => {
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

  it("natural_20: a spent reaction refreshes at the start of the creature's next turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

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

    expect(creature(actor, "B").reactionAvailable).toBe(false)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").reactionAvailable).toBe(true)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).not.toBeNull()
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(true)
  })

  it("natural_20: Disengage prevents opportunity attacks for the rest of the turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, { type: "BATTLE_DISENGAGE" })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").disengaged).toBe(true)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).toBeNull()
    expect(creature(actor, "A").movementRemaining).toBe(25)
    expect(creature(actor, "B").reactionAvailable).toBe(true)
  })

  it("natural_20: Disengage ends when the creature's next turn starts", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, { type: "BATTLE_DISENGAGE" })
    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).toBeNull()

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").reactionAvailable).toBe(true)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "A").disengaged).toBe(false)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).not.toBeNull()
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(true)
  })

  it("natural_20: Dodge suppresses ally-adjacent Sneak Attack until the start of the dodger's next turn", () => {
    const actor = initSneakAttackBattle()
    startTurn(actor)

    send(actor, { type: "BATTLE_DODGE" })

    expect(creature(actor, "B").dodging).toBe(true)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").hp).toBe(16)
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").dodging).toBe(false)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").hp).toBe(6)
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(true)
  })

  it("natural_20: Shocking Grasp blocks opportunity attacks until the start of the target's next turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "lightning",
      crit: false,
      tAc: armorClass(12),
      onHitEffect: {
        spellId: spellId("shocking_grasp"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("B"),
        blocksOpportunityAttacks: true
      },
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").reactionAvailable).toBe(true)
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: spellId("shocking_grasp") })])
    )

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).toBeNull()

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").activeEffects).toEqual([])

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)
    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set([CreatureId("B")])
    })

    expect(ctx(actor).movementCtx).not.toBeNull()
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(true)
  })

  it("foundryvtt-dnd5e: Ray of Frost reduces speed until the start of the caster's next turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 16,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "cold",
      crit: false,
      tAc: armorClass(12),
      onHitEffect: {
        spellId: spellId("ray_of_frost"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("A"),
        speedDeltaFeet: -10
      },
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
      attackerWithin5ft: false
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: spellId("ray_of_frost") })])
    )

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").effectiveSpeed).toBe(20)
    expect(creature(actor, "B").movementRemaining).toBe(20)
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: spellId("ray_of_frost") })])
    )

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").activeEffects).toEqual([])

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").effectiveSpeed).toBe(30)
    expect(creature(actor, "B").movementRemaining).toBe(30)
  })

  it("natural_20: a readied spell releases with a reaction and applies its effect", () => {
    const actor = initTwoCasterBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_READY_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person"
    })

    expect(creature(actor, "A").readiedAction).toBe(true)
    expect(creature(actor, "A").readiedSpellParams).not.toBeNull()
    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(3)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })

    expect(ctx(actor).readyCtx?.eligibleCreatures.has(CreatureId("A"))).toBe(true)

    send(actor, {
      type: "BATTLE_READY_SPELL_RELEASE",
      releaserId: CreatureId("A"),
      saveRoll: 1
    })

    expect(creature(actor, "A").reactionAvailable).toBe(false)
    expect(creature(actor, "A").readiedAction).toBe(false)
    expect(creature(actor, "A").readiedSpellParams).toBeNull()
    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "B").paralyzed).toBe(true)
  })

  it("natural_20: an unreleased readied spell dissipates at the start of the caster's next turn", () => {
    const actor = initTwoCasterBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_READY_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person"
    })
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    send(actor, { type: "BATTLE_READY_PASS" })

    startTurn(actor)
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    send(actor, { type: "BATTLE_READY_PASS" })
    startTurn(actor)

    expect(creature(actor, "A").readiedSpellParams).toBeNull()
    expect(creature(actor, "A").readiedAction).toBe(false)
    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(3)
    expect(creature(actor, "B").paralyzed).toBe(false)
  })
})
