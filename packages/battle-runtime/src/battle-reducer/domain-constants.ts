// Constants extracted from battle-reducer.ts. Pure leaf values with no
// dependency on internal helpers in battle-reducer.ts. Movement: zero-behavior
// mechanical extraction only — every value (and its `as const satisfies T`
// shape) is preserved verbatim.

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import type { DamageType, SpellRecord } from "@dnd/surface/surface/types";

export const CRITICAL_HIT_THRESHOLDS = [19, 20] as const;
export const BATTLE_ATTACK_RANGE_BANDS = ["normal", "long"] as const;
export const SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS = [
  "condition",
  "spell",
] as const;
export const COMMAND_OPTIONS = [
  "grovel",
  "halt",
  "drop",
  "approach",
  "flee",
] as const;
// Required SRD cross-record reference: Shield explicitly also triggers when
// targeted by the Magic Missile spell.
export const SHIELD_MAGIC_MISSILE_SPELL_ID =
  "magic_missile" satisfies SpellRecord["id"];
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
export const PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES = [
  "aberration",
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead",
] as const satisfies ReadonlyArray<CreatureType>;
