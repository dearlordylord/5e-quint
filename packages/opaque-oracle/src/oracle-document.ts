import { JsonSchema, Match, Result, Schema } from "effect";
import * as AST from "effect/SchemaAST";
import { stripNestedJsonSchemaIds } from "@dnd/shared/json-schema";
import {
  isSemanticRefinementReason,
  SemanticRefinementAnnotationId,
} from "@dnd/shared/semantic-refinement";

import {
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
} from "./oracle-case-trace-schema.ts";
import { decodeWithSchema, type OracleDecodeIssues } from "./oracle-decode.ts";
import {
  canonicalizeBatchInput,
  canonicalizeCaseInput,
  canonicalizeTraceInput,
} from "./oracle-input-canonical.ts";

export type DocumentSchemaIssue =
  | {
      readonly tag: "unannotatedRefinement";
      readonly path: string;
      readonly annotationKeys: readonly string[];
    }
  | {
      readonly tag: "invalidBrandIdentifiers";
      readonly path: string;
    }
  | {
      readonly tag: "unrepresentableBrandIdentifiers";
      readonly path: string;
      readonly count: number;
    }
  | {
      readonly tag: "invalidSemanticRefinementReason";
      readonly path: string;
    }
  | {
      readonly tag: "conflictingRefinementIdentifiers";
      readonly path: string;
      readonly identifiers: readonly string[];
    }
  | {
      readonly tag: "invalidIdentifier";
      readonly path: string;
    }
  | {
      readonly tag: "unsupportedAstShape";
      readonly path: string;
    };

export type DocumentSchemaIssues = readonly [
  DocumentSchemaIssue,
  ...DocumentSchemaIssue[],
];

function documentSchemaFailure<A>(
  issues: DocumentSchemaIssues,
): Result.Result<A, DocumentSchemaIssues> {
  return Result.fail(issues);
}

function nonEmptyDocumentSchemaIssues(
  issues: readonly DocumentSchemaIssue[],
): DocumentSchemaIssues | undefined {
  const [first, ...rest] = issues;
  return first === undefined ? undefined : [first, ...rest];
}

function projectDocumentCheck(
  check: AST.Check<unknown>,
  path: string,
): Result.Result<AST.Check<unknown> | undefined, DocumentSchemaIssues> {
  const semantic = documentCheckIsSemantic(check, path);
  if (Result.isFailure(semantic)) {
    return documentSchemaFailure(semantic.failure);
  }
  if (semantic.success) return Result.succeed(undefined);
  if (check._tag === "FilterGroup") {
    return projectDocumentFilterGroup(check, path);
  }
  if (check.annotations?.toJsonSchema !== undefined) {
    return Result.succeed(check);
  }
  const brandIdentifier = documentBrandedRefinementIdentifier(check, path);
  if (Result.isFailure(brandIdentifier)) {
    return documentSchemaFailure(brandIdentifier.failure);
  }
  return brandIdentifier.success === undefined
    ? documentSchemaFailure([
        {
          tag: "unannotatedRefinement",
          path,
          annotationKeys: Reflect.ownKeys(check.annotations ?? {}).map(String),
        },
      ])
    : Result.succeed(undefined);
}

function documentBrandedRefinementIdentifier(
  check: AST.Check<unknown>,
  path: string,
): Result.Result<string | undefined, DocumentSchemaIssues> {
  const brands = check.annotations?.brands;
  if (brands === undefined) return Result.succeed(undefined);
  if (
    !Array.isArray(brands) ||
    !brands.every((brand): brand is string => typeof brand === "string")
  ) {
    return documentSchemaFailure([{ tag: "invalidBrandIdentifiers", path }]);
  }
  if (brands.length === 1) return Result.succeed(brands[0]);
  return documentSchemaFailure([
    {
      tag: "unrepresentableBrandIdentifiers",
      path,
      count: brands.length,
    },
  ]);
}

