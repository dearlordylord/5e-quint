import { JSONSchema, Option, Schema } from "effect";
import * as AST from "effect/SchemaAST";
import { stripNestedJsonSchemaIds } from "@dnd/shared/json-schema";

import {
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
} from "./oracle-case-trace-schema.ts";

/**
 * Builds a structural document schema from the encoded side of a canonical
 * Effect schema. Semantic refinements are not part of this document boundary;
 * the canonical schema remains responsible for semantic admission.
 */
function documentSchema<A, I, R>(
  source: Schema.Schema<A, I, R>,
): Schema.Schema<unknown> {
  const encoded = Schema.encodedSchema(source);
  return Schema.make<unknown>(projectDocumentAst(encoded.ast));
}

/**
 * Derives the publishable Draft 2020-12 graph from a structural Document
 * schema. Effect's generated built-in schemas carry local `$id` values that
 * are valid in isolation but collide when a document graph is compiled by an
 * independent validator, so only the root metadata is retained here.
 */
export function documentJsonSchema(
  schema: Schema.Schema<unknown>,
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
        return annotate(projectedFrom, ast.annotations);
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

  const annotate = (ast: AST.AST, annotations: AST.Annotations): AST.AST =>
    AST.annotations(ast, { ...ast.annotations, ...annotations });

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
