type JsonSchema = Readonly<Record<string, unknown>>;

const MODEL_VISIBLE_RESULT_PATH_DEPTH = 4;

export function projectModelOutputJsonSchema(schema: JsonSchema): JsonSchema {
  const definitions = isJsonObject(schema.$defs) ? schema.$defs : {};
  return projectValue(schema, definitions, MODEL_VISIBLE_RESULT_PATH_DEPTH);
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

  if (Array.isArray(resolved.anyOf)) {
    const alternatives = resolved.anyOf.map((alternative) =>
      projectValue(alternative, definitions, remainingDepth),
    );
    const mergedObjects =
      remainingDepth <= 1 ? mergeObjectAlternatives(alternatives) : undefined;
    return mergedObjects ?? distinctAlternatives(alternatives);
  }

  if ("const" in resolved) {
    return { type: jsonValueType(resolved.const), const: resolved.const };
  }
  if (Array.isArray(resolved.enum)) {
    return {
      ...(typeof resolved.type === "string" ? { type: resolved.type } : {}),
      enum: resolved.enum,
    };
  }
  if (resolved.type === "object") {
    return projectObject(resolved, definitions, remainingDepth);
  }
  if (resolved.type === "array") {
    return {
      type: "array",
      ...(remainingDepth > 0
        ? {
            items: projectValue(
              resolved.items,
              definitions,
              remainingDepth - 1,
            ),
          }
        : {}),
    };
  }
  if (typeof resolved.type === "string") return { type: resolved.type };
  if (
    Array.isArray(resolved.type) &&
    resolved.type.every((typeName) => typeof typeName === "string")
  ) {
    return { type: resolved.type };
  }
  return {};
}

function mergeObjectAlternatives(
  alternatives: readonly JsonSchema[],
): JsonSchema | undefined {
  if (
    alternatives.length === 0 ||
    alternatives.some((alternative) => alternative.type !== "object")
  ) {
    return undefined;
  }

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
  const required = [...(requiredSets[0] ?? [])].filter((propertyName) =>
    requiredSets.every((requiredSet) => requiredSet.has(propertyName)),
  );
  return {
    type: "object",
    properties: Object.fromEntries(
      [...propertiesByName].map(([propertyName, propertySchemas]) => [
        propertyName,
        distinctAlternatives(propertySchemas),
      ]),
    ),
    ...(required.length > 0 ? { required } : {}),
    ...(alternatives.every(
      (alternative) => alternative.additionalProperties === false,
    )
      ? { additionalProperties: false }
      : {}),
  };
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
