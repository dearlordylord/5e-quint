import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  PortableSurfaceOracle,
  type PortableCaseInput,
  type PortableCaseOutcome,
  type PortableDependencyRole,
} from "./surface-portable-case-oracle.ts";

type JsonObject = Record<string, unknown>;

type PortableCase = PortableCaseInput & {
  readonly name: string;
  readonly expected: {
    readonly production: PortableCaseOutcome;
    readonly independent: PortableCaseOutcome;
  };
};

type PortableCaseDocument = {
  readonly version: 1;
  readonly dependencyContract: readonly PortableDependencyRole[];
  readonly cases: readonly PortableCase[];
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read JSON ${path}: ${String(error)}`);
  }
}

function requireObject(value: unknown, context: string): JsonObject {
  if (!isObject(value)) throw new Error(`${context} must be an object`);
  return value;
}

function requireArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${context} must be an array`);
  return value;
}

function requireNonEmptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context} must be a non-empty string`);
  }
  return value;
}

function readDependencyContract(
  path: string,
): readonly PortableDependencyRole[] {
  const document = requireObject(readJson(path), "dependency contract");
  if (document.version !== 1) {
    throw new Error("dependency contract version must be 1");
  }
  return requireArray(document.roles, "dependency contract roles").map(
    (entry, index) => {
      const role = requireObject(entry, `dependency contract role ${index}`);
      const sourceKind = requireNonEmptyString(
        role.sourceKind,
        `dependency contract role ${index}.sourceKind`,
      );
      const targetKind = requireNonEmptyString(
        role.targetKind,
        `dependency contract role ${index}.targetKind`,
      );
      if (sourceKind !== "unit" && sourceKind !== "statBlock") {
        throw new Error(`unsupported source kind ${sourceKind}`);
      }
      if (targetKind !== "unit" && targetKind !== "statBlock") {
        throw new Error(`unsupported target kind ${targetKind}`);
      }
      return {
        sourceKind,
        path: requireNonEmptyString(
          role.path,
          `dependency contract role ${index}.path`,
        ),
        fieldName: requireNonEmptyString(
          role.fieldName,
          `dependency contract role ${index}.fieldName`,
        ),
        targetKind,
        relation: requireNonEmptyString(
          role.relation,
          `dependency contract role ${index}.relation`,
        ),
      } satisfies PortableDependencyRole;
    },
  );
}

function records(
  publication: JsonObject,
  family: "units" | "statBlocks",
): readonly JsonObject[] {
  return requireArray(publication[family], `publication ${family}`).map(
    (record, index) => requireObject(record, `publication ${family}[${index}]`),
  );
}

function valuesAtPath(root: unknown, path: string): readonly unknown[] {
  let values: readonly unknown[] = [root];
  for (const segment of path.match(/[^.\[\]]+|\[\]/g) ?? []) {
    values =
      segment === "[]"
        ? values.flatMap((value) => (Array.isArray(value) ? value : []))
        : values.flatMap((value) =>
            isObject(value) && Object.hasOwn(value, segment)
              ? [value[segment]]
              : [],
          );
  }
  return values;
}

function dependencyFailureInput(
  publication: JsonObject,
  contract: readonly PortableDependencyRole[],
): JsonObject {
  const sourceIndices = {
    units: new Set<number>(),
    statBlocks: new Set<number>(),
  };
  for (const role of contract) {
    const family = role.sourceKind === "unit" ? "units" : "statBlocks";
    let foundValue = false;
    records(publication, family).forEach((record, index) => {
      if (
        valuesAtPath(record, role.path).some(
          (value) => typeof value === "string",
        )
      ) {
        foundValue = true;
        sourceIndices[family].add(index);
      }
    });
    if (!foundValue) {
      throw new Error(`Dependency contract path is absent: ${role.path}`);
    }
  }

  const selectedRecords = {
    units: records(publication, "units").filter((_, index) =>
      sourceIndices.units.has(index),
    ),
    statBlocks: records(publication, "statBlocks").filter((_, index) =>
      sourceIndices.statBlocks.has(index),
    ),
  };
  const targetIds = {
    units: new Set<string>(),
    statBlocks: new Set<string>(),
  };
  for (const role of contract) {
    const sourceFamily = role.sourceKind === "unit" ? "units" : "statBlocks";
    const targetFamily = role.targetKind === "unit" ? "units" : "statBlocks";
    for (const record of selectedRecords[sourceFamily]) {
      for (const value of valuesAtPath(record, role.path)) {
        if (typeof value === "string") targetIds[targetFamily].add(value);
      }
    }
  }

  const sourceRecords = (family: "units" | "statBlocks") => {
    const allRecords = records(publication, family);
    const selected = selectedRecords[family];
    if (selected.length > 0) return selected;
    const first = allRecords.find(
      (record) => !targetIds[family].has(String(record.id)),
    );
    const fallback = first ?? allRecords[0];
    if (fallback === undefined) {
      throw new Error(`Publication ${family} must be non-empty`);
    }
    return [fallback];
  };

  return {
    ...publication,
    units: sourceRecords("units"),
    statBlocks: sourceRecords("statBlocks"),
  };
}

function dependencyRoleFailureInput(
  publication: JsonObject,
  role: PortableDependencyRole,
): JsonObject {
  const sourceFamily = role.sourceKind === "unit" ? "units" : "statBlocks";
  const targetFamily = role.targetKind === "unit" ? "units" : "statBlocks";
  const sourceRecord = records(publication, sourceFamily).find((record) =>
    valuesAtPath(record, role.path).some((value) => typeof value === "string"),
  );
  if (sourceRecord === undefined) {
    throw new Error(`Dependency contract path is absent: ${role.path}`);
  }
  const targetIds = new Set(
    valuesAtPath(sourceRecord, role.path).filter(
      (value): value is string => typeof value === "string",
    ),
  );
  const targetRecords = records(publication, targetFamily).filter(
    (record) =>
      !targetIds.has(String(record.id)) ||
      (sourceFamily === targetFamily && record === sourceRecord),
  );
  const otherFamily = sourceFamily === "units" ? "statBlocks" : "units";
  const otherFamilyFirst = records(publication, otherFamily)[0];
  if (otherFamilyFirst === undefined || targetRecords.length === 0) {
    throw new Error(
      "Dependency role fixture requires non-empty record families",
    );
  }
  return sourceFamily === "units"
    ? {
        ...publication,
        units: [sourceRecord],
        statBlocks:
          targetFamily === "statBlocks" ? targetRecords : [otherFamilyFirst],
      }
    : {
        ...publication,
        units: targetFamily === "units" ? targetRecords : [otherFamilyFirst],
        statBlocks: [sourceRecord],
      };
}

function expectedOutcome(
  oracle: PortableSurfaceOracle,
  input: PortableCaseInput,
  contract: readonly PortableDependencyRole[],
): PortableCaseOutcome {
  const result = oracle.evaluateInput(input, contract);
  return result.tag === "accepted"
    ? { tag: "accepted" }
    : { tag: "rejected", issues: result.issues };
}

function makeCase(
  oracle: PortableSurfaceOracle,
  contract: readonly PortableDependencyRole[],
  name: string,
  input: PortableCaseInput,
): PortableCase {
  const expected = expectedOutcome(oracle, input, contract);
  return {
    ...input,
    name,
    expected: { production: expected, independent: expected },
  };
}

function withRecord(
  publication: JsonObject,
  family: "units" | "statBlocks",
  updated: readonly JsonObject[],
): JsonObject {
  return { ...publication, [family]: updated };
}

function buildDocument(repositoryRoot: string): PortableCaseDocument {
  const publication = requireObject(
    readJson(
      join(repositoryRoot, "packages/surface/publication/srd-surface.json"),
    ),
    "published SRD Surface",
  );
  const schema = readJson(
    join(
      repositoryRoot,
      "packages/surface/publication/srd-surface.schema.json",
    ),
  );
  const contract = readDependencyContract(
    join(
      repositoryRoot,
      "packages/surface/portable-cases/srd-surface-dependency-contract.json",
    ),
  );
  const oracle = new PortableSurfaceOracle(schema);
  const units = records(publication, "units");
  const statBlocks = records(publication, "statBlocks");
  const firstUnit = units[0];
  const firstStatBlock = statBlocks[0];
  if (firstUnit === undefined || firstStatBlock === undefined) {
    throw new Error(
      "Published SRD Surface must contain both non-empty record families",
    );
  }

  const dependencyFailure = dependencyFailureInput(publication, contract);
  const dependencyFreeUnit = units.find(
    (record) =>
      !contract.some((role) =>
        valuesAtPath(record, role.path).some(
          (value) => typeof value === "string",
        ),
      ),
  );
  if (dependencyFreeUnit === undefined) {
    throw new Error("Published Surface has no dependency-free unit fixture");
  }
  const statBlockRole = contract.find(
    (role) => role.targetKind === "statBlock",
  );
  if (statBlockRole === undefined) {
    throw new Error("Dependency contract must include a stat-block role");
  }
  const dependencySourceUnit = units.find((record) =>
    valuesAtPath(record, statBlockRole.path).some(
      (value) => typeof value === "string",
    ),
  );
  if (dependencySourceUnit === undefined) {
    throw new Error("Published Surface has no stat-block dependency source");
  }
  const dependencyTargetIds = new Set(
    valuesAtPath(dependencySourceUnit, statBlockRole.path).filter(
      (value): value is string => typeof value === "string",
    ),
  );
  const dependencyStatBlocks = statBlocks.filter((record) =>
    dependencyTargetIds.has(String(record.id)),
  );
  const dependencyTargetId = [...dependencyTargetIds][0];
  const otherDependencyStatBlocks = dependencyStatBlocks.filter(
    (record) => String(record.id) !== dependencyTargetId,
  );
  if (
    dependencyTargetId === undefined ||
    dependencyStatBlocks.length < 2 ||
    otherDependencyStatBlocks.length === 0
  ) {
    throw new Error(
      "Stat-block dependency fixture requires at least two installed targets",
    );
  }
  const compactPublication = {
    ...publication,
    units: [dependencyFreeUnit],
    statBlocks: [firstStatBlock],
  };
  const compactDependencyPublication = {
    ...publication,
    units: [dependencySourceUnit],
    statBlocks: dependencyStatBlocks,
  };
  const danglingDependencyPublication = {
    ...compactDependencyPublication,
    statBlocks: otherDependencyStatBlocks,
  };
  const schemaInvalidDependencyTargetPublication = {
    ...compactDependencyPublication,
    statBlocks: dependencyStatBlocks.map((record) =>
      String(record.id) === dependencyTargetId
        ? { ...record, unknownTargetField: true }
        : record,
    ),
  };
  const lastProvenance = requireObject(
    firstStatBlock.provenance,
    "first stat block provenance",
  );
  const cases: readonly PortableCase[] = [
    makeCase(oracle, contract, "valid published aggregate", {
      input: publication,
    }),
    makeCase(oracle, contract, "unknown field", {
      input: withRecord(compactPublication, "units", [
        { ...firstUnit, unknownField: true },
      ]),
    }),
    makeCase(oracle, contract, "non-SRD provenance", {
      input: withRecord(compactPublication, "statBlocks", [
        {
          ...firstStatBlock,
          provenance: { ...lastProvenance, kind: "synthetic-test" },
        },
      ]),
    }),
    makeCase(oracle, contract, "refinement violation", {
      input: withRecord(compactPublication, "statBlocks", [
        { ...firstStatBlock, challengeRating: 99 },
      ]),
    }),
    makeCase(oracle, contract, "empty collections", {
      input: { ...compactPublication, units: [], statBlocks: [] },
    }),
    makeCase(oracle, contract, "duplicate JSON member", {
      inputText:
        '{"kind":"srd-5.2.1-surface-catalog","units":[],"units":[],"statBlocks":[]}',
    }),
    makeCase(oracle, contract, "malformed JSON text", {
      inputText: '{"kind":"srd-5.2.1-surface-catalog",',
    }),
    makeCase(oracle, contract, "duplicate identity within one family", {
      input: withRecord(compactPublication, "units", [firstUnit, firstUnit]),
    }),
    makeCase(oracle, contract, "duplicate identity across record families", {
      input: withRecord(compactPublication, "statBlocks", [
        { ...firstStatBlock, id: dependencyFreeUnit.id },
      ]),
    }),
    makeCase(oracle, contract, "dangling authored dependency", {
      input: danglingDependencyPublication,
    }),
    makeCase(
      oracle,
      contract,
      "schema-invalid dependency target accumulates dangling issue",
      {
        input: schemaInvalidDependencyTargetPublication,
      },
    ),
    makeCase(oracle, contract, "independent record failures accumulate", {
      input: withRecord(
        withRecord(compactPublication, "units", [
          { ...firstUnit, unknownUnitField: true },
        ]),
        "statBlocks",
        [{ ...firstStatBlock, unknownStatBlockField: true }],
      ),
    }),
    makeCase(oracle, contract, "schema and dependency failures accumulate", {
      input: withRecord(
        withRecord(danglingDependencyPublication, "units", [
          { ...firstUnit, unknownUnitField: true },
          dependencySourceUnit,
        ]),
        "statBlocks",
        otherDependencyStatBlocks,
      ),
    }),
    makeCase(oracle, contract, "all canonical dependency fields are checked", {
      input: dependencyFailure,
    }),
    ...contract.map((role) =>
      makeCase(
        oracle,
        contract,
        `canonical dependency role: ${role.sourceKind}.${role.path}`,
        { input: dependencyRoleFailureInput(publication, role) },
      ),
    ),
  ];

  return { version: 1, dependencyContract: contract, cases };
}

export function buildSrdSurfacePortableCases(repositoryRoot: string): Buffer {
  const document = buildDocument(repositoryRoot);
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function main(): void {
  const repositoryRoot = process.cwd();
  const outputPath = join(
    repositoryRoot,
    "packages/surface/portable-cases/srd-surface-cases.json",
  );
  writeFileSync(outputPath, buildSrdSurfacePortableCases(repositoryRoot));
  console.log(`Wrote ${outputPath}`);
}

if (
  process.argv.some((argument) =>
    argument.endsWith("generate-surface-portable-cases.ts"),
  )
) {
  main();
}
