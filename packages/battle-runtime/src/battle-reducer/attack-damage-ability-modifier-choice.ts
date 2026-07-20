// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier

import type { AbilityModifier } from "@dnd/shared/types";
import type { BattleProcedureExecutionRef } from "../identity.ts";

export const ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS = [
  "apply",
  "decline",
] as const;

export type AttackDamageAbilityModifierChoiceSelection =
  (typeof ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS)[number];

export type AttackDamageAbilityModifierChoiceFill = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly selection: AttackDamageAbilityModifierChoiceSelection;
};

export type AttackDamageAbilityModifierChoiceProcedureRefs = readonly [
  BattleProcedureExecutionRef,
  ...BattleProcedureExecutionRef[],
];

export type AttackDamageAbilityModifierChoice = {
  readonly procedureRefs: AttackDamageAbilityModifierChoiceProcedureRefs;
  readonly appliedDamageAbilityModifier: AbilityModifier;
  readonly declinedDamageAbilityModifier: AbilityModifier;
};

export function attackDamageAbilityModifierChoiceProcedureRefs(
  procedureRefs: readonly BattleProcedureExecutionRef[],
): AttackDamageAbilityModifierChoiceProcedureRefs | null {
  const [first, ...rest] = procedureRefs;
  return first === undefined ? null : [first, ...rest];
}

export function selectedAttackDamageAbilityModifierChoice(
  choice: AttackDamageAbilityModifierChoice | undefined,
  fill: AttackDamageAbilityModifierChoiceFill | undefined,
): AttackDamageAbilityModifierChoiceFill | null {
  if (fill === undefined || choice === undefined) {
    return null;
  }
  return choice.procedureRefs.includes(fill.procedureRef) ? fill : null;
}
