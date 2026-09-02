import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import { Match, Result, Schema } from "effect";

import { PublishedSrdSurfaceSchema } from "./schema.ts";

const CERTIFICATE_FORMAT_VERSION = 5;
const EFFECT3_SURFACE_BASELINE_COMMIT =
  "76d9abaf0ec9c8369d5f95f603c5cce88704d26e";
const SURFACE_AGGREGATE_PATH = "packages/surface/publication/srd-surface.json";
const SURFACE_SCHEMA_PATH =
  "packages/surface/publication/srd-surface.schema.json";
const SCHEMA_COMPARISON_COMMIT = "63f6f3d93388d6c8bffd45f22f45ee3998a820b0";
const SCHEMA_COMPARISON_CERTIFICATE_PATH =
  "docs/migrations/effect-4/surface-publication-delta-certificate.json";
const SCHEMA_COMPARISON_CERTIFICATE_SHA256 =
  "b5462a6d718a36d95002a2900184b250cf661b3736d2dc2a5ac708347a55f162";

const AGGREGATE_RECORD_FAMILIES = ["units", "statBlocks"] as const;
type AggregateRecordFamily = (typeof AGGREGATE_RECORD_FAMILIES)[number];

const REVIEWED_CHANGED_RECORD_DELTA_CLASSES = [
  "authored-companion-lifecycle",
  "authored-cross-record-reference",
  "authored-execution-vocabulary",
  "authored-modal-ongoing-effect",
  "authored-persistent-rule-facts",
  "authored-stat-block-fidelity",
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
const SchemaNodeClassificationSchema = Schema.Struct({
  pointer: Schema.String.pipe(Schema.check(Schema.isPattern(/^\//u))),
  beforeNodeSha256: HashSchema,
  afterNodeSha256: HashSchema,
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
    graphDelta: Schema.Struct({
      comparisonCommit: Schema.Literal(SCHEMA_COMPARISON_COMMIT),
      comparisonCertificateSha256: Schema.Literal(
        SCHEMA_COMPARISON_CERTIFICATE_SHA256,
      ),
      comparisonSchema: ArtifactDigestSchema,
      classifiedChanges: Schema.Struct({
        gmSpeedChoiceMinimum: Schema.Array(SchemaNodeClassificationSchema),
        flyOnlyHover: Schema.Array(SchemaNodeClassificationSchema),
        unitIdItemId: Schema.Array(SchemaNodeClassificationSchema),
        unitIdLinkedSpellEnd: Schema.Array(SchemaNodeClassificationSchema),
        casterHealLinkRangeFeet: Schema.Array(SchemaNodeClassificationSchema),
        redundantSubsets: Schema.Array(SchemaNodeClassificationSchema),
      }),
      comparisonNormalizedRootSha256: HashSchema,
      candidateNormalizedRootSha256: HashSchema,
    }),
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
  | "schema-delta-authority-mismatch"
  | "schema-delta-evidence-mismatch"
  | "schema-delta-unclassified"
  | "schema-delta-graph-invalid"
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

type AggregateRecordProjectionResult =
  | { readonly tag: "ok"; readonly value: AggregateRecordProjection }
  | { readonly tag: "invalid"; readonly message: string };

type AggregateFamilyProjectionResult =
  | { readonly tag: "ok"; readonly ids: readonly string[] }
  | { readonly tag: "invalid"; readonly message: string };

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
        maxBuffer: 16 * 1024 * 1024,
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

type SchemaGraphDeltaEvidence =
  SurfacePublicationDeltaCertificate["artifacts"]["schema"]["evidence"]["graphDelta"];

function objectAt(value: JsonObject, key: string): JsonObject | undefined {
  return isJsonObject(value[key]) ? value[key] : undefined;
}

function stringAt(value: JsonObject, key: string): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function jsonObjectWithoutKeys(
  value: JsonObject,
  keys: readonly string[],
): JsonObject {
  const omitted = new Set(keys);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !omitted.has(key)),
  );
}

function validateSchemaComparisonAuthority(
  issues: PublicationDeltaVerificationIssue[],
  repoRoot: string,
  expected: SurfacePublicationDeltaCertificate,
  comparisonSchemaBytes: ArtifactBytes,
): void {
  const certificateBytes = readBaselineArtifact(
    repoRoot,
    SCHEMA_COMPARISON_COMMIT,
    SCHEMA_COMPARISON_CERTIFICATE_PATH,
  );
  if (certificateBytes.tag === "invalid") {
    issues.push({
      kind: "schema-delta-authority-mismatch",
      message: `The reviewed intermediate Surface certificate is unavailable: ${certificateBytes.message}`,
    });
    return;
  }
  if (sha256(certificateBytes.bytes) !== SCHEMA_COMPARISON_CERTIFICATE_SHA256) {
    issues.push({
      kind: "schema-delta-authority-mismatch",
      message:
        "The intermediate Surface certificate bytes do not match the reviewed immutable authority.",
    });
    return;
  }
  const parsed = parseJsonBytes(certificateBytes.bytes);
  if (parsed.tag === "invalid" || !isJsonObject(parsed.value)) {
    issues.push({
      kind: "schema-delta-authority-mismatch",
      message:
        "The reviewed intermediate Surface certificate is not valid JSON.",
    });
    return;
  }
  const artifacts = objectAt(parsed.value, "artifacts");
  const schema =
    artifacts === undefined ? undefined : objectAt(artifacts, "schema");
  const intermediateBaseline =
    schema === undefined ? undefined : objectAt(schema, "baseline");
  const intermediateCandidate =
    schema === undefined ? undefined : objectAt(schema, "candidate");
  const comparison = expected.artifacts.schema.evidence.graphDelta;
  const comparisonDigest =
    comparisonSchemaBytes.tag === "ok"
      ? {
          byteLength: comparisonSchemaBytes.bytes.length,
          sha256: sha256(comparisonSchemaBytes.bytes),
        }
      : undefined;
  const authorityMatches =
    parsed.value.baselineCommit === expected.baselineCommit &&
    stringAt(intermediateBaseline ?? {}, "sha256") ===
      expected.artifacts.schema.baseline.sha256 &&
    intermediateBaseline?.byteLength ===
      expected.artifacts.schema.baseline.byteLength &&
    stringAt(intermediateCandidate ?? {}, "sha256") ===
      comparison.comparisonSchema.sha256 &&
    intermediateCandidate?.byteLength ===
      comparison.comparisonSchema.byteLength &&
    comparisonDigest?.sha256 === comparison.comparisonSchema.sha256 &&
    comparisonDigest.byteLength === comparison.comparisonSchema.byteLength;
  if (!authorityMatches) {
    issues.push({
      kind: "schema-delta-authority-mismatch",
      message:
        "The intermediate certificate does not bind the Effect 3 baseline and comparison schema used by this certificate.",
    });
  }
}

type SchemaNodeClassification = {
  readonly pointer: string;
  readonly beforeNodeSha256: string;
  readonly afterNodeSha256: string;
};

type CandidateSchemaClassifications = {
  readonly gmSpeedChoiceMinimum: readonly SchemaNodeClassification[];
  readonly flyOnlyHover: readonly SchemaNodeClassification[];
  readonly unitIdItemId: readonly SchemaNodeClassification[];
  readonly unitIdLinkedSpellEnd: readonly SchemaNodeClassification[];
  readonly casterHealLinkRangeFeet: readonly SchemaNodeClassification[];
};

type ClassifiedSchemaTransform = {
  readonly value: JsonValue;
  readonly observed: CandidateSchemaClassifications;
  readonly unauthorized: readonly SchemaNodeClassification[];
};

function canonicalNodeSha256(value: JsonValue): string {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

function reachableSchemaNodes(schema: SchemaDocument): ReadonlySet<JsonValue> {
  const reachable = new Set<JsonValue>();
  const visit = (value: JsonValue): void => {
    if (reachable.has(value)) return;
    reachable.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isJsonObject(value)) return;
    if (typeof value.$ref === "string" && value.$ref.startsWith("#/$defs/")) {
      const target = schema.$defs[value.$ref.slice("#/$defs/".length)];
      if (target !== undefined) visit(target);
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "$defs") visit(child);
    }
  };
  visit(schema);
  return reachable;
}

function schemaClassificationMatches(
  expected: readonly SchemaNodeClassification[],
  observed: SchemaNodeClassification,
): boolean {
  return expected.some(
    (classification) =>
      classification.pointer === observed.pointer &&
      classification.beforeNodeSha256 === observed.beforeNodeSha256 &&
      classification.afterNodeSha256 === observed.afterNodeSha256,
  );
}

function resolvePureLocalReference(
  schema: SchemaDocument,
  value: JsonValue,
): JsonValue {
  let current = value;
  const visited = new Set<string>();
  while (isJsonObject(current) && Object.keys(current).length === 1) {
    if (Array.isArray(current.anyOf) && current.anyOf.length === 1) {
      current = current.anyOf[0]!;
      continue;
    }
    if (
      typeof current.$ref !== "string" ||
      !current.$ref.startsWith("#/$defs/")
    )
      return current;
    const name = current.$ref.slice("#/$defs/".length);
    if (visited.has(name)) return current;
    visited.add(name);
    const target = schema.$defs[name];
    if (target === undefined) return current;
    current = target;
  }
  return current;
}

function isSyntacticSchemaSubset(
  schema: SchemaDocument,
  leftRaw: JsonValue,
  rightRaw: JsonValue,
  memo = new Map<string, boolean | "active">(),
): boolean {
  const left = resolvePureLocalReference(schema, leftRaw);
  const right = resolvePureLocalReference(schema, rightRaw);
  if (canonicalJson(left) === canonicalJson(right)) return true;
  const pair = `${sha256(Buffer.from(canonicalJson(left), "utf8"))}:${sha256(Buffer.from(canonicalJson(right), "utf8"))}`;
  const cached = memo.get(pair);
  if (cached !== undefined) return cached === "active" ? true : cached;
  memo.set(pair, "active");
  const result = syntacticSchemaSubsetResult(schema, left, right, memo);
  memo.set(pair, result);
  return result;
}

function syntacticSchemaSubsetResult(
  schema: SchemaDocument,
  left: JsonValue,
  right: JsonValue,
  memo: Map<string, boolean | "active">,
): boolean {
  if (isJsonObject(right) && Array.isArray(right.anyOf)) {
    return right.anyOf.some((member) =>
      isSyntacticSchemaSubset(schema, left, member, memo),
    );
  }
  if (isJsonObject(left) && Array.isArray(left.anyOf)) {
    return left.anyOf.every((member) =>
      isSyntacticSchemaSubset(schema, member, right, memo),
    );
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((child, index) =>
        isSyntacticSchemaSubset(schema, child, right[index]!, memo),
      )
    );
  }
  if (!isJsonObject(left) || !isJsonObject(right)) return false;
  const leftKeys = Object.keys(left)
    .filter((key) => key !== "$defs")
    .sort(compareCodePointStrings);
  const rightKeys = Object.keys(right)
    .filter((key) => key !== "$defs")
    .sort(compareCodePointStrings);
  return (
    JSON.stringify(leftKeys) === JSON.stringify(rightKeys) &&
    leftKeys.every((key) =>
      isSyntacticSchemaSubset(schema, left[key]!, right[key]!, memo),
    )
  );
}

function isBarbarianClassFeatureSchema(
  schema: SchemaDocument,
  member: JsonValue,
): boolean {
  const resolved = resolvePureLocalReference(schema, member);
  if (!isJsonObject(resolved)) return false;
  const properties = objectAt(resolved, "properties");
  const resolveProperty = (key: string): JsonObject | undefined => {
    const raw = properties?.[key];
    if (raw === undefined) return undefined;
    const value = resolvePureLocalReference(schema, raw);
    return isJsonObject(value) ? value : undefined;
  };
  const kind = resolveProperty("kind");
  const className = resolveProperty("className");
  return (
    kind?.type === "string" &&
    Array.isArray(kind.enum) &&
    kind.enum[0] === "class_feature" &&
    className?.type === "string" &&
    Array.isArray(className.enum) &&
    className.enum[0] === "barbarian"
  );
}

function classifyComparisonSchema(
  schema: SchemaDocument,
  expected: readonly SchemaNodeClassification[],
): {
  readonly value: JsonValue;
  readonly observed: readonly SchemaNodeClassification[];
  readonly unauthorized: readonly SchemaNodeClassification[];
} {
  const reachable = reachableSchemaNodes(schema);
  const observed: SchemaNodeClassification[] = [];
  const unauthorized: SchemaNodeClassification[] = [];
  const transform = (value: JsonValue, pointer: string): JsonValue => {
    if (Array.isArray(value))
      return value.map((child, index) =>
        transform(child, jsonPointerChild(pointer, index)),
      );
    if (!isJsonObject(value)) return value;
    const transformed = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        transform(child, jsonPointerChild(pointer, key)),
      ]),
    );
    const anyOf = transformed.anyOf;
    if (Array.isArray(anyOf) && reachable.has(value)) {
      const retained = anyOf.filter((member, index) => {
        const redundant =
          isBarbarianClassFeatureSchema(schema, member) &&
          anyOf.some(
            (other, otherIndex) =>
              otherIndex !== index &&
              isBarbarianClassFeatureSchema(schema, other) &&
              isSyntacticSchemaSubset(schema, member, other),
          );
        return !redundant;
      });
      if (retained.length !== anyOf.length) {
        const proposed = { ...transformed, anyOf: retained };
        const classification = {
          pointer,
          beforeNodeSha256: canonicalNodeSha256(value),
          afterNodeSha256: canonicalNodeSha256(proposed),
        } satisfies SchemaNodeClassification;
        observed.push(classification);
        if (schemaClassificationMatches(expected, classification)) {
          return proposed;
        }
        unauthorized.push(classification);
      }
    }
    return transformed;
  };
  return { value: transform(schema, ""), observed, unauthorized };
}

