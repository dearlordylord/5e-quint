// KERNEL-COVERAGE: runtime-owner CREATION.CHOICE_DISCOVERY_CARDINALITY CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.wizard-spellbook-learning-choice unit-feature.hunters-prey
import { Either, Match, Option } from "effect";
import {
  ALIGNMENT_CHOICES,
  STANDARD_LANGUAGES,
  alignmentLabel,
  alignmentOptionId,
  type Language,
  type SelectableStandardLanguage,
} from "@dnd/shared/game-facts";
import { SUPPORTED_ABILITY_SCORE_METHODS } from "@dnd/shared-algebras/ability-score-algebra";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import {
  CLASS_SPELL_LISTS,
  allCantripsFromClassSpellList,
} from "@dnd/surface/surface/schema";
import { SKILLS } from "@dnd/surface/surface/types";
import type {
  BackgroundToolProficiency,
  ClassFeatureRecord,
  EffectAtom,
  FeatRecord,
  FeatureChoiceMechanics,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  Skill,
  StartingEquipmentChoice,
  Size,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { proficiencyGrantSubjectOptions } from "./choice-option-codecs.ts";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
  INITIAL_CHARACTER_DRAFT_PATHS,
  abilityScoreIncreaseChoiceOptions,
  progressionOptionId,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { levelOneEldritchInvocationChoiceOptions } from "./eldritch-invocations.ts";
import {
  characterCreationLanguageTableOptions,
  languageFromCreationChoiceOptionId,
  languageFromSurfaceLanguageId,
} from "./language-codecs.ts";
import {
  backgroundAbilityScoreIncreaseOptionId,
  backgroundAbilityScoreIncreaseOptions,
  choiceHole,
  draftSource,
  hasDraftSelection,
  isSupported,
  loadoutSource,
  selectedChoiceOption,
  skillOption,
  startingEquipmentLabel,
  unitOption,
  unitSource,
} from "./hole-factories.ts";
import { classLevelChoiceCountAtLevel } from "./class-level-scaling.ts";
import {
  creationChoiceOptionId,
  creationHoleId,
  boundedChoiceCardinality,
  choiceCardinalityBounds,
  choiceCardinalityMax,
  exactChoiceCardinality,
  unitChoiceKey,
  type CharacterChoiceSelection,
  type CharacterDraft,
  type CharacterSelectedChoiceOption,
  type ChoiceCardinality,
  type ChoiceCreationHole,
  type ChoiceCreationHoleSource,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationHoleSource,
  type UnitCatalog,
} from "./types.ts";
import {
  supportedBackgroundUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  isSupportedProgression,
  supportedLoadoutChoices,
  supportedProgressionsForClass,
  supportedPurchasableEquipmentUnitIdsForClass,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";
import {
  classLevelForUnit,
  computeTotalLevel,
  finalAdvancementEntry,
  hitPointRuleLabel,
  progressionClassUnitIds,
  startingClassUnitId,
} from "./character-progression-types.ts";
import {
  classUnitId,
  type CharacterProgression,
} from "./character-progression-types.ts";
import {
  isWeaponMasteryChoiceFeature,
  weaponMasteryChoiceProfileForFeature,
  type WeaponMasteryChoiceFeature,
} from "./weapon-mastery.ts";
import {
  availableSpellSlotLevels,
  classSpellcastingCreationAtLevel,
  isListPreparedSpellcastingCreation,
  isPactMagicSpellcastingCreation,
  isWizardSpellcastingCreation,
  type ReadableClassSpellcasting,
} from "./class-spellcasting.ts";

type GrantExpertiseEffect = Extract<
  EffectAtom,
  { readonly kind: "grant_expertise" }
>;
type GrantExpertiseSkillSource = Extract<
  EffectAtom,
  { readonly kind: "grant_expertise" }
>["skills"];

const SRD_GAMING_SET_OPTIONS = [
  {
    optionId: creationChoiceOptionId("tool_dice_set"),
    label: "Dice Set",
  },
  {
    optionId: creationChoiceOptionId("tool_dragonchess_set"),
    label: "Dragonchess Set",
  },
  {
    optionId: creationChoiceOptionId("tool_playing_card_set"),
    label: "Playing Card Set",
  },
  {
    optionId: creationChoiceOptionId("tool_three_dragon_ante_set"),
    label: "Three-Dragon Ante Set",
  },
] as const satisfies ReadonlyArray<CreationChoiceOption>;

export function discoverCreationHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return [
    ...discoverInitialDraftHoles(input),
    ...discoverClassGrantedHoles(input),
    ...discoverBackgroundGrantedHoles(input),
    ...discoverEquipmentHoles(input),
  ];
}
export function discoverInitialDraftHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return INITIAL_CHARACTER_DRAFT_PATHS.flatMap((path) => {
    if (hasDraftSelection(input.draft.selections, path)) {
      return [];
    }
    const hole = draftHole(path, input.unitLibrary, input.draft);
    return hole === undefined ? [] : [hole];
  });
}

export function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const progression = input.draft.selections.progression;
  if (progression == null || !isSupportedProgression(progression)) {
    return [];
  }
  const startingUnitId = startingClassUnitId(progression);
  const classUnitId = startingUnitId;
  const classUnit = input.unitLibrary.getUnit(classUnitId);
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  const classLevel = classLevelForUnit(progression, classUnitId);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedUnitChoiceHole(
      input.draft,
      choiceHole({
        source: unitSource(classUnitId, CLASS_SKILL_PROFICIENCY_CHOICE_KEY),
        cardinality: exactChoiceCardinality(
          facts.value.skillProficiencyChoice.choose,
        ),
        options: facts.value.skillProficiencyChoice.options.map(skillOption),
      }),
    ),
    ...classToolProficiencyChoiceHoles(input.draft, classUnitId, facts.value),
    ...facts.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(
            grant.unitId,
            classLevel,
            input.draft,
            input.unitLibrary,
          )
        : [],
    ),
    ...discoverSubclassHoles(classUnitId, classLevel, facts.value, input),
    ...discoverSelectedSubclassFeatureGrantHoles(
      classUnitId,
      classLevel,
      facts.value,
      input,
    ),
    ...discoverSelectedFeatAbilityScoreIncreaseHoles(input),
    ...selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: input.draft.selections.choices,
      classUnitId,
      classFacts: facts.value,
      classLevel,
      unitLibrary: input.unitLibrary,
    }).flatMap((hole) => unselectedUnitChoiceHole(input.draft, hole)),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
    ),
    ...discoverClassSpellcastingHoles(
      classUnitId,
      classLevel,
      facts.value,
      input.draft,
    ),
    ...progressionClassUnitIds(progression).flatMap((progressionClassUnitId) =>
      progressionClassUnitId === startingUnitId
        ? []
        : discoverAdditionalClassGrantedHoles(
            progressionClassUnitId,
            classLevelForUnit(progression, progressionClassUnitId),
            input.draft,
            input.unitLibrary,
          ),
    ),
  ];
}

export type ReadableClassCreationFacts = Extract<
  ReturnType<typeof readClassCreationFacts>,
  { readonly tag: "readable" }
>["value"];
function discoverClassSpellcastingHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  facts: ReadableClassCreationFacts,
  draft: CharacterDraft,
): readonly CreationHole[] {
  return classSpellcastingChoiceHoles(classUnitId, facts, classLevel).flatMap(
    (hole) => unselectedUnitChoiceHole(draft, hole),
  );
}

