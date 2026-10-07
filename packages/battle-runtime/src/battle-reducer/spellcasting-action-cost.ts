import {
  spendActivationResource,
  type ActionEconomyState,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Match, Result } from "effect";
import type { StatBlockSpellcastingActionCost } from "../stat-block-execution-state.ts";

// Spellcasting group capacity never replaces the turn's action cost. Both
// character and Stat Block invocations spend through the canonical algebra.
export function spendSpellCastAction<T extends ActionEconomyState>(
  resources: T,
  actionCost: StatBlockSpellcastingActionCost,
): Result.Result<T, string> {
  return Match.value(actionCost).pipe(
    Match.when("magicAction", () =>
      spendActivationResource(resources, {
        kind: "action",
        action: "magic",
      }).pipe(
        Result.mapError(
          () => "Magic action is no longer available for the current actor.",
        ),
      ),
    ),
    Match.when("bonusAction", () =>
      spendActivationResource(resources, { kind: "bonusAction" }).pipe(
        Result.mapError(
          () =>
            "Bonus Action spell is no longer available for the current actor.",
        ),
      ),
    ),
    Match.exhaustive,
  );
}
