import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  CastingTime,
  Components,
  DiceDelta,
  Duration,
  EffectAtom,
  ReactionTrigger,
  Range,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.reaction-shield
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME
//
// The Shield Reaction Spell Procedure Profile: a prepared Reaction spell that
// responds to an attack-roll hit or Magic Missile targeting, grants a
// one-round Armor Class bonus to the caster, and negates Magic Missile damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Shield": Reaction when hit by an attack roll or
//     targeted by Magic Missile; range Self; V/S components; one-round
//     duration; +5 AC until the start of the caster's next turn, including
//     against the triggering attack; no Magic Missile damage.
//   - SRD 5.2.1 Playing the Game "Reactions": a Reaction is an instant
//     response to a trigger and an interrupting Reaction returns control after
//     the Reaction.
//   - UBIQUITOUS_LANGUAGE.md: Reaction, Armor Class (AC), Casting Time.

import { Match, Schema } from "effect";
import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { applyTriggeredArmorDefenseSpellActiveEffect } from "../spells-active-effects.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { completeReactionSpellSlotCast } from "../reaction-spell-resolution.ts";
import { triggeredArmorDefenseSpellMatchesTrigger } from "../triggered-armor-defense-reaction.ts";
import { spendSpellAccessFreeCastResource } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

// Required SRD cross-record reference: Shield explicitly also triggers when
// targeted by the Magic Missile spell.
const SHIELD_MAGIC_MISSILE_SPELL_ID = unitId("magic_missile");
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  isSpellCanonicalDurationValue,
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

type TriggeredArmorDefenseInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "triggeredArmorDefense" }
>;
type TriggeredArmorDefensePhase = Extract<
  Extract<
    SpellMechanics,
    { readonly family: "triggered_reaction" }
  >["phases"][number],
  { readonly kind: "direct" }
>;
type TriggeredArmorDefenseResolveInput =
  SpellProcedureProfileResolveInput<TriggeredArmorDefenseInvocation>;

type TriggeredArmorDefenseRange = Extract<Range, { readonly kind: "self" }>;
type TriggeredArmorDefenseDuration = Extract<
  Duration,
  { readonly kind: "timed" }
> & {
  readonly value: SpellCanonicalDurationValue & {
    readonly unit: "round";
    readonly amount: 1;
  };
};
type TriggeredArmorDefenseMechanicsFacts = {
  readonly level: SpellLevel;
  readonly armorClassBonus: number;
  readonly negatesRepeatedDamageAllocation: true;
};

function isTriggeredArmorRange(
  range: Range,
): range is TriggeredArmorDefenseRange {
  return (
    range.kind === "self" &&
    spellMechanicsObjectHasOnlyKeys(range, TRIGGERED_ARMOR_RANGE_FIELDS)
  );
}

export const TRIGGERED_ARMOR_DEFENSE_FAILED_FACTS = [
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
  "effects",
  "armorClassEffect",
  "negationEffect",
] as const;
type TriggeredArmorDefenseFailedFact =
  (typeof TRIGGERED_ARMOR_DEFENSE_FAILED_FACTS)[number];

type TriggeredArmorDefenseMechanicsIssue = {
  readonly failedFact: TriggeredArmorDefenseFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type TriggeredArmorComponents = Extract<Components, { readonly m: false }>;
type TriggeredArmorDurationValue = TriggeredArmorDefenseDuration["value"];
type TriggeredArmorReactionCastingTime = Extract<
  CastingTime,
  { readonly kind: "reaction" }
>;
type TriggeredArmorAnyOfTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "any_of" }
>;
type TriggeredArmorHitTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "hit_by_attack_roll" }
>;
type TriggeredArmorNamedTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "targeted_by_named_spell" }
>;
type TriggeredArmorPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
>;
type TriggeredArmorAttachment = Extract<Attachment, { readonly kind: "self" }>;
type TriggeredArmorAcEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_ac" }
>;
type TriggeredArmorAcDelta = Extract<
  DiceDelta,
  { readonly kind: "fixed_dice" }
>;
type TriggeredArmorNegationEffect = Extract<
  EffectAtom,
  { readonly kind: "negate_named_effect" }
>;

