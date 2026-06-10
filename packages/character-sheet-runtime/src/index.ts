// KERNEL-COVERAGE: runtime-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.WEAPON_MASTERY.RESELECTION SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION
import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  abilityScoreAssignment,
  characterBuildFeatureUnitIds,
  characterBuildSpellcastingSlotCapacity,
  classLevelForUnit,
  classUnitId,
  classUnitIdToClassName,
  CHARACTER_CLASS_LEVELS,
  characterBuildSorcererMetamagicFacts,
  characterBuildMonkUncannyMetabolismFacts,
  eldritchInvocationOptionForInvocationId,
  eldritchInvocationRepeatableChoiceSatisfiesRule,
  eldritchInvocationId,
  languageFromSurfaceLanguageId,
  parseCharacterEquipmentItemId,
  progressionClassUnitIds,
  STANDARD_LANGUAGES,
  sorcererMetamagicOptionId,
  weaponMasteryChoiceProfileForFeature,
  characterDraconicAncestrySelection,
  type CharacterBuild,
  type CharacterBuildBookOfShadowsSpellAccess,
  type CharacterBuildEquipment,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildFeature,
  type CharacterBuildProficiencyChoiceSubject,
  type CharacterBuildSpeciesChoiceFacts,
  type CharacterBuildSpellcasting,
  type CharacterBuildSpellcastingFocus,
  type CharacterBuildSpellcastingSource,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  ABILITIES,
  LANGUAGES,
  SKILLS,
  SURFACE_SKILLS,
  type Ability,
  type SurfaceSkill,
} from "@dnd/shared/game-facts";
import {
  Hp,
  resourceCount,
  spellSlotLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
  elapsedTimeTicksFromTimeSpanDuration,
  parseElapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import type {
  DeathSaveCount,
  DeathSaves,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  Hp as HpType,
  ResourceCount,
  SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  SpellRecord,
  UnitRecord,
  DragonbornSpeciesRecord,
} from "@dnd/surface/surface/types";
import {
  allCantripsFromAnyClassSpellList,
  allCantripsFromClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
} from "@dnd/surface/surface/schema";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import { isSupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import { Either, Match, Option } from "effect";

export {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetIssue,
  characterSheetId,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
} from "./sheet-types.ts";
export {
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
  characterSheetProficiencyBonusForCharacterLevel,
} from "./ability-checks.ts";
export {
  characterSheetArmorClass,
  characterSheetArmorClassState,
} from "./armor-class.ts";
export { characterSheetClassFeaturePreparedSpellAccessesForBuild } from "./class-feature-spells.ts";
export {
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
} from "./druid-features.ts";
export {
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  characterSheetHitDice,
} from "./healing-rest-benefit.ts";
export {
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
  characterSheetHitPoints,
  characterSheetHitPointsCurrentHp,
  characterSheetTempHp,
} from "./hit-points.ts";
export {
  characterSheetMonkUncannyMetabolismUseState,
  characterSheetMonksFocusSaveDc,
  characterSheetResources,
  useMonkUncannyMetabolismWhenRollingInitiative,
} from "./resources.ts";
export {
  characterSheetSpellInvocation,
  characterSheetSpellbookRitualAccess,
  characterSheetSpellbookRitualAccessesForBuild,
} from "./spell-invocation.ts";
export {
  characterSheetPactSlots,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  convertFontOfMagicSorceryPointsToSpellSlot,
  convertFontOfMagicSpellSlotToSorceryPoints,
  replaceCharacterSheetSpellSlotSourceState,
} from "./spell-slots.ts";
export type {
  CharacterPactSlotExpenditure,
  CharacterSheet,
  CharacterSheetAbilityCheckAbility,
  CharacterSheetAbilityCheckAbilityInput,
  CharacterSheetAbilityCheckAbilitySubstitution,
  CharacterSheetAbilityCheckOtherProficiencyBonusState,
  CharacterSheetAbilityCheckProficiencyBonus,
  CharacterSheetAbilityCheckProficiencyBonusInput,
  CharacterSheetArcaneRecoverySlotRefund,
  CharacterSheetArmorClassBaseChoice,
  CharacterSheetArmorClassStateInput,
  CharacterSheetBookOfShadowsPresence,
  CharacterSheetBookOfShadowsRitualInvocation,
  CharacterSheetClassFeaturePreparedSpellAccess,
  CharacterSheetCondition,
  CharacterSheetCreatedSpellSlotState,
  CharacterSheetDeadDeathSaves,
  CharacterSheetDruidCircleLand,
  CharacterSheetDruidCircleLandPreparedSpellAccess,
  CharacterSheetDruidWildShapeKnownFormReplacement,
  CharacterSheetDruidWildShapeKnownForms,
  CharacterSheetElapsedTimeResult,
  CharacterSheetFontOfMagicSlotToSorceryPointsInput,
  CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput,
  CharacterSheetFontOfMagicSpellSlotSource,
  CharacterSheetHitDieSpend,
  CharacterSheetHitDieState,
  CharacterSheetHitPoints,
  CharacterSheetHitPointsInput,
  CharacterSheetId,
  CharacterSheetInput,
  CharacterSheetIssue,
  CharacterSheetJumpDistanceAbility,
  CharacterSheetJumpDistanceAbilityInput,
  CharacterSheetJumpDistanceAbilitySubstitution,
  CharacterSheetLayOnHandsInput,
  CharacterSheetLayOnHandsResult,
  CharacterSheetLinkedSpeedGrant,
  CharacterSheetLongRestCalendarGate,
  CharacterSheetLongRestCompletion,
  CharacterSheetLongRestCompletionInput,
  CharacterSheetLongRestInput,
  CharacterSheetLongRestInterruption,
  CharacterSheetLongRestInterruptionInput,
  CharacterSheetLongRestInterruptionOutcome,
  CharacterSheetLongRestStart,
  CharacterSheetLongRestStartInput,
  CharacterSheetLongRestStartTiming,
  CharacterSheetMagicalCunningInput,
  CharacterSheetMonkUncannyMetabolismInitiativeInput,
  CharacterSheetMonkUncannyMetabolismUseState,
  CharacterSheetMonksFocusSaveDc,
  CharacterSheetPactSlotState,
  CharacterSheetPendingDeathSaves,
  CharacterSheetPointPoolResourceUnitId,
  CharacterSheetPositiveHpUnconscious,
  CharacterSheetResourceExpenditure,
  CharacterSheetResourceState,
  CharacterSheetRestActivityInterruption,
  CharacterSheetRestFeatureUse,
  CharacterSheetShortRestCompletion,
  CharacterSheetShortRestCompletionInput,
  CharacterSheetShortRestInput,
  CharacterSheetShortRestInterruption,
  CharacterSheetShortRestInterruptionInput,
  CharacterSheetShortRestInterruptionOutcome,
  CharacterSheetShortRestStart,
  CharacterSheetShortRestStartInput,
  CharacterSheetSpellInvocation,
  CharacterSheetSpellInvocationInput,
  CharacterSheetSpellInvocationKind,
  CharacterSheetSpellRestBenefitInput,
  CharacterSheetSpellRestBenefitRecipient,
  CharacterSheetSpellRestBenefitRecipientEligibility,
  CharacterSheetSpellRestBenefitResult,
  CharacterSheetSpellSlotSourceState,
  CharacterSheetSpellSlotState,
  CharacterSheetSpellbookRitualAccess,
  CharacterSheetSpellbookRitualAccessInput,
  CharacterSheetSpellbookRitualInvocation,
  CharacterSheetSpentHitDiePool,
  CharacterSheetStableRecovery,
  CharacterSheetTimePassedInput,
  CharacterSheetUseCountResourceUnitId,
  CharacterSheetWeaponMasteryReselection,
  CharacterSheetZeroHpLifecycle,
  CharacterSheetZeroHpLifecycleInput,
  CharacterSpellSlotExpenditure,
} from "./sheet-types.ts";
import {
  ARCANE_RECOVERY_REST_FEATURE_TAG,
  ARMOR_TRAINING_CATEGORY_VALUES,
  CHARACTER_SHEET_CONDITIONS,
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  MAGICAL_CUNNING_REST_FEATURE_TAG,
  SPELL_RECIPIENT_REST_LOCKOUT_TAG,
  UNCANNY_METABOLISM_REST_FEATURE_TAG,
  WEAPON_PROFICIENCY_CATEGORY_VALUES,
  characterSheetIssue,
  characterSheetId,
  getRequiredUnit,
  isNonNegativeInteger,
  isPositiveInteger,
  characterSheetLongRestCompletionBrand,
  characterSheetLongRestStartBrand,
  characterSheetShortRestCompletionBrand,
  characterSheetShortRestStartBrand,
  isCharacterSheetPointPoolResourceUnitId,
} from "./sheet-types.ts";
import type {
  CharacterPactSlotExpenditure,
  CharacterSheet,
  CharacterSheetBookOfShadowsPresence,
  CharacterSheetCondition,
  CharacterSheetCreatedSpellSlotState,
  CharacterSheetDruidCircleLand,
  CharacterSheetDruidWildShapeKnownForms,
  CharacterSheetElapsedTimeResult,
  CharacterSheetInput,
  CharacterSheetIssue,
  CharacterSheetLongRestCalendarGate,
  CharacterSheetLongRestCompletion,
  CharacterSheetLongRestCompletionInput,
  CharacterSheetLongRestInput,
  CharacterSheetLongRestInterruption,
  CharacterSheetLongRestInterruptionInput,
  CharacterSheetLongRestInterruptionOutcome,
  CharacterSheetLongRestStart,
  CharacterSheetLongRestStartInput,
  CharacterSheetLongRestStartTiming,
  CharacterSheetMagicalCunningInput,
  CharacterSheetPactSlotState,
  CharacterSheetPointPoolResourceUnitId,
  CharacterSheetPositiveHpUnconscious,
  CharacterSheetResourceExpenditure,
  CharacterSheetRestFeatureUse,
  CharacterSheetShortRestCompletion,
  CharacterSheetShortRestCompletionInput,
  CharacterSheetShortRestInput,
  CharacterSheetShortRestInterruptionInput,
  CharacterSheetShortRestInterruptionOutcome,
  CharacterSheetShortRestStart,
  CharacterSheetShortRestStartInput,
  CharacterSheetSpellSlotSourceState,
  CharacterSheetSpentHitDiePool,
  CharacterSheetStableRecovery,
  CharacterSheetTimePassedInput,
  CharacterSheetWeaponMasteryReselection,
  CharacterSheetZeroHpLifecycleInput,
  CharacterSpellSlotExpenditure,
  NonSpellcastingCharacterBuild,
  SpellcastingCharacterBuild,
  StoredClassFeatureLanguage,
  StoredClassFeatureLanguageFact,
  StoredClassFeatureLanguageProjection,
} from "./sheet-types.ts";
import {
  characterSheetCurrentHp,
  characterSheetHitPointCapacity,
  characterSheetHitPoints,
  invalidElapsedTimeResult,
  parseHp,
  passStableRecoveryTime,
} from "./hit-points.ts";
import {
  characterBuildHitDice,
  characterSheetSpellRestBenefitProfile,
  completeShortRestBenefits,
  restSpellSlotRecoveryProfileForBuild,
} from "./healing-rest-benefit.ts";
import { resourceExpendituresFromInput } from "./resources.ts";
import {
  characterBuildPactSlotCapacity,
  characterSheetPactSlots,
  isCharacterSheetWithSpellSlots,
  pactSlotExpenditureFromInput,
  spellSlotStateFromInput,
  validateSpellSlotSourceState,
} from "./spell-slots.ts";
import { featurePreparedSpellIdsForBuild } from "./class-feature-spells.ts";
import {
  druidCircleLandAfterLongRest,
  druidCircleLandFromInput,
  druidWildShapeKnownFormsAfterLongRest,
  druidWildShapeKnownFormsFromInput,
  isDruidCircleLandChoice,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.weapon-mastery-reselection character-sheet.weapon-mastery-class-level-reselection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.pact-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-long-rest-use-state
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-prepared-spell-access
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.druid-circle-land-spell-access

export function createFreshCharacterSheet(
  input: CharacterSheetInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  return createCharacterSheet(input);
}

function createCharacterSheet(
  input: CharacterSheetInput,
  storedSpellSlotState?: CharacterSheetSpellSlotSourceState,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const hitPointCapacity = characterSheetHitPointCapacity(input);
  if (Either.isLeft(hitPointCapacity))
    return Either.left(hitPointCapacity.left);
  const spentHitDice = spentHitDiceFromInput(input);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const restFeatureUses = restFeatureUsesFromInput(input);
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const conditions = conditionsFromInput(input.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const resourceExpenditures = resourceExpendituresFromInput(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  const druidWildShapeKnownForms = druidWildShapeKnownFormsFromInput(input);
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  const druidCircleLand = druidCircleLandFromInput(input);
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }
  const druidCircleBookOfShadowsIssue =
    storedBookOfShadowsDruidCircleLandSelectionIssue({
      build: input.build,
      unitLibrary: input.unitLibrary,
      circleLand: druidCircleLand.right,
    });
  if (Either.isLeft(druidCircleBookOfShadowsIssue)) {
    return Either.left(druidCircleBookOfShadowsIssue.left);
  }

  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined || storedSpellSlotState !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    if (input.pactSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Pact Slot state.",
      );
    }
    const hitPoints = characterSheetHitPoints(input);
    if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
    return Either.right({
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      maximumHp: input.maximumHp,
      hitPointMaximumReduction: input.hitPointMaximumReduction,
      hitPoints: hitPoints.right,
      conditions: conditions.right,
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
      resourceExpenditures: resourceExpenditures.right,
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
      ...(druidCircleLand.right === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.right }),
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const hitPoints = characterSheetHitPoints(input);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlotState =
    storedSpellSlotState === undefined
      ? spellSlotStateFromInput({
          build,
          unitLibrary: input.unitLibrary,
          ...(input.spellSlots === undefined
            ? {}
            : { spellSlots: input.spellSlots }),
        })
      : Either.right(storedSpellSlotState);
  if (Either.isLeft(spellSlotState)) {
    return Either.left(spellSlotState.left);
  }
  const pactSlotExpenditure = pactSlotExpenditureFromInput({
    build,
    ...(input.pactSlots === undefined ? {} : { pactSlots: input.pactSlots }),
  });
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(pactSlotExpenditure.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    maximumHp: input.maximumHp,
    hitPointMaximumReduction: input.hitPointMaximumReduction,
    hitPoints: hitPoints.right,
    conditions: conditions.right,
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    resourceExpenditures: resourceExpenditures.right,
    bookOfShadowsPresence: bookOfShadowsPresence.right,
    ...(druidWildShapeKnownForms.right === undefined
      ? {}
      : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
    ...(druidCircleLand.right === undefined
      ? {}
      : { druidCircleLand: druidCircleLand.right }),
    spellSlotExpenditures: spellSlotState.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotState.right.createdSpellSlots,
    pactSlotExpenditure: pactSlotExpenditure.right,
  });
}

function bookOfShadowsPresenceFromInput(
  input: CharacterSheetInput,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(input.build)) {
    return input.bookOfShadowsPresence === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  return Either.right(input.bookOfShadowsPresence ?? { tag: "onPerson" });
}

function characterBuildHasBookOfShadows(build: CharacterBuild): boolean {
  return (
    build.spellcasting?.sources.some(
      (source) => source.bookOfShadows !== undefined,
    ) ?? false
  );
}

export function parseCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Sheet.");
  if (value.tag !== "available") {
    return characterSheetIssue("Expected available Character Sheet.");
  }
  if (typeof value.characterId !== "string") {
    return characterSheetIssue("Character Sheet requires character id.");
  }
  const build = parseCharacterBuild(value.build, unitLibrary);
  if (Either.isLeft(build)) return Either.left(build.left);
  const bookOfShadowsPresence = parseStoredCharacterSheetBookOfShadowsPresence(
    build.right,
    value.bookOfShadowsPresence,
  );
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  const maximumHp = parseHp(value.maximumHp);
  if (Either.isLeft(maximumHp)) return Either.left(maximumHp.left);
  if (!Object.hasOwn(value, "hitPointMaximumReduction")) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction is required.",
    );
  }
  const hitPointMaximumReduction = parseHp(value.hitPointMaximumReduction);
  if (Either.isLeft(hitPointMaximumReduction)) {
    return Either.left(hitPointMaximumReduction.left);
  }
  const hitPoints = parseStoredHitPoints(value.hitPoints);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const conditions = parseStoredConditions(value.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const spentHitDice = parseStoredSpentHitDice(value.spentHitDice);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const resourceExpenditures = parseStoredResourceExpenditures(
    value.resourceExpenditures,
  );
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const spellSlots = parseStoredSpellSlots(build.right, unitLibrary, value);
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);
  const pactSlots = parseStoredPactSlots(build.right, value);
  if (Either.isLeft(pactSlots)) return Either.left(pactSlots.left);
  const restFeatureUses = parseStoredRestFeatureUses(
    build.right,
    unitLibrary,
    value.restFeatureUses,
  );
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const druidWildShapeKnownForms = parseStoredDruidWildShapeKnownForms(
    value.druidWildShapeKnownForms,
  );
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  const druidCircleLand = parseStoredDruidCircleLand(value.druidCircleLand);
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }

  return createCharacterSheet(
    {
      characterId: characterSheetId(value.characterId),
      build: build.right,
      maximumHp: maximumHp.right,
      hitPointMaximumReduction: hitPointMaximumReduction.right,
      currentHp: hitPoints.right.currentHp,
      tempHp: hitPoints.right.tempHp,
      conditions: conditions.right,
      unitLibrary,
      ...(hitPoints.right.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: hitPoints.right.positiveHpUnconscious }),
      ...(hitPoints.right.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: hitPoints.right.zeroHpLifecycle }),
      ...(pactSlots.right === undefined ? {} : { pactSlots: pactSlots.right }),
      ...(bookOfShadowsPresence.right === undefined
        ? {}
        : { bookOfShadowsPresence: bookOfShadowsPresence.right }),
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
      resourceExpenditures: resourceExpenditures.right,
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              druidWildShapeKnownForms.right.statBlockIds,
          }),
      ...(druidCircleLand.right === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.right }),
    },
    spellSlots.right,
  );
}

