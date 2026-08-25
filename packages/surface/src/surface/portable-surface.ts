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
  "shape",
  "schema",
  "duplicate-authored-identity",
  "dangling-authored-dependency",
] as const;
export type PortableSrdSurfaceIssueCode =
  (typeof PORTABLE_SURFACE_ISSUE_CODES)[number];

export type PortableSrdSurfaceIssue = {
  readonly code: PortableSrdSurfaceIssueCode;
  readonly path: string;
  readonly message: string;
  readonly targetKind?: "unit" | "statBlock";
  readonly targetId?: string;
};

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

type RecordFamilyLabel = "Unit" | "Stat Block";

type DecodedMembers = {
  readonly units: readonly PublishedUnit[];
  readonly statBlocks: readonly PublishedStatBlock[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function issue(
  code: PortableSrdSurfaceIssueCode,
  path: string,
  message: string,
  details: Pick<PortableSrdSurfaceIssue, "targetKind" | "targetId"> = {},
): PortableSrdSurfaceIssue {
  return { code, path, message, ...details };
}

function schemaIssue(path: string, error: ParseResult.ParseError) {
  return issue(
    "schema",
    path,
    ParseResult.TreeFormatter.formatErrorSync(error),
  );
}

function nonEmpty<T>(values: readonly T[]): readonly [T, ...T[]] | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function rootShapeIssues(raw: unknown): PortableSrdSurfaceIssue[] {
  if (!isRecord(raw)) {
    return [issue("shape", "$", "Surface aggregate must be a JSON object")];
  }

  const issues: PortableSrdSurfaceIssue[] = [];
  for (const key of Object.keys(raw)) {
    if (key !== "kind" && key !== "units" && key !== "statBlocks") {
      issues.push(
        issue(
          "schema",
          `$.${key}`,
          `Unknown Surface aggregate property: ${key}`,
        ),
      );
    }
  }
  if (raw.kind !== "srd-5.2.1-surface-catalog") {
    issues.push(
      issue(
        "shape",
        "$.kind",
        "Surface aggregate kind must be srd-5.2.1-surface-catalog",
      ),
    );
  }
  for (const member of ["units", "statBlocks"] as const) {
    const value = raw[member];
    if (!Array.isArray(value) || value.length === 0) {
      issues.push(
        issue(
          "shape",
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
          issue(
            "duplicate-authored-identity",
            `$.${member}[${index}].id`,
            `${family} identity ${record.id} duplicates ${prior.family} at ${prior.path}`,
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
  return current;
}

function literalStrings(ast: SchemaAST.AST): readonly string[] {
  const current = structuralAst(ast);
  if (current._tag === "Literal") {
    return typeof current.literal === "string" ? [current.literal] : [];
  }
  if (current._tag === "Union") {
    return current.types.flatMap(literalStrings);
  }
  return [];
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
): readonly AuthoredDependency[] {
  const dependencies: AuthoredDependency[] = [];
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
          dependencies.push({
            path: current.path,
            targetKind: role.targetKind,
            targetId: current.value,
            relation: role.relation,
          });
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
        break;
      default:
        break;
    }
  }

  return dependencies;
}

function dependencyIssues(members: DecodedMembers): PortableSrdSurfaceIssue[] {
  const unitIds = new Set(members.units.map((record) => String(record.id)));
  const statBlockIds = new Set(
    members.statBlocks.map((record) => String(record.id)),
  );
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
      for (const dependency of collectAuthoredDependencies(
        schema,
        record,
        `$.${member}[${index}]`,
      )) {
        const targetIds =
          dependency.targetKind === "unit" ? unitIds : statBlockIds;
        if (targetIds.has(dependency.targetId)) continue;
        issues.push(
          issue(
            "dangling-authored-dependency",
            dependency.path,
            `Authored ${dependency.targetKind} dependency ${dependency.targetId} (${dependency.relation}) is not installed`,
            {
              targetKind: dependency.targetKind,
              targetId: dependency.targetId,
            },
          ),
        );
      }
    });
  }
  return issues;
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
  if (!issues.some((candidate) => candidate.code === "schema")) {
    issues.push(...dependencyIssues(members));
  }
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
      issue("shape", "$", "Surface aggregate failed its structural shape"),
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
