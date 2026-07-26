// @vitest-environment jsdom
import {
  boundedChoiceCardinality,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  createCharacterDraft,
  creationChoiceOptionId,
  type CreationFill,
  type CreationFinalizationResult,
  type CreationHole,
  LOADOUT_WEAPON_SLOT,
  loadoutEquipmentUnitId,
  unitChoiceKey,
  unitChoiceSourceUnitId
} from "@dnd/character-creation-runtime"
import { fireEvent, render, screen } from "@testing-library/react"
import { Either } from "effect"
import { describe, expect, it, vi } from "vitest"

import { FIGHTER_EXAMPLE_DRAFT } from "./characterCreationPresets.ts"
import { applyCharacterCreationFill, assessCharacterDraft } from "./characterCreationRuntime.ts"
import { CharacterCreationStepContent } from "./CharacterCreationStepContent.tsx"

function acceptFill(draft: ReturnType<typeof createCharacterDraft>, fill: CreationFill) {
  const result = applyCharacterCreationFill(draft, fill)
  if (result.tag !== "accepted") {
    throw new Error(`Expected accepted test fill: ${JSON.stringify(result.issues)}`)
  }
  return result.draft
}

describe("CharacterCreationStepContent", () => {
  it("submits a single-choice class hole and ignores the placeholder", () => {
    const draft = createCharacterDraft({})
    const assessment = assessCharacterDraft(draft)
    const onFill = vi.fn()
    render(
      <CharacterCreationStepContent
        currentStep="class"
        draft={draft}
        finalization={assessment.finalization}
        holes={assessment.holes}
        onFill={onFill}
      />
    )
    const picker = screen.getByRole("combobox", { name: /Progression\.Initial/i })

    fireEvent.change(picker, { target: { value: "" } })
    expect(onFill).not.toHaveBeenCalled()
    const option = picker.querySelectorAll("option").item(1)
    fireEvent.change(picker, { target: { value: option.value } })
    expect(onFill).toHaveBeenCalledWith(expect.objectContaining({ kind: "choice", optionIds: [option.value] }))
  })

  it("supports bounded multi-choice holes, including deselection and the maximum gate", () => {
    const draft = createCharacterDraft({})
    const progressionHole = assessCharacterDraft(draft).holes.find(
      (hole) =>
        hole.kind === "choice" && hole.source.tag === "draft" && hole.source.path === "draft.progression.initial"
    )
    if (progressionHole?.kind !== "choice") throw new Error("Expected progression choice hole.")
    const [progressionOption] = progressionHole.options
    const progressed = acceptFill(draft, {
      kind: "choice",
      holeId: progressionHole.holeId,
      optionIds: [progressionOption.optionId]
    })
    const assessment = assessCharacterDraft(progressed)
    const onFill = vi.fn()
    render(
      <CharacterCreationStepContent
        currentStep="origin"
        draft={progressed}
        finalization={assessment.finalization}
        holes={assessment.holes}
        onFill={onFill}
      />
    )

    const languageSubmit = screen.getByRole("button", { name: /Submit Languages/i })
    const languageGroup = languageSubmit.parentElement
    if (languageGroup === null) throw new Error("Expected language choice group.")
    const choices = Array.from(languageGroup.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    expect(choices.length).toBeGreaterThan(1)
    const [firstChoice] = choices

    fireEvent.click(firstChoice)
    fireEvent.click(firstChoice)
    expect(languageSubmit).toHaveProperty("disabled", true)
    for (const choice of choices) {
      if (!choice.disabled) fireEvent.click(choice)
    }
    expect(choices.some((choice) => choice.disabled)).toBe(true)
    expect(languageSubmit).toHaveProperty("disabled", false)
    fireEvent.click(languageSubmit)
    expect(onFill).toHaveBeenCalledWith(expect.objectContaining({ kind: "choice" }))
  })

  it("renders ability, empty details, incomplete review, and ready review states", () => {
    const draft = createCharacterDraft({})
    const assessment = assessCharacterDraft(draft)
    const onFill = vi.fn()
    const { rerender } = render(
      <CharacterCreationStepContent
        currentStep="abilityScores"
        draft={draft}
        finalization={assessment.finalization}
        holes={assessment.holes}
        onFill={onFill}
      />
    )
    expect(screen.getByRole("button", { name: "Submit Ability Scores" })).toBeTruthy()

    rerender(
      <CharacterCreationStepContent
        currentStep="details"
        draft={draft}
        finalization={assessment.finalization}
        holes={assessment.holes}
        onFill={onFill}
      />
    )
    expect(screen.getByText("This step is complete.")).toBeTruthy()

    rerender(
      <CharacterCreationStepContent
        currentStep="review"
        draft={draft}
        finalization={assessment.finalization}
        holes={assessment.holes}
        onFill={onFill}
      />
    )
    expect(screen.getByText(/Fill Ability Score Generation/)).toBeTruthy()

    const ready = assessCharacterDraft(FIGHTER_EXAMPLE_DRAFT)
    expect(ready.finalization.tag).toBe("ready")
    if (ready.finalization.tag !== "ready") return
    rerender(
      <CharacterCreationStepContent
        currentStep="review"
        draft={FIGHTER_EXAMPLE_DRAFT}
        finalization={ready.finalization}
        holes={ready.holes}
        onFill={onFill}
      />
    )
    expect(screen.getByText("Character Build")).toBeTruthy()
  })

  it("renders typed finalization issues in review", () => {
    const draft = createCharacterDraft({})
    const finalization = {
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          cause: { tag: "speciesSizeMismatch" }
        }
      ]
    } as const satisfies CreationFinalizationResult

    render(
      <CharacterCreationStepContent
        currentStep="review"
        draft={draft}
        finalization={finalization}
        holes={[]}
        onFill={vi.fn()}
      />
    )

    expect(screen.getByText("Finalization Issues")).toBeTruthy()
    expect(screen.getByText(/speciesSizeMismatch/)).toBeTruthy()
  })

  it("renders a bounded loadout choice using its domain source label", () => {
    const draft = createCharacterDraft({})
    const assessment = assessCharacterDraft(draft)
    const existingHole = assessment.holes[0]
    const secondExistingHole = assessment.holes[1]
    const cardinality = boundedChoiceCardinality({ min: 1, max: 2 })
    const equipmentUnitId = loadoutEquipmentUnitId("synthetic_weapon")
    const sourceUnitId = unitChoiceSourceUnitId("synthetic_class_feature")
    const choiceKey = unitChoiceKey(CLASS_SKILL_PROFICIENCY_CHOICE_KEY)
    if (
      cardinality === undefined ||
      Either.isLeft(equipmentUnitId) ||
      Either.isLeft(sourceUnitId) ||
      Either.isLeft(choiceKey)
    ) {
      throw new Error("Expected synthetic loadout test facts.")
    }
    const loadoutHole = {
      kind: "choice",
      holeId: existingHole.holeId,
      source: {
        tag: "loadout",
        equipmentUnitId: equipmentUnitId.right,
        slot: LOADOUT_WEAPON_SLOT
      },
      cardinality,
      options: [
        { optionId: creationChoiceOptionId("one-handed"), label: "One handed" },
        { optionId: creationChoiceOptionId("two-handed"), label: "Two handed" }
      ]
    } as const satisfies CreationHole
    const unitChoiceHole = {
      ...loadoutHole,
      holeId: secondExistingHole.holeId,
      source: {
        tag: "unitChoice",
        unitId: sourceUnitId.right,
        choiceKey: choiceKey.right
      },
      options: [
        { optionId: creationChoiceOptionId("athletics"), label: "Athletics" },
        { optionId: creationChoiceOptionId("history"), label: "History" }
      ]
    } as const satisfies CreationHole
    const onFill = vi.fn()

    render(
      <CharacterCreationStepContent
        currentStep="details"
        draft={draft}
        finalization={assessment.finalization}
        holes={[loadoutHole, unitChoiceHole]}
        onFill={onFill}
      />
    )

    expect(screen.getByText("Weapon (1-2 choices)")).toBeTruthy()
    expect(screen.getByText("Class Skill Proficiency Choice (1-2 choices)")).toBeTruthy()
    fireEvent.click(screen.getByRole("checkbox", { name: "One handed" }))
    fireEvent.click(screen.getByRole("button", { name: "Submit Weapon" }))
    expect(onFill).toHaveBeenCalledWith(expect.objectContaining({ kind: "choice" }))
  })
})
