import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import type { DndContext, DndSnapshot } from "#/machine.ts"
import { dndMachine } from "#/machine.ts"
import {
  aggregateAttackMods,
  calculateAC,
  coverBonus,
  criticalDamage,
  normalDamage,
  resolveAdvantage,
  resolveAttackRoll,
  withinOneSize
} from "#/machine-combat.ts"
import {
  applyDamageModifiers,
  armorSpeedPenalty,
  calculateEffectiveSpeed,
  dehydrationLevels,
  effectiveMaxHp,
  fallDamageDice,
  movementCostMultiplier
} from "#/machine-helpers.ts"
import {
  canAct,
  canSpeak,
  checkMods,
  defenseMods,
  isIncapacitated,
  ownAttackMods,
  saveMods
} from "#/machine-queries.ts"
import { calculateMulticlassSlots, concentrationDC, expendSlot, slotsPerLevel } from "#/machine-spells.ts"
import type { ActionType, ArmorState, AttackContext, Condition, DamageType } from "#/types.ts"
import { abilityScore, d20Roll, damageAmount, healAmount, hp, proficiencyBonus, tempHp } from "#/types.ts"

// --- Helpers ---

const DEFAULT_MAX_HP = 20
const INSTANT_DEATH_HP = 10

function create(maxHp = DEFAULT_MAX_HP) {
  const actor = createActor(dndMachine, { input: { maxHp } })
  actor.start()
  return actor
}

function snap(actor: ReturnType<typeof create>): DndSnapshot {
  return actor.getSnapshot()
}

function isAlive(s: DndSnapshot) {
  return s.matches({ damageTrack: "alive" })
}

function isUnstable(s: DndSnapshot) {
  return s.matches({ damageTrack: { dying: "unstable" } })
}

function isStable(s: DndSnapshot) {
  return s.matches({ damageTrack: { dying: "stable" } })
}

function isDead(s: DndSnapshot) {
  return s.matches({ damageTrack: "dead" })
}

function takeDamage(
  actor: ReturnType<typeof create>,
  amount: number,
  opts: {
    damageType?: DamageType
    resistances?: ReadonlySet<DamageType>
    vulnerabilities?: ReadonlySet<DamageType>
    immunities?: ReadonlySet<DamageType>
    isCritical?: boolean
  } = {}
) {
  actor.send({
    type: "TAKE_DAMAGE",
    amount: damageAmount(amount),
    damageType: opts.damageType ?? "bludgeoning",
    resistances: opts.resistances ?? new Set(),
    vulnerabilities: opts.vulnerabilities ?? new Set(),
    immunities: opts.immunities ?? new Set(),
    isCritical: opts.isCritical ?? false
  })
}

function heal(actor: ReturnType<typeof create>, amount: number) {
  actor.send({ type: "HEAL", amount: healAmount(amount) })
}

function deathSave(actor: ReturnType<typeof create>, roll: number) {
  actor.send({ type: "DEATH_SAVE", d20Roll: d20Roll(roll) })
}

function grantTempHp(actor: ReturnType<typeof create>, amount: number, keepOld = false) {
  actor.send({ type: "GRANT_TEMP_HP", amount: tempHp(amount), keepOld })
}

function stabilize(actor: ReturnType<typeof create>) {
  actor.send({ type: "STABILIZE" })
}

function knockOut(actor: ReturnType<typeof create>) {
  actor.send({ type: "KNOCK_OUT" })
}

function applyCondition(actor: ReturnType<typeof create>, condition: Condition) {
  actor.send({ type: "APPLY_CONDITION", condition })
}

function removeCondition(actor: ReturnType<typeof create>, condition: Condition) {
  actor.send({ type: "REMOVE_CONDITION", condition })
}

function addExhaustion(actor: ReturnType<typeof create>, levels = 1) {
  actor.send({ type: "ADD_EXHAUSTION", levels })
}

function reduceExhaustion(actor: ReturnType<typeof create>, levels = 1) {
  actor.send({ type: "REDUCE_EXHAUSTION", levels })
}

function ctx(actor: ReturnType<typeof create>): DndContext {
  return snap(actor).context
}

// --- Tests ---

describe("branded type constructors", () => {
  it("HP clamps to >= 0", () => {
    expect(hp(-5)).toBe(0)
    expect(hp(10)).toBe(10)
  })

  it("D20Roll clamps to 1-20", () => {
    expect(d20Roll(0)).toBe(1)
    expect(d20Roll(25)).toBe(20)
    expect(d20Roll(10)).toBe(10)
  })

  it("TempHP clamps to >= 0", () => {
    expect(tempHp(-3)).toBe(0)
    expect(tempHp(5)).toBe(5)
  })
})

describe("applyDamageModifiers", () => {
  const noMods = new Set<DamageType>()

  it("immunity returns 0", () => {
    expect(applyDamageModifiers(10, "fire", new Set(["fire"]), noMods, noMods)).toBe(0)
  })

  it("resistance halves (floor)", () => {
    expect(applyDamageModifiers(7, "fire", noMods, new Set(["fire"]), noMods)).toBe(3)
  })

  it("vulnerability doubles", () => {
    expect(applyDamageModifiers(5, "fire", noMods, noMods, new Set(["fire"]))).toBe(10)
  })

  it("resistance then vulnerability applied sequentially (halve 7 = 3, double 3 = 6)", () => {
    expect(applyDamageModifiers(7, "fire", noMods, new Set(["fire"]), new Set(["fire"]))).toBe(6)
  })

  it("immunity overrides all", () => {
    expect(applyDamageModifiers(10, "fire", new Set(["fire"]), new Set(["fire"]), new Set(["fire"]))).toBe(0)
  })

  it("unrelated damage type unaffected", () => {
    expect(applyDamageModifiers(10, "cold", noMods, new Set(["fire"]), noMods)).toBe(10)
  })
})

describe("effectiveMaxHp", () => {
  it("SRD 5.2.1: returns maxHp unchanged regardless of value", () => {
    expect(effectiveMaxHp(20)).toBe(20)
    expect(effectiveMaxHp(1)).toBe(1)
    expect(effectiveMaxHp(100)).toBe(100)
  })
})

describe("damage track - basic damage", () => {
  it("starts conscious with full HP", () => {
    const a = create()
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(DEFAULT_MAX_HP)
  })

  it("reduces HP from damage", () => {
    const a = create()
    takeDamage(a, 5)
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(15)
  })

  it("drops to dying when HP reaches 0", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(0)
  })

  it("does not go below 0 HP", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP + 5)
    expect(snap(a).context.hp).toBe(0)
  })
})

describe("damage track - temp HP", () => {
  it("temp HP absorbs damage first", () => {
    const a = create()
    grantTempHp(a, 10)
    takeDamage(a, 7)
    expect(snap(a).context.tempHp).toBe(3)
    expect(snap(a).context.hp).toBe(DEFAULT_MAX_HP)
  })

  it("overflow from temp HP hits real HP", () => {
    const a = create()
    grantTempHp(a, 5)
    takeDamage(a, 12)
    expect(snap(a).context.tempHp).toBe(0)
    expect(snap(a).context.hp).toBe(13)
  })

  it("keepOld=true keeps existing temp HP", () => {
    const a = create()
    grantTempHp(a, 10)
    grantTempHp(a, 5, true)
    expect(snap(a).context.tempHp).toBe(10)
  })

  it("keepOld=false replaces temp HP", () => {
    const a = create()
    grantTempHp(a, 10)
    grantTempHp(a, 5)
    expect(snap(a).context.tempHp).toBe(5)
  })

  it("temp HP can be granted while dying", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    grantTempHp(a, 5)
    expect(snap(a).context.tempHp).toBe(5)
  })

  it("temp HP at 0 HP absorbs damage without death save failure", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    grantTempHp(a, 10)
    takeDamage(a, 5)
    expect(snap(a).context.tempHp).toBe(5)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })
})

describe("damage track - instant death", () => {
  it("instant death when overflow >= maxHp from conscious", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 20) // overflow = 10 >= maxHp(10)
    expect(isDead(snap(a))).toBe(true)
  })

  it("no instant death when overflow < maxHp", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 19) // overflow = 9 < maxHp(10)
    expect(isUnstable(snap(a))).toBe(true)
  })

  it("instant death from damage while at 0 HP", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, INSTANT_DEATH_HP) // go to 0
    takeDamage(a, INSTANT_DEATH_HP) // overflow >= maxHp from 0
    expect(isDead(snap(a))).toBe(true)
  })
})

