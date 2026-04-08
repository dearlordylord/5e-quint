import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import type { CreatureId as CreatureIdT } from "#/types.ts"
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
  saDmg: 0,
  hitReactionCandidates: new Set<CreatureIdT>()
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

function initHitReactionBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["shield"]),
        initiativeRoll: 15
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        bardLevel: 3,
        bardicInspirationCharges: 3,
        initiativeRoll: 10
      },
      { id: CreatureId("D"), maxHp: 20, kind: "Monster", parryAcBonus: 2, initiativeRoll: 5 }
    ]
  })
  return actor
}

function initDamageReactionBattle({
  rogueLevel = 0,
  monkLevel = 0,
}: {
  readonly rogueLevel?: number
  readonly monkLevel?: number
}) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", rogueLevel, monkLevel, initiativeRoll: 10 }
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

function initThreeCasterBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) }
    ]
  })
  return actor
}

function initCounterspellBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]), initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["counterspell"]), initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 }
    ]
  })
  return actor
}

function initLegendaryBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("C"), maxHp: 30, kind: "Monster", legendaryActions: 3, initiativeRoll: 10 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 5 }
    ]
  })
  return actor
}

function initLegendaryResistanceBattle(legendaryResistances: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]), initiativeRoll: 15 },
      { id: CreatureId("C"), maxHp: 30, kind: "Monster", legendaryResistances, initiativeRoll: 10 }
    ]
  })
  return actor
}

function initHealBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 }
    ]
  })
  return actor
}

function initAoEBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["burning_hands"]), initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", hasEvasion: true, initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", hasEvasion: true, initiativeRoll: 5 }
    ]
  })
  return actor
}

function initFighterBattle(fighterLevel: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", fighterLevel },
      { id: CreatureId("B"), maxHp: 20, kind: "PC" }
    ]
  })
  return actor
}

function initFighterCasterBattle(fighterLevel: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        fighterLevel,
        preparedSpells: new Set(["hold_person"])
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]) }
    ]
  })
  return actor
}

function initBarbarianBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", barbarianLevel, initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 }
    ]
  })
  return actor
}

function initBarbarianCasterBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        barbarianLevel,
        preparedSpells: new Set(["hold_person"]),
        initiativeRoll: 15
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["hold_person"]), initiativeRoll: 10 }
    ]
  })
  return actor
}

function initRecklessBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", barbarianLevel, initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", rogueLevel: 5, sneakAttackDice: 3, initiativeRoll: 10 }
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

function initGrappleBattle() {
  const actor = createActor(battleMachine)
  actor.start()
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", rogueLevel: 5, sneakAttackDice: 3, initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 }
    ]
  })
  return actor
}

function startTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT })
}

function endTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, {
    type: "BATTLE_END_TURN",
    eotSaveSucceeded: false,
    eotDmg: 0,
    eotDt: "bludgeoning",
    eotConSave: true
  })
}

function advanceToNextTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  endTurn(actor)
  startTurn(actor)
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

function resolveAoEWindows(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAfterDamage") {
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_PASS",
      reactorId: null
    })
  }
}

function passSpellCastWindow(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PISpellCast") {
    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: null,
      decision: { tag: "RPass" },
      csSlotLvl: spellSlotLevel(3)
    })
  }
}

