import type {
  BattleReactionFrameInput,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
} from "./spell-reaction-trigger-shape.ts";

export function shieldReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  const castingTime = invocation.spell.mechanics.castingTime;
  if (castingTime.kind !== "reaction") {
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
