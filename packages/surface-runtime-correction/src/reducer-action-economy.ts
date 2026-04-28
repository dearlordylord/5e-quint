import { Either } from "effect";

import type { State } from "#/reducer-state.ts";
import type { ResolutionInvalid } from "#/reducer-types.ts";

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

export function spendOneAction(
  state: State,
  unavailableReason: string,
): Either.Either<State, ResolutionInvalid> {
  if (state.currentActionsAvailable === 0) {
    return Either.left(invalid(unavailableReason));
  }

  return Either.right({
    ...state,
    currentActionsAvailable: state.currentActionsAvailable === 1 ? 0 : 1,
  });
}
