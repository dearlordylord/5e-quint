import { resetTurnActionEconomy } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { BattleTurnResources } from "../battle-state-execution.ts";

export function resetBattleTurnResources(
  resources: BattleTurnResources,
): BattleTurnResources {
  const { lightWeaponAttackMade: _lightWeaponAttackMade, ...base } =
    resetTurnActionEconomy(resources);
  return {
    ...base,
    commandHalt: null,
    jumpDistanceMultiplier: null,
    heightenedStepOfTheWindCarriedCreatures: [],
    spellSlotUsesThisTurn: [],
    levelOnePlusSpellCastsThisTurn: [],
    quickenedLevelOnePlusSpellCastsThisTurn: [],
    attackRollMadeThisTurn: false,
    attackDamageRidersUsedThisTurn: [],
    stunningStrikesUsedThisTurn: [],
    huntersPreyHordeBreakerUsedThisTurn: [],
    recklessAttackWhileRagingUsedThisTurn: [],
    weaponDamageDiceRollChoicesUsedThisTurn: [],
    grapplerPunchAndGrabUsedThisTurn: [],
    dashMovementBonusFeet: movementFeet(0),
    disengaged: false,
  };
}
