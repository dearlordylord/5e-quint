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
type TriggeredArmorDefenseMechanics = Extract<
  SpellMechanics,
  { readonly family: "triggered_reaction" }
>;
type TriggeredArmorDefensePhase = Extract<
  TriggeredArmorDefenseMechanics["phases"][number],
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

function triggeredArmorReactionTriggerIsExact(
  castingTime: Extract<CastingTime, { readonly kind: "reaction" }>,
): boolean {
  const trigger = castingTime.trigger;
  if (trigger.kind !== "any_of") return false;
  if (trigger.triggers.length !== 2) return false;
  if (
    !spellMechanicsObjectHasOnlyKeys(
      trigger,
      TRIGGERED_ARMOR_ANY_OF_TRIGGER_FIELDS,
    )
  ) {
    return false;
  }
  const hitTrigger = trigger.triggers.find(
    (candidate) => candidate.kind === "hit_by_attack_roll",
  );
  const namedTrigger = trigger.triggers.find(
    (candidate) => candidate.kind === "targeted_by_named_spell",
  );
  if (hitTrigger === undefined) return false;
  if (namedTrigger === undefined) return false;
  return [
    spellMechanicsObjectHasOnlyKeys(
      hitTrigger,
      TRIGGERED_ARMOR_HIT_TRIGGER_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      namedTrigger,
      TRIGGERED_ARMOR_NAMED_TRIGGER_FIELDS,
    ),
    namedTrigger.spellId === SHIELD_MAGIC_MISSILE_SPELL_ID,
  ].every(Boolean);
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
  if (mechanics.family !== "triggered_reaction") return false;
  if (mechanics.duration.kind !== "timed") return false;
  return [
    mechanics.level === 1,
    mechanics.school === "abjuration",
    mechanics.components.v === true,
    mechanics.components.s === true,
    mechanics.components.m === false,
    mechanics.castingTime.kind === "reaction",
    mechanics.range.kind === "self",
    mechanics.duration.value.unit === "round",
    mechanics.duration.value.amount === 1,
    mechanics.interruptsTrigger === true,
  ].every(Boolean);
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

type TriggeredArmorDefenseIssuePush = (
  failedFact: TriggeredArmorDefenseFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
) => void;

function triggeredArmorDefenseRepresentedMechanics(
  mechanics: SpellMechanics,
): TriggeredArmorDefenseMechanics | undefined {
  if (
    !triggeredArmorDefenseSemanticCandidate(mechanics) &&
    !triggeredArmorDefenseDistinctiveHeaderFallback(mechanics)
  )
    return undefined;
  return mechanics.family === "triggered_reaction" ? mechanics : undefined;
}

function triggeredArmorDefensePhaseEffects(
  phase: TriggeredArmorDefensePhase | undefined,
): NonNullable<TriggeredArmorDefensePhase["effects"]> | [] {
  return phase?.effects ?? [];
}

function triggeredArmorDefenseSelectedPhase(
  mechanics: TriggeredArmorDefenseMechanics,
) {
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" && triggeredArmorDefenseSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  return {
    directPhaseIndex,
    phaseOrdinal: PositiveInteger(phaseIndexForInspection + 1),
    phase: inspectedPhase?.kind === "direct" ? inspectedPhase : undefined,
  };
}

function triggeredArmorDefenseIdentityHeaderIssues(
  mechanics: TriggeredArmorDefenseMechanics,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (mechanics.level !== 1)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  if (!isTriggeredArmorRange(mechanics.range))
    pushIssue("range", spellMechanicsHeaderPath("range"));
}

function triggeredArmorDefenseComponentIssues(
  mechanics: TriggeredArmorDefenseMechanics,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (!triggeredArmorDefenseComponentsAreExact(mechanics)) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
      pushIssue("components", path);
  }
}

function triggeredArmorDefenseComponentsAreExact(
  mechanics: TriggeredArmorDefenseMechanics,
): boolean {
  return (
    (mechanics.components.v !== true ||
      mechanics.components.s !== true ||
      mechanics.components.m !== false ||
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.components,
        TRIGGERED_ARMOR_COMPONENT_FIELDS,
      ) ||
      triggeredArmorDefenseHasMaterialMetadata(mechanics)) === false
  );
}

