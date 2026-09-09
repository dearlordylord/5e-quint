// Pure leaf constants with no dependency on reducer implementation helpers.
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { Condition } from "@dnd/shared/game-facts";
import { movementFeet, type DamageDieSize } from "@dnd/shared/types";
import { Schema } from "effect";
import type {
  CreatureSense,
  DamageType,
  EffectAtom,
  Skill,
} from "@dnd/surface/surface/types";

export const CRITICAL_HIT_THRESHOLDS = [19, 20] as const;
export const BATTLE_ATTACK_RANGE_BANDS = ["normal", "long"] as const;
/** Ordinary creature melee reach from the SRD default reach rule. */
export const STANDARD_CREATURE_MELEE_REACH_FEET = movementFeet(5);
export const GRAPPLE_TARGET_REACH_FEET = movementFeet(5);
export const SHOVE_TARGET_REACH_FEET = movementFeet(5);
export const SHOVE_PUSH_DISTANCE_FEET = movementFeet(5);
export const PRONE_ATTACK_ADVANTAGE_DISTANCE_FEET = movementFeet(5);
export const HIT_POINT_BUDGET_CONDITION_SHAKE_AWAKE_ADJACENCY_FEET =
  movementFeet(5);
export const HELP_ATTACK_TARGET_ADJACENCY_FEET = movementFeet(5);
export const RANGED_ATTACK_ENEMY_PROXIMITY_FEET = movementFeet(5);
export const BATTLE_D20_ROLL_MODIFIER_DIE_SIZES = [1, 4] as const;
export const SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET = movementFeet(5);
export const BATTLE_D20_ROLL_MODIFIER_KINDS = [
  "ability_check",
  "attack_roll",
  "saving_throw",
] as const satisfies ReadonlyArray<
  Extract<
    Extract<EffectAtom, { readonly kind: "modify_roll_numeric" }>["on"][number],
    "ability_check" | "attack_roll" | "saving_throw"
  >
>;
export type BattleD20RollModifierKind =
  (typeof BATTLE_D20_ROLL_MODIFIER_KINDS)[number];
export type BattleD20RollModifierDieSize =
  (typeof BATTLE_D20_ROLL_MODIFIER_DIE_SIZES)[number];
export const SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS = [
  "condition",
  "spell",
] as const;
export const SPELL_CONDITION_ABILITY_CHECK_ACTORS = [
  "target",
  "targetOrCreatureWithinReach",
] as const;
export const COMPELLED_BEHAVIOR_OPTIONS = [
  "grovel",
  "halt",
  "drop",
  "approach",
  "flee",
] as const;
export const SELF_TRANSFORMATION_MODE_KINDS = [
  "aquaticAdaptation",
  "changeAppearance",
  "naturalWeapons",
] as const;
export type SelfTransformationModeKind =
  (typeof SELF_TRANSFORMATION_MODE_KINDS)[number];
export const SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS = [
  "aquaticAdaptation",
  "changeAppearance",
] as const satisfies ReadonlyArray<SelfTransformationModeKind>;
export type SelfTransformationNonNaturalWeaponModeKind =
  (typeof SELF_TRANSFORMATION_NON_NATURAL_WEAPON_MODE_KINDS)[number];
export const SELF_TRANSFORMATION_NATURAL_WEAPONS_MODE_KIND =
  "naturalWeapons" satisfies SelfTransformationModeKind;
export const BATTLE_MAGIC_SUPPRESSION_ONGOING_SPELL_EFFECT_SOURCE_KINDS = [
  "ordinarySpell",
  "artifact",
  "deity",
] as const;
export type BattleMagicSuppressionOngoingSpellEffectSourceKind =
  (typeof BATTLE_MAGIC_SUPPRESSION_ONGOING_SPELL_EFFECT_SOURCE_KINDS)[number];
export const PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_BYPASS_SENSES = [
  "blindsight",
  "truesight",
] as const satisfies ReadonlyArray<CreatureSense["kind"]>;
export type PerceptionGatedAttackRollDefenseBypassSense =
  (typeof PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_BYPASS_SENSES)[number];
export const DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_SENSES =
  PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_BYPASS_SENSES;
export type DuplicateHitInterceptionUnaffectedSense =
  (typeof DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_SENSES)[number];
