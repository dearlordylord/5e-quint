import * as AST from "effect/SchemaAST";
import { Either, Match, Schema } from "effect";

import {
  readSurfaceSchemaRole,
  surfaceSchemaRolesEqual,
  type SurfaceSchemaFieldRole,
} from "./schema-base.ts";
import { StatBlockRecordSchema, UnitRecordSchema } from "./schema.ts";
import type { SrdSurface, StatBlockRecord, UnitRecord } from "./types.ts";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";

/** Family-specific ids prevent a Unit id from being supplied as a Stat Block root. */
export type SurfaceUnitId = UnitRecord["id"];
export type SurfaceStatBlockId = StatBlockRecord["id"];

type SurfaceRelationRole = Extract<
  SurfaceSchemaFieldRole,
  { readonly category: "reference" | "dependency" }
>;
type SurfaceRecordKind = SurfaceRelationRole["targetKind"];
type SurfaceRecordId<Kind extends SurfaceRecordKind> = Kind extends "unit"
  ? SurfaceUnitId
  : SurfaceStatBlockId;

type SurfaceAuthoredRelationBase<
  SourceKind extends SurfaceRecordKind,
  Role extends SurfaceRelationRole,
> = SourceKind extends SurfaceRecordKind
  ? Role extends SurfaceRelationRole
    ? {
        readonly sourceKind: SourceKind;
        readonly sourceRecordId: SurfaceRecordId<SourceKind>;
        readonly sourceRecordName: string;
        readonly fieldPath: string;
        readonly relationKind: Role["category"];
        readonly relation: Role["relation"];
        readonly targetKind: Role["targetKind"];
        readonly targetRecordId: SurfaceRecordId<Role["targetKind"]>;
      }
    : never
  : never;

/** One authored edge for each schema-owned role/source-family combination. */
export type SurfaceAuthoredRelation = SurfaceAuthoredRelationBase<
  SurfaceRecordKind,
  SurfaceRelationRole
>;

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

/** The parsed relation edges reused by closure and startup composition. */
export type SurfaceAuthoredRelationGraph = readonly SurfaceAuthoredRelation[];

type SurfaceRelationMissingRootIssue =
  | {
      readonly tag: "surfaceRelationClosureIssue";
      readonly code: "missingRoot";
      readonly rootKind: "unit";
      readonly rootId: SurfaceUnitId;
      readonly fieldPath: "<root>";
      readonly message: string;
    }
  | {
      readonly tag: "surfaceRelationClosureIssue";
      readonly code: "missingRoot";
      readonly rootKind: "statBlock";
      readonly rootId: SurfaceStatBlockId;
      readonly fieldPath: "<root>";
      readonly message: string;
    };

type SurfaceRelationEmptyProjectionIssue = {
  readonly tag: "surfaceRelationClosureIssue";
  readonly code: "emptyProjection";
  readonly missingFamily: "unit" | "statBlock";
  readonly message: string;
};

export type SurfaceRelationClosureIssue =
  | SurfaceRelationTraversalIssue
  | SurfaceRelationMissingRootIssue
  | SurfaceRelationEmptyProjectionIssue
  | (SurfaceAuthoredRelation & {
      readonly tag: "surfaceRelationClosureIssue";
      readonly code: "missingTarget";
      readonly message: string;
    });

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

type SurfaceRecordRef =
  | { readonly kind: "unit"; readonly id: SurfaceUnitId }
  | { readonly kind: "statBlock"; readonly id: SurfaceStatBlockId };

const relationTargetRef = (
  relation: SurfaceAuthoredRelation,
): SurfaceRecordRef =>
  Match.value(relation).pipe(
    Match.when({ targetKind: "unit" }, (matched) => ({
      kind: "unit" as const,
      id: matched.targetRecordId,
    })),
    Match.when({ targetKind: "statBlock" }, (matched) => ({
      kind: "statBlock" as const,
      id: matched.targetRecordId,
    })),
    Match.exhaustive,
  );

const invalidRelationTargetIssue = (input: {
  readonly role: SurfaceRelationRole;
  readonly path: string;
}): SurfaceRelationTraversalIssue => ({
  tag: "surfaceRelationTraversalIssue",
  code: "invalidRecord",
  path: input.path,
  message: `Surface ${input.role.category} ${input.role.targetKind} relation target at ${input.path} is not a valid non-empty trimmed id`,
});

