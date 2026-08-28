import { Schema } from "effect";

import { ORACLE_DECODE_ISSUE_CODES } from "./oracle-decode.ts";
import { compareCodePoints } from "./oracle-canonical.ts";
import {
  OracleTraceSchema,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";

/** The identity of the executable and immutable services used for evaluation. */
export const DistributionIdSchema = Schema.String.pipe(
  Schema.pattern(/^sha256:[0-9a-f]{64}$/u),
  Schema.brand("DistributionId"),
).annotations({ identifier: "DistributionId" });

export type DistributionId = typeof DistributionIdSchema.Type;

export const decodeDistributionId =
  Schema.decodeUnknownEither(DistributionIdSchema);

export const OracleDecodeIssueSchema = Schema.Struct({
  path: Schema.String,
  code: Schema.Literal(...ORACLE_DECODE_ISSUE_CODES),
}).annotations({
  identifier: "OracleDecodeIssue",
  parseOptions: { onExcessProperty: "error" },
});

/** Canonical, non-empty issues returned by the shared batch decoder. */
export const OracleDecodeIssuesSchema = Schema.NonEmptyArray(
  OracleDecodeIssueSchema,
)
  .pipe(
    Schema.filter(isCanonicalOracleDecodeIssues, {
      message: () =>
        "Oracle decode issues must be unique and canonically ordered",
    }),
  )
  .annotations({
    identifier: "OracleDecodeIssues",
    parseOptions: { onExcessProperty: "error" },
  });

export type OracleDecodeIssue = Schema.Schema.Type<
  typeof OracleDecodeIssueSchema
>;
export type OracleDecodeIssues = Schema.Schema.Type<
  typeof OracleDecodeIssuesSchema
>;

const OracleEvaluatedResponseSchema = Schema.Struct({
  tag: Schema.Literal("evaluated"),
  distributionId: DistributionIdSchema,
  traces: Schema.NonEmptyArray(OracleTraceSchema),
}).annotations({
  identifier: "OracleEvaluatedResponse",
  parseOptions: { onExcessProperty: "error" },
});

const OracleDecodeRejectedResponseSchema = Schema.Struct({
  tag: Schema.Literal("decodeRejected"),
  distributionId: DistributionIdSchema,
  issues: OracleDecodeIssuesSchema,
}).annotations({
  identifier: "OracleDecodeRejectedResponse",
  parseOptions: { onExcessProperty: "error" },
});

/** The complete response algebra for one raw batch frame. */
export const OracleBatchResponseSchema = Schema.Union(
  OracleEvaluatedResponseSchema,
  OracleDecodeRejectedResponseSchema,
).annotations({
  identifier: "OracleBatchResponse",
  parseOptions: { onExcessProperty: "error" },
});

export type OracleEvaluatedResponse = Schema.Schema.Type<
  typeof OracleEvaluatedResponseSchema
>;
export type OracleDecodeRejectedResponse = Schema.Schema.Type<
  typeof OracleDecodeRejectedResponseSchema
>;
export type OracleBatchResponse = Schema.Schema.Type<
  typeof OracleBatchResponseSchema
>;

export const OracleIdentityResponseSchema = Schema.Struct({
  distributionId: DistributionIdSchema,
}).annotations({
  identifier: "OracleIdentityResponse",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleIdentityResponse = Schema.Schema.Type<
  typeof OracleIdentityResponseSchema
>;

const OracleBatchResponseJsonSchema = Schema.parseJson(
  OracleBatchResponseSchema,
);
const OracleIdentityResponseJsonSchema = Schema.parseJson(
  OracleIdentityResponseSchema,
);

/** Encode only after schema validation; JSON object member order is schema order. */
export const encodeOracleBatchResponseJson = Schema.encodeSync(
  OracleBatchResponseJsonSchema,
);

export const encodeOracleIdentityResponseJson = Schema.encodeSync(
  OracleIdentityResponseJsonSchema,
);

export function oracleDecodeRejectedResponse(input: {
  readonly distributionId: DistributionId;
  readonly issues: OracleDecodeIssues;
}): OracleDecodeRejectedResponse {
  return OracleDecodeRejectedResponseSchema.make({
    tag: "decodeRejected",
    distributionId: input.distributionId,
    issues: input.issues,
  });
}

export function oracleEvaluatedResponse(input: {
  readonly distributionId: DistributionId;
  readonly traces: readonly [OracleTrace, ...OracleTrace[]];
}): OracleEvaluatedResponse {
  return OracleEvaluatedResponseSchema.make({
    tag: "evaluated",
    distributionId: input.distributionId,
    traces: input.traces,
  });
}

export const ORACLE_INVALID_JSON_ISSUES = [
  { path: "", code: "invalidJson" },
] as const satisfies OracleDecodeIssues;

export function isOracleBatchResponse(
  input: unknown,
): input is OracleBatchResponse {
  return Schema.is(OracleBatchResponseSchema)(input);
}

function isCanonicalOracleDecodeIssues(
  issues: readonly OracleDecodeIssue[],
): boolean {
  for (let index = 1; index < issues.length; index += 1) {
    const previous = issues[index - 1];
    const current = issues[index];
    if (previous === undefined || current === undefined) return false;
    const pathOrder = compareCodePoints(previous.path, current.path);
    if (
      pathOrder > 0 ||
      (pathOrder === 0 &&
        ORACLE_DECODE_ISSUE_CODES.indexOf(previous.code) >=
          ORACLE_DECODE_ISSUE_CODES.indexOf(current.code))
    ) {
      return false;
    }
  }
  return true;
}
