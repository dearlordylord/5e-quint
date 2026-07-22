import { Brand, Schema } from "effect";
import { Integer, type Ability } from "@dnd/shared/types";

export type ArmorClass = Integer & Brand.Brand<"ArmorClass">;
const ArmorClass = Brand.all(Integer, Brand.nominal<ArmorClass>());
export const ArmorClassSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("Integer"),
  Schema.brand("ArmorClass"),
);

export function armorClass(value: number): ArmorClass {
  return ArmorClass(Math.max(1, Math.floor(value)));
}

export type ArmorClassDelta = Integer & Brand.Brand<"ArmorClassDelta">;
const ArmorClassDelta = Brand.all(Integer, Brand.nominal<ArmorClassDelta>());

export function armorClassDelta(value: number): ArmorClassDelta {
  return ArmorClassDelta(Math.floor(value));
}

export type AbilityModifier = Integer & Brand.Brand<"AbilityModifier">;
const AbilityModifier = Brand.all(Integer, Brand.nominal<AbilityModifier>());

export function abilityModifier(value: number): AbilityModifier {
  return AbilityModifier(Math.floor(value));
}

export type AbilityModifierBlock = Readonly<Record<Ability, AbilityModifier>>;

export function zeroAbilityModifiers(): AbilityModifierBlock {
  const zero = abilityModifier(0);
  return {
    str: zero,
    dex: zero,
    con: zero,
    int: zero,
    wis: zero,
    cha: zero,
  };
}
