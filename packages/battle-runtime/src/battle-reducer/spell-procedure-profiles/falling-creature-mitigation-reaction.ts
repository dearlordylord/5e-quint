import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-feather-fall-mitigation
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE
//
// The fallingCreatureMitigationReaction Spell Procedure Profile: a prepared Reaction spell
// that uses caller-supplied falling-trigger and falling-target witnesses to
// attach per-target Feather Fall mitigation until landing or duration expiry.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Feather Fall": Reaction when the caster or a visible
//     creature within 60 feet falls; range 60 feet; one-minute duration; choose
//     up to five falling creatures; descent slows to 60 feet per round; landing
//     before spell end prevents fall damage and ends the spell for that target.
//   - SRD 5.2.1 Rules Glossary "Falling": landing after a fall deals
//     Bludgeoning damage and imposes Prone unless the creature avoids taking
//     fall damage.
//   - SRD 5.2.1 Rules Glossary "Reaction": a Reaction responds to a trigger
//     defined in the Reaction description.
//   - UBIQUITOUS_LANGUAGE.md: Falling is the environmental hazard; fall damage
//     is acceptable shorthand only for the damage portion.
//
// What stays in shared infrastructure:
//   - Reaction-window discovery and trigger matching in reaction-triggered-spells.ts.
//   - Landing cleanup/projection helpers in spells-active-effects.ts.
//   - The metamagic table entry remains Wave 9 migration work.

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Match, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";

import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { completeReactionSpellSlotCast } from "../reaction-spell-resolution.ts";
import { fallingCreatureMitigationReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";
import { spendSpellAccessFreeCastResource } from "../spells-resolve-resources.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";

import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type {
  ActivationPhase,
  CastingTime,
  Components,
  Duration,
  EffectAtom,
  FixedDistancePointRange,
  Range,
  ReactionTrigger,
  SpellLevel,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type FallingCreatureMitigationReactionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "fallingCreatureMitigationReaction" }
>;
type FallingCreatureMitigationReactionPhase = Extract<
  Extract<
    SpellMechanics,
    { readonly family: "triggered_reaction" }
  >["phases"][number],
  { readonly kind: "direct" }
>;
type FallingCreatureMitigationReactionResolveInput =
  SpellProcedureProfileResolveInput<FallingCreatureMitigationReactionInvocation>;

function admitFallingCreatureMitigationReaction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: FallingCreatureMitigationReactionMechanicsFacts,
): readonly FallingCreatureMitigationReactionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly FallingCreatureMitigationReactionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "fallingCreatureMitigationReaction",
              spell,
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: facts.maxTargets,
              },
              rangeFeet: movementFeet(facts.range.feet),
              activeEffect: {
                kind: "fallingCreatureMitigationReaction",
                sourceCombatantId: ctx.actor.combatantId,
                expiresAt: {
                  kind: "duration",
                  durationTicks: facts.durationTicks,
                },
              },
            },
          ],
  );
}

type FallingCreatureMitigationReactionRange = FixedDistancePointRange;
type FallingCreatureMitigationReactionDuration = Extract<
  Duration,
  { readonly kind: "timed" }
> & {
  readonly value: SpellCanonicalDurationValue & {
    readonly unit: "minute";
    readonly amount: 1;
  };
};
type FallingCreatureMitigationReactionMechanicsFacts = {
  readonly level: SpellLevel;
  readonly range: FallingCreatureMitigationReactionRange;
  readonly durationTicks: ElapsedTimeTicks;
  readonly maxTargets: 5;
};

export const FALLING_CREATURE_MITIGATION_REACTION_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "interruptsTrigger",
  "phase",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "targetSelection",
  "effects",
  "effect",
] as const;
type FallingCreatureMitigationReactionFailedFact =
  (typeof FALLING_CREATURE_MITIGATION_REACTION_FAILED_FACTS)[number];

