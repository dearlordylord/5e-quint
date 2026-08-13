// KERNEL-COVERAGE: runtime-owner CREATION.CHOICE_DISCOVERY_CARDINALITY CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.wizard-spellbook-learning-choice unit-feature.hunters-prey character-creation.origin-feat-proficiency-choice character-creation.species-trait-proficiency-choice character-creation.species-origin-feat-choice character-creation.species-origin-feat-proficiency-choice character-creation.species-lineage-choice
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
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
  allCantripsFromClassSpellList,
  classSpellListForClassName,
  type ClassSpellListName,
} from "@dnd/surface/surface/unit-catalog";
import { SKILLS } from "@dnd/surface/surface/types";
import type {
  BackgroundToolProficiency,
  ClassFeatureRecord,
  DragonbornSpeciesRecord,
  EffectAtom,
  FeatRecord,
  FeatureChoiceMechanics,
  GnomishLineageMechanics,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  Skill,
  StartingEquipmentChoice,
  Size,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  proficiencyGrantSubjectOptions,
  toolProficiencyIdsFromDirectToolOptionIds,
  toolProficiencyIdsFromProficiencyChoiceOptionIds,
  toolProficiencyIdsFromSubjects,
} from "./choice-option-codecs.ts";
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
  GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
  ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
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
  type ToolProficiencyId,
  type UnitCatalog,
  type UnitChoiceKey,
} from "./types.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  supportedBackgroundUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  isSupportedProgression,
  supportedLoadoutChoices,
  supportedProgressionsForClass,
  supportedPurchasableEquipmentUnitIdsForClass,
  speciesUnitIdsWithSupportedTraitChoices,
  unsupportedHoleSelectionOptionId,
  type CharacterCreationSupportProfile,
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
  weaponMasteryChoiceProfileForClassLevel,
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

export const doNotIgnoreSelection: (
  selection: CharacterChoiceSelection,
) => boolean = () => false;

export function discoverCreationHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile?: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  const discoveryInput = {
    ...input,
    supportProfile: input.supportProfile ?? CHARACTER_CREATION_SUPPORT_PROFILE,
  };
  return [
    ...discoverInitialDraftHoles(discoveryInput),
    ...discoverClassGrantedHoles(discoveryInput),
    ...discoverBackgroundGrantedHoles(discoveryInput),
    ...discoverBackgroundOriginFeatGrantHoles(discoveryInput),
    ...discoverSpeciesGrantedHoles(discoveryInput),
    ...discoverEquipmentHoles(discoveryInput),
  ];
}
export function discoverInitialDraftHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  return INITIAL_CHARACTER_DRAFT_PATHS.flatMap((path) => {
    if (hasDraftSelection(input.draft.selections, path)) {
      return [];
    }
    const hole = draftHole(
      path,
      input.unitLibrary,
      input.draft,
      input.supportProfile,
    );
    return hole === undefined ? [] : [hole];
  });
}

