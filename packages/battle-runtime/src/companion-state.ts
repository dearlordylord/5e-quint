// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import type { RetainedCompanionProtocol } from "@dnd/shared-algebras/companion-protocol-algebra";
import { Hp, type PositiveInteger } from "@dnd/shared/types";

import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type {
  BattleTablePositionId,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";

export type BattleCompanionDurableId = string;

export type BattleCompanionIdentity =
  | { readonly tag: "battleOnly" }
  | {
      readonly tag: "retainedBetweenBattles";
      readonly durableCompanionId: BattleCompanionDurableId;
    };

export type BattleCompanionProtocol = RetainedCompanionProtocol;

export type BattleCompanionPlacement =
  | {
      readonly kind: "unoccupiedSpaceWithinSpellRange";
      readonly positionId?: BattleTablePositionId;
    }
  | {
      readonly kind: "unoccupiedSpaceWithin30Feet";
      readonly positionId?: BattleTablePositionId;
    };

export type BattleCompanionSelectedForm =
  | {
      readonly formAccess: "findFamiliar";
      readonly formSelection: FindFamiliarFormSelection;
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly formSelection: PactOfTheChainFindFamiliarFormSelection;
    };

export type BattleCompanionStoredForm =
  | (Extract<
      BattleCompanionSelectedForm,
      { readonly formAccess: "findFamiliar" }
    > & {
      readonly resolvedStatBlockId: StatBlockRecord["id"];
    })
  | (Extract<
      BattleCompanionSelectedForm,
      { readonly formAccess: "pactOfTheChain" }
    > & {
      readonly resolvedStatBlockId: StatBlockRecord["id"];
    });

export type BattleCompanionCurrentHitPoints = Hp & PositiveInteger;

export type BattleCompanionHitPoints = {
  readonly currentHp: BattleCompanionCurrentHitPoints;
  readonly tempHp: Hp;
};

export type BattleCompanionProtocolState = {
  readonly ownerId: CombatantId;
  readonly identity: BattleCompanionIdentity;
  readonly protocol: BattleCompanionProtocol;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
};

export type BattleCompanionPresentState = BattleCompanionSelectedForm &
  BattleCompanionProtocolState & {
    readonly status: "present";
    readonly combatantId: CombatantId;
    readonly placement: BattleCompanionPlacement;
  };

export type BattleCompanionTemporarilyDismissedState =
  BattleCompanionStoredForm &
    BattleCompanionProtocolState & {
      readonly status: "temporarilyDismissed";
      readonly reappearanceCombatantId: CombatantId;
      readonly hitPoints: BattleCompanionHitPoints;
    };

export type BattleCompanionDisappearedAtZeroHitPointsState =
  BattleCompanionStoredForm &
    BattleCompanionProtocolState & {
      readonly status: "disappearedAtZeroHitPoints";
    };

export type BattleCompanionAbsentState =
  | BattleCompanionTemporarilyDismissedState
  | BattleCompanionDisappearedAtZeroHitPointsState;

// Terminal tombstone after a permanent dismissal. It retains owner + identity
// (and the rest of the protocol state) so settlement can clear the owner's
// durable Character Sheet slot — distinct from a missing map entry, which means
// the owner never had a battle companion. It carries no stored form because it
// can never reappear, and it is not an absent (reappear-able) state.
export type BattleCompanionDismissedForeverState =
  BattleCompanionProtocolState & {
    readonly status: "dismissedForever";
  };

export type BattleCompanionState =
  | BattleCompanionPresentState
  | BattleCompanionAbsentState
  | BattleCompanionDismissedForeverState;

export type BattleCompanionSnapshot =
  | (Omit<BattleCompanionPresentState, "combatantId"> & {
      readonly companionId: CombatantId;
      readonly resolvedStatBlockId: StatBlockRecord["id"];
      readonly initiative: InitiativeScore;
    })
  | BattleCompanionAbsentState;

// Battle companions are filed one-per-owner: the map is keyed by the owner's
// CombatantId. SRD Find Familiar grants the owner a single familiar at a time, so
// one entry per owner is the structural invariant. Widening to multiple
// companions per owner later means widening this map's value to a small per-owner
// collection (see plans/COMPANION_SESSION_ADMISSION_AND_REAPPEARANCE_PLAN.md),
// not reviving a synthetic per-companion key space.
export type BattleCompanions = ReadonlyMap<CombatantId, BattleCompanionState>;

export type BattleCompanionEntry = {
  readonly ownerId: CombatantId;
  readonly companion: BattleCompanionState;
};

export function companionEntries(
  companions: BattleCompanions,
): readonly BattleCompanionEntry[] {
  return [...companions].map(([ownerId, companion]) => ({ ownerId, companion }));
}

export function findCompanionByOwner(
  companions: BattleCompanions,
  ownerId: CombatantId,
): BattleCompanionState | undefined {
  return companions.get(ownerId);
}

export function findCompanionEntryByOwner(
  companions: BattleCompanions,
  ownerId: CombatantId,
): BattleCompanionEntry | undefined {
  const companion = companions.get(ownerId);
  return companion === undefined ? undefined : { ownerId, companion };
}

export function setCompanion(
  companions: BattleCompanions,
  companion: BattleCompanionState,
): BattleCompanions {
  return new Map(companions).set(companion.ownerId, companion);
}
