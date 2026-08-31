import type * as CharacterCreationRuntime from "@dnd/character-creation-runtime"
import type * as CharacterSheetRuntime from "@dnd/character-sheet-runtime"
import { Result } from "effect"
import { describe, expect, it, vi } from "vitest"

import { FIGHTER_EXAMPLE_DRAFT } from "./characterCreationPresets.ts"
import {
  appendStoredCharacterSheet,
  characterSheetSummary,
  createCharacterSheetFromDraft
} from "./characterCreationRuntime.ts"

const summaryFailures = vi.hoisted(() => ({
  freshSheet: false,
  hitDice: false,
  maximumHp: false,
  resources: false,
  wildShapeFacts: false
}))

vi.mock("@dnd/character-creation-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof CharacterCreationRuntime>()
  const { Result } = await import("effect")
  return {
    ...actual,
    characterBuildDruidWildShapeFacts: vi.fn((input: Parameters<typeof actual.characterBuildDruidWildShapeFacts>[0]) =>
      summaryFailures.wildShapeFacts
        ? Result.fail({ tag: "syntheticWildShapeFacts", message: "Synthetic Wild Shape facts failure." })
        : actual.characterBuildDruidWildShapeFacts(input)
    )
  }
})

vi.mock("@dnd/character-sheet-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof CharacterSheetRuntime>()
  const { Result } = await import("effect")
  const issue = { tag: "characterSheetIssue", message: "Synthetic projection failure." } as const
  return {
    ...actual,
    characterSheetHitDice: vi.fn(
      (
        sheet: Parameters<typeof actual.characterSheetHitDice>[0],
        unitLibrary: Parameters<typeof actual.characterSheetHitDice>[1]
      ) => (summaryFailures.hitDice ? Result.fail(issue) : actual.characterSheetHitDice(sheet, unitLibrary))
    ),
    characterSheetHitPointMaximum: vi.fn((input: Parameters<typeof actual.characterSheetHitPointMaximum>[0]) =>
      summaryFailures.maximumHp ? Result.fail(issue) : actual.characterSheetHitPointMaximum(input)
    ),
    characterSheetResources: vi.fn(
      (
        sheet: Parameters<typeof actual.characterSheetResources>[0],
        unitLibrary: Parameters<typeof actual.characterSheetResources>[1]
      ) => (summaryFailures.resources ? Result.fail(issue) : actual.characterSheetResources(sheet, unitLibrary))
    ),
    createFreshCharacterSheet: vi.fn(
      (
        input: Parameters<typeof actual.createFreshCharacterSheet>[0]
      ): ReturnType<typeof actual.createFreshCharacterSheet> =>
        summaryFailures.freshSheet
          ? Result.fail([{ code: "hitPointStateInvalid" }])
          : actual.createFreshCharacterSheet(input)
    )
  }
})

describe("character creation app failure projections", () => {
  it.each([
    ["maximumHp", "maximum HP"],
    ["hitDice", "Hit Dice"],
    ["resources", "resources"]
  ] as const)("preserves %s summary projection failures", (failure, _label) => {
    const sheet = createCharacterSheetFromDraft(FIGHTER_EXAMPLE_DRAFT)
    expect(Result.isSuccess(sheet)).toBe(true)
    if (Result.isFailure(sheet)) return
    summaryFailures[failure] = true
    try {
      const summary = characterSheetSummary(sheet.success)
      expect(Result.isFailure(summary)).toBe(true)
      if (Result.isFailure(summary)) {
        expect(summary.failure).toEqual({
          tag: "characterSheetInvalid",
          message: "Synthetic projection failure."
        })
      }
    } finally {
      summaryFailures[failure] = false
    }
  })

  it("replaces a stored sheet with the same durable identity", () => {
    const sheet = createCharacterSheetFromDraft(FIGHTER_EXAMPLE_DRAFT)
    expect(Result.isSuccess(sheet)).toBe(true)
    if (Result.isFailure(sheet)) return

    expect(appendStoredCharacterSheet([sheet.success], sheet.success)).toEqual([sheet.success])
  })

  it("preserves fresh Character Sheet construction failures", () => {
    summaryFailures.freshSheet = true
    try {
      const result = createCharacterSheetFromDraft(FIGHTER_EXAMPLE_DRAFT)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) expect(result.failure.tag).toBe("characterSheetInvalid")
    } finally {
      summaryFailures.freshSheet = false
    }
  })

  it("preserves Wild Shape fact projection failures", () => {
    summaryFailures.wildShapeFacts = true
    try {
      const result = createCharacterSheetFromDraft(FIGHTER_EXAMPLE_DRAFT)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toEqual({
          tag: "characterSheetInvalid",
          message: "Synthetic Wild Shape facts failure."
        })
      }
    } finally {
      summaryFailures.wildShapeFacts = false
    }
  })
})
