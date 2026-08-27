import type * as BattleRuntime from "@dnd/battle-runtime"
import { describe, expect, test, vi } from "vitest"

let replacedDeathSaveFrontier = false

vi.mock("@dnd/battle-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof BattleRuntime>()
  return {
    ...actual,
    endBattleRuntimeTurn: vi.fn((input: Parameters<typeof actual.endBattleRuntimeTurn>[0]) => {
      const result = actual.endBattleRuntimeTurn(input)
      if (!replacedDeathSaveFrontier && result.tag === "needsHoles" && result.envelope.frontier.kind === "holes") {
        replacedDeathSaveFrontier = true
        return {
          ...result,
          envelope: {
            ...result.envelope,
            frontier: { kind: "acts", acts: [] }
          }
        }
      }
      return result
    })
  }
})

describe("wizard battle demo checkpoint protocol", () => {
  test("rejects an end-turn result that loses its expected death-save frontier", async () => {
    await expect(import("./wizard-battle-demo.ts")).rejects.toThrow(
      "Expected End Turn to expose a Runtime Hole frontier."
    )
    expect(replacedDeathSaveFrontier).toBe(true)
  })
})
