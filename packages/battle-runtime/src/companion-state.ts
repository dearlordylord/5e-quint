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
      readonly companionId: CombatantId;
    });

export type BattleCompanionEntry = {
  readonly companionId: CombatantId;
  readonly companion: BattleCompanionState;
};

export function companionEntries(
  companions: ReadonlyMap<CombatantId, BattleCompanionState>,
): readonly BattleCompanionEntry[] {
  return [...companions].map(([companionId, companion]) => ({
    companionId,
    companion,
  }));
}

export function findCompanionByOwner(
  companions: ReadonlyMap<CombatantId, BattleCompanionState>,
  ownerId: CombatantId,
): BattleCompanionState | undefined {
  return findCompanionEntryByOwner(companions, ownerId)?.companion;
}

export function findCompanionEntryByOwner(
  companions: ReadonlyMap<CombatantId, BattleCompanionState>,
  ownerId: CombatantId,
): BattleCompanionEntry | undefined {
  return companionEntries(companions).find(
    (entry) => entry.companion.ownerId === ownerId,
  );
}

export function setCompanion(
  companions: ReadonlyMap<CombatantId, BattleCompanionState>,
  companionId: CombatantId,
  companion: BattleCompanionState,
): ReadonlyMap<CombatantId, BattleCompanionState> {
  const withoutSameOwner = [...companions].filter(
    ([key, candidate]) =>
      candidate.ownerId !== companion.ownerId && key !== companionId,
  );
  return new Map(withoutSameOwner).set(companionId, companion);
}
