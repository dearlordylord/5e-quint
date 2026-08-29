import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { type BattleSubject } from "../battle-subjects.ts";
import { type BattleObjectId, CombatantId } from "../identity.ts";
import { characterEffectiveLoadoutFromOrigin } from "./battle-object-lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleHeldObjectFactsHole,
  BattleHoleId,
  BattleState,
} from "../battle-state-execution.ts";

export type CompelledNextTurnBehaviorEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "compelledNextTurnBehavior" }
>;

export function compelledNextTurnBehaviorEffectsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CompelledNextTurnBehaviorEffect[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.filter(
    (effect): effect is CompelledNextTurnBehaviorEffect =>
      effect.kind === "compelledNextTurnBehavior" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === state.initiative.round,
  );
}

const COMPELLED_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:compelled-drop:held-object-facts",
);

export function executeCompelledDropHeldObjectFactsHole(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "executeCompelledDrop";
    }
  >,
): BattleHeldObjectFactsHole {
  return {
    holeInstanceKey: COMPELLED_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE,
    holeId: executeCompelledDropHeldObjectFactsHoleId(subject),
    kind: "heldObjectFacts",
    label: "Compelled drop held-object facts",
    actorId: subject.actorId,
  };
}

export function executeCompelledDropHeldObjectFactsHoleId(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "executeCompelledDrop";
    }
  >,
): BattleHoleId {
  return holeId(
    `battle:compelled-drop:held-object-facts:${subject.actorId}:${subject.effectRef}`,
  );
}

export function canonicalHeldObjectIdsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleObjectId[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const loadout = characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  );
  return [
    ...(loadout.weapon === undefined ? [] : [loadout.weapon.itemId]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [loadout.offHandWeapon.itemId]),
    ...(loadout.shield === undefined ? [] : [loadout.shield.itemId]),
  ];
}
