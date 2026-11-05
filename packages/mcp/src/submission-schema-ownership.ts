import { visitSchemaChildren } from "./json-schema-sharing.ts";
import type { McpOutputSchema } from "./schema-codec.ts";

type SchemaNode = {
  readonly value: McpOutputSchema;
  readonly path: string;
  readonly children: Map<string, SchemaNode>;
};
type SchemaGraph = {
  readonly root: SchemaNode;
  readonly nodes: ReadonlyMap<string, SchemaNode>;
};
const ownershipCache = new WeakMap<
  object,
  WeakMap<object, ReadonlyMap<string, boolean>>
>();

export function rootedCanonicalOwnership(
  advertised: McpOutputSchema,
  canonical: McpOutputSchema,
): ReadonlyMap<string, boolean> {
  const cached = ownershipCache.get(advertised)?.get(canonical);
  if (cached !== undefined) return cached;
  const source = schemaGraph(advertised);
  const target = schemaGraph(canonical);
  const ownership = new Map<string, boolean>();
  const visited = new Map<SchemaNode, Set<string>>();
  const variants = (initial: readonly (SchemaNode | undefined)[]) => {
    const found = new Set<SchemaNode | undefined>();
    const collect = (candidate: SchemaNode | undefined): void => {
      const resolved =
        candidate === undefined ? undefined : resolveAliases(target, candidate);
      if (found.has(resolved)) return;
      found.add(resolved);
      if (resolved !== undefined)
        for (const [edge, child] of resolved.children) {
          if (isPositiveApplicator(edge)) collect(child);
        }
    };
    initial.forEach(collect);
    return [...found];
  };
  const compare = (
    sourceNode: SchemaNode,
    targetNodes: readonly (SchemaNode | undefined)[],
  ): void => {
    const from = resolveAliases(source, sourceNode);
    if (from === undefined) return;
    const candidates = variants(targetNodes);
    const key = JSON.stringify(
      candidates.map((node) => node?.path ?? null).sort(),
    );
    const seen = visited.get(from) ?? new Set<string>();
    if (seen.has(key)) return;
    seen.add(key);
    visited.set(from, seen);
    ownership.set(
      from.path,
      (ownership.get(from.path) ?? true) && hasObjectOwner(target, targetNodes),
    );
    for (const [edge, child] of from.children) {
      if (isPositiveApplicator(edge)) {
        compare(child, targetNodes);
      } else if (isDataEdge(edge)) {
        const matches = candidates.flatMap((node) =>
          node === undefined
            ? [undefined]
            : node.children.has(edge)
              ? [node.children.get(edge)]
              : allowsUnknownData(node)
                ? [undefined]
                : [],
        );
        compare(child, matches.length === 0 ? [undefined] : matches);
      }
    }
  };
  compare(source.root, [target.root]);
  const targets =
    ownershipCache.get(advertised) ??
    new WeakMap<object, ReadonlyMap<string, boolean>>();
  targets.set(canonical, ownership);
  ownershipCache.set(advertised, targets);
  return ownership;
}

function schemaGraph(schema: McpOutputSchema): SchemaGraph {
  const nodes = new Map<string, SchemaNode>();
  const ancestors: {
    readonly segments: readonly string[];
    readonly node: SchemaNode;
  }[] = [];
  const root: SchemaNode = { value: schema, path: "/", children: new Map() };
  visitSchemaChildren(schema, (value, segments) => {
    const node =
      segments.length === 0
        ? root
        : {
            value,
            path: pointer(segments),
            children: new Map<string, SchemaNode>(),
          };
    while (
      ancestors.length > 0 &&
      !isAncestor(ancestors[ancestors.length - 1]?.segments, segments)
    )
      ancestors.pop();
    const parent = ancestors[ancestors.length - 1];
    if (parent !== undefined)
      parent.node.children.set(
        pointer(segments.slice(parent.segments.length)),
        node,
      );
    nodes.set(node.path, node);
    ancestors.push({ segments, node });
  });
  return { root, nodes };
}

