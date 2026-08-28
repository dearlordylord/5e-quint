import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  decodeSrdSurfaceEither,
  formatSurfaceDecodeError,
} from "@dnd/surface/surface/schema";
import type { SrdSurface } from "@dnd/surface/surface/types";

import {
  buildOracleEvaluationServicesFromSurface,
  type OracleEvaluationServicesBuildIssues,
} from "./oracle-catalog-services.ts";
import {
  evaluateOracleBatchJson,
  type OracleBatchOperation,
} from "./oracle-batch-operation.ts";
import {
  makeOracleBatchOperationInternal,
  type OracleBatchEvaluator,
} from "./oracle-batch-operation-internal.ts";
import {
  parseJsonWithDuplicateDetection,
  type OracleDecodeIssues,
} from "./oracle-decode.ts";
import {
  DistributionIdSchema,
  OracleIdentityResponseSchema,
  type DistributionId,
  type OracleIdentityResponse,
} from "./oracle-process-contract.ts";
import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_FILE_NAMES,
  ORACLE_PUBLICATION_MEMBERS,
  type OraclePublicationMember,
} from "./oracle-publication.ts";
import type { OracleEvaluationServices } from "./oracle-evaluation.ts";
import { encodeOracleStartupSurface } from "./oracle-startup-catalog.ts";

/** The only files in a source-free Oracle distribution root. */
export const ORACLE_DISTRIBUTION_FILE_NAMES = {
  executable: "oracle.mjs",
  identity: "oracle-identity.json",
  projection: "oracle-startup-surface.json",
} as const;

export const ORACLE_DISTRIBUTION_FORMAT = "opaque-oracle-distribution-v1";

export type OracleDistributionPayload = {
  readonly executable: Uint8Array;
  readonly schemas: Readonly<Record<OraclePublicationMember, Uint8Array>>;
  readonly projection: Uint8Array;
};

const oracleApplicationBrand: unique symbol = Symbol("OracleApplication");

/** Loader-created application; the private brand prevents identity/service pairing by callers. */
export type OracleApplication = {
  readonly [oracleApplicationBrand]: true;
  readonly identity: OracleIdentityResponse;
  readonly projection: SrdSurface;
  readonly services: OracleEvaluationServices;
  readonly evaluateJson: (rawJson: string) => ReturnType<OracleBatchOperation>;
};

/**
 * Compose a test-only application at the same boundary as distribution
 * loading. The replacement operation receives the original identity,
 * projection, and services through one newly branded application value.
 *
 * This leaf export is intentionally omitted from the package barrel; it is
 * only for package-owned defect and adapter tests.
 */
export function withOracleBatchEvaluatorForTest(
  application: OracleApplication,
  evaluator: OracleBatchEvaluator,
): OracleApplication {
  const operation = makeOracleBatchOperationInternal(evaluator);
  const composed: OracleApplication = Object.freeze({
    [oracleApplicationBrand]: true,
    identity: application.identity,
    projection: application.projection,
    services: application.services,
    evaluateJson: (rawJson: string) =>
      operation({ application: composed, rawJson }),
  });
  return composed;
}

export type OracleApplicationBuildIssue =
  | {
      readonly tag: "projectionJson";
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "projectionSchema";
      readonly message: string;
    }
  | {
      readonly tag: "projectionCanonicality";
    }
  | {
      readonly tag: "projectionCatalog";
      readonly issues: OracleEvaluationServicesBuildIssues;
    };

export type OracleDistributionLoadIssue =
  | {
      readonly tag: "unexpectedAsset";
      readonly name: string;
    }
  | {
      readonly tag: "assetType";
      readonly name: string;
    }
  | {
      readonly tag: "assetRead";
      readonly name: string;
      readonly message: string;
    }
  | {
      readonly tag: "identityDecode";
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "identityCanonicality";
    }
  | {
      readonly tag: "identityMismatch";
      readonly expected: DistributionId;
      readonly actual: DistributionId;
    }
  | {
      readonly tag: "schemaMismatch";
      readonly member: OraclePublicationMember;
    }
  | {
      readonly tag: "applicationBuild";
      readonly issue: OracleApplicationBuildIssue;
    };

export type OracleDistributionLoadResult = Either.Either<
  OracleApplication,
  OracleDistributionLoadIssue
