// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.failed-saving-throw-reroll
import type {
  Ability,
  ClassLevel,
  DieRollResult,
  DifficultyClass,
} from "@dnd/shared/types";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleUseCountResourceState,
} from "../character-battle-resources.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-admission.ts";

export type FailedSavingThrowRerollIssueReason =
  | "originalSavingThrowDidNotFail"
  | "resourceMismatch"
  | "resourceUnavailable";

export type FailedSavingThrowRerollIssue = {
  readonly tag: "failedSavingThrowRerollIssue";
  readonly reason: FailedSavingThrowRerollIssueReason;
  readonly message: string;
};

export type FailedSavingThrowRerollInput = {
  readonly execution: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "failedSavingThrowReroll" }
  >;
  readonly resource: CharacterBattleUseCountResourceState;
  readonly fighterLevel: ClassLevel;
  readonly failedSave: {
    readonly ability: Ability;
    readonly dc: DifficultyClass;
    readonly originalTotal: number;
    readonly originalNaturalD20: DieRollResult;
  };
  readonly replacementRoll: {
    readonly naturalD20: DieRollResult;
    readonly totalBeforeIndomitableBonus: number;
  };
};

export type FailedSavingThrowRerollResult =
  | {
      readonly tag: "resolved";
      readonly finalTotal: number;
      readonly succeeded: boolean;
      readonly mustUseNewRoll: true;
      readonly spentResource: CharacterBattleUseCountResourceState;
    }
  | {
      readonly tag: "invalid";
      readonly issue: FailedSavingThrowRerollIssue;
    };

export function resolveFailedSavingThrowReroll(
  input: FailedSavingThrowRerollInput,
): FailedSavingThrowRerollResult {
  if (input.failedSave.originalTotal >= input.failedSave.dc) {
    return failedSavingThrowRerollIssue(
      "originalSavingThrowDidNotFail",
      "Failed Saving Throw reroll requires an already-failed Saving Throw.",
    );
  }
  if (
    input.resource.resourcePoolRef !==
    input.execution.savingThrow.spends.resourcePoolRef
  ) {
    return failedSavingThrowRerollIssue(
      "resourceMismatch",
      "Failed Saving Throw reroll resource does not match the support profile.",
    );
  }
  if (!resourceHasUsesRemaining(input.resource)) {
    return failedSavingThrowRerollIssue(
      "resourceUnavailable",
      "Failed Saving Throw reroll resource has no uses remaining.",
    );
  }

  const finalTotal =
    input.replacementRoll.totalBeforeIndomitableBonus +
    Number(input.fighterLevel);
  return {
    tag: "resolved",
    finalTotal,
    succeeded: finalTotal >= input.failedSave.dc,
    mustUseNewRoll: true,
    spentResource: spendCharacterResourceUse(input.resource),
  };
}

function failedSavingThrowRerollIssue(
  reason: FailedSavingThrowRerollIssueReason,
  message: string,
): FailedSavingThrowRerollResult {
  return {
    tag: "invalid",
    issue: {
      tag: "failedSavingThrowRerollIssue",
      reason,
      message,
    },
  };
}