export const DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_BY = [
  "blinded",
  ...DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_SENSES,
] as const satisfies ReadonlyArray<Condition | CreatureSense["kind"]>;
export const DUPLICATE_HIT_INTERCEPTION_DUPLICATE_COUNTS = [1, 2, 3] as const;
export type DuplicateHitInterceptionDuplicateCount =
  (typeof DUPLICATE_HIT_INTERCEPTION_DUPLICATE_COUNTS)[number];
export const DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES =
  3 satisfies DuplicateHitInterceptionDuplicateCount;
export const DUPLICATE_HIT_INTERCEPTION_DIE_SIZE = 6;
export const DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST = 3;
export const DUPLICATE_HIT_INTERCEPTION_ROLL_HOLE_KEY_PREFIX =
  "battle:duplicate-hit-interception:roll:";
export const CHAINED_DAMAGE_TYPE_ATTACK_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;
export const CHAINED_SPELL_ATTACK_LEAP_RANGE_FEET = movementFeet(30);
export const CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS = [
  "max_leaps_from_slot_level",
  "exclude_already_targeted_in_same_cast",
] as const;
export const STAGED_CONDITION_END_TURN_REPEAT_SAVE_HOLE_KEY_PREFIX =
  "battle:staged-condition-repeat-save:end-turn:";
export const STAGED_CONDITION_DAMAGE_REPEAT_SAVE_HOLE_KEY_PREFIX =
  "battle:staged-condition-repeat-save:damage:";

/** Authored Surface facts that identify the granted-area Save-damage profile. */
export const GRANTED_AREA_SAVE_DAMAGE_SPELL_LEVEL = 2;
export const GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS = {
  level: GRANTED_AREA_SAVE_DAMAGE_SPELL_LEVEL,
  castingTimeKind: "bonus_action",
  rangeKind: "touch",
  duration: { kind: "concentration", unit: "minute", amount: 1 },
  attachment: {
    mode: "one",
    disposition: "willing",
    targetKinds: ["creature"],
  },
  operationCount: 1,
  operation: {
    triggerKind: "on_attached_spends_action",
    costKind: "standard_action",
    action: "magic",
    effectKind: "save_gate",
    ability: "dex",
    dcKind: "caster_spell_save_dc",
    areaOriginKind: "on_attached_creature",
    areaShapeKind: "cone",
    successKind: "half_damage",
    failureKind: "damage",
  },
  damage: {
    kind: "linear_per_level",
    axis: "slot",
    baseDice: 3,
    perSlotDice: 1,
    startingAtLevel: GRANTED_AREA_SAVE_DAMAGE_SPELL_LEVEL,
  },
} as const;
export const GRANTED_AREA_SAVE_DAMAGE_CONE_LENGTH_FEET = 15;
export const GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE = 6 satisfies DamageDieSize;
export const GRANTED_AREA_SAVE_DAMAGE_TYPE_CHOICES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const satisfies readonly [DamageType, ...DamageType[]];
export const GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS = {
  actionCost: "bonusAction",
  ability: GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.ability,
  targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
  activeEffectKind: "grantedAreaSaveDamageAction",
  expirationKind: GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.kind,
} as const;

/** Authored Surface facts that identify the staged Save-condition profile. */
export const STAGED_SAVE_CONDITION_AUTHORED_FACTS = {
  level: 1,
  castingTimeKind: "action",
  range: { kind: "point", feet: 60 },
  duration: {
    kind: "concentration",
    unit: "minute",
    amount: 1,
    earlyEndKind: "target_takes_damage",
  },
  phase: {
    kind: "save_gate",
    ability: "wis",
    dcKind: "caster_spell_save_dc",
    areaOriginKind: "point_within_range",
    areaShapeKind: "sphere",
    radiusFeet: 5,
    successKind: "none",
    failureKind: "composite",
    failureEffects: {
      condition: { kind: "apply_condition", condition: "incapacitated" },
      escape: {
        kind: "target_effect_escape_action",
        actor: "another_creature",
        cost: "action",
        method: "shake_awake",
        outcome: "end_current_effect",
      },
    },
    repeat: {
      cadence: "end_of_target_turn",
      onSuccess: "ends_on_target",
      onFailAgain: { kind: "apply_condition", condition: "unconscious" },
    },
  },
  automaticSuccessPredicates: {
    kind: "any",
    predicates: [
      { kind: "does_not_sleep" },
      { kind: "has_condition_immunity", condition: "exhaustion" },
    ],
  },
} as const;
export const STAGED_SAVE_CONDITION_FAILURE_ROLES = [
  "incapacitated",
  "escape",
] as const;
export const STAGED_SAVE_CONDITION_EXECUTION_FACTS = {
  ability: STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.ability,
  targeting: {
    kind: "pointOriginSphere",
    radiusFeet: movementFeet(
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.radiusFeet,
    ),
  },
  automaticSuccessPredicates: [
    { kind: "doesNotSleep" },
    {
      kind: "conditionImmunity",
      condition:
        STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates
          .predicates[1].condition,
    },
  ],
  escapeAction: {
    kind: "endCurrentEffect",
    actor: "anotherCreature",
    cost: STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.cost,
    method: "shakeAwake",
  },
} as const;

