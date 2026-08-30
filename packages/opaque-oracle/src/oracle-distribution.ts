import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Result, Schema } from "effect";

import {
  decodeSrdSurfaceResult,
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

type Utf8DecodeIssue = {
  readonly tag: "invalidUtf8";
};

function decodeUtf8Total(
  bytes: Uint8Array,
): Result.Result<string, Utf8DecodeIssue> {
  try {
    return Result.succeed(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return Result.fail({ tag: "invalidUtf8" });
  }
}

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

export type OracleDistributionLoadResult = Result.Result<
  OracleApplication,
  OracleDistributionLoadIssue
>;

type OracleDistributionAssets = {
  readonly executable: Buffer;
  readonly identity: Buffer;
  readonly projection: Buffer;
  readonly schemas: Record<OraclePublicationMember, Uint8Array>;
};

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
}): Result.Result<OracleApplication, OracleApplicationBuildIssue> {
  const parsed = parseProjectionJson(input.projectionBytes);
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure);

  const decoded = decodeSrdSurfaceResult(parsed.success);
  if (Result.isFailure(decoded)) {
    return Result.fail({
      tag: "projectionSchema",
      message: formatSurfaceDecodeError(decoded.failure),
    });
  }
  const canonicalBytes = encodeOracleStartupSurface(decoded.success);
  if (!bytesEqual(canonicalBytes, input.projectionBytes)) {
    return Result.fail({ tag: "projectionCanonicality" });
  }

  const services = buildOracleEvaluationServicesFromSurface(decoded.success);
  if (Result.isFailure(services)) {
    return Result.fail({
      tag: "projectionCatalog",
      issues: services.failure,
    });
  }

  const projection = deepFreeze(decoded.success);
  const identity = Object.freeze({
    distributionId: input.distributionId,
  });
  const servicesValue = deepFreeze(services.success);
  const application: OracleApplication = Object.freeze({
    [oracleApplicationBrand]: true,
    identity,
    projection,
    services: servicesValue,
    evaluateJson: (rawJson: string) =>
      evaluateOracleBatchJson({ application, rawJson }),
  });
  return Result.succeed(application);
}

function parseProjectionJson(
  bytes: Uint8Array,
): Result.Result<unknown, OracleApplicationBuildIssue> {
  const text = decodeUtf8Total(bytes);
  if (Result.isFailure(text)) {
    return Result.fail({
      tag: "projectionJson",
      issues: [{ path: "", code: "invalidJson" }],
    });
  }
  const parsed = parseJsonWithDuplicateDetection(text.success);
  return Result.isFailure(parsed)
    ? Result.fail({ tag: "projectionJson", issues: parsed.failure })
    : Result.succeed(parsed.success);
}

/** Load and verify a distribution root relative to its own executable/assets. */
export function loadOracleApplicationFromDirectory(input: {
  readonly directory: string;
}): OracleDistributionLoadResult {
  const directory = resolve(input.directory);
  const assets = readDistributionAssets(directory);
  if (Result.isFailure(assets)) return Result.fail(assets.failure);
  const distributionId = verifyDistributionIdentity(assets.success);
  if (Result.isFailure(distributionId))
    return Result.fail(distributionId.failure);
  const application = buildOracleApplicationFromProjection({
    distributionId: distributionId.success,
    projectionBytes: assets.success.projection,
  });
  return Result.isFailure(application)
    ? Result.fail({ tag: "applicationBuild", issue: application.failure })
    : Result.succeed(application.success);
}

