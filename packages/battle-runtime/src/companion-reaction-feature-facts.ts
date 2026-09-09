import type { BattleState } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";
import type { SpawnedCompanionLifecycleExecutionFacts } from "./procedure-execution/spell-procedure-execution.ts";

export function spawnedCompanionLifecycleExecutionFactsForOwner(
  state: BattleState,
  ownerId: CombatantId,
): SpawnedCompanionLifecycleExecutionFacts | null {
  const owner = state.combatants.get(ownerId);
  return owner?.origin.kind === "character"
    ? (owner.origin.spellcasting?.spawnedCompanionLifecycle ?? null)
    : null;
}

export function combatantHasPactOfTheChainSpawnedCompanion(
  state: BattleState,
  ownerId: CombatantId,
): boolean {
  const owner = state.combatants.get(ownerId);
  return (
    owner?.origin.kind === "character" &&
    owner.origin.spellcasting?.pactOfTheChainSpawnedCompanion !== null &&
    owner.origin.spellcasting?.pactOfTheChainSpawnedCompanion !== undefined
  );
}
