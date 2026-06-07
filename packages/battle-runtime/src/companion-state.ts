// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { Hp, type PositiveInteger } from "@dnd/shared/types";

import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormSelection,
} from "./find-familiar-forms.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type {
  BattleTablePositionId,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";

export type BattleCompanionStateId = string;
export type BattleCompanionDurableId = string;

export type BattleCompanionIdentity =
  | { readonly tag: "battleOnly" }
  | {
      readonly tag: "retainedBetweenBattles";
      readonly durableCompanionId: BattleCompanionDurableId;
    };

export type BattleCompanionExpiration =
  | { readonly tag: "none" }
  | { readonly tag: "ownerFinishedLongRest" };

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
  readonly expiration: BattleCompanionExpiration;
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

export type FindFamiliarDisappearedAtZeroHitPointsState =
  BattleCompanionDisappearedAtZeroHitPointsState;

export type BattleCompanionAbsentState =
  | BattleCompanionTemporarilyDismissedState
  | BattleCompanionDisappearedAtZeroHitPointsState;

export type BattleCompanionState =
  | BattleCompanionPresentState
  | BattleCompanionAbsentState;

export type BattleCompanionSnapshot =
  | (Omit<BattleCompanionPresentState, "combatantId"> & {
      readonly companionId: CombatantId;
      readonly resolvedStatBlockId: StatBlockRecord["id"];
      readonly initiative: InitiativeScore;
    })
  | (BattleCompanionAbsentState & {
      readonly companionId: BattleCompanionStateId;
    });

export type BattleCompanionPresentEntry = {
  readonly companionStateId: BattleCompanionStateId;
  readonly companionId: CombatantId;
  readonly companion: BattleCompanionPresentState;
};

export type BattleCompanionAbsentEntry = {
  readonly companionStateId: BattleCompanionStateId;
  readonly companionId: BattleCompanionStateId;
  readonly companion: BattleCompanionAbsentState;
};

export type BattleCompanionEntry =
  | BattleCompanionPresentEntry
  | BattleCompanionAbsentEntry;

export function companionEntries(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
): readonly BattleCompanionEntry[] {
  const entries: BattleCompanionEntry[] = [];
  for (const [companionStateId, companion] of companions) {
    if (companion.status === "present") {
      entries.push({
        companionStateId,
        companionId: presentCompanionCombatantId(companionStateId, companion),
        companion,
      });
    } else {
      entries.push({
        companionStateId,
        companionId: absentCompanionDisplayId(companionStateId, companion),
        companion,
      });
    }
  }
  return entries;
}

export function findCompanionByOwner(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
  ownerId: CombatantId,
): BattleCompanionState | undefined {
  return findCompanionEntryByOwner(companions, ownerId)?.companion;
}

export function findCompanionEntryByOwner(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
  ownerId: CombatantId,
): BattleCompanionEntry | undefined {
  return companionEntries(companions).find(
    (entry) => entry.companion.ownerId === ownerId,
  );
}

export function setCompanion(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
  companionId: CombatantId,
  companion: BattleCompanionState,
): ReadonlyMap<BattleCompanionStateId, BattleCompanionState> {
  const companionStateId = companionStateIdFor(companionId, companion);
  return setCompanionByStateId(companions, companionStateId, companion);
}

export function setRetainedAbsentCompanion(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
  companion: BattleCompanionAbsentState & {
    readonly identity: Extract<
      BattleCompanionIdentity,
      { readonly tag: "retainedBetweenBattles" }
    >;
  },
): ReadonlyMap<BattleCompanionStateId, BattleCompanionState> {
  return setCompanionByStateId(
    companions,
    retainedCompanionStateId(companion.identity.durableCompanionId),
    companion,
  );
}

function setCompanionByStateId(
  companions: ReadonlyMap<BattleCompanionStateId, BattleCompanionState>,
  companionStateId: BattleCompanionStateId,
  companion: BattleCompanionState,
): ReadonlyMap<BattleCompanionStateId, BattleCompanionState> {
  const withoutSameOwner = [...companions].filter(
    ([key, candidate]) =>
      candidate.ownerId !== companion.ownerId && key !== companionStateId,
  );
  return new Map(withoutSameOwner).set(companionStateId, companion);
}

export function companionStateIdFor(
  companionId: CombatantId,
  companion: BattleCompanionState,
): BattleCompanionStateId {
  if (companion.identity.tag === "retainedBetweenBattles") {
    return retainedCompanionStateId(companion.identity.durableCompanionId);
  }
  return battleOnlyCompanionStateId(companionId);
}

export function presentCompanionCombatantId(
  _companionId: BattleCompanionStateId,
  companion: BattleCompanionPresentState,
): CombatantId {
  return companion.combatantId;
}

function absentCompanionDisplayId(
  companionId: BattleCompanionStateId,
  companion: BattleCompanionAbsentState,
): BattleCompanionStateId {
  return companion.identity.tag === "retainedBetweenBattles"
    ? companion.identity.durableCompanionId
    : companionId;
}

export function retainedCompanionStateId(
  durableCompanionId: BattleCompanionDurableId,
): BattleCompanionStateId {
  return `retained:${durableCompanionId}`;
}

export function battleOnlyCompanionStateId(
  companionId: CombatantId,
): BattleCompanionStateId {
  return `battle:${companionId}`;
}
