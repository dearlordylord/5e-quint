import { Brand, Match } from "effect";
import * as Either from "effect/Either";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  AuthoredExecutableProcedure,
  AuthoredStatBlockReactionTrigger,
  CreatureTraitEffect,
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResource,
  StatBlockProcedureResourceOrdinal,
  StatBlockRecord,
  StatBlockSpellcastingGroup,
  StatBlockSpellReference,
  StatBlockTextOnlyReason,
  SpellRecord,
} from "@dnd/surface/surface/types";
import {
  parseSourceSection,
  sourceSectionMatchesAnchor,
  type SourceSectionAnchorRange,
} from "@dnd/surface/surface/source-section-anchor";
import { normalizeStatBlockIdentity } from "@dnd/surface/surface/stat-block-identity";

import {
  authoredStatBlockProcedureExecutionDecision,
  type AuthoredStatBlockProcedureExecutionDecision,
  type StatBlockProcedureExecutionFailedFact,
} from "./stat-block-authored-projection.ts";
import { statBlockTraitSupport } from "./statblock-action-execution-support.ts";
import {
  parseStatBlockRuntimeResource,
  type StatBlockRuntimeResourceParseFailure,
} from "./stat-block-execution-state.ts";
import {
  STAT_BLOCK_ACTION_PROJECTION_SECTIONS,
  type StatBlockActionProjectionSection,
} from "./stat-block-presentation-contract.ts";

export const STAT_BLOCK_PROCEDURE_PRESSURE_OCCURRENCE_KINDS = [
  "section",
  "procedure",
  "trait",
  "reactionTrigger",
  "spellcastingGroup",
  "spellReference",
  "resourceDeclaration",
  "resourceReference",
  "procedureReference",
] as const;

export type StatBlockProcedurePressureOccurrenceKind =
  (typeof STAT_BLOCK_PROCEDURE_PRESSURE_OCCURRENCE_KINDS)[number];

export const STAT_BLOCK_PROCEDURE_PRESSURE_DISPOSITION_KINDS = [
  "executable",
  "textOnly",
  "tableOwned",
  "missingOwner",
  "malformed",
] as const;

export type StatBlockProcedurePressureDispositionKind =
  (typeof STAT_BLOCK_PROCEDURE_PRESSURE_DISPOSITION_KINDS)[number];

export type StatBlockProcedurePressureTextOnlyReason =
  | StatBlockTextOnlyReason
  | "untypedTrait";

export const STAT_BLOCK_PROCEDURE_PRESSURE_EXECUTION_OWNERS = [
  "battle-runtime Legendary Action resource pool",
  "battle-runtime Stat Block Action lifecycle",
  "battle-runtime Stat Block Bonus Action lifecycle",
  "battle-runtime Stat Block Legendary Action lifecycle",
  "battle-runtime Stat Block Multiattack dispatch graph",
  "battle-runtime Stat Block resource graph",
  "battle-runtime Stat Block resource pool",
  "battle-runtime Stat Block trait attack-roll mode",
  "battle-runtime delegated Bonus Action procedure",
  "battle-runtime generic Stat Block Multiattack control",
  "battle-runtime generic Stat Block attack procedure",
  "battle-runtime generic Stat Block spellcasting procedure",
] as const;

export type StatBlockProcedurePressureExecutionOwner =
  (typeof STAT_BLOCK_PROCEDURE_PRESSURE_EXECUTION_OWNERS)[number];

export const STAT_BLOCK_PROCEDURE_PRESSURE_RUNTIME_SHAPES = [
  "actions",
  "attack",
  "attackProcedureReference",
  "bonusActionOption",
  "bonusActions",
  "conditionalAttackRollMode",
  "daily",
  "legendaryActions",
  "multiattack",
  "recharge",
  "recharge_after_rest",
  "resourceReference",
  "spellcasting",
] as const;

export type StatBlockProcedurePressureRuntimeShape =
  (typeof STAT_BLOCK_PROCEDURE_PRESSURE_RUNTIME_SHAPES)[number];

type ReactionTriggerStructuralShape =
  | {
      readonly kind: "any_of";
      readonly triggers: ReadonlyNonEmptyArray<ReactionTriggerStructuralShape>;
    }
  | {
      readonly kind: Exclude<
        AuthoredStatBlockReactionTrigger["kind"],
        "any_of"
      >;
    };

export type StatBlockProcedurePressureTableFact =
  | { readonly kind: "lairPresenceForLegendaryActionUses" }
  | { readonly kind: "procedureAdjudication" }
  | {
      readonly kind: "reactionTrigger";
      readonly trigger: ReactionTriggerStructuralShape;
    };

export type StatBlockProcedurePressureSurfaceShape =
  | {
      readonly kind: "procedure";
      readonly procedureKind: AuthoredExecutableProcedure["kind"];
    }
  | {
      readonly kind: "trait";
      readonly effectKind: CreatureTraitEffect["kind"];
    }
  | { readonly kind: "reactionSection" }
  | {
      readonly kind: "spellcastingGroup";
      readonly groupKind: StatBlockSpellcastingGroup["kind"];
    }
  | {
      readonly kind: "spellReference";
      readonly restrictionPresence: "absent" | "present";
    }
  | { readonly kind: "multiattackProcedureReference" };

export const STAT_BLOCK_PROCEDURE_PRESSURE_OWN_FAILED_FACTS = [
  "missingTypedTraitEffectOwner",
  "reactionTriggerAndResourceLifecycle",
  "missingStatBlockSpellcastingGroupOwner",
  "missingStatBlockSpellInvocationOwner",
  "referencedProcedureNotExecutable",
] as const;

export type StatBlockProcedurePressureFailedFact =
  | StatBlockProcedureExecutionFailedFact
  | (typeof STAT_BLOCK_PROCEDURE_PRESSURE_OWN_FAILED_FACTS)[number];

export type StatBlockProcedurePressureMalformedIssue =
  | {
      readonly kind: "invalidResourceDeclaration";
      readonly reason: StatBlockRuntimeResourceParseFailure;
    }
  | { readonly kind: "missingResourceDeclaration" }
  | {
      readonly kind: "unresolvedSourceSection";
      readonly section: string;
    };

