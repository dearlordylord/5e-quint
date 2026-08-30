import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import { Match, Result, Schema } from "effect";

import { PublishedSrdSurfaceSchema } from "./schema.ts";

const CERTIFICATE_FORMAT_VERSION = 4;
const EFFECT3_SURFACE_BASELINE_COMMIT =
  "76d9abaf0ec9c8369d5f95f603c5cce88704d26e";
const SURFACE_AGGREGATE_PATH = "packages/surface/publication/srd-surface.json";
const SURFACE_SCHEMA_PATH =
  "packages/surface/publication/srd-surface.schema.json";

const AGGREGATE_RECORD_FAMILIES = ["units", "statBlocks"] as const;
type AggregateRecordFamily = (typeof AGGREGATE_RECORD_FAMILIES)[number];

const REVIEWED_CHANGED_RECORD_DELTA_CLASSES = [
  "authored-companion-lifecycle",
  "authored-execution-vocabulary",
  "authored-modal-ongoing-effect",
  "authored-persistent-rule-facts",
  "truthful-illumination-emission",
] as const;
const REVIEWED_MEMBERSHIP_DELTA_CLASSES = [
  "authored-catalog-membership",
] as const;

const SCHEMA_LABELS = ["baseline-schema", "candidate-schema"] as const;
type SchemaLabel = (typeof SCHEMA_LABELS)[number];

const AGGREGATE_LABELS = ["baseline-aggregate", "candidate-aggregate"] as const;
type AggregateLabel = (typeof AGGREGATE_LABELS)[number];

const SCHEMA_VALIDATION_OUTCOMES = ["accepted", "rejected"] as const;

const HashSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/u)),
);
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
);
const ArtifactDigestSchema = Schema.Struct({
  byteLength: NonNegativeIntegerSchema,
  sha256: HashSchema,
});
const ReviewedAggregateRecordDeltaFields = {
  family: Schema.Literals(AGGREGATE_RECORD_FAMILIES),
  id: Schema.String,
};
const ReviewedAggregateRecordDeltaSchema = Schema.Union([
  Schema.Struct({
    ...ReviewedAggregateRecordDeltaFields,
    kind: Schema.Literal("changed"),
    semanticClass: Schema.Literals(REVIEWED_CHANGED_RECORD_DELTA_CLASSES),
    baselineCanonicalJsonSha256: HashSchema,
    candidateCanonicalJsonSha256: HashSchema,
  }),
  Schema.Struct({
    ...ReviewedAggregateRecordDeltaFields,
    kind: Schema.Literal("added"),
    semanticClass: Schema.Literals(REVIEWED_MEMBERSHIP_DELTA_CLASSES),
    candidateCanonicalJsonSha256: HashSchema,
  }),
  Schema.Struct({
    ...ReviewedAggregateRecordDeltaFields,
    kind: Schema.Literal("removed"),
    semanticClass: Schema.Literals(REVIEWED_MEMBERSHIP_DELTA_CLASSES),
    baselineCanonicalJsonSha256: HashSchema,
  }),
]);
const ReviewedAggregateOrderDeltaSchema = Schema.Struct({
  kind: Schema.Literal("object-key-order-changed"),
  family: Schema.Literals(AGGREGATE_RECORD_FAMILIES),
  id: Schema.String,
  path: Schema.String,
  baselineKeyOrder: Schema.Array(Schema.String),
  candidateKeyOrder: Schema.Array(Schema.String),
  canonicalValueSha256: HashSchema,
});
const AggregateMembershipEvidenceSchema = Schema.Struct({
  recordCounts: Schema.Struct({
    units: NonNegativeIntegerSchema,
    statBlocks: NonNegativeIntegerSchema,
    total: NonNegativeIntegerSchema,
  }),
  orderedIdSha256: Schema.Struct({
    units: HashSchema,
    statBlocks: HashSchema,
    all: HashSchema,
  }),
});
const AggregateCertificateSchema = Schema.Struct({
  baseline: ArtifactDigestSchema,
  candidate: ArtifactDigestSchema,
  evidence: Schema.Struct({
    baselineCanonicalJsonSha256: HashSchema,
    candidateCanonicalJsonSha256: HashSchema,
    membership: Schema.Struct({
      baseline: AggregateMembershipEvidenceSchema,
      candidate: AggregateMembershipEvidenceSchema,
    }),
    reviewedRecordDeltas: Schema.Array(ReviewedAggregateRecordDeltaSchema),
    reviewedOrderDeltas: Schema.Array(ReviewedAggregateOrderDeltaSchema),
  }),
});
const SchemaCrossValidationExpectationSchema = Schema.Struct({
  schema: Schema.Literals(SCHEMA_LABELS),
  aggregate: Schema.Literals(AGGREGATE_LABELS),
  outcome: Schema.Literals(SCHEMA_VALIDATION_OUTCOMES),
});
const SchemaCertificateSchema = Schema.Struct({
  baseline: ArtifactDigestSchema,
  candidate: ArtifactDigestSchema,
  evidence: Schema.Struct({
    baselineCanonicalJsonSha256: HashSchema,
    candidateCanonicalJsonSha256: HashSchema,
    definitions: Schema.Struct({
      baseline: NonNegativeIntegerSchema,
      candidate: NonNegativeIntegerSchema,
    }),
    references: Schema.Struct({
      baseline: NonNegativeIntegerSchema,
      candidate: NonNegativeIntegerSchema,
    }),
    localReferencesComplete: Schema.Struct({
      baseline: Schema.Boolean,
      candidate: Schema.Boolean,
    }),
    crossValidation: Schema.Array(SchemaCrossValidationExpectationSchema),
  }),
});
const SurfacePublicationDeltaCertificateSchema = Schema.Struct({
  formatVersion: Schema.Literal(CERTIFICATE_FORMAT_VERSION),
  baselineCommit: Schema.Literal(EFFECT3_SURFACE_BASELINE_COMMIT),
  artifacts: Schema.Struct({
    aggregate: AggregateCertificateSchema,
    schema: SchemaCertificateSchema,
  }),
});

