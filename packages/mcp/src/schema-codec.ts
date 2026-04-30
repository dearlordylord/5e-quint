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

export function toolInputValue<A>(result: ToolInputResult<A>): A | ToolError {
  return Either.isRight(result) ? result.right : result.left;
}

export function mcpObjectJsonSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpObjectInputSchema {
  const generated = jsonSchemaFromCodec(schema) as Record<string, unknown>;
  return {
    ...generated,
    type: "object",
    properties:
      typeof generated.properties === "object" && generated.properties !== null
        ? generated.properties
        : {},
    additionalProperties: false,
  } as McpObjectInputSchema;
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
  return stripSchemaIds(JSONSchema.make(schema)) as McpOutputSchema;
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
