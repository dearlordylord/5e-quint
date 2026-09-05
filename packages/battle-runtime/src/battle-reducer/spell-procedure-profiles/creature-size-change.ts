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
type CreatureSizeChangeMode = Extract<
  CreatureSizeChangeSaveGate["onFail"],
  { readonly kind: "choose_effect_mode" }
>["options"][number];
type CreatureSizeChangePhaseSelection = {
  readonly phase: CreatureSizeChangeSaveGate | undefined;
  readonly authoredOrdinal: PositiveInteger;
};
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

function creatureSizeChangePhaseSemanticProjection(
  phase: CreatureSizeChangeSaveGate,
) {
  const constitutionSavingThrowAbility =
    phase.ability === "con" ? phase.ability : undefined;
  const casterSpellSaveDc =
    phase.dc.kind === "caster_spell_save_dc" ? phase.dc : undefined;
  const unwillingCreatureTargetApplicability =
    phase.saveAppliesIf === "unwilling_creature_target"
      ? phase.saveAppliesIf
      : undefined;
  const noEffectOnSuccessfulSave =
    phase.onSuccess.kind === "none" ? phase.onSuccess : undefined;
  const targetSelection =
    phase.attachment.kind === "hole" && phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : undefined;
  const objectFilter =
    targetSelection !== undefined && "objectFilter" in targetSelection
      ? targetSelection.objectFilter
      : undefined;
  return {
    constitutionSavingThrowAbility,
    casterSpellSaveDc,
    unwillingCreatureTargetApplicability,
    noEffectOnSuccessfulSave,
    objectFilter,
    targetsOneCreatureOrObject:
      targetSelection?.mode === "one" &&
      targetSelection.targetKinds !== undefined &&
      sameStringSet(targetSelection.targetKinds, ["creature", "object"]),
    requiresVisibleObjectNotWornOrCarried:
      objectFilter?.visibility === "caster_can_see" &&
      objectFilter.targetRelation === "not_worn_or_carried",
  };
}