describe("battle rules scenario regressions", () => {
  it("natural_20: Shield negates the triggering hit and spends the reaction", () => {
    const actor = initHitReactionBattle()
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
    expect(creature(actor, "B").slotsCurrent[0]).toBe(3)
    expect(creature(actor, "B").slotExpendedThisTurn).toBe(true)
  })

  it("phase_3: Cutting Words is offered only to an owned candidate and spends bardic inspiration", () => {
    const actor = initHitReactionBattle()
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
      ...DEFAULT_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("C")])
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit")
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("C"))).toBe(true)
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("D"))).toBe(false)

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("C"),
      decision: { tag: "RCuttingWords", reduction: 4 }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "B").hp).toBe(20)
    expect(creature(actor, "C").reactionAvailable).toBe(false)
    expect(creature(actor, "C").bardicInspirationCharges).toBe(2)
  })

  it("phase_3: Parry is legal only on melee weapon hits and uses the owned AC bonus", () => {
    const actor = initHitReactionBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("D"),
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
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("D"))).toBe(true)

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("D"),
      decision: { tag: "RParry", bonus: 2 }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "D").hp).toBe(20)
    expect(creature(actor, "D").reactionAvailable).toBe(false)
  })

  it("phase_3: impossible hit reactions are rejected by owned window legality", () => {
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

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage")
    expect(creature(actor, "B").hp).toBe(13)
  })

  it("phase_1: the damage window is skipped when the target has no legal damage reaction", () => {
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
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage")
    expect(creature(actor, "B").hp).toBe(13)
  })

  it("phase_1: Uncanny Dodge does not open when the attacker is unseen at the hit", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 8,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: false
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage")
    expect(creature(actor, "B").hp).toBe(12)
    expect(creature(actor, "B").reactionAvailable).toBe(true)
  })

  it("phase_1: illegal damage reaction decisions are rejected against the owned window state", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage")
    const awaitCtx = ctx(actor).awaitCtx
    const dmgCtx = awaitCtx?.interrupt.tag === "PIAttackDamage" ? awaitCtx.interrupt.ctx : null
    expect(dmgCtx?.legalReactions).toEqual(new Set(["RUncannyDodge"]))

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RDeflectAttacks", amount: 5 }
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage")
    expect(creature(actor, "B").reactionAvailable).toBe(true)
    expect(creature(actor, "B").hp).toBe(20)
  })

  it("phase_2: Uncanny Dodge halves the damage against a visible attack and spends the reaction", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage")

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RUncannyDodge" }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(creature(actor, "B").hp).toBe(16)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
  })

  it("phase_2: Deflect Attacks reduces weapon-attack damage and spends the reaction", () => {
    const actor = initDamageReactionBattle({ monkLevel: 3 })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage")
    const deflectAwaitCtx = ctx(actor).awaitCtx
    const deflectCtx = deflectAwaitCtx?.interrupt.tag === "PIAttackDamage" ? deflectAwaitCtx.interrupt.ctx : null
    expect(deflectCtx?.legalReactions).toEqual(new Set(["RDeflectAttacks"]))

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RDeflectAttacks", amount: 6 }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(creature(actor, "B").hp).toBe(17)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
  })

  it("phase_2: Deflect Attacks does not open on a non-weapon attack before Deflect Energy", () => {
    const actor = initDamageReactionBattle({ monkLevel: 3 })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "cold",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      onHitEffect: {
        spellId: spellId("ray_of_frost"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("A"),
        speedDeltaFeet: -10
      }
    })
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage")
    expect(creature(actor, "B").hp).toBe(13)
    expect(creature(actor, "B").reactionAvailable).toBe(true)
  })

  it("natural_20: Counterspell fizzles the spell, wastes the action, and preserves the original slot", () => {
    const actor = initCounterspellBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("C"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISpellCast")
    expect(ctx(actor).awaitCtx?.eligible).toEqual(new Set([CreatureId("B")]))

    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: CreatureId("B"),
      decision: { tag: "RCounterspell", saveSucceeded: false },
      csSlotLvl: spellSlotLevel(3)
    })
    passSpellCastWindow(actor)

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
    expect(creature(actor, "B").slotsCurrent[2]).toBe(1)
    expect(creature(actor, "C").paralyzed).toBe(false)
  })

  it("natural_20: a passed Counterspell Constitution save lets the original spell resolve", () => {
    const actor = initCounterspellBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("C"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: CreatureId("B"),
      decision: { tag: "RCounterspell", saveSucceeded: true },
      csSlotLvl: spellSlotLevel(3)
    })
    passSpellCastWindow(actor)

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(3)
    expect(creature(actor, "B").reactionAvailable).toBe(false)
    expect(creature(actor, "B").slotsCurrent[2]).toBe(1)
    expect(creature(actor, "C").paralyzed).toBe(true)
  })

  it("natural_20: a save spell resolves immediately when no Counterspell reactor is eligible", () => {
    const actor = initTwoCasterBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(3)
    expect(creature(actor, "B").paralyzed).toBe(true)
  })

  it("natural_20: ending a turn enters the legendary window and pass advances to the next turn", () => {
    const actor = initLegendaryBattle()
    startTurn(actor)

    endTurn(actor)

    expect(ctx(actor).laCtx?.eligibleMonsters).toEqual(new Set([CreatureId("C")]))
    expect(ctx(actor).laCtx?.endingTurnIndex).toBe(0)

    send(actor, { type: "BATTLE_LEGENDARY_PASS" })

    expect(ctx(actor).laCtx).toBeNull()
    expect(ctx(actor).turnStarted).toBe(false)
    expect(ctx(actor).turnIndex).toBe(1)
  })

  it("natural_20: a legendary attack spends one legendary action and then returns to the legendary window", () => {
    const actor = initLegendaryBattle()
    startTurn(actor)

    endTurn(actor)

    send(actor, {
      type: "BATTLE_LEGENDARY_ATTACK",
      monsterId: CreatureId("C"),
      laTarget: CreatureId("A"),
      laAtkRoll: 15,
      laDmg: 7,
      laDt: "slashing",
      laCrit: false,
      laTgtAc: armorClass(10),
      knockOut: false,
      isMelee: true,
      isFinesse: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>()
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").hp).toBe(13)
    expect(creature(actor, "C").legendaryActionsRemaining).toBe(2)
    expect(ctx(actor).laCtx?.eligibleMonsters).toEqual(new Set([CreatureId("C")]))

    send(actor, { type: "BATTLE_LEGENDARY_PASS" })

    expect(ctx(actor).laCtx).toBeNull()
    expect(ctx(actor).turnIndex).toBe(1)
  })

  it("natural_20: Legendary Resistance turns a failed save into a success and spends one use", () => {
    const actor = initLegendaryResistanceBattle(3)
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("C"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISaveFailed")
    expect(ctx(actor).awaitCtx?.eligible).toEqual(new Set([CreatureId("C")]))

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: CreatureId("C"),
      decision: { tag: "RLegendaryResistance" }
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "A").slotsCurrent[0]).toBe(3)
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(2)
    expect(creature(actor, "C").paralyzed).toBe(false)
  })

  it("natural_20: passing the failed-save reaction applies the spell effect and preserves Legendary Resistance", () => {
    const actor = initLegendaryResistanceBattle(3)
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("C"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: null,
      decision: { tag: "RPass" }
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(3)
    expect(creature(actor, "C").paralyzed).toBe(true)
  })

  it("natural_20: no Legendary Resistance uses means a failed save resolves immediately", () => {
    const actor = initLegendaryResistanceBattle(0)
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("C"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(ctx(actor).awaitCtx).toBeNull()
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(0)
    expect(creature(actor, "C").paralyzed).toBe(true)
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
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>()
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
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>()
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

  it("natural_20: Action Surge grants one additional non-Magic action on the same turn", () => {
    const actor = initFighterBattle(2)
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 5,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "slashing",
      crit: false,
      tAc: armorClass(20),
      ...DEFAULT_ATTACK_CONTEXT
    })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").attackActionUsed).toBe(true)

    send(actor, { type: "BATTLE_ACTION_SURGE" })

    expect(creature(actor, "A").actionsRemaining).toBe(1)
    expect(creature(actor, "A").actionSurgeCharges).toBe(0)
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true)
    expect(creature(actor, "A").actionSurgeActionPending).toBe(true)

    send(actor, { type: "BATTLE_DASH" })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").movementRemaining).toBe(60)
    expect(creature(actor, "A").actionSurgeActionPending).toBe(false)
  })

  it("natural_20: Action Surge can be used only once on a turn even if two charges remain", () => {
    const actor = initFighterBattle(17)
    startTurn(actor)

    expect(creature(actor, "A").actionSurgeCharges).toBe(2)

    send(actor, { type: "BATTLE_ACTION_SURGE" })

    expect(creature(actor, "A").actionsRemaining).toBe(2)
    expect(creature(actor, "A").actionSurgeCharges).toBe(1)
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true)

    send(actor, { type: "BATTLE_ACTION_SURGE" })

    expect(creature(actor, "A").actionsRemaining).toBe(2)
    expect(creature(actor, "A").actionSurgeCharges).toBe(1)
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true)
  })

  it("natural_20: Action Surge does not allow the extra action to be the Magic action", () => {
    const actor = initFighterCasterBattle(2)
    startTurn(actor)

    send(actor, { type: "BATTLE_ACTION_SURGE" })

    expect(creature(actor, "A").actionsRemaining).toBe(2)
    expect(creature(actor, "A").slotExpendedThisTurn).toBe(false)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(creature(actor, "A").actionsRemaining).toBe(2)
    expect(creature(actor, "A").actionSurgeActionPending).toBe(true)
    expect(creature(actor, "A").slotExpendedThisTurn).toBe(false)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4)
    expect(creature(actor, "B").paralyzed).toBe(false)
  })

  it("natural_20: Rage grants physical damage resistance until the barbarian's next turn ends", () => {
    const actor = initBarbarianBattle(1)
    startTurn(actor)

    send(actor, { type: "BATTLE_ENTER_RAGE" })

    expect(creature(actor, "A").bonusActionUsed).toBe(true)
    expect(creature(actor, "A").meleeDamageBonus).toBe(2)
    expect(creature(actor, "A").combatantResistances).toEqual(new Set(["bludgeoning", "piercing", "slashing"]))

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
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "bludgeoning",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").hp).toBe(17)
  })

  it("natural_20: Rage blocks spellcasting while active", () => {
    const actor = initBarbarianCasterBattle(1)
    startTurn(actor)

    send(actor, { type: "BATTLE_ENTER_RAGE" })

    expect(creature(actor, "A").ragingBlocksSpells).toBe(true)
    expect(creature(actor, "A").actionsRemaining).toBe(1)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(1),
      spellName: "hold_person",
      ritual: false
    })

    expect(creature(actor, "A").actionsRemaining).toBe(1)
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4)
    expect(creature(actor, "B").paralyzed).toBe(false)
  })

  it("natural_20: Reckless Attack makes attack rolls against the barbarian have advantage until the start of the next turn", () => {
    const actor = initRecklessBattle(2)
    startTurn(actor)

    send(actor, { type: "BATTLE_DECLARE_RECKLESS" })

    expect(creature(actor, "A").recklessThisTurn).toBe(true)

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
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      saDmg: 6
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").hp).toBe(10)
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(true)
  })

  it("natural_20: non-barbarians cannot declare Reckless Attack", () => {
    const actor = initRecklessBattle(0)
    startTurn(actor)

    send(actor, { type: "BATTLE_DECLARE_RECKLESS" })

    expect(creature(actor, "A").recklessThisTurn).toBe(false)

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
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      saDmg: 6
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").hp).toBe(16)
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(false)
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

  it("natural_20: incapacitating the grappler auto-releases the target", () => {
    const actor = initGrappleBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })

    expect(creature(actor, "A").grapplingTarget).toBe(CreatureId("B"))
    expect(creature(actor, "B").grappled).toBe(true)
    expect(creature(actor, "B").grappledBy).toBe(CreatureId("A"))

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("A"),
      saveDC: difficultyClass(14),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").paralyzed).toBe(true)
    expect(creature(actor, "A").grapplingTarget).toBeNull()
    expect(creature(actor, "B").grappled).toBe(false)
    expect(creature(actor, "B").grappledBy).toBeNull()
  })

  it("natural_20: a grappled attacker loses ally-adjacent Sneak Attack against non-grapplers but not against the grappler", () => {
    const actor = initGrappleBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
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
      targetId: CreatureId("C"),
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

    expect(creature(actor, "C").hp).toBe(16)
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(false)

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
      targetId: CreatureId("A"),
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

    expect(creature(actor, "A").hp).toBe(10)
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(true)
  })

  it("natural_20: dragging a grappled target halves the grappler's speed unless the target is two sizes smaller", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })

    expect(creature(actor, "A").effectiveSpeed).toBe(15)
    expect(creature(actor, "A").movementRemaining).toBe(15)

    send(actor, {
      type: "BATTLE_MOVE",
      threatened: new Set()
    })

    expect(creature(actor, "A").movementRemaining).toBe(10)

    const exemptActor = initTwoPcBattle()
    startTurn(exemptActor)

    send(exemptActor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "huge",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })

    expect(creature(exemptActor, "A").effectiveSpeed).toBe(30)
    expect(creature(exemptActor, "A").movementRemaining).toBe(30)
  })

  it("natural_20: a grappler can release the target at any time without spending an action", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").effectiveSpeed).toBe(15)
    expect(creature(actor, "A").movementRemaining).toBe(15)

    send(actor, { type: "BATTLE_RELEASE_GRAPPLE" })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "A").grapplingTarget).toBeNull()
    expect(creature(actor, "A").effectiveSpeed).toBe(30)
    expect(creature(actor, "A").movementRemaining).toBe(30)
    expect(creature(actor, "B").grappled).toBe(false)
    expect(creature(actor, "B").grappledBy).toBeNull()
  })

  it("natural_20: a successful escape spends the action and ends the grapple", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    expect(creature(actor, "B").grappled).toBe(true)
    expect(creature(actor, "B").effectiveSpeed).toBe(0)
    expect(creature(actor, "B").movementRemaining).toBe(0)

    send(actor, {
      type: "BATTLE_ESCAPE_GRAPPLE",
      escapeSucceeded: true
    })

    expect(creature(actor, "B").actionsRemaining).toBe(0)
    expect(creature(actor, "B").grappled).toBe(false)
    expect(creature(actor, "B").grappledBy).toBeNull()
    expect(creature(actor, "B").effectiveSpeed).toBe(30)
    expect(creature(actor, "B").movementRemaining).toBe(30)
    expect(creature(actor, "A").grapplingTarget).toBeNull()
  })

  it("natural_20: a failed escape spends the action but leaves the grapple intact", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ESCAPE_GRAPPLE",
      escapeSucceeded: false
    })

    expect(creature(actor, "B").actionsRemaining).toBe(0)
    expect(creature(actor, "B").grappled).toBe(true)
    expect(creature(actor, "B").grappledBy).toBe(CreatureId("A"))
    expect(creature(actor, "B").effectiveSpeed).toBe(0)
    expect(creature(actor, "B").movementRemaining).toBe(0)
    expect(creature(actor, "A").grapplingTarget).toBe(CreatureId("B"))
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

  it("foundryvtt-dnd5e: Dash uses the reduced Speed from Ray of Frost on the slowed turn", () => {
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

    send(actor, { type: "BATTLE_DASH" })

    expect(creature(actor, "B").actionsRemaining).toBe(0)
    expect(creature(actor, "B").effectiveSpeed).toBe(20)
    expect(creature(actor, "B").movementRemaining).toBe(40)
  })

  it("natural_20: failing a concentration check ends the spell's effect on the target", () => {
    const actor = initTwoCasterBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("B"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false
    })

    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "B").paralyzed).toBe(true)
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: spellId("hold_person"), casterId: CreatureId("A") })])
    )

    send(actor, {
      type: "BATTLE_CONCENTRATION_CHECK",
      targetId: CreatureId("A"),
      conSaveSucceeded: false
    })

    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "B").paralyzed).toBe(false)
    expect(creature(actor, "B").activeEffects).toEqual([])
  })

  it("natural_20: starting a new concentration spell ends the previous one", () => {
    const actor = initThreeCasterBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("B"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false
    })

    expect(creature(actor, "B").paralyzed).toBe(true)

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
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("C"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false
    })

    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true)
    expect(creature(actor, "A").concentrationSpellId).toEqual(Option.some(spellId("hold_person")))
    expect(creature(actor, "B").paralyzed).toBe(false)
    expect(creature(actor, "B").activeEffects).toEqual([])
    expect(creature(actor, "C").paralyzed).toBe(true)
    expect(creature(actor, "C").activeEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: spellId("hold_person"), casterId: CreatureId("A") })])
    )
  })

  it("natural_20: an AoE spell deals full damage on a failed save and half damage on a successful save", () => {
    const actor = initAoEBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(13),
      dmgOnFail: 9,
      halfOnSave: true,
      dt: "thunder",
      cond: "blinded",
      applyCond: false,
      saveAbility: "con",
      slotLvl: spellSlotLevel(1),
      spellName: "thunderwave",
      ritual: false
    })

    expect(ctx(actor).aoeCtx?.remaining).toEqual(new Set([CreatureId("B"), CreatureId("C")]))

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("B"),
      saveRoll: 5
    })
    resolveAoEWindows(actor)

    expect(creature(actor, "B").hp).toBe(11)

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("C"),
      saveRoll: 15
    })
    resolveAoEWindows(actor)
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: null,
      saveRoll: 0
    })

    expect(creature(actor, "C").hp).toBe(16)
    expect(ctx(actor).aoeCtx).toBeNull()
  })

  it("natural_20: Evasion turns a failed Dexterity AoE save into half damage and a successful save into no damage", () => {
    const actor = initAoEBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(13),
      dmgOnFail: 8,
      halfOnSave: true,
      dt: "fire",
      cond: "blinded",
      applyCond: false,
      saveAbility: "dex",
      slotLvl: spellSlotLevel(1),
      spellName: "burning_hands",
      ritual: false
    })

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("B"),
      saveRoll: 5
    })
    resolveAoEWindows(actor)

    expect(creature(actor, "B").hp).toBe(16)

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("C"),
      saveRoll: 15
    })
    resolveAoEWindows(actor)
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: null,
      saveRoll: 0
    })

    expect(creature(actor, "C").hp).toBe(20)
    expect(ctx(actor).aoeCtx).toBeNull()
  })

  it("natural_20: BATTLE_HEAL restores HP to a wounded ally and spends the caster's action", () => {
    const actor = initHealBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 8,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").hp).toBe(12)

    advanceToNextTurn(actor)
    advanceToNextTurn(actor)

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 5
    })

    expect(creature(actor, "A").actionsRemaining).toBe(0)
    expect(creature(actor, "B").hp).toBe(17)
  })

  it("natural_20: BATTLE_HEAL cannot heal above the target's max HP", () => {
    const actor = initHealBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 3,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    advanceToNextTurn(actor)
    advanceToNextTurn(actor)

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 10
    })

    expect(creature(actor, "B").hp).toBe(20)
  })

  it("natural_20: BATTLE_HEAL revives a 0 HP creature and clears unconscious and death saves", () => {
    const actor = initHealBattle()
    startTurn(actor)

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 20,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "B").hp).toBe(0)
    expect(creature(actor, "B").unconscious).toBe(true)

    advanceToNextTurn(actor)
    advanceToNextTurn(actor)

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 6
    })

    expect(creature(actor, "B").hp).toBe(6)
    expect(creature(actor, "B").unconscious).toBe(false)
    expect(creature(actor, "B").stable).toBe(false)
    expect(creature(actor, "B").deathSaves).toEqual({ successes: 0, failures: 0 })
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

  it("natural_20: a readied attack releases with a reaction and deals damage", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, { type: "BATTLE_READY" })

    expect(creature(actor, "A").readiedAction).toBe(true)
    expect(creature(actor, "A").actionsRemaining).toBe(0)

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true
    })

    expect(ctx(actor).readyCtx?.eligibleCreatures.has(CreatureId("A"))).toBe(true)

    send(actor, {
      type: "BATTLE_READY_RELEASE",
      releaserId: CreatureId("A"),
      targetId: CreatureId("B"),
      atkRoll: 15,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tgtAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT
    })
    resolveAttackWindows(actor)

    expect(creature(actor, "A").reactionAvailable).toBe(false)
    expect(creature(actor, "A").readiedAction).toBe(false)
    expect(creature(actor, "B").hp).toBe(15)
  })

  it("natural_20: an unreleased readied attack expires at the start of the creature's next turn", () => {
    const actor = initTwoPcBattle()
    startTurn(actor)

    send(actor, { type: "BATTLE_READY" })
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

    expect(creature(actor, "A").readiedAction).toBe(false)
    expect(creature(actor, "A").reactionAvailable).toBe(true)
    expect(creature(actor, "B").hp).toBe(20)
  })
})
