import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import { Result, Schema } from "effect";

import {
  PublishedSrdSurfaceSchema,
  type PublishedSrdSurface,
} from "./schema.ts";

export const SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/surface-publication-delta-certificate.json";

const SURFACE_PUBLICATION_ROOT = "packages/surface/publication";
const BASELINE_COMMIT = "76d9abaf0ec9c8369d5f95f603c5cce88704d26e";
const AGGREGATE_PATH = `${SURFACE_PUBLICATION_ROOT}/srd-surface.json`;
const SCHEMA_PATH = `${SURFACE_PUBLICATION_ROOT}/srd-surface.schema.json`;
const PUBLICATION_PATHS = [AGGREGATE_PATH, SCHEMA_PATH] as const;

const EXPECTED_CERTIFICATE = {
  formatVersion: 1,
  issue: {
    number: 373,
    kind: "effect-4-surface-publication-delta",
    statement:
      "Certify the Effect 4 Surface publication delta against the immutable Effect 3 baseline.",
  },
  baseline: {
    commit: BASELINE_COMMIT,
    readAuthority: "git-show-commit-path",
    paths: PUBLICATION_PATHS,
  },
  artifacts: {
    aggregate: {
      path: AGGREGATE_PATH,
      semanticClass: "byte-order-only",
      cause:
        "Effect 4 publication encoding changed the key order of the anchored-trigger mechanics object for one record while retaining the same values.",
      issue:
        "The aggregate bytes changed, but recursively key-sorted content and the ordered record identity projection remain equal.",
      baseline: {
        byteLength: 943445,
        sha256:
          "4c94c310b97069b3e2665f25986ffc87377053e341c30f3df3cf7a81465a1474",
      },
      candidate: {
        byteLength: 943445,
        sha256:
          "e3b743d94a01f0fed0db4f895a53bb873ed864eef47db5ebb130f681a409e105",
      },
      evidence: {
        baselineCanonicalJsonSha256:
          "7363b6663f9669bb450fac48528090fd93b500ecd1db8cf95cc54580246bf4f4",
        candidateCanonicalJsonSha256:
          "7363b6663f9669bb450fac48528090fd93b500ecd1db8cf95cc54580246bf4f4",
        keyOrderDifferenceCount: 1,
        valueDifferenceCount: 0,
        recordCounts: {
          units: 399,
          statBlocks: 21,
          total: 420,
        },
        orderedIdSha256: {
          units:
            "bc200b3061654b6a3ca19aa5d64195daba6f2dbe2977a6a7dd15e84733849b22",
          statBlocks:
            "367c1236b838d3265f1b87f3c297642f6906c72bee951d496fdd4ee996322e4e",
          all: "1ba47988d91731d46927a075f3d75707a33c83571a81d2075884ec3005f15a92",
        },
      },
    },
    schema: {
      path: SCHEMA_PATH,
      semanticClass: "schema-definition-graph-regenerated",
      cause:
        "Effect 4 schema encoding regenerated the local definition graph with renamed and deduplicated definitions while preserving the published aggregate contract.",
      issue:
        "The schema bytes and local definition/reference graph changed; both graphs must remain complete and cross-validate both aggregate snapshots.",
      baseline: {
        byteLength: 927510,
        sha256:
          "a7dbfc51903fe2653a5b65e857cbe1a1e5eb29fa365f4c71bb0bbf216a1e62b2",
      },
      candidate: {
        byteLength: 1375908,
        sha256:
          "b7b6ab07de16590f1f731bc0abe4171a4d4e36241d595221f9a9a57f51d46110",
      },
      evidence: {
        baselineCanonicalJsonSha256:
          "9c11f7e18ab8baf9762617d74142ca7dfc45a38fe4ee625b72e7d69d439cb08f",
        candidateCanonicalJsonSha256:
          "5696bbda8ab69b3d6612a8c047abda5c9342d744bf643cee4b4bf810fc98c7fb",
        definitions: {
          baseline: 1305,
          candidate: 1075,
        },
        references: {
          baseline: 8778,
          candidate: 7290,
        },
        localReferencesComplete: {
          baseline: true,
          candidate: true,
        },
        crossValidation: [
          "baseline-schema/baseline-aggregate",
          "baseline-schema/candidate-aggregate",
          "candidate-schema/baseline-aggregate",
          "candidate-schema/candidate-aggregate",
        ],
      },
    },
  },
  verification: {
    hashAlgorithm: "SHA-256",
    canonicalJson:
      "JSON object keys are sorted recursively; array order is retained.",
    orderedIdHash:
      "SHA-256(JSON.stringify(ordered IDs)) for each aggregate family and their concatenation.",
    schemaReferences:
      "Every $ref is a local #/$defs reference whose definition exists.",
  },
} as const;

