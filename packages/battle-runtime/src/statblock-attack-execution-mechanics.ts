import { PositiveInteger } from "@dnd/shared/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { CreatureAttackRollMechanics } from "@dnd/surface/surface/types";

import type { SupportedCreatureAttackRollMechanics } from "./battle-action-options.ts";
import {
  statBlockAttackDamageEffectIsSupported,
  supportedStatBlockAttackDamage,
} from "./statblock-attack-damage-support.ts";
import {
  supportedStatBlockAttackHitConditionRiderEffect,
  supportedStatBlockAttackHitConditionRiders,
} from "./statblock-attack-hit-condition-support.ts";

export type StatBlockAttackMechanicsSupportIssue =
  | {
      readonly kind: "unsupportedEffect";
      readonly effectOrdinal: PositiveInteger;
    }
  | {
      readonly kind: "unsupportedMechanics";
    };

export type StatBlockAttackMechanicsSupport =
  | { readonly kind: "supported" }
  | {
      readonly kind: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<StatBlockAttackMechanicsSupportIssue>;
    };

export function statBlockProcedureEffectIsSupported(
  effect: CreatureAttackRollMechanics["onHit"][number],
): boolean {
  return (
    statBlockAttackDamageEffectIsSupported(effect) ||
    supportedStatBlockAttackHitConditionRiderEffect(effect) !== null
  );
}

/**
 * The single path-bearing attack support profile shared by authored admission
 * and runtime projection.  Callers translate effect ordinals into their own
 * graph paths; the support owner remains responsible for the effect rules.
 */
export function statBlockAttackMechanicsSupport(
  attack: CreatureAttackRollMechanics,
): StatBlockAttackMechanicsSupport {
  const issues: StatBlockAttackMechanicsSupportIssue[] = [];
  for (const [index, effect] of attack.onHit.entries()) {
    if (statBlockProcedureEffectIsSupported(effect)) continue;
    issues.push({
      kind: "unsupportedEffect",
      effectOrdinal: PositiveInteger(index + 1),
    });
  }

  const mechanicsSupported =
    attack.multiattackCount === undefined &&
    attack.attackBonus.kind === "literal" &&
    supportedStatBlockAttackDamage(attack) !== null &&
    supportedStatBlockAttackHitConditionRiders(attack) !== null &&
    ((attack.attackType === "melee" && attack.reachFeet !== undefined) ||
      (attack.attackType === "ranged" && attack.rangeFeet !== undefined));
  if (!mechanicsSupported) issues.push({ kind: "unsupportedMechanics" });

  const [first, ...rest] = issues;
  return first === undefined
    ? { kind: "supported" }
    : { kind: "unsupported", issues: [first, ...rest] };
}

export function creatureAttackRollMechanicsAreSupported(
  attack: CreatureAttackRollMechanics,
): attack is SupportedCreatureAttackRollMechanics {
  return statBlockAttackMechanicsSupport(attack).kind === "supported";
}
