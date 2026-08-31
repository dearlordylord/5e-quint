import { Result, Schema } from "effect";
import { stripNestedJsonSchemaIds } from "@dnd/shared/json-schema";

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

/** Projects the encoded, JSON-shaped side of an Oracle schema. */
export function documentSchema<S extends Schema.Constraint>(
  source: S,
): Schema.toEncoded<S> {
  return Schema.toEncoded(source);
}

/** Derives the publishable Draft 2020-12 graph for a Document schema. */
export function documentJsonSchema(schema: Schema.Constraint) {
  const document = Schema.toJsonSchemaDocument(schema);
  return stripNestedJsonSchemaIds({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...document.schema,
    ...(Object.keys(document.definitions).length === 0
      ? {}
      : { $defs: document.definitions }),
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
