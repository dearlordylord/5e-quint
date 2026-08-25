import { Either, ParseResult, Schema } from "effect";
import * as SchemaAST from "effect/SchemaAST";

import {
  PublishedSrdStatBlockRecordSchema,
  PublishedSrdSurfaceSchema,
  PublishedSrdUnitRecordSchema,
  type PublishedSrdSurface,
} from "./schema.ts";
import {
  readSurfaceSchemaRole,
  type SurfaceSchemaFieldRole,
} from "./schema-base.ts";

const STRICT_DECODE_OPTIONS = { onExcessProperty: "error" } as const;

export const PORTABLE_SURFACE_ISSUE_CODES = [
  "json",
  "shape",
  "schema",
  "duplicate-json-member",
  "duplicate-authored-identity",
  "dangling-authored-dependency",
  "unsupported-schema-node",
] as const;
export type PortableSrdSurfaceIssueCode =
  (typeof PORTABLE_SURFACE_ISSUE_CODES)[number];

type PortableSrdSurfaceIssueBase = {
  readonly path: string;
  readonly message: string;
};

export type PortableSrdSurfaceIssue =
  | (PortableSrdSurfaceIssueBase & { readonly code: "json" })
  | (PortableSrdSurfaceIssueBase & { readonly code: "shape" })
  | (PortableSrdSurfaceIssueBase & { readonly code: "schema" })
  | (PortableSrdSurfaceIssueBase & {
      readonly code: "duplicate-json-member";
      readonly memberName: string;
    })
  | (PortableSrdSurfaceIssueBase & {
      readonly code: "duplicate-authored-identity";
      readonly targetKind: "unit" | "statBlock";
      readonly targetId: string;
      readonly priorPath: string;
    })
  | (PortableSrdSurfaceIssueBase & {
      readonly code: "dangling-authored-dependency";
      readonly targetKind: "unit" | "statBlock";
      readonly targetId: string;
      readonly relation: Extract<
        SurfaceSchemaFieldRole,
        { readonly category: "dependency" }
      >["relation"];
    })
  | (PortableSrdSurfaceIssueBase & {
      readonly code: "unsupported-schema-node";
      readonly astTag: SchemaAST.AST["_tag"];
    });

export type PortableSrdSurfaceDecodeResult =
  | { readonly tag: "accepted"; readonly surface: PublishedSrdSurface }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        PortableSrdSurfaceIssue,
        ...PortableSrdSurfaceIssue[],
      ];
    };

type PublishedUnit = Schema.Schema.Type<typeof PublishedSrdUnitRecordSchema>;
type PublishedStatBlock = Schema.Schema.Type<
  typeof PublishedSrdStatBlockRecordSchema
>;

type AuthoredDependency = {
  readonly path: string;
  readonly targetKind: "unit" | "statBlock";
  readonly targetId: string;
  readonly relation: Extract<
    SurfaceSchemaFieldRole,
    { readonly category: "dependency" }
  >["relation"];
};

type AuthoredDependencyCollection = {
  readonly dependencies: readonly AuthoredDependency[];
  readonly issues: readonly PortableSrdSurfaceIssue[];
};

export type PortableSrdDependencyFieldRole = {
  readonly sourceKind: "unit" | "statBlock";
  readonly path: string;
  readonly fieldName: string;
  readonly targetKind: "unit" | "statBlock";
  readonly relation: Extract<
    SurfaceSchemaFieldRole,
    { readonly category: "dependency" }
  >["relation"];
};

type RecordFamilyLabel = "Unit" | "Stat Block";

type DecodedMembers = {
  readonly units: readonly PublishedUnit[];
  readonly statBlocks: readonly PublishedStatBlock[];
  readonly unitEntries: readonly DecodedMember<PublishedUnit>[];
  readonly statBlockEntries: readonly DecodedMember<PublishedStatBlock>[];
};

