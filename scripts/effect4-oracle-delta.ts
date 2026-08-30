import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Match, Result, Schema } from "effect";

import {
  EFFECT3_BASELINE_PATH,
  canonicalBaselineJson,
  captureEffect3Baseline,
  normalizeJsonValue,
  readRegularRepositoryFile,
  type BaselineJsonValue,
} from "./effect3-baseline.ts";
import { compareUnicodeCodePointStrings } from "./unicode-code-point-order.ts";

export const EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH =
  "docs/migrations/effect-4/effect4-oracle-delta-certificate.json";

const CERTIFICATE_FORMAT_VERSION = 2;
const DELTA_ALGORITHM = "canonical-keyed-collection-delta-v2";
const CERTIFICATE_SHA256 =
  "2ca55425776b8b574ff88e57e5ceddcbcd349b652c2873c28619745332a645f6";

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
const DeltaSegmentsSchema = Schema.Array(Schema.String).pipe(
  Schema.check(Schema.isMinLength(1)),
);
const ChangedDeltaSchema = Schema.Struct({
  operation: Schema.Literal("changed"),
  segments: DeltaSegmentsSchema,
  baselineSha256: HashSchema,
  candidateSha256: HashSchema,
});
const AddedDeltaSchema = Schema.Struct({
  operation: Schema.Literal("added"),
  segments: DeltaSegmentsSchema,
  candidateSha256: HashSchema,
});
const RemovedDeltaSchema = Schema.Struct({
  operation: Schema.Literal("removed"),
  segments: DeltaSegmentsSchema,
  baselineSha256: HashSchema,
});
const OracleDeltaSchema = Schema.Union([
  ChangedDeltaSchema,
  AddedDeltaSchema,
  RemovedDeltaSchema,
]);

export type OracleDelta = Schema.Schema.Type<typeof OracleDeltaSchema>;

const REVIEWED_REASON_IDS = [
  "mcp-registration-contract-migration",
  "mcp-protocol-contract-migration",
  "mcp-authenticated-contract-migration",
  "persisted-session-effect-schema-migration",
  "raw-swarm-effect-runtime-artifacts",
  "surface-publication-contract-convergence",
  "surface-authored-contract-convergence",
] as const;
const ReviewedReasonIdSchema = Schema.Literals(REVIEWED_REASON_IDS);
export type ReviewedReasonId = (typeof REVIEWED_REASON_IDS)[number];

const COLLECTION_AUTHORITY_IDS = [
  "mcp-registered-tools",
  "mcp-authenticated-advertised-tools",
  "mcp-default-stdio-tools",
  "mcp-http-without-oauth-tools",
  "surface-publication-artifacts",
  "surface-content-artifacts",
  "raw-swarm-artifacts",
] as const;
const CollectionAuthorityIdSchema = Schema.Literals(COLLECTION_AUTHORITY_IDS);
type CollectionAuthorityId = (typeof COLLECTION_AUTHORITY_IDS)[number];

const CollectionSideEvidenceSchema = Schema.Struct({
  count: NonNegativeIntegerSchema,
  membershipSha256: HashSchema,
  memberOrderSha256: HashSchema,
});
const CollectionAuthorityEvidenceSchema = Schema.Struct({
  id: CollectionAuthorityIdSchema,
  reasonId: ReviewedReasonIdSchema,
  baseline: CollectionSideEvidenceSchema,
  candidate: CollectionSideEvidenceSchema,
});
const ARRAY_COMPARISON_AUTHORITY_IDS = [
  "keyed-with-order-authority",
  "explicit-order-authority",
  "mcp-catalog-unit-response-order",
  "persisted-operation-log-order",
  "positional-value-sequence-v1",
] as const;
type ArrayComparisonAuthorityId =
  (typeof ARRAY_COMPARISON_AUTHORITY_IDS)[number];
