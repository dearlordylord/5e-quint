// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
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
