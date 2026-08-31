// UNIT-PROFILE-COVERAGE: runtime-owner spell.companion-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import type { BattleState } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";
import type { SpawnedCompanionCreatureTypeOverride } from "@dnd/shared/game-facts";
import type {
  BattleCompanionEntry,
  BattleCompanionPresentState,
  BattleCompanionState,
} from "./companion-state.ts";
import {
  companionEntries,
  findCompanionByOwner,
  findCompanionEntryByOwner,
} from "./companion-state.ts";
export type { BattleCompanionEntry } from "./companion-state.ts";

export function battleCompanionEntries(
  state: BattleState,
): readonly BattleCompanionEntry[] {
  return companionEntries(state.companions);
}

export function spawnedCompanionEntryForOwner(
  state: BattleState,
  ownerId: CombatantId,
): BattleCompanionEntry | null {
  return findCompanionEntryByOwner(state.companions, ownerId) ?? null;
}

export function spawnedCompanionForOwner(
  state: BattleState,
  ownerId: CombatantId,
): BattleCompanionState | null {
  return findCompanionByOwner(state.companions, ownerId) ?? null;
}

export function spawnedCompanionCreatureTypeOverrideForOwner(
  state: BattleState,
  ownerId: CombatantId,
): SpawnedCompanionCreatureTypeOverride | null {
  return (
    findCompanionByOwner(state.companions, ownerId)?.creatureTypeOverride ??
    null
  );
}

export function findPresentFamiliarById(
  state: BattleState,
  familiarId: CombatantId,
): {
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
  readonly familiar: BattleCompanionPresentState;
} | null {
  for (const [ownerId, companion] of state.companions) {
    if (
      companion.status === "present" &&
      companion.combatantId === familiarId
    ) {
      return { ownerId, companionId: familiarId, familiar: companion };
    }
  }
  return null;
}

export function isPresentSpawnedCompanionCombatant(
  state: BattleState,
  familiarId: CombatantId,
): boolean {
  return findPresentFamiliarById(state, familiarId) !== null;
}