const ArrayComparisonAuthorityIdSchema = Schema.Literals(
  ARRAY_COMPARISON_AUTHORITY_IDS,
);
const ArrayComparisonAuthorityEvidenceSchema = Schema.Struct({
  id: ArrayComparisonAuthorityIdSchema,
  siteCount: NonNegativeIntegerSchema,
  siteSha256: HashSchema,
});
const ReviewedOracleDeltaIdentitySchema = Schema.Struct({
  reasonId: ReviewedReasonIdSchema,
  delta: OracleDeltaSchema,
});
const ReviewedReasonEvidenceSchema = Schema.Struct({
  id: ReviewedReasonIdSchema,
  deltaCount: NonNegativeIntegerSchema,
  deltaIdentitySha256: HashSchema,
  siteSha256: HashSchema,
  operations: Schema.Struct({
    added: NonNegativeIntegerSchema,
    removed: NonNegativeIntegerSchema,
    changed: NonNegativeIntegerSchema,
  }),
  changedCollectionAuthorityIds: Schema.Array(CollectionAuthorityIdSchema),
});
const OracleDeltaCertificateSchema = Schema.Struct({
  formatVersion: Schema.Literal(CERTIFICATE_FORMAT_VERSION),
  baseline: Schema.Struct({
    path: Schema.Literal(EFFECT3_BASELINE_PATH),
    artifact: ArtifactDigestSchema,
  }),
  candidate: ArtifactDigestSchema,
  delta: Schema.Struct({
    algorithm: Schema.Literal(DELTA_ALGORITHM),
    totalCount: NonNegativeIntegerSchema,
    identitySha256: HashSchema,
    identities: Schema.Array(ReviewedOracleDeltaIdentitySchema),
    reviewedReasons: Schema.Array(ReviewedReasonEvidenceSchema),
    collectionAuthorities: Schema.Array(CollectionAuthorityEvidenceSchema),
    arrayComparisonAuthorities: Schema.Array(
      ArrayComparisonAuthorityEvidenceSchema,
    ),
  }),
});

export type OracleDeltaCertificate = Schema.Schema.Type<
  typeof OracleDeltaCertificateSchema
>;
export type ReviewedOracleDeltaIdentity = Schema.Schema.Type<
  typeof ReviewedOracleDeltaIdentitySchema
>;
export type CollectionAuthorityEvidence = Schema.Schema.Type<
  typeof CollectionAuthorityEvidenceSchema
>;
export type ArrayComparisonAuthorityEvidence = Schema.Schema.Type<
  typeof ArrayComparisonAuthorityEvidenceSchema
>;

export type OracleDeltaEvidence = {
  readonly baseline: { readonly byteLength: number; readonly sha256: string };
  readonly candidate: { readonly byteLength: number; readonly sha256: string };
  readonly delta: {
    readonly totalCount: number;
    readonly identitySha256: string;
    readonly identities: readonly OracleDelta[];
    readonly collectionAuthorities: readonly CollectionAuthorityEvidence[];
    readonly arrayComparisonAuthorities: readonly ArrayComparisonAuthorityEvidence[];
  };
};

export type OracleDeltaIssue =
  | { readonly kind: "baseline-unreadable"; readonly message: string }
  | { readonly kind: "certificate-unreadable"; readonly message: string }
  | { readonly kind: "certificate-digest-mismatch"; readonly message: string }
  | { readonly kind: "certificate-invalid"; readonly message: string }
  | { readonly kind: "invalid-collection-authority"; readonly message: string }
  | { readonly kind: "duplicate-delta-site"; readonly site: string }
  | { readonly kind: "production-authority-override"; readonly message: string }
  | { readonly kind: "baseline-certificate-stale"; readonly message: string }
  | { readonly kind: "candidate-certificate-stale"; readonly message: string }
  | { readonly kind: "delta-certificate-stale"; readonly message: string }
  | { readonly kind: "collection-certificate-stale"; readonly message: string }
  | {
      readonly kind: "array-comparison-certificate-stale";
      readonly message: string;
    }
  | {
      readonly kind: "reviewed-reason-certificate-stale";
      readonly message: string;
    };

export type OracleDeltaVerificationResult =
  | { readonly tag: "verified"; readonly evidence: OracleDeltaEvidence }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] };

type ArrayCollectionAuthoritySpec = {
  readonly id: CollectionAuthorityId;
  readonly reasonId: ReviewedReasonId;
  readonly mode: "array-keyed-with-order-authority";
  readonly segments: readonly string[];
  readonly keyField: "name" | "path";
};
type ObjectCollectionAuthoritySpec = {
  readonly id: CollectionAuthorityId;
  readonly reasonId: ReviewedReasonId;
  readonly mode: "object-keyed-with-explicit-order-authority";
  readonly segments: readonly string[];
  readonly orderSegments: readonly string[];
};
type CollectionAuthoritySpec =
  | ArrayCollectionAuthoritySpec
  | ObjectCollectionAuthoritySpec;