function creatureSizeChangePhaseHasIndependentSignature(
  phase: CreatureSizeChangeSaveGate,
): boolean {
  const projection = creatureSizeChangePhaseSemanticProjection(phase);
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "save",
        present:
          projection.constitutionSavingThrowAbility !== undefined &&
          projection.casterSpellSaveDc !== undefined,
      },
      {
        name: "applicability",
        present:
          projection.unwillingCreatureTargetApplicability !== undefined &&
          projection.noEffectOnSuccessfulSave !== undefined,
      },
      {
        name: "targetDomain",
        present:
          projection.targetsOneCreatureOrObject &&
          projection.requiresVisibleObjectNotWornOrCarried,
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
  const phase = mechanics.phases[0];
  if (
    mechanics.level !== CREATURE_SIZE_CHANGE_SPELL_LEVEL ||
    mechanics.school !== "transmutation" ||
    mechanics.castingTime.kind !== "action" ||
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== CREATURE_SIZE_CHANGE_RANGE_FEET ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.amount !== CREATURE_SIZE_CHANGE_DURATION_MINUTES ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate"
  )
    return false;
  const projection = creatureSizeChangePhaseSemanticProjection(phase);
  return spellProcedureHasCompleteSignature([
    {
      name: "save",
      present:
        projection.constitutionSavingThrowAbility !== undefined &&
        projection.casterSpellSaveDc !== undefined,
    },
    {
      name: "applicability",
      present:
        projection.unwillingCreatureTargetApplicability !== undefined &&
        projection.noEffectOnSuccessfulSave !== undefined,
    },
    {
      name: "targetDomain",
      present:
        projection.targetsOneCreatureOrObject &&
        projection.requiresVisibleObjectNotWornOrCarried,
    },
  ]);
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

function creatureSizeModeIssueFacts(
  option: CreatureSizeChangeMode | undefined,
  direction: "increase" | "decrease",
): readonly CreatureSizeChangeFailedFact[] {
  if (option === undefined) return ["modeCount"];
  const effects = creatureSizeModeEffectAtoms(option);
  const size = onlyEffect(
    effects,
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_size_category" }
    > => effect.kind === "modify_size_category",
  );
  const abilityCheck = onlyEffect(
    effects,
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["ability_check"]),
  );
  const savingThrow = onlyEffect(
    effects,
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_roll_advantage" }
    > =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["saving_throw"]),
  );
  const damage = onlyEffect(
    effects,
    (
      effect,
    ): effect is Extract<
      EffectAtom,
      { readonly kind: "modify_damage_numeric" }
    > => effect.kind === "modify_damage_numeric",
  );
  const rollMode = direction === "increase" ? "advantage" : "disadvantage";
  const issues: CreatureSizeChangeFailedFact[] = [];
  if (
    !spellMechanicsObjectHasOnlyKeys(option, MODE_FIELDS) ||
    option.effects.length !== 4 ||
    effects.length !== option.effects.length
  )
    issues.push("effectCount");
  if (
    size?.direction !== direction ||
    size.steps !== 1 ||
    !spellMechanicsObjectHasOnlyKeys(size, ["kind", "direction", "steps"])
  )
    issues.push("sizeChange");
  if (
    abilityCheck?.mode !== rollMode ||
    (abilityCheck.affects ?? "self_roll") !== "self_roll" ||
    !Array.isArray(abilityCheck.abilityFilter) ||
    !sameStringSet(abilityCheck.abilityFilter, ["str"]) ||
    !spellMechanicsObjectHasOnlyKeys(abilityCheck, [
      "kind",
      "mode",
      "affects",
      "on",
      "abilityFilter",
    ])
  )
    issues.push("abilityCheckRollMode");
  if (
    savingThrow?.mode !== rollMode ||
    (savingThrow.affects ?? "self_roll") !== "self_roll" ||
    !Array.isArray(savingThrow.saveAbilityFilter) ||
    !sameStringSet(savingThrow.saveAbilityFilter, ["str"]) ||
    !spellMechanicsObjectHasOnlyKeys(savingThrow, [
      "kind",
      "mode",
      "affects",
      "on",
      "saveAbilityFilter",
    ])
  )
    issues.push("savingThrowRollMode");
  if (
    damage?.delta.kind !== "fixed_dice" ||
    damage.delta.dice !== CREATURE_SIZE_CHANGE_DAMAGE_DICE ||
    damage.delta.dieSize !== CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE ||
    damage.delta.sign !== (direction === "increase" ? "+" : "-") ||
    damage.damageSourceFilter?.kind !== "attack_hit" ||
    damage.damageSourceFilter.attackRollFilter !== "weapon_or_unarmed_strike" ||
    damage.minimumDamageTotal !==
      (direction === "increase"
        ? undefined
        : CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL) ||
    !spellMechanicsObjectHasOnlyKeys(
      damage,
      direction === "increase"
        ? ["kind", "delta", "damageSourceFilter"]
        : ["kind", "delta", "damageSourceFilter", "minimumDamageTotal"],
    ) ||
    !spellMechanicsObjectHasOnlyKeys(damage.delta, [
      "kind",
      "dice",
      "dieSize",
      "sign",
    ]) ||
    !spellMechanicsObjectHasOnlyKeys(damage.damageSourceFilter, [
      "kind",
      "attackRollFilter",
    ])
  )
    issues.push("damageModifier");
  return issues;
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
  const effectPath = spellActivationEffectPath(
    phaseOrdinal,
    PositiveInteger(1),
  );
  const issues: Array<{
    readonly failedFact: CreatureSizeChangeFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const push = (
    failedFact: CreatureSizeChangeFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== CREATURE_SIZE_CHANGE_SPELL_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "transmutation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== CREATURE_SIZE_CHANGE_RANGE_FEET ||
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

  const duration = creatureSizeChangeDuration(mechanics.duration);
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
      mechanics.duration.upTo.amount !== CREATURE_SIZE_CHANGE_DURATION_MINUTES
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

  if (mechanics.phases.length === 0)
    push("phaseCount", spellActivationPhasePath(phaseOrdinal));
  for (const [index] of mechanics.phases.entries())
    if (PositiveInteger(index + 1) !== phaseOrdinal)
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
  if (phase === undefined) {
    push("phase", spellActivationPhasePath(phaseOrdinal));
  } else {
    const phasePath = spellActivationPhasePath(phaseOrdinal);
    const projection = creatureSizeChangePhaseSemanticProjection(phase);
    if (!spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS))
      push("phase", phasePath);
    if (projection.constitutionSavingThrowAbility === undefined)
      push("saveAbility", phasePath);
    if (
      projection.casterSpellSaveDc === undefined ||
      !spellMechanicsObjectHasOnlyKeys(phase.dc, ["kind"])
    )
      push("saveDc", phasePath);
    if (projection.unwillingCreatureTargetApplicability === undefined)
      push("saveAppliesIf", phasePath);
    if (
      projection.noEffectOnSuccessfulSave === undefined ||
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
    if (!projection.targetsOneCreatureOrObject)
      push("targetSelection", attachmentPath);
    if (
      !projection.requiresVisibleObjectNotWornOrCarried ||
      projection.objectFilter === undefined ||
      !spellMechanicsObjectHasOnlyKeys(
        projection.objectFilter,
        OBJECT_FILTER_FIELDS,
      )
    )
      push("objectTarget", attachmentPath);

    if (
      phase.onFail.kind !== "choose_effect_mode" ||
      !spellMechanicsObjectHasOnlyKeys(phase.onFail, MODE_CHOICE_FIELDS)
    ) {
      push("modeChoice", effectPath);
    } else {
      const options = phase.onFail.options;
      const increase = modeForDirection(options, "increase");
      const decrease = modeForDirection(options, "decrease");
      if (
        options.length !== 2 ||
        increase === undefined ||
        decrease === undefined
      )
        push("modeCount", effectPath);
      for (const failedFact of creatureSizeModeIssueFacts(
        direction === "increase" ? increase : decrease,
        direction,
      ))
        push(failedFact, effectPath);
      const oppositeDirection =
        direction === "increase" ? "decrease" : "increase";
      for (const failedFact of creatureSizeModeIssueFacts(
        direction === "increase" ? decrease : increase,
        oppositeDirection,
      ))
        push(failedFact, effectPath);
    }
  }

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined)
    return {
      tag: "unsupported",
      issues: nonEmpty,
    };
  const projection =
    phase === undefined
      ? undefined
      : creatureSizeChangePhaseSemanticProjection(phase);
  if (
    duration === undefined ||
    projection?.constitutionSavingThrowAbility === undefined ||
    projection.casterSpellSaveDc === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact: duration === undefined ? "duration" : "phase",
          mechanicsPath:
            duration === undefined
              ? spellMechanicsHeaderPath("duration")
              : spellActivationPhasePath(phaseOrdinal),
        },
      ],
    };
  const facts = {
    ...source.spellDefinitionRuleFacts,
    level: CREATURE_SIZE_CHANGE_SPELL_LEVEL,
    duration,
    rangeFeet: CREATURE_SIZE_CHANGE_RANGE_FEET,
    ability: projection.constitutionSavingThrowAbility,
    dc: projection.casterSpellSaveDc,
    direction,
  } satisfies CreatureSizeChangeFacts<Direction>;
  return {
    tag: "supported",
    facts,
    evidence: creatureSizeChangeEvidence(mechanics, phaseOrdinal),
  };
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
