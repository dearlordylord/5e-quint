import {
  abilityScoreAssignment,
  characterBuildDruidWildShapeFacts,
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
  characterSheetConstructionIssuesSummary,
  characterSheetCurrentHp,
  characterSheetHitDice,
  type CharacterSheetHitDieState,
  characterSheetHitPointMaximum,
  characterSheetId,
  characterSheetPactSlots,
  type CharacterSheetPactSlotState,
  characterSheetResources,
  type CharacterSheetResourceState,
  characterSheetSpellSlots,
  type CharacterSheetSpellSlotState,
  characterSheetTempHp,
  createFreshCharacterSheet
} from "@dnd/character-sheet-runtime"
import type { Ability } from "@dnd/shared/game-facts"
import { Hp } from "@dnd/shared/types"
import { srdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog"
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog-contract"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Result } from "effect"

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
const catalogBuild = buildUnitCatalog({ collections: [srdUnitCollection] })
/* v8 ignore next -- @preserve -- the imported checked-in SRD collection is validated by Surface catalog tests */
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
): Result.Result<CharacterSheet, CharacterSheetFromDraftIssue> {
  const finalization = finalizeCharacterDraft({ draft, unitLibrary: characterCreationUnitLibrary })
  if (finalization.tag !== "ready")
    return characterSheetFromDraftIssue("draftNotReady", "Character Draft is not ready.")
  const wildShapeFacts = characterBuildDruidWildShapeFacts({
    build: finalization.build,
    unitLibrary: characterCreationUnitLibrary
  })
  if (Result.isFailure(wildShapeFacts)) {
    return characterSheetFromDraftIssue("characterSheetInvalid", wildShapeFacts.failure.message)
  }
  if (wildShapeFacts.success !== undefined && input.druidWildShapeKnownFormStatBlockIds === undefined) {
    return characterSheetFromDraftIssue(
      "wildShapeKnownFormsRequired",
      "Wild Shape known forms require selected Beast Stat Block identities."
    )
  }
  const sheet = createFreshCharacterSheet({
    characterId: characterSheetId(`app:character:${encodeURIComponent(String(draft.draftId))}`),
    build: finalization.build,
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary: characterCreationUnitLibrary,
    statBlockCatalog: srdStatBlockCatalog,
    ...(input.druidWildShapeKnownFormStatBlockIds === undefined
      ? {}
      : { druidWildShapeKnownFormStatBlockIds: input.druidWildShapeKnownFormStatBlockIds })
  })
  return Result.isFailure(sheet)
    ? characterSheetFromDraftIssue("characterSheetInvalid", characterSheetConstructionIssuesSummary(sheet.failure))
    : Result.succeed(sheet.success)
}

function characterSheetFromDraftIssue(
  tag: CharacterSheetFromDraftIssue["tag"],
  message: string
): Result.Result<never, CharacterSheetFromDraftIssue> {
  return Result.fail({ tag, message })
}

export function appendStoredCharacterSheet(
  sheets: ReadonlyArray<CharacterSheet>,
  nextSheet: CharacterSheet
): ReadonlyArray<CharacterSheet> {
  return [...sheets.filter((sheet) => sheet.characterId !== nextSheet.characterId), nextSheet]
}

export type CharacterSheetSummary = {
  readonly characterId: string
  readonly currentHp: number
  readonly tempHp: number
  readonly maximumHp: number
  readonly hitPointState: CharacterSheet["hitPoints"]["tag"]
  readonly hitDice: ReadonlyArray<CharacterSheetHitDieState>
  readonly spellSlots: ReadonlyArray<CharacterSheetSpellSlotState>
  readonly pactSlots?: CharacterSheetPactSlotState
  readonly resources: ReadonlyArray<CharacterSheetResourceState>
}

export function characterSheetSummary(
  sheet: CharacterSheet
): Result.Result<CharacterSheetSummary, CharacterSheetFromDraftIssue> {
  const maximumHp = characterSheetHitPointMaximum({ sheet, unitLibrary: characterCreationUnitLibrary })
  if (Result.isFailure(maximumHp)) {
    return characterSheetFromDraftIssue("characterSheetInvalid", maximumHp.failure.message)
  }
  const hitDice = characterSheetHitDice(sheet, characterCreationUnitLibrary)
  if (Result.isFailure(hitDice)) {
    return characterSheetFromDraftIssue("characterSheetInvalid", hitDice.failure.message)
  }
  const resources = characterSheetResources(sheet, characterCreationUnitLibrary)
  if (Result.isFailure(resources)) {
    return characterSheetFromDraftIssue("characterSheetInvalid", resources.failure.message)
  }
  const pactSlots = characterSheetPactSlots(sheet)
  return Result.succeed({
    characterId: sheet.characterId,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    maximumHp: maximumHp.success,
    hitPointState: sheet.hitPoints.tag,
    hitDice: hitDice.success,
    spellSlots: characterSheetSpellSlots(sheet) ?? [],
    ...(pactSlots === undefined ? {} : { pactSlots }),
    resources: resources.success
  })
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
}): Result.Result<CreationFill, AbilityScoreFillIssue> {
  const parsed = abilityScoreAssignment(input.scores)
  if (Result.isFailure(parsed)) {
    return Result.fail({
      tag: "invalidAbilityScoreAssignment",
      holeId: input.holeId,
      message: "Expected a valid ability score assignment."
    })
  }
  return Result.succeed({
    kind: "abilityScores",
    holeId: input.holeId,
    method: input.method,
    value: parsed.success
  })
}

export const createStoredDraftId: (value: string) => CharacterDraftId = characterDraftId

export const draftHoleId: (value: CreationHoleIdText) => CreationHoleId = creationHoleId
