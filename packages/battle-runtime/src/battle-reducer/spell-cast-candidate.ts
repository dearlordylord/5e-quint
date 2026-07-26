import type {
  BattleActDiscoveryCandidate,
  BattleHole,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

export function actionSpellCastCandidate(
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}
