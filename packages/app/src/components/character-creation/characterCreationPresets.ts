import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  type CharacterDraft,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  classUnitId,
  createCharacterDraft,
  type CreationChoiceOptionId,
  creationChoiceOptionId,
  type CreationFill,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  LOADOUT_ARMOR_SLOT,
  LOADOUT_SHIELD_SLOT,
  LOADOUT_WEAPON_SLOT,
  type LoadoutSlot,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_MASTERY_UNIT_IDS,
  progressionOptionId,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  type UnitChoiceKey,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY
} from "@dnd/character-creation-runtime"
import type { UnitRecord } from "@dnd/surface/surface/types"
import { Either } from "effect"

import {
  abilityScoresFill,
  applyCharacterCreationFill,
  assessCharacterDraft,
  createStoredDraftId,
  draftHoleId
} from "#/components/character-creation/characterCreationRuntime.ts"

type CharacterCreationPreset = {
  readonly label: string
  readonly draft: CharacterDraft
}

function presetChoiceFill(
  holeId: ReturnType<typeof draftHoleId>,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  return {
    kind: "choice",
    holeId,
    optionIds
  }
}

function applyPresetFills(draft: CharacterDraft, fills: ReadonlyArray<CreationFill>): CharacterDraft {
  let current = draft
  for (const fill of fills) {
    const result = applyCharacterCreationFill(current, fill)
    if (result.tag !== "accepted") {
      throw new Error(`Character creation preset fill failed: ${JSON.stringify(result.issues)}`)
    }
    current = result.draft
  }
  return current
}

function currentChoiceFill(
  draft: CharacterDraft,
  predicate: (
    hole: Extract<ReturnType<typeof assessCharacterDraft>["holes"][number], { readonly kind: "choice" }>
  ) => boolean,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  const matchingHoles = assessCharacterDraft(draft).holes.filter(
    (candidate) => candidate.kind === "choice" && predicate(candidate)
  )
  if (matchingHoles.length !== 1) throw new Error("Expected exactly one character creation preset choice hole.")
  const hole = matchingHoles[0]
  return presetChoiceFill(hole.holeId, ...optionIds)
}

function draftChoiceFill(
  draft: CharacterDraft,
  path: string,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  return currentChoiceFill(draft, (hole) => hole.source.tag === "draft" && hole.source.path === path, ...optionIds)
}

function unitChoiceFill(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  return currentChoiceFill(
    draft,
    (hole) => hole.source.tag === "unitChoice" && hole.source.unitId === unitId && hole.source.choiceKey === choiceKey,
    ...optionIds
  )
}

function unitChoiceKeyFill(
  draft: CharacterDraft,
  choiceKey: UnitChoiceKey,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  return currentChoiceFill(
    draft,
    (hole) => hole.source.tag === "unitChoice" && hole.source.choiceKey === choiceKey,
    ...optionIds
  )
}

function loadoutChoiceFill(
  draft: CharacterDraft,
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
  ...optionIds: ReadonlyArray<CreationChoiceOptionId>
): CreationFill {
  return currentChoiceFill(
    draft,
    (hole) =>
      hole.source.tag === "loadout" && hole.source.equipmentUnitId === equipmentUnitId && hole.source.slot === slot,
    ...optionIds
  )
}

function characterDraftPreset(draftId: string): CharacterDraft {
  return createCharacterDraft({ draftId: createStoredDraftId(draftId) })
}

function abilityScorePresetFill(): CreationFill {
  const fill = abilityScoresFill({
    holeId: draftHoleId("cc:draft:draft.abilityScoreGeneration"),
    method: "standardArray",
    scores: {
      str: 15,
      dex: 14,
      con: 13,
      int: 8,
      wis: 10,
      cha: 12
    }
  })
  if (Either.isLeft(fill)) throw new Error("Expected character creation preset ability scores to parse.")
  return fill.right
}

