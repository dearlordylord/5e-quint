// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier

import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { BattleRolledDiceFill } from "../battle-state-execution.ts";
import type { AbilityModifier } from "@dnd/shared/types";
import { Match } from "effect";
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

export type AttackDamageAbilityModifierChoiceResolution =
  | { readonly tag: "notOffered" }
  | { readonly tag: "missingSelection" }
  | { readonly tag: "ineligibleSelection" }
  | {
      readonly tag: "selected";
      readonly choice: AttackDamageAbilityModifierChoice;
      readonly fill: AttackDamageAbilityModifierChoiceFill;
    };

export function resolveAttackDamageAbilityModifierChoice(
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
): AttackDamageAbilityModifierChoiceResolution {
  const choice = Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weapon) => weapon.attackDamageAbilityModifierChoice,
    ),
    Match.whenOr(
      { kind: "unarmedStrike" },
      { kind: "statBlockAttack" },
      () => undefined,
    ),
    Match.exhaustive,
  );
  const fill = damageRoll.attackDamageAbilityModifierChoice;
  if (choice === undefined) {
    return fill === undefined
      ? { tag: "notOffered" }
      : { tag: "ineligibleSelection" };
  }
  if (fill === undefined) return { tag: "missingSelection" };
  return choice.procedureRefs.includes(fill.procedureRef)
    ? { tag: "selected", choice, fill }
    : { tag: "ineligibleSelection" };
}
