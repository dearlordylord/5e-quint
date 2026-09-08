import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import {
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";

export type AfterHitMechanicsIssue<FailedFact extends string> = {
  readonly failedFact: FailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

export function afterHitMechanicsIssue<FailedFact extends string>(
  failedFact: FailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitMechanicsIssue<FailedFact> {
  return { failedFact, mechanicsPath };
}

export function afterHitRequiredFactIssues<FailedFact extends string>(
  supported: boolean,
  failedFact: FailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  return supported ? [] : [afterHitMechanicsIssue(failedFact, mechanicsPath)];
}

export function afterHitAdmissionRejection<
  Procedure extends BattleSpellProcedureKey,
  FailedFact extends string,
>(
  procedure: Procedure,
  issues: readonly AfterHitMechanicsIssue<FailedFact>[],
):
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<
        SpellProcedureAdmissionIssue<Procedure, FailedFact>
      >;
    }
  | undefined {
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues === undefined) return undefined;
  const [first, ...rest] = uniqueIssues;
  return {
    tag: "unsupported",
    issues: [
      afterHitAdmissionIssue(procedure, first),
      ...rest.map((issue) => afterHitAdmissionIssue(procedure, issue)),
    ],
  };
}

export function afterHitAdmissionIssue<
  Procedure extends BattleSpellProcedureKey,
  FailedFact extends string,
>(
  procedure: Procedure,
  issue: AfterHitMechanicsIssue<FailedFact>,
): SpellProcedureAdmissionIssue<Procedure, FailedFact> {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${issue.failedFact}.`,
  };
}

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

export function oneMinuteConcentrationAfterHitIssues<FailedFact extends string>(
  duration: OngoingSpellMechanics["duration"],
  failedFact: FailedFact,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  if (duration.kind !== "concentration") {
    return [
      afterHitMechanicsIssue(failedFact, spellMechanicsHeaderPath("duration")),
    ];
  }
  const issues: AfterHitMechanicsIssue<FailedFact>[] = [];
  if (duration.upTo.unit !== "minute" || duration.upTo.amount !== 1) {
    issues.push(afterHitMechanicsIssue(failedFact, spellDurationValuePath()));
  }
  issues.push(
    ...afterHitDurationEndingIssues(
      duration.earlyEnd?.length ?? 0,
      duration.permanentIfMaintainedFull === true,
      failedFact,
    ),
  );
  return issues;
}

export function oneMinuteTimedAfterHitIssues<FailedFact extends string>(
  duration: OngoingSpellMechanics["duration"],
  failedFact: FailedFact,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  if (duration.kind !== "timed") {
    return [
      afterHitMechanicsIssue(failedFact, spellMechanicsHeaderPath("duration")),
    ];
  }
  const issues: AfterHitMechanicsIssue<FailedFact>[] = [];
  if (duration.value.unit !== "minute" || duration.value.amount !== 1) {
    issues.push(afterHitMechanicsIssue(failedFact, spellDurationValuePath()));
  }
  issues.push(
    ...Array.from(
      { length: duration.value.upcastTiers?.length ?? 0 },
      (_unused, index) =>
        afterHitMechanicsIssue(
          failedFact,
          spellDurationExtensionPath(PositiveInteger(index + 1)),
        ),
    ),
    ...afterHitDurationEndingIssues(
      duration.earlyEnd?.length ?? 0,
      duration.permanentAfter !== undefined,
      failedFact,
    ),
  );
  return issues;
}

function afterHitDurationEndingIssues<FailedFact extends string>(
  earlyEndCount: number,
  hasPermanentEnding: boolean,
  failedFact: FailedFact,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  const endingCount = earlyEndCount + (hasPermanentEnding ? 1 : 0);
  return Array.from({ length: endingCount }, (_unused, index) =>
    afterHitMechanicsIssue(
      failedFact,
      spellDurationEndingPath(PositiveInteger(index + 1)),
    ),
  );
}

export function afterHitSingleTargetAttachmentIssue<FailedFact extends string>(
  attachment: OngoingSpellMechanics["attachment"],
  failedFact: FailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitMechanicsIssue<FailedFact> | undefined {
  return attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    attachment.value.selection.mode === "one"
    ? undefined
    : afterHitMechanicsIssue(failedFact, mechanicsPath);
}

export function afterHitSingleOperationCountIssues<FailedFact extends string>(
  operationCount: number,
  recognizedOperationIndex: number,
  failedFact: FailedFact,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  if (operationCount === 1 && recognizedOperationIndex === 0) return [];
  const indexes =
    operationCount === 0
      ? [0]
      : Array.from(
          { length: operationCount },
          (_unused, index) => index,
        ).filter((index) => index !== recognizedOperationIndex);
  return indexes.map((index) =>
    afterHitMechanicsIssue(
      failedFact,
      spellOngoingOperationPath(PositiveInteger(index + 1)),
    ),
  );
}

export function afterHitOperationTimingIssues<
  FailedFact extends string,
>(input: {
  readonly actualTrigger: OngoingSpellMechanics["operations"][number]["trigger"]["kind"];
  readonly expectedTrigger: OngoingSpellMechanics["operations"][number]["trigger"]["kind"];
  readonly operationIndex: number;
  readonly triggerFailedFact: FailedFact;
  readonly orderFailedFact: FailedFact;
}): readonly AfterHitMechanicsIssue<FailedFact>[] {
  const path = spellOngoingOperationPath(
    PositiveInteger(input.operationIndex + 1),
  );
  if (input.actualTrigger !== input.expectedTrigger) {
    return [afterHitMechanicsIssue(input.triggerFailedFact, path)];
  }
  return input.operationIndex === 0
    ? []
    : [afterHitMechanicsIssue(input.orderFailedFact, path)];
}

export function afterHitEffectOrderIssues<FailedFact extends string>(input: {
  readonly effectSupported: boolean;
  readonly actualIndex: number;
  readonly expectedIndex: number;
  readonly effectFailedFact: FailedFact;
  readonly orderFailedFact: FailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
}): readonly AfterHitMechanicsIssue<FailedFact>[] {
  if (!input.effectSupported) {
    return [
      afterHitMechanicsIssue(input.effectFailedFact, input.mechanicsPath),
    ];
  }
  return input.actualIndex === input.expectedIndex
    ? []
    : [afterHitMechanicsIssue(input.orderFailedFact, input.mechanicsPath)];
}

export function afterHitPassiveOperationIssues<FailedFact extends string>(
  operations: OngoingSpellMechanics["operations"],
  failedFact: FailedFact,
): readonly AfterHitMechanicsIssue<FailedFact>[] {
  return operations.flatMap((operation, index) =>
    operation.trigger.kind === "passive"
      ? []
      : [
          afterHitMechanicsIssue(
            failedFact,
            spellOngoingOperationPath(PositiveInteger(index + 1)),
          ),
        ],
  );
}

export function afterHitRecognizedOperationCountIssues<
  FailedFact extends string,
>(input: {
  readonly operationCount: number;
  readonly expectedCount: number;
  readonly recognizedIndexes: ReadonlySet<number>;
  readonly failedFact: FailedFact;
}): readonly AfterHitMechanicsIssue<FailedFact>[] {
  const missingIndexes = Array.from(
    { length: Math.max(0, input.expectedCount - input.operationCount) },
    (_unused, index) => input.operationCount + index,
  );
  const unrecognizedIndexes = Array.from(
    { length: input.operationCount },
    (_unused, index) => index,
  ).filter((index) => !input.recognizedIndexes.has(index));
  return [...missingIndexes, ...unrecognizedIndexes].map((index) =>
    afterHitMechanicsIssue(
      input.failedFact,
      spellOngoingOperationPath(PositiveInteger(index + 1)),
    ),
  );
}
