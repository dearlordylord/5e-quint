import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { decodeStatBlockRecordSync } from "@dnd/surface/surface/schema";
import type {
  StatBlockRecord,
  StatBlockSpellReference,
} from "@dnd/surface/surface/types";
import type { SourceSectionAnchorRange } from "@dnd/surface/surface/source-section-anchor";

import {
  analyzeStatBlockProcedurePressure,
  statBlockProcedurePressureOccurrences,
  type StatBlockProcedurePressureCapabilityProposal,
  type StatBlockProcedurePressureGroup,
} from "./stat-block-procedure-pressure.ts";

const EXPECTED_OCCURRENCE_COUNTS = {
  section: 455,
  procedure: 989,
  trait: 337,
  reactionTrigger: 0,
  spellcastingGroup: 107,
  spellReference: 309,
  resourceDeclaration: 195,
  resourceReference: 165,
  procedureReference: 45,
} as const;

const SOURCE_ANCHORS = sourceAnchors(srdStatBlockCollection.statBlocks);

describe("complete-catalog Stat Block procedure pressure", () => {
  it("enumerates every authored procedure-bearing occurrence in RAW catalog order", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
      SOURCE_ANCHORS,
    );

    expect(report.recordCount).toBe(330);
    expect(report.records.map(({ recordOrdinal }) => recordOrdinal)).toEqual(
      srdStatBlockCollection.statBlocks.map((_, index) => index + 1),
    );
    expect(report.records.map(({ statBlockId }) => statBlockId)).toEqual(
      srdStatBlockCollection.statBlocks.map(({ id }) => id),
    );
    expect(report.occurrenceCount).toBe(2602);
    expect(report.occurrenceCounts).toEqual(EXPECTED_OCCURRENCE_COUNTS);
    expect(report.occurrences).toEqual(
      srdStatBlockCollection.statBlocks.flatMap((record, index) =>
        statBlockProcedurePressureOccurrences(
          record,
          index + 1,
          SOURCE_ANCHORS,
        ),
      ),
    );
    expect(report.capabilityProposals.length).toBeLessThanOrEqual(24);
    expect(report.capabilityProposals[0]).toMatchObject({
      rank: 1,
      occurrenceKind: "spellReference",
      surfaceShape: {
        kind: "spellReference",
        restrictionPresence: "absent",
      },
      failedFacts: ["missingStatBlockSpellInvocationOwner"],
      occurrenceCount: 286,
    });
    expect(
      report.capabilityProposals.find(
        ({ surfaceShape }) =>
          surfaceShape.kind === "spellReference" &&
          surfaceShape.restrictionPresence === "present",
      ),
    ).toMatchObject({
      occurrenceKind: "spellReference",
      surfaceShape: {
        kind: "spellReference",
        restrictionPresence: "present",
      },
      occurrenceCount: 23,
      statBlockCount: 21,
    });
  });

  it("keeps all five dispositions distinct and source-links every catalog occurrence", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
      SOURCE_ANCHORS,
    );

    expect(report.dispositionCounts).toEqual({
      executable: 1084,
      textOnly: 912,
      tableOwned: 54,
      missingOwner: 552,
      malformed: 0,
    });
    expect(report.records.every(({ source }) => source.kind === "linked")).toBe(
      true,
    );
    for (const occurrence of report.occurrences) {
      expect(occurrence.witness.source.kind).toBe("linked");
      if (occurrence.witness.source.kind !== "linked") continue;
      expect(
        existsSync(
          resolve(process.cwd(), "../..", occurrence.witness.source.path),
        ),
      ).toBe(true);
      expect(occurrence.witness.source.firstLine).toBeGreaterThan(0);
      expect(occurrence.witness.source.lastLine).toBeGreaterThanOrEqual(
        occurrence.witness.source.firstLine,
      );
    }
  });

  it("accounts for every ordinary and Legendary Action resource declaration and reference", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
      SOURCE_ANCHORS,
    );
    const declarations = report.occurrences.filter(
      (occurrence) => occurrence.kind === "resourceDeclaration",
    );
    const references = report.occurrences.filter(
      (occurrence) => occurrence.kind === "resourceReference",
    );

    expect(declarations).toHaveLength(195);
    expect(
      declarations.filter(
        (occurrence) =>
          occurrence.witness.location.kind === "resourceDeclaration" &&
          occurrence.witness.location.resourceOrdinal === "legendaryActions",
      ),
    ).toHaveLength(30);
    for (const reference of references) {
      const referenceLocation = reference.witness.location;
      expect(referenceLocation.kind).toBe("resourceReference");
      if (referenceLocation.kind !== "resourceReference") continue;
      expect(
        declarations.some(
          (declaration) =>
            declaration.witness.recordOrdinal ===
              reference.witness.recordOrdinal &&
            declaration.witness.location.kind === "resourceDeclaration" &&
            declaration.witness.location.resourceOrdinal ===
              referenceLocation.resourceOrdinal,
        ),
      ).toBe(true);
    }
  });

  it("keeps structural groups and capability pressure invariant under authored identity changes", () => {
    const sourceRecords = srdStatBlockCollection.statBlocks;
    const renamedRecords = sourceRecords.map((record, index) =>
      syntheticIdentityRecord(record, index + 1),
    );
    const sourceReport = analyzeStatBlockProcedurePressure(
      sourceRecords,
      SOURCE_ANCHORS,
    );
    const renamedReport = analyzeStatBlockProcedurePressure(
      renamedRecords,
      SOURCE_ANCHORS,
    );

    expect(renamedReport.occurrenceCounts).toEqual(
      sourceReport.occurrenceCounts,
    );
    expect(renamedReport.dispositionCounts).toEqual(
      sourceReport.dispositionCounts,
    );
    expect(groupsWithoutWitnesses(renamedReport.groups)).toEqual(
      groupsWithoutWitnesses(sourceReport.groups),
    );
    expect(
      proposalsWithoutWitnesses(renamedReport.capabilityProposals),
    ).toEqual(proposalsWithoutWitnesses(sourceReport.capabilityProposals));
  });

  it("preserves spell-restriction presence without retaining protected expression", () => {
    const source = srdStatBlockCollection.statBlocks.find((record) => {
      const spells = statBlockSpellReferences(record);
      return spells.length === 1 && spells[0]?.restriction === undefined;
    });
    if (source === undefined) {
      throw new Error("Expected one single-spell unrestricted Stat Block.");
    }
    const restricted = withFirstSpellRestriction(source);
    const unrestrictedOccurrence = analyzeStatBlockProcedurePressure(
      [source],
      SOURCE_ANCHORS,
    ).occurrences.find(({ kind }) => kind === "spellReference");
    const restrictedOccurrence = analyzeStatBlockProcedurePressure(
      [restricted],
      SOURCE_ANCHORS,
    ).occurrences.find(({ kind }) => kind === "spellReference");

    expect(unrestrictedOccurrence?.disposition).toMatchObject({
      kind: "missingOwner",
      surfaceShape: {
        kind: "spellReference",
        restrictionPresence: "absent",
      },
    });
    expect(restrictedOccurrence?.disposition).toMatchObject({
      kind: "missingOwner",
      surfaceShape: {
        kind: "spellReference",
        restrictionPresence: "present",
      },
    });
    expect(restrictedOccurrence?.structuralShape).not.toBe(
      unrestrictedOccurrence?.structuralShape,
    );
    expect(restrictedOccurrence?.structuralShape).toContain(
      "authoredExpressionPresent",
    );
    expect(restrictedOccurrence?.structuralShape).not.toContain(
      "Synthetic table restriction",
    );
  });

  it("rejects plausible wrong-path and out-of-range source anchors", () => {
    const source = srdStatBlockCollection.statBlocks[0];
    if (source === undefined) throw new Error("Expected one SRD Stat Block.");
    const anchor = SOURCE_ANCHORS[0];
    if (anchor === undefined)
      throw new Error("Expected one SRD source anchor.");
    const mutations = [
      "Animals.md:1-1",
      `Synthetic.md:${String(anchor.lineStart)}-${String(anchor.lineEnd)}`,
      `${anchor.sourcePath}:${String(anchor.lineStart)}-${String(anchor.spanEnd + 1)}`,
    ].map(
      (section): StatBlockRecord => ({
        ...source,
        provenance: { ...source.provenance, section },
      }),
    );

    const report = analyzeStatBlockProcedurePressure(mutations, SOURCE_ANCHORS);

    expect(report.dispositionCounts.malformed).toBe(report.occurrenceCount);
    expect(
      report.records.every(
        ({ source: recordSource }) => recordSource.kind === "unresolved",
      ),
    ).toBe(true);
  });

  it("accumulates malformed source evidence across independent records", () => {
    const mutated = srdStatBlockCollection.statBlocks.slice(0, 2).map(
      (record, index): StatBlockRecord => ({
        ...record,
        provenance: {
          ...record.provenance,
          section: `synthetic-unlinked-source-${String(index + 1)}`,
        },
      }),
    );
    const report = analyzeStatBlockProcedurePressure(mutated, SOURCE_ANCHORS);

    expect(report.dispositionCounts.malformed).toBe(report.occurrenceCount);
    expect(
      new Set(report.occurrences.map(({ witness }) => witness.statBlockId))
        .size,
    ).toBe(2);
    expect(
      new Set(
        report.occurrences.flatMap(({ disposition }) =>
          disposition.kind === "malformed"
            ? disposition.issues.map((issue) =>
                issue.kind === "unresolvedSourceSection"
                  ? issue.section
                  : issue.kind,
              )
            : [],
        ),
      ),
    ).toEqual(
      new Set(["synthetic-unlinked-source-1", "synthetic-unlinked-source-2"]),
    );
  });

  it("retains typed reaction triggers as table facts beside the closed reaction procedure", () => {
    const source = srdStatBlockCollection.statBlocks.find((record) =>
      record.statBlock.actions?.some(
        (entry) =>
          entry.kind === "executable" &&
          entry.procedure.kind === "attack_roll" &&
          entry.resourceRefs.kind === "none",
      ),
    );
    const attack = source?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.resourceRefs.kind === "none",
    );
    if (source === undefined || attack?.kind !== "executable") {
      throw new Error("Expected one resource-free executable attack.");
    }
    const synthetic = decodeStatBlockRecordSync({
      ...source,
      id: "stat_block_synthetic_reaction_pressure",
      name: "Synthetic Reaction Pressure",
      statBlock: {
        ...source.statBlock,
        reactions: [
          {
            ...attack,
            procedureOrdinal: 1,
            trigger: { kind: "hit_by_attack_roll" },
          },
        ],
      },
    });
    const report = analyzeStatBlockProcedurePressure(
      [synthetic],
      SOURCE_ANCHORS,
    );
    const trigger = report.occurrences.find(
      (occurrence) => occurrence.kind === "reactionTrigger",
    );
    const reaction = report.occurrences.find(
      (occurrence) =>
        occurrence.kind === "procedure" &&
        occurrence.witness.location.kind === "procedure" &&
        occurrence.witness.location.section === "reactions",
    );

    expect(trigger?.disposition).toEqual({
      kind: "tableOwned",
      explicitTableFact: {
        kind: "reactionTrigger",
        trigger: { kind: "hit_by_attack_roll" },
      },
    });
    expect(reaction?.disposition).toMatchObject({
      kind: "missingOwner",
      failedFacts: ["unsupportedSection"],
    });
  });

  it("keeps generated planning evidence out of production package imports", () => {
    const packagesRoot = resolve(process.cwd(), "../..");
    const productionSources = typeScriptFiles(join(packagesRoot, "packages"))
      .filter((path) => !path.includes("node_modules"))
      .filter((path) => !path.match(/\.(?:property\.)?(?:mbt\.)?test\.tsx?$/));

    expect(
      productionSources.filter((path) =>
        readFileSync(path, "utf8").includes(
          "plans/stat-block-procedure-pressure",
        ),
      ),
    ).toEqual([]);
  });
});

