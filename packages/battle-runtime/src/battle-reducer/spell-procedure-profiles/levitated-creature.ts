import { openReactionThenResolveWillingTargetSave } from "../willing-target-save-gate.ts";
import { replaceTargetActiveEffectsEndingDisplacedConcentrations } from "../active-effect-replacement.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import { fillsBelongToDeclaredHoles } from "../fill-hole-protocol.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "../battle-runtime-protocol.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
//
// The controlledVerticalSuspension Spell Procedure Profile: a prepared Magic Action spell
// that suspends one visible creature target, stores spell-owned altitude state,
// and gates initial rise, target movement, caster altitude control, and cleanup
// through caller/table-supplied witnesses.

import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, MovementFeet, PositiveInteger } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  Duration,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type ControlledVerticalSuspensionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import {
  invalidResult,
  resolvedResult,
  resolutionFromStateResult,
} from "../result-helpers.ts";
import {
  CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CONTROL_FEET,
  CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_ID,
  CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_FEET,
  controlledVerticalSuspensionInitialRiseHole,
} from "../controlled-vertical-suspension.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type ControlledVerticalSuspensionInvocation =
  ControlledVerticalSuspensionSpellInvocation;
type ControlledVerticalSuspensionResolveInput =
  SpellProcedureProfileResolveInput<ControlledVerticalSuspensionInvocation>;

const CONTROLLED_VERTICAL_SUSPENSION_SPELL_LEVEL = 2 satisfies SpellLevel;
const CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET = movementFeet(60);
const CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES_VALUE = 10;
type ControlledVerticalSuspensionDurationMinutes = PositiveInteger &
  typeof CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES_VALUE;
const CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES = PositiveInteger(
  CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES_VALUE,
);

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type ActivationSaveGate = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "save_gate" }
>;
type SuspensionDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly unit: "minute";
    readonly amount: ControlledVerticalSuspensionDurationMinutes;
  };
};
type SuspensionFacts = SpellProcedureMechanicsFacts & {
  readonly duration: SuspensionDuration;
  readonly rangeFeet: MovementFeet;
  readonly ability: "con";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly maxInitialRiseFeet: MovementFeet;
  readonly maxAltitudeChangeFeet: MovementFeet;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for SuspensionFailedFact.
const SUSPENSION_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "phaseCount",
  "phase",
  "saveAbility",
  "saveDc",
  "saveAppliesIf",
  "successOutcome",
  "repeatSave",
  "attachment",
  "targetSelection",
  "creatureTarget",
  "looseObjectTarget",
  "levitation",
  "initialRise",
  "suspension",
  "targetMovement",
  "casterAltitudeControl",
  "selfAltitudeControl",
  "ending",
] as const;
type SuspensionFailedFact = (typeof SUSPENSION_FAILED_FACTS)[number];
type SuspensionIssue = SpellProcedureAdmissionIssue<
  "controlledVerticalSuspension",
  SuspensionFailedFact,
  UnitMechanicsPath
>;

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = ["kind", "upTo"] as const;
const DURATION_VALUE_FIELDS = ["amount", "unit"] as const;
const PHASE_FIELDS = [
  "kind",
  "ability",
  "dc",
  "saveAppliesIf",
  "attachment",
  "onSuccess",
  "onFail",
] as const;
const TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "objectFilter",
] as const;
const LEVITATION_FIELDS = [
  "kind",
  "initialRiseMaxFeet",
  "suspension",
  "targetMovement",
  "casterAltitudeControl",
  "selfAltitudeControl",
  "ending",
] as const;

function suspensionIssue(
  failedFact: SuspensionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SuspensionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "controlledVerticalSuspension",
    failedFact,
    mechanicsPath,
    message: `Unsupported controlledVerticalSuspension mechanics fact: ${failedFact}.`,
  };
}