export type StatBlockProcedurePressureDisposition =
  | {
      readonly kind: "executable";
      readonly owner: StatBlockProcedurePressureExecutionOwner;
      readonly runtimeShape: StatBlockProcedurePressureRuntimeShape;
    }
  | {
      readonly kind: "textOnly";
      readonly reason: StatBlockProcedurePressureTextOnlyReason;
    }
  | {
      readonly kind: "tableOwned";
      readonly explicitTableFact: StatBlockProcedurePressureTableFact;
    }
  | {
      readonly kind: "missingOwner";
      readonly surfaceShape: StatBlockProcedurePressureSurfaceShape;
      readonly failedFacts: ReadonlyNonEmptyArray<StatBlockProcedurePressureFailedFact>;
    }
  | {
      readonly kind: "malformed";
      readonly stage:
        | "resourceDeclaration"
        | "resourceReference"
        | "sourceLink";
      readonly issues: ReadonlyNonEmptyArray<StatBlockProcedurePressureMalformedIssue>;
    };

export type StatBlockProcedurePressureSource =
  | {
      readonly kind: "linked";
      readonly path: string;
      readonly firstLine: number;
      readonly lastLine: number;
    }
  | {
      readonly kind: "unresolved";
      readonly section: string;
    };

export type StatBlockProcedurePressureLocation =
  | {
      readonly kind: "section";
      readonly section: StatBlockActionProjectionSection;
    }
  | {
      readonly kind: "procedure";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
    }
  | {
      readonly kind: "trait";
      readonly traitOrdinal: number;
    }
  | {
      readonly kind: "reactionTrigger";
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
    }
  | {
      readonly kind: "spellcastingGroup";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly groupOrdinal: number;
    }
  | {
      readonly kind: "spellReference";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly groupOrdinal: number;
      readonly spellOrdinal: number;
    }
  | {
      readonly kind: "resourceDeclaration";
      readonly resourceOrdinal:
        | StatBlockProcedureResourceOrdinal
        | "legendaryActions";
    }
  | {
      readonly kind: "resourceReference";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly resourceOrdinal: StatBlockProcedureResourceOrdinal;
      readonly groupOrdinal?: number;
    }
  | {
      readonly kind: "procedureReference";
      readonly section: StatBlockActionProjectionSection;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly referencedProcedureOrdinal: StatBlockProcedureOrdinal;
    };

export type StatBlockProcedurePressureWitness = {
  readonly recordOrdinal: number;
  readonly statBlockId: StatBlockRecord["id"];
  readonly statBlockName: StatBlockRecord["name"];
  readonly source: StatBlockProcedurePressureSource;
  readonly location: StatBlockProcedurePressureLocation;
};

export type StatBlockProcedurePressureOccurrence = {
  readonly rowId: StatBlockProcedurePressureRowId;
  readonly kind: StatBlockProcedurePressureOccurrenceKind;
  readonly structuralShape: string;
  readonly disposition: StatBlockProcedurePressureDisposition;
  readonly witness: StatBlockProcedurePressureWitness;
};

export type StatBlockProcedurePressureRowId = string &
  Brand.Brand<"StatBlockProcedurePressureRowId">;
const StatBlockProcedurePressureRowId =
  Brand.nominal<StatBlockProcedurePressureRowId>();

export const STAT_BLOCK_SPELL_REFERENCE_CASTING_TIME_KINDS = [
  "action",
  "bonus_action",
  "reaction",
  "minutes",
  "hours",
  "unresolved",
] as const;

export type StatBlockSpellReferenceCastingTimeKind =
  (typeof STAT_BLOCK_SPELL_REFERENCE_CASTING_TIME_KINDS)[number];

export const STAT_BLOCK_SPELL_REFERENCE_DURATION_KINDS = [
  "instantaneous",
  "concentration",
  "timed",
  "permanent",
  "slot_tiered",
  "unresolved",
] as const;

export type StatBlockSpellReferenceDurationKind =
  (typeof STAT_BLOCK_SPELL_REFERENCE_DURATION_KINDS)[number];

export const STAT_BLOCK_SPELL_REFERENCE_DEFINITION_STATUS_KINDS = [
  "shipped",
  "unresolved",
] as const;

export type StatBlockSpellReferenceDefinitionStatus =
  (typeof STAT_BLOCK_SPELL_REFERENCE_DEFINITION_STATUS_KINDS)[number];

export const STAT_BLOCK_SPELL_REFERENCE_PROFILE_STATUS_KINDS = [
  "profiled",
  "unprofiled",
] as const;

export type StatBlockSpellReferenceProfileStatus =
  (typeof STAT_BLOCK_SPELL_REFERENCE_PROFILE_STATUS_KINDS)[number];

/**
 * Identity-free join facts for an unrestricted Stat Block spell reference.
 * The spell definition and profile maps are consulted only while building this
 * planning row; neither map key nor authored prose is published here.
 */
export type StatBlockSpellReferenceClassification = {
  readonly rowId: StatBlockProcedurePressureRowId;
  readonly definitionStatus: StatBlockSpellReferenceDefinitionStatus;
  readonly profileStatus: StatBlockSpellReferenceProfileStatus;
  readonly groupKind: StatBlockSpellcastingGroup["kind"];
  readonly section: StatBlockActionProjectionSection;
  readonly hasCastAtLevel: boolean;
  readonly castingTimeKind: StatBlockSpellReferenceCastingTimeKind;
  readonly durationKind: StatBlockSpellReferenceDurationKind;
};

export type StatBlockSpellReferenceClassificationSource = {
  readonly definitions: ReadonlyMap<string, SpellRecord>;
  readonly profiledDefinitionIds: ReadonlySet<string>;
};

export type StatBlockSpellReferenceDefinitionCounts = {
  readonly total: number;
  readonly shipped: number;
  readonly unresolved: number;
};

export type StatBlockProcedurePressureRecordWitness = {
  readonly recordOrdinal: number;
  readonly statBlockId: StatBlockRecord["id"];
  readonly statBlockName: StatBlockRecord["name"];
  readonly source: StatBlockProcedurePressureSource;
  readonly occurrenceCount: number;
};

export type StatBlockProcedurePressureGroup = {
  readonly structuralKey: string;
  readonly kind: StatBlockProcedurePressureOccurrenceKind;
  readonly structuralShape: string;
  readonly disposition: StatBlockProcedurePressureDisposition;
  readonly occurrenceCount: number;
  readonly statBlockCount: number;
  readonly memberRowIds: ReadonlyNonEmptyArray<StatBlockProcedurePressureRowId>;
  readonly exampleWitnesses: readonly StatBlockProcedurePressureWitness[];
};

