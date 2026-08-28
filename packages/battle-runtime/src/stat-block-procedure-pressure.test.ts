import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { decodeStatBlockRecordSync } from "@dnd/surface/surface/schema";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

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

describe("complete-catalog Stat Block procedure pressure", () => {
  it("enumerates every authored procedure-bearing occurrence in RAW catalog order", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
    );

    expect(report.recordCount).toBe(330);
    expect(report.records.map(({ statBlockId }) => statBlockId)).toEqual(
      srdStatBlockCollection.statBlocks.map(({ id }) => id),
    );
    expect(report.occurrenceCount).toBe(2602);
    expect(report.occurrenceCounts).toEqual(EXPECTED_OCCURRENCE_COUNTS);
    expect(report.occurrences).toEqual(
      srdStatBlockCollection.statBlocks.flatMap(
        statBlockProcedurePressureOccurrences,
      ),
    );
    expect(report.capabilityProposals.length).toBeLessThanOrEqual(24);
    expect(report.capabilityProposals[0]).toMatchObject({
      rank: 1,
      occurrenceKind: "spellReference",
      surfaceShape: "statBlockSpellReference",
      failedFacts: ["missingStatBlockSpellInvocationOwner"],
      occurrenceCount: 309,
    });
  });

  it("keeps all five dispositions distinct and source-links every catalog occurrence", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
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
            declaration.witness.statBlockId === reference.witness.statBlockId &&
            declaration.witness.location.kind === "resourceDeclaration" &&
            declaration.witness.location.resourceOrdinal ===
              referenceLocation.resourceOrdinal,
        ),
      ).toBe(true);
    }
  });

  it("keeps structural groups and capability pressure invariant under authored identity changes", () => {
    const source = srdStatBlockCollection.statBlocks.find((record) =>
      record.statBlock.actions?.some(
        (entry) =>
          entry.kind === "executable" &&
          entry.procedure.kind === "spellcasting",
      ),
    );
    if (source === undefined) {
      throw new Error("Expected one installed spellcasting Stat Block.");
    }
    const renamedUnknown: unknown = JSON.parse(
      JSON.stringify(source, (key, value: unknown) => {
        if (key === "id") return "stat_block_synthetic_pressure_identity";
        if (key === "name") return "Synthetic Pressure Identity";
        if (key === "description") return "Synthetic exact prose.";
        if (key === "spellId") return "synthetic_spell_reference";
        if (key === "restriction") return "Synthetic restriction.";
        if (key === "label") return "Synthetic label";
        return value;
      }),
    );
    const renamed = decodeStatBlockRecordSync(renamedUnknown);
    const sourceReport = analyzeStatBlockProcedurePressure([source]);
    const renamedReport = analyzeStatBlockProcedurePressure([renamed]);

    expect(groupsWithoutWitnesses(renamedReport.groups)).toEqual(
      groupsWithoutWitnesses(sourceReport.groups),
    );
    expect(
      proposalsWithoutWitnesses(renamedReport.capabilityProposals),
    ).toEqual(proposalsWithoutWitnesses(sourceReport.capabilityProposals));
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
    const report = analyzeStatBlockProcedurePressure(mutated);

    expect(report.dispositionCounts.malformed).toBe(report.occurrenceCount);
    expect(
      new Set(report.occurrences.map(({ witness }) => witness.statBlockId))
        .size,
    ).toBe(2);
    expect(
      new Set(
        report.occurrences.flatMap(({ disposition }) =>
          disposition.kind === "malformed" ? disposition.issues : [],
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
    const report = analyzeStatBlockProcedurePressure([synthetic]);
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
      explicitTableFact: "reactionTrigger:hit_by_attack_roll",
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

function typeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typeScriptFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
