// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"

describe("CharacterCreationPage", () => {
  it("loads a complete example through canonical finalization and persists the draft", async () => {
    window.localStorage.clear()

    render(<CharacterCreationPage />)

    expect(screen.getByText("No illegal issues.")).toBeTruthy()
    expect(screen.queryByText("No open choices.")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Load Cleric Example" }))

    expect(screen.getAllByText("Review And Projections").length).toBeGreaterThan(0)
    expect(screen.getByText("This review uses the direct domain-level finalization path.")).toBeTruthy()
    expect(screen.getByText("Draft is ready for review.")).toBeTruthy()
    expect(screen.getByText("Battle Projection")).toBeTruthy()

    await waitFor(() => {
      expect(window.localStorage.getItem("dnd.characterDraft.v1")).toContain('"primaryClass":"cleric"')
    })
  })

  it("hydrates the persisted draft on mount", () => {
    window.localStorage.clear()
    window.localStorage.setItem(
      "dnd.characterDraft.v1",
      JSON.stringify({
        primaryClass: "fighter",
        advancement: [{ className: "fighter" }]
      })
    )

    render(<CharacterCreationPage />)

    const primaryClassSelect = screen.getByRole("combobox", { name: "Primary class" })
    if (!(primaryClassSelect instanceof HTMLSelectElement)) throw new Error("expected primary class select")
    expect(primaryClassSelect.value).toBe("fighter")
    expect(screen.getByText("Current advancement")).toBeTruthy()
  })

  it("surfaces open choices separately from illegal state", () => {
    window.localStorage.clear()
    render(<CharacterCreationPage />)

    expect(screen.getByText(/\d+ required choice\(s\) remain open\./)).toBeTruthy()
    expect(screen.getByText("No illegal issues.")).toBeTruthy()
    expect(screen.getByText("missingBackground")).toBeTruthy()
  })

  it("loads the level-5 fighter example through the canonical advancement path", async () => {
    window.localStorage.clear()

    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: "Load Fighter Lv5" }))

    expect(screen.getByText("Draft is ready for review.")).toBeTruthy()
    expect(screen.getByText("Level Up (current: 5)")).toBeTruthy()

    await waitFor(() => {
      const stored = window.localStorage.getItem("dnd.characterDraft.v1")
      expect(stored).toContain('"subclass":{"className":"fighter","subclass":"champion"}')
      expect(stored).toContain('"abilities":["str","str"]')
    })
  })

  it("levels up from review by projecting the finalized sheet back to draft", () => {
    window.localStorage.clear()
    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: "Load Fighter Example" }))
    fireEvent.click(screen.getByRole("button", { name: "+1 Fighter" }))

    expect(screen.getByText("Draft is ready for review.")).toBeTruthy()
    expect(screen.getByText("Level Up (current: 2)")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "+1 Fighter" }))

    expect(screen.getByText(/\d+ required choice\(s\) remain open\./)).toBeTruthy()
    expect(screen.getByText("missingSubclassSelection")).toBeTruthy()
    expect(screen.queryByText("Level Up (current: 3)")).toBeNull()
  })
})