export function characterBuildHasSpellbookSpell(input: {
  readonly build: CharacterBuild;
  readonly spellId: UnitRecord["id"];
}): boolean {
  return (
    input.build.spellcasting?.sources.some((source) =>
      source.spellbook.some((spellId) => spellId === input.spellId),
    ) ?? false
  );
}

export function startShortRest(
  input: CharacterSheetShortRestStartInput,
): Either.Either<CharacterSheetShortRestStart, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  return Either.right({
    tag: "shortRestStarted",
    sheet: input.sheet,
    requiredRestTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
    [characterSheetShortRestStartBrand]: true,
  });
}

export function finishShortRest(
  input: CharacterSheetShortRestCompletionInput,
): Either.Either<CharacterSheetShortRestCompletion, CharacterSheetIssue> {
  if (Number(input.restedTicks) < Number(input.rest.requiredRestTicks)) {
    return characterSheetIssue(
      "Short Rest requires 1 hour before benefits can be received.",
    );
  }
  return Either.right({
    tag: "shortRestCompleted",
    startedRest: input.rest,
    restedTicks: input.restedTicks,
    [characterSheetShortRestCompletionBrand]: true,
  });
}

export function interruptShortRest(
  input: CharacterSheetShortRestInterruptionInput,
): CharacterSheetShortRestInterruptionOutcome {
  return {
    tag: "shortRestInterruptedNoBenefit",
    sheet: input.rest.sheet,
    interruption: input.interruption,
  };
}

export function completeShortRest(
  input: CharacterSheetShortRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  return completeShortRestBenefits({
    sheet: input.completion.startedRest.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "requiresShortRestStartHp",
    spendHitDice: input.spendHitDice,
    arcaneRecovery: input.arcaneRecovery,
  });
}

export function characterSheetLongRestCalendarGate(
  timing: CharacterSheetLongRestStartTiming,
): CharacterSheetLongRestCalendarGate {
  if (timing.tag === "noPriorLongRest") {
    return {
      tag: "canStart",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    };
  }
  const remainingTicks =
    Number(CHARACTER_SHEET_LONG_REST_WAIT_TICKS) - Number(timing.elapsedTicks);
  if (remainingTicks <= 0) {
    return {
      tag: "canStart",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    };
  }
  return {
    tag: "mustWait",
    requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    remainingTicks: elapsedTimeTicks(remainingTicks),
  };
}

export function startLongRest(
  input: CharacterSheetLongRestStartInput,
): Either.Either<CharacterSheetLongRestStart, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const calendarGate = characterSheetLongRestCalendarGate(input.timing);
  if (calendarGate.tag === "mustWait") {
    return characterSheetIssue(
      "Long Rest requires waiting 16 hours after finishing the previous Long Rest.",
    );
  }
  return Either.right({
    tag: "longRestStarted",
    sheet: input.sheet,
    requiredRestTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
    nextLongRestStartWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    [characterSheetLongRestStartBrand]: true,
  });
}

export function finishLongRest(
  input: CharacterSheetLongRestCompletionInput,
): Either.Either<CharacterSheetLongRestCompletion, CharacterSheetIssue> {
  if (Number(input.restedTicks) < Number(input.rest.requiredRestTicks)) {
    return characterSheetIssue(
      "Long Rest requires the full required duration before benefits can be received.",
    );
  }
  return Either.right({
    tag: "longRestCompleted",
    startedRest: input.rest,
    restedTicks: input.restedTicks,
    [characterSheetLongRestCompletionBrand]: true,
  });
}

