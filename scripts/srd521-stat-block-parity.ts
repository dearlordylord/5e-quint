import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Match } from "effect";

import type { StatBlockRecord } from "../packages/surface/src/surface/types.ts";
import { normalizeStatBlockIdentity } from "../packages/surface/src/surface/stat-block-identity.ts";
import {
  SRD_STAT_BLOCK_SCOPE,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type ReadSrdStatBlockParityOptions,
  type SrdStatBlockParityInput,
  type SrdStatBlockParityInstalledRecord,
  type SrdStatBlockParityIssue,
  type SrdStatBlockParityReport,
  type SrdStatBlockSourceAnchor,
  type SrdStatBlockSourceCoverage,
  type SrdStatBlockSourceDiscovery,
  type SrdStatBlockSourceFile,
  type SrdStatBlockSourceIdentity,
  type SrdStatBlockSourceIssue,
  type SrdStatBlockSourceNormalization,
  type SrdStatBlockSourceOccurrence,
  type SrdStatBlockSourcePath,
  type SrdStatBlockSourceReadIssue,
} from "../packages/surface/src/surface/stat-block-parity-observation.ts";
import {
  parseSourceSection,
  sourcePathMatches,
  sourceSectionMatchesAnchor,
  type ParsedSourceSection,
} from "../packages/surface/src/surface/source-section-anchor.ts";
export * from "../packages/surface/src/surface/stat-block-parity-observation.ts";

export function srdStatBlockSourceOccurrenceCount(
  discovery: SrdStatBlockSourceDiscovery,
): number {
  return discovery.occurrences.length;
}

export function srdStatBlockSourceIdentityCount(
  discovery: SrdStatBlockSourceDiscovery,
): number {
  return discovery.identities.length;
}

const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const abilityNameSet = new Set<string>(ABILITY_NAMES);
const STAT_BLOCK_SECTION_NAMES = [
  "Traits",
  "Actions",
  "Bonus Actions",
  "Reactions",
  "Legendary Actions",
] as const;
const statBlockSectionNameSet = new Set<string>(STAT_BLOCK_SECTION_NAMES);

type Heading = {
  readonly level: number;
  readonly name: string;
  readonly lineIndex: number;
};

type ParsedSourceFile = {
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly issues: readonly SrdStatBlockSourceIssue[];
};

type SrdStatBlockScopedSourceFile = SrdStatBlockSourceFile & {
  readonly sourcePath: SrdStatBlockSourcePath;
};
type NonEmptySrdStatBlockScopedSourceFiles = [
  SrdStatBlockScopedSourceFile,
  ...SrdStatBlockScopedSourceFile[],
];

function isSrdStatBlockScopedSourceFile(
  sourceFile: SrdStatBlockSourceFile,
): sourceFile is SrdStatBlockScopedSourceFile {
  return SRD_STAT_BLOCK_SOURCE_PATHS.some(
    (sourcePath) => sourcePath === sourceFile.sourcePath,
  );
}

export function discoverSrdStatBlocks(
  sourceFiles: readonly SrdStatBlockSourceFile[],
): SrdStatBlockSourceDiscovery {
  const sourcesByPath = new Map<
    SrdStatBlockSourcePath,
    NonEmptySrdStatBlockScopedSourceFiles
  >();
  for (const sourceFile of sourceFiles.filter(isSrdStatBlockScopedSourceFile)) {
    const sources = sourcesByPath.get(sourceFile.sourcePath);
    if (sources === undefined) {
      sourcesByPath.set(sourceFile.sourcePath, [sourceFile]);
    } else {
      sources.push(sourceFile);
    }
  }
  const sourcesToParse: SrdStatBlockScopedSourceFile[] = [];
  const duplicateSourceIssues: SrdStatBlockSourceIssue[] = [];
  for (const sourcePath of SRD_STAT_BLOCK_SOURCE_PATHS) {
    const sources = sourcesByPath.get(sourcePath);
    if (sources === undefined) continue;
    const uniqueContents = new Set(sources.map(({ contents }) => contents));
    if (uniqueContents.size === 1) {
      const [source] = sources;
      sourcesToParse.push(source);
      if (sources.length > 1) {
        duplicateSourceIssues.push({
          kind: "duplicate-source",
          sourcePath,
          reason: "identical",
        });
      }
    } else {
      duplicateSourceIssues.push({
        kind: "duplicate-source",
        sourcePath,
        reason: "conflicting",
      });
    }
  }
  const parsedFiles = sourcesToParse.map(parseSourceFile);
  const occurrences = parsedFiles.flatMap(
    (parsedSourceFile) => parsedSourceFile.occurrences,
  );
  const issues = [
    ...parsedFiles.flatMap((parsedSourceFile) => parsedSourceFile.issues),
    ...duplicateSourceIssues,
  ];
  const identityMap = new Map<string, SrdStatBlockSourceOccurrence[]>();

  for (const occurrence of occurrences) {
    const key = normalizeStatBlockIdentity(occurrence.name);
    const existing = identityMap.get(key);
    if (existing === undefined) {
      identityMap.set(key, [occurrence]);
    } else {
      existing.push(occurrence);
    }
  }

  return {
    occurrences,
    identities: Array.from(identityMap.values(), (identityOccurrences) => ({
      name: identityOccurrences[0]?.name ?? "",
      occurrences: identityOccurrences,
    })),
    issues,
  };
}

