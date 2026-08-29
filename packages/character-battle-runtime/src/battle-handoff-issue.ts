import {
  battleInitializationIssueFactFields,
  battleStateInitIssueMessage,
  battleStateInitIssueLeaves,
  type BattleInitializationIssueFact,
  type BattleStateInitIssue,
  type BattleStateInitLeafIssue,
  type CombatantId,
} from "@dnd/battle-runtime";
import type { CharacterSheetIssue } from "@dnd/character-sheet-runtime";
import type { ReadonlyNonEmptyArray, SpellSlotLevel } from "@dnd/shared/types";
import type { StatBlockId } from "@dnd/shared/game-facts";
import type {
  FindFamiliarNormalFormRef,
  PactOfTheChainSpecialFormRef,
} from "@dnd/surface/surface/find-familiar-forms";
import { Match } from "effect";
import { Result } from "effect";

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
      readonly initializationTag: "battleStateInitIssue";
    }
  | {
      readonly handoffReason: "battleInitializationUnavailable";
      readonly initializationTag: "weaponLoadoutMismatch";
      readonly slot: "main-hand" | "off-hand";
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
        | "challengeRatingZeroBeastFactsMismatch";
      readonly statBlockId: StatBlockId;
      readonly resolvedStatBlockId: StatBlockId;
    }
  | {
      readonly handoffReason: "companionFormProof";
      readonly check: "specialFormSelectionMismatch";
      readonly formId: PactOfTheChainSpecialFormRef["formId"];
      readonly resolvedStatBlockId: StatBlockId;
    }
  | {
      readonly handoffReason: "companionFormProof";
      readonly check: "normalFormNotEligible" | "normalFormSelectionMismatch";
      readonly formId: FindFamiliarNormalFormRef["formId"];
      readonly resolvedStatBlockId: StatBlockId;
    }
  | {
      readonly handoffReason: "companionStoredForm";
      readonly check: "presentStatBlockMissing";
      readonly storedCompanionCombatantId: CombatantId;
    }
  | {
      readonly handoffReason: "companionStoredForm";
      readonly check: "retainedSelectionMismatch";
      readonly resolvedStatBlockId: StatBlockId;
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
): Result.Result<never, CharacterSheetBattleHandoffIssue> {
  return Result.fail(characterSheetBattleHandoffIssueValue(fact, message));
}

export function characterSheetBattleHandoffIssueValue(
  fact: CharacterSheetBattleHandoffFact,
  message: string,
): CharacterSheetBattleHandoffIssue {
  return {
    tag: "characterSheetBattleHandoffIssue",
    message,
    ...fact,
  };
}

export function characterSheetBattleHandoffIssuesFromStateInit(
  issue: BattleStateInitIssue,
): ReadonlyNonEmptyArray<CharacterSheetBattleHandoffIssue> {
  const [firstIssue, ...restIssues] = battleStateInitIssueLeaves(issue);
  return [
    characterSheetBattleHandoffIssueFromStateInitLeaf(firstIssue),
    ...restIssues.map(characterSheetBattleHandoffIssueFromStateInitLeaf),
  ];
}

function characterSheetBattleHandoffFactFromStateInitLeaf(
  issue: BattleStateInitLeafIssue,
): CharacterSheetBattleHandoffFact {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssue" }, (matched) =>
      "kind" in matched
        ? {
            handoffReason: "battleInitialization" as const,
            ...battleInitializationIssueFactFields(matched),
          }
        : {
            handoffReason: "battleInitializationUnavailable" as const,
            initializationTag: "battleStateInitIssue" as const,
          },
    ),
    Match.when({ tag: "weaponLoadoutMismatch" }, ({ slot }) => ({
      handoffReason: "battleInitializationUnavailable" as const,
      initializationTag: "weaponLoadoutMismatch" as const,
      slot,
    })),
    Match.exhaustive,
  );
}

function characterSheetBattleHandoffIssueFromStateInitLeaf(
  issue: BattleStateInitLeafIssue,
): CharacterSheetBattleHandoffIssue {
  return characterSheetBattleHandoffIssueValue(
    characterSheetBattleHandoffFactFromStateInitLeaf(issue),
    battleStateInitIssueMessage(issue),
  );
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