export function completeLongRest(
  input: CharacterSheetLongRestInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const sheet = input.completion.startedRest.sheet;
  if (characterSheetCurrentHp(sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: sheet.maximumHp,
    tempHp: Hp(0),
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  if (isCharacterSheetWithSpellSlots(sheet)) {
    const build = characterSheetLongRestBuild(input, sheet.build);
    if (Either.isLeft(build)) return Either.left(build.left);
    const druidWildShapeKnownForms = druidWildShapeKnownFormsAfterLongRest({
      input,
      build: build.right,
    });
    if (Either.isLeft(druidWildShapeKnownForms)) {
      return Either.left(druidWildShapeKnownForms.left);
    }
    const druidCircleLand = druidCircleLandAfterLongRest({
      input,
      build: build.right,
    });
    if (Either.isLeft(druidCircleLand)) {
      return Either.left(druidCircleLand.left);
    }
    return Either.right({
      ...sheet,
      build: build.right,
      maximumHp: sheet.maximumHp,
      hitPointMaximumReduction: Hp(0),
      hitPoints: hitPoints.right,
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
      ...(druidCircleLand.right === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.right }),
      spellSlotExpenditures: sheet.spellSlotExpenditures.map((expenditure) => ({
        ...expenditure,
        expended: resourceCount(0),
      })),
      createdSpellSlots: [],
      pactSlotExpenditure:
        sheet.pactSlotExpenditure === undefined
          ? undefined
          : { expended: resourceCount(0) },
    });
  }
  const build = characterSheetLongRestBuild(input, sheet.build);
  if (Either.isLeft(build)) return Either.left(build.left);
  const druidWildShapeKnownForms = druidWildShapeKnownFormsAfterLongRest({
    input,
    build: build.right,
  });
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  const druidCircleLand = druidCircleLandAfterLongRest({
    input,
    build: build.right,
  });
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }
  return Either.right({
    ...sheet,
    build: build.right,
    maximumHp: sheet.maximumHp,
    hitPointMaximumReduction: Hp(0),
    hitPoints: hitPoints.right,
    spentHitDice: [],
    restFeatureUses: [],
    resourceExpenditures: [],
    ...(druidWildShapeKnownForms.right === undefined
      ? {}
      : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
    ...(druidCircleLand.right === undefined
      ? {}
      : { druidCircleLand: druidCircleLand.right }),
  });
}

export function interruptLongRest(
  input: CharacterSheetLongRestInterruptionInput,
): Either.Either<
  CharacterSheetLongRestInterruptionOutcome,
  CharacterSheetIssue
> {
  const physicalExertionIssue = longRestPhysicalExertionInterruptionIssue(
    input.interruption,
  );
  if (physicalExertionIssue !== null) {
    return characterSheetIssue(physicalExertionIssue);
  }
  if (Number(input.restedTicks) >= Number(input.rest.requiredRestTicks)) {
    return characterSheetIssue(
      "Long Rest interruption requires rested time before the required Long Rest duration.",
    );
  }
  const requiredLongRestTicks = elapsedTimeTicks(
    Number(input.rest.requiredRestTicks) + ELAPSED_TIME_TICKS_PER_HOUR,
  );
  const resumedRest = characterSheetLongRestAfterInterruption({
    rest: input.rest,
    sheet: input.rest.sheet,
    requiredRestTicks: requiredLongRestTicks,
  });
  if (Number(input.restedTicks) < Number(CHARACTER_SHEET_SHORT_REST_TICKS)) {
    if (
      input.spendHitDice !== undefined ||
      input.arcaneRecovery !== undefined
    ) {
      return characterSheetIssue(
        "Interrupted Long Rest before 1 hour cannot receive Short Rest benefit inputs.",
      );
    }
    return Either.right({
      tag: "longRestInterruptedNoBenefit",
      rest: resumedRest,
      interruption: input.interruption,
      requiredLongRestTicks,
    });
  }
  const shortRest = completeShortRestBenefits({
    sheet: input.rest.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "requiresShortRestStartHp",
    spendHitDice: input.spendHitDice,
    arcaneRecovery: input.arcaneRecovery,
  });
  if (Either.isLeft(shortRest)) return Either.left(shortRest.left);
  const resumedRestWithBenefits = characterSheetLongRestAfterInterruption({
    rest: input.rest,
    sheet: shortRest.right,
    requiredRestTicks: requiredLongRestTicks,
  });
  return Either.right({
    tag: "longRestInterruptedWithShortRestBenefits",
    rest: resumedRestWithBenefits,
    interruption: input.interruption,
    requiredLongRestTicks,
  });
}

function longRestPhysicalExertionInterruptionIssue(
  interruption: CharacterSheetLongRestInterruption,
): string | null {
  if (typeof interruption === "string") return null;
  return Number(interruption.durationTicks) <
    Number(CHARACTER_SHEET_SHORT_REST_TICKS)
    ? "Long Rest physical exertion interruption requires at least 1 hour."
    : null;
}

function characterSheetLongRestAfterInterruption(input: {
  readonly rest: CharacterSheetLongRestStart;
  readonly sheet: CharacterSheet;
  readonly requiredRestTicks: ElapsedTimeTicks;
}): CharacterSheetLongRestStart {
  return {
    tag: "longRestStarted",
    sheet: input.sheet,
    requiredRestTicks: input.requiredRestTicks,
    nextLongRestStartWaitTicks: input.rest.nextLongRestStartWaitTicks,
    [characterSheetLongRestStartBrand]: true,
  };
}

export function completeMagicalCunningRite(
  input: CharacterSheetMagicalCunningInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (
    !("pactSlotExpenditure" in input.sheet) ||
    input.sheet.pactSlotExpenditure === undefined
  ) {
    return characterSheetIssue("Magical Cunning requires Pact Slot state.");
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  if (pactSlots === undefined) {
    return characterSheetIssue("Magical Cunning requires Pact Slot state.");
  }
  const profile = pactSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Magical Cunning cannot be used again until a Long Rest.",
    );
  }
  if (pactSlots.expended < resourceCount(1)) {
    return characterSheetIssue(
      "Magical Cunning must recover expended Pact Slots.",
    );
  }
  const recovered = magicalCunningRecoveredPactSlots({
    pactSlots,
    profile: profile.right,
  });
  return Either.right({
    ...input.sheet,
    pactSlotExpenditure: {
      expended: resourceCount(Math.max(0, pactSlots.expended - recovered)),
    },
    restFeatureUses: [
      ...input.sheet.restFeatureUses,
      {
        tag: MAGICAL_CUNNING_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
  });
}

function characterSheetLongRestBuild<TBuild extends CharacterBuild>(
  input: CharacterSheetLongRestInput,
  build: TBuild,
): Either.Either<TBuild, CharacterSheetIssue> {
  if (input.weaponMasteryReselections === undefined) {
    return Either.right(build);
  }
  return characterBuildWithWeaponMasteryReselections({
    build,
    unitLibrary: input.unitLibrary,
    reselections: input.weaponMasteryReselections,
  });
}

function characterBuildWithWeaponMasteryReselections<
  TBuild extends CharacterBuild,
>(input: {
  readonly build: TBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselections: ReadonlyNonEmptyArray<CharacterSheetWeaponMasteryReselection>;
}): Either.Either<TBuild, CharacterSheetIssue> {
  if (input.reselections.length === 0) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection input must be nonempty.",
    );
  }
  const ownedFeatureUnitIds = new Set(
    characterBuildFeatureUnitIds(input.build, input.unitLibrary),
  );
  const reselectedWeaponUnitIdsByFeature = new Map<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >();

  for (const reselection of input.reselections) {
    if (reselectedWeaponUnitIdsByFeature.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection must not duplicate feature sources.",
      );
    }
    if (!ownedFeatureUnitIds.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection requires the Character Build to own the feature.",
      );
    }
    const selectedWeaponUnitIds = selectedWeaponMasteryUnitIdsForLongRest({
      build: input.build,
      unitLibrary: input.unitLibrary,
      reselection,
    });
    if (Either.isLeft(selectedWeaponUnitIds)) {
      return Either.left(selectedWeaponUnitIds.left);
    }
    reselectedWeaponUnitIdsByFeature.set(
      reselection.featureUnitId,
      selectedWeaponUnitIds.right,
    );
  }

  return Either.right({
    ...input.build,
    features: characterBuildFeaturesWithWeaponMasteryReselections(
      input.build.features,
      reselectedWeaponUnitIdsByFeature,
    ),
  });
}

function selectedWeaponMasteryUnitIdsForLongRest(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselection: CharacterSheetWeaponMasteryReselection;
}): Either.Either<readonly UnitRecord["id"][], CharacterSheetIssue> {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.reselection.featureUnitId,
    unitLibrary: input.unitLibrary,
  });
  if (profile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection requires a Weapon Mastery class-feature Unit.",
    );
  }
  const classLevel = classLevelForUnit(
    input.build.progression,
    profile.classRecord.id,
  );
  const levelProfile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.reselection.featureUnitId,
    unitLibrary: input.unitLibrary,
    classLevel,
  });
  if (levelProfile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection requires a Weapon Mastery class-feature Unit.",
    );
  }
  if (profile.longRestChangeCount < 1) {
    return characterSheetIssue(
      "Weapon Mastery class-feature Unit does not support Long Rest reselection.",
    );
  }

  const currentWeaponUnitIds = selectedWeaponMasteryUnitIds(
    input.build,
    input.reselection.featureUnitId,
  );
  if (
    currentWeaponUnitIds.length !== levelProfile.choiceCount ||
    new Set(currentWeaponUnitIds).size !== currentWeaponUnitIds.length
  ) {
    return characterSheetIssue(
      "Existing Weapon Mastery selections must match the feature choice count.",
    );
  }

  const selectedWeaponUnitIds = input.reselection.selectedWeaponUnitIds;
  if (selectedWeaponUnitIds.length !== levelProfile.choiceCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must match the feature choice count.",
    );
  }
  if (new Set(selectedWeaponUnitIds).size !== selectedWeaponUnitIds.length) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must not duplicate weapon choices.",
    );
  }

  const eligibleWeaponUnitIds = new Set(
    levelProfile.eligibleWeapons.map((weapon) => weapon.id),
  );
  if (
    selectedWeaponUnitIds.some((unitId) => !eligibleWeaponUnitIds.has(unitId))
  ) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must choose eligible proficient weapons.",
    );
  }

  const currentWeaponUnitIdSet = new Set(currentWeaponUnitIds);
  const changedChoiceCount = selectedWeaponUnitIds.filter(
    (unitId) => !currentWeaponUnitIdSet.has(unitId),
  ).length;
  if (changedChoiceCount > profile.longRestChangeCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection changes too many weapon choices.",
    );
  }

  return Either.right([...selectedWeaponUnitIds]);
}

function selectedWeaponMasteryUnitIds(
  build: CharacterBuild,
  featureUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}

function characterBuildFeaturesWithWeaponMasteryReselections(
  features: readonly CharacterBuildFeature[],
  selectedWeaponUnitIdsByFeature: ReadonlyMap<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >,
): readonly CharacterBuildFeature[] {
  const insertedFeatureUnitIds = new Set<UnitRecord["id"]>();
  const nextFeatures: CharacterBuildFeature[] = [];

  for (const feature of features) {
    const selectedWeaponUnitIds =
      feature.kind === "selectedClassChoice"
        ? selectedWeaponUnitIdsByFeature.get(feature.selectedFromUnitId)
        : undefined;
    if (selectedWeaponUnitIds === undefined) {
      nextFeatures.push(feature);
      continue;
    }

    if (!insertedFeatureUnitIds.has(feature.selectedFromUnitId)) {
      nextFeatures.push(
        ...selectedWeaponUnitIds.map((unitId) => ({
          kind: "selectedClassChoice" as const,
          unitId,
          selectedFromUnitId: feature.selectedFromUnitId,
        })),
      );
      insertedFeatureUnitIds.add(feature.selectedFromUnitId);
    }
  }

  for (const [
    featureUnitId,
    selectedWeaponUnitIds,
  ] of selectedWeaponUnitIdsByFeature) {
    if (insertedFeatureUnitIds.has(featureUnitId)) continue;
    nextFeatures.push(
      ...selectedWeaponUnitIds.map((unitId) => ({
        kind: "selectedClassChoice" as const,
        unitId,
        selectedFromUnitId: featureUnitId,
      })),
    );
  }

  return nextFeatures;
}

export function timePassed(
  input: CharacterSheetTimePassedInput,
): CharacterSheetElapsedTimeResult {
  // Future ASSUMPTIONS.md work: out-of-battle elapsed rounds may imply
  // turn-boundary Death Saving Throws, but this operation currently only
  // handles calendar-time Stable recovery.
  const totalTicks = elapsedTimeTicksFromTimeSpanDuration(input.duration);
  if (Either.isLeft(totalTicks)) {
    return invalidElapsedTimeResult(
      input.sheet,
      `Invalid elapsed-time duration: ${totalTicks.left.kind}.`,
    );
  }
  const consumed = passStableRecoveryTime({
    sheet: input.sheet,
    ticks: totalTicks.right,
    fills: input.fills,
  });
  if (consumed.tag !== "resolved") return consumed;
  return {
    tag: "resolved",
    sheet: consumed.sheet,
    elapsedTicks: consumed.elapsedTicks,
  };
}