function documentCheckIdentifiers(
  check: AST.Check<unknown>,
  path: string,
): Result.Result<readonly string[], DocumentSchemaIssues> {
  const semantic = documentCheckIsSemantic(check, path);
  if (Result.isFailure(semantic)) {
    return documentSchemaFailure(semantic.failure);
  }
  if (semantic.success) return Result.succeed([]);
  if (check._tag === "FilterGroup") {
    const identifiers: string[] = [];
    const issues: DocumentSchemaIssue[] = [];
    for (const [index, nested] of check.checks.entries()) {
      const nestedIdentifiers = documentCheckIdentifiers(
        nested,
        `${path}<${index}>`,
      );
      if (Result.isFailure(nestedIdentifiers)) {
        issues.push(...nestedIdentifiers.failure);
      } else {
        identifiers.push(...nestedIdentifiers.success);
      }
    }
    const failure = nonEmptyDocumentSchemaIssues(issues);
    if (failure !== undefined) return documentSchemaFailure(failure);
    return Result.succeed(identifiers);
  }
  if (check.annotations?.toJsonSchema !== undefined) return Result.succeed([]);
  const identifier = documentBrandedRefinementIdentifier(check, path);
  if (Result.isFailure(identifier)) {
    return documentSchemaFailure(identifier.failure);
  }
  return Result.succeed(
    identifier.success === undefined ? [] : [identifier.success],
  );
}

function documentCheckIsSemantic(
  check: AST.Check<unknown>,
  path: string,
): Result.Result<boolean, DocumentSchemaIssues> {
  const annotations = check.annotations;
  if (
    annotations === undefined ||
    !(SemanticRefinementAnnotationId in annotations)
  ) {
    return Result.succeed(false);
  }
  const semanticReason = annotations[SemanticRefinementAnnotationId];
  return isSemanticRefinementReason(semanticReason)
    ? Result.succeed(true)
    : documentSchemaFailure([{ tag: "invalidSemanticRefinementReason", path }]);
}

function projectDocumentFilterGroup(
  check: AST.FilterGroup<unknown>,
  path: string,
): Result.Result<AST.Check<unknown> | undefined, DocumentSchemaIssues> {
  const checks: AST.Check<unknown>[] = [];
  const issues: DocumentSchemaIssue[] = [];
  for (const [index, nested] of check.checks.entries()) {
    const projected = projectDocumentCheck(nested, `${path}<${index}>`);
    if (Result.isFailure(projected)) {
      issues.push(...projected.failure);
    } else if (projected.success !== undefined) {
      checks.push(projected.success);
    }
  }
  const failure = nonEmptyDocumentSchemaIssues(issues);
  if (failure !== undefined) return documentSchemaFailure(failure);
  const [first, ...rest] = checks;
  return Result.succeed(
    first === undefined
      ? undefined
      : new AST.FilterGroup([first, ...rest], check.annotations),
  );
}

function documentAstIdentifier(
  checks: readonly AST.Check<unknown>[] | undefined,
  path: string,
  annotatedIdentifier: string | undefined,
): Result.Result<string | undefined, DocumentSchemaIssues> {
  const checkIdentifiers: string[] = [];
  const issues: DocumentSchemaIssue[] = [];
  for (const [index, check] of (checks ?? []).entries()) {
    const identifiers = documentCheckIdentifiers(
      check,
      `${path}<check:${index}>`,
    );
    if (Result.isFailure(identifiers)) {
      issues.push(...identifiers.failure);
    } else {
      checkIdentifiers.push(...identifiers.success);
    }
  }
  const checkFailure = nonEmptyDocumentSchemaIssues(issues);
  if (checkFailure !== undefined) return documentSchemaFailure(checkFailure);
  const identifiers = [
    ...new Set([
      ...(annotatedIdentifier === undefined ? [] : [annotatedIdentifier]),
      ...checkIdentifiers,
    ]),
  ];
  if (identifiers.length > 1) {
    return documentSchemaFailure([
      {
        tag: "conflictingRefinementIdentifiers",
        path,
        identifiers,
      },
    ]);
  }
  return Result.succeed(identifiers[0]);
}