describe("damage track - death saves", () => {
  function createDying() {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    return a
  }

  it("success on >= 10", () => {
    const a = createDying()
    deathSave(a, 10)
    expect(snap(a).context.deathSaves.successes).toBe(1)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })

  it("failure on < 10", () => {
    const a = createDying()
    deathSave(a, 9)
    expect(snap(a).context.deathSaves.failures).toBe(1)
    expect(snap(a).context.deathSaves.successes).toBe(0)
  })

  it("3 successes -> stable", () => {
    const a = createDying()
    deathSave(a, 10)
    deathSave(a, 15)
    deathSave(a, 12)
    expect(isStable(snap(a))).toBe(true)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })

  it("3 failures -> dead", () => {
    const a = createDying()
    deathSave(a, 5)
    deathSave(a, 3)
    deathSave(a, 8)
    expect(isDead(snap(a))).toBe(true)
  })

  it("nat 1 = +2 failures", () => {
    const a = createDying()
    deathSave(a, 1)
    expect(snap(a).context.deathSaves.failures).toBe(2)
  })

  it("nat 1 can cause death (existing 1 failure + 2 = 3)", () => {
    const a = createDying()
    deathSave(a, 5) // 1 failure
    deathSave(a, 1) // +2 = 3 failures
    expect(isDead(snap(a))).toBe(true)
  })

  it("nat 20 = regain 1 HP and consciousness", () => {
    const a = createDying()
    deathSave(a, 20)
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(1)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })

  it("nat 20 resets existing death saves", () => {
    const a = createDying()
    deathSave(a, 5) // 1 failure
    deathSave(a, 15) // 1 success
    deathSave(a, 20) // nat 20
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })
})

describe("damage track - damage at 0 HP", () => {
  function createDying() {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    return a
  }

  it("damage at 0 HP adds 1 death save failure", () => {
    const a = createDying()
    takeDamage(a, 5)
    expect(snap(a).context.deathSaves.failures).toBe(1)
  })

  it("critical damage at 0 HP adds 2 death save failures", () => {
    const a = createDying()
    takeDamage(a, 5, { isCritical: true })
    expect(snap(a).context.deathSaves.failures).toBe(2)
  })

  it("3 failures from damage -> dead", () => {
    const a = createDying()
    takeDamage(a, 5) // 1
    takeDamage(a, 5) // 2
    takeDamage(a, 5) // 3
    expect(isDead(snap(a))).toBe(true)
  })

  it("damage while stable loses stability and adds failure", () => {
    const a = createDying()
    stabilize(a)
    expect(isStable(snap(a))).toBe(true)
    takeDamage(a, 5)
    expect(isUnstable(snap(a))).toBe(true)
    expect(snap(a).context.deathSaves.failures).toBe(1)
  })
})

describe("damage track - healing", () => {
  it("heal caps at maxHp", () => {
    const a = create()
    takeDamage(a, 5)
    heal(a, 100)
    expect(snap(a).context.hp).toBe(DEFAULT_MAX_HP)
  })

  it("heal at 0 HP restores consciousness", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    heal(a, 5)
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(5)
  })

  it("heal at 0 HP resets death saves", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    deathSave(a, 5) // 1 failure
    heal(a, 5)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })

  it("heal stable creature restores consciousness", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    stabilize(a)
    heal(a, 3)
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(3)
  })
})

describe("damage track - stabilize", () => {
  it("stabilize transitions to stable and resets death saves", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    deathSave(a, 5)
    stabilize(a)
    expect(isStable(snap(a))).toBe(true)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })
})

describe("damage track - knock out", () => {
  it("knock out sets HP to 1, stays alive, unconscious+prone", () => {
    const a = create()
    knockOut(a)
    expect(isAlive(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(1)
    expect(snap(a).context.unconscious).toBe(true)
    expect(snap(a).context.prone).toBe(true)
  })
})

describe("damage track - dead absorbing", () => {
  it("dead state ignores TAKE_DAMAGE", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 20)
    expect(isDead(snap(a))).toBe(true)
    takeDamage(a, 5)
    expect(isDead(snap(a))).toBe(true)
  })

  it("dead state ignores HEAL", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 20)
    heal(a, 10)
    expect(isDead(snap(a))).toBe(true)
  })

  it("dead state ignores DEATH_SAVE", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 20)
    deathSave(a, 20)
    expect(isDead(snap(a))).toBe(true)
  })

  it("dead state ignores STABILIZE", () => {
    const a = create(INSTANT_DEATH_HP)
    takeDamage(a, 20)
    stabilize(a)
    expect(isDead(snap(a))).toBe(true)
  })
})

describe("damage track - resistance/vulnerability interaction", () => {
  it("resistance then vulnerability sequential (halve 7 = 3, double 3 = 6)", () => {
    const a = create()
    takeDamage(a, 7, {
      damageType: "fire",
      resistances: new Set<DamageType>(["fire"]),
      vulnerabilities: new Set<DamageType>(["fire"])
    })
    expect(snap(a).context.hp).toBe(14) // 20 - 6 = 14
  })

  it("immunity blocks all damage regardless of vulnerability", () => {
    const a = create()
    takeDamage(a, 10, {
      damageType: "fire",
      immunities: new Set<DamageType>(["fire"]),
      vulnerabilities: new Set<DamageType>(["fire"])
    })
    expect(snap(a).context.hp).toBe(DEFAULT_MAX_HP)
  })
})

// ============================================================
// Phase 2: Conditions + Exhaustion
// ============================================================

describe("condition implications - incapacitated tracking", () => {
  it("APPLY_CONDITION(paralyzed) sets incapacitated", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    expect(ctx(a).paralyzed).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
    expect(ctx(a).incapacitatedSources.has("paralyzed")).toBe(true)
  })

  it("REMOVE_CONDITION(paralyzed) while stunned -> incapacitated remains", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    applyCondition(a, "stunned")
    expect(isIncapacitated(ctx(a))).toBe(true)
    removeCondition(a, "paralyzed")
    expect(ctx(a).paralyzed).toBe(false)
    expect(ctx(a).stunned).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
  })

  it("removing all incap parents clears incapacitated", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    applyCondition(a, "stunned")
    removeCondition(a, "paralyzed")
    removeCondition(a, "stunned")
    expect(isIncapacitated(ctx(a))).toBe(false)
  })

  it("petrified implies incapacitated", () => {
    const a = create()
    applyCondition(a, "petrified")
    expect(ctx(a).petrified).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
  })

  it("direct incapacitated via APPLY_CONDITION(incapacitated)", () => {
    const a = create()
    applyCondition(a, "incapacitated")
    expect(isIncapacitated(ctx(a))).toBe(true)
    expect(ctx(a).incapacitatedSources.has("direct")).toBe(true)
  })

  it("remove direct incapacitated", () => {
    const a = create()
    applyCondition(a, "incapacitated")
    removeCondition(a, "incapacitated")
    expect(isIncapacitated(ctx(a))).toBe(false)
  })
})

