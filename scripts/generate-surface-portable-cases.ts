import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Match } from "effect";

import {
  decodePortableSrdSurface,
  decodePortableSrdSurfaceText,
  type PortableSrdSurfaceIssue,
} from "../packages/surface/src/surface/portable-surface.ts";
import {
  PORTABLE_CASE_ISSUE_CODES,
  type PortableCaseIssue,
  type PortableCaseInput,
  type PortableCaseOutcome,
  type PortableDependencyRole,
  type PortableIssueList,
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

type IndependentExpectationCase = {
  readonly name: string;
  readonly inputSha256: string;
  readonly expected: PortableCaseOutcome;
};

type IndependentExpectationDocument = {
  readonly version: 1;
  readonly schemaSha256: string;
  readonly dependencyContractSha256: string;
  readonly cases: readonly IndependentExpectationCase[];
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

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function jsonFingerprint(value: unknown): string {
  return sha256Text(JSON.stringify(value));
}

function inputFingerprint(input: PortableCaseInput): string {
  return jsonFingerprint(
    "input" in input
      ? { representation: "value", value: input.input }
      : { representation: "text", value: input.inputText },
  );
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

function requireSha256(value: unknown, context: string): string {
  const hash = requireNonEmptyString(value, context);
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error(`${context} must be a lowercase SHA-256 digest`);
  }
  return hash;
}

function requireOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  context: string,
): T {
  const candidate = requireNonEmptyString(value, context);
  const matched = values.find((entry) => entry === candidate);
  if (matched === undefined) {
    throw new Error(`${context} is unsupported: ${candidate}`);
  }
  return matched;
}

function requireNonEmptyIssues(
  issues: readonly PortableCaseIssue[],
  context: string,
): PortableIssueList {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error(`${context} must be non-empty`);
  }
  return [first, ...rest];
}

function requireIssue(value: unknown, context: string): PortableCaseIssue {
  const issue = requireObject(value, context);
  const code = requireOneOf(
    issue.code,
    PORTABLE_CASE_ISSUE_CODES,
    `${context}.code`,
  );
  const path = requireNonEmptyString(issue.path, `${context}.path`);
  return Match.value(code).pipe(
    Match.when("json", (): PortableCaseIssue => ({ code: "json", path })),
    Match.when("shape", (): PortableCaseIssue => ({ code: "shape", path })),
    Match.when("schema", (): PortableCaseIssue => ({ code: "schema", path })),
    Match.when(
      "duplicate-json-member",
      (): PortableCaseIssue => ({
        code: "duplicate-json-member",
        path,
        memberName: requireNonEmptyString(
          issue.memberName,
          `${context}.memberName`,
        ),
      }),
    ),
    Match.when(
      "duplicate-authored-identity",
      (): PortableCaseIssue => ({
        code: "duplicate-authored-identity",
        path,
        targetKind: requireOneOf(
          issue.targetKind,
          ["unit", "statBlock"],
          `${context}.targetKind`,
        ),
        targetId: requireNonEmptyString(issue.targetId, `${context}.targetId`),
        priorPath: requireNonEmptyString(
          issue.priorPath,
          `${context}.priorPath`,
        ),
      }),
    ),
    Match.when(
      "dangling-authored-dependency",
      (): PortableCaseIssue => ({
        code: "dangling-authored-dependency",
        path,
        targetKind: requireOneOf(
          issue.targetKind,
          ["unit", "statBlock"],
          `${context}.targetKind`,
        ),
        targetId: requireNonEmptyString(issue.targetId, `${context}.targetId`),
        relation: requireNonEmptyString(issue.relation, `${context}.relation`),
      }),
    ),
    Match.when(
      "unsupported-schema-node",
      (): PortableCaseIssue => ({
        code: "unsupported-schema-node",
        path,
        astTag: requireNonEmptyString(issue.astTag, `${context}.astTag`),
      }),
    ),
    Match.exhaustive,
  );
}

function requireOutcome(value: unknown, context: string): PortableCaseOutcome {
  const outcome = requireObject(value, context);
  const tag = requireOneOf(
    outcome.tag,
    ["accepted", "rejected"],
    `${context}.tag`,
  );
  return Match.value(tag).pipe(
    Match.when("accepted", () => ({ tag: "accepted" as const })),
    Match.when("rejected", () => {
      const issues = requireArray(outcome.issues, `${context}.issues`).map(
        (issue, index) => requireIssue(issue, `${context}.issues[${index}]`),
      );
      return {
        tag: "rejected" as const,
        issues: requireNonEmptyIssues(issues, `${context}.issues`),
      };
    }),
    Match.exhaustive,
  );
}

