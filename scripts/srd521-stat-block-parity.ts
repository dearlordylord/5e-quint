import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { StatBlockRecord } from "../packages/surface/src/surface/types.ts";

export const SRD_STAT_BLOCK_SOURCE_PATHS = [
  ".references/srd-5.2.1/Animals.md",
  ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
  ".references/srd-5.2.1/Monsters/Monsters-C-D.md",
  ".references/srd-5.2.1/Monsters/Monsters-E-G.md",
  ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
  ".references/srd-5.2.1/Monsters/Monsters-M-O.md",
  ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
  ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
] as const;

export const SRD_STAT_BLOCK_SCOPE = {
  kind: "standalone-srd-stat-blocks",
  includes: SRD_STAT_BLOCK_SOURCE_PATHS,
  excludes: [
    "inline-spell-stat-blocks",
    "inline-magic-item-stat-blocks",
  ] as const,
} as const;

export type SrdStatBlockSourcePath =
  (typeof SRD_STAT_BLOCK_SOURCE_PATHS)[number];

export type SrdStatBlockSourceFile = {
  readonly sourcePath: string;
  readonly contents: string;
};

export type SrdStatBlockSourceReadIssue = {
  readonly sourcePath: SrdStatBlockSourcePath;
  readonly message: string;
};

export type SrdStatBlockSourceAnchor = {
  readonly sourcePath: string;
  readonly heading: string;
  readonly lineStart: number;
  /** The final line owned by the stat-block body, excluding its separator. */
  readonly lineEnd: number;
  /** The final line available to the source span before the next entity heading. */
  readonly spanEnd: number;
  readonly section: string;
};

export type SrdStatBlockSourceOccurrence = {
  readonly name: string;
  readonly anchor: SrdStatBlockSourceAnchor;
  readonly normalization: SrdStatBlockSourceNormalization;
};

export type SrdStatBlockSourceNormalization =
  | { readonly tag: "ok"; readonly value: string }
  | { readonly tag: "malformed"; readonly message: string };

export type SrdStatBlockSourceIssue = {
  readonly kind: "malformed-source";
  readonly sourcePath: string;
  readonly heading: string;
  readonly message: string;
};

export type SrdStatBlockSourceIdentity = {
  readonly name: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
};

export type SrdStatBlockSourceDiscovery = {
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly identities: readonly SrdStatBlockSourceIdentity[];
  readonly issues: readonly SrdStatBlockSourceIssue[];
};

export type SrdStatBlockGeneratedPeerObservation =
  | {
      readonly tag: "present";
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "missing";
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "orphaned";
      readonly peerPath: string;
    }
  | {
      readonly tag: "out-of-sync";
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "unreadable";
      readonly path: string;
      readonly message: string;
    };

export type SrdStatBlockParityIssue =
  | {
      readonly kind: "missing";
      readonly name: string;
    }
  | {
      readonly kind: "extra";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
    }
  | {
      readonly kind: "duplicate-id";
      readonly statBlockId: StatBlockRecord["id"];
    }
  | {
      readonly kind: "divergent-source";
      readonly name: string;
      readonly anchors: readonly SrdStatBlockSourceAnchor[];
      readonly normalizedSources: readonly string[];
    }
  | SrdStatBlockSourceIssue
  | {
      readonly kind: "provenance";
      readonly reason: "kind";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
      readonly actualKind: StatBlockRecord["provenance"]["kind"];
    }
  | {
      readonly kind: "provenance";
      readonly reason: "source-anchor";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
      readonly actualKind: "srd-5.2.1";
      readonly actualSection: string;
    }
  | {
      readonly kind: "unreadable-source";
      readonly sourcePath: string;
      readonly message: string;
    }
  | {
      readonly kind: "generated-peer";
      readonly evidence: Exclude<
        SrdStatBlockGeneratedPeerObservation,
        { readonly tag: "present" }
      >;
    };

export type SrdStatBlockParityReport = {
  readonly scope: typeof SRD_STAT_BLOCK_SCOPE;
  readonly sourceCoverage: SrdStatBlockSourceCoverage;
  readonly discovery: SrdStatBlockSourceDiscovery;
  readonly issues: readonly SrdStatBlockParityIssue[];
};

export type SrdStatBlockSourceCoverage =
  | {
      readonly tag: "complete";
      readonly paths: typeof SRD_STAT_BLOCK_SOURCE_PATHS;
    }
  | {
      readonly tag: "incomplete";
      readonly availablePaths: readonly SrdStatBlockSourcePath[];
      readonly missingPaths: readonly SrdStatBlockSourcePath[];
      readonly unreadablePaths: readonly SrdStatBlockSourcePath[];
    };

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