export function classSpellcastingChoiceHoles(
  classUnitId: UnitRecord["id"],
  facts: ReadableClassCreationFacts,
  classLevel: number,
): readonly ChoiceCreationHole[] {
  const spellcasting = classSpellcastingCreation(facts, classLevel);
  if (spellcasting == null) {
    return [];
  }

  if (isListPreparedSpellcastingCreation(spellcasting)) {
    const preparedSpells =
      listPreparedSpellOptionsAvailableToSpellcasting(spellcasting);
    return compactChoiceHoles([
      ...(spellcasting.cantripAccess == null
        ? []
        : [
            choiceHole({
              source: unitSource(classUnitId, CLASS_CANTRIP_CHOICE_KEY),
              cardinality: exactChoiceCardinality(
                spellcasting.cantripAccess.choose,
              ),
              options: spellcasting.cantripAccess.spellIds.map((spellId) => ({
                optionId: creationChoiceOptionId(spellId),
                label: spellId,
                unitRef: { unitId: spellId },
              })),
            }),
          ]),
      choiceHole({
        source: unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: preparedSpells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: spell.spellId },
        })),
      }),
    ]);
  }

  if (isPactMagicSpellcastingCreation(spellcasting)) {
    const preparedSpells =
      pactMagicSpellOptionsAvailableToSpellcasting(spellcasting);
    return compactChoiceHoles([
      choiceHole({
        source: unitSource(classUnitId, CLASS_CANTRIP_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.cantripAccess.choose),
        options: spellcasting.cantripAccess.spellIds.map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
      }),
      choiceHole({
        source: unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: preparedSpells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: spell.spellId },
        })),
      }),
    ]);
  }

  if (!isWizardSpellcastingCreation(spellcasting)) {
    return [];
  }

  const wizardSpellbookSpells =
    wizardSpellbookOptionsAvailableToSpellcasting(spellcasting);
  const wizardSpellbookSpellIds = new Set(
    wizardSpellbookSpells.map((spell) => spell.spellId),
  );
  return compactChoiceHoles([
    choiceHole({
      source: unitSource(classUnitId, WIZARD_CANTRIP_CHOICE_KEY),
      cardinality: exactChoiceCardinality(spellcasting.cantripAccess.choose),
      options: spellcasting.cantripAccess.spellIds.map((spellId) => ({
        optionId: creationChoiceOptionId(spellId),
        label: spellId,
        unitRef: { unitId: spellId },
      })),
    }),
    choiceHole({
      source: unitSource(classUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
      cardinality: exactChoiceCardinality(spellcasting.spellbookAccess.choose),
      options: wizardSpellbookSpells.map((spell) => ({
        optionId: creationChoiceOptionId(spell.spellId),
        label: spell.spellId,
        unitRef: { unitId: spell.spellId },
      })),
    }),
    choiceHole({
      source: unitSource(classUnitId, WIZARD_PREPARED_SPELL_CHOICE_KEY),
      cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
      options: spellcasting.preparedAccess.spellIds
        .filter((spellId) => wizardSpellbookSpellIds.has(spellId))
        .map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
    }),
  ]);
}

function listPreparedSpellOptionsAvailableToSpellcasting(
  spellcasting: Extract<
    ReadableClassSpellcasting,
    {
      readonly kind:
        | "list_prepared_spellcasting_creation"
        | "list_prepared_spellcasting_progression_creation";
    }
  >,
): readonly { readonly spellId: string; readonly spellLevel: number }[] {
  const slotLevels = availableSpellSlotLevels(
    spellcasting.spellSlotProjection.slots,
  );
  return spellcasting.preparedAccess.spells.filter((spell) =>
    slotLevels.has(spell.spellLevel),
  );
}

function pactMagicSpellOptionsAvailableToSpellcasting(
  spellcasting: Extract<
    ReadableClassSpellcasting,
    { readonly kind: "pact_magic_spellcasting_creation" }
  >,
): readonly { readonly spellId: string; readonly spellLevel: number }[] {
  if (spellcasting.pactSlotProjection.count <= 0) {
    return [];
  }
  return spellcasting.preparedAccess.spells.filter(
    (spell) => spell.spellLevel <= spellcasting.pactSlotProjection.spellLevel,
  );
}

function wizardSpellbookOptionsAvailableToSpellcasting(
  spellcasting: Extract<
    ReadableClassSpellcasting,
    { readonly kind: "wizard_spellcasting_creation" }
  >,
): readonly { readonly spellId: string; readonly spellLevel: number }[] {
  const slotLevels = availableSpellSlotLevels(
    spellcasting.spellSlotProjection.slots,
  );
  return spellcasting.spellbookAccess.spells.filter((spell) =>
    slotLevels.has(spell.spellLevel),
  );
}

function compactChoiceHoles(
  holes: readonly (CreationHole | undefined)[],
): readonly ChoiceCreationHole[] {
  return holes.flatMap((hole) => (hole?.kind === "choice" ? [hole] : []));
}

function classSpellcastingCreation(
  facts: ReadableClassCreationFacts,
  classLevel: number,
): ReadableClassSpellcasting | undefined {
  return classSpellcastingCreationAtLevel(
    "spellcasting" in facts ? facts.spellcasting : undefined,
    classLevel,
  );
}

function discoverSubclassHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  facts: ReadableClassCreationFacts,
  input: {
    readonly draft: CharacterDraft;
    readonly unitLibrary: UnitCatalog;
  },
): readonly CreationHole[] {
  return facts.subclassChoices
    .filter((choice) => choice.level <= classLevel)
    .flatMap((choice) =>
      unselectedUnitChoiceHole(
        input.draft,
        choiceHole({
          source: unitSource(classUnitId, CLASS_SUBCLASS_CHOICE_KEY),
          cardinality: EXACTLY_ONE_CHOICE,
          options: choice.options.flatMap((unitId) => {
            const unit = input.unitLibrary.getUnit(unitId);
            return Option.isSome(unit) ? [unitOption(unit.value)] : [];
          }),
        }),
      ),
    );
}

function discoverSelectedSubclassFeatureGrantHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  facts: ReadableClassCreationFacts,
  input: {
    readonly draft: CharacterDraft;
    readonly unitLibrary: UnitCatalog;
  },
): readonly CreationHole[] {
  const selectedSubclassIds = input.draft.selections.choices.flatMap(
    (choice) =>
      choice.kind === "unitChoice" &&
      choice.source.unitId === classUnitId &&
      choice.source.choiceKey === CLASS_SUBCLASS_CHOICE_KEY
        ? choice.options.flatMap((option) =>
            option.unitRef == null ? [] : [option.unitRef.unitId],
          )
        : [],
  );

  return selectedSubclassIds.flatMap((subclassId) => {
    const subclass = input.unitLibrary.getUnit(subclassId);
    if (
      Option.isNone(subclass) ||
      subclass.value.kind !== "subclass" ||
      subclass.value.className !== facts.className
    ) {
      return [];
    }

    return subclass.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(
            grant.unitId,
            classLevel,
            input.draft,
            input.unitLibrary,
          )
        : [],
    );
  });
}

function discoverAdditionalClassGrantedHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
): readonly CreationHole[] {
  const classUnit = unitLibrary.getUnit(classUnitId);
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...facts.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(
            grant.unitId,
            classLevel,
            draft,
            unitLibrary,
          )
        : [],
    ),
    ...proficiencyGrantChoiceHoles(
      classUnitId,
      facts.value.multiclassProficiencies,
    ).flatMap((hole) => unselectedUnitChoiceHole(draft, hole)),
    ...selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: draft.selections.choices,
      classUnitId,
      classFacts: facts.value,
      classLevel,
      unitLibrary,
    }).flatMap((hole) => unselectedUnitChoiceHole(draft, hole)),
  ];
}

type GrantSpellAccessChoice = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access_choice" }
>;
type ClassFeatureAcquisitionCantripGrantSpellList =
  keyof typeof CLASS_SPELL_LISTS;

function classFeatureAcquisitionCantripGrantSpellList(
  spellList: GrantSpellAccessChoice["spellList"],
): ClassFeatureAcquisitionCantripGrantSpellList | undefined {
  return isClassFeatureAcquisitionCantripGrantSpellList(spellList)
    ? spellList
    : undefined;
}

function isClassFeatureAcquisitionCantripGrantSpellList(
  spellList: GrantSpellAccessChoice["spellList"],
): spellList is ClassFeatureAcquisitionCantripGrantSpellList {
  return Object.hasOwn(CLASS_SPELL_LISTS, spellList);
}

export function selectedClassFeatureAcquisitionGrantChoiceHoles(input: {
  readonly choices: readonly CharacterChoiceSelection[];
  readonly classUnitId: UnitRecord["id"];
  readonly classFacts: ReadableClassCreationFacts;
  readonly classLevel: number;
  readonly unitLibrary: UnitCatalog;
}): readonly ChoiceCreationHole[] {
  return input.choices.flatMap((selection) => {
    if (selection.kind !== "unitChoice") {
      return [];
    }

    const feature = input.unitLibrary.getUnit(selection.source.unitId);
    if (
      Option.isNone(feature) ||
      feature.value.kind !== "class_feature" ||
      feature.value.className !== input.classFacts.className ||
      feature.value.mechanics.family !== "class_feature_acquisition_choice"
    ) {
      return [];
    }
    const featureChoiceKey = unitChoiceKey(feature.value.mechanics.choiceKey);
    if (
      Either.isLeft(featureChoiceKey) ||
      featureChoiceKey.right !== selection.source.choiceKey
    ) {
      return [];
    }

    const primaryCantrips = new Set(
      input.choices.flatMap((choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === input.classUnitId &&
        choice.source.choiceKey === CLASS_CANTRIP_CHOICE_KEY
          ? choiceSelectionOptionIds(choice)
          : [],
      ),
    );
    const optionIds = new Set(choiceSelectionOptionIds(selection));
    return feature.value.mechanics.options
      .filter((option) => optionIds.has(creationChoiceOptionId(option.id)))
      .flatMap((option) =>
        option.mechanics.grants.flatMap((grant) => {
          if (grant.kind === "grant_feat") {
            const hole = featGrantFeatureHoleSource(
              selection.source.unitId,
              grant,
              input.unitLibrary,
            );
            return hole === undefined ? [] : [hole];
          }
          if (
            grant.kind !== "grant_spell_access_choice" ||
            grant.mode !== "known" ||
            grant.spellLevel !== 0
          ) {
            return [];
          }
          const spellcasting = classSpellcastingCreation(
            input.classFacts,
            input.classLevel,
          );
          if (
            spellcasting === undefined ||
            !isListPreparedSpellcastingCreation(spellcasting)
          ) {
            return [];
          }

          const cardinality = exactChoiceCardinality(grant.count);
          if (cardinality === undefined) {
            return [];
          }
          const grantedSpellList = classFeatureAcquisitionCantripGrantSpellList(
            grant.spellList,
          );
          if (grantedSpellList === undefined) {
            return [];
          }

          const options = input.unitLibrary
            .listUnits()
            .filter(
              (unit) =>
                unit.kind === "spell" &&
                unit.mechanics.level === 0 &&
                allCantripsFromClassSpellList(grantedSpellList, [unit.id]) &&
                !primaryCantrips.has(creationChoiceOptionId(unit.id)),
            )
            .sort((left, right) =>
              left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
            )
            .map((unit) => ({
              optionId: creationChoiceOptionId(unit.id),
              label: unit.id,
              unitRef: { unitId: unit.id },
            }));
          if (choiceCardinalityMax(cardinality) > options.length) {
            return [];
          }

          const hole = requireChoiceCreationHole(
            choiceHole({
              source: unitSource(
                selection.source.unitId,
                CLASS_CANTRIP_CHOICE_KEY,
              ),
              cardinality,
              options,
            }),
          );
          return hole === undefined ? [] : [hole];
        }),
      );
  });
}

function discoverSelectedFeatAbilityScoreIncreaseHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return input.draft.selections.choices.flatMap((selection) => {
    if (
      selection.kind !== "unitChoice" ||
      selection.source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY
    ) {
      return [];
    }

    return selection.options.flatMap((option) => {
      const featUnitId = option.unitRef?.unitId;
      if (featUnitId == null) return [];
      const unit = input.unitLibrary.getUnit(featUnitId);
      if (Option.isNone(unit)) return [];
      const options = selectedFeatAbilityScoreIncreaseOptions(unit.value);
      if (options.length === 0) return [];

      return unselectedUnitChoiceHole(
        input.draft,
        choiceHole({
          source: unitSource(
            selection.source.unitId,
            CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
          ),
          cardinality: EXACTLY_ONE_CHOICE,
          options,
        }),
      );
    });
  });
}

export function discoverBackgroundGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(backgroundUnitId, supportedBackgroundUnitIds())
  ) {
    return [];
  }

  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedBackgroundAbilityScoreIncreaseHole(
      input.draft,
      choiceHole({
        source: unitSource(
          backgroundUnitId,
          BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        ),
        cardinality: EXACTLY_ONE_CHOICE,
        options: backgroundAbilityScoreIncreaseOptions(
          facts.value.abilityScoreIncrease.abilities,
        ),
      }),
    ),
    ...backgroundToolChoiceHole(
      input.draft,
      unitSource(backgroundUnitId, BACKGROUND_TOOL_CHOICE_KEY),
      facts.value.toolProficiency,
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
    ),
  ];
}

export function backgroundToolChoiceHole(
  draft: CharacterDraft,
  source: ChoiceCreationHoleSource,
  proficiency: BackgroundToolProficiency,
): readonly CreationHole[] {
  const spec = backgroundToolChoiceSpec(proficiency);
  return spec == null
    ? []
    : unselectedUnitChoiceHole(
        draft,
        choiceHole({
          source,
          cardinality: spec.cardinality,
          options: spec.options,
        }),
      );
}

export function backgroundToolChoiceSpec(
  proficiency: BackgroundToolProficiency,
):
  | {
      readonly cardinality: ChoiceCardinality;
      readonly options: readonly CreationChoiceOption[];
    }
  | undefined {
  const spec = Match.value(proficiency).pipe(
    Match.when({ kind: "specific_tool" }, (specificTool) => ({
      cardinality: EXACTLY_ONE_CHOICE,
      options: [
        {
          optionId: creationChoiceOptionId(specificTool.toolId),
          label: specificTool.toolId,
          unitRef: { unitId: specificTool.toolId },
        },
      ],
    })),
    Match.when(
      { kind: "tool_category_choice", category: "gaming_set" },
      (toolChoice) => ({
        cardinality: exactChoiceCardinality(toolChoice.choose),
        // SRD 5.2.1 Equipment.md:334-337 lists these Gaming Set variants.
        // The current support profile admits Dice Set; support-gates.ts rejects
        // the rest as unsupported rather than treating them as invalid RAW choices.
        options: SRD_GAMING_SET_OPTIONS,
      }),
    ),
    Match.when(
      { kind: "tool_category_choice", category: "artisan_tool" },
      () => undefined,
    ),
    Match.exhaustive,
  );

  return spec != null &&
    spec.cardinality !== undefined &&
    choiceCardinalityMax(spec.cardinality) <= spec.options.length
    ? { cardinality: spec.cardinality, options: spec.options }
    : undefined;
}

