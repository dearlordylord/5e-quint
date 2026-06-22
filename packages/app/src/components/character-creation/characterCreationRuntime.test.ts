import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  type CharacterDraft,
  choiceCardinalityBounds,
  CLASS_EQUIPMENT_CHOICE_KEY,
  classUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  type CreationFill,
  fillCreationHoles,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  progressionOptionId,
  SUPPORTED_LANGUAGE_OPTION_IDS
} from "@dnd/character-creation-runtime"
import { type CharacterSheet, characterSheetDruidWildShapeKnownForms } from "@dnd/character-sheet-runtime"
import { Hp } from "@dnd/shared/types"
import { Either } from "effect"
import { describe, expect, test } from "vitest"

import {
  abilityScoresFill,
  assessCharacterDraft,
  characterCreationUnitLibrary,
  characterSheetSummary,
  createCharacterSheetFromDraft,
  createStoredDraftId
} from "#/components/character-creation/characterCreationRuntime.ts"

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
const DRUID_WILD_SHAPE_KNOWN_FORM_IDS = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf"
] as const

describe("character creation runtime", () => {
  test("requires explicit Wild Shape known forms before creating a Druid sheet", () => {
    const draft = completeSupportedDruidTwoDraft()

    const missingKnownForms = createCharacterSheetFromDraft(draft)
    expect(missingKnownForms).toMatchObject({
      _tag: "Left",
      left: { tag: "wildShapeKnownFormsRequired" }
    })

    const sheet = createCharacterSheetFromDraft(draft, {
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS
    })

    expect(Either.isRight(sheet)).toBe(true)
    if (Either.isRight(sheet)) {
      expect(characterSheetDruidWildShapeKnownForms(sheet.right)?.statBlockIds).toEqual(DRUID_WILD_SHAPE_KNOWN_FORM_IDS)
    }
  })

  test("summarizes reduced Character Sheet Hit Point maximum", () => {
    const sheet = createCharacterSheetFromDraft(completeSupportedDruidTwoDraft(), {
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS
    })
    expect(Either.isRight(sheet)).toBe(true)
    if (Either.isLeft(sheet)) return
    const summary = characterSheetSummary(sheet.right)
    expect(Either.isRight(summary)).toBe(true)
    if (Either.isLeft(summary)) return

    const reduced = {
      ...sheet.right,
      hitPointMaximumReduction: Hp(3),
      hitPoints: {
        tag: "positive",
        currentHp: Hp(summary.right.maximumHp - 3),
        tempHp: Hp(0)
      }
    } satisfies CharacterSheet

    const reducedSummary = characterSheetSummary(reduced)
    expect(Either.isRight(reducedSummary)).toBe(true)
    if (Either.isLeft(reducedSummary)) return
    expect(reducedSummary.right.maximumHp).toBe(summary.right.maximumHp - 3)
  })
})

function completeSupportedDruidTwoDraft(): CharacterDraft {
  let draft = createCharacterDraft({
    draftId: createStoredDraftId("app:test:druid-wild-shape")
  })
  const progressionOption = progressionOptionId({
    startingClass: classUnitId("class_druid"),
    advancements: [
      {
        classUnitId: classUnitId("class_druid"),
        hitPointRule: { tag: "fixedHigherLevelGain" }
      }
    ]
  })

  for (let remainingPasses = 0; remainingPasses < 12; remainingPasses += 1) {
    const assessment = assessCharacterDraft(draft)
    if (assessment.holes.length === 0) return draft
    const result = fillCreationHoles({
      draft,
      unitLibrary: characterCreationUnitLibrary,
      expectedRevision: draft.revision,
      fills: assessment.holes.map((hole): CreationFill => {
        if (hole.kind === "abilityScores") {
          const fill = abilityScoresFill({
            holeId: hole.holeId,
            method: "standardArray",
            scores: {
              str: 8,
              dex: 14,
              con: 13,
              int: 10,
              wis: 15,
              cha: 12
            }
          })
          if (Either.isLeft(fill)) {
            throw new Error(fill.left.message)
          }
          return fill.right
        }

        return {
          kind: "choice",
          holeId: hole.holeId,
          optionIds: druidTestChoiceOptionIds(hole, progressionOption)
        }
      })
    })
    if (result.tag !== "accepted") {
      throw new Error(`Druid test draft fill failed: ${JSON.stringify(result.issues)}`)
    }
    draft = result.draft
  }

  throw new Error("Druid test draft did not converge.")
}

function druidTestChoiceOptionIds(
  hole: Extract<ReturnType<typeof assessCharacterDraft>["holes"][number], { readonly kind: "choice" }>,
  progressionOption: ReturnType<typeof progressionOptionId>
) {
  if (hole.source.tag === "draft" && hole.source.path === "draft.progression.initial") return [progressionOption]
  if (hole.source.tag === "draft" && hole.source.path === "draft.languages") return SUPPORTED_LANGUAGE_OPTION_IDS
  if (hole.source.tag === "unitChoice" && hole.source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY) {
    return [creationChoiceOptionId("option_b")]
  }
  if (hole.source.tag === "unitChoice" && hole.source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY) {
    return [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID]
  }
  return hole.options.slice(0, choiceCardinalityBounds(hole.cardinality).max).map((option) => option.optionId)
}
