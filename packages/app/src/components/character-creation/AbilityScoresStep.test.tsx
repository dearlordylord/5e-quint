// @vitest-environment jsdom
import { createCharacterDraft } from "@dnd/character-creation-runtime"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AbilityScoresStep } from "./AbilityScoresStep.tsx"
import { applyCharacterCreationFill, assessCharacterDraft } from "./characterCreationRuntime.ts"

const STANDARD_ARRAY_BY_ABILITY = {
  cha: 8,
  con: 13,
  dex: 14,
  int: 10,
  str: 15,
  wis: 12
} as const

describe("AbilityScoresStep", () => {
  it("builds and submits a complete runtime ability-score fill", () => {
    const holes = assessCharacterDraft(createCharacterDraft({})).holes
    const onFill = vi.fn()
    render(<AbilityScoresStep holes={holes} onFill={onFill} />)

    expect(screen.getByText(/complete all six scores/i)).toBeTruthy()
    const submit = screen.getByRole("button", { name: "Submit Ability Scores" })
    expect(submit).toHaveProperty("disabled", true)

    for (const [ability, score] of Object.entries(STANDARD_ARRAY_BY_ABILITY)) {
      fireEvent.change(screen.getByRole("spinbutton", { name: new RegExp(ability, "i") }), {
        target: { value: String(score) }
      })
    }

    expect(screen.getByText(/Point-buy cost:/).textContent).not.toContain("complete all six")
    expect(submit).toHaveProperty("disabled", false)
    fireEvent.click(submit)
    expect(onFill).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "abilityScores",
        method: "standardArray"
      })
    )
  })

  it("handles method changes, invalid point-buy scores, and clearing a score", () => {
    const holes = assessCharacterDraft(createCharacterDraft({})).holes
    render(<AbilityScoresStep holes={holes} onFill={vi.fn()} />)

    const method = screen.getByRole("combobox", { name: "Generation method" })
    fireEvent.change(method, { target: { value: "unsupported" } })
    expect((method as HTMLSelectElement).value).toBe("standardArray")
    fireEvent.change(method, {
      target: { value: "pointBuy" }
    })
    for (const ability of Object.keys(STANDARD_ARRAY_BY_ABILITY)) {
      fireEvent.change(screen.getByRole("spinbutton", { name: new RegExp(ability, "i") }), {
        target: { value: "18" }
      })
    }
    expect(screen.getByText(/invalid point-buy scores/i)).toBeTruthy()
    fireEvent.change(screen.getByRole("spinbutton", { name: /str/i }), {
      target: { value: "" }
    })
    expect(screen.getByText(/complete all six scores/i)).toBeTruthy()
  })

  it("renders the accepted state when no ability-score hole remains", () => {
    render(<AbilityScoresStep holes={[]} onFill={vi.fn()} />)

    expect(screen.getByText("Ability scores have been accepted by the runtime.")).toBeTruthy()
  })

  it("submits a discovered background ability-score increase choice", () => {
    let draft = createCharacterDraft({})
    for (const path of ["draft.progression.initial", "draft.background"]) {
      const hole = assessCharacterDraft(draft).holes.find(
        (candidate) => candidate.kind === "choice" && candidate.source.tag === "draft" && candidate.source.path === path
      )
      if (hole?.kind !== "choice") throw new Error(`Expected ${path} choice hole.`)
      const [option] = hole.options
      const result = applyCharacterCreationFill(draft, {
        kind: "choice",
        holeId: hole.holeId,
        optionIds: [option.optionId]
      })
      if (result.tag !== "accepted") throw new Error(`Expected accepted ${path} fill.`)
      draft = result.draft
    }
    const holes = assessCharacterDraft(draft).holes
    const onFill = vi.fn()
    render(<AbilityScoresStep holes={holes} onFill={onFill} />)

    const choice = screen.getAllByRole("button").find((button) => button.textContent !== "Submit Ability Scores")
    if (choice === undefined) throw new Error("Expected background ability-score choice.")
    fireEvent.click(choice)

    expect(onFill).toHaveBeenCalledWith(expect.objectContaining({ kind: "choice" }))
  })
})
