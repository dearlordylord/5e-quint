import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH,
  type SurfacePublicationDeltaVerificationOptions,
  verifySurfacePublicationDelta,
} from "./publication-delta-verifier.ts";
import { verifySurfacePublicationDeltaFixture } from "./publication-delta-verifier.test-support.ts";
import { PublishedSrdSurfaceSchema } from "./schema.ts";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const publicationRoot = join(repositoryRoot, "packages/surface/publication");
const certificatePath = join(
  repositoryRoot,
  SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH,
);

type FixturePaths = {
  readonly publicationDir: string;
  readonly certificatePath: string;
};

function withFixture(
  mutate: (paths: FixturePaths) => void,
  options: {
    readonly repoRoot?: string;
    readonly reviewMutatedCertificate?: boolean;
  } = {},
): ReturnType<typeof verifySurfacePublicationDelta> {
  const fixtureRoot = mkdtempSync("/tmp/surface-delta-test-");
  const publicationDir = join(fixtureRoot, "publication");
  const fixtureCertificatePath = join(fixtureRoot, "certificate.json");
  mkdirSync(publicationDir, { recursive: true });
  copyFileSync(
    join(publicationRoot, "srd-surface.json"),
    join(publicationDir, "srd-surface.json"),
  );
  copyFileSync(
    join(publicationRoot, "srd-surface.schema.json"),
    join(publicationDir, "srd-surface.schema.json"),
  );
  copyFileSync(certificatePath, fixtureCertificatePath);
  const reviewedCertificateSha256 = sha256(
    readFileSync(fixtureCertificatePath),
  );
  try {
    mutate({
      publicationDir,
      certificatePath: fixtureCertificatePath,
    });
    return verifySurfacePublicationDeltaFixture({
      repoRoot: options.repoRoot ?? repositoryRoot,
      publicationDir,
      reviewedCertificate: {
        path: fixtureCertificatePath,
        sha256: options.reviewMutatedCertificate
          ? sha256(readFileSync(fixtureCertificatePath))
          : reviewedCertificateSha256,
      },
    });
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function issueKinds(
  result: ReturnType<typeof verifySurfacePublicationDelta>,
): ReadonlySet<string> {
  return result.tag === "invalid"
    ? new Set(result.issues.map((issue) => issue.kind))
    : new Set();
}

function baselineAggregate(): unknown {
  return JSON.parse(
    execFileSync(
      "git",
      [
        "show",
        "76d9abaf0ec9c8369d5f95f603c5cce88704d26e:packages/surface/publication/srd-surface.json",
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    ),
  );
}

function recordById(value: unknown, id: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an aggregate object fixture");
  }
  const units = Reflect.get(value, "units");
  if (!Array.isArray(units)) throw new Error("Expected aggregate units");
  const record = units.find(
    (unit) =>
      typeof unit === "object" &&
      unit !== null &&
      !Array.isArray(unit) &&
      Reflect.get(unit, "id") === id,
  );
  if (record === undefined) throw new Error(`Expected fixture unit ${id}`);
  return record;
}

function isFixtureObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureObject(value: unknown, label: string): Record<string, unknown> {
  if (!isFixtureObject(value)) throw new Error(`Expected ${label} object`);
  return value;
}

function fixtureObjectField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return fixtureObject(value[key], key);
}

function fixtureArrayField(
  value: Record<string, unknown>,
  key: string,
): unknown[] {
  const field = value[key];
  if (!Array.isArray(field)) throw new Error(`Expected ${key} array`);
  return field;
}

function fixtureJsonPointer(
  value: unknown,
  pointer: string,
  label: string,
): unknown {
  if (!pointer.startsWith("/")) {
    throw new Error(`Expected ${label} to be an absolute JSON pointer`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (Array.isArray(current)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
          throw new Error(`Expected ${label} array index ${segment}`);
        }
        return current[index];
      }
      if (!isFixtureObject(current) || !(segment in current)) {
        throw new Error(`Expected ${label} segment ${segment}`);
      }
      return current[segment];
    }, value);
}

function fixtureClassifiedChanges(
  certificate: Record<string, unknown>,
): Record<string, unknown> {
  return fixtureObjectField(
    fixtureObjectField(
      fixtureObjectField(
        fixtureObjectField(
          fixtureObjectField(certificate, "artifacts"),
          "schema",
        ),
        "evidence",
      ),
      "graphDelta",
    ),
    "classifiedChanges",
  );
}

function fixtureSingleClassificationPointer(
  certificate: Record<string, unknown>,
  classification: string,
): string {
  const change = fixtureSingleMatch(
    fixtureArrayField(fixtureClassifiedChanges(certificate), classification),
    `${classification} classification`,
    () => true,
  );
  if (typeof change.pointer !== "string") {
    throw new Error(`Expected ${classification} classification pointer`);
  }
  return change.pointer;
}

