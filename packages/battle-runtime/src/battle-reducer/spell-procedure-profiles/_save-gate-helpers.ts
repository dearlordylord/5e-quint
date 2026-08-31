import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// Save-gated spell profile projections shared by save-gated profiles.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  DAMAGE_TYPES,
  movementFeet,
  type Ability,
  type Condition,
  type DamageType,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  ActivationPhase,
  Attachment,
  EffectAtom,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  isFixedDistancePointRange,
  topLevelSpellCastingTime,
} from "@dnd/surface/surface/types";
import { Result, Match } from "effect";
import {
  FAILED_SAVE_BLINDED_CONDITION as HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
  FAILED_SAVE_RESTRAINED_CONDITION as AREA_RESTRAINT_FAILED_SAVE_CONDITION,
  SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
  type DamageSpellSource,
  type DimIlluminationEmissionFacts,
  type SaveGateFailureEffect,
  type SpellActivationPhase,
  type SpellFailedSaveAttackRollEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellPostSaveAreaEffect,
  type SpellSavingThrowRollModeRule,
  type SpellTargeting,
  type SaveGatedConditionImmunitySpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { damageSpellSource } from "../spells-invocation-guards.ts";
import { isCantripSpellAccess } from "../../procedure-execution/spell-invocation-vocabulary.ts";
import {
  cantripSpellAccessFor,
  spellInvocationResourceForCastOption,
  type SpellAdmissionContext,
} from "./profile.ts";
import type { CombatantId } from "../../identity.ts";
import type {
  SaveGatedConditionSpellTargeting,
  SaveGatedDamageSpellTargeting,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCountBySlot,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import { illuminationEmissionFactsFromSurface } from "./illumination-emission-facts.ts";

export type SaveGateConditionSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: (
    slotLevel: SpellSlotLevel,
  ) => SaveGatedConditionSpellTargeting;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
  readonly effect: SpellFailedSaveConditionEffect;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
  readonly rangeFeet: MovementFeet;
};

export type SaveGateAttackRollAdvantageSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly effect: SpellFailedSaveAttackRollEffect;
  readonly illumination: DimIlluminationEmissionFacts;
  readonly rangeFeet: MovementFeet;
};

type SaveGateFailedEffect = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>["onFail"];
type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type ModifyRollAdvantageEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "modify_roll_advantage" }
>;
type AbilityChoiceHoleFilter = {
  readonly kind: "hole";
  readonly value: {
    readonly kind: "choice";
    readonly options: readonly [Ability, ...Ability[]];
  };
};
type ChosenAbilitySaveDisadvantageEffect = ModifyRollAdvantageEffect & {
  readonly saveAbilityFilter: AbilityChoiceHoleFilter;
};
type TimedBattleSpell = BattleSpellAdmissionSource & {
  readonly mechanics: BattleSpellAdmissionSource["mechanics"] & {
    readonly duration: Extract<
      BattleSpellAdmissionSource["mechanics"]["duration"],
      { readonly kind: "timed" }
    >;
  };
};
type SupportedDamageComponent = {
  readonly expr: NonNullable<ReturnType<typeof supportedDamageAmountExpr>>;
  readonly damageType: DamageType;
};
type WeaponDamageReductionRepeatSavePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "con";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
};

const LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL = 3;
const LARGE_FIRE_SPHERE_RANGE_FEET = 150;
const LARGE_FIRE_SPHERE_RADIUS_FEET = 20;
const LARGE_FIRE_SPHERE_BASE_DAMAGE_DICE = 8;
const LARGE_FIRE_SPHERE_DAMAGE_DIE_SIZE = 6;
const LARGE_FIRE_SPHERE_SLOT_DAMAGE_DICE_INCREMENT = 1;
const LEVEL5_SELF_CONE_SAVE_GATE_LENGTH_FEET = 60;
const SIMPLE_LINE_DAMAGE_PROFILE_LENGTH_FEET = 100;
const SIMPLE_LINE_DAMAGE_PROFILE_WIDTH_FEET = 5;
const SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL = 2;
const SMALL_THUNDER_SPHERE_RANGE_FEET = 60;
const SMALL_THUNDER_SPHERE_RADIUS_FEET = 10;
const SMALL_THUNDER_SPHERE_BASE_DAMAGE_DICE = 3;
const SMALL_THUNDER_SPHERE_DAMAGE_DIE_SIZE = 8;
const SMALL_THUNDER_SPHERE_SLOT_DAMAGE_DICE_INCREMENT = 1;
const SENSORY_CONDITION_CHOICE_BASE_SPELL_LEVEL = 2;
const SENSORY_CONDITION_CHOICE_RANGE_FEET = 120;
const SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS = [
  "blinded",
  "deafened",
] as const satisfies readonly [Condition, ...Condition[]];
const HUMANOID_PARALYSIS_BASE_SPELL_LEVEL = 2;
const HUMANOID_PARALYSIS_RANGE_FEET = 60;
const PARALYSIS_FAILED_SAVE_CONDITION =
  "paralyzed" as const satisfies Condition;
const HUMANOID_PARALYSIS_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const CREATURE_PARALYSIS_BASE_SPELL_LEVEL = 5;
const CREATURE_PARALYSIS_RANGE_FEET = 90;
const AREA_RESTRAINT_RANGE_FEET = 90;
const AREA_CONDITION_IMMUNITY_BASE_SPELL_LEVEL = 2;
const AREA_CONDITION_IMMUNITY_RANGE_FEET = 60;
const AREA_CONDITION_IMMUNITY_RADIUS_FEET = 20;
const AREA_CONDITION_IMMUNITIES = [
  "charmed",
  "frightened",
] as const satisfies readonly [Condition, Condition];
const AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_BASE_SPELL_LEVEL = 2;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET = 60;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_AMOUNT = 1;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_UNIT = "minute";

function spellHasActionCastingTime(spell: BattleSpellAdmissionSource): boolean {
  return topLevelSpellCastingTime(spell.mechanics)?.kind === "action";
}

function allAdmissionFactsHold(...facts: readonly boolean[]): boolean {
  return facts.every(Boolean);
}

