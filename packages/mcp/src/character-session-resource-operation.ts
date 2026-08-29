import {
  convertFontOfMagicSorceryPointsToSpellSlot,
  convertFontOfMagicSpellSlotToSorceryPoints,
  spendCharacterSheetSpellAccessFreeCast,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheetId,
  type CharacterSheetIssue,
} from "@dnd/character-sheet-runtime";
import { DieRollResult, spellSlotLevel } from "@dnd/shared/types";
import { Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import {
  CharacterSessionOperationOutputSchema,
  type CharacterSessionResourceOperationResult,
} from "./character-tool-output.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

type SpendSpellAccessFreeCastOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "spendSpellAccessFreeCast" }
>;
type UseMonkUncannyMetabolismWhenRollingInitiativeOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "useMonkUncannyMetabolismWhenRollingInitiative" }
>;
type ConvertFontOfMagicSpellSlotToSorceryPointsOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "convertFontOfMagicSpellSlotToSorceryPoints" }
>;
type ConvertFontOfMagicSorceryPointsToSpellSlotOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: "convertFontOfMagicSorceryPointsToSpellSlot" }
>;
type CharacterSessionResourceOperationKind =
  | SpendSpellAccessFreeCastOperation["kind"]
  | UseMonkUncannyMetabolismWhenRollingInitiativeOperation["kind"]
  | ConvertFontOfMagicSpellSlotToSorceryPointsOperation["kind"]
  | ConvertFontOfMagicSorceryPointsToSpellSlotOperation["kind"];
type CharacterSessionResourceOperation = Extract<
  ApplyCharacterSessionOperationToolInput["operation"],
  { readonly kind: CharacterSessionResourceOperationKind }
>;

export function isCharacterSessionResourceOperation(
  operation: ApplyCharacterSessionOperationToolInput["operation"],
): operation is CharacterSessionResourceOperation {
  return (
    operation.kind === "spendSpellAccessFreeCast" ||
    operation.kind === "useMonkUncannyMetabolismWhenRollingInitiative" ||
    operation.kind === "convertFontOfMagicSpellSlotToSorceryPoints" ||
    operation.kind === "convertFontOfMagicSorceryPointsToSpellSlot"
  );
}

export function applyCharacterSessionResourceOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: CharacterSessionResourceOperation;
  },
) {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "spendSpellAccessFreeCast" }, (operation) =>
      spendSpellAccessFreeCastOperation(root, { ...input, operation }),
    ),
    Match.when(
      { kind: "useMonkUncannyMetabolismWhenRollingInitiative" },
      (operation) =>
        useMonkUncannyMetabolismWhenRollingInitiativeOperation(root, {
          ...input,
          operation,
        }),
    ),
    Match.when(
      { kind: "convertFontOfMagicSpellSlotToSorceryPoints" },
      (operation) =>
        convertFontOfMagicSpellSlotToSorceryPointsOperation(root, {
          ...input,
          operation,
        }),
    ),
    Match.when(
      { kind: "convertFontOfMagicSorceryPointsToSpellSlot" },
      (operation) =>
        convertFontOfMagicSorceryPointsToSpellSlotOperation(root, {
          ...input,
          operation,
        }),
    ),
    Match.exhaustive,
  );
}

export function spendSpellAccessFreeCastOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: SpendSpellAccessFreeCastOperation;
  },
) {
  const updated = spendCharacterSheetSpellAccessFreeCast({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    resource: {
      sourceUnitId: input.operation.sourceUnitId,
      spellId: input.operation.spellId,
    },
  });
  if (updated._tag === "Failure") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.failure,
    });
  }
  return commitResourceOperation(root, updated.success, {
    tag: "spellAccessFreeCastSpent",
    sourceUnitId: input.operation.sourceUnitId,
    spellId: input.operation.spellId,
  });
}

export function useMonkUncannyMetabolismWhenRollingInitiativeOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: UseMonkUncannyMetabolismWhenRollingInitiativeOperation;
  },
) {
  const updated = useMonkUncannyMetabolismWhenRollingInitiative({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    martialArtsRoll: DieRollResult(input.operation.martialArtsRoll),
  });
  if (updated._tag === "Failure") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.failure,
    });
  }
  return commitResourceOperation(root, updated.success, {
    tag: "monkUncannyMetabolismUsed",
    martialArtsRoll: input.operation.martialArtsRoll,
  });
}

export function convertFontOfMagicSpellSlotToSorceryPointsOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: ConvertFontOfMagicSpellSlotToSorceryPointsOperation;
  },
) {
  const updated = convertFontOfMagicSpellSlotToSorceryPoints({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    spellLevel: spellSlotLevel(input.operation.spellLevel),
    ...(input.operation.spellSlotSource === undefined
      ? {}
      : { spellSlotSource: input.operation.spellSlotSource }),
  });
  if (updated._tag === "Failure") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.failure,
    });
  }
  return commitResourceOperation(root, updated.success, {
    tag: "fontOfMagicSpellSlotConvertedToSorceryPoints",
    spellLevel: input.operation.spellLevel,
    ...(input.operation.spellSlotSource === undefined
      ? {}
      : { spellSlotSource: input.operation.spellSlotSource }),
  });
}

export function convertFontOfMagicSorceryPointsToSpellSlotOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: ConvertFontOfMagicSorceryPointsToSpellSlotOperation;
  },
) {
  const updated = convertFontOfMagicSorceryPointsToSpellSlot({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    spellLevel: spellSlotLevel(input.operation.spellLevel),
  });
  if (updated._tag === "Failure") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.failure,
    });
  }
  return commitResourceOperation(root, updated.success, {
    tag: "fontOfMagicSorceryPointsConvertedToSpellSlot",
    spellLevel: input.operation.spellLevel,
  });
}

function commitResourceOperation(
  root: McpPlaySessionRoot,
  sheet: AvailableCharacterSession,
  result: CharacterSessionResourceOperationResult,
) {
  root.sessionStore.characters.set(sheet);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: sheet,
    result,
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function resourceOperationFailure(input: {
  readonly characterId: CharacterSheetId;
  readonly operationKind: CharacterSessionResourceOperationKind;
  readonly issue: CharacterSheetIssue;
}) {
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId: input.characterId,
    operationKind: input.operationKind,
    message: input.issue.message,
    recovery: {
      tag: "characterSessionUnchanged",
      affectedCharacterIds: [input.characterId],
      guidance:
        "The Character Session was not changed; correct the operation and retry from the returned session state.",
    },
  });
}
