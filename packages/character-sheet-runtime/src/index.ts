import type { CharacterBuild } from "@dnd/character-creation-runtime";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared/elapsed-time";
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
  characterSheetLongRestCalendarGate,
  completeLongRest,
  completeMagicalCunningRite,
  completeShortRest,
  finishLongRest,
  finishShortRest,
  interruptLongRest,
  interruptShortRest,
  startLongRest,
  startShortRest,
} from "./rests.ts";
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
import type {
  CharacterSheetElapsedTimeResult,
  CharacterSheetTimePassedInput,
} from "./sheet-types.ts";
import {
  invalidElapsedTimeResult,
  passStableRecoveryTime,
} from "./hit-points.ts";

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