function pointOriginCubeSaveGatePhase(
  phase: ActivationPhase | undefined,
): { readonly phase: SaveGatePhase; readonly sideFeet: number } | null {
  if (phase?.kind !== "save_gate") return null;
  if (phase.attachment.kind !== "hole") return null;
  if (phase.attachment.value.kind !== "area") return null;
  if (phase.attachment.value.origin.kind !== "point_within_range") return null;
  if (phase.attachment.value.shape.kind !== "cube") return null;
  return { phase, sideFeet: phase.attachment.value.shape.sideFeet };
}

function selfOriginConeSaveGatePhase(
  phase: ActivationPhase | undefined,
): { readonly phase: SaveGatePhase; readonly lengthFeet: number } | null {
  if (phase?.kind !== "save_gate") return null;
  if (phase.attachment.kind !== "area") return null;
  if (phase.attachment.origin.kind !== "self") return null;
  if (phase.attachment.shape.kind !== "cone") return null;
  return { phase, lengthFeet: phase.attachment.shape.lengthFeet };
}

function hasPointRangeFeet(
  spell: BattleSpellAdmissionSource,
  rangeFeet: number,
): boolean {
  const range = spell.mechanics.range;
  return range.kind === "point" && range.feet === rangeFeet;
}

function hasOneMinuteConcentrationDuration(
  spell: BattleSpellAdmissionSource,
): boolean {
  const duration = spell.mechanics.duration;
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1
  );
}

function hasOneRoundTimedDuration(spell: BattleSpellAdmissionSource): boolean {
  const duration = spell.mechanics.duration;
  return (
    duration.kind === "timed" &&
    duration.value.unit === "round" &&
    duration.value.amount === 1
  );
}

function isFailedSaveCondition(
  effect: SaveGateFailedEffect,
  condition: Condition,
): boolean {
  return effect.kind === "apply_condition" && effect.condition === condition;
}

export function hasSaveGateRepeatSaves(
  phase: ActivationPhase | undefined,
): boolean {
  return phase?.kind === "save_gate" && phase.repeatSaves !== undefined;
}

export function supportedCantripSaveGateDamageProfile(
  spell: BattleSpellAdmissionSource,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return supportedSaveGateDamageProfile({
    spell,
    access: cantripSpellAccessFor(spell.castingSource),
    resource: { tag: "none" },
    characterLevel,
  });
}

export function supportedPreparedSaveGateDamageProfile(
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSaveGateDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: spellInvocationResourceForCastOption(slot),
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedSaveGateConditionProfile(
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const conditionSpell = supportedSaveGateConditionSpell(spell);
  if (conditionSpell === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedCondition",
        spell,
        ability: conditionSpell.phase.ability,
        dc: conditionSpell.phase.dc,
        targeting: conditionSpell.targeting(slot.spellLevel),
        targetCreatureTypes: conditionSpell.targetCreatureTypes,
        effect: conditionSpell.effect,
        saveRollModeRule: conditionSpell.saveRollModeRule,
        rangeFeet: conditionSpell.rangeFeet,
      },
    ];
  });
}

export function supportedSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  return (
    creatureTypeRestrictedCharmSaveGateConditionSpell(spell) ??
    sensoryConditionChoiceSaveGateSpell(spell) ??
    humanoidCharmSaveGateConditionSpell(spell) ??
    humanoidParalysisSaveGateConditionSpell(spell) ??
    creatureParalysisSaveGateConditionSpell(spell) ??
    hitPointBudgetBlindedSaveGateConditionSpell(spell) ??
    persistentAreaRestrainedSaveGateConditionSpell(spell)
  );
}

export function supportedPreparedSaveGateAttackRollAdvantageProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const attackRollAdvantageSpell = areaSaveGatedAttackRollAdvantageSpell(
    actorId,
    spell,
  );
  if (attackRollAdvantageSpell === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    /* v8 ignore start -- @preserve -- Domain invariant: this profile admits only level-1 spells, and SpellSlotLevel cannot represent a slot below level 1. */
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    /* v8 ignore stop -- @preserve */
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedAttackRollAdvantage",
        spell,
        ability: attackRollAdvantageSpell.phase.ability,
        dc: attackRollAdvantageSpell.phase.dc,
        targeting: attackRollAdvantageSpell.targeting,
        effect: attackRollAdvantageSpell.effect,
        illumination: attackRollAdvantageSpell.illumination,
        rangeFeet: attackRollAdvantageSpell.rangeFeet,
      },
    ];
  });
}

export function supportedPreparedAbilityD20TestRollModeSaveGateProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const d20Lifecycle = abilityD20TestRollModeSaveGateSpell(actorId, spell);
  if (d20Lifecycle === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "abilityD20TestRollModeSaveGate",
        spell,
        actionCost: "magicAction",
        ability: d20Lifecycle.phase.ability,
        dc: d20Lifecycle.phase.dc,
        targeting: d20Lifecycle.targeting,
        rangeFeet: d20Lifecycle.rangeFeet,
        successEffect: d20Lifecycle.successEffect,
        failedSaveEffect: d20Lifecycle.failedSaveEffect,
        failedSaveDamagePenaltyEffect:
          d20Lifecycle.failedSaveDamagePenaltyEffect,
      },
    ];
  });
}

export function supportedPreparedSaveGateConditionImmunityProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const conditionImmunitySpell = areaConditionImmunitySaveGateSpell(
    actorId,
    spell,
  );
  if (conditionImmunitySpell === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedConditionImmunity",
        spell,
        actionCost: "magicAction",
        ability: conditionImmunitySpell.phase.ability,
        dc: conditionImmunitySpell.phase.dc,
        targeting: conditionImmunitySpell.targeting,
        targetCreatureTypes: conditionImmunitySpell.targetCreatureTypes,
        activeEffects: conditionImmunitySpell.activeEffects,
        rangeFeet: conditionImmunitySpell.rangeFeet,
      },
    ];
  });
}

function areaConditionImmunitySaveGateSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly targetCreatureTypes: typeof AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES;
  readonly activeEffects: SaveGatedConditionImmunitySpellInvocation["activeEffects"];
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const area =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area"
      ? phase.attachment.value
      : null;
  const targetSelection = area?.selection;
  const immunityEffects =
    phase?.kind === "save_gate"
      ? conditionImmunityEffectsFromSaveGateFailure(phase.onFail)
      : null;
  if (
    spell.mechanics.level !== AREA_CONDITION_IMMUNITY_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== AREA_CONDITION_IMMUNITY_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "cha" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    area === null ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== AREA_CONDITION_IMMUNITY_RADIUS_FEET ||
    targetSelection?.mode !== "any_number" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    !sameStringSet(
      targetSelection.typeFilter ?? [],
      AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
    ) ||
    immunityEffects === null
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(area.shape.radiusFeet),
    },
    targetCreatureTypes: AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
    activeEffects: [
      {
        kind: "conditionImmunity",
        sourceCombatantId: actorId,
        condition: AREA_CONDITION_IMMUNITIES[0],
        expiresAt: { kind: "concentration", combatantId: actorId },
      },
      {
        kind: "conditionImmunity",
        sourceCombatantId: actorId,
        condition: AREA_CONDITION_IMMUNITIES[1],
        expiresAt: { kind: "concentration", combatantId: actorId },
      },
    ],
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

type GrantConditionImmunitySaveGateEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "grant_condition_immunity" }
>;

function conditionImmunityEffectsFromSaveGateFailure(
  effect: SaveGateFailedEffect,
):
  | readonly [
      GrantConditionImmunitySaveGateEffect,
      GrantConditionImmunitySaveGateEffect,
    ]
  | null {
  const effects =
    effect.kind === "composite" ? effect.effects : ([effect] as const);
  const immunities = effects.filter(
    (candidate): candidate is GrantConditionImmunitySaveGateEffect =>
      candidate.kind === "grant_condition_immunity",
  );
  return effects.length === AREA_CONDITION_IMMUNITIES.length &&
    immunities.length === AREA_CONDITION_IMMUNITIES.length &&
    sameStringSet(
      immunities.map((immunity) => immunity.condition),
      AREA_CONDITION_IMMUNITIES,
    )
    ? [immunities[0]!, immunities[1]!]
    : null;
}

export function oneAdditionalTargetPerSpellSlotAboveBaseLevel(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed === true) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count === "number" ||
    count.kind !== "linear" ||
    count.base !== 1 ||
    count.baseLevel !== spellLevel ||
    count.perSlotAboveBase !== 1
  ) {
    return null;
  }
  return scalarBuffSpellTargetCountBySlot(selection, spellLevel);
}

function abilityD20TestRollModeSaveGateSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly phase: WeaponDamageReductionRepeatSavePhase;
  readonly targeting: Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly rangeFeet: MovementFeet;
  readonly successEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["successEffect"];
  readonly failedSaveEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["failedSaveEffect"];
  readonly failedSaveDamagePenaltyEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["failedSaveDamagePenaltyEffect"];
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_UNIT ||
    spell.mechanics.duration.upTo.amount !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_AMOUNT ||
    spell.mechanics.phases.length !== 1 ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    !isWeaponDamageReductionRepeatSavePhase(phase)
  ) {
    return null;
  }
  return {
    phase,
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    rangeFeet: movementFeet(WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET),
    successEffect: {
      kind: "nextAttackRollBySelf",
      sourceCombatantId: actorId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: actorId },
    },
    failedSaveEffect: {
      kind: "abilityD20TestRollModeEndTurnSave",
      sourceCombatantId: actorId,
      ability: "str",
      mode: "disadvantage",
      save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.success,
      },
    },
    failedSaveDamagePenaltyEffect: {
      kind: "sourceDamageRollPenalty",
      sourceCombatantId: actorId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.success,
      },
    },
  };
}

function isWeaponDamageReductionRepeatSavePhase(
  phase: ActivationPhase | undefined,
): phase is WeaponDamageReductionRepeatSavePhase {
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const success = phase?.kind === "save_gate" ? phase.onSuccess : undefined;
  const successDisadvantage =
    success?.kind === "modify_roll_advantage" ? success : undefined;
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const d20DisadvantageEffects = failedEffects.filter(
    isRayStrengthD20DisadvantageEffect,
  );
  const damagePenalty = failedEffects.find(
    (effect) => effect.kind === "modify_damage_numeric",
  );
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    phase.attachment.value.selection.mode === "one" &&
    successDisadvantage?.mode === "disadvantage" &&
    sameStringSet(successDisadvantage.on, ["attack_roll"]) &&
    successDisadvantage.count === 1 &&
    successDisadvantage.expiresOn?.kind === "caster_turn_start" &&
    successDisadvantage.abilityFilter === undefined &&
    successDisadvantage.skillFilter === undefined &&
    successDisadvantage.conditionFilter === undefined &&
    d20DisadvantageEffects.length === 1 &&
    damagePenalty?.kind === "modify_damage_numeric" &&
    damagePenalty.delta.kind === "fixed_dice" &&
    damagePenalty.delta.sign === "-" &&
    damagePenalty.delta.dice === 1 &&
    damagePenalty.delta.dieSize === 8 &&
    failedEffects.length === 2 &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onFailAgain === undefined
  );
}

function isRayStrengthD20DisadvantageEffect(
  effect: EffectAtom,
): effect is ModifyRollAdvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    sameStringSet(effect.on, [
      "attack_roll",
      "ability_check",
      "saving_throw",
    ]) &&
    sameAbilitySet(effect.abilityFilter, ["str"]) &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined
  );
}

function sameAbilitySet(
  actual: ModifyRollAdvantageEffect["abilityFilter"],
  expected: readonly Ability[],
): boolean {
  return Array.isArray(actual) && sameStringSet(actual, expected);
}

export function areaSaveGatedAttackRollAdvantageSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): SaveGateAttackRollAdvantageSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = pointOriginCubeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedSaveFacts = visibilityGrantingAreaFailedSaveFacts(phase.onFail);
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      hasPointRangeFeet(spell, 60),
      hasOneMinuteConcentrationDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "dex",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
      failedSaveFacts !== null,
    )
  ) {
    return null;
  }
  if (failedSaveFacts === null) return null;

  return {
    phase,
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(saveGate.sideFeet),
    },
    effect: {
      kind: "saveGatedTargetProjection",
      sourceCombatantId: actorId,
      expiresAt: { kind: "concentration", combatantId: actorId },
    },
    illumination: failedSaveFacts.illumination,
    rangeFeet: movementFeet(60),
  };
}

function visibilityGrantingAreaFailedSaveFacts(
  effect: SaveGateFailedEffect | undefined,
): {
  readonly illumination: SaveGateAttackRollAdvantageSpell["illumination"];
} | null {
  if (effect === undefined) return null;
  if (effect.kind !== "composite") return null;
  if (effect.effects.length !== 3) return null;
  const attackAdvantageEffects = effect.effects.filter(
    isAttackRollAdvantageEffect,
  );
  const suppressesInvisible = effect.effects.some(
    isInvisibleBenefitSuppression,
  );
  const illumination = singleDimIlluminationFacts(effect.effects);
  if (attackAdvantageEffects.length !== 1) return null;
  if (!suppressesInvisible) return null;
  if (illumination === null) return null;
  if (illumination.emission.kind !== "dim") return null;
  return {
    illumination: {
      emission: illumination.emission,
      opaqueCoverInteraction: {
        kind: illumination.opaqueCoverInteraction.kind,
      },
    },
  };
}

type DimIlluminationEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "emit_dim_illumination" }
>;

function singleDimIlluminationFacts(
  effects: readonly SaveGateFailedEffect[],
): ReturnType<typeof illuminationEmissionFactsFromSurface> | null {
  const illuminationEffects = effects.filter(
    (candidate): candidate is DimIlluminationEffect =>
      candidate.kind === "emit_dim_illumination",
  );
  if (illuminationEffects.length !== 1) return null;
  return illuminationEmissionFactsFromSurface({
    effect: illuminationEffects[0]!,
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
  });
}

function isAttackRollAdvantageEffect(
  effect: SaveGateFailedEffect,
): effect is ModifyRollAdvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    allAdmissionFactsHold(
      effect.mode === "advantage",
      sameStringSet(effect.on, ["attack_roll"]),
    )
  );
}

function isInvisibleBenefitSuppression(effect: SaveGateFailedEffect): boolean {
  return (
    effect.kind === "suppress_condition_benefit" &&
    effect.condition === "invisible"
  );
}

export function creatureTypeRestrictedCharmSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 24 },
    targetCreatureType: "beast",
    saveRollModeRule: null,
  });
}

export function humanoidCharmSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 1 },
    targetCreatureType: "humanoid",
    saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
  });
}

export function sensoryConditionChoiceSaveGateSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const failedCondition =
    failedEffect?.kind === "apply_condition" ? failedEffect.condition : null;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== SENSORY_CONDITION_CHOICE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SENSORY_CONDITION_CHOICE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    failedCondition === null ||
    typeof failedCondition === "string" ||
    !("kind" in failedCondition) ||
    failedCondition.kind !== "choose" ||
    !sameStringSet(
      failedCondition.from,
      SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
    ) ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  const targetCountBySlot = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetCountBySlot === null ||
    !isCreatureOnlyTargetSelection(targetSelection)
  ) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "choice",
      choices: SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
      expiresAt: { kind: "duration", durationTicks: durationTicks.success },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(90),
  };
}

export function humanoidParalysisSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  return paralyzedTargetListSaveGateConditionSpell({
    spell,
    baseSpellLevel: HUMANOID_PARALYSIS_BASE_SPELL_LEVEL,
    rangeFeet: HUMANOID_PARALYSIS_RANGE_FEET,
    targetCreatureTypes: HUMANOID_PARALYSIS_TARGET_CREATURE_TYPES,
  });
}

export function creatureParalysisSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  return paralyzedTargetListSaveGateConditionSpell({
    spell,
    baseSpellLevel: CREATURE_PARALYSIS_BASE_SPELL_LEVEL,
    rangeFeet: CREATURE_PARALYSIS_RANGE_FEET,
    targetCreatureTypes: null,
  });
}

