import { Result } from "effect";
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
  type OracleDecodeIssueCode,
  type OracleDecodeIssues,
} from "./oracle-decode.ts";
import {
  decodeOracleCaseDocument,
  decodeOracleEvaluationBatchDocument,
  decodeOracleTraceDocument,
  type OracleCaseDocument,
  type OracleEvaluationBatchDocument,
  type OracleTraceDocument,
} from "./oracle-document.ts";
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
  OracleBattleAttemptRejectionReasonSchema,
  OracleBattleAttemptSegmentSchema,
  OracleBattleInitiativeEntrySchema,
  OracleAmmunitionStocksSchema,
  OracleBattleCheckpointSchema,
  OracleBattleContinuationSchema,
  OracleBattleEnteredSchema,
  OracleBattleNonterminalFrontierSchema,
  OracleBattleInterruptDecisionFillSchema,
  OracleBattleInterruptAttemptSchema,
  OracleBattleOrdinaryAttemptSchema,
  OracleBattleInputSchema,
  OracleBattleRosterSchema,
  OracleCaseSchema,
  OracleCreationOutcomeSchema,
  OracleCreationTraceSchema,
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
  oracleCaseSchema,
  oracleEvaluationBatchSchema,
  oracleTraceSchema,
  type CreationFillBatch,
  type FreshSheetInput,
  type OracleBattleAttempt,
  type OracleBattleAttemptRejectionReason,
  type OracleBattleAttemptSegment,
  type OracleBattleContinuation,
  type OracleBattleInitiativeEntry,
  type OracleAmmunitionStocks,
  type OracleBattleInterruptDecisionFill,
  type OracleBattleNonterminalFrontier,
  type OracleBattleRoster,
  type OracleBattleCharacterSheetRosterEntry,
  type OracleBattleStatBlockRosterEntry,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";
export {
  canonicalizeStringSet,
  canonicalStructuralKey,
  hasDuplicateStructuralValues,
} from "./oracle-canonical.ts";
export {
  type OracleDecodeIssue,
  type OracleDecodeIssueCode,
  type OracleDecodeIssues,
} from "./oracle-decode.ts";
export {
  decodeOracleCaseDocument,
  decodeOracleEvaluationBatchDocument,
  decodeOracleTraceDocument,
  type OracleCaseDocument,
  type OracleEvaluationBatchDocument,
  type OracleTraceDocument,
} from "./oracle-document.ts";

export type OracleCreationFillBatch = CreationFillBatch;
export type OracleFreshSheetInput = FreshSheetInput;

export function decodeOracleCase(
  input: unknown,
): Result.Result<OracleCase, OracleDecodeIssues> {
  const document = decodeOracleCaseDocument(input);
  if (Result.isFailure(document)) return Result.fail(document.failure);
  return admitOracleCaseDocument(document.success);
}

export function decodeOracleEvaluationBatch(
  input: unknown,
): Result.Result<OracleEvaluationBatch, OracleDecodeIssues> {
  const document = decodeOracleEvaluationBatchDocument(input);
  if (Result.isFailure(document)) return Result.fail(document.failure);
  return admitOracleEvaluationBatchDocument(document.success);
}

export function decodeOracleTrace(
  input: unknown,
): Result.Result<OracleTrace, OracleDecodeIssues> {
  const document = decodeOracleTraceDocument(input);
  if (Result.isFailure(document)) return Result.fail(document.failure);
  return admitOracleTraceDocument(document.success);
}

export function admitOracleCaseDocument(
  document: OracleCaseDocument,
): Result.Result<OracleCase, OracleDecodeIssues> {
  return decodeWithSchema(OracleCaseSchema, canonicalizeCaseInput(document));
}

export function admitOracleEvaluationBatchDocument(
  document: OracleEvaluationBatchDocument,
): Result.Result<OracleEvaluationBatch, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleEvaluationBatchSchema,
    canonicalizeBatchInput(document),
  );
}

export function admitOracleTraceDocument(
  document: OracleTraceDocument,
): Result.Result<OracleTrace, OracleDecodeIssues> {
  return decodeWithSchema(OracleTraceSchema, canonicalizeTraceInput(document));
}

export function decodeOracleCaseJson(
  input: string,
): Result.Result<OracleCase, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Result.isFailure(parsed)
    ? Result.fail(parsed.failure)
    : decodeOracleCase(parsed.success);
}

export function decodeOracleEvaluationBatchJson(
  input: string,
): Result.Result<OracleEvaluationBatch, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Result.isFailure(parsed)
    ? Result.fail(parsed.failure)
    : decodeOracleEvaluationBatch(parsed.success);
}

export function decodeOracleTraceJson(
  input: string,
): Result.Result<OracleTrace, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Result.isFailure(parsed)
    ? Result.fail(parsed.failure)
    : decodeOracleTrace(parsed.success);
}

export type OracleTraceIssueCode = OracleDecodeIssueCode;