function triggeredArmorDefenseHasMaterialMetadata(
  mechanics: TriggeredArmorDefenseMechanics,
): boolean {
  return (
    ("materialCostGp" in mechanics.components &&
      mechanics.components.materialCostGp !== undefined) ||
    ("materialConsumed" in mechanics.components &&
      mechanics.components.materialConsumed === true)
  );
}

function triggeredArmorDefenseDurationIssues(
  mechanics: TriggeredArmorDefenseMechanics,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (isTriggeredArmorDuration(mechanics.duration)) return;
  pushIssue("duration", spellMechanicsHeaderPath("duration"));
  for (const path of spellDurationValueEvidencePaths(mechanics.duration))
    pushIssue("durationValue", path);
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    pushIssue(
      spellDurationChildFailedFact(child),
      spellDurationChildPath(child),
    );
}

function triggeredArmorDefenseCastingTimeIssues(
  mechanics: TriggeredArmorDefenseMechanics,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
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
    !triggeredArmorReactionTriggerIsExact(castingTime)
  ) {
    pushIssue("trigger", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.interruptsTrigger !== true)
    pushIssue("interruptsTrigger", spellMechanicsHeaderPath("family"));
}

function triggeredArmorDefensePhaseCardinalityIssues(
  mechanics: TriggeredArmorDefenseMechanics,
  directPhaseIndex: number,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === directPhaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.phases.length === 0)
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
  }
  if (directPhaseIndex < 0)
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  else if (directPhaseIndex !== 0)
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
}

function triggeredArmorDefensePhaseAttachmentIssues(
  phase: TriggeredArmorDefensePhase,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (
    !spellMechanicsObjectHasOnlyKeys(phase, TRIGGERED_ARMOR_PHASE_FIELDS) ||
    phase.attachment.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(
      phase.attachment,
      TRIGGERED_ARMOR_ATTACHMENT_FIELDS,
    )
  )
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
}

function triggeredArmorDefenseEffectRoleIndices(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
) {
  const armorRoleIndices = effects.flatMap((effect, index) =>
    effect.kind === "modify_ac" ? [index] : [],
  );
  const negationRoleIndices = effects.flatMap((effect, index) =>
    effect.kind === "negate_named_effect" ? [index] : [],
  );
  return {
    armorIndex: armorRoleIndices[0] ?? -1,
    negationIndex: negationRoleIndices[0] ?? -1,
  };
}

function triggeredArmorDefenseEffectCountIssues(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
  armorIndex: number,
  negationIndex: number,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  const selectedRoleIndices = new Set(
    [armorIndex, negationIndex].filter((index) => index >= 0),
  );
  for (const [index] of effects.entries())
    if (!selectedRoleIndices.has(index))
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
  if (effects.length < 2)
    for (let ordinal = effects.length + 1; ordinal <= 2; ordinal += 1)
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(ordinal)),
      );
  if (armorIndex < 0)
    pushIssue(
      "armorClassEffect",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  if (negationIndex < 0)
    pushIssue(
      "negationEffect",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(2)),
    );
}

function triggeredArmorDefenseArmorEffectIssues(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
  armorIndex: number,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  const armorEffect = armorIndex < 0 ? undefined : effects[armorIndex];
  if (!triggeredArmorDefenseArmorEffectIsExact(armorEffect))
    pushIssue(
      "armorClassEffect",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(armorIndex < 0 ? 1 : armorIndex + 1),
      ),
    );
}

function triggeredArmorDefenseArmorEffectIsExact(
  armorEffect:
    | (NonNullable<TriggeredArmorDefensePhase["effects"]> | [])[number]
    | undefined,
): boolean {
  return (
    (armorEffect?.kind !== "modify_ac" ||
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
      armorEffect.delta.dieSize !== 1) === false
  );
}

