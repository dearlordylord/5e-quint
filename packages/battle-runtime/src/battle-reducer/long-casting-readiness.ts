// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
import { Option } from "effect";
import type {
  BattleExecutableSpellInvocation,
  BattleState,
  BattleConcentration,
} from "../battle-state-execution.ts";
import type { CombatantId, StatBlockSpellInvocationRef } from "../identity.ts";
import type { LongCastingTime } from "./long-casting-progress.ts";
import { isLongCastingReadyToComplete } from "./long-casting-progress.ts";

export function sameInvocationRef(
  left: StatBlockSpellInvocationRef,
  right: StatBlockSpellInvocationRef,
): boolean {
  return (
    left.procedureRef === right.procedureRef &&
    left.groupOrdinal === right.groupOrdinal &&
    left.invocationOrdinal === right.invocationOrdinal
  );
}

export function statBlockLongCastingTime(
  invocation: BattleExecutableSpellInvocation,
): Option.Option<LongCastingTime> {
  const source = invocation.spellRuleFacts.castingSource;
  return source.tag === "statBlock" &&
    (source.castingTime.kind === "minutes" ||
      source.castingTime.kind === "hours")
    ? Option.some(source.castingTime)
    : Option.none();
}

/** A pending cast belongs to one admitted child procedure, not just its listed spell. */
export function longCastingConcentrationForInvocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
):
  | Extract<BattleConcentration, { readonly effectKind: "castingSpell" }>
  | undefined {
  const source = invocation.spellRuleFacts.castingSource;
  const concentration = state.combatants.get(actorId)?.concentration;
  if (
    source.tag !== "statBlock" ||
    concentration?.effectKind !== "castingSpell"
  )
    return undefined;
  return concentration.sourceProcedureRef === invocation.sourceProcedureRef &&
    sameInvocationRef(concentration.invocationRef, source.invocationRef)
    ? concentration
    : undefined;
}

export function longCastingCompletionResource(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): Option.Option<{ readonly kind: "alreadySpent" }> {
  const concentration = longCastingConcentrationForInvocation(
    state,
    actorId,
    invocation,
  );
  return concentration !== undefined &&
    isLongCastingReadyToComplete(concentration.progress, state.initiative.round)
    ? Option.some({ kind: "alreadySpent" as const })
    : Option.none();
}
