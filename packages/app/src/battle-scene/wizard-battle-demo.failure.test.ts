import type * as BattleRuntime from "@dnd/battle-runtime"
import { describe, expect, test, vi } from "vitest"

const { recordDeathSaveFrontierReplacement } = vi.hoisted(() => ({
  recordDeathSaveFrontierReplacement:
    vi.fn<
      (identity: {
        readonly subjectActorId: BattleRuntime.CombatantId
        readonly deathSavingThrowCombatantId: BattleRuntime.CombatantId
      }) => void
    >()
}))

vi.mock("@dnd/battle-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof BattleRuntime>()
  return {
    ...actual,
    endBattleRuntimeTurn: vi.fn((input: Parameters<typeof actual.endBattleRuntimeTurn>[0]) => {
      const result = actual.endBattleRuntimeTurn(input)
      if (result.tag !== "needsHoles" || result.envelope.frontier.kind !== "holes") return result
      const deathSavingThrow = result.envelope.frontier.holes.find((hole) => hole.kind === "deathSavingThrow")
      const subject = result.envelope.frontier.subject
      if (
        recordDeathSaveFrontierReplacement.mock.calls.length === 0 &&
        deathSavingThrow !== undefined &&
        subject.tag === "runtimeCommand" &&
        subject.command === "endTurn" &&
        subject.actorId === input.actorId
      ) {
        recordDeathSaveFrontierReplacement({
          subjectActorId: subject.actorId,
          deathSavingThrowCombatantId: deathSavingThrow.combatantId
        })
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
    expect(recordDeathSaveFrontierReplacement).toHaveBeenCalledOnce()
  })
})
