// Small leaf helpers shared between G (creature_state) and S (movement_speed).
// Mechanical extraction — no behavior change. Per cycle #17/#26 in the
// refactor map, hoisting these here lets S avoid cycling back into G.

import {
hasCondition,
isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import type { HandUse } from "@dnd/shared/types";
import { Match } from "effect";
import {
type BattleCreatureState,
type BattleGrappleLink,
type BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

export function combatantCanSee(
  state: BattleState,
  viewerId: CombatantId,
  seenId: CombatantId,
): boolean {
  if (!state.combatants.has(viewerId)) {
    return false;
  }
  const seen = state.combatants.get(seenId);
  const invisibleBenefitDenied = combatantInvisibleBenefitDenied(seen);
  return (
    seen !== undefined &&
    (seen.hidden === null || invisibleBenefitDenied) &&
    (!hasCondition(seen.conditions, "invisible") || invisibleBenefitDenied)
  );
}

export function combatantInvisibleBenefitDenied(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.activeEffects.some(
      (effect) =>
        effect.kind === "faerieFireOutline" ||
        effect.kind === "invisibleBenefitDenied",
    ) === true
  );
}

export function currentActorId(state: BattleState): CombatantId {
  return currentActing(state.initiative);
}

export function combatantWearingArmorCategory(
  combatant: BattleCreatureState,
  category: "heavy",
): boolean {
  return (
    combatant.armorClass.base.kind === "armor" &&
    combatant.armorClass.base.category === category
  );
}

export function grappledBy(
  state: BattleState,
  targetId: CombatantId,
): BattleGrappleLink | undefined {
  return state.grapples.find((grapple) => grapple.targetId === targetId);
}

export function combatantHandUses(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): { readonly left: HandUse; readonly right: HandUse } {
  return {
    left: handUseForOccupancy(
      combatant.armorClass.leftHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "left",
      ),
    ),
    right: handUseForOccupancy(
      combatant.armorClass.rightHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "right",
      ),
    ),
  };
}

function handUseForOccupancy(
  occupancy: HandUse,
  occupiedByGrapple: boolean,
): HandUse {
  if (occupiedByGrapple) return "grapple";
  return occupancy;
}

export function combatantsAreEnemies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side !== target.side
  );
}

export function combatantsAreAllies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side === target.side
  );
}

export function normalizeBattleGrapples(state: BattleState): BattleState {
  const grapples = state.grapples.filter((grapple) => {
    const grappler = state.combatants.get(grapple.grapplerId);
    const target = state.combatants.get(grapple.targetId);
    return (
      grappler !== undefined &&
      target !== undefined &&
      !isIncapacitated(grappler.conditions) &&
      !zeroHpLifecycleIsTerminal(grappler) &&
      !zeroHpLifecycleIsTerminal(target)
    );
  });
  return grapples.length === state.grapples.length
    ? state
    : { ...state, grapples };
}





export function zeroHpLifecycleIsTerminal(combatant: BattleCreatureState): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}
