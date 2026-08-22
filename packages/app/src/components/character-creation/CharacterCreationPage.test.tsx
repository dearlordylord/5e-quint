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

  it("navigates with buttons and keys while ignoring form-control key events", () => {
    render(<CharacterCreationPage />)

    const previous = screen.getByRole("button", { name: "Previous step" })
    const next = screen.getByRole("button", { name: "Next step" })
    expect(previous).toHaveProperty("disabled", true)
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    fireEvent.keyDown(window, { key: "Escape" })

    fireEvent.click(next)
    expect(screen.getByText("2. Determine Origin", { selector: "h2" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByText("3. Determine Ability Scores", { selector: "h2" })).toBeTruthy()
    const method = screen.getByRole("combobox", { name: "Generation method" })
    fireEvent.keyDown(method, { key: "ArrowRight" })
    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Str" }), { key: "ArrowRight" })
    const textarea = document.createElement("textarea")
    document.body.append(textarea)
    fireEvent.keyDown(textarea, { key: "ArrowRight" })
    textarea.remove()
    const editor = document.createElement("div")
    editor.contentEditable = "true"
    Object.defineProperty(editor, "isContentEditable", { value: true })
    document.body.append(editor)
    fireEvent.keyDown(editor, { key: "ArrowRight" })
    editor.remove()
    const panel = document.createElement("div")
    Object.defineProperty(panel, "isContentEditable", { value: false })
    document.body.append(panel)
    fireEvent.keyDown(panel, { key: "Escape" })
    panel.remove()
    expect(screen.getByText("3. Determine Ability Scores", { selector: "h2" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(screen.getByText("2. Determine Origin", { selector: "h2" })).toBeTruthy()
    fireEvent.click(previous)
    expect(screen.getByText("1. Choose Class", { selector: "h2" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Review Character" }))
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByText("Review Character", { selector: "h2" })).toBeTruthy()
  })

  it("stores two finalized sheets, switches selection, and resets the draft", () => {
    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))
    fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))
    fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 2" }))
    fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))

    const sheetButtons = screen.getAllByRole("button", { name: /app:character:/ })
    expect(sheetButtons).toHaveLength(2)
    const [firstSheetButton] = sheetButtons
    fireEvent.click(firstSheetButton)
    expect(firstSheetButton.className).toContain("border-emerald-500")

    fireEvent.click(screen.getByRole("button", { name: "Reset Draft" }))
    expect(screen.getByText("1. Choose Class", { selector: "h2" })).toBeTruthy()
    expect(screen.getByText(/\d+ creation hole\(s\) remain open\./)).toBeTruthy()
  })
})
