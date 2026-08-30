import { Result } from "effect";

import { evaluateOracleCase } from "../src/oracle-evaluation.ts";
import { runOracleProcess } from "../src/oracle-bootstrap.ts";
import type { OracleBatchEvaluator } from "../src/oracle-batch-operation-internal.ts";
import {
  loadOracleApplicationFromExecutable,
  withOracleBatchEvaluatorForTest,
  type OracleDistributionLoadResult,
} from "../src/oracle-distribution.ts";

/**
 * Test-only build entry. The injected failure is a seam witness, not an
 * authored production Case or a production evaluator branch.
 */
const batchEvaluator: OracleBatchEvaluator = ({ batch, services }) => {
  const firstCase = batch.cases[0];
  if (firstCase === undefined) {
    throw new Error("Injected evaluator received an empty batch.");
  }
  const firstTrace = evaluateOracleCase({ ...services, case: firstCase });
  if (batch.cases.length > 1) {
    throw new Error("injected later-Case evaluator defect");
  }
  return [firstTrace];
};

const loadApplication = (
  executablePath: string,
): OracleDistributionLoadResult => {
  const loaded = loadOracleApplicationFromExecutable(executablePath);
  if (Result.isFailure(loaded)) return loaded;
  return Result.succeed(
    withOracleBatchEvaluatorForTest(loaded.success, batchEvaluator),
  );
};

void runOracleProcess(process.argv.slice(2), { loadApplication }).then(
  (exitCode) => {
    if (exitCode !== 0) process.exitCode = exitCode;
  },
);
