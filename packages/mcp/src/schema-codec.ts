import { createHash } from "node:crypto";

import { Either, JSONSchema, Schema } from "effect";

import {
  errorContent,
  jsonContent,
  jsonSerializablePayload,
} from "./tool-content.ts";

export type McpObjectInputSchema = Readonly<Record<string, unknown>> & {
  readonly type: "object";
};
export type McpOutputSchema = Readonly<Record<string, unknown>>;

export type ToolError = ReturnType<typeof errorContent>;
export type ToolInputResult<A> = Either.Either<A, ToolError>;

const outputSchemaByCodec = new WeakMap<object, McpOutputSchema>();

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
    omitRedundantImpossibleProperties(jsonSchemaFromCodec(schema)),
    "Effect JSON schema",
  );
  return {
    ...generated,
    type: "object",
    properties: isJsonObject(generated.properties) ? generated.properties : {},
    additionalProperties: false,
  };
}

export function omitRedundantImpossibleProperties(
  value: McpOutputSchema,
): McpOutputSchema;
export function omitRedundantImpossibleProperties(value: unknown): unknown;
export function omitRedundantImpossibleProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => omitRedundantImpossibleProperties(entry));
  }
  if (!isJsonObject(value)) return value;

  const requiredProperties = new Set(
    Array.isArray(value.required)
      ? value.required.filter(
          (propertyName): propertyName is string =>
            typeof propertyName === "string",
        )
      : [],
  );

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        key !== "properties" ||
        value.additionalProperties !== false ||
        !isJsonObject(entry)
      ) {
        return [key, omitRedundantImpossibleProperties(entry)];
      }

      return [
        key,
        Object.fromEntries(
          Object.entries(entry)
            .filter(
              ([propertyName, propertySchema]) =>
                requiredProperties.has(propertyName) ||
                !isImpossibleJsonSchema(propertySchema),
            )
            .map(([propertyName, propertySchema]) => [
              propertyName,
              omitRedundantImpossibleProperties(propertySchema),
            ]),
        ),
      ];
    }),
  );
}

export function mcpOutputJsonSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpOutputSchema {
  const cached = outputSchemaByCodec.get(schema);
  if (cached !== undefined) return cached;

  const generated = omitRedundantImpossibleProperties(
    jsonSchemaFromCodec(schema),
  );
  const identified = {
    $id: outputSchemaId(generated),
    ...generated,
  } satisfies McpOutputSchema;
  outputSchemaByCodec.set(schema, identified);
  return identified;
}

export function schemaJsonContent<A, I>(
  schema: Schema.Schema<A, I, never>,
  value: A,
) {
  const encoded = jsonSerializablePayload(Schema.encodeSync(schema)(value));
  return {
    ...jsonContent(encoded),
    structuredContent: encoded,
  };
}

function jsonSchemaFromCodec<A, I>(
  schema: Schema.Schema<A, I, never>,
): McpOutputSchema {
  return stripSchemaIds(JSONSchema.make(schema));
}

function parseMcpObjectInputSchema(
  schema: McpOutputSchema,
  label: string,
): McpObjectInputSchema {
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

function isImpossibleJsonSchema(value: unknown): boolean {
  if (!isJsonObject(value) || !isJsonObject(value.not)) return false;
  return Object.keys(value.not).length === 0;
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

function stripSchemaIds(value: object): McpOutputSchema;
function stripSchemaIds(value: unknown): unknown;
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

function outputSchemaId(schema: McpOutputSchema): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(schema))
    .digest("hex");
  return `urn:dnd:mcp:output-schema:sha256:${digest}`;
}