function triggeredArmorDefenseNegationEffectIssues(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
  negationIndex: number,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  const negationEffect = negationIndex < 0 ? undefined : effects[negationIndex];
  if (
    negationEffect?.kind !== "negate_named_effect" ||
    !spellMechanicsObjectHasOnlyKeys(
      negationEffect,
      TRIGGERED_ARMOR_NEGATION_EFFECT_FIELDS,
    ) ||
    negationEffect.scope !== "damage_only" ||
    negationEffect.spellId !== SHIELD_MAGIC_MISSILE_SPELL_ID
  )
    pushIssue(
      "negationEffect",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(negationIndex < 0 ? 2 : negationIndex + 1),
      ),
    );
}

function triggeredArmorDefensePhaseIssues(
  phase: TriggeredArmorDefensePhase,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  triggeredArmorDefensePhaseAttachmentIssues(phase, phaseOrdinal, pushIssue);
  const effects = phase.effects ?? [];
  const { armorIndex, negationIndex } =
    triggeredArmorDefenseEffectRoleIndices(effects);
  triggeredArmorDefenseEffectCountIssues(
    effects,
    armorIndex,
    negationIndex,
    phaseOrdinal,
    pushIssue,
  );
  triggeredArmorDefenseArmorEffectIssues(
    effects,
    armorIndex,
    phaseOrdinal,
    pushIssue,
  );
  triggeredArmorDefenseNegationEffectIssues(
    effects,
    negationIndex,
    phaseOrdinal,
    pushIssue,
  );
}

function triggeredArmorDefensePhasePresenceIssues(
  phase: TriggeredArmorDefensePhase | undefined,
  phaseOrdinal: PositiveInteger,
  pushIssue: TriggeredArmorDefenseIssuePush,
): void {
  if (phase === undefined)
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  else triggeredArmorDefensePhaseIssues(phase, phaseOrdinal, pushIssue);
}

function triggeredArmorDefenseStructuralFallbackIssue(
  mechanics: TriggeredArmorDefenseMechanics,
  phase: TriggeredArmorDefensePhase | undefined,
  phaseOrdinal: PositiveInteger,
): TriggeredArmorDefenseMechanicsIssue | null {
  if (!isTriggeredArmorRange(mechanics.range))
    return {
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    };
  if (!isTriggeredArmorDuration(mechanics.duration))
    return {
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    };
  if (phase === undefined)
    return {
      failedFact: "phase",
      mechanicsPath: spellActivationPhasePath(phaseOrdinal),
    };
  return null;
}

function triggeredArmorDefenseProjectedEffectFacts(
  projectedArmorEffect: ReturnType<
    typeof triggeredArmorDefenseArmorEffectFromEffects
  >,
  projectedNegationEffect: ReturnType<
    typeof triggeredArmorDefenseNegationEffectFromEffects
  >,
) {
  const armorClassBonus =
    projectedArmorEffect?.kind === "modify_ac" &&
    projectedArmorEffect.delta.kind === "fixed_dice"
      ? projectedArmorEffect.delta.dice
      : undefined;
  const negatesRepeatedDamageAllocation =
    projectedNegationEffect?.kind === "negate_named_effect" &&
    projectedNegationEffect.spellId === SHIELD_MAGIC_MISSILE_SPELL_ID &&
    projectedNegationEffect.scope === "damage_only";
  return { armorClassBonus, negatesRepeatedDamageAllocation };
}

function triggeredArmorDefenseArmorEffectFromEffects(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
) {
  return effects.find((effect) => effect.kind === "modify_ac");
}

function triggeredArmorDefenseNegationEffectFromEffects(
  effects: NonNullable<TriggeredArmorDefensePhase["effects"]> | [],
) {
  return effects.find((effect) => effect.kind === "negate_named_effect");
}

function triggeredArmorDefenseEffectFallbackIssue(input: {
  readonly phaseEffects:
    | NonNullable<TriggeredArmorDefensePhase["effects"]>
    | [];
  readonly phaseOrdinal: PositiveInteger;
  readonly armorClassBonus: number | undefined;
  readonly negatesRepeatedDamageAllocation: boolean;
}): TriggeredArmorDefenseMechanicsIssue | null {
  if (
    input.armorClassBonus !== undefined &&
    input.negatesRepeatedDamageAllocation === true
  )
    return null;
  const failedFact =
    input.armorClassBonus === undefined ? "armorClassEffect" : "negationEffect";
  const effectIndex =
    input.armorClassBonus === undefined
      ? input.phaseEffects.findIndex((effect) => effect.kind === "modify_ac")
      : input.phaseEffects.findIndex(
          (effect) => effect.kind === "negate_named_effect",
        );
  return {
    failedFact,
    mechanicsPath: spellActivationEffectPath(
      input.phaseOrdinal,
      PositiveInteger(Math.max(1, effectIndex + 1)),
    ),
  };
}

