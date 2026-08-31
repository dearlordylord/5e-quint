// This admission leaf changes no rule semantics. It only relates the decoded
// authored Stat Block graph to the execution support facts already owned by
// battle-runtime.
import * as Result from "effect/Result";
import { Match } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import type {
  StatBlockMechanicsAdmissionIssueDraft,
  StatBlockMechanicsAdmissionResult,
  SurfaceMechanicsAdmission,
} from "@dnd/surface/surface/catalog-install";
import {
  statBlockMechanicsPath,
  type MechanicsGraphPathNode,
  type StatBlockMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  SrdStatBlockRecord,
  SrdSurface,
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResourceOrdinal,
  StatBlockReactionSection,
  StatBlockSpellReference,
  AuthoredStatBlockReactionTrigger,
  StandaloneStatBlock,
} from "@dnd/surface/surface/types";

import { statBlockTraitSupport } from "./statblock-action-execution-support.ts";
import {
  statBlockAttackMechanicsSupport,
  statBlockProcedureEffectIsSupported,
} from "./statblock-attack-execution-mechanics.ts";
import { parseStatBlockRuntimeResource } from "./stat-block-execution-state.ts";
import { admitStatBlockSpellInvocationDeltas } from "./procedure-admission/stat-block-spell-invocation-deltas.ts";
import { authoredStatBlockProcedureExecutionDecision } from "./procedure-admission/stat-block-procedure-execution-decision.ts";
import type { StatBlockProcedureSection } from "./procedure-execution/stat-block-procedure-sections.ts";

type AdmissionIssue =
  StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>;

export type StatBlockMechanicsAdmissionInput = {
  readonly statBlock: SrdStatBlockRecord;
  readonly surface: SrdSurface;
};

type ReactionProcedureEntry = NonNullable<StatBlockReactionSection>[number];

type AnyProcedureEntry = StatBlockProcedureEntry | ReactionProcedureEntry;

type ExecutableProcedure = Extract<
  StatBlockProcedureEntry,
  { readonly kind: "executable" }
>["procedure"];
type AttackProcedure = Extract<
  ExecutableProcedure,
  { readonly kind: "attack_roll" }
>;
type SaveProcedure = Extract<ExecutableProcedure, { readonly kind: "save" }>;
type SupportProcedure = Extract<
  ExecutableProcedure,
  { readonly kind: "support" }
>;
type ProcedureEffect =
  | AttackProcedure["onHit"][number]
  | SaveProcedure["onFail"]
  | Exclude<SaveProcedure["onSuccess"], { readonly kind: "half_damage" }>
  | SupportProcedure["effect"];
type SpellcastingProcedure = Extract<
  ExecutableProcedure,
  { readonly kind: "spellcasting" }
>;

type Section = {
  readonly role: Extract<
    MechanicsGraphPathNode,
    { readonly kind: "singleton" }
  >["role"];
  readonly section: StatBlockProcedureSection;
  readonly entries: readonly AnyProcedureEntry[] | undefined;
};

/**
 * Admit one complete decoded Stat Block graph against the current runtime
 * support relation. The function is deliberately a pure profile: it receives
 * no actor, battle, session, resource state, or Runtime Hole and returns no
 * projection or admission object.
 *
 * Portable decoding has already validated schema-declared Authored
 * Dependencies. This profile closes the nested typed reference edges that
 * affect a Stat Block's executable graph and reports their paths without
 * copying referenced records. The `statBlock` must be the exact record member
 * of `surface`, not a same-id clone or a separately decoded equivalent: the
 * admission result must describe one call-local authored graph, and accepting
 * two independently decoded roots could validate one graph while installing
 * the other. The canonical installer preserves this identity by passing its
 * call-local member directly to the admission callback.
 */
