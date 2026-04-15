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

  it("levels up from review by previewing the next advancement draft before reassessment", () => {
    window.localStorage.clear()
    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: "Load Fighter Example" }))
    expect(
      screen.getByText(
        "Starts from the finalized sheet, previews the next canonical advancement draft, and lets the assessment pipeline surface any newly opened choices before a finalized sheet exists again."
      )
    ).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "+1 Fighter" }))

    expect(screen.getByText("Draft is ready for review.")).toBeTruthy()
    expect(screen.getByText("Level Up (current: 2)")).toBeTruthy()
    expect(window.localStorage.getItem("dnd.characterDraft.v1")).not.toContain("classLevels")
    expect(JSON.parse(window.localStorage.getItem("dnd.characterDraft.v1") ?? "null")).toMatchObject({
      advancement: [{ className: "fighter" }, { className: "fighter" }]
    })

    fireEvent.click(screen.getByRole("button", { name: "+1 Fighter" }))

    expect(screen.getByText(/\d+ required choice\(s\) remain open\./)).toBeTruthy()
    expect(screen.getAllByText("missingSubclassSelection").length).toBeGreaterThan(0)
    expect(screen.queryByText("Level Up (current: 3)")).toBeNull()
  })

  it("dispatches single-pick open-choice payloads through core to commit a druid primal order", () => {
    window.localStorage.clear()
    window.localStorage.setItem(
      "dnd.characterDraft.v1",
      JSON.stringify({
        primaryClass: "druid",
        advancement: [{ className: "druid" }]
      })
    )

    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: /^5\. Fill In Details$/ }))

    const primalOrderSelect = screen
      .getAllByRole("combobox")
      .find((el) => el instanceof HTMLSelectElement && Array.from(el.options).some((opt) => opt.value === "magician"))
    if (!(primalOrderSelect instanceof HTMLSelectElement)) throw new Error("expected druid primal order select")

    fireEvent.change(primalOrderSelect, { target: { value: "magician" } })

    const stored = JSON.parse(window.localStorage.getItem("dnd.characterDraft.v1") ?? "null")
    expect(stored.choices?.druidPrimalOrder).toBe("magician")
  })

  it("keeps the druid primal order picker visible after commit, and supports change and clear", () => {
    window.localStorage.clear()
    window.localStorage.setItem(
      "dnd.characterDraft.v1",
      JSON.stringify({
        primaryClass: "druid",
        advancement: [{ className: "druid" }],
        choices: { druidPrimalOrder: "magician" }
      })
    )

    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: /^5\. Fill In Details$/ }))

    const pickPrimal = () =>
      screen
        .getAllByRole("combobox")
        .find(
          (el) => el instanceof HTMLSelectElement && Array.from(el.options).some((opt) => opt.value === "magician")
        ) as HTMLSelectElement | undefined

    const primal1 = pickPrimal()
    if (primal1 == null) throw new Error("expected druid primal order select to remain after commit")
    expect(primal1.value).toBe("magician")

    fireEvent.change(primal1, { target: { value: "warden" } })
    expect(JSON.parse(window.localStorage.getItem("dnd.characterDraft.v1") ?? "null").choices?.druidPrimalOrder).toBe(
      "warden"
    )

    const primal2 = pickPrimal()
    if (primal2 == null) throw new Error("expected druid primal order select to remain visible after change")
    fireEvent.change(primal2, { target: { value: "" } })
    const cleared = JSON.parse(window.localStorage.getItem("dnd.characterDraft.v1") ?? "null")
    expect(cleared.choices?.druidPrimalOrder).toBeUndefined()
  })

  it("dispatches multi-pick open-choice payloads through core to commit primary class skill picks", () => {
    window.localStorage.clear()
    window.localStorage.setItem(
      "dnd.characterDraft.v1",
      JSON.stringify({
        primaryClass: "fighter",
        advancement: [{ className: "fighter" }]
      })
    )

    render(<CharacterCreationPage />)

    fireEvent.click(screen.getByRole("button", { name: /^5\. Fill In Details$/ }))

    const acrobatics = screen.getByRole("checkbox", { name: "Acrobatics" })
    const perception = screen.getByRole("checkbox", { name: "Perception" })
    fireEvent.click(acrobatics)
    fireEvent.click(perception)

    const stored = JSON.parse(window.localStorage.getItem("dnd.characterDraft.v1") ?? "null")
    expect(stored.choices?.primaryClassSkills).toEqual(["acrobatics", "perception"])
  })
})
