import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Either, ParseResult, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  PORTABLE_SURFACE_ISSUE_CODES,
  decodePortableSrdSurface,
  decodePortableSrdSurfaceText,
  derivePortableSrdDependencyFieldRoles,
  type PortableSrdSurfaceDecodeResult,
  type PortableSrdSurfaceIssueCode,
} from "./portable-surface.ts";
import {
  SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
  SURFACE_UNIT_DEPENDENCY_RELATIONS,
} from "./schema-base.ts";

const issueCodeSchema = Schema.Literal(...PORTABLE_SURFACE_ISSUE_CODES);
const dependencyRelationSchema = Schema.Literal(
  ...[
    ...SURFACE_UNIT_DEPENDENCY_RELATIONS,
    ...SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
  ],
);
const outcomeSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    issueCodes: Schema.Tuple(),
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    issueCodes: Schema.Array(issueCodeSchema),
  }),
);
const dependencyRoleSchema = Schema.Struct({
  sourceKind: Schema.Literal("unit", "statBlock"),
  path: Schema.NonEmptyTrimmedString,
  fieldName: Schema.NonEmptyTrimmedString,
  targetKind: Schema.Literal("unit", "statBlock"),
  relation: dependencyRelationSchema,
});
const caseWithInputSchema = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  input: Schema.Unknown,
  expected: Schema.Struct({
    production: outcomeSchema,
    independent: outcomeSchema,
  }),
});
const caseWithTextSchema = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  inputText: Schema.NonEmptyTrimmedString,
  expected: Schema.Struct({
    production: outcomeSchema,
    independent: outcomeSchema,
  }),
});
const portableCaseSchema = Schema.Union(
  caseWithInputSchema,
  caseWithTextSchema,
);
const portableCaseDocumentSchema = Schema.Struct({
  version: Schema.Literal(1),
  dependencyContract: Schema.Array(dependencyRoleSchema),
  cases: Schema.NonEmptyArray(portableCaseSchema),
});

type PortableCaseDocument = Schema.Schema.Type<
  typeof portableCaseDocumentSchema
>;
type PortableCase = PortableCaseDocument["cases"][number];

const caseDocumentPath = fileURLToPath(
  new URL("../../portable-cases/srd-surface-cases.json", import.meta.url),
);

