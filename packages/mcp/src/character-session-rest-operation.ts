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
  type CharacterSheetLongRestInterruption,
  type CharacterSheetLongRestStartTiming,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import type { UnitId as UnitIdType } from "@dnd/shared/game-facts";
import {
  DieRollResult,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import { Either, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
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
type RestRecoveryToolInput = {
  readonly spendHitDice?: readonly {
    readonly classUnitId: UnitIdType;
    readonly roll: number;
  }[];
  readonly arcaneRecovery?: {
    readonly refundSpellSlots: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  };
  readonly sorcerousRestoration?: {
    readonly recoverSorceryPoints: number;
  };
};

export function applyCompleteShortRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "completeShortRest" }
    >;
  },
) {
  const started = startShortRest({ sheet: input.session });
  if (Either.isLeft(started)) {
    return characterSessionOperationFailure(input.characterId, started.left);
  }
  const completion = finishShortRest({
    rest: started.right,
    restedTicks: elapsedTimeTicks(input.operation.restedTicks),
  });
  if (Either.isLeft(completion)) {
    return characterSessionOperationFailure(input.characterId, completion.left);
  }
  const completed = completeShortRest({
    completion: completion.right,
    unitLibrary: root.unitLibrary,
    ...restRecoveryFromTool(input.operation),
    ...(input.operation.fiendishResilienceDamageType === undefined
      ? {}
      : {
          fiendishResilienceDamageType:
            input.operation.fiendishResilienceDamageType,
        }),
  });
  if (Either.isLeft(completed)) {
    return characterSessionOperationFailure(input.characterId, completed.left);
  }
  root.sessionStore.characters.set(completed.right);
  return characterSessionOperationSuccess(root, {
    character: completed.right,
    result: {
      tag: "shortRestCompleted",
      restedTicks: input.operation.restedTicks,
    },
  });
}

export function applyInterruptShortRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "interruptShortRest" }
    >;
  },
) {
  const started = startShortRest({ sheet: input.session });
  if (Either.isLeft(started)) {
    return characterSessionOperationFailure(input.characterId, started.left);
  }
  const interrupted = interruptShortRest({
    rest: started.right,
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
    readonly characterId: string;
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
  if (Either.isLeft(started)) {
    return characterSessionOperationFailure(input.characterId, started.left);
  }
  const completion = finishLongRest({
    rest: started.right,
    restedTicks: elapsedTimeTicks(input.operation.restedTicks),
  });
  if (Either.isLeft(completion)) {
    return characterSessionOperationFailure(input.characterId, completion.left);
  }
  const completed = completeLongRest({
    completion: completion.right,
    unitLibrary: root.unitLibrary,
    ...(input.operation.weaponMasteryReselections === undefined
      ? {}
      : {
          weaponMasteryReselections: mapNonEmpty(
            input.operation.weaponMasteryReselections,
            (reselection) => ({
              featureUnitId: reselection.featureUnitId,
              selectedWeaponUnitIds: reselection.selectedWeaponUnitIds,
            }),
          ),
        }),
    ...(input.operation.druidWildShapeKnownFormReplacement === undefined
      ? {}
      : {
          druidWildShapeKnownFormReplacement:
            input.operation.druidWildShapeKnownFormReplacement,
        }),
    ...(input.operation.druidCircleLandChoice === undefined
      ? {}
      : {
          druidCircleLandChoice: input.operation.druidCircleLandChoice,
        }),
    ...(input.operation.fiendishResilienceDamageType === undefined
      ? {}
      : {
          fiendishResilienceDamageType:
            input.operation.fiendishResilienceDamageType,
        }),
    statBlockCatalog: root.statBlockCatalog,
  });
  if (Either.isLeft(completed)) {
    return characterSessionOperationFailure(input.characterId, completed.left);
  }
  root.sessionStore.characters.set(completed.right);
  return characterSessionOperationSuccess(root, {
    character: completed.right,
    result: {
      tag: "longRestCompleted",
      restedTicks: input.operation.restedTicks,
    },
  });
}

export function applyInterruptLongRestOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (Either.isLeft(started)) {
    return characterSessionOperationFailure(input.characterId, started.left);
  }
  const interrupted = interruptLongRest({
    rest: started.right,
    unitLibrary: root.unitLibrary,
    restedTicks: elapsedTimeTicks(input.operation.restedTicks),
    interruption: longRestInterruptionFromTool(input.operation.interruption),
    ...restRecoveryFromTool(input.operation),
  });
  if (Either.isLeft(interrupted)) {
    return characterSessionOperationFailure(
      input.characterId,
      interrupted.left,
    );
  }
  const result = interrupted.right;
  const character =
    result.tag === "longRestInterruptedWithShortRestBenefits"
      ? result.rest.sheet
      : input.session;
  if (result.tag === "longRestInterruptedWithShortRestBenefits") {
    root.sessionStore.characters.set(character);
  }
  return characterSessionOperationSuccess(root, {
    character,
    result: {
      tag: result.tag,
      interruption: result.interruption,
      requiredLongRestTicks: Number(result.requiredLongRestTicks),
    },
  });
}

function characterSessionOperationFailure(
  characterIdValue: string,
  issue: CharacterSheetIssue | string,
) {
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId: characterIdValue,
    message: typeof issue === "string" ? issue : issue.message,
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

function longRestTimingFromTool(
  input:
    | { readonly tag: "noPriorLongRest" }
    | {
        readonly tag: "elapsedSinceLastLongRest";
        readonly elapsedTicks: number;
      },
): CharacterSheetLongRestStartTiming {
  return input.tag === "noPriorLongRest"
    ? input
    : {
        tag: "elapsedSinceLastLongRest",
        elapsedTicks: elapsedTimeTicks(input.elapsedTicks),
      };
}

function longRestInterruptionFromTool(
  input:
    | "rollInitiative"
    | "castNonCantripSpell"
    | "takeDamage"
    | {
        readonly tag: "physicalExertion";
        readonly durationTicks: number;
      },
): CharacterSheetLongRestInterruption {
  return typeof input === "object"
    ? {
        tag: "physicalExertion",
        durationTicks: elapsedTimeTicks(input.durationTicks),
      }
    : input;
}

function mapNonEmpty<T, U>(
  values: readonly [T, ...T[]],
  map: (value: T) => U,
): readonly [U, ...U[]] {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}
