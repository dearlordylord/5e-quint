import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  independentOutcomeForCase,
  readSrdSurfaceIndependentExpectations,
} from "./generate-surface-portable-cases.ts";
import type { PortableDependencyRole } from "./surface-portable-case-oracle.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDependencyRole(value: unknown): value is PortableDependencyRole {
  return (
    isRecord(value) &&
    (value.sourceKind === "unit" || value.sourceKind === "statBlock") &&
    typeof value.path === "string" &&
    typeof value.fieldName === "string" &&
    (value.targetKind === "unit" || value.targetKind === "statBlock") &&
    typeof value.relation === "string"
  );
}

const repositoryRoot = process.cwd();
const schemaPath = join(
  repositoryRoot,
  "packages/surface/publication/srd-surface.schema.json",
);
const contractPath = join(
  repositoryRoot,
  "packages/surface/portable-cases/srd-surface-dependency-contract.json",
);
const expectationsPath = join(
  repositoryRoot,
  "packages/surface/portable-cases/srd-surface-independent-expectations.json",
);
const schema: unknown = JSON.parse(readFileSync(schemaPath, "utf8"));
const contractDocument: unknown = JSON.parse(
  readFileSync(contractPath, "utf8"),
);
if (
  !isRecord(contractDocument) ||
  !Array.isArray(contractDocument.roles) ||
  !contractDocument.roles.every(isDependencyRole)
) {
  throw new Error("Dependency contract fixture is invalid");
}
const contract: readonly PortableDependencyRole[] = contractDocument.roles;

let temporaryDirectory: string | undefined;

afterEach(() => {
  if (temporaryDirectory === undefined) return;
  rmSync(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

function temporaryExpectationsPath(): string {
  temporaryDirectory = mkdtempSync(
    join(tmpdir(), "surface-independent-expectations-test-"),
  );
  return join(temporaryDirectory, "expectations.json");
}

describe("independent portable Surface expectations", () => {
  test("loads the checked-in frozen snapshot", () => {
    const expectations = readSrdSurfaceIndependentExpectations(
      expectationsPath,
      schema,
      contract,
    );

    expect(expectations.size).toBe(31);
    expect(expectations.get("valid published aggregate")).toMatchObject({
      name: "valid published aggregate",
      expected: { tag: "accepted" },
    });
    expect(expectations.get("condition immunity overlap")).toMatchObject({
      name: "condition immunity overlap",
      expected: {
        tag: "rejected",
        issues: [{ code: "schema", path: "$.statBlocks[0]" }],
      },
    });
  });

  test("fails when the independent snapshot is missing", () => {
    expect(() =>
      readSrdSurfaceIndependentExpectations(
        join(temporaryExpectationsPath(), "missing.json"),
        schema,
        contract,
      ),
    ).toThrow("Could not read JSON");
  });

  test("fails when a generated case input changes its frozen digest", () => {
    const expectations = readSrdSurfaceIndependentExpectations(
      expectationsPath,
      schema,
      contract,
    );

    expect(() =>
      independentOutcomeForCase(expectations, "valid published aggregate", {
        input: {},
      }),
    ).toThrow("input mismatch");
  });

  test("fails when a frozen outcome is structurally incompatible", () => {
    const path = temporaryExpectationsPath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        schemaSha256: "0".repeat(64),
        dependencyContractSha256: "0".repeat(64),
        cases: [
          {
            name: "synthetic",
            inputSha256: "0".repeat(64),
            expected: { tag: "rejected", issues: [] },
          },
        ],
      }),
    );

    expect(() =>
      readSrdSurfaceIndependentExpectations(path, schema, contract),
    ).toThrow("issues must be non-empty");
  });

  test("fails when the snapshot targets another schema", () => {
    const path = temporaryExpectationsPath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        schemaSha256: "0".repeat(64),
        dependencyContractSha256: "0".repeat(64),
        cases: [
          {
            name: "synthetic",
            inputSha256: "0".repeat(64),
            expected: { tag: "accepted" },
          },
        ],
      }),
    );

    expect(() =>
      readSrdSurfaceIndependentExpectations(path, schema, contract),
    ).toThrow("different Surface schema");
  });
});