type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type JsonObject = { readonly [key: string]: JsonValue };

type PublicationDeltaVerificationIssue = {
  readonly kind:
    | "certificate-unreadable"
    | "certificate-invalid-json"
    | "certificate-contract-mismatch"
    | "baseline-unreadable"
    | "baseline-hash-mismatch"
    | "candidate-unreadable"
    | "candidate-hash-mismatch"
    | "aggregate-invalid"
    | "aggregate-semantic-mismatch"
    | "aggregate-record-mismatch"
    | "aggregate-evidence-mismatch"
    | "schema-invalid"
    | "schema-reference-mismatch"
    | "schema-compile-failed"
    | "schema-validation-failed";
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

export type SurfacePublicationDeltaVerificationOptions = {
  readonly repoRoot: string;
  readonly publicationDir?: string;
  readonly certificatePath?: string;
};

type ArtifactBytes =
  | { readonly tag: "ok"; readonly bytes: Buffer }
  | { readonly tag: "invalid"; readonly message: string };

type ParsedArtifact =
  | { readonly tag: "ok"; readonly bytes: Buffer; readonly value: JsonValue }
  | { readonly tag: "invalid"; readonly message: string };

type SchemaReferenceEvidence = {
  readonly definitions: number;
  readonly references: number;
  readonly localReferencesComplete: boolean;
};

type AggregateEvidence = {
  readonly canonicalJsonSha256: string;
  readonly keyOrderDifferenceCount: number;
  readonly valueDifferenceCount: number;
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

type AggregateDifferenceEvidence = Pick<
  AggregateEvidence,
  "keyOrderDifferenceCount" | "valueDifferenceCount"
>;

type SchemaDocument = JsonObject & {
  readonly $defs: JsonObject;
};

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

function parseJsonBytes(bytes: Buffer): ParsedArtifact {
  try {
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    return isJsonValue(parsed)
      ? { tag: "ok", bytes, value: parsed }
      : { tag: "invalid", message: "JSON value is not a finite JSON value" };
  } catch (error) {
    return {
      tag: "invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function readBytes(filePath: string): ArtifactBytes {
  try {
    return { tag: "ok", bytes: readFileSync(filePath) };
  } catch (error) {
    return {
      tag: "invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
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

function readBaselineArtifact(repoRoot: string, path: string): ArtifactBytes {
  try {
    return {
      tag: "ok",
      bytes: execFileSync("git", ["show", `${BASELINE_COMMIT}:${path}`], {
        cwd: repoRoot,
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      tag: "invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function certificateContractMatches(value: JsonValue): boolean {
  return canonicalJson(value) === canonicalJson(EXPECTED_CERTIFICATE);
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

function aggregateEvidence(
  rawValue: JsonValue,
  value: PublishedSrdSurface,
  differences: AggregateDifferenceEvidence,
): AggregateEvidence {
  const units = value.units.map((record) => record.id);
  const statBlocks = value.statBlocks.map((record) => record.id);
  const all = [...units, ...statBlocks];
  const orderedIdSha256 = (ids: readonly string[]): string =>
    sha256(Buffer.from(JSON.stringify(ids), "utf8"));
  return {
    canonicalJsonSha256: sha256(Buffer.from(canonicalJson(rawValue), "utf8")),
    keyOrderDifferenceCount: differences.keyOrderDifferenceCount,
    valueDifferenceCount: differences.valueDifferenceCount,
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
  };
}

function addAggregateDifferences(
  left: AggregateDifferenceEvidence,
  right: AggregateDifferenceEvidence,
): AggregateDifferenceEvidence {
  return {
    keyOrderDifferenceCount:
      left.keyOrderDifferenceCount + right.keyOrderDifferenceCount,
    valueDifferenceCount:
      left.valueDifferenceCount + right.valueDifferenceCount,
  };
}

function aggregateArrayDifferences(
  left: readonly JsonValue[],
  right: readonly JsonValue[],
): AggregateDifferenceEvidence {
  let differences: AggregateDifferenceEvidence = {
    keyOrderDifferenceCount: 0,
    valueDifferenceCount: left.length === right.length ? 0 : 1,
  };
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    differences = addAggregateDifferences(
      differences,
      aggregatePairDifferences(left[index]!, right[index]!),
    );
  }
  return differences;
}

function aggregateObjectDifferences(
  left: JsonObject,
  right: JsonObject,
): AggregateDifferenceEvidence {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key) => !Object.hasOwn(right, key))
  ) {
    return { keyOrderDifferenceCount: 0, valueDifferenceCount: 1 };
  }
  let differences: AggregateDifferenceEvidence = {
    keyOrderDifferenceCount: leftKeys.some(
      (key, index) => rightKeys[index] !== key,
    )
      ? 1
      : 0,
    valueDifferenceCount: 0,
  };
  for (const key of leftKeys) {
    differences = addAggregateDifferences(
      differences,
      aggregatePairDifferences(left[key]!, right[key]!),
    );
  }
  return differences;
}

function aggregatePairDifferences(
  left: JsonValue,
  right: JsonValue,
): AggregateDifferenceEvidence {
  if (Array.isArray(left) && Array.isArray(right)) {
    return aggregateArrayDifferences(left, right);
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    return aggregateObjectDifferences(left, right);
  }
  return {
    keyOrderDifferenceCount: 0,
    valueDifferenceCount: left === right ? 0 : 1,
  };
}

function aggregateDifferences(
  baseline: JsonValue,
  candidate: JsonValue,
): AggregateDifferenceEvidence {
  return aggregatePairDifferences(baseline, candidate);
}

function aggregateRecordDecode(value: JsonValue):
  | { readonly tag: "ok"; readonly value: PublishedSrdSurface }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  const decoded = Schema.decodeUnknownResult(PublishedSrdSurfaceSchema, {
    onExcessProperty: "error",
  })(value);
  return Result.isSuccess(decoded)
    ? { tag: "ok", value: decoded.success }
    : { tag: "invalid", message: String(decoded.failure) };
}

function appendAggregateDecodeIssue(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  decoded:
    | { readonly tag: "ok"; readonly value: PublishedSrdSurface }
    | { readonly tag: "invalid"; readonly message: string },
): void {
  if (decoded.tag !== "invalid") return;
  issues.push({
    kind: "aggregate-invalid",
    message: `${label[0].toUpperCase()}${label.slice(1)} aggregate does not decode: ${decoded.message}`,
  });
}

function compareAggregateRecordEvidence(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  evidence: AggregateEvidence,
): void {
  const expected = EXPECTED_CERTIFICATE.artifacts.aggregate.evidence;
  if (
    JSON.stringify(evidence.recordCounts) !==
    JSON.stringify(expected.recordCounts)
  ) {
    issues.push({
      kind: "aggregate-record-mismatch",
      message: `${label} aggregate record counts do not match the pinned certificate.`,
    });
  }
  if (
    JSON.stringify(evidence.orderedIdSha256) !==
    JSON.stringify(expected.orderedIdSha256)
  ) {
    issues.push({
      kind: "aggregate-record-mismatch",
      message: `${label} aggregate ordered ID hashes do not match the pinned certificate.`,
    });
  }
}

function compareAggregateCanonicalEvidence(
  issues: PublicationDeltaVerificationIssue[],
  baseline: AggregateEvidence,
  candidate: AggregateEvidence,
): void {
  const expected = EXPECTED_CERTIFICATE.artifacts.aggregate.evidence;
  if (
    baseline.canonicalJsonSha256 !== expected.baselineCanonicalJsonSha256 ||
    candidate.canonicalJsonSha256 !== expected.candidateCanonicalJsonSha256
  ) {
    issues.push({
      kind: "aggregate-evidence-mismatch",
      message:
        "Aggregate canonical JSON hashes do not match the pinned certificate.",
    });
  }
}

function compareAggregateDifferenceEvidence(
  issues: PublicationDeltaVerificationIssue[],
  differences: AggregateDifferenceEvidence,
): void {
  const expected = EXPECTED_CERTIFICATE.artifacts.aggregate.evidence;
  if (
    differences.keyOrderDifferenceCount !== expected.keyOrderDifferenceCount ||
    differences.valueDifferenceCount !== expected.valueDifferenceCount
  ) {
    issues.push({
      kind: "aggregate-evidence-mismatch",
      message:
        "Aggregate key-order/value difference counts do not match the pinned certificate.",
    });
  }
}

function compareAggregateSnapshots(
  issues: PublicationDeltaVerificationIssue[],
  baseline: JsonValue,
  candidate: JsonValue,
): void {
  const baselineDecoded = aggregateRecordDecode(baseline);
  const candidateDecoded = aggregateRecordDecode(candidate);
  appendAggregateDecodeIssue(issues, "baseline", baselineDecoded);
  appendAggregateDecodeIssue(issues, "candidate", candidateDecoded);
  if (baselineDecoded.tag === "invalid" || candidateDecoded.tag === "invalid") {
    return;
  }

  const differences = aggregateDifferences(baseline, candidate);
  const baselineEvidence = aggregateEvidence(
    baseline,
    baselineDecoded.value,
    differences,
  );
  const candidateEvidence = aggregateEvidence(
    candidate,
    candidateDecoded.value,
    differences,
  );
  const baselineCanonical = canonicalJson(baseline);
  const candidateCanonical = canonicalJson(candidate);
  if (baselineCanonical !== candidateCanonical) {
    issues.push({
      kind: "aggregate-semantic-mismatch",
      message:
        "Baseline and candidate aggregates differ after recursive key sorting.",
    });
  }
  compareAggregateRecordEvidence(issues, "baseline", baselineEvidence);
  compareAggregateRecordEvidence(issues, "candidate", candidateEvidence);
  compareAggregateCanonicalEvidence(
    issues,
    baselineEvidence,
    candidateEvidence,
  );
  compareAggregateDifferenceEvidence(issues, differences);
}

type ParsedSchemaPair = {
  readonly baseline: SchemaDocument;
  readonly candidate: SchemaDocument;
};

function parseSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  baseline: JsonValue,
  candidate: JsonValue,
): ParsedSchemaPair | undefined {
  const baselineDocument = schemaDocument(baseline);
  const candidateDocument = schemaDocument(candidate);
  if (baselineDocument.tag === "invalid") {
    issues.push({
      kind: "schema-invalid",
      message: `Baseline schema: ${baselineDocument.message}`,
    });
  }
  if (candidateDocument.tag === "invalid") {
    issues.push({
      kind: "schema-invalid",
      message: `Candidate schema: ${candidateDocument.message}`,
    });
  }
  if (
    baselineDocument.tag === "invalid" ||
    candidateDocument.tag === "invalid"
  ) {
    return undefined;
  }
  return {
    baseline: baselineDocument.value,
    candidate: candidateDocument.value,
  };
}

function compareSchemaEvidence(
  issues: PublicationDeltaVerificationIssue[],
  baseline: SchemaDocument,
  candidate: SchemaDocument,
): void {
  const expected = EXPECTED_CERTIFICATE.artifacts.schema.evidence;
  const baselineReferences = schemaReferences(baseline);
  const candidateReferences = schemaReferences(candidate);
  const baselineCanonicalJsonSha256 = sha256(
    Buffer.from(canonicalJson(baseline), "utf8"),
  );
  const candidateCanonicalJsonSha256 = sha256(
    Buffer.from(canonicalJson(candidate), "utf8"),
  );
  if (
    baselineCanonicalJsonSha256 !== expected.baselineCanonicalJsonSha256 ||
    candidateCanonicalJsonSha256 !== expected.candidateCanonicalJsonSha256
  ) {
    issues.push({
      kind: "schema-reference-mismatch",
      message:
        "Schema canonical JSON hashes do not match the pinned certificate.",
    });
  }
  if (
    baselineReferences.definitions !== expected.definitions.baseline ||
    candidateReferences.definitions !== expected.definitions.candidate ||
    baselineReferences.references !== expected.references.baseline ||
    candidateReferences.references !== expected.references.candidate ||
    !baselineReferences.localReferencesComplete ||
    !candidateReferences.localReferencesComplete
  ) {
    issues.push({
      kind: "schema-reference-mismatch",
      message:
        "Schema definition/reference counts or local reference closure changed.",
    });
  }
}

type CompiledSchemaValidators = ReadonlyMap<
  string,
  ReturnType<Ajv2020["compile"]>
>;

function compileSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  schemas: ParsedSchemaPair,
): CompiledSchemaValidators {
  const validators = new Map<string, ReturnType<Ajv2020["compile"]>>();
  for (const [label, document] of [
    ["baseline-schema", schemas.baseline],
    ["candidate-schema", schemas.candidate],
  ] as const) {
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
        message: `${label} failed to compile: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return validators;
}

function validateAggregatePair(
  issues: PublicationDeltaVerificationIssue[],
  validators: CompiledSchemaValidators,
  baselineAggregate: JsonValue,
  candidateAggregate: JsonValue,
): void {
  const validationCases = [
    ["baseline-schema", "baseline-aggregate", baselineAggregate],
    ["baseline-schema", "candidate-aggregate", candidateAggregate],
    ["candidate-schema", "baseline-aggregate", baselineAggregate],
    ["candidate-schema", "candidate-aggregate", candidateAggregate],
  ] as const;
  for (const [schemaLabel, aggregateLabel, aggregate] of validationCases) {
    const validator = validators.get(schemaLabel);
    if (validator === undefined || validator(aggregate)) continue;
    issues.push({
      kind: "schema-validation-failed",
      message: `${schemaLabel} rejected ${aggregateLabel}: ${JSON.stringify(validator.errors?.slice(0, 3) ?? [])}`,
    });
  }
}

function validateSchemaPair(
  issues: PublicationDeltaVerificationIssue[],
  baselineSchema: JsonValue,
  candidateSchema: JsonValue,
  baselineAggregate: JsonValue,
  candidateAggregate: JsonValue,
): void {
  const schemas = parseSchemaPair(issues, baselineSchema, candidateSchema);
  if (schemas === undefined) return;
  compareSchemaEvidence(issues, schemas.baseline, schemas.candidate);
  const validators = compileSchemaPair(issues, schemas);
  validateAggregatePair(
    issues,
    validators,
    baselineAggregate,
    candidateAggregate,
  );
}

function verifyArtifactBytes(
  issues: PublicationDeltaVerificationIssue[],
  label: "baseline" | "candidate",
  bytes: ArtifactBytes,
  expected: { readonly byteLength: number; readonly sha256: string },
): void {
  if (bytes.tag === "invalid") {
    issues.push({
      kind:
        label === "baseline" ? "baseline-unreadable" : "candidate-unreadable",
      message: `${label} artifact is unreadable: ${bytes.message}`,
    });
    return;
  }
  if (
    bytes.bytes.byteLength !== expected.byteLength ||
    sha256(bytes.bytes) !== expected.sha256
  ) {
    issues.push({
      kind:
        label === "baseline"
          ? "baseline-hash-mismatch"
          : "candidate-hash-mismatch",
      message: `${label} artifact bytes do not match the pinned length and SHA-256.`,
    });
  }
}

function artifactPath(publicationDir: string, path: string): string {
  return join(
    publicationDir,
    path.slice(`${SURFACE_PUBLICATION_ROOT}/`.length),
  );
}

function readCertificate(certificatePath: string):
  | { readonly tag: "ok"; readonly value: JsonValue }
  | {
      readonly tag: "invalid";
      readonly kind: "certificate-unreadable" | "certificate-invalid-json";
      readonly message: string;
    } {
  let bytes: Buffer;
  try {
    bytes = readFileSync(certificatePath);
  } catch (error) {
    return {
      tag: "invalid",
      kind: "certificate-unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  try {
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    return isJsonValue(parsed)
      ? { tag: "ok", value: parsed }
      : {
          tag: "invalid",
          kind: "certificate-invalid-json",
          message: "certificate JSON is not a finite JSON value",
        };
  } catch (error) {
    return {
      tag: "invalid",
      kind: "certificate-invalid-json",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function verifySurfacePublicationDelta(
  options: SurfacePublicationDeltaVerificationOptions,
): SurfacePublicationDeltaVerificationResult {
  const publicationDir =
    options.publicationDir ?? join(options.repoRoot, SURFACE_PUBLICATION_ROOT);
  const certificatePath =
    options.certificatePath ??
    join(options.repoRoot, SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH);
  const issues: PublicationDeltaVerificationIssue[] = [];

  const certificate = readCertificate(certificatePath);
  if (certificate.tag === "invalid") {
    issues.push({
      kind: certificate.kind,
      message: `Surface publication delta certificate: ${certificate.message}`,
    });
  } else if (!certificateContractMatches(certificate.value)) {
    issues.push({
      kind: "certificate-contract-mismatch",
      message:
        "Surface publication delta certificate does not match the pinned issue contract.",
    });
  }

  const baselineAggregateBytes = readBaselineArtifact(
    options.repoRoot,
    AGGREGATE_PATH,
  );
  const candidateAggregateBytes = readBytes(
    artifactPath(publicationDir, AGGREGATE_PATH),
  );
  const baselineSchemaBytes = readBaselineArtifact(
    options.repoRoot,
    SCHEMA_PATH,
  );
  const candidateSchemaBytes = readBytes(
    artifactPath(publicationDir, SCHEMA_PATH),
  );
  verifyArtifactBytes(
    issues,
    "baseline",
    baselineAggregateBytes,
    EXPECTED_CERTIFICATE.artifacts.aggregate.baseline,
  );
  verifyArtifactBytes(
    issues,
    "candidate",
    candidateAggregateBytes,
    EXPECTED_CERTIFICATE.artifacts.aggregate.candidate,
  );
  verifyArtifactBytes(
    issues,
    "baseline",
    baselineSchemaBytes,
    EXPECTED_CERTIFICATE.artifacts.schema.baseline,
  );
  verifyArtifactBytes(
    issues,
    "candidate",
    candidateSchemaBytes,
    EXPECTED_CERTIFICATE.artifacts.schema.candidate,
  );

  const baselineAggregate =
    baselineAggregateBytes.tag === "ok"
      ? parseJsonBytes(baselineAggregateBytes.bytes)
      : {
          tag: "invalid" as const,
          message: "baseline aggregate bytes are unavailable",
        };
  const candidateAggregate =
    candidateAggregateBytes.tag === "ok"
      ? parseJsonBytes(candidateAggregateBytes.bytes)
      : {
          tag: "invalid" as const,
          message: "candidate aggregate bytes are unavailable",
        };
  const baselineSchema =
    baselineSchemaBytes.tag === "ok"
      ? parseJsonBytes(baselineSchemaBytes.bytes)
      : {
          tag: "invalid" as const,
          message: "baseline schema bytes are unavailable",
        };
  const candidateSchema =
    candidateSchemaBytes.tag === "ok"
      ? parseJsonBytes(candidateSchemaBytes.bytes)
      : {
          tag: "invalid" as const,
          message: "candidate schema bytes are unavailable",
        };

  if (baselineAggregate.tag === "ok" && candidateAggregate.tag === "ok") {
    compareAggregateSnapshots(
      issues,
      baselineAggregate.value,
      candidateAggregate.value,
    );
  } else {
    issues.push({
      kind: "aggregate-invalid",
      message: "Unable to parse both aggregate snapshots.",
    });
  }

  if (
    baselineSchema.tag === "ok" &&
    candidateSchema.tag === "ok" &&
    baselineAggregate.tag === "ok" &&
    candidateAggregate.tag === "ok"
  ) {
    validateSchemaPair(
      issues,
      baselineSchema.value,
      candidateSchema.value,
      baselineAggregate.value,
      candidateAggregate.value,
    );
  } else {
    issues.push({
      kind: "schema-invalid",
      message: "Unable to parse both schema snapshots and aggregates.",
    });
  }

  return issues.length === 0
    ? { tag: "verified", baselineCommit: BASELINE_COMMIT }
    : { tag: "invalid", issues };
}

export function describeSurfacePublicationDeltaIssue(
  issue: PublicationDeltaVerificationIssue,
): string {
  return `${issue.kind}: ${issue.message}`;
}