export type SrdStatBlockParityInstalledRecord = Pick<
  StatBlockRecord,
  "id" | "name" | "provenance"
>;

export type SrdStatBlockParityInput = {
  readonly sourceFiles: readonly SrdStatBlockSourceFile[];
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly sourceReadIssues: readonly SrdStatBlockSourceReadIssue[];
  readonly generatedPeerObservations: readonly SrdStatBlockGeneratedPeerObservation[];
};

export type ReadSrdStatBlockParityOptions = {
  readonly repoRoot: string;
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly readSource?: (absolutePath: string) => string;
  readonly generatedPeerObservations: readonly SrdStatBlockGeneratedPeerObservation[];
};

const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const abilityNameSet = new Set<string>(ABILITY_NAMES);
const sourcePathSet = new Set<string>(SRD_STAT_BLOCK_SOURCE_PATHS);

type Heading = {
  readonly level: number;
  readonly name: string;
  readonly lineIndex: number;
};

type ParsedSourceFile = {
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly issues: readonly SrdStatBlockSourceIssue[];
};

export function discoverSrdStatBlocks(
  sourceFiles: readonly SrdStatBlockSourceFile[],
): SrdStatBlockSourceDiscovery {
  const parsedFiles = sourceFiles
    .filter((sourceFile) => sourcePathSet.has(sourceFile.sourcePath))
    .map(parseSourceFile);
  const occurrences = parsedFiles.flatMap(
    (parsedSourceFile) => parsedSourceFile.occurrences,
  );
  const issues = parsedFiles.flatMap(
    (parsedSourceFile) => parsedSourceFile.issues,
  );
  const identityMap = new Map<string, SrdStatBlockSourceOccurrence[]>();

  for (const occurrence of occurrences) {
    const key = normalizeIdentity(occurrence.name);
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
  );
  const sourceIdentities = new Map(
    discovery.identities.map((identity) => [
      normalizeIdentity(identity.name),
      identity,
    ]),
  );
  const installedCatalog = deriveInstalledCatalogIssues(
    input.installedStatBlocks,
    sourceIdentities,
  );
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
    ...(sourceCoverage.tag === "complete"
      ? deriveMissingIssues(discovery, installedCatalog.installedNames)
      : []),
    ...input.generatedPeerObservations
      .filter((evidence) => evidence.tag !== "present")
      .map((evidence) => ({ kind: "generated-peer" as const, evidence })),
  ];

  return { scope: SRD_STAT_BLOCK_SCOPE, sourceCoverage, discovery, issues };
}

function deriveSourceCoverage(
  sourceFiles: readonly SrdStatBlockSourceFile[],
  sourceReadIssues: readonly SrdStatBlockSourceReadIssue[],
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
  return missingPaths.length === 0 && unreadablePaths.length === 0
    ? { tag: "complete", paths: SRD_STAT_BLOCK_SOURCE_PATHS }
    : {
        tag: "incomplete",
        availablePaths,
        missingPaths,
        unreadablePaths,
      };
}

