import type { BattleState } from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-queries.ts";
import { ongoingFeatureProfileHasExtensionTrigger } from "./ongoing-feature-helpers.ts";

export function ongoingFeatureEnemyRelationshipDecisionRequired(
  state: BattleState,
  actorId: CombatantId,
  trigger: "attackRollAgainstEnemy" | "enemySavingThrow",
): boolean {
  const actor = state.combatants.get(actorId);
  return (
    actor !== undefined &&
    [...activeOngoingFeatureOccurrencesForCombatant(actor)].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        trigger,
      ),
    )
  );
}