describe("condition implications - unconscious", () => {
  it("unconscious implies incapacitated AND prone", () => {
    const a = create()
    applyCondition(a, "unconscious")
    expect(ctx(a).unconscious).toBe(true)
    expect(ctx(a).prone).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
  })

  it("removing unconscious does NOT remove prone", () => {
    const a = create()
    applyCondition(a, "unconscious")
    removeCondition(a, "unconscious")
    expect(ctx(a).unconscious).toBe(false)
    expect(ctx(a).prone).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(false)
  })

  it("dropping to 0 HP sets unconscious and prone", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(true)
    expect(ctx(a).prone).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
  })

  it("healing from 0 HP clears unconscious but NOT prone", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    heal(a, 5)
    expect(isAlive(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(false)
    expect(ctx(a).prone).toBe(true)
  })

  it("nat 20 death save clears unconscious", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    deathSave(a, 20)
    expect(isAlive(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(false)
    expect(ctx(a).prone).toBe(true)
  })

  it("KNOCK_OUT sets unconscious and prone", () => {
    const a = create()
    knockOut(a)
    expect(isAlive(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(true)
    expect(ctx(a).prone).toBe(true)
    expect(isIncapacitated(ctx(a))).toBe(true)
  })
})

describe("condition - petrified blocks poisoned", () => {
  it("applying poisoned while petrified does nothing", () => {
    const a = create()
    applyCondition(a, "petrified")
    applyCondition(a, "poisoned")
    expect(ctx(a).poisoned).toBe(false)
  })

  it("applying poisoned when not petrified works", () => {
    const a = create()
    applyCondition(a, "poisoned")
    expect(ctx(a).poisoned).toBe(true)
  })
})

describe("condition - simple boolean conditions", () => {
  const simpleConditions: ReadonlyArray<Condition> = [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "invisible",
    "poisoned",
    "prone",
    "restrained"
  ]

  for (const condition of simpleConditions) {
    it(`apply and remove ${condition}`, () => {
      const a = create()
      applyCondition(a, condition)
      expect(ctx(a)[condition as keyof DndContext]).toBe(true)
      removeCondition(a, condition)
      expect(ctx(a)[condition as keyof DndContext]).toBe(false)
    })
  }
})

describe("exhaustion", () => {
  it("exhaustion 6 transitions to dead", () => {
    const a = create()
    addExhaustion(a, 6)
    expect(isDead(snap(a))).toBe(true)
    expect(ctx(a).hp).toBe(0)
    expect(ctx(a).exhaustion).toBe(6)
  })

  it("incremental exhaustion to 6 causes death", () => {
    const a = create()
    for (let i = 0; i < 6; i++) {
      addExhaustion(a)
    }
    expect(isDead(snap(a))).toBe(true)
  })

  it("exhaustion 5 does not kill", () => {
    const a = create()
    addExhaustion(a, 5)
    expect(isDead(snap(a))).toBe(false)
    expect(ctx(a).exhaustion).toBe(5)
  })

  it("SRD 5.2.1: exhaustion 4 does not halve maxHp or cap HP", () => {
    const a = create()
    addExhaustion(a, 4)
    expect(effectiveMaxHp(ctx(a).maxHp)).toBe(DEFAULT_MAX_HP)
    expect(ctx(a).hp).toBe(DEFAULT_MAX_HP)
  })

  it("reduce exhaustion", () => {
    const a = create()
    addExhaustion(a, 3)
    reduceExhaustion(a, 2)
    expect(ctx(a).exhaustion).toBe(1)
  })

  it("reduce exhaustion does not go below 0", () => {
    const a = create()
    addExhaustion(a, 2)
    reduceExhaustion(a, 5)
    expect(ctx(a).exhaustion).toBe(0)
  })

  it("exhaustion 6 while dying also kills", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(isUnstable(snap(a))).toBe(true)
    addExhaustion(a, 6)
    expect(isDead(snap(a))).toBe(true)
  })

  it("dead creature stays dead after exhaustion change", () => {
    const a = create()
    addExhaustion(a, 6)
    expect(isDead(snap(a))).toBe(true)
    reduceExhaustion(a, 3)
    expect(isDead(snap(a))).toBe(true)
  })
})

describe("modifier aggregation - own attack mods", () => {
  it("blinded gives disadv on own attacks", () => {
    const a = create()
    applyCondition(a, "blinded")
    const mods = ownAttackMods(ctx(a), false)
    expect(mods.hasDisadvantage).toBe(true)
    expect(mods.hasAdvantage).toBe(false)
  })

  it("invisible gives adv on own attacks", () => {
    const a = create()
    applyCondition(a, "invisible")
    const mods = ownAttackMods(ctx(a), false)
    expect(mods.hasAdvantage).toBe(true)
  })

  it("prone gives disadv on own attacks", () => {
    const a = create()
    applyCondition(a, "prone")
    expect(ownAttackMods(ctx(a), false).hasDisadvantage).toBe(true)
  })

  it("restrained gives disadv on own attacks", () => {
    const a = create()
    applyCondition(a, "restrained")
    expect(ownAttackMods(ctx(a), false).hasDisadvantage).toBe(true)
  })

  it("poisoned gives disadv on own attacks", () => {
    const a = create()
    applyCondition(a, "poisoned")
    expect(ownAttackMods(ctx(a), false).hasDisadvantage).toBe(true)
  })

  it("exhaustion 3 gives disadv on own attacks", () => {
    const a = create()
    addExhaustion(a, 3)
    expect(ownAttackMods(ctx(a), false).hasDisadvantage).toBe(true)
  })
})

describe("modifier aggregation - defense mods", () => {
  it("blinded gives adv to attackers", () => {
    const a = create()
    applyCondition(a, "blinded")
    const mods = defenseMods(ctx(a), true)
    expect(mods.attackerAdvantage).toBe(true)
  })

  it("prone: attacker within 5ft = adv", () => {
    const a = create()
    applyCondition(a, "prone")
    expect(defenseMods(ctx(a), true).attackerAdvantage).toBe(true)
    expect(defenseMods(ctx(a), true).attackerDisadvantage).toBe(false)
  })

  it("prone: attacker beyond 5ft = disadv", () => {
    const a = create()
    applyCondition(a, "prone")
    expect(defenseMods(ctx(a), false).attackerDisadvantage).toBe(true)
    expect(defenseMods(ctx(a), false).attackerAdvantage).toBe(false)
  })

  it("auto-crit: paralyzed + attacker within 5ft", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    expect(defenseMods(ctx(a), true).autoCrit).toBe(true)
  })

  it("auto-crit: unconscious + attacker within 5ft", () => {
    const a = create()
    applyCondition(a, "unconscious")
    expect(defenseMods(ctx(a), true).autoCrit).toBe(true)
  })

  it("no auto-crit beyond 5ft", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    expect(defenseMods(ctx(a), false).autoCrit).toBe(false)
  })

  it("invisible gives disadv to attackers", () => {
    const a = create()
    applyCondition(a, "invisible")
    expect(defenseMods(ctx(a), true).attackerDisadvantage).toBe(true)
  })

  it("restrained gives adv to attackers", () => {
    const a = create()
    applyCondition(a, "restrained")
    expect(defenseMods(ctx(a), true).attackerAdvantage).toBe(true)
  })
})

describe("modifier aggregation - check mods", () => {
  it("exhaustion 1 gives disadv on ability checks", () => {
    const a = create()
    addExhaustion(a, 1)
    expect(checkMods(ctx(a), false, false, false).hasDisadvantage).toBe(true)
  })

  it("poisoned gives disadv on ability checks", () => {
    const a = create()
    applyCondition(a, "poisoned")
    expect(checkMods(ctx(a), false, false, false).hasDisadvantage).toBe(true)
  })

  it("frightened: disadv on checks only when source in LOS", () => {
    const a = create()
    applyCondition(a, "frightened")
    expect(checkMods(ctx(a), false, false, true).hasDisadvantage).toBe(true)
    expect(checkMods(ctx(a), false, false, false).hasDisadvantage).toBe(false)
  })

  it("blinded auto-fails sight-dependent checks", () => {
    const a = create()
    applyCondition(a, "blinded")
    expect(checkMods(ctx(a), true, false, false).autoFail).toBe(true)
    expect(checkMods(ctx(a), false, false, false).autoFail).toBe(false)
  })

  it("deafened auto-fails hearing-dependent checks", () => {
    const a = create()
    applyCondition(a, "deafened")
    expect(checkMods(ctx(a), false, true, false).autoFail).toBe(true)
    expect(checkMods(ctx(a), false, false, false).autoFail).toBe(false)
  })
})

describe("modifier aggregation - save mods", () => {
  it("exhaustion 3 gives disadv on saves", () => {
    const a = create()
    addExhaustion(a, 3)
    expect(saveMods(ctx(a), "con").hasDisadvantage).toBe(true)
  })

  it("restrained gives disadv on DEX saves", () => {
    const a = create()
    applyCondition(a, "restrained")
    expect(saveMods(ctx(a), "dex").hasDisadvantage).toBe(true)
    expect(saveMods(ctx(a), "str").hasDisadvantage).toBe(false)
  })

  it("paralyzed auto-fails STR/DEX saves", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    expect(saveMods(ctx(a), "str").autoFail).toBe(true)
    expect(saveMods(ctx(a), "dex").autoFail).toBe(true)
    expect(saveMods(ctx(a), "con").autoFail).toBe(false)
    expect(saveMods(ctx(a), "wis").autoFail).toBe(false)
  })

  it("unconscious auto-fails STR/DEX saves", () => {
    const a = create()
    applyCondition(a, "unconscious")
    expect(saveMods(ctx(a), "str").autoFail).toBe(true)
    expect(saveMods(ctx(a), "dex").autoFail).toBe(true)
  })
})

describe("canAct and canSpeak", () => {
  it("canAct = not incapacitated", () => {
    const a = create()
    expect(canAct(ctx(a))).toBe(true)
    applyCondition(a, "paralyzed")
    expect(canAct(ctx(a))).toBe(false)
  })

  it("canSpeak = not paralyzed/petrified/unconscious", () => {
    const a = create()
    expect(canSpeak(ctx(a))).toBe(true)

    applyCondition(a, "paralyzed")
    expect(canSpeak(ctx(a))).toBe(false)
    removeCondition(a, "paralyzed")

    applyCondition(a, "petrified")
    expect(canSpeak(ctx(a))).toBe(false)
    removeCondition(a, "petrified")

    applyCondition(a, "unconscious")
    expect(canSpeak(ctx(a))).toBe(false)
  })

  it("stunned can still speak (falteringly)", () => {
    const a = create()
    applyCondition(a, "stunned")
    expect(canSpeak(ctx(a))).toBe(true)
  })
})