function paralyzedTargetListSaveGateConditionSpell(input: {
  readonly spell: BattleSpellAdmissionSource;
  readonly baseSpellLevel: number;
  readonly rangeFeet: number;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
}): SaveGateConditionSpell | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !== input.baseSpellLevel ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== input.rangeFeet ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    !isCreatureOnlyTargetSelection(targetSelection) ||
    !matchesOptionalCreatureTypeFilter(
      targetSelection,
      input.targetCreatureTypes,
    ) ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== PARALYSIS_FAILED_SAVE_CONDITION ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  const targetCountBySlot = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
    targetSelection,
    spell.mechanics.level,
  );
  if (targetCountBySlot === null) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    targetCreatureTypes: input.targetCreatureTypes,
    effect: {
      kind: "fixed",
      condition: PARALYSIS_FAILED_SAVE_CONDITION,
      expiresAt: {
        kind: "concentration",
        durationTicks: durationTicks.success,
      },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function matchesOptionalCreatureTypeFilter(
  targetSelection: TargetSelection,
  targetCreatureTypes: readonly CreatureType[] | null,
): boolean {
  const typeFilter =
    "typeFilter" in targetSelection ? targetSelection.typeFilter : undefined;
  return targetCreatureTypes === null
    ? typeFilter === undefined
    : sameStringSet(typeFilter ?? [], targetCreatureTypes);
}

function isCreatureOnlyTargetSelection(
  targetSelection: TargetSelection,
): boolean {
  return (
    targetSelection.targetKinds === undefined ||
    sameStringSet(targetSelection.targetKinds, ["creature"])
  );
}

function targetSelectionMatchesCreatureType(
  targetSelection: TargetSelection | null,
  creatureType: CreatureType,
): boolean {
  if (targetSelection === null || !("typeFilter" in targetSelection)) {
    return false;
  }
  return (
    targetSelection.typeFilter?.length === 1 &&
    targetSelection.typeFilter[0] === creatureType
  );
}

function creatureTypeCharmedSaveGateConditionSpell(input: {
  readonly spell: BattleSpellAdmissionSource;
  readonly duration: { readonly unit: "hour"; readonly amount: 1 | 24 };
  readonly targetCreatureType: CreatureType;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
}): SaveGateConditionSpell | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.mechanics.level !== 1 ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== input.duration.unit ||
    spell.mechanics.duration.value.amount !== input.duration.amount ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_damaged_by_caster_or_ally" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    !isCreatureOnlyTargetSelection(targetSelection) ||
    !targetSelectionMatchesCreatureType(
      targetSelection,
      input.targetCreatureType,
    ) ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== "charmed"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  const targetCountBySlot = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
    targetSelection,
    spell.mechanics.level,
  );
  if (targetCountBySlot === null) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel): SaveGatedConditionSpellTargeting => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    targetCreatureTypes: [input.targetCreatureType],
    effect: {
      kind: "fixed",
      condition: "charmed",
      expiresAt: { kind: "duration", durationTicks: durationTicks.success },
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: input.saveRollModeRule,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function hitPointBudgetBlindedSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = selfOriginConeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedEffect = phase.onFail;
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      spell.mechanics.range.kind === "self",
      hasOneRoundTimedDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "con",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
      isFailedSaveCondition(
        failedEffect,
        HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
      ),
    )
  ) {
    return null;
  }
  return {
    phase,
    targeting: () => ({
      kind: "selfOriginCone",
      lengthFeet: movementFeet(saveGate.lengthFeet),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
      expiresAt: "endOfCasterNextTurn",
      escape: null,
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(0),
  };
}

export function persistentAreaRestrainedSaveGateConditionSpell(
  spell: BattleSpellAdmissionSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = pointOriginCubeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedEffect = phase.onFail;
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      hasPointRangeFeet(spell, AREA_RESTRAINT_RANGE_FEET),
      hasOneMinuteConcentrationDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "str",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
      isFailedSaveCondition(failedEffect, AREA_RESTRAINT_FAILED_SAVE_CONDITION),
    )
  ) {
    return null;
  }
  return {
    phase,
    targeting: () => ({
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(saveGate.sideFeet),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: AREA_RESTRAINT_FAILED_SAVE_CONDITION,
      expiresAt: "concentration",
      escape: {
        kind: "abilityCheck",
        ability: "str",
        skill: "athletics",
        allowedActor: "target",
        successEnds: "condition",
      },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(AREA_RESTRAINT_RANGE_FEET),
  };
}

export function supportedSaveGateDamageProfile(
  input: {
    readonly spell: BattleSpellAdmissionSource;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const postSaveAreaEffect =
    phase?.kind === "save_gate"
      ? saveGatedDamagePostSaveAreaEffect(
          spell,
          phase,
          spell.mechanics.phases[1],
        )
      : null;
  const saveRollModeRule =
    phase?.kind === "save_gate"
      ? saveGatedDamageSaveRollModeRule(spell, phase)
      : null;
  const targeting =
    phase?.kind === "save_gate"
      ? saveGatedDamageTargeting(spell, phase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : targeting === null
        ? null
        : areaSaveGateSpellRangeFeet(spell.mechanics.range, targeting);
  const failedSaveEffects =
    phase?.kind === "save_gate"
      ? supportedSaveGateFailedSaveEffects(
          spell,
          phase,
          phase.onFail,
          postSaveAreaEffect,
        )
      : null;
  if (
    (isCantripSpellAccess(input.access)
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    !spellHasActionCastingTime(spell) ||
    rangeFeet === null ||
    spell.mechanics.phases.length !==
      saveGatedDamagePhaseCount(postSaveAreaEffect) ||
    phase?.kind !== "save_gate" ||
    targeting === null ||
    !saveGateDamageSuccessIsSupported(phase) ||
    failedSaveEffects === null
  ) {
    return [];
  }
  const primaryDamage = failedSaveEffects.damage;
  if (!isDamageType(primaryDamage.damageType)) {
    return [];
  }
  const primaryDamageExpr = supportedDamageAmountExpr({
    amount: primaryDamage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (primaryDamageExpr === null) {
    return [];
  }
  const damageComponents: [
    SupportedDamageComponent,
    ...SupportedDamageComponent[],
  ] = [{ expr: primaryDamageExpr, damageType: primaryDamage.damageType }];
  for (const damage of failedSaveEffects.additionalDamageComponents) {
    if (!isDamageType(damage.damageType)) {
      return [];
    }
    const expr = supportedDamageAmountExpr({
      amount: damage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: input.slotLevel,
      characterLevel: input.characterLevel,
    });
    if (expr === null) {
      return [];
    }
    damageComponents.push({ expr, damageType: damage.damageType });
  }
  const [resolvedPrimaryDamage, ...additionalDamageComponents] =
    damageComponents;

  const saveGatedInvocation = {
    procedure: "saveGatedDamage" as const,
    spell,
    castingTime: { kind: "action" as const },
    ability: phase.ability,
    dc: phase.dc,
    targeting,
    damage: {
      expr: resolvedPrimaryDamage.expr,
      damageType: resolvedPrimaryDamage.damageType,
    },
    additionalDamageComponents,
    successDamage: (phase.onSuccess.kind === "half_damage"
      ? "half"
      : "none") as "half" | "none",
    rangeFeet,
    failedSavePostDamageRiders: failedSaveEffects.postDamageRiders,
    failedSaveConditionEffects: failedSaveEffects.conditionEffects,
    failedSaveAbilityChoices: failedSaveEffects.abilityChoices,
    saveRollModeRule,
    ...(postSaveAreaEffect === null ? {} : { postSaveAreaEffect }),
  };

  return [{ ...damageSpellSource(input), ...saveGatedInvocation }];
}

function saveGateDamageSuccessIsSupported(
  phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    phase.onSuccess.kind === "none" || phase.onSuccess.kind === "half_damage"
  );
}

function isDamageType(value: unknown): value is DamageType {
  return (
    typeof value === "string" &&
    DAMAGE_TYPES.includes(value as (typeof DAMAGE_TYPES)[number])
  );
}

export function saveGateTargeting(
  attachment: Attachment,
): SaveGatedDamageSpellTargeting | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "target" &&
    value.selection.mode === "one" &&
    (value.selection.targetKinds === undefined ||
      sameStringSet(value.selection.targetKinds, ["creature"]))
  ) {
    return { kind: "singleCombatant" };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cylinder" &&
    typeof value.shape.radiusFeet === "number" &&
    typeof value.shape.heightFeet === "number"
  ) {
    return {
      kind: "pointOriginCylinder",
      radiusFeet: movementFeet(value.shape.radiusFeet),
      heightFeet: movementFeet(value.shape.heightFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
  ) {
    return {
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === 15
  ) {
    return {
      kind: "selfOriginCube",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "line" &&
    value.shape.lengthFeet === SIMPLE_LINE_DAMAGE_PROFILE_LENGTH_FEET &&
    value.shape.widthFeet === SIMPLE_LINE_DAMAGE_PROFILE_WIDTH_FEET
  ) {
    return {
      kind: "selfOriginLine",
      lengthFeet: movementFeet(value.shape.lengthFeet),
      widthFeet: movementFeet(value.shape.widthFeet),
    };
  }
  return null;
}

function saveGatedDamageTargeting(
  spell: BattleSpellAdmissionSource,
  attachment: Attachment,
): SaveGatedDamageSpellTargeting | null {
  return (
    saveGateTargeting(attachment) ??
    level5SelfOriginConeTargeting(spell, attachment) ??
    largeFireSphereTargeting(spell, attachment) ??
    smallThunderSphereTargeting(spell, attachment)
  );
}

function level5SelfOriginConeTargeting(
  spell: BattleSpellAdmissionSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "selfOriginCone" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === 5 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "self" &&
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === LEVEL5_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  return null;
}

function largeFireSphereTargeting(
  spell: BattleSpellAdmissionSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL &&
    spellHasActionCastingTime(spell) &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === LARGE_FIRE_SPHERE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

function smallThunderSphereTargeting(
  spell: BattleSpellAdmissionSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === SMALL_THUNDER_SPHERE_RANGE_FEET &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SMALL_THUNDER_SPHERE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

export function areaSaveGateSpellRangeFeet(
  range: BattleSpellAdmissionSource["mechanics"]["range"],
  targeting: Exclude<
    SpellTargeting,
    { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
  >,
): MovementFeet | null {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "pointOriginSphereDiameter" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCubeExcludingCaster" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCube" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "pointOriginGroundSquare" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "selfOriginCube" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginCone" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginLine" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginEmanation" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "primaryTargetOriginEmanation" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCylinder" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "targetList" }, () => fixedPointRangeFeet(range)),
    Match.exhaustive,
  );
}

function fixedPointRangeFeet(
  range: BattleSpellAdmissionSource["mechanics"]["range"],
): MovementFeet | null {
  return isFixedDistancePointRange(range) ? movementFeet(range.feet) : null;
}

export function supportedSaveGateFailedSaveEffects(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): {
  readonly damage: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>;
  readonly additionalDamageComponents: readonly Extract<
    SaveGateFailureEffect,
    { readonly kind: "damage" }
  >[];
  readonly postDamageRiders: readonly SpellFailedSavePostDamageRider[];
  readonly conditionEffects: readonly SpellFailedSaveConditionEffect[];
  readonly abilityChoices: readonly Ability[] | null;
} | null {
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    effect.kind === "damage"
  ) {
    return null;
  }
  if (effect.kind === "damage") {
    return {
      damage: effect,
      additionalDamageComponents: [],
      postDamageRiders: [],
      conditionEffects: [],
      abilityChoices: null,
    };
  }
  if (effect.kind !== "composite") {
    return null;
  }
  const [damage, ...remainingEffects] = effect.effects;
  if (damage?.kind !== "damage") {
    return null;
  }
  const additionalDamageComponents = remainingEffects.filter(
    (
      component,
    ): component is Extract<
      SaveGateFailureEffect,
      { readonly kind: "damage" }
    > => component.kind === "damage",
  );
  const riders = remainingEffects.filter(
    (component) => component.kind !== "damage",
  );
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    !isSelfOriginCubeFailedSaveDamageShape(damage)
  ) {
    return null;
  }
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    riders.filter((rider) =>
      isSelfOriginCubeCreaturePushRiderShape(phase, rider),
    ).length !== 1
  ) {
    return null;
  }
  const failedSaveForcedReactionMovementCount = riders.filter((rider) =>
    isFailedSaveForcedReactionMovementShape(spell, phase, rider),
  ).length;
  if (
    (failedSaveForcedReactionMovementCount > 0 &&
      (failedSaveForcedReactionMovementCount !== 1 ||
        !isFailedSaveForcedReactionMovementDamageShape(damage))) ||
    (isFailedSaveForcedReactionMovementDamageShape(damage) &&
      failedSaveForcedReactionMovementCount !== 1)
  ) {
    return null;
  }
  const conditionSupport = supportedFailedSaveConditionEffects(
    spell,
    phase,
    riders,
  );
  if (conditionSupport === null) {
    return null;
  }
  const postDamageRiderCandidates = riders.filter(
    (rider) => !conditionSupport.consumedEffects.includes(rider),
  );
  const postDamageRiders = supportedFailedSavePostDamageRiders(
    spell,
    phase,
    postDamageRiderCandidates,
    postSaveAreaEffect,
  );
  return postDamageRiders === null
    ? null
    : {
        damage,
        additionalDamageComponents,
        postDamageRiders,
        conditionEffects: conditionSupport.conditionEffects,
        abilityChoices: conditionSupport.abilityChoices,
      };
}

type FailedSaveConditionSupport = {
  readonly conditionEffects: readonly SpellFailedSaveConditionEffect[];
  readonly abilityChoices: readonly Ability[] | null;
  readonly consumedEffects: readonly SaveGateFailureEffect[];
};

function supportedFailedSaveConditionEffects(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
): FailedSaveConditionSupport | null {
  const chosenAbilitySaveDisadvantageProfileShape =
    chosenAbilitySaveDisadvantageConditionSupport(spell, phase, effects);
  if (chosenAbilitySaveDisadvantageProfileShape !== null) {
    return chosenAbilitySaveDisadvantageProfileShape;
  }
  return { conditionEffects: [], abilityChoices: null, consumedEffects: [] };
}

function chosenAbilitySaveDisadvantageConditionSupport(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
): FailedSaveConditionSupport | null {
  const poisoned = effects.find(
    (effect) =>
      effect.kind === "apply_condition" && effect.condition === "poisoned",
  );
  const disadvantage = effects.find(isChosenAbilitySaveDisadvantage);
  if (poisoned === undefined && disadvantage === undefined) {
    return null;
  }
  if (
    poisoned === undefined ||
    disadvantage === undefined ||
    !isChosenAbilitySaveDisadvantageSpellShape(spell, phase)
  ) {
    return null;
  }
  const abilityChoices = disadvantage.saveAbilityFilter.value.options;
  const repeatSave = phase.repeatSaves?.[0];
  if (
    repeatSave === undefined ||
    phase.repeatSaves?.length !== 1 ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.successesRequired !== 3 ||
    repeatSave.failuresRequired !== 3 ||
    repeatSave.onFailureThreshold !== "locks_duration"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  return {
    conditionEffects: [
      {
        kind: "fixed",
        condition: "poisoned",
        expiresAt: {
          kind: "duration",
          durationTicks: durationTicks.success,
        },
        escape: null,
        turnStartDamage: null,
        repeatSave: {
          kind: "counted",
          save: { ability: phase.ability, dc: phase.dc },
          successThreshold: repeatSave.successesRequired,
          failureThreshold: repeatSave.failuresRequired,
          savingThrowDisadvantageAbilities: abilityChoices,
        },
      },
    ],
    abilityChoices,
    consumedEffects: [poisoned, disadvantage],
  };
}

function isChosenAbilitySaveDisadvantageSpellShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): spell is TimedBattleSpell {
  return (
    spell.mechanics.level === 5 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.amount === 7 &&
    spell.mechanics.duration.value.unit === "day" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none"
  );
}

function isChosenAbilitySaveDisadvantage(
  effect: SaveGateFailureEffect,
): effect is ChosenAbilitySaveDisadvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    (effect.affects ?? "self_roll") === "self_roll" &&
    sameStringSet(effect.on ?? [], ["saving_throw"]) &&
    chosenAbilitySaveDisadvantageChoices(effect) !== null
  );
}

function chosenAbilitySaveDisadvantageChoices(
  effect: ModifyRollAdvantageEffect,
): readonly [Ability, ...Ability[]] | null {
  const filter = effect.saveAbilityFilter;
  if (
    filter === undefined ||
    Array.isArray(filter) ||
    !("kind" in filter) ||
    filter.kind !== "hole"
  ) {
    return null;
  }
  return filter.value.options;
}

export function supportedFailedSavePostDamageRiders(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): readonly SpellFailedSavePostDamageRider[] | null {
  const riders: SpellFailedSavePostDamageRider[] = [];
  for (const effect of effects) {
    if (
      postSaveAreaEffect?.kind === "selfOriginCubePush" &&
      isSelfOriginCubeCreaturePushRiderShape(phase, effect)
    ) {
      continue;
    }
    if (
      effect.kind === "forced_reaction_movement" &&
      isFailedSaveForcedReactionMovementShape(spell, phase, effect)
    ) {
      riders.push({
        kind: "forcedReactionMovement",
        direction: "awayFromCaster",
        route: "safest",
        distance: "asFarAsPossible",
        cost: "targetReactionIfAvailable",
      });
      continue;
    }
    if (
      effect.kind !== "modify_roll_advantage" ||
      effect.mode !== "disadvantage" ||
      !sameStringSet(effect.on ?? [], ["attack_roll"]) ||
      effect.count !== 1 ||
      effect.expiresOn?.kind !== "end_of_next_turn" ||
      (effect.affects ?? "self_roll") !== "self_roll" ||
      !isPsychicDamageNextAttackDisadvantageRiderShape(spell, phase)
    ) {
      return null;
    }
    riders.push({
      kind: "nextAttackRollByTarget",
      mode: "disadvantage",
      expiresAt: "endOfTargetNextTurn",
    });
  }
  return riders;
}

function isFailedSaveForcedReactionMovementShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === 60 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "forced_reaction_movement" &&
    effect.cost === "target_reaction_if_available" &&
    effect.direction === "away_from_caster" &&
    effect.distance === "as_far_as_possible" &&
    effect.route === "safest_available" &&
    effect.unavailable === "no_movement"
  );
}

function isFailedSaveForcedReactionMovementDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  if (amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    effect.damageType === "psychic",
    amount.axis === "slot",
    amount.startingAtLevel === 1,
    amount.base.dice === 3,
    amount.base.dieSize === 6,
    amount.base.flat === undefined,
    amount.base.spellcastingMod === undefined,
    amount.base.abilityModifier === undefined,
    amount.perLevel.dice === 1,
    amount.perLevel.dieSize === undefined,
    amount.perLevel.flat === undefined,
  );
}

function saveGatedDamagePostSaveAreaEffect(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return (
    objectIgnitingSphericalBurstPostSaveAreaEffect(spell, phase, directPhase) ??
    objectAffectingThunderBurstPostSaveAreaEffect(spell, phase, directPhase) ??
    forcedMovementCubeBurstPostSaveAreaEffect(spell, phase, directPhase)
  );
}

function saveGatedDamagePhaseCount(
  postSaveAreaEffect: SpellPostSaveAreaEffect | null,
): number {
  if (postSaveAreaEffect === null) {
    return 1;
  }
  return Match.value(postSaveAreaEffect).pipe(
    Match.when({ kind: "areaObjectIgnition" }, () => 2),
    Match.when({ kind: "selfOriginCubePush" }, () => 2),
    Match.when({ kind: "areaObjectDamage" }, () => 1),
    Match.exhaustive,
  );
}

