import { Schema } from "effect";

import { ORACLE_DECODE_ISSUE_CODES } from "./oracle-decode.ts";
import { compareCodePoints } from "./oracle-canonical.ts";
import {
  OracleTraceSchema,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";

/** The only address an Oracle HTTP service may bind. */
export const ORACLE_LOOPBACK_HOST = "127.0.0.1" as const;

export const OracleLoopbackHostSchema = Schema.Literal(
  ORACLE_LOOPBACK_HOST,
).annotate({ identifier: "OracleLoopbackHost" });

export type OracleLoopbackHost = typeof OracleLoopbackHostSchema.Type;

/** A requested TCP bind port, including zero for operating-system assignment. */
export const OracleBindPortSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isBetween({ minimum: 0, maximum: 65_535 })),
  Schema.brand("OracleBindPort"),
).annotate({ identifier: "OracleBindPort" });

export type OracleBindPort = typeof OracleBindPortSchema.Type;

export const decodeOracleBindPort =
  Schema.decodeUnknownResult(OracleBindPortSchema);

/** A TCP port returned after the operating system has completed a bind. */
export const OracleListeningPortSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isBetween({ minimum: 1, maximum: 65_535 })),
  Schema.brand("OracleListeningPort"),
).annotate({ identifier: "OracleListeningPort" });

export type OracleListeningPort = typeof OracleListeningPortSchema.Type;

export const decodeOracleListeningPort = Schema.decodeUnknownResult(
  OracleListeningPortSchema,
);

/** The one compact value written after a serve command starts listening. */
export const OracleHttpReadinessSchema = Schema.Struct({
  host: OracleLoopbackHostSchema,
  port: OracleListeningPortSchema,
}).annotate({
  identifier: "OracleHttpReadiness",
  parseOptions: { onExcessProperty: "error" },
});

export type OracleHttpReadiness = typeof OracleHttpReadinessSchema.Type;

/** The identity of the executable and immutable services used for evaluation. */
export const DistributionIdSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/u)),
  Schema.brand("DistributionId"),
).annotate({ identifier: "DistributionId" });

export type DistributionId = typeof DistributionIdSchema.Type;

export const decodeDistributionId =
  Schema.decodeUnknownResult(DistributionIdSchema);

export const OracleDecodeIssueSchema = Schema.Struct({
  path: Schema.String,
  code: Schema.Literals(ORACLE_DECODE_ISSUE_CODES),
}).annotate({
  identifier: "OracleDecodeIssue",
  parseOptions: { onExcessProperty: "error" },
});

/** Canonical, non-empty issues returned by the shared batch decoder. */
export const OracleDecodeIssuesSchema = Schema.NonEmptyArray(
  OracleDecodeIssueSchema,
)
  .pipe(
    Schema.check(
      Schema.makeFilter(isCanonicalOracleDecodeIssues, {
        message: "Oracle decode issues must be unique and canonically ordered",
      }),
    ),
  )
  .annotate({
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
}).annotate({
  identifier: "OracleEvaluatedResponse",
  parseOptions: { onExcessProperty: "error" },
});

const OracleDecodeRejectedResponseSchema = Schema.Struct({
  tag: Schema.Literal("decodeRejected"),
  distributionId: DistributionIdSchema,
  issues: OracleDecodeIssuesSchema,
}).annotate({
  identifier: "OracleDecodeRejectedResponse",
  parseOptions: { onExcessProperty: "error" },
});

/** The complete response algebra for one raw batch frame. */
export const OracleBatchResponseSchema = Schema.Union([
  OracleEvaluatedResponseSchema,
  OracleDecodeRejectedResponseSchema,
]).annotate({
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
}).annotate({
  identifier: "OracleIdentityResponse",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleIdentityResponse = Schema.Schema.Type<
  typeof OracleIdentityResponseSchema
>;

/** A transport-level defect is not part of the Oracle batch response algebra. */
export const OracleDefectResponseSchema = Schema.Struct({
  tag: Schema.Literal("defect"),
  distributionId: DistributionIdSchema,
}).annotate({
  identifier: "OracleDefectResponse",
  parseOptions: { onExcessProperty: "error" },
});

export type OracleDefectResponse = typeof OracleDefectResponseSchema.Type;

const OracleBatchResponseJsonSchema = Schema.fromJsonString(
  OracleBatchResponseSchema,
);
const OracleIdentityResponseJsonSchema = Schema.fromJsonString(
  OracleIdentityResponseSchema,
);
const OracleHttpReadinessJsonSchema = Schema.fromJsonString(
  OracleHttpReadinessSchema,
);
const OracleDefectResponseJsonSchema = Schema.fromJsonString(
  OracleDefectResponseSchema,
);

/** Encode only after schema validation; JSON object member order is schema order. */
export const encodeOracleBatchResponseJson = Schema.encodeSync(
  OracleBatchResponseJsonSchema,
);

export const encodeOracleIdentityResponseJson = Schema.encodeSync(
  OracleIdentityResponseJsonSchema,
);

export const encodeOracleHttpReadinessJson = Schema.encodeSync(
  OracleHttpReadinessJsonSchema,
);

export const encodeOracleDefectResponseJson = Schema.encodeSync(
  OracleDefectResponseJsonSchema,
);

export function oracleDefectResponse(input: {
  readonly distributionId: DistributionId;
}): OracleDefectResponse {
  return OracleDefectResponseSchema.make({
    tag: "defect",
    distributionId: input.distributionId,
  });
}

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
