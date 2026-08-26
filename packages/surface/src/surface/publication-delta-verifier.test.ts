import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  SURFACE_PUBLICATION_DELTA_CERTIFICATE_PATH,
  verifySurfacePublicationDelta,
} from "./publication-delta-verifier.ts";
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
  options: { readonly repoRoot?: string } = {},
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
  try {
    mutate({
      publicationDir,
      certificatePath: fixtureCertificatePath,
    });
    return verifySurfacePublicationDelta({
      repoRoot: options.repoRoot ?? repositoryRoot,
      publicationDir,
      certificatePath: fixtureCertificatePath,
    });
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

function issueKinds(
  result: ReturnType<typeof verifySurfacePublicationDelta>,
): ReadonlySet<string> {
  return result.tag === "invalid"
    ? new Set(result.issues.map((issue) => issue.kind))
    : new Set();
}

describe("Surface publication delta verifier", () => {
  test("verifies the reviewed certificate against the immutable baseline", () => {
    const result = verifySurfacePublicationDelta({ repoRoot: repositoryRoot });

    expect(result.tag).toBe("verified");
    if (result.tag === "verified") {
      expect(result.baselineCommit).toMatch(/^[0-9a-f]{40}$/u);
    }
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

  test("rejects an arbitrary certificate mutation", () => {
    const result = withFixture(({ certificatePath: fixturePath }) => {
      const certificate = readFileSync(fixturePath, "utf8");
      writeFileSync(
        fixturePath,
        certificate.replace('"number": 373', '"number": 374'),
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
          "e3b743d94a01f0fed0db4f895a53bb873ed864eef47db5ebb130f681a409e105",
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
    expect(issueKinds(result)).toContain("aggregate-semantic-mismatch");
    expect(issueKinds(result)).toContain("aggregate-record-mismatch");
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