function saveGatedDamageSaveRollModeRule(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): SpellSavingThrowRollModeRule | null {
  return isSmallThunderSphereSaveGateDamageShape(spell, phase)
    ? { kind: "creatureType", creatureType: "construct", mode: "disadvantage" }
    : null;
}

function objectIgnitingSphericalBurstPostSaveAreaEffect(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  const damage = phase.onFail;
  const ignite =
    directPhase?.kind === "direct" ? directPhase.effects?.[0] : undefined;
  if (
    spell.mechanics.level !== LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== LARGE_FIRE_SPHERE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "sphere" ||
    phase.attachment.value.shape.radiusFeet !== LARGE_FIRE_SPHERE_RADIUS_FEET ||
    damage.kind !== "damage" ||
    damage.damageType !== "fire" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.startingAtLevel !== LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL ||
    damage.amount.base.dice !== LARGE_FIRE_SPHERE_BASE_DAMAGE_DICE ||
    damage.amount.base.dieSize !== LARGE_FIRE_SPHERE_DAMAGE_DIE_SIZE ||
    damage.amount.perLevel.dice !==
      LARGE_FIRE_SPHERE_SLOT_DAMAGE_DICE_INCREMENT ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "hole" ||
    directPhase.attachment.value.kind !== "area" ||
    directPhase.attachment.value.origin.kind !== "point_within_range" ||
    directPhase.attachment.value.shape.kind !== "sphere" ||
    directPhase.attachment.value.shape.radiusFeet !==
      LARGE_FIRE_SPHERE_RADIUS_FEET ||
    directPhase.effects?.length !== 1 ||
    ignite?.kind !== "ignite_objects" ||
    ignite.filter.material !== "flammable" ||
    ignite.filter.targetRelation !== "not_worn_or_carried"
  ) {
    return null;
  }
  return { kind: "areaObjectIgnition" };
}

