import { AbilityModifier, AttackBonus } from "@dnd/shared/types";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import { DurationBattleActiveEffectExpirationSchema } from "../active-effect/expiration-codecs.ts";
import type { BattleActiveEffectIdentity } from "../active-effect/source.ts";
import {
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  SpellWeaponAttackOverrideTemplate,
  WeaponAttackOverrideProcedureFacts,
} from "../procedure-facts/weapon-attack-override.ts";
import {
  ClassCantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "./spell-invocation-codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  type SpellRuleExecutionFacts,
} from "./spell-rule-facts.ts";

/** Authored-identity-free facts consumed by weapon-attack-override execution. */
export type WeaponAttackOverrideSpellProcedureExecution =
  WeaponAttackOverrideProcedureFacts & {
    readonly spellRuleFacts: SpellRuleExecutionFacts;
  };

export type SpellWeaponAttackOverrideEffect =
  SpellWeaponAttackOverrideTemplate & {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  };

function exactSchema<Expected>() {
  return <Encoded, Context, Actual extends Expected>(
    schema: Schema.Schema<Actual, Encoded, Context> &
      ([Expected] extends [Actual] ? unknown : never),
  ): Schema.Schema<Actual, Encoded, Context> => schema;
}

export const SpellWeaponAttackOverrideTemplateSchema =
  exactSchema<SpellWeaponAttackOverrideTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("spellWeaponAttackOverride"),
      weaponItemId: BattleObjectId,
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damage: Schema.Struct({ expr: DiceExprSchema }),
      damageTypeChoices: Schema.Tuple(DamageTypeSchema, DamageTypeSchema),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  );

export const WeaponAttackOverrideExecutionSchema =
  exactSchema<WeaponAttackOverrideSpellProcedureExecution>()(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("weaponAttackOverride"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: SpellWeaponAttackOverrideTemplateSchema,
    }),
  );

/** Replace a prior casting by the same combatant and procedure occurrence. */
export function activeEffectsAfterWeaponAttackOverride<
  Effect extends BattleActiveEffectIdentity,
>(
  activeEffects: readonly Effect[],
  sourceProcedureRef: BattleProcedureExecutionRef,
  activeEffect: SpellWeaponAttackOverrideTemplate,
): readonly (Effect | SpellWeaponAttackOverrideEffect)[] {
  return [
    ...activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponAttackOverride" &&
          effect.sourceProcedureRef === sourceProcedureRef &&
          effect.sourceCombatantId === activeEffect.sourceCombatantId
        ),
    ),
    { ...activeEffect, sourceProcedureRef },
  ];
}
