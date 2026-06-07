// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import type { BattleState } from "./battle-reducer.ts";
import type { CombatantId } from "./identity.ts";
import type { FindFamiliarCreatureTypeOverride } from "./find-familiar-forms.ts";
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

export function findFamiliarCompanionEntryForOwner(
  state: BattleState,
  ownerId: CombatantId,
): BattleCompanionEntry | null {
  return findCompanionEntryByOwner(state.companions, ownerId) ?? null;
}

export function findFamiliarCompanionForOwner(
  state: BattleState,
  ownerId: CombatantId,
): BattleCompanionState | null {
  return findCompanionByOwner(state.companions, ownerId) ?? null;
}

export function findFamiliarCreatureTypeOverrideForOwner(
  state: BattleState,
  ownerId: CombatantId,
): FindFamiliarCreatureTypeOverride | null {
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
  readonly companionStateId: BattleCompanionEntry["companionStateId"];
  readonly companionId: CombatantId;
  readonly familiar: BattleCompanionPresentState;
} | null {
  const entry = battleCompanionEntries(state).find(
    (candidate) =>
      candidate.companion.status === "present" &&
      candidate.companionId === familiarId,
  );
  if (entry?.companion.status === "present") {
    return {
      ownerId: entry.companion.ownerId,
      companionStateId: entry.companionStateId,
      companionId: familiarId,
      familiar: entry.companion,
    };
  }
  return null;
}

export function isPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): boolean {
  return findPresentFamiliarById(state, familiarId) !== null;
}