const COLLECTION_AUTHORITY_SPECS: readonly CollectionAuthoritySpec[] = [
  {
    id: "mcp-registered-tools",
    reasonId: "mcp-registration-contract-migration",
    mode: "object-keyed-with-explicit-order-authority",
    segments: ["mcp", "registered"],
    orderSegments: ["mcp", "registeredOrder"],
  },
  {
    id: "mcp-authenticated-advertised-tools",
    reasonId: "mcp-authenticated-contract-migration",
    mode: "object-keyed-with-explicit-order-authority",
    segments: ["mcp", "authenticatedProjection", "advertised"],
    orderSegments: ["mcp", "authenticatedProjection", "advertisedOrder"],
  },
  {
    id: "mcp-default-stdio-tools",
    reasonId: "mcp-protocol-contract-migration",
    mode: "array-keyed-with-order-authority",
    segments: ["mcp", "protocolEntrypoints", "defaultStdio", "toolsList"],
    keyField: "name",
  },
  {
    id: "mcp-http-without-oauth-tools",
    reasonId: "mcp-protocol-contract-migration",
    mode: "array-keyed-with-order-authority",
    segments: ["mcp", "protocolEntrypoints", "httpWithoutOAuth", "toolsList"],
    keyField: "name",
  },
  {
    id: "surface-publication-artifacts",
    reasonId: "surface-publication-contract-convergence",
    mode: "array-keyed-with-order-authority",
    segments: ["surface", "publication"],
    keyField: "path",
  },
  {
    id: "surface-content-artifacts",
    reasonId: "surface-authored-contract-convergence",
    mode: "array-keyed-with-order-authority",
    segments: ["surface", "content"],
    keyField: "path",
  },
  {
    id: "raw-swarm-artifacts",
    reasonId: "raw-swarm-effect-runtime-artifacts",
    mode: "array-keyed-with-order-authority",
    segments: ["rawSwarm", "artifacts"],
    keyField: "path",
  },
];

type PreparedArrayCollection = {
  readonly spec: ArrayCollectionAuthoritySpec;
  readonly baselineByKey: ReadonlyMap<string, BaselineJsonValue>;
  readonly candidateByKey: ReadonlyMap<string, BaselineJsonValue>;
};

const IDENTITY_COLLECTION_KEY_FIELDS = ["id", "name", "path"] as const;
type IdentityCollectionKeyField =
  (typeof IDENTITY_COLLECTION_KEY_FIELDS)[number];

const CATALOG_UNIT_KINDS = [
  "armor",
  "background",
  "class",
  "class_feature",
  "feat",
  "mastery",
  "shield",
  "species",
  "species_trait",
  "spell",
  "subclass",
  "weapon",
] as const;

type ArrayComparisonMode =
  | {
      readonly mode: "keyed-with-order-authority";
      readonly prepared: PreparedArrayCollection;
    }
  | { readonly mode: "explicit-order-authority" }
  | {
      readonly mode: "positional-identity-sequence";
      readonly contract:
        | "mcp-catalog-unit-response-order"
        | "persisted-operation-log-order";
    }
  | { readonly mode: "positional-value-sequence" }
  | {
      readonly mode: "undeclared-identity-collection";
      readonly keyField: IdentityCollectionKeyField;
    };
type AdmittedArrayComparisonMode = Exclude<
  ArrayComparisonMode,
  { readonly mode: "undeclared-identity-collection" }
>;

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const sameSegments = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((segment, index) => segment === right[index]);

const escapePointerSegment = (segment: string): string =>
  segment.replaceAll("~", "~0").replaceAll("/", "~1");

export const oracleDeltaSite = (segments: readonly string[]): string =>
  `/${segments.map(escapePointerSegment).join("/")}`;

const presentSha256 = (value: BaselineJsonValue): string =>
  sha256(canonicalBaselineJson(value));

const isRecord = (
  value: BaselineJsonValue,
): value is { readonly [key: string]: BaselineJsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const arrayHasIdentityField = (
  value: BaselineJsonValue,
  keyField: IdentityCollectionKeyField,
): boolean =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (member) =>
      isRecord(member) &&
      typeof member[keyField] === "string" &&
      member[keyField].length > 0,
  );

const positionalIdentitySequenceContract = (
  segments: readonly string[],
):
  | "mcp-catalog-unit-response-order"
  | "persisted-operation-log-order"
  | undefined => {
  if (
    segments.length === 8 &&
    segments[0] === "mcp" &&
    segments[1] === "protocolEntrypoints" &&
    (segments[2] === "defaultStdio" || segments[2] === "httpWithoutOAuth") &&
    segments[3] === "representativeCallResponses" &&
    segments[4] === "listCatalogUnits" &&
    segments[5] === "structuredContent" &&
    segments[6] === "unitsByKind" &&
    CATALOG_UNIT_KINDS.some((kind) => kind === segments[7])
  ) {
    return "mcp-catalog-unit-response-order";
  }
  if (
    segments.length === 5 &&
    segments[0] === "persistence" &&
    segments[1] === "fixtures" &&
    (segments[2] === "guest" || segments[2] === "saved") &&
    segments[3] === "value" &&
    segments[4] === "operations"
  ) {
    return "persisted-operation-log-order";
  }
  return undefined;
};