type SurfacePublicationDeltaCertificate = Schema.Schema.Type<
  typeof SurfacePublicationDeltaCertificateSchema
>;

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type JsonObject = { readonly [key: string]: JsonValue };

type PublicationDeltaVerificationIssueKind =
  | "certificate-unreadable"
  | "certificate-digest-mismatch"
  | "certificate-invalid-json"
  | "certificate-invalid"
  | "baseline-history-unavailable"
  | "baseline-unreadable"
  | "baseline-hash-mismatch"
  | "candidate-unreadable"
  | "candidate-hash-mismatch"
  | "aggregate-invalid"
  | "aggregate-record-mismatch"
  | "aggregate-evidence-mismatch"
  | "aggregate-delta-certificate-mismatch"
  | "aggregate-delta-evidence-mismatch"
  | "aggregate-delta-stale"
  | "aggregate-delta-unclassified"
  | "aggregate-order-delta-certificate-mismatch"
  | "aggregate-order-delta-evidence-mismatch"
  | "aggregate-order-delta-stale"
  | "aggregate-order-delta-unclassified"
  | "schema-invalid"
  | "schema-evidence-mismatch"
  | "schema-reference-mismatch"
  | "schema-cross-validation-mismatch"
  | "schema-compile-failed"
  | "schema-validation-failed";

type PublicationDeltaVerificationIssue = {
  readonly kind: PublicationDeltaVerificationIssueKind;
  readonly message: string;
};

export type SurfacePublicationDeltaVerificationResult =
  | {
      readonly tag: "verified";
      readonly baselineCommit: string;
    }
  | {
      readonly tag: "invalid";
      readonly issues: readonly PublicationDeltaVerificationIssue[];
    };

export type SurfacePublicationDeltaCoreOptions = {
  readonly repoRoot: string;
  readonly publicationDir?: string;
  readonly certificateAuthority: {
    readonly path: string;
    readonly sha256: string;
  };
};

type ArtifactBytes =
  | { readonly tag: "ok"; readonly bytes: Buffer }
  | {
      readonly tag: "invalid";
      readonly kind:
        | "baseline-history-unavailable"
        | "baseline-unreadable"
        | "candidate-unreadable";
      readonly message: string;
    };

type ParsedArtifact =
  | { readonly tag: "ok"; readonly value: JsonValue }
  | { readonly tag: "invalid"; readonly message: string };

type SchemaReferenceEvidence = {
  readonly definitions: number;
  readonly references: number;
  readonly localReferencesComplete: boolean;
};

type SchemaEvidence = SchemaReferenceEvidence & {
  readonly canonicalJsonSha256: string;
};

type AggregateEvidence = {
  readonly canonicalJsonSha256: string;
  readonly recordCounts: {
    readonly units: number;
    readonly statBlocks: number;
    readonly total: number;
  };
  readonly orderedIdSha256: {
    readonly units: string;
    readonly statBlocks: string;
    readonly all: string;
  };
};

type AggregateRecord = {
  readonly family: AggregateRecordFamily;
  readonly id: string;
  readonly value: JsonObject;
  readonly canonicalJsonSha256: string;
};

type ObservedRecordDelta =
  | {
      readonly kind: "changed";
      readonly family: AggregateRecordFamily;
      readonly id: string;
      readonly baselineCanonicalJsonSha256: string;
      readonly candidateCanonicalJsonSha256: string;
    }
  | {
      readonly kind: "added";
      readonly family: AggregateRecordFamily;
      readonly id: string;
      readonly candidateCanonicalJsonSha256: string;
    }
  | {
      readonly kind: "removed";
      readonly family: AggregateRecordFamily;
      readonly id: string;
      readonly baselineCanonicalJsonSha256: string;
    };

type ObservedOrderDelta = {
  readonly family: AggregateRecordFamily;
  readonly id: string;
  readonly path: string;
  readonly baselineKeyOrder: readonly string[];
  readonly candidateKeyOrder: readonly string[];
  readonly canonicalValueSha256: string;
};

type AggregateRecordProjection = {
  readonly records: ReadonlyMap<string, AggregateRecord>;
  readonly recordCounts: AggregateEvidence["recordCounts"];
  readonly orderedIdSha256: AggregateEvidence["orderedIdSha256"];
};

