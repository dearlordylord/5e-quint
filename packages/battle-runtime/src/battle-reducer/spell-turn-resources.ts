// Spell turn-resource predicates and markers shared by discovery and resolve.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Either } from "effect";

import type {
  BattleCreatureState,
  BattleTurnResources,
  BattleTurnSpellSlotUse,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { resourceHasUsesRemaining } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";

export function spellHasAvailableSpend(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  const resource = invocation.resource;
  if (resource.tag === "none") {
    return true;
  }
  if (resource.tag === "classFeatureFreeCast") {
    return actor.origin.resources.some(
      (candidate) =>
        candidate.unit.id === resource.resourceUnitId &&
        resourceHasUsesRemaining(candidate),
    );
  }
  return (
    actor.origin.spellcasting?.spellSlots.some(
      (slot) =>
        slot.spellLevel === resource.slotLevel && slot.expended < slot.count,
    ) === true
  );
}

export function spellActTurnResourceAvailable(
  resources: BattleTurnResources,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
  options?: {
    readonly actionCostOverride?: "magicAction" | "bonusAction";
  },
): boolean {
  if (
    spellInvocationIsLevelOnePlus(invocation) &&
    combatantHasQuickenedLevelOnePlusSpellCastThisTurn(resources, actorId)
  ) {
    return false;
  }
  if (
    invocation.resource.tag === "spellSlot" &&
    combatantHasSpellSlotUseThisTurn(resources, actorId)
  ) {
    return false;
  }
  const actionCost = spellInvocationActionCost(invocation, options);
  if (actionCost === "bonusAction") {
    return canSpendBonusAction(resources);
  }
  if (invocation.resource.tag === "none") {
    return canSpendAction(resources, "magic");
  }
  return canSpendAction(resources, "magic");
}

export function spellInvocationSpendsMagicAction(
  invocation: SupportedSpellInvocation,
  options?: {
    readonly actionCostOverride?: "magicAction" | "bonusAction";
  },
): boolean {
  return spellInvocationActionCost(invocation, options) === "magicAction";
}

function spellInvocationActionCost(
  invocation: SupportedSpellInvocation,
  options?: {
    readonly actionCostOverride?: "magicAction" | "bonusAction";
  },
): "magicAction" | "bonusAction" {
  return (
    options?.actionCostOverride ??
    ("actionCost" in invocation ? invocation.actionCost : "magicAction")
  );
}

export function spellInvocationIsLevelOnePlus(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spell.mechanics.level >= 1
  );
}

export function spellInvocationIsSpellcasting(
  invocation: SupportedSpellInvocation,
): boolean {
  return !(
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "dancingLightsReposition" ||
    (invocation.procedure === "markedDamageRider" &&
      invocation.action === "transfer")
  );
}

export function markLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return combatantHasLevelOnePlusSpellCastThisTurn(resources, combatantId)
    ? resources
    : {
        ...resources,
        levelOnePlusSpellCastsThisTurn: [
          ...resources.levelOnePlusSpellCastsThisTurn,
          combatantId,
        ],
      };
}

export function markInvocationLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleTurnResources {
  return spellInvocationIsLevelOnePlus(invocation)
    ? markLevelOnePlusSpellCastThisTurn(resources, combatantId)
    : resources;
}

export function markQuickenedLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return combatantHasQuickenedLevelOnePlusSpellCastThisTurn(
    resources,
    combatantId,
  )
    ? resources
    : {
        ...resources,
        quickenedLevelOnePlusSpellCastsThisTurn: [
          ...resources.quickenedLevelOnePlusSpellCastsThisTurn,
          combatantId,
        ],
      };
}

export function markSpellSlotExpendedThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  if (combatantHasCommittedSpellSlotUseThisTurn(resources, combatantId)) {
    return Either.left("spell slot already expended this turn" as const);
  }
  const pending = resources.spellSlotUsesThisTurn.some(
    (use) => use.kind === "pending" && use.combatantId === combatantId,
  );
  const nextUse: BattleTurnSpellSlotUse = {
    kind: "committed",
    combatantId,
  };
  return Either.right(
    markLevelOnePlusSpellCastThisTurn(
      {
        ...resources,
        spellSlotUsesThisTurn: pending
          ? resources.spellSlotUsesThisTurn.map((use) =>
              use.kind === "pending" && use.combatantId === combatantId
                ? nextUse
                : use,
            )
          : [...resources.spellSlotUsesThisTurn, nextUse],
      },
      combatantId,
    ),
  );
}

export function claimPendingSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  return combatantHasSpellSlotUseThisTurn(resources, combatantId)
    ? Either.left("spell slot already expended this turn" as const)
    : Either.right({
        ...resources,
        spellSlotUsesThisTurn: [
          ...resources.spellSlotUsesThisTurn,
          { kind: "pending", combatantId },
        ],
      });
}

export function releasePendingSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return {
    ...resources,
    spellSlotUsesThisTurn: resources.spellSlotUsesThisTurn.filter(
      (use) => !(use.kind === "pending" && use.combatantId === combatantId),
    ),
  };
}

export function combatantHasSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.spellSlotUsesThisTurn.some(
    (use) => use.combatantId === combatantId,
  );
}

export function combatantHasCommittedSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.spellSlotUsesThisTurn.some(
    (use) => use.kind === "committed" && use.combatantId === combatantId,
  );
}

export function combatantHasLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.levelOnePlusSpellCastsThisTurn.includes(combatantId);
}

export function combatantHasQuickenedLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.quickenedLevelOnePlusSpellCastsThisTurn.includes(
    combatantId,
  );
}