/** Authored Surface facts that identify the repeated Save-condition profile. */
export const SAVE_GATED_CONDITION_WITH_REPEAT_SPELL_LEVEL = 1;
export const SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS = {
  level: SAVE_GATED_CONDITION_WITH_REPEAT_SPELL_LEVEL,
  castingTimeKind: "action",
  range: { kind: "point", feet: 30 },
  duration: { kind: "concentration", unit: "minute", amount: 1 },
  phase: {
    kind: "save_gate",
    ability: "wis",
    dcKind: "caster_spell_save_dc",
    successKind: "none",
    failureKind: "composite",
    failureEffects: {
      prone: { kind: "apply_condition", condition: "prone" },
      incapacitated: { kind: "apply_condition", condition: "incapacitated" },
      suppressProne: {
        kind: "suppress_condition_self_end",
        condition: "prone",
      },
    },
    repeats: {
      endOfTurn: {
        cadence: "end_of_target_turn",
        onSuccess: "ends_on_target",
      },
      onDamage: {
        cadence: "on_target_takes_damage",
        rollMode: "advantage",
        onSuccess: "ends_on_target",
      },
    },
  },
  targeting: {
    mode: "choose_up_to",
    count: {
      kind: "linear",
      base: 1,
      baseLevel: SAVE_GATED_CONDITION_WITH_REPEAT_SPELL_LEVEL,
      perSlotAboveBase: 1,
    },
    targetKinds: ["creature"],
  },
} as const;
export const SAVE_GATED_CONDITION_WITH_REPEAT_FAILURE_ROLES = [
  "prone",
  "incapacitated",
  "suppressProne",
] as const;
export const SAVE_GATED_CONDITION_WITH_REPEAT_REPEAT_ROLES = [
  "endOfTurn",
  "onDamage",
] as const;
export const SAVE_GATED_CONDITION_WITH_REPEAT_EXECUTION_FACTS = {
  actionCost: "magicAction",
  ability: SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.phase.ability,
  targeting: {
    kind: "targetList",
    minTargets:
      SAVE_GATED_CONDITION_WITH_REPEAT_AUTHORED_FACTS.targeting.count.base,
  },
} as const;
export const SAVE_GATED_TURN_CONSTRAINT_SPEED_RATIO = {
  numerator: 1,
  denominator: 2,
} as const;
export const SAVE_GATED_TURN_CONSTRAINT_ARMOR_CLASS_DELTA = -2;
export const SAVE_GATED_TURN_CONSTRAINT_DEX_SAVE_DELTA = -2;
export const SaveGatedTurnConstraintMaxAttacksSchema = Schema.Literal(1).pipe(
  Schema.brand("PositiveInteger"),
);
export const SAVE_GATED_TURN_CONSTRAINT_MAX_ATTACKS =
  SaveGatedTurnConstraintMaxAttacksSchema.make(1);
export const SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT = 25;
export const OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:open-hand-technique:decision",
);
export const OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:open-hand-technique:decision",
);
export const OPEN_HAND_TECHNIQUE_DECISION_CHOICES = [
  "denyOpportunityAttacks",
  "pushAwayOnFailedSave",
  "applyConditionOnFailedSave",
  "decline",
] as const;
export type OpenHandTechniqueDecisionChoice =
  (typeof OPEN_HAND_TECHNIQUE_DECISION_CHOICES)[number];
export const TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:tactical-master:replacement",
);
export const TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_INSTANCE =
  holeInstanceKey("battle:unit-feature:tactical-master:replacement");