const makeSurfaceAuthoredRelation = (input: {
  readonly record: SurfaceRecord;
  readonly role: SurfaceRelationRole;
  readonly fieldPath: string;
  readonly issuePath: string;
  readonly targetRecordId: unknown;
}): Either.Either<SurfaceAuthoredRelation, SurfaceRelationTraversalIssue> => {
  const shared = {
    sourceRecordName: input.record.value.name,
    fieldPath: input.fieldPath,
  } as const;
  return Match.value(input.record).pipe(
    Match.when({ sourceKind: "unit" }, ({ value }) =>
      Match.value(input.role).pipe(
        Match.when({ targetKind: "unit", category: "reference" }, (role) => {
          const targetRecordId = Schema.decodeUnknownEither(UnitId)(
            input.targetRecordId,
          );
          return Either.isLeft(targetRecordId)
            ? Either.left(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Either.right({
                ...shared,
                sourceKind: "unit" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.right,
              });
        }),
        Match.when({ targetKind: "unit", category: "dependency" }, (role) => {
          const targetRecordId = Schema.decodeUnknownEither(UnitId)(
            input.targetRecordId,
          );
          return Either.isLeft(targetRecordId)
            ? Either.left(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Either.right({
                ...shared,
                sourceKind: "unit" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.right,
              });
        }),
        Match.when(
          { targetKind: "statBlock", category: "reference" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownEither(StatBlockId)(
              input.targetRecordId,
            );
            return Either.isLeft(targetRecordId)
              ? Either.left(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Either.right({
                  ...shared,
                  sourceKind: "unit" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.right,
                });
          },
        ),
        Match.when(
          { targetKind: "statBlock", category: "dependency" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownEither(StatBlockId)(
              input.targetRecordId,
            );
            return Either.isLeft(targetRecordId)
              ? Either.left(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Either.right({
                  ...shared,
                  sourceKind: "unit" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.right,
                });
          },
        ),
        Match.exhaustive,
      ),
    ),
    Match.when({ sourceKind: "statBlock" }, ({ value }) =>
      Match.value(input.role).pipe(
        Match.when({ targetKind: "unit", category: "reference" }, (role) => {
          const targetRecordId = Schema.decodeUnknownEither(UnitId)(
            input.targetRecordId,
          );
          return Either.isLeft(targetRecordId)
            ? Either.left(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Either.right({
                ...shared,
                sourceKind: "statBlock" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.right,
              });
        }),
        Match.when({ targetKind: "unit", category: "dependency" }, (role) => {
          const targetRecordId = Schema.decodeUnknownEither(UnitId)(
            input.targetRecordId,
          );
          return Either.isLeft(targetRecordId)
            ? Either.left(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Either.right({
                ...shared,
                sourceKind: "statBlock" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.right,
              });
        }),
        Match.when(
          { targetKind: "statBlock", category: "reference" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownEither(StatBlockId)(
              input.targetRecordId,
            );
            return Either.isLeft(targetRecordId)
              ? Either.left(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Either.right({
                  ...shared,
                  sourceKind: "statBlock" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.right,
                });
          },
        ),
        Match.when(
          { targetKind: "statBlock", category: "dependency" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownEither(StatBlockId)(
              input.targetRecordId,
            );
            return Either.isLeft(targetRecordId)
              ? Either.left(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Either.right({
                  ...shared,
                  sourceKind: "statBlock" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.right,
                });
          },
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
};

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

const isStringLikeAst = (ast: AST.AST): boolean => {
  const current = structuralAst(ast);
  return (
    current._tag === "StringKeyword" ||
    (current._tag === "Literal" && typeof current.literal === "string")
  );
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
): Either.Either<SurfaceAuthoredRelationGraph, SurfaceRelationTraversalIssues> {
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
      if (task === undefined) continue;
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
      if (
        (role?.category === "reference" || role?.category === "dependency") &&
        isStringLikeAst(task.ast)
      ) {
        const relationResult = makeSurfaceAuthoredRelation({
          record,
          role,
          fieldPath: task.path.replace(/^value\.?/, ""),
          issuePath: task.path,
          targetRecordId: task.current,
        });
        if (Either.isLeft(relationResult)) {
          issues.push(relationResult.left);
        } else {
          relations.push(relationResult.right);
        }
      } else if (
        typeof task.current === "string" &&
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
  Match.value(relation).pipe(
    Match.when(
      { relationKind: "dependency" },
      (matched) => selection.includeDependency?.(matched) ?? true,
    ),
    Match.when(
      { relationKind: "reference" },
      (matched) => selection.includeReference?.(matched) ?? false,
    ),
    Match.exhaustive,
  );

/**
 * Retain whole canonical records reachable from roots. The selection policy
 * distinguishes mechanics dependencies from identity/reference edges; callers
 * may admit a reference only when its workflow actually needs lookup of that
 * record.
 */
export function closeSrdSurface(input: {
  readonly surface: SrdSurface;
  readonly relationGraph: SurfaceAuthoredRelationGraph;
  readonly rootUnitIds: readonly SurfaceUnitId[];
  readonly rootStatBlockIds: readonly SurfaceStatBlockId[];
  readonly relationSelection?: SurfaceRelationSelection;
}): Either.Either<SrdSurface, SurfaceRelationClosureIssues> {
  const unitsById = new Map<SurfaceUnitId, UnitRecord>(
    input.surface.units.map((record) => [record.id, record]),
  );
  const statBlocksById = new Map<SurfaceStatBlockId, StatBlockRecord>(
    input.surface.statBlocks.map((record) => [record.id, record]),
  );
  const selectedUnits = new Set<SurfaceUnitId>();
  const selectedStatBlocks = new Set<SurfaceStatBlockId>();
  const pending: SurfaceRecordRef[] = [];
  const issues: SurfaceRelationClosureIssue[] = [];

  const addRoot = (root: SurfaceRecordRef): void => {
    if (root.kind === "unit") {
      if (!unitsById.has(root.id)) {
        issues.push({
          tag: "surfaceRelationClosureIssue",
          code: "missingRoot",
          rootKind: "unit",
          rootId: root.id,
          fieldPath: "<root>",
          message: `Surface root unit ${String(root.id)} is absent from the canonical aggregate`,
        });
        return;
      }
    } else if (!statBlocksById.has(root.id)) {
      issues.push({
        tag: "surfaceRelationClosureIssue",
        code: "missingRoot",
        rootKind: "statBlock",
        rootId: root.id,
        fieldPath: "<root>",
        message: `Surface root statBlock ${String(root.id)} is absent from the canonical aggregate`,
      });
      return;
    }
    pending.push(root);
  };
  input.rootUnitIds.forEach((id) => addRoot({ kind: "unit", id }));
  input.rootStatBlockIds.forEach((id) => addRoot({ kind: "statBlock", id }));

  const relationsBySource = {
    unit: new Map<SurfaceUnitId, readonly SurfaceAuthoredRelation[]>(),
    statBlock: new Map<
      SurfaceStatBlockId,
      readonly SurfaceAuthoredRelation[]
    >(),
  };
  for (const relation of input.relationGraph) {
    if (relation.sourceKind === "unit") {
      const relations = relationsBySource.unit.get(relation.sourceRecordId);
      relationsBySource.unit.set(relation.sourceRecordId, [
        ...(relations ?? []),
        relation,
      ]);
    } else {
      const relations = relationsBySource.statBlock.get(
        relation.sourceRecordId,
      );
      relationsBySource.statBlock.set(relation.sourceRecordId, [
        ...(relations ?? []),
        relation,
      ]);
    }
  }

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    if (current.kind === "unit") {
      if (selectedUnits.has(current.id)) continue;
      selectedUnits.add(current.id);
    } else {
      if (selectedStatBlocks.has(current.id)) continue;
      selectedStatBlocks.add(current.id);
    }
    const sourceRelations =
      current.kind === "unit"
        ? relationsBySource.unit.get(current.id)
        : relationsBySource.statBlock.get(current.id);
    for (const relation of sourceRelations ?? []) {
      if (!relationSelected(relation, input.relationSelection ?? {})) continue;
      const target = relationTargetRef(relation);
      const targetExists =
        target.kind === "unit"
          ? unitsById.has(target.id)
          : statBlocksById.has(target.id);
      if (!targetExists) {
        issues.push({
          ...relation,
          tag: "surfaceRelationClosureIssue",
          code: "missingTarget",
          message: `Surface ${relation.relationKind} ${relation.targetKind} ${relation.targetRecordId} is absent from the canonical aggregate`,
        });
        continue;
      }
      pending.push(target);
    }
  }

  if (issues.length > 0) {
    const firstIssue = issues[0];
    if (firstIssue !== undefined) {
      return Either.left([firstIssue, ...issues.slice(1)]);
    }
  }
  const units = input.surface.units.filter((record) =>
    selectedUnits.has(record.id),
  );
  const statBlocks = input.surface.statBlocks.filter((record) =>
    selectedStatBlocks.has(record.id),
  );
  const firstUnit = units[0];
  const firstStatBlock = statBlocks[0];
  if (firstUnit === undefined || firstStatBlock === undefined) {
    return Either.left([
      {
        tag: "surfaceRelationClosureIssue",
        code: "emptyProjection",
        missingFamily: firstUnit === undefined ? "unit" : "statBlock",
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