type SchemaDocument = JsonObject & {
  readonly $defs: JsonObject;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every(isJsonValue);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBytes(
  filePath: string,
  unreadableKind: "baseline-unreadable" | "candidate-unreadable",
): ArtifactBytes {
  try {
    return { tag: "ok", bytes: readFileSync(filePath) };
  } catch (error) {
    return {
      tag: "invalid",
      kind: unreadableKind,
      message: errorMessage(error),
    };
  }
}

function parseJsonBytes(bytes: Buffer): ParsedArtifact {
  try {
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    return isJsonValue(parsed)
      ? { tag: "ok", value: parsed }
      : { tag: "invalid", message: "JSON value is not a finite JSON value" };
  } catch (error) {
    return { tag: "invalid", message: errorMessage(error) };
  }
}

function readCertificate(
  certificatePath: string,
  reviewedCertificateSha256: string,
):
  | { readonly tag: "ok"; readonly value: SurfacePublicationDeltaCertificate }
  | {
      readonly tag: "invalid";
      readonly kind:
        | "certificate-unreadable"
        | "certificate-digest-mismatch"
        | "certificate-invalid-json"
        | "certificate-invalid";
      readonly message: string;
    } {
  let bytes: Buffer;
  try {
    bytes = readFileSync(certificatePath);
  } catch (error) {
    return {
      tag: "invalid",
      kind: "certificate-unreadable",
      message: errorMessage(error),
    };
  }
  const parsed = parseJsonBytes(bytes);
  if (parsed.tag === "invalid") {
    return {
      tag: "invalid",
      kind: "certificate-invalid-json",
      message: parsed.message,
    };
  }
  const decoded = Schema.decodeUnknownResult(
    SurfacePublicationDeltaCertificateSchema,
    { onExcessProperty: "error" },
  )(parsed.value);
  if (Result.isFailure(decoded)) {
    return {
      tag: "invalid",
      kind: "certificate-invalid",
      message: String(decoded.failure),
    };
  }
  const observedSha256 = sha256(bytes);
  return observedSha256 === reviewedCertificateSha256
    ? { tag: "ok", value: decoded.success }
    : {
        tag: "invalid",
        kind: "certificate-digest-mismatch",
        message: `certificate bytes have SHA-256 ${observedSha256}; expected the reviewed certificate digest ${reviewedCertificateSha256}.`,
      };
}

function compareCodePointStrings(left: string, right: string): number {
  const leftCodePoints = Array.from(left, (character) =>
    character.codePointAt(0),
  );
  const rightCodePoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftCodePoint = leftCodePoints[index];
    const rightCodePoint = rightCodePoints[index];
    if (leftCodePoint === rightCodePoint) continue;
    return leftCodePoint! < rightCodePoint! ? -1 : 1;
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareCodePointStrings)
      .map((key) => [key, canonicalizeJson(value[key]!)]),
  );
}

function canonicalJson(value: JsonValue): string {
  return JSON.stringify(canonicalizeJson(value));
}