export function discoverEquipmentHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const classUnitId =
    input.draft.selections.progression == null
      ? undefined
      : startingClassUnitId(input.draft.selections.progression);
  if (classUnitId == null || !hasSupportedCoinEquipmentPath(input)) {
    return [];
  }
  const purchaseHole = choiceHole({
    source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
    cardinality: boundedChoiceCardinality({
      min: 1,
      max: supportedEquipmentPurchaseChoiceCount(),
    }),
    options: supportedPurchasableEquipmentUnitIdsForClass(classUnitId).flatMap(
      (unitId) => {
        const unit = input.unitLibrary.getUnit(unitId);
        return Option.isSome(unit) ? [unitOption(unit.value)] : [];
      },
    ),
  });
  const hasValidPurchaseSelection = hasValidEquipmentPurchaseSelectionForHole(
    input.draft,
    purchaseHole,
  );

  return [
    ...unselectedPurchaseHole(input.draft, purchaseHole),
    ...supportedLoadoutChoices().flatMap((loadoutChoice) =>
      unselectedLoadoutHole(
        input.draft,
        choiceHole({
          source: loadoutSource(loadoutChoice.unitId, loadoutChoice.slot),
          cardinality: EXACTLY_ONE_CHOICE,
          options: [
            {
              optionId: loadoutChoice.optionId,
              label: loadoutChoice.label,
              unitRef: { unitId: loadoutChoice.unitId },
            },
          ],
        }),
        loadoutChoice.unitId,
        hasValidPurchaseSelection,
      ),
    ),
  ];
}

function classToolProficiencyChoiceHoles(
  draft: CharacterDraft,
  classUnitId: UnitRecord["id"],
  facts: ReadableClassCreationFacts,
): readonly CreationHole[] {
  const proficiency = facts.toolProficiencies;
  if (proficiency.kind !== "choice") {
    return [];
  }

  return unselectedUnitChoiceHole(
    draft,
    choiceHole({
      source: unitSource(classUnitId, CLASS_TOOL_PROFICIENCY_CHOICE_KEY),
      cardinality: exactChoiceCardinality(proficiency.count),
      options: proficiency.options.flatMap(proficiencyGrantSubjectOptions),
    }),
  );
}

export function startingEquipmentChoiceHole(
  source: ChoiceCreationHoleSource,
  choices: readonly StartingEquipmentChoice[],
): CreationHole | undefined {
  return choiceHole({
    source,
    cardinality: EXACTLY_ONE_CHOICE,
    options: choices.map((choice) => ({
      optionId: creationChoiceOptionId(choice.id),
      label: startingEquipmentLabel(choice),
    })),
  });
}

export function hasSupportedCoinEquipmentPath(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): boolean {
  const draft = input.draft;
  const progression = draft.selections.progression;
  const classUnitId =
    progression == null ? undefined : startingClassUnitId(progression);
  const backgroundUnitId = draft.selections.background;
  if (
    progression == null ||
    classUnitId == null ||
    backgroundUnitId == null ||
    !isSupportedProgression(progression) ||
    !isSupported(backgroundUnitId, supportedBackgroundUnitIds())
  ) {
    return false;
  }

  const classUnit = input.unitLibrary.getUnit(classUnitId);
  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(classUnit) || Option.isNone(backgroundUnit)) {
    return false;
  }
  const classFacts = readClassCreationFacts(classUnit.value);
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (classFacts.tag !== "readable" || backgroundFacts.tag !== "readable") {
    return false;
  }

  return (
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        classFacts.value.startingEquipment,
      ),
      classFacts.value.startingEquipment,
    ) != null &&
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        backgroundFacts.value.startingEquipment,
      ),
      backgroundFacts.value.startingEquipment,
    ) != null
  );
}

export function selectedCoinGrantStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
): StartingEquipmentChoice | undefined {
  const selectedChoice = selectedStartingEquipmentChoice(draft, hole, choices);
  return selectedChoice?.kind === "coin_grant" ? selectedChoice : undefined;
}

export function selectedStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
): StartingEquipmentChoice | undefined {
  if (hole === undefined) {
    return undefined;
  }
  const selection = draft.selections.choices.find((candidate) =>
    choiceSelectionMatchesHole(candidate, hole),
  );
  if (selection?.options.length !== 1) {
    return undefined;
  }

  const optionId = selection.options[0]?.optionId;
  return choices.find((choice) => choice.id === optionId);
}

export function unselectedUnitChoiceHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedBackgroundAbilityScoreIncreaseHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidBackgroundAbilityScoreIncreaseSelectionForHole(draft, hole)
    ? []
    : [hole];
}

export function unselectedPurchaseHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidEquipmentPurchaseSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedLoadoutHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  unitId: UnitRecord["id"],
  hasValidPurchaseSelection: boolean,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidPurchaseSelection &&
    hasPurchasedUnit(draft, unitId) &&
    !hasValidLoadoutSlotSelectionForHole(draft, hole)
    ? [hole]
    : [];
}

function hasValidLoadoutSlotSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  if (hole.source.tag !== "loadout") {
    return false;
  }

  const slot = hole.source.slot;
  return draft.selections.choices.some(
    (selection) =>
      selection.kind === "loadout" && selection.source.slot === slot,
  );
}

export function hasValidEquipmentPurchaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): boolean {
  if (draft.selections.equipment == null || hole === undefined) {
    return false;
  }

  return choiceOptionIdsFitHole(
    hole,
    draft.selections.equipment.selectedUnitIds.map((unitId) =>
      creationChoiceOptionId(unitId),
    ),
  );
}

export function hasPurchasedUnit(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
): boolean {
  return draft.selections.equipment?.selectedUnitIds.includes(unitId) ?? false;
}

export function hasValidSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  return draft.selections.choices.some((selection) =>
    choiceSelectionMatchesHole(selection, hole),
  );
}

export function choiceSelectionMatchesHole(
  selection: CharacterChoiceSelection,
  hole: CreationHole,
): boolean {
  if (
    hole.kind !== "choice" ||
    !sameCreationHoleSource(selection.source, hole.source)
  ) {
    return false;
  }

  const optionIds = choiceSelectionOptionIds(selection);
  return (
    choiceOptionIdsFitHole(hole, optionIds) &&
    (selection.kind === "loadout"
      ? selection.options.every((selectedOption) =>
          loadoutSelectionOptionMatchesHole(selection, selectedOption, hole),
        )
      : selection.options.every((selectedOption) =>
          selectedChoiceOptionMatchesHole(selectedOption, hole),
        ))
  );
}

export function hasValidBackgroundAbilityScoreIncreaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  const selection = draft.selections.backgroundAbilityScoreIncrease;
  return (
    selection != null &&
    hole.kind === "choice" &&
    choiceOptionIdsFitHole(hole, [
      backgroundAbilityScoreIncreaseOptionId(selection),
    ])
  );
}

