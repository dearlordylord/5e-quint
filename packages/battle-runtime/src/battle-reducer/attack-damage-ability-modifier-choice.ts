// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier

import type { AbilityModifier } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";

export const ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS = [
  "apply",
  "decline",
] as const;

export type AttackDamageAbilityModifierChoiceSelection =
  (typeof ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS)[number];

export type AttackDamageAbilityModifierChoiceFill = {
  readonly unitId: UnitRecord["id"];
  readonly selection: AttackDamageAbilityModifierChoiceSelection;
};

export type AttackDamageAbilityModifierChoiceUnitIds = readonly [
  UnitRecord["id"],
  ...UnitRecord["id"][],
];

export type AttackDamageAbilityModifierChoice = {
  readonly unitIds: AttackDamageAbilityModifierChoiceUnitIds;
  readonly appliedDamageAbilityModifier: AbilityModifier;
  readonly declinedDamageAbilityModifier: AbilityModifier;
};

export function attackDamageAbilityModifierChoiceUnitIds(
  unitIds: readonly UnitRecord["id"][],
): AttackDamageAbilityModifierChoiceUnitIds | null {
  const [first, ...rest] = unitIds;
  return first === undefined ? null : [first, ...rest];
}

export function selectedAttackDamageAbilityModifierChoice(
  choice: AttackDamageAbilityModifierChoice | undefined,
  fill: AttackDamageAbilityModifierChoiceFill | undefined,
): AttackDamageAbilityModifierChoiceFill | null {
  if (fill === undefined || choice === undefined) {
    return null;
  }
  return choice.unitIds.includes(fill.unitId) ? fill : null;
}