function readBaselineArtifact(
  repoRoot: string,
  baselineCommit: string,
  path: string,
): ArtifactBytes {
  try {
    execFileSync("git", ["cat-file", "-e", `${baselineCommit}^{commit}`], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch (error) {
    return {
      tag: "invalid",
      kind: "baseline-history-unavailable",
      message: `baseline commit ${baselineCommit} is unavailable in the checkout history: ${errorMessage(error)}`,
    };
  }
  try {
    return {
      tag: "ok",
      bytes: execFileSync("git", ["show", `${baselineCommit}:${path}`], {
        cwd: repoRoot,
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      tag: "invalid",
      kind: "baseline-unreadable",
      message: `git show ${baselineCommit}:${path} failed: ${errorMessage(error)}`,
    };
  }
}

function parseArtifact(bytes: ArtifactBytes): ParsedArtifact {
  return bytes.tag === "ok"
    ? parseJsonBytes(bytes.bytes)
    : { tag: "invalid", message: bytes.message };
}

function schemaDocument(
  value: JsonValue,
):
  | { readonly tag: "ok"; readonly value: SchemaDocument }
  | { readonly tag: "invalid"; readonly message: string } {
  if (!isJsonObject(value)) {
    return { tag: "invalid", message: "schema root must be an object" };
  }
  const definitions = value.$defs;
  if (!isJsonObject(definitions)) {
    return {
      tag: "invalid",
      message: "schema root must contain an object $defs",
    };
  }
  return {
    tag: "ok",
    value: { ...value, $defs: definitions },
  };
}

function schemaReferences(schema: SchemaDocument): SchemaReferenceEvidence {
  const definitionNames = new Set(Object.keys(schema.$defs));
  let references = 0;
  let localReferencesComplete = true;
  const visit = (value: JsonValue): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isJsonObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref") {
        references += 1;
        if (
          typeof child !== "string" ||
          !child.startsWith("#/$defs/") ||
          !definitionNames.has(child.slice("#/$defs/".length))
        ) {
          localReferencesComplete = false;
        }
      }
      visit(child);
    }
  };
  visit(schema);
  return {
    definitions: definitionNames.size,
    references,
    localReferencesComplete,
  };
}

function schemaEvidence(schema: SchemaDocument): SchemaEvidence {
  return {
    ...schemaReferences(schema),
    canonicalJsonSha256: sha256(Buffer.from(canonicalJson(schema), "utf8")),
  };
}

function aggregateEvidence(
  rawValue: JsonValue,
  projection: AggregateRecordProjection,
): AggregateEvidence {
  return {
    canonicalJsonSha256: sha256(Buffer.from(canonicalJson(rawValue), "utf8")),
    recordCounts: projection.recordCounts,
    orderedIdSha256: projection.orderedIdSha256,
  };
}

function aggregateRecordKey(family: AggregateRecordFamily, id: string): string {
  return `${family}/${id}`;
}

function projectAggregateRecords(
  value: JsonValue,
):
  | { readonly tag: "ok"; readonly value: AggregateRecordProjection }
  | { readonly tag: "invalid"; readonly message: string } {
  if (!isJsonObject(value)) {
    return { tag: "invalid", message: "aggregate root must be an object" };
  }
  const records = new Map<string, AggregateRecord>();
  const orderedIds = new Map<AggregateRecordFamily, readonly string[]>();
  for (const family of AGGREGATE_RECORD_FAMILIES) {
    const familyValue = value[family];
    if (!Array.isArray(familyValue)) {
      return {
        tag: "invalid",
        message: `aggregate ${family} must be an array`,
      };
    }
    const ids: string[] = [];
    for (const recordValue of familyValue) {
      if (!isJsonObject(recordValue) || typeof recordValue.id !== "string") {
        return {
          tag: "invalid",
          message: `aggregate ${family} must contain objects with string ids`,
        };
      }
      const key = aggregateRecordKey(family, recordValue.id);
      if (records.has(key)) {
        return {
          tag: "invalid",
          message: `aggregate ${family} contains duplicate id ${recordValue.id}`,
        };
      }
      ids.push(recordValue.id);
      records.set(key, {
        family,
        id: recordValue.id,
        value: recordValue,
        canonicalJsonSha256: sha256(
          Buffer.from(canonicalJson(recordValue), "utf8"),
        ),
      });
    }
    orderedIds.set(family, ids);
  }
  const units = orderedIds.get("units") ?? [];
  const statBlocks = orderedIds.get("statBlocks") ?? [];
  const all = [...units, ...statBlocks];
  const orderedIdSha256 = (ids: readonly string[]): string =>
    sha256(Buffer.from(JSON.stringify(ids), "utf8"));
  return {
    tag: "ok",
    value: {
      records,
      recordCounts: {
        units: units.length,
        statBlocks: statBlocks.length,
        total: all.length,
      },
      orderedIdSha256: {
        units: orderedIdSha256(units),
        statBlocks: orderedIdSha256(statBlocks),
        all: orderedIdSha256(all),
      },
    },
  };
}

function candidateAggregateDecode(
  value: JsonValue,
):
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string } {
  const decoded = Schema.decodeUnknownResult(PublishedSrdSurfaceSchema, {
    onExcessProperty: "error",
  })(value);
  return Result.isSuccess(decoded)
    ? { tag: "ok" }
    : { tag: "invalid", message: String(decoded.failure) };
}

function appendCandidateAggregateDecodeIssue(
  issues: PublicationDeltaVerificationIssue[],
  decoded: ReturnType<typeof candidateAggregateDecode>,
): void {
  if (decoded.tag !== "invalid") return;
  issues.push({
    kind: "aggregate-invalid",
    message: `Candidate aggregate does not decode under the current Surface contract: ${decoded.message}`,
  });
}

function compareAggregateRecordEvidence(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  evidence: AggregateEvidence,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"],
): void {
  const expectedMembership = expected.membership[label];
  if (
    JSON.stringify(evidence.recordCounts) !==
    JSON.stringify(expectedMembership.recordCounts)
  ) {
    issues.push({
      kind: "aggregate-record-mismatch",
      message: `${label} aggregate record counts do not match the reviewed certificate evidence.`,
    });
  }
  if (
    JSON.stringify(evidence.orderedIdSha256) !==
    JSON.stringify(expectedMembership.orderedIdSha256)
  ) {
    issues.push({
      kind: "aggregate-record-mismatch",
      message: `${label} aggregate ordered ID hashes do not match the reviewed certificate evidence.`,
    });
  }
}

function compareAggregateCanonicalEvidence(
  issues: PublicationDeltaVerificationIssue[],
  baseline: AggregateEvidence,
  candidate: AggregateEvidence,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"],
): void {
  if (
    baseline.canonicalJsonSha256 !== expected.baselineCanonicalJsonSha256 ||
    candidate.canonicalJsonSha256 !== expected.candidateCanonicalJsonSha256
  ) {
    issues.push({
      kind: "aggregate-evidence-mismatch",
      message:
        "Aggregate canonical JSON hashes do not match the reviewed certificate evidence.",
    });
  }
}

