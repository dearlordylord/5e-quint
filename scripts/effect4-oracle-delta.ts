import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Match, Result, Schema } from "effect";

import {
  EFFECT3_BASELINE_PATH,
  canonicalBaselineJson,
  captureEffect3Baseline,
  normalizeJsonValue,
  type BaselineJsonValue,
} from "./effect3-baseline.ts";
import { compareUnicodeCodePointStrings } from "./unicode-code-point-order.ts";

export const EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/effect4-oracle-delta-certificate.json";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CERTIFICATE_FORMAT_VERSION = 1;
const CERTIFICATE_SHA256 =
  "cf8111311f8eef9c3a1b4841c7e186ae38325cce4a7b8c963ddcf12c49bed0d9";

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
const ClassificationEvidenceSchema = Schema.Struct({
  id: Schema.String,
  deltaCount: NonNegativeIntegerSchema,
  deltaIdentitySha256: HashSchema,
  operations: Schema.Struct({
    added: NonNegativeIntegerSchema,
    removed: NonNegativeIntegerSchema,
    changed: NonNegativeIntegerSchema,
  }),
});
const ORACLE_DELTA_OPERATIONS = ["added", "removed", "changed"] as const;
const JsonSideSchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("missing") }),
  Schema.Struct({ tag: Schema.Literal("present"), sha256: HashSchema }),
]);
const ReviewedDeltaIdentitySchema = Schema.Struct({
  classificationId: Schema.String,
  operation: Schema.Literals(ORACLE_DELTA_OPERATIONS),
  path: Schema.String,
  baseline: JsonSideSchema,
  candidate: JsonSideSchema,
});
const OracleDeltaCertificateSchema = Schema.Struct({
  formatVersion: Schema.Literal(CERTIFICATE_FORMAT_VERSION),
  issue: Schema.Struct({
    number: Schema.Literal(386),
    kind: Schema.Literal("effect-4-finite-oracle-delta"),
    statement: Schema.String,
  }),
  baseline: Schema.Struct({
    path: Schema.Literal(EFFECT3_BASELINE_PATH),
    artifact: ArtifactDigestSchema,
  }),
  candidate: ArtifactDigestSchema,
  delta: Schema.Struct({
    algorithm: Schema.Literal("recursive-json-pointer-leaf-v1"),
    identity: Schema.String,
    totalCount: NonNegativeIntegerSchema,
    identitySha256: HashSchema,
    identities: Schema.Array(ReviewedDeltaIdentitySchema),
    classifications: Schema.Array(ClassificationEvidenceSchema),
  }),
  review: Schema.Struct({
    invariant: Schema.String,
    scope: Schema.String,
    limitations: Schema.String,
  }),
});

export type OracleDeltaCertificate = Schema.Schema.Type<
  typeof OracleDeltaCertificateSchema
>;

type JsonSide = Schema.Schema.Type<typeof JsonSideSchema>;

type OracleDeltaOperation = (typeof ORACLE_DELTA_OPERATIONS)[number];

export type OracleDelta = {
  readonly operation: OracleDeltaOperation;
  readonly path: string;
  readonly segments: readonly string[];
  readonly baseline: JsonSide;
  readonly candidate: JsonSide;
};

export type OracleDeltaCategory = {
  readonly id: string;
  readonly matches: (segments: readonly string[]) => boolean;
};

export type OracleDeltaEvidence = {
  readonly baseline: { readonly byteLength: number; readonly sha256: string };
  readonly candidate: { readonly byteLength: number; readonly sha256: string };
  readonly delta: {
    readonly totalCount: number;
    readonly identitySha256: string;
    readonly identities: readonly ReviewedOracleDeltaIdentity[];
    readonly classifications: readonly {
      readonly id: string;
      readonly deltaCount: number;
      readonly deltaIdentitySha256: string;
      readonly operations: {
        readonly added: number;
        readonly removed: number;
        readonly changed: number;
      };
    }[];
  };
};