describe("frightened - LOS parameterization", () => {
  it("frightened: disadv on attacks only when source in LOS", () => {
    const a = create()
    applyCondition(a, "frightened")
    expect(ownAttackMods(ctx(a), true).hasDisadvantage).toBe(true)
    expect(ownAttackMods(ctx(a), false).hasDisadvantage).toBe(false)
  })
})

// ============================================================
// Phase 3: Turn Structure + Action Economy
// ============================================================

const DEFAULT_BASE_SPEED = 30

function startTurn(
  actor: ReturnType<typeof create>,
  opts: {
    baseSpeed?: number
    armorPenalty?: number
    extraAttacks?: number
    callerSpeedModifier?: number
    isGrappling?: boolean
    grappledTargetTwoSizesSmaller?: boolean
  } = {}
) {
  const s = actor.getSnapshot()
  if (s.matches({ turnPhase: "outOfCombat" })) enterCombat(actor)
  else if (s.matches({ turnPhase: "acting" })) endTurn(actor)
  actor.send({
    type: "START_TURN",
    baseSpeed: opts.baseSpeed ?? DEFAULT_BASE_SPEED,
    armorPenalty: opts.armorPenalty ?? 0,
    extraAttacks: opts.extraAttacks ?? 0,
    callerSpeedModifier: opts.callerSpeedModifier ?? 0,
    isGrappling: opts.isGrappling ?? false,
    grappledTargetTwoSizesSmaller: opts.grappledTargetTwoSizesSmaller ?? false,
    startOfTurnEffects: []
  })
}

function enterCombat(actor: ReturnType<typeof create>) {
  actor.send({ type: "ENTER_COMBAT" })
}

function endTurn(actor: ReturnType<typeof create>) {
  actor.send({ type: "END_TURN", endOfTurnSaves: [], endOfTurnDamage: [] })
}

function useAction(actor: ReturnType<typeof create>, actionType: ActionType) {
  actor.send({ type: "USE_ACTION", actionType })
}

function useMovement(actor: ReturnType<typeof create>, feet: number, movCost = 1) {
  actor.send({ type: "USE_MOVEMENT", feet, movementCost: movCost })
}

describe("turn lifecycle - START_TURN", () => {
  it("resets movement, action/bonus/reaction flags", () => {
    const a = create()
    startTurn(a)
    expect(ctx(a).movementRemaining).toBe(DEFAULT_BASE_SPEED)
    expect(ctx(a).effectiveSpeed).toBe(DEFAULT_BASE_SPEED)
    expect(ctx(a).actionUsed).toBe(false)
    expect(ctx(a).bonusActionUsed).toBe(false)
    expect(ctx(a).reactionAvailable).toBe(true)
  })

  it("sets extra attacks from config", () => {
    const a = create()
    startTurn(a, { extraAttacks: 2 })
    expect(ctx(a).extraAttacksRemaining).toBe(2)
  })

  it("clears dodging from previous turn", () => {
    const a = create()
    startTurn(a)
    useAction(a, "dodge")
    expect(ctx(a).dodging).toBe(true)
    startTurn(a)
    expect(ctx(a).dodging).toBe(false)
  })

  it("clears disengaged from previous turn", () => {
    const a = create()
    startTurn(a)
    useAction(a, "disengage")
    expect(ctx(a).disengaged).toBe(true)
    startTurn(a)
    expect(ctx(a).disengaged).toBe(false)
  })
})

describe("combat mode separation (TA3)", () => {
  it("ENTER_COMBAT transitions outOfCombat -> waitingForTurn", () => {
    const a = create()
    expect(snap(a).matches({ turnPhase: "outOfCombat" })).toBe(true)
    enterCombat(a)
    expect(snap(a).matches({ turnPhase: "waitingForTurn" })).toBe(true)
  })

  it("EXIT_COMBAT transitions acting -> outOfCombat", () => {
    const a = create()
    startTurn(a)
    expect(snap(a).matches({ turnPhase: "acting" })).toBe(true)
    a.send({ type: "EXIT_COMBAT" })
    expect(snap(a).matches({ turnPhase: "outOfCombat" })).toBe(true)
  })

  it("EXIT_COMBAT transitions waitingForTurn -> outOfCombat", () => {
    const a = create()
    enterCombat(a)
    expect(snap(a).matches({ turnPhase: "waitingForTurn" })).toBe(true)
    a.send({ type: "EXIT_COMBAT" })
    expect(snap(a).matches({ turnPhase: "outOfCombat" })).toBe(true)
  })

  it("START_TURN ignored from outOfCombat", () => {
    const a = create()
    a.send({
      type: "START_TURN",
      baseSpeed: 30,
      armorPenalty: 0,
      extraAttacks: 0,
      callerSpeedModifier: 0,
      isGrappling: false,
      grappledTargetTwoSizesSmaller: false,
      startOfTurnEffects: []
    })
    expect(snap(a).matches({ turnPhase: "outOfCombat" })).toBe(true)
  })

  it("USE_ACTION ignored when outOfCombat", () => {
    const a = create()
    useAction(a, "dodge")
    expect(ctx(a).actionUsed).toBe(false)
  })

  it("USE_ACTION ignored when waitingForTurn", () => {
    const a = create()
    enterCombat(a)
    useAction(a, "dodge")
    expect(ctx(a).actionUsed).toBe(false)
  })

  it("SHORT_REST ignored when acting", () => {
    const a = createActor(dndMachine, { input: { maxHp: 20, hitDiceRemaining: 3 } })
    a.start()
    startTurn(a)
    takeDamage(a, 5)
    const hpBefore = ctx(a).hp
    a.send({ type: "SHORT_REST", conMod: 2, hdRolls: [4] })
    expect(ctx(a).hp).toBe(hpBefore)
  })

  it("SHORT_REST ignored when waitingForTurn", () => {
    const a = createActor(dndMachine, { input: { maxHp: 20, hitDiceRemaining: 3 } })
    a.start()
    startTurn(a)
    takeDamage(a, 5)
    endTurn(a)
    const hpBefore = ctx(a).hp
    a.send({ type: "SHORT_REST", conMod: 2, hdRolls: [4] })
    expect(ctx(a).hp).toBe(hpBefore)
  })

  it("SHORT_REST works when outOfCombat", () => {
    const a = createActor(dndMachine, { input: { maxHp: 20, hitDiceRemaining: 3 } })
    a.start()
    takeDamage(a, 5)
    a.send({ type: "SHORT_REST", conMod: 2, hdRolls: [4] })
    expect(ctx(a).hp).toBe(20)
  })
})

describe("turn - action budget", () => {
  it("at most 1 action per turn", () => {
    const a = create()
    startTurn(a)
    useAction(a, "dodge")
    expect(ctx(a).actionUsed).toBe(true)
    useAction(a, "dash")
    expect(ctx(a).dodging).toBe(true)
    expect(ctx(a).movementRemaining).toBe(DEFAULT_BASE_SPEED)
  })

  it("at most 1 bonus action per turn", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "USE_BONUS_ACTION" })
    expect(ctx(a).bonusActionUsed).toBe(true)
    a.send({ type: "USE_BONUS_ACTION" })
    expect(ctx(a).bonusActionUsed).toBe(true)
  })

  it("at most 1 reaction per round", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "USE_REACTION" })
    expect(ctx(a).reactionAvailable).toBe(false)
    a.send({ type: "USE_REACTION" })
    expect(ctx(a).reactionAvailable).toBe(false)
  })
})

describe("turn - movement", () => {
  it("movement can split (before/after action)", () => {
    const a = create()
    startTurn(a)
    useMovement(a, 10)
    expect(ctx(a).movementRemaining).toBe(20)
    useAction(a, "attack")
    useMovement(a, 15)
    expect(ctx(a).movementRemaining).toBe(5)
  })

  it("cannot exceed remaining movement", () => {
    const a = create()
    startTurn(a)
    useMovement(a, 35)
    expect(ctx(a).movementRemaining).toBe(DEFAULT_BASE_SPEED)
  })

  it("dash doubles available movement", () => {
    const a = create()
    startTurn(a)
    useAction(a, "dash")
    expect(ctx(a).movementRemaining).toBe(60)
  })
})

describe("turn - bonus action spell rule", () => {
  it("bonus action spell -> action restricted to cantrip (tracked)", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "MARK_BONUS_ACTION_SPELL" })
    expect(ctx(a).bonusActionSpellCast).toBe(true)
  })

  it("non-cantrip action spell blocks bonus action spells (tracked)", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "MARK_NON_CANTRIP_ACTION_SPELL" })
    expect(ctx(a).nonCantripActionSpellCast).toBe(true)
  })
})