function schemaObjectSignature(
  schema: SchemaDocument,
  value: JsonObject,
  visit: (raw: JsonValue) => string,
  redundantSubsetCount?: { value: number },
): string {
  const entries = Object.entries(value)
    .filter(([key]) => key !== "$defs")
    .sort(([left], [right]) => compareCodePointStrings(left, right))
    .map(([key, child]) => {
      if (key === "anyOf" && Array.isArray(child)) {
        const members: JsonValue[] = [];
        const append = (member: JsonValue): void => {
          const resolved = resolvePureLocalReference(schema, member);
          if (
            isJsonObject(resolved) &&
            Object.keys(resolved).length === 1 &&
            Array.isArray(resolved.anyOf)
          ) {
            resolved.anyOf.forEach(append);
          } else members.push(member);
        };
        child.forEach(append);
        const barbarianMembers = members
          .map((member, index) => ({ member, index }))
          .filter(({ member }) =>
            isBarbarianClassFeatureSchema(schema, member),
          );
        const nonRedundant = members.filter((member, index) => {
          const redundant =
            isBarbarianClassFeatureSchema(schema, member) &&
            barbarianMembers.some(
              ({ member: other, index: otherIndex }) =>
                otherIndex !== index &&
                isSyntacticSchemaSubset(schema, member, other),
            );
          if (redundant)
            redundantSubsetCount && (redundantSubsetCount.value += 1);
          return !redundant;
        });
        return `${key}:[${[...new Set(nonRedundant.map(visit))].sort(compareCodePointStrings).join(",")}]`;
      }
      if (
        (key === "required" || key === "enum" || key === "type") &&
        Array.isArray(child)
      ) {
        return `${key}:[${[...new Set(child.map(visit))].sort(compareCodePointStrings).join(",")}]`;
      }
      return `${key}:${visit(child)}`;
    });
  return `object:{${entries.join(",")}}`;
}

