import { readFileSync } from "node:fs";
import { join } from "node:path";

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

export type SrdStatBlockSourceAnchor = {
  readonly sourcePath: string;
  readonly heading: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly section: string;
};

export type SrdStatBlockSourceOccurrence = {
  readonly name: string;
  readonly anchor: SrdStatBlockSourceAnchor;
  readonly normalizedSource: string;
};

export type SrdStatBlockSourceIdentity = {
  readonly name: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
};

export type SrdStatBlockSourceDiscovery = {
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly identities: readonly SrdStatBlockSourceIdentity[];
};

export type SrdStatBlockGeneratedPeerEvidence =
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
      readonly statBlockId: string;
    }
  | {
      readonly kind: "duplicate-id";
      readonly statBlockId: string;
    }
  | {
      readonly kind: "divergent-source";
      readonly name: string;
      readonly anchors: readonly SrdStatBlockSourceAnchor[];
      readonly normalizedSources: readonly string[];
    }
  | {
      readonly kind: "provenance";
      readonly reason: "kind";
      readonly name: string;
      readonly statBlockId: string;
      readonly actualKind: string;
    }
  | {
      readonly kind: "provenance";
      readonly reason: "source-anchor";
      readonly name: string;
      readonly statBlockId: string;
      readonly actualKind: "srd-5.2.1";
      readonly actualSection: string | undefined;
    }
  | {
      readonly kind: "unreadable-source";
      readonly sourcePath: string;
      readonly message: string;
    }
  | {
      readonly kind: "generated-peer";
      readonly evidence: Exclude<
        SrdStatBlockGeneratedPeerEvidence,
        { readonly tag: "present" }
      >;
    };

export type SrdStatBlockParityReport = {
  readonly scope: typeof SRD_STAT_BLOCK_SCOPE;
  readonly discovery: SrdStatBlockSourceDiscovery;
  readonly issues: readonly SrdStatBlockParityIssue[];
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

export type SrdStatBlockParityInstalledRecord = {
  readonly id: string;
  readonly name: string;
  readonly provenance: {
    readonly kind: string;
    readonly section?: string;
  };
};

export type SrdStatBlockParityInput = {
  readonly sourceFiles: readonly SrdStatBlockSourceFile[];
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly sourceReadIssues?: readonly {
    readonly sourcePath: string;
    readonly message: string;
  }[];
  readonly generatedPeers?: readonly SrdStatBlockGeneratedPeerEvidence[];
};

export type ReadSrdStatBlockParityOptions = {
  readonly repoRoot: string;
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly sourcePaths?: readonly SrdStatBlockSourcePath[];
  readonly readSource?: (absolutePath: string) => string;
  readonly generatedPeers?: readonly SrdStatBlockGeneratedPeerEvidence[];
};

const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const abilityNameSet = new Set<string>(ABILITY_NAMES);
const sourcePathSet = new Set<string>(SRD_STAT_BLOCK_SOURCE_PATHS);

type Heading = {
  readonly level: number;
  readonly name: string;
  readonly lineIndex: number;
};

export function discoverSrdStatBlocks(
  sourceFiles: readonly SrdStatBlockSourceFile[],
): SrdStatBlockSourceDiscovery {
  const occurrences = sourceFiles
    .filter((sourceFile) => sourcePathSet.has(sourceFile.sourcePath))
    .flatMap(parseSourceFile);
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
  };
}

export function deriveSrdStatBlockParity(
  input: SrdStatBlockParityInput,
): SrdStatBlockParityReport {
  const discovery = discoverSrdStatBlocks(input.sourceFiles);
  const sourceReadIssues = input.sourceReadIssues ?? [];
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
    ...deriveDivergentSourceIssues(discovery),
    ...installedCatalog.issues,
    ...(sourceReadIssues.length === 0
      ? deriveMissingIssues(discovery, installedCatalog.installedNames)
      : []),
    ...(input.generatedPeers ?? [])
      .filter((evidence) => evidence.tag !== "present")
      .map((evidence) => ({ kind: "generated-peer" as const, evidence })),
  ];

  return { scope: SRD_STAT_BLOCK_SCOPE, discovery, issues };
}

