type JsonSchema = Readonly<Record<string, unknown>>;

const MODEL_VISIBLE_RESULT_PATH_DEPTH = 4;
export const MODEL_OUTPUT_SCHEMA_MAX_DEPTH_VALUES = [5] as const;

type ModelOutputSchemaMaxDepth =
  (typeof MODEL_OUTPUT_SCHEMA_MAX_DEPTH_VALUES)[number];

export type ModelOutputSchemaProjectionOptions = {
  readonly maxDepth?: ModelOutputSchemaMaxDepth;
};

export function projectModelOutputJsonSchema(
  schema: JsonSchema,
  options: ModelOutputSchemaProjectionOptions = {},
): JsonSchema {
  const definitions = isJsonObject(schema.$defs) ? schema.$defs : {};
  return projectValue(
    schema,
    definitions,
    options.maxDepth ?? MODEL_VISIBLE_RESULT_PATH_DEPTH,
  );
}

function projectObject(
  schema: JsonSchema,
  definitions: JsonSchema,
  remainingDepth: number,
): JsonSchema {
  if (remainingDepth === 0) return { type: "object" };
  const properties = isJsonObject(schema.properties)
    ? Object.fromEntries(
        Object.entries(schema.properties).map(
          ([propertyName, propertySchema]) => [
            propertyName,
            projectValue(propertySchema, definitions, remainingDepth - 1),
          ],
        ),
      )
    : {};
  return {
    type: "object",
    properties,
    ...(Array.isArray(schema.required) ? { required: schema.required } : {}),
    ...(typeof schema.additionalProperties === "boolean"
      ? { additionalProperties: schema.additionalProperties }
      : {}),
  };
}

function projectValue(
  schema: unknown,
  definitions: JsonSchema,
  remainingDepth: number,
): JsonSchema {
  const resolved = resolveReference(schema, definitions);
  if (resolved === undefined) return {};

  const projectedAlternatives = projectAlternatives(
    resolved,
    definitions,
    remainingDepth,
  );
  if (projectedAlternatives !== undefined) return projectedAlternatives;

  const projectedLiteral = projectLiteral(resolved);
  if (projectedLiteral !== undefined) return projectedLiteral;

  return projectTypedValue(resolved, definitions, remainingDepth);
}

function projectAlternatives(
  schema: JsonSchema,
  definitions: JsonSchema,
  remainingDepth: number,
): JsonSchema | undefined {
  if (!Array.isArray(schema.anyOf)) return undefined;
  const alternatives = schema.anyOf.map((alternative) =>
    projectValue(alternative, definitions, remainingDepth),
  );
  const mergedObjects =
    remainingDepth <= 1 ? mergeObjectAlternatives(alternatives) : undefined;
  return mergedObjects ?? distinctAlternatives(alternatives);
}

function projectLiteral(schema: JsonSchema): JsonSchema | undefined {
  if ("const" in schema) {
    return { type: jsonValueType(schema.const), const: schema.const };
  }
  if (Array.isArray(schema.enum)) {
    return {
      ...(typeof schema.type === "string" ? { type: schema.type } : {}),
      enum: schema.enum,
    };
  }
  return undefined;
}

function projectTypedValue(
  schema: JsonSchema,
  definitions: JsonSchema,
  remainingDepth: number,
): JsonSchema {
  if (schema.type === "object") {
    return projectObject(schema, definitions, remainingDepth);
  }
  if (schema.type === "array") {
    return {
      type: "array",
      ...(remainingDepth > 0
        ? {
            items: projectValue(schema.items, definitions, remainingDepth - 1),
          }
        : {}),
    };
  }
  if (typeof schema.type === "string") return { type: schema.type };
  if (
    Array.isArray(schema.type) &&
    schema.type.every((typeName) => typeof typeName === "string")
  ) {
    return { type: schema.type };
  }
  return {};
}

function mergeObjectAlternatives(
  alternatives: readonly JsonSchema[],
): JsonSchema | undefined {
  if (!areObjectAlternatives(alternatives)) return undefined;

  const propertiesByName = alternativePropertiesByName(alternatives);
  const required = commonRequiredPropertyNames(alternatives);
  return {
    type: "object",
    properties: Object.fromEntries(
      [...propertiesByName].map(([propertyName, propertySchemas]) => [
        propertyName,
        distinctAlternatives(propertySchemas),
      ]),
    ),
    ...(required.length > 0 ? { required } : {}),
    ...(alternatives.every(hasClosedObjectShape)
      ? { additionalProperties: false }
      : {}),
  };
}

function areObjectAlternatives(alternatives: readonly JsonSchema[]): boolean {
  return (
    alternatives.length > 0 &&
    alternatives.every((alternative) => alternative.type === "object")
  );
}

function alternativePropertiesByName(
  alternatives: readonly JsonSchema[],
): ReadonlyMap<string, readonly JsonSchema[]> {
  const propertiesByName = new Map<string, JsonSchema[]>();
  for (const alternative of alternatives) {
    if (!isJsonObject(alternative.properties)) continue;
    for (const [propertyName, propertySchema] of Object.entries(
      alternative.properties,
    )) {
      if (!isJsonObject(propertySchema)) continue;
      const schemas = propertiesByName.get(propertyName) ?? [];
      schemas.push(propertySchema);
      propertiesByName.set(propertyName, schemas);
    }
  }
  return propertiesByName;
}

function commonRequiredPropertyNames(
  alternatives: readonly JsonSchema[],
): readonly string[] {
  const requiredSets = alternatives.map(
    (alternative) =>
      new Set(
        Array.isArray(alternative.required)
          ? alternative.required.filter(
              (propertyName): propertyName is string =>
                typeof propertyName === "string",
            )
          : [],
      ),
  );
  return [...(requiredSets[0] ?? [])].filter((propertyName) =>
    requiredSets.every((requiredSet) => requiredSet.has(propertyName)),
  );
}

function hasClosedObjectShape(schema: JsonSchema): boolean {
  return schema.additionalProperties === false;
}

function distinctAlternatives(alternatives: readonly JsonSchema[]): JsonSchema {
  const distinct = [
    ...new Map(
      alternatives.map((alternative) => [
        JSON.stringify(alternative),
        alternative,
      ]),
    ).values(),
  ];
  return distinct.length === 1 ? (distinct[0] ?? {}) : { anyOf: distinct };
}

function resolveReference(
  schema: unknown,
  definitions: JsonSchema,
): JsonSchema | undefined {
  if (!isJsonObject(schema)) return undefined;
  if (typeof schema.$ref !== "string" || !schema.$ref.startsWith("#/$defs/")) {
    return schema;
  }
  const [encodedDefinitionName = ""] = schema.$ref
    .slice("#/$defs/".length)
    .split("/", 1);
  const definitionName = encodedDefinitionName
    .replaceAll("~1", "/")
    .replaceAll("~0", "~");
  const resolved = definitions[definitionName];
  return isJsonObject(resolved) ? resolved : undefined;
}

function jsonValueType(
  value: unknown,
): "array" | "boolean" | "null" | "number" | "object" | "string" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "object";
}

function isJsonObject(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