const arrayComparisonMode = (
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
  segments: readonly string[],
  preparedArrays: readonly PreparedArrayCollection[],
): ArrayComparisonMode => {
  const prepared = preparedArrays.find(({ spec }) =>
    sameSegments(spec.segments, segments),
  );
  if (prepared !== undefined) {
    return { mode: "keyed-with-order-authority", prepared };
  }
  if (
    COLLECTION_AUTHORITY_SPECS.some(
      (spec) =>
        spec.mode === "object-keyed-with-explicit-order-authority" &&
        sameSegments(spec.orderSegments, segments),
    )
  ) {
    return { mode: "explicit-order-authority" };
  }
  const positionalContract = positionalIdentitySequenceContract(segments);
  if (positionalContract !== undefined) {
    return {
      mode: "positional-identity-sequence",
      contract: positionalContract,
    };
  }
  const undeclaredKeyField = IDENTITY_COLLECTION_KEY_FIELDS.find(
    (keyField) =>
      arrayHasIdentityField(baseline, keyField) ||
      arrayHasIdentityField(candidate, keyField),
  );
  return undeclaredKeyField === undefined
    ? { mode: "positional-value-sequence" }
    : {
        mode: "undeclared-identity-collection",
        keyField: undeclaredKeyField,
      };
};

const arrayComparisonAuthorityId = (
  mode: AdmittedArrayComparisonMode,
): ArrayComparisonAuthorityId =>
  Match.value(mode).pipe(
    Match.when(
      { mode: "keyed-with-order-authority" },
      () => "keyed-with-order-authority" as const,
    ),
    Match.when(
      { mode: "explicit-order-authority" },
      () => "explicit-order-authority" as const,
    ),
    Match.when(
      { mode: "positional-identity-sequence" },
      ({ contract }) => contract,
    ),
    Match.when(
      { mode: "positional-value-sequence" },
      () => "positional-value-sequence-v1" as const,
    ),
    Match.exhaustive,
  );

function inventoryArrayComparisonSites(
  value: BaselineJsonValue,
  segments: readonly string[],
  preparedArrays: readonly PreparedArrayCollection[],
  sitesByAuthority: Map<ArrayComparisonAuthorityId, Set<string>>,
  issues: OracleDeltaIssue[],
): void {
  if (Array.isArray(value)) {
    const mode = arrayComparisonMode(value, value, segments, preparedArrays);
    if (mode.mode === "undeclared-identity-collection") {
      const message = `${oracleDeltaSite(segments)} has undeclared ${mode.keyField}-keyed collection semantics`;
      if (
        !issues.some(
          (issue) =>
            issue.kind === "invalid-collection-authority" &&
            issue.message === message,
        )
      ) {
        issues.push({ kind: "invalid-collection-authority", message });
      }
      return;
    }
    const authorityId = arrayComparisonAuthorityId(mode);
    const sites = sitesByAuthority.get(authorityId) ?? new Set<string>();
    sites.add(oracleDeltaSite(segments));
    sitesByAuthority.set(authorityId, sites);
    value.forEach((member, index) => {
      const childSegment =
        mode.mode === "keyed-with-order-authority" && isRecord(member)
          ? `@${mode.prepared.spec.keyField}=${String(
              member[mode.prepared.spec.keyField],
            )}`
          : String(index);
      inventoryArrayComparisonSites(
        member,
        [...segments, childSegment],
        preparedArrays,
        sitesByAuthority,
        issues,
      );
    });
    return;
  }
  if (isRecord(value)) {
    Object.keys(value).forEach((key) =>
      inventoryArrayComparisonSites(
        value[key]!,
        [...segments, key],
        preparedArrays,
        sitesByAuthority,
        issues,
      ),
    );
  }
}

const valueAtSegments = (
  value: BaselineJsonValue,
  segments: readonly string[],
): BaselineJsonValue | undefined => {
  let cursor: BaselineJsonValue = value;
  for (const segment of segments) {
    if (!isRecord(cursor) || !Object.hasOwn(cursor, segment)) return undefined;
    cursor = cursor[segment]!;
  }
  return cursor;
};