function syntheticIdentityRecord(
  record: StatBlockRecord,
  recordOrdinal: number,
): StatBlockRecord {
  const renamedUnknown: unknown = JSON.parse(
    JSON.stringify(record, (key, value: unknown) => {
      if (key === "id") {
        return `stat_block_synthetic_pressure_identity_${String(recordOrdinal)}`;
      }
      if (key === "name") {
        return `Synthetic Pressure Identity ${String(recordOrdinal)}`;
      }
      if (key === "description") return "Synthetic exact prose.";
      if (key === "spellId") {
        return `synthetic_spell_reference_${String(recordOrdinal)}`;
      }
      if (key === "restriction") return "Synthetic restriction.";
      if (key === "label") return "Synthetic label";
      return value;
    }),
  );
  return decodeStatBlockRecordSync(renamedUnknown);
}

function statBlockSpellReferences(
  record: StatBlockRecord,
): readonly StatBlockSpellReference[] {
  return [
    ...(record.statBlock.actions ?? []),
    ...(record.statBlock.bonusActions ?? []),
    ...(record.statBlock.reactions ?? []),
    ...(record.statBlock.legendaryActions?.entries ?? []),
  ].flatMap((entry) =>
    entry.kind === "executable" && entry.procedure.kind === "spellcasting"
      ? entry.procedure.groups.flatMap(({ spells }) => spells)
      : [],
  );
}

