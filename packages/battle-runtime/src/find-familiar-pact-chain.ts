// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import * as Either from "effect/Either";

import type {
  BattleInterruptRouteOptions,
  BattleResolutionResult,
  BattleState,
  BattleResolutionInputForSubject,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  boundAttackExecutionSelectionMatchesOption,
  type StatBlockAttackActionOption,
} from "./battle-action-options.ts";
import { combatantCanTakeReactions } from "./battle-reducer/creature-state-execution.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { spendReaction } from "./battle-reducer/interrupt-execution.ts";
import { invalidResult } from "./battle-reducer/result-helpers.ts";
import { resolveSelectedAttackProcedure } from "./battle-reducer/attack-main.ts";
import {
  openClassFeatureExtraAttackResource,
  spendAttackActionResource,
} from "./battle-reducer/attack-resolution.ts";
import {
  spendStatBlockAttackResources,
  statBlockAttackActionOptions,
  statBlockAttackProcedureSection,
} from "./battle-reducer/statblock.ts";
import { findPresentFamiliarById } from "./find-familiar-state.ts";
import type { CombatantId } from "./identity.ts";
import { combatantHasPactOfTheChainFindFamiliar } from "./find-familiar-pact-facts.ts";
import {
  ammunitionForAttackIsAvailable,
  spendAmmunitionForAcceptedAttack,
} from "./battle-ammunition.ts";
export { combatantHasPactOfTheChainFindFamiliar } from "./find-familiar-pact-facts.ts";

export type PactOfTheChainFamiliarAttackSubject = Extract<
  BattleSubject,
  { readonly tag: "pactOfTheChainFamiliarAttack" }
>;

export type PactOfTheChainFamiliarReactionAttackSubjectInput =
  BattleResolutionInputForSubject<PactOfTheChainFamiliarAttackSubject> &
    BattleInterruptRouteOptions;

export function resolvePactOfTheChainFamiliarReactionAttack(
  input: PactOfTheChainFamiliarReactionAttackSubjectInput,
): BattleResolutionResult {
  if (
    !combatantHasPactOfTheChainFindFamiliar(input.state, input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Pact of the Chain familiar attack requires selected Pact of the Chain Find Familiar access.",
    );
  }
  const familiar = findPresentFamiliarById(
    input.state,
    input.subject.familiarId,
  );
  if (familiar === null || familiar.ownerId !== input.subject.actorId) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Pact of the Chain familiar attack requires a present familiar owned by the attacker.",
    );
  }
  if (
    !combatantCanTakeReactions(
      input.state.combatants.get(input.subject.familiarId),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Pact of the Chain familiar attack requires the familiar's Reaction.",
    );
  }

  const attack = pactFamiliarAttackActionOptionForInput(input);
  if (attack === null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Pact of the Chain familiar attack requires a supported familiar action attack.",
    );
  }

  return resolveSelectedAttackProcedure(
    input,
    attack,
    (state, _attackerId, selectedAttack, timing) =>
      spendPactOfTheChainFamiliarReactionAttack({
        state,
        ownerId: input.subject.actorId,
        familiarId: input.subject.familiarId,
        attack: selectedAttack,
        timing,
      }),
  );
}

function pactFamiliarAttackActionOptionForInput(
  input: PactOfTheChainFamiliarReactionAttackSubjectInput,
): StatBlockAttackActionOption | null {
  const actor = input.state.combatants.get(input.subject.familiarId);
  if (actor?.origin.kind !== "statBlock") {
    return null;
  }
  return (
    statBlockAttackActionOptions(actor.origin.execution).find(
      (attack): attack is StatBlockAttackActionOption =>
        ammunitionForAttackIsAvailable(actor, attack) &&
        statBlockAttackProcedureSection(
          input.state,
          input.subject.familiarId,
          attack.procedureRef,
        ) === "actions" &&
        attack.procedureRef === input.subject.procedureRef &&
        boundAttackExecutionSelectionMatchesOption(
          {
            procedureRef: input.subject.procedureRef,
            statBlockDamageSelection: input.subject.statBlockDamageSelection,
          },
          attack,
        ),
    ) ?? null
  );
}

function spendPactOfTheChainFamiliarReactionAttack(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly attack: StatBlockAttackActionOption;
  readonly timing: {
    readonly kind: "acceptedAttack" | "attackPreventedBeforeRoll";
  };
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const familiar = input.state.combatants.get(input.familiarId);
  if (!combatantCanTakeReactions(familiar)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Pact of the Chain familiar attack requires the familiar's Reaction.",
    );
  }
  const spentOwnerAttack = spendAttackActionResource(
    input.state.currentTurnResources,
  );
  if (Either.isLeft(spentOwnerAttack)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Pact of the Chain familiar attack requires one available owner Attack-action attack.",
    );
  }

  const stateWithSpentOwnerAttack = {
    ...input.state,
    currentTurnResources: spentOwnerAttack.right.state,
  };
  const stateWithOwnerExtraAttackOpened = {
    ...stateWithSpentOwnerAttack,
    currentTurnResources: openClassFeatureExtraAttackResource({
      state: stateWithSpentOwnerAttack,
      actorId: input.ownerId,
      spentResource: spentOwnerAttack.right.spentResource,
    }),
  };
  const stateWithReactionSpent = spendReaction(
    stateWithOwnerExtraAttackOpened,
    input.familiarId,
  );
  const stateWithAttackResourcesSpent = spendStatBlockAttackResources({
    state: stateWithReactionSpent,
    actorId: input.familiarId,
    attack: input.attack,
  });
  const nextState =
    input.timing.kind === "acceptedAttack"
      ? spendAmmunitionForAcceptedAttack({
          state: stateWithAttackResourcesSpent,
          actorId: input.familiarId,
          attack: input.attack,
        })
      : stateWithAttackResourcesSpent;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
