// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
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
