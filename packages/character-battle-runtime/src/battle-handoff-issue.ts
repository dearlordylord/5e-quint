import {
  battleInitializationIssueFactFields,
  battleStateInitIssueLeaves,
  type BattleInitializationIssueFact,
  type BattleStateInitIssue,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { CharacterSheetIssue } from "@dnd/character-sheet-runtime";
import type { SpellSlotLevel } from "@dnd/shared/types";
import { Either } from "effect";

/** A named validation rule is the machine-readable handoff cause. */
export type CharacterSheetBattleHandoffValidationCheck =
  | "combatantNotCharacter"
  | "runtimeContextMissing"
  | "companionSheetSlotMissing"
  | "companionIdentityMismatch"
  | "retainedFormSelectionMissing"
  | "retainedFormAccessMismatch"
  | "companionCombatantMissing"
  | "companionHpNonPositive"
  | "characterIdentityMismatch"
  | "maximumHitPointMismatch"
  | "currentHitPointsExceedMaximum"
  | "mixedSpellAndPactSlotState"
  | "activeDruidWildShape"
  | "activeBattleLocalState"
  | "spellSlotStateMissing"
  | "duplicateBattleSpellSlotLevel"
  | "battleSpellSlotExpenditureExceedsCount"
  | "battleSpellSlotCapacityMismatch"
  | "battleSpellSlotExpenditureRegressed"
  | "battleSpellSlotLevelMismatch"
  | "battleSpellSlotExpenditureExceedsAvailable"
  | "classFeatureResourceClassLevelMissing"
  | "spellAccessFreeCastCapShapeInvalid"
  | "spellAccessFreeCastCapacityMismatch"
  | "spellAccessFreeCastRemainingUsesInvalid"
  | "classFeatureUseCountRemainingUsesInvalid"
  | "classFeatureUseCountCapacityMismatch"
  | "pointPoolRemainingPointsInvalid"
  | "pointPoolCapacityMismatch"
  | "resourceOwnershipLengthMismatch"
  | "duplicateResourceOwnership"
  | "duplicateMechanicalResourcePool"
  | "mechanicalResourceOwnershipMissing"
  | "pointPoolCapacityMissing"
  | "useCountCapacityMissing"
  | "freeCastCapacityMissing"
  | "wildShapeResourceDuplicate"
  | "wildShapeResourceTypeInvalid"
  | "wildShapeRemainingUsesMissing"
  | "wildShapeCapacityMismatch"
  | "wildShapeRemainingUsesInvalid"
  | "pactSlotCapacityMismatch"
  | "zeroHpLifecycleUnsupported"
  | "stableRecoveryUnsupported";

export type CharacterSheetBattleHandoffFact =
  | {
      readonly handoffReason: "validation";
      readonly check: CharacterSheetBattleHandoffValidationCheck;
    }
  | {
      readonly handoffReason: "spellSlotSourceAmbiguous";
      readonly spellLevel: SpellSlotLevel;
    }
  | ({
      readonly handoffReason: "battleInitialization";
    } & BattleInitializationIssueFact)
  | {
      readonly handoffReason: "battleInitializationUnavailable";
      readonly initializationTag: BattleStateInitIssue["tag"];
    }
  | {
      readonly handoffReason: "delegatedCharacterSheetIssue";
      readonly delegatedIssueTag: "characterSheetIssue";
    }
  | {
      readonly handoffReason: "retainedCompanionUnavailable";
    }
  | {
      readonly handoffReason: "companionAdmissionInput";
      readonly requirement:
        | "presentCombatantInitiativeAndPlacement"
        | "dismissedReappearanceCombatant";
    }
  | {
      readonly handoffReason: "companionFormCatalog";
      readonly cardinality: "none" | "multiple";
    }
  | {
      readonly handoffReason: "companionFormProtocol";
      readonly check: "specialFormRequiresPactProtocol";
    }
  | {
      readonly handoffReason: "companionFormProof";
      readonly check:
        | "challengeRatingZeroBeastSelectionMismatch"
        | "challengeRatingZeroBeastCatalogMissing"
        | "challengeRatingZeroBeastStatBlockMissing"
        | "challengeRatingZeroBeastFactsMismatch"
        | "specialFormSelectionMismatch"
        | "normalFormNotEligible"
        | "normalFormSelectionMismatch";
      readonly formId: string;
      readonly resolvedStatBlockId: string;
    }
  | {
      readonly handoffReason: "companionStoredForm";
      readonly check: "presentStatBlockMissing";
      readonly storedCompanionCombatantId: CombatantId;
    }
  | {
      readonly handoffReason: "companionStoredForm";
      readonly check: "retainedSelectionMismatch";
      readonly resolvedStatBlockId: string;
    };

export type CharacterSheetBattleHandoffIssue =
  | ({
      readonly tag: "characterSheetBattleHandoffIssue";
      readonly message: string;
    } & CharacterSheetBattleHandoffFact)
  | CharacterSheetIssue;

export function characterSheetBattleHandoffIssue(
  fact: CharacterSheetBattleHandoffFact,
  message: string,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return Either.left({
    tag: "characterSheetBattleHandoffIssue",
    message,
    ...fact,
  });
}

export function characterSheetBattleHandoffFactFromStateInit(
  issue: BattleStateInitIssue,
): CharacterSheetBattleHandoffFact {
  const [firstIssue] = battleStateInitIssueLeaves(issue);
  return "kind" in firstIssue
    ? {
        handoffReason: "battleInitialization",
        ...battleInitializationIssueFactFields(firstIssue),
      }
    : {
        handoffReason: "battleInitializationUnavailable",
        initializationTag: firstIssue.tag,
      };
}

export function characterSheetBattleHandoffFactFromIssue(
  issue: CharacterSheetBattleHandoffIssue,
): CharacterSheetBattleHandoffFact {
  if (issue.tag === "characterSheetBattleHandoffIssue") {
    const { tag: _tag, message: _message, ...fact } = issue;
    return fact;
  }
  return {
    handoffReason: "delegatedCharacterSheetIssue",
    delegatedIssueTag: issue.tag,
  };
}

/**
 * Keep delegated Character Sheet failures inside the structured handoff
 * algebra at the battle boundary. The source message remains presentation;
 * the delegated tag identifies the typed source domain.
 */
export function characterSheetBattleHandoffIssueFromIssue(
  issue: CharacterSheetBattleHandoffIssue,
): CharacterSheetBattleHandoffIssue {
  return issue.tag === "characterSheetBattleHandoffIssue"
    ? issue
    : {
        tag: "characterSheetBattleHandoffIssue",
        message: issue.message,
        ...characterSheetBattleHandoffFactFromIssue(issue),
      };
}
