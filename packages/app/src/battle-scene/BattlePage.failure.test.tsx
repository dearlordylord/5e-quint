// @vitest-environment jsdom
import type * as BattleRuntime from "@dnd/battle-runtime"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BattlePage } from "./BattlePage.tsx"
import { WIZARD_BATTLE_DEMO_META, WIZARD_BATTLE_DEMO_STEPS } from "./wizard-battle-demo.ts"

vi.mock("@dnd/battle-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof BattleRuntime>()
  const { Either } = await import("effect")
  return {
    ...actual,
    battlePresentedSnapshot: vi.fn(
      (
        session: Parameters<typeof actual.battlePresentedSnapshot>[0]
      ): ReturnType<typeof actual.battlePresentedSnapshot> => {
        const combatantId = session.state.combatants.keys().next().value
        return combatantId === undefined
          ? actual.battlePresentedSnapshot(session)
          : Either.left([
              {
                tag: "battleSnapshotPresentationIssue",
                combatantId,
                reason: "missingStatBlockPresentation"
              }
            ])
      }
    )
  }
})

describe("BattlePage presentation failure", () => {
  it("renders typed snapshot projection issues", () => {
    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("alert").textContent).toContain("missingStatBlockPresentation")
  })
})
