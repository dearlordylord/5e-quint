import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";

export function requireJsonSchema(
  value: unknown,
  context: string,
): JsonSchemaType {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be a JSON Schema object.`);
  }
  // The runtime guard establishes the object-record boundary expected by the
  // MCP validator; JsonSchemaType is the SDK's structural schema contract.
  return value as JsonSchemaType;
}