function triggeredArmorDefenseSupportedFacts(
  mechanics: TriggeredArmorDefenseMechanics,
  effectFacts: ReturnType<typeof triggeredArmorDefenseProjectedEffectFacts>,
): TriggeredArmorDefenseMechanicsFacts | null {
  if (
    effectFacts.armorClassBonus === undefined ||
    effectFacts.negatesRepeatedDamageAllocation !== true
  )
    return null;
  return {
    level: mechanics.level,
    armorClassBonus: effectFacts.armorClassBonus,
    negatesRepeatedDamageAllocation:
      effectFacts.negatesRepeatedDamageAllocation,
  };
}

function admitTriggeredArmorDefenseMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "triggeredArmorDefense",
  TriggeredArmorDefenseMechanicsFacts,
  TriggeredArmorDefenseInvocation,
  ReturnType<typeof triggeredArmorDefenseIssueResult>
> {
  const mechanics = triggeredArmorDefenseRepresentedMechanics(source.mechanics);
  if (mechanics === undefined) return { tag: "notRepresented" };
  const { directPhaseIndex, phaseOrdinal, phase } =
    triggeredArmorDefenseSelectedPhase(mechanics);
  const phaseEffects = triggeredArmorDefensePhaseEffects(phase);
  const projectedArmorEffect =
    triggeredArmorDefenseArmorEffectFromEffects(phaseEffects);
  const projectedNegationEffect =
    triggeredArmorDefenseNegationEffectFromEffects(phaseEffects);
  const issues: TriggeredArmorDefenseMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: TriggeredArmorDefenseFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  triggeredArmorDefenseIdentityHeaderIssues(mechanics, pushIssue);
  triggeredArmorDefenseComponentIssues(mechanics, pushIssue);
  triggeredArmorDefenseDurationIssues(mechanics, pushIssue);
  triggeredArmorDefenseCastingTimeIssues(mechanics, pushIssue);
  triggeredArmorDefensePhaseCardinalityIssues(
    mechanics,
    directPhaseIndex,
    phaseOrdinal,
    pushIssue,
  );
  triggeredArmorDefensePhasePresenceIssues(phase, phaseOrdinal, pushIssue);
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      triggeredArmorDefenseIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  const structuralFallbackIssue = triggeredArmorDefenseStructuralFallbackIssue(
    mechanics,
    phase,
    phaseOrdinal,
  );
  if (structuralFallbackIssue !== null) {
    return {
      tag: "unsupported",
      issues: [triggeredArmorDefenseIssueResult(structuralFallbackIssue)],
    };
  }
  if (phase === undefined) {
    return {
      tag: "unsupported",
      issues: [
        triggeredArmorDefenseIssueResult({
          failedFact: "phase",
          mechanicsPath: spellActivationPhasePath(phaseOrdinal),
        }),
      ],
    };
  }
  const projectedEffectFacts = triggeredArmorDefenseProjectedEffectFacts(
    projectedArmorEffect,
    projectedNegationEffect,
  );
  const effectFallbackIssue = triggeredArmorDefenseEffectFallbackIssue({
    phaseEffects,
    phaseOrdinal,
    ...projectedEffectFacts,
  });
  if (effectFallbackIssue !== null) {
    return {
      tag: "unsupported",
      issues: [triggeredArmorDefenseIssueResult(effectFallbackIssue)],
    };
  }
  const facts = triggeredArmorDefenseSupportedFacts(
    mechanics,
    projectedEffectFacts,
  );
  if (facts === null) {
    return {
      tag: "unsupported",
      issues: [
        triggeredArmorDefenseIssueResult({
          failedFact: "armorClassEffect",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(1),
          ),
        }),
      ],
    };
  }
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
