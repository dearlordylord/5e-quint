import type { McpOutputSchema } from "./schema-codec.ts";
import { mapSchemaChildren } from "./json-schema-sharing.ts";

const LOCAL_PREFIX = "#/$defs/";
function object(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function walk(
  schema: McpOutputSchema,
  visit: (schema: McpOutputSchema) => void,
) {
  visit(schema);
  mapSchemaChildren(schema, (child) => {
    walk(child, visit);
    return child;
  });
}
function definitionName(reference: string): string | undefined {
  if (!reference.startsWith(LOCAL_PREFIX)) return undefined;
  return reference
    .slice(LOCAL_PREFIX.length)
    .split("/")[0]
    ?.replaceAll("~1", "/")
    .replaceAll("~0", "~");
}
function localReference(name: string): string {
  return `${LOCAL_PREFIX}${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function changesReferenceScope(
  schema: McpOutputSchema,
  root: McpOutputSchema,
): boolean {
  if (
    schema !== root &&
    (schema.$id !== undefined || schema.$defs !== undefined)
  )
    return true;
  if (
    ["$anchor", "$dynamicAnchor", "$dynamicRef"].some(
      (key) => schema[key] !== undefined,
    )
  )
    return true;
  return (
    typeof schema.$ref === "string" &&
    (!schema.$ref.startsWith(LOCAL_PREFIX) || schema.$ref.includes("%"))
  );
}

function definitionReferenceUse(source: McpOutputSchema) {
  const counts = new Map<string, number>();
  const blocked = new Set<string>();
  walk(source, (schema) => {
    if (typeof schema.$ref !== "string") return;
    const name = definitionName(schema.$ref);
    if (name === undefined) return;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (
      Object.keys(schema).length !== 1 ||
      schema.$ref !== localReference(name)
    )
      blocked.add(name);
  });
  return { counts, blocked };
}

function leafDefinitionReplacements(
  source: McpOutputSchema,
  definitions: McpOutputSchema,
) {
  const { counts, blocked } = definitionReferenceUse(source);
  const replacements = new Map<string, McpOutputSchema>();
  for (const [name, target] of Object.entries(definitions)) {
    const count = counts.get(name);
    if (!object(target) || blocked.has(name) || count === undefined) continue;
    let references = false;
    walk(target, (schema) => {
      if (schema.$ref !== undefined) references = true;
    });
    if (references) continue; // Leaves prevent recursive expansion and reference-scope changes.
    const referenceBytes = Buffer.byteLength(
      JSON.stringify({ $ref: localReference(name) }),
    );
    const targetBytes = Buffer.byteLength(JSON.stringify(target));
    const entryBytes =
      Buffer.byteLength(JSON.stringify(name)) + 1 + targetBytes;
    if (count * (targetBytes - referenceBytes) < entryBytes)
      replacements.set(name, target);
  }
  return replacements;
}

/** Inline leaf definitions only when the complete serialized schema becomes smaller. */
export function inlineCostlySchemaDefinitions(
  source: McpOutputSchema,
): McpOutputSchema {
  let unsafeScope = false;
  walk(source, (schema) => {
    if (changesReferenceScope(schema, source)) unsafeScope = true;
  });
  if (unsafeScope) return source;
  let current = source;
  while (object(current.$defs)) {
    const definitions = current.$defs;
    const replacements = leafDefinitionReplacements(current, definitions);
    if (replacements.size === 0) return current;
    const rewrite = (schema: McpOutputSchema): McpOutputSchema => {
      const name =
        typeof schema.$ref === "string"
          ? definitionName(schema.$ref)
          : undefined;
      const replacement =
        name === undefined ? undefined : replacements.get(name);
      return replacement !== undefined && Object.keys(schema).length === 1
        ? replacement
        : mapSchemaChildren(schema, rewrite);
    };
    const remaining = Object.fromEntries(
      Object.entries(definitions).filter(([key]) => !replacements.has(key)),
    );
    const candidate = rewrite({ ...current, $defs: remaining });
    if (
      Buffer.byteLength(JSON.stringify(candidate)) >=
      Buffer.byteLength(JSON.stringify(current))
    )
      return current;
    current = candidate;
  }
  return current;
}
