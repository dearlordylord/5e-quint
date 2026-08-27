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
  OracleBattleAttemptRejectionReasonSchema,
  OracleBattleAttemptSegmentSchema,
  OracleBattleInitiativeEntrySchema,
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
  return decodeWithSchema(OracleTraceSchema, canonicalizeTraceInput(input));
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
