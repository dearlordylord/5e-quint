import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  PORTABLE_SURFACE_ISSUE_CODES,
  decodePortableSrdSurface,
  decodePortableSrdSurfaceText,
  derivePortableSrdDependencyFieldRoles,
  type PortableSrdSurfaceDecodeResult,
  type PortableSrdSurfaceIssue,
} from "./portable-surface.ts";
import {
  SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
  SURFACE_UNIT_DEPENDENCY_RELATIONS,
} from "./schema-base.ts";
import {
  PortableSurfaceOracle,
  type PortableCaseIssue,
  type PortableCaseOutcome,
  type PortableOracleResult,
} from "../../../../scripts/surface-portable-case-oracle.ts";

const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);

const dependencyRelationSchema = Schema.Literals([
  ...SURFACE_UNIT_DEPENDENCY_RELATIONS,
  ...SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
]);
const plainIssueSchema = Schema.Struct({
  code: Schema.Literals(["json", "shape", "schema"]),
  path: NonEmptyTrimmedStringSchema,
});
const duplicateJsonMemberIssueSchema = Schema.Struct({
  code: Schema.Literal("duplicate-json-member"),
  path: NonEmptyTrimmedStringSchema,
  memberName: NonEmptyTrimmedStringSchema,
});
const duplicateIdentityIssueSchema = Schema.Struct({
  code: Schema.Literal("duplicate-authored-identity"),
  path: NonEmptyTrimmedStringSchema,
  targetKind: Schema.Literals(["unit", "statBlock"]),
  targetId: NonEmptyTrimmedStringSchema,
  priorPath: NonEmptyTrimmedStringSchema,
});
const danglingDependencyIssueSchema = Schema.Struct({
  code: Schema.Literal("dangling-authored-dependency"),
  path: NonEmptyTrimmedStringSchema,
  targetKind: Schema.Literals(["unit", "statBlock"]),
  targetId: NonEmptyTrimmedStringSchema,
  relation: dependencyRelationSchema,
});
const unsupportedSchemaNodeIssueSchema = Schema.Struct({
  code: Schema.Literal("unsupported-schema-node"),
  path: NonEmptyTrimmedStringSchema,
  astTag: NonEmptyTrimmedStringSchema,
});
const issueSchema = Schema.Union([
  plainIssueSchema,
  duplicateJsonMemberIssueSchema,
  duplicateIdentityIssueSchema,
  danglingDependencyIssueSchema,
  unsupportedSchemaNodeIssueSchema,
]);
const outcomeSchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("accepted") }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    issues: Schema.NonEmptyArray(issueSchema),
  }),
]);
const dependencyRoleSchema = Schema.Struct({
  sourceKind: Schema.Literals(["unit", "statBlock"]),
  path: NonEmptyTrimmedStringSchema,
  fieldName: NonEmptyTrimmedStringSchema,
  targetKind: Schema.Literals(["unit", "statBlock"]),
  relation: dependencyRelationSchema,
});
const expectedSchema = Schema.Struct({
  production: outcomeSchema,
  independent: outcomeSchema,
});
const caseWithInputSchema = Schema.Struct({
  name: NonEmptyTrimmedStringSchema,
  input: Schema.Unknown,
  expected: expectedSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (value) =>
        value.input !== undefined && !Object.hasOwn(value, "inputText"),
    ),
  ),
);
const caseWithTextSchema = Schema.Struct({
  name: NonEmptyTrimmedStringSchema,
  inputText: NonEmptyTrimmedStringSchema,
  expected: expectedSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (value) =>
        typeof value.inputText === "string" && !Object.hasOwn(value, "input"),
    ),
  ),
);
const portableCaseSchema = Schema.Union([
  caseWithInputSchema,
  caseWithTextSchema,
]);
const portableCaseDocumentSchema = Schema.Struct({
  version: Schema.Literal(1),
  dependencyContract: Schema.NonEmptyArray(dependencyRoleSchema),
  cases: Schema.NonEmptyArray(portableCaseSchema),
});
const dependencyContractDocumentSchema = Schema.Struct({
  version: Schema.Literal(1),
  roles: Schema.NonEmptyArray(dependencyRoleSchema),
});