export type ReviewedOracleDeltaIdentity = {
  readonly classificationId: string;
  readonly operation: OracleDelta["operation"];
  readonly path: string;
  readonly baseline: JsonSide;
  readonly candidate: JsonSide;
};

export type OracleDeltaIssue =
  | { readonly kind: "baseline-unreadable"; readonly message: string }
  | { readonly kind: "certificate-unreadable"; readonly message: string }
  | { readonly kind: "certificate-digest-mismatch"; readonly message: string }
  | { readonly kind: "certificate-invalid"; readonly message: string }
  | { readonly kind: "duplicate-delta"; readonly path: string }
  | { readonly kind: "unclassified-delta"; readonly path: string }
  | {
      readonly kind: "multiply-classified-delta";
      readonly path: string;
      readonly classificationIds: readonly string[];
    }
  | { readonly kind: "baseline-certificate-stale"; readonly message: string }
  | { readonly kind: "candidate-certificate-stale"; readonly message: string }
  | { readonly kind: "delta-certificate-stale"; readonly message: string };

export type OracleDeltaVerificationResult =
  | { readonly tag: "verified"; readonly evidence: OracleDeltaEvidence }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] };

export const decodeOracleDeltaCertificate = (value: unknown) =>
  Schema.decodeUnknownResult(OracleDeltaCertificateSchema, {
    onExcessProperty: "error",
  })(value);

const topLevel = (name: string) => (segments: readonly string[]) =>
  segments[0] === name;
const secondLevel =
  (first: string, second: string) => (segments: readonly string[]) =>
    segments[0] === first && segments[1] === second;

export const ORACLE_DELTA_CATEGORIES: readonly OracleDeltaCategory[] = [
  {
    id: "baseline-metadata",
    matches: (segments) =>
      ["formatVersion", "normalization", "artifactManifestPolicy"].includes(
        segments[0] ?? "",
      ),
  },
  {
    id: "mcp-registration-contract",
    matches: (segments) =>
      segments[0] === "mcp" &&
      ["registered", "registeredOrder"].includes(segments[1] ?? ""),
  },
  {
    id: "mcp-protocol-entrypoints",
    matches: secondLevel("mcp", "protocolEntrypoints"),
  },
  {
    id: "mcp-authenticated-projection",
    matches: secondLevel("mcp", "authenticatedProjection"),
  },
  {
    id: "surface-publication-authority",
    matches: secondLevel("surface", "publication"),
  },
  {
    id: "surface-content-authority",
    matches: secondLevel("surface", "content"),
  },
  { id: "persisted-session-codecs", matches: topLevel("persistence") },
  {
    id: "reducer-ability-score-assignment",
    matches: (segments) =>
      segments[0] === "reducers" &&
      ["abilityScoreAssignment", "abilityScoreAssignmentRejected"].includes(
        segments[1] ?? "",
      ),
  },
  {
    id: "reducer-character-creation",
    matches: secondLevel("reducers", "characterCreation"),
  },
  {
    id: "reducer-character-sheet-current-hp",
    matches: secondLevel("reducers", "characterSheetCurrentHp"),
  },
  {
    id: "reducer-character-sheet-hit-points",
    matches: secondLevel("reducers", "characterSheetHitPoints"),
  },
  {
    id: "reducer-condition-lifecycle",
    matches: secondLevel("reducers", "conditionLifecycle"),
  },
  { id: "raw-swarm-artifact-authority", matches: topLevel("rawSwarm") },
];

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const escapePointerSegment = (segment: string): string =>
  segment.replaceAll("~", "~0").replaceAll("/", "~1");

const pointer = (segments: readonly string[]): string =>
  `/${segments.map(escapePointerSegment).join("/")}`;

const presentSide = (value: BaselineJsonValue): JsonSide => ({
  tag: "present",
  sha256: sha256(canonicalBaselineJson(value)),
});

