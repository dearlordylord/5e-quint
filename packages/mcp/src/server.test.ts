import { describe, expect, test } from "vitest"

import { classLevel } from "@dnd/core/types.ts"

import { createDemoActor, handleToolCall } from "./server.ts"

function readPayload(response: ReturnType<typeof handleToolCall>) {
  return JSON.parse(response.content[0]?.text ?? "null")
}

describe("MCP server adapter", () => {
  test("get_available_actions only returns the supported executable action set", () => {
    const actor = createDemoActor()

    const payload = readPayload(handleToolCall(actor, "get_available_actions", {}))

    expect(payload).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [
        {
          type: "ENTER_COMBAT",
          cost: {},
          outcome: { summary: "Enter combat (begin tracking turns and action economy)" },
        },
      ],
    })
  })

  test("execute_action round-trip works for enter combat, start turn, and second wind", () => {
    const actor = createDemoActor()

    const enterCombat = handleToolCall(actor, "execute_action", { type: "ENTER_COMBAT" })
    expect("isError" in enterCombat).toBe(false)
    expect(readPayload(enterCombat).success).toBe(true)

    const startTurn = handleToolCall(actor, "execute_action", { type: "START_TURN" })
    expect("isError" in startTurn).toBe(false)
    expect(readPayload(startTurn).success).toBe(true)

    const available = readPayload(handleToolCall(actor, "get_available_actions", {}))
    expect(available.bonusAction.map((token: { readonly type: string }) => token.type)).toEqual(["USE_SECOND_WIND"])
    expect(available.free.map((token: { readonly type: string }) => token.type)).toEqual(["EXIT_COMBAT"])

    const secondWind = handleToolCall(actor, "execute_action", { type: "USE_SECOND_WIND" })
    expect("isError" in secondWind).toBe(false)
    const secondWindPayload = readPayload(secondWind)
    expect(secondWindPayload.success).toBe(true)
    expect(secondWindPayload.state.hp).toBeGreaterThan(34)
    expect(secondWindPayload.state.hp).toBeLessThanOrEqual(44)
  })

  test("execute_action rejects actions that are not available in the current state", () => {
    const actor = createDemoActor()

    const response = handleToolCall(actor, "execute_action", { type: "START_TURN" })

    expect("isError" in response && response.isError).toBe(true)
    expect(readPayload(response)).toEqual({
      error: "START_TURN is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })
  })

  test("execute_action supports USE_HEROIC_INSPIRATION when the fighter has it", () => {
    const actor = createDemoActor({
      maxHp: 44,
      fighterLevel: classLevel(10),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(actor, "execute_action", { type: "ENTER_COMBAT" })
    handleToolCall(actor, "execute_action", { type: "START_TURN" })

    const available = readPayload(handleToolCall(actor, "get_available_actions", {}))
    expect(available.free).toContainEqual({
      type: "USE_HEROIC_INSPIRATION",
      cost: {},
      outcome: { summary: "Spend Heroic Inspiration to reroll a die and use the new roll" },
    })

    const response = handleToolCall(actor, "execute_action", { type: "USE_HEROIC_INSPIRATION" })
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.classStates.fighter.heroicInspiration).toBe(false)
  })

  test("execute_action supports USE_METAMAGIC with filtered legal options", () => {
    const actor = createDemoActor({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(actor, "execute_action", { type: "ENTER_COMBAT" })
    handleToolCall(actor, "execute_action", { type: "START_TURN" })

    const available = readPayload(handleToolCall(actor, "get_available_actions", {}))
    expect(available.free).toContainEqual({
      type: "USE_METAMAGIC",
      option: { options: ["careful", "subtle"] },
      cost: { charge: "sorceryPoints" },
      outcome: { summary: "Apply a currently legal known Metamagic option to the spell you are casting" },
    })

    const illegalBeforeUse = handleToolCall(actor, "execute_action", { type: "USE_METAMAGIC", option: "quickened" })
    expect("isError" in illegalBeforeUse && illegalBeforeUse.isError).toBe(true)
    expect(readPayload(illegalBeforeUse)).toEqual({
      error: "quickened Metamagic is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })

    const response = handleToolCall(actor, "execute_action", { type: "USE_METAMAGIC", option: "careful" })
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.classStates.sorcerer.sorceryPoints).toBe(4)
    expect(payload.state.classStates.sorcerer.metamagicUsedThisCast).toEqual(["careful"])
    expect(
      readPayload(handleToolCall(actor, "get_available_actions", {})).free.map((token: { readonly type: string }) => token.type),
    ).not.toContain("USE_METAMAGIC")
  })

  test("execute_action supports a dice-roll runtime action with USE_TIRELESS", () => {
    const actor = createDemoActor({
      maxHp: 32,
      rangerLevel: classLevel(10),
      wisMod: 3,
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(actor, "execute_action", { type: "ENTER_COMBAT" })
    handleToolCall(actor, "execute_action", { type: "START_TURN" })

    const available = readPayload(handleToolCall(actor, "get_available_actions", {}))
    expect(available.action).toContainEqual({
      type: "USE_TIRELESS",
      cost: { action: true, charge: "tireless" },
      outcome: { summary: "Gain 1d8 + 3 temporary HP (minimum 1)" },
    })

    const response = handleToolCall(actor, "execute_action", { type: "USE_TIRELESS" })
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.tempHp).toBeGreaterThanOrEqual(2)
    expect(payload.state.tempHp).toBeLessThanOrEqual(11)
    expect(payload.state.actionsRemaining).toBe(0)
  })

  test("execute_action supports a hole pass-through action with USE_ARCANE_RECOVERY", () => {
    const actor = createDemoActor({
      maxHp: 24,
      wizardLevel: classLevel(4),
      slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    })
    handleToolCall(actor, "execute_action", { type: "ENTER_COMBAT" })
    handleToolCall(actor, "execute_action", { type: "START_TURN" })

    const available = readPayload(handleToolCall(actor, "get_available_actions", {}))
    expect(available.free).toContainEqual({
      type: "USE_ARCANE_RECOVERY",
      slotLevel: { options: [2] },
      cost: { charge: "arcaneRecovery" },
      outcome: { summary: "Recover one expended spell slot of the chosen level and use Arcane Recovery" },
    })

    const illegal = handleToolCall(actor, "execute_action", { type: "USE_ARCANE_RECOVERY", slotLevel: 1 })
    expect("isError" in illegal && illegal.isError).toBe(true)
    expect(readPayload(illegal)).toEqual({
      error: "Arcane Recovery for a level 1 slot is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    })

    const response = handleToolCall(actor, "execute_action", { type: "USE_ARCANE_RECOVERY", slotLevel: 2 })
    expect("isError" in response).toBe(false)
    const payload = readPayload(response)
    expect(payload.success).toBe(true)
    expect(payload.state.slotsCurrent).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0])
    expect(payload.state.classStates.wizard.arcaneRecoveryUsed).toBe(true)
  })
})
