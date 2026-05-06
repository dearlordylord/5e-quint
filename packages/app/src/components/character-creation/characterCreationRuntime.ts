import {
  abilityScoreAssignment,
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
  parseCharacterDraft,
  type SupportedAbilityScoreMethod
} from "@dnd/character-creation-runtime"
import type { Ability } from "@dnd/shared/game-facts"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Either } from "effect"

export const CHARACTER_DRAFT_STORAGE_KEY = "dnd.characterDraft.promoted.v1"

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

export function assessPromotedDraft(draft: CharacterDraft): DraftAssessment {
  return {
    holes: discoverCreationHoles({
      draft,
      unitLibrary: characterCreationUnitLibrary
    }),
    finalization: finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  }
}

export function applyPromotedCreationFill(draft: CharacterDraft, fill: CreationFill): CreationBatchFillResult {
  return fillCreationHoles({
    draft,
    unitLibrary: characterCreationUnitLibrary,
    expectedRevision: draft.revision,
    fills: [fill]
  })
}

export function abilityScoresFill(input: {
  readonly holeId: CreationHoleId
  readonly method: SupportedAbilityScoreMethod
  readonly scores: AbilityScoreInput
}): CreationFill | null {
  const parsed = abilityScoreAssignment(input.scores)
  if (Either.isLeft(parsed)) return null
  return {
    kind: "abilityScores",
    holeId: input.holeId,
    method: input.method,
    value: parsed.right
  }
}

export const createStoredDraftId: (value: string) => CharacterDraftId = characterDraftId

export function parseStoredPromotedDraft(value: unknown): CharacterDraft | null {
  const parsed = parseCharacterDraft(value)
  return Either.isRight(parsed) ? parsed.right : null
}

export const draftHoleId: (value: CreationHoleIdText) => CreationHoleId = creationHoleId