function suspensionRepresentation(
  mechanics: SpellMechanics,
): mechanics is ActivationSpellMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) => {
      const phase = activation.phases.find(
        (candidate): candidate is ActivationSaveGate =>
          candidate.kind === "save_gate" &&
          candidate.onFail.kind === "levitate_target",
      );
      return spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              activation.level === CONTROLLED_VERTICAL_SUSPENSION_SPELL_LEVEL &&
              activation.school === "transmutation",
          },
          {
            name: "range",
            present:
              activation.range.kind === "point" &&
              activation.range.feet ===
                CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET,
          },
          {
            name: "duration",
            present:
              activation.duration.kind === "concentration" &&
              activation.duration.upTo.unit === "minute" &&
              activation.duration.upTo.amount ===
                CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES,
          },
          {
            name: "saveGate",
            present:
              phase?.ability === "con" &&
              phase.saveAppliesIf === "unwilling_creature_target",
          },
          {
            name: "levitation",
            present: phase?.onFail.kind === "levitate_target",
          },
        ],
      });
    }),
    Match.whenOr(
      { family: "ongoing_effect" },
      { family: "modal_ongoing_effect" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function suspensionDuration(
  duration: Duration,
): SuspensionDuration | undefined {
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    !isControlledVerticalSuspensionDurationAmount(duration.upTo.amount)
  )
    return undefined;
  return {
    kind: duration.kind,
    upTo: {
      amount: duration.upTo.amount,
      unit: duration.upTo.unit,
    },
  };
}

function isControlledVerticalSuspensionDurationAmount(
  amount: PositiveInteger,
): amount is ControlledVerticalSuspensionDurationMinutes {
  return amount === CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES;
}

function suspensionEvidence(
  mechanics: ActivationSpellMechanics,
): SpellProcedureMechanicsEvidence {
  const phase = PositiveInteger(1);
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      ...spellDurationEvidencePaths(mechanics.duration),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
      spellActivationPhasePath(phase),
      spellActivationEffectPath(phase, PositiveInteger(1)),
    ],
    unowned: [spellActivationAttachmentPath(phase)],
  };
}

function admitSuspensionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "controlledVerticalSuspension",
  SuspensionFacts,
  ControlledVerticalSuspensionInvocation,
  SuspensionIssue