export type StatBlockProcedurePressureCapabilityProposal = {
  readonly rank: number;
  readonly structuralKey: string;
  readonly occurrenceKind: StatBlockProcedurePressureOccurrenceKind;
  readonly surfaceShape: StatBlockProcedurePressureSurfaceShape;
  readonly failedFacts: ReadonlyNonEmptyArray<StatBlockProcedurePressureFailedFact>;
  readonly occurrenceCount: number;
  readonly statBlockCount: number;
  readonly pressureScore: number;
  readonly memberRowIds: ReadonlyNonEmptyArray<StatBlockProcedurePressureRowId>;
  readonly exampleWitnesses: readonly StatBlockProcedurePressureWitness[];
};

export type StatBlockProcedurePressureReport = {
  readonly kind: "statBlockProcedurePressureReport";
  readonly recordCount: number;
  readonly records: readonly StatBlockProcedurePressureRecordWitness[];
  readonly occurrenceCount: number;
  readonly occurrenceCounts: Readonly<
    Record<StatBlockProcedurePressureOccurrenceKind, number>
  >;
  readonly dispositionCounts: Readonly<
    Record<StatBlockProcedurePressureDispositionKind, number>
  >;
  readonly occurrences: readonly StatBlockProcedurePressureOccurrence[];
  readonly groups: readonly StatBlockProcedurePressureGroup[];
  readonly capabilityProposals: readonly StatBlockProcedurePressureCapabilityProposal[];
};

export type StatBlockProcedurePressureSourceAuthority = {
  readonly identities: readonly {
    readonly name: string;
    readonly anchors: ReadonlyNonEmptyArray<SourceSectionAnchorRange>;
  }[];
};

const MAX_EXAMPLE_WITNESSES = 3;
const MAX_CAPABILITY_PROPOSALS = 24;

type AuthoredProcedureSection =
  | {
      readonly section: Exclude<
        StatBlockActionProjectionSection,
        "legendaryActions"
      >;
      readonly entries: readonly StatBlockProcedurePressureEntry[];
    }
  | {
      readonly section: "legendaryActions";
      readonly entries: readonly StatBlockProcedurePressureEntry[];
      readonly uses: NonNullable<
        StatBlockRecord["statBlock"]["legendaryActions"]
      >["uses"];
    };

type StatBlockProcedurePressureEntry =
  | StatBlockProcedureEntry
  | NonNullable<StatBlockRecord["statBlock"]["reactions"]>[number];

export function analyzeStatBlockProcedurePressure(
  records: readonly StatBlockRecord[],
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
): StatBlockProcedurePressureReport {
  const recordOccurrences = records.map((record, index) => ({
    record,
    recordOrdinal: index + 1,
    occurrences: statBlockProcedurePressureOccurrences(
      record,
      index + 1,
      sourceAuthority,
    ),
  }));
  const occurrences = recordOccurrences.flatMap(
    ({ occurrences: values }) => values,
  );
  return {
    kind: "statBlockProcedurePressureReport",
    recordCount: records.length,
    records: recordOccurrences.map(
      ({ record, recordOrdinal, occurrences: values }) => ({
        recordOrdinal,
        statBlockId: record.id,
        statBlockName: record.name,
        source: statBlockProcedurePressureSource(
          record.provenance.section,
          sourceAnchorsForRecord(record, sourceAuthority),
        ),
        occurrenceCount: values.length,
      }),
    ),
    occurrenceCount: occurrences.length,
    occurrenceCounts: occurrenceCounts(occurrences),
    dispositionCounts: dispositionCounts(occurrences),
    occurrences,
    groups: pressureGroups(occurrences),
    capabilityProposals: capabilityProposals(occurrences),
  };
}

export function statBlockProcedurePressureOccurrences(
  record: StatBlockRecord,
  recordOrdinal: number,
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
): readonly StatBlockProcedurePressureOccurrence[] {
  const occurrences: StatBlockProcedurePressureOccurrence[] = [];
  const add = occurrenceAppender(
    occurrences,
    procedurePressureOccurrenceBuilder(record, recordOrdinal, sourceAuthority),
  );
  const resourceContext = addResourceDeclarationOccurrences(record, add);
  addTraitOccurrences(record, add);
  addAuthoredSectionOccurrences(record, add, resourceContext);
  return occurrences;
}

/**
 * Join the structural spell-reference rows to authored Spell Definitions and
 * profile admission facts. This is deliberately separate from disposition:
 * a shipped definition remains a missing-owner row until a typed runtime
 * owner admits it. Restricted references are excluded because #418's base
 * predicate is the unrestricted reference set.
 */
export function classifyUnrestrictedStatBlockSpellReferences(
  records: readonly StatBlockRecord[],
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
  source: StatBlockSpellReferenceClassificationSource,
): readonly StatBlockSpellReferenceClassification[] {
  return records.flatMap((record, index) => {
    const recordOrdinal = index + 1;
    return statBlockProcedurePressureOccurrences(
      record,
      recordOrdinal,
      sourceAuthority,
    )
      .filter(
        (
          occurrence,
        ): occurrence is StatBlockProcedurePressureOccurrence & {
          readonly kind: "spellReference";
          readonly witness: StatBlockProcedurePressureWitness & {
            readonly location: Extract<
              StatBlockProcedurePressureLocation,
              { readonly kind: "spellReference" }
            >;
          };
        } =>
          occurrence.kind === "spellReference" &&
          occurrence.witness.location.kind === "spellReference",
      )
      .flatMap((occurrence) => {
        const reference = spellReferenceAtLocation(
          record,
          occurrence.witness.location,
        );
        if (
          reference === undefined ||
          reference.reference.restriction !== undefined
        ) {
          return [];
        }
        const definition = source.definitions.get(reference.reference.spellId);
        return [
          {
            rowId: occurrence.rowId,
            definitionStatus:
              definition === undefined ? ("unresolved" as const) : "shipped",
            profileStatus:
              definition !== undefined &&
              source.profiledDefinitionIds.has(definition.id)
                ? ("profiled" as const)
                : ("unprofiled" as const),
            groupKind: reference.groupKind,
            section: occurrence.witness.location.section,
            hasCastAtLevel: reference.reference.castAtLevel !== undefined,
            castingTimeKind: definition
              ? spellCastingTimeKind(definition)
              : ("unresolved" as const),
            durationKind: definition
              ? spellDurationKind(definition)
              : ("unresolved" as const),
          },
        ];
      });
  });
}

