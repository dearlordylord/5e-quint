import { describe, expect, test } from "vitest"

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
})