function readDistributionAssets(
  directory: string,
): Result.Result<OracleDistributionAssets, OracleDistributionLoadIssue> {
  const expectedNames = new Set<string>([
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
    ORACLE_DISTRIBUTION_FILE_NAMES.identity,
    ORACLE_DISTRIBUTION_FILE_NAMES.projection,
    ...ORACLE_PUBLICATION_MEMBERS.map(
      (member) => ORACLE_PUBLICATION_FILE_NAMES[member],
    ),
  ]);
  const entries = readDirectoryEntries(directory);
  if (Result.isFailure(entries)) return Result.fail(entries.failure);
  const unexpectedAsset = entries.success.find(
    (entry) => !expectedNames.has(entry.name),
  );
  if (unexpectedAsset !== undefined) {
    return Result.fail({ tag: "unexpectedAsset", name: unexpectedAsset.name });
  }

  const required = readRequiredDistributionAssets(directory);
  if (Result.isFailure(required)) return Result.fail(required.failure);

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
    if (Result.isFailure(artifact)) return Result.fail(artifact.failure);
    if (
      !bytesEqual(artifact.success, ORACLE_PUBLICATION_ARTIFACTS[member].bytes)
    ) {
      return Result.fail({ tag: "schemaMismatch", member });
    }
    schemas[member] = artifact.success;
  }

  return Result.succeed({
    ...required.success,
    schemas,
  });
}

function readRequiredDistributionAssets(
  directory: string,
): Result.Result<
  Pick<OracleDistributionAssets, "executable" | "identity" | "projection">,
  OracleDistributionLoadIssue
> {
  const executable = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  );
  if (Result.isFailure(executable)) return Result.fail(executable.failure);
  const identity = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.identity,
  );
  if (Result.isFailure(identity)) return Result.fail(identity.failure);
  const projection = readAsset(
    directory,
    ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  );
  if (Result.isFailure(projection)) return Result.fail(projection.failure);
  return Result.succeed({
    executable: executable.success,
    identity: identity.success,
    projection: projection.success,
  });
}

function verifyDistributionIdentity(
  assets: OracleDistributionAssets,
): Result.Result<DistributionId, OracleDistributionLoadIssue> {
  const decodedIdentity = decodeDistributionIdentity(assets.identity);
  if (Result.isFailure(decodedIdentity))
    return Result.fail(decodedIdentity.failure);
  const computed = computeOracleDistributionId({
    executable: assets.executable,
    schemas: assets.schemas,
    projection: assets.projection,
  });
  if (computed !== decodedIdentity.success.distributionId) {
    return Result.fail({
      tag: "identityMismatch",
      expected: decodedIdentity.success.distributionId,
      actual: computed,
    });
  }
  return Result.succeed(computed);
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
): Result.Result<readonly Dirent[], OracleDistributionLoadIssue> {
  try {
    return Result.succeed(readdirSync(directory, { withFileTypes: true }));
  } catch (error) {
    return Result.fail({
      tag: "assetRead",
      name: directory,
      message: String(error),
    });
  }
}

function readAsset(
  directory: string,
  name: string,
): Result.Result<Buffer, OracleDistributionLoadIssue> {
  const path = join(directory, name);
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return Result.fail({ tag: "assetType", name });
    }
    return Result.succeed(readFileSync(path));
  } catch (error) {
    return Result.fail({
      tag: "assetRead",
      name,
      message: String(error),
    });
  }
}

function decodeDistributionIdentity(
  bytes: Uint8Array,
): Result.Result<OracleIdentityResponse, OracleDistributionLoadIssue> {
  const text = decodeUtf8Total(bytes);
  if (Result.isFailure(text)) {
    return Result.fail({
      tag: "identityDecode",
      issues: [{ path: "", code: "invalidJson" }],
    });
  }
  const parsed = parseJsonWithDuplicateDetection(text.success);
  if (Result.isFailure(parsed)) {
    return Result.fail({ tag: "identityDecode", issues: parsed.failure });
  }
  const decoded = Schema.decodeUnknownResult(OracleIdentityResponseSchema, {
    errors: "all",
    onExcessProperty: "error",
  })(parsed.success);
  if (Result.isFailure(decoded)) {
    return Result.fail({
      tag: "identityDecode",
      issues: [{ path: "", code: "wrongType" }],
    });
  }
  const canonical = serializeOracleDistributionIdentity(decoded.success);
  if (!bytesEqual(canonical, bytes)) {
    return Result.fail({ tag: "identityCanonicality" });
  }
  return Result.succeed(decoded.success);
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
