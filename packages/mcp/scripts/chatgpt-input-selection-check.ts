import type { ChatGptExposure } from "../src/chatgpt/operation-tool-plan.ts";
import type { McpOutputSchema } from "../src/schema-codec.ts";
import type { ProtocolToolDefinition } from "../src/tool-definition-contract.ts";
import { Match } from "effect";

const LOCAL_DEFINITION_PREFIX = "#/$defs/";

function object(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolve(
  source: unknown,
  definitions: McpOutputSchema,
  seen = new Set<string>(),
): McpOutputSchema | undefined {
  if (!object(source)) return undefined;
  if (source.$ref === undefined) return source;
  if (
    Object.keys(source).length !== 1 ||
    typeof source.$ref !== "string" ||
    !source.$ref.startsWith(LOCAL_DEFINITION_PREFIX)
  )
    return undefined;
  const name = source.$ref
    .slice(LOCAL_DEFINITION_PREFIX.length)
    .replaceAll("~1", "/")
    .replaceAll("~0", "~");
  if (seen.has(name)) return undefined;
  return resolve(definitions[name], definitions, new Set([...seen, name]));
}
function required(schema: McpOutputSchema, field: string): boolean {
  return Array.isArray(schema.required) && schema.required.includes(field);
}

/** Verify the actual advertised selector, independently of the factory's decoded type. */
export function checkChatGptInputSelections(
  exposure: Readonly<Record<string, Readonly<Record<string, ChatGptExposure>>>>,
  definitions: readonly ProtocolToolDefinition[],
): readonly string[] {
  const issues: string[] = [];
  const byName = new Map(
    definitions.map((definition) => [definition.name, definition]),
  );
  for (const family of [
    "characterMutations",
    "characterQueries",
    "battleLifecycle",
  ] as const) {
    const field = Match.value(family).pipe(
      Match.when("characterQueries", () => "query"),
      Match.whenOr("characterMutations", "battleLifecycle", () => "operation"),
      Match.exhaustive,
    );
    for (const [operation, route] of Object.entries(exposure[family] ?? {})) {
      if (route.kind !== "tools") continue;
      for (const name of route.tools) {
        const definition = byName.get(name);
        if (!definition) continue; // The descriptor coverage check owns absent tools.
        const root = definition.inputSchema;
        const definitions = object(root.$defs) ? root.$defs : {};
        const selector = object(root.properties)
          ? resolve(root.properties[field], definitions)
          : undefined;
        const kind =
          selector && object(selector.properties)
            ? resolve(selector.properties.kind, definitions)
            : undefined;
        const values =
          typeof kind?.const === "string"
            ? [kind.const]
            : Array.isArray(kind?.enum) &&
                kind.enum.every((value) => typeof value === "string")
              ? kind.enum
              : undefined;
        if (
          !required(root, field) ||
          !selector ||
          !required(selector, "kind") ||
          !values ||
          values.length !== 1 ||
          values[0] !== operation ||
          (kind?.const !== undefined && kind.const !== operation) ||
          (kind?.enum !== undefined &&
            (!Array.isArray(kind.enum) || !kind.enum.includes(operation)))
        )
          issues.push(
            `${name}: advertised ${field}.kind must require exactly ${family}.${operation}`,
          );
      }
    }
  }
  return issues;
}
