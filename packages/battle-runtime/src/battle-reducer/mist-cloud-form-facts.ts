// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE

import { movementFeet } from "@dnd/shared/types";
import type {
  Ability,
  Condition,
  DamageType,
  EffectAtom,
} from "@dnd/surface/surface/types";

export const MIST_CLOUD_FORM_FLY_SPEED_FEET = movementFeet(10);
export const MIST_CLOUD_FORM_CAN_HOVER = true;

export const MIST_CLOUD_FORM_DAMAGE_RESISTANCES = [
  "bludgeoning",
  "piercing",
  "slashing",
] as const satisfies ReadonlyArray<DamageType>;

export const MIST_CLOUD_FORM_CONDITION_IMMUNITIES = [
  "prone",
] as const satisfies ReadonlyArray<Condition>;

export const MIST_CLOUD_FORM_SAVING_THROW_ADVANTAGE = [
  "str",
  "dex",
  "con",
] as const satisfies ReadonlyArray<Ability>;

type TransformTargetEffect = Extract<
  EffectAtom,
  { readonly kind: "transform_target" }
>;
type MistCloudFormShape = Extract<
  TransformTargetEffect["newForm"],
  { readonly kind: "spell_effect_mist_cloud" }
>;

export const MIST_CLOUD_FORM_ACTIVITY_LIMITS = {
  communication: "cannot_talk",
  objectManipulation: "cannot_manipulate_objects",
  carriedOrHeldObjects: "cannot_be_dropped_used_or_interacted_with",
  prohibitedActivities: ["attack", "spellcasting"],
} as const satisfies MistCloudFormShape["activityLimits"];

export const MIST_CLOUD_FORM_TABLE_SPATIAL_FACTS = {
  creatureSpace: "can_enter_and_occupy_other_creature_space",
  narrowOpenings: "can_pass_through",
  liquids: "treat_as_solid_surfaces",
} as const satisfies MistCloudFormShape["tableSpatial"];
