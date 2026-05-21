import {
  abilityScoreAssignment,
  characterBuildDruidWildShapeFacts,
  characterBuildHitPoints,
  type CharacterDraft,
  type CharacterDraftId,
  characterDraftId,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationFinalizationResult,
  type CreationHole,
  type CreationHoleId,
  creationHoleId,
  type CreationHoleIdText,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type SupportedAbilityScoreMethod
} from "@dnd/character-creation-runtime"
import {
  type CharacterSheet,
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
  characterSheetId,
  characterSheetSpellSlots,
  characterSheetTempHp,
  createFreshCharacterSheet
} from "@dnd/character-sheet-runtime"
import type { Ability } from "@dnd/shared/game-facts"
import { Hp } from "@dnd/shared/types"
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Either } from "effect"

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
const catalogBuild = buildUnitCatalog({ collections: [srdUnitCollection] })
if (catalogBuild.tag !== "ok") {
  throw new Error(`SRD Unit catalog failed to build: ${JSON.stringify(catalogBuild.issues)}`)
}

export const characterCreationUnitLibrary = catalogBuild.catalog

export type DraftAssessment = {
  readonly holes: ReadonlyArray<CreationHole>
  readonly finalization: CreationFinalizationResult
}

export type AbilityScoreInput = Readonly<Record<Ability, number>>
export type CharacterSheetFromDraftInput = {
  readonly druidWildShapeKnownFormStatBlockIds?: ReadonlyArray<StatBlockId>
}
export type CharacterSheetFromDraftIssue =
  | {
      readonly tag: "draftNotReady"
      readonly message: string
    }
  | {
      readonly tag: "characterBuildHitPointsInvalid"
      readonly message: string
    }
  | {
      readonly tag: "wildShapeKnownFormsRequired"
      readonly message: string
    }
  | {
      readonly tag: "characterSheetInvalid"
      readonly message: string
    }

export function assessCharacterDraft(draft: CharacterDraft): DraftAssessment {
  return {
    holes: discoverCreationHoles({
      draft,
      unitLibrary: characterCreationUnitLibrary
    }),
    finalization: finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  }
}

export function createCharacterSheetFromDraft(
  draft: CharacterDraft,
  input: CharacterSheetFromDraftInput = {}
): Either.Either<CharacterSheet, CharacterSheetFromDraftIssue> {
  const finalization = finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  if (finalization.tag !== "ready")
    return characterSheetFromDraftIssue("draftNotReady", "Character Draft is not ready.")
  const hitPoints = characterBuildHitPoints(finalization.build, characterCreationUnitLibrary)
  if (Either.isLeft(hitPoints)) {
    return characterSheetFromDraftIssue(
      "characterBuildHitPointsInvalid",
      hitPoints.left.map((issue) => issue.message).join("; ")
    )
  }
  const wildShapeFacts = characterBuildDruidWildShapeFacts({
    build: finalization.build,
    unitLibrary: characterCreationUnitLibrary
  })
  if (Either.isLeft(wildShapeFacts)) {
    return characterSheetFromDraftIssue("characterSheetInvalid", wildShapeFacts.left.message)
  }
  if (wildShapeFacts.right !== undefined && input.druidWildShapeKnownFormStatBlockIds === undefined) {
    return characterSheetFromDraftIssue(
      "wildShapeKnownFormsRequired",
      "Wild Shape known forms require selected Beast Stat Block identities."
    )
  }
  const sheet = createFreshCharacterSheet({
    characterId: characterSheetId(`app:character:${encodeURIComponent(String(draft.draftId))}`),
    build: finalization.build,
    maximumHp: Hp(hitPoints.right.maximum),
    currentHp: Hp(hitPoints.right.maximum),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary: characterCreationUnitLibrary,
    ...(input.druidWildShapeKnownFormStatBlockIds === undefined
      ? {}
      : { druidWildShapeKnownFormStatBlockIds: input.druidWildShapeKnownFormStatBlockIds })
  })
  return Either.isLeft(sheet)
    ? characterSheetFromDraftIssue("characterSheetInvalid", sheet.left.message)
    : Either.right(sheet.right)
}

function characterSheetFromDraftIssue(
  tag: CharacterSheetFromDraftIssue["tag"],
  message: string
): Either.Either<never, CharacterSheetFromDraftIssue> {
  return Either.left({ tag, message })
}

export function appendStoredCharacterSheet(
  sheets: ReadonlyArray<CharacterSheet>,
  nextSheet: CharacterSheet
): ReadonlyArray<CharacterSheet> {
  return [...sheets.filter((sheet) => sheet.characterId !== nextSheet.characterId), nextSheet]
}

export function characterSheetSummary(sheet: CharacterSheet): {
  readonly characterId: string
  readonly currentHp: number
  readonly tempHp: number
  readonly maximumHp: number
  readonly hitPointState: CharacterSheet["hitPoints"]["tag"]
  readonly spellSlotLevels: ReadonlyArray<number>
} {
  return {
    characterId: sheet.characterId,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    maximumHp: characterSheetHitPointMaximum(sheet),
    hitPointState: sheet.hitPoints.tag,
    spellSlotLevels: characterSheetSpellSlots(sheet)?.map((slot) => slot.spellLevel) ?? []
  }
}

export function applyCharacterCreationFill(draft: CharacterDraft, fill: CreationFill): CreationBatchFillResult {
  return fillCreationHoles({
    draft,
    unitLibrary: characterCreationUnitLibrary,
    expectedRevision: draft.revision,
    fills: [fill]
  })
}

export type AbilityScoreFillIssue = {
  readonly tag: "invalidAbilityScoreAssignment"
  readonly holeId: CreationHoleId
  readonly message: string
}

export function abilityScoresFill(input: {
  readonly holeId: CreationHoleId
  readonly method: SupportedAbilityScoreMethod
  readonly scores: AbilityScoreInput
}): Either.Either<CreationFill, AbilityScoreFillIssue> {
  const parsed = abilityScoreAssignment(input.scores)
  if (Either.isLeft(parsed)) {
    return Either.left({
      tag: "invalidAbilityScoreAssignment",
      holeId: input.holeId,
      message: "Expected a valid ability score assignment."
    })
  }
  return Either.right({
    kind: "abilityScores",
    holeId: input.holeId,
    method: input.method,
    value: parsed.right
  })
}

export const createStoredDraftId: (value: string) => CharacterDraftId = characterDraftId

export const draftHoleId: (value: CreationHoleIdText) => CreationHoleId = creationHoleId