function objectAffectingThunderBurstPostSaveAreaEffect(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return directPhase === undefined &&
    isSmallThunderSphereSaveGateDamageShape(spell, phase)
    ? { kind: "areaObjectDamage" }
    : null;
}

function isSmallThunderSphereSaveGateDamageShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  const damage = phase.onFail;
  if (spell.mechanics.range.kind !== "point") return false;
  if (phase.attachment.kind !== "hole") return false;
  if (phase.attachment.value.kind !== "area") return false;
  if (phase.attachment.value.origin.kind !== "point_within_range") return false;
  if (phase.attachment.value.shape.kind !== "sphere") return false;
  if (damage.kind !== "damage") return false;
  if (damage.amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    spell.mechanics.level === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL,
    spellHasActionCastingTime(spell),
    spell.mechanics.range.feet === SMALL_THUNDER_SPHERE_RANGE_FEET,
    spell.mechanics.duration.kind === "instantaneous",
    phase.ability === "con",
    phase.dc.kind === "caster_spell_save_dc",
    phase.onSuccess.kind === "half_damage",
    phase.attachment.value.shape.radiusFeet ===
      SMALL_THUNDER_SPHERE_RADIUS_FEET,
    damage.damageType === "thunder",
    damage.amount.axis === "slot",
    damage.amount.startingAtLevel === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL,
    damage.amount.base.dice === SMALL_THUNDER_SPHERE_BASE_DAMAGE_DICE,
    damage.amount.base.dieSize === SMALL_THUNDER_SPHERE_DAMAGE_DIE_SIZE,
    damage.amount.perLevel.dice ===
      SMALL_THUNDER_SPHERE_SLOT_DAMAGE_DICE_INCREMENT,
    damage.amount.perLevel.dieSize === undefined,
    damage.amount.base.flat === undefined,
    damage.amount.base.spellcastingMod === undefined,
    damage.amount.base.abilityModifier === undefined,
    damage.amount.perLevel.flat === undefined,
  );
}

function forcedMovementCubeBurstPostSaveAreaEffect(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  if (
    spell.mechanics.level !== 1 ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.attachment.shape.kind !== "cube" ||
    phase.attachment.shape.sideFeet !== 15 ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "area" ||
    directPhase.attachment.origin.kind !== "self" ||
    directPhase.attachment.shape.kind !== "cube" ||
    directPhase.attachment.shape.sideFeet !== 15 ||
    directPhase.effects?.length !== 2
  ) {
    return null;
  }
  const [objectPush, audibleBoom] = directPhase.effects;
  if (
    objectPush?.kind !== "push_unsecured_objects" ||
    objectPush.objectLocation !== "entirely_within_area" ||
    objectPush.originDirection !== "away_from_caster" ||
    objectPush.distanceFeet !== 10 ||
    audibleBoom?.kind !== "audible" ||
    audibleBoom.sound !== "thunderous boom" ||
    audibleBoom.audibleRadiusFeet !== 300
  ) {
    return null;
  }
  return {
    kind: "selfOriginCubePush",
    creaturePush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
    },
    unsecuredObjectPush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
      objectLocation: "entirely_within_area",
    },
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

function isSelfOriginCubeCreaturePushRiderShape(
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    phase.ability === "con" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "force_move" &&
    effect.movementKind === "push" &&
    effect.originDirection === "away_from_caster" &&
    effect.distanceFeet === 10
  );
}

function isSelfOriginCubeFailedSaveDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  if (amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    effect.damageType === "thunder",
    amount.axis === "slot",
    amount.startingAtLevel === 1,
    amount.base.dice === 2,
    amount.base.dieSize === 8,
    amount.base.flat === undefined,
    amount.base.spellcastingMod === undefined,
    amount.base.abilityModifier === undefined,
    amount.perLevel.dice === 1,
    amount.perLevel.dieSize === undefined,
    amount.perLevel.flat === undefined,
  );
}

export function isPsychicDamageNextAttackDisadvantageRiderShape(
  spell: BattleSpellAdmissionSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.ability === "wis" &&
    phase.onSuccess.kind === "none"
  );
}
