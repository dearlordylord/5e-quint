// Constants extracted from battle-reducer.ts. Pure leaf values with no
// dependency on internal helpers in battle-reducer.ts. Movement: zero-behavior
// mechanical extraction only — every value (and its `as const satisfies T`
// shape) is preserved verbatim.

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { Condition, CreatureType } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import type {
  CreatureSense,
  DamageType,
  Skill,
  SpellRecord,
} from "@dnd/surface/surface/types";

export const CRITICAL_HIT_THRESHOLDS = [19, 20] as const;
export const BATTLE_ATTACK_RANGE_BANDS = ["normal", "long"] as const;
export const BATTLE_D20_ROLL_MODIFIER_DIE_SIZES = [1, 4] as const;
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
export const COMMAND_OPTIONS = [
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
export const BATTLE_ANTIMAGIC_FIELD_ONGOING_SPELL_EFFECT_SOURCE_KINDS = [
  "ordinarySpell",
  "artifact",
  "deity",
] as const;
export type BattleAntimagicFieldOngoingSpellEffectSourceKind =
  (typeof BATTLE_ANTIMAGIC_FIELD_ONGOING_SPELL_EFFECT_SOURCE_KINDS)[number];
// Required SRD cross-record reference: Shield explicitly also triggers when
// targeted by the Magic Missile spell.
export const SHIELD_MAGIC_MISSILE_SPELL_ID =
  "magic_missile" satisfies SpellRecord["id"];
export const BLUR_ATTACK_ROLL_BYPASS_SENSES = [
  "blindsight",
  "truesight",
] as const satisfies ReadonlyArray<CreatureSense["kind"]>;
export type BlurAttackRollBypassSense =
  (typeof BLUR_ATTACK_ROLL_BYPASS_SENSES)[number];
export const MIRROR_IMAGE_UNAFFECTED_SENSES = BLUR_ATTACK_ROLL_BYPASS_SENSES;
export type MirrorImageUnaffectedSense =
  (typeof MIRROR_IMAGE_UNAFFECTED_SENSES)[number];
export const MIRROR_IMAGE_UNAFFECTED_BY = [
  "blinded",
  ...MIRROR_IMAGE_UNAFFECTED_SENSES,
] as const satisfies ReadonlyArray<Condition | CreatureSense["kind"]>;
export const MIRROR_IMAGE_DUPLICATE_COUNTS = [1, 2, 3] as const;
export type MirrorImageDuplicateCount =
  (typeof MIRROR_IMAGE_DUPLICATE_COUNTS)[number];
export const MIRROR_IMAGE_INITIAL_DUPLICATES =
  3 satisfies MirrorImageDuplicateCount;
export const MIRROR_IMAGE_DUPLICATE_DIE_SIZE = 6;
export const MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST = 3;
export const MIRROR_IMAGE_DUPLICATE_ROLL_HOLE_KEY_PREFIX =
  "battle:mirror-image:duplicate-roll:";
export const CHROMATIC_ORB_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;
export const CHROMATIC_ORB_LEAP_RANGE_FEET = movementFeet(30);
export const CHROMATIC_ORB_CONTINUATION_LIMIT_KINDS = [
  "max_leaps_from_slot_level",
  "exclude_already_targeted_in_same_cast",
] as const;
export const HIDEOUS_LAUGHTER_REPEAT_SAVE_HOLE_KEY_PREFIX =
  "battle:hideous-laughter-repeat-save:";
export const HIDEOUS_LAUGHTER_DURATION_TICKS = elapsedTimeTicks(10);
export const OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID = holeId(
  "battle:unit-feature:open-hand-technique:decision",
);
export const OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:open-hand-technique:decision",
);
export const OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID = holeId(
  "battle:unit-feature:open-hand-technique:save",
);
export const OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:open-hand-technique:save",
);
export const DIRECT_CONDITION_REMOVAL_CONDITIONS = [
  "blinded",
  "deafened",
  "paralyzed",
  "poisoned",
] as const satisfies ReadonlyArray<Condition>;
export const HUNTERS_MARK_FINDING_SKILLS = [
  "perception",
  "survival",
] as const satisfies ReadonlyArray<Skill>;
export const THAUMATURGY_BOOMING_VOICE_DURATION_TICKS = elapsedTimeTicks(10);
export const THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL =
  "intimidation" as const satisfies Skill;
export const THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS = 3;
export const THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID = holeId(
  "battle:spell:active-one-minute-effect-count",
);
export const THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_INSTANCE =
  holeInstanceKey("battle:spell:active-one-minute-effect-count");
export const THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_ID = holeId(
  "battle:spell:booming-voice:influence-ability-check",
);
export const THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_INSTANCE =
  holeInstanceKey("battle:spell:booming-voice:influence-ability-check");
export const WARDING_BOND_ARMOR_CLASS_BONUS = 1;
export const WARDING_BOND_SAVING_THROW_BONUS = 1;
export const WARDING_BOND_CAST_RANGE_FEET = movementFeet(5);
export const WARDING_BOND_CONNECTION_RANGE_FEET = movementFeet(60);
export const WARDING_BOND_SEPARATION_FACTS_HOLE_ID = holeId(
  "battle:spell:warding-bond:separation-facts",
);
export const WARDING_BOND_SEPARATION_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:spell:warding-bond:separation-facts",
);
export const ELDRITCH_BLAST_BEAM_COUNT_TIERS = [
  { atLevel: 5, value: 2 },
  { atLevel: 11, value: 3 },
  { atLevel: 17, value: 4 },
] as const;
export const ELDRITCH_BLAST_BEAM_COUNTS = [
  1,
  ...ELDRITCH_BLAST_BEAM_COUNT_TIERS.map((tier) => tier.value),
] as const;
export type EldritchBlastBeamCount =
  (typeof ELDRITCH_BLAST_BEAM_COUNTS)[number];
export const SCORCHING_RAY_RAY_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export type ScorchingRayRayCount = (typeof SCORCHING_RAY_RAY_COUNTS)[number];

export function scorchingRayRayCount(
  value: number,
): ScorchingRayRayCount | null {
  return SCORCHING_RAY_RAY_COUNTS.find((count) => count === value) ?? null;
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
export const REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID =
  holeId("battle:remarkable-athlete:critical-hit-movement:decision");
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
export const PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES = [
  "aberration",
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead",
] as const satisfies ReadonlyArray<CreatureType>;
export const PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS = [
  "charmed",
  "frightened",
] as const satisfies ReadonlyArray<Condition>;
