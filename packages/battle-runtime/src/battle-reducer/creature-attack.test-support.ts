// Standalone minimal Creature Attack state machine used by the focused MBT driver.

import { Match } from "effect";

export type CreatureAttackState = {
  readonly creatureAHp: number;
  readonly creatureBHp: number;
};

export function resolveCreatureAttack(
  state: CreatureAttackState,
  attacker: "attackerA" | "attackerB",
  fills: { readonly damage: number; readonly hit: boolean },
): CreatureAttackState {
  if (!fills.hit) return state;
  return Match.value(attacker).pipe(
    Match.when(
      "attackerA",
      (): CreatureAttackState => ({
        creatureAHp: state.creatureAHp,
        creatureBHp: applyDamageToCreature(state.creatureBHp, fills.damage),
      }),
    ),
    Match.when(
      "attackerB",
      (): CreatureAttackState => ({
        creatureAHp: applyDamageToCreature(state.creatureAHp, fills.damage),
        creatureBHp: state.creatureBHp,
      }),
    ),
    Match.exhaustive,
  );
}

function applyDamageToCreature(currentHp: number, damage: number): number {
  return Math.max(0, currentHp - Math.max(0, damage));
}
