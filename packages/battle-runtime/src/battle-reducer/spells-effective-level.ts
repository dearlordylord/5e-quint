import { Schema } from "effect";
import type { SupportedSpellInvocation } from "../battle-reducer.ts";

const BATTLE_SPELL_EFFECT_LEVEL_MIN = 0;
const BATTLE_SPELL_EFFECT_LEVEL_MAX = 9;

export const BattleSpellEffectLevel = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(BATTLE_SPELL_EFFECT_LEVEL_MIN),
  Schema.lessThanOrEqualTo(BATTLE_SPELL_EFFECT_LEVEL_MAX),
  Schema.brand("BattleSpellEffectLevel"),
);
export type BattleSpellEffectLevel = typeof BattleSpellEffectLevel.Type;

export function parseBattleSpellEffectLevel(
  value: number,
): BattleSpellEffectLevel | null {
  return Number.isInteger(value) &&
    value >= BATTLE_SPELL_EFFECT_LEVEL_MIN &&
    value <= BATTLE_SPELL_EFFECT_LEVEL_MAX
    ? // Brands are erased at runtime; the predicate above enforces the schema range.
      (value as BattleSpellEffectLevel)
    : null;
}

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
  invocation: SupportedSpellInvocation,
): BattleSpellEffectLevel {
  return requireBattleSpellEffectLevel(
    invocation.resource.tag === "spellSlot"
      ? Number(invocation.resource.slotLevel)
      : invocation.spell.mechanics.level,
  );
}
