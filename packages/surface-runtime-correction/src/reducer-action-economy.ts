import { Either } from "effect";
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";

import type { State } from "#/reducer-state.ts";
import type { ResolutionInvalid } from "#/reducer-types.ts";

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

export function spendOneAction(
  state: State,
  unavailableReason: string,
): Either.Either<State, ResolutionInvalid> {
  return spendAction(state, "attack").pipe(
    Either.mapLeft(() => invalid(unavailableReason)),
  );
}