export function admitCompleteStatBlockMechanicsGraph(
  input: StatBlockMechanicsAdmissionInput,
): StatBlockMechanicsAdmissionResult {
  const issues: AdmissionIssue[] = [];
  const source = input.statBlock.statBlock;
  inspectRootMembership(input, issues);
  const unitIds = new Set(input.surface.units.map((unit) => String(unit.id)));
  const spellUnitIds = new Set(
    input.surface.units
      .filter((unit) => unit.kind === "spell")
      .map((unit) => String(unit.id)),
  );
  const resourceOrdinals = inspectResources(source, issues);
  inspectGeneralFacts(source, issues);
  inspectTraits(source.traits, issues);
  const admittedProcedureCount = inspectSections(
    source,
    unitIds,
    spellUnitIds,
    resourceOrdinals,
    issues,
  );

  if (admittedProcedureCount === 0) {
    addIssue(
      issues,
      "no_admitted_procedure",
      path({ kind: "singleton", role: "recordMechanics" }),
      "The Stat Block graph has no executable procedure admitted by this profile.",
    );
  }

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue === undefined) return { tag: "admitted" };
  return {
    tag: "rejected",
    issues: [firstIssue, ...remainingIssues],
  };
}

/** The callback shape expected by the atomic Surface installer. */
export const admitCompleteStatBlockMechanics: SurfaceMechanicsAdmission["admitStatBlock"] =
  admitCompleteStatBlockMechanicsGraph;

function inspectRootMembership(
  input: StatBlockMechanicsAdmissionInput,
  issues: AdmissionIssue[],
): void {
  const installedRoot = input.surface.statBlocks.find(
    (candidate) => candidate.id === input.statBlock.id,
  );
  if (installedRoot === input.statBlock) return;
  addIssue(
    issues,
    "incomplete_graph",
    path({ kind: "singleton", role: "recordMechanics" }),
    installedRoot === undefined
      ? "The Stat Block admission root is absent from the decoded Surface."
      : "The Stat Block admission root does not match the decoded Surface member with that authored identity.",
  );
}

function inspectGeneralFacts(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): void {
  inspectGeneralChoiceFacts(source, issues);
  inspectGeneralImmunityFacts(source, issues);
  inspectGeneralSwarmFact(source, issues);
}

function inspectGeneralChoiceFacts(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): void {
  const generalPath = path({ kind: "singleton", role: "generalFact" });
  if (typeof source.size !== "string") {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalPath,
      "The Stat Block size requires a context-independent choice.",
    );
  }
  if (
    source.speeds.some(
      (speed) => speed.kind === "gm_choice" || "availability" in speed,
    )
  ) {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalPath,
      "The Stat Block speed graph requires an unresolved choice or active form.",
    );
  }
  if (source.resistances?.kind === "choose_one_from") {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalPath,
      "The Stat Block resistance graph requires a choice before execution.",
    );
  }
  if (source.vulnerabilities?.kind === "qualified") {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalPath,
      "The Stat Block vulnerability graph has an execution qualifier without a runtime owner.",
    );
  }
}

function inspectGeneralImmunityFacts(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): void {
  const generalPath = path({ kind: "singleton", role: "generalFact" });
  if (
    source.immunities !== undefined &&
    "qualifiedConditions" in source.immunities
  ) {
    addIssue(
      issues,
      "ambiguous_mechanics",
      generalPath,
      "The Stat Block condition-immunity graph has a qualifier without a runtime owner.",
    );
  }
}

function inspectGeneralSwarmFact(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): void {
  const generalPath = path({ kind: "singleton", role: "generalFact" });
  if (source.swarm !== undefined) {
    addIssue(
      issues,
      "unsupported_mechanics",
      generalPath,
      "The Stat Block swarm constituent graph has no execution support profile.",
    );
  }
}

function inspectSections(
  source: StandaloneStatBlock,
  unitIds: ReadonlySet<string>,
  spellUnitIds: ReadonlySet<string>,
  resourceOrdinals: ReadonlySet<number>,
  issues: AdmissionIssue[],
): number {
  return sections(source).reduce(
    (admittedProcedureCount, section) =>
      admittedProcedureCount +
      inspectSection(
        source,
        unitIds,
        spellUnitIds,
        resourceOrdinals,
        section,
        issues,
      ),
    0,
  );
}