type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type PactSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "pact_slot_recovery" }
>;
type CharacterSheetPactSlotRecoveryFeature =
  CharacterSheetClassFeatureRecord & {
    readonly mechanics: PactSlotRecoveryMechanics;
  };
type CharacterSheetPactSlotRecoveryProfile = {
  readonly feature: CharacterSheetPactSlotRecoveryFeature;
  readonly classUnitId: UnitRecord["id"];
};
function spentHitDiceFromInput(
  input: Pick<CharacterSheetInput, "build" | "spentHitDice" | "unitLibrary">,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  const capacity = characterBuildHitDice(input.build, input.unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  const spentHitDice = input.spentHitDice ?? [];
  const spentByClass = new Map<UnitRecord["id"], ResourceCount>();
  for (const spent of spentHitDice) {
    if (spentByClass.has(spent.classUnitId)) {
      return characterSheetIssue("Spent Hit Dice state must not duplicate.");
    }
    spentByClass.set(spent.classUnitId, spent.spent);
  }
  const capacityByClass = new Map(
    capacity.right.map((pool) => [pool.classUnitId, pool]),
  );
  const result = [];
  for (const spent of spentHitDice) {
    const pool = capacityByClass.get(spent.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Spent Hit Dice state must match build Hit Dice exactly.",
      );
    }
    if (
      !Number.isInteger(spent.spent) ||
      spent.spent < 0 ||
      spent.spent > pool.total
    ) {
      return characterSheetIssue(
        "Spent Hit Dice state cannot exceed build Hit Dice.",
      );
    }
    if (spent.spent > 0) {
      result.push({
        classUnitId: spent.classUnitId,
        spent: resourceCount(spent.spent),
      });
    }
  }
  return Either.right(result);
}

function restFeatureUsesFromInput(
  input: Pick<CharacterSheetInput, "build" | "restFeatureUses" | "unitLibrary">,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  const uses = input.restFeatureUses ?? [];
  const usedFeatureTags = new Set<string>();
  for (const use of uses) {
    if (use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    const useKey = restFeatureUseStateKey(use);
    if (usedFeatureTags.has(useKey)) {
      return characterSheetIssue("Rest feature use state must not duplicate.");
    }
    const featureUseState = restFeatureUseStateMatchesBuild(input, use);
    if (Either.isLeft(featureUseState))
      return Either.left(featureUseState.left);
    usedFeatureTags.add(useKey);
  }
  return Either.right([...uses]);
}

function restFeatureUseStateKey(use: CharacterSheetRestFeatureUse): string {
  return use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG
    ? `${use.tag}:${use.spellId}`
    : use.tag;
}

function restFeatureUseStateMatchesBuild(
  input: Pick<CharacterSheetInput, "build" | "unitLibrary">,
  use: CharacterSheetRestFeatureUse,
): Either.Either<void, CharacterSheetIssue> {
  if (use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG) {
    const profile = characterSheetSpellRestBenefitProfile({
      spellId: use.spellId,
      unitLibrary: input.unitLibrary,
    });
    if (Either.isLeft(profile)) {
      return characterSheetIssue(
        "Spell recipient rest lockout requires an admitted spell rest-benefit profile.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        restSpellSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        pactSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Magical Cunning rest feature use requires the Warlock Magical Cunning feature.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === UNCANNY_METABOLISM_REST_FEATURE_TAG) {
    const facts = characterBuildMonkUncannyMetabolismFacts(input);
    if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
    if (facts.right === undefined) {
      return characterSheetIssue(
        "Uncanny Metabolism rest feature use requires the Monk Uncanny Metabolism feature.",
      );
    }
    return Either.right(undefined);
  }
  return characterSheetIssue("Expected supported rest feature use state.");
}

function conditionsFromInput(
  conditions: readonly CharacterSheetCondition[],
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  const active = new Set<CharacterSheetCondition>();
  for (const condition of conditions) {
    if (!CHARACTER_SHEET_CONDITIONS.some((allowed) => allowed === condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    if (active.has(condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must not duplicate.",
      );
    }
    active.add(condition);
  }
  return Either.right([...conditions]);
}

function magicalCunningRecoveredPactSlots(input: {
  readonly pactSlots: CharacterSheetPactSlotState;
  readonly profile: CharacterSheetPactSlotRecoveryProfile;
}): ResourceCount {
  return Match.value(input.profile.feature.mechanics.recoveryCap.kind).pipe(
    Match.when("half_maximum_rounded_up", () =>
      resourceCount(Math.ceil(input.pactSlots.count / 2)),
    ),
    Match.exhaustive,
  );
}

function pactSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheetPactSlotRecoveryProfile, CharacterSheetIssue> {
  const profiles: CharacterSheetPactSlotRecoveryProfile[] = [];
  for (const classUnitId of progressionClassUnitIds(build.progression)) {
    const unit = getRequiredUnit(unitLibrary, classUnitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const facts = readClassCreationFacts(unit.right);
    if (facts.tag !== "readable") continue;
    const classLevel = classLevelForUnit(build.progression, classUnitId);
    for (const grant of facts.value.featureGrants) {
      if (grant.level > classLevel) continue;
      const feature = unitLibrary.getUnit(grant.unitId);
      if (
        Option.isSome(feature) &&
        isPactSlotRecoveryFeature(feature.value) &&
        unit.right.kind === "class" &&
        unit.right.className === feature.value.className
      ) {
        profiles.push({ feature: feature.value, classUnitId });
      }
    }
  }
  if (profiles.length === 0) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  if (profiles.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Pact Slot recovery feature.",
    );
  }
  const profile = profiles[0];
  if (profile === undefined) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  return Either.right(profile);
}

function isPactSlotRecoveryFeature(
  unit: UnitRecord,
): unit is CharacterSheetPactSlotRecoveryFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "pact_slot_recovery" &&
    unit.mechanics.activationCost.kind === "one_minute_rite" &&
    unit.mechanics.resource.kind === "pact_slots" &&
    unit.mechanics.resource.source === "class_record_pact_magic" &&
    unit.mechanics.requiresExpendedSlots === true &&
    unit.mechanics.recoveryCap.kind === "half_maximum_rounded_up" &&
    unit.mechanics.resetCadence.kind === "long_rest"
  );
}

type ParsedStoredHitPoints = {
  readonly currentHp: HpType;
  readonly tempHp: HpType;
  readonly positiveHpUnconscious?: CharacterSheetPositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterSheetZeroHpLifecycleInput;
};

function parseStoredHitPoints(
  value: unknown,
): Either.Either<ParsedStoredHitPoints, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected Character Sheet hit points.");
  const tempHp =
    value.tempHp === undefined ? Either.right(Hp(0)) : parseHp(value.tempHp);
  if (Either.isLeft(tempHp)) return Either.left(tempHp.left);
  if (value.tag === "positive") {
    const currentHp = parseHp(value.currentHp);
    return Either.isLeft(currentHp)
      ? Either.left(currentHp.left)
      : Either.right({ currentHp: currentHp.right, tempHp: tempHp.right });
  }
  if (value.tag === "knockedOut") {
    return Either.right({
      currentHp: Hp(1),
      tempHp: tempHp.right,
      positiveHpUnconscious: CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
    });
  }
  if (value.tag !== "zero") {
    return characterSheetIssue("Expected Character Sheet hit point state.");
  }
  const lifecycle = parseStoredZeroHpLifecycle(value.lifecycle);
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({
        currentHp: Hp(0),
        tempHp: tempHp.right,
        zeroHpLifecycle: lifecycle.right,
      });
}

function parseStoredZeroHpLifecycle(
  value: unknown,
): Either.Either<CharacterSheetZeroHpLifecycleInput, CharacterSheetIssue> {
  if (!isRecord(value))
    return characterSheetIssue("Expected zero-HP lifecycle.");
  if (value.tag === "stable") {
    const recovery = parseStoredStableRecovery(value.recovery);
    return Either.isLeft(recovery)
      ? Either.left(recovery.left)
      : Either.right({ tag: "stable", recovery: recovery.right });
  }
  if (value.tag !== "unstable" && value.tag !== "dead") {
    return characterSheetIssue("Expected zero-HP lifecycle state.");
  }
  const deathSaves = parseStoredDeathSaves(value.deathSaves);
  return Either.isLeft(deathSaves)
    ? Either.left(deathSaves.left)
    : Either.right({ tag: value.tag, deathSaves: deathSaves.right });
}

function parseStoredStableRecovery(
  value: unknown,
): Either.Either<CharacterSheetStableRecovery, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (value.kind === "regains1HpAfter1d4Hours") {
    if (typeof value.elapsedBeforeRecoveryRoll !== "number") {
      return characterSheetIssue(
        "Stable recovery elapsed time must be elapsed-time ticks.",
      );
    }
    const elapsedBeforeRecoveryRoll = parseElapsedTimeTicks(
      value.elapsedBeforeRecoveryRoll,
    );
    return Either.isLeft(elapsedBeforeRecoveryRoll)
      ? characterSheetIssue(
          "Stable recovery elapsed time must be elapsed-time ticks.",
        )
      : Either.right({
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedBeforeRecoveryRoll.right,
        });
  }
  if (value.kind !== "regains1HpAfter") {
    return characterSheetIssue("Expected Stable recovery state.");
  }
  if (typeof value.remaining !== "number") {
    return characterSheetIssue(
      "Stable recovery remaining time must be positive elapsed-time ticks.",
    );
  }
  const remaining = parsePositiveElapsedTimeTicks(value.remaining);
  return Either.isLeft(remaining)
    ? characterSheetIssue(
        "Stable recovery remaining time must be positive elapsed-time ticks.",
      )
    : Either.right({ kind: "regains1HpAfter", remaining: remaining.right });
}

function parseStoredDeathSaves(
  value: unknown,
): Either.Either<DeathSaves, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected death saves.");
  if (!isDeathSaveCount(value.successes) || !isDeathSaveCount(value.failures)) {
    return characterSheetIssue("Death saves must be counts from 0 to 3.");
  }
  return Either.right({ successes: value.successes, failures: value.failures });
}

function parseStoredSpellSlots(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(build)) {
    return value.spellSlotExpenditures === undefined &&
      value.createdSpellSlots === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
        );
  }
  if (!Array.isArray(value.spellSlotExpenditures)) {
    return characterSheetIssue(
      "Spellcasting Character Sheet requires Spell Slot state.",
    );
  }
  const spellSlotExpenditures: CharacterSpellSlotExpenditure[] = [];
  const expenditureLevels = new Set<number>();
  const buildSlots = characterBuildSpellcastingSlotCapacity(build);
  for (const expenditure of value.spellSlotExpenditures) {
    if (!isRecord(expenditure)) {
      return characterSheetIssue("Expected Spell Slot expenditure.");
    }
    const spellLevel = parseSpellSlotLevel(expenditure.spellLevel);
    const expended = parseResourceCount(expenditure.expended);
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    if (expenditureLevels.has(spellLevel.right)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    expenditureLevels.add(spellLevel.right);
    const capacity = buildSlots.find(
      (slot) => slot.spellLevel === spellLevel.right,
    );
    if (capacity === undefined) {
      return characterSheetIssue(
        "Spell Slot state does not match build capacity.",
      );
    }
    if (expended.right > capacity.count) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${capacity.spellLevel}.`,
      );
    }
    spellSlotExpenditures.push({
      spellLevel: spellLevel.right,
      expended: expended.right,
    });
  }
  for (const buildSlot of buildSlots) {
    if (!expenditureLevels.has(buildSlot.spellLevel)) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${buildSlot.spellLevel}.`,
      );
    }
  }
  const createdSpellSlots = parseStoredCreatedSpellSlots(
    value.createdSpellSlots,
  );
  if (Either.isLeft(createdSpellSlots)) {
    return Either.left(createdSpellSlots.left);
  }
  return validateSpellSlotSourceState({
    build,
    unitLibrary,
    spellSlotState: {
      ordinarySpellSlotExpenditures: spellSlotExpenditures,
      createdSpellSlots: createdSpellSlots.right,
    },
  });
}