export function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  const progression = input.draft.selections.progression;
  if (
    progression == null ||
    !isSupportedProgression(progression, input.supportProfile)
  ) {
    return [];
  }
  const startingUnitId = startingClassUnitId(progression);
  const classUnitId = startingUnitId;
  const classUnit = input.unitLibrary.getUnit(classUnitId);
  /* v8 ignore start -- Supported progression admission resolves its starting class from this same catalog and parses its class facts. */
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  const classLevel = classLevelForUnit(progression, classUnitId);
  if (facts.tag !== "readable") {
    return [];
  }
  /* v8 ignore stop */

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
      input.supportProfile,
    ),
    ...classToolProficiencyChoiceHoles(
      input.draft,
      classUnitId,
      facts.value,
      input.supportProfile,
    ),
    ...discoverClassFeatureGrantHolesInLevelOrder(
      facts.value.featureGrants,
      classLevel,
      input.draft,
      input.unitLibrary,
      !hasUnitChoiceSelection(
        input.draft,
        classUnitId,
        CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
      ),
      input.supportProfile,
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
    }).flatMap((hole) =>
      unselectedUnitChoiceHole(input.draft, hole, input.supportProfile),
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
      input.supportProfile,
    ),
    ...discoverClassSpellcastingHoles(
      classUnitId,
      classLevel,
      facts.value,
      input.draft,
      input.supportProfile,
    ),
    ...progressionClassUnitIds(progression).flatMap((progressionClassUnitId) =>
      progressionClassUnitId === startingUnitId
        ? []
        : discoverAdditionalClassGrantedHoles(
            progressionClassUnitId,
            classLevelForUnit(progression, progressionClassUnitId),
            input.draft,
            input.unitLibrary,
            input.supportProfile,
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
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationHole[] {
  return classSpellcastingChoiceHoles(classUnitId, facts, classLevel).flatMap(
    (hole) => unselectedUnitChoiceHole(draft, hole, supportProfile),
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
                unitRef: { unitId: authoredUnitId(spellId) },
              })),
            }),
          ]),
      choiceHole({
        source: unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: preparedSpells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: authoredUnitId(spell.spellId) },
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
          unitRef: { unitId: authoredUnitId(spellId) },
        })),
      }),
      choiceHole({
        source: unitSource(classUnitId, CLASS_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: preparedSpells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: authoredUnitId(spell.spellId) },
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
        unitRef: { unitId: authoredUnitId(spellId) },
      })),
    }),
    choiceHole({
      source: unitSource(classUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
      cardinality: exactChoiceCardinality(spellcasting.spellbookAccess.choose),
      options: wizardSpellbookSpells.map((spell) => ({
        optionId: creationChoiceOptionId(spell.spellId),
        label: spell.spellId,
        unitRef: { unitId: authoredUnitId(spell.spellId) },
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
          unitRef: { unitId: authoredUnitId(spellId) },
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
  /* v8 ignore start -- Supported Pact Magic creation rows always expose at least one Pact Slot. */
  if (spellcasting.pactSlotProjection.count <= 0) {
    return [];
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Callers pass only optional results from choice-hole factories to this narrowing helper. */
  return holes.flatMap((hole) => (hole?.kind === "choice" ? [hole] : []));
  /* v8 ignore stop */
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
    readonly supportProfile: CharacterCreationSupportProfile;
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
            /* v8 ignore start -- Supported subclass choice facts reference installed subclass Units in this catalog. */
            return Option.isSome(unit) ? [unitOption(unit.value)] : [];
            /* v8 ignore stop */
          }),
        }),
        input.supportProfile,
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
    readonly supportProfile: CharacterCreationSupportProfile;
  },
): readonly CreationHole[] {
  const selectedSubclassIds = input.draft.selections.choices.flatMap(
    (choice) =>
      choice.kind === "unitChoice" &&
      choice.source.unitId === classUnitId &&
      choice.source.choiceKey === CLASS_SUBCLASS_CHOICE_KEY
        ? choice.options.flatMap(
            (option) =>
              /* v8 ignore start -- Supported subclass selections retain Unit references on every option. */
              option.unitRef == null ? [] : [option.unitRef.unitId],
            /* v8 ignore stop */
          )
        : [],
  );

  return selectedSubclassIds.flatMap((subclassId) => {
    const subclass = input.unitLibrary.getUnit(subclassId);
    /* v8 ignore start -- Supported subclass selections retain an installed subclass owned by the selected class. */
    if (
      Option.isNone(subclass) ||
      subclass.value.kind !== "subclass" ||
      subclass.value.className !== facts.className
    ) {
      return [];
    }
    /* v8 ignore stop */

    return subclass.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(
            grant.unitId,
            classLevel,
            input.draft,
            input.unitLibrary,
            { supportProfile: input.supportProfile },
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
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationHole[] {
  const classUnit = unitLibrary.getUnit(classUnitId);
  /* v8 ignore start -- This helper receives class ids from an admitted progression in the same catalog. */
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }
  /* v8 ignore stop */

  return [
    ...discoverClassFeatureGrantHolesInLevelOrder(
      facts.value.featureGrants,
      classLevel,
      draft,
      unitLibrary,
      false,
      supportProfile,
    ),
    ...proficiencyGrantChoiceHoles(
      classUnitId,
      facts.value.multiclassProficiencies,
    ).flatMap((hole) => unselectedUnitChoiceHole(draft, hole, supportProfile)),
    ...selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: draft.selections.choices,
      classUnitId,
      classFacts: facts.value,
      classLevel,
      unitLibrary,
    }).flatMap((hole) => unselectedUnitChoiceHole(draft, hole, supportProfile)),
  ];
}

function discoverClassFeatureGrantHolesInLevelOrder(
  featureGrants: ReadableClassCreationFacts["featureGrants"],
  classLevel: number,
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
  deferOwnedSkillExpertiseChoices: boolean,
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationHole[] {
  const holes: CreationHole[] = [];
  let deferLaterOwnedSkillExpertiseChoices = deferOwnedSkillExpertiseChoices;

  for (const grant of featureGrants) {
    if (grant.level > classLevel) {
      continue;
    }

    holes.push(
      ...discoverClassFeatureGrantHoles(
        grant.unitId,
        classLevel,
        draft,
        unitLibrary,
        {
          deferOwnedSkillExpertiseChoices: deferLaterOwnedSkillExpertiseChoices,
          supportProfile,
        },
      ),
    );

    if (
      classFeatureHasOwnedSkillExpertiseChoice(grant.unitId, unitLibrary) &&
      !hasUnitChoiceSelection(
        draft,
        grant.unitId,
        CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
      )
    ) {
      deferLaterOwnedSkillExpertiseChoices = true;
    }
  }

  return holes;
}

function classFeatureHasOwnedSkillExpertiseChoice(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): boolean {
  const feature = requireClassFeature(unitLibrary, featureUnitId);
  if (feature === undefined || feature.mechanics.family !== "passive") {
    return false;
  }

  return feature.mechanics.grants.some(
    (grant) =>
      grant.kind === "grant_expertise" &&
      grant.skills.kind === "owned_skill_proficiencies_without_expertise",
  );
}

function hasUnitChoiceSelection(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): boolean {
  return draft.selections.choices.some(
    (selection) =>
      selection.kind === "unitChoice" &&
      selection.source.unitId === unitId &&
      selection.source.choiceKey === choiceKey,
  );
}

type GrantSpellAccessChoice = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access_choice" }
>;
type ClassFeatureAcquisitionCantripGrantSpellList = ClassSpellListName;

function classFeatureAcquisitionCantripGrantSpellList(
  unitLibrary: UnitCatalog,
  spellList: GrantSpellAccessChoice["spellList"],
): ClassFeatureAcquisitionCantripGrantSpellList | undefined {
  /* v8 ignore start -- Supported acquisition cantrip grants name an installed class spell list. */
  return isClassFeatureAcquisitionCantripGrantSpellList(unitLibrary, spellList)
    ? spellList
    : undefined;
  /* v8 ignore stop */
}

function isClassFeatureAcquisitionCantripGrantSpellList(
  unitLibrary: UnitCatalog,
  spellList: GrantSpellAccessChoice["spellList"],
): spellList is ClassFeatureAcquisitionCantripGrantSpellList {
  return (
    classSpellListForClassName({ className: spellList, unitLibrary }) !==
    undefined
  );
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
            /* v8 ignore start -- The admitted acquisition feat grant produces a well-formed feat choice hole. */
            return hole === undefined ? [] : [hole];
            /* v8 ignore stop */
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
          /* v8 ignore start -- Supported acquisition cantrip grants have list-prepared class spellcasting, a positive feasible count, and an installed class spell list. */
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
            input.unitLibrary,
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
                allCantripsFromClassSpellList({
                  className: grantedSpellList,
                  spellIds: [unit.id],
                  unitLibrary: input.unitLibrary,
                }) &&
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
          /* v8 ignore stop */

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
          /* v8 ignore start -- The admitted acquisition spell grant produces a well-formed cantrip choice hole. */
          return hole === undefined ? [] : [hole];
          /* v8 ignore stop */
        }),
      );
  });
}

