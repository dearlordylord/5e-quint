import type { AbilityModifier, AttackBonus } from "@dnd/shared/types";
import type { DamageType, DiceExpr } from "@dnd/surface/surface/types";
import type { DurationBattleActiveEffectExpiration } from "../active-effect/expiration.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import type { HeldWeaponLoadoutSlot } from "../character-creature-execution-facts.ts";
import type { CantripSpellAccess } from "../procedure-execution/spell-invocation-vocabulary.ts";

/** Authored-identity-free facts shared by admission and execution. */
export type SpellWeaponAttackOverrideTemplate = {
  readonly sourceCombatantId: CombatantId;
  readonly kind: "spellWeaponAttackOverride";
  readonly weaponItemId: BattleObjectId;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
  readonly damage: {
    readonly expr: DiceExpr;
  };
  readonly damageTypeChoices: readonly [DamageType, DamageType];
  readonly expiresAt: DurationBattleActiveEffectExpiration;
};

export type WeaponAttackOverrideProcedureFacts = {
  readonly access: CantripSpellAccess;
  readonly actionCost: "bonusAction";
  readonly activeEffect: SpellWeaponAttackOverrideTemplate;
  readonly attachedWeaponSlot: HeldWeaponLoadoutSlot;
  readonly procedure: "weaponAttackOverride";
  readonly resource: { readonly tag: "none" };
};
