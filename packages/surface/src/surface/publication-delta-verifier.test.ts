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
    const options: SurfacePublicationDeltaVerificationOptions & {
      readonly certificateAuthority: {
        readonly path: string;
        readonly sha256: string;
      };
    } = {
      repoRoot: repositoryRoot,
      certificateAuthority: {
        path: "/tmp/unreviewed-surface-certificate.json",
        sha256: "0".repeat(64),
      },
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
      const certificate = readFileSync(fixturePath, "utf8");
      writeFileSync(
        fixturePath,
        certificate.replace('"byteLength": 946224', '"byteLength": 946225'),
      );
    });

    expect(result.tag).toBe("invalid");
    expect(issueKinds(result)).toContain("certificate-digest-mismatch");
  }, 180_000);

  test("rejects a certificate hash mutation", () => {
    const result = withFixture(({ certificatePath: fixturePath }) => {
      const certificate = readFileSync(fixturePath, "utf8");
      writeFileSync(
        fixturePath,
        certificate.replace(
          "8b3466a7ed3b714788aac208ad6d76684eeb9c59037a9d05b6a7d491d4218867",
          "0000000000000000000000000000000000000000000000000000000000000000",
        ),
      );
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

  test.each(["added", "removed"] as const)(
    "rejects a %s delta classified as a content change",
    (kind) => {
      const result = withFixture(
        (paths) => {
          certifyMembershipDelta(paths, kind);
          const certificate = readFileSync(paths.certificatePath, "utf8");
          writeFileSync(
            paths.certificatePath,
            certificate.replace(
              '"semanticClass": "authored-catalog-membership"',
              '"semanticClass": "authored-persistent-rule-facts"',
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
});