export function deriveSrdStatBlockParity(
  input: SrdStatBlockParityInput,
): SrdStatBlockParityReport {
  const discovery = discoverSrdStatBlocks(input.sourceFiles);
  const sourceReadIssues = input.sourceReadIssues;
  const sourceCoverage = deriveSourceCoverage(
    input.sourceFiles,
    sourceReadIssues,
    discovery,
  );
  const sourceIdentities = new Map(
    discovery.identities.map((identity) => [
      normalizeStatBlockIdentity(identity.name),
      identity,
    ]),
  );
  const installedCatalog = deriveInstalledCatalogIssues(
    input.installedStatBlocks,
    sourceIdentities,
    sourceCoverage,
  );
  const missingIssues =
    sourceCoverage.tag === "complete"
      ? deriveMissingIssues(discovery, installedCatalog.installedNames)
      : [];
  const issues = [
    ...sourceReadIssues.map((sourceReadIssue) => ({
      kind: "unreadable-source" as const,
      sourcePath: sourceReadIssue.sourcePath,
      message: sourceReadIssue.message,
    })),
    ...deriveMissingSourcePathIssues(sourceCoverage),
    ...discovery.issues,
    ...deriveDivergentSourceIssues(discovery),
    ...installedCatalog.issues,
    ...missingIssues,
    ...(sourceCoverage.tag === "complete" && missingIssues.length === 0
      ? deriveInstalledCardinalityIssues(discovery, input.installedStatBlocks)
      : []),
    ...input.peerObservations
      .filter((evidence) => evidence.tag !== "present")
      .map((evidence) => ({ kind: "publication-peer" as const, evidence })),
  ];

  return {
    scope: SRD_STAT_BLOCK_SCOPE,
    sourceCoverage,
    discovery,
    installedRecords: input.installedStatBlocks,
    issues,
  };
}

function deriveSourceCoverage(
  sourceFiles: readonly SrdStatBlockSourceFile[],
  sourceReadIssues: readonly SrdStatBlockSourceReadIssue[],
  discovery: SrdStatBlockSourceDiscovery,
): SrdStatBlockSourceCoverage {
  const sourceFilePaths = new Set(
    sourceFiles.map((sourceFile) => sourceFile.sourcePath),
  );
  const unreadablePathSet = new Set(
    sourceReadIssues.map((sourceReadIssue) => sourceReadIssue.sourcePath),
  );
  const availablePaths = SRD_STAT_BLOCK_SOURCE_PATHS.filter(
    (sourcePath) =>
      sourceFilePaths.has(sourcePath) && !unreadablePathSet.has(sourcePath),
  );
  const missingPaths = SRD_STAT_BLOCK_SOURCE_PATHS.filter(
    (sourcePath) =>
      !sourceFilePaths.has(sourcePath) && !unreadablePathSet.has(sourcePath),
  );
  const unreadablePaths = SRD_STAT_BLOCK_SOURCE_PATHS.filter((sourcePath) =>
    unreadablePathSet.has(sourcePath),
  );
  const incompletePathSet = new Set(
    discovery.issues.flatMap((issue) =>
      Match.value(issue).pipe(
        Match.when({ kind: "duplicate-source", reason: "identical" }, () => []),
        Match.when(
          { kind: "duplicate-source", reason: "conflicting" },
          ({ sourcePath }) => [sourcePath],
        ),
        Match.when({ kind: "malformed-source" }, ({ sourcePath }) => [
          sourcePath,
        ]),
        Match.when({ kind: "incomplete-source" }, ({ sourcePath }) => [
          sourcePath,
        ]),
        Match.exhaustive,
      ),
    ),
  );
  const incompletePaths = SRD_STAT_BLOCK_SOURCE_PATHS.filter(
    (sourcePath) =>
      sourceFilePaths.has(sourcePath) &&
      !unreadablePathSet.has(sourcePath) &&
      incompletePathSet.has(sourcePath),
  );
  return missingPaths.length === 0 &&
    unreadablePaths.length === 0 &&
    incompletePaths.length === 0
    ? { tag: "complete", paths: SRD_STAT_BLOCK_SOURCE_PATHS }
    : {
        tag: "incomplete",
        availablePaths,
        missingPaths,
        unreadablePaths,
        incompletePaths,
      };
}

function deriveMissingSourcePathIssues(
  sourceCoverage: SrdStatBlockSourceCoverage,
): readonly SrdStatBlockParityIssue[] {
  return sourceCoverage.tag === "complete"
    ? []
    : sourceCoverage.missingPaths.map((sourcePath) => ({
        kind: "missing-source" as const,
        sourcePath,
        message: "Source path was not supplied to the standalone SRD corpus.",
      }));
}

function deriveDivergentSourceIssues(
  discovery: SrdStatBlockSourceDiscovery,
): readonly SrdStatBlockParityIssue[] {
  return discovery.identities.flatMap((identity) => {
    const normalizedSources = Array.from(
      new Set(
        identity.occurrences.flatMap((occurrence) =>
          occurrence.normalization.tag === "ok"
            ? [occurrence.normalization.value]
            : [],
        ),
      ),
    );
    return normalizedSources.length > 1
      ? [
          {
            kind: "divergent-source" as const,
            name: identity.name,
            anchors: identity.occurrences.map(
              (occurrence) => occurrence.anchor,
            ),
            normalizedSources,
          },
        ]
      : [];
  });
}