function parseStoredCreatedSpellSlots(
  value: unknown,
): Either.Either<
  readonly CharacterSheetCreatedSpellSlotState[],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Created Spell Slot state must be a list.");
  }
  const slots: CharacterSheetCreatedSpellSlotState[] = [];
  const levels = new Set<number>();
  for (const slot of value) {
    if (!isRecord(slot)) {
      return characterSheetIssue("Expected Created Spell Slot state.");
    }
    const spellLevel = parseSpellSlotLevel(slot.spellLevel);
    const count = parsePositiveResourceCount(slot.count);
    const expended = parseResourceCount(slot.expended);
    if (Either.isLeft(spellLevel)) return Either.left(spellLevel.left);
    if (Either.isLeft(count)) return Either.left(count.left);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    if (levels.has(spellLevel.right)) {
      return characterSheetIssue(
        "Created Spell Slot state must not duplicate spell levels.",
      );
    }
    levels.add(spellLevel.right);
    if (expended.right > count.right) {
      return characterSheetIssue(
        "Created Spell Slot expenditure cannot exceed count.",
      );
    }
    slots.push({
      spellLevel: spellLevel.right,
      count: count.right,
      expended: expended.right,
    });
  }
  return Either.right(slots);
}

function parseStoredPactSlots(
  build: CharacterBuild,
  value: Readonly<Record<string, unknown>>,
): Either.Either<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  const pactMagic = characterBuildPactSlotCapacity(build);
  if (pactMagic === undefined) {
    return value.pactSlotExpenditure === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet without Pact Magic cannot carry Pact Slot state.",
        );
  }
  if (!isRecord(value.pactSlotExpenditure)) {
    return characterSheetIssue(
      "Pact Magic Character Sheet requires Pact Slot state.",
    );
  }
  const expended = parseResourceCount(value.pactSlotExpenditure.expended);
  if (Either.isLeft(expended)) return Either.left(expended.left);
  if (expended.right > pactMagic.count) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return Either.right({
    expended: expended.right,
  });
}

function parseStoredSpentHitDice(
  value: unknown,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires spent Hit Dice state.",
    );
  }
  const spentHitDice = [];
  for (const spent of value) {
    if (!isRecord(spent) || typeof spent.classUnitId !== "string") {
      return characterSheetIssue("Expected spent Hit Dice state.");
    }
    const spentCount = parseResourceCount(spent.spent);
    if (Either.isLeft(spentCount)) return Either.left(spentCount.left);
    spentHitDice.push({
      classUnitId: spent.classUnitId,
      spent: spentCount.right,
    });
  }
  return Either.right(spentHitDice);
}

function parseStoredConditions(
  value: unknown,
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Sheet requires condition state.");
  }
  const conditions: CharacterSheetCondition[] = [];
  for (const condition of value) {
    if (typeof condition !== "string") {
      return characterSheetIssue("Expected Character Sheet condition.");
    }
    const supportedCondition = CHARACTER_SHEET_CONDITIONS.find(
      (allowed) => allowed === condition,
    );
    if (supportedCondition === undefined) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    conditions.push(supportedCondition);
  }
  return conditionsFromInput(conditions);
}

function parseStoredResourceExpenditures(
  value: unknown,
): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires resource expenditure state.",
    );
  }
  const expenditures: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of value) {
    if (
      !isRecord(expenditure) ||
      (expenditure.tag !== "layOnHandsHealingPool" &&
        expenditure.tag !== "useCountResource" &&
        expenditure.tag !== "pointPoolResource" &&
        !isSupportedClassFeatureSpellFreeCastResourceTag(expenditure.tag))
    ) {
      return characterSheetIssue(
        "Expected Character Sheet resource expenditure.",
      );
    }
    const expended = parseResourceCount(expenditure.expended);
    if (Either.isLeft(expended)) return Either.left(expended.left);
    if (expenditure.tag === "useCountResource") {
      const unitId = parseUseCountResourceExpenditureUnitId(expenditure);
      if (Either.isLeft(unitId)) return Either.left(unitId.left);
      expenditures.push({
        tag: expenditure.tag,
        unitId: unitId.right,
        expended: expended.right,
      });
      continue;
    }
    if (expenditure.tag === "pointPoolResource") {
      const unitId = parsePointPoolResourceExpenditureUnitId(expenditure);
      if (Either.isLeft(unitId)) return Either.left(unitId.left);
      expenditures.push({
        tag: expenditure.tag,
        unitId: unitId.right,
        expended: expended.right,
      });
      continue;
    }
    expenditures.push({ tag: expenditure.tag, expended: expended.right });
  }
  return Either.right(expenditures);
}

function parseStoredDruidWildShapeKnownForms(
  value: unknown,
): Either.Either<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (
    !isRecord(value) ||
    !Array.isArray(value.statBlockIds) ||
    value.statBlockIds.some((statBlockId) => typeof statBlockId !== "string")
  ) {
    return characterSheetIssue("Expected Wild Shape known-form state.");
  }
  return Either.right({
    statBlockIds: value.statBlockIds,
  });
}

function parseStoredDruidCircleLand(
  value: unknown,
): Either.Either<
  CharacterSheetDruidCircleLand | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value) || !isDruidCircleLandChoice(value.land)) {
    return characterSheetIssue(
      "Expected Circle of the Land selected land state.",
    );
  }
  return Either.right({ land: value.land });
}

function parseUseCountResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Either.Either<UnitRecord["id"], CharacterSheetIssue> {
  if (typeof expenditure.unitId !== "string") {
    return characterSheetIssue(
      "Character Sheet use-count expenditure requires a supported class feature Unit id.",
    );
  }
  return Either.right(expenditure.unitId);
}

function parsePointPoolResourceExpenditureUnitId(
  expenditure: Record<string, unknown>,
): Either.Either<CharacterSheetPointPoolResourceUnitId, CharacterSheetIssue> {
  if (
    typeof expenditure.unitId !== "string" ||
    !isCharacterSheetPointPoolResourceUnitId(expenditure.unitId)
  ) {
    return characterSheetIssue(
      "Character Sheet point-pool expenditure requires a supported class feature Unit id.",
    );
  }
  return Either.right(expenditure.unitId);
}

function parseStoredRestFeatureUses(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: unknown,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  if (value === undefined) return Either.right([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Expected Character Sheet rest feature uses.");
  }
  const uses: CharacterSheetRestFeatureUse[] = [];
  for (const use of value) {
    if (!isRecord(use)) {
      return characterSheetIssue("Expected Character Sheet rest feature use.");
    }
    if (
      (use.tag !== ARCANE_RECOVERY_REST_FEATURE_TAG &&
        use.tag !== MAGICAL_CUNNING_REST_FEATURE_TAG &&
        use.tag !== UNCANNY_METABOLISM_REST_FEATURE_TAG &&
        use.tag !== SPELL_RECIPIENT_REST_LOCKOUT_TAG) ||
      use.usedSinceLongRest !== true
    ) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    if (use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG) {
      if (typeof use.spellId !== "string") {
        return characterSheetIssue(
          "Spell recipient rest lockout requires a spell Unit id.",
        );
      }
      uses.push({
        tag: use.tag,
        spellId: use.spellId,
        usedSinceLongRest: true,
      });
      continue;
    }
    uses.push({ tag: use.tag, usedSinceLongRest: true });
  }
  return restFeatureUsesFromInput({
    build,
    unitLibrary,
    restFeatureUses: uses,
  });
}

function parseResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected nonnegative resource count.");
}

function parsePositiveResourceCount(
  value: unknown,
): Either.Either<ResourceCount, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(resourceCount(value))
    : characterSheetIssue("Expected positive resource count.");
}

function parseSpellSlotLevel(
  value: unknown,
): Either.Either<SpellSlotLevel, CharacterSheetIssue> {
  return isPositiveInteger(value)
    ? Either.right(spellSlotLevel(value))
    : characterSheetIssue("Expected positive Spell Slot level.");
}

function parseCharacterBuild(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterBuild, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Build.");
  const progression = parseStoredProgression(value.progression);
  if (Either.isLeft(progression)) return Either.left(progression.left);
  if (typeof value.background !== "string") {
    return characterSheetIssue("Character Build requires background Unit id.");
  }
  if (typeof value.species !== "string") {
    return characterSheetIssue("Character Build requires species Unit id.");
  }
  const originLanguages = parseStoredOriginLanguages(value.originLanguages);
  if (Either.isLeft(originLanguages)) return Either.left(originLanguages.left);
  const alignment = parseStoredAlignment(value.alignment);
  if (Either.isLeft(alignment)) return Either.left(alignment.left);
  const abilityScores = parseStoredAbilityScores(value.abilityScores);
  if (Either.isLeft(abilityScores)) return Either.left(abilityScores.left);
  const proficiencyChoices = parseStoredProficiencyChoices(
    value.proficiencyChoices,
  );
  if (Either.isLeft(proficiencyChoices)) {
    return Either.left(proficiencyChoices.left);
  }
  const speciesChoiceFacts = parseStoredSpeciesChoiceFacts(
    value.species,
    value.speciesChoiceFacts,
    unitLibrary,
  );
  if (Either.isLeft(speciesChoiceFacts)) {
    return Either.left(speciesChoiceFacts.left);
  }
  const features = parseStoredFeatures(value.features, unitLibrary);
  if (Either.isLeft(features)) return Either.left(features.left);
  const classFeatureLanguages = parseStoredClassFeatureLanguages({
    value: value.classFeatureLanguages,
    originLanguages: originLanguages.right,
    build: { progression: progression.right },
    unitLibrary,
  });
  if (Either.isLeft(classFeatureLanguages)) {
    return Either.left(classFeatureLanguages.left);
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcasting(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const equipment = parseStoredEquipment(value.equipment);
  if (Either.isLeft(equipment)) return Either.left(equipment.left);

  const build: CharacterBuild = {
    progression: progression.right,
    background: value.background,
    species: value.species,
    originLanguages: originLanguages.right,
    classFeatureLanguages: classFeatureLanguages.right,
    alignment: alignment.right,
    abilityScores: abilityScores.right,
    proficiencyChoices: proficiencyChoices.right,
    ...(speciesChoiceFacts.right === undefined
      ? {}
      : { speciesChoiceFacts: speciesChoiceFacts.right }),
    features: features.right,
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    equipment: equipment.right,
  };
  const bookOfShadowsIssue = storedBookOfShadowsSelectionIssue(
    build,
    unitLibrary,
  );
  if (Either.isLeft(bookOfShadowsIssue)) {
    return Either.left(bookOfShadowsIssue.left);
  }
  const eldritchInvocationIssue =
    storedEldritchInvocationKnownCantripSelectionIssue(build, unitLibrary);
  if (Either.isLeft(eldritchInvocationIssue)) {
    return Either.left(eldritchInvocationIssue.left);
  }
  const sorcererMetamagicIssue = storedSorcererMetamagicSelectionIssue(
    build,
    unitLibrary,
  );
  return Either.isLeft(sorcererMetamagicIssue)
    ? Either.left(sorcererMetamagicIssue.left)
    : Either.right(build);
}

type DraconicAncestryDamageTypeSource =
  DragonbornSpeciesRecord["draconicAncestry"]["damageType"];

function parseStoredSpeciesChoiceFacts(
  speciesId: UnitRecord["id"],
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterBuildSpeciesChoiceFacts | undefined,
  CharacterSheetIssue
> {
  const source = storedDraconicAncestryDamageTypeSource(speciesId, unitLibrary);
  if (Either.isLeft(source)) return Either.left(source.left);
  if (value === undefined) {
    return source.right === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Build requires selected Draconic Ancestry fact for species with a Draconic Ancestry source.",
        );
  }
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Expected Character Build species choice facts.",
    );
  }
  if (
    Object.keys(value).some((key) => key !== "draconicAncestry") ||
    !Object.hasOwn(value, "draconicAncestry")
  ) {
    return characterSheetIssue(
      "Character Build species choice facts must contain exactly supported species choice facts.",
    );
  }
  if (source.right === undefined) {
    return characterSheetIssue(
      "Character Build cannot carry Draconic Ancestry fact for species without a Draconic Ancestry source.",
    );
  }
  const draconicAncestry = parseStoredDraconicAncestryFact(
    value.draconicAncestry,
    source.right,
  );
  return Either.isLeft(draconicAncestry)
    ? Either.left(draconicAncestry.left)
    : Either.right({ draconicAncestry: draconicAncestry.right });
}