>;

const frameLengthBytes = 8;
const frameHeaderBytes = frameLengthBytes * 2;

/**
 * Compute the identity over named, length-framed semantic payloads. Identity
 * metadata is deliberately absent from this input so it cannot self-reference.
 */
export function computeOracleDistributionId(
  payload: OracleDistributionPayload,
): DistributionId {
  const hash = createHash("sha256");
  hash.update(Buffer.from(`${ORACLE_DISTRIBUTION_FORMAT}\0`, "utf8"));
  updateHashFrame(hash, "executable", payload.executable);
  for (const member of ORACLE_PUBLICATION_MEMBERS) {
    updateHashFrame(
      hash,
      `schema/${ORACLE_PUBLICATION_FILE_NAMES[member]}`,
      payload.schemas[member],
    );
  }
  updateHashFrame(hash, "startup-projection", payload.projection);
  return Schema.decodeUnknownSync(DistributionIdSchema)(
    `sha256:${hash.digest("hex")}`,
  );
}

function updateHashFrame(
  hash: ReturnType<typeof createHash>,
  name: string,
  bytes: Uint8Array,
): void {
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(frameHeaderBytes);
  header.writeBigUInt64BE(BigInt(nameBytes.byteLength), 0);
  header.writeBigUInt64BE(BigInt(bytes.byteLength), frameLengthBytes);
  hash.update(header);
  hash.update(nameBytes);
  hash.update(bytes);
}

/** The narrow metadata file contains only the identity response value. */
export function serializeOracleDistributionIdentity(
  identity: OracleIdentityResponse,
): Buffer {
  return Buffer.from(`${JSON.stringify(identity)}\n`, "utf8");
}

/**
 * Decode and compose an application from one strict projection byte asset.
 * Catalog services are built from the decoded value, so evaluation cannot use
 * a catalog assembled from a different source or projection.
 */
function buildOracleApplicationFromProjection(input: {
  readonly distributionId: DistributionId;
  readonly projectionBytes: Uint8Array;
}): Either.Either<OracleApplication, OracleApplicationBuildIssue> {
  const parsed = parseProjectionJson(input.projectionBytes);
  if (Either.isLeft(parsed)) return Either.left(parsed.left);

  const decoded = decodeSrdSurfaceEither(parsed.right);
  if (Either.isLeft(decoded)) {
    return Either.left({
      tag: "projectionSchema",
      message: formatSurfaceDecodeError(decoded.left),
    });
  }
  const canonicalBytes = encodeOracleStartupSurface(decoded.right);
  if (!bytesEqual(canonicalBytes, input.projectionBytes)) {
    return Either.left({ tag: "projectionCanonicality" });
  }

  const services = buildOracleEvaluationServicesFromSurface(decoded.right);
  if (Either.isLeft(services)) {
    return Either.left({
      tag: "projectionCatalog",
      issues: services.left,
    });
  }

  const projection = deepFreeze(decoded.right);
  const identity = Object.freeze({
    distributionId: input.distributionId,
  });
  const servicesValue = deepFreeze(services.right);
  const application: OracleApplication = Object.freeze({
    [oracleApplicationBrand]: true,
    identity,
    projection,
    services: servicesValue,
    evaluateJson: (rawJson: string) =>
      evaluateOracleBatchJson({ application, rawJson }),
  });
  return Either.right(application);
}

function parseProjectionJson(
  bytes: Uint8Array,
): Either.Either<unknown, OracleApplicationBuildIssue> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return Either.left({
      tag: "projectionJson",
      issues: [{ path: "", code: "invalidJson" }],
    });
  }
  const parsed = parseJsonWithDuplicateDetection(text);
  return Either.isLeft(parsed)
    ? Either.left({ tag: "projectionJson", issues: parsed.left })
    : Either.right(parsed.right);
}

