// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE

import { movementFeet } from "@dnd/shared/types";
import type {
  Ability,
  Condition,
  DamageType,
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
