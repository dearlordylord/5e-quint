// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"

describe("CharacterCreationPage", () => {
  it("loads a complete example through canonical finalization and persists the draft", async () => {
    window.localStorage.clear()

    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: "Load Cleric Example" }))

    expect(screen.getAllByText("Review And Projections").length).toBeGreaterThan(0)
    expect(screen.getByText("This review uses the direct domain-level finalization path.")).toBeTruthy()
    expect(screen.getByText("Battle Projection")).toBeTruthy()

    await waitFor(() => {
      expect(window.localStorage.getItem("dnd.characterDraft.v1")).toContain('"primaryClass":"cleric"')
    })
  })

  it("hydrates the persisted draft on mount", () => {
    window.localStorage.setItem(
      "dnd.characterDraft.v1",
      JSON.stringify({
        primaryClass: "fighter",
        classLevels: {
          barbarian: 0,
          bard: 0,
          cleric: 0,
          druid: 0,
          fighter: 1,
          monk: 0,
          paladin: 0,
          ranger: 0,
          rogue: 0,
          sorcerer: 0,
          warlock: 0,
          wizard: 0
        }
      })
    )

    render(<CharacterCreationPage />)

    const primaryClassSelect = screen.getByRole("combobox", { name: "Primary class" })
    if (!(primaryClassSelect instanceof HTMLSelectElement)) throw new Error("expected primary class select")
    expect(primaryClassSelect.value).toBe("fighter")
    expect(screen.getByText("Current class levels")).toBeTruthy()
  })
})
