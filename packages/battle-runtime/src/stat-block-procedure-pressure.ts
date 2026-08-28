import { Match } from "effect";
import * as Either from "effect/Either";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  AuthoredStatBlockReactionTrigger,
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResource,
  StatBlockProcedureResourceOrdinal,
  StatBlockRecord,
  StatBlockSpellcastingGroup,
  StatBlockTextOnlyReason,
} from "@dnd/surface/surface/types";

import {
  authoredStatBlockProcedureExecutionDecision,
  type AuthoredStatBlockProcedureExecutionDecision,
} from "./stat-block-authored-projection.ts";
import { statBlockTraitSupport } from "./statblock-action-execution-support.ts";
import { parseStatBlockRuntimeResource } from "./stat-block-execution-state.ts";
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

export type StatBlockProcedurePressureDisposition =
  | {
      readonly kind: "executable";
      readonly owner: string;
      readonly runtimeShape: string;
    }
  | {
      readonly kind: "textOnly";
      readonly reason: StatBlockProcedurePressureTextOnlyReason;
    }
  | {
      readonly kind: "tableOwned";
      readonly explicitTableFact: string;
    }
  | {
      readonly kind: "missingOwner";
      readonly surfaceShape: string;
      readonly failedFacts: ReadonlyNonEmptyArray<string>;
    }
  | {
      readonly kind: "malformed";
      readonly stage:
        | "resourceDeclaration"
        | "resourceReference"
        | "sourceLink"
        | "section";
      readonly issues: ReadonlyNonEmptyArray<string>;
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
  readonly statBlockId: StatBlockRecord["id"];
  readonly statBlockName: StatBlockRecord["name"];
  readonly source: StatBlockProcedurePressureSource;
  readonly location: StatBlockProcedurePressureLocation;
};

export type StatBlockProcedurePressureOccurrence = {
  readonly kind: StatBlockProcedurePressureOccurrenceKind;
  readonly structuralShape: string;
  readonly disposition: StatBlockProcedurePressureDisposition;
  readonly witness: StatBlockProcedurePressureWitness;
};

export type StatBlockProcedurePressureRecordWitness = {
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
  readonly exampleWitnesses: readonly StatBlockProcedurePressureWitness[];
};