export function choiceOptionIdsFitHole(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  const bounds =
    hole.kind === "choice" ? choiceCardinalityBounds(hole.cardinality) : null;
  return (
    hole.kind === "choice" &&
    bounds != null &&
    optionIds.length >= bounds.min &&
    optionIds.length <= bounds.max &&
    !hasDuplicateOptionIds(optionIds) &&
    optionIds.every((optionId) =>
      hole.options.some((option) => option.optionId === optionId),
    ) &&
    unsupportedHoleSelectionOptionId(hole, optionIds) == null
  );
}

export function selectedChoiceOptionMatchesHole(
  selectedOption: CharacterSelectedChoiceOption,
  hole: ChoiceCreationHole,
): boolean {
  return hole.options.some((option) =>
    sameSelectedChoiceOption(selectedOption, selectedChoiceOption(option)),
  );
}

function loadoutSelectionOptionMatchesHole(
  selection: Extract<CharacterChoiceSelection, { readonly kind: "loadout" }>,
  selectedOption: CharacterChoiceSelection["options"][number],
  hole: ChoiceCreationHole,
): boolean {
  return hole.options.some(
    (option) =>
      option.optionId === selectedOption.optionId &&
      option.unitRef?.unitId === selection.source.equipmentUnitId,
  );
}

export function hasDuplicateOptionIds(
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  return optionIds.some(
    (optionId, optionIndex) => optionIds.indexOf(optionId) !== optionIndex,
  );
}

export function sameCreationHoleSource(
  left: CreationHoleSource,
  right: CreationHoleSource,
): boolean {
  if (left.tag === "draft" && right.tag === "draft") {
    return left.path === right.path;
  }

  if (left.tag === "unitChoice" && right.tag === "unitChoice") {
    return left.unitId === right.unitId && left.choiceKey === right.choiceKey;
  }

  if (left.tag === "loadout" && right.tag === "loadout") {
    return (
      left.equipmentUnitId === right.equipmentUnitId && left.slot === right.slot
    );
  }

  return false;
}

export function sameChoiceSelectionMultiset(
  left: readonly CharacterChoiceSelection[],
  right: readonly CharacterChoiceSelection[],
): boolean {
  return sameMultiset(left, right, sameChoiceSelection);
}

export function choiceSelectionOptionIds(
  selection: CharacterChoiceSelection,
): readonly CreationChoiceOptionId[] {
  return selection.options.map((option) => option.optionId);
}

export function sameChoiceSelection(
  left: CharacterChoiceSelection,
  right: CharacterChoiceSelection,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  return (
    sameCreationHoleSource(left.source, right.source) &&
    (left.kind === "loadout" && right.kind === "loadout"
      ? sameOptionIdMultiset(
          choiceSelectionOptionIds(left),
          choiceSelectionOptionIds(right),
        )
      : sameSelectedChoiceOptionMultiset(left.options, right.options))
  );
}

export function sameSelectedChoiceOptionMultiset(
  left: readonly CharacterSelectedChoiceOption[],
  right: readonly CharacterSelectedChoiceOption[],
): boolean {
  return sameMultiset(left, right, sameSelectedChoiceOption);
}

export function sameSelectedChoiceOption(
  left: CharacterSelectedChoiceOption,
  right: CharacterSelectedChoiceOption,
): boolean {
  return (
    left.optionId === right.optionId &&
    left.unitRef?.unitId === right.unitRef?.unitId
  );
}

export function sameOptionIdMultiset(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return sameMultiset(
    left,
    right,
    (leftValue, rightValue) => leftValue === rightValue,
  );
}

function sameMultiset<T>(
  left: readonly T[],
  right: readonly T[],
  sameElement: (leftElement: T, rightElement: T) => boolean,
): boolean {
  const remainingRight = [...right];
  for (const leftElement of left) {
    const matchIndex = remainingRight.findIndex((rightElement) =>
      sameElement(leftElement, rightElement),
    );
    if (matchIndex === -1) {
      return false;
    }

    remainingRight.splice(matchIndex, 1);
  }

  return left.length === right.length && remainingRight.length === 0;
}

export function discoverClassFeatureGrantHoles(
  featureUnitId: UnitRecord["id"],
  classLevel: number,
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
): readonly CreationHole[] {
  return classFeatureGrantChoiceHoles(featureUnitId, unitLibrary, {
    classLevel,
    ownedSkillExpertise: draftOwnedSkillExpertise(
      draft,
      featureUnitId,
      unitLibrary,
    ),
    ownedSkillProficiencies: draftOwnedSkillProficiencies(
      draft,
      unitLibrary,
      (selection) =>
        selection.kind === "unitChoice" &&
        selection.source.unitId === featureUnitId &&
        selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    ),
    knownLanguages: draftKnownLanguages(draft, featureUnitId, unitLibrary),
  }).flatMap((hole) => unselectedUnitChoiceHole(draft, hole));
}

export function classFeatureGrantChoiceHoles(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
  input: {
    readonly classLevel?: number;
    readonly ownedSkillExpertise?: readonly Skill[];
    readonly ownedSkillProficiencies?: readonly Skill[];
    readonly knownLanguages?: readonly Language[];
  } = {},
): readonly ChoiceCreationHole[] {
  const feature = requireClassFeature(unitLibrary, featureUnitId);
  if (feature === undefined) {
    return [];
  }
  const mechanics = feature.mechanics;

  if (mechanics.family === "passive") {
    const knownLanguages = uniqueLanguages([
      ...(input.knownLanguages ?? []),
      ...fixedPassiveGrantLanguages(mechanics.grants),
    ]);
    const passiveGrantHoles = mechanics.grants.flatMap((grant) =>
      passiveGrantChoiceHoles(featureUnitId, grant, unitLibrary, {
        ...input,
        knownLanguages,
      }),
    );
    if (passiveGrantHoles.length > 0) {
      return passiveGrantHoles;
    }
  }

  if (mechanics.family === "class_feature_acquisition_choice") {
    const choiceKey = unitChoiceKey(mechanics.choiceKey);
    if (Either.isLeft(choiceKey)) {
      return [];
    }

    const hole = requireChoiceCreationHole(
      choiceHole({
        source: unitSource(featureUnitId, choiceKey.right),
        cardinality: EXACTLY_ONE_CHOICE,
        options: mechanics.options.map((option) => ({
          optionId: creationChoiceOptionId(option.id),
          label: option.displayName,
        })),
      }),
    );
    return hole === undefined ? [] : [hole];
  }

  if (mechanics.family === "feature_choice") {
    return eldritchInvocationChoiceHoles(featureUnitId, mechanics, input);
  }

  if (mechanics.family === "metamagic_options") {
    return sorcererMetamagicChoiceHoles(featureUnitId, mechanics, input);
  }

  if (mechanics.family === "hunters_prey") {
    const choiceKey = unitChoiceKey(HUNTERS_PREY_CHOICE_KEY);
    if (Either.isLeft(choiceKey)) {
      return [];
    }
    const hole = requireChoiceCreationHole(
      choiceHole({
        source: unitSource(featureUnitId, choiceKey.right),
        cardinality: EXACTLY_ONE_CHOICE,
        options: mechanics.options.map((option) => ({
          optionId: creationChoiceOptionId(option.id),
          label: option.id,
        })),
      }),
    );
    return hole === undefined ? [] : [hole];
  }

  if (mechanics.family === "wizard_spellbook_learning") {
    return wizardSpellbookLearningChoiceHoles(
      featureUnitId,
      feature.acquiredAtLevel,
      mechanics,
      unitLibrary,
      input,
    );
  }

  if (isWeaponMasteryChoiceFeature(feature)) {
    const hole = weaponMasteryFeatureHoleSource(feature, unitLibrary);
    return hole === undefined ? [] : [hole];
  }

  return [];
}

