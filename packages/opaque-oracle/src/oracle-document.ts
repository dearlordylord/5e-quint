import { Either, JSONSchema, Match, Option, Schema } from "effect";
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

/**
 * Builds a structural document schema from the canonical Effect AST. The
 * encoded and type sides of the Oracle schemas are JSON-shaped at this
 * boundary; keeping the canonical AST here is important because Effect's
 * `encodedSchema` erases refinements before their JSON Schema annotations can
 * be projected. The projector below strips only source-marked semantic
 * refinements while retaining the explicitly documented structural predicates.
 */
export function documentSchema<A, I, R>(
  source: Schema.Schema<A, I, R>,
): Schema.Schema<I> {
  return Schema.make<I>(projectDocumentAst(source.ast));
}

/**
 * Derives the publishable Draft 2020-12 graph from a structural Document
 * schema. Effect's generated built-in schemas carry local `$id` values that
 * are valid in isolation but collide when a document graph is compiled by an
 * independent validator, so only the root metadata is retained here.
 */
export function documentJsonSchema<A, I, R>(
  schema: Schema.Schema<A, I, R>,
): ReturnType<typeof JSONSchema.make> {
  return stripNestedJsonSchemaIds(
    JSONSchema.make(schema, { target: "jsonSchema2020-12" }),
  );
}

type DocumentAstProjectionOperations = {
  readonly project: (ast: AST.AST, path?: string) => AST.AST;
  readonly projectType: (value: AST.Type, path: string) => AST.Type;
  readonly projectOptionalType: (
    value: AST.OptionalType,
    path: string,
  ) => AST.OptionalType;
  readonly projectPropertySignature: (
    value: AST.PropertySignature,
    path: string,
  ) => AST.PropertySignature;
  readonly projectIndexSignature: (
    value: AST.IndexSignature,
    path: string,
  ) => AST.IndexSignature;
  readonly suspendIdentifier: (ast: AST.Suspend) => Option.Option<string>;
  readonly projectedSuspendsByIdentifier: Map<string, AST.Suspend>;
  readonly projectedSuspendBodies: WeakMap<() => AST.AST, AST.AST>;
};

function rejectUnsupportedDocumentAst(
  ast: Extract<
    AST.AST,
    { readonly _tag: "AnyKeyword" | "UnknownKeyword" | "Declaration" }
  >,
  path: string,
): never {
  throw new Error(
    `Document schemas cannot contain ${ast._tag} AST nodes at ${path}.`,
  );
}

function projectDocumentAstNode(
  ast: AST.AST,
  path: string,
  operations: DocumentAstProjectionOperations,
): AST.AST {
  return Match.value(ast).pipe(
    Match.discriminatorsExhaustive("_tag")({
      Declaration: (matched) => rejectUnsupportedDocumentAst(matched, path),
      Literal: (matched) => matched,
      UniqueSymbol: (matched) => matched,
      UndefinedKeyword: (matched) => matched,
      VoidKeyword: (matched) => matched,
      NeverKeyword: (matched) => matched,
      UnknownKeyword: (matched) => rejectUnsupportedDocumentAst(matched, path),
      AnyKeyword: (matched) => rejectUnsupportedDocumentAst(matched, path),
      StringKeyword: (matched) => matched,
      NumberKeyword: (matched) => matched,
      BooleanKeyword: (matched) => matched,
      BigIntKeyword: (matched) => matched,
      SymbolKeyword: (matched) => matched,
      ObjectKeyword: (matched) => matched,
      Enums: (matched) => matched,
      TemplateLiteral: (matched) =>
        new AST.TemplateLiteral(
          matched.head,
          mapNonEmpty(
            matched.spans,
            (span) =>
              new AST.TemplateLiteralSpan(
                operations.project(span.type, `${path}<span>`),
                span.literal,
              ),
          ),
          matched.annotations,
        ),
      Refinement: (matched) =>
        projectDocumentRefinement(matched, path, operations),
      TupleType: (matched) =>
        new AST.TupleType(
          matched.elements.map((element, index) =>
            operations.projectOptionalType(element, `${path}[${index}]`),
          ),
          matched.rest.map((element) =>
            operations.projectType(element, `${path}[]`),
          ),
          matched.isReadonly,
          matched.annotations,
        ),
      TypeLiteral: (matched) =>
        new AST.TypeLiteral(
          matched.propertySignatures.map((property) =>
            operations.projectPropertySignature(
              property,
              `${path}.${String(property.name)}`,
            ),
          ),
          matched.indexSignatures.map((indexSignature) =>
            operations.projectIndexSignature(indexSignature, `${path}[*]`),
          ),
          matched.annotations,
        ),
      Union: (matched) =>
        AST.Union.make(
          matched.types.map((member, index) =>
            operations.project(member, `${path}|${index}`),
          ),
          matched.annotations,
        ),
      Suspend: (matched) => projectDocumentSuspend(matched, path, operations),
      Transformation: (matched) =>
        new AST.Transformation(
          operations.project(matched.from, `${path}<from>`),
          operations.project(matched.to, `${path}<to>`),
          matched.transformation,
          matched.annotations,
        ),
    }),
  );
}