function schemaNodeHash(
  schema: SchemaDocument,
  value: JsonValue,
  redundantSubsetCount?: { value: number },
): string {
  const memo = new Map<JsonValue, string>();
  const active = new Set<JsonValue>();
  const visit = (raw: JsonValue): string => {
    const value = resolvePureLocalReference(schema, raw);
    const cached = memo.get(value);
    if (cached !== undefined) return cached;
    if (active.has(value))
      return sha256(Buffer.from("recursive-schema-node", "utf8"));
    active.add(value);
    const signature = Array.isArray(value)
      ? `array:${value.map(visit).join(",")}`
      : !isJsonObject(value)
        ? `scalar:${JSON.stringify(value)}`
        : schemaObjectSignature(schema, value, visit, redundantSubsetCount);
    active.delete(value);
    const hash = sha256(Buffer.from(signature, "utf8"));
    memo.set(value, hash);
    return hash;
  };
  return visit(value);
}

function classifyCandidateSchema(
  schema: SchemaDocument,
  expected: CandidateSchemaClassifications,
): ClassifiedSchemaTransform {
  const reachable = reachableSchemaNodes(schema);
  const observed: {
    gmSpeedChoiceMinimum: SchemaNodeClassification[];
    flyOnlyHover: SchemaNodeClassification[];
    unitIdItemId: SchemaNodeClassification[];
    unitIdLinkedSpellEnd: SchemaNodeClassification[];
    casterHealLinkRangeFeet: SchemaNodeClassification[];
  } = {
    gmSpeedChoiceMinimum: [],
    flyOnlyHover: [],
    unitIdItemId: [],
    unitIdLinkedSpellEnd: [],
    casterHealLinkRangeFeet: [],
  };
  const unauthorized: SchemaNodeClassification[] = [];
  const authorize = (
    kind: keyof CandidateSchemaClassifications,
    pointer: string,
    before: JsonValue,
    after: JsonValue,
  ): boolean => {
    const classification = {
      pointer,
      beforeNodeSha256: canonicalNodeSha256(before),
      afterNodeSha256: canonicalNodeSha256(after),
    } satisfies SchemaNodeClassification;
    observed[kind].push(classification);
    if (schemaClassificationMatches(expected[kind], classification)) {
      return true;
    }
    unauthorized.push(classification);
    return false;
  };
  type CandidateSchemaClassifier = (
    value: JsonObject,
    pointer: string,
    transformed: JsonObject,
  ) => JsonObject;
  const classifyCasterHealLinkRangeFeet: CandidateSchemaClassifier = (
    value,
    pointer,
    transformed,
  ) => {
    const properties = objectAt(transformed, "properties");
    const kind =
      properties === undefined ? undefined : objectAt(properties, "kind");
    const rangeFeet = properties?.rangeFeet;
    if (
      !reachable.has(value) ||
      kind?.type !== "string" ||
      !Array.isArray(kind.enum) ||
      kind.enum.length !== 1 ||
      kind.enum[0] !== "caster_heal_link" ||
      rangeFeet === undefined ||
      !isJsonObject(rangeFeet) ||
      rangeFeet.type !== "integer" ||
      rangeFeet.minimum !== 1 ||
      Object.keys(rangeFeet).length !== 2
    ) {
      return transformed;
    }
    const reviewedAfter = {
      anyOf: [
        { type: "number" },
        { type: "string", enum: ["Infinity", "-Infinity", "NaN"] },
      ],
    } satisfies JsonObject;
    const rangeFeetPointer = jsonPointerChild(
      jsonPointerChild(pointer, "properties"),
      "rangeFeet",
    );
    return authorize(
      "casterHealLinkRangeFeet",
      rangeFeetPointer,
      rangeFeet,
      reviewedAfter,
    )
      ? {
          ...transformed,
          properties: { ...properties, rangeFeet: reviewedAfter },
        }
      : transformed;
  };
  const classifyGmSpeedChoiceMinimum: CandidateSchemaClassifier = (
    value,
    pointer,
    transformed,
  ) => {
    if (
      !pointer.endsWith("/alternatives") ||
      !reachable.has(value) ||
      transformed.minItems !== 2 ||
      !Array.isArray(transformed.prefixItems) ||
      transformed.prefixItems.length !== 2 ||
      transformed.items === undefined ||
      !transformed.prefixItems.every(
        (item) =>
          schemaNodeHash(schema, item) ===
          schemaNodeHash(schema, transformed.items!),
      )
    ) {
      return transformed;
    }
    const proposed = jsonObjectWithoutKeys(transformed, [
      "minItems",
      "prefixItems",
    ]);
    const reviewedAfter = jsonObjectWithoutKeys(value, [
      "minItems",
      "prefixItems",
    ]);
    return authorize("gmSpeedChoiceMinimum", pointer, value, reviewedAfter)
      ? proposed
      : transformed;
  };
  const classifyUnitIdItemId: CandidateSchemaClassifier = (
    value,
    pointer,
    transformed,
  ) => {
    if (
      !pointer.endsWith("/itemId") ||
      !reachable.has(value) ||
      transformed.type !== "string" ||
      transformed.minLength !== 1 ||
      typeof transformed.pattern !== "string"
    ) {
      return transformed;
    }
    const proposed = jsonObjectWithoutKeys(transformed, [
      "minLength",
      "pattern",
    ]);
    return authorize("unitIdItemId", pointer, value, proposed)
      ? proposed
      : transformed;
  };
  const classifyUnitIdLinkedSpellEnd: CandidateSchemaClassifier = (
    value,
    pointer,
    transformed,
  ) => {
    if (
      !pointer.endsWith("/endsWhenGrantedSpellEnds") ||
      !reachable.has(value) ||
      transformed.type !== "string" ||
      transformed.minLength !== 1 ||
      typeof transformed.pattern !== "string"
    ) {
      return transformed;
    }
    const proposed = jsonObjectWithoutKeys(transformed, [
      "minLength",
      "pattern",
    ]);
    return authorize("unitIdLinkedSpellEnd", pointer, value, proposed)
      ? proposed
      : transformed;
  };
  const classifyFlyOnlyHover: CandidateSchemaClassifier = (
    value,
    pointer,
    transformed,
  ) => {
    if (
      !reachable.has(value) ||
      !Array.isArray(transformed.anyOf) ||
      transformed.anyOf.length !== 2
    ) {
      return transformed;
    }
    const branches = transformed.anyOf.map((branch) =>
      resolvePureLocalReference(schema, branch),
    );
    if (!branches.every(isJsonObject)) return transformed;
    const [left, right] = branches;
    const leftProperties = objectAt(left!, "properties");
    const rightProperties = objectAt(right!, "properties");
    if (leftProperties === undefined || rightProperties === undefined) {
      return transformed;
    }
    const candidate = [
      [left!, right!, leftProperties, rightProperties],
      [right!, left!, rightProperties, leftProperties],
    ].find(([, , nonFly, fly]) => {
      const nonFlyKind = objectAt(nonFly, "kind");
      const flyKind = objectAt(fly, "kind");
      const nonFlyHover = nonFly.hover;
      const flyHover = objectAt(fly, "hover");
      const nonFlyKinds = nonFlyKind?.anyOf;
      if (
        !Array.isArray(nonFlyKinds) ||
        flyKind?.type !== "string" ||
        !Array.isArray(flyKind.enum) ||
        flyKind.enum.length !== 1 ||
        flyKind.enum[0] !== "fly" ||
        !isJsonObject(nonFlyHover) ||
        typeof nonFlyHover.$ref !== "string" ||
        !nonFlyHover.$ref.endsWith("/ForbiddenValue") ||
        flyHover?.type !== "boolean" ||
        !Array.isArray(flyHover.enum) ||
        flyHover.enum[0] !== true
      ) {
        return false;
      }
      const sharedKeys = Object.keys(nonFly).filter(
        (key) => key !== "kind" && key !== "hover",
      );
      return (
        sharedKeys.length ===
          Object.keys(fly).filter((key) => key !== "kind" && key !== "hover")
            .length &&
        sharedKeys.every(
          (key) =>
            schemaNodeHash(schema, nonFly[key]!) ===
            schemaNodeHash(schema, fly[key]!),
        )
      );
    });
    if (candidate === undefined) return transformed;
    const [nonFlyBranch, flyBranch, nonFly, fly] = candidate;
    const nonFlyKinds = objectAt(nonFly, "kind")?.anyOf;
    const flyKind = objectAt(fly, "kind");
    if (!Array.isArray(nonFlyKinds) || flyKind === undefined) {
      return transformed;
    }
    const widenedKind = { anyOf: [...nonFlyKinds, flyKind] };
    const proposed = {
      ...transformed,
      anyOf: [
        {
          ...nonFlyBranch,
          properties: { ...nonFly, kind: widenedKind },
        },
        {
          ...flyBranch,
          properties: { ...fly, kind: widenedKind },
        },
      ],
    };
    return authorize("flyOnlyHover", pointer, value, proposed)
      ? proposed
      : transformed;
  };
  const classifiers = [
    classifyCasterHealLinkRangeFeet,
    classifyGmSpeedChoiceMinimum,
    classifyUnitIdItemId,
    classifyUnitIdLinkedSpellEnd,
    classifyFlyOnlyHover,
  ] as const;
  const transform = (value: JsonValue, pointer: string): JsonValue => {
    if (Array.isArray(value))
      return value.map((child, index) =>
        transform(child, jsonPointerChild(pointer, index)),
      );
    if (!isJsonObject(value)) return value;
    const recursivelyTransformed = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        transform(child, jsonPointerChild(pointer, key)),
      ]),
    );
    return classifiers.reduce(
      (transformed, classify) => classify(value, pointer, transformed),
      recursivelyTransformed,
    );
  };
  return {
    value: transform(schema, ""),
    observed,
    unauthorized,
  };
}

