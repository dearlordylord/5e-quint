import * as AST from "effect/SchemaAST";
import { Either } from "effect";

import {
  readSurfaceSchemaRole,
  surfaceSchemaRolesEqual,
  type SurfaceSchemaFieldRole,
} from "./schema-base.ts";
import { StatBlockRecordSchema, UnitRecordSchema } from "./schema.ts";
import type { SrdSurface, StatBlockRecord, UnitRecord } from "./types.ts";

/** One role-owned authored edge in a decoded Surface record. */
export type SurfaceAuthoredRelation = {
  readonly sourceKind: "unit" | "statBlock";
  readonly sourceRecordId: string;
  readonly sourceRecordName: string;
  readonly fieldPath: string;
  readonly relationKind: "reference" | "dependency";
  readonly relation: Extract<
    SurfaceSchemaFieldRole,
    { readonly category: "reference" | "dependency" }
  >["relation"];
  readonly targetKind: "unit" | "statBlock";
  readonly targetRecordId: string;
};

export type SurfaceRelationTraversalIssue = {
  readonly tag: "surfaceRelationTraversalIssue";
  readonly code:
    | "unsupportedSchemaAst"
    | "unownedString"
    | "conflictingRole"
    | "invalidRecord";
  readonly path: string;
  readonly message: string;
};

export type SurfaceRelationTraversalIssues = readonly [
  SurfaceRelationTraversalIssue,
  ...SurfaceRelationTraversalIssue[],
];

export type SurfaceRelationClosureIssue =
  | SurfaceRelationTraversalIssue
  | {
      readonly tag: "surfaceRelationClosureIssue";
      readonly code: "missingTarget" | "emptyProjection";
      readonly sourceKind: "unit" | "statBlock";
      readonly sourceRecordId: string;
      readonly fieldPath: string;
      readonly targetKind: "unit" | "statBlock";
      readonly targetRecordId: string;
      readonly message: string;
    };

export type SurfaceRelationClosureIssues = readonly [
  SurfaceRelationClosureIssue,
  ...SurfaceRelationClosureIssue[],
];

export type SurfaceRelationSelection = {
  readonly includeReference?: (relation: SurfaceAuthoredRelation) => boolean;
  readonly includeDependency?: (relation: SurfaceAuthoredRelation) => boolean;
};

type SurfaceRecord =
  | { readonly sourceKind: "unit"; readonly value: UnitRecord }
  | { readonly sourceKind: "statBlock"; readonly value: StatBlockRecord };

type WalkTask = {
  readonly ast: AST.AST;
  readonly current: unknown;
  readonly path: string;
  readonly inheritedRole: SurfaceSchemaFieldRole | undefined;
};

type ObjectLike = Record<string, unknown>;

const isObjectLike = (value: unknown): value is ObjectLike =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isObjectValue = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const roleEqual = (
  left: SurfaceSchemaFieldRole | undefined,
  right: SurfaceSchemaFieldRole | undefined,
): boolean => {
  if (left === undefined || right === undefined) return left === right;
  return surfaceSchemaRolesEqual(left, right);
};

const schemaChild = (ast: AST.AST): AST.AST | undefined => {
  if (ast._tag === "Transformation") return ast.to;
  if (ast._tag === "Refinement") return ast.from;
  return undefined;
};

const suspendedAst = (ast: AST.AST): AST.AST | undefined =>
  ast._tag === "Suspend" ? ast.f() : undefined;

const structuralAst = (ast: AST.AST): AST.AST => {
  let current = ast;
  while (current._tag === "Transformation" || current._tag === "Refinement") {
    const next = schemaChild(current);
    if (next === undefined) break;
    current = next;
  }
  return current;
};

const literalValues = (ast: AST.AST): readonly unknown[] => {
  const values: unknown[] = [];
  const pending: AST.AST[] = [ast];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const next = pending.pop();
    if (next === undefined) continue;
    const current = structuralAst(next);
    if (seen.has(current)) continue;
    seen.add(current);
    if (current._tag === "Literal") {
      values.push(current.literal);
    } else if (current._tag === "Union") {
      pending.push(...current.types);
    } else if (current._tag === "Suspend") {
      const child = suspendedAst(current);
      if (child !== undefined) pending.push(child);
    }
  }
  return values;
};

