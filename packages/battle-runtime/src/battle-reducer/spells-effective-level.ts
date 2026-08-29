import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import type {
  LeveledSpellInvocationResource,
  NoSpellInvocationResource,
} from "../procedure-execution/spell-invocation-vocabulary.ts";
import { Match } from "effect";
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
  return spellInvocationCastLevel(invocation);
}

export function spellInvocationCastLevel(
  invocation: RuntimeSpellProcedureExecution,
): BattleSpellEffectLevel {
  if (invocation.procedure === "spawnedCompanionLifecycle") {
    return requireBattleSpellEffectLevel(invocation.casting.nonRitualSlotLevel);
  }
  const resource: NoSpellInvocationResource | LeveledSpellInvocationResource =
    invocation.resource;
  return requireBattleSpellEffectLevel(
    Match.value(resource).pipe(
      Match.when({ tag: "spellSlot" }, ({ slotLevel }) => Number(slotLevel)),
      Match.when({ tag: "spellAccessFreeCast" }, ({ castLevel }) =>
        Number(castLevel),
      ),
      Match.when({ tag: "none" }, () => invocation.spellRuleFacts.level),
      Match.exhaustive,
    ),
  );
}
