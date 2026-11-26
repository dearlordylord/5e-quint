import type {
  BoundSupportedAttackActionOption,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";
import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { qualifyAttackEnemyProximity } from "./battle-reducer/attack-spatial.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { attackTargetConstraint } from "./battle-reducer/statblock-attacks.ts";

/**
 * Exercise the same admission/calculation seam as runtime target resolution.
 * Without an attack, the attacker's first melee attack makes the roll, for
 * tests of sources that don't depend on the attack.
 */
export function attackRollModeForTest(
  state: Parameters<typeof requiredAttackRollMode>[0],
  attackerId: Parameters<typeof requiredAttackRollMode>[1],
  target: Parameters<typeof requiredAttackRollMode>[2],
  attack: SupportedAttackActionOption | undefined,
  facts: Parameters<typeof requiredAttackRollMode>[4],
  opportunityAttack = false,
): ReturnType<typeof requiredAttackRollMode> {
  const rollingAttack = attack ?? firstMeleeAttack(state, attackerId);
  const evidence = qualifyAttackEnemyProximity(
    state,
    attackerId,
    rollingAttack,
    facts,
  );
  return evidence?.tag === "invalid"
    ? evidence
    : requiredAttackRollMode(
        state,
        attackerId,
        target,
        rollingAttack,
        facts,
        evidence,
        opportunityAttack,
      );
}

/** The attacker's first melee attack, for tests that name no attack. */
export function firstMeleeAttack(
  state: Parameters<typeof requiredAttackRollMode>[0],
  attackerId: Parameters<typeof requiredAttackRollMode>[1],
): BoundSupportedAttackActionOption {
  const attack = attackActionOptionsForActor(state, attackerId).find(
    (option) => attackTargetConstraint(option).kind === "meleeReach",
  );
  if (attack === undefined)
    throw new Error(`Expected a melee attack for ${attackerId}.`);
  return attack;
}