const isLiteralSchema = (ast: AST.AST): boolean => {
  const current = structuralAst(ast);
  if (current._tag === "Literal") return true;
  return (
    current._tag === "Union" &&
    current.types.length > 0 &&
    current.types.every(isLiteralSchema)
  );
};

/**
 * The decoder chooses a tagged branch before exposing a decoded value. This
 * small compatibility check mirrors that choice for traversal, so an
 * unrelated union member cannot manufacture a second relation at one path.
 */
const branchMayContainValue = (ast: AST.AST, value: unknown): boolean => {
  const current = structuralAst(ast);
  if (current._tag === "Suspend") {
    const child = suspendedAst(current);
    return child === undefined ? false : branchMayContainValue(child, value);
  }
  if (current._tag === "Union") {
    return current.types.some((member) => branchMayContainValue(member, value));
  }
  if (current._tag === "Literal") return value === current.literal;
  if (current._tag === "StringKeyword") return typeof value === "string";
  if (current._tag === "NumberKeyword") return typeof value === "number";
  if (current._tag === "BooleanKeyword") return typeof value === "boolean";
  if (current._tag === "TupleType") {
    if (!Array.isArray(value)) return false;
    const required = current.elements.filter(
      (element) => !element.isOptional,
    ).length;
    return (
      value.length >= required &&
      (current.rest.length > 0 || value.length <= current.elements.length)
    );
  }
  if (current._tag !== "TypeLiteral") return true;
  if (!isObjectLike(value)) return false;
  for (const property of current.propertySignatures) {
    if (
      !property.isOptional &&
      !Object.prototype.hasOwnProperty.call(value, property.name)
    ) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(value, property.name)) {
      const propertyValue = value[String(property.name)];
      if (isLiteralSchema(property.type)) {
        const values = literalValues(property.type);
        if (!values.some((candidate) => candidate === propertyValue)) {
          return false;
        }
      }
    }
  }
  return true;
};

const unionBranchesForValue = (
  types: readonly AST.AST[],
  value: unknown,
): readonly AST.AST[] => {
  const matching = types.filter((type) => branchMayContainValue(type, value));
  return matching.length > 0 ? matching : types;
};

const astChildren = (
  ast: AST.AST,
  value: unknown,
): readonly {
  readonly ast: AST.AST;
  readonly value: unknown;
  readonly path: string;
}[] => {
  const current = structuralAst(ast);
  if (current._tag === "Suspend") {
    const child = suspendedAst(current);
    return child === undefined ? [] : [{ ast: child, value, path: "" }];
  }
  if (current._tag === "Union") {
    return unionBranchesForValue(current.types, value).map((member) => ({
      ast: member,
      value,
      path: "",
    }));
  }
  if (current._tag === "TupleType" && Array.isArray(value)) {
    const children: { ast: AST.AST; value: unknown; path: string }[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const element =
        index < current.elements.length
          ? current.elements[index]
          : current.rest.length > 0
            ? current.rest[
                Math.min(
                  index - current.elements.length,
                  current.rest.length - 1,
                )
              ]
            : undefined;
      if (element !== undefined) {
        children.push({
          ast: element.type ?? element,
          value: value[index],
          path: `[${index}]`,
        });
      }
    }
    return children;
  }
  if (current._tag === "TypeLiteral" && isObjectLike(value)) {
    return current.propertySignatures.flatMap((property) =>
      Object.prototype.hasOwnProperty.call(value, property.name)
        ? [
            {
              ast: property.type,
              value: value[String(property.name)],
              path: `.${String(property.name)}`,
            },
          ]
        : [],
    );
  }
  const child = schemaChild(current);
  return child === undefined ? [] : [{ ast: child, value, path: "" }];
};

/**
 * Walk decoded records using the role annotations attached to the canonical
 * Surface schemas. It is intentionally iterative: recursive authored effect
 * values are valid input and must not consume the process stack.
 */
export function collectSurfaceAuthoredRelations(
  surface: Pick<SrdSurface, "units" | "statBlocks">,
): Either.Either<
  readonly SurfaceAuthoredRelation[],
  SurfaceRelationTraversalIssues