function wizardSpellbookLearningChoiceHoles(
  featureUnitId: UnitRecord["id"],
  acquiredAtLevel: number,
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "wizard_spellbook_learning" }
  >,
  unitLibrary: UnitCatalog,
  input: { readonly classLevel?: number },
): readonly ChoiceCreationHole[] {
  const acquisitionGrant = mechanics.grants.find(
    (
      grant,
    ): grant is Extract<
      (typeof mechanics.grants)[number],
      { readonly timing: { readonly kind: "class_feature_acquisition" } }
    > => grant.timing.kind === "class_feature_acquisition",
  );
  if (
    acquisitionGrant === undefined ||
    (input.classLevel ?? 1) < acquiredAtLevel
  ) {
    return [];
  }

  const cardinality = exactChoiceCardinality(acquisitionGrant.choiceCount);
  if (cardinality === undefined) {
    return [];
  }
  const options = wizardSpellbookLearningOptions({
    unitLibrary,
    eligibility: acquisitionGrant.eligibility,
  });
  if (choiceCardinalityMax(cardinality) > options.length) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  return hole === undefined ? [] : [hole];
}

function wizardSpellbookLearningOptions(input: {
  readonly unitLibrary: UnitCatalog;
  readonly eligibility: {
    readonly className: "wizard";
    readonly school: string;
    readonly maximumSpellLevel: number;
  };
}): readonly CreationChoiceOption[] {
  const wizard = input.unitLibrary
    .listUnits()
    .find(
      (unit) =>
        unit.kind === "class" &&
        unit.className === input.eligibility.className &&
        "spellcasting" in unit &&
        unit.spellcasting?.kind === "wizard_spellcasting_creation",
    );
  if (
    wizard === undefined ||
    !("spellcasting" in wizard) ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    return [];
  }

  return wizard.spellcasting.spellbookAccess.spells
    .filter((spellbookSpell) => {
      const spell = input.unitLibrary.getUnit(spellbookSpell.spellId);
      return (
        spellbookSpell.spellLevel <= input.eligibility.maximumSpellLevel &&
        Option.isSome(spell) &&
        spell.value.kind === "spell" &&
        spell.value.mechanics.level === spellbookSpell.spellLevel &&
        spell.value.mechanics.school === input.eligibility.school
      );
    })
    .sort((left, right) =>
      left.spellId < right.spellId ? -1 : left.spellId > right.spellId ? 1 : 0,
    )
    .map((spell) => ({
      optionId: creationChoiceOptionId(spell.spellId),
      label: spell.spellId,
      unitRef: { unitId: spell.spellId },
    }));
}

function sorcererMetamagicChoiceHoles(
  featureUnitId: UnitRecord["id"],
  mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "metamagic_options" }
  >,
  input: { readonly classLevel?: number },
): readonly ChoiceCreationHole[] {
  if (mechanics.choiceKey !== SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY) {
    return [];
  }

  const cardinality = exactChoiceCardinality(
    classLevelChoiceCountAtLevel(mechanics.choiceCount, input.classLevel ?? 1),
  );
  if (cardinality === undefined) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY),
      cardinality,
      options: mechanics.options.map((option) => ({
        optionId: creationChoiceOptionId(option.id),
        label: option.displayName,
      })),
    }),
  );

  return hole === undefined ? [] : [hole];
}

function eldritchInvocationChoiceHoles(
  featureUnitId: UnitRecord["id"],
  mechanics: FeatureChoiceMechanics,
  input: { readonly classLevel?: number },
): readonly ChoiceCreationHole[] {
  if (mechanics.choiceKey !== ELDRITCH_INVOCATIONS_CHOICE_KEY) {
    return [];
  }

  const cardinality = exactChoiceCardinality(
    classLevelChoiceCountAtLevel(mechanics.choiceCount, input.classLevel ?? 1),
  );
  if (cardinality === undefined) {
    return [];
  }

  const options = levelOneEldritchInvocationChoiceOptions();
  if (choiceCardinalityMax(cardinality) > options.length) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, ELDRITCH_INVOCATIONS_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  return hole === undefined ? [] : [hole];
}

function passiveGrantChoiceHoles(
  featureUnitId: UnitRecord["id"],
  grant: EffectAtom,
  unitLibrary: UnitCatalog,
  input: {
    readonly classLevel?: number;
    readonly ownedSkillExpertise?: readonly Skill[];
    readonly ownedSkillProficiencies?: readonly Skill[];
    readonly knownLanguages?: readonly Language[];
  },
): readonly ChoiceCreationHole[] {
  if (grant.kind === "grant_feat") {
    const hole = featGrantFeatureHoleSource(featureUnitId, grant, unitLibrary);
    return hole === undefined ? [] : [hole];
  }
  if (grant.kind === "grant_proficiency") {
    return proficiencyGrantChoiceHoles(
      featureUnitId,
      grant.proficiency,
      input.ownedSkillProficiencies ?? [],
    );
  }
  if (grant.kind === "grant_expertise") {
    return expertiseGrantChoiceHole(
      featureUnitId,
      classLevelChoiceCountAtLevel(grant.choiceCount, input.classLevel ?? 1),
      grant.skills,
      input.ownedSkillProficiencies ?? [],
      input.ownedSkillExpertise ?? [],
    );
  }
  if (grant.kind === "grant_language_choice") {
    return languageGrantChoiceHole(
      featureUnitId,
      grant,
      input.knownLanguages ?? [],
    );
  }

  return [];
}

function languageGrantChoiceHole(
  sourceUnitId: UnitRecord["id"],
  grant: Extract<EffectAtom, { readonly kind: "grant_language_choice" }>,
  knownLanguages: readonly Language[],
): readonly ChoiceCreationHole[] {
  const cardinality = exactChoiceCardinality(grant.count);
  const options = languageChoiceOptionsForSource(grant.source, knownLanguages);
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, CLASS_FEATURE_LANGUAGE_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  return hole === undefined ? [] : [hole];
}

function languageChoiceOptionsForSource(
  source: Extract<
    EffectAtom,
    { readonly kind: "grant_language_choice" }
  >["source"],
  knownLanguages: readonly Language[],
): readonly CreationChoiceOption[] {
  return Match.value(source).pipe(
    Match.when("character_creation_language_tables", () =>
      characterCreationLanguageTableOptions({
        knownLanguages: new Set(knownLanguages),
      }),
    ),
    Match.exhaustive,
  );
}

function fixedPassiveGrantLanguages(
  grants: readonly EffectAtom[],
): readonly Language[] {
  return uniqueLanguages(
    grants.flatMap((grant) => {
      if (grant.kind !== "grant_language") {
        return [];
      }
      const language = languageFromSurfaceLanguageId(grant.languageId);
      return Either.isRight(language) ? [language.right] : [];
    }),
  );
}

