import { describe, expect, test } from "vitest";

import {
  parseSourceSection,
  sourcePathMatches,
  sourceSectionMatchesAnchor,
} from "./source-section-anchor.ts";

describe("source section anchors", () => {
  test.each([
    [
      "Monsters/Monsters-A.md:41-58",
      {
        tag: "parsed",
        section: {
          sourcePath: "Monsters/Monsters-A.md",
          lineStart: 41,
          lineEnd: 58,
        },
      },
    ],
    ["Monsters/Monsters-A.md", { tag: "malformed" }],
    ["Monsters/Monsters-A.md:0-12", { tag: "malformed" }],
    ["Monsters/Monsters-A.md:12-11", { tag: "malformed" }],
    ["Monsters/Monsters-A.md:line-12", { tag: "malformed" }],
  ] as const)(
    "parses %s without inventing a source range",
    (input, expected) => {
      expect(parseSourceSection(input)).toEqual(expected);
    },
  );

  test("matches exact and repository-qualified source paths only", () => {
    const corpusPath = ".references/srd-5.2.1/Monsters/Monsters-A.md";

    expect(sourcePathMatches(corpusPath, corpusPath)).toBe(true);
    expect(sourcePathMatches("Monsters/Monsters-A.md", corpusPath)).toBe(true);
    expect(sourcePathMatches("sters/Monsters-A.md", corpusPath)).toBe(false);
    expect(sourcePathMatches("Monsters/Monsters-B.md", corpusPath)).toBe(false);
  });

  test("requires the claimed range to start at the anchor and stay inside its span", () => {
    const anchor = {
      sourcePath: ".references/srd-5.2.1/Monsters/Monsters-A.md",
      lineStart: 41,
      lineEnd: 52,
      spanEnd: 58,
    } as const;
    const claimed = {
      sourcePath: "Monsters/Monsters-A.md",
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
        { ...claimed, sourcePath: "Monsters/Monsters-B.md" },
        anchor,
      ),
    ).toBe(false);
  });
});
