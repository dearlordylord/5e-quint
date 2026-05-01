import { Either, JSONSchema, Schema } from "effect";

import { errorContent, jsonContent } from "./tool-content.ts";

export type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};
export type McpOutputSchema = Readonly<Record<string, unknown>>;

export type ToolError = ReturnType<typeof errorContent>;
export type ToolInputResult<A> = Either.Either<A, ToolError>;

export function decodeToolArgs<A, I>(
  schema: Schema.Schema<A, I, never>,
  args: unknown,
  toolName: string,
): ToolInputResult<A> {
  const input = args === undefined ? {} : args;
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(input);
  return Either.mapLeft(decoded, (error) =>
    errorContent(`${toolName} expects valid arguments.`, {
      code: "INVALID_ARGUMENTS",
      message: error.message,
    }),
  );
}

export function mcpObjectJsonSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpObjectInputSchema {
  const generated = parseMcpObjectInputSchema(
    jsonSchemaFromCodec(schema),
    "Effect JSON schema",
  );
  return {
    ...generated,
    type: "object",
    properties: isJsonObject(generated.properties) ? generated.properties : {},
    additionalProperties: false,
  };
}

export function mcpOutputJsonSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpOutputSchema {
  return jsonSchemaFromCodec(schema);
}

export function schemaJsonContent<A, I>(
  schema: Schema.Schema<A, I, never>,
  value: A,
) {
  const encoded = Schema.encodeSync(schema)(value);
  return {
    ...jsonContent(encoded),
    structuredContent: encoded,
  };
}

function jsonSchemaFromCodec<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpOutputSchema {
  return parseMcpOutputSchema(
    stripSchemaIds(JSONSchema.make(schema)),
    "Effect JSON schema",
  );
}

function parseMcpOutputSchema(value: unknown, label: string): McpOutputSchema {
  if (isJsonObject(value)) return value;
  throw new Error(`${label} must generate a JSON object schema.`);
}

function parseMcpObjectInputSchema(
  value: unknown,
  label: string,
): McpObjectInputSchema {
  const schema = parseMcpOutputSchema(value, label);
  if (schema.type === "object") return { ...schema, type: "object" };
  const objectSchema = objectSchemaBranch(schema);
  if (objectSchema !== undefined) {
    const { anyOf: _anyOf, ...schemaAnnotations } = schema;
    return { ...schemaAnnotations, ...objectSchema, type: "object" };
  }
  throw new Error(`${label} must generate an MCP object input schema.`);
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectSchemaBranch(
  schema: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const anyOf = schema.anyOf;
  if (!Array.isArray(anyOf)) return undefined;
  return anyOf.find(
    (entry): entry is Readonly<Record<string, unknown>> =>
      isJsonObject(entry) && entry.type === "object",
  );
}

function stripSchemaIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripSchemaIds(entry));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$id")
      .map(([key, entry]) => [key, stripSchemaIds(entry)]),
  );
}