function compareReviewedRecordDeltas(
  issues: PublicationDeltaVerificationIssue[],
  baseline: AggregateRecordProjection,
  candidate: AggregateRecordProjection,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"]["reviewedRecordDeltas"],
): void {
  const expectedByKey = new Map<string, (typeof expected)[number]>();
  for (const delta of expected) {
    const key = aggregateRecordKey(delta.family, delta.id);
    if (expectedByKey.has(key)) {
      issues.push({
        kind: "aggregate-delta-certificate-mismatch",
        message: `Reviewed aggregate delta ${key} is listed more than once.`,
      });
      continue;
    }
    expectedByKey.set(key, delta);
  }

  const observedByKey = new Map<string, ObservedRecordDelta>();
  const recordKeys = new Set([
    ...baseline.records.keys(),
    ...candidate.records.keys(),
  ]);
  for (const key of recordKeys) {
    const baselineRecord = baseline.records.get(key);
    const candidateRecord = candidate.records.get(key);
    if (baselineRecord === undefined && candidateRecord !== undefined) {
      observedByKey.set(key, {
        kind: "added",
        family: candidateRecord.family,
        id: candidateRecord.id,
        candidateCanonicalJsonSha256: candidateRecord.canonicalJsonSha256,
      });
    } else if (baselineRecord !== undefined && candidateRecord === undefined) {
      observedByKey.set(key, {
        kind: "removed",
        family: baselineRecord.family,
        id: baselineRecord.id,
        baselineCanonicalJsonSha256: baselineRecord.canonicalJsonSha256,
      });
    } else if (
      baselineRecord !== undefined &&
      candidateRecord !== undefined &&
      baselineRecord.canonicalJsonSha256 !== candidateRecord.canonicalJsonSha256
    ) {
      observedByKey.set(key, {
        kind: "changed",
        family: baselineRecord.family,
        id: baselineRecord.id,
        baselineCanonicalJsonSha256: baselineRecord.canonicalJsonSha256,
        candidateCanonicalJsonSha256: candidateRecord.canonicalJsonSha256,
      });
    }
  }

  for (const [key, observed] of observedByKey) {
    const reviewed = expectedByKey.get(key);
    if (reviewed === undefined) {
      issues.push({
        kind: "aggregate-delta-unclassified",
        message: `Aggregate record ${key} has an unclassified ${observed.kind} delta.`,
      });
      continue;
    }
    const exactEvidenceMatches = Match.value(reviewed).pipe(
      Match.when(
        { kind: "changed" },
        (delta) =>
          observed.kind === "changed" &&
          delta.baselineCanonicalJsonSha256 ===
            observed.baselineCanonicalJsonSha256 &&
          delta.candidateCanonicalJsonSha256 ===
            observed.candidateCanonicalJsonSha256,
      ),
      Match.when(
        { kind: "added" },
        (delta) =>
          observed.kind === "added" &&
          delta.candidateCanonicalJsonSha256 ===
            observed.candidateCanonicalJsonSha256,
      ),
      Match.when(
        { kind: "removed" },
        (delta) =>
          observed.kind === "removed" &&
          delta.baselineCanonicalJsonSha256 ===
            observed.baselineCanonicalJsonSha256,
      ),
      Match.exhaustive,
    );
    if (!exactEvidenceMatches) {
      issues.push({
        kind: "aggregate-delta-evidence-mismatch",
        message: `Aggregate record ${key} does not match its reviewed ${reviewed.kind} shape and exact hash evidence.`,
      });
    }
  }
  for (const [key] of expectedByKey) {
    if (observedByKey.has(key)) continue;
    issues.push({
      kind: "aggregate-delta-stale",
      message: `Reviewed aggregate delta ${key} is absent from the candidate artifact.`,
    });
  }
}

function jsonPointerChild(path: string, segment: string | number): string {
  const encoded = String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
  return `${path}/${encoded}`;
}

function aggregateOrderDeltaKey(
  family: AggregateRecordFamily,
  id: string,
  path: string,
): string {
  return JSON.stringify([family, id, path]);
}

function collectObjectOrderDeltas(
  baseline: JsonValue,
  candidate: JsonValue,
  path: string,
): readonly Omit<ObservedOrderDelta, "family" | "id">[] {
  if (Array.isArray(baseline) && Array.isArray(candidate)) {
    return baseline.flatMap((value, index) =>
      index < candidate.length
        ? collectObjectOrderDeltas(
            value,
            candidate[index]!,
            jsonPointerChild(path, index),
          )
        : [],
    );
  }
  if (!isJsonObject(baseline) || !isJsonObject(candidate)) return [];
  const baselineKeys = Object.keys(baseline);
  const candidateKeys = Object.keys(candidate);
  if (
    baselineKeys.length !== candidateKeys.length ||
    baselineKeys.some((key) => !Object.hasOwn(candidate, key))
  ) {
    return [];
  }
  const nested = baselineKeys.flatMap((key) =>
    collectObjectOrderDeltas(
      baseline[key]!,
      candidate[key]!,
      jsonPointerChild(path, key),
    ),
  );
  return baselineKeys.some((key, index) => candidateKeys[index] !== key)
    ? [
        {
          path,
          baselineKeyOrder: baselineKeys,
          candidateKeyOrder: candidateKeys,
          canonicalValueSha256: sha256(
            Buffer.from(canonicalJson(baseline), "utf8"),
          ),
        },
        ...nested,
      ]
    : nested;
}

