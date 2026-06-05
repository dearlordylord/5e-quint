import {
  activeOngoingFeaturesPreventSpellcasting,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { combatantCanTakeReactions } from "./creature-state.ts";
import {
  combatantHasSpellSlotUseThisTurn,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import {
  supportedSpellActs,
} from "./spells-profiles.ts";
import { spellComponents } from "./spell-cast-interrupt-frame.ts";

type CounterspellInvocation = Extract<
  SupportedSpellInvocation,
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
        activeOngoingFeaturesPreventSpellcasting(combatant) ||
        combatantHasSpellSlotUseThisTurn(
          state.currentTurnResources,
          combatant.combatantId,
        )
      ) {
        return [];
      }
      const invocations = supportedSpellActs(combatant, state).filter(
        (candidate): candidate is CounterspellInvocation =>
          candidate.procedure === "counterspell" &&
          spellHasAvailableSpend(combatant, candidate) &&
          counterspellInvocationHasSpellCastTrigger(candidate),
      );
      return invocations.length === 0
        ? []
        : [{ combatantId: combatant.combatantId, invocations }];
    },
  );
}

export function spellCastCanTriggerCounterspell(input: {
  readonly casterId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly reactors: readonly CounterspellCapableReactor[];
}): boolean {
  const triggeringComponents = spellComponents(input.invocation);
  return (
    triggeringComponents.length > 0 &&
    input.reactors.some(
      (reactor) =>
        reactor.combatantId !== input.casterId &&
        reactor.invocations.some((counterspell) => {
          const castingTime = counterspell.spell.mechanics.castingTime;
          if (castingTime.kind !== "reaction") return false;
          const trigger = castingTime.trigger;
          return (
            trigger.kind === "creature_casts_spell" &&
            triggeringComponents.some((component) =>
              trigger.components.includes(component),
            )
          );
        }),
    )
  );
}

function counterspellInvocationHasSpellCastTrigger(
  invocation: CounterspellInvocation,
): boolean {
  const castingTime = invocation.spell.mechanics.castingTime;
  return (
    invocation.spell.mechanics.family === "triggered_reaction" &&
    castingTime.kind === "reaction" &&
    castingTime.trigger.kind === "creature_casts_spell" &&
    castingTime.trigger.components.length > 0
  );
}
