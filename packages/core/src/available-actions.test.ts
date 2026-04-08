import { describe, expect, test } from "vitest"
import { createActor } from "xstate"

import {
  finalizeResolution,
  getAvailableActions,
  resolveAction,
  type ResolutionRequest,
} from "#/available-actions.ts"
import { creatureMachine } from "#/machine.ts"
import type { DndMachineInput } from "#/machine-types.ts"
import { abilityModifier, classLevel, resourceCount, spellSlotLevel } from "#/types.ts"

const FIGHTER_5_INPUT: DndMachineInput = {
  maxHp: 44,
  conMod: abilityModifier(2),
  fighterLevel: classLevel(5),
  hitDiceRemaining: { barbarian: 0, bard: 0, cleric: 0, druid: 0, fighter: 2, monk: 0, paladin: 0, ranger: 0, rogue: 0, sorcerer: 0, warlock: 0, wizard: 0 },
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

function makeActor() {
  return makeActorWithInput(FIGHTER_5_INPUT)
}

function makeActorWithInput(input: DndMachineInput) {
  const actor = createActor(creatureMachine, { input })
  actor.start()
  return actor
}

function damageActor(amount: number) {
  const actor = makeActor()
  actor.send({
    type: "TAKE_DAMAGE",
    amount,
    damageType: "slashing",
    resistances: new Set(),
    vulnerabilities: new Set(),
    immunities: new Set(),
    isCritical: false,
  })
  return actor
}

const FIGHTER_10_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(10),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const FIGHTER_2_INPUT: DndMachineInput = {
  maxHp: 24,
  fighterLevel: classLevel(2),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const SORCERER_5_INPUT: DndMachineInput = {
  maxHp: 30,
  sorcererLevel: classLevel(5),
  knownMetamagicOptions: ["careful", "subtle"],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const PHASE_2_MULTIGROUP_INPUT: DndMachineInput = {
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
}

const MONK_6_INPUT: DndMachineInput = {
  maxHp: 30,
  monkLevel: classLevel(6),
  wholenessMax: resourceCount(3),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const RANGER_10_INPUT: DndMachineInput = {
  maxHp: 32,
  rangerLevel: classLevel(10),
  wisMod: abilityModifier(3),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const WIZARD_4_INPUT: DndMachineInput = {
  maxHp: 24,
  wizardLevel: classLevel(4),
  slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const CLERIC_5_SPELL_INPUT: DndMachineInput = {
  maxHp: 32,
  clericLevel: classLevel(5),
  preparedSpells: new Set(["bless", "guiding_bolt", "healing_word"]),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const WARLOCK_13_INPUT: DndMachineInput = {
  maxHp: 28,
  warlockLevel: classLevel(13),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const PALADIN_2_INPUT: DndMachineInput = {
  maxHp: 28,
  paladinLevel: classLevel(2),
  slotsMax: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const BARD_5_INPUT: DndMachineInput = {
  maxHp: 26,
  bardLevel: classLevel(5),
  chaMod: abilityModifier(3),
  slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const BARD_14_INPUT: DndMachineInput = {
  maxHp: 38,
  bardLevel: classLevel(14),
  chaMod: abilityModifier(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const DRUID_5_INPUT: DndMachineInput = {
  maxHp: 28,
  druidLevel: classLevel(5),
  slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

const BARBARIAN_11_INPUT: DndMachineInput = {
  maxHp: 40,
  barbarianLevel: classLevel(11),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
}

function expectRequest(request: ResolutionRequest | { readonly code: string }) {
  if ("code" in request) throw new Error(`expected successful resolution request, got ${request.code}`)
  return request
}

describe("available actions contract", () => {
  test("initial state only exposes ENTER_COMBAT", () => {
    const actor = makeActor()

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toEqual([
      {
        type: "ENTER_COMBAT",
        cost: {},
        outcome: { summary: "Enter combat (begin tracking turns and action economy)" },
      },
      {
        type: "SHORT_REST",
        availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
        cost: {},
        outcome: { summary: "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features" },
      },
    ])
  })

  test("START_TURN is unavailable before entering combat", () => {
    const actor = makeActor()

    expect(resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "START_TURN" })).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "START_TURN is not currently available in this state.",
    })
  })

  test("resolves and finalizes enter combat, start turn, and second wind", () => {
    const actor = damageActor(10)

    const enterRequest = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "ENTER_COMBAT" }),
    )
    const enterFinalized = finalizeResolution(enterRequest, { runtime: "none" }, actor.getSnapshot().context)
    expect(enterFinalized).toEqual({
      ok: true,
      event: { type: "ENTER_COMBAT" },
      outcome: "Enter combat (begin tracking turns and action economy)",
    })
    if (!enterFinalized.ok) throw new Error("expected ENTER_COMBAT finalization to succeed")
    actor.send(enterFinalized.event)

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "START_TURN",
      "EXIT_COMBAT",
    ])

    const startTurnRequest = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "START_TURN" }),
    )
    const startTurnFinalized = finalizeResolution(
      startTurnRequest,
      { runtime: "startTurn", values: {} },
      actor.getSnapshot().context,
    )
    expect(startTurnFinalized.ok).toBe(true)
    if (!startTurnFinalized.ok) throw new Error("expected START_TURN finalization to succeed")
    actor.send(startTurnFinalized.event)

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "USE_SECOND_WIND",
      "EXIT_COMBAT",
    ])

    const secondWindRequest = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_SECOND_WIND" }),
    )
    const secondWindFinalized = finalizeResolution(
      secondWindRequest,
      { runtime: "secondWind", values: { d10Roll: 7 } },
      actor.getSnapshot().context,
    )
    expect(secondWindFinalized).toEqual({
      ok: true,
      event: { type: "USE_SECOND_WIND", d10Roll: 7 },
      outcome: "Healed 1d10(7) + 5 = 12 HP",
    })
    if (!secondWindFinalized.ok) throw new Error("expected USE_SECOND_WIND finalization to succeed")
    actor.send(secondWindFinalized.event)

    expect(actor.getSnapshot().context.hp).toBe(44)
  })

  test("exposes one prepared-spell token per prepared spell with slot-level choice holes", () => {
    const actor = makeActorWithInput(CLERIC_5_SPELL_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })

    const spellTokens = getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).filter(
      (token) => token.type === "CAST_PREPARED_SPELL",
    )

    expect(spellTokens).toEqual([
      {
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
        cost: { action: true, charge: "spellSlot" },
        outcome: { summary: "Cast Bless with a spell slot of the chosen level and begin concentrating on it" },
      },
      {
        type: "CAST_PREPARED_SPELL",
        spellName: "guiding_bolt",
        slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
        cost: { action: true, charge: "spellSlot" },
        outcome: { summary: "Cast Guiding Bolt with a spell slot of the chosen level" },
      },
      {
        type: "CAST_PREPARED_SPELL",
        spellName: "healing_word",
        slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
        cost: { bonusAction: true, charge: "spellSlot" },
        outcome: { summary: "Cast Healing Word with a spell slot of the chosen level" },
      },
    ])
  })

  test("resolves prepared spell casts and rejects invalid slot levels", () => {
    const actor = makeActorWithInput(CLERIC_5_SPELL_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })

    expect(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        type: "CAST_PREPARED_SPELL",
        spellName: "guiding_bolt",
        slotLevel: spellSlotLevel(4),
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "Guiding Bolt with a level 4 slot is not currently available in this state.",
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: spellSlotLevel(2),
      }),
    )
    const finalized = finalizeResolution(request, { runtime: "none" }, actor.getSnapshot().context)
    expect(finalized).toEqual({
      ok: true,
      event: { type: "CAST_PREPARED_SPELL", spellName: "bless", slotLevel: spellSlotLevel(2) },
      outcome: "Cast Bless with a level 2 spell slot and begin concentrating on it",
    })
  })

  test("short rest exposes hit-die pools and finalizes runtime rolls", () => {
    const actor = makeActor()
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 12,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "SHORT_REST",
      availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
      cost: {},
      outcome: { summary: "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features" },
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "SHORT_REST", spendHitDice: ["fighter", "fighter"] }),
    )
    const finalized = finalizeResolution(
      request,
      {
        runtime: "shortRest",
        values: { hdRolls: [{ className: "fighter", roll: 4 }, { className: "fighter", roll: 3 }] },
      },
      actor.getSnapshot().context,
    )
    expect(finalized).toEqual({
      ok: true,
      event: { type: "SHORT_REST", hdRolls: [{ className: "fighter", roll: 4 }, { className: "fighter", roll: 3 }] },
      outcome: "Spent hit dice in order: fighter d10(4), fighter d10(3)",
    })
  })

  test("short rest is not available at 0 HP", () => {
    const actor = makeActor()
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 44,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).not.toContain(
      "SHORT_REST",
    )
  })

  test("exposes and executes USE_HEROIC_INSPIRATION as a root action when the flag is present", () => {
    const actor = makeActorWithInput(FIGHTER_10_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_HEROIC_INSPIRATION",
      cost: {},
      outcome: { summary: "Spend Heroic Inspiration to reroll a die and use the new roll" },
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_HEROIC_INSPIRATION" }),
    )
    const finalized = finalizeResolution(request, { runtime: "none" }, actor.getSnapshot().context)
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_HEROIC_INSPIRATION" },
      outcome: "Spend Heroic Inspiration to reroll a die and use the new roll",
    })
    if (!finalized.ok) throw new Error("expected USE_HEROIC_INSPIRATION finalization to succeed")
    actor.send(finalized.event)

    expect(actor.getSnapshot().context.classStates.fighter?.heroicInspiration).toBe(false)
  })

  test("exposes USE_TACTICAL_MIND only while a failed ability check trigger is pending", () => {
    const actor = makeActorWithInput(FIGHTER_2_INPUT)

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).not.toContain(
      "USE_TACTICAL_MIND",
    )

    actor.send({ type: "TRIGGER_TACTICAL_MIND" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_TACTICAL_MIND",
      cost: { charge: "secondWind" },
      outcome: {
        summary: "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
      },
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_TACTICAL_MIND" }),
    )
    const finalized = finalizeResolution(
      request,
      { runtime: "tacticalMind", values: { boostedCheckSucceeds: true } },
      actor.getSnapshot().context,
    )
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_TACTICAL_MIND", boostedCheckSucceeds: true },
      outcome: "Tactical Mind turned the failed ability check into a success",
    })
    if (!finalized.ok) throw new Error("expected USE_TACTICAL_MIND finalization to succeed")
    actor.send(finalized.event)

    expect(actor.getSnapshot().context.classStates.fighter?.secondWindCharges).toBe(1)
    expect(actor.getSnapshot().context.pendingResolution).toBeNull()
  })

  test("exposes USE_METAMAGIC with only currently legal known options and executes the resolved token", () => {
    const actor = makeActorWithInput(SORCERER_5_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_METAMAGIC",
      option: { options: ["careful", "subtle"] },
      cost: { charge: "sorceryPoints" },
      outcome: { summary: "Apply a currently legal known Metamagic option to the spell you are casting" },
    })

    expect(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_METAMAGIC", option: "quickened" }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "quickened Metamagic is not currently available in this state.",
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_METAMAGIC", option: "careful" }),
    )
    const finalized = finalizeResolution(request, { runtime: "none" }, actor.getSnapshot().context)
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_METAMAGIC", option: "careful" },
      outcome: "Apply careful Metamagic",
    })
    if (!finalized.ok) throw new Error("expected USE_METAMAGIC finalization to succeed")
    actor.send(finalized.event)

    expect(actor.getSnapshot().context.classStates.sorcerer?.metamagicUsedThisCast).toEqual(new Set(["careful"]))
    expect(actor.getSnapshot().context.classStates.sorcerer?.sorceryPoints).toBe(4)
    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).not.toContain(
      "USE_METAMAGIC",
    )
  })

  test("exposes USE_PEERLESS_SKILL only while a failed roll trigger is pending", () => {
    const actor = makeActorWithInput(BARD_14_INPUT)
    actor.send({ type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_PEERLESS_SKILL",
      cost: { charge: "bardicInspiration" },
      outcome: {
        summary: "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds",
      },
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_PEERLESS_SKILL" }),
    )
    const finalized = finalizeResolution(
      request,
      { runtime: "peerlessSkill", values: { success: false } },
      actor.getSnapshot().context,
    )
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_PEERLESS_SKILL", success: false },
      outcome: "Peerless Skill failed to turn the attack roll into a success, so Bardic Inspiration was not expended",
    })
    if (!finalized.ok) throw new Error("expected USE_PEERLESS_SKILL finalization to succeed")
    actor.send(finalized.event)

    expect(actor.getSnapshot().context.classStates.bard?.bardicInspirationCharges).toBe(5)
    expect(actor.getSnapshot().context.pendingResolution).toBeNull()
  })

  test("exposes USE_RELENTLESS_RAGE only after the machine owns the drop-to-zero trigger", () => {
    const actor = makeActorWithInput(BARBARIAN_11_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })
    actor.send({ type: "ENTER_RAGE" })
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 40,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    })

    expect(actor.getSnapshot().context.pendingResolution).toEqual({ kind: "relentlessRage" })
    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_RELENTLESS_RAGE",
      cost: {},
      outcome: { summary: "Make a DC 10 Constitution save to stay at 22 HP instead of dropping to 0" },
    })

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, { type: "USE_RELENTLESS_RAGE" }),
    )
    const finalized = finalizeResolution(
      request,
      { runtime: "relentlessRage", values: { conSaveSucceeded: true } },
      actor.getSnapshot().context,
    )
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_RELENTLESS_RAGE", conSaveSucceeded: true },
      outcome: "Relentless Rage succeeded; HP becomes 22",
    })
    if (!finalized.ok) throw new Error("expected USE_RELENTLESS_RAGE finalization to succeed")
    actor.send(finalized.event)

    expect(actor.getSnapshot().context.hp).toBe(22)
    expect(actor.getSnapshot().context.classStates.barbarian?.relentlessRageTimesUsed).toBe(1)
    expect(actor.getSnapshot().context.pendingResolution).toBeNull()
  })

  test("exposes and executes the dice-roll family through runtime inputs", () => {
    const monk = makeActorWithInput(MONK_6_INPUT)
    monk.send({ type: "TAKE_DAMAGE", amount: 10, damageType: "slashing", resistances: new Set(), vulnerabilities: new Set(), immunities: new Set(), isCritical: false })
    monk.send({ type: "ENTER_COMBAT" })
    monk.send({ type: "START_TURN" })

    expect(getAvailableActions(monk.getSnapshot().context, monk.getSnapshot().tags)).toContainEqual({
      type: "WHOLENESS_OF_BODY",
      cost: { bonusAction: true, charge: "wholenessOfBody" },
      outcome: { summary: "Heal 1d8 + 3 HP (minimum 1)" },
    })
    expect(getAvailableActions(monk.getSnapshot().context, monk.getSnapshot().tags)).toContainEqual({
      type: "UNCANNY_METABOLISM",
      cost: { charge: "uncannyMetabolism" },
      outcome: { summary: "Regain all expended Focus Points and heal 1d8 + 6 HP" },
    })

    const wholenessRequest = expectRequest(
      resolveAction(monk.getSnapshot().context, monk.getSnapshot().tags, { type: "WHOLENESS_OF_BODY" }),
    )
    const wholenessFinalized = finalizeResolution(
      wholenessRequest,
      { runtime: "wholenessOfBody", values: { healRoll: 8 } },
      monk.getSnapshot().context,
    )
    expect(wholenessFinalized).toEqual({
      ok: true,
      event: { type: "WHOLENESS_OF_BODY", healRoll: 8 },
      outcome: "Healed 8 HP with Wholeness of Body",
    })
    if (!wholenessFinalized.ok) throw new Error("expected WHOLENESS_OF_BODY finalization to succeed")
    monk.send(wholenessFinalized.event)
    expect(monk.getSnapshot().context.hp).toBe(28)

    const monk2 = makeActorWithInput(MONK_6_INPUT)
    monk2.send({ type: "TAKE_DAMAGE", amount: 10, damageType: "slashing", resistances: new Set(), vulnerabilities: new Set(), immunities: new Set(), isCritical: false })
    monk2.send({ type: "ENTER_COMBAT" })
    monk2.send({ type: "START_TURN" })
    const uncannyRequest = expectRequest(
      resolveAction(monk2.getSnapshot().context, monk2.getSnapshot().tags, { type: "UNCANNY_METABOLISM" }),
    )
    const uncannyFinalized = finalizeResolution(
      uncannyRequest,
      { runtime: "uncannyMetabolism", values: { healRoll: 5 } },
      monk2.getSnapshot().context,
    )
    expect(uncannyFinalized).toEqual({
      ok: true,
      event: { type: "UNCANNY_METABOLISM", healRoll: 5 },
      outcome: "Regained all Focus Points and healed 1d8(5) + 6 = 11 HP",
    })
    if (!uncannyFinalized.ok) throw new Error("expected UNCANNY_METABOLISM finalization to succeed")
    monk2.send(uncannyFinalized.event)
    expect(monk2.getSnapshot().context.hp).toBe(30)
    expect(monk2.getSnapshot().context.classStates.monk?.uncannyMetabolismUsed).toBe(true)

    const ranger = makeActorWithInput(RANGER_10_INPUT)
    ranger.send({ type: "ENTER_COMBAT" })
    ranger.send({ type: "START_TURN" })
    expect(getAvailableActions(ranger.getSnapshot().context, ranger.getSnapshot().tags)).toContainEqual({
      type: "USE_TIRELESS",
      cost: { action: true, charge: "tireless" },
      outcome: { summary: "Gain 1d8 + 3 temporary HP (minimum 1)" },
    })
    const tirelessRequest = expectRequest(
      resolveAction(ranger.getSnapshot().context, ranger.getSnapshot().tags, { type: "USE_TIRELESS" }),
    )
    const tirelessFinalized = finalizeResolution(
      tirelessRequest,
      { runtime: "tireless", values: { d8Roll: 4 } },
      ranger.getSnapshot().context,
    )
    expect(tirelessFinalized).toEqual({
      ok: true,
      event: { type: "USE_TIRELESS", d8Roll: 4 },
      outcome: "Gained 1d8(4) + 3 = 7 temporary HP",
    })
    if (!tirelessFinalized.ok) throw new Error("expected USE_TIRELESS finalization to succeed")
    ranger.send(tirelessFinalized.event)
    expect(ranger.getSnapshot().context.tempHp).toBe(7)
    expect(ranger.getSnapshot().context.actionsRemaining).toBe(0)
  })

  test("exposes and executes scalar slot and amount actions with legality-filtered holes", () => {
    const wizard = makeActorWithInput(WIZARD_4_INPUT)
    wizard.send({ type: "ENTER_COMBAT" })
    wizard.send({ type: "START_TURN" })
    expect(getAvailableActions(wizard.getSnapshot().context, wizard.getSnapshot().tags)).toContainEqual({
      type: "USE_ARCANE_RECOVERY",
      slotLevel: { options: [spellSlotLevel(2)] },
      cost: { charge: "arcaneRecovery" },
      outcome: { summary: "Recover one expended spell slot of the chosen level and use Arcane Recovery" },
    })
    expect(
      resolveAction(wizard.getSnapshot().context, wizard.getSnapshot().tags, {
        type: "USE_ARCANE_RECOVERY",
        slotLevel: spellSlotLevel(1),
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "Arcane Recovery for a level 1 slot is not currently available in this state.",
    })

    const warlock = makeActorWithInput(WARLOCK_13_INPUT)
    warlock.send({ type: "ENTER_COMBAT" })
    warlock.send({ type: "START_TURN" })
    expect(getAvailableActions(warlock.getSnapshot().context, warlock.getSnapshot().tags)).toContainEqual({
      type: "USE_MYSTIC_ARCANUM",
      spellLevel: { options: [spellSlotLevel(6), spellSlotLevel(7)] },
      cost: { charge: "mysticArcanum" },
      outcome: { summary: "Cast an unused Mystic Arcanum spell of the chosen level without expending a slot" },
    })

    const paladin = makeActorWithInput(PALADIN_2_INPUT)
    paladin.send({ type: "ENTER_COMBAT" })
    paladin.send({ type: "START_TURN" })
    expect(getAvailableActions(paladin.getSnapshot().context, paladin.getSnapshot().tags)).toContainEqual({
      type: "USE_LAY_ON_HANDS",
      amount: { options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      cost: { bonusAction: true, charge: "layOnHandsPool" },
      outcome: { summary: "Spend Lay on Hands points to restore up to that many HP" },
    })
    expect(getAvailableActions(paladin.getSnapshot().context, paladin.getSnapshot().tags)).toContainEqual({
      type: "USE_DIVINE_SMITE",
      slotLevel: { options: [spellSlotLevel(1)] },
      cost: { bonusAction: true, charge: "spellSlot" },
      outcome: { summary: "Expend a spell slot of the chosen level to use Divine Smite" },
    })
    const layOnHandsRequest = expectRequest(
      resolveAction(paladin.getSnapshot().context, paladin.getSnapshot().tags, { type: "USE_LAY_ON_HANDS", amount: 3 }),
    )
    const layOnHandsFinalized = finalizeResolution(layOnHandsRequest, { runtime: "none" }, paladin.getSnapshot().context)
    expect(layOnHandsFinalized).toEqual({
      ok: true,
      event: { type: "USE_LAY_ON_HANDS", amount: 3 },
      outcome: "Spend 3 Lay on Hands points to restore up to 3 HP",
    })

    const bard = makeActorWithInput(BARD_5_INPUT)
    bard.send({ type: "ENTER_COMBAT" })
    bard.send({ type: "START_TURN" })
    bard.send({ type: "USE_BARDIC_INSPIRATION" })
    expect(getAvailableActions(bard.getSnapshot().context, bard.getSnapshot().tags)).toContainEqual({
      type: "USE_FONT_SLOT_RESTORE",
      slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
      cost: { charge: "spellSlot" },
      outcome: { summary: "Expend a spell slot to regain one Bardic Inspiration use" },
    })

    const sorcerer = makeActorWithInput({
      ...SORCERER_5_INPUT,
      slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [3, 3, 2, 0, 0, 0, 0, 0, 0],
    })
    sorcerer.send({ type: "ENTER_COMBAT" })
    sorcerer.send({ type: "START_TURN" })
    sorcerer.send({ type: "USE_METAMAGIC", option: "careful" })
    expect(getAvailableActions(sorcerer.getSnapshot().context, sorcerer.getSnapshot().tags)).toContainEqual({
      type: "CONVERT_SLOT_TO_POINTS",
      slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
      cost: { charge: "spellSlot" },
      outcome: { summary: "Expend a spell slot to gain sorcery points equal to its level" },
    })
    expect(getAvailableActions(sorcerer.getSnapshot().context, sorcerer.getSnapshot().tags)).toContainEqual({
      type: "CONVERT_POINTS_TO_SLOT",
      slotLevel: { options: [spellSlotLevel(1)] },
      cost: { bonusAction: true, charge: "sorceryPoints" },
      outcome: { summary: "Spend sorcery points to create a spell slot of the chosen level" },
    })
  })

  test("surfaces Wild Resurgence charge recovery only after Wild Shape charges are depleted", () => {
    const actor = makeActorWithInput(DRUID_5_INPUT)
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })
    actor.send({ type: "ENTER_WILD_SHAPE" })
    actor.send({ type: "END_TURN" })
    actor.send({ type: "START_TURN" })
    actor.send({ type: "EXIT_WILD_SHAPE" })
    actor.send({ type: "END_TURN" })
    actor.send({ type: "START_TURN" })
    actor.send({ type: "ENTER_WILD_SHAPE" })
    actor.send({ type: "END_TURN" })
    actor.send({ type: "START_TURN" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags)).toContainEqual({
      type: "USE_WILD_RESURGENCE_CHARGE",
      slotLevel: { options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)] },
      cost: { charge: "spellSlot" },
      outcome: { summary: "Expend a spell slot to regain one Wild Shape use" },
    })
  })

  test("spent resources remove action, bonus-action, and charge-gated free tokens from the grouped surface", () => {
    const actor = makeActorWithInput(PHASE_2_MULTIGROUP_INPUT)
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 10,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    })
    actor.send({ type: "ENTER_COMBAT" })
    actor.send({ type: "START_TURN" })

    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "CONVERT_POINTS_TO_SLOT",
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "USE_SECOND_WIND",
      "USE_TIRELESS",
      "EXIT_COMBAT",
    ])

    actor.send({ type: "USE_TIRELESS", d8Roll: 4 })
    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "CONVERT_POINTS_TO_SLOT",
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "USE_SECOND_WIND",
      "EXIT_COMBAT",
    ])

    actor.send({ type: "USE_SECOND_WIND", d10Roll: 3 })
    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "EXIT_COMBAT",
    ])

    actor.send({ type: "USE_ARCANE_RECOVERY", slotLevel: spellSlotLevel(2) })
    expect(getAvailableActions(actor.getSnapshot().context, actor.getSnapshot().tags).map((token) => token.type)).toEqual([
      "USE_METAMAGIC",
      "EXIT_COMBAT",
    ])
  })
})
