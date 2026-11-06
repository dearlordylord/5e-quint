import { createHash } from "node:crypto";
import { Match, Option, Result, Schema } from "effect";
import type { McpApplicationServices } from "./composition-root.ts";

const Index = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);
const Node = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("scalar"),
    value: Schema.Union([
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Null,
    ]),
  }),
  Schema.Struct({ kind: Schema.Literal("undefined") }),
  Schema.Struct({
    kind: Schema.Literal("bigint"),
    value: Schema.String.check(Schema.isPattern(/^-?\d+$/u)),
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    fields: Schema.Array(Schema.Tuple([Schema.String, Index])),
  }),
  Schema.Struct({ kind: Schema.Literal("array"), items: Schema.Array(Index) }),
  Schema.Struct({
    kind: Schema.Literal("map"),
    entries: Schema.Array(Schema.Tuple([Index, Index])),
  }),
  Schema.Struct({ kind: Schema.Literal("set"), items: Schema.Array(Index) }),
  Schema.Struct({ kind: Schema.Literal("some"), value: Index }),
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("catalog"),
    key: Schema.String,
    hash: Schema.String,
  }),
]);
export const ContinuationGraphSchema = Schema.Struct({
  root: Index,
  nodes: Schema.Array(Node),
});
export type ContinuationGraph = typeof ContinuationGraphSchema.Type;
type CatalogReferences = {
  readonly values: ReadonlyMap<
    string,
    { readonly value: object; readonly hash: string }
  >;
  readonly keys: WeakMap<object, string>;
};
const catalogs = new WeakMap<object, WeakMap<object, CatalogReferences>>();

function catalogReferences(
  services: McpApplicationServices,
): CatalogReferences {
  const existing = catalogs
    .get(services.unitLibrary)
    ?.get(services.statBlockCatalog);
  if (existing !== undefined) return existing;
  const values = new Map<string, { value: object; hash: string }>();
  const keys = new WeakMap<object, string>();
  function retain(value: unknown, path: readonly string[]): void {
    if (typeof value !== "object" || value === null || keys.has(value)) return;
    const key = JSON.stringify(path);
    keys.set(value, key);
    values.set(key, {
      value,
      hash: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
    });
    for (const [field, child] of Object.entries(value))
      retain(child, [...path, field]);
  }
  for (const unit of services.unitLibrary.listUnits())
    retain(unit, ["unit", unit.id]);
  for (const statBlock of services.statBlockCatalog.listStatBlocks())
    retain(statBlock, ["statBlock", statBlock.id]);
  const references = { values, keys };
  const statBlockCatalogs =
    catalogs.get(services.unitLibrary) ??
    new WeakMap<object, CatalogReferences>();
  statBlockCatalogs.set(services.statBlockCatalog, references);
  catalogs.set(services.unitLibrary, statBlockCatalogs);
  return references;
}

export function encodeContinuationGraph(
  services: McpApplicationServices,
  value: unknown,
): Result.Result<ContinuationGraph, string> {
  const references = catalogReferences(services);
  const nodes: (typeof Node.Type)[] = [];
  const indices = new Map<unknown, number>();
  const active = new Set<object>();
  function encode(value: unknown): Result.Result<number, string> {
    return Result.gen(function* () {
      if (typeof value === "object" && value !== null && active.has(value))
        return yield* Result.fail("Canonical continuation contains a cycle.");
      const prior = indices.get(value);
      if (prior !== undefined) return prior;
      const index = nodes.length;
      indices.set(value, index);
      nodes.push({ kind: "undefined" });
      if (value === undefined) return index;
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      )
        nodes[index] = { kind: "scalar", value };
      else if (typeof value === "bigint")
        nodes[index] = { kind: "bigint", value: String(value) };
      else if (typeof value === "object") {
        active.add(value);
        const key = references.keys.get(value);
        const reference =
          key === undefined ? undefined : references.values.get(key);
        if (reference !== undefined && key !== undefined)
          nodes[index] = { kind: "catalog", key, hash: reference.hash };
        else if (Option.isOption(value))
          nodes[index] = Option.isSome(value)
            ? { kind: "some", value: yield* encode(value.value) }
            : { kind: "none" };
        else if (Array.isArray(value))
          nodes[index] = {
            kind: "array",
            items: yield* Result.all(value.map(encode)),
          };
        else if (value instanceof Map)
          nodes[index] = {
            kind: "map",
            entries: yield* Result.all(
              [...value].map(([key, entry]) =>
                Result.gen(function* () {
                  return [yield* encode(key), yield* encode(entry)] as const;
                }),
              ),
            ),
          };
        else if (value instanceof Set)
          nodes[index] = {
            kind: "set",
            items: yield* Result.all([...value].map(encode)),
          };
        else if (
          Object.getPrototypeOf(value) === Object.prototype ||
          Object.getPrototypeOf(value) === null
        )
          nodes[index] = {
            kind: "object",
            fields: yield* Result.all(
              Object.entries(value).map(([key, entry]) =>
                Result.map(encode(entry), (index) => [key, index] as const),
              ),
            ),
          };
        else
          return yield* Result.fail(
            "Canonical continuation contains an unsupported class.",
          );
        active.delete(value);
      } else
        return yield* Result.fail(
          "Canonical continuation contains a function, symbol, or non-finite value.",
        );
      return index;
    });
  }
  return Result.map(encode(value), (root) => ({ root, nodes }));
}

