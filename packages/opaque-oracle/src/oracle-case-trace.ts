import { Either } from "effect";
import {
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
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

export {
  CreationFillBatchSchema,
  FreshSheetInputSchema,
  OracleBattleActsFrontierSchema,
  OracleBattleAttemptSchema,
  OracleBattleAttemptRejectionSchema,
  OracleBattleCheckpointSchema,
  OracleBattleEnteredSchema,
  OracleBattleFrontierSchema,
  OracleBattleInterruptDecisionFillSchema,
  OracleBattleInterruptAttemptSchema,
  OracleBattleOrdinaryAttemptSchema,
  OracleBattleProgressedSchema,
  OracleBattleInputSchema,
  OracleBattleRosterEntrySchema,
  OracleBattleResolvedSchema,
  OracleCaseSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
  OracleTraceStepSchema,
  WorkflowRejectionSchema,
  oracleCaseSchema,
  oracleEvaluationBatchSchema,
  oracleTraceSchema,
  type CreationFillBatch,
  type FreshSheetInput,
  type OracleBattleAttempt,
  type OracleBattleAttemptRejection,
  type OracleBattleInterruptDecisionFill,
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
    OracleTraceSchema,
    canonicalizeTraceInput(input),
    {
      classifyRefinement: (actual, path) =>
        (path === "" || path === "/steps") &&
        typeof actual === "object" &&
        actual !== null &&
        "steps" in actual &&
        Array.isArray(actual.steps) &&
        actual.steps.length > 0
          ? "invalidLifecycle"
          : undefined,
    },
  );
  if (Either.isRight(decoded)) return decoded;
  return Either.left(
    decoded.left.map((issue) =>
      issue.code === "invalidLifecycle" && issue.path === ""
        ? { ...issue, path: "/steps" }
        : issue,
    ),
  );
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

export type OracleTraceIssueCode = OracleDecodeIssueCode;
