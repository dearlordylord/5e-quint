import { describe, expect, test } from "vitest";

import {
  parseSourceSection,
  sourcePathMatches,
  sourceSectionMatchesAnchor,
} from "./source-section-anchor.ts";

describe("source section anchors", () => {
  test.each([
    [
      "monsters-A-Z.md:41-58",
      {
        tag: "parsed",
        section: {
          sourcePath: "monsters-A-Z.md",
          lineStart: 41,
          lineEnd: 58,
        },
      },
    ],
    ["monsters-A-Z.md", { tag: "malformed" }],
    ["monsters-A-Z.md:0-12", { tag: "malformed" }],
    ["monsters-A-Z.md:12-11", { tag: "malformed" }],
    ["monsters-A-Z.md:line-12", { tag: "malformed" }],
  ] as const)(
    "parses %s without inventing a source range",
    (input, expected) => {
      expect(parseSourceSection(input)).toEqual(expected);
    },
  );

  test("matches exact and repository-qualified source paths only", () => {
    const corpusPath = ".references/srd-5.2.1/monsters-A-Z.md";

    expect(sourcePathMatches(corpusPath, corpusPath)).toBe(true);
    expect(sourcePathMatches("monsters-A-Z.md", corpusPath)).toBe(true);
    expect(sourcePathMatches("sters/monsters-A-Z.md", corpusPath)).toBe(false);
    expect(sourcePathMatches("monsters.md", corpusPath)).toBe(false);
  });

  test("requires the claimed range to start at the anchor and stay inside its span", () => {
    const anchor = {
      sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
      lineStart: 41,
      lineEnd: 52,
      spanEnd: 58,
    } as const;
    const claimed = {
      sourcePath: "monsters-A-Z.md",
      lineStart: 41,
      lineEnd: 52,
    } as const;

    expect(sourceSectionMatchesAnchor(claimed, anchor)).toBe(true);
    expect(
      sourceSectionMatchesAnchor(
        { ...claimed, lineEnd: anchor.spanEnd },
        anchor,
      ),
    ).toBe(true);
    expect(
      sourceSectionMatchesAnchor({ ...claimed, lineStart: 42 }, anchor),
    ).toBe(false);
    expect(
      sourceSectionMatchesAnchor({ ...claimed, lineEnd: 51 }, anchor),
    ).toBe(false);
    expect(
      sourceSectionMatchesAnchor({ ...claimed, lineEnd: 59 }, anchor),
    ).toBe(false);
    expect(
      sourceSectionMatchesAnchor(
        { ...claimed, sourcePath: "monsters.md" },
        anchor,
      ),
    ).toBe(false);
  });
});
