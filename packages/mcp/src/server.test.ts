import { describe, expect, test } from "vitest"
import { createActor } from "xstate"

import { battleMachine } from "@dnd/core/battle-machine.ts"
import { abilityModifier, classLevel } from "@dnd/core/types.ts"
import type { BattleEvent } from "@dnd/core/battle-machine-types.ts"
import { armorClass, CreatureId } from "@dnd/core/types.ts"

import { createBattleHost, createDemoHost, handleToolCall } from "./server.ts"

function readPayload(response: ReturnType<typeof handleToolCall>) {
  return JSON.parse(response.content[0]?.text ?? "null")
}

function creatureToken<T extends object>(token: T) {
  return { scope: "creature" as const, ...token }
}

function creatureResolved<T extends object>(token: T) {
  return { scope: "creature" as const, ...token }
}

const ZERO_BATTLE_SOT: Pick<
  BattleEvent & { type: "BATTLE_START_TURN" },
  "sotDmg" | "sotDt" | "sotHeal" | "sotSaveResult" | "sotConSave" | "rechargeD6" | "deathSaveRoll"
> = {
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "bludgeoning",
  sotHeal: 0,
  sotSaveResult: false,
  sotConSave: true,
  deathSaveRoll: 0,
}

function initBattleHostWithHitWindow() {
  const actor = createActor(battleMachine)
  actor.start()
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", caster: true, preparedSpells: new Set(["shield"]), initiativeRoll: 15 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", bardLevel: 3, bardicInspirationCharges: 3, initiativeRoll: 10 },
    ],
  })
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT })
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
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
    hitReactionCandidates: new Set([CreatureId("C")]),
  })
  return createBattleHost(actor)
}

function initBattleHostWithDamageWindow() {
  const actor = createActor(battleMachine)
  actor.start()
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", rogueLevel: 5, initiativeRoll: 10 },
    ],
  })
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT })
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
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
    hitReactionCandidates: new Set(),
  })
  actor.send({ type: "BATTLE_RESOLVE_HIT_REACTION", reactorId: null, decision: { tag: "RPass" } })
  return createBattleHost(actor)
}

function initBattleHostWithParryWindow() {
  const actor = createActor(battleMachine)
  actor.start()
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      { id: CreatureId("D"), maxHp: 20, kind: "Monster", parryAcBonus: 2, initiativeRoll: 15 },
    ],
  })
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT })
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("D"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
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
    hitReactionCandidates: new Set(),
  })
  return createBattleHost(actor)
}

