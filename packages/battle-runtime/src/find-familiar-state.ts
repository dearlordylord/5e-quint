// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
import type { BattleState } from "./battle-reducer.ts";
import type { CombatantId } from "./identity.ts";
import type { FindFamiliarCreatureTypeOverride } from "./find-familiar-forms.ts";
import type { FindFamiliarPresentState } from "./find-familiar-lifecycle.ts";

export function findFamiliarCreatureTypeOverrideForOwner(
  state: BattleState,
  ownerId: CombatantId,
): FindFamiliarCreatureTypeOverride | null {
  return state.findFamiliars.get(ownerId)?.creatureTypeOverride ?? null;
}

export function findPresentFamiliarById(
  state: BattleState,
  familiarId: CombatantId,
): {
  readonly ownerId: CombatantId;
  readonly familiar: FindFamiliarPresentState;
} | null {
  for (const [ownerId, familiar] of state.findFamiliars) {
    if (familiar.status === "present" && familiar.familiarId === familiarId) {
      return { ownerId, familiar };
    }
  }
  return null;
}

export function isPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): boolean {
  return findPresentFamiliarById(state, familiarId) !== null;
}
