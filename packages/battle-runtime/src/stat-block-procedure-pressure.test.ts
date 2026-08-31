import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { srdStatBlockCollection } from "@dnd/surface/surface/installed-srd-stat-block-catalog";
import { decodeStatBlockRecordSync } from "@dnd/surface/surface/schema";
import {
  resolveAuthoredUnitReference,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type {
  AuthoredExecutableProcedure,
  SpellRecord,
  StatBlockRecord,
  StatBlockSpellReference,
} from "@dnd/surface/surface/types";

import {
  discoverSrdStatBlocks,
  SRD_STAT_BLOCK_SOURCE_PATHS,
} from "../../../scripts/srd521-stat-block-parity.ts";

import {
  analyzeStatBlockProcedurePressure,
  classifyUnrestrictedStatBlockSpellReferences,
  countUnrestrictedStatBlockSpellReferenceDefinitions,
  statBlockProcedurePressureOccurrences,
  type StatBlockProcedurePressureCapabilityProposal,
  type StatBlockProcedurePressureGroup,
  type StatBlockProcedurePressureSourceAuthority,
  type StatBlockSpellReferenceClassificationSource,
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

const SOURCE_AUTHORITY = canonicalSourceAuthority();

describe("complete-catalog Stat Block procedure pressure", () => {
  it("enumerates every authored procedure-bearing occurrence in RAW catalog order", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
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
          SOURCE_AUTHORITY,
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
      SOURCE_AUTHORITY,
    );

    expect(report.dispositionCounts).toEqual({
      executable: 1142,
      textOnly: 912,
      tableOwned: 54,
      missingOwner: 494,
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
      SOURCE_AUTHORITY,
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

  it("links every structural group and proposal to its complete stable row membership", () => {
    const report = analyzeStatBlockProcedurePressure(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
    );
    const occurrencesByRowId = new Map(
      report.occurrences.map((occurrence) => [occurrence.rowId, occurrence]),
    );

    expect(occurrencesByRowId.size).toBe(report.occurrenceCount);
    for (const group of report.groups) {
      expect(group.memberRowIds).toHaveLength(group.occurrenceCount);
      expect(
        group.memberRowIds.every((rowId) => occurrencesByRowId.has(rowId)),
      ).toBe(true);
    }
    for (const proposal of report.capabilityProposals) {
      expect(proposal.memberRowIds).toHaveLength(proposal.occurrenceCount);
      expect(
        proposal.memberRowIds.every((rowId) => occurrencesByRowId.has(rowId)),
      ).toBe(true);
    }
    expect(
      report.capabilityProposals.find(
        ({ surfaceShape }) =>
          surfaceShape.kind === "procedure" &&
          surfaceShape.procedureKind === "save",
      )?.memberRowIds,
    ).toHaveLength(48);
  });

  it("keeps structural groups and capability pressure invariant under authored identity changes", () => {
    const sourceRecords = srdStatBlockCollection.statBlocks;
    const renamedRecords = sourceRecords.map((record, index) =>
      syntheticIdentityRecord(record, index + 1),
    );
    const renamedNames = new Map(
      sourceRecords.map(({ name }, index) => [
        name,
        `Synthetic Pressure Identity ${String(index + 1)}`,
      ]),
    );
    const renamedAuthority: StatBlockProcedurePressureSourceAuthority = {
      identities: SOURCE_AUTHORITY.identities.map((identity) => ({
        ...identity,
        name: renamedNames.get(identity.name) ?? identity.name,
      })),
    };
    const sourceReport = analyzeStatBlockProcedurePressure(
      sourceRecords,
      SOURCE_AUTHORITY,
    );
    const renamedReport = analyzeStatBlockProcedurePressure(
      renamedRecords,
      renamedAuthority,
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
      SOURCE_AUTHORITY,
    ).occurrences.find(({ kind }) => kind === "spellReference");
    const restrictedOccurrence = analyzeStatBlockProcedurePressure(
      [restricted],
      SOURCE_AUTHORITY,
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

  it("keeps spellcasting material prose out of structural rows and grouping", () => {
    const source = srdStatBlockCollection.statBlocks.find((record) =>
      statBlockSpellcastingProcedures(record).some(
        ({ components }) => components !== undefined,
      ),
    );
    if (source === undefined) {
      throw new Error(
        "Expected spellcasting with an authored material component.",
      );
    }
    const firstMaterial = withFirstSpellcastingMaterial(
      source,
      "Synthetic first material.",
    );
    const secondMaterial = withFirstSpellcastingMaterial(
      source,
      "Synthetic second material.",
    );
    const firstReport = analyzeStatBlockProcedurePressure(
      [firstMaterial],
      SOURCE_AUTHORITY,
    );
    const secondReport = analyzeStatBlockProcedurePressure(
      [secondMaterial],
      SOURCE_AUTHORITY,
    );

    expect(groupsWithoutWitnesses(secondReport.groups)).toEqual(
      groupsWithoutWitnesses(firstReport.groups),
    );
    expect(proposalsWithoutWitnesses(secondReport.capabilityProposals)).toEqual(
      proposalsWithoutWitnesses(firstReport.capabilityProposals),
    );
    const serializedRows = JSON.stringify(secondReport.occurrences);
    expect(serializedRows).not.toContain("Synthetic second material");
    expect(JSON.stringify(firstReport)).not.toContain(
      "Synthetic first material",
    );
    expect(serializedRows).toContain("authoredExpressionPresent");
  });

  it("rejects plausible wrong-path and out-of-range source anchors", () => {
    const source = srdStatBlockCollection.statBlocks[0];
    if (source === undefined) throw new Error("Expected one SRD Stat Block.");
    const anchor = SOURCE_AUTHORITY.identities.find(
      ({ name }) => name === source.name,
    )?.anchors[0];
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

    const report = analyzeStatBlockProcedurePressure(
      mutations,
      SOURCE_AUTHORITY,
    );

    expect(report.dispositionCounts.malformed).toBe(report.occurrenceCount);
    expect(
      report.records.every(
        ({ source: recordSource }) => recordSource.kind === "unresolved",
      ),
    ).toBe(true);
  });

  it("rejects a canonical source anchor owned by another Stat Block identity", () => {
    const borrower = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Allosaurus",
    );
    const lenderAnchor = SOURCE_AUTHORITY.identities.find(
      ({ name }) => name === "Ankylosaurus",
    )?.anchors[0];
    if (borrower === undefined || lenderAnchor === undefined) {
      throw new Error("Expected the two canonical SRD source identities.");
    }
    const borrowedSection = `${lenderAnchor.sourcePath}:${String(lenderAnchor.lineStart)}-${String(lenderAnchor.lineEnd)}`;
    const mutated: StatBlockRecord = {
      ...borrower,
      provenance: { ...borrower.provenance, section: borrowedSection },
    };

    const report = analyzeStatBlockProcedurePressure(
      [mutated],
      SOURCE_AUTHORITY,
    );

    expect(report.records[0]?.source).toEqual({
      kind: "unresolved",
      section: borrowedSection,
    });
    expect(report.dispositionCounts.malformed).toBe(report.occurrenceCount);
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
    const report = analyzeStatBlockProcedurePressure(mutated, SOURCE_AUTHORITY);

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
    const sourceIdentity = SOURCE_AUTHORITY.identities.find(
      ({ name }) => name === source.name,
    );
    if (sourceIdentity === undefined) {
      throw new Error("Expected the source record's canonical authority.");
    }
    const syntheticAuthority: StatBlockProcedurePressureSourceAuthority = {
      identities: [{ ...sourceIdentity, name: synthetic.name }],
    };
    const report = analyzeStatBlockProcedurePressure(
      [synthetic],
      syntheticAuthority,
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

  it("classifies typed support, nested reaction, trait, and reference pressure", () => {
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
    const { resources: _resources, ...statBlockWithoutResources } =
      source.statBlock;
    const decodedSynthetic = decodeStatBlockRecordSync({
      ...source,
      id: "stat_block_synthetic_nested_pressure",
      name: "Synthetic Nested Pressure",
      statBlock: {
        ...statBlockWithoutResources,
        resources: [
          {
            ordinal: 1,
            ownership: "shared",
            limit: { kind: "daily", uses: 1 },
          },
        ],
        traits: [
          {
            name: "Synthetic Unsupported Trait",
            description: "A synthetic unsupported trait.",
            effect: {
              kind: "caster_shared_resistance",
              chosenFrom: "resistances_list",
            },
          },
        ],
        actions: [
          {
            ...attack,
            procedureOrdinal: 1,
            resourceRefs: { kind: "some", ordinals: [1] },
          },
          {
            kind: "executable",
            procedureOrdinal: 2,
            procedure: {
              kind: "support",
              name: "Synthetic Support",
              target: "self",
              effect: {
                kind: "apply_condition",
                condition: "blinded",
                expiresAt: { kind: "target_next_turn_end" },
              },
            },
            resourceRefs: { kind: "none" },
          },
          {
            kind: "executable",
            procedureOrdinal: 3,
            procedure: {
              kind: "multiattack",
              name: "Synthetic Unsupported Dispatch",
              dispatches: [
                {
                  procedureOrdinal: 2,
                  count: { kind: "literal", value: 1 },
                },
              ],
            },
            resourceRefs: { kind: "none" },
          },
          {
            kind: "textOnly",
            procedureOrdinal: 4,
            name: "Synthetic Table Procedure",
            description: "A synthetic table-owned procedure.",
            reason: "required_table_adjudication",
            resourceRefs: { kind: "none" },
          },
        ],
        reactions: [
          {
            ...attack,
            procedureOrdinal: 1,
            trigger: {
              kind: "any_of",
              triggers: [
                { kind: "hit_by_attack_roll" },
                { kind: "takes_damage_from_creature", rangeFeet: 5 },
                { kind: "self_or_visible_creature_falls", rangeFeet: 60 },
                {
                  kind: "targeted_by_named_spell",
                  spellId: "unit_spell_synthetic_trigger",
                },
                { kind: "creature_casts_spell", components: ["V"] },
                { kind: "spell_save_outcome", outcome: "success" },
              ],
            },
          },
        ],
      },
    });
    const decodedResource = decodedSynthetic.statBlock.resources?.[0];
    if (decodedResource === undefined) {
      throw new Error("Expected the decoded resource fixture.");
    }
    const {
      resources: _decodedResources,
      ...decodedStatBlockWithoutResources
    } = decodedSynthetic.statBlock;
    const synthetic: StatBlockRecord = {
      ...decodedSynthetic,
      statBlock: decodedStatBlockWithoutResources,
    };
    const sourceIdentity = SOURCE_AUTHORITY.identities.find(
      ({ name }) => name === source.name,
    );
    if (sourceIdentity === undefined) {
      throw new Error("Expected the source record's canonical authority.");
    }
    const report = analyzeStatBlockProcedurePressure([synthetic], {
      identities: [{ ...sourceIdentity, name: synthetic.name }],
    });

    expect(
      report.occurrences.find(
        ({ kind, witness }) =>
          kind === "reactionTrigger" &&
          witness.location.kind === "reactionTrigger",
      )?.disposition,
    ).toEqual({
      kind: "tableOwned",
      explicitTableFact: {
        kind: "reactionTrigger",
        trigger: {
          kind: "any_of",
          triggers: [
            { kind: "hit_by_attack_roll" },
            { kind: "takes_damage_from_creature" },
            { kind: "self_or_visible_creature_falls" },
            { kind: "targeted_by_named_spell" },
            { kind: "creature_casts_spell" },
            { kind: "spell_save_outcome" },
          ],
        },
      },
    });
    expect(
      report.occurrences.find(
        ({ kind, witness }) =>
          kind === "resourceReference" &&
          witness.location.kind === "resourceReference",
      )?.disposition,
    ).toMatchObject({
      kind: "malformed",
      stage: "resourceReference",
    });
    expect(
      report.occurrences.find(
        ({ kind, witness }) =>
          kind === "procedureReference" &&
          witness.location.kind === "procedureReference",
      )?.disposition,
    ).toMatchObject({
      kind: "missingOwner",
      failedFacts: ["referencedProcedureNotExecutable"],
    });
    expect(report.dispositionCounts).toMatchObject({
      tableOwned: 2,
      malformed: 1,
    });

    const unlinkedReport = analyzeStatBlockProcedurePressure([synthetic], {
      identities: [],
    });
    expect(
      unlinkedReport.occurrences.every(
        ({ disposition }) =>
          disposition.kind === "malformed" &&
          disposition.stage === "sourceLink",
      ),
    ).toBe(true);

    if (decodedResource.limit.kind !== "daily") {
      throw new Error("Expected a daily resource fixture.");
    }
    const invalidResourceSynthetic: StatBlockRecord = {
      ...decodedSynthetic,
      statBlock: {
        ...decodedSynthetic.statBlock,
        resources: [
          {
            ...decodedResource,
            limit: { ...decodedResource.limit, uses: 0 },
          },
        ],
      },
    };
    const invalidResourceReport = analyzeStatBlockProcedurePressure(
      [invalidResourceSynthetic],
      {
        identities: [
          { ...sourceIdentity, name: invalidResourceSynthetic.name },
        ],
      },
    );
    expect(
      invalidResourceReport.occurrences
        .filter(
          ({ kind }) =>
            kind === "resourceDeclaration" || kind === "resourceReference",
        )
        .map(({ disposition }) => disposition),
    ).toEqual([
      {
        kind: "malformed",
        stage: "resourceDeclaration",
        issues: [
          {
            kind: "invalidResourceDeclaration",
            reason: "invalidDailyUses",
          },
        ],
      },
      {
        kind: "malformed",
        stage: "resourceReference",
        issues: [
          {
            kind: "invalidResourceDeclaration",
            reason: "invalidDailyUses",
          },
        ],
      },
    ]);
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

  it("classifies the unrestricted spell-reference denominator against shipped and unresolved definitions", () => {
    const definitions = new Map<string, SpellRecord>();
    for (const unit of srdUnitCollection.units) {
      if (unit.kind === "spell") definitions.set(unit.id, unit);
    }
    const profiledDefinitionIds = new Set(
      [...definitions.keys()].filter((_, index) => index % 2 === 0),
    );
    const source: StatBlockSpellReferenceClassificationSource = {
      definitions,
      profiledDefinitionIds,
      resolveUnitReference: (authoredReference) =>
        resolveAuthoredUnitReference(authoredReference, srdUnitCollection.units)
          ?.canonicalUnitId,
    };

    const shipped = classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
      source,
    );
    const shippedCounts = countUnrestrictedStatBlockSpellReferenceDefinitions(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
      source,
    );
    const unresolvedSource: StatBlockSpellReferenceClassificationSource = {
      ...source,
      definitions: new Map(),
      profiledDefinitionIds: new Set(),
    };
    const unresolved = classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
      unresolvedSource,
    );
    const unresolvedCounts =
      countUnrestrictedStatBlockSpellReferenceDefinitions(
        srdStatBlockCollection.statBlocks,
        SOURCE_AUTHORITY,
        unresolvedSource,
      );
    const identityFallbackSource: StatBlockSpellReferenceClassificationSource =
      {
        ...source,
        resolveUnitReference: () => undefined,
      };
    const identityFallback = classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
      identityFallbackSource,
    );
    const identityFallbackCounts =
      countUnrestrictedStatBlockSpellReferenceDefinitions(
        srdStatBlockCollection.statBlocks,
        SOURCE_AUTHORITY,
        identityFallbackSource,
      );
    const noCastingTimeDefinition = [...definitions.values()].find(
      (definition) => !("castingTime" in definition.mechanics),
    );
    if (noCastingTimeDefinition === undefined) {
      throw new Error("Expected a shipped spell without a casting time fact.");
    }
    const noCastingTime = classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      SOURCE_AUTHORITY,
      {
        ...source,
        definitions: new Map(
          [...definitions.keys()].map((id) => [id, noCastingTimeDefinition]),
        ),
      },
    );

    expect(shipped).toHaveLength(286);
    expect(shippedCounts).toEqual({
      total: 101,
      shipped: 101,
      unresolved: 0,
    });
    expect(
      new Set(shipped.map(({ definitionStatus }) => definitionStatus)),
    ).toEqual(new Set(["shipped"]));
    expect(new Set(shipped.map(({ profileStatus }) => profileStatus))).toEqual(
      new Set(["profiled", "unprofiled"]),
    );
    expect(
      shipped.every(
        ({ castingTimeKind, durationKind }) =>
          castingTimeKind !== "unresolved" && durationKind !== "unresolved",
      ),
    ).toBe(true);

    expect(unresolved).toHaveLength(286);
    expect(unresolvedCounts).toEqual({
      total: 101,
      shipped: 0,
      unresolved: 101,
    });
    expect(
      unresolved.every(
        ({ definitionStatus, profileStatus, castingTimeKind, durationKind }) =>
          definitionStatus === "unresolved" &&
          profileStatus === "unprofiled" &&
          castingTimeKind === "unresolved" &&
          durationKind === "unresolved",
      ),
    ).toBe(true);
    const unresolvedFallbackRowId =
      'stat-block-290:{"kind":"spellReference","section":"actions","procedureOrdinal":4,"groupOrdinal":2,"spellOrdinal":4}';
    expect(identityFallbackCounts).toEqual({
      total: 101,
      shipped: 100,
      unresolved: 1,
    });
    expect(
      identityFallback.filter(
        ({ definitionStatus }) => definitionStatus === "unresolved",
      ),
    ).toEqual([
      {
        rowId: unresolvedFallbackRowId,
        definitionStatus: "unresolved",
        profileStatus: "unprofiled",
        groupKind: "limited",
        section: "actions",
        hasCastAtLevel: false,
        castingTimeKind: "unresolved",
        durationKind: "unresolved",
      },
    ]);
    expect(
      identityFallback.filter(
        ({ definitionStatus }) => definitionStatus === "shipped",
      ),
    ).toEqual(shipped.filter(({ rowId }) => rowId !== unresolvedFallbackRowId));
    expect(
      noCastingTime.every(
        ({ definitionStatus, castingTimeKind }) =>
          definitionStatus === "shipped" && castingTimeKind === "unresolved",
      ),
    ).toBe(true);
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
      if (key === "authoredExpression") {
        return "Synthetic renamed restriction expression.";
      }
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

function statBlockSpellcastingProcedures(
  record: StatBlockRecord,
): readonly Extract<
  AuthoredExecutableProcedure,
  { readonly kind: "spellcasting" }
>[] {
  return [
    ...(record.statBlock.actions ?? []),
    ...(record.statBlock.bonusActions ?? []),
    ...(record.statBlock.reactions ?? []),
    ...(record.statBlock.legendaryActions?.entries ?? []),
  ].flatMap((entry) =>
    entry.kind === "executable" && entry.procedure.kind === "spellcasting"
      ? [entry.procedure]
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
  if (Array.isArray(value)) {
    return value.some((child) => addFirstSpellRestriction(child));
  }
  if (!isUnknownRecord(value)) return false;
  if (typeof value.spellId === "string" && value.restriction === undefined) {
    value.restriction = {
      authoredExpression: "Synthetic table restriction.",
      deltas: [{ kind: "target_limit", target: "self" }],
    };
    return true;
  }
  return Object.values(value).some((child) => addFirstSpellRestriction(child));
}

function withFirstSpellcastingMaterial(
  record: StatBlockRecord,
  material: string,
): StatBlockRecord {
  const encoded: unknown = JSON.parse(JSON.stringify(record));
  if (!replaceFirstSpellcastingMaterial(encoded, material)) {
    throw new Error("Expected an authored spellcasting material component.");
  }
  return decodeStatBlockRecordSync(encoded);
}

function replaceFirstSpellcastingMaterial(
  value: unknown,
  material: string,
): boolean {
  if (Array.isArray(value)) {
    return value.some((child) =>
      replaceFirstSpellcastingMaterial(child, material),
    );
  }
  if (!isUnknownRecord(value)) return false;
  const components = value.components;
  if (
    value.kind === "spellcasting" &&
    isUnknownRecord(components) &&
    "m" in components
  ) {
    components.m = material;
    return true;
  }
  return Object.values(value).some((child) =>
    replaceFirstSpellcastingMaterial(child, material),
  );
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function canonicalSourceAuthority(): StatBlockProcedurePressureSourceAuthority {
  const repoRoot = resolve(process.cwd(), "../..");
  const discovery = discoverSrdStatBlocks(
    SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
      sourcePath,
      contents: readFileSync(resolve(repoRoot, sourcePath), "utf8"),
    })),
  );
  if (discovery.issues.length > 0) {
    throw new Error("Expected complete canonical SRD source discovery.");
  }
  return {
    identities: discovery.identities.map(({ name, occurrences }) => {
      const [first, ...remaining] = occurrences;
      if (first === undefined) {
        throw new Error("Expected every discovered identity to own an anchor.");
      }
      return {
        name,
        anchors: [first.anchor, ...remaining.map(({ anchor }) => anchor)],
      };
    }),
  };
}

function typeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typeScriptFiles(path);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