function storedDraconicAncestryDamageTypeSource(
  speciesId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): Either.Either<
  DraconicAncestryDamageTypeSource | undefined,
  CharacterSheetIssue
> {
  const speciesUnit = unitLibrary.getUnit(speciesId);
  if (Option.isNone(speciesUnit)) {
    return characterSheetIssue("Character Build species Unit id is unknown.");
  }
  if (speciesUnit.value.kind !== "species") {
    return characterSheetIssue(
      "Character Build species Unit id must reference a species Unit.",
    );
  }
  return Either.right(
    "draconicAncestry" in speciesUnit.value
      ? speciesUnit.value.draconicAncestry.damageType
      : undefined,
  );
}

function parseStoredDraconicAncestryFact(
  value: unknown,
  source: DraconicAncestryDamageTypeSource,
): Either.Either<
  NonNullable<CharacterBuildSpeciesChoiceFacts["draconicAncestry"]>,
  CharacterSheetIssue
> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Expected Character Build Draconic Ancestry fact.",
    );
  }
  if (
    Object.keys(value).some((key) => key !== "kind" && key !== "ancestorId") ||
    value.kind !== "draconicAncestry" ||
    typeof value.ancestorId !== "string"
  ) {
    return characterSheetIssue(
      "Character Build Draconic Ancestry fact must contain exactly selected ancestry fact fields.",
    );
  }
  const selected = source.options.find(
    (option) => option.id === value.ancestorId,
  );
  if (selected === undefined) {
    return characterSheetIssue(
      "Character Build Draconic Ancestry fact must reference the selected species source table.",
    );
  }
  return Either.right({
    kind: "draconicAncestry",
    ancestorId: characterDraconicAncestrySelection(value.ancestorId),
  });
}

function storedSorcererMetamagicSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const facts = characterBuildSorcererMetamagicFacts({ build, unitLibrary });
  return Either.isLeft(facts)
    ? characterSheetIssue(facts.left.message)
    : Either.right(undefined);
}

function storedEldritchInvocationKnownCantripSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const knownWarlockCantrips = knownWarlockCantripIdsForStoredBuild(
    build,
    unitLibrary,
  );
  for (const feature of build.features) {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.kind !== "repeatable" ||
      feature.selection.repeatableChoice.kind !== "knownWarlockCantrip"
    ) {
      continue;
    }
    if (
      !knownWarlockCantrips.has(feature.selection.repeatableChoice.cantripId)
    ) {
      return characterSheetIssue(
        "Character Build Eldritch Invocation repeatable known cantrip choice must be a known Warlock cantrip.",
      );
    }
  }
  return Either.right(undefined);
}

function knownWarlockCantripIdsForStoredBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReadonlySet<UnitRecord["id"]> {
  const cantripIds = new Set<UnitRecord["id"]>();
  for (const source of build.spellcasting?.sources ?? []) {
    const sourceClassName = classUnitIdToClassName({
      unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    if (Either.isLeft(sourceClassName) || sourceClassName.right !== "warlock") {
      continue;
    }
    for (const cantripId of source.cantrips) {
      if (allCantripsFromClassSpellList("warlock", [cantripId])) {
        cantripIds.add(cantripId);
      }
    }
  }
  return cantripIds;
}

function parseStoredProgression(
  value: unknown,
): Either.Either<CharacterBuild["progression"], CharacterSheetIssue> {
  if (!isRecord(value) || typeof value.startingClass !== "string") {
    return characterSheetIssue("Character Build requires progression.");
  }
  if (!Array.isArray(value.advancements)) {
    return characterSheetIssue(
      "Character Build progression requires advancements.",
    );
  }
  const advancements = [];
  for (const advancement of value.advancements) {
    if (
      !isRecord(advancement) ||
      typeof advancement.classUnitId !== "string" ||
      !isRecord(advancement.hitPointRule) ||
      advancement.hitPointRule.tag !== "fixedHigherLevelGain"
    ) {
      return characterSheetIssue(
        "Character Build progression advancement is invalid.",
      );
    }
    advancements.push({
      classUnitId: classUnitId(advancement.classUnitId),
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    });
  }
  const totalLevel = 1 + advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return characterSheetIssue("Character Build progression is invalid.");
  }
  return Either.right({
    startingClass: classUnitId(value.startingClass),
    advancements,
  });
}

function storedBookOfShadowsSelectionIssue(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<void, CharacterSheetIssue> {
  const sources =
    build.spellcasting?.sources.filter(
      (source) => source.bookOfShadows !== undefined,
    ) ?? [];
  if (sources.length === 0) {
    return Either.right(undefined);
  }
  if (sources.length !== 1) {
    return characterSheetIssue(
      "Character Build supports one Book of Shadows Spell Access source.",
    );
  }
  if (!hasSelectedWarlockEldritchInvocation(build, unitLibrary)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires Pact of the Tome.",
    );
  }
  const source = sources[0];
  const access = source.bookOfShadows;
  if (access === undefined) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access source is missing its selection.",
    );
  }
  const sourceUnit = getRequiredUnit(unitLibrary, source.sourceUnitId);
  if (Either.isLeft(sourceUnit)) {
    return Either.left(sourceUnit.left);
  }
  if (
    sourceUnit.right.kind !== "class" ||
    sourceUnit.right.className !== "warlock"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access requires the Warlock spellcasting source.",
    );
  }
  const selectedSpellIds = [...access.cantrips, ...access.ritualSpells];
  if (new Set(selectedSpellIds).size !== selectedSpellIds.length) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access selections must be distinct.",
    );
  }
  const preparedOrKnown = new Set([
    ...source.cantrips,
    ...source.preparedSpells,
    ...featurePreparedSpellIdsForBuild(build, unitLibrary),
  ]);
  if (selectedSpellIds.some((spellId) => preparedOrKnown.has(spellId))) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
    );
  }
  if (!allCantripsFromAnyClassSpellList(access.cantrips)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList(
      access.ritualSpells.map((spellId) => ({ spellId, spellLevel: 1 })),
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells must be level-1 spells from class spell lists.",
    );
  }
  const cantrips = spellRecordsForIds(unitLibrary, access.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = spellRecordsForIds(unitLibrary, access.ritualSpells);
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  if (cantrips.right.some((spell) => spell.mechanics.level !== 0)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.right.some(
      (spell) =>
        spell.mechanics.level !== 1 ||
        !("ritual" in spell.mechanics.castingTime) ||
        spell.mechanics.castingTime.ritual !== true,
    )
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  return Either.right(undefined);
}

function hasSelectedWarlockEldritchInvocation(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): boolean {
  return build.features.some((feature) => {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.invocationId !==
        eldritchInvocationId("pact_of_the_tome")
    ) {
      return false;
    }
    const source = unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source) || source.value.kind !== "class_feature") {
      return false;
    }
    const mechanics = source.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function spellRecordsForIds(
  unitLibrary: UnitCatalog,
  spellIds: readonly UnitRecord["id"][],
): Either.Either<readonly SpellRecord[], CharacterSheetIssue> {
  const spells: SpellRecord[] = [];
  for (const spellId of spellIds) {
    const spell = getRequiredUnit(unitLibrary, spellId);
    if (Either.isLeft(spell)) {
      return Either.left(spell.left);
    }
    if (!isSpellRecord(spell.right)) {
      return characterSheetIssue(
        `Character Build Book of Shadows selection must reference Spell Definitions: ${spellId}`,
      );
    }
    spells.push(spell.right);
  }
  return Either.right(spells);
}

function isSpellRecord(unit: UnitRecord): unit is SpellRecord {
  return unit.kind === "spell";
}

function parseStoredOriginLanguages(
  value: unknown,
): Either.Either<CharacterBuild["originLanguages"], CharacterSheetIssue> {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value[0] !== "Common" ||
    !value.every(isStandardLanguage) ||
    new Set(value).size !== value.length
  ) {
    return characterSheetIssue("Character Build requires origin languages.");
  }
  return Either.right(value as unknown as CharacterBuild["originLanguages"]);
}

function parseStoredClassFeatureLanguages(input: {
  readonly value: unknown;
  readonly originLanguages: CharacterBuild["originLanguages"];
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuild["classFeatureLanguages"],
  CharacterSheetIssue
> {
  const { value, originLanguages, build, unitLibrary } = input;
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Build requires class-feature languages.",
    );
  }

  const knownLanguages = new Set<StoredClassFeatureLanguage>(originLanguages);
  const ownedClassFeatureUnitIds = new Set(
    storedClassFeatureLanguageSourceUnitIds(build, unitLibrary),
  );
  const expectedProjection = storedClassFeatureLanguageProjection({
    ownedClassFeatureUnitIds,
    unitLibrary,
  });
  if (Either.isLeft(expectedProjection)) {
    return Either.left(expectedProjection.left);
  }
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const classFeatureLanguages: StoredClassFeatureLanguageFact[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      (item.kind !== "classFeatureLanguageGrant" &&
        item.kind !== "classFeatureLanguageChoice") ||
      typeof item.sourceUnitId !== "string" ||
      !isLanguage(item.language)
    ) {
      return characterSheetIssue(
        "Character Build requires class-feature language facts.",
      );
    }
    const languageFact: StoredClassFeatureLanguageFact = {
      kind: item.kind,
      sourceUnitId: item.sourceUnitId,
      language: item.language,
    };

    if (!ownedClassFeatureUnitIds.has(languageFact.sourceUnitId)) {
      return characterSheetIssue(
        `Character Build class-feature language source Unit ${languageFact.sourceUnitId} is not owned by the build.`,
      );
    }
    if (knownLanguages.has(languageFact.language)) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    if (
      languageFact.kind === "classFeatureLanguageChoice" &&
      expectedProjection.right.fixedLanguages.has(languageFact.language)
    ) {
      return characterSheetIssue(
        `Duplicate Character Build language ${languageFact.language}.`,
      );
    }
    const sourceMatch = storedClassFeatureLanguageMatchesSourceUnit({
      languageFact,
      unitLibrary,
    });
    if (Either.isLeft(sourceMatch)) {
      return Either.left(sourceMatch.left);
    }
    if (languageFact.kind === "classFeatureLanguageChoice") {
      choiceCountsBySourceUnitId.set(
        languageFact.sourceUnitId,
        (choiceCountsBySourceUnitId.get(languageFact.sourceUnitId) ?? 0) + 1,
      );
    } else {
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(languageFact.sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(languageFact.language);
      fixedLanguagesBySourceUnitId.set(
        languageFact.sourceUnitId,
        sourceLanguages,
      );
    }

    knownLanguages.add(languageFact.language);
    classFeatureLanguages.push(languageFact);
  }

  for (const [sourceUnitId, expectedLanguages] of expectedProjection.right
    .fixedLanguagesBySourceUnitId) {
    const storedLanguages =
      fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
      new Set<StoredClassFeatureLanguage>();
    for (const expectedLanguage of expectedLanguages) {
      if (!storedLanguages.has(expectedLanguage)) {
        return characterSheetIssue(
          `Character Build class-feature language projection is incomplete for source Unit ${sourceUnitId}.`,
        );
      }
    }
  }

  for (const [sourceUnitId, expectedCount] of expectedProjection.right
    .choiceCountsBySourceUnitId) {
    const selectedCount = choiceCountsBySourceUnitId.get(sourceUnitId) ?? 0;
    if (selectedCount !== expectedCount) {
      return characterSheetIssue(
        `Character Build class-feature language choices for source Unit ${sourceUnitId} must match the source choice count.`,
      );
    }
  }

  return Either.right(classFeatureLanguages);
}

