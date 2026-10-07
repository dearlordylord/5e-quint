import { Option } from "effect";
import type {
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { longCastingCompletionResource } from "./long-casting-readiness.ts";
export {
  longCastingCompletionResource,
  statBlockLongCastingTime,
  sameInvocationRef,
} from "./long-casting-readiness.ts";

export function completeLongCastingSpellState(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  return Option.isSome(
    longCastingCompletionResource(state, actorId, invocation),
  )
    ? breakBattleConcentration(state, actorId)
    : state;
}