const isRecord = (
  value: BaselineJsonValue,
): value is { readonly [key: string]: BaselineJsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function collectOracleDeltas(
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
  segments: readonly string[],
  deltas: OracleDelta[],
): void {
  if (Array.isArray(baseline) && Array.isArray(candidate)) {
    const sharedLength = Math.min(baseline.length, candidate.length);
    for (let index = 0; index < sharedLength; index += 1) {
      collectOracleDeltas(
        baseline[index]!,
        candidate[index]!,
        [...segments, String(index)],
        deltas,
      );
    }
    for (let index = sharedLength; index < baseline.length; index += 1) {
      const childSegments = [...segments, String(index)];
      deltas.push({
        operation: "removed",
        path: pointer(childSegments),
        segments: childSegments,
        baseline: presentSide(baseline[index]!),
        candidate: { tag: "missing" },
      });
    }
    for (let index = sharedLength; index < candidate.length; index += 1) {
      const childSegments = [...segments, String(index)];
      deltas.push({
        operation: "added",
        path: pointer(childSegments),
        segments: childSegments,
        baseline: { tag: "missing" },
        candidate: presentSide(candidate[index]!),
      });
    }
    return;
  }
  if (isRecord(baseline) && isRecord(candidate)) {
    const keys = [
      ...new Set([...Object.keys(baseline), ...Object.keys(candidate)]),
    ].sort(compareUnicodeCodePointStrings);
    for (const key of keys) {
      const childSegments = [...segments, key];
      const inBaseline = Object.hasOwn(baseline, key);
      const inCandidate = Object.hasOwn(candidate, key);
      if (!inBaseline) {
        deltas.push({
          operation: "added",
          path: pointer(childSegments),
          segments: childSegments,
          baseline: { tag: "missing" },
          candidate: presentSide(candidate[key]!),
        });
      } else if (!inCandidate) {
        deltas.push({
          operation: "removed",
          path: pointer(childSegments),
          segments: childSegments,
          baseline: presentSide(baseline[key]!),
          candidate: { tag: "missing" },
        });
      } else {
        collectOracleDeltas(
          baseline[key]!,
          candidate[key]!,
          childSegments,
          deltas,
        );
      }
    }
    return;
  }
  if (canonicalBaselineJson(baseline) === canonicalBaselineJson(candidate)) {
    return;
  }
  deltas.push({
    operation: "changed",
    path: pointer(segments),
    segments,
    baseline: presentSide(baseline),
    candidate: presentSide(candidate),
  });
}

const deltaIdentity = (delta: OracleDelta): string =>
  canonicalBaselineJson({
    operation: delta.operation,
    path: delta.path,
    baseline: delta.baseline,
    candidate: delta.candidate,
  });

export function classifyOracleDeltas(
  deltas: readonly OracleDelta[],
  categories: readonly OracleDeltaCategory[] = ORACLE_DELTA_CATEGORIES,
):
  | {
      readonly tag: "classified";
      readonly evidence: OracleDeltaEvidence["delta"];
    }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] } {
  const issues: OracleDeltaIssue[] = [];
  const identities = new Set<string>();
  const classified = new Map<
    string,
    { readonly identity: string; readonly delta: OracleDelta }[]
  >(categories.map(({ id }) => [id, []]));
  for (const delta of deltas) {
    const identity = deltaIdentity(delta);
    if (identities.has(identity)) {
      issues.push({ kind: "duplicate-delta", path: delta.path });
      continue;
    }
    identities.add(identity);
    const matches = categories.filter(({ matches }) => matches(delta.segments));
    if (matches.length === 0) {
      issues.push({ kind: "unclassified-delta", path: delta.path });
      continue;
    }
    if (matches.length > 1) {
      issues.push({
        kind: "multiply-classified-delta",
        path: delta.path,
        classificationIds: matches.map(({ id }) => id),
      });
      continue;
    }
    classified.get(matches[0]!.id)!.push({ identity, delta });
  }
  if (issues.length > 0) return { tag: "invalid", issues };
  const sortedIdentities = [...identities].sort(compareUnicodeCodePointStrings);
  const reviewedIdentities = [...classified.entries()]
    .flatMap(([classificationId, entries]) =>
      entries.map(({ identity, delta }) => ({
        identity,
        value: {
          classificationId,
          operation: delta.operation,
          path: delta.path,
          baseline: delta.baseline,
          candidate: delta.candidate,
        },
      })),
    )
    .sort((left, right) =>
      compareUnicodeCodePointStrings(left.identity, right.identity),
    )
    .map(({ value }) => value);
  return {
    tag: "classified",
    evidence: {
      totalCount: deltas.length,
      identitySha256: sha256(sortedIdentities.join("")),
      identities: reviewedIdentities,
      classifications: categories.map(({ id }) => {
        const categoryDeltas = classified.get(id)!;
        const categoryIdentities = categoryDeltas
          .map(({ identity }) => identity)
          .sort(compareUnicodeCodePointStrings);
        return {
          id,
          deltaCount: categoryIdentities.length,
          deltaIdentitySha256: sha256(categoryIdentities.join("")),
          operations: {
            added: categoryDeltas.filter(
              ({ delta }) => delta.operation === "added",
            ).length,
            removed: categoryDeltas.filter(
              ({ delta }) => delta.operation === "removed",
            ).length,
            changed: categoryDeltas.filter(
              ({ delta }) => delta.operation === "changed",
            ).length,
          },
        };
      }),
    },
  };
}

