import { Schema } from "effect";

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
