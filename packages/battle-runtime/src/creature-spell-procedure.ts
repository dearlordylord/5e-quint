import type {
  BattleCreatureState,
  BattleExecutableSpellInvocation,
} from "./battle-state-execution.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import { characterSpellProcedure } from "./character-execution-queries.ts";
import { statBlockSpellProcedure } from "./stat-block-spell-invocation-selection.ts";
export function creatureSpellProcedure(
  actor: BattleCreatureState,
  procedureRef: BattleProcedureExecutionRef,
): BattleExecutableSpellInvocation | undefined {
  return actor.origin.kind === "character"
    ? characterSpellProcedure(actor.origin.execution, procedureRef, actor)
    : statBlockSpellProcedure(actor.origin.execution, procedureRef);
}