function draftKnownLanguages(
  draft: CharacterDraft,
  languageChoiceSourceUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Language[] {
  const originLanguages =
    draft.selections.languages ??
    (["Common"] as const satisfies readonly [Language]);
  return uniqueLanguages([
    ...originLanguages,
    ...selectedClassFeatureLanguageChoices(
      draft.selections.choices,
      languageChoiceSourceUnitId,
    ),
    ...draftOwnedFixedClassFeatureLanguages(
      draft,
      languageChoiceSourceUnitId,
      unitLibrary,
    ),
  ]);
}

function draftOwnedFixedClassFeatureLanguages(
  draft: CharacterDraft,
  languageChoiceSourceUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Language[] {
  const progression = draft.selections.progression;
  if (progression == null) {
    return [];
  }

  return uniqueLanguages(
    progressionClassUnitIds(progression).flatMap((classUnitId) => {
      const unit = unitLibrary.getUnit(classUnitId);
      if (Option.isNone(unit)) {
        return [];
      }
      const facts = readClassCreationFacts(unit.value);
      if (facts.tag !== "readable") {
        return [];
      }

      return facts.value.featureGrants
        .filter(
          (grant) =>
            grant.level <= classLevelForUnit(progression, classUnitId) &&
            grant.unitId !== languageChoiceSourceUnitId,
        )
        .flatMap((grant) =>
          fixedClassFeatureLanguages(grant.unitId, unitLibrary),
        );
    }),
  );
}

function fixedClassFeatureLanguages(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Language[] {
  const unit = unitLibrary.getUnit(featureUnitId);
  if (
    Option.isNone(unit) ||
    unit.value.kind !== "class_feature" ||
    unit.value.mechanics.family !== "passive"
  ) {
    return [];
  }

  return fixedPassiveGrantLanguages(unit.value.mechanics.grants);
}

function selectedClassFeatureLanguageChoices(
  choices: readonly CharacterChoiceSelection[],
  languageChoiceSourceUnitId: UnitRecord["id"],
): readonly Language[] {
  return uniqueLanguages(
    choices.flatMap((selection) => {
      if (
        selection.kind !== "unitChoice" ||
        selection.source.choiceKey !== CLASS_FEATURE_LANGUAGE_CHOICE_KEY
      ) {
        return [];
      }
      if (selection.source.unitId === languageChoiceSourceUnitId) {
        return [];
      }

      return selection.options.flatMap((option) => {
        const language = languageFromCreationChoiceOptionId(option.optionId);
        return Either.isRight(language) ? [language.right] : [];
      });
    }),
  );
}

function expertiseGrantChoiceHole(
  sourceUnitId: UnitRecord["id"],
  count: number,
  skills: GrantExpertiseSkillSource,
  ownedSkillProficiencies: readonly Skill[],
  ownedSkillExpertise: readonly Skill[],
): readonly ChoiceCreationHole[] {
  const options = eligibleExpertiseSkills(
    skills,
    ownedSkillProficiencies,
    ownedSkillExpertise,
  ).map(skillOption);
  const cardinality = exactChoiceCardinality(count);
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, CLASS_FEATURE_PROFICIENCY_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  return hole === undefined ? [] : [hole];
}

export function eligibleExpertiseSkills(
  skills: GrantExpertiseSkillSource,
  ownedSkillProficiencies: readonly Skill[],
  ownedSkillExpertise: readonly Skill[] = [],
): readonly Skill[] {
  const uniqueOwnedExpertise = uniqueSkills(ownedSkillExpertise);
  const uniqueOwnedSkills = uniqueSkills(ownedSkillProficiencies).filter(
    (skill) => !uniqueOwnedExpertise.includes(skill),
  );
  return Match.value(skills).pipe(
    Match.when(
      { kind: "owned_skill_proficiencies_without_expertise" },
      () => uniqueOwnedSkills,
    ),
    Match.when(
      { kind: "listed_owned_skill_proficiencies_without_expertise" },
      (listed) =>
        uniqueOwnedSkills.filter((skill) => listed.skills.includes(skill)),
    ),
    Match.exhaustive,
  );
}

function draftOwnedSkillExpertise(
  draft: CharacterDraft,
  expertiseChoiceSourceUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Skill[] {
  return skillExpertiseFromChoiceSelections(
    draft.selections.choices,
    unitLibrary,
    (selection) =>
      selection.kind === "unitChoice" &&
      selection.source.unitId === expertiseChoiceSourceUnitId &&
      selection.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  );
}

export function skillExpertiseFromChoiceSelections(
  choices: readonly CharacterChoiceSelection[],
  unitLibrary: UnitCatalog,
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = () => false,
): readonly Skill[] {
  return uniqueSkills(
    choices.flatMap((selection) => {
      if (shouldIgnoreSelection(selection)) {
        return [];
      }
      if (
        grantExpertiseSkillSourceForSelection(selection, unitLibrary) ===
        undefined
      ) {
        return [];
      }

      return selection.options.flatMap((option) => {
        const skill = skillFromChoiceOptionId(option.optionId);
        return skill === undefined ? [] : [skill];
      });
    }),
  );
}

export function grantExpertiseSkillSourceForSelection(
  selection: CharacterChoiceSelection,
  unitLibrary: UnitCatalog,
): GrantExpertiseSkillSource | undefined {
  if (selection.kind !== "unitChoice") {
    return undefined;
  }
  const feature = unitLibrary.getUnit(selection.source.unitId);
  if (
    Option.isNone(feature) ||
    feature.value.kind !== "class_feature" ||
    feature.value.mechanics.family !== "passive"
  ) {
    return undefined;
  }

  const grant = feature.value.mechanics.grants.find(
    (candidate): candidate is GrantExpertiseEffect =>
      candidate.kind === "grant_expertise",
  );
  return grant?.skills;
}

function skillFromChoiceOptionId(
  optionId: CreationChoiceOptionId,
): Skill | undefined {
  return SKILLS.find((candidate) => candidate === optionId);
}

function draftOwnedSkillProficiencies(
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = () => false,
): readonly Skill[] {
  const backgroundSkills =
    draft.selections.background == null
      ? []
      : backgroundSkillProficiencies(draft.selections.background, unitLibrary);
  const selectedSkills = skillProficienciesFromChoiceSelections(
    draft.selections.choices,
    (selection) =>
      shouldIgnoreSelection(selection) ||
      (selection.kind === "unitChoice" &&
        grantExpertiseSkillSourceForSelection(selection, unitLibrary) !==
          undefined),
  );

  return uniqueSkills([...backgroundSkills, ...selectedSkills]);
}

export function skillProficienciesFromChoiceSelections(
  choices: readonly CharacterChoiceSelection[],
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = () => false,
): readonly Skill[] {
  return uniqueSkills(
    choices.flatMap((selection) =>
      shouldIgnoreSelection(selection)
        ? []
        : skillProficienciesFromChoiceSelection(selection),
    ),
  );
}

function skillProficienciesFromChoiceSelection(
  selection: CharacterChoiceSelection,
): readonly Skill[] {
  return selection.kind === "unitChoice"
    ? selection.options.flatMap((option) => {
        const skill = SKILLS.find((candidate) => candidate === option.optionId);
        return skill == null ? [] : [skill];
      })
    : [];
}

function backgroundSkillProficiencies(
  backgroundUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Skill[] {
  const backgroundUnit = unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  return facts.tag === "readable" ? facts.value.skillProficiencies : [];
}

function uniqueSkills(skills: readonly Skill[]): readonly Skill[] {
  return skills.filter((skill, index) => skills.indexOf(skill) === index);
}

function uniqueLanguages(languages: readonly Language[]): readonly Language[] {
  return [...new Set(languages)];
}

function requireClassFeature(
  unitLibrary: UnitCatalog,
  featureUnitId: UnitRecord["id"],
): ClassFeatureRecord | undefined {
  const feature = unitLibrary.getUnit(featureUnitId);
  if (Option.isNone(feature) || feature.value.kind !== "class_feature") {
    return undefined;
  }

  return feature.value;
}

function featGrantFeatureHoleSource(
  featureUnitId: UnitRecord["id"],
  grant: Extract<EffectAtom, { readonly kind: "grant_feat" }>,
  unitLibrary: UnitCatalog,
): ChoiceCreationHole | undefined {
  const categories = "category" in grant ? [grant.category] : grant.categories;
  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is FeatRecord =>
        unit.kind === "feat" && categories.includes(unit.category),
    )
    .map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, CLASS_FEATURE_FEAT_CHOICE_KEY),
      cardinality: EXACTLY_ONE_CHOICE,
      options,
    }),
  );
}

