import {
  type BattleState,
  type BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { combatantCanTakeReactions } from "./creature-state-execution.ts";
import {
  combatantHasSpellSlotUseThisTurn,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { spellComponents } from "./spell-cast-interrupt-frame.ts";

type CounterspellInvocation = Extract<
  BattleExecutableSpellInvocation,
  { readonly procedure: "counterspell" }
>;

export type CounterspellCapableReactor = {
  readonly combatantId: CombatantId;
  readonly invocations: readonly CounterspellInvocation[];
};

export function counterspellCapableReactors(
  state: BattleState,
): readonly CounterspellCapableReactor[] {
  return [...state.combatants.values()].flatMap(
    (combatant): readonly CounterspellCapableReactor[] => {
      if (
        combatant.origin.kind !== "character" ||
        !combatantCanTakeReactions(combatant) ||
        combatantHasSpellSlotUseThisTurn(
          state.currentTurnResources,
          combatant.combatantId,
        )
      ) {
        return [];
      }
      const invocations = supportedSpellActs(combatant).flatMap(
        (candidate): readonly CounterspellInvocation[] => {
          if (candidate.procedure !== "counterspell") return [];
          const execution = candidate;
          return spellHasAvailableSpend(combatant, execution) &&
            counterspellInvocationHasSpellCastTrigger(execution)
            ? [execution]
            : [];
        },
      );
      return invocations.length === 0
        ? []
        : [{ combatantId: combatant.combatantId, invocations }];
    },
  );
}

export function spellCastCanTriggerCounterspell(input: {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly reactors: readonly CounterspellCapableReactor[];
}): boolean {
  const triggeringComponents = spellComponents(input.invocation);
  return (
    triggeringComponents.length > 0 &&
    input.reactors.some(
      (reactor) =>
        reactor.combatantId !== input.casterId &&
        reactor.invocations.some((counterspell) => {
          return triggeringComponents.some((component) =>
            counterspell.triggerComponents.includes(component),
          );
        }),
    )
  );
}

function counterspellInvocationHasSpellCastTrigger(
  invocation: CounterspellInvocation,
): boolean {
  return invocation.triggerComponents.length > 0;
}
