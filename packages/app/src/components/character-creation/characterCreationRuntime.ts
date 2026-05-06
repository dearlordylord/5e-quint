import {
  abilityScoreAssignment,
  characterBuildHitPoints,
  type CharacterDraft,
  type CharacterDraftId,
  characterDraftId,
  type CharacterDraftParseIssue,
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
  parseCharacterDraft,
  type SupportedAbilityScoreMethod
} from "@dnd/character-creation-runtime"
import {
  type CharacterSheet,
  characterSheetCurrentHp,
  characterSheetId,
  createFreshCharacterSheet,
  parseCharacterSheet
} from "@dnd/character-sheet-runtime"
import type { Ability } from "@dnd/shared/game-facts"
import { Hp } from "@dnd/shared/types"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Either } from "effect"

export const CHARACTER_DRAFT_STORAGE_KEY = "dnd.characterDraft.v1"
export const CHARACTER_SHEET_STORAGE_KEY = "dnd.characterSheets.v1"

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

export function assessCharacterDraft(draft: CharacterDraft): DraftAssessment {
  return {
    holes: discoverCreationHoles({
      draft,
      unitLibrary: characterCreationUnitLibrary
    }),
    finalization: finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  }
}

export function createCharacterSheetFromDraft(draft: CharacterDraft): Either.Either<CharacterSheet, string> {
  const finalization = finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  if (finalization.tag !== "ready") return Either.left("Character Draft is not ready.")
  const hitPoints = characterBuildHitPoints(finalization.build, characterCreationUnitLibrary)
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left.map((issue) => issue.message).join("; "))
  const sheet = createFreshCharacterSheet({
    characterId: characterSheetId(`app:character:${encodeURIComponent(String(draft.draftId))}`),
    build: finalization.build,
    maximumHp: Hp(hitPoints.right.maximum),
    currentHp: Hp(hitPoints.right.maximum)
  })
  return Either.isLeft(sheet) ? Either.left(sheet.left.message) : Either.right(sheet.right)
}

export function parseStoredCharacterSheets(value: unknown): Either.Either<ReadonlyArray<CharacterSheet>, string> {
  const storedSheets = Array.isArray(value) ? value : [value]
  const parsedSheets = storedSheets.map((storedSheet) => {
    const parsed = parseCharacterSheet(storedSheet)
    return Either.isLeft(parsed) ? parsed.left.message : parsed.right
  })
  const firstIssue = parsedSheets.find((sheetOrIssue): sheetOrIssue is string => typeof sheetOrIssue === "string")
  if (firstIssue !== undefined) return Either.left(firstIssue)
  return Either.right(
    parsedSheets.filter((sheetOrIssue): sheetOrIssue is CharacterSheet => typeof sheetOrIssue !== "string")
  )
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
  readonly maximumHp: number
  readonly hitPointState: CharacterSheet["hitPoints"]["tag"]
  readonly spellSlotLevels: ReadonlyArray<number>
} {
  return {
    characterId: sheet.characterId,
    currentHp: characterSheetCurrentHp(sheet),
    maximumHp: sheet.maximumHp,
    hitPointState: sheet.hitPoints.tag,
    spellSlotLevels: "spellSlotExpenditures" in sheet ? sheet.spellSlotExpenditures.map((slot) => slot.spellLevel) : []
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

export const parseStoredCharacterDraft: (value: unknown) => Either.Either<CharacterDraft, CharacterDraftParseIssue> =
  parseCharacterDraft

export const draftHoleId: (value: CreationHoleIdText) => CreationHoleId = creationHoleId
