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
    }
  | {
      readonly formAccess: "druidWildCompanion";
      readonly formSelection: FindFamiliarFormSelection;
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
    })
  | (Extract<
      BattleCompanionSelectedForm,
      { readonly formAccess: "druidWildCompanion" }
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
  | (BattleCompanionPresentState & {
      readonly companionId: CombatantId;
      readonly resolvedStatBlockId: StatBlockRecord["id"];
      readonly initiative: InitiativeScore;
    })
  | (BattleCompanionAbsentState & {
      readonly companionId: BattleCompanionStateId;
    });

export type BattleCompanionPresentEntry = {
  readonly companionId: CombatantId;
  readonly companion: BattleCompanionPresentState;
};

export type BattleCompanionAbsentEntry = {
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
  for (const [companionId, companion] of companions) {
    if (companion.status === "present") {
      entries.push({
        companionId: presentCompanionCombatantId(companionId, companion),
        companion,
      });
    } else {
      entries.push({ companionId, companion });
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
    companion.identity.durableCompanionId,
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
  return companion.status !== "present" &&
    companion.identity.tag === "retainedBetweenBattles"
    ? companion.identity.durableCompanionId
    : companionId;
}

export function presentCompanionCombatantId(
  companionId: BattleCompanionStateId,
  _companion: BattleCompanionPresentState,
): CombatantId {
  // Cast evidence: setCompanion keys present companions by their active battle
  // combatant id, and present companion entries are created only from that map.
  return companionId as CombatantId;
}