function discoverSelectedFeatAbilityScoreIncreaseHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
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
      /* v8 ignore start -- Supported feat selections retain an installed feat Unit reference from this catalog. */
      if (Option.isNone(unit)) return [];
      /* v8 ignore stop */
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
        input.supportProfile,
      );
    });
  });
}

export function discoverBackgroundGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(
      backgroundUnitId,
      supportedBackgroundUnitIds(input.supportProfile),
    )
  ) {
    return [];
  }

  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  /* v8 ignore start -- Supported background admission resolves this selected id and parses its facts in the same catalog. */
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }
  /* v8 ignore stop */

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
      input.supportProfile,
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
      input.supportProfile,
    ),
  ];
}

function discoverBackgroundOriginFeatGrantHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(
      backgroundUnitId,
      supportedBackgroundUnitIds(input.supportProfile),
    )
  ) {
    return [];
  }

  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  /* v8 ignore start -- Supported origin-feat discovery resolves this admitted background and parses its facts in the same catalog. */
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }
  /* v8 ignore stop */

  return originFeatGrantChoiceHoles(
    facts.value.originFeatId,
    input.unitLibrary,
    {
      ownedSkillProficiencies: draftOwnedSkillProficiencies(
        input.draft,
        input.unitLibrary,
        (selection) =>
          selection.kind === "unitChoice" &&
          selection.source.unitId === facts.value.originFeatId &&
          selection.source.choiceKey === ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      ),
      ownedToolProficiencies: draftOwnedToolProficiencies(
        input.draft,
        input.unitLibrary,
        (selection) =>
          selection.kind === "unitChoice" &&
          selection.source.unitId === facts.value.originFeatId &&
          selection.source.choiceKey === ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      ),
    },
  ).flatMap((hole) =>
    unselectedUnitChoiceHole(input.draft, hole, input.supportProfile),
  );
}

function discoverSpeciesGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  return [
    ...speciesTraitGrantChoiceHoles(input).flatMap((hole) =>
      unselectedUnitChoiceHole(input.draft, hole, input.supportProfile),
    ),
    ...speciesSelectedOriginFeatGrantChoiceHoles(input).flatMap((hole) =>
      unselectedUnitChoiceHole(input.draft, hole, input.supportProfile),
    ),
  ];
}

function speciesTraitGrantChoiceHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly ChoiceCreationHole[] {
  return selectedSpeciesTraitUnits(input).flatMap((trait) => {
    if (trait.mechanics.family === "species_lineage_choice") {
      return speciesLineageChoiceHoles(trait.id, trait.mechanics);
    }

    if (trait.mechanics.family !== "passive") {
      return [];
    }

    return trait.mechanics.grants.flatMap((grant) =>
      passiveGrantChoiceHoles(trait.id, grant, input.unitLibrary, {
        ownedSkillProficiencies: draftOwnedSkillProficiencies(
          input.draft,
          input.unitLibrary,
          (selection) =>
            selection.kind === "unitChoice" &&
            selection.source.unitId === trait.id &&
            selection.source.choiceKey === SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
        ),
        ownedToolProficiencies: draftOwnedToolProficiencies(
          input.draft,
          input.unitLibrary,
        ),
        proficiencyChoiceKey: SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
        featChoiceKey: SPECIES_ORIGIN_FEAT_CHOICE_KEY,
      }),
    );
  });
}

export function speciesLineageChoiceHoles(
  traitUnitId: UnitRecord["id"],
  mechanics: GnomishLineageMechanics,
): readonly ChoiceCreationHole[] {
  return [
    choiceHole({
      source: unitSource(traitUnitId, mechanics.choiceKey),
      cardinality: EXACTLY_ONE_CHOICE,
      options: mechanics.options.map((option) => ({
        optionId: creationChoiceOptionId(option.id),
        label: option.displayName,
      })),
    }),
    choiceHole({
      source: unitSource(
        traitUnitId,
        GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
      ),
      cardinality: EXACTLY_ONE_CHOICE,
      options: mechanics.spellcastingAbilityChoice.abilities.map((ability) => ({
        optionId: creationChoiceOptionId(ability),
        label: ability.toUpperCase(),
      })),
    }),
  ].filter(isChoiceCreationHole);
}

function isChoiceCreationHole(
  hole: CreationHole | undefined,
): hole is ChoiceCreationHole {
  return hole?.kind === "choice";
}

function speciesSelectedOriginFeatGrantChoiceHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly ChoiceCreationHole[] {
  return selectedSpeciesOriginFeatUnitIds(input.draft).flatMap((featUnitId) =>
    originFeatGrantChoiceHoles(featUnitId, input.unitLibrary, {
      ownedSkillProficiencies: draftOwnedSkillProficiencies(
        input.draft,
        input.unitLibrary,
        (selection) =>
          selection.kind === "unitChoice" &&
          selection.source.unitId === featUnitId &&
          selection.source.choiceKey ===
            SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      ),
      ownedToolProficiencies: draftOwnedToolProficiencies(
        input.draft,
        input.unitLibrary,
        (selection) =>
          selection.kind === "unitChoice" &&
          selection.source.unitId === featUnitId &&
          selection.source.choiceKey ===
            SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      ),
      proficiencyChoiceKey: SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
    }),
  );
}

