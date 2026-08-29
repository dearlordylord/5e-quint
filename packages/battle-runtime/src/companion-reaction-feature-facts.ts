import type { BattleState } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

export function combatantHasPactOfTheChainSpawnedCompanion(
  state: BattleState,
  ownerId: CombatantId,
): boolean {
  const owner = state.combatants.get(ownerId);
  return (
    owner?.origin.kind === "character" &&
    owner.origin.spellcasting?.pactOfTheChainSpawnedCompanionInvocationMode !==
      null &&
    owner.origin.spellcasting?.pactOfTheChainSpawnedCompanionInvocationMode !==
      undefined
  );
}