/**
 * Count distinct authored definitions in the same unrestricted reference set
 * used by the identity-free row classifier. Only aggregate counts cross this
 * boundary; referenced IDs remain internal to the catalog join.
 */
export function countUnrestrictedStatBlockSpellReferenceDefinitions(
  records: readonly StatBlockRecord[],
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
  source: StatBlockSpellReferenceClassificationSource,
): StatBlockSpellReferenceDefinitionCounts {
  const all = new Set<string>();
  const shipped = new Set<string>();
  const unresolved = new Set<string>();
  for (const [index, record] of records.entries()) {
    for (const occurrence of statBlockProcedurePressureOccurrences(
      record,
      index + 1,
      sourceAuthority,
    )) {
      if (
        occurrence.kind !== "spellReference" ||
        occurrence.witness.location.kind !== "spellReference"
      ) {
        continue;
      }
      const reference = spellReferenceAtLocation(
        record,
        occurrence.witness.location,
      );
      if (
        reference === undefined ||
        reference.reference.restriction !== undefined
      ) {
        continue;
      }
      const spellId = reference.reference.spellId;
      all.add(spellId);
      (source.definitions.get(spellId) === undefined
        ? unresolved
        : shipped
      ).add(spellId);
    }
  }
  return {
    total: all.size,
    shipped: shipped.size,
    unresolved: unresolved.size,
  };
}

type SpellReferenceAtLocation = {
  readonly reference: StatBlockSpellReference;
  readonly groupKind: StatBlockSpellcastingGroup["kind"];
};

function spellReferenceAtLocation(
  record: StatBlockRecord,
  location: Extract<
    StatBlockProcedurePressureLocation,
    { readonly kind: "spellReference" }
  >,
): SpellReferenceAtLocation | undefined {
  for (const section of authoredProcedureSections(record)) {
    if (section.section !== location.section) continue;
    const entry = section.entries.find(
      (candidate) => candidate.procedureOrdinal === location.procedureOrdinal,
    );
    if (
      entry === undefined ||
      entry.kind !== "executable" ||
      entry.procedure.kind !== "spellcasting"
    ) {
      return undefined;
    }
    const group = entry.procedure.groups[location.groupOrdinal - 1];
    if (group === undefined) return undefined;
    const reference = group.spells[location.spellOrdinal - 1];
    if (reference === undefined) return undefined;
    return {
      reference,
      groupKind: group.kind,
    };
  }
  return undefined;
}

function spellCastingTimeKind(
  definition: SpellRecord,
): StatBlockSpellReferenceCastingTimeKind {
  if (!("castingTime" in definition.mechanics)) return "unresolved";
  return definition.mechanics.castingTime.kind;
}

function spellDurationKind(
  definition: SpellRecord,
): StatBlockSpellReferenceDurationKind {
  return definition.mechanics.duration.kind;
}

type ProcedurePressureOccurrenceBuilder = (
  kind: StatBlockProcedurePressureOccurrenceKind,
  location: StatBlockProcedurePressureLocation,
  structuralSubject: unknown,
  disposition: StatBlockProcedurePressureDisposition,
) => StatBlockProcedurePressureOccurrence;

function procedurePressureOccurrenceBuilder(
  record: StatBlockRecord,
  recordOrdinal: number,
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
): ProcedurePressureOccurrenceBuilder {
  const source = statBlockProcedurePressureSource(
    record.provenance.section,
    sourceAnchorsForRecord(record, sourceAuthority),
  );
  return (kind, location, structuralSubject, disposition) => ({
    rowId: StatBlockProcedurePressureRowId(
      `stat-block-${String(recordOrdinal)}:${JSON.stringify(location)}`,
    ),
    kind,
    structuralShape: structuralShape(structuralSubject),
    disposition:
      source.kind === "linked"
        ? disposition
        : {
            kind: "malformed",
            stage: "sourceLink",
            issues: [
              { kind: "unresolvedSourceSection", section: source.section },
            ],
          },
    witness: {
      recordOrdinal,
      statBlockId: record.id,
      statBlockName: record.name,
      source,
      location,
    },
  });
}

/**
 * Authored identity is consulted only at this provenance-admission boundary.
 * Every disposition and structural pressure fact produced after admission is
 * derived from typed Surface shape and remains independent of record identity.
 */
function sourceAnchorsForRecord(
  record: StatBlockRecord,
  sourceAuthority: StatBlockProcedurePressureSourceAuthority,
): readonly SourceSectionAnchorRange[] {
  const normalizedIdentity = normalizeStatBlockIdentity(record.name);
  return (
    sourceAuthority.identities.find(
      ({ name }) => normalizeStatBlockIdentity(name) === normalizedIdentity,
    )?.anchors ?? []
  );
}

function occurrenceAppender(
  occurrences: StatBlockProcedurePressureOccurrence[],
  build: ProcedurePressureOccurrenceBuilder,
): AddOccurrence {
  return (kind, location, structuralSubject, disposition) => {
    occurrences.push(build(kind, location, structuralSubject, disposition));
  };
}

type StatBlockProcedurePressureResourceContext = {
  readonly resources: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedureResource
  >;
  readonly dispositions: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedurePressureDisposition
  >;
};

function addResourceDeclarationOccurrences(
  record: StatBlockRecord,
  add: AddOccurrence,
): StatBlockProcedurePressureResourceContext {
  const resources = new Map(
    (record.statBlock.resources ?? []).map((resource) => [
      resource.ordinal,
      resource,
    ]),
  );
  const resourceDispositions = new Map<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedurePressureDisposition
  >();

  for (const resource of record.statBlock.resources ?? []) {
    const disposition = resourceDeclarationDisposition(resource);
    resourceDispositions.set(resource.ordinal, disposition);
    add(
      "resourceDeclaration",
      { kind: "resourceDeclaration", resourceOrdinal: resource.ordinal },
      resource,
      disposition,
    );
  }

  if (record.statBlock.legendaryActions !== undefined) {
    const { uses } = record.statBlock.legendaryActions;
    add(
      "resourceDeclaration",
      { kind: "resourceDeclaration", resourceOrdinal: "legendaryActions" },
      uses,
      legendaryActionResourceDisposition(uses),
    );
  }

  return { resources, dispositions: resourceDispositions };
}