function selectedSpeciesTraitUnits(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly Extract<UnitRecord, { readonly kind: "species_trait" }>[] {
  const speciesUnitId = input.draft.selections.species;
  if (
    speciesUnitId == null ||
    !isSupported(speciesUnitId, speciesUnitIdsWithSupportedTraitChoices())
  ) {
    return [];
  }

  const speciesUnit = input.unitLibrary.getUnit(speciesUnitId);
  /* v8 ignore start -- Species-trait discovery runs only for an admitted species id with readable facts in this catalog. */
  if (Option.isNone(speciesUnit)) {
    return [];
  }
  const facts = readSpeciesCreationFacts(speciesUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }
  /* v8 ignore stop */

  return Object.values(facts.value.traits).flatMap((traitUnitId) => {
    const traitUnit = input.unitLibrary.getUnit(traitUnitId);
    /* v8 ignore start -- Admitted species facts reference installed species-trait Units in the same catalog. */
    return Option.isSome(traitUnit) && traitUnit.value.kind === "species_trait"
      ? [traitUnit.value]
      : [];
    /* v8 ignore stop */
  });
}

function selectedSpeciesOriginFeatUnitIds(
  draft: CharacterDraft,
): readonly UnitRecord["id"][] {
  return uniqueUnitIds(
    draft.selections.choices.flatMap((selection) =>
      selection.kind === "unitChoice" &&
      selection.source.choiceKey === SPECIES_ORIGIN_FEAT_CHOICE_KEY
        ? selection.options.flatMap(
            (option) =>
              /* v8 ignore start -- Supported species Origin feat selections retain Unit references on every option. */
              option.unitRef == null ? [] : [option.unitRef.unitId],
            /* v8 ignore stop */
          )
        : [],
    ),
  );
}

export function backgroundToolChoiceHole(
  draft: CharacterDraft,
  source: ChoiceCreationHoleSource,
  proficiency: BackgroundToolProficiency,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
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
        supportProfile,
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
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly CreationHole[] {
  const classUnitId =
    input.draft.selections.progression == null
      ? undefined
      : startingClassUnitId(input.draft.selections.progression);
  if (classUnitId == null) {
    return [];
  }
  const purchaseHole = choiceHole({
    source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
    cardinality: boundedChoiceCardinality({
      min: 1,
      max: supportedEquipmentPurchaseChoiceCount(input.supportProfile),
    }),
    options: supportedPurchasableEquipmentUnitIdsForClass(
      classUnitId,
      input.supportProfile,
    ).flatMap((unitId) => {
      const unit = input.unitLibrary.getUnit(unitId);
      /* v8 ignore start -- Supported purchasable equipment ids resolve to installed Units in this catalog. */
      return Option.isSome(unit) ? [unitOption(unit.value)] : [];
      /* v8 ignore stop */
    }),
  });
  const hasValidPurchaseSelection = hasValidEquipmentPurchaseSelectionForHole(
    input.draft,
    purchaseHole,
    input.supportProfile,
  );
  const loadoutEquipmentUnitIds = new Set([
    ...(hasValidPurchaseSelection
      ? (input.draft.selections.equipment?.selectedUnitIds ?? [])
      : []),
    ...selectedStartingEquipmentUnitIdsForDraft(input),
  ]);

  return [
    ...(hasSupportedCoinEquipmentPath(input)
      ? unselectedPurchaseHole(input.draft, purchaseHole, input.supportProfile)
      : []),
    ...supportedLoadoutChoices(input.supportProfile).flatMap((loadoutChoice) =>
      loadoutEquipmentUnitIds.has(loadoutChoice.unitId)
        ? unselectedLoadoutHole(
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
            true,
          )
        : [],
    ),
  ];
}

function selectedStartingEquipmentUnitIdsForDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): readonly UnitRecord["id"][] {
  const progression = input.draft.selections.progression;
  const classUnitId =
    progression == null ? undefined : startingClassUnitId(progression);
  const backgroundUnitId = input.draft.selections.background;
  const classUnit =
    classUnitId == null
      ? Option.none()
      : input.unitLibrary.getUnit(classUnitId);
  const backgroundUnit =
    backgroundUnitId == null
      ? Option.none()
      : input.unitLibrary.getUnit(backgroundUnitId);
  const classFacts = Option.isSome(classUnit)
    ? readClassCreationFacts(classUnit.value)
    : undefined;
  const backgroundFacts = Option.isSome(backgroundUnit)
    ? readBackgroundCreationFacts(backgroundUnit.value)
    : undefined;

  return [
    ...(classUnitId != null && classFacts?.tag === "readable"
      ? startingEquipmentUnitIds(
          selectedStartingEquipmentChoice(
            input.draft,
            startingEquipmentChoiceHole(
              unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
              classFacts.value.startingEquipment,
            ),
            classFacts.value.startingEquipment,
            input.supportProfile,
          ),
        )
      : []),
    ...(backgroundUnitId != null && backgroundFacts?.tag === "readable"
      ? startingEquipmentUnitIds(
          selectedStartingEquipmentChoice(
            input.draft,
            startingEquipmentChoiceHole(
              unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
              backgroundFacts.value.startingEquipment,
            ),
            backgroundFacts.value.startingEquipment,
            input.supportProfile,
          ),
        )
      : []),
  ];
}

export function startingEquipmentUnitIds(
  choice: StartingEquipmentChoice | undefined,
): readonly UnitRecord["id"][] {
  return choice?.kind === "item_bundle"
    ? choice.items.flatMap((item) =>
        item.kind === "unit_ref" ||
        item.kind === "unit_ref_with_spellcasting_focus"
          ? [authoredUnitId(item.unitId)]
          : [],
      )
    : [];
}

function classToolProficiencyChoiceHoles(
  draft: CharacterDraft,
  classUnitId: UnitRecord["id"],
  facts: ReadableClassCreationFacts,
  supportProfile: CharacterCreationSupportProfile,
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
    supportProfile,
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
  readonly supportProfile: CharacterCreationSupportProfile;
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
    !isSupportedProgression(progression, input.supportProfile) ||
    !isSupported(
      backgroundUnitId,
      supportedBackgroundUnitIds(input.supportProfile),
    )
  ) {
    return false;
  }

  const classUnit = input.unitLibrary.getUnit(classUnitId);
  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  /* v8 ignore start -- Supported coin-path admission resolves both selected Units and parses their creation facts in this catalog. */
  if (Option.isNone(classUnit) || Option.isNone(backgroundUnit)) {
    return false;
  }
  const classFacts = readClassCreationFacts(classUnit.value);
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (classFacts.tag !== "readable" || backgroundFacts.tag !== "readable") {
    return false;
  }
  /* v8 ignore stop */

  return (
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        classFacts.value.startingEquipment,
      ),
      classFacts.value.startingEquipment,
      input.supportProfile,
    ) != null &&
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        backgroundFacts.value.startingEquipment,
      ),
      backgroundFacts.value.startingEquipment,
      input.supportProfile,
    ) != null
  );
}