type DecodedMember<T> = { readonly record: T; readonly index: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function jsonIssue(path: string, message: string): PortableSrdSurfaceIssue {
  return { code: "json", path, message };
}

function shapeIssue(path: string, message: string): PortableSrdSurfaceIssue {
  return { code: "shape", path, message };
}

function duplicateJsonMemberIssue(
  path: string,
  memberName: string,
): PortableSrdSurfaceIssue {
  return {
    code: "duplicate-json-member",
    path,
    message: `Duplicate JSON object member: ${memberName}`,
    memberName,
  };
}

function duplicateIdentityIssue(
  path: string,
  message: string,
  details: Omit<
    Extract<
      PortableSrdSurfaceIssue,
      { readonly code: "duplicate-authored-identity" }
    >,
    "path" | "message"
  >,
): PortableSrdSurfaceIssue {
  return { ...details, path, message };
}

function danglingDependencyIssue(
  path: string,
  message: string,
  details: Omit<
    Extract<
      PortableSrdSurfaceIssue,
      { readonly code: "dangling-authored-dependency" }
    >,
    "path" | "message"
  >,
): PortableSrdSurfaceIssue {
  return { ...details, path, message };
}

function unsupportedSchemaNodeIssue(
  path: string,
  astTag: SchemaAST.AST["_tag"],
): PortableSrdSurfaceIssue {
  return {
    code: "unsupported-schema-node",
    path,
    message: `Unsupported Surface schema AST node: ${astTag}`,
    astTag,
  };
}

function schemaIssue(path: string, error: ParseResult.ParseError) {
  return {
    code: "schema" as const,
    path,
    message: ParseResult.TreeFormatter.formatErrorSync(error),
  } satisfies PortableSrdSurfaceIssue;
}

function nonEmpty<T>(values: readonly T[]): readonly [T, ...T[]] | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

type JsonMemberScan = {
  readonly path: string;
  readonly memberName: string;
};

type JsonScanResult = {
  readonly valid: boolean;
  readonly duplicateMembers: readonly JsonMemberScan[];
};

class JsonMemberScanner {
  readonly #text: string;
  #cursor = 0;
  readonly #duplicateMembers: JsonMemberScan[] = [];

  constructor(text: string) {
    this.#text = text;
  }

  scan(): JsonScanResult {
    const valid = this.parseValue("$");
    this.skipWhitespace();
    return {
      valid: valid && this.#cursor === this.#text.length,
      duplicateMembers: this.#duplicateMembers,
    };
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.#text[this.#cursor] ?? "")) this.#cursor += 1;
  }

  private parseString(): string | undefined {
    const start = this.#cursor;
    if (this.#text[this.#cursor] !== '"') return undefined;
    this.#cursor += 1;
    let escaped = false;
    while (this.#cursor < this.#text.length) {
      const character = this.#text[this.#cursor];
      this.#cursor += 1;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        return this.decodeString(this.#text.slice(start, this.#cursor));
      }
    }
    return undefined;
  }

  private decodeString(encoded: string): string | undefined {
    try {
      const decoded: unknown = JSON.parse(encoded);
      return typeof decoded === "string" ? decoded : undefined;
    } catch {
      return undefined;
    }
  }

  private parseObject(path: string): boolean {
    this.#cursor += 1;
    this.skipWhitespace();
    const members = new Set<string>();
    if (this.#text[this.#cursor] === "}") {
      this.#cursor += 1;
      return true;
    }
    while (this.#cursor < this.#text.length) {
      const result = this.parseObjectMember(path, members);
      if (result === "invalid") return false;
      if (result === "close") return true;
    }
    return false;
  }

  private parseObjectMember(
    path: string,
    members: Set<string>,
  ): "close" | "comma" | "invalid" {
    this.skipWhitespace();
    const memberName = this.parseString();
    if (memberName === undefined) return "invalid";
    if (members.has(memberName)) {
      this.#duplicateMembers.push({
        path: `${path}.${memberName}`,
        memberName,
      });
    }
    members.add(memberName);
    this.skipWhitespace();
    if (this.#text[this.#cursor] !== ":") return "invalid";
    this.#cursor += 1;
    if (!this.parseValue(`${path}.${memberName}`)) return "invalid";
    this.skipWhitespace();
    if (this.#text[this.#cursor] === "}") {
      this.#cursor += 1;
      return "close";
    }
    if (this.#text[this.#cursor] !== ",") return "invalid";
    this.#cursor += 1;
    return "comma";
  }

  private parseArray(path: string): boolean {
    this.#cursor += 1;
    this.skipWhitespace();
    if (this.#text[this.#cursor] === "]") {
      this.#cursor += 1;
      return true;
    }
    let index = 0;
    while (this.#cursor < this.#text.length) {
      if (!this.parseValue(`${path}[${index}]`)) return false;
      index += 1;
      this.skipWhitespace();
      if (this.#text[this.#cursor] === "]") {
        this.#cursor += 1;
        return true;
      }
      if (this.#text[this.#cursor] !== ",") return false;
      this.#cursor += 1;
    }
    return false;
  }

  private parsePrimitive(): boolean {
    const start = this.#cursor;
    while (
      this.#cursor < this.#text.length &&
      !/[\s,\]}]/.test(this.#text[this.#cursor] ?? "")
    ) {
      this.#cursor += 1;
    }
    return this.#cursor > start;
  }

  private parseValue(path: string): boolean {
    this.skipWhitespace();
    const character = this.#text[this.#cursor];
    if (character === '"') return this.parseString() !== undefined;
    if (character === "{") return this.parseObject(path);
    if (character === "[") return this.parseArray(path);
    return this.parsePrimitive();
  }
}

function scanJsonMembers(text: string): JsonScanResult {
  return new JsonMemberScanner(text).scan();
}

export function decodePortableSrdSurfaceText(
  text: string,
): PortableSrdSurfaceDecodeResult {
  const scan = scanJsonMembers(text);
  if (scan.valid && scan.duplicateMembers.length > 0) {
    return rejected(
      scan.duplicateMembers.map(({ path, memberName }) =>
        duplicateJsonMemberIssue(path, memberName),
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return rejected([
      jsonIssue(
        "$",
        `Surface aggregate JSON could not be parsed: ${String(error)}`,
      ),
    ]);
  }
  return decodePortableSrdSurface(parsed);
}

function unknownRootPropertyIssues(
  raw: Record<string, unknown>,
): PortableSrdSurfaceIssue[] {
  return Object.keys(raw)
    .filter((key) => key !== "kind" && key !== "units" && key !== "statBlocks")
    .map((key) => ({
      code: "schema" as const,
      path: `$.${key}`,
      message: `Unknown Surface aggregate property: ${key}`,
    }));
}

function rootKindIssues(
  raw: Record<string, unknown>,
): PortableSrdSurfaceIssue[] {
  return raw.kind === "srd-5.2.1-surface-catalog"
    ? []
    : [
        shapeIssue(
          "$.kind",
          "Surface aggregate kind must be srd-5.2.1-surface-catalog",
        ),
      ];
}

function rootCollectionIssues(
  raw: Record<string, unknown>,
): PortableSrdSurfaceIssue[] {
  return (["units", "statBlocks"] as const).flatMap((member) => {
    const value = raw[member];
    return Array.isArray(value) && value.length > 0
      ? []
      : [
          shapeIssue(
            `$.${member}`,
            `Surface aggregate ${member} must be a non-empty array`,
          ),
        ];
  });
}

function rootShapeIssues(raw: unknown): PortableSrdSurfaceIssue[] {
  if (!isRecord(raw)) {
    return [shapeIssue("$", "Surface aggregate must be a JSON object")];
  }
  return [
    ...unknownRootPropertyIssues(raw),
    ...rootKindIssues(raw),
    ...rootCollectionIssues(raw),
  ];
}

function decodeMembers(raw: unknown, issues: PortableSrdSurfaceIssue[]) {
  const units: PublishedUnit[] = [];
  const statBlocks: PublishedStatBlock[] = [];
  const unitEntries: DecodedMember<PublishedUnit>[] = [];
  const statBlockEntries: DecodedMember<PublishedStatBlock>[] = [];
  if (!isRecord(raw)) {
    return { units, statBlocks, unitEntries, statBlockEntries };
  }

  const rawUnits = raw.units;
  if (Array.isArray(rawUnits)) {
    rawUnits.forEach((value, index) => {
      const decoded = Schema.decodeUnknownEither(
        PublishedSrdUnitRecordSchema,
        STRICT_DECODE_OPTIONS,
      )(value);
      if (Either.isLeft(decoded)) {
        issues.push(schemaIssue(`$.units[${index}]`, decoded.left));
      } else {
        units.push(decoded.right);
        unitEntries.push({ record: decoded.right, index });
      }
    });
  }

  const rawStatBlocks = raw.statBlocks;
  if (Array.isArray(rawStatBlocks)) {
    rawStatBlocks.forEach((value, index) => {
      const decoded = Schema.decodeUnknownEither(
        PublishedSrdStatBlockRecordSchema,
        STRICT_DECODE_OPTIONS,
      )(value);
      if (Either.isLeft(decoded)) {
        issues.push(schemaIssue(`$.statBlocks[${index}]`, decoded.left));
      } else {
        statBlocks.push(decoded.right);
        statBlockEntries.push({ record: decoded.right, index });
      }
    });
  }

  return { units, statBlocks, unitEntries, statBlockEntries };
}

function duplicateIdentityIssues(
  members: DecodedMembers,
): PortableSrdSurfaceIssue[] {
  const seen = new Map<
    string,
    { readonly family: RecordFamilyLabel; readonly path: string }
  >();
  const issues: PortableSrdSurfaceIssue[] = [];
  for (const [family, entries, member] of [
    ["Unit", members.unitEntries, "units"] as const,
    ["Stat Block", members.statBlockEntries, "statBlocks"] as const,
  ]) {
    entries.forEach(({ record, index }) => {
      const prior = seen.get(record.id);
      if (prior !== undefined) {
        issues.push(
          duplicateIdentityIssue(
            `$.${member}[${index}].id`,
            `${family} identity ${record.id} duplicates ${prior.family} at ${prior.path}`,
            {
              code: "duplicate-authored-identity",
              targetKind: member === "units" ? "unit" : "statBlock",
              targetId: String(record.id),
              priorPath: prior.path,
            },
          ),
        );
      } else {
        seen.set(record.id, {
          family,
          path: `$.${member}[${index}].id`,
        });
      }
    });
  }
  return issues;
}

const isObjectLike = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

function unsupportedSchemaAst(ast: SchemaAST.AST): never {
  throw new Error(`Unsupported Surface schema AST node: ${ast._tag}`);
}

function astChild(ast: SchemaAST.AST): SchemaAST.AST | undefined {
  if (ast._tag === "Transformation") return ast.to;
  if (ast._tag === "Refinement") return ast.from;
  return undefined;
}

const SUPPORTED_STRUCTURAL_AST_TAGS = new Set<SchemaAST.AST["_tag"]>([
  "AnyKeyword",
  "BigIntKeyword",
  "BooleanKeyword",
  "Declaration",
  "Literal",
  "NeverKeyword",
  "NumberKeyword",
  "ObjectKeyword",
  "StringKeyword",
  "SymbolKeyword",
  "TupleType",
  "TypeLiteral",
  "UndefinedKeyword",
  "Union",
  "UnknownKeyword",
  "VoidKeyword",
]);

const NON_LITERAL_AST_TAGS = new Set<SchemaAST.AST["_tag"]>([
  "AnyKeyword",
  "BigIntKeyword",
  "BooleanKeyword",
  "Declaration",
  "NeverKeyword",
  "NumberKeyword",
  "ObjectKeyword",
  "StringKeyword",
  "SymbolKeyword",
  "TupleType",
  "TypeLiteral",
  "UndefinedKeyword",
  "UnknownKeyword",
  "VoidKeyword",
]);

function structuralAst(ast: SchemaAST.AST): SchemaAST.AST {
  let current = ast;
  while (current._tag === "Transformation" || current._tag === "Refinement") {
    const child = astChild(current);
    if (child === undefined) return current;
    current = child;
  }
  if (current._tag === "Suspend") return structuralAst(current.f());
  return SUPPORTED_STRUCTURAL_AST_TAGS.has(current._tag)
    ? current
    : unsupportedSchemaAst(current);
}

function literalStrings(ast: SchemaAST.AST): readonly string[] {
  const current = structuralAst(ast);
  if (current._tag === "Literal") {
    return typeof current.literal === "string" ? [current.literal] : [];
  }
  if (current._tag === "Union") {
    return current.types.flatMap(literalStrings);
  }
  return NON_LITERAL_AST_TAGS.has(current._tag)
    ? []
    : unsupportedSchemaAst(current);
}

function discriminatorPropertyMatches(
  property: SchemaAST.PropertySignature,
  value: Record<string, unknown>,
): boolean | undefined {
  if (property.isOptional) return undefined;
  const literals = literalStrings(property.type);
  if (literals.length === 0) return undefined;
  return Object.hasOwn(value, property.name)
    ? literals.includes(String(value[String(property.name)]))
    : true;
}

function branchDiscriminatorMatches(
  ast: SchemaAST.AST,
  value: unknown,
): boolean {
  const current = structuralAst(ast);
  if (current._tag !== "TypeLiteral" || !isRecord(value)) return true;
  let hasDiscriminator = false;
  for (const property of current.propertySignatures) {
    const propertyMatch = discriminatorPropertyMatches(property, value);
    if (propertyMatch === undefined) continue;
    hasDiscriminator = true;
    if (!propertyMatch) return false;
  }
  return !hasDiscriminator || Object.keys(value).length > 0;
}

function matchingUnionBranches(
  ast: SchemaAST.Union,
  value: unknown,
): readonly SchemaAST.AST[] {
  const matches = ast.types.filter((member) =>
    branchDiscriminatorMatches(member, value),
  );
  return matches.length > 0 ? matches : ast.types;
}

type DependencyWalkItem = {
  readonly ast: SchemaAST.AST;
  readonly value: unknown;
  readonly path: string;
  readonly inheritedRole: SurfaceSchemaFieldRole | undefined;
};

type DependencyWalkContext = {
  readonly current: DependencyWalkItem;
  readonly role: SurfaceSchemaFieldRole | undefined;
  readonly pending: DependencyWalkItem[];
  readonly dependencies: AuthoredDependency[];
  readonly issues: PortableSrdSurfaceIssue[];
};

type DependencyNodeHandler = (context: DependencyWalkContext) => void;

function dependencyKey(
  path: string,
  targetKind: "unit" | "statBlock",
  targetId: string,
  relation: string,
): string {
  return `${path}\u0000${targetKind}\u0000${targetId}\u0000${relation}`;
}

function handleStringDependency(context: DependencyWalkContext): void {
  const { current, role, dependencies } = context;
  if (typeof current.value !== "string" || role?.category !== "dependency") {
    return;
  }
  const key = dependencyKey(
    current.path,
    role.targetKind,
    current.value,
    role.relation,
  );
  if (
    dependencies.some(
      (dependency) =>
        dependencyKey(
          dependency.path,
          dependency.targetKind,
          dependency.targetId,
          dependency.relation,
        ) === key,
    )
  ) {
    return;
  }
  dependencies.push({
    path: current.path,
    targetKind: role.targetKind,
    targetId: current.value,
    relation: role.relation,
  });
}

function handleNoop(): void {
  // Primitive schema nodes do not contain authored dependencies.
}

function handleWrappedNode(context: DependencyWalkContext): void {
  const child = astChild(context.current.ast);
  if (child === undefined) return;
  context.pending.push({
    ...context.current,
    ast: child,
    inheritedRole: context.role,
  });
}

function handleSuspendNode(context: DependencyWalkContext): void {
  if (context.current.ast._tag !== "Suspend") return;
  context.pending.push({
    ...context.current,
    ast: context.current.ast.f(),
    inheritedRole: context.role,
  });
}

function handleUnionNode(context: DependencyWalkContext): void {
  if (context.current.ast._tag !== "Union") return;
  for (const branch of matchingUnionBranches(
    context.current.ast,
    context.current.value,
  )) {
    context.pending.push({
      ...context.current,
      ast: branch,
      inheritedRole: context.role,
    });
  }
}

function handleTupleNode(context: DependencyWalkContext): void {
  if (
    context.current.ast._tag !== "TupleType" ||
    !Array.isArray(context.current.value)
  ) {
    return;
  }
  for (let index = context.current.value.length - 1; index >= 0; index -= 1) {
    const element =
      context.current.ast.elements[index] ??
      context.current.ast.rest[0] ??
      undefined;
    if (element === undefined) continue;
    context.pending.push({
      ast: element.type,
      value: context.current.value[index],
      path: `${context.current.path}[${index}]`,
      inheritedRole: context.role,
    });
  }
}

function handleTypeLiteralNode(context: DependencyWalkContext): void {
  if (
    context.current.ast._tag !== "TypeLiteral" ||
    !isRecord(context.current.value)
  ) {
    return;
  }
  for (const property of context.current.ast.propertySignatures) {
    const key = String(property.name);
    if (!Object.hasOwn(context.current.value, key)) continue;
    context.pending.push({
      ast: property.type,
      value: context.current.value[key],
      path: `${context.current.path}.${key}`,
      inheritedRole: context.role,
    });
  }
}

function handleUnsupportedNode(context: DependencyWalkContext): void {
  context.issues.push(
    unsupportedSchemaNodeIssue(context.current.path, context.current.ast._tag),
  );
}

const DEPENDENCY_NODE_HANDLERS: Partial<
  Record<SchemaAST.AST["_tag"], DependencyNodeHandler>
> = {
  Literal: handleStringDependency,
  StringKeyword: handleStringDependency,
  BooleanKeyword: handleNoop,
  NumberKeyword: handleNoop,
  NeverKeyword: handleNoop,
  UnknownKeyword: handleNoop,
  Refinement: handleWrappedNode,
  Transformation: handleWrappedNode,
  Suspend: handleSuspendNode,
  Union: handleUnionNode,
  TupleType: handleTupleNode,
  TypeLiteral: handleTypeLiteralNode,
  Declaration: handleUnsupportedNode,
};

function handleDependencyNode(context: DependencyWalkContext): void {
  const handler = DEPENDENCY_NODE_HANDLERS[context.current.ast._tag];
  if (handler === undefined) {
    handleUnsupportedNode(context);
    return;
  }
  handler(context);
}

function collectAuthoredDependencies(
  schema: Schema.Schema.AnyNoContext,
  value: unknown,
  rootPath: string,
): AuthoredDependencyCollection {
  const dependencies: AuthoredDependency[] = [];
  const issues: PortableSrdSurfaceIssue[] = [];
  const pending: DependencyWalkItem[] = [
    { ast: schema.ast, value, path: rootPath, inheritedRole: undefined },
  ];
  const seenObjects = new WeakMap<SchemaAST.AST, WeakSet<object>>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || current.value === undefined) continue;
    const ownRole = readSurfaceSchemaRole(current.ast);
    const role = ownRole ?? current.inheritedRole;
    if (isObjectLike(current.value)) {
      const seen = seenObjects.get(current.ast) ?? new WeakSet<object>();
      if (seen.has(current.value)) continue;
      seen.add(current.value);
      seenObjects.set(current.ast, seen);
    }
    handleDependencyNode({ current, role, pending, dependencies, issues });
  }

  return { dependencies, issues };
}

function dependencyIssues(members: DecodedMembers): PortableSrdSurfaceIssue[] {
  const unitIds = new Set(members.units.map((record) => String(record.id)));
  const statBlockIds = new Set(
    members.statBlocks.map((record) => String(record.id)),
  );
  const issues: PortableSrdSurfaceIssue[] = [];

  for (const [member, entries, schema] of [
    ["units", members.unitEntries, PublishedSrdUnitRecordSchema] as const,
    [
      "statBlocks",
      members.statBlockEntries,
      PublishedSrdStatBlockRecordSchema,
    ] as const,
  ]) {
    entries.forEach(({ record, index }) => {
      const collected = collectAuthoredDependencies(
        schema,
        record,
        `$.${member}[${index}]`,
      );
      issues.push(...collected.issues);
      for (const dependency of collected.dependencies) {
        const targetIds =
          dependency.targetKind === "unit" ? unitIds : statBlockIds;
        if (targetIds.has(dependency.targetId)) continue;
        issues.push(
          danglingDependencyIssue(
            dependency.path,
            `Authored ${dependency.targetKind} dependency ${dependency.targetId} (${dependency.relation}) is not installed`,
            {
              code: "dangling-authored-dependency",
              targetKind: dependency.targetKind,
              targetId: dependency.targetId,
              relation: dependency.relation,
            },
          ),
        );
      }
    });
  }
  return issues;
}

function dependencyFieldName(path: string): string {
  const separator = path.lastIndexOf(".");
  return separator < 0 ? path : path.slice(separator + 1);
}

function dependencyRelativePath(rootPath: string, path: string): string {
  const relative = path.startsWith(rootPath)
    ? path.slice(rootPath.length)
    : path;
  return relative.replace(/\[\d+\]/g, "[]").replace(/^\./, "");
}

export function derivePortableSrdDependencyFieldRoles(
  surface: PublishedSrdSurface,
): readonly PortableSrdDependencyFieldRole[] {
  const members: DecodedMembers = {
    units: surface.units,
    statBlocks: surface.statBlocks,
    unitEntries: surface.units.map((record, index) => ({ record, index })),
    statBlockEntries: surface.statBlocks.map((record, index) => ({
      record,
      index,
    })),
  };
  const roles = new Map<string, PortableSrdDependencyFieldRole>();
  for (const [member, entries, schema] of [
    ["units", members.unitEntries, PublishedSrdUnitRecordSchema] as const,
    [
      "statBlocks",
      members.statBlockEntries,
      PublishedSrdStatBlockRecordSchema,
    ] as const,
  ]) {
    entries.forEach(({ record, index }) => {
      const collected = collectAuthoredDependencies(
        schema,
        record,
        `$.${member}[${index}]`,
      );
      if (collected.issues.length > 0) {
        throw new Error(
          collected.issues[0]?.message ?? "Unsupported schema AST",
        );
      }
      for (const dependency of collected.dependencies) {
        const role = {
          sourceKind: member === "units" ? "unit" : "statBlock",
          path: dependencyRelativePath(
            `$.${member}[${index}]`,
            dependency.path,
          ),
          fieldName: dependencyFieldName(dependency.path),
          targetKind: dependency.targetKind,
          relation: dependency.relation,
        } satisfies PortableSrdDependencyFieldRole;
        roles.set(
          `${role.sourceKind}\u0000${role.path}\u0000${role.targetKind}\u0000${role.relation}`,
          role,
        );
      }
    });
  }
  return [...roles.values()].sort((left, right) =>
    `${left.sourceKind}\u0000${left.path}\u0000${left.targetKind}\u0000${left.relation}`.localeCompare(
      `${right.sourceKind}\u0000${right.path}\u0000${right.targetKind}\u0000${right.relation}`,
    ),
  );
}

function rejected(
  issues: readonly PortableSrdSurfaceIssue[],
): PortableSrdSurfaceDecodeResult {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error("Portable Surface rejection requires at least one issue");
  }
  return { tag: "rejected", issues: [first, ...rest] };
}

export function decodePortableSrdSurface(
  raw: unknown,
): PortableSrdSurfaceDecodeResult {
  const issues = rootShapeIssues(raw);
  const members = decodeMembers(raw, issues);
  issues.push(...duplicateIdentityIssues(members));
  issues.push(...dependencyIssues(members));
  if (issues.length > 0) return rejected(issues);

  const record = isRecord(raw) ? raw : undefined;
  const units = nonEmpty(members.units);
  const statBlocks = nonEmpty(members.statBlocks);
  if (
    record === undefined ||
    units === undefined ||
    statBlocks === undefined ||
    record.kind !== "srd-5.2.1-surface-catalog"
  ) {
    return rejected([
      shapeIssue("$", "Surface aggregate failed its structural shape"),
    ]);
  }

  const decoded = Schema.decodeUnknownEither(
    PublishedSrdSurfaceSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
  if (Either.isLeft(decoded)) {
    return rejected([schemaIssue("$", decoded.left)]);
  }
  return { tag: "accepted", surface: decoded.right };
}