function schemaGraphNodeIndexes(
  indexes: Map<SchemaDocument, Map<JsonValue, number>>,
  schema: SchemaDocument,
): Map<JsonValue, number> {
  const existing = indexes.get(schema);
  if (existing !== undefined) return existing;
  const created = new Map<JsonValue, number>();
  indexes.set(schema, created);
  return created;
}

function schemaGraphPairObservation(
  leftSchema: SchemaDocument,
  rightSchema: SchemaDocument,
):
  | {
      readonly tag: "ok";
      readonly leftRoot: string;
      readonly rightRoot: string;
      readonly changedPublicationFamilies: readonly string[];
      readonly firstDifference: string;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  type GraphNode = {
    readonly schema: SchemaDocument;
    readonly value: JsonValue;
  };
  const nodes: GraphNode[] = [];
  const indexes = new Map<SchemaDocument, Map<JsonValue, number>>();
  const add = (schema: SchemaDocument, raw: JsonValue): number => {
    const value = resolvePureLocalReference(schema, raw);
    const schemaIndexes = schemaGraphNodeIndexes(indexes, schema);
    const existing = schemaIndexes.get(value);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    schemaIndexes.set(value, index);
    nodes.push({ schema, value });
    if (Array.isArray(value)) value.forEach((child) => add(schema, child));
    else if (isJsonObject(value)) {
      Object.entries(value).forEach(([key, child]) => {
        if (key !== "$defs") add(schema, child);
      });
    }
    return index;
  };
  const leftIndex = add(leftSchema, leftSchema);
  const rightIndex = add(rightSchema, rightSchema);
  const childColor = (
    schema: SchemaDocument,
    value: JsonValue,
    colors: readonly number[],
  ): number =>
    colors[
      indexes.get(schema)!.get(resolvePureLocalReference(schema, value))!
    ]!;
  let colors: number[] = nodes.map(({ value }) =>
    value === null
      ? 0
      : Array.isArray(value)
        ? 1
        : typeof value === "object"
          ? 2
          : typeof value === "string"
            ? 3
            : typeof value === "number"
              ? 4
              : 5,
  );
  for (let iteration = 0; iteration <= nodes.length; iteration += 1) {
    const signatures = nodes.map(({ schema, value }) => {
      if (Array.isArray(value))
        return `array:${value.map((child) => childColor(schema, child, colors)).join(",")}`;
      if (!isJsonObject(value)) return `scalar:${JSON.stringify(value)}`;
      const entries = Object.entries(value)
        .filter(([key]) => key !== "$defs")
        .sort(([left], [right]) => compareCodePointStrings(left, right))
        .map(([key, child]) => {
          if (key === "anyOf" && Array.isArray(child)) {
            const members: JsonValue[] = [];
            const append = (member: JsonValue): void => {
              const resolved = resolvePureLocalReference(schema, member);
              if (
                isJsonObject(resolved) &&
                Object.keys(resolved).length === 1 &&
                Array.isArray(resolved.anyOf)
              )
                resolved.anyOf.forEach(append);
              else members.push(member);
            };
            child.forEach(append);
            return `${key}:[${[...new Set(members.map((member) => childColor(schema, member, colors)))].sort((a, b) => a - b).join(",")}]`;
          }
          if (
            (key === "required" || key === "enum" || key === "type") &&
            Array.isArray(child)
          ) {
            return `${key}:[${[...new Set(child.map((member) => childColor(schema, member, colors)))].sort((a, b) => a - b).join(",")}]`;
          }
          return `${key}:${childColor(schema, child, colors)}`;
        });
      return `object:{${entries.join(",")}}`;
    });
    const ordered = [...new Set(signatures)].sort(compareCodePointStrings);
    const colorBySignature = new Map(
      ordered.map((signature, index) => [signature, index]),
    );
    const next = signatures.map(
      (signature) => colorBySignature.get(signature)!,
    );
    if (next.every((color, index) => color === colors[index])) {
      const digestFor = (index: number): string =>
        sha256(
          Buffer.from(
            `root-color:${next[index]};classes:${ordered.join("\n")}`,
            "utf8",
          ),
        );
      const leftProperties = objectAt(leftSchema, "properties");
      const rightProperties = objectAt(rightSchema, "properties");
      const changedPublicationFamilies =
        leftProperties === undefined || rightProperties === undefined
          ? ["properties"]
          : [
              ...new Set([
                ...Object.keys(leftProperties),
                ...Object.keys(rightProperties),
              ]),
            ].filter((key) => {
              const left = leftProperties[key];
              const right = rightProperties[key];
              return (
                left === undefined ||
                right === undefined ||
                childColor(leftSchema, left, next) !==
                  childColor(rightSchema, right, next)
              );
            });
      const traceDifference = (
        leftRaw: JsonValue,
        rightRaw: JsonValue,
        path: string,
        seen: Set<string>,
      ): string => {
        const leftValue = resolvePureLocalReference(leftSchema, leftRaw);
        const rightValue = resolvePureLocalReference(rightSchema, rightRaw);
        const leftColor = childColor(leftSchema, leftValue, next);
        const rightColor = childColor(rightSchema, rightValue, next);
        if (leftColor === rightColor) return path;
        const pair = `${leftColor}:${rightColor}`;
        if (seen.has(pair)) return `${path} (recursive class mismatch)`;
        seen.add(pair);
        if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
          const index = leftValue.findIndex(
            (child, childIndex) =>
              rightValue[childIndex] === undefined ||
              childColor(leftSchema, child, next) !==
                childColor(rightSchema, rightValue[childIndex]!, next),
          );
          return index < 0
            ? `${path} (array shape)`
            : traceDifference(
                leftValue[index]!,
                rightValue[index]!,
                `${path}/${index}`,
                seen,
              );
        }
        if (isJsonObject(leftValue) && isJsonObject(rightValue)) {
          const keys = [
            ...new Set([...Object.keys(leftValue), ...Object.keys(rightValue)]),
          ].filter((key) => key !== "$defs");
          const key = keys.find((candidate) => {
            const left = leftValue[candidate];
            const right = rightValue[candidate];
            return (
              left === undefined ||
              right === undefined ||
              childColor(leftSchema, left, next) !==
                childColor(rightSchema, right, next)
            );
          });
          if (
            key !== undefined &&
            leftValue[key] !== undefined &&
            rightValue[key] !== undefined
          )
            return traceDifference(
              leftValue[key]!,
              rightValue[key]!,
              `${path}/${key}`,
              seen,
            );
          return `${path} (object keys ${key ?? "unknown"})`;
        }
        return `${path} (${JSON.stringify(leftValue)} -> ${JSON.stringify(rightValue)})`;
      };
      const firstFamily = changedPublicationFamilies[0];
      const firstDifference =
        firstFamily !== undefined &&
        leftProperties?.[firstFamily] !== undefined &&
        rightProperties?.[firstFamily] !== undefined
          ? traceDifference(
              leftProperties[firstFamily]!,
              rightProperties[firstFamily]!,
              `/properties/${firstFamily}`,
              new Set(),
            )
          : "/";
      return {
        tag: "ok",
        leftRoot: digestFor(leftIndex),
        rightRoot: digestFor(rightIndex),
        changedPublicationFamilies,
        firstDifference,
      };
    }
    colors = next;
  }
  return {
    tag: "invalid",
    message: `Schema graph partition did not stabilize for ${nodes.length} reachable nodes.`,
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
): AggregateRecordProjectionResult {
  if (!isJsonObject(value)) {
    return { tag: "invalid", message: "aggregate root must be an object" };
  }
  const records = new Map<string, AggregateRecord>();
  const orderedIds = new Map<AggregateRecordFamily, readonly string[]>();
  for (const family of AGGREGATE_RECORD_FAMILIES) {
    const projection = projectAggregateFamilyRecords(
      family,
      value[family],
      records,
    );
    if (projection.tag === "invalid") return projection;
    orderedIds.set(family, projection.ids);
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

function projectAggregateFamilyRecords(
  family: AggregateRecordFamily,
  value: JsonValue | undefined,
  records: Map<string, AggregateRecord>,
): AggregateFamilyProjectionResult {
  if (!Array.isArray(value)) {
    return { tag: "invalid", message: `aggregate ${family} must be an array` };
  }
  const ids: string[] = [];
  for (const recordValue of value) {
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
    records.set(key, aggregateRecord(family, recordValue.id, recordValue));
  }
  return { tag: "ok", ids };
}

function aggregateRecord(
  family: AggregateRecordFamily,
  id: string,
  value: JsonObject,
): AggregateRecord {
  return {
    family,
    id,
    value,
    canonicalJsonSha256: sha256(Buffer.from(canonicalJson(value), "utf8")),
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
  const expectedByKey = reviewedRecordDeltasByKey(issues, expected);
  const observedByKey = observedRecordDeltasByKey(baseline, candidate);

  for (const [key, observed] of observedByKey) {
    const reviewed = expectedByKey.get(key);
    if (reviewed === undefined) {
      issues.push({
        kind: "aggregate-delta-unclassified",
        message: `Aggregate record ${key} has an unclassified ${observed.kind} delta.`,
      });
      continue;
    }
    if (!reviewedRecordDeltaMatches(reviewed, observed)) {
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

type ReviewedRecordDelta =
  SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"]["reviewedRecordDeltas"][number];

function reviewedRecordDeltasByKey(
  issues: PublicationDeltaVerificationIssue[],
  expected: readonly ReviewedRecordDelta[],
): Map<string, ReviewedRecordDelta> {
  const expectedByKey = new Map<string, ReviewedRecordDelta>();
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
  return expectedByKey;
}

function observedRecordDeltasByKey(
  baseline: AggregateRecordProjection,
  candidate: AggregateRecordProjection,
): Map<string, ObservedRecordDelta> {
  const observedByKey = new Map<string, ObservedRecordDelta>();
  const recordKeys = new Set([
    ...baseline.records.keys(),
    ...candidate.records.keys(),
  ]);
  for (const key of recordKeys) {
    const observed = observedRecordDelta(
      baseline.records.get(key),
      candidate.records.get(key),
    );
    if (observed !== undefined) observedByKey.set(key, observed);
  }
  return observedByKey;
}

function observedRecordDelta(
  baseline: AggregateRecord | undefined,
  candidate: AggregateRecord | undefined,
): ObservedRecordDelta | undefined {
  if (baseline === undefined) {
    return candidate === undefined
      ? undefined
      : {
          kind: "added",
          family: candidate.family,
          id: candidate.id,
          candidateCanonicalJsonSha256: candidate.canonicalJsonSha256,
        };
  }
  if (candidate === undefined) {
    return {
      kind: "removed",
      family: baseline.family,
      id: baseline.id,
      baselineCanonicalJsonSha256: baseline.canonicalJsonSha256,
    };
  }
  return baseline.canonicalJsonSha256 === candidate.canonicalJsonSha256
    ? undefined
    : {
        kind: "changed",
        family: baseline.family,
        id: baseline.id,
        baselineCanonicalJsonSha256: baseline.canonicalJsonSha256,
        candidateCanonicalJsonSha256: candidate.canonicalJsonSha256,
      };
}

function reviewedRecordDeltaMatches(
  reviewed: ReviewedRecordDelta,
  observed: ObservedRecordDelta,
): boolean {
  return Match.value(reviewed).pipe(
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
  const expectedByKey = reviewedOrderDeltasByKey(issues, expected);
  const observedByKey = observedOrderDeltasByKey(baseline, candidate);

  for (const [key, observed] of observedByKey) {
    const reviewed = expectedByKey.get(key);
    if (reviewed === undefined) {
      issues.push({
        kind: "aggregate-order-delta-unclassified",
        message: `Aggregate object ${key} has an unclassified key-order delta.`,
      });
      continue;
    }
    if (!reviewedOrderDeltaMatches(reviewed, observed)) {
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

type ReviewedOrderDelta =
  SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"]["reviewedOrderDeltas"][number];

function reviewedOrderDeltasByKey(
  issues: PublicationDeltaVerificationIssue[],
  expected: readonly ReviewedOrderDelta[],
): Map<string, ReviewedOrderDelta> {
  const expectedByKey = new Map<string, ReviewedOrderDelta>();
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
  return expectedByKey;
}

function observedOrderDeltasByKey(
  baseline: AggregateRecordProjection,
  candidate: AggregateRecordProjection,
): Map<string, ObservedOrderDelta> {
  const observedByKey = new Map<string, ObservedOrderDelta>();
  for (const [recordKey, baselineRecord] of baseline.records) {
    const candidateRecord = candidate.records.get(recordKey);
    if (!recordsHaveOnlyOrderDelta(baselineRecord, candidateRecord)) continue;
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
  return observedByKey;
}

function recordsHaveOnlyOrderDelta(
  baseline: AggregateRecord,
  candidate: AggregateRecord | undefined,
): candidate is AggregateRecord {
  return (
    candidate !== undefined &&
    baseline.canonicalJsonSha256 === candidate.canonicalJsonSha256
  );
}

function reviewedOrderDeltaMatches(
  reviewed: ReviewedOrderDelta,
  observed: ObservedOrderDelta,
): boolean {
  return (
    JSON.stringify(reviewed.baselineKeyOrder) ===
      JSON.stringify(observed.baselineKeyOrder) &&
    JSON.stringify(reviewed.candidateKeyOrder) ===
      JSON.stringify(observed.candidateKeyOrder) &&
    reviewed.canonicalValueSha256 === observed.canonicalValueSha256
  );
}

function compareAggregateSnapshots(
  issues: PublicationDeltaVerificationIssue[],
  baseline: ParsedArtifact,
  candidate: ParsedArtifact,
  expected: SurfacePublicationDeltaCertificate["artifacts"]["aggregate"]["evidence"],
): void {
  const artifacts = validAggregateArtifacts(issues, baseline, candidate);
  if (artifacts === undefined) return;
  appendCandidateAggregateDecodeIssue(
    issues,
    candidateAggregateDecode(artifacts.candidate.value),
  );
  const projections = aggregateSnapshotProjections(
    issues,
    artifacts.baseline.value,
    artifacts.candidate.value,
  );
  if (projections === undefined) return;
  const baselineEvidence = aggregateEvidence(
    artifacts.baseline.value,
    projections.baseline,
  );
  const candidateEvidence = aggregateEvidence(
    artifacts.candidate.value,
    projections.candidate,
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
    projections.baseline,
    projections.candidate,
    expected.reviewedRecordDeltas,
  );
  compareReviewedOrderDeltas(
    issues,
    projections.baseline,
    projections.candidate,
    expected.reviewedOrderDeltas,
  );
}

type ValidParsedArtifact = Extract<ParsedArtifact, { readonly tag: "ok" }>;

function validAggregateArtifacts(
  issues: PublicationDeltaVerificationIssue[],
  baseline: ParsedArtifact,
  candidate: ParsedArtifact,
):
  | {
      readonly baseline: ValidParsedArtifact;
      readonly candidate: ValidParsedArtifact;
    }
  | undefined {
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
  return baseline.tag === "ok" && candidate.tag === "ok"
    ? { baseline, candidate }
    : undefined;
}

function aggregateSnapshotProjections(
  issues: PublicationDeltaVerificationIssue[],
  baseline: JsonValue,
  candidate: JsonValue,
):
  | {
      readonly baseline: AggregateRecordProjection;
      readonly candidate: AggregateRecordProjection;
    }
  | undefined {
  const baselineProjection = projectAggregateRecords(baseline);
  const candidateProjection = projectAggregateRecords(candidate);
  appendInvalidAggregateProjectionIssue(issues, baselineProjection);
  appendInvalidAggregateProjectionIssue(issues, candidateProjection);
  return baselineProjection.tag === "ok" && candidateProjection.tag === "ok"
    ? {
        baseline: baselineProjection.value,
        candidate: candidateProjection.value,
      }
    : undefined;
}

function appendInvalidAggregateProjectionIssue(
  issues: PublicationDeltaVerificationIssue[],
  projection: AggregateRecordProjectionResult,
): void {
  if (projection.tag === "ok") return;
  issues.push({ kind: "aggregate-invalid", message: projection.message });
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

function compareSchemaGraphDelta(
  issues: PublicationDeltaVerificationIssue[],
  comparisonSchema: ParsedArtifact,
  candidateSchema: SchemaDocument,
  expected: SchemaGraphDeltaEvidence,
): void {
  const comparison = parseSchemaArtifact(issues, "baseline", comparisonSchema);
  if (comparison === undefined) return;
  try {
    const classifiedCandidate = classifyCandidateSchema(candidateSchema, {
      gmSpeedChoiceMinimum: expected.classifiedChanges.gmSpeedChoiceMinimum,
      flyOnlyHover: expected.classifiedChanges.flyOnlyHover,
      unitIdItemId: expected.classifiedChanges.unitIdItemId,
      unitIdLinkedSpellEnd: expected.classifiedChanges.unitIdLinkedSpellEnd,
      casterHealLinkRangeFeet:
        expected.classifiedChanges.casterHealLinkRangeFeet,
    });
    const classifiedComparison = classifyComparisonSchema(
      comparison,
      expected.classifiedChanges.redundantSubsets,
    );
    const observed = {
      ...classifiedCandidate.observed,
      redundantSubsets: classifiedComparison.observed,
    };
    if (
      JSON.stringify(observed) !== JSON.stringify(expected.classifiedChanges)
    ) {
      issues.push({
        kind: "schema-delta-evidence-mismatch",
        message: `Observed reachable schema classifications ${JSON.stringify(observed)} do not match the reviewed pointer and node-hash evidence ${JSON.stringify(expected.classifiedChanges)}.`,
      });
    }
    if (
      classifiedCandidate.unauthorized.length > 0 ||
      classifiedComparison.unauthorized.length > 0
    ) {
      issues.push({
        kind: "schema-delta-unclassified",
        message: `Reachable schema changes matched a classification shape but not an exact certified pointer and before/after node hash: ${JSON.stringify(
          [
            ...classifiedCandidate.unauthorized,
            ...classifiedComparison.unauthorized,
          ],
        )}.`,
      });
    }
    const transformedDocument = schemaDocument(classifiedCandidate.value);
    const transformedComparison = schemaDocument(classifiedComparison.value);
    if (
      transformedDocument.tag === "invalid" ||
      transformedComparison.tag === "invalid"
    ) {
      issues.push({
        kind: "schema-delta-graph-invalid",
        message:
          transformedDocument.tag === "invalid"
            ? transformedDocument.message
            : transformedComparison.tag === "invalid"
              ? transformedComparison.message
              : "Schema graph transformation failed.",
      });
      return;
    }
    const roots = schemaGraphPairObservation(
      transformedComparison.value,
      transformedDocument.value,
    );
    if (roots.tag === "invalid") {
      issues.push({
        kind: "schema-delta-graph-invalid",
        message: roots.message,
      });
      return;
    }
    const comparisonRoot = roots.leftRoot;
    const candidateRoot = roots.rightRoot;
    if (
      comparisonRoot !== expected.comparisonNormalizedRootSha256 ||
      candidateRoot !== expected.candidateNormalizedRootSha256
    ) {
      issues.push({
        kind: "schema-delta-evidence-mismatch",
        message: `Normalized schema roots (${comparisonRoot}, ${candidateRoot}) do not match the reviewed finite graph evidence.`,
      });
    }
    if (comparisonRoot !== candidateRoot) {
      issues.push({
        kind: "schema-delta-unclassified",
        message: `The schema graph still differs after the finite reviewed transformations; changed publication families: ${roots.changedPublicationFamilies.join(", ")}; first differing region: ${roots.firstDifference}.`,
      });
    }
  } catch (error) {
    issues.push({
      kind: "schema-delta-graph-invalid",
      message: `Schema graph analysis could not classify the candidate: ${errorMessage(error)}`,
    });
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
  comparisonSchema: ParsedArtifact,
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
  compareSchemaGraphDelta(
    issues,
    comparisonSchema,
    schemas.candidate,
    expected.graphDelta,
  );
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
  const comparisonSchemaBytes = readBaselineArtifact(
    options.repoRoot,
    SCHEMA_COMPARISON_COMMIT,
    SURFACE_SCHEMA_PATH,
  );
  const issues: PublicationDeltaVerificationIssue[] = [];
  validateSchemaComparisonAuthority(
    issues,
    options.repoRoot,
    expected,
    comparisonSchemaBytes,
  );
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
  const comparisonSchema = parseArtifact(comparisonSchemaBytes);
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
    comparisonSchema,
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