const collectionSideEvidence = (
  orderedKeys: readonly string[],
): CollectionAuthorityEvidence["baseline"] => ({
  count: orderedKeys.length,
  membershipSha256: sha256(
    canonicalBaselineJson(
      [...orderedKeys].sort(compareUnicodeCodePointStrings),
    ),
  ),
  memberOrderSha256: sha256(canonicalBaselineJson(orderedKeys)),
});

const arrayEntriesByKey = (
  value: BaselineJsonValue,
  spec: ArrayCollectionAuthoritySpec,
):
  | {
      readonly tag: "valid";
      readonly orderedKeys: readonly string[];
      readonly entries: ReadonlyMap<string, BaselineJsonValue>;
    }
  | { readonly tag: "invalid"; readonly message: string } => {
  if (!Array.isArray(value)) {
    return { tag: "invalid", message: `${spec.id} must be an array` };
  }
  const entries = new Map<string, BaselineJsonValue>();
  const orderedKeys: string[] = [];
  for (const member of value) {
    if (!isRecord(member)) {
      return {
        tag: "invalid",
        message: `${spec.id} member lacks non-empty ${spec.keyField}`,
      };
    }
    const key = member[spec.keyField];
    if (typeof key !== "string" || key.length === 0) {
      return {
        tag: "invalid",
        message: `${spec.id} member lacks non-empty ${spec.keyField}`,
      };
    }
    if (entries.has(key)) {
      return { tag: "invalid", message: `${spec.id} repeats key ${key}` };
    }
    entries.set(key, member);
    orderedKeys.push(key);
  }
  return { tag: "valid", entries, orderedKeys };
};

const objectOrderedKeys = (
  root: BaselineJsonValue,
  spec: ObjectCollectionAuthoritySpec,
):
  | { readonly tag: "absent" }
  | { readonly tag: "valid"; readonly orderedKeys: readonly string[] }
  | { readonly tag: "invalid"; readonly message: string } => {
  const collection = valueAtSegments(root, spec.segments);
  const order = valueAtSegments(root, spec.orderSegments);
  if (collection === undefined && order === undefined) return { tag: "absent" };
  if (
    collection === undefined ||
    !isRecord(collection) ||
    !Array.isArray(order)
  ) {
    return {
      tag: "invalid",
      message: `${spec.id} must have an object collection and explicit order`,
    };
  }
  if (!order.every((key): key is string => typeof key === "string")) {
    return {
      tag: "invalid",
      message: `${spec.id} order must contain only string keys`,
    };
  }
  const uniqueOrder = new Set(order);
  const objectKeys = Object.keys(collection);
  if (
    uniqueOrder.size !== order.length ||
    uniqueOrder.size !== objectKeys.length ||
    objectKeys.some((key) => !uniqueOrder.has(key))
  ) {
    return {
      tag: "invalid",
      message: `${spec.id} order must name every collection key exactly once`,
    };
  }
  return { tag: "valid", orderedKeys: order };
};

function prepareCollectionAuthorities(
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
):
  | {
      readonly tag: "valid";
      readonly evidence: readonly CollectionAuthorityEvidence[];
      readonly arrays: readonly PreparedArrayCollection[];
    }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] } {
  const evidence: CollectionAuthorityEvidence[] = [];
  const arrays: PreparedArrayCollection[] = [];
  const issues: OracleDeltaIssue[] = [];
  for (const spec of COLLECTION_AUTHORITY_SPECS) {
    if (spec.mode === "array-keyed-with-order-authority") {
      const baselineValue = valueAtSegments(baseline, spec.segments);
      const candidateValue = valueAtSegments(candidate, spec.segments);
      if (baselineValue === undefined && candidateValue === undefined) continue;
      if (baselineValue === undefined || candidateValue === undefined) {
        issues.push({
          kind: "invalid-collection-authority",
          message: `${spec.id} collection is absent on one side`,
        });
        continue;
      }
      const baselineEntries = arrayEntriesByKey(baselineValue, spec);
      const candidateEntries = arrayEntriesByKey(candidateValue, spec);
      if (baselineEntries.tag === "invalid") {
        issues.push({
          kind: "invalid-collection-authority",
          message: baselineEntries.message,
        });
        continue;
      }
      if (candidateEntries.tag === "invalid") {
        issues.push({
          kind: "invalid-collection-authority",
          message: candidateEntries.message,
        });
        continue;
      }
      evidence.push({
        id: spec.id,
        reasonId: spec.reasonId,
        baseline: collectionSideEvidence(baselineEntries.orderedKeys),
        candidate: collectionSideEvidence(candidateEntries.orderedKeys),
      });
      arrays.push({
        spec,
        baselineByKey: baselineEntries.entries,
        candidateByKey: candidateEntries.entries,
      });
      continue;
    }
    const baselineKeys = objectOrderedKeys(baseline, spec);
    const candidateKeys = objectOrderedKeys(candidate, spec);
    if (baselineKeys.tag === "absent" && candidateKeys.tag === "absent") {
      continue;
    }
    if (baselineKeys.tag !== "valid" || candidateKeys.tag !== "valid") {
      issues.push({
        kind: "invalid-collection-authority",
        message:
          baselineKeys.tag === "invalid"
            ? baselineKeys.message
            : candidateKeys.tag === "invalid"
              ? candidateKeys.message
              : `${spec.id} collection is absent on one side`,
      });
      continue;
    }
    evidence.push({
      id: spec.id,
      reasonId: spec.reasonId,
      baseline: collectionSideEvidence(baselineKeys.orderedKeys),
      candidate: collectionSideEvidence(candidateKeys.orderedKeys),
    });
  }
  return issues.length === 0
    ? { tag: "valid", evidence, arrays }
    : { tag: "invalid", issues };
}