function inspectSection(
  source: StandaloneStatBlock,
  unitIds: ReadonlySet<string>,
  spellUnitIds: ReadonlySet<string>,
  resourceOrdinals: ReadonlySet<number>,
  section: Section,
  issues: AdmissionIssue[],
): number {
  if (section.section === "legendaryActions") {
    inspectLegendaryUses(source, issues);
  }
  const entries = section.entries;
  if (entries === undefined) return 0;
  if (section.section === "reactions") {
    addIssue(
      issues,
      "unsupported_mechanics",
      path({ kind: "singleton", role: "reaction" }),
      "The Stat Block reaction lifecycle has no complete executable support owner.",
    );
  }
  let admittedProcedureCount = 0;
  for (const entry of entries) {
    const entryPath = procedurePath(section, entry.procedureOrdinal);
    const before = issues.length;
    inspectProcedureEntry(
      source,
      unitIds,
      spellUnitIds,
      resourceOrdinals,
      section,
      entry,
      entryPath,
      issues,
    );
    if (issues.length === before && entry.kind === "executable") {
      admittedProcedureCount += 1;
    }
  }
  return admittedProcedureCount;
}

function inspectTraits(
  traits: StandaloneStatBlock["traits"],
  issues: AdmissionIssue[],
): void {
  if (traits === undefined) return;
  for (const [index, trait] of traits.entries()) {
    const traitPath = path(occurrenceAt("trait", index));
    const support = statBlockTraitSupport(trait);
    if (support.kind !== "supported") {
      addIssue(
        issues,
        "unsupported_mechanics",
        traitPath,
        "The Stat Block trait has no complete executable interpretation.",
      );
    }
  }
}

function inspectResources(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): ReadonlySet<number> {
  const ordinals = new Set<number>();
  for (const resource of source.resources ?? []) {
    const ordinal = Number(resource.ordinal);
    const resourcePath = path(occurrence("resource", resource.ordinal));
    if (ordinals.has(ordinal)) {
      addIssue(
        issues,
        "incomplete_graph",
        resourcePath,
        "The Stat Block resource graph declares one ordinal more than once.",
      );
    } else {
      ordinals.add(ordinal);
    }
    const parsed = parseStatBlockRuntimeResource(resource);
    if (Result.isFailure(parsed)) {
      addIssue(
        issues,
        "unsupported_mechanics",
        resourcePath,
        "The Stat Block resource limit has no executable interpretation.",
      );
    }
  }
  return ordinals;
}

function inspectLegendaryUses(
  source: StandaloneStatBlock,
  issues: AdmissionIssue[],
): void {
  const uses = source.legendaryActions?.uses;
  if (uses?.kind !== "lair_bonus") return;
  addIssue(
    issues,
    "ambiguous_mechanics",
    path(occurrenceAt("legendaryAction", 0), {
      kind: "singleton",
      role: "extension",
    }),
    "The Legendary Action use pool depends on lair context.",
  );
}

function inspectProcedureEntry(
  source: StandaloneStatBlock,
  unitIds: ReadonlySet<string>,
  spellUnitIds: ReadonlySet<string>,
  resourceOrdinals: ReadonlySet<number>,
  section: Section,
  entry: AnyProcedureEntry,
  entryPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  const procedurePath = append(entryPath, {
    kind: "singleton",
    role: "procedure",
  });
  inspectResourceReferences(
    entry.resourceRefs,
    resourceOrdinals,
    procedurePath,
    issues,
  );
  if (entry.kind === "textOnly") {
    addIssue(
      issues,
      "unsupported_mechanics",
      append(entryPath, { kind: "singleton", role: "procedure" }),
      "The Stat Block procedure is text-only and has no executable interpretation.",
    );
    return;
  }

  if (section.section === "reactions" && "trigger" in entry) {
    inspectReactionTrigger(
      entry.trigger,
      unitIds,
      spellUnitIds,
      append(entryPath, { kind: "singleton", role: "extension" }),
      issues,
    );
  }

  const procedureEntry = withoutReactionTrigger(entry);
  const decision = authoredStatBlockProcedureExecutionDecision(
    source,
    section.section,
    procedureEntry,
  );
  if (decision.kind === "missingOwner") {
    addIssue(
      issues,
      "unsupported_mechanics",
      append(entryPath, { kind: "singleton", role: "procedure" }),
      "The Stat Block procedure shape has no executable support owner.",
    );
  }

  inspectProcedureChildren(
    source,
    spellUnitIds,
    resourceOrdinals,
    section,
    entry,
    entryPath,
    issues,
  );
}

