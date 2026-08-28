import { Either, Effect, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  buildOracleEvaluationCorpus,
  type OracleCorpus,
} from "./oracle-corpus.ts";
import {
  evaluateOracleBatch,
  type OracleEvaluationServices,
} from "./oracle-evaluation.ts";
import {
  evaluateOracleBatchJson,
  makeOracleBatchOperation,
  type OracleEvaluationDistribution,
} from "./oracle-batch-operation.ts";
import { DistributionIdSchema } from "./oracle-process-contract.ts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

function testServices(): OracleEvaluationServices {
  const unitLibraryResult = buildUnitCatalog({
    collections: [srdUnitCollection],
  });
  if (unitLibraryResult.tag !== "ok") {
    throw new Error("SRD Unit catalog test fixture must build successfully.");
  }
  const statBlockCatalogResult = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (statBlockCatalogResult.tag !== "ok") {
    throw new Error(
      "SRD Stat Block catalog test fixture must build successfully.",
    );
  }
  return {
    unitLibrary: unitLibraryResult.catalog,
    statBlockCatalog: statBlockCatalogResult.catalog,
  };
}

function testCorpus(services: OracleEvaluationServices): OracleCorpus {
  const result = buildOracleEvaluationCorpus(services);
  if (Either.isLeft(result)) {
    throw new Error(
      `Oracle test corpus failed: ${JSON.stringify(result.left)}`,
    );
  }
  return result.right;
}

const services = testServices();
const corpus = testCorpus(services);
const distributionId = Schema.decodeUnknownSync(DistributionIdSchema)(
  `sha256:${"b".repeat(64)}`,
);
const distribution: OracleEvaluationDistribution = {
  distributionId,
  services,
};

describe("Opaque Oracle raw batch operation", () => {
  test("decodes one complete batch before evaluating and returns all traces", () => {
    const response = Effect.runSync(
      evaluateOracleBatchJson({
        distribution,
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
    const operation = makeOracleBatchOperation(({ batch, services: input }) => {
      evaluations += 1;
      return evaluateOracleBatch({ batch, services: input });
    });

    const response = Effect.runSync(
      operation({ distribution, rawJson: "not-json" }),
    );

    expect(evaluations).toBe(0);
    expect(response).toEqual({
      tag: "decodeRejected",
      distributionId,
      issues: [{ path: "", code: "invalidJson" }],
    });
  });
});
