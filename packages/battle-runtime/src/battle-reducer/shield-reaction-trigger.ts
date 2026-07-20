import type {
  BattleExecutableSpellInvocation,
  BattleInterruptCheckpointInput,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";

export function shieldReactionSpellMatchesTrigger(
  invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "shieldReaction" }>
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  if (frame.trigger === "attackHit") {
    return true;
  }
  return (
    frame.trigger === "spellCast" &&
    frame.spellProcedure === "repeatedDamageAllocation" &&
    invocation.negatesRepeatedDamageAllocation
  );
}