function deriveMissingSourcePathIssues(
  sourceCoverage: SrdStatBlockSourceCoverage,
): readonly SrdStatBlockParityIssue[] {
  return sourceCoverage.tag === "complete"
    ? []
    : sourceCoverage.missingPaths.map((sourcePath) => ({
        kind: "unreadable-source" as const,
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
): {
  readonly installedNames: ReadonlySet<string>;
  readonly issues: readonly SrdStatBlockParityIssue[];
} {
  const installedNames = new Set<string>();
  const installedIds = new Set<string>();
  const issues: SrdStatBlockParityIssue[] = [];

  for (const statBlock of installedStatBlocks) {
    const duplicateIdIssue = deriveDuplicateIdIssue(statBlock, installedIds);
    if (duplicateIdIssue !== undefined) issues.push(duplicateIdIssue);
    installedIds.add(statBlock.id);
    installedNames.add(normalizeIdentity(statBlock.name));
    issues.push(
      ...deriveProvenanceIssues(statBlock, sourceIdentities),
      ...deriveExtraIssue(statBlock, sourceIdentities),
    );
  }

  return { installedNames, issues };
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
    normalizeIdentity(statBlock.name),
  );
  if (sourceIdentity === undefined) return [];
  const provenanceSection = statBlock.provenance.section;
  const claimedAnchor = parseSourceSection(provenanceSection);
  const hasSourceAnchor =
    claimedAnchor !== undefined &&
    sourceIdentity.occurrences.some((occurrence) =>
      sourceAnchorMatches(claimedAnchor, occurrence.anchor),
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

type ParsedSourceSection = {
  readonly sourcePath: string;
  readonly lineStart: number;
  readonly lineEnd: number;
};

function parseSourceSection(section: string): ParsedSourceSection | undefined {
  const match = /^(.*):(\d+)-(\d+)$/.exec(section);
  if (match === null) return undefined;
  const lineStart = Number.parseInt(match[2] ?? "", 10);
  const lineEnd = Number.parseInt(match[3] ?? "", 10);
  return lineStart > 0 && lineEnd >= lineStart
    ? { sourcePath: match[1] ?? "", lineStart, lineEnd }
    : undefined;
}

function sourceAnchorMatches(
  claimedAnchor: ParsedSourceSection,
  sourceAnchor: SrdStatBlockSourceAnchor,
): boolean {
  return (
    sourcePathMatches(claimedAnchor.sourcePath, sourceAnchor.sourcePath) &&
    claimedAnchor.lineStart === sourceAnchor.lineStart &&
    claimedAnchor.lineEnd >= sourceAnchor.lineEnd &&
    claimedAnchor.lineEnd <= sourceAnchor.spanEnd
  );
}

function deriveExtraIssue(
  statBlock: SrdStatBlockParityInstalledRecord,
  sourceIdentities: ReadonlyMap<string, SrdStatBlockSourceIdentity>,
): readonly SrdStatBlockParityIssue[] {
  return sourceIdentities.has(normalizeIdentity(statBlock.name))
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
    .filter((identity) => !installedNames.has(normalizeIdentity(identity.name)))
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
    generatedPeerObservations: options.generatedPeerObservations,
  });
}

function parseSourceFile(sourceFile: SrdStatBlockSourceFile): ParsedSourceFile {
  const lines = sourceFile.contents.split(/\r?\n/);
  const headings = lines.flatMap(parseHeading);
  const parsedStatBlocks = headings.flatMap((heading) =>
    parseStatBlockHeading(sourceFile, lines, headings, heading),
  );
  return {
    occurrences: parsedStatBlocks.map(
      (parsedStatBlock) => parsedStatBlock.occurrence,
    ),
    issues: parsedStatBlocks.flatMap(
      (parsedStatBlock) => parsedStatBlock.issues,
    ),
  };
}

type ParsedStatBlock = {
  readonly occurrence: SrdStatBlockSourceOccurrence;
  readonly issues: readonly SrdStatBlockSourceIssue[];
};

type TableNormalization =
  | { readonly tag: "ok"; readonly value: readonly string[] }
  | { readonly tag: "malformed"; readonly message: string };

type AbilityCellNormalization =
  | { readonly tag: "ok"; readonly value: string }
  | { readonly tag: "malformed"; readonly message: string };

function parseHeading(line: string, lineIndex: number): readonly Heading[] {
  const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
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
  sourceFile: SrdStatBlockSourceFile,
  lines: readonly string[],
  headings: readonly Heading[],
  heading: Heading,
): readonly ParsedStatBlock[] {
  const firstFollowingHeadingIndex = nextHeadingLineIndex(headings, heading);
  const nextEntityHeadingIndex = nextEntityHeadingLineIndex(headings, heading);
  const bodyEnd = Math.min(firstFollowingHeadingIndex, nextEntityHeadingIndex);
  const bodyBeforeChildHeading = lines.slice(heading.lineIndex + 1, bodyEnd);
  if (!hasArmorClassLine(bodyBeforeChildHeading)) return [];

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
        candidate.level <= heading.level,
    )?.lineIndex ?? Number.POSITIVE_INFINITY
  );
}

function hasArmorClassLine(lines: readonly string[]): boolean {
  return lines.some((line) => /^\s*\*\*AC\*\*/.test(line));
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

function normalizeIdentity(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function sourcePathMatches(
  provenancePath: string,
  sourcePath: string,
): boolean {
  return (
    provenancePath === sourcePath || sourcePath.endsWith(`/${provenancePath}`)
  );
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
    if (trimmed === "" || trimmed === "---" || /^#{2,3}\s+/.test(trimmed)) {
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
  const match = /^(.*?)\s*\(([^)]+)\)\s+Save\s+(.+)$/.exec(cell);
  return match === null
    ? undefined
    : {
        tag: "ok",
        value: `ability:${name}|value:${match[1]?.trim() ?? ""}|modifier:${match[2] ?? ""}|save:${match[3] ?? ""}`,
      };
}

function normalizeAbilityModifierCell(
  name: string,
  cell: string,
): AbilityCellNormalization | undefined {
  const match = /^(.*?)\s*\(([^)]+)\)$/.exec(cell);
  return match === null
    ? undefined
    : {
        tag: "ok",
        value: `ability:${name}|value:${match[1]?.trim() ?? ""}|modifier:${match[2] ?? ""}`,
      };
}
