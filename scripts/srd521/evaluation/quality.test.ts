import { existsSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  multisetF1,
  normalizeText,
  parseSourceMap,
  polishFailures,
  shingles,
} from "./quality.ts";
import {
  REPOSITORY_ROOT,
  evaluationArtifactRoot,
  stripPdfPageFurniture,
} from "./runner.ts";

describe("SRD evaluator properties", () => {
  test("resolves the owning repository rather than its temporary parent", () => {
    expect(existsSync(join(REPOSITORY_ROOT, "package.json"))).toBe(true);
    expect(
      existsSync(join(REPOSITORY_ROOT, "scripts/srd521/generator/generate.py")),
    ).toBe(true);
  });

  test("confines evaluator artifacts below the approved scratch root", () => {
    expect(evaluationArtifactRoot(undefined, "benchmark")).toBe(
      join(REPOSITORY_ROOT, ".scratch/srd521-evaluation/benchmark"),
    );
    expect(() => evaluationArtifactRoot("../outside", "benchmark")).toThrow(
      /must be below/u,
    );
    expect(() =>
      evaluationArtifactRoot(".scratch/srd521-evaluation", "benchmark"),
    ).toThrow(/must be below/u);
  });

  test("normalization is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(normalizeText(normalizeText(value))).toBe(normalizeText(value));
      }),
      { numRuns: 500 },
    );
  });

  test("multiset F1 is symmetric, bounded, and identical to itself", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 20 }), { maxLength: 100 }),
        fc.array(fc.string({ maxLength: 20 }), { maxLength: 100 }),
        (left, right) => {
          const forward = multisetF1(left, right);
          expect(forward).toBeGreaterThanOrEqual(0);
          expect(forward).toBeLessThanOrEqual(1);
          expect(forward).toBeCloseTo(multisetF1(right, left), 12);
          expect(multisetF1(left, left)).toBe(1);
        },
      ),
      { numRuns: 500 },
    );
  });

  test("shingling preserves the expected cardinality", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 100 }),
        fc.integer({ min: 1, max: 12 }),
        (values, size) => {
          expect(shingles(values, size)).toHaveLength(
            Math.max(0, values.length - size + 1),
          );
        },
      ),
      { numRuns: 500 },
    );
  });

  test("plain prose has no polish failures", () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9 ]{1,40}$/u), {
          minLength: 1,
          maxLength: 20,
        }),
        (lines) => {
          expect(polishFailures(lines.join("\n"))).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });

  test("legal prose may name the document without becoming page furniture", () => {
    expect(
      polishFailures(
        "This work includes material from the System Reference Document 5.2.1 by Wizards.",
      ),
    ).not.toContain("page-furniture");
    expect(polishFailures("System Reference Document 5.2.1")).toContain(
      "page-furniture",
    );
  });

  test("removes only exact leading PDF page furniture", () => {
    expect(
      stripPdfPageFurniture(
        "System Reference Document 5.2.1\n34\nSpell School Special",
        34,
      ),
    ).toBe("Spell School Special");
    expect(
      stripPdfPageFurniture("364 System Reference Document 5.2.1\nWolf", 364),
    ).toBe("Wolf");
    expect(
      stripPdfPageFurniture(
        "Legal text names System Reference Document 5.2.1\n34",
        34,
      ),
    ).toBe("Legal text names System Reference Document 5.2.1\n34");
  });

  test("source-map parsing accumulates independent boundary failures", () => {
    const parsed = parseSourceMap({
      schemaVersion: 2,
      pdfSha256: 42,
      pdfPages: 0,
      outputFiles: ["legal.md", 5],
      pages: [{ page: -1, kind: "generated" }, null],
    });
    expect(parsed.tag).toBe("rejected");
    if (parsed.tag === "rejected")
      expect(parsed.issues.length).toBeGreaterThan(5);
  });

  test("source-map parsing rejects empty fragments and untrusted digests", () => {
    const common = {
      schemaVersion: 1,
      pdfSha256: "a".repeat(64),
      pdfPages: 1,
      outputFiles: ["legal.md"],
    };
    expect(
      parseSourceMap({
        ...common,
        pages: [{ page: 1, kind: "generated", fragments: [] }],
      }).tag,
    ).toBe("rejected");
    expect(
      parseSourceMap({
        ...common,
        pages: [
          {
            page: 1,
            kind: "generated",
            fragments: [
              {
                file: "legal.md",
                firstLine: 1,
                lastLine: 1,
                contentSha256: "not-a-digest",
              },
            ],
          },
        ],
      }).tag,
    ).toBe("rejected");
  });
});
