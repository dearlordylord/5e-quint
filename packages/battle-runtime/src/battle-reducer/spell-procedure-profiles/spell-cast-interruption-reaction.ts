import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.reaction-counterspell
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
import { DcSourceSchema } from "@dnd/surface/surface/schema";
//
// The SpellCastInterruption Spell Procedure Profile: a prepared Reaction spell that
// interrupts a visible spell cast within range, asks for the
// triggering caster's Constitution Saving Throw, and ends the triggering spell
// on a failed save.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "SpellCastInterruption": Reaction when seeing a creature within
//     60 feet casting a spell with V/S/M components; range 60 feet; S
//     component; instantaneous; target makes a Constitution save; on failure
//     the spell dissipates with no effect and its action, Bonus Action, or
//     Reaction is wasted while a used slot is not expended.
//   - SRD 5.2.1 Playing the Game "Reactions": a Reaction is an instant
//     response to a trigger and an interrupting Reaction returns control after
//     the Reaction.
//   - UBIQUITOUS_LANGUAGE.md: Reaction, Casting Time, Cast Level.

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Result, Match } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleInterruptCheckpoint,
  type BattleInterruptCheckpointFrame,
  type BattleResolutionResult,
  type BattleState,
  type BattleTurnResources,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { isFixedDistancePointRange } from "@dnd/surface/surface/types";
import type {
  ActivationPhase,
  CastingTime,
  Components,
  DcSource,
  Duration,
  EffectAtom,
  FixedDistancePointRange,
  Range,
  ReactionTrigger,
  SaveSuccessOutcome,
  SpellLevel,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  snapshotBattle,
  interruptedProcedureSubject,
} from "../interrupt-execution.ts";
import { copyInterruptCheckpointIdentity } from "../interrupt-checkpoint-identity.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { spellCastInterruptionReactionReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import {
  spellSavingThrowOutcomeHole,
  spellSavingThrowOutcomeHoleId,
} from "../spells-damage-fills.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
import {
  markSpellSlotExpendedThisTurn,
  releasePendingSpellSlotUseThisTurn,
} from "../spell-turn-resources.ts";
import {
  commitSpellAccessFreeCastResourceUse,
  spendSpellAccessFreeCastResource,
  spendSpellCastMetamagicResources,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import { Schema } from "effect";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  type SpellAdmissionContext,
  type SpellProcedureDeclaration,
  type SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
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
import { spellInvocationResourceForCastOption } from "./profile.ts";

type SpellCastInterruptionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCastInterruptionReaction" }
>;
type SpellCastInterruptionSaveGate = Extract<
  Extract<
    SpellMechanics,
    { readonly family: "triggered_reaction" }
  >["phases"][number],
  { readonly kind: "save_gate" }
>;
type SpellCastInterruptionResolveInput =
  SpellProcedureProfileResolveInput<SpellCastInterruptionInvocation>;

type SpellCastInterruptionRange = FixedDistancePointRange;
type SpellCastInterruptionDc = Extract<
  DcSource,
  { readonly kind: "caster_spell_save_dc" }
>;
type SpellCastInterruptionMechanicsFacts = {
  readonly level: SpellLevel;
  readonly range: SpellCastInterruptionRange;
  readonly triggerComponents: readonly ("V" | "S" | "M")[];
  readonly ability: "con";
  readonly dc: SpellCastInterruptionDc;
};

export const SPELL_CAST_INTERRUPTION_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "trigger",
  "interruptsTrigger",
  "phase",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "saveGate",
  "saveOutcome",
  "effects",
] as const;
type SpellCastInterruptionFailedFact =
  (typeof SPELL_CAST_INTERRUPTION_FAILED_FACTS)[number];

type SpellCastInterruptionMechanicsIssue = {
  readonly failedFact: SpellCastInterruptionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type SpellCastInterruptionComponents = Extract<
  Components,
  { readonly m: false }
>;
type SpellCastInterruptionDuration = Extract<
  Duration,
  { readonly kind: "instantaneous" }
>;
type SpellCastInterruptionCastingTime = Extract<
  CastingTime,
  { readonly kind: "reaction" }
>;
type SpellCastInterruptionTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "creature_casts_spell" }
>;
type SpellCastInterruptionPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;
type SpellCastInterruptionFailure = Extract<
  EffectAtom,
  { readonly kind: "negate_triggering_spell" }
