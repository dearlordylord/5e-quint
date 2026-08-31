import {
  completeLongRest,
  completeShortRest,
  finishLongRest,
  finishShortRest,
  interruptLongRest,
  interruptShortRest,
  startLongRest,
  startShortRest,
  type CharacterSheetIssue,
  type CharacterSheetLongRestStart,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import { Result, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import {
  cumulativeRestBoundary,
  longRestCompletionRestedTicks,
  longRestCompletionResultTicks,
  longRestInterruptionFromTool,
  longRestTimingFromTool,
  type LongRestCompletionToolInput,
  type LongRestResumptionCompletionToolInput,
  type RestBoundaryContext,
} from "./character-session-rest-timing.ts";
import {
  CharacterSessionOperationOutputSchema,
  CharacterSessionOperationResultSchema,
} from "./character-tool-output.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

type CharacterSessionOperationResult = Schema.Schema.Type<
  typeof CharacterSessionOperationResultSchema
>;
type RestRecoveryToolInput = Pick<
  Extract<
    ApplyCharacterSessionOperationToolInput["operation"],
    { readonly kind: "completeShortRest" }
  >,
  "spendHitDice" | "arcaneRecovery" | "sorcerousRestoration"
>;

export function applyCompleteShortRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "completeShortRest" }
    >;
  },
) {
  const started = startShortRest({ sheet: input.session });
  if (Result.isFailure(started)) {
    return characterSessionOperationFailure(input.characterId, started.failure);
  }
  const completion = finishShortRest({
    rest: started.success,
    restedTicks: elapsedTimeTicks(input.operation.restedTicks),
  });
  if (Result.isFailure(completion)) {
    return characterSessionOperationFailure(
      input.characterId,
      completion.failure,
    );
  }
  const completed = completeShortRest({
    completion: completion.success,
    unitLibrary: root.unitLibrary,
    ...restRecoveryFromTool(input.operation),
    ...(input.operation.fiendishResilienceDamageType === undefined
      ? {}
      : {
          fiendishResilienceDamageType:
            input.operation.fiendishResilienceDamageType,
        }),
  });
  if (Result.isFailure(completed)) {
    return characterSessionOperationFailure(
      input.characterId,
      completed.failure,
    );
  }
  root.sessionStore.characters.set(completed.success);
  return characterSessionOperationSuccess(root, {
    character: completed.success,
    result: {
      tag: "shortRestCompleted",
      restedTicks: input.operation.restedTicks,
    },
  });
}

export function applyInterruptShortRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "interruptShortRest" }
    >;
  },
) {
  const started = startShortRest({ sheet: input.session });
  if (Result.isFailure(started)) {
    return characterSessionOperationFailure(input.characterId, started.failure);
  }
  const interrupted = interruptShortRest({
    rest: started.success,
    interruption: input.operation.interruption,
  });
  return characterSessionOperationSuccess(root, {
    character: input.session,
    result: {
      tag: interrupted.tag,
      interruption: interrupted.interruption,
    },
  });
}

export function applyCompleteLongRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "completeLongRest" }
    >;
  },
) {
  const started = startLongRest({
    sheet: input.session,
    timing: longRestTimingFromTool(input.operation.timing),
  });
  if (Result.isFailure(started)) {
    return characterSessionOperationFailure(input.characterId, started.failure);
  }
  return completeStartedLongRestOperation(root, {
    characterId: input.characterId,
    rest: started.success,
    completion: input.operation,
  });
}

export function applyInterruptLongRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "interruptLongRest" }
    >;
  },
) {
  const started = startLongRest({
    sheet: input.session,
    timing: longRestTimingFromTool(input.operation.timing),
  });
  if (Result.isFailure(started)) {
    return characterSessionOperationFailure(input.characterId, started.failure);
  }
  let rest = started.success;
  let previousCumulativeRestedTicks = 0;
  // RAW: .references/srd-5.2.1/Rules-Glossary.md#Long-Rest (lines 694-696)
  // grants Short Rest benefits after at least 1 hour before an interruption
  // and adds 1 hour to the resumed Long Rest for every interruption.
  // Each tool boundary is total rested time. The runtime interruption owns
  // benefits for the segment immediately before that interruption, while final
  // completion compares cumulative time against the increased total duration.
  for (const [
    segmentIndex,
    segment,
  ] of input.operation.interruptionSegments.entries()) {
    const segmentBoundary = cumulativeRestBoundary({
      boundary: "interruption",
      boundaryIndex: segmentIndex,
      previousCumulativeRestedTicks,
      cumulativeRestedTicks: segment.cumulativeRestedTicks,
    });
    if (Result.isFailure(segmentBoundary)) {
      return characterSessionOperationFailure(
        input.characterId,
        segmentBoundary.failure.issue,
        segmentBoundary.failure.context,
      );
    }
    const interrupted = interruptLongRest({
      rest,
      unitLibrary: root.unitLibrary,
      timing: {
        cumulativeRestedTicks: segmentBoundary.success.cumulativeRestedTicks,
        elapsedSincePreviousInterruptionTicks:
          segmentBoundary.success.elapsedSincePreviousBoundaryTicks,
      },
      interruption: longRestInterruptionFromTool(segment.interruption),
      ...restRecoveryFromTool(segment),
    });
    if (Result.isFailure(interrupted)) {
      return characterSessionOperationFailure(
        input.characterId,
        interrupted.failure,
      );
    }
    rest = interrupted.success.rest;
    previousCumulativeRestedTicks = segment.cumulativeRestedTicks;
  }
  const completionBoundary = cumulativeRestBoundary({
    boundary: "completion",
    previousCumulativeRestedTicks,
    cumulativeRestedTicks: input.operation.completion.cumulativeRestedTicks,
  });
  if (Result.isFailure(completionBoundary)) {
    return characterSessionOperationFailure(
      input.characterId,
      completionBoundary.failure.issue,
      completionBoundary.failure.context,
    );
  }
  return completeStartedLongRestOperation(root, {
    characterId: input.characterId,
    rest,
    completion: input.operation.completion,
  });
}

function completeStartedLongRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly rest: CharacterSheetLongRestStart;
    readonly completion:
      | LongRestCompletionToolInput
      | LongRestResumptionCompletionToolInput;
  },
) {
  const completion = finishLongRest({
    rest: input.rest,
    restedTicks: longRestCompletionRestedTicks(input.completion),
  });
  if (Result.isFailure(completion)) {
    return characterSessionOperationFailure(
      input.characterId,
      completion.failure,
    );
  }
  const completed = completeLongRest({
    completion: completion.success,
    unitLibrary: root.unitLibrary,
    ...(input.completion.weaponMasteryReselections === undefined
      ? {}
      : {
          weaponMasteryReselections: mapNonEmpty(
            input.completion.weaponMasteryReselections,
            (reselection) => ({
              featureUnitId: reselection.featureUnitId,
              selectedWeaponUnitIds: reselection.selectedWeaponUnitIds,
            }),
          ),
        }),
    ...(input.completion.druidWildShapeKnownFormReplacement === undefined
      ? {}
      : {
          druidWildShapeKnownFormReplacement:
            input.completion.druidWildShapeKnownFormReplacement,
        }),
    ...(input.completion.druidCircleLandChoice === undefined
      ? {}
      : {
          druidCircleLandChoice: input.completion.druidCircleLandChoice,
        }),
    ...(input.completion.fiendishResilienceDamageType === undefined
      ? {}
      : {
          fiendishResilienceDamageType:
            input.completion.fiendishResilienceDamageType,
        }),
    statBlockCatalog: root.statBlockCatalog,
  });
  if (Result.isFailure(completed)) {
    return characterSessionOperationFailure(
      input.characterId,
      completed.failure,
    );
  }
  root.sessionStore.characters.set(completed.success);
  return characterSessionOperationSuccess(root, {
    character: completed.success,
    result: {
      tag: "longRestCompleted",
      restedTicks: longRestCompletionResultTicks(input.completion),
    },
  });
}

function characterSessionOperationFailure(
  characterIdValue: CharacterSheetId,
  issue: CharacterSheetIssue | string,
  context?: RestBoundaryContext,
) {
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId: characterIdValue,
    message: typeof issue === "string" ? issue : issue.message,
    ...(context === undefined ? {} : context),
  });
}

function characterSessionOperationSuccess(
  root: McpPlaySessionRoot,
  input: {
    readonly character: AvailableCharacterSession;
    readonly result: CharacterSessionOperationResult;
  },
) {
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: input.character,
    result: input.result,
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function restRecoveryFromTool(input: RestRecoveryToolInput) {
  return {
    ...(input.spendHitDice === undefined
      ? {}
      : {
          spendHitDice: input.spendHitDice.map((spend) => ({
            classUnitId: spend.classUnitId,
            roll: DieRollResult(spend.roll),
          })),
        }),
    ...(input.arcaneRecovery === undefined
      ? {}
      : {
          arcaneRecovery: {
            refundSpellSlots: input.arcaneRecovery.refundSpellSlots.map(
              (refund) => ({
                spellLevel: spellSlotLevel(refund.spellLevel),
                count: resourceCount(refund.count),
              }),
            ),
          },
        }),
    ...(input.sorcerousRestoration === undefined
      ? {}
      : {
          sorcerousRestoration: {
            recoverSorceryPoints: resourceCount(
              input.sorcerousRestoration.recoverSorceryPoints,
            ),
          },
        }),
  };
}

function mapNonEmpty<T, U>(
  values: readonly [T, ...T[]],
  map: (value: T) => U,
): readonly [U, ...U[]] {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}