function addTraitOccurrences(
  record: StatBlockRecord,
  add: AddOccurrence,
): void {
  for (const [traitIndex, trait] of (record.statBlock.traits ?? []).entries()) {
    add(
      "trait",
      { kind: "trait", traitOrdinal: traitIndex + 1 },
      trait,
      traitDisposition(trait),
    );
  }
}

function addAuthoredSectionOccurrences(
  record: StatBlockRecord,
  add: AddOccurrence,
  resourceContext: StatBlockProcedurePressureResourceContext,
): void {
  for (const authoredSection of authoredProcedureSections(record)) {
    const { section, entries } = authoredSection;
    add(
      "section",
      { kind: "section", section },
      sectionShape(authoredSection),
      sectionDisposition(authoredSection),
    );
    const decisions = new Map(
      entries.map((entry) => [
        entry.procedureOrdinal,
        authoredStatBlockProcedureExecutionDecision(
          record.statBlock,
          section,
          entry,
        ),
      ]),
    );
    for (const entry of entries) {
      const decision = authoredStatBlockProcedureExecutionDecision(
        record.statBlock,
        section,
        entry,
      );
      add(
        "procedure",
        {
          kind: "procedure",
          section,
          procedureOrdinal: entry.procedureOrdinal,
        },
        procedureStructuralSubject(entry),
        procedureDisposition(decision),
      );
      addEntryResourceReferences(
        add,
        section,
        entry,
        resourceContext.resources,
        resourceContext.dispositions,
      );
      addReactionTriggerOccurrence(add, section, entry);
      addNestedProcedureOccurrences(
        add,
        section,
        entry,
        decisions,
        resourceContext,
      );
    }
  }
}

function addReactionTriggerOccurrence(
  add: AddOccurrence,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedurePressureEntry,
): void {
  if (
    section !== "reactions" ||
    entry.kind !== "executable" ||
    !("trigger" in entry)
  ) {
    return;
  }
  add(
    "reactionTrigger",
    {
      kind: "reactionTrigger",
      procedureOrdinal: entry.procedureOrdinal,
    },
    entry.trigger,
    reactionTriggerDisposition(entry.trigger),
  );
}

function addNestedProcedureOccurrences(
  add: AddOccurrence,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedurePressureEntry,
  decisions: ReadonlyMap<
    StatBlockProcedureOrdinal,
    AuthoredStatBlockProcedureExecutionDecision
  >,
  resourceContext: StatBlockProcedurePressureResourceContext,
): void {
  if (entry.kind !== "executable") return;
  Match.value(entry.procedure).pipe(
    Match.when({ kind: "multiattack" }, (procedure) =>
      addMultiattackProcedureReferences(
        add,
        section,
        entry.procedureOrdinal,
        procedure.dispatches,
        decisions,
      ),
    ),
    Match.when({ kind: "spellcasting" }, (procedure) =>
      addSpellcastingOccurrences(
        add,
        section,
        entry.procedureOrdinal,
        procedure.groups,
        resourceContext.resources,
        resourceContext.dispositions,
      ),
    ),
    Match.when({ kind: "attack_roll" }, () => undefined),
    Match.when({ kind: "save" }, () => undefined),
    Match.when({ kind: "support" }, () => undefined),
    Match.when({ kind: "action_option" }, () => undefined),
    Match.exhaustive,
  );
}

function addMultiattackProcedureReferences(
  add: AddOccurrence,
  section: StatBlockActionProjectionSection,
  procedureOrdinal: StatBlockProcedureOrdinal,
  dispatches: ReadonlyNonEmptyArray<{
    readonly procedureOrdinal: StatBlockProcedureOrdinal;
    readonly count: unknown;
  }>,
  decisions: ReadonlyMap<
    StatBlockProcedureOrdinal,
    AuthoredStatBlockProcedureExecutionDecision
  >,
): void {
  for (const dispatch of dispatches) {
    add(
      "procedureReference",
      {
        kind: "procedureReference",
        section,
        procedureOrdinal,
        referencedProcedureOrdinal: dispatch.procedureOrdinal,
      },
      dispatch,
      procedureReferenceDisposition(decisions.get(dispatch.procedureOrdinal)),
    );
  }
}

function authoredProcedureSections(
  record: StatBlockRecord,
): readonly AuthoredProcedureSection[] {
  return STAT_BLOCK_ACTION_PROJECTION_SECTIONS.flatMap((section) => {
    return Match.value(section).pipe(
      Match.when("actions", () =>
        ordinaryAuthoredProcedureSection("actions", record.statBlock.actions),
      ),
      Match.when("bonusActions", () =>
        ordinaryAuthoredProcedureSection(
          "bonusActions",
          record.statBlock.bonusActions,
        ),
      ),
      Match.when("reactions", () =>
        ordinaryAuthoredProcedureSection(
          "reactions",
          record.statBlock.reactions,
        ),
      ),
      Match.when("legendaryActions", () => {
        const legendaryActions = record.statBlock.legendaryActions;
        return legendaryActions === undefined
          ? []
          : [
              {
                section: "legendaryActions" as const,
                entries: legendaryActions.entries,
                uses: legendaryActions.uses,
              },
            ];
      }),
      Match.exhaustive,
    );
  });
}

function ordinaryAuthoredProcedureSection(
  section: Exclude<StatBlockActionProjectionSection, "legendaryActions">,
  entries: readonly StatBlockProcedurePressureEntry[] | undefined,
): readonly AuthoredProcedureSection[] {
  return entries === undefined ? [] : [{ section, entries }];
}

function sectionShape(authoredSection: AuthoredProcedureSection): unknown {
  return Match.value(authoredSection).pipe(
    Match.when({ section: "legendaryActions" }, ({ uses }) => ({
      section: "legendaryActions",
      uses,
    })),
    Match.when({ section: "actions" }, () => ({ section: "actions" })),
    Match.when({ section: "bonusActions" }, () => ({
      section: "bonusActions",
    })),
    Match.when({ section: "reactions" }, () => ({ section: "reactions" })),
    Match.exhaustive,
  );
}