function deriveInstalledCatalogIssues(
  installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[],
  sourceIdentities: ReadonlyMap<string, SrdStatBlockSourceIdentity>,
  sourceCoverage: SrdStatBlockSourceCoverage,
): {
  readonly installedNames: ReadonlySet<string>;
  readonly issues: readonly SrdStatBlockParityIssue[];
} {
  const installedNames = new Set<string>();
  const installedIds = new Set<string>();
  const identityRecords = new Map<
    string,
    { readonly name: string; readonly statBlockIds: StatBlockRecord["id"][] }
  >();
  const issues: SrdStatBlockParityIssue[] = [];

  for (const statBlock of installedStatBlocks) {
    const duplicateIdIssue = deriveDuplicateIdIssue(statBlock, installedIds);
    if (duplicateIdIssue !== undefined) issues.push(duplicateIdIssue);
    installedIds.add(statBlock.id);
    const normalizedIdentity = normalizeStatBlockIdentity(statBlock.name);
    installedNames.add(normalizedIdentity);
    const identityRecord = identityRecords.get(normalizedIdentity);
    if (identityRecord === undefined) {
      identityRecords.set(normalizedIdentity, {
        name: statBlock.name,
        statBlockIds: [statBlock.id],
      });
    } else if (!identityRecord.statBlockIds.includes(statBlock.id)) {
      identityRecord.statBlockIds.push(statBlock.id);
    }
    issues.push(
      ...deriveProvenanceIssues(statBlock, sourceIdentities, sourceCoverage),
      ...(sourceCoverage.tag === "complete"
        ? deriveExtraIssue(statBlock, sourceIdentities)
        : []),
    );
  }

  for (const identityRecord of identityRecords.values()) {
    if (identityRecord.statBlockIds.length < 2) continue;
    issues.push({
      kind: "duplicate-identity",
      name: identityRecord.name,
      statBlockIds: identityRecord.statBlockIds,
    });
  }

  return { installedNames, issues };
}

function deriveInstalledCardinalityIssues(
  discovery: SrdStatBlockSourceDiscovery,
  installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[],
): readonly SrdStatBlockParityIssue[] {
  const expectedIdentityCount = srdStatBlockSourceIdentityCount(discovery);
  return installedStatBlocks.length === expectedIdentityCount
    ? []
    : [
        {
          kind: "cardinality" as const,
          expectedIdentityCount,
          actualInstalledCount: installedStatBlocks.length,
        },
      ];
}

function deriveDuplicateIdIssue(
  statBlock: SrdStatBlockParityInstalledRecord,
  installedIds: ReadonlySet<string>,
): SrdStatBlockParityIssue | undefined {
  return installedIds.has(statBlock.id)
    ? { kind: "duplicate-id", statBlockId: statBlock.id }
    : undefined;
}

function deriveProvenanceIssues(
  statBlock: SrdStatBlockParityInstalledRecord,
  sourceIdentities: ReadonlyMap<string, SrdStatBlockSourceIdentity>,
  sourceCoverage: SrdStatBlockSourceCoverage,
): readonly SrdStatBlockParityIssue[] {
  if (statBlock.provenance.kind !== "srd-5.2.1") {
    return [
      {
        kind: "provenance",
        reason: "kind",
        name: statBlock.name,
        statBlockId: statBlock.id,
        actualKind: statBlock.provenance.kind,
      },
    ];
  }

  const sourceIdentity = sourceIdentities.get(
    normalizeStatBlockIdentity(statBlock.name),
  );
  if (sourceIdentity === undefined) return [];
  const provenanceSection = statBlock.provenance.section;
  const parsedSection = parseSourceSection(provenanceSection);
  const claimedAnchor =
    parsedSection.tag === "parsed" ? parsedSection.section : undefined;
  if (!canValidateProvenanceAnchor(claimedAnchor, sourceCoverage)) return [];
  const hasSourceAnchor =
    claimedAnchor !== undefined &&
    sourceIdentity.occurrences.some((occurrence) =>
      sourceSectionMatchesAnchor(claimedAnchor, occurrence.anchor),
    );
  return hasSourceAnchor
    ? []
    : [
        {
          kind: "provenance",
          reason: "source-anchor",
          name: statBlock.name,
          statBlockId: statBlock.id,
          actualKind: "srd-5.2.1",
          actualSection: provenanceSection,
        },
      ];
}

function canValidateProvenanceAnchor(
  claimedAnchor: ParsedSourceSection | undefined,
  sourceCoverage: SrdStatBlockSourceCoverage,
): boolean {
  if (claimedAnchor === undefined) return sourceCoverage.tag === "complete";
  const completePaths =
    sourceCoverage.tag === "complete"
      ? sourceCoverage.paths
      : sourceCoverage.availablePaths.filter(
          (sourcePath) => !sourceCoverage.incompletePaths.includes(sourcePath),
        );
  return completePaths.some((sourcePath) =>
    sourcePathMatches(claimedAnchor.sourcePath, sourcePath),
  );
}

