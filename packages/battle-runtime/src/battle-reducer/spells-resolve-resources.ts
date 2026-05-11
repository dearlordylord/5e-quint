// Spell cast resource spending and concentration setup shared by spell
// resolution modules. Extracted from spells-resolve.ts to keep procedure
// resolver modules from depending on the monolithic spell dispatcher.

import {
spendAction,
spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Either } from "effect";
import type {
BattleResolutionResult,
BattleState,
SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
breakBattleConcentration,
} from "./damage-apply.ts";
import { snapshotBattle } from "./dispatcher.ts";
import { invalidResult } from "./result-helpers.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
markSpellSlotExpendedThisTurn,
} from "./spells-profiles.ts";
import {
clearPendingAttackRollMissToHitReplacementSelection,
} from "./statblock-attacks.ts";

export function spendSpellCastResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const actionCost =
    "actionCost" in input.invocation
      ? input.invocation.actionCost
      : "magicAction";
  const spent =
    actionCost === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      actionCost === "bonusAction"
        ? "Bonus Action spell is no longer available for the current actor."
        : "Magic action is no longer available for the current actor.",
    );
  }
  if (input.invocation.resource.tag === "none") {
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(input.state, input.actorId)
      : input.state;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        spent.right,
        input.actorId,
      ),
    };
    const nextState = spellRequiresConcentration(input.invocation)
      ? startSpellEffectConcentration(
          resourced,
          input.actorId,
          input.invocation,
        )
      : resourced;
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.state, input.actorId)
    : input.state;
  const slotted = expendSpellSlot(
    afterPriorConcentration,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      slotTurnResources.right,
      input.actorId,
    ),
  };
  const nextState = spellRequiresConcentration(input.invocation)
    ? startSpellEffectConcentration(resourced, input.actorId, input.invocation)
    : resourced;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function spellRequiresConcentration(
  invocation: SupportedSpellInvocation,
): boolean {
  return invocation.spell.mechanics.duration.kind === "concentration";
}

export function startSpellEffectConcentration(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      concentration: {
        sourceSpellId: invocation.spell.id,
        effectKind: "spellEffect",
      },
    }),
  };
}