function sectionDisposition(
  authoredSection: AuthoredProcedureSection,
): StatBlockProcedurePressureDisposition {
  return Match.value(authoredSection).pipe(
    Match.when({ section: "actions" }, () => ({
      kind: "executable" as const,
      owner: "battle-runtime Stat Block Action lifecycle" as const,
      runtimeShape: "actions" as const,
    })),
    Match.when({ section: "bonusActions" }, () => ({
      kind: "executable" as const,
      owner: "battle-runtime Stat Block Bonus Action lifecycle" as const,
      runtimeShape: "bonusActions" as const,
    })),
    Match.when({ section: "reactions" }, () => ({
      kind: "missingOwner" as const,
      surfaceShape: { kind: "reactionSection" } as const,
      failedFacts: ["reactionTriggerAndResourceLifecycle"] as const,
    })),
    Match.when({ section: "legendaryActions" }, ({ uses }) => {
      return uses.kind === "fixed"
        ? {
            kind: "executable" as const,
            owner:
              "battle-runtime Stat Block Legendary Action lifecycle" as const,
            runtimeShape: "legendaryActions" as const,
          }
        : {
            kind: "tableOwned" as const,
            explicitTableFact: {
              kind: "lairPresenceForLegendaryActionUses" as const,
            },
          };
    }),
    Match.exhaustive,
  );
}

function procedureDisposition(
  decision: AuthoredStatBlockProcedureExecutionDecision,
): StatBlockProcedurePressureDisposition {
  return Match.value(decision).pipe(
    Match.when({ kind: "textOnly" }, ({ entry }) =>
      entry.reason === "required_table_adjudication"
        ? {
            kind: "tableOwned" as const,
            explicitTableFact: { kind: "procedureAdjudication" as const },
          }
        : {
            kind: "textOnly" as const,
            reason: entry.reason,
          },
    ),
    Match.when({ kind: "missingOwner" }, ({ entry, failedFacts }) => ({
      kind: "missingOwner" as const,
      surfaceShape: procedureSurfaceShape(entry),
      failedFacts,
    })),
    Match.when(
      { kind: "executable", procedureKind: "attack_roll" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner: "battle-runtime generic Stat Block attack procedure" as const,
        runtimeShape: runtime.kind,
      }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "multiattack" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner: "battle-runtime generic Stat Block Multiattack control" as const,
        runtimeShape: runtime.kind,
      }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "action_option" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner: "battle-runtime delegated Bonus Action procedure" as const,
        runtimeShape: runtime.kind,
      }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "spellcasting" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner:
          "battle-runtime generic Stat Block spellcasting procedure" as const,
        runtimeShape: runtime.kind,
      }),
    ),
    Match.exhaustive,
  );
}

function procedureSurfaceShape(
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
): StatBlockProcedurePressureSurfaceShape {
  return { kind: "procedure", procedureKind: entry.procedure.kind };
}

function procedureStructuralSubject(
  entry: StatBlockProcedurePressureEntry,
): unknown {
  if (entry.kind === "textOnly") return entry;
  return Match.value(entry.procedure).pipe(
    Match.when({ kind: "spellcasting" }, (procedure) => ({
      ...entry,
      procedure: {
        ...procedure,
        ...(procedure.components === undefined
          ? {}
          : {
              components: {
                ...procedure.components,
                m:
                  procedure.components.m === false
                    ? false
                    : { kind: "authoredExpressionPresent" as const },
              },
            }),
      },
    })),
    Match.when({ kind: "attack_roll" }, () => entry),
    Match.when({ kind: "multiattack" }, () => entry),
    Match.when({ kind: "save" }, () => entry),
    Match.when({ kind: "support" }, () => entry),
    Match.when({ kind: "action_option" }, () => entry),
    Match.exhaustive,
  );
}

function traitDisposition(
  trait: StatBlockRecord["statBlock"]["traits"] extends
    | readonly (infer TTrait)[]
    | undefined
    ? TTrait
    : never,
): StatBlockProcedurePressureDisposition {
  return Match.value(statBlockTraitSupport(trait)).pipe(
    Match.when({ kind: "textOnly" }, () => ({
      kind: "textOnly" as const,
      reason: "untypedTrait" as const,
    })),
    Match.when({ kind: "supported" }, () => ({
      kind: "executable" as const,
      owner: "battle-runtime Stat Block trait attack-roll mode" as const,
      runtimeShape: "conditionalAttackRollMode" as const,
    })),
    Match.when({ kind: "unsupported" }, ({ effect }) => ({
      kind: "missingOwner" as const,
      surfaceShape: { kind: "trait" as const, effectKind: effect.kind },
      failedFacts: ["missingTypedTraitEffectOwner"] as const,
    })),
    Match.exhaustive,
  );
}

function reactionTriggerDisposition(
  trigger: AuthoredStatBlockReactionTrigger,
): StatBlockProcedurePressureDisposition {
  return {
    kind: "tableOwned",
    explicitTableFact: {
      kind: "reactionTrigger",
      trigger: reactionTriggerShape(trigger),
    },
  };
}

function reactionTriggerShape(
  trigger: AuthoredStatBlockReactionTrigger,
): ReactionTriggerStructuralShape {
  return Match.value(trigger).pipe(
    Match.when({ kind: "any_of" }, ({ triggers: [first, ...remaining] }) => ({
      kind: "any_of" as const,
      triggers: [
        reactionTriggerShape(first),
        ...remaining.map(reactionTriggerShape),
      ] as const,
    })),
    Match.when({ kind: "hit_by_attack_roll" }, () => ({
      kind: "hit_by_attack_roll" as const,
    })),
    Match.when({ kind: "takes_damage_from_creature" }, () => ({
      kind: "takes_damage_from_creature" as const,
    })),
    Match.when({ kind: "self_or_visible_creature_falls" }, () => ({
      kind: "self_or_visible_creature_falls" as const,
    })),
    Match.when({ kind: "targeted_by_named_spell" }, () => ({
      kind: "targeted_by_named_spell" as const,
    })),
    Match.when({ kind: "creature_casts_spell" }, () => ({
      kind: "creature_casts_spell" as const,
    })),
    Match.when({ kind: "spell_save_outcome" }, () => ({
      kind: "spell_save_outcome" as const,
    })),
    Match.exhaustive,
  );
}

function resourceDeclarationDisposition(
  resource: StatBlockProcedureResource,
): StatBlockProcedurePressureDisposition {
  const parsed = parseStatBlockRuntimeResource(resource);
  return Either.isRight(parsed)
    ? {
        kind: "executable",
        owner: "battle-runtime Stat Block resource pool" as const,
        runtimeShape: parsed.right.limit.kind,
      }
    : {
        kind: "malformed",
        stage: "resourceDeclaration",
        issues: [{ kind: "invalidResourceDeclaration", reason: parsed.left }],
      };
}