function documentAnnotatedIdentifier(
  ast: AST.AST,
  path: string,
): Result.Result<string | undefined, DocumentSchemaIssues> {
  const identifier = ast.annotations?.identifier;
  if (identifier === undefined || typeof identifier === "string") {
    return Result.succeed(identifier);
  }
  return documentSchemaFailure([{ tag: "invalidIdentifier", path }]);
}

function projectDocumentChecks(
  checks: readonly AST.Check<unknown>[] | undefined,
  path: string,
): Result.Result<AST.Checks | undefined, DocumentSchemaIssues> {
  const projected: AST.Check<unknown>[] = [];
  const issues: DocumentSchemaIssue[] = [];
  for (const [index, check] of (checks ?? []).entries()) {
    const projectedCheck = projectDocumentCheck(
      check,
      `${path}<check:${index}>`,
    );
    if (Result.isFailure(projectedCheck)) {
      issues.push(...projectedCheck.failure);
    } else if (projectedCheck.success !== undefined) {
      projected.push(projectedCheck.success);
    }
  }
  const failure = nonEmptyDocumentSchemaIssues(issues);
  if (failure !== undefined) return documentSchemaFailure(failure);
  const [first, ...rest] = projected;
  return Result.succeed(first === undefined ? undefined : [first, ...rest]);
}

/** Project the encoded JSON document shape while removing marked semantic checks. */
function projectDocumentAst(
  root: AST.AST,
): Result.Result<AST.AST, DocumentSchemaIssues> {
  const encoded = AST.toEncoded(root);
  const validated = validateDocumentAst(encoded);
  if (Result.isFailure(validated)) {
    return documentSchemaFailure(validated.failure);
  }
  const projected = new WeakMap<AST.AST, AST.AST>();
  const project = (
    ast: AST.AST,
    path = "$",
  ): Result.Result<AST.AST, DocumentSchemaIssues> => {
    const cached = projected.get(ast);
    if (cached !== undefined) return Result.succeed(cached);
    const childIssues: DocumentSchemaIssue[] = [];
    const childPaths = new Map(
      documentAstChildren(ast, path).map((child) => [child.ast, child.path]),
    );
    const nestedProjection = recurDocumentAst(ast, (child) => {
      const childProjection = project(child, childPaths.get(child) ?? path);
      if (Result.isFailure(childProjection)) {
        childIssues.push(...childProjection.failure);
        return child;
      }
      return childProjection.success;
    });
    const childFailure = nonEmptyDocumentSchemaIssues(childIssues);
    if (childFailure !== undefined) {
      return documentSchemaFailure(childFailure);
    }
    const nested = nestedProjection;
    const checks = projectDocumentChecks(nested.checks, path);
    if (Result.isFailure(checks)) {
      return documentSchemaFailure(checks.failure);
    }
    const annotatedIdentifier = documentAnnotatedIdentifier(nested, path);
    if (Result.isFailure(annotatedIdentifier)) {
      return documentSchemaFailure(annotatedIdentifier.failure);
    }
    const identifier = documentAstIdentifier(
      nested.checks,
      path,
      annotatedIdentifier.success,
    );
    if (Result.isFailure(identifier)) {
      return documentSchemaFailure(identifier.failure);
    }
    const result = cloneDocumentAst(
      nested,
      checks.success,
      identifier.success,
      path,
    );
    if (Result.isFailure(result)) return result;
    projected.set(ast, result.success);
    return result;
  };
  return project(encoded);
}

function recurDocumentAst(
  ast: AST.AST,
  project: (ast: AST.AST) => AST.AST,
): AST.AST {
  return "recur" in ast && typeof ast.recur === "function"
    ? ast.recur(project)
    : ast;
}