describe("turn - incapacitated blocks actions", () => {
  it("incapacitated creature cannot use action", () => {
    const a = create()
    startTurn(a)
    applyCondition(a, "paralyzed")
    useAction(a, "attack")
    expect(ctx(a).actionUsed).toBe(false)
  })

  it("incapacitated creature cannot use bonus action", () => {
    const a = create()
    startTurn(a)
    applyCondition(a, "stunned")
    a.send({ type: "USE_BONUS_ACTION" })
    expect(ctx(a).bonusActionUsed).toBe(false)
  })
})

describe("turn - dodge", () => {
  it("dodge: active until next turn start", () => {
    const a = create()
    startTurn(a)
    useAction(a, "dodge")
    expect(ctx(a).dodging).toBe(true)
    startTurn(a)
    expect(ctx(a).dodging).toBe(false)
  })
})

describe("turn - standing from prone", () => {
  it("standing costs half effective speed", () => {
    const a = create()
    startTurn(a)
    applyCondition(a, "prone")
    a.send({ type: "STAND_FROM_PRONE" })
    expect(ctx(a).prone).toBe(false)
    expect(ctx(a).movementRemaining).toBe(15)
  })

  it("fails if insufficient movement", () => {
    const a = create()
    startTurn(a)
    applyCondition(a, "prone")
    useMovement(a, 20)
    a.send({ type: "STAND_FROM_PRONE" })
    expect(ctx(a).prone).toBe(true)
    expect(ctx(a).movementRemaining).toBe(10)
  })

  it("fails if effective speed is 0", () => {
    const a = create()
    applyCondition(a, "grappled")
    startTurn(a)
    applyCondition(a, "prone")
    a.send({ type: "STAND_FROM_PRONE" })
    expect(ctx(a).prone).toBe(true)
  })
})

describe("speed modifiers from conditions", () => {
  it("grappled: speed 0", () => {
    const a = create()
    applyCondition(a, "grappled")
    startTurn(a)
    expect(ctx(a).effectiveSpeed).toBe(0)
    expect(ctx(a).movementRemaining).toBe(0)
  })

  it("restrained: speed 0", () => {
    const a = create()
    applyCondition(a, "restrained")
    startTurn(a)
    expect(ctx(a).effectiveSpeed).toBe(0)
  })

  it("exhaustion 2: speed reduced by 10 (5.2.1: -5 per level)", () => {
    const a = create()
    addExhaustion(a, 2)
    startTurn(a)
    expect(ctx(a).effectiveSpeed).toBe(20)
  })

  it("exhaustion 5: speed reduced by 25 (5.2.1: -5 per level)", () => {
    const a = create()
    addExhaustion(a, 5)
    startTurn(a)
    expect(ctx(a).effectiveSpeed).toBe(5)
  })

  it("armor penalty reduces base speed", () => {
    const a = create()
    startTurn(a, { armorPenalty: 10 })
    expect(ctx(a).effectiveSpeed).toBe(20)
  })
})

describe("calculateEffectiveSpeed helper", () => {
  const baseParams = {
    baseSpeed: 30,
    armorPenalty: 0,
    grappled: false,
    restrained: false,
    exhaustion: 0,
    callerSpeedModifier: 0,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false
  }

  it("base speed with no modifiers", () => {
    expect(calculateEffectiveSpeed(baseParams)).toBe(30)
  })

  it("grappled returns 0", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, grappled: true })).toBe(0)
  })

  it("exhaustion 2: -10ft (5.2.1)", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, exhaustion: 2 })).toBe(20)
  })

  it("exhaustion 5: -25ft (5.2.1)", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, exhaustion: 5 })).toBe(5)
  })

  it("grappling halves unless target 2 sizes smaller", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, isGrappling: true })).toBe(15)
    expect(calculateEffectiveSpeed({ ...baseParams, isGrappling: true, grappledTargetTwoSizesSmaller: true })).toBe(30)
  })

  it("caller modifier adds to speed", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, callerSpeedModifier: 10 })).toBe(40)
  })

  it("speed never goes below 0", () => {
    expect(calculateEffectiveSpeed({ ...baseParams, callerSpeedModifier: -50 })).toBe(0)
  })
})

describe("movementCostMultiplier helper", () => {
  const baseParams = {
    isDifficultTerrain: false,
    isCrawling: false,
    isClimbingOrSwimming: false,
    hasRelevantSpeed: false
  }

  it("normal terrain costs 1", () => {
    expect(movementCostMultiplier(baseParams)).toBe(1)
  })

  it("difficult terrain costs 2", () => {
    expect(movementCostMultiplier({ ...baseParams, isDifficultTerrain: true })).toBe(2)
  })

  it("crawling costs 2", () => {
    expect(movementCostMultiplier({ ...baseParams, isCrawling: true })).toBe(2)
  })

  it("climbing without swim speed costs 2", () => {
    expect(movementCostMultiplier({ ...baseParams, isClimbingOrSwimming: true })).toBe(2)
  })

  it("climbing with relevant speed costs 1", () => {
    expect(movementCostMultiplier({ ...baseParams, isClimbingOrSwimming: true, hasRelevantSpeed: true })).toBe(1)
  })

  it("crawling in difficult terrain costs 3", () => {
    expect(movementCostMultiplier({ ...baseParams, isDifficultTerrain: true, isCrawling: true })).toBe(3)
  })
})

describe("turn - extra attacks", () => {
  it("can use extra attacks", () => {
    const a = create()
    startTurn(a, { extraAttacks: 2 })
    a.send({ type: "USE_EXTRA_ATTACK" })
    expect(ctx(a).extraAttacksRemaining).toBe(1)
    a.send({ type: "USE_EXTRA_ATTACK" })
    expect(ctx(a).extraAttacksRemaining).toBe(0)
  })

  it("cannot use extra attack when 0 remaining", () => {
    const a = create()
    startTurn(a, { extraAttacks: 0 })
    a.send({ type: "USE_EXTRA_ATTACK" })
    expect(ctx(a).extraAttacksRemaining).toBe(0)
  })
})

// ============================================================
// Phase 4: Attack Resolution + Combat Actions
// ============================================================

describe("resolveAttackRoll", () => {
  it("nat 20 always hits regardless of AC", () => {
    const result = resolveAttackRoll(20, 0, 100, 0)
    expect(result.hits).toBe(true)
    expect(result.isCritical).toBe(true)
  })

  it("nat 1 always misses regardless of bonuses", () => {
    const result = resolveAttackRoll(1, 100, 5, 0)
    expect(result.hits).toBe(false)
    expect(result.isCritical).toBe(false)
  })

  it("normal roll vs AC comparison", () => {
    expect(resolveAttackRoll(10, 5, 15, 0).hits).toBe(true)
    expect(resolveAttackRoll(10, 4, 15, 0).hits).toBe(false)
  })

  it("cover bonus adds to AC", () => {
    expect(resolveAttackRoll(10, 5, 14, 2).hits).toBe(false)
    expect(resolveAttackRoll(10, 6, 14, 2).hits).toBe(true)
  })
})

describe("damage calculation", () => {
  it("normal damage = dice + modifier", () => {
    expect(normalDamage(8, 3)).toBe(11)
  })

  it("critical hit doubles dice only, not flat modifiers", () => {
    expect(criticalDamage(8, 8, 3)).toBe(19)
    expect(criticalDamage(6, 6, 5)).toBe(17)
  })
})

describe("resolveAdvantage", () => {
  it("adv + disadv cancel to neither", () => {
    const result = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    expect(result.hasAdvantage).toBe(false)
    expect(result.hasDisadvantage).toBe(false)
  })

  it("only advantage preserved", () => {
    const result = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    expect(result.hasAdvantage).toBe(true)
  })
})

describe("coverBonus", () => {
  it("half cover +2", () => {
    expect(coverBonus("half")).toBe(2)
  })

  it("three-quarters cover +5", () => {
    expect(coverBonus("threeQuarters")).toBe(5)
  })

  it("total cover = 0 (can't target)", () => {
    expect(coverBonus("total")).toBe(0)
  })

  it("no cover = 0", () => {
    expect(coverBonus("none")).toBe(0)
  })
})