function projectDocumentRefinement(
  ast: AST.Refinement,
  path: string,
  operations: DocumentAstProjectionOperations,
): AST.AST {
  const projectedFrom = operations.project(ast.from, path);
  const jsonSchema = AST.getJSONSchemaAnnotation(ast);
  if (Option.isSome(jsonSchema)) {
    return new AST.Refinement(projectedFrom, ast.filter, ast.annotations);
  }
  const reason = ast.annotations[SemanticRefinementAnnotationId];
  if (!isSemanticRefinementReason(reason)) {
    throw new Error(
      reason === undefined
        ? `Document schema has an unannotated refinement at ${path}; mark its semantic admission reason or add a JSON Schema annotation.`
        : `Document schema has an invalid semantic refinement reason at ${path}.`,
    );
  }
  const annotations = { ...ast.annotations };
  delete annotations[SemanticRefinementAnnotationId];
  return AST.annotations(projectedFrom, annotations);
}

function projectDocumentSuspend(
  ast: AST.Suspend,
  path: string,
  operations: DocumentAstProjectionOperations,
): AST.Suspend {
  const identifier = Option.getOrUndefined(operations.suspendIdentifier(ast));
  if (identifier === undefined) {
    throw new Error(
      `Document schemas require an identifier on every Suspend at ${path}.`,
    );
  }
  const existing = operations.projectedSuspendsByIdentifier.get(identifier);
  if (existing !== undefined) return existing;
  const projected = new AST.Suspend(
    () => {
      const cachedBody = operations.projectedSuspendBodies.get(ast.f);
      if (cachedBody !== undefined) return cachedBody;
      const projectedBody = operations.project(
        ast.f(),
        `${path}<${identifier}>`,
      );
      operations.projectedSuspendBodies.set(ast.f, projectedBody);
      return projectedBody;
    },
    {
      ...ast.annotations,
      [AST.IdentifierAnnotationId]: identifier,
    },
  );
  operations.projectedSuspendsByIdentifier.set(identifier, projected);
  return projected;
}

function projectDocumentAst(root: AST.AST): AST.AST {
  const projectedByAst = new WeakMap<object, AST.AST>();
  const projectedSuspendsByIdentifier = new Map<string, AST.Suspend>();
  const projectedSuspendBodies = new WeakMap<() => AST.AST, AST.AST>();

  const project = (ast: AST.AST, path = "$"): AST.AST => {
    const cached = projectedByAst.get(ast);
    if (cached !== undefined) return cached;
    const projected = projectDocumentAstNode(ast, path, {
      project,
      projectType,
      projectOptionalType,
      projectPropertySignature,
      projectIndexSignature,
      suspendIdentifier,
      projectedSuspendsByIdentifier,
      projectedSuspendBodies,
    });
    projectedByAst.set(ast, projected);
    return projected;
  };

  const projectType = (value: AST.Type, path: string): AST.Type => {
    const type = project(value.type, path);
    return type === value.type ? value : new AST.Type(type, value.annotations);
  };

  const projectOptionalType = (
    value: AST.OptionalType,
    path: string,
  ): AST.OptionalType => {
    const type = project(value.type, path);
    return type === value.type
      ? value
      : new AST.OptionalType(type, value.isOptional, value.annotations);
  };

  const projectPropertySignature = (
    value: AST.PropertySignature,
    path: string,
  ): AST.PropertySignature => {
    const type = project(value.type, path);
    return type === value.type
      ? value
      : new AST.PropertySignature(
          value.name,
          type,
          value.isOptional,
          value.isReadonly,
          value.annotations,
        );
  };

  const projectIndexSignature = (
    value: AST.IndexSignature,
    path: string,
  ): AST.IndexSignature =>
    new AST.IndexSignature(
      project(value.parameter, `${path}<parameter>`),
      project(value.type, path),
      value.isReadonly,
    );

  const suspendIdentifier = (ast: AST.Suspend): Option.Option<string> =>
    Option.orElse(AST.getJSONIdentifier(ast), () =>
      AST.getJSONIdentifier(ast.f()),
    );

  return project(root);
}

function mapNonEmpty<A, B>(
  values: readonly [A, ...A[]],
  map: (value: A) => B,
): readonly [B, ...B[]] {
  const [head, ...tail] = values;
  return [map(head), ...tail.map(map)];
}

export const OracleCaseDocumentSchema = documentSchema(OracleCaseSchema);
export const OracleTraceDocumentSchema = documentSchema(OracleTraceSchema);
export const OracleEvaluationBatchDocumentSchema = documentSchema(
  OracleEvaluationBatchSchema,
);

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
): Either.Either<OracleCaseDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleCaseDocumentSchema,
    canonicalizeCaseInput(input),
  );
}

export function decodeOracleTraceDocument(
  input: unknown,
): Either.Either<OracleTraceDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleTraceDocumentSchema,
    canonicalizeTraceInput(input),
  );
}

export function decodeOracleEvaluationBatchDocument(
  input: unknown,
): Either.Either<OracleEvaluationBatchDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleEvaluationBatchDocumentSchema,
    canonicalizeBatchInput(input),
  );
}