function inspectProcedureChildren(
  source: StandaloneStatBlock,
  spellUnitIds: ReadonlySet<string>,
  resourceOrdinals: ReadonlySet<number>,
  section: Section,
  entry: AnyProcedureEntry,
  entryPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  if (entry.kind === "textOnly") return;
  const procedurePath = append(entryPath, {
    kind: "singleton",
    role: "procedure",
  });
  const procedure = entry.procedure;
  Match.value(procedure).pipe(
    Match.when({ kind: "attack_roll" }, (attack) => {
      inspectAttackEffects(
        attack,
        append(entryPath, { kind: "singleton", role: "procedure" }),
        issues,
      );
    }),
    Match.when({ kind: "save" }, (save) => {
      const effects: ProcedureEffect[] = [save.onFail];
      if (save.onSuccess.kind !== "half_damage") effects.push(save.onSuccess);
      inspectEffects(
        effects,
        append(entryPath, { kind: "singleton", role: "procedure" }),
        issues,
      );
    }),
    Match.when({ kind: "support" }, (support) => {
      inspectEffects(
        [support.effect],
        append(entryPath, { kind: "singleton", role: "procedure" }),
        issues,
      );
    }),
    Match.when({ kind: "multiattack" }, (multiattack) => {
      inspectMultiattackDispatches(
        source,
        section,
        multiattack.dispatches,
        procedurePath,
        issues,
      );
    }),
    Match.when({ kind: "spellcasting" }, (spellcasting) => {
      inspectSpellcasting(
        spellcasting.groups,
        spellUnitIds,
        resourceOrdinals,
        procedurePath,
        issues,
      );
    }),
    Match.when({ kind: "action_option" }, () => undefined),
    Match.exhaustive,
  );
}

function inspectEffects(
  effects: readonly ProcedureEffect[],
  procedurePath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  for (const [index, effect] of effects.entries()) {
    if (statBlockProcedureEffectIsSupported(effect)) continue;
    addIssue(
      issues,
      "unsupported_mechanics",
      append(procedurePath, {
        kind: "occurrence",
        role: "effect",
        ordinal: occurrenceOrdinalAt(index),
      }),
      "The Stat Block procedure effect has no executable support owner.",
    );
  }
}

function inspectAttackEffects(
  attack: AttackProcedure,
  procedurePath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  const support = statBlockAttackMechanicsSupport(
    authoredAttackMechanics(attack),
  );
  if (support.kind !== "unsupported") return;
  for (const issue of support.issues) {
    if (issue.kind !== "unsupportedEffect") continue;
    addIssue(
      issues,
      "unsupported_mechanics",
      append(procedurePath, {
        kind: "occurrence",
        role: "effect",
        ordinal: issue.effectOrdinal,
      }),
      "The Stat Block procedure effect has no executable support owner.",
    );
  }
}

function authoredAttackMechanics(attack: AttackProcedure) {
  const { kind: _kind, name: _name, ...mechanics } = attack;
  return mechanics;
}

function inspectMultiattackDispatches(
  source: StandaloneStatBlock,
  section: Section,
  dispatches: readonly {
    readonly procedureOrdinal: StatBlockProcedureOrdinal;
  }[],
  entryPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  const supportedAttackOrdinals = new Set(
    (source.actions ?? []).flatMap((entry) =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      statBlockAttackMechanicsSupport(authoredAttackMechanics(entry.procedure))
        .kind === "supported"
        ? [entry.procedureOrdinal]
        : [],
    ),
  );
  for (const [index, dispatch] of dispatches.entries()) {
    const dispatchPath = append(entryPath, {
      kind: "occurrence",
      role: "reference",
      ordinal: occurrenceOrdinalAt(index),
    });
    if (
      section.section !== "actions" ||
      !supportedAttackOrdinals.has(dispatch.procedureOrdinal)
    ) {
      addIssue(
        issues,
        "incomplete_graph",
        dispatchPath,
        "The Multiattack dispatch does not resolve to a supported attack procedure.",
      );
    }
  }
}