function deriveExtraIssue(
  statBlock: SrdStatBlockParityInstalledRecord,
  sourceIdentities: ReadonlyMap<string, SrdStatBlockSourceIdentity>,
): readonly SrdStatBlockParityIssue[] {
  return sourceIdentities.has(normalizeStatBlockIdentity(statBlock.name))
    ? []
    : [
        {
          kind: "extra",
          name: statBlock.name,
          statBlockId: statBlock.id,
        },
      ];
}

function deriveMissingIssues(
  discovery: SrdStatBlockSourceDiscovery,
  installedNames: ReadonlySet<string>,
): readonly SrdStatBlockParityIssue[] {
  return discovery.identities
    .filter(
      (identity) =>
        !installedNames.has(normalizeStatBlockIdentity(identity.name)),
    )
    .map((identity) => ({ kind: "missing" as const, name: identity.name }));
}

export function readSrdStatBlockParity(
  options: ReadSrdStatBlockParityOptions,
): SrdStatBlockParityReport {
  const readSource =
    options.readSource ??
    ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const sourceFiles: SrdStatBlockSourceFile[] = [];
  const sourceReadIssues: SrdStatBlockSourceReadIssue[] = [];

  for (const sourcePath of SRD_STAT_BLOCK_SOURCE_PATHS) {
    try {
      sourceFiles.push({
        sourcePath,
        contents: readSource(join(options.repoRoot, sourcePath)),
      });
    } catch (error) {
      sourceReadIssues.push({
        sourcePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deriveSrdStatBlockParity({
    sourceFiles,
    installedStatBlocks: options.installedStatBlocks,
    sourceReadIssues,
    peerObservations: options.peerObservations,
  });
}

function parseSourceFile(
  sourceFile: SrdStatBlockScopedSourceFile,
): ParsedSourceFile {
  const lines = sourceFile.contents.split(/\r?\n/);
  const headings = lines.flatMap(parseHeading);
  const parsedStatBlocks = headings.flatMap((heading) =>
    parseStatBlockHeading(sourceFile, lines, headings, heading),
  );
  const occurrences = parsedStatBlocks.flatMap((parsedStatBlock) =>
    parsedStatBlock.tag === "found" ? [parsedStatBlock.occurrence] : [],
  );
  const parsedIssues = parsedStatBlocks.flatMap(
    (parsedStatBlock) => parsedStatBlock.issues,
  );
  return {
    occurrences,
    issues:
      occurrences.length === 0 && parsedIssues.length === 0
        ? [
            {
              kind: "incomplete-source",
              sourcePath: sourceFile.sourcePath,
              message:
                "Source file contains no complete standalone stat block anchor.",
            },
          ]
        : parsedIssues,
  };
}

type ParsedStatBlock =
  | {
      readonly tag: "found";
      readonly occurrence: SrdStatBlockSourceOccurrence;
      readonly issues: readonly SrdStatBlockSourceIssue[];
    }
  | {
      readonly tag: "invalid";
      readonly issues: readonly SrdStatBlockSourceIssue[];
    };

type TableNormalization =
  | { readonly tag: "ok"; readonly value: readonly string[] }
  | { readonly tag: "malformed"; readonly message: string };

type AbilityCellNormalization =
  | { readonly tag: "ok"; readonly value: string }
  | { readonly tag: "malformed"; readonly message: string };

function parseHeading(line: string, lineIndex: number): readonly Heading[] {
  const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
  return match === null
    ? []
    : [
        {
          level: match[1]?.length ?? 0,
          name: match[2] ?? "",
          lineIndex,
        },
      ];
}

function parseStatBlockHeading(
  sourceFile: SrdStatBlockScopedSourceFile,
  lines: readonly string[],
  headings: readonly Heading[],
  heading: Heading,
): readonly ParsedStatBlock[] {
  const firstFollowingHeadingIndex = nextHeadingLineIndex(headings, heading);
  const nextEntityHeadingIndex = nextEntityHeadingLineIndex(headings, heading);
  const bodyEnd = Math.min(firstFollowingHeadingIndex, nextEntityHeadingIndex);
  const bodyBeforeChildHeading = lines.slice(heading.lineIndex + 1, bodyEnd);
  if (!hasArmorClassLine(bodyBeforeChildHeading)) return [];
  if (!hasChallengeRatingLine(bodyBeforeChildHeading)) {
    return [
      {
        tag: "invalid",
        issues: [
          {
            kind: "incomplete-source",
            sourcePath: sourceFile.sourcePath,
            message: `Stat block heading "${heading.name}" has no Challenge Rating line before the source boundary.`,
          },
        ],
      },
    ];
  }

  if (
    !hasCompleteStatBlockBody(lines, headings, heading, nextEntityHeadingIndex)
  ) {
    return [
      {
        tag: "invalid",
        issues: [
          {
            kind: "incomplete-source",
            sourcePath: sourceFile.sourcePath,
            message: `Stat block heading "${heading.name}" has no complete standalone stat block body before the source boundary.`,
          },
        ],
      },
    ];
  }

  const anchorRange = statBlockAnchorRange(
    lines,
    heading.lineIndex,
    nextEntityHeadingIndex,
  );
  const anchor: SrdStatBlockSourceAnchor = {
    sourcePath: sourceFile.sourcePath,
    heading: heading.name,
    lineStart: heading.lineIndex + 1,
    lineEnd: anchorRange.lineEnd,
    spanEnd: anchorRange.spanEnd,
    section: `${sourceFile.sourcePath}:${heading.lineIndex + 1}-${anchorRange.lineEnd}`,
  };
  const normalization = normalizeSourceBlock(
    lines.slice(heading.lineIndex, anchorRange.lineEnd),
  );
  return [
    {
      tag: "found",
      occurrence: { name: heading.name, anchor, normalization },
      issues:
        normalization.tag === "malformed"
          ? [
              {
                kind: "malformed-source",
                sourcePath: sourceFile.sourcePath,
                heading: heading.name,
                message: normalization.message,
              },
            ]
          : [],
    },
  ];
}

function nextHeadingLineIndex(
  headings: readonly Heading[],
  heading: Heading,
): number {
  return (
    headings.find((candidate) => candidate.lineIndex > heading.lineIndex)
      ?.lineIndex ?? Number.POSITIVE_INFINITY
  );
}

function nextEntityHeadingLineIndex(
  headings: readonly Heading[],
  heading: Heading,
): number {
  return (
    headings.find(
      (candidate) =>
        candidate.lineIndex > heading.lineIndex &&
        candidate.level <= heading.level &&
        !statBlockSectionNameSet.has(candidate.name),
    )?.lineIndex ?? Number.POSITIVE_INFINITY
  );
}

function hasCompleteStatBlockBody(
  lines: readonly string[],
  headings: readonly Heading[],
  heading: Heading,
  nextEntityHeadingIndex: number,
): boolean {
  const sectionHeadings = headings.filter(
    (candidate) =>
      candidate.lineIndex > heading.lineIndex &&
      candidate.lineIndex < nextEntityHeadingIndex &&
      statBlockSectionNameSet.has(candidate.name),
  );
  const lastSection = sectionHeadings[sectionHeadings.length - 1];
  if (lastSection === undefined) return false;
  return lines
    .slice(lastSection.lineIndex + 1, nextEntityHeadingIndex)
    .some((line) => {
      const trimmed = line.trim();
      return trimmed !== "" && trimmed !== "---" && !/^#{2,4}\s+/.test(trimmed);
    });
}

function hasArmorClassLine(lines: readonly string[]): boolean {
  return lines.some((line) => /^\s*\*\*AC\*\*/.test(line));
}

function hasChallengeRatingLine(lines: readonly string[]): boolean {
  return lines.some((line) => /^\s*\*\*CR\*\*/.test(line));
}

type StatBlockAnchorRange = {
  readonly lineEnd: number;
  readonly spanEnd: number;
};

function statBlockAnchorRange(
  lines: readonly string[],
  headingLineIndex: number,
  nextEntityHeadingIndex: number,
): StatBlockAnchorRange {
  const physicalEndIndex = Math.min(nextEntityHeadingIndex, lines.length);
  let lineEndIndex = physicalEndIndex;
  while (
    lineEndIndex > headingLineIndex + 1 &&
    lines[lineEndIndex - 1]?.trim() === ""
  ) {
    lineEndIndex -= 1;
  }
  const trailingSeparator = lines[lineEndIndex - 1]?.trim() === "---";
  if (!trailingSeparator) {
    return { lineEnd: lineEndIndex, spanEnd: physicalEndIndex };
  }
  const separatorLineIndex = lineEndIndex - 1;
  lineEndIndex = separatorLineIndex;
  while (
    lineEndIndex > headingLineIndex + 1 &&
    lines[lineEndIndex - 1]?.trim() === ""
  ) {
    lineEndIndex -= 1;
  }
  return {
    lineEnd: lineEndIndex,
    spanEnd: physicalEndIndex,
  };
}

function normalizeSourceBlock(
  lines: readonly string[],
): SrdStatBlockSourceNormalization {
  const normalized: string[] = [];
  let tableRows: string[][] = [];
  const malformedTables: string[] = [];

  const flushTable = (): void => {
    if (tableRows.length === 0) return;
    const table = normalizeTable(tableRows);
    if (table.tag === "ok") {
      normalized.push(...table.value);
    } else {
      malformedTables.push(table.message);
    }
    tableRows = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("|")) {
      tableRows.push(parseTableRow(trimmed));
      continue;
    }
    flushTable();
    if (trimmed === "" || trimmed === "---" || /^#{2,4}\s+/.test(trimmed)) {
      continue;
    }
    const expanded = trimmed.split(/\s*\|\s*/);
    for (const line of expanded) {
      const value = normalizePlainLine(line);
      if (value !== "") normalized.push(value);
    }
  }
  flushTable();
  return malformedTables.length === 0
    ? { tag: "ok", value: normalized.join("\n") }
    : { tag: "malformed", message: malformedTables.join("; ") };
}

function normalizePlainLine(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTableRow(line: string): string[] {
  const body = line.slice(1, line.endsWith("|") ? -1 : undefined);
  return body.split("|").map(normalizeTableCell);
}

function normalizeTableCell(cell: string): string {
  return cell.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}

function normalizeTable(
  rows: readonly (readonly string[])[],
): TableNormalization {
  const dataRows = rows.filter(isTableDataRow);
  if (dataRows.length === 0) return { tag: "ok", value: [] };

  const header = dataRows[0] ?? [];
  const transposedAbilityTable = normalizeTransposedAbilityTable(
    dataRows,
    header,
  );
  if (transposedAbilityTable !== undefined) return transposedAbilityTable;
  const abilityTable = normalizeAbilityTable(dataRows, header);
  if (abilityTable !== undefined) return abilityTable;

  const expandedAbilityTable = normalizeExpandedAbilityTable(dataRows, header);
  if (expandedAbilityTable !== undefined) return expandedAbilityTable;

  return {
    tag: "ok",
    value: dataRows.map((row) =>
      row.map((cell) => normalizePlainLine(cell)).join("|"),
    ),
  };
}

function isTableDataRow(row: readonly string[]): boolean {
  return !row.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function normalizeAbilityTable(
  dataRows: readonly (readonly string[])[],
  header: readonly string[],
): TableNormalization | undefined {
  if (!isCompactAbilityHeaderCandidate(header)) return undefined;
  if (!isAbilityHeader(header)) {
    return {
      tag: "malformed",
      message:
        "Ability table header does not contain exactly STR, DEX, CON, INT, WIS, CHA.",
    };
  }
  return normalizeAbilityRows(dataRows.slice(1), normalizeAbilityDataRow);
}

function normalizeTransposedAbilityTable(
  dataRows: readonly (readonly string[])[],
  header: readonly string[],
): TableNormalization | undefined {
  if (!isTransposedAbilityHeader(header)) return undefined;
  const rows = dataRows.slice(1);
  if (rows.length !== 3) {
    return {
      tag: "malformed",
      message: `Transposed ability table has ${rows.length} data rows; expected Score, Mod, and Save.`,
    };
  }
  const rowValues = new Map<string, readonly string[]>();
  const malformedRows: string[] = [];
  for (const row of rows) {
    const label = row[0];
    if (label === undefined || !["Score", "Mod", "Save"].includes(label)) {
      malformedRows.push(
        `Transposed ability table has an invalid row label ${label ?? "<missing>"}.`,
      );
      continue;
    }
    if (row.length !== ABILITY_NAMES.length + 1) {
      malformedRows.push(
        `Transposed ability row ${label} has ${row.length - 1} ability cells; expected 6.`,
      );
      continue;
    }
    if (rowValues.has(label)) {
      malformedRows.push(`Transposed ability table repeats the ${label} row.`);
      continue;
    }
    rowValues.set(label, row);
  }
  const scoreRow = rowValues.get("Score");
  const modifierRow = rowValues.get("Mod");
  const saveRow = rowValues.get("Save");
  if (
    scoreRow === undefined ||
    modifierRow === undefined ||
    saveRow === undefined
  ) {
    malformedRows.push(
      "Transposed ability table is missing Score, Mod, or Save.",
    );
  }
  if (malformedRows.length > 0) {
    return { tag: "malformed", message: malformedRows.join("; ") };
  }
  const normalized: string[] = [];
  const missingCells: string[] = [];
  for (let index = 0; index < ABILITY_NAMES.length; index += 1) {
    const score = scoreRow?.[index + 1];
    const modifier = modifierRow?.[index + 1];
    const save = saveRow?.[index + 1];
    if (
      score === undefined ||
      modifier === undefined ||
      save === undefined ||
      score === "" ||
      modifier === "" ||
      save === ""
    ) {
      missingCells.push(
        `Ability ${ABILITY_NAMES[index]} contains a missing cell.`,
      );
      continue;
    }
    normalized.push(
      `ability:${ABILITY_NAMES[index]}|value:${score}|modifier:${modifier}|save:${save}`,
    );
  }
  return missingCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: missingCells.join("; ") };
}

function isTransposedAbilityHeader(header: readonly string[]): boolean {
  return (
    header.length === ABILITY_NAMES.length + 1 &&
    header[0] === "" &&
    header.slice(1).every((cell, index) => cell === ABILITY_NAMES[index])
  );
}

function normalizeAbilityRows(
  rows: readonly (readonly string[])[],
  normalizeRow: (row: readonly string[]) => TableNormalization,
): TableNormalization {
  const normalized: string[] = [];
  const malformedRows: string[] = [];
  for (const row of rows) {
    const normalizedRow = normalizeRow(row);
    if (normalizedRow.tag === "ok") {
      normalized.push(...normalizedRow.value);
    } else {
      malformedRows.push(normalizedRow.message);
    }
  }
  return malformedRows.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedRows.join("; ") };
}

function isCompactAbilityHeaderCandidate(header: readonly string[]): boolean {
  return header.some((cell) => abilityNameSet.has(cell));
}

function isAbilityHeader(header: readonly string[]): boolean {
  return (
    header.length === ABILITY_NAMES.length &&
    header.every((cell, index) => cell === ABILITY_NAMES[index])
  );
}

function normalizeExpandedAbilityTable(
  dataRows: readonly (readonly string[])[],
  header: readonly string[],
): TableNormalization | undefined {
  if (!isExpandedAbilityHeader(header)) return undefined;
  return normalizeAbilityRows(
    dataRows.slice(1),
    normalizeExpandedAbilityDataRow,
  );
}

function isExpandedAbilityHeader(header: readonly string[]): boolean {
  return (
    header.some((cell) => cell === "MOD") &&
    header.some((cell) => cell === "SAVE")
  );
}

function normalizeAbilityDataRow(row: readonly string[]): TableNormalization {
  if (row.length === ABILITY_NAMES.length) {
    return normalizeCompactAbilityDataRow(row);
  }

  if (row.length === ABILITY_NAMES.length * 3) {
    return normalizeGroupedAbilityDataRow(row);
  }

  return {
    tag: "malformed",
    message: `Ability table row has ${row.length} cells; expected 6 or 18.`,
  };
}

function normalizeCompactAbilityDataRow(
  row: readonly string[],
): TableNormalization {
  const normalized: string[] = [];
  const malformedCells: string[] = [];
  for (const [index, cell] of row.entries()) {
    const normalizedCell = normalizeAbilityCell(
      ABILITY_NAMES[index] ?? "",
      cell,
    );
    if (normalizedCell.tag === "ok") {
      normalized.push(normalizedCell.value);
    } else {
      malformedCells.push(normalizedCell.message);
    }
  }
  return malformedCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedCells.join("; ") };
}

function normalizeGroupedAbilityDataRow(
  row: readonly string[],
): TableNormalization {
  const normalized: string[] = [];
  const malformedCells: string[] = [];
  for (let index = 0; index < ABILITY_NAMES.length; index += 1) {
    const normalizedCell = normalizeGroupedAbilityCell(row, index);
    if (normalizedCell.tag === "ok") {
      normalized.push(normalizedCell.value);
    } else {
      malformedCells.push(normalizedCell.message);
    }
  }
  return malformedCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedCells.join("; ") };
}

function normalizeGroupedAbilityCell(
  row: readonly string[],
  index: number,
): AbilityCellNormalization {
  const nameCell = row[index * 3];
  const modifier = row[index * 3 + 1];
  const save = row[index * 3 + 2];
  if (
    nameCell === undefined ||
    modifier === undefined ||
    save === undefined ||
    nameCell.trim() === "" ||
    modifier.trim() === "" ||
    save.trim() === ""
  ) {
    return {
      tag: "malformed",
      message: `Ability table group ${index + 1} contains a missing cell.`,
    };
  }
  const nameMatch = /^([A-Z]{3})\s+(.+)$/.exec(nameCell);
  const name = nameMatch?.[1];
  const value = nameMatch?.[2];
  if (name === undefined || value === undefined || !abilityNameSet.has(name)) {
    return {
      tag: "malformed",
      message: `Ability table group ${index + 1} has an invalid ability label.`,
    };
  }
  return {
    tag: "ok",
    value: `ability:${name}|value:${value}|modifier:${modifier}|save:${save}`,
  };
}

function normalizeExpandedAbilityDataRow(
  row: readonly string[],
): TableNormalization {
  if (isMixedExpandedAbilityRow(row)) {
    return normalizeMixedExpandedAbilityDataRow(row);
  }
  if (isGroupedExpandedAbilityRow(row)) {
    return normalizeGroupedExpandedAbilityDataRow(row);
  }
  if (row.length === 0 || row.length % 4 !== 0) {
    return {
      tag: "malformed",
      message: `Expanded ability row has ${row.length} cells; expected a multiple of 4.`,
    };
  }
  const normalized: string[] = [];
  const malformedCells: string[] = [];
  for (let index = 0; index < row.length / 4; index += 1) {
    const name = row[index * 4];
    const value = row[index * 4 + 1];
    const modifier = row[index * 4 + 2];
    const save = row[index * 4 + 3];
    if (
      name === undefined ||
      value === undefined ||
      modifier === undefined ||
      save === undefined ||
      name.trim() === "" ||
      value.trim() === "" ||
      modifier.trim() === "" ||
      save.trim() === ""
    ) {
      malformedCells.push(
        `Expanded ability group ${index + 1} contains a missing cell.`,
      );
      continue;
    }
    if (!abilityNameSet.has(name)) {
      malformedCells.push(
        `Expanded ability group ${index + 1} has an invalid ability label.`,
      );
      continue;
    }
    normalized.push(
      `ability:${name}|value:${value}|modifier:${modifier}|save:${save}`,
    );
  }
  return malformedCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedCells.join("; ") };
}

