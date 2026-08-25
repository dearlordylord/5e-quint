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
};

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

function scanJsonMembers(text: string): JsonScanResult {
  let cursor = 0;
  const duplicateMembers: JsonMemberScan[] = [];

  const skipWhitespace = () => {
    while (/\s/.test(text[cursor] ?? "")) cursor += 1;
  };

  const parseString = (): string | undefined => {
    const start = cursor;
    if (text[cursor] !== '"') return undefined;
    cursor += 1;
    let escaped = false;
    while (cursor < text.length) {
      const character = text[cursor];
      cursor += 1;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        const encoded = text.slice(start, cursor);
        try {
          const decoded: unknown = JSON.parse(encoded);
          return typeof decoded === "string" ? decoded : undefined;
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  };

  const parseValue = (path: string): boolean => {
    skipWhitespace();
    const character = text[cursor];
    if (character === '"') return parseString() !== undefined;
    if (character === "{") {
      cursor += 1;
      skipWhitespace();
      const members = new Set<string>();
      if (text[cursor] === "}") {
        cursor += 1;
        return true;
      }
      while (cursor < text.length) {
        skipWhitespace();
        const memberName = parseString();
        if (memberName === undefined) return false;
        if (members.has(memberName)) {
          duplicateMembers.push({
            path: `${path}.${memberName}`,
            memberName,
          });
        }
        members.add(memberName);
        skipWhitespace();
        if (text[cursor] !== ":") return false;
        cursor += 1;
        if (!parseValue(`${path}.${memberName}`)) return false;
        skipWhitespace();
        if (text[cursor] === "}") {
          cursor += 1;
          return true;
        }
        if (text[cursor] !== ",") return false;
        cursor += 1;
      }
      return false;
    }
    if (character === "[") {
      cursor += 1;
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return true;
      }
      let index = 0;
      while (cursor < text.length) {
        if (!parseValue(`${path}[${index}]`)) return false;
        index += 1;
        skipWhitespace();
        if (text[cursor] === "]") {
          cursor += 1;
          return true;
        }
        if (text[cursor] !== ",") return false;
        cursor += 1;
      }
      return false;
    }
    const start = cursor;
    while (cursor < text.length && !/[\s,\]}]/.test(text[cursor] ?? "")) {
      cursor += 1;
    }
    return cursor > start;
  };

  const valid = parseValue("$");
  skipWhitespace();
  return {
    valid: valid && cursor === text.length,
    duplicateMembers,
  };
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

function rootShapeIssues(raw: unknown): PortableSrdSurfaceIssue[] {
  if (!isRecord(raw)) {
    return [shapeIssue("$", "Surface aggregate must be a JSON object")];
  }

  const issues: PortableSrdSurfaceIssue[] = [];
  for (const key of Object.keys(raw)) {
    if (key !== "kind" && key !== "units" && key !== "statBlocks") {
      issues.push({
        code: "schema",
        path: `$.${key}`,
        message: `Unknown Surface aggregate property: ${key}`,
      });
    }
  }
  if (raw.kind !== "srd-5.2.1-surface-catalog") {
    issues.push(
      shapeIssue(
        "$.kind",
        "Surface aggregate kind must be srd-5.2.1-surface-catalog",
      ),
    );
  }
  for (const member of ["units", "statBlocks"] as const) {
    const value = raw[member];
    if (!Array.isArray(value) || value.length === 0) {
      issues.push(
        shapeIssue(
          `$.${member}`,
          `Surface aggregate ${member} must be a non-empty array`,
        ),
      );
    }
  }
  return issues;
}

function decodeMembers(raw: unknown, issues: PortableSrdSurfaceIssue[]) {
  const units: PublishedUnit[] = [];
  const statBlocks: PublishedStatBlock[] = [];
  if (!isRecord(raw)) return { units, statBlocks };

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
      }
    });
  }

  return { units, statBlocks };
}