> {
  const records: SurfaceRecord[] = [
    ...surface.units.map((value) => ({ sourceKind: "unit" as const, value })),
    ...surface.statBlocks.map((value) => ({
      sourceKind: "statBlock" as const,
      value,
    })),
  ];
  const relations: SurfaceAuthoredRelation[] = [];
  const issues: SurfaceRelationTraversalIssue[] = [];

  for (const record of records) {
    const schema =
      record.sourceKind === "unit" ? UnitRecordSchema : StatBlockRecordSchema;
    const pending: WalkTask[] = [
      {
        ast: schema.ast,
        current: record.value,
        path: "value",
        inheritedRole: undefined,
      },
    ];
    const seen = new WeakMap<object, WeakMap<object, Set<string>>>();

    while (pending.length > 0) {
      const task = pending.pop();
      if (task === undefined || task.current === undefined) continue;
      const ownRole = readSurfaceSchemaRole(task.ast);
      if (
        ownRole !== undefined &&
        task.inheritedRole !== undefined &&
        !roleEqual(ownRole, task.inheritedRole)
      ) {
        issues.push({
          tag: "surfaceRelationTraversalIssue",
          code: "conflictingRole",
          path: task.path,
          message: `Surface schema roles conflict at ${task.path}`,
        });
        continue;
      }
      const role = ownRole ?? task.inheritedRole;
      if (typeof task.current === "string") {
        if (role?.category === "reference" || role?.category === "dependency") {
          const sourceName =
            record.sourceKind === "unit"
              ? record.value.name
              : record.value.name;
          relations.push({
            sourceKind: record.sourceKind,
            sourceRecordId: record.value.id,
            sourceRecordName: sourceName,
            fieldPath: task.path.replace(/^value\.?/, ""),
            relationKind: role.category,
            relation: role.relation,
            targetKind: role.targetKind,
            targetRecordId: task.current,
          });
        } else if (
          role === undefined &&
          structuralAst(task.ast)._tag === "StringKeyword"
        ) {
          issues.push({
            tag: "surfaceRelationTraversalIssue",
            code: "unownedString",
            path: task.path,
            message: `Surface value string has no schema role at ${task.path}`,
          });
        }
      }

      if (isObjectValue(task.current)) {
        const objectValue = task.current;
        const key = role === undefined ? "none" : JSON.stringify(role);
        const seenForAst = seen.get(objectValue) ?? new WeakMap();
        const roleSet = seenForAst.get(task.ast) ?? new Set<string>();
        if (roleSet.has(key)) continue;
        roleSet.add(key);
        seenForAst.set(task.ast, roleSet);
        seen.set(objectValue, seenForAst);
      }

      const children = astChildren(task.ast, task.current);
      if (
        children.length === 0 &&
        typeof task.current === "object" &&
        task.current !== null &&
        structuralAst(task.ast)._tag !== "TypeLiteral" &&
        structuralAst(task.ast)._tag !== "TupleType"
      ) {
        const current = structuralAst(task.ast);
        if (
          current._tag !== "StringKeyword" &&
          current._tag !== "Literal" &&
          current._tag !== "NumberKeyword" &&
          current._tag !== "BooleanKeyword" &&
          current._tag !== "UnknownKeyword" &&
          current._tag !== "NeverKeyword"
        ) {
          issues.push({
            tag: "surfaceRelationTraversalIssue",
            code: "unsupportedSchemaAst",
            path: task.path,
            message: `Surface relation traversal does not support ${current._tag} at ${task.path}`,
          });
        }
      }
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) {
          pending.push({
            ast: child.ast,
            current: child.value,
            path: `${task.path}${child.path}`,
            inheritedRole: role,
          });
        }
      }
    }
  }

  const firstIssue = issues[0];
  return firstIssue === undefined
    ? Either.right(relations)
    : Either.left([firstIssue, ...issues.slice(1)]);
}

const relationSelected = (
  relation: SurfaceAuthoredRelation,
  selection: SurfaceRelationSelection,
): boolean =>
  relation.relationKind === "dependency"
    ? (selection.includeDependency?.(relation) ?? true)
    : (selection.includeReference?.(relation) ?? false);

/**
 * Retain whole canonical records reachable from roots. The selection policy
 * distinguishes mechanics dependencies from identity/reference edges; callers
 * may admit a reference only when its workflow actually needs lookup of that
 * record.
 */