type FallingCreatureMitigationReactionMechanicsIssue = {
  readonly failedFact: FallingCreatureMitigationReactionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type FallingTargetSelection = Extract<
  TargetSelection,
  {
    readonly mode: "choose_up_to";
    readonly stateFilter: readonly ["falling"];
  }
>;
type FallingReactionCastingTime = Extract<
  CastingTime,
  { readonly kind: "reaction" }
>;
type FallingReactionTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "self_or_visible_creature_falls" }
>;
type FallingComponents = Components & { readonly m: string };
type FallingPhase = Extract<ActivationPhase, { readonly kind: "direct" }>;
type FallingEffect = Extract<
  EffectAtom,
  { readonly kind: "feather_fall_mitigation" }
>;

const FALLING_TARGET_SELECTION_FIELDS = [
  "mode",
  "count",
  "targetKinds",
  "stateFilter",
] as const satisfies ReadonlyArray<keyof FallingTargetSelection>;
const FALLING_RANGE_FIELDS = ["kind", "feet"] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionRange
>;
const FALLING_DURATION_FIELDS = [
  "kind",
  "value",
] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionDuration
>;
const FALLING_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionDuration["value"]
>;
const FALLING_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof FallingComponents>;
const FALLING_CASTING_TIME_FIELDS = [
  "kind",
  "trigger",
] as const satisfies ReadonlyArray<keyof FallingReactionCastingTime>;
const FALLING_TRIGGER_FIELDS = [
  "kind",
  "rangeFeet",
] as const satisfies ReadonlyArray<keyof FallingReactionTrigger>;
const FALLING_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
] as const satisfies ReadonlyArray<keyof FallingPhase>;
const FALLING_EFFECT_FIELDS = [
  "kind",
  "descentRateCapFeetPerRound",
  "landingOutcome",
] as const satisfies ReadonlyArray<keyof FallingEffect>;

