import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  PORTABLE_SURFACE_ISSUE_CODES,
  decodePortableSrdSurface,
  type PortableSrdSurfaceIssueCode,
} from "./portable-surface.ts";

type PortableCaseOperation =
  | {
      readonly op: "add" | "replace";
      readonly path: string;
      readonly value: unknown;
    }
  | { readonly op: "remove"; readonly path: string }
  | { readonly op: "copy"; readonly from: string; readonly path: string };

type PortableCaseIndex = {
  readonly version: number;
  readonly baseArtifact: string;
  readonly cases: readonly {
    readonly name: string;
    readonly operations: readonly PortableCaseOperation[];
    readonly expected: {
      readonly tag: "accepted" | "rejected";
      readonly productionIssueCodes: readonly PortableSrdSurfaceIssueCode[];
      readonly independentIssueCodes: readonly string[];
    };
  }[];
};

const caseIndexPath = fileURLToPath(
  new URL("../../portable-cases/srd-surface-case-index.json", import.meta.url),
);
// The checked-in case index is the portable fixture contract consumed by this
// test; each operation and expected issue code is exercised below.
const caseIndex = JSON.parse(
  readFileSync(caseIndexPath, "utf8"),
) as PortableCaseIndex;
if (caseIndex.version !== 1) {
  throw new Error(
    `Unsupported portable Surface case index: ${caseIndex.version}`,
  );
}
const publication: unknown = JSON.parse(
  readFileSync(join(dirname(caseIndexPath), caseIndex.baseArtifact), "utf8"),
);

function pointerSegments(pointer: string): readonly string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) {
    throw new Error(`Expected a JSON Pointer, received ${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function readPointer(root: unknown, pointer: string): unknown {
  let current = root;
  for (const segment of pointerSegments(pointer)) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new Error(`Array pointer segment is not present: ${pointer}`);
      }
      current = current[index];
    } else if (isRecord(current)) {
      if (!Object.hasOwn(current, segment)) {
        throw new Error(`Object pointer segment is not present: ${pointer}`);
      }
      current = current[segment];
    } else {
      throw new Error(`Cannot descend through a scalar: ${pointer}`);
    }
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writePointer(
  root: unknown,
  pointer: string,
  value: unknown,
  operation: "add" | "replace" | "remove",
): void {
  const segments = pointerSegments(pointer);
  const key = segments.at(-1);
  if (key === undefined) {
    throw new Error("Portable case operations cannot replace the root");
  }
  let parent = root;
  for (const segment of segments.slice(0, -1)) {
    parent = readPointer(parent, `/${segment}`);
  }

  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new Error(`Array pointer target is not present: ${pointer}`);
    }
    if (operation === "add") parent.splice(index, 0, value);
    else if (operation === "replace") {
      if (index === parent.length) {
        throw new Error(`Array replacement target is not present: ${pointer}`);
      }
      parent[index] = value;
    } else {
      if (index === parent.length) {
        throw new Error(`Array removal target is not present: ${pointer}`);
      }
      parent.splice(index, 1);
    }
    return;
  }
  if (!isRecord(parent)) {
    throw new Error(`Portable case target is not a container: ${pointer}`);
  }
  if (operation === "remove") {
    if (!Object.hasOwn(parent, key)) {
      throw new Error(`Object removal target is not present: ${pointer}`);
    }
    delete parent[key];
  } else {
    parent[key] = value;
  }
}

function applyOperations(
  base: unknown,
  operations: readonly PortableCaseOperation[],
): unknown {
  const result = structuredClone(base);
  for (const operation of operations) {
    if (operation.op === "copy") {
      writePointer(
        result,
        operation.path,
        structuredClone(readPointer(result, operation.from)),
        "add",
      );
    } else if (operation.op === "remove") {
      writePointer(result, operation.path, undefined, "remove");
    } else {
      writePointer(result, operation.path, operation.value, operation.op);
    }
  }
  return result;
}

type PortableTestCase = {
  readonly name: string;
  readonly input: unknown;
  readonly expected:
    | { readonly tag: "accepted" }
    | {
        readonly tag: "rejected";
        readonly issueCodes: readonly PortableSrdSurfaceIssueCode[];
      };
  readonly independentIssueCodes: readonly string[];
};

const cases: readonly PortableTestCase[] = caseIndex.cases.map((entry) => ({
  name: entry.name,
  input: applyOperations(publication, entry.operations),
  expected:
    entry.expected.tag === "accepted"
      ? { tag: "accepted" }
      : {
          tag: "rejected",
          issueCodes: entry.expected.productionIssueCodes,
        },
  independentIssueCodes: entry.expected.independentIssueCodes,
}));

describe("portable SRD Surface boundary", () => {
  test("cases exercise the complete typed issue vocabulary", () => {
    const caseIssueCodes = new Set(
      cases.flatMap((portableCase) =>
        portableCase.expected.tag === "rejected"
          ? portableCase.expected.issueCodes
          : [],
      ),
    );
    expect([...caseIssueCodes].sort()).toEqual(
      [...PORTABLE_SURFACE_ISSUE_CODES].sort(),
    );
  });

  test.each(cases)("$name", (portableCase) => {
    const result = decodePortableSrdSurface(portableCase.input);

    if (portableCase.expected.tag === "accepted") {
      expect(result).toEqual({ tag: "accepted", surface: expect.anything() });
      return;
    }

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(
      portableCase.expected.issueCodes,
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

          const cases = JSON.parse(readFileSync(0, "utf8"));
          const schema = JSON.parse(readFileSync(${JSON.stringify(schemaPath)}, "utf8"));
          const validate = new Ajv2020({
            strict: false,
            inlineRefs: false,
            code: { optimize: 0 },
          }).compile(schema);

          const identityIssues = (aggregate) => {
            const seen = new Set();
            const issues = [];
            for (const family of ["units", "statBlocks"]) {
              for (const [index, record] of aggregate[family].entries()) {
                if (seen.has(record.id)) issues.push("duplicate-authored-identity");
                else seen.add(record.id);
              }
            }
            return issues;
          };

          const dependencyIssues = (aggregate) => {
            const statBlockIds = new Set(aggregate.statBlocks.map((record) => record.id));
            const issues = [];
            const visit = (value) => {
              if (Array.isArray(value)) {
                for (const item of value) visit(item);
                return;
              }
              if (value === null || typeof value !== "object") return;
              for (const [key, member] of Object.entries(value)) {
                if (
                  (key === "statBlockId" || key === "monsterId") &&
                  typeof member === "string" &&
                  !statBlockIds.has(member)
                ) {
                  issues.push("dangling-authored-dependency");
                }
                visit(member);
              }
            };
            visit(aggregate.units);
            visit(aggregate.statBlocks);
            return issues;
          };

          for (const portableCase of cases) {
            const structurallyValid = validate(portableCase.input);
            const issueCodes = structurallyValid
              ? [...identityIssues(portableCase.input), ...dependencyIssues(portableCase.input)]
              : ["schema"];
            const expected = portableCase.independentIssueCodes;
            if (JSON.stringify(issueCodes) !== JSON.stringify(expected)) {
              console.error(portableCase.name + " mismatch: " + JSON.stringify(issueCodes));
              process.exit(1);
            }
          }
          console.log("portable cases accepted atomically");
        `,
      ],
      {
        input: JSON.stringify(cases),
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(result.trim()).toBe("portable cases accepted atomically");
  }, 180_000);
});
