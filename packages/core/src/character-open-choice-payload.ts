import { advancementToClassLevels } from "#/character-advancement.ts";
import type { CharacterOpenChoice } from "#/character-draft-analysis.ts";
import type { CharacterDraft } from "#/character-domain-model.ts";
import {
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  PALADIN_FIGHTING_STYLE_CHOICES,
  RANGER_FIGHTING_STYLE_CHOICES,
} from "#/character-feature-types.ts";
import {
  hasChampionAdditionalFightingStyleSlot,
  hasFighterFightingStyleSlot,
  hasPaladinFightingStyleSlot,
  hasRangerFightingStyleSlot,
} from "#/character-feature-choices.ts";
import {
  ELF_KEEN_SENSES_SKILLS,
  PRIMARY_CLASS_PROFICIENCIES,
  SKILLS,
  speciesGrantsSkill,
} from "#/character-proficiencies.ts";
import { FIGHTING_STYLES } from "#/features/class-fighter.ts";

export interface CharacterOpenChoicePayload {
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly pickCount: number;
  readonly writePath: ReadonlyArray<string>;
  readonly current: ReadonlyArray<string>;
}

function classLevelsFromDraft(draft: CharacterDraft) {
  return draft.advancement == null
    ? null
    : advancementToClassLevels(draft.advancement);
}

function payloadForPrimaryClassSkills(
  draft: CharacterDraft,
): CharacterOpenChoicePayload | null {
  if (draft.primaryClass == null) return null;
  const proficiency = PRIMARY_CLASS_PROFICIENCIES[draft.primaryClass];
  return {
    featureRef: `primary_class_skills:${draft.primaryClass}`,
    options: [...proficiency.availableSkills],
    pickCount: proficiency.skillChoiceCount,
    writePath: ["choices", "primaryClassSkills"],
    current: [...(draft.choices?.primaryClassSkills ?? [])],
  };
}

function payloadForSpeciesSkill(
  draft: CharacterDraft,
): CharacterOpenChoicePayload | null {
  if (draft.species == null || !speciesGrantsSkill(draft.species)) return null;
  const options =
    draft.species === "elf" ? [...ELF_KEEN_SENSES_SKILLS] : [...SKILLS];
  return {
    featureRef: `species_skill:${draft.species}`,
    options,
    pickCount: 1,
    writePath: ["choices", "speciesSkill"],
    current:
      draft.choices?.speciesSkill == null ? [] : [draft.choices.speciesSkill],
  };
}

function singlePickChoicePayload(params: {
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly writePath: ReadonlyArray<string>;
  readonly currentValue: string | undefined;
}): CharacterOpenChoicePayload {
  return {
    featureRef: params.featureRef,
    options: [...params.options],
    pickCount: 1,
    writePath: params.writePath,
    current: params.currentValue == null ? [] : [params.currentValue],
  };
}

interface SinglePickFeatureCandidate {
  readonly applicable: boolean;
  readonly messagePrefix: string;
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly writePath: ReadonlyArray<string>;
  readonly currentValue: string | undefined;
}

