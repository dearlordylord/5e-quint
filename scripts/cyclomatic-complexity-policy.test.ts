import { describe, expect, test } from "vitest";

import {
  complexityBaselineIssues,
  complexityMeasurementsFromEslint,
  complexityRegressionsAgainstBaseline,
  type ComplexityBaseline,
} from "./cyclomatic-complexity-policy.mjs";

describe("cyclomatic complexity quality policy", () => {
  test("projects classic complexity diagnostics into stable descending per-file vectors", () => {
    expect(
      complexityMeasurementsFromEslint("/workspace", [
        {
          filePath: "/workspace/packages/example/src/second.ts",
          messages: [
            {
              ruleId: "complexity",
              message:
                "Function 'second' has a complexity of 11. Maximum allowed is 8.",
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
            },
            {
              ruleId: "complexity",
              message:
                "Arrow function has a complexity of 9. Maximum allowed is 8.",
            },
          ],
        },
      ]),
    ).toEqual({
      "packages/example/src/first.ts": [13, 9],
      "packages/example/src/second.ts": [11],
    });
  });

  test("accepts only the exact recorded threshold, variant, files, and complexity vectors", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": [13, 9],
      },
    };

    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": [13, 9],
      }),
    ).toEqual([]);
    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": [14, 9],
        "packages/example/src/new.ts": [10],
      }),
    ).toEqual([
      "packages/example/src/first.ts: expected [13, 9], found [14, 9]",
      "packages/example/src/new.ts: expected [], found [10]",
    ]);
  });

  test("requires pruning after complexity debt is reduced or removed", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": [13, 9],
        "packages/example/src/removed.ts": [10],
      },
    };

    expect(
      complexityBaselineIssues(baseline, 8, "classic", {
        "packages/example/src/first.ts": [12],
      }),
    ).toEqual([
      "packages/example/src/first.ts: expected [13, 9], found [12]",
      "packages/example/src/removed.ts: expected [10], found []",
    ]);
  });

  test("allows baseline pruning only when every ranked violation improves", () => {
    const baseline: ComplexityBaseline = {
      threshold: 8,
      variant: "classic",
      files: {
        "packages/example/src/first.ts": [13, 9],
      },
    };

    expect(
      complexityRegressionsAgainstBaseline(baseline, {
        "packages/example/src/first.ts": [12],
      }),
    ).toEqual([]);
    expect(
      complexityRegressionsAgainstBaseline(baseline, {
        "packages/example/src/first.ts": [12, 10],
        "packages/example/src/new.ts": [9],
      }),
    ).toEqual([
      "packages/example/src/first.ts: ranked violation 2 increased from 9 to 10",
      "packages/example/src/new.ts: added 1 violation above the threshold",
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