function inspectSpellcasting(
  groups: SpellcastingProcedure["groups"],
  spellUnitIds: ReadonlySet<string>,
  resourceOrdinals: ReadonlySet<number>,
  entryPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  for (const [groupIndex, group] of groups.entries()) {
    const groupPath = append(entryPath, {
      kind: "occurrence",
      role: "extension",
      ordinal: occurrenceOrdinalAt(groupIndex),
    });
    addIssue(
      issues,
      "unsupported_mechanics",
      groupPath,
      "The Stat Block spellcasting group has no complete executable support owner.",
    );
    if (group.resourceRefs.kind === "some") {
      inspectResourceReferences(
        group.resourceRefs,
        resourceOrdinals,
        groupPath,
        issues,
      );
    }
    for (const [spellIndex, spell] of group.spells.entries()) {
      inspectSpellReference(
        spell,
        spellUnitIds,
        append(groupPath, {
          kind: "occurrence",
          role: "reference",
          ordinal: occurrenceOrdinalAt(spellIndex),
        }),
        issues,
      );
    }
  }
}

function inspectSpellReference(
  spell: StatBlockSpellReference,
  spellUnitIds: ReadonlySet<string>,
  spellPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  if (!spellUnitIds.has(String(spell.spellId))) {
    addIssue(
      issues,
      "incomplete_graph",
      spellPath,
      "The Stat Block spell reference does not resolve to an installed Unit.",
    );
  }
  addIssue(
    issues,
    "unsupported_mechanics",
    spellPath,
    "The Stat Block spell invocation has no complete executable interpretation.",
  );
  if (spell.restriction === undefined) return;
  const admitted = admitStatBlockSpellInvocationDeltas(
    spell.restriction.deltas,
  );
  for (const [index] of admitted.missingOwners.entries()) {
    addIssue(
      issues,
      "unsupported_mechanics",
      append(spellPath, {
        kind: "occurrence",
        role: "extension",
        ordinal: occurrenceOrdinalAt(index),
      }),
      "The Stat Block spell invocation extension has no executable support owner.",
    );
  }
}

function inspectReactionTrigger(
  trigger: AuthoredStatBlockReactionTrigger,
  unitIds: ReadonlySet<string>,
  spellUnitIds: ReadonlySet<string>,
  triggerPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  addIssue(
    issues,
    "unsupported_mechanics",
    triggerPath,
    "The Stat Block reaction trigger has no context-independent execution owner.",
  );
  Match.value(trigger).pipe(
    Match.when({ kind: "targeted_by_named_spell" }, (namedSpell) => {
      inspectReferencedUnit(
        namedSpell.spellId,
        spellUnitIds,
        append(triggerPath, { kind: "singleton", role: "reference" }),
        issues,
      );
    }),
    Match.when({ kind: "hit_by_attack_roll" }, (hit) => {
      if (hit.weaponFilter?.kind !== "specific_item") return;
      inspectReferencedUnit(
        hit.weaponFilter.itemId,
        unitIds,
        append(triggerPath, { kind: "singleton", role: "reference" }),
        issues,
      );
    }),
    Match.when({ kind: "any_of" }, (anyOf) => {
      for (const [index, child] of anyOf.triggers.entries()) {
        inspectReactionTrigger(
          child,
          unitIds,
          spellUnitIds,
          append(triggerPath, {
            kind: "occurrence",
            role: "extension",
            ordinal: occurrenceOrdinalAt(index),
          }),
          issues,
        );
      }
    }),
    Match.when({ kind: "takes_damage_from_creature" }, () => undefined),
    Match.when({ kind: "self_or_visible_creature_falls" }, () => undefined),
    Match.when({ kind: "creature_casts_spell" }, () => undefined),
    Match.when({ kind: "spell_save_outcome" }, () => undefined),
    Match.exhaustive,
  );
}

function inspectReferencedUnit(
  id: string,
  unitIds: ReadonlySet<string>,
  referencePath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  if (unitIds.has(String(id))) return;
  addIssue(
    issues,
    "incomplete_graph",
    referencePath,
    "The Stat Block authored reference does not resolve to an installed Unit.",
  );
}