> {
  if (!suspensionRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: SuspensionFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const push = (
    failedFact: SuspensionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== CONTROLLED_VERTICAL_SUSPENSION_SPELL_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "transmutation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number" ||
    mechanics.range.feet !== CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);

  const duration = suspensionDuration(mechanics.duration);
  if (mechanics.duration.kind !== "concentration")
    push("duration", spellMechanicsHeaderPath("duration"));
  else {
    if (!spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS))
      push("duration", spellMechanicsHeaderPath("duration"));
    if (
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.duration.upTo,
        DURATION_VALUE_FIELDS,
      ) ||
      !isSpellCanonicalDurationValue(mechanics.duration.upTo) ||
      mechanics.duration.upTo.unit !== "minute" ||
      mechanics.duration.upTo.amount !==
        CONTROLLED_VERTICAL_SUSPENSION_DURATION_MINUTES
    )
      push("durationValue", spellDurationValuePath());
  }
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const semanticIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "save_gate" &&
      candidate.onFail.kind === "levitate_target",
  );
  const saveIndex = mechanics.phases.findIndex(
    (candidate) => candidate.kind === "save_gate",
  );
  const inspectedIndex =
    semanticIndex >= 0 ? semanticIndex : saveIndex >= 0 ? saveIndex : 0;
  const phaseOrdinal = PositiveInteger(inspectedIndex + 1);
  const phase = mechanics.phases[inspectedIndex];
  if (mechanics.phases.length === 0)
    push("phaseCount", spellActivationPhasePath(phaseOrdinal));
  for (const [index] of mechanics.phases.entries())
    if (index !== inspectedIndex)
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
  if (phase?.kind !== "save_gate")
    push("phase", spellActivationPhasePath(phaseOrdinal));
  else {
    const phasePath = spellActivationPhasePath(phaseOrdinal);
    if (!spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS))
      push("phase", phasePath);
    if (phase.ability !== "con") push("saveAbility", phasePath);
    if (
      phase.dc.kind !== "caster_spell_save_dc" ||
      !spellMechanicsObjectHasOnlyKeys(phase.dc, ["kind"])
    )
      push("saveDc", phasePath);
    if (phase.saveAppliesIf !== "unwilling_creature_target")
      push("saveAppliesIf", phasePath);
    if (
      phase.onSuccess.kind !== "none" ||
      !spellMechanicsObjectHasOnlyKeys(phase.onSuccess, ["kind"])
    )
      push("successOutcome", phasePath);
    for (const [index] of (phase.repeatSaves ?? []).entries())
      push(
        "repeatSave",
        spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
      );

    const attachmentPath = spellActivationAttachmentPath(phaseOrdinal);
    const admittedAttachment = admitSpellTargetAttachment(
      phase.attachment,
      TARGET_SELECTION_FIELDS,
    );
    if (admittedAttachment.tag === "rejected")
      push("attachment", attachmentPath);
    const selection =
      admittedAttachment.tag === "admitted"
        ? admittedAttachment.attachment.value.selection
        : phase.attachment.kind === "hole" &&
            phase.attachment.value.kind === "target"
          ? phase.attachment.value.selection
          : undefined;
    if (selection !== undefined) {
      if (selection.mode !== "one") push("targetSelection", attachmentPath);
      if (
        selection.targetKinds === undefined ||
        !sameStringSet(selection.targetKinds, ["creature", "object"])
      )
        push("creatureTarget", attachmentPath);
      const objectFilter =
        "objectFilter" in selection ? selection.objectFilter : undefined;
      if (
        objectFilter?.targetRelation !== "loose" ||
        objectFilter.maxWeightPounds !== 500 ||
        !spellMechanicsObjectHasOnlyKeys(objectFilter, [
          "targetRelation",
          "maxWeightPounds",
        ])
      )
        push("looseObjectTarget", attachmentPath);
    }

    const effectPath = spellActivationEffectPath(
      phaseOrdinal,
      PositiveInteger(1),
    );
    const effect = phase.onFail;
    if (effect.kind !== "levitate_target") {
      push("levitation", effectPath);
    } else {
      if (!spellMechanicsObjectHasOnlyKeys(effect, LEVITATION_FIELDS))
        push("levitation", effectPath);
      if (
        effect.initialRiseMaxFeet !==
        CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_FEET
      )
        push("initialRise", effectPath);
      if (effect.suspension !== "spell_duration")
        push("suspension", effectPath);
      if (
        effect.targetMovement.allowedBy !==
          "push_or_pull_fixed_object_or_surface_within_reach" ||
        effect.targetMovement.movementMode !== "as_if_climbing" ||
        !spellMechanicsObjectHasOnlyKeys(effect.targetMovement, [
          "allowedBy",
          "movementMode",
        ])
      )
        push("targetMovement", effectPath);
      if (
        effect.casterAltitudeControl.maxDistanceFeet !==
          CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CONTROL_FEET ||
        effect.casterAltitudeControl.direction !== "up_or_down" ||
        effect.casterAltitudeControl.cost !== "magic_action_on_caster_turn" ||
        effect.casterAltitudeControl.targetMustRemainWithinSpellRange !==
          true ||
        !spellMechanicsObjectHasOnlyKeys(effect.casterAltitudeControl, [
          "maxDistanceFeet",
          "direction",
          "cost",
          "targetMustRemainWithinSpellRange",
        ])
      )
        push("casterAltitudeControl", effectPath);
      if (
        effect.selfAltitudeControl.maxDistanceFeet !==
          CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CONTROL_FEET ||
        effect.selfAltitudeControl.direction !== "up_or_down" ||
        effect.selfAltitudeControl.cost !== "part_of_move" ||
        !spellMechanicsObjectHasOnlyKeys(effect.selfAltitudeControl, [
          "maxDistanceFeet",
          "direction",
          "cost",
        ])
      )
        push("selfAltitudeControl", effectPath);
      if (effect.ending !== "float_gently_to_ground_if_aloft")
        push("ending", effectPath);
    }
  }

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        nonEmpty,
        ({ failedFact, mechanicsPath }) =>
          suspensionIssue(failedFact, mechanicsPath),
      ),
    };
  const levitation =
    phase?.kind === "save_gate" && phase.onFail.kind === "levitate_target"
      ? phase.onFail
      : undefined;
  const ability =
    phase?.kind === "save_gate" && phase.ability === "con"
      ? phase.ability
      : undefined;
  const dc =
    phase?.kind === "save_gate" && phase.dc.kind === "caster_spell_save_dc"
      ? phase.dc
      : undefined;
  const rangeFeet =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET
      ? CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET
      : undefined;
  if (
    duration === undefined ||
    phase?.kind !== "save_gate" ||
    levitation === undefined ||
    ability === undefined ||
    dc === undefined ||
    rangeFeet === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        suspensionIssue(
          duration === undefined ? "duration" : "phase",
          duration === undefined
            ? spellMechanicsHeaderPath("duration")
            : spellActivationPhasePath(phaseOrdinal),
        ),
      ],
    };
  const facts = {
    ...source.spellDefinitionRuleFacts,
    level: CONTROLLED_VERTICAL_SUSPENSION_SPELL_LEVEL,
    duration,
    rangeFeet,
    ability,
    dc,
    maxInitialRiseFeet: CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_FEET,
    maxAltitudeChangeFeet: CONTROLLED_VERTICAL_SUSPENSION_ALTITUDE_CONTROL_FEET,
  } satisfies SuspensionFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "controlledVerticalSuspension",
      facts,
      evidence: suspensionEvidence(mechanics),
      admit: (executionSource, context) =>
        admitControlledVerticalSuspension(executionSource, context, facts),
    },
  };
}

