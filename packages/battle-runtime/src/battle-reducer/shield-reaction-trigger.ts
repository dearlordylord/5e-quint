import type {
  BattleInterruptCheckpointInput,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";
import {
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
} from "./spell-reaction-trigger-shape.ts";

export function shieldReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  const castingTime = topLevelSpellCastingTime(invocation.spell.mechanics);
  if (castingTime?.kind !== "reaction") {
    return false;
  }
  if (frame.trigger === "attackHit") {
    return reactionTriggerIncludesHitByAttackRoll(castingTime);
  }
  const namedSpellTriggerIds = reactionTriggerNamedSpellIds(castingTime);
  return (
    frame.trigger === "spellCast" &&
    namedSpellTriggerIds.includes(frame.spellId) &&
    invocation.negatedSpellIds.includes(frame.spellId)
  );
}