function deriveDivergentSourceIssues(
  discovery: SrdStatBlockSourceDiscovery,
): readonly SrdStatBlockParityIssue[] {
  return discovery.identities.flatMap((identity) => {
    const normalizedSources = Array.from(
      new Set(
        identity.occurrences.map((occurrence) => occurrence.normalizedSource),
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
  const sectionSourcePath = sourcePathFromSection(provenanceSection);
  const hasSourceAnchor =
    sectionSourcePath !== undefined &&
    sourceIdentity.occurrences.some((occurrence) =>
      sourcePathMatches(sectionSourcePath, occurrence.anchor.sourcePath),
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

function sourcePathFromSection(
  section: string | undefined,
): string | undefined {
  if (section === undefined) return undefined;
  const delimiterIndex = section.lastIndexOf(":");
  return delimiterIndex < 0 ? undefined : section.slice(0, delimiterIndex);
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
  const sourcePaths = options.sourcePaths ?? SRD_STAT_BLOCK_SOURCE_PATHS;
  const readSource =
    options.readSource ??
    ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const sourceFiles: SrdStatBlockSourceFile[] = [];
  const sourceReadIssues: {
    readonly sourcePath: string;
    readonly message: string;
  }[] = [];

  for (const sourcePath of sourcePaths) {
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
    ...(options.generatedPeers === undefined
      ? {}
      : { generatedPeers: options.generatedPeers }),
  });
}

function parseSourceFile(
  sourceFile: SrdStatBlockSourceFile,
): readonly SrdStatBlockSourceOccurrence[] {
  const lines = sourceFile.contents.split(/\r?\n/);
  const headings = lines.flatMap(parseHeading);
  return headings.flatMap((heading) =>
    parseStatBlockHeading(sourceFile, lines, headings, heading),
  );
}

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
): readonly SrdStatBlockSourceOccurrence[] {
  const firstFollowingHeadingIndex = nextHeadingLineIndex(headings, heading);
  const nextEntityHeadingIndex = nextEntityHeadingLineIndex(headings, heading);
  const bodyEnd = Math.min(firstFollowingHeadingIndex, nextEntityHeadingIndex);
  const bodyBeforeChildHeading = lines.slice(heading.lineIndex + 1, bodyEnd);
  if (!hasArmorClassLine(bodyBeforeChildHeading)) return [];

  const anchorLineEnd = statBlockAnchorLineEnd(
    lines,
    heading.lineIndex,
    nextEntityHeadingIndex,
  );
  const anchor: SrdStatBlockSourceAnchor = {
    sourcePath: sourceFile.sourcePath,
    heading: heading.name,
    lineStart: heading.lineIndex + 1,
    lineEnd: anchorLineEnd,
    section: `${sourceFile.sourcePath}:${heading.lineIndex + 1}-${anchorLineEnd}`,
  };
  return [
    {
      name: heading.name,
      anchor,
      normalizedSource: normalizeSourceBlock(
        lines.slice(heading.lineIndex, anchorLineEnd),
      ),
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

function statBlockAnchorLineEnd(
  lines: readonly string[],
  headingLineIndex: number,
  nextEntityHeadingIndex: number,
): number {
  let lineEndIndex = Math.min(nextEntityHeadingIndex, lines.length);
  while (
    lineEndIndex > headingLineIndex + 1 &&
    lines[lineEndIndex - 1]?.trim() === ""
  ) {
    lineEndIndex -= 1;
  }
  const trailingSeparator = lines[lineEndIndex - 1]?.trim() === "---";
  return trailingSeparator ? lineEndIndex + 1 : lineEndIndex;
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

function normalizeSourceBlock(lines: readonly string[]): string {
  const normalized: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (): void => {
    if (tableRows.length === 0) return;
    normalized.push(...normalizeTable(tableRows));
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
  return normalized.join("\n");
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
  return body.split("|").map((cell) => cell.trim());
}

function normalizeTable(
  rows: readonly (readonly string[])[],
): readonly string[] {
  const dataRows = rows.filter(isTableDataRow);
  if (dataRows.length === 0) return [];

  const header = dataRows[0] ?? [];
  const normalizedAbilities = normalizeAbilityTable(dataRows, header);
  if (normalizedAbilities.length > 0) return normalizedAbilities;

  const expandedAbilities = normalizeExpandedAbilityTable(dataRows, header);
  if (expandedAbilities.length > 0) return expandedAbilities;

  return dataRows.map((row) =>
    row.map((cell) => normalizePlainLine(cell)).join("|"),
  );
}

function isTableDataRow(row: readonly string[]): boolean {
  return !row.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function normalizeAbilityTable(
  dataRows: readonly (readonly string[])[],
  header: readonly string[],
): readonly string[] {
  if (!isAbilityHeader(header)) return [];
  return dataRows
    .slice(1)
    .flatMap((row) => normalizeAbilityDataRow(row, ABILITY_NAMES));
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
): readonly string[] {
  const expandedDataRows = isExpandedAbilityHeader(header)
    ? dataRows.slice(1)
    : dataRows;
  return expandedDataRows.flatMap((row) =>
    normalizeExpandedAbilityDataRow(row),
  );
}

function isExpandedAbilityHeader(header: readonly string[]): boolean {
  return (
    header.some((cell) => cell === "MOD") &&
    header.some((cell) => cell === "SAVE")
  );
}

function normalizeAbilityDataRow(
  row: readonly string[],
  names: readonly string[],
): readonly string[] {
  if (row.length === names.length) {
    return row.flatMap((cell, index) =>
      normalizeCompactAbilityCell(names[index], cell),
    );
  }

  if (row.length === names.length * 3) {
    return names.map((_, index) =>
      normalizeGroupedAbilityCell(row, names, index),
    );
  }

  return [];
}

function normalizeCompactAbilityCell(
  name: string | undefined,
  cell: string,
): readonly string[] {
  return name === undefined ? [] : [normalizeAbilityCell(name, cell)];
}

function normalizeGroupedAbilityCell(
  row: readonly string[],
  names: readonly string[],
  index: number,
): string {
  const nameCell = rowCell(row, index * 3);
  const nameMatch = /^([A-Z]{3})\s+(.+)$/.exec(nameCell);
  const name = matchedGroup(nameMatch, 1, rowCell(names, index));
  const value = matchedGroup(nameMatch, 2, "");
  const modifier = rowCell(row, index * 3 + 1);
  const save = rowCell(row, index * 3 + 2);
  return `ability:${name}|value:${value}|modifier:${modifier}|save:${save}`;
}

function rowCell(row: readonly string[], index: number): string {
  const value = row[index];
  return value === undefined ? "" : value;
}

function matchedGroup(
  match: RegExpExecArray | null,
  index: number,
  fallback: string,
): string {
  if (match === null) return fallback;
  const value = match[index];
  return value === undefined ? fallback : value;
}

function normalizeExpandedAbilityDataRow(
  row: readonly string[],
): readonly string[] {
  if (row.length === 0 || row.length % 4 !== 0) return [];
  const abilityCount = row.length / 4;
  const names = Array.from(
    { length: abilityCount },
    (_, index) => row[index * 4] ?? "",
  );
  if (!names.every((name) => abilityNameSet.has(name))) return [];
  return names.map((name, index) => {
    const value = row[index * 4 + 1] ?? "";
    const modifier = row[index * 4 + 2] ?? "";
    const save = row[index * 4 + 3] ?? "";
    return `ability:${name}|value:${value}|modifier:${modifier}|save:${save}`;
  });
}

function normalizeAbilityCell(name: string, cell: string): string {
  const saveValue = normalizeAbilitySaveCell(name, cell);
  if (saveValue !== undefined) return saveValue;
  const modifierValue = normalizeAbilityModifierCell(name, cell);
  if (modifierValue !== undefined) return modifierValue;
  return `ability:${name}|value:${cell}`;
}

function normalizeAbilitySaveCell(
  name: string,
  cell: string,
): string | undefined {
  const match = /^(.*?)\s*\(([^)]+)\)\s+Save\s+(.+)$/.exec(cell);
  return match === null
    ? undefined
    : `ability:${name}|value:${match[1]?.trim() ?? ""}|modifier:${match[2] ?? ""}|save:${match[3] ?? ""}`;
}

function normalizeAbilityModifierCell(
  name: string,
  cell: string,
): string | undefined {
  const match = /^(.*?)\s*\(([^)]+)\)$/.exec(cell);
  return match === null
    ? undefined
    : `ability:${name}|value:${match[1]?.trim() ?? ""}|modifier:${match[2] ?? ""}`;
}
