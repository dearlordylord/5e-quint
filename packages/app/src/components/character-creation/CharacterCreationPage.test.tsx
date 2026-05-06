// @vitest-environment jsdom
import { createCharacterDraft } from "@dnd/character-creation-runtime"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"
import {
  CHARACTER_DRAFT_STORAGE_KEY,
  CHARACTER_SHEET_STORAGE_KEY
} from "#/components/character-creation/characterCreationRuntime.ts"

describe("CharacterCreationPage", () => {
  it("loads a complete example and persists the CharacterDraft", async () => {
    window.localStorage.clear()

    render(<CharacterCreationPage />)

    expect(screen.getByText(/\d+ creation hole\(s\) remain open\./)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))

    expect(screen.getByText("Draft finalizes to a Character Build.")).toBeTruthy()
    expect(screen.getAllByText("Character Build").length).toBeGreaterThan(0)
    expect(screen.getByText("In-Play State")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))
    expect(screen.getByText("Character Session")).toBeTruthy()

    await waitFor(() => {
      expect(window.localStorage.getItem(CHARACTER_DRAFT_STORAGE_KEY)).toContain("class_fighter")
      expect(window.localStorage.getItem(CHARACTER_SHEET_STORAGE_KEY)).toContain("maximumHp")
    })
  })

  it("hydrates a persisted draft on mount", () => {
    window.localStorage.clear()
    window.localStorage.setItem(CHARACTER_DRAFT_STORAGE_KEY, JSON.stringify(createCharacterDraft({})))

    render(<CharacterCreationPage />)

    expect(screen.getByText(/\d+ creation hole\(s\) remain open\./)).toBeTruthy()
    expect(screen.getByRole("button", { name: /^1\. Choose Class$/ })).toBeTruthy()
  })

  it("does not hydrate malformed persisted draft data", async () => {
    window.localStorage.clear()
    window.localStorage.setItem(
      CHARACTER_DRAFT_STORAGE_KEY,
      JSON.stringify({
        draftId: "stale:malformed",
        revision: 1,
        selections: {
          choices: [{ kind: "unitChoice", source: { tag: "unitChoice" } }]
        }
      })
    )

    render(<CharacterCreationPage />)

    await waitFor(() => {
      expect(window.localStorage.getItem(CHARACTER_DRAFT_STORAGE_KEY)).toContain('"choices":[]')
    })
  })

  it("submits the initial progression through a runtime fill", async () => {
    window.localStorage.clear()

    render(<CharacterCreationPage />)

    const progression = screen.getByRole("combobox", { name: /Progression\.Initial/i })
    if (!(progression instanceof HTMLSelectElement)) throw new Error("Expected progression control to be a select.")
    const initialProgression = progression.options.item(1)?.value
    expect(initialProgression).toBeTruthy()
    fireEvent.change(progression, { target: { value: initialProgression } })

    await waitFor(() => {
      expect(window.localStorage.getItem(CHARACTER_DRAFT_STORAGE_KEY)).toContain("class_fighter")
    })
  })
})
