import * as AST from "effect/SchemaAST";
import { Match, Result, Schema } from "effect";

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

type SurfaceRelationSource =
  | {
      readonly sourceKind: "unit";
      readonly value: Pick<UnitRecord, "id" | "name">;
    }
  | {
      readonly sourceKind: "statBlock";
      readonly value: Pick<StatBlockRecord, "id" | "name">;
    };

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

const decodeSurfaceAuthoredRelation = (input: {
  readonly record: SurfaceRelationSource;
  readonly role: SurfaceRelationRole;
  readonly fieldPath: string;
  readonly issuePath: string;
  readonly targetRecordId: unknown;
}): Result.Result<SurfaceAuthoredRelation, SurfaceRelationTraversalIssue> => {
  const shared = {
    sourceRecordName: input.record.value.name,
    fieldPath: input.fieldPath,
  } as const;
  return Match.value(input.record).pipe(
    Match.when({ sourceKind: "unit" }, ({ value }) =>
      Match.value(input.role).pipe(
        Match.when({ targetKind: "unit", category: "reference" }, (role) => {
          const targetRecordId = Schema.decodeUnknownResult(UnitId)(
            input.targetRecordId,
          );
          return Result.isFailure(targetRecordId)
            ? Result.fail(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Result.succeed({
                ...shared,
                sourceKind: "unit" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.success,
              });
        }),
        Match.when({ targetKind: "unit", category: "dependency" }, (role) => {
          const targetRecordId = Schema.decodeUnknownResult(UnitId)(
            input.targetRecordId,
          );
          return Result.isFailure(targetRecordId)
            ? Result.fail(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Result.succeed({
                ...shared,
                sourceKind: "unit" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.success,
              });
        }),
        Match.when(
          { targetKind: "statBlock", category: "reference" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownResult(StatBlockId)(
              input.targetRecordId,
            );
            return Result.isFailure(targetRecordId)
              ? Result.fail(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Result.succeed({
                  ...shared,
                  sourceKind: "unit" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.success,
                });
          },
        ),
        Match.when(
          { targetKind: "statBlock", category: "dependency" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownResult(StatBlockId)(
              input.targetRecordId,
            );
            return Result.isFailure(targetRecordId)
              ? Result.fail(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Result.succeed({
                  ...shared,
                  sourceKind: "unit" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.success,
                });
          },
        ),
        Match.exhaustive,
      ),
    ),
    Match.when({ sourceKind: "statBlock" }, ({ value }) =>
      Match.value(input.role).pipe(
        Match.when({ targetKind: "unit", category: "reference" }, (role) => {
          const targetRecordId = Schema.decodeUnknownResult(UnitId)(
            input.targetRecordId,
          );
          return Result.isFailure(targetRecordId)
            ? Result.fail(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Result.succeed({
                ...shared,
                sourceKind: "statBlock" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.success,
              });
        }),
        Match.when({ targetKind: "unit", category: "dependency" }, (role) => {
          const targetRecordId = Schema.decodeUnknownResult(UnitId)(
            input.targetRecordId,
          );
          return Result.isFailure(targetRecordId)
            ? Result.fail(
                invalidRelationTargetIssue({
                  role,
                  path: input.issuePath,
                }),
              )
            : Result.succeed({
                ...shared,
                sourceKind: "statBlock" as const,
                sourceRecordId: value.id,
                relationKind: role.category,
                relation: role.relation,
                targetKind: "unit" as const,
                targetRecordId: targetRecordId.success,
              });
        }),
        Match.when(
          { targetKind: "statBlock", category: "reference" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownResult(StatBlockId)(
              input.targetRecordId,
            );
            return Result.isFailure(targetRecordId)
              ? Result.fail(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Result.succeed({
                  ...shared,
                  sourceKind: "statBlock" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.success,
                });
          },
        ),
        Match.when(
          { targetKind: "statBlock", category: "dependency" },
          (role) => {
            const targetRecordId = Schema.decodeUnknownResult(StatBlockId)(
              input.targetRecordId,
            );
            return Result.isFailure(targetRecordId)
              ? Result.fail(
                  invalidRelationTargetIssue({
                    role,
                    path: input.issuePath,
                  }),
                )
              : Result.succeed({
                  ...shared,
                  sourceKind: "statBlock" as const,
                  sourceRecordId: value.id,
                  relationKind: role.category,
                  relation: role.relation,
                  targetKind: "statBlock" as const,
                  targetRecordId: targetRecordId.success,
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
  left: SurfaceSchemaFieldRole,
  right: SurfaceSchemaFieldRole,
): boolean => surfaceSchemaRolesEqual(left, right);

const structuralAst = (ast: AST.AST): AST.AST => {
  return ast;
};

const isStringLikeAst = (ast: AST.AST): boolean => {
  const current = structuralAst(ast);
  return (
    current._tag === "String" ||
    (current._tag === "Literal" && typeof current.literal === "string")
  );
};

const literalValues = (ast: AST.AST): readonly unknown[] | undefined => {
  const values: unknown[] = [];
  const pending: AST.AST[] = [ast];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const current = structuralAst(next);
    if (current._tag === "Literal") {
      values.push(current.literal);
    } else if (current._tag === "Union") {
      pending.push(...current.types);
    } else {
      return undefined;
    }
  }
  return values;
};

/**
 * The decoder chooses a tagged branch before exposing a decoded value. This
 * small compatibility check mirrors that choice for traversal, so an
 * unrelated union member cannot manufacture a second relation at one path.
 */
const primitiveBranchMayContainValue = (
  ast: AST.AST,
  value: unknown,
): boolean | undefined => {
  if (ast._tag === "Literal") return value === ast.literal;
  if (ast._tag === "String") return typeof value === "string";
  if (ast._tag === "Number") return typeof value === "number";
  if (ast._tag === "Boolean") return typeof value === "boolean";
  return undefined;
};

const branchMayContainValue = (ast: AST.AST, value: unknown): boolean => {
  const current = structuralAst(ast);
  if (current._tag === "Suspend") {
    return branchMayContainValue(current.thunk(), value);
  }
  if (current._tag === "Union") {
    return current.types.some((member) => branchMayContainValue(member, value));
  }
  const primitiveResult = primitiveBranchMayContainValue(current, value);
  if (primitiveResult !== undefined) return primitiveResult;
  if (current._tag === "Arrays") {
    return tupleBranchMayContainValue(current, value);
  }
  if (current._tag === "Objects") {
    return typeLiteralBranchMayContainValue(current, value);
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

const tupleBranchMayContainValue = (
  ast: AST.Arrays,
  value: unknown,
): boolean => {
  if (!Array.isArray(value)) return false;
  const required = ast.elements.filter(
    (element) => !AST.isOptional(element),
  ).length;
  return (
    value.length >= required &&
    (ast.rest.length > 0 || value.length <= ast.elements.length)
  );
};

const typeLiteralPropertyMayContainValue = (
  property: AST.PropertySignature,
  value: ObjectLike,
): boolean => {
  if (!Object.prototype.hasOwnProperty.call(value, property.name)) {
    return AST.isOptional(property.type);
  }
  const propertyValue = value[String(property.name)];
  const values = literalValues(property.type);
  return (
    values === undefined ||
    values.some((candidate) => candidate === propertyValue)
  );
};

const typeLiteralBranchMayContainValue = (
  ast: AST.Objects,
  value: unknown,
): boolean =>
  isObjectLike(value) &&
  ast.propertySignatures.every((property) =>
    typeLiteralPropertyMayContainValue(property, value),
  );

type AstChild = {
  readonly ast: AST.AST;
  readonly value: unknown;
  readonly path: string;
};

const tupleElementForIndex = (
  ast: AST.Arrays,
  index: number,
  valueLength: number,
): AST.AST | undefined => {
  if (index < ast.elements.length) return ast.elements[index];
  if (ast.rest.length === 0) return undefined;
  const postRestCount = ast.rest.length - 1;
  const postRestStart = valueLength - postRestCount;
  return index < postRestStart
    ? ast.rest[0]
    : ast.rest[1 + index - postRestStart];
};

const tupleAstChildren = (
  ast: AST.Arrays,
  value: unknown,
): readonly AstChild[] => {
  if (!Array.isArray(value)) return [];
  const children: AstChild[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const element = tupleElementForIndex(ast, index, value.length);
    if (element !== undefined) {
      children.push({
        ast: element,
        value: value[index],
        path: `[${index}]`,
      });
    }
  }
  return children;
};

const typeLiteralAstChildren = (
  ast: AST.Objects,
  value: unknown,
): readonly AstChild[] => {
  if (!isObjectLike(value)) return [];
  return ast.propertySignatures.flatMap((property) =>
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
};

const astChildren = (ast: AST.AST, value: unknown): readonly AstChild[] => {
  const current = structuralAst(ast);
  if (current._tag === "Suspend") {
    return [{ ast: current.thunk(), value, path: "" }];
  }
  if (current._tag === "Union") {
    return unionBranchesForValue(current.types, value).map((member) => ({
      ast: member,
      value,
      path: "",
    }));
  }
  if (current._tag === "Arrays") {
    return tupleAstChildren(current, value);
  }
  if (current._tag === "Objects") {
    return typeLiteralAstChildren(current, value);
  }
  return [];
};

type SurfaceWalkCollections = {
  readonly relations: SurfaceAuthoredRelation[];
  readonly issues: SurfaceRelationTraversalIssue[];
};

export type SurfaceSchemaStringVisitor = (
  fieldPath: string,
  value: string,
  role: SurfaceSchemaFieldRole,
) => void;

type SurfaceWalkContext = {
  readonly issues: SurfaceRelationTraversalIssue[];
  readonly visitString: SurfaceSchemaStringVisitor;
  readonly pending: WalkTask[];
  readonly seen: WeakMap<object, WeakMap<object, Set<string>>>;
};

const walkTaskRole = (
  task: WalkTask,
): Result.Result<
  SurfaceSchemaFieldRole | undefined,
  SurfaceRelationTraversalIssue
> => {
  const ownRole = readSurfaceSchemaRole(task.ast);
  if (
    ownRole !== undefined &&
    task.inheritedRole !== undefined &&
    !roleEqual(ownRole, task.inheritedRole)
  ) {
    return Result.fail({
      tag: "surfaceRelationTraversalIssue",
      code: "conflictingRole",
      path: task.path,
      message: `Surface schema roles conflict at ${task.path}`,
    });
  }
  return Result.succeed(ownRole ?? task.inheritedRole);
};

const isSurfaceRelationRole = (
  role: SurfaceSchemaFieldRole | undefined,
): role is SurfaceRelationRole =>
  role?.category === "reference" || role?.category === "dependency";

const isUnownedStringTask = (
  task: WalkTask,
  role: SurfaceSchemaFieldRole | undefined,
): boolean =>
  typeof task.current === "string" &&
  role === undefined &&
  structuralAst(task.ast)._tag === "String";

const visitWalkTaskString = (
  context: SurfaceWalkContext,
  task: WalkTask,
  role: SurfaceSchemaFieldRole | undefined,
): void => {
  if (
    role !== undefined &&
    typeof task.current === "string" &&
    isStringLikeAst(task.ast)
  ) {
    context.visitString(task.path, task.current, role);
  } else if (isUnownedStringTask(task, role)) {
    context.issues.push({
      tag: "surfaceRelationTraversalIssue",
      code: "unownedString",
      path: task.path,
      message: `Surface value string has no schema role at ${task.path}`,
    });
  }
};

const markWalkTaskSeen = (
  context: SurfaceWalkContext,
  task: WalkTask,
  role: SurfaceSchemaFieldRole | undefined,
): boolean => {
  if (!isObjectValue(task.current)) return false;
  const key = role === undefined ? "none" : JSON.stringify(role);
  const seenForAst = context.seen.get(task.current) ?? new WeakMap();
  const roleSet = seenForAst.get(task.ast) ?? new Set<string>();
  if (roleSet.has(key)) return true;
  roleSet.add(key);
  seenForAst.set(task.ast, roleSet);
  context.seen.set(task.current, seenForAst);
  return false;
};

const surfaceRelationLeafAstTags = new Set<AST.AST["_tag"]>([
  "String",
  "Literal",
  "Number",
  "Boolean",
  "Unknown",
  "Never",
]);

const unsupportedSurfaceWalkIssue = (
  task: WalkTask,
  children: readonly AstChild[],
): SurfaceRelationTraversalIssue | undefined => {
  if (children.length > 0 || !isObjectValue(task.current)) return undefined;
  const current = structuralAst(task.ast);
  if (
    current._tag === "Objects" ||
    current._tag === "Arrays" ||
    surfaceRelationLeafAstTags.has(current._tag)
  ) {
    return undefined;
  }
  return {
    tag: "surfaceRelationTraversalIssue",
    code: "unsupportedSchemaAst",
    path: task.path,
    message: `Surface relation traversal does not support ${current._tag} at ${task.path}`,
  };
};

const appendWalkChildren = (
  context: SurfaceWalkContext,
  task: WalkTask,
  role: SurfaceSchemaFieldRole | undefined,
  children: readonly AstChild[],
): void => {
  for (const child of [...children].reverse()) {
    context.pending.push({
      ast: child.ast,
      current: child.value,
      path: `${task.path}${child.path}`,
      inheritedRole: role,
    });
  }
};

const walkSurfaceTask = (context: SurfaceWalkContext, task: WalkTask): void => {
  const roleResult = walkTaskRole(task);
  if (Result.isFailure(roleResult)) {
    context.issues.push(roleResult.failure);
    return;
  }
  const role = roleResult.success;
  visitWalkTaskString(context, task, role);
  if (markWalkTaskSeen(context, task, role)) return;
  const children = astChildren(task.ast, task.current);
  const unsupportedIssue = unsupportedSurfaceWalkIssue(task, children);
  if (unsupportedIssue !== undefined) context.issues.push(unsupportedIssue);
  appendWalkChildren(context, task, role, children);
};

/** Visit schema-owned strings in one already-decoded Surface value. */
export function walkSurfaceSchemaValue<A>(
  schema: Schema.Schema<A>,
  value: A,
  visitString: SurfaceSchemaStringVisitor,
): readonly SurfaceRelationTraversalIssue[] {
  const context: SurfaceWalkContext = {
    issues: [],
    visitString,
    pending: [
      {
        ast: schema.ast,
        current: value,
        path: "value",
        inheritedRole: undefined,
      },
    ],
    seen: new WeakMap(),
  };
  for (
    let task = context.pending.pop();
    task !== undefined;
    task = context.pending.pop()
  ) {
    walkSurfaceTask(context, task);
  }
  return context.issues;
}

const walkSurfaceRecord = (
  record: SurfaceRecord,
  collections: SurfaceWalkCollections,
): void => {
  const recordCollections =
    record.sourceKind === "unit"
      ? collectSurfaceRecordAuthoredRelations({
          source: record,
          schema: UnitRecordSchema,
          value: record.value,
        })
      : collectSurfaceRecordAuthoredRelations({
          source: record,
          schema: StatBlockRecordSchema,
          value: record.value,
        });
  collections.relations.push(...recordCollections.relations);
  collections.issues.push(...recordCollections.issues);
};

/** Collect authored relations from one schema-decoded record value. */
export function collectSurfaceRecordAuthoredRelations<A>(input: {
  readonly source: SurfaceRelationSource;
  readonly schema: Schema.Schema<A>;
  readonly value: A;
}): SurfaceWalkCollections {
  const collections: SurfaceWalkCollections = { relations: [], issues: [] };
  const visitString: SurfaceSchemaStringVisitor = (path, value, role) => {
    if (!isSurfaceRelationRole(role)) return;
    const relationResult = decodeSurfaceAuthoredRelation({
      record: input.source,
      role,
      fieldPath: path.replace(/^value\.?/, ""),
      issuePath: path,
      targetRecordId: value,
    });
    if (Result.isFailure(relationResult)) {
      collections.issues.push(relationResult.failure);
    } else {
      collections.relations.push(relationResult.success);
    }
  };
  const walkIssues = walkSurfaceSchemaValue(
    input.schema,
    input.value,
    visitString,
  );
  collections.issues.push(...walkIssues);
  return collections;
}

const surfaceWalkResult = (
  collections: SurfaceWalkCollections,
): Result.Result<
  readonly SurfaceAuthoredRelation[],
  SurfaceRelationTraversalIssues
> => {
  const firstIssue = collections.issues[0];
  return firstIssue === undefined
    ? Result.succeed(collections.relations)
    : Result.fail([firstIssue, ...collections.issues.slice(1)]);
};

/**
 * Walk decoded records using the role annotations attached to the canonical
 * Surface schemas. It is intentionally iterative: recursive authored effect
 * values are valid input and must not consume the process stack.
 */
export function collectSurfaceAuthoredRelations(
  surface: Pick<SrdSurface, "units" | "statBlocks">,
): Result.Result<
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
  const collections: SurfaceWalkCollections = {
    relations: [],
    issues: [],
  };
  for (const record of records) walkSurfaceRecord(record, collections);
  return surfaceWalkResult(collections);
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

type SurfaceRecordMaps = {
  readonly unitsById: Map<SurfaceUnitId, UnitRecord>;
  readonly statBlocksById: Map<SurfaceStatBlockId, StatBlockRecord>;
};

type SurfaceRelationsBySource = {
  readonly unit: Map<SurfaceUnitId, readonly SurfaceAuthoredRelation[]>;
  readonly statBlock: Map<
    SurfaceStatBlockId,
    readonly SurfaceAuthoredRelation[]
  >;
};

type SurfaceClosureContext = SurfaceRecordMaps & {
  readonly relationsBySource: SurfaceRelationsBySource;
  readonly relationSelection: SurfaceRelationSelection;
  readonly selectedUnits: Set<SurfaceUnitId>;
  readonly selectedStatBlocks: Set<SurfaceStatBlockId>;
  readonly pending: SurfaceRecordRef[];
  readonly issues: SurfaceRelationClosureIssue[];
};

const surfaceRecordMaps = (surface: SrdSurface): SurfaceRecordMaps => ({
  unitsById: new Map(surface.units.map((record) => [record.id, record])),
  statBlocksById: new Map(
    surface.statBlocks.map((record) => [record.id, record]),
  ),
});

const missingSurfaceRootIssue = (
  root: SurfaceRecordRef,
): SurfaceRelationClosureIssue =>
  root.kind === "unit"
    ? {
        tag: "surfaceRelationClosureIssue",
        code: "missingRoot",
        rootKind: "unit",
        rootId: root.id,
        fieldPath: "<root>",
        message: `Surface root unit ${String(root.id)} is absent from the canonical aggregate`,
      }
    : {
        tag: "surfaceRelationClosureIssue",
        code: "missingRoot",
        rootKind: "statBlock",
        rootId: root.id,
        fieldPath: "<root>",
        message: `Surface root statBlock ${String(root.id)} is absent from the canonical aggregate`,
      };

const addSurfaceRoot = (
  context: SurfaceClosureContext,
  root: SurfaceRecordRef,
): void => {
  const exists =
    root.kind === "unit"
      ? context.unitsById.has(root.id)
      : context.statBlocksById.has(root.id);
  if (exists) {
    context.pending.push(root);
  } else {
    context.issues.push(missingSurfaceRootIssue(root));
  }
};

const addSurfaceRoots = (
  context: SurfaceClosureContext,
  input: Pick<
    Parameters<typeof closeSrdSurface>[0],
    "rootUnitIds" | "rootStatBlockIds"
  >,
): void => {
  input.rootUnitIds.forEach((id) =>
    addSurfaceRoot(context, { kind: "unit", id }),
  );
  input.rootStatBlockIds.forEach((id) =>
    addSurfaceRoot(context, { kind: "statBlock", id }),
  );
};

const appendSurfaceRelation = <Kind extends SurfaceRecordKind>(
  relationsBySource: Map<
    SurfaceRecordId<Kind>,
    readonly SurfaceAuthoredRelation[]
  >,
  sourceRecordId: SurfaceRecordId<Kind>,
  relation: SurfaceAuthoredRelation,
): void => {
  const relations = relationsBySource.get(sourceRecordId);
  relationsBySource.set(sourceRecordId, [...(relations ?? []), relation]);
};

const indexSurfaceRelations = (
  relations: readonly SurfaceAuthoredRelation[],
): SurfaceRelationsBySource => {
  const relationsBySource: SurfaceRelationsBySource = {
    unit: new Map(),
    statBlock: new Map(),
  };
  for (const relation of relations) {
    if (relation.sourceKind === "unit") {
      appendSurfaceRelation(
        relationsBySource.unit,
        relation.sourceRecordId,
        relation,
      );
    } else {
      appendSurfaceRelation(
        relationsBySource.statBlock,
        relation.sourceRecordId,
        relation,
      );
    }
  }
  return relationsBySource;
};

const markSurfaceRecordSelected = (
  context: SurfaceClosureContext,
  current: SurfaceRecordRef,
): boolean => {
  if (current.kind === "unit") {
    if (context.selectedUnits.has(current.id)) return true;
    context.selectedUnits.add(current.id);
    return false;
  }
  if (context.selectedStatBlocks.has(current.id)) return true;
  context.selectedStatBlocks.add(current.id);
  return false;
};

const surfaceSourceRelations = (
  context: SurfaceClosureContext,
  current: SurfaceRecordRef,
): readonly SurfaceAuthoredRelation[] =>
  current.kind === "unit"
    ? (context.relationsBySource.unit.get(current.id) ?? [])
    : (context.relationsBySource.statBlock.get(current.id) ?? []);

const surfaceRelationTargetExists = (
  context: SurfaceClosureContext,
  target: SurfaceRecordRef,
): boolean =>
  target.kind === "unit"
    ? context.unitsById.has(target.id)
    : context.statBlocksById.has(target.id);

const enqueueSurfaceRelation = (
  context: SurfaceClosureContext,
  relation: SurfaceAuthoredRelation,
): void => {
  if (!relationSelected(relation, context.relationSelection)) return;
  const target = relationTargetRef(relation);
  if (!surfaceRelationTargetExists(context, target)) {
    context.issues.push({
      ...relation,
      tag: "surfaceRelationClosureIssue",
      code: "missingTarget",
      message: `Surface ${relation.relationKind} ${relation.targetKind} ${relation.targetRecordId} is absent from the canonical aggregate`,
    });
    return;
  }
  context.pending.push(target);
};

const visitSurfaceRecord = (
  context: SurfaceClosureContext,
  current: SurfaceRecordRef,
): void => {
  if (markSurfaceRecordSelected(context, current)) return;
  for (const relation of surfaceSourceRelations(context, current)) {
    enqueueSurfaceRelation(context, relation);
  }
};

const closeSurfaceReachability = (context: SurfaceClosureContext): void => {
  for (
    let current = context.pending.pop();
    current !== undefined;
    current = context.pending.pop()
  ) {
    visitSurfaceRecord(context, current);
  }
};

const closureIssuesResult = (
  issues: readonly SurfaceRelationClosureIssue[],
): Result.Result<void, SurfaceRelationClosureIssues> => {
  const firstIssue = issues[0];
  return firstIssue === undefined
    ? Result.succeed(undefined)
    : Result.fail([firstIssue, ...issues.slice(1)]);
};

const emptySurfaceProjectionIssue = (
  firstUnit: UnitRecord | undefined,
  firstStatBlock: StatBlockRecord | undefined,
): SurfaceRelationClosureIssue | undefined => {
  if (firstUnit !== undefined && firstStatBlock !== undefined) return undefined;
  return {
    tag: "surfaceRelationClosureIssue",
    code: "emptyProjection",
    missingFamily: firstUnit === undefined ? "unit" : "statBlock",
    message:
      "A projected Surface must retain at least one record of each family",
  };
};

const projectClosedSurface = (
  surface: SrdSurface,
  selectedUnits: ReadonlySet<SurfaceUnitId>,
  selectedStatBlocks: ReadonlySet<SurfaceStatBlockId>,
): Result.Result<SrdSurface, SurfaceRelationClosureIssues> => {
  const units = surface.units.filter((record) => selectedUnits.has(record.id));
  const statBlocks = surface.statBlocks.filter((record) =>
    selectedStatBlocks.has(record.id),
  );
  const firstUnit = units[0];
  const firstStatBlock = statBlocks[0];
  const emptyIssue = emptySurfaceProjectionIssue(firstUnit, firstStatBlock);
  if (emptyIssue !== undefined) return Result.fail([emptyIssue]);
  return Result.succeed({
    kind: "srd-5.2.1-surface-catalog",
    units: [firstUnit, ...units.slice(1)],
    statBlocks: [firstStatBlock, ...statBlocks.slice(1)],
  });
};

/**
 * Retain whole canonical records reachable from roots. The selection policy
 * distinguishes mechanics dependencies from identity/reference edges; callers
 * may admit a reference only when its workflow actually needs lookup of that
 * record.
 */
export function closeSrdSurface(input: {
  readonly surface: SrdSurface;
  readonly rootUnitIds: readonly SurfaceUnitId[];
  readonly rootStatBlockIds: readonly SurfaceStatBlockId[];
  readonly relationSelection?: SurfaceRelationSelection;
}): Result.Result<SrdSurface, SurfaceRelationClosureIssues> {
  const relationGraph = collectSurfaceAuthoredRelations(input.surface);
  if (Result.isFailure(relationGraph)) {
    return Result.fail([...relationGraph.failure]);
  }
  const maps = surfaceRecordMaps(input.surface);
  const context: SurfaceClosureContext = {
    ...maps,
    relationsBySource: indexSurfaceRelations(relationGraph.success),
    relationSelection: input.relationSelection ?? {},
    selectedUnits: new Set(),
    selectedStatBlocks: new Set(),
    pending: [],
    issues: [],
  };
  addSurfaceRoots(context, input);
  closeSurfaceReachability(context);
  const issueResult = closureIssuesResult(context.issues);
  if (Result.isFailure(issueResult)) return Result.fail(issueResult.failure);
  return projectClosedSurface(
    input.surface,
    context.selectedUnits,
    context.selectedStatBlocks,
  );
}