describe("MCP server adapter", () => {
  test("get_available_actions only returns the supported executable action set", () => {
    const host = createDemoHost()

    const payload = readPayload(handleToolCall(host, "get_available_actions", {}))

    expect(payload).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [
        {
          scope: "creature",
          type: "ENTER_COMBAT",
          cost: {},
          outcome: { summary: "Enter combat (begin tracking turns and action economy)" },
        },
      ],
    })
  })

  test("execute_action round-trip works for enter combat, start turn, and second wind", () => {
    const host = createDemoHost()

    const enterCombat = handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    expect("isError" in enterCombat).toBe(false)
    expect(readPayload(enterCombat).success).toBe(true)

    const startTurn = handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))
    expect("isError" in startTurn).toBe(false)
    expect(readPayload(startTurn).success).toBe(true)

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.bonusAction.map((token: { readonly type: string }) => token.type)).toEqual(["USE_SECOND_WIND"])
    expect(available.free.map((token: { readonly type: string }) => token.type)).toEqual(["USE_ACTION_SURGE", "EXIT_COMBAT"])

    const secondWind = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_SECOND_WIND" }))
    expect("isError" in secondWind).toBe(false)
    const secondWindPayload = readPayload(secondWind)
    expect(secondWindPayload.success).toBe(true)
    expect(secondWindPayload.state.hp).toBeGreaterThan(34)
    expect(secondWindPayload.state.hp).toBeLessThanOrEqual(44)
  })

  test("execute_action rejects actions that are not available in the current state", () => {
    const host = createDemoHost()

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    expect("isError" in response && response.isError).toBe(true)
    expect(readPayload(response)).toEqual({
      error: "START_TURN is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })
  })

  test("get_state returns the core-encoded context shape", () => {
    const host = createDemoHost({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["subtle", "careful"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })

    const payload = readPayload(handleToolCall(host, "get_state", {}))

    expect(payload.concentrationSpellId).toBeNull()
    expect(payload.classStates.sorcerer.knownMetamagicOptions).toEqual(["careful", "subtle"])
    expect(payload.incapacitatedSources).toEqual([])
  })

  test("execute_action supports SHORT_REST with runtime-rolled hit dice", () => {
    const host = createDemoHost({
      maxHp: 24,
      conMod: abilityModifier(2),
      fighterLevel: classLevel(5),
      hitDiceRemaining: {
        barbarian: 0,
        bard: 0,
        cleric: 0,
        druid: 0,
        fighter: 2,
        monk: 0,
        paladin: 0,
        ranger: 0,
        rogue: 0,
        sorcerer: 0,
        warlock: 0,
        wizard: 0,
      },
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "SHORT_REST",
      availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
      cost: {},
      outcome: { summary: "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features" },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "SHORT_REST", spendHitDice: ["fighter", "fighter"] }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.hitDiceRemaining.fighter).toBe(0)
    expect(payload.state.hp).toBeGreaterThan(14)
    expect(payload.state.hp).toBeLessThanOrEqual(24)
  })

  test("execute_action supports USE_HEROIC_INSPIRATION when the fighter has it", () => {
    const host = createDemoHost({
      maxHp: 44,
      fighterLevel: classLevel(10),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_HEROIC_INSPIRATION",
      cost: {},
      outcome: { summary: "Spend Heroic Inspiration to reroll a die and use the new roll" },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_HEROIC_INSPIRATION" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.classStates.fighter.heroicInspiration).toBe(false)
  })

  test("execute_action supports CAST_PREPARED_SPELL with spell and slot choice holes", () => {
    const host = createDemoHost({
      maxHp: 32,
      clericLevel: classLevel(5),
      preparedSpells: new Set(["bless", "healing_word"]),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.action).toContainEqual(creatureToken({
      type: "CAST_PREPARED_SPELL",
      spellName: "bless",
      slotLevel: { options: [1, 2, 3] },
      cost: { action: true, charge: "spellSlot" },
      outcome: { summary: "Cast Bless with a spell slot of the chosen level and begin concentrating on it" },
    }))
    expect(available.bonusAction).toContainEqual(creatureToken({
      type: "CAST_PREPARED_SPELL",
      spellName: "healing_word",
      slotLevel: { options: [1, 2, 3] },
      cost: { bonusAction: true, charge: "spellSlot" },
      outcome: { summary: "Cast Healing Word with a spell slot of the chosen level" },
    }))

    const illegal = handleToolCall(host, "execute_action", creatureResolved({ type: "CAST_PREPARED_SPELL", spellName: "bless", slotLevel: 4 }))
    expect("isError" in illegal && illegal.isError).toBe(true)
    expect(readPayload(illegal)).toEqual({
      error: "Bless with a level 4 slot is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "CAST_PREPARED_SPELL", spellName: "bless", slotLevel: 2 }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.slotsCurrent).toEqual([4, 2, 2, 0, 0, 0, 0, 0, 0])
    expect(payload.state.slotExpendedThisTurn).toBe(true)
    expect(payload.state.concentrationSpellId).toBe("bless")
  })

  test("execute_action supports USE_TACTICAL_MIND once the pending trigger exists", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(2),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    host.actor.send({ type: "TRIGGER_TACTICAL_MIND" })

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_TACTICAL_MIND",
      cost: { charge: "secondWind" },
      outcome: {
        summary: "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
      },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_TACTICAL_MIND" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.pendingResolution).toBeNull()
  })

  test("execute_action supports USE_METAMAGIC with filtered legal options", () => {
    const host = createDemoHost({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_METAMAGIC",
      option: { options: ["careful", "subtle"] },
      cost: { charge: "sorceryPoints" },
      outcome: { summary: "Apply a currently legal known Metamagic option to the spell you are casting" },
    }))

    const illegalBeforeUse = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_METAMAGIC", option: "quickened" }))
    expect("isError" in illegalBeforeUse && illegalBeforeUse.isError).toBe(true)
    expect(readPayload(illegalBeforeUse)).toEqual({
      error: "quickened Metamagic is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_METAMAGIC", option: "careful" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.classStates.sorcerer.sorceryPoints).toBe(4)
    expect(payload.state.classStates.sorcerer.metamagicUsedThisCast).toEqual(["careful"])
    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})).free.map((token: { readonly type: string }) => token.type),
    ).not.toContain("USE_METAMAGIC")
  })

  test("execute_action supports a dice-roll runtime action with USE_TIRELESS", () => {
    const host = createDemoHost({
      maxHp: 32,
      rangerLevel: classLevel(10),
      wisMod: abilityModifier(3),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.action).toContainEqual(creatureToken({
      type: "USE_TIRELESS",
      cost: { action: true, charge: "tireless" },
      outcome: { summary: "Gain 1d8 + 3 temporary HP (minimum 1)" },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_TIRELESS" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.tempHp).toBeGreaterThanOrEqual(2)
    expect(payload.state.tempHp).toBeLessThanOrEqual(11)
    expect(payload.state.actionsRemaining).toBe(0)
  })

  test("execute_action supports a hole pass-through action with USE_ARCANE_RECOVERY", () => {
    const host = createDemoHost({
      maxHp: 24,
      wizardLevel: classLevel(4),
      slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_ARCANE_RECOVERY",
      slotLevel: { options: [2] },
      cost: { charge: "arcaneRecovery" },
      outcome: { summary: "Recover one expended spell slot of the chosen level and use Arcane Recovery" },
    }))

    const illegal = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_ARCANE_RECOVERY", slotLevel: 1 }))
    expect("isError" in illegal && illegal.isError).toBe(true)
    expect(readPayload(illegal)).toEqual({
      error: "Arcane Recovery for a level 1 slot is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_ARCANE_RECOVERY", slotLevel: 2 }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.slotsCurrent).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0])
    expect(payload.state.classStates.wizard.arcaneRecoveryUsed).toBe(true)
  })

  test("execute_action supports USE_PEERLESS_SKILL once the pending trigger exists", () => {
    const host = createDemoHost({
      maxHp: 38,
      bardLevel: classLevel(14),
      chaMod: abilityModifier(5),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    host.actor.send({ type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" })

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_PEERLESS_SKILL",
      cost: { charge: "bardicInspiration" },
      outcome: {
        summary: "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds",
      },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_PEERLESS_SKILL" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.pendingResolution).toBeNull()
  })

  test("execute_action supports USE_RELENTLESS_RAGE after a real drop-to-zero trigger", () => {
    const host = createDemoHost({
      maxHp: 40,
      barbarianLevel: classLevel(11),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))
    host.actor.send({ type: "ENTER_RAGE" })
    host.actor.send({
      type: "TAKE_DAMAGE",
      amount: 40,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    })

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_RELENTLESS_RAGE",
      cost: {},
      outcome: { summary: "Make a DC 10 Constitution save to stay at 22 HP instead of dropping to 0" },
    }))

    const response = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_RELENTLESS_RAGE" }))
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.classStates.barbarian.relentlessRageTimesUsed).toBe(1)
    expect(payload.state.pendingResolution).toBeNull()
  })

  test("execute_action supports representative phase 4A semantic actions", () => {
    const host = createDemoHost({
      maxHp: 52,
      fighterLevel: classLevel(2),
      barbarianLevel: classLevel(2),
      monkLevel: classLevel(2),
      rogueLevel: classLevel(3),
      clericLevel: classLevel(2),
      paladinLevel: classLevel(3),
      bardLevel: classLevel(1),
      rangerLevel: classLevel(14),
      chaMod: abilityModifier(3),
      wisMod: abilityModifier(3),
      preparedSpells: new Set(),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    const available = readPayload(handleToolCall(host, "get_available_actions", {}))
    expect(available.free).toContainEqual(creatureToken({
      type: "USE_ACTION_SURGE",
      cost: { charge: "actionSurge" },
      outcome: { summary: "Expend one Action Surge use to gain one additional action this turn" },
    }))
    expect(available.bonusAction).toContainEqual(creatureToken({
      type: "FLURRY_OF_BLOWS",
      cost: { bonusAction: true, charge: "focusPoint" },
      outcome: { summary: "Spend 1 Focus Point to make 2 unarmed strikes as a bonus action" },
    }))
    expect(available.bonusAction).toContainEqual(creatureToken({
      type: "USE_BARDIC_INSPIRATION",
      cost: { bonusAction: true, charge: "bardicInspiration" },
      outcome: { summary: "Expend one Bardic Inspiration use to inspire another creature" },
    }))
    expect(available.free.map((token: { readonly type: string }) => token.type)).not.toContain("USE_INDOMITABLE")
    expect(available.free.map((token: { readonly type: string }) => token.type)).not.toContain("USE_OVERCHANNEL")

    const actionSurge = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_ACTION_SURGE" }))
    expect("isError" in actionSurge).toBe(false)
    const actionSurgePayload = readPayload(actionSurge)
    expect(actionSurgePayload.success).toBe(true)
    expect(actionSurgePayload.state.actionsRemaining).toBe(2)
    expect(actionSurgePayload.state.classStates.fighter.actionSurgeCharges).toBe(0)

    const bardic = handleToolCall(host, "execute_action", creatureResolved({ type: "USE_BARDIC_INSPIRATION" }))
    expect("isError" in bardic).toBe(false)
    const bardicPayload = readPayload(bardic)
    expect(bardicPayload.success).toBe(true)
    expect(bardicPayload.state.classStates.bard.bardicInspirationCharges).toBe(2)
    expect(bardicPayload.state.bonusActionUsed).toBe(true)
  })

  test("get_available_actions groups a representative multigroup state stably", () => {
    const host = createDemoHost({
      maxHp: 44,
      conMod: abilityModifier(2),
      fighterLevel: classLevel(10),
      rangerLevel: classLevel(10),
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      wizardLevel: classLevel(4),
      preparedSpells: new Set(),
      wisMod: abilityModifier(3),
      slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [3, 2, 0, 0, 0, 0, 0, 0, 0],
      hitDiceRemaining: {
        barbarian: 0,
        bard: 0,
        cleric: 0,
        druid: 0,
        fighter: 2,
        monk: 0,
        paladin: 0,
        ranger: 0,
        rogue: 0,
        sorcerer: 0,
        warlock: 0,
        wizard: 0,
      },
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(host, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    handleToolCall(host, "execute_action", creatureResolved({ type: "START_TURN" }))

    expect(readPayload(handleToolCall(host, "get_available_actions", {}))).toMatchInlineSnapshot(`
      {
        "action": [
          {
            "cost": {
              "action": true,
              "charge": "tireless",
            },
            "outcome": {
              "summary": "Gain 1d8 + 3 temporary HP (minimum 1)",
            },
            "scope": "creature",
            "type": "USE_TIRELESS",
          },
        ],
        "bonusAction": [
          {
            "cost": {
              "bonusAction": true,
              "charge": "sorceryPoints",
            },
            "outcome": {
              "summary": "Spend sorcery points to create a spell slot of the chosen level",
            },
            "scope": "creature",
            "slotLevel": {
              "options": [
                1,
                2,
              ],
            },
            "type": "CONVERT_POINTS_TO_SLOT",
          },
          {
            "cost": {
              "bonusAction": true,
              "charge": "secondWind",
            },
            "outcome": {
              "summary": "Heal 1d10 + 10 HP",
            },
            "scope": "creature",
            "type": "USE_SECOND_WIND",
          },
        ],
        "free": [
          {
            "cost": {
              "charge": "actionSurge",
            },
            "outcome": {
              "summary": "Expend one Action Surge use to gain one additional action this turn",
            },
            "scope": "creature",
            "type": "USE_ACTION_SURGE",
          },
          {
            "cost": {
              "charge": "arcaneRecovery",
            },
            "outcome": {
              "summary": "Recover one expended spell slot of the chosen level and use Arcane Recovery",
            },
            "scope": "creature",
            "slotLevel": {
              "options": [
                1,
                2,
              ],
            },
            "type": "USE_ARCANE_RECOVERY",
          },
          {
            "cost": {
              "charge": "sorceryPoints",
            },
            "option": {
              "options": [
                "careful",
                "subtle",
              ],
            },
            "outcome": {
              "summary": "Apply a currently legal known Metamagic option to the spell you are casting",
            },
            "scope": "creature",
            "type": "USE_METAMAGIC",
          },
          {
            "cost": {},
            "outcome": {
              "summary": "Leave combat (stop tracking turns)",
            },
            "scope": "creature",
            "type": "EXIT_COMBAT",
          },
        ],
        "reaction": [],
      }
    `)
  })

  test("battle hosts return a routed battle state summary and no discovered actions yet", () => {
    const host = createBattleHost()

    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual({
      scope: "battle",
      machineState: "idle",
      tags: [],
      round: 0,
      turnIndex: 0,
      activeCreatureId: null,
      initiative: [],
      creatureIds: [],
      phase: "activeTurn",
      awaitingReaction: false,
      resolvingAoE: false,
      resolvingMovement: false,
      awaitingLegendaryAction: false,
      awaitingReadiedAction: false,
    })

    expect(readPayload(handleToolCall(host, "get_available_actions", {}))).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [],
    })
  })

  test("battle hosts surface live reaction tokens from the authoritative battle window", () => {
    const host = initBattleHostWithHitWindow()

    expect(readPayload(handleToolCall(host, "get_available_actions", {}))).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "B",
          type: "CAST_SHIELD",
          cost: { reaction: true, charge: "spellSlot" },
          outcome: { summary: "Use your reaction to cast Shield against the triggering attack" },
        },
        {
          scope: "battle",
          actorId: "C",
          type: "USE_CUTTING_WORDS",
          cost: { reaction: true, charge: "bardicInspiration" },
          outcome: { summary: "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll" },
        },
      ],
      free: [],
    })
  })

  test("execute_action routes USE_UNCANNY_DODGE through the battle lane end to end", () => {
    const host = initBattleHostWithDamageWindow()

    const response = handleToolCall(host, "execute_action", { scope: "battle", actorId: "B", type: "USE_UNCANNY_DODGE" })

    expect("isError" in response).toBe(false)
    expect(readPayload(response)).toEqual({
      success: true,
      outcome: "Use your reaction to halve the triggering attack's damage against you",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "B"],
        creatureIds: ["A", "B"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    })
  })

  test("execute_action routes CAST_SHIELD through the battle lane end to end", () => {
    const host = initBattleHostWithHitWindow()

    const response = handleToolCall(host, "execute_action", { scope: "battle", actorId: "B", type: "CAST_SHIELD" })

    expect("isError" in response).toBe(false)
    expect(readPayload(response)).toEqual({
      success: true,
      outcome: "Use your reaction to cast Shield against the triggering attack",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "B", "C"],
        creatureIds: ["A", "B", "C"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    })

    expect(readPayload(handleToolCall(host, "get_available_actions", {}))).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "C",
          type: "USE_CUTTING_WORDS",
          cost: { reaction: true, charge: "bardicInspiration" },
          outcome: { summary: "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll" },
        },
      ],
      free: [],
    })
  })

  test("execute_action routes USE_PARRY through the battle lane end to end", () => {
    const host = initBattleHostWithParryWindow()

    const response = handleToolCall(host, "execute_action", { scope: "battle", actorId: "D", type: "USE_PARRY" })

    expect("isError" in response).toBe(false)
    expect(readPayload(response)).toEqual({
      success: true,
      outcome: "Use your reaction to add your Parry bonus against the triggering melee weapon attack",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "D"],
        creatureIds: ["A", "D"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    })

    expect(readPayload(handleToolCall(host, "get_available_actions", {}))).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [],
    })
  })

  test("execute_action rejects scope mismatches between token and host", () => {
    const creatureHost = createDemoHost()
    const battleHost = createBattleHost()

    const battleOnCreature = handleToolCall(creatureHost, "execute_action", { scope: "battle", actorId: "B", type: "USE_UNCANNY_DODGE" })
    expect("isError" in battleOnCreature && battleOnCreature.isError).toBe(true)
    expect(readPayload(battleOnCreature)).toEqual({
      error: "Action scope battle does not match the current creature host.",
      details: "ACTION_SCOPE_MISMATCH",
    })

    const creatureOnBattle = handleToolCall(battleHost, "execute_action", creatureResolved({ type: "ENTER_COMBAT" }))
    expect("isError" in creatureOnBattle && creatureOnBattle.isError).toBe(true)
    expect(readPayload(creatureOnBattle)).toEqual({
      error: "Action scope creature does not match the current battle host.",
      details: "ACTION_SCOPE_MISMATCH",
    })
  })
})
