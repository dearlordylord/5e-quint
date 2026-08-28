import { Either, Effect } from "effect";

import {
  decodeOracleEvaluationBatchJson,
  type OracleEvaluationBatch,
} from "./oracle-case-trace.ts";
import type {
  OracleBatchOperation,
  OracleBatchOperationInput,
} from "./oracle-batch-operation.ts";
import type { OracleEvaluationServices } from "./oracle-evaluation.ts";
import {
  oracleDecodeRejectedResponse,
  oracleEvaluatedResponse,
} from "./oracle-process-contract.ts";
import type { OracleTrace } from "./oracle-case-trace-schema.ts";

export type OracleBatchEvaluator = (input: {
  readonly batch: OracleEvaluationBatch;
  readonly services: OracleEvaluationServices;
}) => readonly [OracleTrace, ...OracleTrace[]];

export function makeOracleBatchOperationInternal(
  evaluator: OracleBatchEvaluator,
): OracleBatchOperation {
  return Effect.fn("OracleBatchOperation.evaluateJson")(
    (input: OracleBatchOperationInput) =>
      Effect.sync(() => {
        const decoded = decodeOracleEvaluationBatchJson(input.rawJson);
        if (Either.isLeft(decoded)) {
          return oracleDecodeRejectedResponse({
            distributionId: input.application.identity.distributionId,
            issues: decoded.left,
          });
        }

        const traces = evaluator({
          batch: decoded.right,
          services: input.application.services,
        });
        return oracleEvaluatedResponse({
          distributionId: input.application.identity.distributionId,
          traces,
        });
      }),
  );
}