describe("calculateAC", () => {
  const unarmored: ArmorState = { type: "unarmored" }
  const baseParams = {
    armorState: unarmored,
    dexMod: 2,
    hasShield: false,
    unarmoredDef: "none" as const,
    conMod: 0,
    wisMod: 0
  }

  it("no armor: 10 + DEX", () => {
    expect(calculateAC(baseParams)).toBe(12)
  })

  it("light armor: base + DEX", () => {
    const studded: ArmorState = {
      type: "wearingArmor",
      armor: { category: "light", baseAC: 12, strRequirement: 0, stealthDisadvantage: false }
    }
    expect(calculateAC({ ...baseParams, armorState: studded })).toBe(14)
  })

  it("medium armor: base + min(DEX, 2)", () => {
    const breastplate: ArmorState = {
      type: "wearingArmor",
      armor: { category: "medium", baseAC: 14, strRequirement: 0, stealthDisadvantage: false }
    }
    expect(calculateAC({ ...baseParams, armorState: breastplate, dexMod: 4 })).toBe(16)
  })

  it("heavy armor: base only, no DEX", () => {
    const plate: ArmorState = {
      type: "wearingArmor",
      armor: { category: "heavy", baseAC: 18, strRequirement: 15, stealthDisadvantage: true }
    }
    expect(calculateAC({ ...baseParams, armorState: plate, dexMod: 5 })).toBe(18)
  })

  it("shield adds +2", () => {
    expect(calculateAC({ ...baseParams, hasShield: true })).toBe(14)
  })

  it("barbarian unarmored defense: 10 + DEX + CON", () => {
    expect(calculateAC({ ...baseParams, unarmoredDef: "barbarian", conMod: 3 })).toBe(15)
  })

  it("monk unarmored defense: 10 + DEX + WIS", () => {
    expect(calculateAC({ ...baseParams, unarmoredDef: "monk", wisMod: 2 })).toBe(14)
  })
})

describe("grapple", () => {
  it("grapple succeeds: target save failed", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    expect(ctx(a).grappled).toBe(true)
  })

  it("grapple fails: target save succeeded", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: false,
      attackerHasFreeHand: true
    })
    expect(ctx(a).grappled).toBe(false)
  })

  it("grapple fails: target > 1 size larger", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "small",
      targetSize: "large",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    expect(ctx(a).grappled).toBe(false)
  })

  it("grapple fails: no free hand", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: false
    })
    expect(ctx(a).grappled).toBe(false)
  })

  it("grapple auto-success if incapacitated", () => {
    const a = create()
    applyCondition(a, "paralyzed")
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: false,
      attackerHasFreeHand: true
    })
    expect(ctx(a).grappled).toBe(true)
  })

  it("release grapple", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    a.send({ type: "RELEASE_GRAPPLE" })
    expect(ctx(a).grappled).toBe(false)
  })

  it("escape grapple: target succeeds", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    a.send({ type: "ESCAPE_GRAPPLE", escapeSucceeded: true })
    expect(ctx(a).grappled).toBe(false)
  })

  it("escape grapple: target fails keeps grapple", () => {
    const a = create()
    a.send({
      type: "GRAPPLE",
      attackerSize: "medium",
      targetSize: "medium",
      targetSaveFailed: true,
      attackerHasFreeHand: true
    })
    a.send({ type: "ESCAPE_GRAPPLE", escapeSucceeded: false })
    expect(ctx(a).grappled).toBe(true)
  })
})

describe("shove", () => {
  it("shove prone: success", () => {
    const a = create()
    a.send({ type: "SHOVE", attackerSize: "medium", targetSize: "medium", targetSaveFailed: true, choice: "prone" })
    expect(ctx(a).prone).toBe(true)
  })

  it("shove push: no state change (caller handles)", () => {
    const a = create()
    a.send({ type: "SHOVE", attackerSize: "medium", targetSize: "medium", targetSaveFailed: true, choice: "push" })
    expect(ctx(a).prone).toBe(false)
  })

  it("shove fails: target too large", () => {
    const a = create()
    a.send({ type: "SHOVE", attackerSize: "small", targetSize: "large", targetSaveFailed: true, choice: "prone" })
    expect(ctx(a).prone).toBe(false)
  })
})

describe("withinOneSize", () => {
  it("same size allowed", () => {
    expect(withinOneSize("medium", "medium")).toBe(true)
  })

  it("one size larger allowed", () => {
    expect(withinOneSize("medium", "large")).toBe(true)
  })

  it("two sizes larger not allowed", () => {
    expect(withinOneSize("medium", "huge")).toBe(false)
  })

  it("smaller target always allowed", () => {
    expect(withinOneSize("large", "small")).toBe(true)
  })
})

describe("aggregateAttackMods", () => {
  const baseCtx: AttackContext = {
    attackerBlinded: false,
    attackerCanSeeTarget: true,
    attackerExhaustion: 0,
    attackerFrightSourceInLOS: false,
    attackerFrightened: false,
    attackerHasSwimSpeed: false,
    attackerPoisoned: false,
    attackerProne: false,
    attackerRestrained: false,
    attackerWithin5ft: true,
    beyondNormalRange: false,
    hostileWithin5ft: false,
    isHeavyWeapon: false,
    isRangedAttack: false,
    isUnderwaterMeleeException: false,
    isUnderwaterRangedException: false,
    targetBlinded: false,
    targetCanSeeAttacker: true,
    targetDodging: false,
    targetParalyzed: false,
    targetPetrified: false,
    targetProne: false,
    targetRestrained: false,
    targetStunned: false,
    targetUnconscious: false,
    underwater: false,
    wielderSizeSmallOrTiny: false
  }

  it("no conditions: no mods", () => {
    const r = aggregateAttackMods(baseCtx)
    expect(r.hasAdvantage).toBe(false)
    expect(r.hasDisadvantage).toBe(false)
    expect(r.autoCrit).toBe(false)
    expect(r.autoMiss).toBe(false)
  })

  it("target blinded: advantage", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetBlinded: true }).hasAdvantage).toBe(true)
  })

  it("attacker blinded: disadvantage", () => {
    expect(aggregateAttackMods({ ...baseCtx, attackerBlinded: true }).hasDisadvantage).toBe(true)
  })

  it("adv + disadv cancel", () => {
    const r = aggregateAttackMods({ ...baseCtx, targetBlinded: true, attackerBlinded: true })
    expect(r.hasAdvantage).toBe(false)
    expect(r.hasDisadvantage).toBe(false)
  })

  it("target dodging and can see attacker: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetDodging: true }).hasDisadvantage).toBe(true)
  })

  it("auto-crit: paralyzed + within 5ft", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetParalyzed: true }).autoCrit).toBe(true)
  })

  it("auto-crit: unconscious + within 5ft", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetUnconscious: true }).autoCrit).toBe(true)
  })

  it("no auto-crit: paralyzed but beyond 5ft", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetParalyzed: true, attackerWithin5ft: false }).autoCrit).toBe(false)
  })

  it("underwater ranged beyond normal: auto-miss", () => {
    expect(
      aggregateAttackMods({ ...baseCtx, underwater: true, isRangedAttack: true, beyondNormalRange: true }).autoMiss
    ).toBe(true)
  })

  it("heavy weapon + small creature: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, isHeavyWeapon: true, wielderSizeSmallOrTiny: true }).hasDisadvantage).toBe(
      true
    )
  })

  it("underwater melee without swim speed: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, underwater: true }).hasDisadvantage).toBe(true)
  })

  it("underwater melee with swim speed: no disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, underwater: true, attackerHasSwimSpeed: true }).hasDisadvantage).toBe(
      false
    )
  })

  it("unseen attacker: advantage", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetCanSeeAttacker: false }).hasAdvantage).toBe(true)
  })
})

// ============================================================
// Phase 5: Spellcasting + Rest
// ============================================================

function isConcentrating(s: DndSnapshot) {
  return s.matches({ spellcasting: "concentrating" })
}

function isSpellIdle(s: DndSnapshot) {
  return s.matches({ spellcasting: "idle" })
}