function completeFighterPreset(draftId: string, initialProgressionOptionId: CreationChoiceOptionId): CharacterDraft {
  let draft = characterDraftPreset(draftId)
  draft = applyPresetFills(draft, [
    draftChoiceFill(draft, "draft.progression.initial", initialProgressionOptionId),
    draftChoiceFill(draft, "draft.background", creationChoiceOptionId(PHASE1_BACKGROUND_SOLDIER_UNIT_ID)),
    draftChoiceFill(draft, "draft.species", creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID)),
    abilityScorePresetFill(),
    draftChoiceFill(draft, "draft.languages", ...SUPPORTED_LANGUAGE_OPTION_IDS),
    draftChoiceFill(draft, "draft.alignment", PHASE1_ALIGNMENT_OPTION_ID)
  ])
  draft = applyPresetFills(draft, [
    unitChoiceFill(
      draft,
      PHASE1_CLASS_FIGHTER_UNIT_ID,
      CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
      ...SUPPORTED_FIGHTER_SKILL_OPTION_IDS
    ),
    unitChoiceKeyFill(
      draft,
      CLASS_FEATURE_FEAT_CHOICE_KEY,
      creationChoiceOptionId(PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID)
    ),
    unitChoiceKeyFill(
      draft,
      WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
      ...PHASE1_WEAPON_MASTERY_UNIT_IDS.map(creationChoiceOptionId)
    ),
    unitChoiceFill(
      draft,
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
      PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID
    ),
    unitChoiceFill(
      draft,
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_TOOL_CHOICE_KEY,
      PHASE1_BACKGROUND_TOOL_OPTION_ID
    ),
    unitChoiceFill(draft, PHASE1_CLASS_FIGHTER_UNIT_ID, CLASS_EQUIPMENT_CHOICE_KEY, PHASE1_CLASS_EQUIPMENT_OPTION_ID),
    unitChoiceFill(
      draft,
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_EQUIPMENT_CHOICE_KEY,
      PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID
    )
  ])
  draft = applyPresetFills(draft, [
    unitChoiceFill(
      draft,
      PHASE1_CLASS_FIGHTER_UNIT_ID,
      EQUIPMENT_PURCHASE_CHOICE_KEY,
      creationChoiceOptionId(PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID),
      creationChoiceOptionId(PHASE1_WEAPON_LONGSWORD_UNIT_ID),
      creationChoiceOptionId(PHASE1_SHIELD_UNIT_ID)
    )
  ])
  return applyPresetFills(draft, [
    loadoutChoiceFill(draft, PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID, LOADOUT_ARMOR_SLOT, PHASE1_LOADOUT_ARMOR_OPTION_ID),
    loadoutChoiceFill(draft, PHASE1_SHIELD_UNIT_ID, LOADOUT_SHIELD_SLOT, PHASE1_LOADOUT_SHIELD_OPTION_ID),
    loadoutChoiceFill(draft, PHASE1_WEAPON_LONGSWORD_UNIT_ID, LOADOUT_WEAPON_SLOT, PHASE1_LOADOUT_WEAPON_OPTION_ID)
  ])
}

export const FIGHTER_EXAMPLE_DRAFT = completeFighterPreset(
  "app:character:preset:fighter-1",
  progressionOptionId({
    startingClass: classUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
    advancements: []
  })
)

export const FIGHTER_LEVEL2_EXAMPLE_DRAFT = completeFighterPreset(
  "app:character:preset:fighter-2",
  progressionOptionId({
    startingClass: classUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
    advancements: [
      {
        classUnitId: classUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
        hitPointRule: { tag: "fixedHigherLevelGain" }
      }
    ]
  })
)

export const CHARACTER_CREATION_PRESETS: ReadonlyArray<CharacterCreationPreset> = [
  { label: "Orc Soldier Fighter 1", draft: FIGHTER_EXAMPLE_DRAFT },
  { label: "Orc Soldier Fighter 2", draft: FIGHTER_LEVEL2_EXAMPLE_DRAFT }
]
