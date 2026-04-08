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
import { classLevel } from "#/types.ts"

const FIGHTER_5_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(5),
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

const SORCERER_5_INPUT: DndMachineInput = {
  maxHp: 30,
  sorcererLevel: classLevel(5),
  knownMetamagicOptions: ["careful", "subtle"],
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
})
