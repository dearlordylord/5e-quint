import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { Option } from "effect";
import { describe, expect, it } from "vitest";

import {
  srdStatBlockCatalog,
  srdStatBlockCollection,
} from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  evaluateSrdStatBlockCatalogReachability,
  readSrdStatBlockPresentations,
} from "./srd-stat-block-catalog-reachability.ts";

const publicationFile = join(
  process.cwd(),
  "packages/surface/publication/srd-surface.json",
);

describe("SRD Stat Block catalog reachability", () => {
  it("reaches every installed record through list, selection, and presentation", () => {
    const report = evaluateSrdStatBlockCatalogReachability({
      installedStatBlocks: srdStatBlockCollection.statBlocks,
      catalog: srdStatBlockCatalog,
      presentations: readSrdStatBlockPresentations(publicationFile),
    });

    expect(report).toEqual({
      installedCount: 330,
      listedCount: 330,
      presentationCount: 330,
      issues: [],
    });
  });

  it("accumulates independent list, selection, and presentation mutations", () => {
    const [first, second, unexpected] = srdStatBlockCollection.statBlocks.slice(
      0,
      3,
    );
    const presentations = readSrdStatBlockPresentations(publicationFile);
    if (
      first === undefined ||
      second === undefined ||
      unexpected === undefined ||
      presentations.tag !== "available"
    ) {
      throw new Error("Reachability mutation requires three published records");
    }
    const firstPresentation = presentations.statBlocks.find(
      ({ id }) => id === first.id,
    );
    const unexpectedPresentation = presentations.statBlocks.find(
      ({ id }) => id === unexpected.id,
    );
    if (
      firstPresentation === undefined ||
      unexpectedPresentation === undefined
    ) {
      throw new Error("Reachability mutation requires matching presentations");
    }
    const mismatchedSelection = { ...first, name: "Synthetic Selection" };
    const mismatchedPresentation = {
      ...firstPresentation,
      name: "Synthetic Presentation",
    };

    const report = evaluateSrdStatBlockCatalogReachability({
      installedStatBlocks: [first, second],
      catalog: {
        listStatBlocks: () => [first, first, unexpected],
        getStatBlock: (id) =>
          id === first.id ? Option.some(mismatchedSelection) : Option.none(),
      },
      presentations: {
        tag: "available",
        statBlocks: [
          mismatchedPresentation,
          mismatchedPresentation,
          unexpectedPresentation,
        ],
      },
    });

    expect(report).toMatchObject({
      installedCount: 2,
      listedCount: 3,
      presentationCount: 3,
    });
    expect(report.issues).toEqual([
      {
        kind: "duplicate-list-entry",
        statBlockId: first.id,
        occurrences: 2,
      },
      { kind: "unexpected-list-entry", statBlockId: unexpected.id },
      {
        kind: "duplicate-presentation",
        statBlockId: first.id,
        occurrences: 2,
      },
      { kind: "unexpected-presentation", statBlockId: unexpected.id },
      { kind: "selection-mismatch", statBlockId: first.id },
      { kind: "presentation-mismatch", statBlockId: first.id },
      { kind: "missing-list-entry", statBlockId: second.id },
      { kind: "unselectable", statBlockId: second.id },
      { kind: "missing-presentation", statBlockId: second.id },
    ]);
  });

  it("rejects duplicate installed identities without duplicating downstream diagnostics", () => {
    const first = srdStatBlockCollection.statBlocks[0];
    const presentations = readSrdStatBlockPresentations(publicationFile);
    if (first === undefined || presentations.tag !== "available") {
      throw new Error(
        "Duplicate-installed mutation requires a published record",
      );
    }
    const presentation = presentations.statBlocks.find(
      ({ id }) => id === first.id,
    );
    if (presentation === undefined) {
      throw new Error("Duplicate-installed mutation requires its presentation");
    }

    expect(
      evaluateSrdStatBlockCatalogReachability({
        installedStatBlocks: [first, first],
        catalog: {
          listStatBlocks: () => [first],
          getStatBlock: () => Option.some(first),
        },
        presentations: { tag: "available", statBlocks: [presentation] },
      }),
    ).toEqual({
      installedCount: 2,
      listedCount: 1,
      presentationCount: 1,
      issues: [
        {
          kind: "duplicate-installed-entry",
          statBlockId: first.id,
          occurrences: 2,
        },
      ],
    });
  });

  it("returns typed unreadable and malformed presentation artifact issues", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "srd-stat-block-reachability-artifact-"),
    );
    const missingFile = join(directory, "missing.json");
    const invalidJsonFile = join(directory, "invalid-json.json");
    const malformedFile = join(directory, "malformed.json");
    writeFileSync(invalidJsonFile, "{");
    writeFileSync(malformedFile, "{}\n");

    try {
      expect(readSrdStatBlockPresentations(missingFile)).toMatchObject({
        tag: "unavailable",
        issue: {
          kind: "presentation-artifact-unreadable",
          file: missingFile,
        },
      });
      expect(readSrdStatBlockPresentations(malformedFile)).toMatchObject({
        tag: "unavailable",
        issue: {
          kind: "presentation-artifact-malformed",
          file: malformedFile,
        },
      });
      expect(readSrdStatBlockPresentations(invalidJsonFile)).toMatchObject({
        tag: "unavailable",
        issue: {
          kind: "presentation-artifact-malformed",
          file: invalidJsonFile,
        },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
