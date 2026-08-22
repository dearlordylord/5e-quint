// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
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
  vi.useRealTimers()
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
  }, 30_000)

  it("highlights the current reaction creature in the initiative tracker", () => {
    window.history.replaceState(null, "", "/battle?step=4")

    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("button", { name: /Gray Elf/ }).className).toContain("border-violet-500")
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it("supports button, keyboard, scrubber, scroll, and autoplay controls", () => {
    vi.useFakeTimers()
    window.history.replaceState(null, "", "/battle")
    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(window.location.search).toBe("?step=1")
    fireEvent.click(screen.getByRole("button", { name: "Prev" }))
    expect(window.location.search).toBe("")

    fireEvent.keyDown(window, { key: "End" })
    expect(window.location.search).toBe(`?step=${WIZARD_BATTLE_DEMO_STEPS.length - 1}`)
    fireEvent.keyDown(window, { key: "Home" })
    expect(window.location.search).toBe("")
    fireEvent.keyDown(window, { key: "ArrowRight" })
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    fireEvent.keyDown(window, { key: "PageDown" })

    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } })
    expect(window.location.search).toBe("?step=2")

    Object.defineProperty(window, "scrollY", { configurable: true, value: 500 })
    fireEvent.scroll(window)
    expect(screen.getAllByRole("button", { name: "Next" })).toHaveLength(2)
    const stickyHeader = document.querySelector(".sticky")
    if (!(stickyHeader instanceof HTMLElement)) throw new Error("Expected sticky battle header.")
    const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(stickyHeader, "offsetHeight")
    Object.defineProperty(stickyHeader, "offsetHeight", { configurable: true, value: undefined })
    fireEvent.scroll(window)
    if (offsetHeightDescriptor === undefined) delete (stickyHeader as { offsetHeight?: number }).offsetHeight
    else Object.defineProperty(stickyHeader, "offsetHeight", offsetHeightDescriptor)

    fireEvent.click(screen.getAllByRole("button", { name: "Play" })[0])
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(window.location.search).toBe("?step=3")
    fireEvent.click(screen.getAllByRole("button", { name: "Pause" })[0])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole("button", { name: "Reset" })[0])
    expect(window.location.search).toBe("")
    vi.useRealTimers()
  })

  it.each(["?step=invalid", "?step=-1", `?step=${WIZARD_BATTLE_DEMO_STEPS.length}`])(
    "falls back to the first step for %s",
    (search) => {
      window.history.replaceState(null, "", `/battle${search}`)
      render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

      expect(screen.getAllByText(WIZARD_BATTLE_DEMO_STEPS[0].title).length).toBeGreaterThan(0)
      cleanup()
    }
  )

  it("stops autoplay at the final step", () => {
    vi.useFakeTimers()
    window.history.replaceState(null, "", "/battle")
    const steps = [WIZARD_BATTLE_DEMO_STEPS[0], WIZARD_BATTLE_DEMO_STEPS[1]] as const
    render(<BattlePage steps={steps} meta={WIZARD_BATTLE_DEMO_META} />)

    fireEvent.click(screen.getByRole("button", { name: "Play" }))
    act(() => {
      vi.advanceTimersByTime(900)
    })

    expect(screen.getByRole("button", { name: "Play" }).hasAttribute("disabled")).toBe(true)
  })
})