function withFirstSpellRestriction(record: StatBlockRecord): StatBlockRecord {
  const encoded: unknown = JSON.parse(JSON.stringify(record));
  if (!addFirstSpellRestriction(encoded)) {
    throw new Error("Expected an unrestricted spell reference.");
  }
  return decodeStatBlockRecordSync(encoded);
}

function addFirstSpellRestriction(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((child) => addFirstSpellRestriction(child));
  }
  const record = value as Record<string, unknown>;
  if (typeof record.spellId === "string" && record.restriction === undefined) {
    record.restriction = "Synthetic table restriction.";
    return true;
  }
  return Object.values(record).some((child) => addFirstSpellRestriction(child));
}

function groupsWithoutWitnesses(
  groups: readonly StatBlockProcedurePressureGroup[],
): readonly Omit<StatBlockProcedurePressureGroup, "exampleWitnesses">[] {
  return groups.map(
    ({ exampleWitnesses: _exampleWitnesses, ...group }) => group,
  );
}

function proposalsWithoutWitnesses(
  proposals: readonly StatBlockProcedurePressureCapabilityProposal[],
): readonly Omit<
  StatBlockProcedurePressureCapabilityProposal,
  "exampleWitnesses"
>[] {
  return proposals.map(
    ({ exampleWitnesses: _exampleWitnesses, ...proposal }) => proposal,
  );
}

function sourceAnchors(
  records: readonly StatBlockRecord[],
): readonly SourceSectionAnchorRange[] {
  return records.map((record) => {
    const match = /^(.*):(\d+)-(\d+)$/.exec(record.provenance.section);
    if (match === null || match[1] === undefined) {
      throw new Error("Expected canonical SRD source section.");
    }
    const lineStart = Number(match[2]);
    const lineEnd = Number(match[3]);
    return {
      sourcePath: `.references/srd-5.2.1/${match[1]}`,
      lineStart,
      lineEnd,
      spanEnd: lineEnd,
    };
  });
}

function typeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typeScriptFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
