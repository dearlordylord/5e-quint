import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
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

/** Match the draft declared by the canonical Effect-generated MCP schemas. */
export function createDraft2020JsonSchemaValidator(): AjvJsonSchemaValidator {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    validateFormats: true,
  });
  addFormats(ajv);
  return new AjvJsonSchemaValidator(ajv);
}
