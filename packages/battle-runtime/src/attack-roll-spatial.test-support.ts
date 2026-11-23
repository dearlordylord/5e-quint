import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { qualifyAttackEnemyProximity } from "./battle-reducer/attack-spatial.ts";

/** Exercise the same admission/calculation seam as runtime target resolution. */
export function attackRollModeForTest(
  state: Parameters<typeof requiredAttackRollMode>[0],
  attackerId: Parameters<typeof requiredAttackRollMode>[1],
  target: Parameters<typeof requiredAttackRollMode>[2],
  attack: Parameters<typeof requiredAttackRollMode>[3],
  facts: Parameters<typeof requiredAttackRollMode>[4],
  opportunityAttack = false,
): ReturnType<typeof requiredAttackRollMode> {
  const evidence =
    attack === undefined
      ? null
      : qualifyAttackEnemyProximity(state, attackerId, attack, facts);
  return evidence?.tag === "invalid"
    ? evidence
    : requiredAttackRollMode(
        state,
        attackerId,
        target,
        attack,
        facts,
        evidence,
        opportunityAttack,
      );
}
