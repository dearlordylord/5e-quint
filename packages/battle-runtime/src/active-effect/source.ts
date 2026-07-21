import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

export type BattleActiveEffectSource = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly sourceCombatantId: CombatantId;
};

/**
 * Canonical query projection shared by every active-effect variant. Unit/spell
 * effects carry both refs, companion effects can carry only a combatant source,
 * and environmental effects can carry neither.
 */
export type BattleActiveEffectIdentity = {
  readonly kind: string;
  readonly sourceProcedureRef?: BattleProcedureExecutionRef;
  readonly sourceCombatantId?: CombatantId;
};