const TRIGGERED_ARMOR_RANGE_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof TriggeredArmorDefenseRange
>;
const TRIGGERED_ARMOR_DURATION_FIELDS = [
  "kind",
  "value",
] as const satisfies ReadonlyArray<keyof TriggeredArmorDefenseDuration>;
const TRIGGERED_ARMOR_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
] as const satisfies ReadonlyArray<keyof TriggeredArmorDurationValue>;
const TRIGGERED_ARMOR_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof TriggeredArmorComponents>;
const TRIGGERED_ARMOR_CASTING_TIME_FIELDS = [
  "kind",
  "trigger",
] as const satisfies ReadonlyArray<keyof TriggeredArmorReactionCastingTime>;
const TRIGGERED_ARMOR_ANY_OF_TRIGGER_FIELDS = [
  "kind",
  "triggers",
] as const satisfies ReadonlyArray<keyof TriggeredArmorAnyOfTrigger>;
const TRIGGERED_ARMOR_HIT_TRIGGER_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof TriggeredArmorHitTrigger>;
const TRIGGERED_ARMOR_NAMED_TRIGGER_FIELDS = [
  "kind",
  "spellId",
] as const satisfies ReadonlyArray<keyof TriggeredArmorNamedTrigger>;
const TRIGGERED_ARMOR_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
] as const satisfies ReadonlyArray<keyof TriggeredArmorPhase>;
const TRIGGERED_ARMOR_ATTACHMENT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof TriggeredArmorAttachment>;
const TRIGGERED_ARMOR_AC_EFFECT_FIELDS = [
  "kind",
  "delta",
] as const satisfies ReadonlyArray<keyof TriggeredArmorAcEffect>;
const TRIGGERED_ARMOR_NEGATION_EFFECT_FIELDS = [
  "kind",
  "spellId",
  "scope",
] as const satisfies ReadonlyArray<keyof TriggeredArmorNegationEffect>;
const TRIGGERED_ARMOR_AC_DELTA_FIELDS = [
  "kind",
  "dice",
  "dieSize",
  "sign",
] as const satisfies ReadonlyArray<keyof TriggeredArmorAcDelta>;

function admitTriggeredArmorDefense(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: TriggeredArmorDefenseMechanicsFacts,
): readonly TriggeredArmorDefenseInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly TriggeredArmorDefenseInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "triggeredArmorDefense",
              spell,
              armorClassBonus: facts.armorClassBonus,
              negatesRepeatedDamageAllocation:
                facts.negatesRepeatedDamageAllocation,
            },
          ],
  );
}