export const BRUTAL_STRIKE_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:brutal-strike:decision",
);
export const BRUTAL_STRIKE_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:brutal-strike:decision",
);
export const BRUTAL_STRIKE_EFFECT_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:brutal-strike:effect-decision",
);
export const BRUTAL_STRIKE_EFFECT_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:brutal-strike:effect-decision",
);
export const BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:brutal-strike:forceful-blow-movement:decision",
);
export const BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_INSTANCE =
  holeInstanceKey(
    "battle:unit-feature:brutal-strike:forceful-blow-movement:decision",
  );
export const BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID = holeId(
  "battle:unit-feature:brutal-strike:forceful-blow-movement",
);
export const BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_INSTANCE =
  holeInstanceKey("battle:unit-feature:brutal-strike:forceful-blow-movement");
export const OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID = holeId(
  "battle:unit-feature:open-hand-technique:save",
);
export const OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:open-hand-technique:save",
);
export const STUNNING_STRIKE_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:stunning-strike:decision",
);
export const STUNNING_STRIKE_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:stunning-strike:decision",
);
export const STUNNING_STRIKE_SAVE_HOLE_ID = holeId(
  "battle:unit-feature:stunning-strike:save",
);
export const STUNNING_STRIKE_SAVE_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:stunning-strike:save",
);
export const CUNNING_STRIKE_SAVE_HOLE_ID = holeId(
  "battle:unit-feature:cunning-strike:save",
);
export const CUNNING_STRIKE_SAVE_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:cunning-strike:save",
);
export const CUNNING_STRIKE_MOVEMENT_HOLE_ID = holeId(
  "battle:unit-feature:cunning-strike:movement",
);
export const CUNNING_STRIKE_MOVEMENT_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:cunning-strike:movement",
);
export const CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID = holeId(
  "battle:unit-feature:cunning-strike:tool-possession",
);
export const CUNNING_STRIKE_TOOL_POSSESSION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:cunning-strike:tool-possession",
);
export const CUNNING_STRIKE_END_TURN_COVER_HOLE_ID = holeId(
  "battle:unit-feature:cunning-strike:end-turn-cover",
);
export const CUNNING_STRIKE_END_TURN_COVER_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:cunning-strike:end-turn-cover",
);
export const UNIT_FEATURE_CONDITION_END_TURN_SAVE_HOLE_KEY_PREFIX =
  "battle:unit-feature-condition-end-turn-save:";
export const DIRECT_CONDITION_REMOVAL_CONDITIONS = [
  "blinded",
  "deafened",
  "paralyzed",
  "poisoned",
] as const satisfies ReadonlyArray<Condition>;
export const MARKED_TARGET_FINDING_SKILLS = [
  "perception",
  "survival",
] as const satisfies ReadonlyArray<Skill>;
export const TEMPORARY_ABILITY_CHECK_ROLL_MODE_DURATION_TICKS =
  elapsedTimeTicks(10);
export const TEMPORARY_ABILITY_CHECK_ROLL_MODE_SKILL =
  "intimidation" as const satisfies Skill;
export const TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS = 3;
export const MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID = holeId(
  "battle:spell:active-one-minute-effect-count",
);
export const MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE =
  holeInstanceKey("battle:spell:active-one-minute-effect-count");
export const MINOR_WONDER_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_ID =
  holeId("battle:spell:booming-voice:influence-ability-check");
export const MINOR_WONDER_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_INSTANCE =
  holeInstanceKey("battle:spell:booming-voice:influence-ability-check");
export const LINKED_DEFENSE_DAMAGE_SHARE_ARMOR_CLASS_BONUS = 1;
export const LINKED_DEFENSE_DAMAGE_SHARE_SAVING_THROW_BONUS = 1;
export const LINKED_DEFENSE_DAMAGE_SHARE_CAST_RANGE_FEET = movementFeet(5);
export const LINKED_DEFENSE_DAMAGE_SHARE_CONNECTION_RANGE_FEET =
  movementFeet(60);
export const LINKED_DEFENSE_DAMAGE_SHARE_SEPARATION_FACTS_HOLE_ID = holeId(
  "battle:linked-defense-damage-share:separation-facts",
);
export const LINKED_DEFENSE_DAMAGE_SHARE_SEPARATION_FACTS_HOLE_INSTANCE =
  holeInstanceKey("battle:linked-defense-damage-share:separation-facts");