export function selectedCoinGrantStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): StartingEquipmentChoice | undefined {
  const selectedChoice = selectedStartingEquipmentChoice(
    draft,
    hole,
    choices,
    supportProfile,
  );
  return selectedChoice?.kind === "coin_grant" ? selectedChoice : undefined;
}

export function selectedStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): StartingEquipmentChoice | undefined {
  if (hole === undefined) {
    return undefined;
  }
  const selection = draft.selections.choices.find((candidate) =>
    choiceSelectionMatchesHole(candidate, hole, supportProfile),
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
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidSelectionForHole(draft, hole, supportProfile) ? [] : [hole];
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
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidEquipmentPurchaseSelectionForHole(draft, hole, supportProfile)
    ? []
    : [hole];
}

export function unselectedLoadoutHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  isOwned: boolean,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  if (hole.source.tag !== "loadout") {
    return [];
  }
  return isOwned && !hasValidLoadoutSlotSelectionForHole(draft, hole)
    ? [hole]
    : [];
}

function hasValidLoadoutSlotSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  /* v8 ignore start -- This helper is called only after narrowing a loadout-sourced hole. */
  if (hole.source.tag !== "loadout") {
    return false;
  }
  /* v8 ignore stop */

  const slot = hole.source.slot;
  return draft.selections.choices.some(
    (selection) =>
      selection.kind === "loadout" && selection.source.slot === slot,
  );
}

export function hasValidEquipmentPurchaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  if (draft.selections.equipment == null || hole === undefined) {
    return false;
  }

  return choiceOptionIdsFitHole(
    hole,
    draft.selections.equipment.selectedUnitIds.map((unitId) =>
      creationChoiceOptionId(unitId),
    ),
    supportProfile,
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
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  return draft.selections.choices.some((selection) =>
    choiceSelectionMatchesHole(selection, hole, supportProfile),
  );
}