function isMixedExpandedAbilityRow(row: readonly string[]): boolean {
  return (
    row.length >= 4 &&
    (row.length - 4) % 3 === 0 &&
    abilityNameSet.has(row[0] ?? "") &&
    row
      .slice(4)
      .every((cell, index) =>
        index % 3 === 0 ? /^([A-Z]{3})\s+(.+)$/.test(cell) : true,
      )
  );
}

function normalizeMixedExpandedAbilityDataRow(
  row: readonly string[],
): TableNormalization {
  const normalized: string[] = [];
  const malformedCells: string[] = [];
  const firstName = row[0];
  const firstValue = row[1];
  const firstModifier = row[2];
  const firstSave = row[3];
  if (
    firstName === undefined ||
    firstValue === undefined ||
    firstModifier === undefined ||
    firstSave === undefined ||
    firstValue === "" ||
    firstModifier === "" ||
    firstSave === ""
  ) {
    malformedCells.push("Expanded ability group 1 contains a missing cell.");
  } else {
    normalized.push(
      `ability:${firstName}|value:${firstValue}|modifier:${firstModifier}|save:${firstSave}`,
    );
  }
  for (let index = 4; index < row.length; index += 3) {
    const nameAndValue = row[index];
    const modifier = row[index + 1];
    const save = row[index + 2];
    const nameMatch = /^([A-Z]{3})\s+(.+)$/.exec(nameAndValue ?? "");
    if (
      nameMatch === null ||
      modifier === undefined ||
      save === undefined ||
      modifier === "" ||
      save === ""
    ) {
      malformedCells.push(
        `Expanded ability group ${index / 3} contains a missing or invalid cell.`,
      );
      continue;
    }
    if (!abilityNameSet.has(nameMatch[1] ?? "")) {
      malformedCells.push(
        `Expanded ability group ${index / 3} has an invalid ability label.`,
      );
      continue;
    }
    normalized.push(
      `ability:${nameMatch[1]}|value:${nameMatch[2]}|modifier:${modifier}|save:${save}`,
    );
  }
  return malformedCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedCells.join("; ") };
}

