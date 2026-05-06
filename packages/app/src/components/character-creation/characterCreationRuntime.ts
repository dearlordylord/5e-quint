import {
  abilityScoreAssignment,
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
import type { Ability } from "@dnd/shared/game-facts"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Either } from "effect"

export const CHARACTER_DRAFT_STORAGE_KEY = "dnd.characterDraft.v1"

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
