import { describe, expect, test } from "vitest";

import {
  complexityBaselineIssues,
  complexityMeasurementsFromEslint,
  complexityRegressionsAgainstBaseline,
  type ComplexityBaseline,
} from "./cyclomatic-complexity-policy.mjs";
import { sourceGlobsUnder } from "./workspace-source-policy.mjs";

describe("cyclomatic complexity quality policy", () => {
  test("retains recursive source exclusions when adapting shared globs for coverage", () => {
    expect(sourceGlobsUnder("src")).toContain("src/**/*.test-support.ts");
    expect(sourceGlobsUnder("src")).toContain("src/**/*.test.ts");
  });

  test("projects classic complexity diagnostics into stable per-function identities", () => {
    expect(
      complexityMeasurementsFromEslint(
        "/workspace",
        [
          {
            filePath: "/workspace/packages/example/src/second.ts",
            messages: [
              {
                ruleId: "complexity",
                message:
                  "Function 'second' has a complexity of 11. Maximum allowed is 8.",
                line: 2,
                column: 1,
              },
              { ruleId: "no-unused-vars", message: "unrelated" },
            ],
          },
          {
            filePath: "/workspace/packages/example/src/first.ts",
            messages: [
              {
                ruleId: "complexity",
                message:
                  "Function 'larger' has a complexity of 13. Maximum allowed is 8.",
                line: 1,
                column: 1,
              },
              {
                ruleId: "complexity",
                message:
                  "Arrow function has a complexity of 9. Maximum allowed is 8.",
                line: 2,
                column: 1,
              },
            ],
          },
        ],
        (filename, diagnostic) =>
          `${filename.split("/").at(-1)}:${diagnostic.line}`,
      ),
    ).toEqual({
      "packages/example/src/first.ts": {
        "first.ts:1": 13,
        "first.ts:2": 9,
      },
      "packages/example/src/second.ts": { "second.ts:2": 11 },
    });
  });

  test("accepts only the exact recorded policy and per-function measurements", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": { larger: 13, smaller: 9 },
      },
    };

    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": { larger: 13, smaller: 9 },
      }),
    ).toEqual([]);
    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": { larger: 14, smaller: 9 },
        "packages/example/src/new.ts": { added: 10 },
      }),
    ).toEqual([
      "packages/example/src/first.ts :: larger: expected 13, found 14",
      "packages/example/src/new.ts :: added: expected absent, found 10",
    ]);
  });

  test("requires pruning after complexity debt is reduced or removed", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": { larger: 13, smaller: 9 },
        "packages/example/src/removed.ts": { removed: 10 },
      },
    };

    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": { larger: 12 },
      }),
    ).toEqual([
      "packages/example/src/first.ts :: larger: expected 13, found 12",
      "packages/example/src/first.ts :: smaller: expected 9, found absent",
      "packages/example/src/removed.ts :: removed: expected 10, found absent",
    ]);
  });

  test("allows baseline pruning only when every recorded function improves", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": { larger: 13, smaller: 9 },
      },
    };

    expect(
      complexityRegressionsAgainstBaseline(baseline, {
        "packages/example/src/first.ts": { larger: 12 },
      }),
    ).toEqual([]);
    expect(
      complexityRegressionsAgainstBaseline(baseline, {
        "packages/example/src/first.ts": { larger: 12, smaller: 10 },
        "packages/example/src/new.ts": { added: 9 },
      }),
    ).toEqual([
      "packages/example/src/first.ts :: smaller: increased from 9 to 10",
      "packages/example/src/new.ts :: added: added complexity 9 above the threshold",
    ]);
  });

  test("rejects policy drift independently of measured source complexity", () => {
    const baseline: ComplexityBaseline = {
      threshold: 9,
      variant: "modified",
      files: {},
    };

    expect(complexityBaselineIssues(baseline, 8, "classic", {})).toEqual([
      "baseline threshold is 9; configured threshold is 8",
      'baseline variant is "modified"; configured variant is "classic"',
    ]);
  });
});
