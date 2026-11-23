export const SEEKING_SPELL_REROLL_UNSUPPORTED_ATTACK_ROLL_OWNER_MESSAGE =
  "Seeking Spell rerolls are not available for this attack-roll owner.";

/** Seeking Spell's decisions among an attack roll's reroll decisions. */
export function attackRollSeekingSpellDecisions(
  attackRoll: Pick<BattleAttackRollResult, "d20TestRerolls">,
): readonly BattleSpellAttackRerollDecision[] {
  const decisions: readonly BattleAttackRollD20TestRerollDecision[] =
    attackRoll.d20TestRerolls ?? [];
  return decisions.filter(
    (decision): decision is BattleSpellAttackRerollDecision =>
      decision.effectKind === SEEKING_METAMAGIC_EFFECT_KIND,
  );
}

/** Rejects a Seeking Spell decision on an attack roll Seeking Spell can't reroll. */
export function spellAttackRerollUnsupportedIssue(
  attackRoll: Pick<BattleAttackRollResult, "d20TestRerolls">,
): string | null {
  return attackRollSeekingSpellDecisions(attackRoll).length === 0
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
  BattleAttackRollD20TestRerollDecision,
  BattleAttackRollResult,
  BattleRolledDiceFill,
  BattleSpellAttackRerollDecision,
} from "../battle-state-execution.ts";
import { SEEKING_METAMAGIC_EFFECT_KIND } from "./metamagic-support.ts";