function inspectResourceReferences(
  resourceRefs: AnyProcedureEntry["resourceRefs"],
  resourceOrdinals: ReadonlySet<number>,
  entryPath: StatBlockMechanicsPath,
  issues: AdmissionIssue[],
): void {
  if (resourceRefs.kind === "none") return;
  for (const ordinal of resourceRefs.ordinals) {
    if (resourceOrdinals.has(Number(ordinal))) continue;
    addIssue(
      issues,
      "incomplete_graph",
      append(entryPath, occurrence("dependency", ordinal)),
      "The Stat Block procedure references an undeclared resource.",
    );
  }
}

function withoutReactionTrigger(
  entry: AnyProcedureEntry,
): StatBlockProcedureEntry {
  if (entry.kind === "textOnly") return entry;
  const base = "trigger" in entry ? withoutTrigger(entry) : entry;
  return Match.value(base.procedure).pipe(
    Match.when({ kind: "attack_roll" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.when({ kind: "multiattack" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.when({ kind: "save" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.when({ kind: "support" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.when({ kind: "action_option" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.when({ kind: "spellcasting" }, (procedure) =>
      executableEntry(base, procedure),
    ),
    Match.exhaustive,
  );
}

function withoutTrigger(
  entry: ReactionProcedureEntry & { readonly kind: "executable" },
): Extract<StatBlockProcedureEntry, { readonly kind: "executable" }> {
  const { trigger: _trigger, ...base } = entry;
  return base;
}

function executableEntry(
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  procedure: ExecutableProcedure,
): StatBlockProcedureEntry {
  if (procedure.kind === "spellcasting") {
    return {
      kind: "executable",
      procedureOrdinal: entry.procedureOrdinal,
      procedure,
      resourceRefs: { kind: "none" },
    };
  }
  return {
    kind: "executable",
    procedureOrdinal: entry.procedureOrdinal,
    procedure,
    resourceRefs: entry.resourceRefs,
  };
}

function sections(source: StandaloneStatBlock): readonly Section[] {
  return [
    { role: "action", section: "actions", entries: source.actions },
    {
      role: "bonusAction",
      section: "bonusActions",
      entries: source.bonusActions,
    },
    { role: "reaction", section: "reactions", entries: source.reactions },
    {
      role: "legendaryAction",
      section: "legendaryActions",
      entries: source.legendaryActions?.entries,
    },
  ];
}

function procedurePath(
  section: Section,
  ordinal: StatBlockProcedureOrdinal,
): StatBlockMechanicsPath {
  return path(occurrence(section.role, ordinal));
}

function path(
  first: MechanicsGraphPathNode,
  ...rest: MechanicsGraphPathNode[]
): StatBlockMechanicsPath {
  return statBlockMechanicsPath([first, ...rest]);
}

function append(
  base: StatBlockMechanicsPath,
  ...nodes: MechanicsGraphPathNode[]
): StatBlockMechanicsPath {
  return statBlockMechanicsPath([
    base.nodes[0],
    ...base.nodes.slice(1),
    ...nodes,
  ]);
}

function occurrence(
  role: Extract<MechanicsGraphPathNode, { readonly kind: "singleton" }>["role"],
  ordinal:
    | PositiveInteger
    | StatBlockProcedureOrdinal
    | StatBlockProcedureResourceOrdinal,
): MechanicsGraphPathNode {
  return {
    kind: "occurrence",
    role,
    ordinal: PositiveInteger(Number(ordinal)),
  };
}

function occurrenceAt(
  role: Extract<MechanicsGraphPathNode, { readonly kind: "singleton" }>["role"],
  index: number,
): MechanicsGraphPathNode {
  return occurrence(role, occurrenceOrdinalAt(index));
}

function occurrenceOrdinalAt(index: number): PositiveInteger {
  return PositiveInteger(index + 1);
}

function addIssue(
  issues: AdmissionIssue[],
  reason: AdmissionIssue["reason"],
  mechanicsPath: StatBlockMechanicsPath,
  message: string,
): void {
  issues.push({ reason, mechanicsPath, message });
}
