import type {
  BattleExecutableSpellInvocation,
  BattleInterruptCheckpointInput,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";

export function triggeredArmorDefenseSpellMatchesTrigger(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "triggeredArmorDefense" }
    >
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