type PortableCaseDocument = Schema.Schema.Type<
  typeof portableCaseDocumentSchema
>;
type PortableCase = PortableCaseDocument["cases"][number];
type DependencyContractDocument = Schema.Schema.Type<
  typeof dependencyContractDocumentSchema
>;

const caseDocumentPath = fileURLToPath(
  new URL("../../portable-cases/srd-surface-cases.json", import.meta.url),
);
const dependencyContractPath = fileURLToPath(
  new URL(
    "../../portable-cases/srd-surface-dependency-contract.json",
    import.meta.url,
  ),
);
const schemaPath = fileURLToPath(
  new URL("../../publication/srd-surface.schema.json", import.meta.url),
);
const publicationPath = fileURLToPath(
  new URL("../../publication/srd-surface.json", import.meta.url),
);

function readPortableJson(path: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`JSON input is not readable at ${path}: ${String(error)}`);
  }
  return parsed;
}

function decodeDocument<T>(
  schema: Schema.ConstraintDecoder<T, never>,
  value: unknown,
  path: string,
): T {
  const decoded = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "error",
  })(value);
  if (Result.isFailure(decoded)) {
    throw new Error(
      `JSON input failed its schema at ${path}: ${String(decoded.failure)}`,
    );
  }
  return decoded.success;
}

const caseDocument = decodeDocument(
  portableCaseDocumentSchema,
  readPortableJson(caseDocumentPath),
  caseDocumentPath,
);
const dependencyContractDocument = decodeDocument<DependencyContractDocument>(
  dependencyContractDocumentSchema,
  readPortableJson(dependencyContractPath),
  dependencyContractPath,
);
const independentSchema = readPortableJson(schemaPath);
const independentOracle = new PortableSurfaceOracle(independentSchema);

function portableInput(portableCase: PortableCase) {
  return "inputText" in portableCase
    ? ({ inputText: portableCase.inputText } as const)
    : ({ input: portableCase.input } as const);
}

function productionResultForCase(
  portableCase: PortableCase,
): PortableSrdSurfaceDecodeResult {
  return "inputText" in portableCase
    ? decodePortableSrdSurfaceText(portableCase.inputText)
    : decodePortableSrdSurface(portableCase.input);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function firstRecordId(input: unknown, family: "units" | "statBlocks"): string {
  if (!isRecord(input)) {
    throw new Error("Portable duplicate fixture input must be an object");
  }
  const records = input[family];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`Portable duplicate fixture ${family} must be non-empty`);
  }
  const record = records[0];
  if (!isRecord(record) || typeof record.id !== "string") {
    throw new Error(`Portable duplicate fixture ${family}[0] must have an id`);
  }
  return record.id;
}

function impossible(value: never): never {
  throw new Error(`Unexpected portable issue variant: ${String(value)}`);
}

function issueWithoutMessage(
  issue: PortableSrdSurfaceIssue,
): PortableCaseIssue {
  switch (issue.code) {
    case "json":
    case "shape":
    case "schema":
      return { code: issue.code, path: issue.path };
    case "duplicate-json-member":
      return {
        code: issue.code,
        path: issue.path,
        memberName: issue.memberName,
      };
    case "duplicate-authored-identity":
      return {
        code: issue.code,
        path: issue.path,
        targetKind: issue.targetKind,
        targetId: issue.targetId,
        priorPath: issue.priorPath,
      };
    case "dangling-authored-dependency":
      return {
        code: issue.code,
        path: issue.path,
        targetKind: issue.targetKind,
        targetId: issue.targetId,
        relation: issue.relation,
      };
    case "unsupported-schema-node":
      return { code: issue.code, path: issue.path, astTag: issue.astTag };
  }
  return impossible(issue);
}

