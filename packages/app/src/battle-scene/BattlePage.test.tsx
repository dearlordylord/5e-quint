// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BattlePage } from "./BattlePage.tsx"
import { WIZARD_BATTLE_DEMO_META, WIZARD_BATTLE_DEMO_STEPS } from "./wizard-battle-demo.ts"

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    throw new Error(`Unexpected battle page console error: ${args.map(String).join(" ")}`)
  })
})

afterEach(() => {
  cleanup()
  consoleErrorSpy.mockRestore()
})

describe("BattlePage", () => {
  it("renders every wizard battle playback step without page errors", () => {
    for (const [index] of WIZARD_BATTLE_DEMO_STEPS.entries()) {
      cleanup()
      window.history.replaceState(null, "", `/battle?step=${index}`)

      const { container } = render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)
      const step = WIZARD_BATTLE_DEMO_STEPS[index] ?? WIZARD_BATTLE_DEMO_STEPS[0]

      expect(screen.getByText("Battle Visualizer")).toBeTruthy()
      expect(screen.getAllByText(step.title).length).toBeGreaterThan(0)
      expect(container.innerHTML).toContain("/sprites/5.png")
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    }
  })

  it("highlights the current reaction creature in the initiative tracker", () => {
    window.history.replaceState(null, "", "/battle?step=2")

    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("button", { name: /Gray Elf/ }).className).toContain("border-violet-500")
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