describe("concentration", () => {
  it("at most one concentration spell active", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    expect(isConcentrating(snap(a))).toBe(true)
    expect(ctx(a).concentrationSpellId).toBe("bless")
  })

  it("new concentration spell replaces old", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    a.send({ type: "START_CONCENTRATION", spellId: "haste", durationTurns: 10, expiresAt: "end" })
    expect(ctx(a).concentrationSpellId).toBe("haste")
    expect(isConcentrating(snap(a))).toBe(true)
  })

  it("break concentration explicitly", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    a.send({ type: "BREAK_CONCENTRATION" })
    expect(ctx(a).concentrationSpellId).toBe("")
    expect(isSpellIdle(snap(a))).toBe(true)
  })

  it("damage does not auto-break concentration (needs Con save)", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    takeDamage(a, 5)
    expect(ctx(a).concentrationSpellId).toBe("bless")
    expect(isConcentrating(snap(a))).toBe(true)
  })

  it("temp HP absorption does not auto-break concentration", () => {
    const a = create()
    grantTempHp(a, 10)
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    takeDamage(a, 5)
    expect(ctx(a).concentrationSpellId).toBe("bless")
    expect(isConcentrating(snap(a))).toBe(true)
  })

  it("dropping to 0 HP breaks concentration (incapacitation)", () => {
    const a = create(20)
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    takeDamage(a, 20)
    expect(isUnstable(snap(a))).toBe(true)
    expect(ctx(a).concentrationSpellId).toBe("")
    expect(isSpellIdle(snap(a))).toBe(true)
  })

  it("concentration check: save succeeded keeps concentration", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    a.send({ type: "CONCENTRATION_CHECK", conSaveSucceeded: true })
    expect(ctx(a).concentrationSpellId).toBe("bless")
    expect(isConcentrating(snap(a))).toBe(true)
  })

  it("concentration check: save failed breaks concentration", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    a.send({ type: "CONCENTRATION_CHECK", conSaveSucceeded: false })
    expect(ctx(a).concentrationSpellId).toBe("")
    expect(isSpellIdle(snap(a))).toBe(true)
  })

  it("concentration broken by incapacitation", () => {
    const a = create()
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    applyCondition(a, "paralyzed")
    expect(ctx(a).concentrationSpellId).toBe("")
    expect(isSpellIdle(snap(a))).toBe(true)
  })

  it("concentration broken by death", () => {
    const a = create(10)
    a.send({ type: "START_CONCENTRATION", spellId: "bless", durationTurns: 10, expiresAt: "end" })
    takeDamage(a, 20)
    expect(isDead(snap(a))).toBe(true)
    expect(ctx(a).concentrationSpellId).toBe("")
  })
})

describe("concentrationDC helper", () => {
  it("DC = max(10, floor(damage/2))", () => {
    expect(concentrationDC(10)).toBe(10)
    expect(concentrationDC(20)).toBe(10)
    expect(concentrationDC(22)).toBe(11)
    expect(concentrationDC(30)).toBe(15)
  })
})

describe("spell slot expenditure", () => {
  it("expend slot from 0 is no-op", () => {
    const a = create()
    expect(ctx(a).slotsCurrent).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
    a.send({ type: "EXPEND_SLOT", level: 1 })
    expect(ctx(a).slotsCurrent[0]).toBe(0)
  })

  it("expend pact slot deducts", () => {
    const a = create()
    a.send({ type: "EXPEND_PACT_SLOT" })
    // pactSlotsCurrent starts at 0, so no change
    expect(ctx(a).pactSlotsCurrent).toBe(0)
  })
})

describe("short rest", () => {
  it("spend hit dice: roll + CON mod, min 0", () => {
    const a = create()
    takeDamage(a, 15)
    // Can't spend HD when hitDiceRemaining is 0
    a.send({ type: "SHORT_REST", conMod: 2, hdRolls: [5, 3] })
    expect(ctx(a).hp).toBe(5)
  })

  it("short rest restores pact slots", () => {
    const a = create()
    a.send({ type: "SHORT_REST", conMod: 0, hdRolls: [] })
    // pactSlotsMax is 0, so pactSlotsCurrent restored to 0
    expect(ctx(a).pactSlotsCurrent).toBe(0)
  })
})

describe("long rest", () => {
  it("restores full HP", () => {
    const a = create()
    takeDamage(a, 15)
    a.send({ type: "LONG_REST", totalHitDice: 5 })
    expect(ctx(a).hp).toBe(DEFAULT_MAX_HP)
  })

  it("reduces exhaustion by 1 unconditionally (SRD 5.2.1)", () => {
    const a = create()
    addExhaustion(a, 3)
    a.send({ type: "LONG_REST", totalHitDice: 5 })
    expect(ctx(a).exhaustion).toBe(2)
  })

  it("restores spell slots to max", () => {
    const a = create()
    a.send({ type: "LONG_REST", totalHitDice: 5 })
    expect(ctx(a).slotsCurrent).toEqual(ctx(a).slotsMax)
  })

  it("clears temp HP", () => {
    const a = create()
    grantTempHp(a, 10)
    a.send({ type: "LONG_REST", totalHitDice: 5 })
    expect(ctx(a).tempHp).toBe(0)
  })

  it("requires >= 1 HP", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    expect(ctx(a).hp).toBe(0)
    const hpBefore = ctx(a).hp
    a.send({ type: "LONG_REST", totalHitDice: 5 })
    expect(ctx(a).hp).toBe(hpBefore)
  })

  it("restores all spent hit dice (SRD 5.2.1)", () => {
    const a = createActor(dndMachine, { input: { maxHp: DEFAULT_MAX_HP, hitDiceRemaining: 2 } })
    a.start()
    a.send({ type: "LONG_REST", totalHitDice: 8 })
    expect(ctx(a).hitDiceRemaining).toBe(8)
  })
})

