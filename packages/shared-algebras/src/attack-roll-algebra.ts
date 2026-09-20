import type { AttackRollResult } from "./runtime-hole-algebra.ts";
import { selectedD20TestNaturalD20 } from "./runtime-hole-algebra.ts";

export function attackRollHits(
  roll: AttackRollResult,
  armorClass: number,
): boolean {
  const naturalD20 = selectedD20TestNaturalD20(roll.d20TestRoll);
  if (Number(naturalD20) === 1) {
    return false;
  }

  if (Number(naturalD20) === 20) {
    return true;
  }

  return roll.total >= armorClass;
}

export function attackRollIsCritical(roll: AttackRollResult): boolean {
  return Number(selectedD20TestNaturalD20(roll.d20TestRoll)) === 20;
}

export function attackRollResultIsValid(roll: AttackRollResult): boolean {
  const naturalD20 = selectedD20TestNaturalD20(roll.d20TestRoll);
  return (
    Number.isInteger(roll.total) &&
    Number.isInteger(Number(naturalD20)) &&
    Number(naturalD20) >= 1 &&
    Number(naturalD20) <= 20
  );
}