export function calculateOracleDeltaEvidence(
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
):
  | { readonly tag: "evidence"; readonly value: OracleDeltaEvidence }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] } {
  const baselineBytes = canonicalBaselineJson(baseline);
  const candidateBytes = canonicalBaselineJson(candidate);
  const deltas: OracleDelta[] = [];
  collectOracleDeltas(baseline, candidate, [], deltas);
  const classified = classifyOracleDeltas(deltas);
  if (classified.tag === "invalid") return classified;
  return {
    tag: "evidence",
    value: {
      baseline: {
        byteLength: Buffer.byteLength(baselineBytes),
        sha256: sha256(baselineBytes),
      },
      candidate: {
        byteLength: Buffer.byteLength(candidateBytes),
        sha256: sha256(candidateBytes),
      },
      delta: classified.evidence,
    },
  };
}

function readBaseline():
  | {
      readonly tag: "ok";
      readonly value: BaselineJsonValue;
      readonly artifact: {
        readonly byteLength: number;
        readonly sha256: string;
      };
    }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  try {
    const path = resolve(REPOSITORY_ROOT, EFFECT3_BASELINE_PATH);
    const status = lstatSync(path);
    if (status.isSymbolicLink() || !status.isFile()) {
      throw new Error("immutable baseline must be a regular non-symlink file");
    }
    const bytes = readFileSync(path);
    return {
      tag: "ok",
      value: normalizeJsonValue(JSON.parse(bytes.toString("utf8"))),
      artifact: { byteLength: bytes.byteLength, sha256: sha256(bytes) },
    };
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "baseline-unreadable",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function readCertificate():
  | { readonly tag: "ok"; readonly value: OracleDeltaCertificate }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  let bytes: Buffer;
  try {
    bytes = readFileSync(
      resolve(REPOSITORY_ROOT, EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH),
    );
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-unreadable",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== CERTIFICATE_SHA256) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-digest-mismatch",
        message: `certificate SHA-256 ${observedSha256} does not match reviewed digest ${CERTIFICATE_SHA256}`,
      },
    };
  }
  try {
    const decoded = decodeOracleDeltaCertificate(
      JSON.parse(bytes.toString("utf8")),
    );
    return Result.isSuccess(decoded)
      ? { tag: "ok", value: decoded.success }
      : {
          tag: "invalid",
          issue: {
            kind: "certificate-invalid",
            message: String(decoded.failure),
          },
        };
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-invalid",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const same = (left: unknown, right: unknown): boolean =>
  canonicalBaselineJson(left) === canonicalBaselineJson(right);

export function compareOracleDeltaCertificate(
  certificate: OracleDeltaCertificate,
  evidence: OracleDeltaEvidence,
): readonly OracleDeltaIssue[] {
  const issues: OracleDeltaIssue[] = [];
  if (!same(certificate.baseline.artifact, evidence.baseline)) {
    issues.push({
      kind: "baseline-certificate-stale",
      message:
        "immutable baseline digest does not match the reviewed certificate",
    });
  }
  if (!same(certificate.candidate, evidence.candidate)) {
    issues.push({
      kind: "candidate-certificate-stale",
      message: "candidate digest does not match the reviewed certificate",
    });
  }
  if (
    certificate.delta.totalCount !== evidence.delta.totalCount ||
    certificate.delta.identitySha256 !== evidence.delta.identitySha256 ||
    !same(certificate.delta.identities, evidence.delta.identities) ||
    !same(certificate.delta.classifications, evidence.delta.classifications)
  ) {
    issues.push({
      kind: "delta-certificate-stale",
      message:
        "classified delta identities, counts, or hashes do not match the reviewed certificate",
    });
  }
  return issues;
}

export async function captureOracleDeltaEvidence(): Promise<
  | { readonly tag: "evidence"; readonly value: OracleDeltaEvidence }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] }