function duplicateIdentityIssues(
  members: DecodedMembers,
): PortableSrdSurfaceIssue[] {
  const seen = new Map<
    string,
    { readonly family: RecordFamilyLabel; readonly path: string }
  >();
  const issues: PortableSrdSurfaceIssue[] = [];
  for (const [family, records, member] of [
    ["Unit", members.units, "units"] as const,
    ["Stat Block", members.statBlocks, "statBlocks"] as const,
  ]) {
    records.forEach((record, index) => {
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

function structuralAst(ast: SchemaAST.AST): SchemaAST.AST {
  let current = ast;
  while (current._tag === "Transformation" || current._tag === "Refinement") {
    const child = astChild(current);
    if (child === undefined) return current;
    current = child;
  }
  if (current._tag === "Suspend") return structuralAst(current.f());
  switch (current._tag) {
    case "AnyKeyword":
    case "BigIntKeyword":
    case "BooleanKeyword":
    case "Declaration":
    case "Literal":
    case "NeverKeyword":
    case "NumberKeyword":
    case "ObjectKeyword":
    case "StringKeyword":
    case "SymbolKeyword":
    case "TupleType":
    case "TypeLiteral":
    case "UndefinedKeyword":
    case "Union":
    case "UnknownKeyword":
    case "VoidKeyword":
      return current;
    default:
      return unsupportedSchemaAst(current);
  }
}

function literalStrings(ast: SchemaAST.AST): readonly string[] {
  const current = structuralAst(ast);
  if (current._tag === "Literal") {
    return typeof current.literal === "string" ? [current.literal] : [];
  }
  if (current._tag === "Union") {
    return current.types.flatMap(literalStrings);
  }
  switch (current._tag) {
    case "AnyKeyword":
    case "BigIntKeyword":
    case "BooleanKeyword":
    case "Declaration":
    case "NeverKeyword":
    case "NumberKeyword":
    case "ObjectKeyword":
    case "StringKeyword":
    case "SymbolKeyword":
    case "TupleType":
    case "TypeLiteral":
    case "UndefinedKeyword":
    case "UnknownKeyword":
    case "VoidKeyword":
      return [];
    default:
      return unsupportedSchemaAst(current);
  }
}

function branchDiscriminatorMatches(
  ast: SchemaAST.AST,
  value: unknown,
): boolean {
  const current = structuralAst(ast);
  if (current._tag !== "TypeLiteral" || !isRecord(value)) return true;
  let hasDiscriminator = false;
  for (const property of current.propertySignatures) {
    if (property.isOptional) continue;
    const literals = literalStrings(property.type);
    if (literals.length === 0) continue;
    hasDiscriminator = true;
    if (
      Object.hasOwn(value, property.name) &&
      !literals.includes(String(value[String(property.name)]))
    ) {
      return false;
    }
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

function collectAuthoredDependencies(
  schema: Schema.Schema.AnyNoContext,
  value: unknown,
  rootPath: string,
): AuthoredDependencyCollection {
  const dependencies: AuthoredDependency[] = [];
  const issues: PortableSrdSurfaceIssue[] = [];
  const pending: Array<{
    readonly ast: SchemaAST.AST;
    readonly value: unknown;
    readonly path: string;
    readonly inheritedRole: SurfaceSchemaFieldRole | undefined;
  }> = [{ ast: schema.ast, value, path: rootPath, inheritedRole: undefined }];
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

    switch (current.ast._tag) {
      case "Literal":
      case "StringKeyword": {
        if (
          typeof current.value === "string" &&
          role?.category === "dependency"
        ) {
          const key = `${current.path}\u0000${role.targetKind}\u0000${current.value}\u0000${role.relation}`;
          if (
            !dependencies.some(
              (dependency) =>
                `${dependency.path}\u0000${dependency.targetKind}\u0000${dependency.targetId}\u0000${dependency.relation}` ===
                key,
            )
          ) {
            dependencies.push({
              path: current.path,
              targetKind: role.targetKind,
              targetId: current.value,
              relation: role.relation,
            });
          }
        }
        break;
      }
      case "BooleanKeyword":
      case "NumberKeyword":
      case "NeverKeyword":
      case "UnknownKeyword":
        break;
      case "Refinement":
      case "Transformation": {
        const child = astChild(current.ast);
        if (child !== undefined) {
          pending.push({ ...current, ast: child, inheritedRole: role });
        }
        break;
      }
      case "Suspend":
        pending.push({ ...current, ast: current.ast.f(), inheritedRole: role });
        break;
      case "Union":
        for (const branch of matchingUnionBranches(
          current.ast,
          current.value,
        )) {
          pending.push({ ...current, ast: branch, inheritedRole: role });
        }
        break;
      case "TupleType":
        if (Array.isArray(current.value)) {
          for (let index = current.value.length - 1; index >= 0; index -= 1) {
            const element =
              current.ast.elements[index] ?? current.ast.rest[0] ?? undefined;
            if (element !== undefined) {
              pending.push({
                ast: element.type,
                value: current.value[index],
                path: `${current.path}[${index}]`,
                inheritedRole: role,
              });
            }
          }
        }
        break;
      case "TypeLiteral":
        if (isRecord(current.value)) {
          for (const property of current.ast.propertySignatures) {
            const key = String(property.name);
            if (Object.hasOwn(current.value, key)) {
              pending.push({
                ast: property.type,
                value: current.value[key],
                path: `${current.path}.${key}`,
                inheritedRole: role,
              });
            }
          }
        }
        break;
      case "Declaration":
        issues.push(unsupportedSchemaNodeIssue(current.path, current.ast._tag));
        break;
      default:
        issues.push(unsupportedSchemaNodeIssue(current.path, current.ast._tag));
        break;
    }
  }

  return { dependencies, issues };
}

function dependencyIssues(
  members: DecodedMembers,
  raw: unknown,
): PortableSrdSurfaceIssue[] {
  const unitIds = new Set(members.units.map((record) => String(record.id)));
  const statBlockIds = new Set(
    members.statBlocks.map((record) => String(record.id)),
  );
  if (isRecord(raw)) {
    for (const [member, ids] of [
      ["units", unitIds] as const,
      ["statBlocks", statBlockIds] as const,
    ]) {
      const records = raw[member];
      if (!Array.isArray(records)) continue;
      for (const record of records) {
        if (isRecord(record) && typeof record.id === "string") {
          ids.add(record.id);
        }
      }
    }
  }
  const issues: PortableSrdSurfaceIssue[] = [];

  for (const [member, records, schema] of [
    ["units", members.units, PublishedSrdUnitRecordSchema] as const,
    [
      "statBlocks",
      members.statBlocks,
      PublishedSrdStatBlockRecordSchema,
    ] as const,
  ]) {
    records.forEach((record, index) => {
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
  };
  const roles = new Map<string, PortableSrdDependencyFieldRole>();
  for (const [member, records, schema] of [
    ["units", members.units, PublishedSrdUnitRecordSchema] as const,
    [
      "statBlocks",
      members.statBlocks,
      PublishedSrdStatBlockRecordSchema,
    ] as const,
  ]) {
    records.forEach((record, index) => {
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
  issues.push(...dependencyIssues(members, raw));
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
