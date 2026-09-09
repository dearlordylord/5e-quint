import { spellInvocationResourceForCastOption } from "./profile.ts";
import { fillsBelongToDeclaredHoles } from "../fill-hole-protocol.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import { openReactionThenResolveWillingTargetSave } from "../willing-target-save-gate.ts";
import { replaceTargetActiveEffectsEndingDisplacedConcentrations } from "../active-effect-replacement.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "../battle-runtime-protocol.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
//
// The creatureSizeIncrease / creatureSizeDecrease Spell Procedure Profile:
// a prepared Magic Action spell that enlarges or reduces one creature,
// applying the corresponding size, Strength roll-mode, and attack damage
// effect for the spell's concentration duration.
//
// This implementation owns two procedure literals. Both are registered so
// registry-derived procedure tables remain total over supported invocations,
// while admit() and resolve() still share the same implementation.

import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
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
  EffectAtom,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type CreatureSizeChangeSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { CombatantId } from "../../identity.ts";
import type {
  CreatureSizeDecreaseSpellProcedureExecution,
  CreatureSizeIncreaseSpellProcedureExecution,
} from "../../character-execution.ts";
import {
  activeEffectsWithCreatureSizeChangeReplaced,
  CREATURE_SIZE_CHANGE_DAMAGE_DICE,
  CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE,
  CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL,
} from "../creature-size-change-effects.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";

import {
  invalidResult,
  resolvedResult,
  resolutionFromStateResult,
} from "../result-helpers.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellRequiresConcentration } from "../spells-resolve-resources.ts";
import { spendConfiguredSpellCastResources } from "../spell-active-effect-resolution.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  discoverExtendedSpellMetamagicSelections,
  extendedSpellDurationModifierForApplications,
} from "../metamagic-support.ts";
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
  spellProcedureHasCompleteSignature,
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

type CreatureSizeChangeInvocation = CreatureSizeChangeSpellInvocation;
type CreatureSizeIncreaseInvocation = CreatureSizeChangeInvocation & {
  readonly procedure: "creatureSizeIncrease";
};
type CreatureSizeDecreaseInvocation = CreatureSizeChangeInvocation & {
  readonly procedure: "creatureSizeDecrease";
};
type CreatureSizeChangeExecution =
  | CreatureSizeIncreaseSpellProcedureExecution
  | CreatureSizeDecreaseSpellProcedureExecution;

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type CreatureSizeChangeSaveGate = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "save_gate" }
>;
type CreatureSizeChangeTargetSelection = Extract<
  Extract<
    CreatureSizeChangeSaveGate["attachment"],
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "target" }
>["selection"];
type CreatureSizeChangeMode = Extract<
  CreatureSizeChangeSaveGate["onFail"],
  { readonly kind: "choose_effect_mode" }
>["options"][number];
type CreatureSizeChangePhaseSelection = {
  readonly phase: CreatureSizeChangeSaveGate | undefined;
  readonly authoredOrdinal: PositiveInteger;
};
type CreatureSizeChangePhaseFacts = {
  readonly ability: "con";
  readonly dc: Extract<
    CreatureSizeChangeSaveGate["dc"],
    { readonly kind: "caster_spell_save_dc" }
  >;
};
type CreatureSizeChangePhaseFactsInspection = Readonly<{
  ability: CreatureSizeChangePhaseFacts["ability"] | null;
  dc: CreatureSizeChangePhaseFacts["dc"] | null;
}>;
const CREATURE_SIZE_CHANGE_DURATION_MINUTES_VALUE = 1;
type CreatureSizeChangeDurationMinutes = PositiveInteger &
  typeof CREATURE_SIZE_CHANGE_DURATION_MINUTES_VALUE;
type CreatureSizeChangeDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly unit: "minute";
    readonly amount: CreatureSizeChangeDurationMinutes;
  };
};
type CreatureSizeChangeDirection = "increase" | "decrease";
type CreatureSizeChangeFacts<
  Direction extends CreatureSizeChangeDirection = CreatureSizeChangeDirection,
> = SpellProcedureMechanicsFacts & {
  readonly level: 2;
  readonly duration: CreatureSizeChangeDuration;
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly ability: "con";
  readonly dc: { readonly kind: "caster_spell_save_dc" };
  readonly direction: Direction;
};
type CreatureSizeChangeProcedure = CreatureSizeChangeInvocation["procedure"];
type CreatureSizeChangeDirectionForProcedure<
  Procedure extends CreatureSizeChangeProcedure,
> = Procedure extends "creatureSizeIncrease" ? "increase" : "decrease";