function normalizeIssues(
  issues: readonly PortableCaseIssue[],
): readonly PortableCaseIssue[] {
  return [...issues].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function expectProductionOutcome(
  result: PortableSrdSurfaceDecodeResult,
  expected: PortableCaseOutcome,
): void {
  expect(result.tag).toBe(expected.tag);
  if (expected.tag === "accepted") {
    expect(result).toHaveProperty("surface");
    return;
  }
  expect(result).not.toHaveProperty("surface");
  if (result.tag !== "rejected") return;
  expect(normalizeIssues(result.issues.map(issueWithoutMessage))).toEqual(
    normalizeIssues(expected.issues),
  );
}

function expectIndependentOutcome(
  result: PortableOracleResult,
  expected: PortableCaseOutcome,
): void {
  expect(result.tag).toBe(expected.tag);
  if (expected.tag === "accepted") {
    expect(result).toHaveProperty("catalog");
    return;
  }
  expect(result).not.toHaveProperty("catalog");
  if (result.tag !== "rejected") return;
  expect(normalizeIssues(result.issues)).toEqual(
    normalizeIssues(expected.issues),
  );
}

describe("portable SRD Surface boundary", () => {
  test("portable expected outcomes contain complete typed issue data", () => {
    const expectedCodes = new Set(
      caseDocument.cases.flatMap((portableCase) => [
        ...(portableCase.expected.production.tag === "rejected"
          ? portableCase.expected.production.issues.map((issue) => issue.code)
          : []),
        ...(portableCase.expected.independent.tag === "rejected"
          ? portableCase.expected.independent.issues.map((issue) => issue.code)
          : []),
      ]),
    );
    expect(
      [...expectedCodes].every((code) =>
        PORTABLE_SURFACE_ISSUE_CODES.includes(code),
      ),
    ).toBe(true);
    for (const portableCase of caseDocument.cases) {
      for (const outcome of [
        portableCase.expected.production,
        portableCase.expected.independent,
      ]) {
        if (outcome.tag !== "rejected") continue;
        expect(outcome.issues.length).toBeGreaterThan(0);
        for (const issue of outcome.issues) {
          expect(issue.path.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("portable case decoding requires one input representation and non-empty rejection issues", () => {
    const acceptedExpected = {
      production: { tag: "accepted" },
      independent: { tag: "accepted" },
    } as const;
    const rejectedExpected = {
      production: {
        tag: "rejected",
        issues: [{ code: "schema", path: "$.units[0]" }],
      },
      independent: {
        tag: "rejected",
        issues: [{ code: "schema", path: "$.units[0]" }],
      },
    } as const;
    const withoutInput = {
      name: "missing input",
      expected: acceptedExpected,
    };
    const withBothInputs = {
      name: "both inputs",
      input: {},
      inputText: "{}",
      expected: acceptedExpected,
    };
    const withEmptyIssues = {
      name: "empty issues",
      input: {},
      expected: {
        production: { tag: "rejected", issues: [] },
        independent: rejectedExpected.independent,
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(portableCaseSchema, {
          onExcessProperty: "error",
        })(withoutInput),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(portableCaseSchema, {
          onExcessProperty: "error",
        })(withBothInputs),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(portableCaseSchema, {
          onExcessProperty: "error",
        })(withEmptyIssues),
      ),
    ).toBe(true);
  });

  test("cross-family duplicate identity fixture duplicates the dependency-free unit", () => {
    const duplicateCase = caseDocument.cases.find(
      (portableCase) =>
        portableCase.name === "duplicate identity across record families",
    );
    if (duplicateCase === undefined || !("input" in duplicateCase)) {
      throw new Error("Portable cases lost the cross-family duplicate fixture");
    }
    const unitId = firstRecordId(duplicateCase.input, "units");
    const statBlockId = firstRecordId(duplicateCase.input, "statBlocks");
    expect(statBlockId).toBe(unitId);

    const result = decodePortableSrdSurface(duplicateCase.input);
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate-authored-identity",
        path: "$.statBlocks[0].id",
        targetKind: "statBlock",
        targetId: unitId,
        priorPath: "$.units[0].id",
      }),
    );
  });

  test("rejects distinct Stat Block ids with the same normalized name", () => {
    const validCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "valid published aggregate",
    );
    if (validCase === undefined || !("input" in validCase)) {
      throw new Error("Portable cases lost their valid aggregate input");
    }
    if (!isRecord(validCase.input)) {
      throw new Error("Portable aggregate input must be an object");
    }
    const input = validCase.input;
    const rawStatBlocks = input.statBlocks;
    if (!Array.isArray(rawStatBlocks) || rawStatBlocks.length === 0) {
      throw new Error("Portable aggregate must contain Stat Blocks");
    }
    const firstStatBlock = rawStatBlocks[0];
    if (
      !isRecord(firstStatBlock) ||
      typeof firstStatBlock.id !== "string" ||
      typeof firstStatBlock.name !== "string"
    ) {
      throw new Error(
        "Portable Stat Block fixture must contain identity fields",
      );
    }
    const duplicateStatBlock = {
      ...firstStatBlock,
      id: `${firstStatBlock.id}_duplicate_normalized_identity`,
      name: firstStatBlock.name.toUpperCase(),
    };
    const result = decodePortableSrdSurface({
      ...input,
      statBlocks: [
        firstStatBlock,
        duplicateStatBlock,
        ...rawStatBlocks.slice(1),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate-authored-identity",
        path: "$.statBlocks[1].id",
        targetKind: "statBlock",
        targetId: duplicateStatBlock.id,
        priorPath: "$.statBlocks[0].id",
      }),
    );
  });

  test.each([
    [
      "whitespace and nested values",
      ' { "unknown": [true, null, "text", {}, []]} ',
    ],
    ["empty object", "{}"],
    ["empty array", "[]"],
    ["primitive root", "42"],
    ["missing member name", "{1:2}"],
    ["missing member colon", '{"unknown" 2}'],
    ["missing member value", '{"unknown":}'],
    ["missing member separator", '{"unknown":2 "other":3}'],
    ["missing array value", "[1,]"],
    ["missing array separator", "[1 2]"],
    ["unterminated array", "[1"],
    ["unterminated string", '{"unknown":"text}'],
    ["invalid string escape", '{"unknown":"\\q"}'],
    ["trailing value", "{} trailing"],
  ])("JSON boundary scanner handles %s", (_name, inputText) => {
    const result = decodePortableSrdSurfaceText(inputText);
    expect(result.tag).toBe("rejected");
  });

  test("reports one identity issue when an exact Stat Block record repeats", () => {
    const validCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "valid published aggregate",
    );
    if (validCase === undefined || !("input" in validCase)) {
      throw new Error("Portable cases lost their valid aggregate input");
    }
    if (!isRecord(validCase.input)) {
      throw new Error("Portable aggregate input must be an object");
    }
    const input = validCase.input;
    const statBlocks = input.statBlocks;
    if (!Array.isArray(statBlocks) || statBlocks.length === 0) {
      throw new Error("Portable aggregate must contain Stat Blocks");
    }
    const firstStatBlock = statBlocks[0];
    if (!isRecord(firstStatBlock) || typeof firstStatBlock.id !== "string") {
      throw new Error("Portable Stat Block fixture must contain an id");
    }

    const result = decodePortableSrdSurface({
      ...input,
      statBlocks: [firstStatBlock, firstStatBlock, ...statBlocks.slice(1)],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "duplicate-authored-identity",
        path: "$.statBlocks[1].id",
        targetKind: "statBlock",
        targetId: firstStatBlock.id,
        priorPath: "$.statBlocks[0].id",
      }),
    );
  });

  test("raw boundary reports non-object and malformed collection shapes", () => {
    const cases: readonly unknown[] = [
      null,
      42,
      { kind: "srd-5.2.1-surface-catalog", units: [], statBlocks: [] },
      {
        kind: "srd-5.2.1-surface-catalog",
        units: "not-an-array",
        statBlocks: "not-an-array",
      },
    ];
    for (const input of cases) {
      const result = decodePortableSrdSurface(input);
      expect(result.tag).toBe("rejected");
    }
  });

  test("the explicit dependency contract cross-checks the production schema walker", () => {
    expect(caseDocument.dependencyContract).toEqual(
      dependencyContractDocument.roles,
    );
    const validCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "valid published aggregate",
    );
    if (validCase === undefined || !("input" in validCase)) {
      throw new Error("Portable cases lost their valid aggregate input");
    }
    const result = decodePortableSrdSurface(validCase.input);
    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") return;
    expect(derivePortableSrdDependencyFieldRoles(result.surface)).toEqual(
      dependencyContractDocument.roles,
    );
  });

  test("the complete published catalog satisfies the same dependency contract", () => {
    const result = decodePortableSrdSurface(readPortableJson(publicationPath));
    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") return;

    expect(result.surface.units.some((unit) => unit.id === "mage_hand")).toBe(
      true,
    );
    expect(
      result.surface.statBlocks.some(
        (statBlock) => statBlock.id === "stat_block_zombie",
      ),
    ).toBe(true);
    expect(derivePortableSrdDependencyFieldRoles(result.surface)).toEqual(
      dependencyContractDocument.roles,
    );
  });

  test("the canonical dependency failure fixture proves every declared role", () => {
    const allDependenciesCase = caseDocument.cases.find(
      (portableCase) =>
        portableCase.name === "all canonical dependency fields are checked",
    );
    if (
      allDependenciesCase === undefined ||
      allDependenciesCase.expected.production.tag !== "rejected" ||
      allDependenciesCase.expected.independent.tag !== "rejected"
    ) {
      throw new Error("Portable cases lost the canonical dependency fixture");
    }

    const roleKey = (
      sourceKind: string,
      path: string,
      targetKind: string,
      relation: string,
    ) => `${sourceKind}\u0000${path}\u0000${targetKind}\u0000${relation}`;
    const expectedRoleKeys = new Set(
      dependencyContractDocument.roles.map((role) =>
        roleKey(role.sourceKind, role.path, role.targetKind, role.relation),
      ),
    );
    const roleCases = caseDocument.cases.filter((portableCase) =>
      portableCase.name.startsWith("canonical dependency role:"),
    );
    expect(roleCases).toHaveLength(dependencyContractDocument.roles.length);
    const issueRoleKeys = (issues: readonly PortableCaseIssue[]) =>
      new Set(
        issues.flatMap((issue) => {
          if (issue.code !== "dangling-authored-dependency") return [];
          const match = /^\$\.(units|statBlocks)\[\d+\]\.(.*)$/.exec(
            issue.path,
          );
          if (match === null) return [];
          const sourceKind = match[1] === "units" ? "unit" : "statBlock";
          return [
            roleKey(
              sourceKind,
              match[2].replace(/\[\d+\]/g, "[]"),
              issue.targetKind,
              issue.relation,
            ),
          ];
        }),
      );

    for (const lane of ["production", "independent"] as const) {
      const allDependencyOutcome = allDependenciesCase.expected[lane];
      if (allDependencyOutcome.tag !== "rejected") {
        throw new Error("Canonical dependency fixture must be rejected");
      }
      const issues = [
        allDependencyOutcome.issues,
        ...roleCases.flatMap((portableCase) => {
          const outcome = portableCase.expected[lane];
          return outcome.tag === "rejected" ? [outcome.issues] : [];
        }),
      ].flat();
      expect(issueRoleKeys(issues)).toEqual(expectedRoleKeys);
    }
  });

  test.each(caseDocument.cases)(
    "$name — production boundary",
    (portableCase) => {
      expectProductionOutcome(
        productionResultForCase(portableCase),
        portableCase.expected.production,
      );
    },
  );

  test.each(caseDocument.cases)(
    "$name — independent Draft 2020-12 boundary",
    (portableCase) => {
      const result = independentOracle.evaluateInput(
        portableInput(portableCase),
        caseDocument.dependencyContract,
      );
      expectIndependentOutcome(result, portableCase.expected.independent);
    },
    300_000,
  );

  test("independent rejection is atomic and never exposes a partial catalog", () => {
    const rejectedCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "unknown field",
    );
    if (rejectedCase === undefined) {
      throw new Error("Portable cases lost the atomic rejection fixture");
    }
    const result = independentOracle.evaluateInput(
      portableInput(rejectedCase),
      caseDocument.dependencyContract,
    );
    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result).toEqual({ tag: "rejected", issues: result.issues });
    expect(result).not.toHaveProperty("catalog");
  });
});
