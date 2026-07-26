import type { BattleState } from "./battle-state-execution.ts";
import type {
  BattleCompanionPresentState,
  BattleCompanionStoredForm,
} from "./companion-state.ts";
import type { CombatantId } from "./identity.ts";

export function retainedStoredFormForPresentCompanion(input: {
  readonly state: BattleState;
  readonly companionId: CombatantId;
  readonly companion: BattleCompanionPresentState;
}): BattleCompanionStoredForm | string {
  const combatant = input.state.combatants.get(input.companionId);
  if (combatant?.origin.kind !== "statBlock") {
    return "Present companion Stat Block combatant is missing.";
  }
  return {
    formAccess: input.companion.formAccess,
    resolvedStatBlockId: combatant.origin.statBlockId,
  };
}