export const CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNT_TIERS = [
  { atLevel: 5, value: 2 },
  { atLevel: 11, value: 3 },
  { atLevel: 17, value: 4 },
] as const;
export const CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS = [
  1,
  ...CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNT_TIERS.map((tier) => tier.value),
] as const;
export type MultiBeamSpellAttackBeamCount =
  (typeof CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS)[number];
export function multiBeamSpellAttackBeamCount(
  value: number,
): MultiBeamSpellAttackBeamCount | null {
  return (
    CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS.find(
      (count) => count === value,
    ) ?? null
  );
}
export const SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS = [
  3, 4, 5, 6, 7, 8, 9, 10,
] as const;
export const SLOT_LEVEL_SCALED_SPELL_ATTACK_BASE_SLOT_LEVEL = 2;
export const SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNT_PER_SLOT = 1;
export type MultiRaySpellAttackRayCount =
  (typeof SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS)[number];

export function multiRaySpellAttackRayCount(
  value: number,
): MultiRaySpellAttackRayCount | null {
  return (
    SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS.find((count) => count === value) ??
    null
  );
}
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID =
  holeId("battle:attack-damage-reduction-zero-damage-redirect:target");
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE =
  holeInstanceKey("battle:attack-damage-reduction-zero-damage-redirect:target");
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID = holeId(
  "battle:attack-damage-reduction-zero-damage-redirect:save",
);
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE =
  holeInstanceKey("battle:attack-damage-reduction-zero-damage-redirect:save");
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID =
  holeId("battle:attack-damage-reduction-zero-damage-redirect:damage");
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE =
  holeInstanceKey("battle:attack-damage-reduction-zero-damage-redirect:damage");
export const WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID = holeId(
  "battle:weapon-mastery-topple:save",
);
export const WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE = holeInstanceKey(
  "battle:weapon-mastery-topple:save",
);
export const GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID = holeId(
  "battle:grappler:punch-and-grab:decision",
);
export const GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:grappler:punch-and-grab:decision",
);
export const WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID = holeId(
  "battle:weapon-mastery-cleave:decision",
);
export const WEAPON_MASTERY_CLEAVE_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:weapon-mastery-cleave:decision",
);
export const WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID = holeId(
  "battle:weapon-mastery-cleave:target",
);
export const WEAPON_MASTERY_CLEAVE_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:weapon-mastery-cleave:target",
);
export const WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID = holeId(
  "battle:weapon-mastery-cleave:attack-roll",
);
export const WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:weapon-mastery-cleave:attack-roll",
);
export const WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID = holeId(
  "battle:weapon-mastery-cleave:damage",
);
export const WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_INSTANCE = holeInstanceKey(
  "battle:weapon-mastery-cleave:damage",
);
export const WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID = holeId(
  "battle:weapon-mastery-cleave:damage-disposition",
);
export const WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_INSTANCE =
  holeInstanceKey("battle:weapon-mastery-cleave:damage-disposition");
export const REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID = holeId(
  "battle:remarkable-athlete:critical-hit-movement:decision",
);
export const REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_INSTANCE =
  holeInstanceKey("battle:remarkable-athlete:critical-hit-movement:decision");
export const REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID = holeId(
  "battle:remarkable-athlete:critical-hit-movement",
);
export const REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_INSTANCE =
  holeInstanceKey("battle:remarkable-athlete:critical-hit-movement");
export const HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID = holeId(
  "battle:hunters-prey:horde-breaker:decision",
);
export const HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_INSTANCE =
  holeInstanceKey("battle:hunters-prey:horde-breaker:decision");
export const HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID = holeId(
  "battle:hunters-prey:horde-breaker:target",
);
export const HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_INSTANCE = holeInstanceKey(
  "battle:hunters-prey:horde-breaker:target",
);
export const HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID = holeId(
  "battle:hunters-prey:horde-breaker:attack-roll",
);
export const HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_INSTANCE =
  holeInstanceKey("battle:hunters-prey:horde-breaker:attack-roll");
export const HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID = holeId(
  "battle:hunters-prey:horde-breaker:damage",
);
export const HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_INSTANCE = holeInstanceKey(
  "battle:hunters-prey:horde-breaker:damage",
);
export const HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID = holeId(
  "battle:hunters-prey:horde-breaker:damage-disposition",
);
export const HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_INSTANCE =
  holeInstanceKey("battle:hunters-prey:horde-breaker:damage-disposition");
