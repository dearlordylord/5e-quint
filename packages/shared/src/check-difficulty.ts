import { Schema } from "effect";

export const DifficultyClass = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("DifficultyClass"),
);
export type DifficultyClass = typeof DifficultyClass.Type;
export function difficultyClass(n: number): DifficultyClass {
  return DifficultyClass.make(Math.max(1, Math.floor(n)));
}

export const AbilityModifier = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.brand("AbilityModifier"),
);
export type AbilityModifier = typeof AbilityModifier.Type;
export function abilityModifier(n: number): AbilityModifier {
  return AbilityModifier.make(Math.floor(n));
}