const CREATURE_SIZE_CHANGE_SPELL_LEVEL = 2 satisfies SpellLevel;
const CREATURE_SIZE_CHANGE_RANGE_FEET = movementFeet(30);
const CREATURE_SIZE_CHANGE_DURATION_MINUTES = PositiveInteger(
  CREATURE_SIZE_CHANGE_DURATION_MINUTES_VALUE,
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for CreatureSizeChangeFailedFact.
const CREATURE_SIZE_CHANGE_FAILED_FACTS = [
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
  "objectTarget",
  "modeChoice",
  "modeCount",
  "effectCount",
  "sizeChange",
  "abilityCheckRollMode",
  "savingThrowRollMode",
  "damageModifier",
] as const;
type CreatureSizeChangeFailedFact =
  (typeof CREATURE_SIZE_CHANGE_FAILED_FACTS)[number];
type CreatureSizeChangeIssue<Procedure extends CreatureSizeChangeProcedure> =
  SpellProcedureAdmissionIssue<
    Procedure,
    CreatureSizeChangeFailedFact,
    UnitMechanicsPath
  >;
type CreatureSizeChangeIssueCoordinate = {
  readonly failedFact: CreatureSizeChangeFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};
type CreatureSizeChangeMechanicsProjection<
  Direction extends CreatureSizeChangeDirection,
> =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<CreatureSizeChangeIssueCoordinate>;
    }
  | {
      readonly tag: "supported";
      readonly facts: CreatureSizeChangeFacts<Direction>;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

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
const DURATION_FIELDS = ["kind", "upTo"] as const;
const DURATION_VALUE_FIELDS = ["amount", "unit"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
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
const OBJECT_FILTER_FIELDS = ["visibility", "targetRelation"] as const;
const MODE_CHOICE_FIELDS = ["kind", "label", "options"] as const;
const MODE_FIELDS = ["id", "displayName", "effects"] as const;

function creatureSizeChangeIssue<Procedure extends CreatureSizeChangeProcedure>(
  procedure: Procedure,
  failedFact: CreatureSizeChangeFailedFact,
  mechanicsPath: UnitMechanicsPath,
): CreatureSizeChangeIssue<Procedure> {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${failedFact}.`,
  };
}

function creatureSizeChangeModeDirections(
  phase: CreatureSizeChangeSaveGate | undefined,
): ReadonlySet<CreatureSizeChangeDirection> {
  return new Set(
    phase?.onFail.kind === "choose_effect_mode"
      ? phase.onFail.options.flatMap((option) =>
          option.effects.flatMap((effect) =>
            effect.kind === "modify_size_category" ? [effect.direction] : [],
          ),
        )
      : [],
  );
}

function creatureSizeChangeTargetSelection(
  phase: CreatureSizeChangeSaveGate,
): CreatureSizeChangeTargetSelection | undefined {
  return phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
    ? phase.attachment.value.selection
    : undefined;
}

function creatureSizeChangeTargetsOneCreatureOrObject(
  phase: CreatureSizeChangeSaveGate,
): boolean {
  const selection = creatureSizeChangeTargetSelection(phase);
  return (
    selection?.mode === "one" &&
    selection.targetKinds !== undefined &&
    sameStringSet(selection.targetKinds, ["creature", "object"])
  );
}

function creatureSizeChangeObjectTargetIsRepresented(
  phase: CreatureSizeChangeSaveGate,
): boolean {
  const selection = creatureSizeChangeTargetSelection(phase);
  const objectFilter =
    selection !== undefined && "objectFilter" in selection
      ? selection.objectFilter
      : undefined;
  return (
    objectFilter?.visibility === "caster_can_see" &&
    objectFilter.targetRelation === "not_worn_or_carried"
  );
}

function creatureSizeChangeObjectTargetIsSupported(
  phase: CreatureSizeChangeSaveGate,
): boolean {
  const selection = creatureSizeChangeTargetSelection(phase);
  if (selection === undefined || !("objectFilter" in selection)) return false;
  return (
    creatureSizeChangeObjectTargetIsRepresented(phase) &&
    spellMechanicsObjectHasOnlyKeys(
      selection.objectFilter,
      OBJECT_FILTER_FIELDS,
    )
  );
}

function inspectCreatureSizeChangePhaseFacts(
  phase: CreatureSizeChangeSaveGate,
): CreatureSizeChangePhaseFactsInspection {
  return {
    ability: phase.ability === "con" ? phase.ability : null,
    dc: phase.dc.kind === "caster_spell_save_dc" ? phase.dc : null,
  };
}

function creatureSizeChangePhaseHasIndependentSignature(
  phase: CreatureSizeChangeSaveGate,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "save",
        present:
          phase.ability === "con" && phase.dc.kind === "caster_spell_save_dc",
      },
      {
        name: "applicability",
        present:
          phase.saveAppliesIf === "unwilling_creature_target" &&
          phase.onSuccess.kind === "none",
      },
      {
        name: "targetDomain",
        present:
          creatureSizeChangeTargetsOneCreatureOrObject(phase) &&
          creatureSizeChangeObjectTargetIsRepresented(phase),
      },
    ],
  });
}

function creatureSizeChangePhaseSelection(
  mechanics: ActivationSpellMechanics,
): CreatureSizeChangePhaseSelection {
  const characteristicPhaseIndex = mechanics.phases.findIndex((candidate) => {
    if (
      candidate.kind !== "save_gate" ||
      candidate.onFail.kind !== "choose_effect_mode"
    )
      return false;
    const directions = creatureSizeChangeModeDirections(candidate);
    return directions.has("increase") && directions.has("decrease");
  });
  const semanticModalSaveGateIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "save_gate" &&
      candidate.onFail.kind === "choose_effect_mode" &&
      creatureSizeChangePhaseHasIndependentSignature(candidate),
  );
  const modalSaveGateIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "save_gate" &&
      candidate.onFail.kind === "choose_effect_mode",
  );
  const saveGateIndex = mechanics.phases.findIndex(
    (candidate) => candidate.kind === "save_gate",
  );
  const selectedPhaseIndex =
    characteristicPhaseIndex >= 0
      ? characteristicPhaseIndex
      : semanticModalSaveGateIndex >= 0
        ? semanticModalSaveGateIndex
        : modalSaveGateIndex >= 0
          ? modalSaveGateIndex
          : saveGateIndex >= 0
            ? saveGateIndex
            : 0;
  const selectedPhase = mechanics.phases[selectedPhaseIndex];
  return {
    phase: selectedPhase?.kind === "save_gate" ? selectedPhase : undefined,
    authoredOrdinal: PositiveInteger(selectedPhaseIndex + 1),
  };
}

function hasCompleteCreatureSizeChangeFallbackSignature(
  mechanics: ActivationSpellMechanics,
): boolean {
  if (!creatureSizeChangeFallbackEnvelopeIsRepresented(mechanics)) {
    return false;
  }
  const phase = mechanics.phases.length === 1 ? mechanics.phases[0] : undefined;
  if (phase?.kind !== "save_gate") return false;
  return spellProcedureHasCompleteSignature([
    {
      name: "save",
      present:
        phase.ability === "con" && phase.dc.kind === "caster_spell_save_dc",
    },
    {
      name: "applicability",
      present:
        phase.saveAppliesIf === "unwilling_creature_target" &&
        phase.onSuccess.kind === "none",
    },
    {
      name: "targetDomain",
      present:
        creatureSizeChangeTargetsOneCreatureOrObject(phase) &&
        creatureSizeChangeObjectTargetIsRepresented(phase),
    },
  ]);
}

function creatureSizeChangeFallbackEnvelopeIsRepresented(
  mechanics: ActivationSpellMechanics,
): boolean {
  return (
    mechanics.level === CREATURE_SIZE_CHANGE_SPELL_LEVEL &&
    mechanics.school === "transmutation" &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === CREATURE_SIZE_CHANGE_RANGE_FEET &&
    creatureSizeChangeFallbackDurationIsRepresented(mechanics.duration)
  );
}

function creatureSizeChangeFallbackDurationIsRepresented(
  duration: Duration,
): boolean {
  return (
    duration.kind === "concentration" &&
    duration.upTo.amount === CREATURE_SIZE_CHANGE_DURATION_MINUTES &&
    duration.upTo.unit === "minute"
  );
}

function creatureSizeChangeRepresentation(
  mechanics: SpellMechanics,
): mechanics is ActivationSpellMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) => {
      const hasModeChoiceSaveGate = activation.phases.some(
        (phase) =>
          phase.kind === "save_gate" &&
          phase.onFail.kind === "choose_effect_mode",
      );
      return (
        hasModeChoiceSaveGate ||
        hasCompleteCreatureSizeChangeFallbackSignature(activation)
      );
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

function creatureSizeChangeDuration(
  duration: Duration,
): CreatureSizeChangeDuration | undefined {
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    !isCreatureSizeChangeDurationMinutes(duration.upTo.amount)
  )
    return undefined;
  return {
    kind: duration.kind,
    upTo: { amount: duration.upTo.amount, unit: duration.upTo.unit },
  };
}

function isCreatureSizeChangeDurationMinutes(
  amount: PositiveInteger,
): amount is CreatureSizeChangeDurationMinutes {
  return amount === CREATURE_SIZE_CHANGE_DURATION_MINUTES;
}

function creatureSizeChangeEvidence(
  mechanics: ActivationSpellMechanics,
  phaseOrdinal: PositiveInteger,
): SpellProcedureMechanicsEvidence {
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
      spellActivationPhasePath(phaseOrdinal),
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ],
    unowned: [spellActivationAttachmentPath(phaseOrdinal)],
  };
}

function onlyEffect<K extends EffectAtom["kind"]>(
  effects: readonly EffectAtom[],
  predicate: (
    effect: EffectAtom,
  ) => effect is Extract<EffectAtom, { readonly kind: K }>,
): Extract<EffectAtom, { readonly kind: K }> | undefined {
  const matches = effects.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
}

function creatureSizeModeEffectAtoms(
  option: CreatureSizeChangeMode,
): readonly EffectAtom[] {
  return option.effects.flatMap((effect): readonly EffectAtom[] =>
    effect.kind === "modify_size_category" ||
    effect.kind === "modify_roll_advantage" ||
    effect.kind === "modify_damage_numeric"
      ? [effect]
      : [],
  );
}

type CreatureSizeChangeSizeEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_size_category" }
>;
type CreatureSizeChangeRollModeEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;
type CreatureSizeChangeDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_damage_numeric" }
>;
type CreatureSizeModeEffects = {
  readonly size: CreatureSizeChangeSizeEffect | undefined;
  readonly abilityCheck: CreatureSizeChangeRollModeEffect | undefined;
  readonly savingThrow: CreatureSizeChangeRollModeEffect | undefined;
  readonly damage: CreatureSizeChangeDamageEffect | undefined;
};

function creatureSizeModeEffects(
  recognized: readonly EffectAtom[],
): CreatureSizeModeEffects {
  return {
    size: onlyEffect(
      recognized,
      (effect): effect is CreatureSizeChangeSizeEffect =>
        effect.kind === "modify_size_category",
    ),
    abilityCheck: onlyEffect(
      recognized,
      (effect): effect is CreatureSizeChangeRollModeEffect =>
        effect.kind === "modify_roll_advantage" &&
        sameStringSet(effect.on, ["ability_check"]),
    ),
    savingThrow: onlyEffect(
      recognized,
      (effect): effect is CreatureSizeChangeRollModeEffect =>
        effect.kind === "modify_roll_advantage" &&
        sameStringSet(effect.on, ["saving_throw"]),
    ),
    damage: onlyEffect(
      recognized,
      (effect): effect is CreatureSizeChangeDamageEffect =>
        effect.kind === "modify_damage_numeric",
    ),
  };
}

function creatureSizeChangePresentValues<Value>(
  candidates: readonly (Value | null)[],
): readonly Value[] {
  return candidates.filter(
    (candidate): candidate is Value => candidate !== null,
  );
}

function creatureSizeChangeRollMode(
  direction: CreatureSizeChangeDirection,
): "advantage" | "disadvantage" {
  return Match.value(direction).pipe(
    Match.when("increase", (): "advantage" => "advantage"),
    Match.when("decrease", (): "disadvantage" => "disadvantage"),
    Match.exhaustive,
  );
}

function creatureSizeChangeModeEffectCountIsUnsupported(
  option: CreatureSizeChangeMode,
  recognizedEffects: readonly EffectAtom[],
): boolean {
  return (
    !spellMechanicsObjectHasOnlyKeys(option, MODE_FIELDS) ||
    option.effects.length !== 4 ||
    recognizedEffects.length !== option.effects.length
  );
}

function creatureSizeChangeSizeEffectIsUnsupported(
  effect: CreatureSizeChangeSizeEffect | undefined,
  direction: CreatureSizeChangeDirection,
): boolean {
  if (effect === undefined) return true;
  return (
    effect.direction !== direction ||
    effect.steps !== 1 ||
    !spellMechanicsObjectHasOnlyKeys(effect, ["kind", "direction", "steps"])
  );
}

function creatureSizeChangeAbilityCheckEffectIsUnsupported(
  effect: CreatureSizeChangeRollModeEffect | undefined,
  direction: CreatureSizeChangeDirection,
): boolean {
  if (effect === undefined) return true;
  return (
    effect.mode !== creatureSizeChangeRollMode(direction) ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !Array.isArray(effect.abilityFilter) ||
    !sameStringSet(effect.abilityFilter, ["str"]) ||
    !spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "mode",
      "affects",
      "on",
      "abilityFilter",
    ])
  );
}

function creatureSizeChangeSavingThrowEffectIsUnsupported(
  effect: CreatureSizeChangeRollModeEffect | undefined,
  direction: CreatureSizeChangeDirection,
): boolean {
  if (effect === undefined) return true;
  return (
    effect.mode !== creatureSizeChangeRollMode(direction) ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !Array.isArray(effect.saveAbilityFilter) ||
    !sameStringSet(effect.saveAbilityFilter, ["str"]) ||
    !spellMechanicsObjectHasOnlyKeys(effect, [
      "kind",
      "mode",
      "affects",
      "on",
      "saveAbilityFilter",
    ])
  );
}

function creatureSizeChangeDamageDeltaIsSupported(
  damage: CreatureSizeChangeDamageEffect,
  direction: CreatureSizeChangeDirection,
): boolean {
  const sign = Match.value(direction).pipe(
    Match.when("increase", (): "+" => "+"),
    Match.when("decrease", (): "-" => "-"),
    Match.exhaustive,
  );
  return (
    damage.delta.kind === "fixed_dice" &&
    damage.delta.dice === CREATURE_SIZE_CHANGE_DAMAGE_DICE &&
    damage.delta.dieSize === CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE &&
    damage.delta.sign === sign &&
    spellMechanicsObjectHasOnlyKeys(damage.delta, [
      "kind",
      "dice",
      "dieSize",
      "sign",
    ])
  );
}

function creatureSizeChangeDamageSourceIsSupported(
  damage: CreatureSizeChangeDamageEffect,
): boolean {
  return (
    damage.damageSourceFilter?.kind === "attack_hit" &&
    damage.damageSourceFilter.attackRollFilter === "weapon_or_unarmed_strike" &&
    spellMechanicsObjectHasOnlyKeys(damage.damageSourceFilter, [
      "kind",
      "attackRollFilter",
    ])
  );
}

function creatureSizeChangeDamageEnvelopeIsSupported(
  damage: CreatureSizeChangeDamageEffect,
  direction: CreatureSizeChangeDirection,
): boolean {
  return Match.value(direction).pipe(
    Match.when(
      "increase",
      () =>
        damage.minimumDamageTotal === undefined &&
        spellMechanicsObjectHasOnlyKeys(damage, [
          "kind",
          "delta",
          "damageSourceFilter",
        ]),
    ),
    Match.when(
      "decrease",
      () =>
        damage.minimumDamageTotal ===
          CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL &&
        spellMechanicsObjectHasOnlyKeys(damage, [
          "kind",
          "delta",
          "damageSourceFilter",
          "minimumDamageTotal",
        ]),
    ),
    Match.exhaustive,
  );
}

function creatureSizeChangeDamageEffectIsUnsupported(
  damage: CreatureSizeChangeDamageEffect | undefined,
  direction: CreatureSizeChangeDirection,
): boolean {
  return (
    damage === undefined ||
    !creatureSizeChangeDamageDeltaIsSupported(damage, direction) ||
    !creatureSizeChangeDamageSourceIsSupported(damage) ||
    !creatureSizeChangeDamageEnvelopeIsSupported(damage, direction)
  );
}

function creatureSizeModeIssueFacts(
  option: CreatureSizeChangeMode | undefined,
  direction: CreatureSizeChangeDirection,
): readonly CreatureSizeChangeFailedFact[] {
  if (option === undefined) return ["modeCount"];
  const recognizedEffects = creatureSizeModeEffectAtoms(option);
  const effects = creatureSizeModeEffects(recognizedEffects);
  return creatureSizeChangePresentValues([
    creatureSizeChangeModeEffectCountIsUnsupported(option, recognizedEffects)
      ? "effectCount"
      : null,
    creatureSizeChangeSizeEffectIsUnsupported(effects.size, direction)
      ? "sizeChange"
      : null,
    creatureSizeChangeAbilityCheckEffectIsUnsupported(
      effects.abilityCheck,
      direction,
    )
      ? "abilityCheckRollMode"
      : null,
    creatureSizeChangeSavingThrowEffectIsUnsupported(
      effects.savingThrow,
      direction,
    )
      ? "savingThrowRollMode"
      : null,
    creatureSizeChangeDamageEffectIsUnsupported(effects.damage, direction)
      ? "damageModifier"
      : null,
  ]);
}

function modeForDirection(
  options: readonly CreatureSizeChangeMode[],
  direction: "increase" | "decrease",
): CreatureSizeChangeMode | undefined {
  const matches = options.filter((option) =>
    option.effects.some(
      (effect) =>
        effect.kind === "modify_size_category" &&
        effect.direction === direction,
    ),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function creatureSizeChangeIssueCoordinate(
  failedFact: CreatureSizeChangeFailedFact,
  mechanicsPath: UnitMechanicsPath,
): CreatureSizeChangeIssueCoordinate {
  return { failedFact, mechanicsPath };
}

function creatureSizeChangeRootAndHeaderIssues(
  mechanics: ActivationSpellMechanics,
): readonly CreatureSizeChangeIssueCoordinate[] {
  return creatureSizeChangePresentValues([
    !spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS)
      ? creatureSizeChangeIssueCoordinate("mechanics", spellMechanicsRootPath())
      : null,
    mechanics.level !== CREATURE_SIZE_CHANGE_SPELL_LEVEL
      ? creatureSizeChangeIssueCoordinate(
          "level",
          spellMechanicsHeaderPath("level"),
        )
      : null,
    mechanics.school !== "transmutation"
      ? creatureSizeChangeIssueCoordinate(
          "school",
          spellMechanicsHeaderPath("school"),
        )
      : null,
  ]);
}

function creatureSizeChangeRangeIssues(
  mechanics: ActivationSpellMechanics,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const unsupported =
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== CREATURE_SIZE_CHANGE_RANGE_FEET ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS);
  return unsupported
    ? [
        creatureSizeChangeIssueCoordinate(
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ]
    : [];
}

function creatureSizeChangeComponentIssues(
  mechanics: ActivationSpellMechanics,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const unsupported =
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS);
  return [
    ...(unsupported
      ? [
          creatureSizeChangeIssueCoordinate(
            "components",
            spellMechanicsHeaderPath("components"),
          ),
        ]
      : []),
    ...spellConsumedMaterialEvidencePaths(mechanics.components).map((path) =>
      creatureSizeChangeIssueCoordinate("components", path),
    ),
  ];
}

function creatureSizeChangeDurationIssues(
  duration: Duration,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const childIssues = spellDurationChildCoordinates(duration).map((child) =>
    creatureSizeChangeIssueCoordinate(
      spellDurationChildFailedFact(child),
      spellDurationChildPath(child),
    ),
  );
  if (duration.kind !== "concentration") {
    return [
      creatureSizeChangeIssueCoordinate(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
      ...childIssues,
    ];
  }
  return [
    ...creatureSizeChangePresentValues([
      !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)
        ? creatureSizeChangeIssueCoordinate(
            "duration",
            spellMechanicsHeaderPath("duration"),
          )
        : null,
      !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
      !isSpellCanonicalDurationValue(duration.upTo) ||
      duration.upTo.unit !== "minute" ||
      duration.upTo.amount !== CREATURE_SIZE_CHANGE_DURATION_MINUTES
        ? creatureSizeChangeIssueCoordinate(
            "durationValue",
            spellDurationValuePath(),
          )
        : null,
    ]),
    ...childIssues,
  ];
}

function creatureSizeChangeCastingTimeIssues(
  mechanics: ActivationSpellMechanics,
): readonly CreatureSizeChangeIssueCoordinate[] {
  return mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
    ? [
        creatureSizeChangeIssueCoordinate(
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
      ]
    : [];
}

function creatureSizeChangePhaseCountIssues(
  mechanics: ActivationSpellMechanics,
  selectedOrdinal: PositiveInteger,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const missingPhaseIssues =
    mechanics.phases.length === 0
      ? [
          creatureSizeChangeIssueCoordinate(
            "phaseCount",
            spellActivationPhasePath(selectedOrdinal),
          ),
        ]
      : [];
  const additionalPhaseIssues = mechanics.phases.flatMap((_phase, index) => {
    const authoredOrdinal = PositiveInteger(index + 1);
    return authoredOrdinal === selectedOrdinal
      ? []
      : [
          creatureSizeChangeIssueCoordinate(
            "phaseCount",
            spellActivationPhasePath(authoredOrdinal),
          ),
        ];
  });
  return [...missingPhaseIssues, ...additionalPhaseIssues];
}

function creatureSizeChangePhaseSaveIssues(
  phase: CreatureSizeChangeSaveGate,
  phaseFacts: CreatureSizeChangePhaseFactsInspection,
  phasePath: UnitMechanicsPath,
): readonly CreatureSizeChangeIssueCoordinate[] {
  return creatureSizeChangePresentValues([
    !spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS)
      ? creatureSizeChangeIssueCoordinate("phase", phasePath)
      : null,
    phaseFacts.ability === null
      ? creatureSizeChangeIssueCoordinate("saveAbility", phasePath)
      : null,
    phaseFacts.dc === null ||
    !spellMechanicsObjectHasOnlyKeys(phase.dc, ["kind"])
      ? creatureSizeChangeIssueCoordinate("saveDc", phasePath)
      : null,
  ]);
}

function creatureSizeChangePhaseOutcomeIssues(
  phase: CreatureSizeChangeSaveGate,
  phasePath: UnitMechanicsPath,
): readonly CreatureSizeChangeIssueCoordinate[] {
  return creatureSizeChangePresentValues([
    phase.saveAppliesIf !== "unwilling_creature_target"
      ? creatureSizeChangeIssueCoordinate("saveAppliesIf", phasePath)
      : null,
    phase.onSuccess.kind !== "none" ||
    !spellMechanicsObjectHasOnlyKeys(phase.onSuccess, ["kind"])
      ? creatureSizeChangeIssueCoordinate("successOutcome", phasePath)
      : null,
  ]);
}

function creatureSizeChangeRepeatSaveIssues(
  phase: CreatureSizeChangeSaveGate,
  phaseOrdinal: PositiveInteger,
): readonly CreatureSizeChangeIssueCoordinate[] {
  return (phase.repeatSaves ?? []).map((_repeatSave, index) =>
    creatureSizeChangeIssueCoordinate(
      "repeatSave",
      spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
  );
}

function creatureSizeChangeAttachmentIssues(
  phase: CreatureSizeChangeSaveGate,
  attachmentPath: UnitMechanicsPath,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const admittedAttachment = admitSpellTargetAttachment(
    phase.attachment,
    TARGET_SELECTION_FIELDS,
  );
  return creatureSizeChangePresentValues([
    admittedAttachment.tag === "rejected"
      ? creatureSizeChangeIssueCoordinate("attachment", attachmentPath)
      : null,
    !creatureSizeChangeTargetsOneCreatureOrObject(phase)
      ? creatureSizeChangeIssueCoordinate("targetSelection", attachmentPath)
      : null,
    !creatureSizeChangeObjectTargetIsSupported(phase)
      ? creatureSizeChangeIssueCoordinate("objectTarget", attachmentPath)
      : null,
  ]);
}

function creatureSizeChangeDirectionalModeIssueFacts(
  options: readonly CreatureSizeChangeMode[],
  direction: CreatureSizeChangeDirection,
): readonly CreatureSizeChangeFailedFact[] {
  return Match.value(direction).pipe(
    Match.when("increase", () => [
      ...creatureSizeModeIssueFacts(
        modeForDirection(options, "increase"),
        "increase",
      ),
      ...creatureSizeModeIssueFacts(
        modeForDirection(options, "decrease"),
        "decrease",
      ),
    ]),
    Match.when("decrease", () => [
      ...creatureSizeModeIssueFacts(
        modeForDirection(options, "decrease"),
        "decrease",
      ),
      ...creatureSizeModeIssueFacts(
        modeForDirection(options, "increase"),
        "increase",
      ),
    ]),
    Match.exhaustive,
  );
}

function creatureSizeChangeModeIssues(
  phase: CreatureSizeChangeSaveGate,
  direction: CreatureSizeChangeDirection,
  effectPath: UnitMechanicsPath,
): readonly CreatureSizeChangeIssueCoordinate[] {
  if (
    phase.onFail.kind !== "choose_effect_mode" ||
    !spellMechanicsObjectHasOnlyKeys(phase.onFail, MODE_CHOICE_FIELDS)
  ) {
    return [creatureSizeChangeIssueCoordinate("modeChoice", effectPath)];
  }
  const options = phase.onFail.options;
  const increase = modeForDirection(options, "increase");
  const decrease = modeForDirection(options, "decrease");
  const modeCountIssues =
    options.length !== 2 || increase === undefined || decrease === undefined
      ? [creatureSizeChangeIssueCoordinate("modeCount", effectPath)]
      : [];
  return [
    ...modeCountIssues,
    ...creatureSizeChangeDirectionalModeIssueFacts(options, direction).map(
      (failedFact) => creatureSizeChangeIssueCoordinate(failedFact, effectPath),
    ),
  ];
}

function creatureSizeChangeSelectedPhaseIssues(
  phase: CreatureSizeChangeSaveGate | undefined,
  phaseFacts: CreatureSizeChangePhaseFactsInspection | null,
  phaseOrdinal: PositiveInteger,
  direction: CreatureSizeChangeDirection,
): readonly CreatureSizeChangeIssueCoordinate[] {
  const phasePath = spellActivationPhasePath(phaseOrdinal);
  if (phase === undefined) {
    return [creatureSizeChangeIssueCoordinate("phase", phasePath)];
  }
  if (phaseFacts === null) {
    return [creatureSizeChangeIssueCoordinate("phase", phasePath)];
  }
  return [
    ...creatureSizeChangePhaseSaveIssues(phase, phaseFacts, phasePath),
    ...creatureSizeChangePhaseOutcomeIssues(phase, phasePath),
    ...creatureSizeChangeRepeatSaveIssues(phase, phaseOrdinal),
    ...creatureSizeChangeAttachmentIssues(
      phase,
      spellActivationAttachmentPath(phaseOrdinal),
    ),
    ...creatureSizeChangeModeIssues(
      phase,
      direction,
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ),
  ];
}

type CreatureSizeChangeAdmissionCore =
  | {
      readonly tag: "incomplete";
      readonly issue: CreatureSizeChangeIssueCoordinate;
    }
  | {
      readonly tag: "complete";
      readonly duration: CreatureSizeChangeDuration;
      readonly phaseFacts: CreatureSizeChangePhaseFacts;
    };
function creatureSizeChangeAdmissionCore(
  duration: CreatureSizeChangeDuration | undefined,
  phaseFacts: CreatureSizeChangePhaseFactsInspection | null,
  phaseOrdinal: PositiveInteger,
): CreatureSizeChangeAdmissionCore {
  if (duration === undefined) {
    return {
      tag: "incomplete",
      issue: creatureSizeChangeIssueCoordinate(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    };
  }
  if (phaseFacts === null) {
    return {
      tag: "incomplete",
      issue: creatureSizeChangeIssueCoordinate(
        "phase",
        spellActivationPhasePath(phaseOrdinal),
      ),
    };
  }
  if (phaseFacts.ability === null || phaseFacts.dc === null) {
    return {
      tag: "incomplete",
      issue: creatureSizeChangeIssueCoordinate(
        "phase",
        spellActivationPhasePath(phaseOrdinal),
      ),
    };
  }
  return {
    tag: "complete",
    duration,
    phaseFacts: { ability: phaseFacts.ability, dc: phaseFacts.dc },
  };
}

function inspectCreatureSizeChangeMechanics<
  Direction extends CreatureSizeChangeDirection,
>(
  source: SpellMechanicsAdmissionSource,
  direction: Direction,
): CreatureSizeChangeMechanicsProjection<Direction> {
  if (!creatureSizeChangeRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const { phase, authoredOrdinal: phaseOrdinal } =
    creatureSizeChangePhaseSelection(mechanics);
  const duration = creatureSizeChangeDuration(mechanics.duration);
  const phaseFacts =
    phase === undefined ? null : inspectCreatureSizeChangePhaseFacts(phase);
  const issues = [
    ...creatureSizeChangeRootAndHeaderIssues(mechanics),
    ...creatureSizeChangeRangeIssues(mechanics),
    ...creatureSizeChangeComponentIssues(mechanics),
    ...creatureSizeChangeDurationIssues(mechanics.duration),
    ...creatureSizeChangeCastingTimeIssues(mechanics),
    ...creatureSizeChangePhaseCountIssues(mechanics, phaseOrdinal),
    ...creatureSizeChangeSelectedPhaseIssues(
      phase,
      phaseFacts,
      phaseOrdinal,
      direction,
    ),
  ];
  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined)
    return {
      tag: "unsupported",
      issues: nonEmpty,
    };
  return Match.value(
    creatureSizeChangeAdmissionCore(duration, phaseFacts, phaseOrdinal),
  ).pipe(
    Match.when(
      { tag: "incomplete" },
      ({
        issue,
      }): Extract<
        CreatureSizeChangeMechanicsProjection<Direction>,
        { readonly tag: "unsupported" }
      > => ({
        tag: "unsupported",
        issues: [issue],
      }),
    ),
    Match.when(
      { tag: "complete" },
      ({
        duration,
        phaseFacts,
      }): Extract<
        CreatureSizeChangeMechanicsProjection<Direction>,
        { readonly tag: "supported" }
      > => ({
        tag: "supported",
        facts: {
          ...source.spellDefinitionRuleFacts,
          level: CREATURE_SIZE_CHANGE_SPELL_LEVEL,
          duration,
          rangeFeet: CREATURE_SIZE_CHANGE_RANGE_FEET,
          ability: phaseFacts.ability,
          dc: phaseFacts.dc,
          direction,
        } satisfies CreatureSizeChangeFacts<Direction>,
        evidence: creatureSizeChangeEvidence(mechanics, phaseOrdinal),
      }),
    ),
    Match.exhaustive,
  );
}

function admitCreatureSizeChangeMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "creatureSizeIncrease",
  CreatureSizeChangeFacts<"increase">,
  CreatureSizeIncreaseInvocation,
  CreatureSizeChangeIssue<"creatureSizeIncrease">
> {
  const inspection = inspectCreatureSizeChangeMechanics(source, "increase");
  if (inspection.tag === "notRepresented") return inspection;
  if (inspection.tag === "unsupported")
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        inspection.issues,
        ({ failedFact, mechanicsPath }) =>
          creatureSizeChangeIssue(
            "creatureSizeIncrease",
            failedFact,
            mechanicsPath,
          ),
      ),
    };
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "creatureSizeIncrease",
      facts: inspection.facts,
      evidence: inspection.evidence,
      admit: (executionSource, context) =>
        admitCreatureSizeChangeForProcedure(
          executionSource,
          context,
          "creatureSizeIncrease",
          inspection.facts,
        ),
    },
  };
}

function admitCreatureSizeDecreaseMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "creatureSizeDecrease",
  CreatureSizeChangeFacts<"decrease">,
  CreatureSizeDecreaseInvocation,
  CreatureSizeChangeIssue<"creatureSizeDecrease">
> {
  const inspection = inspectCreatureSizeChangeMechanics(source, "decrease");
  if (inspection.tag === "notRepresented") return inspection;
  if (inspection.tag === "unsupported")
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        inspection.issues,
        ({ failedFact, mechanicsPath }) =>
          creatureSizeChangeIssue(
            "creatureSizeDecrease",
            failedFact,
            mechanicsPath,
          ),
      ),
    };
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "creatureSizeDecrease",
      facts: inspection.facts,
      evidence: inspection.evidence,
      admit: (executionSource, context) =>
        admitCreatureSizeChangeForProcedure(
          executionSource,
          context,
          "creatureSizeDecrease",
          inspection.facts,
        ),
    },
  };
}

function admitCreatureSizeChangeForProcedure<
  Procedure extends CreatureSizeChangeProcedure,
>(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  procedure: Procedure,
  facts: CreatureSizeChangeFacts<
    CreatureSizeChangeDirectionForProcedure<Procedure>
  >,
): readonly (CreatureSizeChangeInvocation & {
  readonly procedure: Procedure;
})[] {
  return ctx.spellCastOptions.flatMap(
    (
      slot,
    ): readonly (CreatureSizeChangeInvocation & {
      readonly procedure: Procedure;
    })[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              spell,
              actionCost: "magicAction",
              procedure,
              ability: facts.ability,
              dc: facts.dc,
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              activeEffect: {
                kind: "spellCreatureSizeChange",
                sourceCombatantId: ctx.actor.combatantId,
                direction: facts.direction,
                expiresAt: {
                  kind: "concentration",
                  combatantId: ctx.actor.combatantId,
                  durationTicks: spellDurationTicksFromCanonicalValue(
                    facts.duration.upTo,
                  ),
                },
              },
              rangeFeet: facts.rangeFeet,
            },
          ],
  );
}

function discoverCreatureSizeChangeCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CreatureSizeChangeExecution>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  const castAct = {
    subject: {
      tag: "actionSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" as const },
    },
    initialHoles: [targetHole],
  };
  const metamagicCastActs = discoverExtendedSpellMetamagicSelections({
    actor: state.combatants.get(actorId),
    invocation,
  }).map((metamagic) => {
    return {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
        metamagic,
      },
      initialHoles: [targetHole],
    };
  });
  return [castAct, ...metamagicCastActs];
}

function resolveCreatureSizeChange(
  input: SpellProcedureProfileResolveInput<CreatureSizeChangeInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToDeclaredHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature size-change spells use one target and, for unwilling targets, one Saving Throw fill.",
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
    invalidTargetMessage:
      "Creature size-change spell target must be a combatant within the selected spell's supported range.",
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
      "Willing creature size-change targets do not make a Saving Throw.",
  });
  if (saveResolution.tag !== "saveGate") {
    return saveResolution;
  }
  const { saveGate } = saveResolution;
  if (saveGate.tag === "resolutionRequired") {
    return saveGate.resolution;
  }
  if (saveGate.tag === "unaffected") {
    if (input.storedGlyphRelease !== undefined) {
      return resolvedResult(input.input.state);
    }
    const resourced = spendConfiguredSpellCastResources({
      resolution: input,
      state: input.input.state,
      startConcentration: false,
    });
    return resolutionFromStateResult(resourced);
  }

  const concentrationBase =
    input.storedGlyphRelease !== undefined
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyCreatureSizeChangeEffect(
    concentrationBase,
    input.actorId,
    target.combatantId,
    input.invocation,
    input.metamagicApplications,
  );
  if (input.storedGlyphRelease !== undefined) {
    return resolvedResult(effected);
  }
  const resourced = spendConfiguredSpellCastResources({
    resolution: input,
    state: effected,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const state = creatureSizeChangeConcentrationWithMetamagic(
    resourced.state,
    input.actorId,
    input.metamagicApplications,
  );
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

function applyCreatureSizeChangeEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CreatureSizeChangeExecution>,
  metamagicApplications:
    | readonly SpellMetamagicApplicationFact[]
    | undefined = undefined,
): BattleState {
  const activeEffect = creatureSizeChangeEffectWithMetamagic(
    invocation.activeEffect,
    metamagicApplications,
  );
  const target = state.combatants.get(targetId);
  if (target === undefined) return state;
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: target,
  });
  const nextEffect = {
    ...activeEffect,
    effectRef: allocation.effectRef,
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
  } as const;
  const replacement = activeEffectsWithCreatureSizeChangeReplaced(
    allocation.owner.activeEffects,
    nextEffect,
  );
  const allocatedState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, allocation.owner),
  };
  return replaceTargetActiveEffectsEndingDisplacedConcentrations(
    allocatedState,
    targetId,
    replacement.activeEffects,
    replacement.displacedEffects,
  );
}

function creatureSizeChangeEffectWithMetamagic(
  activeEffect: CreatureSizeChangeInvocation["activeEffect"],
  metamagicApplications: readonly SpellMetamagicApplicationFact[] | undefined,
): CreatureSizeChangeInvocation["activeEffect"] {
  const durationModifier = extendedSpellDurationModifierForApplications(
    metamagicApplications,
  );
  if (durationModifier === null) {
    return activeEffect;
  }
  return {
    ...activeEffect,
    expiresAt: {
      ...activeEffect.expiresAt,
      durationTicks: durationModifier.durationTicks,
    },
  };
}

function creatureSizeChangeConcentrationWithMetamagic(
  state: BattleState,
  actorId: CombatantId,
  metamagicApplications: readonly SpellMetamagicApplicationFact[] | undefined,
): BattleState {
  const durationModifier = extendedSpellDurationModifierForApplications(
    metamagicApplications,
  );
  if (durationModifier?.kind !== "concentrationDurationDoubledToCap") {
    return state;
  }
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    actor.concentration === null ||
    actor.concentration.effectKind !== "spellEffect"
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      concentration: {
        ...actor.concentration,
        maintenanceSavingThrowRollMode:
          durationModifier.concentrationMaintenanceSavingThrowRollMode,
      },
    }),
  };
}

const CreatureSizeChangeExecutionSchemaFields = {
  access: PreparedSpellAccessSchema,
  resource: LeveledSpellInvocationResourceSchema,
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
    kind: Schema.Literal("spellCreatureSizeChange"),
    sourceCombatantId: CombatantId,
    direction: Schema.Literals(["increase", "decrease"]),
    expiresAt: Schema.Struct({
      kind: Schema.Literal("concentration"),
      combatantId: CombatantId,
      durationTicks: ElapsedTimeTicksSchema,
    }),
  }),
  rangeFeet: MovementFeet,
} as const;
const CreatureSizeIncreaseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    ...CreatureSizeChangeExecutionSchemaFields,
    procedure: Schema.Literal("creatureSizeIncrease"),
  }),
);
const CreatureSizeDecreaseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    ...CreatureSizeChangeExecutionSchemaFields,
    procedure: Schema.Literal("creatureSizeDecrease"),
  }),
);
export const creatureSizeChangeProfile: SpellProcedureDeclaration<
  "creatureSizeIncrease",
  CreatureSizeIncreaseInvocation,
  CreatureSizeChangeFacts<"increase">,
  CreatureSizeChangeIssue<"creatureSizeIncrease">
> = {
  procedure: "creatureSizeIncrease",
  executionSchema: CreatureSizeIncreaseInvocationSchema,
  admitMechanics: admitCreatureSizeChangeMechanics,
  discoverCastAct: discoverCreatureSizeChangeCastAct,
  resolve: resolveCreatureSizeChange,
};

export const creatureSizeDecreaseProfile: SpellProcedureDeclaration<
  "creatureSizeDecrease",
  CreatureSizeDecreaseInvocation,
  CreatureSizeChangeFacts<"decrease">,
  CreatureSizeChangeIssue<"creatureSizeDecrease">
> = {
  procedure: "creatureSizeDecrease",
  executionSchema: CreatureSizeDecreaseInvocationSchema,
  admitMechanics: admitCreatureSizeDecreaseMechanics,
  discoverCastAct: discoverCreatureSizeChangeCastAct,
  resolve: resolveCreatureSizeChange,
};
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
