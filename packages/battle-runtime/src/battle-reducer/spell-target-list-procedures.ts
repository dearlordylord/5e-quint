import type { TargetListSpellInvocation } from "../battle-state-execution.ts";

export type BattleSpellTargetListInvocation = TargetListSpellInvocation;

export type BattleSpellTargetListProcedure =
  BattleSpellTargetListInvocation["procedure"];
