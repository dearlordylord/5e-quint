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
import { statBlockId, unitId } from "@dnd/shared/game-facts"
import { Hp } from "@dnd/shared/types"
import { Result } from "effect"
import { describe, expect, test } from "vitest"

import {
  abilityScoresFill,
  assessCharacterDraft,
  characterCreationUnitLibrary,
  characterSheetSummary,
  createCharacterSheetFromDraft,
  createStoredDraftId,
  draftHoleId
} from "#/components/character-creation/characterCreationRuntime.ts"

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
const DRUID_WILD_SHAPE_KNOWN_FORM_IDS = [
  statBlockId("stat_block_rat"),
  statBlockId("stat_block_riding_horse"),
  statBlockId("stat_block_spider"),
  statBlockId("stat_block_wolf")
] as const

describe("character creation runtime", () => {
  test("rejects a draft that is not ready for a Character Sheet", () => {
    const result = createCharacterSheetFromDraft(createCharacterDraft({}))
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) expect(result.failure.tag).toBe("draftNotReady")
  })

  test("requires explicit Wild Shape known forms before creating a Druid sheet", () => {
    const draft = completeSupportedDruidTwoDraft()

    const missingKnownForms = createCharacterSheetFromDraft(draft)
    expect(Result.isFailure(missingKnownForms)).toBe(true)
    if (Result.isFailure(missingKnownForms)) expect(missingKnownForms.failure.tag).toBe("wildShapeKnownFormsRequired")

    const sheet = createCharacterSheetFromDraft(draft, {
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS
    })

    expect(Result.isSuccess(sheet)).toBe(true)
    if (Result.isSuccess(sheet)) {
      expect(characterSheetDruidWildShapeKnownForms(sheet.success)?.statBlockIds).toEqual(
        DRUID_WILD_SHAPE_KNOWN_FORM_IDS
      )
    }
  })

  test("summarizes reduced Character Sheet Hit Point maximum", () => {
    const sheet = createCharacterSheetFromDraft(completeSupportedDruidTwoDraft(), {
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS
    })
    expect(Result.isSuccess(sheet)).toBe(true)
    if (Result.isFailure(sheet)) return
    const summary = characterSheetSummary(sheet.success)
    expect(Result.isSuccess(summary)).toBe(true)
    if (Result.isFailure(summary)) return

    const reduced = {
      ...sheet.success,
      hitPointMaximumReduction: Hp(3),
      hitPoints: {
        tag: "positive",
        currentHp: Hp(summary.success.maximumHp - 3),
        tempHp: Hp(0)
      }
    } satisfies CharacterSheet

    const reducedSummary = characterSheetSummary(reduced)
    expect(Result.isSuccess(reducedSummary)).toBe(true)
    if (Result.isFailure(reducedSummary)) return
    expect(reducedSummary.success.maximumHp).toBe(summary.success.maximumHp - 3)
    expect(reducedSummary.success.hitDice).toEqual([{ classUnitId: "class_druid", dieSize: 8, total: 2, spent: 0 }])
    expect(reducedSummary.success.spellSlots).toEqual([{ spellLevel: 1, count: 3, expended: 0 }])
    expect(reducedSummary.success.pactSlots).toBeUndefined()
    expect(reducedSummary.success.resources).toEqual([
      {
        tag: "spellAccessFreeCast",
        sourceUnitId: "feat_magic_initiate_cleric",
        spellId: "bane",
        count: 1,
        expended: 0
      },
      expect.objectContaining({
        tag: "useCountResource",
        unitId: "druid_wild_shape",
        count: 2,
        expended: 0
      })
    ])
  })

  test("includes Pact Slot capacity in a Warlock Character Sheet summary", () => {
    const sheet = createCharacterSheetFromDraft(completeSupportedWarlockOneDraft())
    expect(Result.isSuccess(sheet)).toBe(true)
    if (Result.isFailure(sheet)) return

    const summary = characterSheetSummary(sheet.success)
    expect(Result.isSuccess(summary)).toBe(true)
    if (Result.isSuccess(summary)) {
      expect(summary.success.pactSlots).toEqual({ slotLevel: 1, count: 1, expended: 0 })
    }
  })

  test("returns a typed issue for an invalid ability-score assignment", () => {
    const result = abilityScoresFill({
      holeId: draftHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      scores: {
        cha: 10,
        con: 10,
        dex: 10,
        int: 10,
        str: Number.NaN,
        wis: 10
      }
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) expect(result.failure.tag).toBe("invalidAbilityScoreAssignment")
  })
})

function completeSupportedDruidTwoDraft(): CharacterDraft {
  return completeSupportedSingleClassDraft({
    draftId: createStoredDraftId("app:test:druid-wild-shape"),
    classId: classUnitId(unitId("class_druid")),
    higherLevelHitPointRules: [{ tag: "fixedHigherLevelGain" }],
    abilityScores: {
      str: 8,
      dex: 14,
      con: 13,
      int: 10,
      wis: 15,
      cha: 12
    }
  })
}

function completeSupportedWarlockOneDraft(): CharacterDraft {
  return completeSupportedSingleClassDraft({
    draftId: createStoredDraftId("app:test:warlock-pact-slots"),
    classId: classUnitId(unitId("class_warlock")),
    higherLevelHitPointRules: [],
    abilityScores: {
      str: 8,
      dex: 14,
      con: 13,
      int: 10,
      wis: 12,
      cha: 15
    }
  })
}

function completeSupportedSingleClassDraft(input: {
  readonly draftId: ReturnType<typeof createStoredDraftId>
  readonly classId: ReturnType<typeof classUnitId>
  readonly higherLevelHitPointRules: ReadonlyArray<
    Parameters<typeof progressionOptionId>[0]["advancements"][number]["hitPointRule"]
  >
  readonly abilityScores: Parameters<typeof abilityScoresFill>[0]["scores"]
}): CharacterDraft {
  let draft = createCharacterDraft({ draftId: input.draftId })
  const progressionOption = progressionOptionId({
    startingClass: input.classId,
    advancements: input.higherLevelHitPointRules.map((hitPointRule) => ({
      classUnitId: input.classId,
      hitPointRule
    }))
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
            scores: input.abilityScores
          })
          if (Result.isFailure(fill)) {
            throw new Error(fill.failure.message)
          }
          return fill.success
        }

        return {
          kind: "choice",
          holeId: hole.holeId,
          optionIds: testChoiceOptionIds(hole, progressionOption)
        }
      })
    })
    if (result.tag !== "accepted") {
      throw new Error(`Test draft fill failed: ${JSON.stringify(result.issues)}`)
    }
    draft = result.draft
  }

  throw new Error("Test draft did not converge.")
}

function testChoiceOptionIds(
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