export type StatBlockProcedurePressureCapabilityProposal = {
  readonly rank: number;
  readonly structuralKey: string;
  readonly occurrenceKind: StatBlockProcedurePressureOccurrenceKind;
  readonly surfaceShape: string;
  readonly failedFacts: ReadonlyNonEmptyArray<string>;
  readonly occurrenceCount: number;
  readonly statBlockCount: number;
  readonly pressureScore: number;
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

const MAX_EXAMPLE_WITNESSES = 3;
const MAX_CAPABILITY_PROPOSALS = 24;

type AuthoredProcedureSection = {
  readonly section: StatBlockActionProjectionSection;
  readonly entries: readonly StatBlockProcedurePressureEntry[];
};

type StatBlockProcedurePressureEntry =
  | StatBlockProcedureEntry
  | NonNullable<StatBlockRecord["statBlock"]["reactions"]>[number];

export function analyzeStatBlockProcedurePressure(
  records: readonly StatBlockRecord[],
): StatBlockProcedurePressureReport {
  const recordOccurrences = records.map((record) => ({
    record,
    occurrences: statBlockProcedurePressureOccurrences(record),
  }));
  const occurrences = recordOccurrences.flatMap(
    ({ occurrences: values }) => values,
  );
  return {
    kind: "statBlockProcedurePressureReport",
    recordCount: records.length,
    records: recordOccurrences.map(({ record, occurrences: values }) => ({
      statBlockId: record.id,
      statBlockName: record.name,
      source: statBlockProcedurePressureSource(record.provenance.section),
      occurrenceCount: values.length,
    })),
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
): readonly StatBlockProcedurePressureOccurrence[] {
  const occurrences: StatBlockProcedurePressureOccurrence[] = [];
  const add = occurrenceAppender(
    occurrences,
    procedurePressureOccurrenceBuilder(record),
  );
  const resourceContext = addResourceDeclarationOccurrences(record, add);
  addTraitOccurrences(record, add);
  addAuthoredSectionOccurrences(record, add, resourceContext);
  return occurrences;
}

type ProcedurePressureOccurrenceBuilder = (
  kind: StatBlockProcedurePressureOccurrenceKind,
  location: StatBlockProcedurePressureLocation,
  structuralSubject: unknown,
  disposition: StatBlockProcedurePressureDisposition,
) => StatBlockProcedurePressureOccurrence;

function procedurePressureOccurrenceBuilder(
  record: StatBlockRecord,
): ProcedurePressureOccurrenceBuilder {
  const source = statBlockProcedurePressureSource(record.provenance.section);
  return (kind, location, structuralSubject, disposition) => ({
    kind,
    structuralShape: structuralShape(structuralSubject),
    disposition:
      source.kind === "linked"
        ? disposition
        : {
            kind: "malformed",
            stage: "sourceLink",
            issues: [source.section],
          },
    witness: {
      statBlockId: record.id,
      statBlockName: record.name,
      source,
      location,
    },
  });
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
  for (const { section, entries } of authoredProcedureSections(record)) {
    add(
      "section",
      { kind: "section", section },
      sectionShape(record, section),
      sectionDisposition(record, section),
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
        entry,
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
    const entries = Match.value(section).pipe(
      Match.when("actions", () => record.statBlock.actions),
      Match.when("bonusActions", () => record.statBlock.bonusActions),
      Match.when("reactions", () => record.statBlock.reactions),
      Match.when(
        "legendaryActions",
        () => record.statBlock.legendaryActions?.entries,
      ),
      Match.exhaustive,
    );
    return entries === undefined ? [] : [{ section, entries }];
  });
}

function sectionShape(
  record: StatBlockRecord,
  section: StatBlockActionProjectionSection,
): unknown {
  return Match.value(section).pipe(
    Match.when("legendaryActions", () => ({
      section,
      uses: record.statBlock.legendaryActions?.uses,
    })),
    Match.when("actions", () => ({ section })),
    Match.when("bonusActions", () => ({ section })),
    Match.when("reactions", () => ({ section })),
    Match.exhaustive,
  );
}

function sectionDisposition(
  record: StatBlockRecord,
  section: StatBlockActionProjectionSection,
): StatBlockProcedurePressureDisposition {
  return Match.value(section).pipe(
    Match.when("actions", () => ({
      kind: "executable" as const,
      owner: "battle-runtime Stat Block Action lifecycle",
      runtimeShape: "actions",
    })),
    Match.when("bonusActions", () => ({
      kind: "executable" as const,
      owner: "battle-runtime Stat Block Bonus Action lifecycle",
      runtimeShape: "bonusActions",
    })),
    Match.when("reactions", () => ({
      kind: "missingOwner" as const,
      surfaceShape: "reactions",
      failedFacts: ["reactionTriggerAndResourceLifecycle"] as const,
    })),
    Match.when("legendaryActions", () =>
      record.statBlock.legendaryActions === undefined
        ? {
            kind: "malformed" as const,
            stage: "section" as const,
            issues: ["missingLegendaryActionSection"] as const,
          }
        : record.statBlock.legendaryActions.uses.kind === "fixed"
          ? {
              kind: "executable" as const,
              owner: "battle-runtime Stat Block Legendary Action lifecycle",
              runtimeShape: "legendaryActions",
            }
          : {
              kind: "tableOwned" as const,
              explicitTableFact: "lairPresenceForLegendaryActionUses",
            },
    ),
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
            explicitTableFact: "procedureAdjudication",
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
        owner: "battle-runtime generic Stat Block attack procedure",
        runtimeShape: runtime.kind,
      }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "multiattack" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner: "battle-runtime generic Stat Block Multiattack control",
        runtimeShape: runtime.kind,
      }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "action_option" },
      ({ runtime }) => ({
        kind: "executable" as const,
        owner: "battle-runtime delegated Bonus Action procedure",
        runtimeShape: runtime.kind,
      }),
    ),
    Match.exhaustive,
  );
}

function procedureSurfaceShape(entry: StatBlockProcedureEntry): string {
  return entry.kind === "textOnly"
    ? `textOnly:${entry.reason}`
    : entry.procedure.kind;
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
      owner: "battle-runtime Stat Block trait attack-roll mode",
      runtimeShape: "conditionalAttackRollMode",
    })),
    Match.when({ kind: "unsupported" }, ({ effect }) => ({
      kind: "missingOwner" as const,
      surfaceShape: `trait:${effect.kind}`,
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
    explicitTableFact: `reactionTrigger:${reactionTriggerShape(trigger)}`,
  };
}

function reactionTriggerShape(
  trigger: AuthoredStatBlockReactionTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when(
      { kind: "any_of" },
      ({ triggers }) =>
        `any_of(${triggers.map(reactionTriggerShape).join(",")})`,
    ),
    Match.when({ kind: "hit_by_attack_roll" }, () => "hit_by_attack_roll"),
    Match.when(
      { kind: "takes_damage_from_creature" },
      () => "takes_damage_from_creature",
    ),
    Match.when(
      { kind: "self_or_visible_creature_falls" },
      () => "self_or_visible_creature_falls",
    ),
    Match.when(
      { kind: "targeted_by_named_spell" },
      () => "targeted_by_named_spell",
    ),
    Match.when({ kind: "creature_casts_spell" }, () => "creature_casts_spell"),
    Match.when({ kind: "spell_save_outcome" }, () => "spell_save_outcome"),
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
        owner: "battle-runtime Stat Block resource pool",
        runtimeShape: parsed.right.limit.kind,
      }
    : {
        kind: "malformed",
        stage: "resourceDeclaration",
        issues: [parsed.left],
      };
}