export function closeSrdSurface(input: {
  readonly surface: SrdSurface;
  readonly rootUnitIds: readonly string[];
  readonly rootStatBlockIds: readonly string[];
  readonly relationSelection?: SurfaceRelationSelection;
}): Either.Either<SrdSurface, SurfaceRelationClosureIssues> {
  const relationsResult = collectSurfaceAuthoredRelations(input.surface);
  if (Either.isLeft(relationsResult)) {
    return Either.left([...relationsResult.left]);
  }

  const unitsById = new Map<string, UnitRecord>(
    input.surface.units.map((record) => [String(record.id), record]),
  );
  const statBlocksById = new Map<string, StatBlockRecord>(
    input.surface.statBlocks.map((record) => [String(record.id), record]),
  );
  const selectedUnits = new Set<string>();
  const selectedStatBlocks = new Set<string>();
  const pending: {
    readonly kind: "unit" | "statBlock";
    readonly id: string;
  }[] = [];
  const issues: SurfaceRelationClosureIssue[] = [];

  const addRoot = (kind: "unit" | "statBlock", id: string): void => {
    const records = kind === "unit" ? unitsById : statBlocksById;
    if (!records.has(id)) {
      issues.push({
        tag: "surfaceRelationClosureIssue",
        code: "missingTarget",
        sourceKind: kind,
        sourceRecordId: id,
        fieldPath: "<root>",
        targetKind: kind,
        targetRecordId: id,
        message: `Surface root ${kind} ${id} is absent from the canonical aggregate`,
      });
      return;
    }
    pending.push({ kind, id });
  };
  input.rootUnitIds.forEach((id) => addRoot("unit", id));
  input.rootStatBlockIds.forEach((id) => addRoot("statBlock", id));

  const relationsBySource = new Map<
    string,
    readonly SurfaceAuthoredRelation[]
  >();
  for (const relation of relationsResult.right) {
    const key = `${relation.sourceKind}:${relation.sourceRecordId}`;
    relationsBySource.set(key, [
      ...(relationsBySource.get(key) ?? []),
      relation,
    ]);
  }

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    const selected =
      current.kind === "unit" ? selectedUnits : selectedStatBlocks;
    if (selected.has(current.id)) continue;
    selected.add(current.id);
    for (const relation of relationsBySource.get(
      `${current.kind}:${current.id}`,
    ) ?? []) {
      if (!relationSelected(relation, input.relationSelection ?? {})) continue;
      const targets =
        relation.targetKind === "unit" ? unitsById : statBlocksById;
      if (!targets.has(relation.targetRecordId)) {
        issues.push({
          tag: "surfaceRelationClosureIssue",
          code: "missingTarget",
          sourceKind: relation.sourceKind,
          sourceRecordId: relation.sourceRecordId,
          fieldPath: relation.fieldPath,
          targetKind: relation.targetKind,
          targetRecordId: relation.targetRecordId,
          message: `Surface ${relation.relationKind} ${relation.targetKind} ${relation.targetRecordId} is absent from the canonical aggregate`,
        });
        continue;
      }
      pending.push({ kind: relation.targetKind, id: relation.targetRecordId });
    }
  }

  if (issues.length > 0) {
    const firstIssue = issues[0];
    if (firstIssue !== undefined) {
      return Either.left([firstIssue, ...issues.slice(1)]);
    }
  }
  const units = input.surface.units.filter((record) =>
    selectedUnits.has(String(record.id)),
  );
  const statBlocks = input.surface.statBlocks.filter((record) =>
    selectedStatBlocks.has(String(record.id)),
  );
  const firstUnit = units[0];
  const firstStatBlock = statBlocks[0];
  if (firstUnit === undefined || firstStatBlock === undefined) {
    return Either.left([
      {
        tag: "surfaceRelationClosureIssue",
        code: "emptyProjection",
        sourceKind: firstUnit === undefined ? "unit" : "statBlock",
        sourceRecordId: "<projection>",
        fieldPath: "<projection>",
        targetKind: firstUnit === undefined ? "unit" : "statBlock",
        targetRecordId: "<projection>",
        message:
          "A projected Surface must retain at least one record of each family",
      },
    ]);
  }
  return Either.right({
    kind: "srd-5.2.1-surface-catalog",
    units: [firstUnit, ...units.slice(1)],
    statBlocks: [firstStatBlock, ...statBlocks.slice(1)],
  });
}