function fixtureLocalReferenceTargetIfPresent(
  schema: Record<string, unknown>,
  value: unknown,
): Record<string, unknown> | undefined {
  const definitions = fixtureObjectField(schema, "$defs");
  const visited = new Set<string>();
  if (!isFixtureObject(value)) return undefined;
  let target = value;
  while (typeof target.$ref === "string") {
    const prefix = "#/$defs/";
    if (!target.$ref.startsWith(prefix) || visited.has(target.$ref)) {
      return undefined;
    }
    visited.add(target.$ref);
    const referenced = definitions[target.$ref.slice(prefix.length)];
    if (!isFixtureObject(referenced)) return undefined;
    target = referenced;
  }
  return target;
}

function fixtureLocalReferenceTarget(
  schema: Record<string, unknown>,
  value: unknown,
  label: string,
): Record<string, unknown> {
  const target = fixtureLocalReferenceTargetIfPresent(schema, value);
  if (target === undefined) {
    throw new Error(`Expected ${label} to have an acyclic local reference`);
  }
  return target;
}

function fixtureSingleMatch(
  values: readonly unknown[],
  label: string,
  predicate: (value: Record<string, unknown>) => boolean,
): Record<string, unknown> {
  const matches = values
    .filter(isFixtureObject)
    .filter((value) => predicate(value));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${label}; found ${String(matches.length)}`,
    );
  }
  return matches[0]!;
}

function fixtureDefinitionByDiscriminant(
  schema: Record<string, unknown>,
  discriminant: string,
): Record<string, unknown> {
  return fixtureSingleMatch(
    Object.values(fixtureObjectField(schema, "$defs")),
    `${discriminant} definition`,
    (definition) => {
      const properties = definition.properties;
      if (!isFixtureObject(properties) || !isFixtureObject(properties.kind)) {
        return false;
      }
      const kind = fixtureLocalReferenceTarget(
        schema,
        properties.kind,
        `${discriminant} discriminant`,
      );
      return (
        kind.type === "string" &&
        Array.isArray(kind.enum) &&
        kind.enum.length === 1 &&
        kind.enum[0] === discriminant
      );
    },
  );
}

function fixtureUnionMembers(
  schema: Record<string, unknown>,
  union: Record<string, unknown>,
  label: string,
): Record<string, unknown>[] {
  return fixtureArrayField(union, "anyOf").map((member) =>
    fixtureLocalReferenceTarget(schema, member, `${label} member`),
  );
}

function fixtureUnconditionalSpeedUnion(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  return fixtureSingleMatch(
    Object.values(fixtureObjectField(schema, "$defs")),
    "unconditional Speed union definition",
    (definition) => {
      if (!Array.isArray(definition.anyOf) || definition.anyOf.length !== 2) {
        return false;
      }
      const members = definition.anyOf.map((member) =>
        fixtureLocalReferenceTargetIfPresent(schema, member),
      );
      if (members.some((member) => member === undefined)) return false;
      const speedMembers = members.filter(isFixtureObject);
      const unconditionalSpeedMembers = speedMembers.filter((member) => {
        const properties = member.properties;
        const required = member.required;
        return (
          isFixtureObject(properties) &&
          "feet" in properties &&
          "hover" in properties &&
          "availability" in properties &&
          Array.isArray(required) &&
          !required.includes("availability")
        );
      });
      const flyMembers = speedMembers.filter((member) => {
        const properties = member.properties;
        if (!isFixtureObject(properties)) return false;
        const kind = fixtureLocalReferenceTargetIfPresent(
          schema,
          properties.kind,
        );
        return (
          kind !== undefined &&
          Array.isArray(kind.enum) &&
          kind.enum[0] === "fly"
        );
      });
      return (
        speedMembers.length === 2 &&
        unconditionalSpeedMembers.length === 2 &&
        flyMembers.length === 1
      );
    },
  );
}

function fixtureUnconditionalFlySpeed(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const union = fixtureUnconditionalSpeedUnion(schema);
  return fixtureSingleMatch(
    fixtureUnionMembers(schema, union, "unconditional Speed union"),
    "unconditional Fly speed member",
    (member) => {
      const properties = member.properties;
      if (!isFixtureObject(properties)) return false;
      const kind = fixtureLocalReferenceTarget(
        schema,
        properties.kind,
        "Speed kind",
      );
      return Array.isArray(kind.enum) && kind.enum[0] === "fly";
    },
  );
}

function fixtureLocalReferenceCount(
  schema: Record<string, unknown>,
  definitionPointer: string,
): number {
  const expectedReference = `#${definitionPointer}`;
  let count = 0;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isFixtureObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && child === expectedReference) count += 1;
      visit(child);
    }
  };
  visit(schema);
  return count;
}