function legendaryActionResourceDisposition(
  uses: NonNullable<StatBlockRecord["statBlock"]["legendaryActions"]>["uses"],
): StatBlockProcedurePressureDisposition {
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, () => ({
      kind: "executable" as const,
      owner: "battle-runtime Legendary Action resource pool",
      runtimeShape: "legendaryActions",
    })),
    Match.when({ kind: "lair_bonus" }, () => ({
      kind: "tableOwned" as const,
      explicitTableFact: "lairPresenceForLegendaryActionUses",
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
        surfaceShape: `spellcastingGroup:${group.kind}`,
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
        spellReferenceDisposition(),
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
      issues: ["missingResourceDeclaration"],
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
        owner: "battle-runtime Stat Block resource graph",
        runtimeShape: "resourceReference",
      };
}

function procedureReferenceDisposition(
  decision: AuthoredStatBlockProcedureExecutionDecision | undefined,
): StatBlockProcedurePressureDisposition {
  return decision?.kind === "executable" &&
    decision.procedureKind === "attack_roll"
    ? {
        kind: "executable",
        owner: "battle-runtime Stat Block Multiattack dispatch graph",
        runtimeShape: "attackProcedureReference",
      }
    : {
        kind: "missingOwner",
        surfaceShape: "multiattackProcedureReference",
        failedFacts: ["referencedProcedureNotExecutable"],
      };
}

function spellReferenceDisposition(): StatBlockProcedurePressureDisposition {
  return {
    kind: "missingOwner",
    surfaceShape: "statBlockSpellReference",
    failedFacts: ["missingStatBlockSpellInvocationOwner"],
  };
}

function statBlockProcedurePressureSource(
  section: string,
): StatBlockProcedurePressureSource {
  const match = /^(.*\.md):(\d+)(?:-(\d+))?$/.exec(section);
  if (match === null) return { kind: "unresolved", section };
  const relativePath = match[1];
  const firstLine = Number(match[2]);
  const lastLine = Number(match[3] ?? match[2]);
  if (
    relativePath === undefined ||
    relativePath.startsWith("/") ||
    relativePath.split("/").includes("..") ||
    firstLine < 1 ||
    lastLine < firstLine
  ) {
    return { kind: "unresolved", section };
  }
  return {
    kind: "linked",
    path: `.references/srd-5.2.1/${relativePath}`,
    firstLine,
    lastLine,
  };
}

const AUTHORED_EXPRESSION_KEYS = new Set([
  "description",
  "id",
  "label",
  "name",
  "provenance",
  "restriction",
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
      .map(([key, child]) => [key, normalizeStructuralValue(child)]),
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
      readonly witnesses: StatBlockProcedurePressureWitness[];
    }
  >();
  for (const occurrence of occurrences) {
    const structuralKey = occurrenceStructuralKey(occurrence);
    const prior = grouped.get(structuralKey);
    if (prior === undefined) {
      grouped.set(structuralKey, {
        occurrence,
        witnesses: [occurrence.witness],
      });
    } else {
      prior.witnesses.push(occurrence.witness);
    }
  }
  return Array.from(grouped, ([structuralKey, { occurrence, witnesses }]) => ({
    structuralKey,
    kind: occurrence.kind,
    structuralShape: occurrence.structuralShape,
    disposition: occurrence.disposition,
    occurrenceCount: witnesses.length,
    statBlockCount: new Set(witnesses.map(({ statBlockId }) => statBlockId))
      .size,
    exampleWitnesses: distinctExampleWitnesses(witnesses),
  })).sort((left, right) =>
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
      readonly surfaceShape: string;
      readonly failedFacts: ReadonlyNonEmptyArray<string>;
      readonly witnesses: StatBlockProcedurePressureWitness[];
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
        witnesses: [occurrence.witness],
      });
    } else {
      candidate.witnesses.push(occurrence.witness);
    }
  }
  return Array.from(candidates, ([structuralKey, candidate]) => ({
    structuralKey,
    occurrenceKind: candidate.occurrenceKind,
    surfaceShape: candidate.surfaceShape,
    failedFacts: candidate.failedFacts,
    occurrenceCount: candidate.witnesses.length,
    statBlockCount: new Set(
      candidate.witnesses.map(({ statBlockId }) => statBlockId),
    ).size,
    pressureScore:
      candidate.witnesses.length +
      new Set(candidate.witnesses.map(({ statBlockId }) => statBlockId)).size,
    exampleWitnesses: distinctExampleWitnesses(candidate.witnesses),
  }))
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
  const statBlockIds = new Set<StatBlockRecord["id"]>();
  const examples: StatBlockProcedurePressureWitness[] = [];
  for (const witness of witnesses) {
    if (statBlockIds.has(witness.statBlockId)) continue;
    statBlockIds.add(witness.statBlockId);
    examples.push(witness);
    if (examples.length === MAX_EXAMPLE_WITNESSES) break;
  }
  return examples;
}
