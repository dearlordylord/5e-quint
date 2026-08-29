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

type SpellCastInterruptionInvocation = Extract<
  BattleExecutableSpellInvocation,
  { readonly procedure: "spellCastInterruptionReaction" }
>;

export type SpellCastInterruptionCapableReactor = {
  readonly combatantId: CombatantId;
  readonly invocations: readonly SpellCastInterruptionInvocation[];
};

export function spellCastInterruptionReactionCapableReactors(
  state: BattleState,
): readonly SpellCastInterruptionCapableReactor[] {
  return [...state.combatants.values()].flatMap(
    (combatant): readonly SpellCastInterruptionCapableReactor[] => {
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
      const invocations = supportedSpellActs(state, combatant).flatMap(
        (candidate): readonly SpellCastInterruptionInvocation[] => {
          if (candidate.procedure !== "spellCastInterruptionReaction")
            return [];
          const execution = candidate;
          return spellHasAvailableSpend(combatant, execution) &&
            spellCastInterruptionReactionInvocationHasSpellCastTrigger(
              execution,
            )
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

export function spellCastCanTriggerSpellCastInterruption(input: {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly reactors: readonly SpellCastInterruptionCapableReactor[];
}): boolean {
  const triggeringComponents = spellComponents(input.invocation);
  return (
    triggeringComponents.length > 0 &&
    input.reactors.some(
      (reactor) =>
        reactor.combatantId !== input.casterId &&
        reactor.invocations.some((spellCastInterruptionReaction) => {
          return triggeringComponents.some((component) =>
            spellCastInterruptionReaction.triggerComponents.includes(component),
          );
        }),
    )
  );
}

function spellCastInterruptionReactionInvocationHasSpellCastTrigger(
  invocation: SpellCastInterruptionInvocation,
): boolean {
  return invocation.triggerComponents.length > 0;
}