function validateDocumentAst(
  root: AST.AST,
): Result.Result<void, DocumentSchemaIssues> {
  const pending: {
    readonly ast: AST.AST;
    readonly path: string;
    readonly ancestors: ReadonlySet<AST.AST>;
  }[] = [{ ast: root, path: "$", ancestors: new Set() }];
  const issues: DocumentSchemaIssue[] = [];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || current.ancestors.has(current.ast)) continue;
    const annotatedIdentifier = documentAnnotatedIdentifier(
      current.ast,
      current.path,
    );
    if (Result.isFailure(annotatedIdentifier)) {
      issues.push(...annotatedIdentifier.failure);
    }
    const checks = projectDocumentChecks(current.ast.checks, current.path);
    if (Result.isFailure(checks)) issues.push(...checks.failure);
    if (Result.isSuccess(annotatedIdentifier)) {
      const identifier = documentAstIdentifier(
        current.ast.checks,
        current.path,
        annotatedIdentifier.success,
      );
      if (Result.isFailure(identifier)) {
        issues.push(...identifier.failure);
      } else {
        const cloned = cloneDocumentAst(
          current.ast,
          current.ast.checks,
          identifier.success,
          current.path,
        );
        if (Result.isFailure(cloned)) issues.push(...cloned.failure);
      }
    }
    const ancestors = new Set(current.ancestors).add(current.ast);
    for (const child of documentAstChildren(current.ast, current.path)) {
      pending.push({ ...child, ancestors });
    }
  }
  const failure = nonEmptyDocumentSchemaIssues(
    uniqueDocumentSchemaIssues(issues),
  );
  return failure === undefined
    ? Result.succeed(undefined)
    : documentSchemaFailure(failure);
}

