import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { statBlockId } from "../packages/shared/src/game-facts.ts";

import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  deriveSrdStatBlockParity,
  discoverSrdStatBlocks,
  readSrdStatBlockParity,
  type SrdStatBlockParityInstalledRecord,
  type SrdStatBlockSourceFile,
  srdStatBlockSourceIdentityCount,
  srdStatBlockSourceOccurrenceCount,
} from "./srd521-stat-block-parity.ts";

const srdSourcePathSet = new Set<string>(SRD_STAT_BLOCK_SOURCE_PATHS);

function parityRecord(
  overrides: Partial<SrdStatBlockParityInstalledRecord> = {},
): SrdStatBlockParityInstalledRecord {
  return {
    id: overrides.id ?? statBlockId("stat_block_synthetic"),
    name: overrides.name ?? "Synthetic",
    provenance: overrides.provenance ?? {
      kind: "srd-5.2.1",
      section: "Animals.md:3-5",
    },
  };
}

function completeSourceFiles(
  sourceFiles: readonly SrdStatBlockSourceFile[],
): readonly SrdStatBlockSourceFile[] {
  const sourceFileByPath = new Map(
    sourceFiles.map((sourceFile) => [sourceFile.sourcePath, sourceFile]),
  );
  return [
    ...SRD_STAT_BLOCK_SOURCE_PATHS.map(
      (sourcePath) =>
        sourceFileByPath.get(sourcePath) ?? {
          sourcePath,
          contents: `# Synthetic source\n\n## Synthetic ${sourcePath}\n\n**AC** 10\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** A synthetic action.\n`,
        },
    ),
    ...sourceFiles.filter(
      (sourceFile) => !srdSourcePathSet.has(sourceFile.sourcePath),
    ),
  ];
}

