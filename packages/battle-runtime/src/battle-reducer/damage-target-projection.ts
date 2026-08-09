import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

export type BattleDamageTarget<TDamage> = {
  readonly target: BattleCreatureState;
  readonly damage: TDamage;
};

export function battleDamageTargets<TDamage>(input: {
  readonly state: BattleState;
  readonly targetIds: readonly CombatantId[];
  readonly damageForTarget: (target: BattleCreatureState) => TDamage;
}): readonly BattleDamageTarget<TDamage>[] {
  return input.targetIds.flatMap((targetId) => {
    const target = input.state.combatants.get(targetId);
    return target === undefined
      ? []
      : [
          {
            target,
            damage: input.damageForTarget(target),
          },
        ];
  });
}
