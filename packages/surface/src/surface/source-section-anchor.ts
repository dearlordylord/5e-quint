export type SourceSectionAnchorRange = {
  readonly sourcePath: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly spanEnd: number;
};

export type ParsedSourceSection = {
  readonly sourcePath: string;
  readonly lineStart: number;
  readonly lineEnd: number;
};

export type SourceSectionParseResult =
  | { readonly tag: "parsed"; readonly section: ParsedSourceSection }
  | { readonly tag: "malformed" };

export function parseSourceSection(section: string): SourceSectionParseResult {
  const match = /^(.*):(\d+)-(\d+)$/.exec(section);
  if (match === null) return { tag: "malformed" };
  const lineStart = Number.parseInt(match[2] ?? "", 10);
  const lineEnd = Number.parseInt(match[3] ?? "", 10);
  return lineStart > 0 && lineEnd >= lineStart
    ? {
        tag: "parsed",
        section: { sourcePath: match[1] ?? "", lineStart, lineEnd },
      }
    : { tag: "malformed" };
}

export function sourceSectionMatchesAnchor(
  claimedSection: ParsedSourceSection,
  sourceAnchor: SourceSectionAnchorRange,
): boolean {
  return (
    sourcePathMatches(claimedSection.sourcePath, sourceAnchor.sourcePath) &&
    claimedSection.lineStart === sourceAnchor.lineStart &&
    claimedSection.lineEnd >= sourceAnchor.lineEnd &&
    claimedSection.lineEnd <= sourceAnchor.spanEnd
  );
}

export function sourcePathMatches(
  claimedPath: string,
  sourcePath: string,
): boolean {
  return claimedPath === sourcePath || sourcePath.endsWith(`/${claimedPath}`);
}