export function choiceSelectionMatchesHole(
  selection: CharacterChoiceSelection,
  hole: CreationHole,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): boolean {
  if (
    hole.kind !== "choice" ||
    !sameCreationHoleSource(selection.source, hole.source)
  ) {
    return false;
  }

  const optionIds = choiceSelectionOptionIds(selection);
  return (
    choiceOptionIdsFitHole(hole, optionIds, supportProfile) &&
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
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
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
    unsupportedHoleSelectionOptionId(hole, optionIds, supportProfile) == null
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
  input: {
    readonly deferOwnedSkillExpertiseChoices?: boolean;
    readonly supportProfile: CharacterCreationSupportProfile;
  },
): readonly CreationHole[] {
  return classFeatureGrantChoiceHoles(featureUnitId, unitLibrary, {
    classLevel,
    deferOwnedSkillExpertiseChoices:
      input.deferOwnedSkillExpertiseChoices ?? false,
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
  }).flatMap((hole) =>
    unselectedUnitChoiceHole(draft, hole, input.supportProfile),
  );
}

export function classFeatureGrantChoiceHoles(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
  input: {
    readonly classLevel?: number;
    readonly deferOwnedSkillExpertiseChoices?: boolean;
    readonly ownedSkillExpertise?: readonly Skill[];
    readonly ownedSkillProficiencies?: readonly Skill[];
    readonly ownedToolProficiencies?: readonly ToolProficiencyId[];
    readonly knownLanguages?: readonly Language[];
  } = {},
): readonly ChoiceCreationHole[] {
  const feature = requireClassFeature(unitLibrary, featureUnitId);
  /* v8 ignore start -- Admitted class feature grants reference an installed class-feature Unit. */
  if (feature === undefined) {
    return [];
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- Supported acquisition-choice mechanics carry a canonical nonempty choice key and produce a choice hole. */
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
    /* v8 ignore stop */
  }

  if (mechanics.family === "feature_choice") {
    return eldritchInvocationChoiceHoles(featureUnitId, mechanics, input);
  }

  if (mechanics.family === "metamagic_options") {
    return sorcererMetamagicChoiceHoles(featureUnitId, mechanics, input);
  }

  if (mechanics.family === "hunters_prey") {
    const choiceKey = unitChoiceKey(HUNTERS_PREY_CHOICE_KEY);
    /* v8 ignore start -- The canonical Hunter's Prey key is a fixed valid UnitChoiceKey and its mechanics produce a choice hole. */
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
    /* v8 ignore stop */
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
    const hole = weaponMasteryFeatureHoleSource(feature, unitLibrary, input);
    /* v8 ignore start -- The admitted Weapon Mastery feature produces a well-formed choice hole. */
    return hole === undefined ? [] : [hole];
    /* v8 ignore stop */
  }

  return [];
}

export function originFeatGrantChoiceHoles(
  featUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
  input: {
    readonly ownedSkillProficiencies?: readonly Skill[];
    readonly ownedToolProficiencies?: readonly ToolProficiencyId[];
    readonly proficiencyChoiceKey?: UnitChoiceKey;
  } = {},
): readonly ChoiceCreationHole[] {
  const feat = requireOriginFeat(unitLibrary, featUnitId);
  if (feat === undefined || feat.mechanics.family !== "passive") {
    return [];
  }

  return feat.mechanics.grants.flatMap((grant) =>
    passiveGrantChoiceHoles(featUnitId, grant, unitLibrary, {
      ownedSkillProficiencies: input.ownedSkillProficiencies ?? [],
      ownedToolProficiencies: input.ownedToolProficiencies ?? [],
      proficiencyChoiceKey:
        input.proficiencyChoiceKey ?? ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
    }),
  );
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
  /* v8 ignore start -- Supported spellbook-learning mechanics include an acquisition grant at the feature's admitted class level. */
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
  /* v8 ignore stop */

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  /* v8 ignore start -- The admitted spellbook-learning grant produces a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
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
  /* v8 ignore start -- Admitted Wizard spellbook-learning eligibility resolves the Wizard class and its spellbook facts in this catalog. */
  if (
    wizard === undefined ||
    !("spellcasting" in wizard) ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    return [];
  }
  /* v8 ignore stop */

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
    .sort(
      (left, right) =>
        /* v8 ignore start -- Catalog Unit ids are unique, so two spellbook options cannot compare equal. */
        left.spellId < right.spellId
          ? -1
          : left.spellId > right.spellId
            ? 1
            : 0,
      /* v8 ignore stop */
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
  /* v8 ignore start -- Admitted Metamagic mechanics use the canonical Metamagic choice key and a positive table count. */
  if (mechanics.choiceKey !== SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY) {
    return [];
  }

  const cardinality = exactChoiceCardinality(
    classLevelChoiceCountAtLevel(mechanics.choiceCount, input.classLevel ?? 1),
  );
  if (cardinality === undefined) {
    return [];
  }
  /* v8 ignore stop */

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

  /* v8 ignore start -- The admitted Metamagic mechanics produce a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
}

function eldritchInvocationChoiceHoles(
  featureUnitId: UnitRecord["id"],
  mechanics: FeatureChoiceMechanics,
  input: { readonly classLevel?: number },
): readonly ChoiceCreationHole[] {
  /* v8 ignore start -- Admitted invocation mechanics use the canonical invocation key and a count supported by the installed roster. */
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
  /* v8 ignore stop */

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, ELDRITCH_INVOCATIONS_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  /* v8 ignore start -- The admitted invocation mechanics produce a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
}

export function passiveGrantChoiceHoles(
  featureUnitId: UnitRecord["id"],
  grant: EffectAtom,
  unitLibrary: UnitCatalog,
  input: {
    readonly classLevel?: number;
    readonly deferOwnedSkillExpertiseChoices?: boolean;
    readonly ownedSkillExpertise?: readonly Skill[];
    readonly ownedSkillProficiencies?: readonly Skill[];
    readonly ownedToolProficiencies?: readonly ToolProficiencyId[];
    readonly knownLanguages?: readonly Language[];
    readonly proficiencyChoiceKey?: UnitChoiceKey;
    readonly featChoiceKey?: UnitChoiceKey;
  },
): readonly ChoiceCreationHole[] {
  if (grant.kind === "grant_feat") {
    const hole = featGrantFeatureHoleSource(
      featureUnitId,
      grant,
      unitLibrary,
      input.featChoiceKey,
    );
    /* v8 ignore start -- The admitted feat grant produces a well-formed choice hole. */
    return hole === undefined ? [] : [hole];
    /* v8 ignore stop */
  }
  if (grant.kind === "grant_proficiency") {
    return proficiencyGrantChoiceHoles(
      featureUnitId,
      grant.proficiency,
      input.ownedSkillProficiencies ?? [],
      input.ownedToolProficiencies ?? [],
      input.proficiencyChoiceKey,
    );
  }
  if (grant.kind === "grant_expertise") {
    if (
      input.deferOwnedSkillExpertiseChoices === true &&
      grant.skills.kind === "owned_skill_proficiencies_without_expertise"
    ) {
      return [];
    }
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
  /* v8 ignore start -- Supported language-choice grants have a positive count no larger than their remaining language table. */
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return [];
  }
  /* v8 ignore stop */

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, CLASS_FEATURE_LANGUAGE_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
  /* v8 ignore start -- The admitted language grant produces a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
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
      /* v8 ignore start -- Progression admission resolves every retained class id and parses its facts in this catalog. */
      if (Option.isNone(unit)) {
        return [];
      }
      const facts = readClassCreationFacts(unit.value);
      if (facts.tag !== "readable") {
        return [];
      }
      /* v8 ignore stop */

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
        /* v8 ignore start -- Supported language selections retain only ids emitted by the language codec. */
        return Either.isRight(language) ? [language.right] : [];
        /* v8 ignore stop */
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
  /* v8 ignore start -- The admitted expertise grant produces a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
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
  ) => boolean = doNotIgnoreSelection,
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
  shouldIgnoreSelection: (selection: CharacterChoiceSelection) => boolean,
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

function draftOwnedToolProficiencies(
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
): readonly ToolProficiencyId[] {
  return uniqueToolProficiencies([
    ...draftBackgroundToolProficiencies(draft),
    ...draftFixedClassToolProficiencies(draft, unitLibrary),
    ...toolProficienciesFromChoiceSelections(
      draft.selections.choices,
      shouldIgnoreSelection,
    ),
  ]);
}

function draftBackgroundToolProficiencies(
  draft: CharacterDraft,
): readonly ToolProficiencyId[] {
  const backgroundUnitId = draft.selections.background;
  if (backgroundUnitId == null) {
    return [];
  }

  const selection = draft.selections.choices.find(
    (candidate) =>
      candidate.kind === "unitChoice" &&
      candidate.source.unitId === backgroundUnitId &&
      candidate.source.choiceKey === BACKGROUND_TOOL_CHOICE_KEY,
  );
  if (selection === undefined) {
    return [];
  }

  return uniqueToolProficiencies(
    toolProficiencyIdsFromDirectToolOptionIds(
      choiceSelectionOptionIds(selection),
    ),
  );
}

function draftFixedClassToolProficiencies(
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
): readonly ToolProficiencyId[] {
  const progression = draft.selections.progression;
  if (progression == null) {
    return [];
  }

  const startingUnitId = startingClassUnitId(progression);
  return uniqueToolProficiencies(
    progressionClassUnitIds(progression).flatMap((classUnitId) => {
      const unit = unitLibrary.getUnit(classUnitId);
      /* v8 ignore start -- Progression admission resolves every retained class id and parses its facts in this catalog. */
      if (Option.isNone(unit)) {
        return [];
      }
      const facts = readClassCreationFacts(unit.value);
      if (facts.tag !== "readable") {
        return [];
      }
      /* v8 ignore stop */

      const subjects =
        classUnitId === startingUnitId
          ? fixedClassToolProficiencySubjects(facts.value.toolProficiencies)
          : fixedProficiencySubjects(facts.value.multiclassProficiencies);
      return toolProficiencyIdsFromSubjects(subjects);
    }),
  );
}