function admitControlledVerticalSuspension(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SuspensionFacts,
): readonly ControlledVerticalSuspensionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ControlledVerticalSuspensionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              spell,
              actionCost: "magicAction",
              procedure: "controlledVerticalSuspension",
              ability: facts.ability,
              dc: facts.dc,
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              rangeFeet: facts.rangeFeet,
              maxAltitudeChangeFeet: facts.maxAltitudeChangeFeet,
              maxInitialRiseFeet: facts.maxInitialRiseFeet,
              activeEffect: {
                kind: "controlledVerticalSuspension",
                sourceCombatantId: ctx.actor.combatantId,
                expiresAt: {
                  kind: "concentration",
                  combatantId: ctx.actor.combatantId,
                  durationTicks: spellDurationTicksFromCanonicalValue(
                    facts.duration.upTo,
                  ),
                },
              },
            },
          ],
  );
}

function discoverControlledVerticalSuspensionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ControlledVerticalSuspensionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveControlledVerticalSuspension(
  input: ControlledVerticalSuspensionResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToDeclaredHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spellSavingThrowOutcomeHoleId(input.invocation),
      CONTROLLED_VERTICAL_SUSPENSION_INITIAL_RISE_HOLE_ID,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "ControlledVerticalSuspension's creature branch uses one target, one initial-rise fill, and, for unwilling targets, one Constitution Saving Throw fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelection = selectSingleSpellTarget({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    invalidTargetMessage: `ControlledVerticalSuspension creature target must be a combatant within ${Number(CONTROLLED_VERTICAL_SUSPENSION_RANGE_FEET)} feet that the caster can see.`,
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const target = targetSelection.target;

  const saveResolution = openReactionThenResolveWillingTargetSave({
    resolution: input,
    targetId: target.combatantId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
    willingTargetSaveMessage:
      "Willing ControlledVerticalSuspension creature targets do not make a Saving Throw.",
  });
  if (saveResolution.tag !== "saveGate") {
    return saveResolution;
  }
  const { saveGate } = saveResolution;
  if (saveGate.tag === "resolutionRequired") {
    return saveGate.resolution;
  }
  if (saveGate.tag === "unaffected") {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.fillSet.controlledVerticalSuspensionInitialRiseFeet !== undefined
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Successful ControlledVerticalSuspension creature saves are unaffected and do not use an initial-rise fill.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (input.storedGlyphRelease !== undefined) {
      return resolvedResult(input.input.state);
    }
    const resourced = spendSpellCastResources({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      startConcentration: false,
    });
    return resolutionFromStateResult(resourced);
  }

  if (input.fillSet.controlledVerticalSuspensionInitialRiseFeet === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      controlledVerticalSuspensionInitialRiseHole({
        actorId: input.actorId,
        targetId: target.combatantId,
        maxDistanceFeet: input.invocation.maxInitialRiseFeet,
      }),
    ]);
  }

  const concentrationBase =
    input.storedGlyphRelease !== undefined
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyControlledVerticalSuspensionSpellEffect(
    concentrationBase,
    input.actorId,
    [target.combatantId],
    input.invocation,
    input.fillSet.controlledVerticalSuspensionInitialRiseFeet,
    input.input.subject.procedureRef,
  );
  if (input.storedGlyphRelease !== undefined) {
    return resolvedResult(effected);
  }
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.storedGlyphRelease !== undefined
      ? { startConcentration: false }
      : {}),
  });
  return resolutionFromStateResult(resourced);
}

function applyControlledVerticalSuspensionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: ControlledVerticalSuspensionResolveInput["invocation"],
  initialRiseFeet: MovementFeet,
  procedureRef: ActionSpellBattleResolutionInput["subject"]["procedureRef"],
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const allocation = allocateBattleEffectExecutionRefForCreature({
      owner: target,
    });
    const allocatedTarget = allocation.owner;
    const allocatedState = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, allocatedTarget),
    };
    const nextEffect = {
      ...invocation.activeEffect,
      sourceProcedureRef: procedureRef,
      sourceCombatantId: actorId,
      effectRef: allocation.effectRef,
      altitudeFeet: initialRiseFeet,
    };
    const displacedEffects = allocatedTarget.activeEffects.filter(
      (effect) => effect.kind === "controlledVerticalSuspension",
    );
    const activeEffects = [
      ...allocatedTarget.activeEffects.filter(
        (effect) => effect.kind !== "controlledVerticalSuspension",
      ),
      nextEffect,
    ];
    return replaceTargetActiveEffectsEndingDisplacedConcentrations(
      allocatedState,
      targetId,
      activeEffects,
      displacedEffects,
    );
  }, state);
}

const ControlledVerticalSuspensionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("controlledVerticalSuspension"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("con"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("controlledVerticalSuspension"),
        sourceCombatantId: CombatantId,
        maxAltitudeChangeFeet: MovementFeet,
        rangeFeet: MovementFeet,
        expiresAt: Schema.Struct({
          kind: Schema.Literal("concentration"),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
      maxAltitudeChangeFeet: MovementFeet,
      maxInitialRiseFeet: MovementFeet,
      rangeFeet: MovementFeet,
    }),
  );
export const controlledVerticalSuspensionProfile: SpellProcedureDeclaration<
  "controlledVerticalSuspension",
  ControlledVerticalSuspensionInvocation,
  SuspensionFacts,
  SuspensionIssue
> = {
  procedure: "controlledVerticalSuspension",
  executionSchema: ControlledVerticalSuspensionInvocationSchema,
  admitMechanics: admitSuspensionMechanics,
  discoverCastAct: discoverControlledVerticalSuspensionCastAct,
  resolve: resolveControlledVerticalSuspension,
};