function storedClassFeatureLanguageSourceUnitIds(
  build: Pick<CharacterBuild, "progression">,
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  return progressionClassUnitIds(build.progression).flatMap((classUnitId) => {
    const unit = unitLibrary.getUnit(classUnitId);
    if (Option.isNone(unit)) return [];
    const facts = readClassCreationFacts(unit.value);
    if (facts.tag !== "readable") return [];
    return facts.value.featureGrants
      .filter(
        (grant) =>
          grant.level <= classLevelForUnit(build.progression, classUnitId),
      )
      .map((grant) => grant.unitId);
  });
}

function storedClassFeatureLanguageMatchesSourceUnit(input: {
  readonly languageFact: StoredClassFeatureLanguageFact;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<void, CharacterSheetIssue> {
  const sourceUnit = input.unitLibrary.getUnit(input.languageFact.sourceUnitId);
  if (
    Option.isNone(sourceUnit) ||
    sourceUnit.value.kind !== "class_feature" ||
    sourceUnit.value.mechanics.family !== "passive"
  ) {
    return characterSheetIssue(
      `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
    );
  }

  if (input.languageFact.kind === "classFeatureLanguageChoice") {
    return storedClassFeatureLanguageChoiceGrantCount(sourceUnit.value) ===
      undefined
      ? characterSheetIssue(
          `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
        )
      : Either.right(undefined);
  }

  const matches = sourceUnit.value.mechanics.grants.some((grant) => {
    if (grant.kind !== "grant_language") return false;
    const language = languageFromSurfaceLanguageId(grant.languageId);
    return (
      Either.isRight(language) && language.right === input.languageFact.language
    );
  });
  return matches
    ? Either.right(undefined)
    : characterSheetIssue(
        `Character Build class-feature language does not match source Unit ${input.languageFact.sourceUnitId}.`,
      );
}

function storedClassFeatureLanguageProjection(input: {
  readonly ownedClassFeatureUnitIds: ReadonlySet<UnitRecord["id"]>;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<StoredClassFeatureLanguageProjection, CharacterSheetIssue> {
  const fixedLanguagesBySourceUnitId = new Map<
    UnitRecord["id"],
    Set<StoredClassFeatureLanguage>
  >();
  const fixedLanguages = new Set<StoredClassFeatureLanguage>();
  const choiceCountsBySourceUnitId = new Map<UnitRecord["id"], number>();
  for (const sourceUnitId of input.ownedClassFeatureUnitIds) {
    const sourceUnit = input.unitLibrary.getUnit(sourceUnitId);
    if (
      Option.isNone(sourceUnit) ||
      sourceUnit.value.kind !== "class_feature" ||
      sourceUnit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    const choiceCount = storedClassFeatureLanguageChoiceGrantCount(
      sourceUnit.value,
    );
    if (choiceCount !== undefined) {
      choiceCountsBySourceUnitId.set(sourceUnitId, choiceCount);
    }
    for (const grant of sourceUnit.value.mechanics.grants) {
      if (grant.kind !== "grant_language") continue;
      const language = languageFromSurfaceLanguageId(grant.languageId);
      if (Either.isLeft(language)) {
        return characterSheetIssue(
          `Unsupported class-feature language id ${grant.languageId} on Unit ${sourceUnitId}.`,
        );
      }
      const sourceLanguages =
        fixedLanguagesBySourceUnitId.get(sourceUnitId) ??
        new Set<StoredClassFeatureLanguage>();
      sourceLanguages.add(language.right);
      fixedLanguagesBySourceUnitId.set(sourceUnitId, sourceLanguages);
      fixedLanguages.add(language.right);
    }
  }
  return Either.right({
    fixedLanguagesBySourceUnitId,
    fixedLanguages,
    choiceCountsBySourceUnitId,
  });
}

function storedClassFeatureLanguageChoiceGrantCount(
  sourceUnit: UnitRecord,
): number | undefined {
  if (
    sourceUnit.kind !== "class_feature" ||
    sourceUnit.mechanics.family !== "passive"
  ) {
    return undefined;
  }
  const choiceGrantCount = sourceUnit.mechanics.grants.reduce(
    (count, grant) =>
      grant.kind === "grant_language_choice" &&
      grant.source === "character_creation_language_tables"
        ? count + grant.count
        : count,
    0,
  );
  return choiceGrantCount === 0 ? undefined : choiceGrantCount;
}

function parseStoredAlignment(
  value: unknown,
): Either.Either<CharacterBuild["alignment"], CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !ALIGNMENT_ORDERS.some((order) => order === value.order) ||
    !ALIGNMENT_MORALITIES.some((morality) => morality === value.morality)
  ) {
    return characterSheetIssue("Character Build requires alignment.");
  }
  return Either.right(value as CharacterBuild["alignment"]);
}

function parseStoredAbilityScores(
  value: unknown,
): Either.Either<CharacterBuild["abilityScores"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Character Build requires ability scores.");
  }
  const scores = Object.fromEntries(
    ABILITIES.map((ability) => [ability, value[ability]]),
  );
  const parsed = abilityScoreAssignment(scores);
  return Either.isLeft(parsed)
    ? characterSheetIssue("Character Build ability scores are invalid.")
    : Either.right(parsed.right);
}

function parseStoredProficiencyChoices(
  value: unknown,
): Either.Either<
  readonly CharacterBuildProficiencyChoiceSubject[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires proficiency choices.");
  }
  const choices = [];
  for (const choice of value) {
    if (!isRecord(choice) || typeof choice.kind !== "string") {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
    if (
      choice.kind === "skill" &&
      SKILLS.some((skill) => skill === choice.skill)
    ) {
      choices.push({ kind: "skill", skill: choice.skill });
    } else if (
      choice.kind === "weapon_category" &&
      WEAPON_PROFICIENCY_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "weapon_category", category: choice.category });
    } else if (
      choice.kind === "armor_category" &&
      ARMOR_TRAINING_CATEGORY_VALUES.some(
        (category) => category === choice.category,
      )
    ) {
      choices.push({ kind: "armor_category", category: choice.category });
    } else if (choice.kind === "tool" && typeof choice.toolId === "string") {
      choices.push({ kind: "tool", toolId: choice.toolId });
    } else {
      return characterSheetIssue(
        "Character Build proficiency choice is invalid.",
      );
    }
  }
  return Either.right(
    choices as readonly CharacterBuildProficiencyChoiceSubject[],
  );
}

function parseStoredFeatures(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterBuildFeature[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Build requires features.");
  }
  const features = [];
  for (const feature of value) {
    if (!isRecord(feature) || typeof feature.selectedFromUnitId !== "string") {
      return characterSheetIssue("Character Build feature is invalid.");
    }
    if (
      feature.kind === "selectedClassChoice" &&
      typeof feature.unitId === "string"
    ) {
      features.push({
        kind: "selectedClassChoice" as const,
        unitId: feature.unitId,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
    } else if (
      feature.kind === "selectedEldritchInvocation" &&
      isRecord(feature.selection)
    ) {
      const selection = parseStoredEldritchInvocationSelection(
        feature.selection,
        unitLibrary,
      );
      if (Either.isLeft(selection)) {
        return Either.left(selection.left);
      }
      features.push({
        kind: "selectedEldritchInvocation" as const,
        selection: selection.right,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
    } else if (
      feature.kind === "selectedSorcererMetamagicOption" &&
      typeof feature.optionId === "string"
    ) {
      const optionId = sorcererMetamagicOptionId(feature.optionId);
      if (Either.isLeft(optionId)) {
        return characterSheetIssue(
          "Character Build Sorcerer Metamagic option selection is invalid.",
        );
      }
      features.push({
        kind: "selectedSorcererMetamagicOption" as const,
        optionId: optionId.right,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
    } else if (feature.kind === "abilityCheckBonus") {
      const abilityCheckBonus = parseStoredAbilityCheckBonusFeature({
        feature,
        selectedFromUnitId: feature.selectedFromUnitId,
      });
      if (Either.isLeft(abilityCheckBonus)) {
        return Either.left(abilityCheckBonus.left);
      }
      features.push(abilityCheckBonus.right);
    } else {
      return characterSheetIssue("Character Build feature is invalid.");
    }
  }
  return Either.right(features);
}

function parseStoredEldritchInvocationSelection(
  value: Readonly<Record<string, unknown>>,
  unitLibrary: UnitCatalog,
): Either.Either<
  Extract<
    CharacterBuildFeature,
    { readonly kind: "selectedEldritchInvocation" }
  >["selection"],
  CharacterSheetIssue
> {
  if (typeof value.invocationId !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const invocationId = eldritchInvocationId(value.invocationId);
  const option = eldritchInvocationOptionForInvocationId(invocationId);
  if (option === undefined) {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  if (option.repeatability.kind === "once") {
    return value.kind === "nonRepeatable"
      ? Either.right({ kind: "nonRepeatable", invocationId })
      : characterSheetIssue(
          "Character Build Eldritch Invocation selection is invalid.",
        );
  }

  if (value.kind !== "repeatable") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation selection is invalid.",
    );
  }
  const repeatableChoiceInput = value.repeatableChoice;
  const repeatableChoice = parseStoredEldritchInvocationRepeatableChoice(
    repeatableChoiceInput,
  );
  if (Either.isLeft(repeatableChoice)) {
    return Either.left(repeatableChoice.left);
  }

  return eldritchInvocationRepeatableChoiceSatisfiesRule({
    unitLibrary,
    choiceRule: option.repeatability.choice,
    repeatableChoice: repeatableChoice.right,
  })
    ? Either.right({
        kind: "repeatable",
        invocationId,
        repeatableChoice: repeatableChoice.right,
      })
    : characterSheetIssue(
        "Character Build Eldritch Invocation repeatable choice is invalid.",
      );
}

function parseStoredEldritchInvocationRepeatableChoice(
  value: unknown,
): Either.Either<
  CharacterBuildEldritchInvocationRepeatableChoice,
  CharacterSheetIssue
> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return characterSheetIssue(
      "Character Build Eldritch Invocation repeatable choice is invalid.",
    );
  }
  if (
    value.kind === "knownWarlockCantrip" &&
    typeof value.cantripId === "string"
  ) {
    return Either.right({
      kind: "knownWarlockCantrip",
      cantripId: value.cantripId,
    });
  }
  if (value.kind === "originFeat" && typeof value.featUnitId === "string") {
    return Either.right({
      kind: "originFeat",
      featUnitId: value.featUnitId,
    });
  }
  return characterSheetIssue(
    "Character Build Eldritch Invocation repeatable choice is invalid.",
  );
}

function parseStoredAbilityCheckBonusFeature(input: {
  readonly feature: Readonly<Record<string, unknown>>;
  readonly selectedFromUnitId: string;
}): Either.Either<CharacterBuildFeature, CharacterSheetIssue> {
  const { feature } = input;
  if (
    !Array.isArray(feature.skills) ||
    !feature.skills.every(isSurfaceSkill) ||
    !isAbility(feature.ability) ||
    !isRecord(feature.bonus) ||
    feature.bonus.kind !== "abilityModifier" ||
    !isAbility(feature.bonus.ability) ||
    typeof feature.bonus.minimum !== "number"
  ) {
    return characterSheetIssue("Character Build feature is invalid.");
  }

  return Either.right({
    kind: "abilityCheckBonus" as const,
    ability: feature.ability,
    skills: feature.skills,
    bonus: {
      kind: "abilityModifier" as const,
      ability: feature.bonus.ability,
      minimum: feature.bonus.minimum,
    },
    selectedFromUnitId: input.selectedFromUnitId,
  });
}

function parseStoredSpellcasting(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0
  ) {
    return characterSheetIssue(
      "Character Build spellcasting requires sources.",
    );
  }
  const sources = value.sources.map(parseStoredSpellcastingSource);
  const firstIssue = sources.find(Either.isLeft);
  if (firstIssue !== undefined) return Either.left(firstIssue.left);
  const slotPools = parseStoredSpellSlotPools(value.slotPools);
  if (Either.isLeft(slotPools)) return Either.left(slotPools.left);
  const parsedSources = sources
    .filter(Either.isRight)
    .map((source) => source.right);
  return Either.right({
    sources: parsedSources as unknown as CharacterBuildSpellcasting["sources"],
    slotPools: slotPools.right,
  });
}

function parseStoredSpellcastingSource(
  value: unknown,
): Either.Either<CharacterBuildSpellcastingSource, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    typeof value.sourceUnitId !== "string" ||
    !isAbility(value.spellcastingAbility) ||
    !isStringArray(value.cantrips) ||
    !isStringArray(value.spellbook) ||
    !isStringArray(value.preparedSpells) ||
    !Array.isArray(value.spellcastingFocuses)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting source is invalid.",
    );
  }
  const bookOfShadows =
    value.bookOfShadows === undefined
      ? undefined
      : parseStoredBookOfShadowsSpellAccess(value.bookOfShadows);
  if (bookOfShadows !== undefined && Either.isLeft(bookOfShadows)) {
    return Either.left(bookOfShadows.left);
  }
  return Either.right({
    sourceUnitId: value.sourceUnitId,
    spellcastingAbility: value.spellcastingAbility,
    cantrips: value.cantrips,
    spellbook: value.spellbook,
    preparedSpells: value.preparedSpells,
    spellcastingFocuses:
      value.spellcastingFocuses as readonly CharacterBuildSpellcastingFocus[],
    ...(bookOfShadows === undefined
      ? {}
      : { bookOfShadows: bookOfShadows.right }),
  });
}

