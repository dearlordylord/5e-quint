import { JsonSchema, Result, Schema } from "effect";
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

type RecurrentAst = AST.AST & {
  readonly recur?: (project: (ast: AST.AST) => AST.AST) => AST.AST;
};

function projectDocumentCheck(
  check: AST.Check<unknown>,
  path: string,
): AST.Check<unknown> | undefined {
  if (documentCheckIsSemantic(check, path)) return undefined;
  if (check._tag === "FilterGroup") {
    return projectDocumentFilterGroup(check, path);
  }
  if (check.annotations?.toJsonSchema !== undefined) return check;
  if (documentBrandedRefinementIdentifier(check, path) !== undefined) {
    return undefined;
  }
  throw new Error(
    `Document schema has an unannotated refinement at ${path} (${Reflect.ownKeys(
      check.annotations ?? {},
    )
      .map(String)
      .join(
        ", ",
      )}); mark its semantic admission reason or use a structural check with JSON Schema representation.`,
  );
}

function documentBrandedRefinementIdentifier(
  check: AST.Check<unknown>,
  path: string,
): string | undefined {
  const brands = check.annotations?.brands;
  if (brands === undefined) return undefined;
  if (
    !Array.isArray(brands) ||
    !brands.every((brand): brand is string => typeof brand === "string")
  ) {
    throw new Error(
      `Document schema has invalid brand identifiers at ${path}.`,
    );
  }
  if (brands.length === 1) return brands[0];
  throw new Error(
    `Document schema has an unrepresentable refinement with ${String(
      brands.length,
    )} brand identifiers at ${path}.`,
  );
}

function documentCheckIdentifiers(
  check: AST.Check<unknown>,
  path: string,
): readonly string[] {
  if (documentCheckIsSemantic(check, path)) return [];
  if (check._tag === "FilterGroup") {
    return check.checks.flatMap((nested, index) =>
      documentCheckIdentifiers(nested, `${path}<${index}>`),
    );
  }
  if (check.annotations?.toJsonSchema !== undefined) return [];
  const identifier = documentBrandedRefinementIdentifier(check, path);
  return identifier === undefined ? [] : [identifier];
}

function documentCheckIsSemantic(
  check: AST.Check<unknown>,
  path: string,
): boolean {
  const annotations = check.annotations as
    | Record<PropertyKey, unknown>
    | undefined;
  const semanticReason = annotations?.[SemanticRefinementAnnotationId];
  if (semanticReason === undefined) return false;
  if (isSemanticRefinementReason(semanticReason)) return true;
  throw new Error(
    `Document schema has an invalid semantic refinement reason at ${path}.`,
  );
}

function projectDocumentFilterGroup(
  check: AST.FilterGroup<unknown>,
  path: string,
): AST.Check<unknown> | undefined {
  const checks = check.checks.flatMap((nested, index) => {
    const projected = projectDocumentCheck(nested, `${path}<${index}>`);
    return projected === undefined ? [] : [projected];
  });
  return checks.length === 0
    ? undefined
    : new AST.FilterGroup(
        checks as [AST.Check<unknown>, ...AST.Check<unknown>[]],
        check.annotations,
      );
}

function documentAstIdentifier(
  checks: readonly AST.Check<unknown>[] | undefined,
  path: string,
  annotatedIdentifier: string | undefined,
): string | undefined {
  const identifiers = [
    ...new Set([
      ...(annotatedIdentifier === undefined ? [] : [annotatedIdentifier]),
      ...(checks?.flatMap((check, index) =>
        documentCheckIdentifiers(check, `${path}<check:${index}>`),
      ) ?? []),
    ]),
  ];
  if (identifiers.length > 1) {
    throw new Error(
      `Document schema has conflicting refinement identifiers at ${path}: ${identifiers.join(
        ", ",
      )}.`,
    );
  }
  return identifiers[0];
}

function documentAnnotatedIdentifier(
  ast: AST.AST,
  path: string,
): string | undefined {
  const identifier = ast.annotations?.identifier;
  if (identifier === undefined || typeof identifier === "string") {
    return identifier;
  }
  throw new Error(`Document schema has an invalid identifier at ${path}.`);
}

function projectDocumentChecks(
  checks: readonly AST.Check<unknown>[] | undefined,
  path: string,
): [AST.Check<unknown>, ...AST.Check<unknown>[]] | undefined {
  const projected = checks?.flatMap((check, index) => {
    const projectedCheck = projectDocumentCheck(
      check,
      `${path}<check:${index}>`,
    );
    return projectedCheck === undefined ? [] : [projectedCheck];
  });
  const [first, ...rest] = projected ?? [];
  return first === undefined ? undefined : [first, ...rest];
}

/** Project the encoded JSON document shape while removing marked semantic checks. */
function projectDocumentAst(root: AST.AST): AST.AST {
  const projected = new WeakMap<AST.AST, AST.AST>();
  const project = (ast: AST.AST, path = "$"): AST.AST => {
    const cached = projected.get(ast);
    if (cached !== undefined) return cached;
    const recurrent = ast as RecurrentAst;
    const nested =
      recurrent.recur === undefined
        ? ast
        : recurrent.recur((child) => project(child, path));
    const checks = projectDocumentChecks(nested.checks, path);
    const identifier = documentAstIdentifier(
      nested.checks,
      path,
      documentAnnotatedIdentifier(nested, path),
    );
    const descriptors = Object.getOwnPropertyDescriptors(nested);
    descriptors.checks.value = checks;
    const result = Object.create(
      Object.getPrototypeOf(nested),
      descriptors,
    ) as AST.AST;
    if (identifier !== undefined) {
      Object.defineProperty(result, "annotations", {
        configurable: true,
        enumerable: true,
        value: { ...nested.annotations, identifier },
      });
    }
    projected.set(ast, result);
    return result;
  };
  return project(AST.toEncoded(root));
}

export function documentSchema<S extends Schema.Constraint>(
  source: S,
): Schema.Codec<S["Encoded"], S["Encoded"], never, never> {
  return Schema.make<Schema.Codec<S["Encoded"], S["Encoded"], never, never>>(
    projectDocumentAst(source.ast),
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
