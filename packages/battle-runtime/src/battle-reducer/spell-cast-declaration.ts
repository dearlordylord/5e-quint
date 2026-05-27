import type {
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { revealHidden } from "./hole-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { spellRequiresVerbal } from "./spells-discovery.ts";

export function stateAfterSpellCastDeclared(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): BattleState {
  const earlyEnded = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.casterId,
  );
  return spellRequiresVerbal(input.invocation.spell)
    ? revealHidden(earlyEnded, input.casterId)
    : earlyEnded;
}