function proficiencyGrantChoiceHoles(
  sourceUnitId: UnitRecord["id"],
  proficiency: ProficiencyGrant,
  ownedSkillProficiencies: readonly Skill[] = [],
): readonly ChoiceCreationHole[] {
  if (proficiency.kind === "choice") {
    return proficiencyGrantChoiceHole(
      sourceUnitId,
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
      proficiency.count,
      proficiency.options,
      ownedSkillProficiencies,
    );
  }
  if (proficiency.kind === "mixed") {
    return proficiencyGrantChoiceHole(
      sourceUnitId,
      proficiency.choice.choiceKey,
      proficiency.choice.count,
      proficiency.choice.options,
      ownedSkillProficiencies,
    );
  }
  if (proficiency.kind === "mixed_choices") {
    return proficiency.choices.flatMap((choice) =>
      proficiencyGrantChoiceHole(
        sourceUnitId,
        choice.choiceKey,
        choice.count,
        choice.options,
        ownedSkillProficiencies,
      ),
    );
  }

  return [];
}

function proficiencyGrantChoiceHole(
  sourceUnitId: UnitRecord["id"],
  choiceKeyText: string,
  count: number,
  subjects: readonly ProficiencyGrantSubject[],
  ownedSkillProficiencies: readonly Skill[],
): readonly ChoiceCreationHole[] {
  const choiceKey = unitChoiceKey(choiceKeyText);
  if (Either.isLeft(choiceKey)) {
    return [];
  }
  const ownedSkills = uniqueSkills(ownedSkillProficiencies);
  const options = subjects.flatMap((subject) =>
    subject.kind === "skill" && ownedSkills.includes(subject.skill)
      ? []
      : proficiencyGrantSubjectOptions(subject),
  );
  const cardinality = exactChoiceCardinality(count);
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return [];
  }

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, choiceKey.right),
      cardinality,
      options,
    }),
  );
  return hole === undefined ? [] : [hole];
}

export function abilityScoreIncreaseOptions(
  feat: FeatRecord & {
    readonly abilityScoreIncreaseChoice: NonNullable<
      FeatRecord["abilityScoreIncreaseChoice"]
    >;
  },
): readonly CreationChoiceOption[] {
  return abilityScoreIncreaseChoiceOptions(feat.abilityScoreIncreaseChoice);
}

export function selectedFeatAbilityScoreIncreaseOptions(
  unit: UnitRecord,
): readonly CreationChoiceOption[] {
  return unit.kind === "feat" && unit.abilityScoreIncreaseChoice != null
    ? abilityScoreIncreaseChoiceOptions(unit.abilityScoreIncreaseChoice)
    : [];
}

function weaponMasteryFeatureHoleSource(
  feature: WeaponMasteryChoiceFeature,
  unitLibrary: UnitCatalog,
): ChoiceCreationHole | undefined {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: feature.id,
    unitLibrary,
  });
  if (profile === undefined) {
    return undefined;
  }

  const options = profile.eligibleWeapons.map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(feature.id, WEAPON_MASTERY_OPTIONS_CHOICE_KEY),
      cardinality: exactChoiceCardinality(profile.choiceCount),
      options,
    }),
  );
}

function requireChoiceCreationHole(
  hole: CreationHole | undefined,
): ChoiceCreationHole | undefined {
  if (hole?.kind !== "choice") {
    return undefined;
  }

  return hole;
}

export function draftHole(
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
  unitLibrary: UnitCatalog,
  _draft?: CharacterDraft,
): CreationHole | undefined {
  if (path === "draft.progression.initial") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "class")
        .flatMap((unit) => progressionOptionsForClassUnit(unit)),
    });
  }

  if (path === "draft.background") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "background")
        .map(unitOption),
    });
  }

  if (path === "draft.species") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "species")
        .map(unitOption),
    });
  }

  if (path === "draft.speciesSize") {
    const speciesId = _draft?.selections.species;
    if (speciesId === undefined) {
      return undefined;
    }
    const unit = unitLibrary.getUnit(speciesId);
    if (Option.isNone(unit)) {
      return undefined;
    }
    const facts = readSpeciesCreationFacts(unit.value);
    if (facts.tag !== "readable" || facts.value.size.kind !== "choice") {
      return undefined;
    }

    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: facts.value.size.options.map(speciesSizeOption),
    });
  }

  if (path === "draft.abilityScoreGeneration") {
    return {
      kind: "abilityScores",
      holeId: creationHoleId(`cc:draft:${path}`),
      source: draftSource(path),
      methods: SUPPORTED_ABILITY_SCORE_METHODS,
    };
  }

  if (path === "draft.languages") {
    return choiceHole({
      source: draftSource(path),
      cardinality: exactChoiceCardinality(2),
      options: STANDARD_LANGUAGES.filter(
        (language): language is SelectableStandardLanguage =>
          language !== "Common",
      ).map((language) => ({
        optionId: creationChoiceOptionId(language),
        label: language,
      })),
    });
  }

  const alignmentPath: "draft.alignment" = path;
  return choiceHole({
    source: draftSource(alignmentPath),
    cardinality: EXACTLY_ONE_CHOICE,
    options: ALIGNMENT_CHOICES.map((alignment) => ({
      optionId: creationChoiceOptionId(alignmentOptionId(alignment)),
      label: alignmentLabel(alignment),
    })),
  });
}

function speciesSizeOption(size: Extract<Size, "medium" | "small">) {
  return {
    optionId: creationChoiceOptionId(size),
    label: size === "medium" ? "Medium" : "Small",
  };
}

function progressionOptionsForClassUnit(
  unit: UnitRecord,
): readonly CreationChoiceOption[] {
  const optionsById = new Map<CreationChoiceOptionId, CreationChoiceOption>();
  for (const progression of [
    ...levelOneProgressionForClassUnit(unit.id),
    ...supportedProgressionsForClass(unit.id),
  ]) {
    const optionId = progressionOptionId(progression);
    optionsById.set(optionId, {
      optionId,
      label: `${unit.name} ${computeTotalLevel(progression)} (${hitPointRuleLabel(finalAdvancementEntry(progression)?.hitPointRule ?? { tag: "levelOneMaximumHitDie" })})`,
      unitRef: { unitId: unit.id },
    });
  }

  return [...optionsById.values()];
}

function levelOneProgressionForClassUnit(
  unitId: UnitRecord["id"],
): readonly CharacterProgression[] {
  return [{ startingClass: classUnitId(unitId), advancements: [] }];
}