export function skillProficienciesFromChoiceSelections(
  choices: readonly CharacterChoiceSelection[],
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
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

function toolProficienciesFromChoiceSelections(
  choices: readonly CharacterChoiceSelection[],
  shouldIgnoreSelection: (
    selection: CharacterChoiceSelection,
  ) => boolean = doNotIgnoreSelection,
): readonly ToolProficiencyId[] {
  return uniqueToolProficiencies(
    choices.flatMap((selection) =>
      shouldIgnoreSelection(selection)
        ? []
        : toolProficienciesFromChoiceSelection(selection),
    ),
  );
}

function toolProficienciesFromChoiceSelection(
  selection: CharacterChoiceSelection,
): readonly ToolProficiencyId[] {
  if (selection.kind !== "unitChoice") {
    return [];
  }

  return toolProficiencyIdsFromProficiencyChoiceOptionIds(
    selection.options.map((option) => option.optionId),
  );
}

function backgroundSkillProficiencies(
  backgroundUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly Skill[] {
  const backgroundUnit = unitLibrary.getUnit(backgroundUnitId);
  /* v8 ignore start -- Background proficiency projection receives the admitted selected background from this catalog. */
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  return facts.tag === "readable" ? facts.value.skillProficiencies : [];
  /* v8 ignore stop */
}

function uniqueSkills(skills: readonly Skill[]): readonly Skill[] {
  return skills.filter((skill, index) => skills.indexOf(skill) === index);
}

function uniqueToolProficiencies(
  toolIds: readonly ToolProficiencyId[],
): readonly ToolProficiencyId[] {
  return toolIds.filter(
    (toolId, index) =>
      toolIds.findIndex((candidate) => candidate === toolId) === index,
  );
}

function uniqueUnitIds(
  unitIds: readonly UnitRecord["id"][],
): readonly UnitRecord["id"][] {
  return unitIds.filter((unitId, index) => unitIds.indexOf(unitId) === index);
}

function uniqueLanguages(languages: readonly Language[]): readonly Language[] {
  return [...new Set(languages)];
}

function fixedClassToolProficiencySubjects(
  proficiency: ReadableClassCreationFacts["toolProficiencies"],
): readonly ProficiencyGrantSubject[] {
  return proficiency.kind === "fixed" ? proficiency.proficiencies : [];
}

function fixedProficiencySubjects(
  proficiency: ProficiencyGrant,
): readonly ProficiencyGrantSubject[] {
  if (proficiency.kind === "fixed") {
    return proficiency.proficiencies;
  }
  if (proficiency.kind === "mixed") {
    return proficiency.fixed;
  }
  if (proficiency.kind === "mixed_choices") {
    return proficiency.fixed;
  }
  return [];
}

function requireClassFeature(
  unitLibrary: UnitCatalog,
  featureUnitId: UnitRecord["id"],
): ClassFeatureRecord | undefined {
  const feature = unitLibrary.getUnit(featureUnitId);
  /* v8 ignore start -- Feature grants in admitted class facts reference installed class-feature Units. */
  if (Option.isNone(feature) || feature.value.kind !== "class_feature") {
    return undefined;
  }
  /* v8 ignore stop */

  return feature.value;
}

function requireOriginFeat(
  unitLibrary: UnitCatalog,
  featUnitId: UnitRecord["id"],
): FeatRecord | undefined {
  const feat = unitLibrary.getUnit(featUnitId);
  /* v8 ignore start -- Origin-feat grants in admitted creation facts reference installed Origin feat Units. */
  if (
    Option.isNone(feat) ||
    feat.value.kind !== "feat" ||
    feat.value.category !== "origin"
  ) {
    return undefined;
  }
  /* v8 ignore stop */

  return feat.value;
}

function featGrantFeatureHoleSource(
  featureUnitId: UnitRecord["id"],
  grant: Extract<EffectAtom, { readonly kind: "grant_feat" }>,
  unitLibrary: UnitCatalog,
  choiceKey: UnitChoiceKey = CLASS_FEATURE_FEAT_CHOICE_KEY,
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
      source: unitSource(featureUnitId, choiceKey),
      cardinality: EXACTLY_ONE_CHOICE,
      options,
    }),
  );
}

