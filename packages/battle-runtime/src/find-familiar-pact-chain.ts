// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import * as Either from "effect/Either";

import type {
  BattleResolutionResult,
  BattleState,
  BattleResolutionInputForSubject,
} from "./battle-reducer.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type {
  StatBlockAttackActionOption,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";
import { combatantCanTakeReactions } from "./battle-reducer/creature-state.ts";
import { snapshotBattle, spendReaction } from "./battle-reducer/dispatcher.ts";
import { invalidResult } from "./battle-reducer/result-helpers.ts";
import { resolveSelectedAttackProcedure } from "./battle-reducer/attack-main.ts";
import {
  openClassFeatureExtraAttackResource,
  spendAttackActionResource,
} from "./battle-reducer/attack-resolution.ts";
import {
  spendStatBlockAttackResources,
  statBlockAttackActionOptions,
} from "./battle-reducer/statblock.ts";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import { findPresentFamiliarById } from "./find-familiar-state.ts";
import type { CombatantId } from "./identity.ts";

export type PactOfTheChainFamiliarAttackSubject = Extract<
  BattleSubject,
  { readonly tag: "pactOfTheChainFamiliarAttack" }
>;

export type PactOfTheChainFamiliarReactionAttackSubjectInput =
  BattleResolutionInputForSubject<PactOfTheChainFamiliarAttackSubject> & {
    readonly replayingInterruptedProcedure?: boolean;
    readonly suppressedReactionTrigger?: Parameters<
      typeof resolveSelectedAttackProcedure
    >[0]["suppressedReactionTrigger"];
    readonly pendingAttackDamageReductions?: Parameters<
      typeof resolveSelectedAttackProcedure
    >[0]["pendingAttackDamageReductions"];
    readonly pendingAttackDamageAdditions?: Parameters<
      typeof resolveSelectedAttackProcedure
    >[0]["pendingAttackDamageAdditions"];
  };

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
    (state, _attackerId, selectedAttack) =>
      spendPactOfTheChainFamiliarReactionAttack({
        state,
        ownerId: input.subject.actorId,
        familiarId: input.subject.familiarId,
        attack: selectedAttack,
      }),
  );
}

export function combatantHasPactOfTheChainFindFamiliar(
  state: BattleState,
  ownerId: CombatantId,
): boolean {
  const owner = state.combatants.get(ownerId);
  return (
    owner?.origin.kind === "character" &&
    owner.origin.spellcasting?.invocationSpellAccesses.some(
      (access) => access.tag === "pactOfTheChainFindFamiliar",
    ) === true
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
    statBlockAttackActionOptions(actor.origin.statBlock).find(
      (attack): attack is StatBlockAttackActionOption =>
        attack.part.section === "actions" &&
        attackActionOptionName(attack) === input.subject.attackName,
    ) ?? null
  );
}

function spendPactOfTheChainFamiliarReactionAttack(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.attack.kind !== "statBlockAttack") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Pact of the Chain familiar attack requires a Stat Block attack.",
    );
  }
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
  const nextState = spendStatBlockAttackResources({
    state: stateWithReactionSpent,
    actorId: input.familiarId,
    attack: input.attack,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
