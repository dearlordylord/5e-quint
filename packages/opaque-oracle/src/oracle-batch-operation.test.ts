import { Result, Effect } from "effect";
import { afterAll, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildOracleEvaluationCorpus,
  type OracleCorpus,
} from "./oracle-corpus.ts";
import {
  evaluateOracleBatch,
  type OracleEvaluationServices,
} from "./oracle-evaluation.ts";
import { evaluateOracleBatchJson } from "./oracle-batch-operation.ts";
import { makeOracleBatchOperationInternal } from "./oracle-batch-operation-internal.ts";
import { buildOracleDistribution } from "../scripts/build-distribution.ts";
import { loadOracleApplicationFromDirectory } from "./oracle-distribution.ts";

function testCorpus(services: OracleEvaluationServices): OracleCorpus {
  const result = buildOracleEvaluationCorpus(services);
  if (Result.isFailure(result)) {
    throw new Error(
      `Oracle test corpus failed: ${JSON.stringify(result.failure)}`,
    );
  }
  return result.success;
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "opaque-oracle-batch-"));
const build = buildOracleDistribution({
  destination: join(temporaryRoot, "distribution"),
});
const loaded = loadOracleApplicationFromDirectory({
  directory: build.destination,
});
if (Result.isFailure(loaded)) {
  throw new Error(
    `Oracle test application failed to load: ${loaded.failure.tag}`,
  );
}
const application = loaded.success;
const corpus = testCorpus(application.services);
const distributionId = application.identity.distributionId;

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("Opaque Oracle raw batch operation", () => {
  test("decodes one complete batch before evaluating and returns all traces", () => {
    const response = Effect.runSync(
      evaluateOracleBatchJson({
        application,
        rawJson: JSON.stringify(corpus.batch),
      }),
    );

    expect(response.tag).toBe("evaluated");
    if (response.tag === "evaluated") {
      expect(response.distributionId).toBe(distributionId);
      expect(response.traces).toEqual(corpus.traces);
    }
  });

  test("returns decoder issues as data without invoking the evaluator", () => {
    let evaluations = 0;
    const operation = makeOracleBatchOperationInternal(
      ({ batch, services: input }) => {
        evaluations += 1;
        return evaluateOracleBatch({ batch, services: input });
      },
    );

    const response = Effect.runSync(
      operation({ application, rawJson: "not-json" }),
    );

    expect(evaluations).toBe(0);
    expect(response).toEqual({
      tag: "decodeRejected",
      distributionId,
      issues: [{ path: "", code: "invalidJson" }],
    });
  });
});
