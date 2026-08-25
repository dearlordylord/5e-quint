import { describe, expect, test } from "vitest";

import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  deriveSrdStatBlockParity,
  readSrdStatBlockParity,
  srdStatBlockSourceIdentityCount,
  srdStatBlockSourceOccurrenceCount,
} from "./srd521-stat-block-parity.ts";

describe("SRD Stat Block source parity operation", () => {
  test("derives the standalone denominator and preserves repeated source anchors", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      installedStatBlocks: [],
    });

    expect(srdStatBlockSourceOccurrenceCount(report.discovery)).toBe(334);
    expect(srdStatBlockSourceIdentityCount(report.discovery)).toBe(330);

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
      report.issues.filter(
        (issue) =>
          issue.kind === "divergent-source" && issue.name === "Stone Giant",
      ),
    ).toHaveLength(1);

    for (const name of ["Stone Golem", "Storm Giant", "Succubus"]) {
      const identity = report.discovery.identities.find(
        (candidate) => candidate.name === name,
      );
      expect(identity?.occurrences).toHaveLength(2);
      expect(identity?.occurrences[0]?.normalizedSource).toBe(
        identity?.occurrences[1]?.normalizedSource,
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
    });

    expect(srdStatBlockSourceOccurrenceCount(report.discovery)).toBe(334);
    expect(srdStatBlockSourceIdentityCount(report.discovery)).toBe(330);
    expect(
      report.issues.filter((issue) => issue.kind === "missing"),
    ).toHaveLength(309);
    expect(
      report.issues.filter((issue) => issue.kind === "extra"),
    ).toHaveLength(0);
    expect(
      report.issues.filter((issue) => issue.kind === "provenance"),
    ).toHaveLength(0);
    expect(
      report.issues.filter((issue) => issue.kind === "duplicate-id"),
    ).toHaveLength(0);
  });

  test("accumulates catalog, provenance, divergent-source, and generated-peer issues", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: `# Animals

## Alpha

*Medium Beast, Unaligned*

**AC** 12

---

## Beta

*Small Beast, Unaligned*

**AC** 10

---
`,
        },
        {
          sourcePath: ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
          contents: `# Monsters A–B

## Beta

*Small Beast, Unaligned*

**AC** 11

---
`,
        },
      ],
      installedStatBlocks: [
        {
          id: "stat_block_alpha",
          name: "Alpha",
          provenance: { kind: "srd-5.2.1", section: "Animals.md:3-9" },
        },
        {
          id: "stat_block_alpha",
          name: "Alpha",
          provenance: { kind: "srd-5.2.1", section: "Animals.md:3-9" },
        },
        {
          id: "stat_block_extra",
          name: "Extra",
          provenance: { kind: "xphb", section: "synthetic" },
        },
      ],
      generatedPeers: [
        {
          tag: "missing",
          sourcePath: "packages/surface/content/stat_block_beta.dhall",
          peerPath: "packages/surface/content/stat_block_beta.json",
        },
        {
          tag: "orphaned",
          peerPath: "packages/surface/content/stat_block_orphan.json",
        },
        {
          tag: "out-of-sync",
          sourcePath: "packages/surface/content/stat_block_alpha.dhall",
          peerPath: "packages/surface/content/stat_block_alpha.json",
        },
        {
          tag: "unreadable",
          path: "packages/surface/content/stat_block_unreadable.json",
          message: "synthetic unreadable generated peer",
        },
      ],
    });

    expect(
      report.issues.filter((issue) => issue.kind === "divergent-source"),
    ).toEqual([expect.objectContaining({ name: "Beta" })]);
    expect(
      report.issues.filter((issue) => issue.kind === "duplicate-id"),
    ).toEqual([{ kind: "duplicate-id", statBlockId: "stat_block_alpha" }]);
    expect(
      report.issues.filter((issue) => issue.kind === "provenance"),
    ).toEqual([
      expect.objectContaining({
        kind: "provenance",
        name: "Extra",
        statBlockId: "stat_block_extra",
        actualKind: "xphb",
      }),
    ]);
    expect(report.issues.filter((issue) => issue.kind === "extra")).toEqual([
      { kind: "extra", name: "Extra", statBlockId: "stat_block_extra" },
    ]);
    expect(report.issues.filter((issue) => issue.kind === "missing")).toEqual([
      { kind: "missing", name: "Beta" },
    ]);
    expect(
      report.issues.filter((issue) => issue.kind === "generated-peer"),
    ).toHaveLength(4);
  });

  test("keeps inline spell and item stat-block shapes outside the standalone scope", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: "# Animals\n\n## Alpha\n\n**AC** 12\n",
        },
        {
          sourcePath: ".references/srd-5.2.1/Spells/Descriptions-A-D.md",
          contents: "# Spells\n\n## Inline Creature\n\n**AC** 10\n",
        },
        {
          sourcePath: ".references/srd-5.2.1/Magic-Items/Items-A-H.md",
          contents: "# Items\n\n## Inline Object\n\n**AC** 15\n",
        },
      ],
      installedStatBlocks: [],
    });

    expect(
      report.discovery.identities.map((identity) => identity.name),
    ).toEqual(["Alpha"]);
  });

  test("reports an unreadable source without inventing missing identities", () => {
    const report = readSrdStatBlockParity({
      repoRoot: process.cwd(),
      sourcePaths: [".references/srd-5.2.1/Animals.md"],
      readSource: () => {
        throw new Error("synthetic unreadable source");
      },
      installedStatBlocks: [],
    });

    expect(report.discovery.occurrences).toHaveLength(0);
    expect(report.issues).toEqual([
      {
        kind: "unreadable-source",
        sourcePath: ".references/srd-5.2.1/Animals.md",
        message: "synthetic unreadable source",
      },
    ]);
  });

  test("requires an SRD record provenance section to point into its source identity", () => {
    const report = deriveSrdStatBlockParity({
      sourceFiles: [
        {
          sourcePath: ".references/srd-5.2.1/Animals.md",
          contents: "# Animals\n\n## Alpha\n\n**AC** 12\n",
        },
      ],
      installedStatBlocks: [
        {
          id: "stat_block_alpha",
          name: "Alpha",
          provenance: {
            kind: "srd-5.2.1",
            section: "Monsters/Monsters-A-B.md:1-5",
          },
        },
      ],
    });

    expect(report.issues).toEqual([
      {
        kind: "provenance",
        reason: "source-anchor",
        name: "Alpha",
        statBlockId: "stat_block_alpha",
        actualKind: "srd-5.2.1",
        actualSection: "Monsters/Monsters-A-B.md:1-5",
      },
    ]);
  });
});
