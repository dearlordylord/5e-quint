import {
  timePassed,
  type CharacterSheetElapsedTimeResult,
} from "@dnd/character-sheet-runtime";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  holeId,
  type FilledHoleValue,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { DieRollResult } from "@dnd/shared/types";
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

export function applyPassCalendarTimeOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "passCalendarTime" }
    >;
  },
) {
  const duration = timeSpanDuration(input.operation.duration);
  if (Either.isLeft(duration)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: `Invalid calendar-time duration: ${duration.left.kind}.`,
    });
  }
  const result = timePassed({
    sheet: input.session,
    duration: duration.right,
    fills: filledHoleValuesFromTool(input.operation.fills),
  });
  if (result.tag === "resolved") {
    root.sessionStore.characters.set(result.sheet);
  }
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: result.sheet,
    result: calendarTimeResultFromRuntime(result),
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function filledHoleValuesFromTool(
  fills: readonly {
    readonly kind: "rolledDice";
    readonly holeId: string;
    readonly value: readonly [
      { readonly results: readonly number[] },
      ...{ readonly results: readonly number[] }[],
    ];
  }[],
): readonly FilledHoleValue[] {
  return fills.map((fill) => {
    const [firstGroup, ...remainingGroups] = fill.value;
    return {
      kind: "rolledDice",
      holeId: holeId(fill.holeId),
      value: [
        {
          results: firstGroup.results.map((roll) => DieRollResult(roll)),
        },
        ...remainingGroups.map((group) => ({
          results: group.results.map((roll) => DieRollResult(roll)),
        })),
      ],
    };
  });
}

function calendarTimeResultFromRuntime(
  result: CharacterSheetElapsedTimeResult,
): CharacterSessionOperationResult {
  switch (result.tag) {
    case "resolved":
      return {
        tag: "resolved",
        elapsedTicks: Number(result.elapsedTicks),
      };
    case "needsHoles":
      return {
        tag: "needsHoles",
        holes: result.holes,
        elapsedTicks: Number(result.elapsedTicks),
        remainingTicks: Number(result.remainingTicks),
      };
    case "invalid":
      return {
        tag: "invalid",
        reason: "invalidFill",
        message: result.message,
      };
  }
}
