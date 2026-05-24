// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.MINIMAL_RESOLUTION

import { Match } from "effect";

export type CreatureAttackState = {
  readonly creatureAHp: number;
  readonly creatureBHp: number;
};

export type Attacker = "attackerA" | "attackerB";

export type CreatureAttackFills = {
  readonly damage: number;
  readonly hit: boolean;
};

export function applyDamageToCreature(
  currentHp: number,
  damage: number,
): number {
  return Math.max(0, currentHp - Math.max(0, damage));
}

export function resolveCreatureAttack(
  state: CreatureAttackState,
  attacker: Attacker,
  fills: CreatureAttackFills,
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