function fallingCreatureMitigationReactionIssueResult(
  issue: FallingCreatureMitigationReactionMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "fallingCreatureMitigationReaction";
  readonly failedFact: FallingCreatureMitigationReactionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "fallingCreatureMitigationReaction",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported fallingCreatureMitigationReaction mechanics fact: ${issue.failedFact}.`,
  };
}

function isFallingRange(
  range: Range,
): range is FallingCreatureMitigationReactionRange {
  return (
    range.kind === "point" &&
    spellMechanicsObjectHasOnlyKeys(range, FALLING_RANGE_FIELDS) &&
    range.feet === 60
  );
}

function isFallingDuration(
  duration: Duration,
): duration is FallingCreatureMitigationReactionDuration {
  return (
    duration.kind === "timed" &&
    spellMechanicsObjectHasOnlyKeys(duration, FALLING_DURATION_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.value,
      FALLING_DURATION_VALUE_FIELDS,
    ) &&
    duration.value.unit === "minute" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
  );
}

type FallingTargetSelectionAdmission =
  | {
      readonly tag: "admitted";
      readonly maxTargets: 5;
    }
  | {
      readonly tag: "rejected";
      readonly mechanicsPath: SpellMechanicsBranchPath;
    }
  | { readonly tag: "unavailable" };

function admitFallingTargetSelection(
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  phase: FallingCreatureMitigationReactionPhase,
): FallingTargetSelectionAdmission {
  const targetAttachment = admitSpellTargetAttachment(
    phase.attachment,
    FALLING_TARGET_SELECTION_FIELDS,
  );
  const mechanicsPath = spellActivationAttachmentPath(phaseOrdinal);
  if (targetAttachment.tag === "rejected") {
    return { tag: "rejected", mechanicsPath };
  }
  const selection = targetAttachment.attachment.value.selection;
  if (selection.mode !== "choose_up_to") {
    return { tag: "rejected", mechanicsPath };
  }
  if (selection.count !== 5) {
    return { tag: "rejected", mechanicsPath };
  }
  if (!sameStringSet(selection.targetKinds ?? [], ["creature"])) {
    return { tag: "rejected", mechanicsPath };
  }
  const stateFilter =
    "stateFilter" in selection && Array.isArray(selection.stateFilter)
      ? selection.stateFilter
      : [];
  if (!sameStringSet(stateFilter, ["falling"])) {
    return { tag: "rejected", mechanicsPath };
  }
  return { tag: "admitted", maxTargets: 5 };
}

function fallingCreatureMitigationReactionSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    (mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        fallingCreatureMitigationReactionSemanticPhase(phase),
    ) ||
      (mechanics.castingTime.kind === "reaction" &&
        mechanics.castingTime.trigger.kind ===
          "self_or_visible_creature_falls"))
  );
}

function fallingCreatureMitigationReactionSemanticPhase(
  phase: FallingCreatureMitigationReactionPhase,
): boolean {
  return (phase.effects ?? []).some(
    (effect) => effect.kind === "feather_fall_mitigation",
  );
}

function fallingCreatureMitigationReactionDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    mechanics.level === 1 &&
    mechanics.school === "transmutation" &&
    mechanics.components.v === true &&
    mechanics.components.s === false &&
    typeof mechanics.components.m === "string" &&
    mechanics.castingTime.kind === "reaction" &&
    mechanics.castingTime.trigger.kind === "self_or_visible_creature_falls" &&
    mechanics.castingTime.trigger.rangeFeet === 60 &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 60 &&
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "minute" &&
    mechanics.duration.value.amount === 1
  );
}

function fallingCreatureMitigationReactionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "triggered_reaction" }>,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "triggered_reaction" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitFallingCreatureMitigationReactionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "fallingCreatureMitigationReaction",
  FallingCreatureMitigationReactionMechanicsFacts,
  FallingCreatureMitigationReactionInvocation,
  ReturnType<typeof fallingCreatureMitigationReactionIssueResult>
> {
  if (
    !fallingCreatureMitigationReactionSemanticCandidate(source.mechanics) &&
    !fallingCreatureMitigationReactionDistinctiveHeaderFallback(
      source.mechanics,
    )
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "triggered_reaction") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      fallingCreatureMitigationReactionSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const targetSelectionAdmission: FallingTargetSelectionAdmission =
    phase === undefined
      ? { tag: "unavailable" }
      : admitFallingTargetSelection(phaseOrdinal, phase);
  const issues: FallingCreatureMitigationReactionMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: FallingCreatureMitigationReactionFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "transmutation") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!isFallingRange(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== false ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      FALLING_COMPONENT_FIELDS,
    ) ||
    ("materialCostGp" in mechanics.components &&
      mechanics.components.materialCostGp !== undefined) ||
    ("materialConsumed" in mechanics.components &&
      mechanics.components.materialConsumed === true)
  ) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(
      mechanics.components,
    )) {
      pushIssue("components", path);
    }
  }
  if (!isFallingDuration(mechanics.duration)) {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
      pushIssue("durationValue", path);
    }
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      pushIssue(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      );
    }
  }
  if (
    mechanics.castingTime.kind !== "reaction" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      FALLING_CASTING_TIME_FIELDS,
    ) ||
    mechanics.castingTime.trigger.kind !== "self_or_visible_creature_falls" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime.trigger,
      FALLING_TRIGGER_FIELDS,
    ) ||
    mechanics.castingTime.trigger.rangeFeet !== 60
  ) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.interruptsTrigger !== true) {
    pushIssue("interruptsTrigger", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === directPhaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (directPhaseIndex < 0) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else if (directPhaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  if (phase === undefined) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else {
    if (!spellMechanicsObjectHasOnlyKeys(phase, FALLING_PHASE_FIELDS)) {
      pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
    }
    if (targetSelectionAdmission.tag === "rejected") {
      pushIssue("targetSelection", targetSelectionAdmission.mechanicsPath);
    }
    const effects = phase.effects ?? [];
    const mitigationIndex = effects.findIndex(
      (effect) => effect.kind === "feather_fall_mitigation",
    );
    if (effects.length !== 1) {
      if (effects.length === 0) {
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      }
      for (const [index] of effects.entries()) {
        if (index === mitigationIndex) continue;
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
      }
    }
    const mitigation =
      mitigationIndex < 0 ? undefined : effects[mitigationIndex];
    if (
      mitigation?.kind !== "feather_fall_mitigation" ||
      mitigation.descentRateCapFeetPerRound !== 60 ||
      mitigation.landingOutcome !== "no_fall_damage_and_end_for_target" ||
      !spellMechanicsObjectHasOnlyKeys(mitigation, FALLING_EFFECT_FIELDS)
    ) {
      pushIssue(
        "effect",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(mitigationIndex < 0 ? 1 : mitigationIndex + 1),
        ),
      );
    }
  }

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      fallingCreatureMitigationReactionIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    !isFallingRange(mechanics.range) ||
    !isFallingDuration(mechanics.duration)
  ) {
    return {
      tag: "unsupported",
      issues: [
        fallingCreatureMitigationReactionIssueResult({
          failedFact: !isFallingRange(mechanics.range) ? "range" : "duration",
          mechanicsPath: !isFallingRange(mechanics.range)
            ? spellMechanicsHeaderPath("range")
            : spellMechanicsHeaderPath("duration"),
        }),
      ],
    };
  }
  if (phase === undefined) {
    return {
      tag: "unsupported",
      issues: [
        fallingCreatureMitigationReactionIssueResult({
          failedFact: "phase",
          mechanicsPath: spellActivationPhasePath(phaseOrdinal),
        }),
      ],
    };
  }
  if (targetSelectionAdmission.tag !== "admitted") {
    return {
      tag: "unsupported",
      issues: [
        fallingCreatureMitigationReactionIssueResult({
          failedFact: "targetSelection",
          mechanicsPath:
            targetSelectionAdmission.tag === "rejected"
              ? targetSelectionAdmission.mechanicsPath
              : spellActivationAttachmentPath(phaseOrdinal),
        }),
      ],
    };
  }
  const facts = {
    level: mechanics.level,
    range: mechanics.range,
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.value,
    ),
    maxTargets: targetSelectionAdmission.maxTargets,
  } satisfies FallingCreatureMitigationReactionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "fallingCreatureMitigationReaction",
      facts,
      evidence: fallingCreatureMitigationReactionMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitFallingCreatureMitigationReaction(executionSource, ctx, facts),
    },
  };
}

/* v8 ignore start -- @preserve -- Reaction-only profile: Feather Fall candidates are admitted from creature-falls interrupt frames, so ordinary turn discovery must return no acts. */
function discoverFallingCreatureMitigationReactionCastAct(): readonly AvailableBattleAct[] {
  return [];
}
/* v8 ignore stop -- @preserve */

function resolveFallingCreatureMitigationReaction(
  input: FallingCreatureMitigationReactionResolveInput,
): BattleResolutionResult {
  if (
    input.input.frame.trigger !== "creatureFalls" ||
    !fallingCreatureMitigationReactionSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "triggered fall arrest requires a matching falling Reaction trigger.",
    );
  }
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.input.subject.reactorId,
    invocation: input.invocation,
    invalidFillMessage:
      "Falling-creature mitigation reaction uses only falling target-list fills.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected: BattleState = targetSelection.targetIds.reduce(
    (state, targetId) =>
      replaceTargetSpellActiveEffect(state, targetId, () => false, {
        ...input.invocation.activeEffect,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
      }),
    castingState,
  );
  return Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) => {
      const resourced = spendSpellAccessFreeCastResource(
        effected,
        input.input.subject.reactorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      );
      return resourced.tag === "invalid"
        ? resourced
        : {
            tag: "resolved" as const,
            state: resourced.state,
            snapshot: snapshotBattle(resourced.state),
          };
    }),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) =>
      completeReactionSpellSlotCast({
        effectedState: effected,
        errorState: input.input.state,
        casterId: input.input.subject.reactorId,
        slotLevel,
      }),
    ),
    Match.exhaustive,
  );
}

const FallingCreatureMitigationReactionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("fallingCreatureMitigationReaction"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(5),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("fallingCreatureMitigationReaction"),
        sourceCombatantId: CombatantId,
        expiresAt: DurationBattleActiveEffectExpirationSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const fallingCreatureMitigationReactionProfile = {
  procedure: "fallingCreatureMitigationReaction",
  executionSchema: FallingCreatureMitigationReactionInvocationSchema,
  admitMechanics: admitFallingCreatureMitigationReactionMechanics,
  discoverCastAct: discoverFallingCreatureMitigationReactionCastAct,
  resolve: resolveFallingCreatureMitigationReaction,
} satisfies SpellProcedureDeclaration<
  "fallingCreatureMitigationReaction",
  FallingCreatureMitigationReactionInvocation,
  FallingCreatureMitigationReactionMechanicsFacts,
  ReturnType<typeof fallingCreatureMitigationReactionIssueResult>
>;