/** Load and verify a distribution root relative to its own executable/assets. */
export function loadOracleApplicationFromDirectory(input: {
  readonly directory: string;
}): OracleDistributionLoadResult {
  const directory = resolve(input.directory);
  const expectedNames = new Set<string>([
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
    ORACLE_DISTRIBUTION_FILE_NAMES.identity,
    ORACLE_DISTRIBUTION_FILE_NAMES.projection,
    ...ORACLE_PUBLICATION_MEMBERS.map(
      (member) => ORACLE_PUBLICATION_FILE_NAMES[member],
    ),
  ]);
  const entries = readDirectoryEntries(directory);
  if (Either.isLeft(entries)) return Either.left(entries.left);
  for (const entry of entries.right) {
    if (!expectedNames.has(entry.name)) {
      return Either.left({ tag: "unexpectedAsset", name: entry.name });
    }
  }

  const executable = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  );
  if (Either.isLeft(executable)) return Either.left(executable.left);
  const identity = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.identity,
  );
  if (Either.isLeft(identity)) return Either.left(identity.left);
  const projection = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  );
  if (Either.isLeft(projection)) return Either.left(projection.left);

  const schemas: Record<OraclePublicationMember, Uint8Array> = {
    case: new Uint8Array(0),
    trace: new Uint8Array(0),
    evaluationBatch: new Uint8Array(0),
  };
  for (const member of ORACLE_PUBLICATION_MEMBERS) {
    const artifact = readAsset(
      directory,
      ORACLE_PUBLICATION_FILE_NAMES[member],
    );
    if (Either.isLeft(artifact)) return Either.left(artifact.left);
    if (
      !bytesEqual(artifact.right, ORACLE_PUBLICATION_ARTIFACTS[member].bytes)
    ) {
      return Either.left({ tag: "schemaMismatch", member });
    }
    schemas[member] = artifact.right;
  }

  const decodedIdentity = decodeDistributionIdentity(identity.right);
  if (Either.isLeft(decodedIdentity)) return Either.left(decodedIdentity.left);
  const computed = computeOracleDistributionId({
    executable: executable.right,
    schemas,
    projection: projection.right,
  });
  if (computed !== decodedIdentity.right.distributionId) {
    return Either.left({
      tag: "identityMismatch",
      expected: decodedIdentity.right.distributionId,
      actual: computed,
    });
  }
  const application = buildOracleApplicationFromProjection({
    distributionId: computed,
    projectionBytes: projection.right,
  });
  if (Either.isLeft(application)) {
    return Either.left({ tag: "applicationBuild", issue: application.left });
  }
  return Either.right(application.right);
}

export function loadOracleApplicationFromExecutable(
  executablePath: string,
): OracleDistributionLoadResult {
  return loadOracleApplicationFromDirectory({
    directory: dirname(resolve(executablePath)),
  });
}

function readDirectoryEntries(
  directory: string,
): Either.Either<readonly Dirent[], OracleDistributionLoadIssue> {
  try {
    return Either.right(readdirSync(directory, { withFileTypes: true }));
  } catch (error) {
    return Either.left({
      tag: "assetRead",
      name: directory,
      message: String(error),
    });
  }
}

function readAsset(
  directory: string,
  name: string,
): Either.Either<Buffer, OracleDistributionLoadIssue> {
  const path = join(directory, name);
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return Either.left({ tag: "assetType", name });
    }
    return Either.right(readFileSync(path));
  } catch (error) {
    return Either.left({
      tag: "assetRead",
      name,
      message: String(error),
    });
  }
}

function decodeDistributionIdentity(
  bytes: Uint8Array,
): Either.Either<OracleIdentityResponse, OracleDistributionLoadIssue> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return Either.left({
      tag: "identityDecode",
      issues: [{ path: "", code: "invalidJson" }],
    });
  }
  const parsed = parseJsonWithDuplicateDetection(text);
  if (Either.isLeft(parsed)) {
    return Either.left({ tag: "identityDecode", issues: parsed.left });
  }
  const decoded = Schema.decodeUnknownEither(OracleIdentityResponseSchema, {
    errors: "all",
    onExcessProperty: "error",
  })(parsed.right);
  if (Either.isLeft(decoded)) {
    return Either.left({
      tag: "identityDecode",
      issues: [{ path: "", code: "wrongType" }],
    });
  }
  const canonical = serializeOracleDistributionIdentity(decoded.right);
  if (!bytesEqual(canonical, bytes)) {
    return Either.left({ tag: "identityCanonicality" });
  }
  return Either.right(decoded.right);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null) return value;
  if (ArrayBuffer.isView(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