function collectOracleDeltas(
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
  segments: readonly string[],
  deltas: OracleDelta[],
  preparedArrays: readonly PreparedArrayCollection[],
  issues: OracleDeltaIssue[],
): void {
  const comparisonMode = arrayComparisonMode(
    baseline,
    candidate,
    segments,
    preparedArrays,
  );
  if (comparisonMode.mode === "undeclared-identity-collection") {
    issues.push({
      kind: "invalid-collection-authority",
      message: `${oracleDeltaSite(segments)} has undeclared ${comparisonMode.keyField}-keyed collection semantics`,
    });
    return;
  }
  if (comparisonMode.mode === "explicit-order-authority") return;
  if (comparisonMode.mode === "keyed-with-order-authority") {
    const { prepared } = comparisonMode;
    const keys = [
      ...new Set([
        ...prepared.baselineByKey.keys(),
        ...prepared.candidateByKey.keys(),
      ]),
    ].sort(compareUnicodeCodePointStrings);
    for (const key of keys) {
      const childSegments = [...segments, `@${prepared.spec.keyField}=${key}`];
      const baselineMember = prepared.baselineByKey.get(key);
      const candidateMember = prepared.candidateByKey.get(key);
      if (baselineMember === undefined && candidateMember !== undefined) {
        deltas.push({
          operation: "added",
          segments: childSegments,
          candidateSha256: presentSha256(candidateMember),
        });
      } else if (
        baselineMember !== undefined &&
        candidateMember === undefined
      ) {
        deltas.push({
          operation: "removed",
          segments: childSegments,
          baselineSha256: presentSha256(baselineMember),
        });
      } else if (
        baselineMember !== undefined &&
        candidateMember !== undefined
      ) {
        collectOracleDeltas(
          baselineMember,
          candidateMember,
          childSegments,
          deltas,
          preparedArrays,
          issues,
        );
      }
    }
    return;
  }
  if (Array.isArray(baseline) && Array.isArray(candidate)) {
    const sharedLength = Math.min(baseline.length, candidate.length);
    for (let index = 0; index < sharedLength; index += 1) {
      collectOracleDeltas(
        baseline[index]!,
        candidate[index]!,
        [...segments, String(index)],
        deltas,
        preparedArrays,
        issues,
      );
    }
    for (let index = sharedLength; index < baseline.length; index += 1) {
      deltas.push({
        operation: "removed",
        segments: [...segments, String(index)],
        baselineSha256: presentSha256(baseline[index]!),
      });
    }
    for (let index = sharedLength; index < candidate.length; index += 1) {
      deltas.push({
        operation: "added",
        segments: [...segments, String(index)],
        candidateSha256: presentSha256(candidate[index]!),
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
          segments: childSegments,
          candidateSha256: presentSha256(candidate[key]!),
        });
      } else if (!inCandidate) {
        deltas.push({
          operation: "removed",
          segments: childSegments,
          baselineSha256: presentSha256(baseline[key]!),
        });
      } else {
        collectOracleDeltas(
          baseline[key]!,
          candidate[key]!,
          childSegments,
          deltas,
          preparedArrays,
          issues,
        );
      }
    }
    return;
  }
  if (canonicalBaselineJson(baseline) !== canonicalBaselineJson(candidate)) {
    deltas.push({
      operation: "changed",
      segments,
      baselineSha256: presentSha256(baseline),
      candidateSha256: presentSha256(candidate),
    });
  }
}

const deltaIdentity = (delta: OracleDelta): string =>
  canonicalBaselineJson(delta);