>;
type SpellCastInterruptionSuccess = Extract<
  SaveSuccessOutcome,
  { readonly kind: "none" }
>;
type SpellCastInterruptionTargetSelection = Extract<
  TargetSelection,
  { readonly mode: "one" }
>;

const SPELL_CAST_INTERRUPTION_TRIGGER_FIELDS = [
  "kind",
  "components",
  "requiresVisibleCaster",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionTrigger>;
const SPELL_CAST_INTERRUPTION_PHASE_FIELDS = [
  "kind",
  "attachment",
  "ability",
  "dc",
  "onFail",
  "onSuccess",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionPhase>;
const SPELL_CAST_INTERRUPTION_FAILURE_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionFailure>;
const SPELL_CAST_INTERRUPTION_SUCCESS_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionSuccess>;
const SPELL_CAST_INTERRUPTION_TARGET_SELECTION_FIELDS = [
  "mode",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionTargetSelection>;
const SPELL_CAST_INTERRUPTION_RANGE_FIELDS = [
  "kind",
  "feet",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionRange>;
const SPELL_CAST_INTERRUPTION_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionComponents>;
const SPELL_CAST_INTERRUPTION_DURATION_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionDuration>;
const SPELL_CAST_INTERRUPTION_CASTING_TIME_FIELDS = [
  "kind",
  "trigger",
] as const satisfies ReadonlyArray<keyof SpellCastInterruptionCastingTime>;

function admitSpellCastInterruption(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpellCastInterruptionMechanicsFacts,
): readonly SpellCastInterruptionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SpellCastInterruptionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "spellCastInterruptionReaction",
              spell,
              triggerComponents: facts.triggerComponents,
              ability: facts.ability,
              dc: facts.dc,
              targeting: { kind: "singleCombatant" },
              rangeFeet: movementFeet(facts.range.feet),
            },
          ],
  );
}