function fixtureLiveSpecificItemId(
  schema: Record<string, unknown>,
  certificate: Record<string, unknown>,
): Record<string, unknown> {
  const itemIdChanges = fixtureArrayField(
    fixtureClassifiedChanges(certificate),
    "unitIdItemId",
  );
  const liveOwners = itemIdChanges.flatMap((rawChange) => {
    const change = fixtureObject(rawChange, "unitIdItemId classification");
    if (typeof change.pointer !== "string") {
      throw new Error("Expected unitIdItemId classification pointer");
    }
    const ownerSuffix = "/properties/itemId";
    if (!change.pointer.endsWith(ownerSuffix)) return [];
    const ownerPointer = change.pointer.slice(0, -ownerSuffix.length);
    const owner = fixtureObject(
      fixtureJsonPointer(schema, ownerPointer, "specific_item owner"),
      "specific_item owner",
    );
    const properties = fixtureObjectField(owner, "properties");
    const kind = fixtureLocalReferenceTarget(
      schema,
      properties.kind,
      "specific_item discriminant",
    );
    const directDefinitionMatch = /^\/\$defs\/[^/]+$/u.test(ownerPointer);
    const multiplyReferenced =
      directDefinitionMatch &&
      fixtureLocalReferenceCount(schema, ownerPointer) > 1;
    return kind.type === "string" &&
      Array.isArray(kind.enum) &&
      kind.enum.length === 1 &&
      kind.enum[0] === "specific_item" &&
      multiplyReferenced
      ? [change]
      : [];
  });
  const liveOwner = fixtureSingleMatch(
    liveOwners,
    "multiply referenced specific_item owner classification",
    () => true,
  );
  return fixtureObject(
    fixtureJsonPointer(
      schema,
      String(liveOwner.pointer),
      "live specific_item.itemId",
    ),
    "live specific_item.itemId",
  );
}

function fixtureAggregateCandidateDigest(
  certificate: Record<string, unknown>,
): Record<string, unknown> {
  return fixtureObjectField(
    fixtureObjectField(
      fixtureObjectField(certificate, "artifacts"),
      "aggregate",
    ),
    "candidate",
  );
}

function certifyCandidateSchemaSnapshot(paths: FixturePaths): void {
  const schemaPath = join(paths.publicationDir, "srd-surface.schema.json");
  const bytes = readFileSync(schemaPath);
  const schema = fixtureObject(JSON.parse(bytes.toString("utf8")), "schema");
  const certificate = fixtureObject(
    JSON.parse(readFileSync(paths.certificatePath, "utf8")),
    "certificate",
  );
  const schemaArtifact = fixtureObjectField(
    fixtureObjectField(certificate, "artifacts"),
    "schema",
  );
  const candidate = fixtureObjectField(schemaArtifact, "candidate");
  candidate.byteLength = bytes.byteLength;
  candidate.sha256 = sha256(bytes);
  const evidence = fixtureObjectField(schemaArtifact, "evidence");
  evidence.candidateCanonicalJsonSha256 = canonicalFixtureSha256(schema);
  const definitions = fixtureObjectField(evidence, "definitions");
  definitions.candidate = Object.keys(
    fixtureObjectField(schema, "$defs"),
  ).length;
  let references = 0;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!isFixtureObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref") references += 1;
      visit(child);
    }
  };
  visit(schema);
  fixtureObjectField(evidence, "references").candidate = references;
  writeFileSync(
    paths.certificatePath,
    `${JSON.stringify(certificate, null, 2)}\n`,
  );
}

function canonicalizeFixture(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeFixture);
  if (!isFixtureObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeFixture(value[key])]),
  );
}

function canonicalFixtureSha256(value: unknown): string {
  return sha256(Buffer.from(JSON.stringify(canonicalizeFixture(value))));
}