export function summarizeOracleDeltas(deltas: readonly OracleDelta[]):
  | {
      readonly tag: "summarized";
      readonly totalCount: number;
      readonly identitySha256: string;
      readonly identities: readonly OracleDelta[];
    }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] } {
  const sites = new Set<string>();
  const issues: OracleDeltaIssue[] = [];
  for (const delta of deltas) {
    const site = oracleDeltaSite(delta.segments);
    if (sites.has(site)) {
      issues.push({ kind: "duplicate-delta-site", site });
    } else {
      sites.add(site);
    }
  }
  if (issues.length > 0) return { tag: "invalid", issues };
  const identities = [...deltas].sort((left, right) =>
    compareUnicodeCodePointStrings(deltaIdentity(left), deltaIdentity(right)),
  );
  return {
    tag: "summarized",
    totalCount: identities.length,
    identitySha256: sha256(identities.map(deltaIdentity).join("")),
    identities,
  };
}

export function calculateOracleDeltaEvidence(
  baseline: BaselineJsonValue,
  candidate: BaselineJsonValue,
):
  | { readonly tag: "evidence"; readonly value: OracleDeltaEvidence }
  | { readonly tag: "invalid"; readonly issues: readonly OracleDeltaIssue[] } {
  const collections = prepareCollectionAuthorities(baseline, candidate);
  if (collections.tag === "invalid") return collections;
  const deltas: OracleDelta[] = [];
  const issues: OracleDeltaIssue[] = [];
  const arrayComparisonSites = new Map<
    ArrayComparisonAuthorityId,
    Set<string>
  >();
  inventoryArrayComparisonSites(
    baseline,
    [],
    collections.arrays,
    arrayComparisonSites,
    issues,
  );
  inventoryArrayComparisonSites(
    candidate,
    [],
    collections.arrays,
    arrayComparisonSites,
    issues,
  );
  if (issues.length > 0) return { tag: "invalid", issues };
  collectOracleDeltas(
    baseline,
    candidate,
    [],
    deltas,
    collections.arrays,
    issues,
  );
  if (issues.length > 0) return { tag: "invalid", issues };
  const summarized = summarizeOracleDeltas(deltas);
  if (summarized.tag === "invalid") return summarized;
  const baselineBytes = canonicalBaselineJson(baseline);
  const candidateBytes = canonicalBaselineJson(candidate);
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
      delta: {
        totalCount: summarized.totalCount,
        identitySha256: summarized.identitySha256,
        identities: summarized.identities,
        collectionAuthorities: collections.evidence,
        arrayComparisonAuthorities: ARRAY_COMPARISON_AUTHORITY_IDS.flatMap(
          (id) => {
            const sites = [...(arrayComparisonSites.get(id) ?? [])].sort(
              compareUnicodeCodePointStrings,
            );
            return sites.length === 0
              ? []
              : [
                  {
                    id,
                    siteCount: sites.length,
                    siteSha256: sha256(canonicalBaselineJson(sites)),
                  },
                ];
          },
        ),
      },
    },
  };
}

export const decodeOracleDeltaCertificate = (value: unknown) =>
  Schema.decodeUnknownResult(OracleDeltaCertificateSchema, {
    onExcessProperty: "error",
  })(value);

const same = (left: unknown, right: unknown): boolean =>
  canonicalBaselineJson(left) === canonicalBaselineJson(right);

