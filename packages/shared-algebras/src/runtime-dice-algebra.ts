import type { DiceExpr } from "@dnd/surface/surface/types";
import type { RolledDiceGroup } from "./runtime-hole-algebra.ts";

export type DiceRollValidationError = {
  readonly reason: string;
};

export function rolledDiceTotal(
  groups: ReadonlyArray<RolledDiceGroup>,
): number {
  return groups.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, result) => groupTotal + Number(result),
        0,
      ),
    0,
  );
}

function rolledDiceCount(groups: ReadonlyArray<RolledDiceGroup>): number {
  return groups.reduce((total, group) => total + group.results.length, 0);
}

export function validateRolledDiceForDiceExpr(
  groups: ReadonlyArray<RolledDiceGroup>,
  expr: DiceExpr,
): DiceRollValidationError | null {
  if (rolledDiceCount(groups) !== expr.dice) {
    return {
      reason: "filled dice count does not match current phase",
    };
  }

  const invalidRoll = groups
    .flatMap((group) => group.results)
    .find(
      (result) =>
        !Number.isInteger(Number(result)) ||
        Number(result) < 1 ||
        Number(result) > expr.dieSize,
    );
  if (invalidRoll !== undefined) {
    return {
      reason: `filled die roll ${Number(invalidRoll)} is outside d${expr.dieSize}`,
    };
  }

  return null;
}