function isAncestor(
  parent: readonly string[] | undefined,
  child: readonly string[],
): boolean {
  return (
    parent !== undefined &&
    parent.length < child.length &&
    parent.every((segment, index) => child[index] === segment)
  );
}
function pointer(segments: readonly string[]): string {
  return `/${segments.map((segment) => segment.replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}
function isDefinitionEdge(edge: string): boolean {
  return edge.startsWith("/$defs/") || edge.startsWith("/definitions/");
}
function isPositiveApplicator(edge: string): boolean {
  return (
    edge.startsWith("/anyOf/") ||
    edge.startsWith("/oneOf/") ||
    edge.startsWith("/allOf/")
  );
}
function isDataEdge(edge: string): boolean {
  return (
    edge.startsWith("/properties/") ||
    edge === "/items" ||
    edge.startsWith("/prefixItems/") ||
    edge === "/additionalProperties" ||
    edge.startsWith("/patternProperties/")
  );
}
function resolveAliases(
  graph: SchemaGraph,
  initial: SchemaNode,
): SchemaNode | undefined {
  const visited = new Set<SchemaNode>();
  let node: SchemaNode | undefined = initial;
  while (node !== undefined && typeof node.value.$ref === "string") {
    if (
      visited.has(node) ||
      [...node.children.keys()].some((edge) => !isDefinitionEdge(edge))
    )
      return undefined;
    visited.add(node);
    const reference: string = node.value.$ref;
    node =
      reference === "#"
        ? graph.root
        : reference.startsWith("#/")
          ? graph.nodes.get(reference.slice(1))
          : undefined;
  }
  return node;
}
function allowsUnknownData(node: SchemaNode): boolean {
  if ([...node.children.keys()].some(isPositiveApplicator)) return false;
  return node.value.type === "object"
    ? node.value.additionalProperties !== false
    : node.value.type === undefined || node.value.type === "array";
}
function canContainObject(
  graph: SchemaGraph,
  candidate: SchemaNode | undefined,
): boolean {
  const node =
    candidate === undefined ? undefined : resolveAliases(graph, candidate);
  if (node === undefined) return true;
  if ("const" in node.value)
    return (
      typeof node.value.const === "object" &&
      node.value.const !== null &&
      !Array.isArray(node.value.const)
    );
  if (Array.isArray(node.value.enum))
    return node.value.enum.some(
      (value) =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    );
  const type = node.value.type;
  return (
    type === undefined ||
    type === "object" ||
    (Array.isArray(type) && type.includes("object"))
  );
}
function hasObjectOwner(
  graph: SchemaGraph,
  candidates: readonly (SchemaNode | undefined)[],
): boolean {
  const closed = (
    candidate: SchemaNode | undefined,
    ancestors: ReadonlySet<SchemaNode>,
  ): boolean => {
    const node =
      candidate === undefined ? undefined : resolveAliases(graph, candidate);
    if (
      node === undefined ||
      ancestors.has(node) ||
      !canContainObject(graph, node)
    )
      return false;
    if (node.value.additionalProperties === false) return true;
    const visited = new Set([...ancestors, node]);
    const intersections = [...node.children]
      .filter(([edge]) => edge.startsWith("/allOf/"))
      .map(([, child]) => child);
    if (
      intersections.length > 0 &&
      intersections.every((child) => canContainObject(graph, child)) &&
      intersections.some((child) => closed(child, visited))
    )
      return true;
    const alternatives = [...node.children]
      .filter(
        ([edge]) => edge.startsWith("/anyOf/") || edge.startsWith("/oneOf/"),
      )
      .map(([, child]) => child)
      .filter((child) => canContainObject(graph, child));
    return (
      alternatives.length > 0 &&
      alternatives.every((child) => closed(child, visited))
    );
  };
  const objects = candidates.filter((node) => canContainObject(graph, node));
  return objects.length > 0 && objects.every((node) => closed(node, new Set()));
}