function uniqueDocumentSchemaIssues(
  issues: readonly DocumentSchemaIssue[],
): readonly DocumentSchemaIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = JSON.stringify(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneDocumentAst(
  ast: AST.AST,
  checks: AST.Checks | undefined,
  identifier: string | undefined,
  path: string,
): Result.Result<AST.AST, DocumentSchemaIssues> {
  const descriptors = Object.getOwnPropertyDescriptors(ast);
  const checksDescriptor = descriptors.checks;
  if (checksDescriptor === undefined || !("value" in checksDescriptor)) {
    return documentSchemaFailure([{ tag: "unsupportedAstShape", path }]);
  }
  checksDescriptor.value = checks;
  const candidate: unknown = Object.create(
    Object.getPrototypeOf(ast),
    descriptors,
  );
  if (!AST.isAST(candidate)) {
    return documentSchemaFailure([{ tag: "unsupportedAstShape", path }]);
  }
  if (identifier !== undefined) {
    Object.defineProperty(candidate, "annotations", {
      configurable: true,
      enumerable: true,
      value: { ...ast.annotations, identifier },
    });
  }
  return Result.succeed(candidate);
}

type DocumentAstChild = {
  readonly ast: AST.AST;
  readonly path: string;
};

function documentAstChildren(
  ast: AST.AST,
  path: string,
): readonly DocumentAstChild[] {
  const noChildren = (): readonly DocumentAstChild[] => [];
  return Match.value(ast).pipe(
    Match.discriminatorsExhaustive("_tag")({
      Declaration: (node) =>
        node.typeParameters.map((child, index) => ({
          ast: child,
          path: `${path}<typeParameter:${index}>`,
        })),
      Null: noChildren,
      Undefined: noChildren,
      Void: noChildren,
      Never: noChildren,
      Unknown: noChildren,
      Any: noChildren,
      String: noChildren,
      Number: noChildren,
      Boolean: noChildren,
      BigInt: noChildren,
      Symbol: noChildren,
      Literal: noChildren,
      UniqueSymbol: noChildren,
      ObjectKeyword: noChildren,
      Enum: noChildren,
      TemplateLiteral: noChildren,
      Arrays: (node) => [
        ...node.elements.map((child, index) => ({
          ast: child,
          path: `${path}<element:${index}>`,
        })),
        ...node.rest.map((child, index) => ({
          ast: child,
          path: `${path}<rest:${index}>`,
        })),
      ],
      Objects: (node) => [
        ...node.propertySignatures.map(({ name, type }) => ({
          ast: type,
          path: `${path}<property:${String(name)}>`,
        })),
        ...node.indexSignatures.flatMap(({ parameter, type }, index) => [
          {
            ast: parameter,
            path: `${path}<index:${index}:parameter>`,
          },
          { ast: type, path: `${path}<index:${index}:type>` },
        ]),
      ],
      Union: (node) =>
        node.types.map((child, index) => ({
          ast: child,
          path: `${path}<union:${index}>`,
        })),
      Suspend: (node) => [{ ast: node.thunk(), path: `${path}<suspend>` }],
    }),
  );
}

export function documentSchema<S extends Schema.Constraint>(
  source: S,
): Result.Result<
  Schema.Codec<S["Encoded"], S["Encoded"], never, never>,
  DocumentSchemaIssues
> {
  const ast = projectDocumentAst(source.ast);
  return Result.isFailure(ast)
    ? documentSchemaFailure(ast.failure)
    : Result.succeed(
        Schema.make<Schema.Codec<S["Encoded"], S["Encoded"], never, never>>(
          ast.success,
        ),
      );
}

function requireAuthoredDocumentSchema<S extends Schema.Constraint>(
  source: S,
): Schema.Codec<S["Encoded"], S["Encoded"], never, never> {
  return Result.getOrThrowWith(
    documentSchema(source),
    ([issue]) =>
      new Error(
        `Invalid authored Oracle Document schema (${issue.tag} at ${issue.path}).`,
      ),
  );
}

export function documentJsonSchema(schema: Schema.Constraint) {
  const document = Schema.toJsonSchemaDocument(schema);
  return stripNestedJsonSchemaIds({
    $schema: JsonSchema.META_SCHEMA_URI_DRAFT_2020_12,
    ...(Object.keys(document.definitions).length === 0
      ? {}
      : { $defs: document.definitions }),
    ...document.schema,
  });
}

export const OracleCaseDocumentSchema =
  requireAuthoredDocumentSchema(OracleCaseSchema);
export const OracleTraceDocumentSchema =
  requireAuthoredDocumentSchema(OracleTraceSchema);
export const OracleEvaluationBatchDocumentSchema =
  requireAuthoredDocumentSchema(OracleEvaluationBatchSchema);

export const OracleCaseDocumentJsonSchema = documentJsonSchema(
  OracleCaseDocumentSchema,
);
export const OracleTraceDocumentJsonSchema = documentJsonSchema(
  OracleTraceDocumentSchema,
);
export const OracleEvaluationBatchDocumentJsonSchema = documentJsonSchema(
  OracleEvaluationBatchDocumentSchema,
);

export type OracleCaseDocument = Schema.Schema.Type<
  typeof OracleCaseDocumentSchema
>;
export type OracleTraceDocument = Schema.Schema.Type<
  typeof OracleTraceDocumentSchema
>;
export type OracleEvaluationBatchDocument = Schema.Schema.Type<
  typeof OracleEvaluationBatchDocumentSchema
>;

export function decodeOracleCaseDocument(
  input: unknown,
): Result.Result<OracleCaseDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleCaseDocumentSchema,
    canonicalizeCaseInput(input),
  );
}

export function decodeOracleTraceDocument(
  input: unknown,
): Result.Result<OracleTraceDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleTraceDocumentSchema,
    canonicalizeTraceInput(input),
  );
}

export function decodeOracleEvaluationBatchDocument(
  input: unknown,
): Result.Result<OracleEvaluationBatchDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleEvaluationBatchDocumentSchema,
    canonicalizeBatchInput(input),
  );
}
