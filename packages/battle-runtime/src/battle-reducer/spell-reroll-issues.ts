export const SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE =
  "Seeking Spell rerolls are not available for this attack-roll owner.";

export function spellAttackRerollUnsupportedIssue(attackRoll: {
  readonly spellAttackReroll?: BattleSpellAttackRerollDecision;
}): string | null {
  return attackRoll.spellAttackReroll === undefined
    ? null
    : SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE;
}

export const EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE =
  "Empowered Spell damage rerolls are not available for this damage-roll owner.";

export function spellDamageRerollUnsupportedIssue(
  damageRoll: Pick<BattleRolledDiceFill, "spellDamageReroll">,
): string | null {
  return damageRoll.spellDamageReroll === undefined
    ? null
    : EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE;
}
import type {
  BattleRolledDiceFill,
  BattleSpellAttackRerollDecision,
} from "../battle-state-execution.ts";
