import type {
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { spellCastReactionFactsHole } from "./spell-cast-interrupt-frame.ts";
import {
  spellCastCanTriggerSpellCastInterruption,
  spellCastInterruptionReactionCapableReactors,
} from "./spell-cast-interruption-reaction-discovery.ts";
export function longCastingInterruptionHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
) {
  return spellCastCanTriggerSpellCastInterruption({
    casterId: actorId,
    invocation,
    reactors: spellCastInterruptionReactionCapableReactors(state),
  })
    ? ([spellCastReactionFactsHole({ casterId: actorId, invocation })] as const)
    : ([] as const);
}
