import type {
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { revealHidden } from "./hole-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";

export function stateAfterSpellCastDeclared(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
}): BattleState {
  const earlyEnded = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.casterId,
  );
  return input.invocation.spellRuleFacts.components.verbal
    ? revealHidden(earlyEnded, input.casterId)
    : earlyEnded;
}