> {
  const baseline = readBaseline();
  if (baseline.tag === "invalid") {
    return { tag: "invalid", issues: [baseline.issue] };
  }
  const candidate = normalizeJsonValue(await captureEffect3Baseline());
  const evidence = calculateOracleDeltaEvidence(baseline.value, candidate);
  return evidence.tag === "invalid"
    ? evidence
    : {
        tag: "evidence",
        value: { ...evidence.value, baseline: baseline.artifact },
      };
}

export async function verifyEffect4OracleDelta(): Promise<OracleDeltaVerificationResult> {
  const certificate = readCertificate();
  if (certificate.tag === "invalid") {
    return { tag: "invalid", issues: [certificate.issue] };
  }
  const evidence = await captureOracleDeltaEvidence();
  if (evidence.tag === "invalid") return evidence;
  const issues = compareOracleDeltaCertificate(
    certificate.value,
    evidence.value,
  );
  return issues.length === 0
    ? { tag: "verified", evidence: evidence.value }
    : { tag: "invalid", issues };
}

export function describeOracleDeltaIssue(issue: OracleDeltaIssue): string {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "duplicate-delta" },
      ({ path }) => `duplicate delta identity at ${path}`,
    ),
    Match.when(
      { kind: "unclassified-delta" },
      ({ path }) => `unclassified delta at ${path}`,
    ),
    Match.when(
      { kind: "multiply-classified-delta" },
      ({ path, classificationIds }) =>
        `delta at ${path} matched ${classificationIds.join(", ")}`,
    ),
    Match.when(
      {
        kind: Match.is(
          "baseline-unreadable",
          "certificate-unreadable",
          "certificate-digest-mismatch",
          "certificate-invalid",
          "baseline-certificate-stale",
          "candidate-certificate-stale",
          "delta-certificate-stale",
        ),
      },
      ({ kind, message }) => `${kind}: ${message}`,
    ),
    Match.exhaustive,
  );
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "audit") {
    const result = await captureOracleDeltaEvidence();
    if (result.tag === "invalid") {
      result.issues.forEach((issue) =>
        console.error(describeOracleDeltaIssue(issue)),
      );
      process.exitCode = 1;
      return;
    }
    console.log(canonicalBaselineJson(result.value));
    return;
  }
  if (command === "verify") {
    const result = await verifyEffect4OracleDelta();
    if (result.tag === "invalid") {
      result.issues.forEach((issue) =>
        console.error(describeOracleDeltaIssue(issue)),
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `Effect 4 finite oracle delta verified (${result.evidence.delta.totalCount} classified identities).`,
    );
    return;
  }
  throw new Error(
    "Usage: pnpm exec tsx scripts/effect4-oracle-delta.ts audit|verify",
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
