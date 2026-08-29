// @vitest-environment jsdom
import { SORCERER_FONT_OF_MAGIC_UNIT_ID } from "@dnd/character-creation-runtime"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CharacterCreationPage } from "./CharacterCreationPage.tsx"
import type * as CharacterCreationRuntime from "./characterCreationRuntime.ts"

const pageFailures = vi.hoisted(() => ({
  fillRejected: false,
  invalidAssessment: false,
  richSummary: false,
  sheetCreation: false,
  sheetSummary: false
}))

vi.mock("#/components/character-creation/characterCreationRuntime.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof CharacterCreationRuntime>()
  const { Result } = await import("effect")
  const { unitId } = await import("@dnd/shared/game-facts")
  const { Hp, resourceCount, spellSlotLevel } = await import("@dnd/shared/types")
  return {
    ...actual,
    assessCharacterDraft: vi.fn(
      (draft: Parameters<typeof actual.assessCharacterDraft>[0]): ReturnType<typeof actual.assessCharacterDraft> => {
        const assessment = actual.assessCharacterDraft(draft)
        const invalidFinalization: typeof assessment.finalization = {
          tag: "invalid",
          issues: [{ tag: "illegalFinalization", cause: { tag: "draftIncomplete" } }]
        }
        return pageFailures.invalidAssessment
          ? {
              ...assessment,
              finalization: invalidFinalization
            }
          : assessment
      }
    ),
    applyCharacterCreationFill: vi.fn(
      (
        draft: Parameters<typeof actual.applyCharacterCreationFill>[0],
        fill: Parameters<typeof actual.applyCharacterCreationFill>[1]
      ): ReturnType<typeof actual.applyCharacterCreationFill> => {
        const result = actual.applyCharacterCreationFill(draft, fill)
        return pageFailures.fillRejected && result.tag === "accepted"
          ? {
              tag: "rejected",
              draft,
              holes: result.holes,
              issues: [
                {
                  tag: "illegalBatch",
                  code: "staleRevision",
                  message: "Synthetic rejected fill."
                }
              ],
              finalization: result.finalization
            }
          : result
      }
    ),
    characterSheetSummary: vi.fn(
      (sheet: Parameters<typeof actual.characterSheetSummary>[0]): ReturnType<typeof actual.characterSheetSummary> => {
        if (pageFailures.sheetSummary) {
          return Result.fail({
            tag: "characterSheetInvalid",
            message: "Synthetic summary failure."
          })
        }
        const summary = actual.characterSheetSummary(sheet)
        return pageFailures.richSummary && Result.isSuccess(summary)
          ? Result.succeed({
              ...summary.success,
              pactSlots: {
                count: resourceCount(2),
                expended: resourceCount(1),
                slotLevel: spellSlotLevel(2)
              },
              spellSlots: [
                {
                  count: resourceCount(3),
                  expended: resourceCount(1),
                  spellLevel: spellSlotLevel(1)
                }
              ],
              resources: [
                {
                  count: resourceCount(2),
                  expended: resourceCount(1),
                  sourceUnitId: unitId("synthetic:resource-source"),
                  spellId: unitId("synthetic:resource-spell"),
                  tag: "spellAccessFreeCast"
                },
                {
                  count: resourceCount(2),
                  expended: resourceCount(1),
                  resetCadence: { kind: "long_rest" },
                  resource: { cap: { kind: "fixed", uses: 2 }, kind: "use_count" },
                  tag: "useCountResource",
                  unitId: unitId("synthetic:use-count-resource")
                },
                {
                  count: resourceCount(2),
                  expended: resourceCount(1),
                  resetCadence: { kind: "long_rest" },
                  resource: {
                    cap: { kind: "fixed", uses: 2 },
                    kind: "point_pool",
                    poolId: "sorcery_points"
                  },
                  tag: "pointPoolResource",
                  unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID
                }
              ],
              tempHp: Hp(2)
            })
          : summary
      }
    ),
    createCharacterSheetFromDraft: vi.fn(
      (
        draft: Parameters<typeof actual.createCharacterSheetFromDraft>[0],
        input?: Parameters<typeof actual.createCharacterSheetFromDraft>[1]
      ): ReturnType<typeof actual.createCharacterSheetFromDraft> =>
        pageFailures.sheetCreation
          ? Result.fail({
              tag: "characterSheetInvalid",
              message: "Synthetic sheet creation failure."
            })
          : actual.createCharacterSheetFromDraft(draft, input)
    )
  }
})

describe("CharacterCreationPage failure presentation", () => {
  it("shows an invalid finalization assessment", () => {
    pageFailures.invalidAssessment = true
    try {
      render(<CharacterCreationPage />)

      expect(screen.getByText("1 finalization issue(s) require fixes.")).toBeTruthy()
    } finally {
      pageFailures.invalidAssessment = false
    }
  })

  it("shows a typed Character Sheet creation failure", () => {
    pageFailures.sheetCreation = true
    try {
      render(<CharacterCreationPage />)
      fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))
      fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))

      expect(screen.getByText("Synthetic sheet creation failure.")).toBeTruthy()
    } finally {
      pageFailures.sheetCreation = false
    }
  })

  it("shows typed summary failures in the sheet list and selected session", () => {
    pageFailures.sheetSummary = true
    try {
      render(<CharacterCreationPage />)
      fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))
      fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))

      expect(screen.getAllByText("Synthetic summary failure.")).toHaveLength(2)
    } finally {
      pageFailures.sheetSummary = false
    }
  })

  it("renders temporary HP and ordinary and Pact Slot projections", () => {
    pageFailures.richSummary = true
    try {
      render(<CharacterCreationPage />)
      fireEvent.click(screen.getByRole("button", { name: "Load Orc Soldier Fighter 1" }))
      fireEvent.click(screen.getByRole("button", { name: "Finalize Character Sheet" }))

      expect(screen.getByText(/2 temp/)).toBeTruthy()
      expect(screen.getByText("Level 1: 1/3")).toBeTruthy()
      expect(screen.getByText("Level 2: 1/2")).toBeTruthy()
      expect(screen.getByText(/synthetic:resource-source: 1\/2/)).toBeTruthy()
      expect(screen.getByText(/synthetic:use-count-resource: 1\/2/)).toBeTruthy()
      expect(screen.getByText(/sorcerer_font_of_magic: 1\/2/)).toBeTruthy()
    } finally {
      pageFailures.richSummary = false
    }
  })

  it("renders typed rejected-fill issues", () => {
    pageFailures.fillRejected = true
    try {
      render(<CharacterCreationPage />)
      const progression = screen.getByRole("combobox", { name: /Progression\.Initial/i })
      if (!(progression instanceof HTMLSelectElement)) throw new Error("Expected progression select.")
      fireEvent.change(progression, { target: { value: progression.options.item(1)?.value } })

      expect(screen.getByText("Last rejected fill")).toBeTruthy()
      expect(screen.getByText("Synthetic rejected fill.")).toBeTruthy()
    } finally {
      pageFailures.fillRejected = false
    }
  })
})