describe("SRD Stat Block source parity operation", () => {
  test("reports a duplicate source path without inflating its occurrence denominator", () => {
    const sourceFile = {
      sourcePath: SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
      contents: readFileSync(SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH, "utf8"),
    };
    const discovery = discoverSrdStatBlocks([sourceFile, sourceFile]);

    expect(discovery.occurrences).toHaveLength(95);
    expect(discovery.issues).toEqual([
      {
        kind: "duplicate-source",
        sourcePath: SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
        reason: "identical",
      },
    ]);
  });

  test("makes conflicting duplicate contents incomplete and order invariant", () => {
    const animalsSource = {
      sourcePath: SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
      contents: readFileSync(SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH, "utf8"),
    };
    const conflictingAnimalsSource = {
      ...animalsSource,
      contents: animalsSource.contents.replace(
        "## Allosaurus",
        "## Altered Allosaurus",
      ),
    };
    const remainingSources = SRD_STAT_BLOCK_SOURCE_PATHS.slice(1).map(
      (sourcePath) => ({
        sourcePath,
        contents: readFileSync(sourcePath, "utf8"),
      }),
    );
    const parityInput = {
      installedStatBlocks: [] as const,
      sourceReadIssues: [] as const,
      peerObservations: [] as const,
    };
    const canonicalFirst = deriveSrdStatBlockParity({
      ...parityInput,
      sourceFiles: [
        animalsSource,
        conflictingAnimalsSource,
        ...remainingSources,
      ],
    });
    const conflictingFirst = deriveSrdStatBlockParity({
      ...parityInput,
      sourceFiles: [
        conflictingAnimalsSource,
        animalsSource,
        ...remainingSources,
      ],
    });

    expect(canonicalFirst).toEqual(conflictingFirst);
    expect(canonicalFirst.discovery.occurrences).toHaveLength(239);
    expect(canonicalFirst.discovery.issues).toContainEqual({
      kind: "duplicate-source",
      sourcePath: SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
      reason: "conflicting",
    });
    expect(canonicalFirst.sourceCoverage).toMatchObject({
      tag: "incomplete",
      incompletePaths: [SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH],
    });
  });

  test("derives the standalone denominator and preserves repeated source anchors", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(srdStatBlockSourceOccurrenceCount(report.discovery)).toBe(334);
    expect(srdStatBlockSourceIdentityCount(report.discovery)).toBe(330);
    expect(report.sourceCoverage).toEqual({
      tag: "complete",
      paths: SRD_STAT_BLOCK_SOURCE_PATHS,
    });
    expect(report.discovery.issues).toEqual([]);

    const stoneGiant = report.discovery.identities.find(
      (identity) => identity.name === "Stone Giant",
    );
    expect(stoneGiant?.occurrences).toHaveLength(2);
    expect(
      stoneGiant?.occurrences.map((occurrence) => occurrence.anchor),
    ).toEqual([
      expect.objectContaining({
        sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
        heading: "Stone Giant",
      }),
      expect.objectContaining({
        sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
        heading: "Stone Giant",
      }),
    ]);
    expect(
      report.issues.filter((issue) => issue.kind === "divergent-source"),
    ).toEqual([]);

    for (const name of [
      "Stone Giant",
      "Stone Golem",
      "Storm Giant",
      "Succubus",
    ]) {
      const identity = report.discovery.identities.find(
        (candidate) => candidate.name === name,
      );
      expect(identity?.occurrences).toHaveLength(2);
      expect(identity?.occurrences[0]?.normalization).toEqual(
        identity?.occurrences[1]?.normalization,
      );
    }

    expect(report.scope.excludes).toEqual([
      "inline-spell-stat-blocks",
      "inline-magic-item-stat-blocks",
    ]);
    expect(
      report.issues.filter((issue) => issue.kind === "missing"),
    ).toHaveLength(330);
  });

  test("measures the installed catalog against the same source-derived denominator", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      installedStatBlocks: srdStatBlockCollection.statBlocks,
      peerObservations: [],
    });

    expect(srdStatBlockSourceOccurrenceCount(report.discovery)).toBe(334);
    expect(srdStatBlockSourceIdentityCount(report.discovery)).toBe(330);
    expect(srdStatBlockCollection.statBlocks).toHaveLength(330);
    expect(report.issues).toEqual([]);
  });

  test("rejects a pilot duplicate identity while preserving source-derived membership", () => {
    const bat = srdStatBlockCollection.statBlocks.find(
      (statBlock) => statBlock.name === "Bat",
    );
    expect(bat).toBeDefined();
    if (bat === undefined) return;

    const duplicateBat = {
      ...bat,
      id: statBlockId("stat_block_bat_duplicate_identity"),
    };
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      installedStatBlocks: [...srdStatBlockCollection.statBlocks, duplicateBat],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "duplicate-identity",
      name: "Bat",
      statBlockIds: [bat.id, duplicateBat.id],
    });
    expect(
      report.issues.filter((issue) => issue.kind === "missing"),
    ).toHaveLength(
      report.discovery.identities.length -
        srdStatBlockCollection.statBlocks.length,
    );
    expect(
      report.issues.filter((issue) => issue.kind === "cardinality"),
    ).toEqual([
      {
        kind: "cardinality",
        expectedIdentityCount: report.discovery.identities.length,
        actualInstalledCount: srdStatBlockCollection.statBlocks.length + 1,
      },
    ]);
  });

  test("enforces discovered cardinality once every source identity is installed", () => {
    const sourceFiles = completeSourceFiles([
      {
        sourcePath: ".references/srd-5.2.1/Animals.md",
        contents:
          "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n",
      },
    ]);
    const discovery = discoverSrdStatBlocks(sourceFiles);
    const installedStatBlocks = discovery.identities.map((identity, index) => {
      const anchor = identity.occurrences[0]?.anchor;
      if (anchor === undefined) {
        throw new Error(
          `Synthetic identity ${identity.name} has no source anchor`,
        );
      }
      return parityRecord({
        id: statBlockId(`stat_block_synthetic_${index}`),
        name: identity.name,
        provenance: { kind: "srd-5.2.1", section: anchor.section },
      });
    });
    const alpha = installedStatBlocks.find(
      (statBlock) => statBlock.name === "Alpha",
    );
    expect(alpha).toBeDefined();
    if (alpha === undefined) return;
    const duplicateAlpha = parityRecord({
      id: statBlockId("stat_block_synthetic_alpha_duplicate"),
      name: " alpha ",
      provenance: alpha.provenance,
    });

    const report = deriveSrdStatBlockParity({
      sourceFiles,
      installedStatBlocks: [...installedStatBlocks, duplicateAlpha],
      sourceReadIssues: [],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "duplicate-identity",
      name: "Alpha",
      statBlockIds: [alpha.id, duplicateAlpha.id],
    });
    expect(report.issues).toContainEqual({
      kind: "cardinality",
      expectedIdentityCount: report.discovery.identities.length,
      actualInstalledCount: installedStatBlocks.length + 1,
    });
    expect(report.issues.filter((issue) => issue.kind === "missing")).toEqual(
      [],
    );
  });

  test("accumulates catalog, provenance, divergent-source, and publication-peer issues", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: completeSourceFiles([
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: `# Animals

## Alpha

*Medium Beast, Unaligned*

**AC** 12
**CR** 1

### Actions

**Synthetic Action.** Alpha acts.

---

## Beta

*Small Beast, Unaligned*

**AC** 10
**CR** 1

### Actions

**Synthetic Action.** Beta acts.

---
`,
        },
        {
          sourcePath: ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
          contents: `# Monsters A–B

## Beta

*Small Beast, Unaligned*

**AC** 11
**CR** 1

### Actions

**Synthetic Action.** Beta acts.

---
`,
        },
      ]),
      installedStatBlocks: [
        parityRecord({
          id: statBlockId("stat_block_alpha"),
          name: "Alpha",
          provenance: { kind: "srd-5.2.1", section: "Animals.md:3-12" },
        }),
        parityRecord({
          id: statBlockId("stat_block_alpha"),
          name: "Alpha",
          provenance: { kind: "srd-5.2.1", section: "Animals.md:3-12" },
        }),
        parityRecord({
          id: statBlockId("stat_block_extra"),
          name: "Extra",
          provenance: { kind: "xphb", section: "synthetic" },
        }),
      ],
      sourceReadIssues: [],
      peerObservations: [
        {
          tag: "missing",
          recordKind: "statBlock",
          sourcePath: "packages/surface/content/stat_block_beta.dhall",
          peerPath: "packages/surface/content/stat_block_beta.json",
        },
        {
          tag: "orphaned",
          recordKind: "statBlock",
          peerPath: "packages/surface/content/stat_block_orphan.json",
        },
        {
          tag: "out-of-sync",
          recordKind: "statBlock",
          sourcePath: "packages/surface/content/stat_block_alpha.dhall",
          peerPath: "packages/surface/content/stat_block_alpha.json",
        },
        {
          tag: "generated-peer-failed",
          reason: "decode",
          recordKind: "statBlock",
          sourcePath: "packages/surface/content/stat_block_unreadable.dhall",
          peerPath: "packages/surface/content/stat_block_unreadable.json",
          message: "synthetic unreadable generated peer",
        },
      ],
    });

    expect(
      report.issues.filter((issue) => issue.kind === "divergent-source"),
    ).toEqual([expect.objectContaining({ name: "Beta" })]);
    expect(
      report.issues.filter((issue) => issue.kind === "duplicate-id"),
    ).toEqual([
      { kind: "duplicate-id", statBlockId: statBlockId("stat_block_alpha") },
    ]);
    expect(
      report.issues.filter((issue) => issue.kind === "provenance"),
    ).toEqual([
      expect.objectContaining({
        kind: "provenance",
        name: "Extra",
        statBlockId: statBlockId("stat_block_extra"),
        actualKind: "xphb",
      }),
    ]);
    expect(report.issues.filter((issue) => issue.kind === "extra")).toEqual([
      {
        kind: "extra",
        name: "Extra",
        statBlockId: statBlockId("stat_block_extra"),
      },
    ]);
    expect(
      report.issues.filter(
        (issue) => issue.kind === "missing" && issue.name === "Beta",
      ),
    ).toEqual([{ kind: "missing", name: "Beta" }]);
    expect(
      report.issues.filter((issue) => issue.kind === "publication-peer"),
    ).toHaveLength(4);
  });

  test("keeps inline spell and item stat-block shapes outside the standalone scope", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: completeSourceFiles([
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents:
            "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n",
        },
        {
          sourcePath: ".references/srd-5.2.1/Spells/Descriptions-A-D.md",
          contents:
            "# Spells\n\n## Inline Creature\n\n**AC** 10\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Inline creature acts.\n",
        },
        {
          sourcePath: ".references/srd-5.2.1/Magic-Items/Items-A-H.md",
          contents:
            "# Items\n\n## Inline Object\n\n**AC** 15\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Inline object acts.\n",
        },
      ]),
      installedStatBlocks: [],
      sourceReadIssues: [],
      peerObservations: [],
    });

    expect(
      report.discovery.identities.filter(
        (identity) => identity.name === "Alpha",
      ),
    ).toHaveLength(1);
  });

  test("reports an unreadable source without inventing missing identities", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      readSource: (absolutePath) => {
        if (absolutePath.endsWith("Animals.md")) {
          throw new Error("synthetic unreadable source");
        }
        return "";
      },
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(report.discovery.occurrences).toHaveLength(0);
    expect(report.sourceCoverage.tag).toBe("incomplete");
    if (report.sourceCoverage.tag === "incomplete") {
      expect(report.sourceCoverage.unreadablePaths).toContain(
        ".references/srd-5.2.1/Animals.md",
      );
    }
    expect(report.issues).toContainEqual({
      kind: "unreadable-source",
      sourcePath: ".references/srd-5.2.1/Animals.md",
      message: "synthetic unreadable source",
    });
  });

  test("does not classify an installed record as extra when its source path is unreadable", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      readSource: (absolutePath) => {
        if (absolutePath.endsWith("Animals.md")) {
          throw new Error("synthetic unreadable source");
        }
        return readFileSync(absolutePath, "utf8");
      },
      installedStatBlocks: [
        parityRecord({
          id: statBlockId("stat_block_weasel"),
          name: "Weasel",
          provenance: {
            kind: "srd-5.2.1",
            section: "Animals.md:1-2",
          },
        }),
      ],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "unreadable-source",
      sourcePath: ".references/srd-5.2.1/Animals.md",
      message: "synthetic unreadable source",
    });
    expect(
      report.issues.filter(
        (issue) => issue.kind === "extra" && issue.name === "Weasel",
      ),
    ).toEqual([]);
  });

  test("does not validate a provenance anchor in an unreadable source path", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      readSource: (absolutePath) => {
        if (absolutePath.endsWith("Monsters-P-S.md")) {
          throw new Error("synthetic unreadable P-S source");
        }
        return readFileSync(absolutePath, "utf8");
      },
      installedStatBlocks: [
        parityRecord({
          id: statBlockId("stat_block_stone_giant"),
          name: "Stone Giant",
          provenance: {
            kind: "srd-5.2.1",
            section: "Monsters/Monsters-P-S.md:1567-1600",
          },
        }),
      ],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "unreadable-source",
      sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
      message: "synthetic unreadable P-S source",
    });
    expect(
      report.issues.filter(
        (issue) => issue.kind === "provenance" && issue.name === "Stone Giant",
      ),
    ).toEqual([]);
  });

  test("does not claim the full corpus when a source path is omitted", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents:
            "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n",
        },
      ],
      sourceReadIssues: [],
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(report.sourceCoverage).toEqual({
      tag: "incomplete",
      availablePaths: [".references/srd-5.2.1/Animals.md"],
      missingPaths: expect.arrayContaining([
        ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
      ]),
      unreadablePaths: [],
      incompletePaths: [],
    });
    expect(
      report.issues.filter(
        (issue) =>
          issue.kind === "missing-source" &&
          issue.sourcePath === ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
      ),
    ).toEqual([
      {
        kind: "missing-source",
        sourcePath: ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
        message: "Source path was not supplied to the standalone SRD corpus.",
      },
    ]);
  });

  test("requires an SRD record provenance section to point into its source identity", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: completeSourceFiles([
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents:
            "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n",
        },
      ]),
      installedStatBlocks: [
        parityRecord({
          id: statBlockId("stat_block_alpha"),
          name: "Alpha",
          provenance: {
            kind: "srd-5.2.1",
            section: "Monsters/Monsters-A-B.md:1-5",
          },
        }),
      ],
      sourceReadIssues: [],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "provenance",
      reason: "source-anchor",
      name: "Alpha",
      statBlockId: statBlockId("stat_block_alpha"),
      actualKind: "srd-5.2.1",
      actualSection: "Monsters/Monsters-A-B.md:1-5",
    });
  });

  test("requires an SRD provenance section to own the exact source range", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: completeSourceFiles([
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents:
            "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n",
        },
      ]),
      sourceReadIssues: [],
      installedStatBlocks: [
        parityRecord({
          id: statBlockId("stat_block_alpha"),
          name: "Alpha",
          provenance: {
            kind: "srd-5.2.1",
            section: "Animals.md:3-4",
          },
        }),
      ],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "provenance",
      reason: "source-anchor",
      name: "Alpha",
      statBlockId: statBlockId("stat_block_alpha"),
      actualKind: "srd-5.2.1",
      actualSection: "Animals.md:3-4",
    });
  });

  test("does not claim complete coverage for empty readable source files", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
        sourcePath,
        contents: "",
      })),
      sourceReadIssues: [],
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(report.discovery.occurrences).toHaveLength(0);
    expect(report.sourceCoverage).toEqual({
      tag: "incomplete",
      availablePaths: SRD_STAT_BLOCK_SOURCE_PATHS,
      missingPaths: [],
      unreadablePaths: [],
      incompletePaths: SRD_STAT_BLOCK_SOURCE_PATHS,
    });
    expect(
      report.issues.filter((issue) => issue.kind === "incomplete-source"),
    ).toHaveLength(SRD_STAT_BLOCK_SOURCE_PATHS.length);
    expect(report.issues.filter((issue) => issue.kind === "missing")).toEqual(
      [],
    );
  });

  test("does not claim a complete occurrence when AC and CR are the truncated body", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: completeSourceFiles([
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: "# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n",
        },
      ]),
      installedStatBlocks: [],
      sourceReadIssues: [],
      peerObservations: [],
    });

    expect(
      report.discovery.identities.filter(
        (identity) => identity.name === "Alpha",
      ),
    ).toEqual([]);
    expect(report.sourceCoverage.tag).toBe("incomplete");
    if (report.sourceCoverage.tag === "incomplete") {
      expect(report.sourceCoverage.incompletePaths).toContain(
        ".references/srd-5.2.1/Animals.md",
      );
    }
    expect(report.issues).toContainEqual({
      kind: "incomplete-source",
      sourcePath: ".references/srd-5.2.1/Animals.md",
      message: expect.stringContaining("complete standalone stat block"),
    });
  });

  test.each([
    {
      name: "empty modifier capture",
      cell: "10 () Save +1",
      message: "Ability STR has an empty modifier capture.",
    },
    {
      name: "empty value capture",
      cell: "() (+1)",
      message: "Ability STR has an empty value capture.",
    },
    {
      name: "empty save capture",
      cell: "10 (+0) Save ",
      message: "Ability STR has an empty save capture.",
    },
  ])("reports $name instead of normalizing it away", ({ cell, message }) => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: `# Animals\n\n## Alpha\n\n**AC** 12\n**CR** 1\n\n| STR | DEX | CON | INT | WIS | CHA |\n|-----|-----|-----|-----|-----|-----|\n| ${cell} | 12 (+1) | 10 (+0) | 10 (+0) | 10 (+0) | 10 (+0) |\n\n### Actions\n\n**Synthetic Action.** Alpha acts.\n`,
        },
      ],
      sourceReadIssues: [],
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "malformed-source",
      sourcePath: ".references/srd-5.2.1/Animals.md",
      heading: "Alpha",
      message,
    });
  });

  test("reports malformed ability rows instead of dropping them during normalization", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: `# Animals

## Alpha

**AC** 12
**CR** 1

| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| 10 (+0) | 12 (+1) | 10 (+0) |

### Actions

**Synthetic Action.** Alpha acts.
`,
        },
      ],
      sourceReadIssues: [],
      installedStatBlocks: [],
      peerObservations: [],
    });

    expect(report.issues).toContainEqual({
      kind: "malformed-source",
      sourcePath: ".references/srd-5.2.1/Animals.md",
      heading: "Alpha",
      message: "Ability table row has 3 cells; expected 6 or 18.",
    });
  });
});
