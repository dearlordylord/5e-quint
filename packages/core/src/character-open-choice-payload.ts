import { advancementToClassLevels } from "#/character-advancement.ts";
import {
  ABILITY_SCORE_GENERATION_MODES,
  BACKGROUND_ABILITY_SCORE_OPTIONS,
  CHARACTER_BACKGROUNDS,
  type AbilityScoreGenerationMode,
  type BackgroundAbilityScoreIncrease,
  type CharacterAbilityScoreGenerationDraft,
} from "#/character-ability-scores.ts";
import { ABILITIES, type Ability } from "#/types.ts";
import { ownedCombatEquipment } from "#/character-equipment.ts";
import {
  CHOICE_MESSAGE_PREFIXES,
  multiclassSkillsMessagePrefix,
} from "#/character-build-choice-validation.ts";
import type {
  CharacterOpenChoice,
  CharacterOpenChoiceCode,
} from "#/character-draft-analysis.ts";
import {
  ALIGNMENTS,
  CHARACTER_LANGUAGES,
  CHARACTER_SPECIES,
  type CharacterClassLevels,
  type CharacterDraft,
  type CharacterLanguage,
} from "#/character-domain-model.ts";
import { EXPERTISE_MESSAGE_PREFIX } from "#/character-feature-choice-validation.ts";
import {
  ARTISAN_TOOLS,
  CHARACTER_GRANTED_LANGUAGES,
  CHARACTER_TOOL_PROFICIENCIES,
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  ORIGIN_FEAT_IDS,
  PALADIN_FIGHTING_STYLE_CHOICES,
  RANGER_FIGHTING_STYLE_CHOICES,
  type CharacterOriginFeatId,
  type CharacterOriginFeatSelection,
} from "#/character-feature-types.ts";
import {
  CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
  CHARACTER_CLASS_EQUIPMENT_OPTIONS,
  type CharacterClassEquipmentOption,
} from "#/character-equipment-data.ts";
import { classOptionIsAllowed } from "#/character-equipment-validation.ts";
import {
  expectedExpertiseChoiceCount,
  hasChampionAdditionalFightingStyleSlot,
  hasFighterFightingStyleSlot,
  hasPaladinFightingStyleSlot,
  hasRangerFightingStyleSlot,
} from "#/character-feature-choices.ts";
import {
  deriveGrantedSkillProficiencies,
  ELF_KEEN_SENSES_SKILLS,
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  SKILLS,
  speciesGrantsSkill,
} from "#/character-proficiencies.ts";
import { CLASS_NAMES, type ClassName } from "#/features/class-tables.ts";
import { FIGHTING_STYLES } from "#/features/class-fighter.ts";

export interface CharacterOpenChoicePayload {
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly pickCount: number;
  readonly writePath: ReadonlyArray<string>;
  readonly current: ReadonlyArray<string>;
  readonly lift?: (
    value: string | ReadonlyArray<string> | undefined,
    draft: CharacterDraft,
  ) => unknown;
}

type MulticlassSkillClass = Extract<ClassName, "bard" | "ranger" | "rogue">;
const MULTICLASS_SKILL_CLASSES = [
  "bard",
  "ranger",
  "rogue",
] as const satisfies ReadonlyArray<MulticlassSkillClass>;

interface ResolverContext {
  readonly draft: CharacterDraft;
  readonly classLevels: CharacterClassLevels | null;
}

type PayloadResolver = (
  context: ResolverContext,
) => CharacterOpenChoicePayload | null;

