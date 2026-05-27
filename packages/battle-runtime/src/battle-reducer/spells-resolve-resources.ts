// Spell cast resource spending and concentration setup shared by spell
// resolution modules. Extracted from spells-resolve.ts to keep procedure
// resolver modules from depending on the monolithic spell dispatcher.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Either } from "effect";
import type {
  BattleResolutionResult,
  BattleState,
  BattleTurnResources,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleMetamagicOptionFact,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { snapshotBattle } from "./dispatcher.ts";
import {
  metamagicApplicationsIncludeQuickened,
  spendSpellMetamagicSorceryPoints,
} from "./metamagic.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  markInvocationLevelOnePlusSpellCastThisTurn,
  markQuickenedLevelOnePlusSpellCastThisTurn,
  markSpellSlotExpendedThisTurn,
  spellInvocationIsLevelOnePlus,
} from "./spell-turn-resources.ts";
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
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const metamagicApplications = input.metamagicApplications ?? [];
  const spellCastState =
    input.skipTargetActionSpellCastEarlyEnd === true
      ? input.state
      : battleStateAfterTargetActionEarlyEndForActor(
          input.state,
          input.actorId,
        );
  const actionCost =
    input.actionCostOverride ??
    ("actionCost" in input.invocation
      ? input.invocation.actionCost
      : "magicAction");
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
        markQuickenedLevelOnePlusSpellCastForApplications(
          markInvocationLevelOnePlusSpellCastThisTurn(
            spent.right,
            input.actorId,
            input.invocation,
          ),
          input.actorId,
          input.invocation,
          metamagicApplications,
        ),
        input.actorId,
      ),
    };
    const metamagicSpend = spendSpellMetamagicSorceryPoints({
      state: resourced,
      actorId: input.actorId,
      applications: metamagicApplications,
    });
    if (Either.isLeft(metamagicSpend)) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        metamagicSpend.left,
      );
    }
    const nextState = shouldStartConcentration
      ? startSpellEffectConcentration(
          metamagicSpend.right,
          input.actorId,
          input.invocation,
        )
      : metamagicSpend.right;
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
      markQuickenedLevelOnePlusSpellCastForApplications(
        slotTurnResources.right,
        input.actorId,
        input.invocation,
        metamagicApplications,
      ),
      input.actorId,
    ),
  };
  const metamagicSpend = spendSpellMetamagicSorceryPoints({
    state: resourced,
    actorId: input.actorId,
    applications: metamagicApplications,
  });
  if (Either.isLeft(metamagicSpend)) {
    return invalidResult(input.errorState, "staleSubject", metamagicSpend.left);
  }
  const nextState = shouldStartConcentration
    ? startSpellEffectConcentration(
        metamagicSpend.right,
        input.actorId,
        input.invocation,
      )
    : metamagicSpend.right;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function markQuickenedLevelOnePlusSpellCastForApplications(
  resources: BattleTurnResources,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
  applications: readonly CharacterBattleMetamagicOptionFact[],
): BattleTurnResources {
  return spellInvocationIsLevelOnePlus(invocation) &&
    metamagicApplicationsIncludeQuickened(applications)
    ? markQuickenedLevelOnePlusSpellCastThisTurn(resources, actorId)
    : resources;
}

export function spendClassFeatureFreeCastResource(
  state: BattleState,
  actorId: CombatantId,
  resourceUnitId: string,
  invocation: SupportedSpellInvocation,
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
            candidate.unit.id === resourceUnitId &&
            resourceHasUsesRemaining(candidate)
              ? spendCharacterResourceUse(candidate)
              : candidate,
          ),
        },
      }),
      currentTurnResources: markInvocationLevelOnePlusSpellCastThisTurn(
        spellCastState.currentTurnResources,
        actorId,
        invocation,
      ),
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
