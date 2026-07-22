import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "../procedure-execution/spell-effect-level.ts";
export {
  BattleSpellEffectLevel,
  parseBattleSpellEffectLevel,
} from "../procedure-execution/spell-effect-level.ts";

// Supported invocations carry either a branded Spell Slot level or a
// schema-parsed spell level, so this asserts an internal invariant.
function requireBattleSpellEffectLevel(value: number): BattleSpellEffectLevel {
  const parsed = parseBattleSpellEffectLevel(value);
  if (parsed === null) {
    throw new Error(`Invalid spell effect level: ${value}.`);
  }
  return parsed;
}

export function spellInvocationEffectiveSpellLevel(
  invocation: RuntimeSpellProcedureExecution,
): BattleSpellEffectLevel {
  return requireBattleSpellEffectLevel(
    invocation.resource.tag === "spellSlot"
      ? Number(invocation.resource.slotLevel)
      : invocation.spellRuleFacts.level,
  );
}