function readIndependentExpectationDocument(
  path: string,
): IndependentExpectationDocument {
  const document = requireObject(readJson(path), "independent expectations");
  if (document.version !== 1) {
    throw new Error("independent expectations version must be 1");
  }
  const cases = requireArray(
    document.cases,
    "independent expectations cases",
  ).map((entry, index) => {
    const expectation = requireObject(
      entry,
      `independent expectations case ${index}`,
    );
    return {
      name: requireNonEmptyString(
        expectation.name,
        `independent expectations case ${index}.name`,
      ),
      inputSha256: requireSha256(
        expectation.inputSha256,
        `independent expectations case ${index}.inputSha256`,
      ),
      expected: requireOutcome(
        expectation.expected,
        `independent expectations case ${index}.expected`,
      ),
    } satisfies IndependentExpectationCase;
  });
  const schemaSha256 = requireSha256(
    document.schemaSha256,
    "independent expectations schemaSha256",
  );
  const dependencyContractSha256 = requireSha256(
    document.dependencyContractSha256,
    "independent expectations dependencyContractSha256",
  );
  return {
    version: 1,
    schemaSha256,
    dependencyContractSha256,
    cases,
  };
}

export function readSrdSurfaceIndependentExpectations(
  path: string,
  schema: unknown,
  contract: readonly PortableDependencyRole[],
): ReadonlyMap<string, IndependentExpectationCase> {
  const document = readIndependentExpectationDocument(path);
  if (document.schemaSha256 !== jsonFingerprint(schema)) {
    throw new Error(
      "Independent expectations were authored for a different Surface schema",
    );
  }
  if (document.dependencyContractSha256 !== jsonFingerprint(contract)) {
    throw new Error(
      "Independent expectations were authored for a different dependency contract",
    );
  }
  const expectations = new Map<string, IndependentExpectationCase>();
  for (const expectation of document.cases) {
    if (expectations.has(expectation.name)) {
      throw new Error(
        `Independent expectations contain duplicate case name: ${expectation.name}`,
      );
    }
    expectations.set(expectation.name, expectation);
  }
  if (expectations.size === 0) {
    throw new Error("Independent expectations must contain at least one case");
  }
  return expectations;
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

function productionOutcome(input: PortableCaseInput): PortableCaseOutcome {
  const result =
    "inputText" in input
      ? decodePortableSrdSurfaceText(input.inputText)
      : decodePortableSrdSurface(input.input);
  if (result.tag === "accepted") return { tag: "accepted" };
  const issues = result.issues.map((issue) => portableCaseIssue(issue));
  return {
    tag: "rejected",
    issues: requireNonEmptyIssues(issues, "production outcome issues"),
  };
}

function portableCaseIssue(issue: PortableSrdSurfaceIssue): PortableCaseIssue {
  return Match.value(issue).pipe(
    Match.when(
      { code: "json" },
      ({ path }): PortableCaseIssue => ({ code: "json", path }),
    ),
    Match.when(
      { code: "shape" },
      ({ path }): PortableCaseIssue => ({ code: "shape", path }),
    ),
    Match.when(
      { code: "schema" },
      ({ path }): PortableCaseIssue => ({ code: "schema", path }),
    ),
    Match.when(
      { code: "duplicate-json-member" },
      ({ path, memberName }): PortableCaseIssue => ({
        code: "duplicate-json-member",
        path,
        memberName,
      }),
    ),
    Match.when(
      { code: "duplicate-authored-identity" },
      ({ path, targetKind, targetId, priorPath }): PortableCaseIssue => ({
        code: "duplicate-authored-identity",
        path,
        targetKind,
        targetId,
        priorPath,
      }),
    ),
    Match.when(
      { code: "dangling-authored-dependency" },
      ({ path, targetKind, targetId, relation }): PortableCaseIssue => ({
        code: "dangling-authored-dependency",
        path,
        targetKind,
        targetId,
        relation,
      }),
    ),
    Match.when(
      { code: "unsupported-schema-node" },
      ({ path, astTag }): PortableCaseIssue => ({
        code: "unsupported-schema-node",
        path,
        astTag,
      }),
    ),
    Match.exhaustive,
  );
}

export function independentOutcomeForCase(
  expectations: ReadonlyMap<string, IndependentExpectationCase>,
  name: string,
  input: PortableCaseInput,
): PortableCaseOutcome {
  const expectation = expectations.get(name);
  if (expectation === undefined) {
    throw new Error(`Independent expectations are missing case: ${name}`);
  }
  const actualInputSha256 = inputFingerprint(input);
  if (expectation.inputSha256 !== actualInputSha256) {
    throw new Error(
      `Independent expectations input mismatch for case ${name}: expected ${expectation.inputSha256}, received ${actualInputSha256}`,
    );
  }
  return expectation.expected;
}

function makeCase(
  expectations: ReadonlyMap<string, IndependentExpectationCase>,
  name: string,
  input: PortableCaseInput,
): PortableCase {
  return {
    ...input,
    name,
    expected: {
      production: productionOutcome(input),
      independent: independentOutcomeForCase(expectations, name, input),
    },
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
  const independentExpectations = readSrdSurfaceIndependentExpectations(
    join(
      repositoryRoot,
      "packages/surface/portable-cases/srd-surface-independent-expectations.json",
    ),
    schema,
    contract,
  );
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
    makeCase(independentExpectations, "valid published aggregate", {
      input: publication,
    }),
    makeCase(independentExpectations, "unknown field", {
      input: withRecord(compactPublication, "units", [
        { ...firstUnit, unknownField: true },
      ]),
    }),
    makeCase(independentExpectations, "non-SRD provenance", {
      input: withRecord(compactPublication, "statBlocks", [
        {
          ...firstStatBlock,
          provenance: { ...lastProvenance, kind: "synthetic-test" },
        },
      ]),
    }),
    makeCase(independentExpectations, "refinement violation", {
      input: withRecord(compactPublication, "statBlocks", [
        { ...firstStatBlock, challengeRating: 99 },
      ]),
    }),
    makeCase(independentExpectations, "empty collections", {
      input: { ...compactPublication, units: [], statBlocks: [] },
    }),
    makeCase(independentExpectations, "duplicate JSON member", {
      inputText:
        '{"kind":"srd-5.2.1-surface-catalog","units":[],"units":[],"statBlocks":[]}',
    }),
    makeCase(independentExpectations, "malformed JSON text", {
      inputText: '{"kind":"srd-5.2.1-surface-catalog",',
    }),
    makeCase(independentExpectations, "duplicate identity within one family", {
      input: withRecord(compactPublication, "units", [firstUnit, firstUnit]),
    }),
    makeCase(
      independentExpectations,
      "duplicate identity across record families",
      {
        input: withRecord(compactPublication, "statBlocks", [
          { ...firstStatBlock, id: dependencyFreeUnit.id },
        ]),
      },
    ),
    makeCase(independentExpectations, "dangling authored dependency", {
      input: danglingDependencyPublication,
    }),
    makeCase(
      independentExpectations,
      "schema-invalid dependency target accumulates dangling issue",
      {
        input: schemaInvalidDependencyTargetPublication,
      },
    ),
    makeCase(
      independentExpectations,
      "independent record failures accumulate",
      {
        input: withRecord(
          withRecord(compactPublication, "units", [
            { ...firstUnit, unknownUnitField: true },
          ]),
          "statBlocks",
          [{ ...firstStatBlock, unknownStatBlockField: true }],
        ),
      },
    ),
    makeCase(
      independentExpectations,
      "schema and dependency failures accumulate",
      {
        input: withRecord(
          withRecord(danglingDependencyPublication, "units", [
            { ...firstUnit, unknownUnitField: true },
            dependencySourceUnit,
          ]),
          "statBlocks",
          otherDependencyStatBlocks,
        ),
      },
    ),
    makeCase(
      independentExpectations,
      "all canonical dependency fields are checked",
      {
        input: dependencyFailure,
      },
    ),
    ...contract.map((role) =>
      makeCase(
        independentExpectations,
        `canonical dependency role: ${role.sourceKind}.${role.path}`,
        { input: dependencyRoleFailureInput(publication, role) },
      ),
    ),
  ];

  const caseNames = new Set<string>();
  for (const portableCase of cases) {
    if (caseNames.has(portableCase.name)) {
      throw new Error(
        `Generated portable cases contain duplicate name: ${portableCase.name}`,
      );
    }
    caseNames.add(portableCase.name);
  }
  const staleNames = [...independentExpectations.keys()].filter(
    (name) => !caseNames.has(name),
  );
  if (staleNames.length > 0) {
    throw new Error(
      `Independent expectations contain cases not generated anymore: ${staleNames.join(", ")}`,
    );
  }

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