function triggeredArmorDefenseIssueResult(
  issue: TriggeredArmorDefenseMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "triggeredArmorDefense";
  readonly failedFact: TriggeredArmorDefenseFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "triggeredArmorDefense",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported triggeredArmorDefense mechanics fact: ${issue.failedFact}.`,
  };
}

function isTriggeredArmorDuration(
  duration: Duration,
): duration is TriggeredArmorDefenseDuration {
  return (
    duration.kind === "timed" &&
    spellMechanicsObjectHasOnlyKeys(
      duration,
      TRIGGERED_ARMOR_DURATION_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.value,
      TRIGGERED_ARMOR_DURATION_VALUE_FIELDS,
    ) &&
    duration.value.unit === "round" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
  );
}

function shieldReactionTriggerIsExact(
  castingTime: Extract<CastingTime, { readonly kind: "reaction" }>,
): boolean {
  const trigger = castingTime.trigger;
  if (
    trigger.kind !== "any_of" ||
    trigger.triggers.length !== 2 ||
    !spellMechanicsObjectHasOnlyKeys(
      trigger,
      TRIGGERED_ARMOR_ANY_OF_TRIGGER_FIELDS,
    )
  ) {
    return false;
  }
  const hitTriggers = trigger.triggers.filter(
    (candidate) => candidate.kind === "hit_by_attack_roll",
  );
  const namedTriggers = trigger.triggers.filter(
    (candidate) => candidate.kind === "targeted_by_named_spell",
  );
  const hitTrigger = hitTriggers[0];
  const namedTrigger = namedTriggers[0];
  return (
    hitTriggers.length === 1 &&
    namedTriggers.length === 1 &&
    trigger.triggers.every(
      (candidate) =>
        candidate.kind === "hit_by_attack_roll" ||
        candidate.kind === "targeted_by_named_spell",
    ) &&
    hitTrigger !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      hitTrigger,
      TRIGGERED_ARMOR_HIT_TRIGGER_FIELDS,
    ) &&
    namedTrigger !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      namedTrigger,
      TRIGGERED_ARMOR_NAMED_TRIGGER_FIELDS,
    ) &&
    namedTrigger.spellId === SHIELD_MAGIC_MISSILE_SPELL_ID
  );
}

function triggeredArmorDefenseSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    ((mechanics.castingTime.kind === "reaction" &&
      mechanics.castingTime.trigger.kind === "any_of") ||
      mechanics.phases.some(
        (phase) =>
          phase.kind === "direct" && triggeredArmorDefenseSemanticPhase(phase),
      ))
  );
}

function triggeredArmorDefenseSemanticPhase(
  phase: TriggeredArmorDefensePhase,
): boolean {
  return (phase.effects ?? []).some(
    (effect) =>
      effect.kind === "modify_ac" || effect.kind === "negate_named_effect",
  );
}

function triggeredArmorDefenseDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    mechanics.level === 1 &&
    mechanics.school === "abjuration" &&
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false &&
    mechanics.castingTime.kind === "reaction" &&
    mechanics.range.kind === "self" &&
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "round" &&
    mechanics.duration.value.amount === 1 &&
    mechanics.interruptsTrigger === true
  );
}

function triggeredArmorDefenseMechanicsEvidence(
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

function admitTriggeredArmorDefenseMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "triggeredArmorDefense",
  TriggeredArmorDefenseMechanicsFacts,
  TriggeredArmorDefenseInvocation,
  ReturnType<typeof triggeredArmorDefenseIssueResult>
> {
  if (
    !triggeredArmorDefenseSemanticCandidate(source.mechanics) &&
    !triggeredArmorDefenseDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "triggered_reaction") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" && triggeredArmorDefenseSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const phaseEffects = phase?.effects ?? [];
  const projectedArmorEffect = phaseEffects.find(
    (effect) => effect.kind === "modify_ac",
  );
  const projectedNegationEffect = phaseEffects.find(
    (effect) => effect.kind === "negate_named_effect",
  );
  const issues: TriggeredArmorDefenseMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: TriggeredArmorDefenseFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "abjuration") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!isTriggeredArmorRange(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      TRIGGERED_ARMOR_COMPONENT_FIELDS,
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
  if (!isTriggeredArmorDuration(mechanics.duration)) {
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
  const castingTime =
    mechanics.castingTime.kind === "reaction"
      ? mechanics.castingTime
      : undefined;
  if (castingTime === undefined) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  } else if (
    !spellMechanicsObjectHasOnlyKeys(
      castingTime,
      TRIGGERED_ARMOR_CASTING_TIME_FIELDS,
    ) ||
    !shieldReactionTriggerIsExact(castingTime)
  ) {
    pushIssue("trigger", spellMechanicsHeaderPath("castingTime"));
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
    if (
      !spellMechanicsObjectHasOnlyKeys(phase, TRIGGERED_ARMOR_PHASE_FIELDS) ||
      phase.attachment.kind !== "self" ||
      !spellMechanicsObjectHasOnlyKeys(
        phase.attachment,
        TRIGGERED_ARMOR_ATTACHMENT_FIELDS,
      )
    ) {
      pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
    }
    const effects = phase.effects ?? [];
    const armorRoleIndices = effects.flatMap((effect, index) =>
      effect.kind === "modify_ac" ? [index] : [],
    );
    const negationRoleIndices = effects.flatMap((effect, index) =>
      effect.kind === "negate_named_effect" ? [index] : [],
    );
    const armorIndex = armorRoleIndices[0] ?? -1;
    const negationIndex = negationRoleIndices[0] ?? -1;
    const selectedRoleIndices = new Set(
      [armorIndex, negationIndex].filter((index) => index >= 0),
    );
    for (const [index] of effects.entries()) {
      if (!selectedRoleIndices.has(index)) {
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
      }
    }
    if (effects.length < 2) {
      for (let ordinal = effects.length + 1; ordinal <= 2; ordinal += 1) {
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(ordinal)),
        );
      }
    }
    if (armorIndex < 0) {
      pushIssue(
        "armorClassEffect",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
    if (negationIndex < 0) {
      pushIssue(
        "negationEffect",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(2)),
      );
    }
    const armorEffect = armorIndex < 0 ? undefined : effects[armorIndex];
    if (
      armorEffect?.kind !== "modify_ac" ||
      !spellMechanicsObjectHasOnlyKeys(
        armorEffect,
        TRIGGERED_ARMOR_AC_EFFECT_FIELDS,
      ) ||
      armorEffect.delta.kind !== "fixed_dice" ||
      !spellMechanicsObjectHasOnlyKeys(
        armorEffect.delta,
        TRIGGERED_ARMOR_AC_DELTA_FIELDS,
      ) ||
      armorEffect.delta.sign !== "+" ||
      armorEffect.delta.dice !== 5 ||
      armorEffect.delta.dieSize !== 1
    ) {
      pushIssue(
        "armorClassEffect",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(armorIndex < 0 ? 1 : armorIndex + 1),
        ),
      );
    }
    const negationEffect =
      negationIndex < 0 ? undefined : effects[negationIndex];
    if (
      negationEffect?.kind !== "negate_named_effect" ||
      !spellMechanicsObjectHasOnlyKeys(
        negationEffect,
        TRIGGERED_ARMOR_NEGATION_EFFECT_FIELDS,
      ) ||
      negationEffect.scope !== "damage_only" ||
      negationEffect.spellId !== SHIELD_MAGIC_MISSILE_SPELL_ID
    ) {
      pushIssue(
        "negationEffect",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(negationIndex < 0 ? 2 : negationIndex + 1),
        ),
      );
    }
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      triggeredArmorDefenseIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    !isTriggeredArmorRange(mechanics.range) ||
    !isTriggeredArmorDuration(mechanics.duration) ||
    phase === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        triggeredArmorDefenseIssueResult({
          failedFact: !isTriggeredArmorRange(mechanics.range)
            ? "range"
            : !isTriggeredArmorDuration(mechanics.duration)
              ? "duration"
              : "phase",
          mechanicsPath: !isTriggeredArmorRange(mechanics.range)
            ? spellMechanicsHeaderPath("range")
            : !isTriggeredArmorDuration(mechanics.duration)
              ? spellMechanicsHeaderPath("duration")
              : spellActivationPhasePath(phaseOrdinal),
        }),
      ],
    };
  }
  const armorClassBonus =
    projectedArmorEffect?.kind === "modify_ac" &&
    projectedArmorEffect.delta.kind === "fixed_dice"
      ? projectedArmorEffect.delta.dice
      : undefined;
  const negatesRepeatedDamageAllocation =
    projectedNegationEffect?.kind === "negate_named_effect" &&
    projectedNegationEffect.spellId === SHIELD_MAGIC_MISSILE_SPELL_ID &&
    projectedNegationEffect.scope === "damage_only";
  if (
    armorClassBonus === undefined ||
    negatesRepeatedDamageAllocation !== true
  ) {
    return {
      tag: "unsupported",
      issues: [
        triggeredArmorDefenseIssueResult({
          failedFact:
            armorClassBonus === undefined
              ? "armorClassEffect"
              : "negationEffect",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(
              Math.max(
                1,
                (armorClassBonus === undefined
                  ? phaseEffects.findIndex(
                      (effect) => effect.kind === "modify_ac",
                    )
                  : phaseEffects.findIndex(
                      (effect) => effect.kind === "negate_named_effect",
                    )) + 1,
              ),
            ),
          ),
        }),
      ],
    };
  }
  const facts = {
    level: mechanics.level,
    armorClassBonus,
    negatesRepeatedDamageAllocation,
  } satisfies TriggeredArmorDefenseMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "triggeredArmorDefense",
      facts,
      evidence: triggeredArmorDefenseMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitTriggeredArmorDefense(executionSource, ctx, facts),
    },
  };
}

/* v8 ignore start -- @preserve -- Reaction-only profile: Shield candidates are admitted from attack-hit or Magic Missile interrupt frames, so ordinary turn discovery must return no acts. */
function discoverTriggeredArmorDefenseCastAct(): readonly AvailableBattleAct[] {
  return [];
}
/* v8 ignore stop -- @preserve */

function resolveTriggeredArmorDefense(
  input: TriggeredArmorDefenseResolveInput,
): BattleResolutionResult {
  if (
    !triggeredArmorDefenseSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "attack-hit defense reaction requires a matching attack-hit or multi-projectile automatic-hit spell Reaction trigger.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-hit defense reaction accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected = applyTriggeredArmorDefenseSpellActiveEffect(
    castingState,
    input.input.subject.reactorId,
    input.invocation,
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

const TriggeredArmorDefenseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("triggeredArmorDefense"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    armorClassBonus: Schema.Number,
    negatesRepeatedDamageAllocation: Schema.Literal(true),
  }),
);
export const triggeredArmorDefenseProfile = {
  procedure: "triggeredArmorDefense",
  executionSchema: TriggeredArmorDefenseInvocationSchema,
  admitMechanics: admitTriggeredArmorDefenseMechanics,
  discoverCastAct: discoverTriggeredArmorDefenseCastAct,
  resolve: resolveTriggeredArmorDefense,
} satisfies SpellProcedureDeclaration<
  "triggeredArmorDefense",
  TriggeredArmorDefenseInvocation,
  TriggeredArmorDefenseMechanicsFacts,
  ReturnType<typeof triggeredArmorDefenseIssueResult>
>;
