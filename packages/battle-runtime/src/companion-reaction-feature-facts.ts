import type { BattleState } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

export function combatantHasPactOfTheChainFindFamiliar(
  state: BattleState,
  ownerId: CombatantId,
): boolean {
  const owner = state.combatants.get(ownerId);
  return (
    owner?.origin.kind === "character" &&
    owner.origin.spellcasting?.pactOfTheChainFindFamiliarInvocationMode !==
      null &&
    owner.origin.spellcasting?.pactOfTheChainFindFamiliarInvocationMode !==
      undefined
  );
}
