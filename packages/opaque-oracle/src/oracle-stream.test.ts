import { Either, Effect, Exit, Schema, Stream } from "effect";
import { describe, expect, test } from "vitest";

import {
  buildOracleEvaluationCorpus,
  type OracleCorpus,
} from "./oracle-corpus.ts";
import {
  evaluateOracleCase,
  type OracleEvaluationServices,
} from "./oracle-evaluation.ts";
import {
  evaluateOracleBatchJson,
  makeOracleBatchOperation,
  type OracleBatchEvaluator,
  type OracleEvaluationDistribution,
} from "./oracle-batch-operation.ts";
import { DistributionIdSchema } from "./oracle-process-contract.ts";
import {
  runOracleStream,
  type OracleStreamEvaluator,
} from "./oracle-stream.ts";
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
  `sha256:${"c".repeat(64)}`,
);
const distribution: OracleEvaluationDistribution = {
  distributionId,
  services,
};

function runStream(
  chunks: readonly Uint8Array[],
  evaluate: OracleStreamEvaluator<never, never>,
): readonly string[] {
  const responses: string[] = [];
  const result = Effect.runSyncExit(
    runOracleStream({
      input: Stream.fromIterable(chunks),
      distribution,
      evaluate,
      write: (encodedResponse) =>
        Effect.sync(() => {
          responses.push(encodedResponse);
        }),
    }),
  );
  if (Exit.isFailure(result)) {
    throw new Error(
      `Oracle stream unexpectedly failed: ${String(result.cause)}`,
    );
  }
  return responses;
}

describe("Opaque Oracle persistent byte stream", () => {
  test("frames arbitrary chunks, rejects blank and invalid UTF-8 input, and flushes EOF", () => {
    const prefix = new TextEncoder().encode("not-json\n\n");
    const invalidUtf8 = new Uint8Array([0xc3, 0x28, 0x0a]);
    const finalFrame = new TextEncoder().encode("still-not-json");
    const bytes = new Uint8Array(
      prefix.length + invalidUtf8.length + finalFrame.length,
    );
    bytes.set(prefix, 0);
    bytes.set(invalidUtf8, prefix.length);
    bytes.set(finalFrame, prefix.length + invalidUtf8.length);

    const chunks = Array.from(bytes, (byte) => new Uint8Array([byte]));
    const evaluatedFrames: string[] = [];
    const evaluate: OracleStreamEvaluator<never, never> = (input) => {
      evaluatedFrames.push(input.rawJson);
      return evaluateOracleBatchJson(input);
    };

    const responses = runStream(chunks, evaluate);

    expect(evaluatedFrames).toEqual(["not-json", "", "still-not-json"]);
    expect(responses).toHaveLength(4);
    for (const encoded of responses) {
      expect(encoded.endsWith("\n")).toBe(true);
      expect(JSON.parse(encoded)).toEqual({
        tag: "decodeRejected",
        distributionId,
        issues: [{ path: "", code: "invalidJson" }],
      });
    }
  });

  test("does not write a computed prefix or process a later frame after a later-Case defect", () => {
    const firstCase = corpus.batch.cases[0];
    const secondCase = corpus.batch.cases[1];
    if (firstCase === undefined || secondCase === undefined) {
      throw new Error("Oracle test corpus must contain two Cases.");
    }

    let evaluations = 0;
    const defectiveEvaluator: OracleBatchEvaluator = ({
      batch,
      services: input,
    }) => {
      evaluations += 1;
      const caseToEvaluate = batch.cases[0];
      if (caseToEvaluate === undefined) {
        throw new Error("Injected evaluator received an empty batch.");
      }
      const firstTrace = evaluateOracleCase({
        ...input,
        case: caseToEvaluate,
      });
      if (batch.cases.length > 1) {
        throw new Error("injected later-Case evaluator defect");
      }
      return [firstTrace];
    };
    const operation = makeOracleBatchOperation(defectiveEvaluator);
    const responses: string[] = [];
    const batchText = JSON.stringify({ cases: [firstCase, secondCase] });
    const laterText = JSON.stringify({ cases: [firstCase] });

    const result = Effect.runSyncExit(
      runOracleStream({
        input: Stream.fromIterable([
          new TextEncoder().encode(`${batchText}\n${laterText}\n`),
        ]),
        distribution,
        evaluate: operation,
        write: (encodedResponse) =>
          Effect.sync(() => {
            responses.push(encodedResponse);
          }),
      }),
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect(evaluations).toBe(1);
    expect(responses).toEqual([]);
  });
});