function legendaryActionResourceDisposition(
  uses: NonNullable<StatBlockRecord["statBlock"]["legendaryActions"]>["uses"],
): StatBlockProcedurePressureDisposition {
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, () => ({
      kind: "executable" as const,
      owner: "battle-runtime Legendary Action resource pool" as const,
      runtimeShape: "legendaryActions" as const,
    })),
    Match.when({ kind: "lair_bonus" }, () => ({
      kind: "tableOwned" as const,
      explicitTableFact: {
        kind: "lairPresenceForLegendaryActionUses" as const,
      },
    })),
    Match.exhaustive,
  );
}

type AddOccurrence = (
  kind: StatBlockProcedurePressureOccurrenceKind,
  location: StatBlockProcedurePressureLocation,
  structuralSubject: unknown,
  disposition: StatBlockProcedurePressureDisposition,
) => void;

function addEntryResourceReferences(
  add: AddOccurrence,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  resources: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedureResource
  >,
  dispositions: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedurePressureDisposition
  >,
): void {
  if (entry.resourceRefs.kind === "none") return;
  for (const resourceOrdinal of entry.resourceRefs.ordinals) {
    add(
      "resourceReference",
      {
        kind: "resourceReference",
        section,
        procedureOrdinal: entry.procedureOrdinal,
        resourceOrdinal,
      },
      { origin: "procedure", resource: resources.get(resourceOrdinal) },
      resourceReferenceDisposition(resourceOrdinal, dispositions),
    );
  }
}

function addSpellcastingOccurrences(
  add: AddOccurrence,
  section: StatBlockActionProjectionSection,
  procedureOrdinal: StatBlockProcedureOrdinal,
  groups: ReadonlyNonEmptyArray<StatBlockSpellcastingGroup>,
  resources: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedureResource
  >,
  dispositions: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedurePressureDisposition
  >,
): void {
  for (const [groupIndex, group] of groups.entries()) {
    const groupOrdinal = groupIndex + 1;
    add(
      "spellcastingGroup",
      {
        kind: "spellcastingGroup",
        section,
        procedureOrdinal,
        groupOrdinal,
      },
      group,
      {
        kind: "missingOwner",
        surfaceShape: {
          kind: "spellcastingGroup",
          groupKind: group.kind,
        },
        failedFacts: ["missingStatBlockSpellcastingGroupOwner"],
      },
    );
    if (group.resourceRefs.kind === "some") {
      for (const resourceOrdinal of group.resourceRefs.ordinals) {
        add(
          "resourceReference",
          {
            kind: "resourceReference",
            section,
            procedureOrdinal,
            resourceOrdinal,
            groupOrdinal,
          },
          {
            origin: "spellcastingGroup",
            resource: resources.get(resourceOrdinal),
          },
          resourceReferenceDisposition(resourceOrdinal, dispositions),
        );
      }
    }
    for (const [spellIndex, spell] of group.spells.entries()) {
      add(
        "spellReference",
        {
          kind: "spellReference",
          section,
          procedureOrdinal,
          groupOrdinal,
          spellOrdinal: spellIndex + 1,
        },
        spell,
        spellReferenceDisposition(spell),
      );
    }
  }
}

function resourceReferenceDisposition(
  resourceOrdinal: StatBlockProcedureResourceOrdinal,
  dispositions: ReadonlyMap<
    StatBlockProcedureResourceOrdinal,
    StatBlockProcedurePressureDisposition
  >,
): StatBlockProcedurePressureDisposition {
  const declaration = dispositions.get(resourceOrdinal);
  if (declaration === undefined) {
    return {
      kind: "malformed",
      stage: "resourceReference",
      issues: [{ kind: "missingResourceDeclaration" }],
    };
  }
  return declaration.kind === "malformed"
    ? {
        kind: "malformed",
        stage: "resourceReference",
        issues: declaration.issues,
      }
    : {
        kind: "executable",
        owner: "battle-runtime Stat Block resource graph" as const,
        runtimeShape: "resourceReference" as const,
      };
}

function procedureReferenceDisposition(
  decision: AuthoredStatBlockProcedureExecutionDecision | undefined,
): StatBlockProcedurePressureDisposition {
  return decision?.kind === "executable" &&
    decision.procedureKind === "attack_roll"
    ? {
        kind: "executable",
        owner: "battle-runtime Stat Block Multiattack dispatch graph" as const,
        runtimeShape: "attackProcedureReference" as const,
      }
    : {
        kind: "missingOwner",
        surfaceShape: { kind: "multiattackProcedureReference" },
        failedFacts: ["referencedProcedureNotExecutable"],
      };
}

function spellReferenceDisposition(
  spell: StatBlockSpellReference,
): StatBlockProcedurePressureDisposition {
  return {
    kind: "missingOwner",
    surfaceShape: {
      kind: "spellReference",
      restrictionPresence:
        spell.restriction === undefined ? "absent" : "present",
    },
    failedFacts: ["missingStatBlockSpellInvocationOwner"],
  };
}

function statBlockProcedurePressureSource(
  section: string,
  sourceAnchors: readonly SourceSectionAnchorRange[],
): StatBlockProcedurePressureSource {
  const parsedSection = parseSourceSection(section);
  if (parsedSection.tag === "malformed") return { kind: "unresolved", section };
  const claimedSection = parsedSection.section;
  const sourceAnchor = sourceAnchors.find((candidate) =>
    sourceSectionMatchesAnchor(claimedSection, candidate),
  );
  if (sourceAnchor === undefined) return { kind: "unresolved", section };
  return {
    kind: "linked",
    path: sourceAnchor.sourcePath,
    firstLine: claimedSection.lineStart,
    lastLine: claimedSection.lineEnd,
  };
}

const AUTHORED_EXPRESSION_KEYS = new Set([
  "description",
  "id",
  "label",
  "name",
  "provenance",
  "spellId",
]);

function structuralShape(value: unknown): string {
  return JSON.stringify(normalizeStructuralValue(value));
}

function normalizeStructuralValue(value: unknown): unknown {
  if (typeof value === "number") return "number";
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map(normalizeStructuralValue);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !AUTHORED_EXPRESSION_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [
        key,
        key === "restriction"
          ? { kind: "authoredExpressionPresent" }
          : normalizeStructuralValue(child),
      ]),
  );
}

