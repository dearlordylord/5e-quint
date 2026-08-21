import {
  convertFontOfMagicSorceryPointsToSpellSlot,
  convertFontOfMagicSpellSlotToSorceryPoints,
  spendCharacterSheetSpellAccessFreeCast,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheetIssue,
} from "@dnd/character-sheet-runtime";
import { DieRollResult, spellSlotLevel } from "@dnd/shared/types";

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

export function spendSpellAccessFreeCastOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (updated._tag === "Left") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.left,
    });
  }
  return commitResourceOperation(root, updated.right, {
    tag: "spellAccessFreeCastSpent",
    sourceUnitId: input.operation.sourceUnitId,
    spellId: input.operation.spellId,
  });
}

export function useMonkUncannyMetabolismWhenRollingInitiativeOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: UseMonkUncannyMetabolismWhenRollingInitiativeOperation;
  },
) {
  const updated = useMonkUncannyMetabolismWhenRollingInitiative({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    martialArtsRoll: DieRollResult(input.operation.martialArtsRoll),
  });
  if (updated._tag === "Left") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.left,
    });
  }
  return commitResourceOperation(root, updated.right, {
    tag: "monkUncannyMetabolismUsed",
    martialArtsRoll: input.operation.martialArtsRoll,
  });
}

export function convertFontOfMagicSpellSlotToSorceryPointsOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (updated._tag === "Left") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.left,
    });
  }
  return commitResourceOperation(root, updated.right, {
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
    readonly characterId: string;
    readonly session: AvailableCharacterSession;
    readonly operation: ConvertFontOfMagicSorceryPointsToSpellSlotOperation;
  },
) {
  const updated = convertFontOfMagicSorceryPointsToSpellSlot({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    spellLevel: spellSlotLevel(input.operation.spellLevel),
  });
  if (updated._tag === "Left") {
    return resourceOperationFailure({
      characterId: input.characterId,
      operationKind: input.operation.kind,
      issue: updated.left,
    });
  }
  return commitResourceOperation(root, updated.right, {
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
  readonly characterId: string;
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