function membershipEvidence(aggregate: {
  readonly units: ReadonlyArray<{ readonly id: string }>;
  readonly statBlocks: ReadonlyArray<{ readonly id: string }>;
}): Record<string, unknown> {
  const units = aggregate.units.map((record) => record.id);
  const statBlocks = aggregate.statBlocks.map((record) => record.id);
  const all = [...units, ...statBlocks];
  const orderedIdSha256 = (ids: readonly string[]): string =>
    sha256(Buffer.from(JSON.stringify(ids)));
  return {
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

function certifyMembershipDelta(
  paths: FixturePaths,
  kind: "added" | "removed",
): void {
  const aggregatePath = join(paths.publicationDir, "srd-surface.json");
  const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
    JSON.parse(readFileSync(aggregatePath, "utf8")),
  );
  const source = aggregate.units.find((record) => record.id === "acid_splash");
  if (source === undefined)
    throw new Error("Expected acid_splash fixture unit");
  const addedRecord = { ...source, id: "addition_fixture" };
  const candidateAggregate = {
    ...aggregate,
    units:
      kind === "added"
        ? [...aggregate.units, addedRecord]
        : aggregate.units.filter((record) => record.id !== "acid_splash"),
  };
  const candidateBytes = Buffer.from(`${JSON.stringify(candidateAggregate)}\n`);
  writeFileSync(aggregatePath, candidateBytes);

  const certificate = fixtureObject(
    JSON.parse(readFileSync(paths.certificatePath, "utf8")),
    "certificate",
  );
  const artifacts = fixtureObjectField(certificate, "artifacts");
  const aggregateArtifact = fixtureObjectField(artifacts, "aggregate");
  const candidateDigest = fixtureObjectField(aggregateArtifact, "candidate");
  candidateDigest.byteLength = candidateBytes.byteLength;
  candidateDigest.sha256 = sha256(candidateBytes);
  const evidence = fixtureObjectField(aggregateArtifact, "evidence");
  evidence.candidateCanonicalJsonSha256 =
    canonicalFixtureSha256(candidateAggregate);

  const existingMembership = isFixtureObject(evidence.membership)
    ? evidence.membership
    : {
        baseline: {
          recordCounts: evidence.recordCounts,
          orderedIdSha256: evidence.orderedIdSha256,
        },
      };
  existingMembership.candidate = membershipEvidence(candidateAggregate);
  evidence.membership = existingMembership;
  Reflect.deleteProperty(evidence, "recordCounts");
  Reflect.deleteProperty(evidence, "orderedIdSha256");

  const reviewedRecordDeltas = fixtureArrayField(
    evidence,
    "reviewedRecordDeltas",
  );
  reviewedRecordDeltas.push(
    kind === "added"
      ? {
          kind,
          family: "units",
          id: "addition_fixture",
          semanticClass: "authored-catalog-membership",
          candidateCanonicalJsonSha256: canonicalFixtureSha256(addedRecord),
        }
      : {
          kind,
          family: "units",
          id: "acid_splash",
          semanticClass: "authored-catalog-membership",
          baselineCanonicalJsonSha256: canonicalFixtureSha256(
            recordById(baselineAggregate(), "acid_splash"),
          ),
        },
  );
  writeFileSync(
    paths.certificatePath,
    `${JSON.stringify(certificate, null, 2)}\n`,
  );
}

describe("Surface publication delta verifier", () => {
  test("verifies the reviewed certificate against the immutable baseline", () => {
    const result = verifySurfacePublicationDelta({ repoRoot: repositoryRoot });

    expect(result.tag).toBe("verified");
    if (result.tag === "verified") {
      expect(result.baselineCommit).toMatch(/^[0-9a-f]{40}$/u);
    }
  }, 180_000);

  test("production verification cannot be redirected to caller-selected certificate authority", () => {
    const options: SurfacePublicationDeltaVerificationOptions = {
      repoRoot: repositoryRoot,
    };
    // @ts-expect-error Certificate authority belongs only to fixture verification.
    options.certificateAuthority = {
      path: "/tmp/unreviewed-surface-certificate.json",
      sha256: "0".repeat(64),
    };

    const result = verifySurfacePublicationDelta(options);

    expect(result.tag).toBe("verified");
  }, 180_000);

  test("reports when the baseline commit is unavailable in checkout history", () => {
    const fixtureRoot = mkdtempSync("/tmp/surface-delta-history-test-");
    try {
      const result = withFixture(() => undefined, { repoRoot: fixtureRoot });

      expect(result.tag).toBe("invalid");
      expect(issueKinds(result)).toContain("baseline-history-unavailable");
      if (result.tag === "invalid") {
        expect(
          result.issues.find(
            (issue) => issue.kind === "baseline-history-unavailable",
          )?.message,
        ).toContain("baseline commit");
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }, 180_000);

  test("rejects an arbitrary aggregate artifact mutation", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      writeFileSync(path, `${readFileSync(path, "utf8")} `);
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("candidate-hash-mismatch");
  }, 180_000);

  test("rejects an arbitrary schema-valid certificate mutation", () => {
    const result = withFixture(({ certificatePath: fixturePath }) => {
      const certificate = fixtureObject(
        JSON.parse(readFileSync(fixturePath, "utf8")),
        "certificate",
      );
      const candidate = fixtureAggregateCandidateDigest(certificate);
      const byteLength = candidate.byteLength;
      if (typeof byteLength !== "number") {
        throw new Error("Expected candidate byteLength number");
      }
      candidate.byteLength = byteLength + 1;
      writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("certificate-digest-mismatch");
  }, 180_000);

  test("rejects a certificate hash mutation", () => {
    const result = withFixture(({ certificatePath: fixturePath }) => {
      const certificate = fixtureObject(
        JSON.parse(readFileSync(fixturePath, "utf8")),
        "certificate",
      );
      const candidate = fixtureAggregateCandidateDigest(certificate);
      const candidateSha256 = candidate.sha256;
      if (typeof candidateSha256 !== "string") {
        throw new Error("Expected candidate SHA-256 string");
      }
      candidate.sha256 = `${candidateSha256.startsWith("0") ? "1" : "0"}${candidateSha256.slice(
        1,
      )}`;
      writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("certificate-digest-mismatch");
  }, 180_000);

  test("rejects aggregate membership mutation", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: [
            aggregate.units[1],
            aggregate.units[0],
            ...aggregate.units.slice(2),
          ],
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("aggregate-record-mismatch");
  }, 180_000);

  test("rejects a stale baseline record substituted for a reviewed candidate delta", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      const staleRecord = recordById(baselineAggregate(), "shining_smite");
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.map((record) =>
            record.id === "shining_smite" ? staleRecord : record,
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-delta-stale");
  }, 180_000);

  test("rejects removal of the reviewed byte-order-only delta", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      const baselineRecord = recordById(baselineAggregate(), "magic_mouth");
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.map((record) =>
            record.id === "magic_mouth" ? baselineRecord : record,
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-order-delta-stale");
  }, 180_000);

  test("rejects a substituted key order for the reviewed byte-order-only delta", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      const record = recordById(aggregate, "magic_mouth");
      if (
        typeof record !== "object" ||
        record === null ||
        Array.isArray(record)
      ) {
        throw new Error("Expected magic_mouth object fixture");
      }
      const mechanics = Reflect.get(record, "mechanics");
      if (
        typeof mechanics !== "object" ||
        mechanics === null ||
        Array.isArray(mechanics)
      ) {
        throw new Error("Expected magic_mouth mechanics fixture");
      }
      const substitutedOrder = Object.fromEntries(
        Object.entries(mechanics).reverse(),
      );
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.map((unit) =>
            unit.id === "magic_mouth"
              ? { ...record, mechanics: substitutedOrder }
              : unit,
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain(
      "aggregate-order-delta-evidence-mismatch",
    );
  }, 180_000);

  test("rejects a surplus unclassified authored-record delta", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.map((record) =>
            record.id === "acid_splash"
              ? { ...record, displayName: "Surplus fixture mutation" }
              : record,
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-delta-unclassified");
  }, 180_000);

  test("rejects an unclassified authored-record addition", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      const source = aggregate.units.find(
        (record) => record.id === "acid_splash",
      );
      if (source === undefined)
        throw new Error("Expected acid_splash fixture unit");
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: [...aggregate.units, { ...source, id: "addition_fixture" }],
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-delta-unclassified");
  }, 180_000);

  test("rejects an unclassified authored-record removal", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.filter(
            (record) => record.id !== "acid_splash",
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-delta-unclassified");
  }, 180_000);

  test("verifies an exact classified authored-record addition with candidate membership evidence", () => {
    const result = withFixture(
      (paths) => certifyMembershipDelta(paths, "added"),
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("verified");
  }, 180_000);

  test("verifies an exact classified authored-record removal with candidate membership evidence", () => {
    const result = withFixture(
      (paths) => certifyMembershipDelta(paths, "removed"),
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("verified");
  }, 180_000);

  test("rejects classified addition evidence with stale candidate membership", () => {
    const result = withFixture(
      (paths) => {
        certifyMembershipDelta(paths, "added");
        const certificate = fixtureObject(
          JSON.parse(readFileSync(paths.certificatePath, "utf8")),
          "certificate",
        );
        const evidence = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(certificate, "artifacts"),
            "aggregate",
          ),
          "evidence",
        );
        const candidateMembership = fixtureObjectField(
          fixtureObjectField(evidence, "membership"),
          "candidate",
        );
        const recordCounts = fixtureObjectField(
          candidateMembership,
          "recordCounts",
        );
        recordCounts.units = 399;
        writeFileSync(
          paths.certificatePath,
          `${JSON.stringify(certificate, null, 2)}\n`,
        );
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-record-mismatch");
  }, 180_000);

  test("rejects a reviewed record delta encoded with the wrong discriminated shape", () => {
    const result = withFixture(({ certificatePath: fixturePath }) => {
      const certificate = readFileSync(fixturePath, "utf8");
      writeFileSync(
        fixturePath,
        certificate.replace(
          '"kind": "changed",\n            "family": "units"',
          '"kind": "added",\n            "family": "units"',
        ),
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("certificate-invalid");
  }, 180_000);

  test("rejects a changed delta classified as catalog membership", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = readFileSync(fixturePath, "utf8");
        writeFileSync(
          fixturePath,
          certificate.replace(
            '"semanticClass": "authored-persistent-rule-facts"',
            '"semanticClass": "authored-catalog-membership"',
          ),
        );
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("certificate-invalid");
  }, 180_000);

  test.each([
    ["added", "authored-cross-record-reference"],
    ["removed", "authored-cross-record-reference"],
    ["added", "authored-persistent-rule-facts"],
    ["removed", "authored-persistent-rule-facts"],
    ["added", "authored-stat-block-fidelity"],
    ["removed", "authored-stat-block-fidelity"],
  ] as const)(
    "rejects a %s delta classified as %s",
    (kind, semanticClass) => {
      const result = withFixture(
        (paths) => {
          certifyMembershipDelta(paths, kind);
          const certificate = readFileSync(paths.certificatePath, "utf8");
          writeFileSync(
            paths.certificatePath,
            certificate.replace(
              '"semanticClass": "authored-catalog-membership"',
              `"semanticClass": "${semanticClass}"`,
            ),
          );
        },
        { reviewMutatedCertificate: true },
      );

      expect(result.tag).toBe("invalid");
      expect(issueKinds(result)).toContain("certificate-invalid");
    },
    180_000,
  );

  test("rejects a copied record substituted for a distinct reviewed delta", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.json");
      const aggregate = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
        JSON.parse(readFileSync(path, "utf8")),
      );
      const copiedRecord = aggregate.units.find(
        (record) => record.id === "continual_flame",
      );
      if (copiedRecord === undefined) {
        throw new Error("Expected continual_flame fixture unit");
      }
      writeFileSync(
        path,
        `${JSON.stringify({
          ...aggregate,
          units: aggregate.units.map((record) =>
            record.id === "shining_smite"
              ? { ...copiedRecord, id: "shining_smite" }
              : record,
          ),
        })}\n`,
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("aggregate-delta-evidence-mismatch");
  }, 180_000);

  test("rejects schema mutation", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.schema.json");
      const schema = readFileSync(path, "utf8");
      writeFileSync(
        path,
        schema.replace(
          '"$schema":"https://json-schema.org/draft/2020-12/schema"',
          '"$schema":"https://json-schema.org/draft/2020-12/schema#mutated"',
        ),
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-compile-failed");
  }, 180_000);

  test("rejects a valid-compiling schema mutation as unauthenticated graph evidence", () => {
    const result = withFixture(({ publicationDir }) => {
      const path = join(publicationDir, "srd-surface.schema.json");
      const schema = readFileSync(path, "utf8");
      writeFileSync(
        path,
        schema.replace(
          '{"$schema":"https://json-schema.org/draft/2020-12/schema"',
          '{"description":"finite cross-validation fixture","$schema":"https://json-schema.org/draft/2020-12/schema"',
        ),
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-evidence-mismatch");
    expect(issueKinds(result)).not.toContain("schema-compile-failed");
  }, 180_000);

  test("rejects an ordinary-recertified but unclassified schema graph change", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        schema.description = "unclassified reachable graph fixture";
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("reports a reachable schema array-shape difference", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const units = fixtureObjectField(
          fixtureObjectField(schema, "properties"),
          "units",
        );
        const prefixItems = fixtureArrayField(units, "prefixItems");
        prefixItems.push(prefixItems[0]);
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    const unclassifiedIssue =
      result.tag === "invalid"
        ? result.issues.find(
            (issue) => issue.kind === "schema-delta-unclassified",
          )
        : undefined;
    expect(unclassifiedIssue?.message).toContain(
      "first differing region: /properties/units/prefixItems (array shape)",
    );
  }, 180_000);

  test("reports a reachable schema object-key difference", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const units = fixtureObjectField(
          fixtureObjectField(schema, "properties"),
          "units",
        );
        units.description = "unclassified unit-list fixture";
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    const unclassifiedIssue =
      result.tag === "invalid"
        ? result.issues.find(
            (issue) => issue.kind === "schema-delta-unclassified",
          )
        : undefined;
    expect(unclassifiedIssue?.message).toContain(
      "first differing region: /properties/units (object keys description)",
    );
  }, 180_000);

  test("reports a schema root without publication-family properties", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        Reflect.deleteProperty(schema, "properties");
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    const unclassifiedIssue =
      result.tag === "invalid"
        ? result.issues.find(
            (issue) => issue.kind === "schema-delta-unclassified",
          )
        : undefined;
    expect(unclassifiedIssue?.message).toContain(
      "changed publication families: properties; first differing region: /",
    );
  }, 180_000);

  test("rejects substitution of the authenticated intermediate schema", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const graphDelta = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(
              fixtureObjectField(certificate, "artifacts"),
              "schema",
            ),
            "evidence",
          ),
          "graphDelta",
        );
        fixtureObjectField(graphDelta, "comparisonSchema").sha256 = "0".repeat(
          64,
        );
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-authority-mismatch");
  }, 180_000);

  test("rejects tampering with a finite schema classification pointer", () => {
    const result = withFixture(
      (paths) => {
        const fixturePath = paths.certificatePath;
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const schema = fixtureObject(
          JSON.parse(
            readFileSync(
              join(paths.publicationDir, "srd-surface.schema.json"),
              "utf8",
            ),
          ),
          "schema",
        );
        const classifiedChanges = fixtureClassifiedChanges(certificate);
        const flyOnlyHover = fixtureArrayField(
          classifiedChanges,
          "flyOnlyHover",
        );
        const first = fixtureObject(flyOnlyHover[0], "flyOnlyHover[0]");
        const originalPointer = first.pointer;
        const wrongPointer = fixtureSingleClassificationPointer(
          certificate,
          "casterHealLinkRangeFeet",
        );
        fixtureJsonPointer(schema, wrongPointer, "wrong semantic schema node");
        if (originalPointer === wrongPointer) {
          throw new Error("Expected distinct Fly and caster-heal pointers");
        }
        first.pointer = wrongPointer;
        if (first.pointer === originalPointer) {
          throw new Error(
            "Expected classification-pointer tampering to mutate",
          );
        }
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
  }, 180_000);

  test("rejects tampering with cumulative spell-vocabulary classifications", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const classifiedChanges = fixtureClassifiedChanges(certificate);
        for (const classificationKind of [
          "targetSelectionVisibility",
          "authoredConditionalMechanics",
          "creatureTypeProtectionVocabulary",
          "ongoingMechanicsEnvelope",
        ]) {
          const classifications = fixtureArrayField(
            classifiedChanges,
            classificationKind,
          );
          const first = fixtureObject(
            classifications[0],
            `${classificationKind}[0]`,
          );
          first.pointer = `/$defs/Unreviewed${classificationKind}`;
        }
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("rejects tampering with the canonical Mastery classification pointer", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const classifiedChanges = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(
              fixtureObjectField(
                fixtureObjectField(certificate, "artifacts"),
                "schema",
              ),
              "evidence",
            ),
            "graphDelta",
          ),
          "classifiedChanges",
        );
        const masteryClassifications = fixtureArrayField(
          classifiedChanges,
          "canonicalMasteryVariants",
        );
        const first = fixtureObject(
          masteryClassifications[0],
          "canonicalMasteryVariants[0]",
        );
        first.pointer = "/$defs/UnreviewedMastery/properties/mechanics";
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("rejects a near-miss canonical Mastery schema variant", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const definitions = fixtureObjectField(schema, "$defs");
        const graze = Object.values(definitions)
          .map((definition) => fixtureObject(definition, "definition"))
          .find((definition) => {
            const properties = definition.properties;
            if (!isFixtureObject(properties)) return false;
            const family = properties.family;
            return (
              isFixtureObject(family) &&
              Array.isArray(family.enum) &&
              family.enum[0] === "weapon_attack_miss_damage"
            );
          });
        if (graze === undefined) {
          throw new Error("Expected canonical Graze schema definition");
        }
        const family = fixtureObjectField(
          fixtureObjectField(graze, "properties"),
          "family",
        );
        family.enum = ["synthetic_weapon_attack_miss_damage"];
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test.each([
    {
      name: "GM-speed minimum",
      mutate: (schema: Record<string, unknown>): void => {
        const alternatives = fixtureObjectField(
          fixtureObjectField(
            fixtureDefinitionByDiscriminant(schema, "gm_choice"),
            "properties",
          ),
          "alternatives",
        );
        alternatives.minItems = 3;
      },
    },
    {
      name: "GM-speed repeated alternative",
      mutate: (schema: Record<string, unknown>): void => {
        const alternatives = fixtureObjectField(
          fixtureObjectField(
            fixtureDefinitionByDiscriminant(schema, "gm_choice"),
            "properties",
          ),
          "alternatives",
        );
        fixtureObjectField(alternatives, "items").description =
          "non-repeated alternative fixture";
      },
    },
    {
      name: "GM-speed tuple without prefix items",
      mutate: (schema: Record<string, unknown>): void => {
        const alternatives = fixtureObjectField(
          fixtureObjectField(
            fixtureDefinitionByDiscriminant(schema, "gm_choice"),
            "properties",
          ),
          "alternatives",
        );
        Reflect.deleteProperty(alternatives, "prefixItems");
      },
    },
    {
      name: "GM-speed tuple without repeated items",
      mutate: (schema: Record<string, unknown>): void => {
        const alternatives = fixtureObjectField(
          fixtureObjectField(
            fixtureDefinitionByDiscriminant(schema, "gm_choice"),
            "properties",
          ),
          "alternatives",
        );
        Reflect.deleteProperty(alternatives, "items");
      },
    },
    {
      name: "caster-heal range boolean schema",
      mutate: (schema: Record<string, unknown>): void => {
        const properties = fixtureObjectField(
          fixtureDefinitionByDiscriminant(schema, "caster_heal_link"),
          "properties",
        );
        properties.rangeFeet = true;
      },
    },
    {
      name: "fly-hover branch",
      mutate: (schema: Record<string, unknown>): void => {
        const hover = fixtureObjectField(
          fixtureObjectField(
            fixtureUnconditionalFlySpeed(schema),
            "properties",
          ),
          "hover",
        );
        hover.enum = [false];
      },
    },
    {
      name: "fly-hover union with a boolean branch",
      mutate: (schema: Record<string, unknown>): void => {
        const anyOf = fixtureArrayField(
          fixtureUnconditionalSpeedUnion(schema),
          "anyOf",
        );
        anyOf[0] = false;
      },
    },
  ])(
    "rejects a reachable near-miss $name classification",
    ({ mutate }) => {
      const result = withFixture(
        (paths) => {
          const path = join(paths.publicationDir, "srd-surface.schema.json");
          const schema = fixtureObject(
            JSON.parse(readFileSync(path, "utf8")),
            "schema",
          );
          mutate(schema);
          writeFileSync(path, JSON.stringify(schema));
          certifyCandidateSchemaSnapshot(paths);
        },
        { reviewMutatedCertificate: true },
      );

      expect(result.tag).toBe("invalid");
      expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
      expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
      expect(issueKinds(result)).toContain("schema-delta-unclassified");
    },
    180_000,
  );

  test("rejects tampering with the Life Bond range classification pointer", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const classifiedChanges = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(
              fixtureObjectField(
                fixtureObjectField(certificate, "artifacts"),
                "schema",
              ),
              "evidence",
            ),
            "graphDelta",
          ),
          "classifiedChanges",
        );
        const rangeClassifications = fixtureArrayField(
          classifiedChanges,
          "casterHealLinkRangeFeet",
        );
        const first = fixtureObject(
          rangeClassifications[0],
          "casterHealLinkRangeFeet[0]",
        );
        first.pointer = "/$defs/UnreviewedLifeBond/properties/rangeFeet";
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("rejects tampering with a linked-spell UnitId classification pointer", () => {
    const result = withFixture(
      ({ certificatePath: fixturePath }) => {
        const certificate = fixtureObject(
          JSON.parse(readFileSync(fixturePath, "utf8")),
          "certificate",
        );
        const classifiedChanges = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(
              fixtureObjectField(
                fixtureObjectField(certificate, "artifacts"),
                "schema",
              ),
              "evidence",
            ),
            "graphDelta",
          ),
          "classifiedChanges",
        );
        const linkedSpellClassifications = fixtureArrayField(
          classifiedChanges,
          "unitIdLinkedSpellEnd",
        );
        const first = fixtureObject(
          linkedSpellClassifications[0],
          "unitIdLinkedSpellEnd[0]",
        );
        first.pointer =
          "/$defs/UnreviewedLinkedSpell/properties/endsWhenGrantedSpellEnds";
        writeFileSync(fixturePath, `${JSON.stringify(certificate, null, 2)}\n`);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("rejects a reachable Life Bond range lookalike outside the certified pointer", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const definitions = fixtureObjectField(schema, "$defs");
        definitions.UnreviewedLifeBond = {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["caster_heal_link"] },
            rangeFeet: { type: "integer", minimum: 1 },
          },
          required: ["kind", "rangeFeet"],
          additionalProperties: false,
        };
        fixtureObjectField(schema, "properties").unreviewedLifeBond = {
          $ref: "#/$defs/UnreviewedLifeBond",
        };
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-unclassified");
  }, 180_000);

  test("rejects moving a live classified constraint to an unreachable lookalike", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const definitions = fixtureObjectField(schema, "$defs");
        const certificate = fixtureObject(
          JSON.parse(readFileSync(paths.certificatePath, "utf8")),
          "certificate",
        );
        const itemId = fixtureLiveSpecificItemId(schema, certificate);
        definitions.UnreachableUnitIdLookalike = { ...itemId };
        Reflect.deleteProperty(itemId, "minLength");
        Reflect.deleteProperty(itemId, "pattern");
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
  }, 180_000);

  test("rejects substituting an unreachable linked-spell UnitId lookalike", () => {
    const result = withFixture(
      (paths) => {
        const path = join(paths.publicationDir, "srd-surface.schema.json");
        const schema = fixtureObject(
          JSON.parse(readFileSync(path, "utf8")),
          "schema",
        );
        const definitions = fixtureObjectField(schema, "$defs");
        const grantSpellAccess = fixtureDefinitionByDiscriminant(
          schema,
          "grant_spell_access",
        );
        const linkedSpellId = fixtureObjectField(
          fixtureObjectField(
            fixtureObjectField(grantSpellAccess, "properties"),
            "durationOverride",
          ),
          "properties",
        ).endsWhenGrantedSpellEnds;
        const linkedSpellIdObject = fixtureObject(
          linkedSpellId,
          "endsWhenGrantedSpellEnds",
        );
        definitions.UnreachableLinkedSpellIdLookalike = {
          ...linkedSpellIdObject,
        };
        Reflect.deleteProperty(linkedSpellIdObject, "minLength");
        Reflect.deleteProperty(linkedSpellIdObject, "pattern");
        writeFileSync(path, JSON.stringify(schema));
        certifyCandidateSchemaSnapshot(paths);
      },
      { reviewMutatedCertificate: true },
    );

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).not.toContain("candidate-hash-mismatch");
    expect(issueKinds(result)).toContain("schema-delta-evidence-mismatch");
  }, 180_000);

  test("returns typed invalid evidence for a cyclic future schema graph", () => {
    let result: ReturnType<typeof verifySurfacePublicationDelta> | undefined;
    expect(() => {
      result = withFixture(
        (paths) => {
          const path = join(paths.publicationDir, "srd-surface.schema.json");
          const schema = fixtureObject(
            JSON.parse(readFileSync(path, "utf8")),
            "schema",
          );
          const definitions = fixtureObjectField(schema, "$defs");
          definitions.FutureRecursiveNode = {
            $ref: "#/$defs/FutureRecursiveNode",
          };
          fixtureObjectField(schema, "properties").units = {
            $ref: "#/$defs/FutureRecursiveNode",
          };
          writeFileSync(path, JSON.stringify(schema));
          certifyCandidateSchemaSnapshot(paths);
        },
        { reviewMutatedCertificate: true },
      );
    }).not.toThrow();

    expect(result?.tag).toBe("invalid");
    expect(issueKinds(result!)).toContain("schema-delta-unclassified");
  }, 180_000);
});
