import { errorContent } from "./tool-content.ts";

export type ToolError = ReturnType<typeof errorContent>;

export function readToolArgsRecord(
  args: unknown,
  toolName: string,
  allowedFields: readonly string[],
): Readonly<Record<string, unknown>> | ToolError {
  if (!isRecord(args)) {
    return errorContent(`${toolName} expects object arguments.`, {
      code: "INVALID_ARGUMENTS",
      expected: "object",
    });
  }

  for (const key of Object.keys(args)) {
    if (!allowedFields.includes(key)) {
      return errorContent(`Unexpected ${toolName} field: ${key}`, {
        code: "UNEXPECTED_FIELD",
        field: key,
      });
    }
  }

  return args;
}

export function invalidFieldContent(
  toolName: string,
  field: string,
  expected: string,
) {
  return errorContent(`Invalid ${toolName} field: ${field}`, {
    code: "INVALID_FIELD",
    field,
    expected,
  });
}

export function isToolError(value: unknown): value is ToolError {
  return isRecord(value) && value.isError === true;
}

export function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
