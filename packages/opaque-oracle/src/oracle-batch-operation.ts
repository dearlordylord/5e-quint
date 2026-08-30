import { Effect } from "effect";

import { evaluateOracleBatch } from "./oracle-evaluation.ts";
import { makeOracleBatchOperationInternal } from "./oracle-batch-operation-internal.ts";
import type { OracleApplication } from "./oracle-distribution.ts";
import type { OracleBatchResponse } from "./oracle-process-contract.ts";

export interface OracleBatchOperationInput {
  readonly application: OracleApplication;
  readonly rawJson: string;
}

export type OracleBatchOperation = (
  input: OracleBatchOperationInput,
) => Effect.Effect<OracleBatchResponse>;

/**
 * The canonical raw-text observation operation used by every transport
 * adapter. Keeping one operation makes CLI and HTTP expose the same calibrated
 * production behavior to Target-owned conformance tests.
 */
export const evaluateOracleBatchJson =
  makeOracleBatchOperationInternal(evaluateOracleBatch);
