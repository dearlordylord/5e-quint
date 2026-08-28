import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeDistributionId,
  DistributionIdSchema,
  encodeOracleBatchResponseJson,
  oracleDecodeRejectedResponse,
  OracleBatchResponseSchema,
  OracleDecodeIssuesSchema,
} from "./oracle-process-contract.ts";

const distributionId = Schema.decodeUnknownSync(DistributionIdSchema)(
  `sha256:${"a".repeat(64)}`,
);

describe("Opaque Oracle process contract", () => {
  test("parses only the branded distribution identity format", () => {
    expect(Either.isRight(decodeDistributionId(distributionId))).toBe(true);
    expect(Either.isLeft(decodeDistributionId("sha256:ABC"))).toBe(true);
    expect(Either.isLeft(decodeDistributionId("catalog:unknown"))).toBe(true);
  });

  test("requires non-empty canonical issues and keeps response variants exclusive", () => {
    const rejected = oracleDecodeRejectedResponse({
      distributionId,
      issues: [{ path: "", code: "invalidJson" }],
    });

    expect(Schema.is(OracleBatchResponseSchema)(rejected)).toBe(true);
    expect(
      Either.isLeft(Schema.decodeUnknownEither(OracleDecodeIssuesSchema)([])),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(OracleBatchResponseSchema)({
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
});