export function calculateReviewedReasonEvidence(
  identities: readonly ReviewedOracleDeltaIdentity[],
  collectionAuthorities: readonly CollectionAuthorityEvidence[],
): OracleDeltaCertificate["delta"]["reviewedReasons"] {
  return REVIEWED_REASON_IDS.flatMap((id) => {
    const reasonIdentities = identities.filter(
      ({ reasonId }) => reasonId === id,
    );
    const changedCollectionAuthorityIds = collectionAuthorities
      .filter(
        (authority) =>
          authority.reasonId === id &&
          !same(authority.baseline, authority.candidate),
      )
      .map(({ id: authorityId }) => authorityId)
      .sort(compareUnicodeCodePointStrings);
    if (
      reasonIdentities.length === 0 &&
      changedCollectionAuthorityIds.length === 0
    ) {
      return [];
    }
    const deltaIdentities = reasonIdentities
      .map(({ delta }) => deltaIdentity(delta))
      .sort(compareUnicodeCodePointStrings);
    const sites = reasonIdentities
      .map(({ delta }) => oracleDeltaSite(delta.segments))
      .sort(compareUnicodeCodePointStrings);
    return [
      {
        id,
        deltaCount: reasonIdentities.length,
        deltaIdentitySha256: sha256(deltaIdentities.join("")),
        siteSha256: sha256(canonicalBaselineJson(sites)),
        operations: {
          added: reasonIdentities.filter(
            ({ delta }) => delta.operation === "added",
          ).length,
          removed: reasonIdentities.filter(
            ({ delta }) => delta.operation === "removed",
          ).length,
          changed: reasonIdentities.filter(
            ({ delta }) => delta.operation === "changed",
          ).length,
        },
        changedCollectionAuthorityIds,
      },
    ];
  });
}

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
  const reviewedDeltas = certificate.delta.identities.map(({ delta }) => delta);
  if (
    certificate.delta.totalCount !== evidence.delta.totalCount ||
    certificate.delta.identitySha256 !== evidence.delta.identitySha256 ||
    !same(reviewedDeltas, evidence.delta.identities)
  ) {
    issues.push({
      kind: "delta-certificate-stale",
      message: "exact reviewed delta identities do not match the observation",
    });
  }
  if (
    !same(
      certificate.delta.collectionAuthorities,
      evidence.delta.collectionAuthorities,
    )
  ) {
    issues.push({
      kind: "collection-certificate-stale",
      message:
        "collection membership or ordered-key authority does not match the observation",
    });
  }
  if (
    !same(
      certificate.delta.arrayComparisonAuthorities,
      evidence.delta.arrayComparisonAuthorities,
    )
  ) {
    issues.push({
      kind: "array-comparison-certificate-stale",
      message:
        "array comparison mode site-set authority does not match the observation",
    });
  }
  if (
    !same(
      certificate.delta.reviewedReasons,
      calculateReviewedReasonEvidence(
        certificate.delta.identities,
        certificate.delta.collectionAuthorities,
      ),
    )
  ) {
    issues.push({
      kind: "reviewed-reason-certificate-stale",
      message:
        "reviewed reason counts, sites, operations, or identity hashes are stale",
    });
  }
  return issues;
}

function decodePinnedCertificateBytes(
  bytes: Uint8Array,
):
  | { readonly tag: "valid"; readonly certificate: OracleDeltaCertificate }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
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
      JSON.parse(Buffer.from(bytes).toString("utf8")),
    );
    return Result.isSuccess(decoded)
      ? { tag: "valid", certificate: decoded.success }
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

function readBaseline():
  | {
      readonly tag: "valid";
      readonly value: BaselineJsonValue;
      readonly artifact: {
        readonly byteLength: number;
        readonly sha256: string;
      };
    }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  try {
    const bytes = readRegularRepositoryFile(EFFECT3_BASELINE_PATH);
    return {
      tag: "valid",
      value: normalizeJsonValue(
        JSON.parse(Buffer.from(bytes).toString("utf8")),
      ),
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
  | { readonly tag: "valid"; readonly certificate: OracleDeltaCertificate }
  | { readonly tag: "invalid"; readonly issue: OracleDeltaIssue } {
  try {
    const bytes = readRegularRepositoryFile(
      EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH,
    );
    return decodePinnedCertificateBytes(bytes);
  } catch (error) {
    return {
      tag: "invalid",
      issue: {
        kind: "certificate-unreadable",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
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
  if (arguments.length > 0) {
    return {
      tag: "invalid",
      issues: [
        {
          kind: "production-authority-override",
          message: "production verification accepts only pinned authority",
        },
      ],
    };
  }
  const certificate = readCertificate();
  if (certificate.tag === "invalid") {
    return { tag: "invalid", issues: [certificate.issue] };
  }
  const evidence = await captureOracleDeltaEvidence();
  if (evidence.tag === "invalid") return evidence;
  const issues = compareOracleDeltaCertificate(
    certificate.certificate,
    evidence.value,
  );
  return issues.length === 0
    ? { tag: "verified", evidence: evidence.value }
    : { tag: "invalid", issues };
}

export function describeOracleDeltaIssue(issue: OracleDeltaIssue): string {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "duplicate-delta-site" },
      ({ site }) => `duplicate delta site at ${site}`,
    ),
    Match.when(
      {
        kind: Match.is(
          "baseline-unreadable",
          "certificate-unreadable",
          "certificate-digest-mismatch",
          "certificate-invalid",
          "invalid-collection-authority",
          "production-authority-override",
          "baseline-certificate-stale",
          "candidate-certificate-stale",
          "delta-certificate-stale",
          "collection-certificate-stale",
          "array-comparison-certificate-stale",
          "reviewed-reason-certificate-stale",
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
      `Effect 4 finite oracle delta verified (${result.evidence.delta.totalCount} reviewed identities).`,
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