function occurrenceCounts(
  occurrences: readonly StatBlockProcedurePressureOccurrence[],
): Readonly<Record<StatBlockProcedurePressureOccurrenceKind, number>> {
  const count = (kind: StatBlockProcedurePressureOccurrenceKind): number =>
    occurrences.filter((occurrence) => occurrence.kind === kind).length;
  return {
    section: count("section"),
    procedure: count("procedure"),
    trait: count("trait"),
    reactionTrigger: count("reactionTrigger"),
    spellcastingGroup: count("spellcastingGroup"),
    spellReference: count("spellReference"),
    resourceDeclaration: count("resourceDeclaration"),
    resourceReference: count("resourceReference"),
    procedureReference: count("procedureReference"),
  };
}

function dispositionCounts(
  occurrences: readonly StatBlockProcedurePressureOccurrence[],
): Readonly<Record<StatBlockProcedurePressureDispositionKind, number>> {
  const count = (kind: StatBlockProcedurePressureDispositionKind): number =>
    occurrences.filter((occurrence) => occurrence.disposition.kind === kind)
      .length;
  return {
    executable: count("executable"),
    textOnly: count("textOnly"),
    tableOwned: count("tableOwned"),
    missingOwner: count("missingOwner"),
    malformed: count("malformed"),
  };
}

function pressureGroups(
  occurrences: readonly StatBlockProcedurePressureOccurrence[],
): readonly StatBlockProcedurePressureGroup[] {
  const grouped = new Map<
    string,
    {
      readonly occurrence: StatBlockProcedurePressureOccurrence;
      readonly remainingOccurrences: StatBlockProcedurePressureOccurrence[];
    }
  >();
  for (const occurrence of occurrences) {
    const structuralKey = occurrenceStructuralKey(occurrence);
    const prior = grouped.get(structuralKey);
    if (prior === undefined) {
      grouped.set(structuralKey, {
        occurrence,
        remainingOccurrences: [],
      });
    } else {
      prior.remainingOccurrences.push(occurrence);
    }
  }
  return Array.from(
    grouped,
    ([structuralKey, { occurrence, remainingOccurrences }]) => {
      const members = [occurrence, ...remainingOccurrences] as const;
      return {
        structuralKey,
        kind: occurrence.kind,
        structuralShape: occurrence.structuralShape,
        disposition: occurrence.disposition,
        occurrenceCount: members.length,
        statBlockCount: new Set(
          members.map(({ witness }) => witness.recordOrdinal),
        ).size,
        memberRowIds: [
          occurrence.rowId,
          ...remainingOccurrences.map(({ rowId }) => rowId),
        ] as const,
        exampleWitnesses: distinctExampleWitnesses(
          members.map(({ witness }) => witness),
        ),
      };
    },
  ).sort((left, right) =>
    left.structuralKey.localeCompare(right.structuralKey),
  );
}

function occurrenceStructuralKey(
  occurrence: StatBlockProcedurePressureOccurrence,
): string {
  return structuralShape({
    kind: occurrence.kind,
    structuralShape: occurrence.structuralShape,
    disposition: occurrence.disposition,
  });
}

function capabilityProposals(
  occurrences: readonly StatBlockProcedurePressureOccurrence[],
): readonly StatBlockProcedurePressureCapabilityProposal[] {
  const candidates = new Map<
    string,
    {
      readonly occurrenceKind: StatBlockProcedurePressureOccurrenceKind;
      readonly surfaceShape: StatBlockProcedurePressureSurfaceShape;
      readonly failedFacts: ReadonlyNonEmptyArray<StatBlockProcedurePressureFailedFact>;
      readonly occurrence: StatBlockProcedurePressureOccurrence;
      readonly remainingOccurrences: StatBlockProcedurePressureOccurrence[];
    }
  >();
  for (const occurrence of occurrences) {
    if (occurrence.disposition.kind !== "missingOwner") continue;
    const structuralKey = structuralShape({
      occurrenceKind: occurrence.kind,
      surfaceShape: occurrence.disposition.surfaceShape,
      failedFacts: occurrence.disposition.failedFacts,
    });
    const candidate = candidates.get(structuralKey);
    if (candidate === undefined) {
      candidates.set(structuralKey, {
        occurrenceKind: occurrence.kind,
        surfaceShape: occurrence.disposition.surfaceShape,
        failedFacts: occurrence.disposition.failedFacts,
        occurrence,
        remainingOccurrences: [],
      });
    } else {
      candidate.remainingOccurrences.push(occurrence);
    }
  }
  return Array.from(candidates, ([structuralKey, candidate]) => {
    const members = [
      candidate.occurrence,
      ...candidate.remainingOccurrences,
    ] as const;
    const statBlockCount = new Set(
      members.map(({ witness }) => witness.recordOrdinal),
    ).size;
    return {
      structuralKey,
      occurrenceKind: candidate.occurrenceKind,
      surfaceShape: candidate.surfaceShape,
      failedFacts: candidate.failedFacts,
      occurrenceCount: members.length,
      statBlockCount,
      pressureScore: members.length + statBlockCount,
      memberRowIds: [
        candidate.occurrence.rowId,
        ...candidate.remainingOccurrences.map(({ rowId }) => rowId),
      ] as const,
      exampleWitnesses: distinctExampleWitnesses(
        members.map(({ witness }) => witness),
      ),
    };
  })
    .sort(
      (left, right) =>
        right.pressureScore - left.pressureScore ||
        right.occurrenceCount - left.occurrenceCount ||
        left.structuralKey.localeCompare(right.structuralKey),
    )
    .slice(0, MAX_CAPABILITY_PROPOSALS)
    .map((proposal, index) => ({ rank: index + 1, ...proposal }));
}

function distinctExampleWitnesses(
  witnesses: readonly StatBlockProcedurePressureWitness[],
): readonly StatBlockProcedurePressureWitness[] {
  const recordOrdinals = new Set<number>();
  const examples: StatBlockProcedurePressureWitness[] = [];
  for (const witness of witnesses) {
    if (recordOrdinals.has(witness.recordOrdinal)) continue;
    recordOrdinals.add(witness.recordOrdinal);
    examples.push(witness);
    if (examples.length === MAX_EXAMPLE_WITNESSES) break;
  }
  return examples;
}
