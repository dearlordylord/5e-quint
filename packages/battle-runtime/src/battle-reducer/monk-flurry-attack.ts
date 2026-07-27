import type {
  AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { resolveSelectedAttackProcedure } from "./attack-main.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  flurryOfBlowsUnarmedStrikeForActor,
  spendMonkFocusFlurryOfBlowsActionResource,
  stateHasMonkFocusFlurryOfBlowsActionResource,
} from "./monk-focus.ts";

export function resolveMonkFocusFlurryOfBlowsStrike(
  input: AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
): BattleResolutionResult {
  if (
    !combatantCanTakeActions(input.state.combatants.get(input.subject.actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows is no longer available for this actor.",
    );
  }
  if (
    !stateHasMonkFocusFlurryOfBlowsActionResource(
      input.state,
      input.subject.actorId,
      input.subject.focusProcedureRef,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows Unarmed Strike is no longer available.",
    );
  }
  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    input.state,
    input.subject.actorId,
  );
  if (
    unarmedStrike === undefined ||
    unarmedStrike.procedureRef !== input.subject.procedureRef
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Flurry of Blows requires the actor's Unarmed Strike.",
    );
  }
  return resolveSelectedAttackProcedure(
    input,
    unarmedStrike,
    (state, actorId, attack) =>
      spendMonkFocusFlurryOfBlowsActionResource(
        state,
        actorId,
        attack,
        input.subject.focusProcedureRef,
      ),
  );
}