function compareReviewedOrderDeltas(
  issues: PublicationDeltaVerificationIssue[],
  baseline: AggregateRecordProjection,
  candidate: AggregateRecordProjection,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"]["reviewedOrderDeltas"],
): void {
  const expectedByKey = new Map<string, (typeof expected)[number]>();
  for (const delta of expected) {
    const key = aggregateOrderDeltaKey(delta.family, delta.id, delta.path);
    if (expectedByKey.has(key)) {
      issues.push({
        kind: "aggregate-order-delta-certificate-mismatch",
        message: `Reviewed aggregate order delta ${key} is listed more than once.`,
      });
      continue;
    }
    expectedByKey.set(key, delta);
  }

  const observedByKey = new Map<string, ObservedOrderDelta>();
  for (const [recordKey, baselineRecord] of baseline.records) {
    const candidateRecord = candidate.records.get(recordKey);
    if (
      candidateRecord === undefined ||
      baselineRecord.canonicalJsonSha256 !== candidateRecord.canonicalJsonSha256
    ) {
      continue;
    }
    for (const delta of collectObjectOrderDeltas(
      baselineRecord.value,
      candidateRecord.value,
      "",
    )) {
      const observed = {
        ...delta,
        family: baselineRecord.family,
        id: baselineRecord.id,
      };
      observedByKey.set(
        aggregateOrderDeltaKey(
          baselineRecord.family,
          baselineRecord.id,
          delta.path,
        ),
        observed,
      );
    }
  }

  for (const [key, observed] of observedByKey) {
    const reviewed = expectedByKey.get(key);
    if (reviewed === undefined) {
      issues.push({
        kind: "aggregate-order-delta-unclassified",
        message: `Aggregate object ${key} has an unclassified key-order delta.`,
      });
      continue;
    }
    if (
      JSON.stringify(reviewed.baselineKeyOrder) !==
        JSON.stringify(observed.baselineKeyOrder) ||
      JSON.stringify(reviewed.candidateKeyOrder) !==
        JSON.stringify(observed.candidateKeyOrder) ||
      reviewed.canonicalValueSha256 !== observed.canonicalValueSha256
    ) {
      issues.push({
        kind: "aggregate-order-delta-evidence-mismatch",
        message: `Aggregate object ${key} does not match its exact reviewed key orders and canonical value hash.`,
      });
    }
  }
  for (const [key] of expectedByKey) {
    if (observedByKey.has(key)) continue;
    issues.push({
      kind: "aggregate-order-delta-stale",
      message: `Reviewed aggregate order delta ${key} is absent from the candidate artifact.`,
    });
  }
}

function compareAggregateSnapshots(
  issues: PublicationDeltaVerificationIssue[],
  baseline: ParsedArtifact,
  candidate: ParsedArtifact,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"],
): void {
  if (baseline.tag === "invalid" || candidate.tag === "invalid") {
    if (baseline.tag === "invalid") {
      issues.push({
        kind: "aggregate-invalid",
        message: `Baseline aggregate is unavailable or invalid: ${baseline.message}`,
      });
    }
    if (candidate.tag === "invalid") {
      issues.push({
        kind: "aggregate-invalid",
        message: `Candidate aggregate is unavailable or invalid: ${candidate.message}`,
      });
    }
    return;
  }
  appendCandidateAggregateDecodeIssue(
    issues,
    candidateAggregateDecode(candidate.value),
  );
  const baselineProjection = projectAggregateRecords(baseline.value);
  const candidateProjection = projectAggregateRecords(candidate.value);
  if (baselineProjection.tag === "invalid") {
    issues.push({
      kind: "aggregate-invalid",
      message: baselineProjection.message,
    });
  }
  if (candidateProjection.tag === "invalid") {
    issues.push({
      kind: "aggregate-invalid",
      message: candidateProjection.message,
    });
  }
  if (
    baselineProjection.tag === "invalid" ||
    candidateProjection.tag === "invalid"
  ) {
    return;
  }
  const baselineEvidence = aggregateEvidence(
    baseline.value,
    baselineProjection.value,
  );
  const candidateEvidence = aggregateEvidence(
    candidate.value,
    candidateProjection.value,
  );
  compareAggregateRecordEvidence(
    issues,
    "baseline",
    baselineEvidence,
    expected,
  );
  compareAggregateRecordEvidence(
    issues,
    "candidate",
    candidateEvidence,
    expected,
  );
  compareAggregateCanonicalEvidence(
    issues,
    baselineEvidence,
    candidateEvidence,
    expected,
  );
  compareReviewedRecordDeltas(
    issues,
    baselineProjection.value,
    candidateProjection.value,
    expected.reviewedRecordDeltas,
  );
  compareReviewedOrderDeltas(
    issues,
    baselineProjection.value,
    candidateProjection.value,
    expected.reviewedOrderDeltas,
  );
}

type ParsedSchemaPair = {
  readonly baseline: SchemaDocument;
  readonly candidate: SchemaDocument;
};

function parseSchemaArtifact(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  artifact: ParsedArtifact,
): SchemaDocument | undefined {
  if (artifact.tag === "invalid") {
    issues.push({
      kind: "schema-invalid",
      message: `${label[0].toUpperCase()}${label.slice(1)} schema is unavailable or invalid: ${artifact.message}`,
    });
    return undefined;
  }
  const document = schemaDocument(artifact.value);
  if (document.tag === "invalid") {
    issues.push({
      kind: "schema-invalid",
      message: `${label[0].toUpperCase()}${label.slice(1)} schema: ${document.message}`,
    });
    return undefined;
  }
  return document.value;
}

function parseSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  baseline: ParsedArtifact,
  candidate: ParsedArtifact,
): ParsedSchemaPair | undefined {
  const baselineDocument = parseSchemaArtifact(issues, "baseline", baseline);
  const candidateDocument = parseSchemaArtifact(issues, "candidate", candidate);
  if (baselineDocument === undefined || candidateDocument === undefined) {
    return undefined;
  }
  return {
    baseline: baselineDocument,
    candidate: candidateDocument,
  };
}

function expectedSchemaEvidence(
  expected: SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"],
  label: "baseline" | "candidate",
): SchemaEvidence {
  return label === "baseline"
    ? {
        canonicalJsonSha256: expected.baselineCanonicalJsonSha256,
        definitions: expected.definitions.baseline,
        references: expected.references.baseline,
        localReferencesComplete: expected.localReferencesComplete.baseline,
      }
    : {
        canonicalJsonSha256: expected.candidateCanonicalJsonSha256,
        definitions: expected.definitions.candidate,
        references: expected.references.candidate,
        localReferencesComplete: expected.localReferencesComplete.candidate,
      };
}

function compareSchemaSnapshotEvidence(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  actual: SchemaEvidence,
  expected: SchemaEvidence,
): void {
  if (actual.canonicalJsonSha256 !== expected.canonicalJsonSha256) {
    issues.push({
      kind: "schema-evidence-mismatch",
      message: `${label} schema canonical JSON hash does not match the reviewed regenerated schema graph evidence.`,
    });
  }
  if (
    actual.definitions !== expected.definitions ||
    actual.references !== expected.references
  ) {
    issues.push({
      kind: "schema-evidence-mismatch",
      message: `${label} schema definition/reference evidence does not match the reviewed regenerated schema graph.`,
    });
  }
  if (
    !actual.localReferencesComplete ||
    actual.localReferencesComplete !== expected.localReferencesComplete
  ) {
    issues.push({
      kind: "schema-reference-mismatch",
      message: `${label} schema contains a non-local or missing $ref definition; local reference closure is required.`,
    });
  }
}

function compareSchemaEvidence(
  issues: PublicationDeltaVerificationIssue[],
  schemas: ParsedSchemaPair,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"],
): void {
  for (const [label, schema] of [
    ["baseline", schemas.baseline],
    ["candidate", schemas.candidate],
  ] as const) {
    compareSchemaSnapshotEvidence(
      issues,
      label,
      schemaEvidence(schema),
      expectedSchemaEvidence(expected, label),
    );
  }
}

type CompiledSchemaValidator = ReturnType<Ajv2020["compile"]>;
type CompiledSchemaValidators = ReadonlyMap<
  SchemaLabel,
  CompiledSchemaValidator
>;

function compileSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  schemas: ParsedSchemaPair,
): CompiledSchemaValidators {
  const validators = new Map<SchemaLabel, CompiledSchemaValidator>();
  const documents: ReadonlyArray<readonly [SchemaLabel, SchemaDocument]> = [
    [SCHEMA_LABELS[0], schemas.baseline],
    [SCHEMA_LABELS[1], schemas.candidate],
  ];
  for (const [label, document] of documents) {
    try {
      const validator = new Ajv2020({
        strict: false,
        inlineRefs: false,
        code: { optimize: 0 },
      }).compile(document);
      validators.set(label, validator);
    } catch (error) {
      issues.push({
        kind: "schema-compile-failed",
        message: `${label} failed to compile: ${errorMessage(error)}`,
      });
    }
  }
  return validators;
}

function requiredCrossValidationOutcomes(): SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"]["crossValidation"] {
  return [
    {
      schema: "baseline-schema",
      aggregate: "baseline-aggregate",
      outcome: "accepted",
    },
    {
      schema: "baseline-schema",
      aggregate: "candidate-aggregate",
      outcome: "rejected",
    },
    {
      schema: "candidate-schema",
      aggregate: "baseline-aggregate",
      outcome: "rejected",
    },
    {
      schema: "candidate-schema",
      aggregate: "candidate-aggregate",
      outcome: "accepted",
    },
  ];
}

function compareCrossValidationEvidence(
  issues: PublicationDeltaVerificationIssue[],
  expected: SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"],
): void {
  if (
    JSON.stringify(expected.crossValidation) !==
    JSON.stringify(requiredCrossValidationOutcomes())
  ) {
    issues.push({
      kind: "schema-cross-validation-mismatch",
      message:
        "The certificate cross-validation matrix does not require same-version acceptance and cross-version rejection for both reviewed snapshots.",
    });
  }
}

function validateAggregatePair(
  issues: PublicationDeltaVerificationIssue[],
  validators: CompiledSchemaValidators,
  baselineAggregate: JsonValue,
  candidateAggregate: JsonValue,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"]["crossValidation"],
): void {
  const aggregates = new Map<AggregateLabel, JsonValue>([
    [AGGREGATE_LABELS[0], baselineAggregate],
    [AGGREGATE_LABELS[1], candidateAggregate],
  ]);
  for (const expectation of expected) {
    const validator = validators.get(expectation.schema);
    if (validator === undefined) continue;
    const aggregate = aggregates.get(expectation.aggregate);
    if (aggregate === undefined) continue;
    const observedOutcome = validator(aggregate) ? "accepted" : "rejected";
    if (observedOutcome === expectation.outcome) continue;
    issues.push({
      kind: "schema-validation-failed",
      message: `${expectation.schema}/${expectation.aggregate} was ${observedOutcome}; expected ${expectation.outcome}. AJV evidence: ${JSON.stringify(validator.errors?.slice(0, 3) ?? [])}`,
    });
  }
}

function validateSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  certificate: SurfacePublicationDeltaCertificate,
  baselineSchema: ParsedArtifact,
  candidateSchema: ParsedArtifact,
  baselineAggregate: ParsedArtifact,
  candidateAggregate: ParsedArtifact,
): void {
  const schemas = parseSchemaPair(issues, baselineSchema, candidateSchema);
  if (
    schemas === undefined ||
    baselineAggregate.tag === "invalid" ||
    candidateAggregate.tag === "invalid"
  ) {
    return;
  }
  const expected = certificate.artifacts.schema.evidence;
  compareSchemaEvidence(issues, schemas, expected);
  compareCrossValidationEvidence(issues, expected);
  const validators = compileSchemaPair(issues, schemas);
  validateAggregatePair(
    issues,
    validators,
    canonicalizeJson(baselineAggregate.value),
    canonicalizeJson(candidateAggregate.value),
    expected.crossValidation,
  );
}

function verifyArtifactBytes(
  issues: PublicationDeltaVerificationIssue[],
  bytes: ArtifactBytes,
  expected: { readonly byteLength: number; readonly sha256: string },
  hashMismatchKind: "baseline-hash-mismatch" | "candidate-hash-mismatch",
): void {
  if (bytes.tag === "invalid") {
    issues.push({ kind: bytes.kind, message: bytes.message });
    return;
  }
  if (
    bytes.bytes.byteLength !== expected.byteLength ||
    sha256(bytes.bytes) !== expected.sha256
  ) {
    issues.push({
      kind: hashMismatchKind,
      message:
        "Artifact bytes do not match the reviewed certificate length and SHA-256 evidence.",
    });
  }
}

function invalidCertificateResult(
  certificate: Exclude<
    ReturnType<typeof readCertificate>,
    { readonly tag: "ok" }
  >,
): SurfacePublicationDeltaVerificationResult {
  return {
    tag: "invalid",
    issues: [
      {
        kind: certificate.kind,
        message: `Surface publication delta certificate: ${certificate.message}`,
      },
    ],
  };
}

export function verifySurfacePublicationDeltaWithAuthority(
  options: SurfacePublicationDeltaCoreOptions,
): SurfacePublicationDeltaVerificationResult {
  const publicationDir =
    options.publicationDir ??
    join(options.repoRoot, "packages/surface/publication");
  const certificateAuthority = options.certificateAuthority;
  const certificate = readCertificate(
    certificateAuthority.path,
    certificateAuthority.sha256,
  );
  if (certificate.tag === "invalid")
    return invalidCertificateResult(certificate);

  const expected = certificate.value;
  const baselineAggregateBytes = readBaselineArtifact(
    options.repoRoot,
    expected.baselineCommit,
    SURFACE_AGGREGATE_PATH,
  );
  const candidateAggregateBytes = readBytes(
    join(publicationDir, basename(SURFACE_AGGREGATE_PATH)),
    "candidate-unreadable",
  );
  const baselineSchemaBytes = readBaselineArtifact(
    options.repoRoot,
    expected.baselineCommit,
    SURFACE_SCHEMA_PATH,
  );
  const candidateSchemaBytes = readBytes(
    join(publicationDir, basename(SURFACE_SCHEMA_PATH)),
    "candidate-unreadable",
  );
  const issues: PublicationDeltaVerificationIssue[] = [];
  verifyArtifactBytes(
    issues,
    baselineAggregateBytes,
    expected.artifacts.aggregate.baseline,
    "baseline-hash-mismatch",
  );
  verifyArtifactBytes(
    issues,
    candidateAggregateBytes,
    expected.artifacts.aggregate.candidate,
    "candidate-hash-mismatch",
  );
  verifyArtifactBytes(
    issues,
    baselineSchemaBytes,
    expected.artifacts.schema.baseline,
    "baseline-hash-mismatch",
  );
  verifyArtifactBytes(
    issues,
    candidateSchemaBytes,
    expected.artifacts.schema.candidate,
    "candidate-hash-mismatch",
  );

  const baselineAggregate = parseArtifact(baselineAggregateBytes);
  const candidateAggregate = parseArtifact(candidateAggregateBytes);
  const baselineSchema = parseArtifact(baselineSchemaBytes);
  const candidateSchema = parseArtifact(candidateSchemaBytes);
  compareAggregateSnapshots(
    issues,
    baselineAggregate,
    candidateAggregate,
    expected.artifacts.aggregate.evidence,
  );
  validateSchemaPair(
    issues,
    expected,
    baselineSchema,
    candidateSchema,
    baselineAggregate,
    candidateAggregate,
  );
  return issues.length === 0
    ? { tag: "verified", baselineCommit: expected.baselineCommit }
    : { tag: "invalid", issues };
}

export function describeSurfacePublicationDeltaIssue(
  issue: PublicationDeltaVerificationIssue,
): string {
  return `${issue.kind}: ${issue.message}`;
}
