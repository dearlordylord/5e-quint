import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import type { DndContext, DndSnapshot } from "#/machine.ts"
import { dndMachine } from "#/machine.ts"
import { applyDamageModifiers, effectiveMaxHp } from "#/machine-helpers.ts"
import {
  canAct,
  canSpeak,
  checkMods,
  defenseMods,
  isIncapacitated,
  ownAttackMods,
  saveMods
} from "#/machine-queries.ts"
import type { Condition, DamageType } from "#/types.ts"
import { d20Roll, damageAmount, healAmount, hp, tempHp } from "#/types.ts"

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

function isConscious(s: DndSnapshot) {
  return s.matches({ damageTrack: "conscious" })
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
  it("no exhaustion returns full maxHp", () => {
    expect(effectiveMaxHp(0, 20)).toBe(20)
  })

  it("exhaustion 4 halves maxHp", () => {
    expect(effectiveMaxHp(4, 20)).toBe(10)
  })

  it("exhaustion 3 returns full maxHp", () => {
    expect(effectiveMaxHp(3, 20)).toBe(20)
  })
})

describe("damage track - basic damage", () => {
  it("starts conscious with full HP", () => {
    const a = create()
    expect(isConscious(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(DEFAULT_MAX_HP)
  })

  it("reduces HP from damage", () => {
    const a = create()
    takeDamage(a, 5)
    expect(isConscious(snap(a))).toBe(true)
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
    expect(isConscious(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(1)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
  })

  it("nat 20 resets existing death saves", () => {
    const a = createDying()
    deathSave(a, 5) // 1 failure
    deathSave(a, 15) // 1 success
    deathSave(a, 20) // nat 20
    expect(isConscious(snap(a))).toBe(true)
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
    expect(isConscious(snap(a))).toBe(true)
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
    expect(isConscious(snap(a))).toBe(true)
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
  it("knock out sets HP to 0 and stable", () => {
    const a = create()
    knockOut(a)
    expect(isStable(snap(a))).toBe(true)
    expect(snap(a).context.hp).toBe(0)
    expect(snap(a).context.deathSaves.successes).toBe(0)
    expect(snap(a).context.deathSaves.failures).toBe(0)
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
    expect(isConscious(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(false)
    expect(ctx(a).prone).toBe(true)
  })

  it("nat 20 death save clears unconscious", () => {
    const a = create()
    takeDamage(a, DEFAULT_MAX_HP)
    deathSave(a, 20)
    expect(isConscious(snap(a))).toBe(true)
    expect(ctx(a).unconscious).toBe(false)
    expect(ctx(a).prone).toBe(true)
  })

  it("KNOCK_OUT sets unconscious and prone", () => {
    const a = create()
    knockOut(a)
    expect(isStable(snap(a))).toBe(true)
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

  it("exhaustion 4 halves maxHp (derived via effectiveMaxHp)", () => {
    const a = create()
    addExhaustion(a, 4)
    expect(effectiveMaxHp(ctx(a).exhaustion, ctx(a).maxHp)).toBe(10)
  })

  it("exhaustion 4 caps HP to effective max", () => {
    const a = create()
    addExhaustion(a, 4)
    expect(ctx(a).hp).toBe(10)
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