function spellCastInterruptionIssueResult(
  issue: SpellCastInterruptionMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "spellCastInterruptionReaction";
  readonly failedFact: SpellCastInterruptionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "spellCastInterruptionReaction",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported spellCastInterruptionReaction mechanics fact: ${issue.failedFact}.`,
  };
}

function isSpellCastInterruptionRange(
  range: Range,
): range is SpellCastInterruptionRange {
  return (
    isFixedDistancePointRange(range) &&
    spellMechanicsObjectHasOnlyKeys(
      range,
      SPELL_CAST_INTERRUPTION_RANGE_FIELDS,
    ) &&
    range.feet === 60
  );
}

function spellCastInterruptionSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    ((mechanics.castingTime.kind === "reaction" &&
      mechanics.castingTime.trigger.kind === "creature_casts_spell") ||
      mechanics.phases.some(
        (phase) =>
          phase.kind === "save_gate" &&
          spellCastInterruptionSemanticSaveGate(phase),
      ))
  );
}

function spellCastInterruptionSemanticSaveGate(
  phase: SpellCastInterruptionSaveGate,
): boolean {
  return phase.onFail.kind === "negate_triggering_spell";
}

function spellCastInterruptionDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    mechanics.level === 3 &&
    mechanics.school === "abjuration" &&
    mechanics.components.v === false &&
    mechanics.components.s === true &&
    mechanics.components.m === false &&
    mechanics.castingTime.kind === "reaction" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 60 &&
    mechanics.duration.kind === "instantaneous" &&
    mechanics.interruptsTrigger === true
  );
}

function admitSpellCastInterruptionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellCastInterruptionReaction",
  SpellCastInterruptionMechanicsFacts,
  SpellCastInterruptionInvocation,
  ReturnType<typeof spellCastInterruptionIssueResult>
> {
  if (
    !spellCastInterruptionSemanticCandidate(source.mechanics) &&
    !spellCastInterruptionDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "triggered_reaction") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const semanticSaveGateIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "save_gate" &&
      spellCastInterruptionSemanticSaveGate(phase),
  );
  const saveGateIndex =
    semanticSaveGateIndex >= 0
      ? semanticSaveGateIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "save_gate");
  const phaseIndexForInspection = saveGateIndex >= 0 ? saveGateIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase =
    inspectedPhase?.kind === "save_gate" ? inspectedPhase : undefined;
  const issues: SpellCastInterruptionMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: SpellCastInterruptionFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 3) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "abjuration") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!isSpellCastInterruptionRange(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== false ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      SPELL_CAST_INTERRUPTION_COMPONENT_FIELDS,
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
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      SPELL_CAST_INTERRUPTION_DURATION_FIELDS,
    )
  ) {
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
  const trigger =
    mechanics.castingTime.kind === "reaction"
      ? mechanics.castingTime.trigger
      : undefined;
  if (
    trigger?.kind !== "creature_casts_spell" ||
    mechanics.castingTime.kind !== "reaction" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SPELL_CAST_INTERRUPTION_CASTING_TIME_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      trigger,
      SPELL_CAST_INTERRUPTION_TRIGGER_FIELDS,
    ) ||
    ("requiresVisibleCaster" in trigger &&
      trigger.requiresVisibleCaster !== true) ||
    !sameStringSet(trigger.components, ["V", "S", "M"])
  ) {
    pushIssue("trigger", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.castingTime.kind !== "reaction") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.interruptsTrigger !== true) {
    pushIssue("interruptsTrigger", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === saveGateIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (saveGateIndex < 0) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else if (saveGateIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  if (phase === undefined) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else {
    if (
      !spellMechanicsObjectHasOnlyKeys(
        phase,
        SPELL_CAST_INTERRUPTION_PHASE_FIELDS,
      )
    ) {
      pushIssue("saveGate", spellActivationPhasePath(phaseOrdinal));
    }
    if (phase.ability !== "con" || phase.dc.kind !== "caster_spell_save_dc") {
      pushIssue("saveGate", spellActivationPhasePath(phaseOrdinal));
    }
    const attachmentAdmission = admitSpellTargetAttachment(
      phase.attachment,
      SPELL_CAST_INTERRUPTION_TARGET_SELECTION_FIELDS,
    );
    const selection =
      attachmentAdmission.tag === "admitted"
        ? attachmentAdmission.attachment.value.selection
        : undefined;
    if (attachmentAdmission.tag === "rejected" || selection?.mode !== "one") {
      pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
    }
    const failure = phase.onFail;
    if (
      failure.kind !== "negate_triggering_spell" ||
      !spellMechanicsObjectHasOnlyKeys(
        failure,
        SPELL_CAST_INTERRUPTION_FAILURE_FIELDS,
      )
    ) {
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
    const success = phase.onSuccess;
    if (
      success.kind !== "none" ||
      !spellMechanicsObjectHasOnlyKeys(
        success,
        SPELL_CAST_INTERRUPTION_SUCCESS_FIELDS,
      )
    ) {
      pushIssue("saveOutcome", spellActivationPhasePath(phaseOrdinal));
    }
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      spellCastInterruptionIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    !isSpellCastInterruptionRange(mechanics.range) ||
    phase === undefined ||
    phase.onFail.kind !== "negate_triggering_spell"
  ) {
    return {
      tag: "unsupported",
      issues: [
        spellCastInterruptionIssueResult({
          failedFact: phase === undefined ? "phase" : "range",
          mechanicsPath:
            phase === undefined
              ? spellActivationPhasePath(phaseOrdinal)
              : spellMechanicsHeaderPath("range"),
        }),
      ],
    };
  }
  const triggerComponents =
    mechanics.castingTime.kind === "reaction" &&
    mechanics.castingTime.trigger.kind === "creature_casts_spell"
      ? mechanics.castingTime.trigger.components
      : [];
  const ability = phase?.ability === "con" ? phase.ability : null;
  const dc = phase?.dc.kind === "caster_spell_save_dc" ? phase.dc : undefined;
  if (ability === null || dc === undefined || triggerComponents.length === 0) {
    return {
      tag: "unsupported",
      issues: [
        spellCastInterruptionIssueResult({
          failedFact:
            ability === null || dc === undefined ? "saveGate" : "trigger",
          mechanicsPath:
            ability === null || dc === undefined
              ? spellActivationPhasePath(phaseOrdinal)
              : spellMechanicsHeaderPath("castingTime"),
        }),
      ],
    };
  }
  const facts = {
    level: mechanics.level,
    range: mechanics.range,
    triggerComponents,
    ability,
    dc,
  } satisfies SpellCastInterruptionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spellCastInterruptionReaction",
      facts,
      evidence: spellCastInterruptionMechanicsEvidence(mechanics, phaseOrdinal),
      admit: (executionSource, ctx) =>
        admitSpellCastInterruption(executionSource, ctx, facts),
    },
  };
}

function spellCastInterruptionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "triggered_reaction" }>,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
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
    spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

/* v8 ignore start -- @preserve -- Reaction-only profile: SpellCastInterruption candidates are admitted from matching spell-cast interrupt frames, so ordinary turn discovery must return no acts. */
function discoverSpellCastInterruptionCastAct(): readonly BattleActDiscoveryCandidate[] {
  return [];
}
/* v8 ignore stop -- @preserve */

function resolveSpellCastInterruption(
  input: SpellCastInterruptionResolveInput,
): BattleResolutionResult {
  if (
    input.input.frame.trigger !== "spellCast" ||
    !spellCastInterruptionReactionReactionSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
      input.input.subject.reactorId,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "SpellCastInterruption requires a matching spell-cast Reaction trigger.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "SpellCastInterruption targets the caster from the spell-cast trigger and uses only that caster's Constitution Saving Throw when needed.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.input.subject.reactorId,
    input.invocation,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const validation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.input.subject.reactorId,
    input.input.frame.casterId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const outcome = input.fillSet.savingThrowOutcomes.outcomes[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcome === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "SpellCastInterruption requires the triggering caster's Saving Throw outcome.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const triggeringCasterSaveSucceeded = outcome.succeeded;

  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const resourced: SpellCastResourceSpendResult = Match.value(
    input.invocation.resource,
  ).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) =>
      spendSpellAccessFreeCastResource(
        castingState,
        input.input.subject.reactorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      ),
    ),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) => {
      const slotted = expendSpellSlot(
        castingState,
        input.input.subject.reactorId,
        slotLevel,
      );
      const nextTurnResources = markSpellSlotExpendedThisTurn(
        slotted.currentTurnResources,
        input.input.subject.reactorId,
      );
      if (Result.isFailure(nextTurnResources)) {
        return invalidResult(
          input.input.state,
          "staleSubject",
          "This turn has already expended a Spell Slot.",
        );
      }
      return {
        tag: "resolved" as const,
        state: {
          ...slotted,
          currentTurnResources: nextTurnResources.success,
        },
      };
    }),
    Match.exhaustive,
  );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const spellCastInterruptionReactionState = resourced.state;
  if (triggeringCasterSaveSucceeded) {
    return {
      tag: "resolved",
      state: spellCastInterruptionReactionState,
      snapshot: snapshotBattle(spellCastInterruptionReactionState),
    };
  }

  const counteredState = stateAfterCounteredSpellCast(
    spellCastInterruptionReactionState,
    input.input.frame,
  );
  if (counteredState.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "staleSubject",
      counteredState.message,
    );
  }
  return {
    tag: "resolved",
    state: counteredState.state,
    snapshot: snapshotBattle(counteredState.state),
  };
}

function stateAfterCounteredSpellCast(
  state: BattleState,
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const interruptFrame = state.interruptStack[state.interruptStack.length - 1];
  const spellCastCheckpoint =
    interruptFrame?.kind === "interruptCheckpoint"
      ? interruptFrame.frame
      : null;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellCastCheckpoint?.trigger !== "spellCast") {
    return {
      tag: "invalid",
      message:
        "SpellCastInterruption can only end the current spell-cast interrupt checkpoint.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const committedState = commitCounteredSpellPayment(state, frame);
  if (Result.isFailure(committedState)) {
    return { tag: "invalid", message: committedState.failure };
  }
  const releasedResources =
    frame.paymentCommitment.kind !== "pendingCasterSpellSlot"
      ? state.currentTurnResources
      : releasePendingSpellSlotUseThisTurn(
          state.currentTurnResources,
          frame.casterId,
        );
  const wastedResources = turnResourcesAfterWastedSpellCastingResource(
    releasedResources,
    frame,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Result.isFailure(wastedResources)) {
    return {
      tag: "invalid",
      message: wastedResources.failure,
    };
  }
  /* v8 ignore stop -- @preserve */
  const metamagicSpend = spendCounteredSpellMetamagic(
    committedState.success,
    wastedResources.success,
    frame,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Result.isFailure(metamagicSpend)) {
    return { tag: "invalid", message: metamagicSpend.failure };
  }
  /* v8 ignore stop -- @preserve */
  const spellCastInterruptionFrame = {
    ...spellCastCheckpoint,
    offeredResponders: spellCastCheckpoint.eligibleResponders,
    continuation: {
      kind: "resolved" as const,
      subject: interruptedProcedureSubject(spellCastCheckpoint.continuation),
    },
  } satisfies BattleInterruptCheckpoint;
  copyInterruptCheckpointIdentity(
    spellCastCheckpoint,
    spellCastInterruptionFrame,
  );
  return {
    tag: "ok",
    state: {
      ...metamagicSpend.success,
      interruptStack: [
        ...state.interruptStack.slice(0, -1),
        spellCastInterruptionReactionReactionInterruptFrame(
          spellCastInterruptionFrame,
        ),
      ],
    },
  };
}

function spendCounteredSpellMetamagic(
  state: BattleState,
  currentTurnResources: BattleState["currentTurnResources"],
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
): Result.Result<BattleState, string> {
  return spendSpellCastMetamagicResources({
    state: { ...state, currentTurnResources },
    actorId: frame.casterId,
    applications:
      frame.metamagicCommitment.kind === "none"
        ? []
        : frame.metamagicCommitment.applications,
  });
}

function commitCounteredSpellPayment(
  state: BattleState,
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
): Result.Result<BattleState, string> {
  if (frame.paymentCommitment.kind !== "spellAccessFreeCast") {
    return Result.succeed(state);
  }
  return commitSpellAccessFreeCastResourceUse({
    state,
    actorId: frame.casterId,
    resourcePoolRef: frame.paymentCommitment.resourcePoolRef,
  });
}

function turnResourcesAfterWastedSpellCastingResource(
  resources: BattleTurnResources,
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
): Result.Result<BattleTurnResources, string> {
  if (frame.castingResource.kind === "magicAction") {
    const spent = spendAction(resources, "magic");
    return Result.isFailure(spent)
      ? Result.fail(
          "Magic action is no longer available for the countered spell.",
        )
      : Result.succeed(spent.success);
  }
  if (frame.castingResource.kind === "bonusAction") {
    const spent = spendActivationResource(resources, { kind: "bonusAction" });
    return Result.isFailure(spent)
      ? Result.fail(
          "Bonus Action is no longer available for the countered spell.",
        )
      : Result.succeed(spent.success);
  }
  return Result.succeed(resources);
}

function spellCastInterruptionReactionReactionInterruptFrame(
  frame: BattleInterruptCheckpoint,
): BattleInterruptCheckpointFrame {
  return { kind: "interruptCheckpoint", frame };
}

const SpellCastInterruptionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("spellCastInterruptionReaction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    triggerComponents: Schema.Array(Schema.Literals(["V", "S", "M"])),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
    rangeFeet: MovementFeet,
  }),
);
export const spellCastInterruptionReactionProfile = {
  procedure: "spellCastInterruptionReaction",
  executionSchema: SpellCastInterruptionInvocationSchema,
  admitMechanics: admitSpellCastInterruptionMechanics,
  discoverCastAct: discoverSpellCastInterruptionCastAct,
  resolve: resolveSpellCastInterruption,
} satisfies SpellProcedureDeclaration<
  "spellCastInterruptionReaction",
  SpellCastInterruptionInvocation,
  SpellCastInterruptionMechanicsFacts,
  ReturnType<typeof spellCastInterruptionIssueResult>
>;
