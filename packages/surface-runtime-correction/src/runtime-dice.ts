import { Either } from "effect";
import type { DiceExpr } from "@dnd/surface/surface/types";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr as validateRolledDiceForDiceExprShared,
  type DiceRollValidationError,
} from "@dnd/shared-algebras/runtime-dice-algebra";

import type { RolledDiceGroup } from "#/reducer-types.ts";

export { rolledDiceTotal, type DiceRollValidationError };

export function validateRolledDiceForDiceExpr(
  groups: ReadonlyArray<RolledDiceGroup>,
  expr: DiceExpr,
): Either.Either<void, DiceRollValidationError> {
  const error = validateRolledDiceForDiceExprShared(groups, expr);
  if (error !== null) {
    return Either.left(error);
  }

  return Either.right(undefined);
}
