import { Option } from "effect";
import type {
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId, StatBlockSpellInvocationRef } from "../identity.ts";
import type { LongCastingTime } from "./long-casting-progress.ts";

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

export function longCastingCompletionResource(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): Option.Option<{ readonly kind: "alreadySpent" }> {
  const source = invocation.spellRuleFacts.castingSource;
  const concentration = state.combatants.get(actorId)?.concentration;
  return source.tag === "statBlock" &&
    concentration?.effectKind === "castingSpell" &&
    concentration.sourceProcedureRef === invocation.sourceProcedureRef &&
    sameInvocationRef(concentration.invocationRef, source.invocationRef) &&
    concentration.progress.kind === "readyToComplete" &&
    concentration.progress.lastMagicActionRound === state.initiative.round
    ? Option.some({ kind: "alreadySpent" as const })
    : Option.none();
}