function isGroupedExpandedAbilityRow(row: readonly string[]): boolean {
  if (row.length === 0 || row.length % 3 !== 0) return false;
  for (let index = 0; index < row.length / 3; index += 1) {
    const nameMatch = /^([A-Z]{3})\s+(.+)$/.exec(row[index * 3] ?? "");
    if (nameMatch === null || !abilityNameSet.has(nameMatch[1] ?? "")) {
      return false;
    }
  }
  return true;
}

function normalizeGroupedExpandedAbilityDataRow(
  row: readonly string[],
): TableNormalization {
  const normalized: string[] = [];
  const malformedCells: string[] = [];
  for (let index = 0; index < row.length / 3; index += 1) {
    const nameCell = row[index * 3];
    const modifier = row[index * 3 + 1];
    const save = row[index * 3 + 2];
    const nameMatch = /^([A-Z]{3})\s+(.+)$/.exec(nameCell ?? "");
    if (
      nameMatch === null ||
      modifier === undefined ||
      save === undefined ||
      modifier.trim() === "" ||
      save.trim() === ""
    ) {
      malformedCells.push(
        `Expanded ability group ${index + 1} contains a missing or invalid cell.`,
      );
      continue;
    }
    normalized.push(
      `ability:${nameMatch[1]}|value:${nameMatch[2]}|modifier:${modifier}|save:${save}`,
    );
  }
  return malformedCells.length === 0
    ? { tag: "ok", value: normalized }
    : { tag: "malformed", message: malformedCells.join("; ") };
}

