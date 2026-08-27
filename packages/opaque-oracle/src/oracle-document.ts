import { Either, JSONSchema, Option, Schema } from "effect";
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

function projectDocumentAst(root: AST.AST): AST.AST {
  const projectedByAst = new WeakMap<object, AST.AST>();
  const projectedSuspendsByIdentifier = new Map<string, AST.Suspend>();
  const projectedSuspendBodies = new WeakMap<() => AST.AST, AST.AST>();

  const project = (ast: AST.AST, path = "$"): AST.AST => {
    const cached = projectedByAst.get(ast);
    if (cached !== undefined) return cached;

    switch (ast._tag) {
      case "AnyKeyword":
      case "UnknownKeyword":
        throw new Error(
          `Document schemas cannot contain ${ast._tag} AST nodes at ${path}.`,
        );
      case "Declaration":
        throw new Error(
          `Document schemas cannot contain Declaration AST nodes at ${path}.`,
        );
      case "Refinement": {
        const projectedFrom = project(ast.from, path);
        const jsonSchema = AST.getJSONSchemaAnnotation(ast);
        if (Option.isNone(jsonSchema)) {
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
          const projected = AST.annotations(projectedFrom, annotations);
          projectedByAst.set(ast, projected);
          return projected;
        }
        const projected = new AST.Refinement(
          projectedFrom,
          ast.filter,
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "TupleType": {
        const projected = new AST.TupleType(
          ast.elements.map((element, index) =>
            projectOptionalType(element, `${path}[${index}]`),
          ),
          ast.rest.map((element) => projectType(element, `${path}[]`)),
          ast.isReadonly,
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "TypeLiteral": {
        const projected = new AST.TypeLiteral(
          ast.propertySignatures.map((property) =>
            projectPropertySignature(
              property,
              `${path}.${String(property.name)}`,
            ),
          ),
          ast.indexSignatures.map((indexSignature) =>
            projectIndexSignature(indexSignature, `${path}[*]`),
          ),
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "Union": {
        const projected = AST.Union.make(
          ast.types.map((member, index) => project(member, `${path}|${index}`)),
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "Suspend": {
        const identifier = Option.getOrUndefined(suspendIdentifier(ast));
        if (identifier === undefined) {
          throw new Error(
            `Document schemas require an identifier on every Suspend at ${path}.`,
          );
        }
        const existing = projectedSuspendsByIdentifier.get(identifier);
        if (existing !== undefined) {
          projectedByAst.set(ast, existing);
          return existing;
        }

        const projected = new AST.Suspend(
          () => {
            const cachedBody = projectedSuspendBodies.get(ast.f);
            if (cachedBody !== undefined) return cachedBody;
            const projectedBody = project(ast.f(), `${path}<${identifier}>`);
            projectedSuspendBodies.set(ast.f, projectedBody);
            return projectedBody;
          },
          {
            ...ast.annotations,
            [AST.IdentifierAnnotationId]: identifier,
          },
        );
        projectedByAst.set(ast, projected);
        projectedSuspendsByIdentifier.set(identifier, projected);
        return projected;
      }
      case "Transformation": {
        const projected = new AST.Transformation(
          project(ast.from, `${path}<from>`),
          project(ast.to, `${path}<to>`),
          ast.transformation,
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "TemplateLiteral": {
        const projected = new AST.TemplateLiteral(
          ast.head,
          mapNonEmpty(
            ast.spans,
            (span) =>
              new AST.TemplateLiteralSpan(
                project(span.type, `${path}<span>`),
                span.literal,
              ),
          ),
          ast.annotations,
        );
        projectedByAst.set(ast, projected);
        return projected;
      }
      case "Enums":
      case "Literal":
      case "UniqueSymbol":
      case "UndefinedKeyword":
      case "VoidKeyword":
      case "NeverKeyword":
      case "StringKeyword":
      case "NumberKeyword":
      case "BooleanKeyword":
      case "BigIntKeyword":
      case "SymbolKeyword":
      case "ObjectKeyword":
        projectedByAst.set(ast, ast);
        return ast;
    }
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
