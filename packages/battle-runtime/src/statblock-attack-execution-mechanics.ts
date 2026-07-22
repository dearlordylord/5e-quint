import type { CreatureAttackRollMechanics } from "@dnd/surface/surface/types";

import type { SupportedCreatureAttackRollMechanics } from "./battle-action-options.ts";
import { supportedStatBlockAttackDamage } from "./statblock-attack-damage-support.ts";
import { supportedStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-support.ts";

export function creatureAttackRollMechanicsAreSupported(
  attack: CreatureAttackRollMechanics,
): attack is SupportedCreatureAttackRollMechanics {
  return (
    attack.multiattackCount === undefined &&
    attack.attackBonus.kind === "literal" &&
    supportedStatBlockAttackDamage(attack) !== null &&
    supportedStatBlockAttackHitConditionRiders(attack) !== null &&
    ((attack.attackType === "melee" && attack.reachFeet !== undefined) ||
      (attack.attackType === "ranged" && attack.rangeFeet !== undefined))
  );
}