function resolverContext(draft: CharacterDraft): ResolverContext {
  return {
    draft,
    classLevels:
      draft.advancement == null
        ? null
        : advancementToClassLevels(draft.advancement),
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

function multiPickChoicePayload(params: {
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly pickCount: number;
  readonly writePath: ReadonlyArray<string>;
  readonly currentValues: ReadonlyArray<string> | undefined;
}): CharacterOpenChoicePayload {
  return {
    featureRef: params.featureRef,
    options: [...params.options],
    pickCount: params.pickCount,
    writePath: params.writePath,
    current: [...(params.currentValues ?? [])],
  };
}

function payloadForPrimaryClass({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.primaryClass != null) return null;
  return singlePickChoicePayload({
    featureRef: "primary_class",
    options: CLASS_NAMES,
    writePath: ["primaryClass"],
    currentValue: undefined,
  });
}

function payloadForSpecies({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.species != null) return null;
  return singlePickChoicePayload({
    featureRef: "species",
    options: CHARACTER_SPECIES,
    writePath: ["species"],
    currentValue: undefined,
  });
}

function payloadForBackground({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.background != null) return null;
  return singlePickChoicePayload({
    featureRef: "background",
    options: CHARACTER_BACKGROUNDS,
    writePath: ["background"],
    currentValue: undefined,
  });
}

function payloadForAlignment({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.alignment != null) return null;
  return singlePickChoicePayload({
    featureRef: "alignment",
    options: ALIGNMENTS,
    writePath: ["alignment"],
    currentValue: undefined,
  });
}

function payloadForPrimaryClassSkills({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.primaryClass == null) return null;
  const proficiency = PRIMARY_CLASS_PROFICIENCIES[draft.primaryClass];
  return multiPickChoicePayload({
    featureRef: `primary_class_skills:${draft.primaryClass}`,
    options: proficiency.availableSkills,
    pickCount: proficiency.skillChoiceCount,
    writePath: ["choices", "primaryClassSkills"],
    currentValues: draft.choices?.primaryClassSkills,
  });
}

function payloadForSpeciesSkill({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.species == null || !speciesGrantsSkill(draft.species)) return null;
  const options =
    draft.species === "elf" ? [...ELF_KEEN_SENSES_SKILLS] : [...SKILLS];
  return singlePickChoicePayload({
    featureRef: `species_skill:${draft.species}`,
    options,
    writePath: ["choices", "speciesSkill"],
    currentValue: draft.choices?.speciesSkill,
  });
}

function payloadForBackgroundTool({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.background !== "soldier") return null;
  return singlePickChoicePayload({
    featureRef: "background_tool:soldier",
    options: GAMING_SETS,
    writePath: ["choices", "backgroundTool"],
    currentValue: draft.choices?.backgroundTool,
  });
}

function payloadForMonkTool({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.primaryClass !== "monk") return null;
  return singlePickChoicePayload({
    featureRef: "monk_tool",
    options: [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS],
    writePath: ["choices", "monkTool"],
    currentValue: draft.choices?.monkTool,
  });
}

function payloadForBardInstruments({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.primaryClass !== "bard") return null;
  return multiPickChoicePayload({
    featureRef: "bard_instruments",
    options: MUSICAL_INSTRUMENTS,
    pickCount: 3,
    writePath: ["choices", "bardInstruments"],
    currentValues: draft.choices?.bardInstruments,
  });
}

function payloadForMulticlassBardInstrument({
  draft,
  classLevels,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (classLevels == null || classLevels.bard <= 0) return null;
  if (draft.primaryClass === "bard") return null;
  return singlePickChoicePayload({
    featureRef: "multiclass_bard_instrument",
    options: MUSICAL_INSTRUMENTS,
    writePath: ["choices", "multiclassBardInstrument"],
    currentValue: draft.choices?.multiclassBardInstrument,
  });
}

function payloadForRogueLanguage({
  draft,
  classLevels,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (classLevels == null || classLevels.rogue <= 0) return null;
  return singlePickChoicePayload({
    featureRef: "rogue_language",
    options: CHARACTER_GRANTED_LANGUAGES.filter(
      (lang) => lang !== "Thieves' Cant",
    ),
    writePath: ["choices", "rogueLanguage"],
    currentValue: draft.choices?.rogueLanguage,
  });
}

function payloadForRangerDeftExplorerLanguages({
  draft,
  classLevels,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (classLevels == null || classLevels.ranger < 2) return null;
  return multiPickChoicePayload({
    featureRef: "ranger_deft_explorer_languages",
    options: CHARACTER_GRANTED_LANGUAGES,
    pickCount: 2,
    writePath: ["choices", "rangerDeftExplorerLanguages"],
    currentValues: draft.choices?.rangerDeftExplorerLanguages,
  });
}

function payloadForExpertiseSkills({
  draft,
  classLevels,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (classLevels == null) return null;
  const pickCount = expectedExpertiseChoiceCount(classLevels);
  if (pickCount === 0) return null;
  const grantedSkills = deriveGrantedSkillProficiencies({
    primaryClass: draft.primaryClass,
    background: draft.background,
    species: draft.species,
    classLevels,
    choices: draft.choices,
    advancement: draft.advancement,
  });
  return multiPickChoicePayload({
    featureRef: "expertise_skills",
    options: grantedSkills,
    pickCount,
    writePath: ["choices", "expertiseSkills"],
    currentValues: draft.choices?.expertiseSkills,
  });
}

function payloadForMulticlassSkills(
  { draft, classLevels }: ResolverContext,
  className: MulticlassSkillClass,
): CharacterOpenChoicePayload | null {
  if (classLevels == null || classLevels[className] <= 0) return null;
  if (draft.primaryClass === className) return null;
  const gains = MULTICLASS_PROFICIENCIES[className];
  if (gains.skillChoiceCount === 0) return null;
  return multiPickChoicePayload({
    featureRef: `multiclass_skills:${className}`,
    options: gains.availableSkills,
    pickCount: gains.skillChoiceCount,
    writePath: ["choices", "multiclassSkills", className],
    currentValues: draft.choices?.multiclassSkills?.[className],
  });
}

function isOriginFeatId(value: unknown): value is CharacterOriginFeatId {
  return (
    typeof value === "string" &&
    (ORIGIN_FEAT_IDS as ReadonlyArray<string>).includes(value)
  );
}

function liftOriginFeatId(
  value: string | ReadonlyArray<string> | undefined,
  draft: CharacterDraft,
): CharacterOriginFeatSelection | undefined {
  if (!isOriginFeatId(value)) return undefined;
  if (value === "skilled") {
    const existing = draft.choices?.humanOriginFeat;
    return {
      feat: "skilled",
      proficiencies: existing?.feat === "skilled" ? existing.proficiencies : [],
    };
  }
  return { feat: value };
}

function payloadForHumanOriginFeat({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.species !== "human") return null;
  const current = draft.choices?.humanOriginFeat?.feat;
  return {
    featureRef: "human_origin_feat",
    options: [...ORIGIN_FEAT_IDS],
    pickCount: 1,
    writePath: ["choices", "humanOriginFeat"],
    current: current == null ? [] : [current],
    lift: liftOriginFeatId,
  };
}

function payloadForHumanOriginFeatSkilledProficiencies({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.species !== "human") return null;
  const feat = draft.choices?.humanOriginFeat;
  if (feat == null || feat.feat !== "skilled") return null;
  return multiPickChoicePayload({
    featureRef: "human_origin_feat_skilled_proficiencies",
    options: [...SKILLS, ...CHARACTER_TOOL_PROFICIENCIES],
    pickCount: 3,
    writePath: ["choices", "humanOriginFeat", "proficiencies"],
    currentValues: feat.proficiencies,
  });
}

function payloadForEquipmentBackgroundOption({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.background == null) return null;
  return singlePickChoicePayload({
    featureRef: "equipment_background_option",
    options: CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
    writePath: ["equipment", "backgroundOption"],
    currentValue: draft.equipment?.backgroundOption,
  });
}

function payloadForEquipmentClassOption({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.primaryClass == null) return null;
  const primaryClass = draft.primaryClass;
  return singlePickChoicePayload({
    featureRef: "equipment_class_option",
    options: CHARACTER_CLASS_EQUIPMENT_OPTIONS.filter(
      (option: CharacterClassEquipmentOption) =>
        classOptionIsAllowed(primaryClass, option),
    ),
    writePath: ["equipment", "classOption"],
    currentValue: draft.equipment?.classOption,
  });
}

function isAbilityScoreGenerationMode(
  value: unknown,
): value is AbilityScoreGenerationMode {
  return (
    typeof value === "string" &&
    (ABILITY_SCORE_GENERATION_MODES as ReadonlyArray<string>).includes(value)
  );
}

function liftAbilityScoreGenerationMode(
  value: string | ReadonlyArray<string> | undefined,
  draft: CharacterDraft,
): CharacterAbilityScoreGenerationDraft | undefined {
  if (!isAbilityScoreGenerationMode(value)) return undefined;
  const existing = draft.abilityScoreGeneration;
  const assignedScores = existing?.assignedScores ?? {};
  return { mode: value, assignedScores };
}

function payloadForAbilityScoreGeneration({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.abilityScoreGeneration != null) return null;
  return {
    featureRef: "ability_score_generation",
    options: [...ABILITY_SCORE_GENERATION_MODES],
    pickCount: 1,
    writePath: ["abilityScoreGeneration"],
    current: [],
    lift: liftAbilityScoreGenerationMode,
  };
}

function isAbility(value: unknown): value is Ability {
  return (
    typeof value === "string" &&
    (ABILITIES as ReadonlyArray<string>).includes(value)
  );
}

function liftBackgroundAbilityScoreIncrease(
  value: string | ReadonlyArray<string> | undefined,
): BackgroundAbilityScoreIncrease | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [plusTwo, plusOne] = value;
  if (!isAbility(plusTwo) || !isAbility(plusOne)) return undefined;
  if (plusTwo === plusOne) return undefined;
  return { kind: "plusTwoPlusOne", plusTwo, plusOne };
}

function payloadForBackgroundAbilityScoreIncrease({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  if (draft.background == null) return null;
  if (draft.backgroundAbilityScoreIncrease != null) return null;
  const options = BACKGROUND_ABILITY_SCORE_OPTIONS[draft.background];
  return {
    featureRef: `background_ability_score_increase:${draft.background}`,
    options: [...options],
    pickCount: 2,
    writePath: ["backgroundAbilityScoreIncrease"],
    current: [],
    lift: liftBackgroundAbilityScoreIncrease,
  };
}

const EXPECTED_LANGUAGE_COUNT = 3;

function payloadForLanguages({
  draft,
}: ResolverContext): CharacterOpenChoicePayload | null {
  const existing = draft.languages ?? [];
  if (existing.length === EXPECTED_LANGUAGE_COUNT) return null;
  return multiPickChoicePayload({
    featureRef: "languages",
    options: CHARACTER_LANGUAGES,
    pickCount: EXPECTED_LANGUAGE_COUNT,
    writePath: ["languages"],
    currentValues: existing as ReadonlyArray<CharacterLanguage>,
  });
}

type LoadoutPrerequisites = {
  readonly primaryClass: NonNullable<CharacterDraft["primaryClass"]>;
  readonly background: NonNullable<CharacterDraft["background"]>;
  readonly backgroundOption: NonNullable<
    NonNullable<CharacterDraft["equipment"]>["backgroundOption"]
  >;
  readonly classOption: NonNullable<
    NonNullable<CharacterDraft["equipment"]>["classOption"]
  >;
};

function loadoutPrerequisites(
  draft: CharacterDraft,
): LoadoutPrerequisites | null {
  if (draft.primaryClass == null || draft.background == null) return null;
  if (
    draft.equipment?.backgroundOption == null ||
    draft.equipment?.classOption == null
  ) {
    return null;
  }
  return {
    primaryClass: draft.primaryClass,
    background: draft.background,
    backgroundOption: draft.equipment.backgroundOption,
    classOption: draft.equipment.classOption,
  };
}

function ownedForLoadout(draft: CharacterDraft, prereqs: LoadoutPrerequisites) {
  return ownedCombatEquipment({
    primaryClass: prereqs.primaryClass,
    background: prereqs.background,
    equipment: {
      backgroundOption: prereqs.backgroundOption,
      classOption: prereqs.classOption,
      purchasedCombatEquipment: draft.equipment?.purchasedCombatEquipment ?? [],
      remainingGoldPieces: draft.equipment?.remainingGoldPieces ?? 0,
      loadout: {
        wornArmor: null,
        wieldedWeapon: null,
        secondaryWeapon: null,
        shield: false,
        wieldedWeaponGrip: null,
      },
    },
  });
}

function uniqueStrings<T extends string>(values: ReadonlyArray<T>): T[] {
  return [...new Set(values)];
}

function liftLoadoutShield(
  value: string | ReadonlyArray<string> | undefined,
): boolean {
  return value === "yes";
}

function loadoutPickers(
  draft: CharacterDraft,
): ReadonlyArray<CharacterOpenChoicePayload> {
  const prereqs = loadoutPrerequisites(draft);
  if (prereqs == null) return [];
  const owned = ownedForLoadout(draft, prereqs);
  const pickers: CharacterOpenChoicePayload[] = [];
  if (owned.armor.length > 0) {
    pickers.push(
      singlePickChoicePayload({
        featureRef: "loadout_worn_armor",
        options: uniqueStrings(owned.armor),
        writePath: ["equipment", "loadout", "wornArmor"],
        currentValue: draft.equipment?.loadout?.wornArmor ?? undefined,
      }),
    );
  }
  if (owned.weapons.length > 0) {
    pickers.push(
      singlePickChoicePayload({
        featureRef: "loadout_wielded_weapon",
        options: uniqueStrings(owned.weapons),
        writePath: ["equipment", "loadout", "wieldedWeapon"],
        currentValue: draft.equipment?.loadout?.wieldedWeapon ?? undefined,
      }),
    );
  }
  if (draft.equipment?.loadout?.wieldedWeapon != null) {
    pickers.push(
      singlePickChoicePayload({
        featureRef: "loadout_wielded_weapon_grip",
        options: ["oneHanded", "twoHanded"],
        writePath: ["equipment", "loadout", "wieldedWeaponGrip"],
        currentValue: draft.equipment.loadout.wieldedWeaponGrip ?? undefined,
      }),
    );
  }
  if (owned.shields >= 1) {
    const currentShield = draft.equipment?.loadout?.shield === true;
    pickers.push({
      featureRef: "loadout_shield",
      options: ["yes", "no"],
      pickCount: 1,
      writePath: ["equipment", "loadout", "shield"],
      current: [currentShield ? "yes" : "no"],
      lift: liftLoadoutShield,
    });
  }
  return pickers;
}

interface SinglePickFeatureCandidate {
  readonly applicable: boolean;
  readonly messagePrefix: string;
  readonly featureRef: string;
  readonly options: ReadonlyArray<string>;
  readonly writePath: ReadonlyArray<string>;
  readonly currentValue: string | undefined;
}

function singlePickFeatureCandidates({
  draft,
  classLevels,
}: ResolverContext): ReadonlyArray<SinglePickFeatureCandidate> {
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

interface PickerEntry {
  readonly codes: ReadonlyArray<CharacterOpenChoiceCode>;
  readonly messagePrefix?: string;
  readonly resolver: PayloadResolver;
}

const MULTICLASS_SKILL_PICKER_ENTRIES: ReadonlyArray<PickerEntry> =
  MULTICLASS_SKILL_CLASSES.map((className) => ({
    codes: ["missingMulticlassSkillChoice", "wrongMulticlassSkillChoiceCount"],
    messagePrefix: multiclassSkillsMessagePrefix(className),
    resolver: (context) => payloadForMulticlassSkills(context, className),
  }));

const PICKER_ENTRIES: ReadonlyArray<PickerEntry> = [
  {
    codes: ["missingPrimaryClass"],
    resolver: payloadForPrimaryClass,
  },
  {
    codes: ["missingSpecies"],
    resolver: payloadForSpecies,
  },
  {
    codes: ["missingBackground"],
    resolver: payloadForBackground,
  },
  {
    codes: ["missingAlignment"],
    resolver: payloadForAlignment,
  },
  {
    codes: [
      "missingPrimaryClassSkillChoices",
      "wrongPrimaryClassSkillChoiceCount",
    ],
    resolver: payloadForPrimaryClassSkills,
  },
  {
    codes: ["missingSpeciesSkillChoice"],
    resolver: payloadForSpeciesSkill,
  },
  {
    codes: ["missingToolChoice"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.soldierGamingSet,
    resolver: payloadForBackgroundTool,
  },
  {
    codes: ["missingToolChoice"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.monkTool,
    resolver: payloadForMonkTool,
  },
  {
    codes: ["invalidToolChoiceCount"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.bardInstruments,
    resolver: payloadForBardInstruments,
  },
  {
    codes: ["missingToolChoice"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.multiclassBardInstrument,
    resolver: payloadForMulticlassBardInstrument,
  },
  {
    codes: ["missingGrantedLanguageChoice"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.rogueLanguage,
    resolver: payloadForRogueLanguage,
  },
  {
    codes: ["wrongGrantedLanguageChoiceCount"],
    messagePrefix: CHOICE_MESSAGE_PREFIXES.rangerDeftExplorerLanguages,
    resolver: payloadForRangerDeftExplorerLanguages,
  },
  {
    codes: ["missingFeatureChoice"],
    messagePrefix: EXPERTISE_MESSAGE_PREFIX,
    resolver: payloadForExpertiseSkills,
  },
  ...MULTICLASS_SKILL_PICKER_ENTRIES,
  {
    codes: ["missingOriginFeatChoice"],
    resolver: payloadForHumanOriginFeat,
  },
  {
    codes: ["wrongSkilledChoiceCount"],
    resolver: payloadForHumanOriginFeatSkilledProficiencies,
  },
  {
    codes: ["missingBackgroundEquipmentChoice"],
    resolver: payloadForEquipmentBackgroundOption,
  },
  {
    codes: ["missingClassEquipmentChoice"],
    resolver: payloadForEquipmentClassOption,
  },
  {
    codes: ["missingAbilityScoreGeneration"],
    resolver: payloadForAbilityScoreGeneration,
  },
  {
    codes: ["missingBackgroundAbilityScoreIncrease"],
    resolver: payloadForBackgroundAbilityScoreIncrease,
  },
  {
    codes: ["missingLanguages", "tooFewLanguages"],
    resolver: payloadForLanguages,
  },
];

function featureChoicePayload(
  context: ResolverContext,
  choice: CharacterOpenChoice,
): CharacterOpenChoicePayload | null {
  for (const candidate of singlePickFeatureCandidates(context)) {
    if (!candidate.applicable) continue;
    if (candidate.currentValue != null) continue;
    if (!choice.message.startsWith(candidate.messagePrefix)) continue;
    return candidateToPayload(candidate);
  }
  return null;
}

export function resolveOpenChoicePayload(
  draft: CharacterDraft,
  choice: CharacterOpenChoice,
): CharacterOpenChoicePayload | null {
  const context = resolverContext(draft);
  for (const entry of PICKER_ENTRIES) {
    if (!entry.codes.includes(choice.code)) continue;
    if (
      entry.messagePrefix != null &&
      !choice.message.startsWith(entry.messagePrefix)
    ) {
      continue;
    }
    const payload = entry.resolver(context);
    if (payload != null) return payload;
  }
  if (choice.code === "missingFeatureChoice") {
    return featureChoicePayload(context, choice);
  }
  return null;
}

export function listCharacterFeaturePickers(
  draft: CharacterDraft,
): ReadonlyArray<CharacterOpenChoicePayload> {
  const context = resolverContext(draft);
  const pickers: CharacterOpenChoicePayload[] = [];
  for (const entry of PICKER_ENTRIES) {
    const payload = entry.resolver(context);
    if (payload != null) pickers.push(payload);
  }
  for (const candidate of singlePickFeatureCandidates(context)) {
    if (!candidate.applicable) continue;
    pickers.push(candidateToPayload(candidate));
  }
  pickers.push(...loadoutPickers(draft));
  return pickers;
}

function writeAtPath(
  existing: unknown,
  writePath: ReadonlyArray<string>,
  value: unknown,
): unknown {
  if (writePath.length === 0) return value;
  const [head, ...rest] = writePath;
  const existingObj =
    existing != null && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return {
    ...existingObj,
    [head]: writeAtPath(existingObj[head], rest, value),
  };
}

export function buildOpenChoicePatch(
  draft: CharacterDraft,
  payload: CharacterOpenChoicePayload,
  value: string | ReadonlyArray<string> | undefined,
): Partial<CharacterDraft> {
  if (payload.writePath.length === 0) {
    throw new Error("writePath cannot be empty");
  }
  const leafValue = payload.lift != null ? payload.lift(value, draft) : value;
  const [head, ...rest] = payload.writePath;
  const existingBranch = (draft as Record<string, unknown>)[head];
  const nextBranch = writeAtPath(existingBranch, rest, leafValue);
  return { [head]: nextBranch } as Partial<CharacterDraft>;
}