export function decodeContinuationGraph(
  services: McpApplicationServices,
  graph: ContinuationGraph,
): Result.Result<unknown, string> {
  const references = catalogReferences(services);
  const values = new Map<number, unknown>();
  const active = new Set<number>();
  function decode(index: number): Result.Result<unknown, string> {
    if (active.has(index))
      return Result.fail("Saved continuation contains a cycle.");
    if (values.has(index)) return Result.succeed(values.get(index));
    const node = graph.nodes[index];
    if (node === undefined)
      return Result.fail(
        "Saved continuation contains an absent graph reference.",
      );
    active.add(index);
    const result = Match.value(node).pipe(
      Match.when({ kind: "scalar" }, ({ value }) => Result.succeed(value)),
      Match.when({ kind: "undefined" }, () => Result.succeed(undefined)),
      Match.when({ kind: "bigint" }, ({ value }) =>
        Result.succeed(BigInt(value)),
      ),
      Match.when({ kind: "object" }, ({ fields }) => {
        if (new Set(fields.map(([key]) => key)).size !== fields.length)
          return Result.fail(
            "Saved continuation contains duplicate object fields.",
          );
        return Result.map(
          Result.all(
            fields.map(([key, value]) =>
              Result.map(decode(value), (entry) => [key, entry] as const),
            ),
          ),
          Object.fromEntries,
        );
      }),
      Match.when({ kind: "array" }, ({ items }) =>
        Result.all(items.map(decode)),
      ),
      Match.when({ kind: "map" }, ({ entries }) =>
        Result.flatMap(
          Result.all(
            entries.map(([key, value]) =>
              Result.gen(function* () {
                return [yield* decode(key), yield* decode(value)] as const;
              }),
            ),
          ),
          (entries) => {
            const map = new Map(entries);
            return map.size === entries.length
              ? Result.succeed(map)
              : Result.fail("Saved continuation contains duplicate Map keys.");
          },
        ),
      ),
      Match.when({ kind: "set" }, ({ items }) =>
        Result.flatMap(Result.all(items.map(decode)), (items) => {
          const set = new Set(items);
          return set.size === items.length
            ? Result.succeed(set)
            : Result.fail("Saved continuation contains duplicate Set entries.");
        }),
      ),
      Match.when({ kind: "some" }, ({ value }) =>
        Result.map(decode(value), Option.some),
      ),
      Match.when({ kind: "none" }, () => Result.succeed(Option.none())),
      Match.when({ kind: "catalog" }, ({ key, hash }) => {
        const reference = references.values.get(key);
        return reference === undefined || reference.hash !== hash
          ? Result.fail(
              "Saved catalog facts changed or are unavailable; deployment investigation is required.",
            )
          : Result.succeed(reference.value);
      }),
      Match.exhaustive,
    );
    if (Result.isFailure(result)) return result;
    active.delete(index);
    values.set(index, result.success);
    return result;
  }
  return Result.flatMap(decode(graph.root), (value) =>
    values.size === graph.nodes.length
      ? Result.succeed(value)
      : Result.fail("Saved continuation contains unreachable graph nodes."),
  );
}
