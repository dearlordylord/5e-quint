import { Schema } from "effect";

import {
  CharacterDraftSchema,
  CharacterLevelUpTransitionSchema,
  resolveOpenChoicePayload,
  strictCharacterParseOptions,
  type CharacterDraft,
  type CharacterDraftAssessment,
  type CharacterLevelUpTransition,
  type CharacterOpenChoice,
  type CharacterOpenChoicePayload,
} from "@dnd/core/character-domain.ts";

import { errorContent } from "./server-shared.ts";

export type CharacterToolError = ReturnType<typeof errorContent>;

export function isCharacterToolError(
  value: unknown,
): value is CharacterToolError {
  return (
    typeof value === "object" &&
    value !== null &&
    "isError" in value &&
    value.isError === true &&
    "content" in value
  );
}

export type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};

export const emptyObjectInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

export const createCharacterDraftInputSchema = {
  type: "object",
  properties: {
    draft: {
      type: "object",
      description:
        "Optional canonical @dnd/core CharacterDraft payload to seed stored draft state. Omit to create an empty draft.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

export const characterDraftPatchInputSchema = {
  type: "object",
  required: ["patch"],
  properties: {
    patch: {
      type: "object",
      description:
        "Partial canonical @dnd/core CharacterDraft patch applied over the stored draft state.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

export const advanceCharacterSheetInputSchema = {
  type: "object",
  required: ["transition"],
  properties: {
    transition: {
      type: "object",
      description:
        "Canonical core-owned CharacterLevelUpTransition payload applied to the stored finalized sheet.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

export const buildOpenChoicePatchInputSchema = {
  type: "object",
  required: ["featureRef"],
  properties: {
    featureRef: {
      type: "string",
      description:
        "Picker identifier returned by list_character_feature_pickers.",
    },
    value: {
      description:
        "Selected value. String for single-pick pickers, array of strings for multi-pick pickers, or null to clear.",
    },
  },
  additionalProperties: false,
} as const satisfies McpObjectInputSchema;

export function readArgsRecord(
  args: unknown,
  toolName: string,
): Record<string, unknown> | ReturnType<typeof errorContent> {
  if (typeof args === "object" && args !== null && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return errorContent(`Invalid ${toolName} input`, {
    code: "INVALID_CHARACTER_INPUT",
    message: "Tool input must be an object.",
  });
}

export function invalidCharacterInputContent(
  toolName: string,
  fieldName: string,
  details: unknown,
) {
  return errorContent(`Invalid ${toolName} input`, {
    code: "INVALID_CHARACTER_INPUT",
    field: fieldName,
    message: String(details),
  });
}

export function rejectUnexpectedTopLevelFields(
  args: Record<string, unknown>,
  toolName: string,
  allowedFields: ReadonlyArray<string>,
) {
  const unexpectedField = Object.keys(args).find(
    (field) => !allowedFields.includes(field),
  );
  if (unexpectedField == null) return null;
  return invalidCharacterInputContent(
    toolName,
    unexpectedField,
    `Unexpected field ${unexpectedField}. Allowed fields: ${allowedFields.join(", ") || "(none)"}.`,
  );
}

function stableSetValues(values: ReadonlySet<unknown>): ReadonlyArray<unknown> {
  const entries = [...values].map((value) => encodeStableJson(value));
  if (entries.every((entry) => typeof entry === "string")) {
    return [...(entries as string[])].sort();
  }
  if (entries.every((entry) => typeof entry === "number")) {
    return [...(entries as number[])].sort((left, right) => left - right);
  }
  return entries;
}

export function decodeCanonicalCharacterDraft(
  value: unknown,
  toolName: string,
  fieldName: string,
): CharacterDraft | CharacterToolError {
  const decoded = Schema.decodeUnknownEither(
    CharacterDraftSchema,
    strictCharacterParseOptions,
  )(value);
  if (decoded._tag === "Left") {
    return invalidCharacterInputContent(toolName, fieldName, decoded.left);
  }
  return decoded.right;
}

export function decodeDraftPatch(
  args: unknown,
  toolName: "preview_character_draft_update" | "apply_character_draft_update",
): Partial<CharacterDraft> | CharacterToolError {
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(decodedArgs, toolName, [
    "patch",
  ]);
  if (topLevelError != null) return topLevelError;
  return decodeCanonicalCharacterDraft(decodedArgs.patch, toolName, "patch");
}

export function decodeLevelUpTransition(
  args: unknown,
  toolName: "preview_character_sheet_advancement" | "advance_character_sheet",
): CharacterLevelUpTransition | CharacterToolError {
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(decodedArgs, toolName, [
    "transition",
  ]);
  if (topLevelError != null) return topLevelError;
  const decoded = Schema.decodeUnknownEither(
    CharacterLevelUpTransitionSchema,
    strictCharacterParseOptions,
  )(decodedArgs.transition);
  if (decoded._tag === "Left") {
    return invalidCharacterInputContent(toolName, "transition", decoded.left);
  }
  return decoded.right;
}

export function decodeEmptyArgs(
  args: unknown,
  toolName: string,
): Record<string, never> | CharacterToolError {
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(
    decodedArgs,
    toolName,
    [],
  );
  if (topLevelError != null) return topLevelError;
  return decodedArgs as Record<string, never>;
}

export type DecodedBuildOpenChoicePatchArgs = {
  readonly featureRef: string;
  readonly value: string | ReadonlyArray<string> | undefined;
};

function isStringArray(value: unknown): value is ReadonlyArray<string> {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function decodeBuildOpenChoicePatchArgs(
  args: unknown,
): DecodedBuildOpenChoicePatchArgs | CharacterToolError {
  const toolName = "build_open_choice_patch" as const;
  const decodedArgs = readArgsRecord(args, toolName);
  if (isCharacterToolError(decodedArgs)) return decodedArgs;
  const topLevelError = rejectUnexpectedTopLevelFields(decodedArgs, toolName, [
    "featureRef",
    "value",
  ]);
  if (topLevelError != null) return topLevelError;
  if (typeof decodedArgs.featureRef !== "string") {
    return invalidCharacterInputContent(
      toolName,
      "featureRef",
      "featureRef must be a string.",
    );
  }
  const rawValue = decodedArgs.value;
  if (
    rawValue !== undefined &&
    rawValue !== null &&
    typeof rawValue !== "string" &&
    !isStringArray(rawValue)
  ) {
    return invalidCharacterInputContent(
      toolName,
      "value",
      "value must be a string, an array of strings, or null.",
    );
  }
  const value =
    rawValue === null
      ? undefined
      : (rawValue as string | ReadonlyArray<string> | undefined);
  return { featureRef: decodedArgs.featureRef, value };
}

export function serializePickerPayload(payload: CharacterOpenChoicePayload) {
  return {
    featureRef: payload.featureRef,
    options: payload.options,
    pickCount: payload.pickCount,
    writePath: payload.writePath,
    current: payload.current,
  };
}

export function encodeStableJson(value: unknown): unknown {
  if (value instanceof Set) return stableSetValues(value);
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()]
        .map(([key, entry]) => [String(key), encodeStableJson(entry)] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  }
  if (Array.isArray(value))
    return value.map((entry) => encodeStableJson(entry));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, encodeStableJson(entry)] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  }
  return value;
}

export function enrichOpenChoices<T extends CharacterOpenChoice>(
  draft: CharacterDraft,
  choices: ReadonlyArray<T>,
) {
  return choices.map((choice) => {
    const payload = resolveOpenChoicePayload(draft, choice);
    return payload == null
      ? choice
      : { ...choice, featureRef: payload.featureRef };
  });
}

export function enrichAssessment(
  draft: CharacterDraft,
  assessment: CharacterDraftAssessment,
) {
  return {
    ...assessment,
    openChoices: enrichOpenChoices(draft, assessment.openChoices),
  };
}
