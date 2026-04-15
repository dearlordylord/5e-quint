import { errorContent } from "./server-shared.ts";

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