function readPortableCaseDocument(): PortableCaseDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(caseDocumentPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Portable case document is not valid JSON: ${String(error)}`,
    );
  }
  const decoded = Schema.decodeUnknownEither(portableCaseDocumentSchema, {
    onExcessProperty: "error",
  })(parsed);
  if (Either.isLeft(decoded)) {
    throw new Error(
      `Portable case document failed its schema: ${ParseResult.TreeFormatter.formatErrorSync(decoded.left)}`,
    );
  }
  return decoded.right;
}

const caseDocument = readPortableCaseDocument();

function productionResultForCase(
  portableCase: PortableCase,
): PortableSrdSurfaceDecodeResult {
  return "inputText" in portableCase
    ? decodePortableSrdSurfaceText(portableCase.inputText)
    : decodePortableSrdSurface(portableCase.input);
}

function expectedCodes(
  outcome:
    | { readonly tag: "accepted"; readonly issueCodes: readonly [] }
    | {
        readonly tag: "rejected";
        readonly issueCodes: readonly PortableSrdSurfaceIssueCode[];
      },
): readonly PortableSrdSurfaceIssueCode[] {
  return outcome.issueCodes;
}

describe("portable SRD Surface boundary", () => {
  test("case outcomes use the published typed issue vocabulary", () => {
    const expectedCodeSet = new Set(
      caseDocument.cases.flatMap((portableCase) => [
        ...expectedCodes(portableCase.expected.production),
        ...expectedCodes(portableCase.expected.independent),
      ]),
    );
    expect(
      [...expectedCodeSet].every((code) =>
        PORTABLE_SURFACE_ISSUE_CODES.includes(code),
      ),
    ).toBe(true);
    expect(PORTABLE_SURFACE_ISSUE_CODES).toContain("duplicate-json-member");
    expect(PORTABLE_SURFACE_ISSUE_CODES).toContain("unsupported-schema-node");
  });

  test("the dependency contract is derived from the canonical schema", () => {
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
      caseDocument.dependencyContract,
    );
  });

  test("issue variants carry only their code-specific metadata", () => {
    const duplicateCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "duplicate JSON member",
    );
    const danglingCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "dangling authored dependency",
    );
    const schemaCase = caseDocument.cases.find(
      (portableCase) => portableCase.name === "unknown field",
    );
    if (
      duplicateCase === undefined ||
      danglingCase === undefined ||
      schemaCase === undefined
    ) {
      throw new Error("Portable issue metadata cases are incomplete");
    }

    const duplicate = productionResultForCase(duplicateCase);
    const dangling = productionResultForCase(danglingCase);
    const schema = productionResultForCase(schemaCase);
    expect(duplicate.tag).toBe("rejected");
    expect(dangling.tag).toBe("rejected");
    expect(schema.tag).toBe("rejected");
    if (
      duplicate.tag !== "rejected" ||
      dangling.tag !== "rejected" ||
      schema.tag !== "rejected"
    ) {
      return;
    }
    expect(duplicate.issues[0]).toMatchObject({
      code: "duplicate-json-member",
      memberName: "units",
    });
    expect(duplicate.issues[0]).not.toHaveProperty("targetId");
    expect(dangling.issues[0]).toMatchObject({
      code: "dangling-authored-dependency",
      targetKind: "statBlock",
      targetId: "stat_block_bat",
      relation: "stat-block-reference",
    });
    expect(dangling.issues[0]).not.toHaveProperty("memberName");
    expect(schema.issues[0]).toMatchObject({ code: "schema" });
    expect(schema.issues[0]).not.toHaveProperty("targetId");
  });

  test.each(caseDocument.cases)("$name", (portableCase) => {
    const result = productionResultForCase(portableCase);
    const expected = portableCase.expected.production;
    expect(result.tag).toBe(expected.tag);
    if (expected.tag === "accepted") {
      expect(result).toEqual({ tag: "accepted", surface: expect.anything() });
      return;
    }
    if (result.tag !== "rejected") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expected.issueCodes,
    );
    expect(result).not.toHaveProperty("surface");
  });

  test("the same cases are atomic under an independent Draft 2020-12 implementation", () => {
    const schemaPath = fileURLToPath(
      new URL("../../publication/srd-surface.schema.json", import.meta.url),
    );
    const result = execFileSync(
      process.execPath,
      [
        "--max-old-space-size=512",
        "--input-type=module",
        "--eval",
        `
          import { readFileSync } from "node:fs";
          import Ajv2020 from "ajv/dist/2020.js";

          const document = JSON.parse(readFileSync(0, "utf8"));
          const schema = JSON.parse(readFileSync(${JSON.stringify(schemaPath)}, "utf8"));
          const validate = new Ajv2020({
            strict: false,
            inlineRefs: false,
            allErrors: true,
            code: { optimize: 0 },
          }).compile(schema);

          const duplicateJsonMembers = (text) => {
            let cursor = 0;
            const duplicates = [];
            const skipWhitespace = () => {
              while (/\\s/.test(text[cursor] ?? "")) cursor += 1;
            };
            const parseString = () => {
              if (text[cursor] !== '"') return undefined;
              const start = cursor++;
              let escaped = false;
              while (cursor < text.length) {
                const character = text[cursor++];
                if (escaped) escaped = false;
                else if (character === "\\\\") escaped = true;
                else if (character === '"') {
                  try {
                    const value = JSON.parse(text.slice(start, cursor));
                    return typeof value === "string" ? value : undefined;
                  } catch {
                    return undefined;
                  }
                }
              }
              return undefined;
            };
            const value = () => {
              skipWhitespace();
              if (text[cursor] === '"') return parseString() !== undefined;
              if (text[cursor] === "{") {
                cursor += 1;
                skipWhitespace();
                const names = new Set();
                if (text[cursor] === "}") { cursor += 1; return true; }
                while (cursor < text.length) {
                  skipWhitespace();
                  const name = parseString();
                  if (name === undefined) return false;
                  if (names.has(name)) duplicates.push(name);
                  names.add(name);
                  skipWhitespace();
                  if (text[cursor++] !== ":" || !value()) return false;
                  skipWhitespace();
                  if (text[cursor] === "}") { cursor += 1; return true; }
                  if (text[cursor++] !== ",") return false;
                }
                return false;
              }
              if (text[cursor] === "[") {
                cursor += 1;
                skipWhitespace();
                if (text[cursor] === "]") { cursor += 1; return true; }
                while (cursor < text.length) {
                  if (!value()) return false;
                  skipWhitespace();
                  if (text[cursor] === "]") { cursor += 1; return true; }
                  if (text[cursor++] !== ",") return false;
                }
                return false;
              }
              const start = cursor;
              while (cursor < text.length && !/[\\s,\\]}]/.test(text[cursor] ?? "")) cursor += 1;
              return cursor > start;
            };
            const valid = value();
            skipWhitespace();
            return valid && cursor === text.length ? duplicates : [];
          };

          const structuralIssueCodes = (input) => {
            const structurallyValid = validate(input);
            const paths = new Set();
            for (const error of validate.errors ?? []) {
              const recordPath = error.instancePath.match(/^\\/(?:units|statBlocks)\\/\\d+/)?.[0];
              paths.add(recordPath ?? (error.instancePath || "$"));
            }
            return {
              structurallyValid,
              issueCodes: [...paths].map(() => "schema"),
            };
          };

          const identityIssues = (aggregate) => {
            const seen = new Set();
            const issues = [];
            for (const family of ["units", "statBlocks"]) {
              for (const record of Array.isArray(aggregate[family]) ? aggregate[family] : []) {
                if (seen.has(record.id)) issues.push("duplicate-authored-identity");
                else seen.add(record.id);
              }
            }
            return issues;
          };

          const dependencyIssues = (aggregate) => {
            const unitIds = new Set((aggregate.units ?? []).map((record) => record.id));
            const statBlockIds = new Set((aggregate.statBlocks ?? []).map((record) => record.id));
            const issues = [];
            const visit = (value, sourceKind, path) => {
              if (Array.isArray(value)) {
                for (const item of value) visit(item, sourceKind, path + "[]");
                return;
              }
              if (value === null || typeof value !== "object") return;
              for (const [key, member] of Object.entries(value)) {
                const childPath = path === "" ? key : path + "." + key;
                const roles = document.dependencyContract.filter((role) =>
                  role.sourceKind === sourceKind && role.path === childPath,
                );
                if (typeof member === "string") {
                  for (const role of roles) {
                    const ids = role.targetKind === "unit" ? unitIds : statBlockIds;
                    if (!ids.has(member)) issues.push("dangling-authored-dependency");
                  }
                }
                visit(member, sourceKind, childPath);
              }
            };
            for (const record of aggregate.units ?? []) visit(record, "unit", "");
            for (const record of aggregate.statBlocks ?? []) visit(record, "statBlock", "");
            return issues;
          };

          for (const portableCase of document.cases) {
            if (portableCase.inputText !== undefined) {
              if (duplicateJsonMembers(portableCase.inputText).length > 0) {
                if (JSON.stringify(portableCase.expected.independent.issueCodes) !== JSON.stringify(["duplicate-json-member"])) {
                  console.error(portableCase.name + " duplicate-member mismatch");
                  process.exit(1);
                }
                continue;
              }
            }
            let input = portableCase.input;
            if (portableCase.inputText !== undefined) {
              try {
                input = JSON.parse(portableCase.inputText);
              } catch {
                if (
                  JSON.stringify(portableCase.expected.independent.issueCodes) !==
                  JSON.stringify(["json"])
                ) {
                  console.error(portableCase.name + " malformed-json mismatch");
                  process.exit(1);
                }
                continue;
              }
            }
            const structural = structuralIssueCodes(input);
            const issueCodes = [
              ...structural.issueCodes,
              ...identityIssues(input ?? {}),
              ...dependencyIssues(input ?? {}),
            ];
            if (JSON.stringify(issueCodes) !== JSON.stringify(portableCase.expected.independent.issueCodes)) {
              console.error(portableCase.name + " mismatch: " + JSON.stringify(issueCodes));
              process.exit(1);
            }
          }
          console.log("portable cases accepted atomically");
        `,
      ],
      {
        input: JSON.stringify(caseDocument),
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(result.trim()).toBe("portable cases accepted atomically");
  }, 180_000);
});
