import type {
  BattleCreatureState,
  BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import { characterSpellProcedure } from "../character-execution-queries.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";

export function supportedSpellActs(
  actor: BattleCreatureState,
): readonly BattleExecutableSpellInvocation[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
  return actor.origin.execution.procedureBindings
    .flatMap((binding) => {
      if (binding.procedure.kind !== "spellInvocation") return [];
      const invocation = characterSpellProcedure(
        actor.origin.execution,
        binding.procedureRef,
        actor,
      );
      return invocation === undefined ? [] : [invocation];
    })
    .filter(
      (invocation) =>
        !activeOngoingFeaturesPreventSpellInvocation(actor, invocation),
    );
}
