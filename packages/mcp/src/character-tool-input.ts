import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  parseCreationHoleId,
  type AbilityScoreAssignment,
  type CharacterDraftId,
  type CreationFill,
  type DraftRevision,
  type SupportedAbilityScoreMethod,
} from "@dnd/character-creation-runtime";
import { ABILITIES, type Ability } from "@dnd/shared/types";

import { errorContent } from "./tool-content.ts";

type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

export const draftIdInputSchema = {
  type: "object",
  required: ["draftId"],
  properties: {
    draftId: {
      type: "string",
      description: "Character Draft id returned by create_character_draft.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const createCharacterDraftInputSchema = {
  type: "object",
  properties: {
    draftId: {
      type: "string",
      description:
        "Optional caller-provided Character Draft id. Omit to let the runtime assign one.",
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

export const fillCreationHolesInputSchema = {
  type: "object",
  required: ["draftId", "expectedRevision", "fills"],
  properties: {
    draftId: { type: "string" },
    expectedRevision: { type: "integer", minimum: 0 },
    fills: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "holeId"],
        properties: {
          kind: { type: "string", enum: ["choice", "abilityScores"] },
          holeId: { type: "string" },
          optionIds: {
            type: "array",
            items: { type: "string" },
          },
          method: {
            type: "string",
            enum: [...SUPPORTED_ABILITY_SCORE_METHODS],
          },
          value: { type: "object" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} satisfies McpObjectInputSchema;

type ToolError = ReturnType<typeof errorContent>;

export function decodeCreateCharacterDraftArgs(
  args: unknown,
  toolName: string,
): { readonly draftId?: CharacterDraftId } | ToolError {
  const record = readToolArgsRecord(args, toolName, ["draftId"]);
  if (isToolError(record)) return record;
  if (record.draftId === undefined) return {};
  if (typeof record.draftId !== "string") {
    return invalidFieldContent(toolName, "draftId", "string");
  }
  return { draftId: characterDraftId(record.draftId) };
}

export function decodeDraftIdArg(
  args: unknown,
  toolName: string,
): CharacterDraftId | ToolError {
  const record = readToolArgsRecord(args, toolName, ["draftId"]);
  if (isToolError(record)) return record;
  if (typeof record.draftId !== "string") {
    return invalidFieldContent(toolName, "draftId", "string");
  }
  return characterDraftId(record.draftId);
}

export function decodeFillCreationHolesArgs(
  args: unknown,
  toolName: string,
):
  | {
      readonly draftId: CharacterDraftId;
      readonly expectedRevision: DraftRevision;
      readonly fills: readonly CreationFill[];
    }
  | ToolError {
  const record = readToolArgsRecord(args, toolName, [
    "draftId",
    "expectedRevision",
    "fills",
  ]);
  if (isToolError(record)) return record;
  if (typeof record.draftId !== "string") {
    return invalidFieldContent(toolName, "draftId", "string");
  }
  if (
    typeof record.expectedRevision !== "number" ||
    !Number.isInteger(record.expectedRevision) ||
    record.expectedRevision < 0
  ) {
    return invalidFieldContent(
      toolName,
      "expectedRevision",
      "non-negative integer",
    );
  }
  if (!Array.isArray(record.fills)) {
    return invalidFieldContent(toolName, "fills", "array");
  }

  const fills: CreationFill[] = [];
  for (const [index, fill] of record.fills.entries()) {
    const decoded = decodeCreationFill(fill, toolName, index);
    if (isToolError(decoded)) return decoded;
    fills.push(decoded);
  }

  return {
    draftId: characterDraftId(record.draftId),
    expectedRevision: draftRevision(record.expectedRevision),
    fills,
  };
}

export function isToolError(value: unknown): value is ToolError {
  return isRecord(value) && value.isError === true;
}

function decodeCreationFill(
  value: unknown,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  if (!isRecord(value)) {
    return invalidFieldContent(toolName, `fills[${index}]`, "object");
  }
  const unknownFields = unexpectedFields(value, [
    "kind",
    "holeId",
    "optionIds",
    "method",
    "value",
  ]);
  if (unknownFields.length > 0) {
    return unexpectedFieldContent(toolName, unknownFields);
  }
  if (typeof value.holeId !== "string") {
    return invalidFieldContent(toolName, `fills[${index}].holeId`, "string");
  }

  if (value.kind === "choice") {
    return decodeChoiceFill(value, value.holeId, toolName, index);
  }
  if (value.kind === "abilityScores") {
    return decodeAbilityScoreFill(value, value.holeId, toolName, index);
  }

  return invalidFieldContent(toolName, `fills[${index}].kind`, "fill kind");
}

function decodeChoiceFill(
  value: Readonly<Record<string, unknown>>,
  holeIdText: string,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  if (!isStringArray(value.optionIds)) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].optionIds`,
      "string array",
    );
  }
  if (value.method !== undefined || value.value !== undefined) {
    return unexpectedFieldContent(toolName, ["method", "value"]);
  }
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].holeId`,
      "creation hole id",
    );
  }
  return {
    kind: "choice",
    holeId,
    optionIds: value.optionIds.map(creationChoiceOptionId),
  };
}

function decodeAbilityScoreFill(
  value: Readonly<Record<string, unknown>>,
  holeIdText: string,
  toolName: string,
  index: number,
): CreationFill | ToolError {
  if (!isSupportedAbilityScoreMethod(value.method)) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].method`,
      "supported ability-score method",
    );
  }
  const assignment = decodeAbilityScoreAssignment(value.value);
  if (assignment == null) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].value`,
      "ability score assignment",
    );
  }
  if (value.optionIds !== undefined) {
    return unexpectedFieldContent(toolName, ["optionIds"]);
  }
  const holeId = parseCreationHoleId(holeIdText);
  if (holeId == null) {
    return invalidFieldContent(
      toolName,
      `fills[${index}].holeId`,
      "creation hole id",
    );
  }
  return {
    kind: "abilityScores",
    holeId,
    method: value.method,
    value: assignment,
  };
}

function decodeAbilityScoreAssignment(
  value: unknown,
): AbilityScoreAssignment | null {
  if (!isRecord(value)) return null;
  return isAbilityScoreAssignmentRecord(value) ? value : null;
}

function isSupportedAbilityScoreMethod(
  value: unknown,
): value is SupportedAbilityScoreMethod {
  return (
    typeof value === "string" &&
    SUPPORTED_ABILITY_SCORE_METHODS.some((method) => method === value)
  );
}

function readArgsRecord(
  args: unknown,
  toolName: string,
): Readonly<Record<string, unknown>> | ToolError {
  return args === undefined
    ? {}
    : isRecord(args)
      ? args
      : errorContent(`Invalid ${toolName} input`, {
          code: "INVALID_TOOL_INPUT",
          expected: "object",
        });
}

function readToolArgsRecord(
  args: unknown,
  toolName: string,
  allowedFields: readonly string[],
): Readonly<Record<string, unknown>> | ToolError {
  const record = readArgsRecord(args, toolName);
  if (isToolError(record)) return record;
  const unknownFields = unexpectedFields(record, allowedFields);
  return unknownFields.length === 0
    ? record
    : unexpectedFieldContent(toolName, unknownFields);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isAbilityScoreAssignmentRecord(
  value: Readonly<Record<string, unknown>>,
): value is Readonly<Record<Ability, number>> {
  return (
    unexpectedFields(value, ABILITIES).length === 0 &&
    ABILITIES.every((ability) => Number.isInteger(value[ability]))
  );
}

function unexpectedFields(
  record: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[],
): readonly string[] {
  return Object.keys(record).filter((field) => !allowedFields.includes(field));
}

function unexpectedFieldContent(toolName: string, fields: readonly string[]) {
  return errorContent(`Invalid ${toolName} input`, {
    code: "UNEXPECTED_FIELD",
    fields,
  });
}

function invalidFieldContent(
  toolName: string,
  field: string,
  expected: string,
) {
  return errorContent(`Invalid ${toolName} input`, {
    code: "INVALID_FIELD",
    field,
    expected,
  });
}
