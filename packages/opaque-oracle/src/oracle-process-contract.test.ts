import { Result, Schema } from "effect";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  decodeOracleBindPort,
  decodeOracleListeningPort,
  decodeDistributionId,
  DistributionIdSchema,
  encodeOracleBatchResponseJson,
  encodeOracleDefectResponseJson,
  encodeOracleHttpReadinessJson,
  oracleDecodeRejectedResponse,
  oracleDefectResponse,
  ORACLE_LOOPBACK_HOST,
  OracleBatchResponseSchema,
  OracleDecodeIssuesSchema,
  OracleHttpReadinessSchema,
} from "./oracle-process-contract.ts";

const distributionId = Schema.decodeUnknownSync(DistributionIdSchema)(
  `sha256:${"a".repeat(64)}`,
);

describe("Opaque Oracle process contract", () => {
  test("parses only the branded distribution identity format", () => {
    expect(Result.isSuccess(decodeDistributionId(distributionId))).toBe(true);
    expect(Result.isFailure(decodeDistributionId("sha256:ABC"))).toBe(true);
    expect(Result.isFailure(decodeDistributionId("catalog:unknown"))).toBe(
      true,
    );
  });

  test("requires non-empty canonical issues and keeps response variants exclusive", () => {
    const rejected = oracleDecodeRejectedResponse({
      distributionId,
      issues: [{ path: "", code: "invalidJson" }],
    });

    expect(Schema.is(OracleBatchResponseSchema)(rejected)).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(OracleDecodeIssuesSchema)([]),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(OracleBatchResponseSchema)({
          tag: "evaluated",
          distributionId,
          traces: [],
          issues: [{ path: "", code: "invalidJson" }],
        }),
      ),
    ).toBe(true);
  });

  test("encodes a response compactly through its schema", () => {
    const response = oracleDecodeRejectedResponse({
      distributionId,
      issues: [{ path: "", code: "invalidJson" }],
    });

    expect(encodeOracleBatchResponseJson(response)).toBe(
      `{"tag":"decodeRejected","distributionId":"sha256:${"a".repeat(64)}","issues":[{"path":"","code":"invalidJson"}]}`,
    );
  });

  test("encodes only a loopback readiness endpoint and a transport defect", () => {
    const port = decodeOracleListeningPort(42);
    expect(Result.isSuccess(port)).toBe(true);
    if (Result.isFailure(port)) return;

    const readiness = { host: ORACLE_LOOPBACK_HOST, port: port.success };
    expect(Schema.is(OracleHttpReadinessSchema)(readiness)).toBe(true);
    expect(encodeOracleHttpReadinessJson(readiness)).toBe(
      '{"host":"127.0.0.1","port":42}',
    );
    expect(Result.isFailure(decodeOracleBindPort(65_536))).toBe(true);
    expect(Result.isFailure(decodeOracleListeningPort(0))).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(OracleHttpReadinessSchema)({
          host: ORACLE_LOOPBACK_HOST,
          port: 0,
        }),
      ),
    ).toBe(true);
    expect(
      encodeOracleDefectResponseJson(oracleDefectResponse({ distributionId })),
    ).toBe(`{"tag":"defect","distributionId":"sha256:${"a".repeat(64)}"}`);
  });

  test("keeps bind and listening port domains exact across generated integers", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_024, max: 66_559 }), (value) => {
        expect(Result.isSuccess(decodeOracleBindPort(value))).toBe(
          value >= 0 && value <= 65_535,
        );
        expect(Result.isSuccess(decodeOracleListeningPort(value))).toBe(
          value >= 1 && value <= 65_535,
        );
      }),
      { numRuns: 200 },
    );
    for (const value of [0, 1, 65_535]) {
      expect(Result.isSuccess(decodeOracleBindPort(value))).toBe(true);
    }
    expect(Result.isFailure(decodeOracleListeningPort(0))).toBe(true);
    expect(Result.isSuccess(decodeOracleListeningPort(1))).toBe(true);
    expect(Result.isSuccess(decodeOracleListeningPort(65_535))).toBe(true);
  });
});
