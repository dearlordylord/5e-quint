import { Either, Effect } from "effect";

import {
  decodeOracleEvaluationBatchJson,
  type OracleEvaluationBatch,
} from "./oracle-case-trace.ts";
import {
  evaluateOracleBatch,
  type OracleEvaluationServices,
} from "./oracle-evaluation.ts";
import {
  oracleDecodeRejectedResponse,
  oracleEvaluatedResponse,
  type DistributionId,
  type OracleBatchResponse,
} from "./oracle-process-contract.ts";
import type { OracleTrace } from "./oracle-case-trace-schema.ts";

/** The immutable application facts shared by every batch in a process. */
export interface OracleEvaluationDistribution {
  readonly distributionId: DistributionId;
  readonly services: OracleEvaluationServices;
}

export interface OracleBatchOperationInput {
  readonly distribution: OracleEvaluationDistribution;
  readonly rawJson: string;
}

export type OracleBatchEvaluator = (input: {
  readonly batch: OracleEvaluationBatch;
  readonly services: OracleEvaluationServices;
}) => readonly [OracleTrace, ...OracleTrace[]];

export type OracleBatchOperation = (
  input: OracleBatchOperationInput,
) => Effect.Effect<OracleBatchResponse>;

/**
 * Build one raw-frame operation around an evaluator boundary.
 *
 * The evaluator parameter is a narrow test seam: production uses the default
 * evaluator, while focused tests can inject a later-Case defect without
 * adding a defect-producing authored Case to the domain corpus.
 */
export function makeOracleBatchOperation(
  evaluator: OracleBatchEvaluator = evaluateOracleBatch,
): OracleBatchOperation {
  return Effect.fn("OracleBatchOperation.evaluateJson")(
    (input: OracleBatchOperationInput) =>
      Effect.sync(() => {
        const decoded = decodeOracleEvaluationBatchJson(input.rawJson);
        if (Either.isLeft(decoded)) {
          return oracleDecodeRejectedResponse({
            distributionId: input.distribution.distributionId,
            issues: decoded.left,
          });
        }

        const traces = evaluator({
          batch: decoded.right,
          services: input.distribution.services,
        });
        return oracleEvaluatedResponse({
          distributionId: input.distribution.distributionId,
          traces,
        });
      }),
  );
}

/** The production raw-text operation used by every transport adapter. */
export const evaluateOracleBatchJson = makeOracleBatchOperation();