describe("multiclass slot calculation", () => {
  it("single full caster level 5", () => {
    const slots = calculateMulticlassSlots([{ type: "full", level: 5 }])
    expect(slots[0]).toBe(4)
    expect(slots[1]).toBe(3)
    expect(slots[2]).toBe(2)
    expect(slots[3]).toBe(0)
  })

  it("half + full caster combo", () => {
    const slots = calculateMulticlassSlots([
      { type: "full", level: 5 },
      { type: "half", level: 4 }
    ])
    // casterLevel = 5 + 2 = 7
    expect(slots[0]).toBe(4)
    expect(slots[1]).toBe(3)
    expect(slots[2]).toBe(3)
    expect(slots[3]).toBe(1)
  })

  it("third caster level 3 = caster level 1", () => {
    const slots = calculateMulticlassSlots([{ type: "third", level: 3 }])
    expect(slots[0]).toBe(2)
    expect(slots[1]).toBe(0)
  })

  it("no caster levels returns empty", () => {
    const slots = calculateMulticlassSlots([])
    expect(slots).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})

// ============================================================
// Phase 6: Environmental + Equipment Events
// ============================================================

describe("fall damage", () => {
  it("fallDamageDice: correct d6 count", () => {
    expect(fallDamageDice(10)).toBe(1)
    expect(fallDamageDice(50)).toBe(5)
    expect(fallDamageDice(200)).toBe(20)
    expect(fallDamageDice(300)).toBe(20)
  })

  it("fall: apply damage and land prone", () => {
    const a = create()
    a.send({
      type: "APPLY_FALL",
      damageRoll: 10,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set()
    })
    expect(ctx(a).hp).toBe(10)
    expect(ctx(a).prone).toBe(true)
  })

  it("fall: no damage = no prone", () => {
    const a = create()
    a.send({
      type: "APPLY_FALL",
      damageRoll: 0,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set()
    })
    expect(ctx(a).hp).toBe(DEFAULT_MAX_HP)
    expect(ctx(a).prone).toBe(false)
  })

  it("fall: immune to bludgeoning = no prone", () => {
    const a = create()
    a.send({
      type: "APPLY_FALL",
      damageRoll: 10,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(["bludgeoning" as const])
    })
    expect(ctx(a).hp).toBe(DEFAULT_MAX_HP)
    expect(ctx(a).prone).toBe(false)
  })
})

describe("suffocation", () => {
  it("suffocate -> 0 HP + unconscious", () => {
    const a = create()
    a.send({ type: "SUFFOCATE" })
    expect(ctx(a).hp).toBe(0)
    expect(ctx(a).unconscious).toBe(true)
    expect(ctx(a).prone).toBe(true)
  })

  it("suffocate at 0 HP does nothing", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    const before = ctx(a)
    a.send({ type: "SUFFOCATE" })
    expect(ctx(a).hp).toBe(before.hp)
  })
})

describe("starvation", () => {
  it("adds 1 exhaustion", () => {
    const a = create()
    a.send({ type: "APPLY_STARVATION" })
    expect(ctx(a).exhaustion).toBe(1)
  })

  it("stacks exhaustion", () => {
    const a = create()
    a.send({ type: "APPLY_STARVATION" })
    a.send({ type: "APPLY_STARVATION" })
    expect(ctx(a).exhaustion).toBe(2)
  })
})

describe("dehydration", () => {
  it("already exhausted -> 2 levels", () => {
    const a = create()
    addExhaustion(a, 1)
    a.send({ type: "APPLY_DEHYDRATION", halfWater: false, conSaveSucceeded: false })
    expect(ctx(a).exhaustion).toBe(3)
  })

  it("not exhausted -> 1 level", () => {
    const a = create()
    a.send({ type: "APPLY_DEHYDRATION", halfWater: false, conSaveSucceeded: false })
    expect(ctx(a).exhaustion).toBe(1)
  })

  it("half water + save succeeded = no exhaustion", () => {
    const a = create()
    a.send({ type: "APPLY_DEHYDRATION", halfWater: true, conSaveSucceeded: true })
    expect(ctx(a).exhaustion).toBe(0)
  })

  it("half water + save failed = exhaustion", () => {
    const a = create()
    a.send({ type: "APPLY_DEHYDRATION", halfWater: true, conSaveSucceeded: false })
    expect(ctx(a).exhaustion).toBe(1)
  })
})

describe("dehydrationLevels helper", () => {
  it("half water + save pass = 0", () => {
    expect(dehydrationLevels(0, true, true)).toBe(0)
  })

  it("already exhausted = 2", () => {
    expect(dehydrationLevels(1, false, false)).toBe(2)
  })

  it("not exhausted = 1", () => {
    expect(dehydrationLevels(0, false, false)).toBe(1)
  })
})

// ============================================================
// Coverage: uncovered branches
// ============================================================

describe("slotsPerLevel", () => {
  it("invalid spell level returns 0", () => {
    expect(slotsPerLevel(10, 0)).toBe(0)
    expect(slotsPerLevel(10, 10)).toBe(0)
  })
  it("level 1 slots scale with caster level", () => {
    expect(slotsPerLevel(0, 1)).toBe(0)
    expect(slotsPerLevel(1, 1)).toBe(2)
    expect(slotsPerLevel(2, 1)).toBe(3)
    expect(slotsPerLevel(3, 1)).toBe(4)
  })
  it("level 2 slots scale with caster level", () => {
    expect(slotsPerLevel(2, 2)).toBe(0)
    expect(slotsPerLevel(3, 2)).toBe(2)
    expect(slotsPerLevel(4, 2)).toBe(3)
  })
  it("level 3 slots", () => {
    expect(slotsPerLevel(4, 3)).toBe(0)
    expect(slotsPerLevel(5, 3)).toBe(2)
    expect(slotsPerLevel(6, 3)).toBe(3)
  })
  it("level 4 slots", () => {
    expect(slotsPerLevel(6, 4)).toBe(0)
    expect(slotsPerLevel(7, 4)).toBe(1)
    expect(slotsPerLevel(8, 4)).toBe(2)
    expect(slotsPerLevel(9, 4)).toBe(3)
  })
  it("level 5 slots", () => {
    expect(slotsPerLevel(8, 5)).toBe(0)
    expect(slotsPerLevel(9, 5)).toBe(1)
    expect(slotsPerLevel(10, 5)).toBe(2)
    expect(slotsPerLevel(18, 5)).toBe(3)
  })
  it("level 6-9 slots", () => {
    expect(slotsPerLevel(10, 6)).toBe(0)
    expect(slotsPerLevel(11, 6)).toBe(1)
    expect(slotsPerLevel(19, 6)).toBe(2)
    expect(slotsPerLevel(12, 7)).toBe(0)
    expect(slotsPerLevel(13, 7)).toBe(1)
    expect(slotsPerLevel(20, 7)).toBe(2)
    expect(slotsPerLevel(14, 8)).toBe(0)
    expect(slotsPerLevel(15, 8)).toBe(1)
    expect(slotsPerLevel(16, 9)).toBe(0)
    expect(slotsPerLevel(17, 9)).toBe(1)
  })
})

describe("armorSpeedPenalty", () => {
  const HEAVY_PENALTY = 10
  it("penalty when STR below requirement", () => {
    expect(armorSpeedPenalty(15, 10)).toBe(HEAVY_PENALTY)
  })
  it("no penalty when STR meets requirement", () => {
    expect(armorSpeedPenalty(15, 15)).toBe(0)
  })
  it("no penalty when no requirement", () => {
    expect(armorSpeedPenalty(0, 8)).toBe(0)
  })
})

describe("aggregateAttackMods additional branches", () => {
  const baseCtx: AttackContext = {
    attackerBlinded: false,
    attackerCanSeeTarget: true,
    attackerExhaustion: 0,
    attackerFrightSourceInLOS: false,
    attackerFrightened: false,
    attackerHasSwimSpeed: false,
    attackerPoisoned: false,
    attackerProne: false,
    attackerRestrained: false,
    attackerWithin5ft: true,
    beyondNormalRange: false,
    hostileWithin5ft: false,
    isHeavyWeapon: false,
    isRangedAttack: false,
    isUnderwaterMeleeException: false,
    isUnderwaterRangedException: false,
    targetBlinded: false,
    targetCanSeeAttacker: true,
    targetDodging: false,
    targetParalyzed: false,
    targetPetrified: false,
    targetProne: false,
    targetRestrained: false,
    targetStunned: false,
    targetUnconscious: false,
    underwater: false,
    wielderSizeSmallOrTiny: false
  }

  it("frightened + source in LOS: disadv", () => {
    expect(
      aggregateAttackMods({ ...baseCtx, attackerFrightened: true, attackerFrightSourceInLOS: true }).hasDisadvantage
    ).toBe(true)
  })
  it("target prone + beyond 5ft: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, targetProne: true, attackerWithin5ft: false }).hasDisadvantage).toBe(true)
  })
  it("ranged + hostile within 5ft: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, isRangedAttack: true, hostileWithin5ft: true }).hasDisadvantage).toBe(true)
  })
  it("underwater ranged within normal range: disadv", () => {
    expect(aggregateAttackMods({ ...baseCtx, underwater: true, isRangedAttack: true }).hasDisadvantage).toBe(true)
  })
})

describe("branded type clamping", () => {
  it("abilityScore clamps high", () => {
    expect(abilityScore(40)).toBe(30)
  })
  it("abilityScore clamps low", () => {
    expect(abilityScore(0)).toBe(1)
  })
  it("proficiencyBonus clamps high", () => {
    expect(proficiencyBonus(8)).toBe(6)
  })
  it("proficiencyBonus clamps low", () => {
    expect(proficiencyBonus(1)).toBe(2)
  })
})

describe("expendSlot helper", () => {
  it("deducts one slot at given level", () => {
    const slots = [2, 1, 0, 0, 0, 0, 0, 0, 0]
    const result = expendSlot(slots, 1)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(1)
  })
})

describe("machine action edge cases", () => {
  it("stand from prone fails with insufficient movement", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "DROP_PRONE" })
    expect(ctx(a).prone).toBe(true)
    // Consume almost all movement, leave only 4 (need 15 to stand at speed 30)
    a.send({ type: "USE_MOVEMENT", feet: 26, movementCost: 1 })
    expect(ctx(a).movementRemaining).toBe(4)
    a.send({ type: "STAND_FROM_PRONE" })
    expect(ctx(a).prone).toBe(true) // still prone
  })

  it("expend pact slot with 0 remaining is no-op", () => {
    const a = create()
    expect(ctx(a).pactSlotsCurrent).toBe(0)
    a.send({ type: "EXPEND_PACT_SLOT" })
    expect(ctx(a).pactSlotsCurrent).toBe(0)
  })

  it("spend hit die with 0 remaining is no-op", () => {
    const a = createActor(dndMachine, { input: { maxHp: DEFAULT_MAX_HP, hitDiceRemaining: 0 } })
    a.start()
    a.send({ type: "SPEND_HIT_DIE", conMod: 2, dieRoll: 4 })
    expect(ctx(a).hp).toBe(DEFAULT_MAX_HP) // unchanged
  })

  it("fall instant death from conscious", () => {
    const a = create(INSTANT_DEATH_HP)
    a.send({
      type: "APPLY_FALL",
      damageRoll: 25,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set()
    })
    expect(isDead(snap(a))).toBe(true)
  })

  it("use action: ready", () => {
    const a = create()
    startTurn(a)
    a.send({ type: "USE_ACTION", actionType: "ready" as ActionType })
    expect(ctx(a).readiedAction).toBe(true)
    expect(ctx(a).actionUsed).toBe(true)
  })

  it("fall at 0 HP with temp HP fully absorbing damage", () => {
    const a = create()
    // Drop to 0 HP
    a.send({
      type: "TAKE_DAMAGE",
      amount: DEFAULT_MAX_HP,
      damageType: "bludgeoning" as DamageType,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false
    })
    expect(ctx(a).hp).toBe(0)
    // Grant temp HP while dying
    a.send({ type: "GRANT_TEMP_HP", amount: tempHp(15), keepOld: false })
    expect(ctx(a).tempHp).toBe(15)
    // Fall for 5 damage — fully absorbed by temp HP
    a.send({
      type: "APPLY_FALL",
      damageRoll: 5,
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set()
    })
    expect(ctx(a).tempHp).toBe(10) // 15 - 5
    expect(ctx(a).hp).toBe(0) // still 0
  })
})