function parseStoredBookOfShadowsSpellAccess(
  value: unknown,
): Either.Either<CharacterBuildBookOfShadowsSpellAccess, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    value.tag !== "bookOfShadows" ||
    value.spellcastingFocus !== "book_of_shadows"
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows Spell Access is invalid.",
    );
  }
  const cantrips = parseStoredBookOfShadowsCantripIds(value.cantrips);
  if (Either.isLeft(cantrips)) {
    return Either.left(cantrips.left);
  }
  const ritualSpells = parseStoredBookOfShadowsRitualSpellIds(
    value.ritualSpells,
  );
  if (Either.isLeft(ritualSpells)) {
    return Either.left(ritualSpells.left);
  }
  return Either.right({
    tag: value.tag,
    cantrips: cantrips.right,
    ritualSpells: ritualSpells.right,
    spellcastingFocus: value.spellcastingFocus,
  });
}

function parseStoredCharacterSheetBookOfShadowsPresence(
  build: CharacterBuild,
  value: unknown,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(build)) {
    return value === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  if (
    !isRecord(value) ||
    (value.tag !== "onPerson" && value.tag !== "notOnPerson")
  ) {
    return characterSheetIssue(
      "Character Sheet Book of Shadows presence is invalid.",
    );
  }
  return Either.right({ tag: value.tag });
}

function parseStoredBookOfShadowsCantripIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["cantrips"],
  CharacterSheetIssue
> {
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows cantrips are invalid.",
    );
  }
  const [first, second, third, ...extra] = value;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    extra.length !== 0
  ) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly three cantrips.",
    );
  }
  return Either.right([first, second, third]);
}

function parseStoredBookOfShadowsRitualSpellIds(
  value: unknown,
): Either.Either<
  CharacterBuildBookOfShadowsSpellAccess["ritualSpells"],
  CharacterSheetIssue
> {
  if (!isStringArray(value)) {
    return characterSheetIssue(
      "Character Build Book of Shadows Ritual spells are invalid.",
    );
  }
  const [first, second, ...extra] = value;
  if (first === undefined || second === undefined || extra.length !== 0) {
    return characterSheetIssue(
      "Character Build Book of Shadows requires exactly two Ritual spells.",
    );
  }
  return Either.right([first, second]);
}

function parseStoredSpellSlotPools(
  value: unknown,
): Either.Either<CharacterBuildSpellcasting["slotPools"], CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build spellcasting requires slot pools.",
    );
  }
  const spellcasting =
    value.spellcasting === undefined
      ? undefined
      : parseStoredSpellcastingSlotPool(value.spellcasting);
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return Either.left(spellcasting.left);
  }
  const pactMagic =
    value.pactMagic === undefined
      ? undefined
      : parseStoredPactMagicSlotPool(value.pactMagic);
  if (pactMagic !== undefined && Either.isLeft(pactMagic)) {
    return Either.left(pactMagic.left);
  }
  return Either.right({
    ...(spellcasting === undefined ? {} : { spellcasting: spellcasting.right }),
    ...(pactMagic === undefined ? {} : { pactMagic: pactMagic.right }),
  });
}

function parseStoredSpellcastingSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["spellcasting"]>,
  CharacterSheetIssue
> {
  if (
    !isRecord(value) ||
    value.kind !== "spellcasting" ||
    !Array.isArray(value.slots)
  ) {
    return characterSheetIssue(
      "Character Build spellcasting slot pool is invalid.",
    );
  }
  const slots = [];
  for (const slot of value.slots) {
    if (
      !isRecord(slot) ||
      !isPositiveInteger(slot.spellLevel) ||
      !isPositiveInteger(slot.count)
    ) {
      return characterSheetIssue(
        "Character Build Spell Slot capacity is invalid.",
      );
    }
    slots.push({ spellLevel: slot.spellLevel, count: slot.count });
  }
  return Either.right({ kind: "spellcasting", slots });
}

function parseStoredPactMagicSlotPool(
  value: unknown,
): Either.Either<
  NonNullable<CharacterBuildSpellcasting["slotPools"]["pactMagic"]>,
  CharacterSheetIssue
> {
  if (
    !isRecord(value) ||
    value.kind !== "pactMagic" ||
    !isPositiveInteger(value.slotLevel) ||
    !isPositiveInteger(value.count)
  ) {
    return characterSheetIssue(
      "Character Build Pact Magic slot pool is invalid.",
    );
  }
  return Either.right({
    kind: "pactMagic",
    slotLevel: value.slotLevel,
    count: value.count,
  });
}

function parseStoredEquipment(
  value: unknown,
): Either.Either<CharacterBuildEquipment, CharacterSheetIssue> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.owned) ||
    !isRecord(value.loadout)
  ) {
    return characterSheetIssue("Character Build requires equipment.");
  }
  const owned = [];
  for (const item of value.owned) {
    if (
      !isRecord(item) ||
      typeof item.itemId !== "string" ||
      typeof item.unitId !== "string"
    ) {
      return characterSheetIssue(
        "Character Build owned equipment item is invalid.",
      );
    }
    const parsedItemId = parseCharacterEquipmentItemId(item.itemId);
    if (Either.isLeft(parsedItemId)) {
      return characterSheetIssue(
        "Character Build owned equipment item id is invalid.",
      );
    }
    owned.push({ itemId: item.itemId, unitId: item.unitId });
  }
  const loadout = parseStoredLoadout(value.loadout);
  if (Either.isLeft(loadout)) return Either.left(loadout.left);
  return Either.right({
    owned,
    loadout: loadout.right,
  } as unknown as CharacterBuildEquipment);
}

function parseStoredLoadout(
  value: Readonly<Record<string, unknown>>,
): Either.Either<CharacterBuildEquipment["loadout"], CharacterSheetIssue> {
  const armor = parseOptionalEquipmentItemId(value.armor, "armor");
  if (Either.isLeft(armor)) return Either.left(armor.left);
  const shield = parseOptionalEquipmentItemId(value.shield, "shield");
  if (Either.isLeft(shield)) return Either.left(shield.left);
  const weapon = parseStoredMainWeapon(value.weapon);
  if (Either.isLeft(weapon)) return Either.left(weapon.left);
  const offHandWeapon = parseStoredOffHandWeapon(value.offHandWeapon);
  if (Either.isLeft(offHandWeapon)) return Either.left(offHandWeapon.left);
  return Either.right({
    ...(armor.right === undefined ? {} : { armor: armor.right }),
    ...(shield.right === undefined ? {} : { shield: shield.right }),
    ...(weapon.right === undefined ? {} : { weapon: weapon.right }),
    ...(offHandWeapon.right === undefined
      ? {}
      : { offHandWeapon: offHandWeapon.right }),
  } as CharacterBuildEquipment["loadout"]);
}

function parseStoredMainWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["weapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value) || value.grip !== "one_handed") {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "main");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue("Character Build weapon loadout is invalid.");
  }
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["weapon"]
    >["itemId"],
    grip: "one_handed",
  });
}

function parseStoredOffHandWeapon(
  value: unknown,
): Either.Either<
  CharacterBuildEquipment["loadout"]["offHandWeapon"],
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  const itemId = parseOptionalEquipmentItemId(value.itemId, "off");
  if (Either.isLeft(itemId)) return Either.left(itemId.left);
  if (itemId.right === undefined) {
    return characterSheetIssue(
      "Character Build off-hand weapon loadout is invalid.",
    );
  }
  return Either.right({
    itemId: itemId.right as NonNullable<
      CharacterBuildEquipment["loadout"]["offHandWeapon"]
    >["itemId"],
  });
}

function parseOptionalEquipmentItemId(
  value: unknown,
  slot: "armor" | "shield" | "main" | "off",
): Either.Either<
  CharacterBuildEquipment["owned"][number]["itemId"] | undefined,
  CharacterSheetIssue
> {
  if (value === undefined) return Either.right(undefined);
  if (typeof value !== "string") {
    return characterSheetIssue("Character Build equipment item id is invalid.");
  }
  const parsed = parseCharacterEquipmentItemId(value);
  if (Either.isLeft(parsed) || parsed.right.slot !== slot) {
    return characterSheetIssue(
      "Character Build equipment item slot is invalid.",
    );
  }
  return Either.right(
    value as CharacterBuildEquipment["owned"][number]["itemId"],
  );
}

function isAbility(value: unknown): value is Ability {
  return ABILITIES.some((ability) => ability === value);
}

function isSurfaceSkill(value: unknown): value is SurfaceSkill {
  return SURFACE_SKILLS.some((skill) => skill === value);
}

function isStandardLanguage(value: unknown): value is string {
  return STANDARD_LANGUAGES.some((language) => language === value);
}

function isLanguage(
  value: unknown,
): value is CharacterBuild["classFeatureLanguages"][number]["language"] {
  return LANGUAGES.some((language) => language === value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isDeathSaveCount(value: unknown): value is DeathSaveCount {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}
