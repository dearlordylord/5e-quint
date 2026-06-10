// KERNEL-COVERAGE: runtime-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.WEAPON_MASTERY.RESELECTION SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  weaponMasteryChoiceProfileForFeature,
  type CharacterBuild,
  type CharacterBuildFeature,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  Hp,
  resourceCount,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

export {
  createFreshCharacterSheet,
  parseCharacterSheet,
} from "./sheet-lifecycle.ts";
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
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  MAGICAL_CUNNING_REST_FEATURE_TAG,
  characterSheetIssue,
  characterSheetLongRestCompletionBrand,
  characterSheetLongRestStartBrand,
  characterSheetShortRestCompletionBrand,
  characterSheetShortRestStartBrand,
} from "./sheet-types.ts";
import type {
  CharacterSheet,
  CharacterSheetElapsedTimeResult,
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
  CharacterSheetShortRestCompletion,
  CharacterSheetShortRestCompletionInput,
  CharacterSheetShortRestInput,
  CharacterSheetShortRestInterruptionInput,
  CharacterSheetShortRestInterruptionOutcome,
  CharacterSheetShortRestStart,
  CharacterSheetShortRestStartInput,
  CharacterSheetTimePassedInput,
  CharacterSheetWeaponMasteryReselection,
} from "./sheet-types.ts";
import {
  characterSheetCurrentHp,
  characterSheetHitPoints,
  invalidElapsedTimeResult,
  passStableRecoveryTime,
} from "./hit-points.ts";
import {
  completeShortRestBenefits,
} from "./healing-rest-benefit.ts";
import {
  characterSheetPactSlots,
  isCharacterSheetWithSpellSlots,
} from "./spell-slots.ts";
import {
  magicalCunningRecoveredPactSlots,
  pactSlotRecoveryProfileForBuild,
} from "./sheet-lifecycle.ts";
import {
  druidCircleLandAfterLongRest,
  druidWildShapeKnownFormsAfterLongRest,
} from "./druid-features.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.weapon-mastery-reselection character-sheet.weapon-mastery-class-level-reselection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.pact-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-long-rest-use-state
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-prepared-spell-access
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.druid-circle-land-spell-access

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
