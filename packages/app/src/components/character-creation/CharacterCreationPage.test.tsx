// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CharacterCreationPage } from "#/components/character-creation/CharacterCreationPage.tsx"

describe("CharacterCreationPage", () => {
  it("loads a complete example and finalizes a local Character Sheet", () => {
    render(<CharacterCreationPage />)

    expect(screen.getByText(/\d+ creation hole\(s\) remain open\./)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))

    expect(screen.getByText("Draft finalizes to a Character Build.")).toBeTruthy()
    expect(screen.getAllByText("Character Build").length).toBeGreaterThan(0)
    expect(screen.getByText("In-Play State")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))
    expect(screen.getByText("Character Session")).toBeTruthy()
  })

  it("submits the initial progression through a runtime fill", () => {
    render(<CharacterCreationPage />)

    const progression = screen.getByRole("combobox", { name: /Progression\.Initial/i })
    if (!(progression instanceof HTMLSelectElement)) throw new Error("Expected progression control to be a select.")
    const initialProgression = progression.options.item(1)?.value
    expect(initialProgression).toBeTruthy()
    fireEvent.change(progression, { target: { value: initialProgression } })

    expect(progression.value).toBe(initialProgression)
  })
})