function proficiencyGrantChoiceHoles(
  sourceUnitId: UnitRecord["id"],
  proficiency: ProficiencyGrant,
  ownedSkillProficiencies: readonly Skill[] = [],
  ownedToolProficiencies: readonly ToolProficiencyId[] = [],
  defaultChoiceKey: UnitChoiceKey = CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
): readonly ChoiceCreationHole[] {
  if (proficiency.kind === "choice") {
    return proficiencyGrantChoiceHole(
      sourceUnitId,
      defaultChoiceKey,
      proficiency.count,
      proficiency.options,
      ownedSkillProficiencies,
      ownedToolProficiencies,
    );
  }
  if (proficiency.kind === "mixed") {
    return proficiencyGrantChoiceHole(
      sourceUnitId,
      proficiency.choice.choiceKey,
      proficiency.choice.count,
      proficiency.choice.options,
      ownedSkillProficiencies,
      ownedToolProficiencies,
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
        ownedToolProficiencies,
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
  ownedToolProficiencies: readonly ToolProficiencyId[],
): readonly ChoiceCreationHole[] {
  const choiceKey = unitChoiceKey(choiceKeyText);
  /* v8 ignore start -- Supported authored proficiency grants carry a canonical nonempty choice key and feasible positive count. */
  if (Either.isLeft(choiceKey)) {
    return [];
  }
  const ownedSkills = uniqueSkills(ownedSkillProficiencies);
  const ownedTools = new Set(
    uniqueToolProficiencies(ownedToolProficiencies).map(String),
  );
  const options = subjects.flatMap((subject) =>
    subject.kind === "skill" && ownedSkills.includes(subject.skill)
      ? []
      : proficiencyGrantSubjectOptions(subject).filter((option) => {
          const optionToolIds =
            toolProficiencyIdsFromProficiencyChoiceOptionIds([option.optionId]);
          return !optionToolIds.some((toolId) =>
            ownedTools.has(String(toolId)),
          );
        }),
  );
  const cardinality = exactChoiceCardinality(count);
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return [];
  }
  /* v8 ignore stop */

  const hole = requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, choiceKey.right),
      cardinality,
      options,
    }),
  );
  /* v8 ignore start -- The admitted proficiency grant produces a well-formed choice hole. */
  return hole === undefined ? [] : [hole];
  /* v8 ignore stop */
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
  input: { readonly classLevel?: number },
): ChoiceCreationHole | undefined {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: feature.id,
    unitLibrary,
  });
  /* v8 ignore start -- An admitted Weapon Mastery choice feature has a profile covering its supported class level. */
  if (profile === undefined) {
    return undefined;
  }

  const projectedProfile =
    input.classLevel === undefined
      ? Option.some(profile)
      : weaponMasteryChoiceProfileForClassLevel(profile, input.classLevel);
  if (Option.isNone(projectedProfile)) return undefined;
  /* v8 ignore stop */
  const options = projectedProfile.value.eligibleWeapons.map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(feature.id, WEAPON_MASTERY_OPTIONS_CHOICE_KEY),
      cardinality: exactChoiceCardinality(projectedProfile.value.choiceCount),
      options,
    }),
  );
}

function requireChoiceCreationHole(
  hole: CreationHole | undefined,
): ChoiceCreationHole | undefined {
  /* v8 ignore start -- Call sites construct a choice hole immediately before narrowing it with this helper. */
  if (hole?.kind !== "choice") {
    return undefined;
  }
  /* v8 ignore stop */

  return hole;
}

export function draftHole(
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
  unitLibrary: UnitCatalog,
  _draft?: CharacterDraft,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): CreationHole | undefined {
  if (path === "draft.progression.initial") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "class")
        .flatMap((unit) =>
          progressionOptionsForClassUnit(unit, supportProfile),
        ),
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
    /* v8 ignore start -- A retained species id was selected from this catalog before dependent size-hole discovery. */
    if (Option.isNone(unit)) {
      return undefined;
    }
    /* v8 ignore stop */
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

  if (path === "draft.draconicAncestry") {
    const speciesId = _draft?.selections.species;
    if (speciesId === undefined) {
      return undefined;
    }
    const unit = unitLibrary.getUnit(speciesId);
    /* v8 ignore start -- A retained species id was selected from this catalog before ancestry-hole discovery. */
    if (Option.isNone(unit)) {
      return undefined;
    }
    /* v8 ignore stop */
    const source = draconicAncestryDamageTypeSource(unit.value);
    if (source === undefined) {
      return undefined;
    }

    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: source.options.map(draconicAncestryOption),
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

function draconicAncestryDamageTypeSource(
  unit: UnitRecord,
): DragonbornSpeciesRecord["draconicAncestry"]["damageType"] | undefined {
  return unit.kind === "species" && "draconicAncestry" in unit
    ? unit.draconicAncestry.damageType
    : undefined;
}

function draconicAncestryOption(
  option: DragonbornSpeciesRecord["draconicAncestry"]["damageType"]["options"][number],
) {
  return {
    optionId: creationChoiceOptionId(option.id),
    label: option.displayName,
  };
}

function progressionOptionsForClassUnit(
  unit: UnitRecord,
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationChoiceOption[] {
  const optionsById = new Map<CreationChoiceOptionId, CreationChoiceOption>();
  for (const progression of [
    ...levelOneProgressionForClassUnit(unit.id),
    ...supportedProgressionsForClass(unit.id, supportProfile),
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
