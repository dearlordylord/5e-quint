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
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { snapshotBattle } from "./dispatcher.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import { markSpellSlotExpendedThisTurn } from "./spells-profiles.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";

export type SpellCastResourceSpendResult =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export function spendSpellCastResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
  readonly startConcentration?: boolean;
  readonly skipTargetActionSpellCastEarlyEnd?: boolean;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spellCastState =
    input.skipTargetActionSpellCastEarlyEnd === true
      ? input.state
      : battleStateAfterTargetActionEarlyEndForActor(
          input.state,
          input.actorId,
        );
  const actionCost =
    "actionCost" in input.invocation
      ? input.invocation.actionCost
      : "magicAction";
  const spent =
    actionCost === "bonusAction"
      ? spendActivationResource(spellCastState.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(spellCastState.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      actionCost === "bonusAction"
        ? "Bonus Action spell is no longer available for the current actor."
        : "Magic action is no longer available for the current actor.",
    );
  }
  const shouldStartConcentration =
    input.startConcentration ?? spellRequiresConcentration(input.invocation);
  if (input.invocation.resource.tag === "none") {
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(spellCastState, input.actorId)
      : spellCastState;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        spent.right,
        input.actorId,
      ),
    };
    const nextState = shouldStartConcentration
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
  if (input.invocation.resource.tag === "classFeatureFreeCast") {
    return invalidResult(
      input.errorState,
      "unsupportedSubject",
      "Class feature free spell casts require procedure-specific resource spending.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spent.right,
    input.actorId,
  );
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(spellCastState, input.actorId)
    : spellCastState;
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
  const nextState = shouldStartConcentration
    ? startSpellEffectConcentration(resourced, input.actorId, input.invocation)
    : resourced;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function spendClassFeatureFreeCastResource(
  state: BattleState,
  actorId: CombatantId,
  resourceUnitId: string,
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    state,
    actorId,
  );
  const actor = spellCastState.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return invalidResult(
      errorState,
      "staleSubject",
      "Class feature free spell cast is no longer available for the current actor.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.unit.id === resourceUnitId &&
      resourceHasUsesRemaining(candidate),
  );
  if (resource === undefined) {
    return invalidResult(
      errorState,
      "staleSubject",
      "Class feature free spell cast is no longer available for the current actor.",
    );
  }
  return {
    tag: "resolved",
    state: {
      ...spellCastState,
      combatants: new Map(spellCastState.combatants).set(actorId, {
        ...actor,
        origin: {
          ...actor.origin,
          resources: actor.origin.resources.map((candidate) =>
            candidate.unit.id === resourceUnitId
              ? spendCharacterResourceUse(candidate)
              : candidate,
          ),
        },
      }),
    },
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
