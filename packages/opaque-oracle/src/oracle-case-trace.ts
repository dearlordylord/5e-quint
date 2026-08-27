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
): Either.Either<OracleCase, OracleDecodeIssues> {
  const document = decodeOracleCaseDocument(input);
  if (Either.isLeft(document)) return Either.left(document.left);
  return admitOracleCaseDocument(document.right);
}

export function decodeOracleEvaluationBatch(
  input: unknown,
): Either.Either<OracleEvaluationBatch, OracleDecodeIssues> {
  const document = decodeOracleEvaluationBatchDocument(input);
  if (Either.isLeft(document)) return Either.left(document.left);
  return admitOracleEvaluationBatchDocument(document.right);
}

export function decodeOracleTrace(
  input: unknown,
): Either.Either<OracleTrace, OracleDecodeIssues> {
  const document = decodeOracleTraceDocument(input);
  if (Either.isLeft(document)) return Either.left(document.left);
  return admitOracleTraceDocument(document.right);
}

export function admitOracleCaseDocument(
  document: OracleCaseDocument,
): Either.Either<OracleCase, OracleDecodeIssues> {
  return decodeWithSchema(OracleCaseSchema, canonicalizeCaseInput(document));
}

export function admitOracleEvaluationBatchDocument(
  document: OracleEvaluationBatchDocument,
): Either.Either<OracleEvaluationBatch, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleEvaluationBatchSchema,
    canonicalizeBatchInput(document),
  );
}

export function admitOracleTraceDocument(
  document: OracleTraceDocument,
): Either.Either<OracleTrace, OracleDecodeIssues> {
  return decodeWithSchema(OracleTraceSchema, canonicalizeTraceInput(document));
}

export function decodeOracleCaseJson(
  input: string,
): Either.Either<OracleCase, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleCase(parsed.right);
}

export function decodeOracleEvaluationBatchJson(
  input: string,
): Either.Either<OracleEvaluationBatch, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleEvaluationBatch(parsed.right);
}

export function decodeOracleTraceJson(
  input: string,
): Either.Either<OracleTrace, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleTrace(parsed.right);
}

export type OracleTraceIssueCode = OracleDecodeIssueCode;
