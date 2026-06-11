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
