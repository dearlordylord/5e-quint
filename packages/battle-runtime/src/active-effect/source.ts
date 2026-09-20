import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

export type BattleActiveEffectSource = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
};