function singlePickFeatureCandidates(
  draft: CharacterDraft,
): ReadonlyArray<SinglePickFeatureCandidate> {
  const classLevels = classLevelsFromDraft(draft);
  if (classLevels == null) return [];
  return [
    {
      applicable: classLevels.cleric > 0,
      messagePrefix: "cleric requires a Divine Order",
      featureRef: "cleric_divine_order",
      options: CLERIC_DIVINE_ORDERS,
      writePath: ["choices", "clericDivineOrder"],
      currentValue: draft.choices?.clericDivineOrder,
    },
    {
      applicable: classLevels.druid > 0,
      messagePrefix: "druid requires a Primal Order",
      featureRef: "druid_primal_order",
      options: DRUID_PRIMAL_ORDERS,
      writePath: ["choices", "druidPrimalOrder"],
      currentValue: draft.choices?.druidPrimalOrder,
    },
    {
      applicable: hasFighterFightingStyleSlot(classLevels),
      messagePrefix: "fighter requires a Fighting Style",
      featureRef: "fighter_fighting_style",
      options: FIGHTING_STYLES,
      writePath: ["choices", "fighterFightingStyle"],
      currentValue: draft.choices?.fighterFightingStyle,
    },
    {
      applicable: hasChampionAdditionalFightingStyleSlot(
        classLevels,
        draft.advancement,
      ),
      messagePrefix: "champion fighter requires",
      featureRef: "champion_additional_fighting_style",
      options: FIGHTING_STYLES,
      writePath: ["choices", "championAdditionalFightingStyle"],
      currentValue: draft.choices?.championAdditionalFightingStyle,
    },
    {
      applicable: hasPaladinFightingStyleSlot(classLevels),
      messagePrefix: "paladin requires a Fighting Style",
      featureRef: "paladin_fighting_style",
      options: PALADIN_FIGHTING_STYLE_CHOICES,
      writePath: ["choices", "paladinFightingStyle"],
      currentValue: draft.choices?.paladinFightingStyle,
    },
    {
      applicable: hasRangerFightingStyleSlot(classLevels),
      messagePrefix: "ranger requires a Fighting Style",
      featureRef: "ranger_fighting_style",
      options: RANGER_FIGHTING_STYLE_CHOICES,
      writePath: ["choices", "rangerFightingStyle"],
      currentValue: draft.choices?.rangerFightingStyle,
    },
  ];
}

function candidateToPayload(
  candidate: SinglePickFeatureCandidate,
): CharacterOpenChoicePayload {
  return singlePickChoicePayload({
    featureRef: candidate.featureRef,
    options: candidate.options,
    writePath: candidate.writePath,
    currentValue: candidate.currentValue,
  });
}

export function resolveOpenChoicePayload(
  draft: CharacterDraft,
  choice: CharacterOpenChoice,
): CharacterOpenChoicePayload | null {
  if (
    choice.code === "missingPrimaryClassSkillChoices" ||
    choice.code === "wrongPrimaryClassSkillChoiceCount"
  ) {
    return payloadForPrimaryClassSkills(draft);
  }
  if (choice.code === "missingSpeciesSkillChoice") {
    return payloadForSpeciesSkill(draft);
  }
  if (choice.code !== "missingFeatureChoice") return null;

  for (const candidate of singlePickFeatureCandidates(draft)) {
    if (!candidate.applicable) continue;
    if (candidate.currentValue != null) continue;
    if (!choice.message.startsWith(candidate.messagePrefix)) continue;
    return candidateToPayload(candidate);
  }
  return null;
}

export function listCharacterFeaturePickers(
  draft: CharacterDraft,
): ReadonlyArray<CharacterOpenChoicePayload> {
  const pickers: CharacterOpenChoicePayload[] = [];
  const primary = payloadForPrimaryClassSkills(draft);
  if (primary != null) pickers.push(primary);
  const species = payloadForSpeciesSkill(draft);
  if (species != null) pickers.push(species);
  for (const candidate of singlePickFeatureCandidates(draft)) {
    if (!candidate.applicable) continue;
    pickers.push(candidateToPayload(candidate));
  }
  return pickers;
}

export function buildOpenChoicePatch(
  draft: CharacterDraft,
  payload: CharacterOpenChoicePayload,
  value: string | ReadonlyArray<string> | undefined,
): Partial<CharacterDraft> {
  if (payload.writePath.length === 0) {
    throw new Error("writePath cannot be empty");
  }
  const [head, ...rest] = payload.writePath;
  if (rest.length === 0) {
    return { [head]: value } as Partial<CharacterDraft>;
  }
  if (rest.length === 1) {
    const existingBranch =
      (draft as Record<string, unknown>)[head] &&
      typeof (draft as Record<string, unknown>)[head] === "object"
        ? ((draft as Record<string, unknown>)[head] as Record<string, unknown>)
        : {};
    const nextBranch = { ...existingBranch, [rest[0]]: value };
    return { [head]: nextBranch } as Partial<CharacterDraft>;
  }
  throw new Error(`unsupported writePath depth: ${payload.writePath.length}`);
}