function normalizeAbilityCell(
  name: string,
  cell: string,
): AbilityCellNormalization {
  if (cell.trim() === "") {
    return {
      tag: "malformed",
      message: `Ability ${name} contains a missing cell.`,
    };
  }
  const saveValue = normalizeAbilitySaveCell(name, cell);
  if (saveValue !== undefined) return saveValue;
  const modifierValue = normalizeAbilityModifierCell(name, cell);
  if (modifierValue !== undefined) return modifierValue;
  return { tag: "ok", value: `ability:${name}|value:${cell}` };
}

function normalizeAbilitySaveCell(
  name: string,
  cell: string,
): AbilityCellNormalization | undefined {
  const match = /^(.*?)\s*\(([^)]*)\)\s+Save\s*(.*)$/.exec(cell);
  if (match === null) return undefined;
  return normalizeAbilityCaptures(name, {
    value: match[1] ?? "",
    modifier: match[2] ?? "",
    save: match[3] ?? "",
  });
}

function normalizeAbilityModifierCell(
  name: string,
  cell: string,
): AbilityCellNormalization | undefined {
  const emptyValueMatch = /^\(\)\s*\(([^)]*)\)$/.exec(cell);
  if (emptyValueMatch !== null) {
    return normalizeAbilityCaptures(name, {
      value: "",
      modifier: emptyValueMatch[1] ?? "",
    });
  }
  const match = /^(.*?)\s*\(([^)]*)\)$/.exec(cell);
  if (match === null) return undefined;
  return normalizeAbilityCaptures(name, {
    value: match[1] ?? "",
    modifier: match[2] ?? "",
  });
}

function normalizeAbilityCaptures(
  name: string,
  captures: Readonly<{
    readonly value: string;
    readonly modifier: string;
    readonly save?: string;
  }>,
): AbilityCellNormalization {
  const emptyCaptures = Object.entries(captures)
    .filter(([, value]) => value.trim() === "")
    .map(([capture]) => capture);
  if (emptyCaptures.length > 0) {
    return {
      tag: "malformed",
      message: `Ability ${name} has an empty ${emptyCaptures.join(" and ")} capture.`,
    };
  }
  const save = captures.save;
  return save === undefined
    ? {
        tag: "ok",
        value: `ability:${name}|value:${captures.value.trim()}|modifier:${captures.modifier.trim()}`,
      }
    : {
        tag: "ok",
        value: `ability:${name}|value:${captures.value.trim()}|modifier:${captures.modifier.trim()}|save:${save.trim()}`,
      };
}
