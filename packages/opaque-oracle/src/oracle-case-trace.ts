import { Either, JSONSchema, Schema } from "effect";
import {
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceStructureSchema,
  type CreationFillBatch,
  type FreshSheetInput,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";
import {
  decodeWithSchema,
  parseJsonWithDuplicateDetection,
  type OracleDecodeIssue,
  type OracleDecodeIssueCode,
} from "./oracle-decode.ts";
import {
  canonicalizeBatchInput,
  canonicalizeCaseInput,
  canonicalizeTraceInput,
} from "./oracle-input-canonical.ts";
import { validOracleTraceLifecycle } from "./oracle-lifecycle.ts";

export {
  CreationFillBatchSchema,
  FreshSheetInputSchema,
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
  OracleTraceStepSchema,
  OracleTraceStructureSchema,
  WorkflowRejectionSchema,
  oracleCaseSchema,
  oracleEvaluationBatchSchema,
  oracleTraceSchema,
  type CreationFillBatch,
  type FreshSheetInput,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleTrace,
  type OracleTraceStep,
} from "./oracle-case-trace-schema.ts";
export { canonicalizeStringSet } from "./oracle-canonical.ts";
export {
  type OracleDecodeIssue,
  type OracleDecodeIssueCode,
} from "./oracle-decode.ts";

export type OracleCreationFillBatch = CreationFillBatch;
export type OracleFreshSheetInput = FreshSheetInput;

export function decodeOracleCase(
  input: unknown,
): Either.Either<OracleCase, readonly OracleDecodeIssue[]> {
  return decodeWithSchema(OracleCaseSchema, canonicalizeCaseInput(input));
}

export function decodeOracleEvaluationBatch(
  input: unknown,
): Either.Either<OracleEvaluationBatch, readonly OracleDecodeIssue[]> {
  return decodeWithSchema(
    OracleEvaluationBatchSchema,
    canonicalizeBatchInput(input),
  );
}

export function decodeOracleTrace(
  input: unknown,
): Either.Either<OracleTrace, readonly OracleDecodeIssue[]> {
  const decoded = decodeWithSchema(
    OracleTraceStructureSchema,
    canonicalizeTraceInput(input),
  );
  if (Either.isLeft(decoded)) return decoded;
  return validOracleTraceLifecycle(decoded.right)
    ? decoded
    : Either.left([{ path: "/steps", code: "invalidLifecycle" }]);
}

export function decodeOracleCaseJson(
  input: string,
): Either.Either<OracleCase, readonly OracleDecodeIssue[]> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleCase(parsed.right);
}

export function decodeOracleEvaluationBatchJson(
  input: string,
): Either.Either<OracleEvaluationBatch, readonly OracleDecodeIssue[]> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleEvaluationBatch(parsed.right);
}

export function decodeOracleTraceJson(
  input: string,
): Either.Either<OracleTrace, readonly OracleDecodeIssue[]> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleTrace(parsed.right);
}

export function oracleCaseJsonSchema(): ReturnType<typeof JSONSchema.make> {
  return JSONSchema.make(OracleCaseSchema, { target: "jsonSchema2020-12" });
}

export function oracleEvaluationBatchJsonSchema(): ReturnType<
  typeof JSONSchema.make
> {
  return JSONSchema.make(OracleEvaluationBatchSchema, {
    target: "jsonSchema2020-12",
  });
}

export function oracleTraceJsonSchema(): ReturnType<typeof JSONSchema.make> {
  const schema = JSONSchema.make(OracleTraceStructureSchema, {
    target: "jsonSchema2020-12",
  });
  if (
    !("type" in schema) ||
    schema.type !== "object" ||
    !("properties" in schema)
  ) {
    throw new Error("Opaque Oracle Trace JSON schema root must be an object");
  }
  const steps = schema.properties.steps;
  if (steps === undefined || !("type" in steps) || steps.type !== "array") {
    throw new Error("Opaque Oracle Trace JSON schema must contain steps");
  }
  schema.properties.steps = {
    ...steps,
    prefixItems: [
      {
        type: "object",
        required: ["tag", "frontier"],
        properties: { tag: { enum: ["creationStarted"] } },
      },
    ],
  };
  return schema;
}

export type OracleTraceIssueCode = OracleDecodeIssueCode;

// Keep the lifecycle refinement available to callers that need a schema-level
// parser while retaining the structural schema for portable JSON Schema.
export const oracleLifecycleTraceSchema = OracleTraceStructureSchema.pipe(
  Schema.filter(validOracleTraceLifecycle, {
    message: () => "trace steps do not form a valid Oracle lifecycle",
  }),
);
