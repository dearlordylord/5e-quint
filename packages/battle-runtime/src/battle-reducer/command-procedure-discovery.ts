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

export type CommandPendingEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "commandPending" }
>;

export function commandPendingEffectsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CommandPendingEffect[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.filter(
    (effect): effect is CommandPendingEffect =>
      effect.kind === "commandPending" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === state.initiative.round,
  );
}

const COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:command-drop:held-object-facts",
);

export function commandDropHeldObjectFactsHole(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHeldObjectFactsHole {
  return {
    holeInstanceKey: COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE,
    holeId: commandDropHeldObjectFactsHoleId(subject),
    kind: "heldObjectFacts",
    label: "Command Drop held-object facts",
    actorId: subject.actorId,
  };
}

export function commandDropHeldObjectFactsHoleId(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHoleId {
  return holeId(
    `battle:command-drop:held-object-facts:${subject.actorId}:${subject.effectRef}`,
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
