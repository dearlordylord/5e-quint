// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type {
  BattleActiveEffect,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "./battle-reducer.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { combatantCanTakeReactions } from "./battle-reducer/creature-state.ts";
import {
  resolveBattleSubject,
  snapshotBattle,
} from "./battle-reducer/dispatcher.ts";
import { invalidResult } from "./battle-reducer/result-helpers.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { spellInvocationIsSpellcasting } from "./battle-reducer/spells-discovery.ts";
import { supportedSpellInvocationMatchesRef } from "./battle-reducer/spells-invocation-ref.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { CombatantId } from "./identity.ts";

const FIND_FAMILIAR_SPELL_ID = "find_familiar";
export const FIND_FAMILIAR_TELEPATHY_RANGE_FEET = movementFeet(100);

export type FindFamiliarWithin100FeetFact = {
  readonly kind: "findFamiliarWithin100FeetOfOwner";
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
};

export type FindFamiliarTelepathicConnection = {
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly rangeFeet: MovementFeet;
  readonly sharedLanguageRequired: false;
};

export type FindFamiliarSharedSensesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "findFamiliarSharedSenses" }
>;

export function findFamiliarTelepathicConnection(
  state: BattleState,
  fact: FindFamiliarWithin100FeetFact,
): FindFamiliarTelepathicConnection | null {
  const familiar = state.findFamiliars.get(fact.ownerId);
  if (
    familiar?.status !== "present" ||
    familiar.familiarId !== fact.familiarId
  ) {
    return null;
  }
  return {
    ownerId: fact.ownerId,
    familiarId: fact.familiarId,
    rangeFeet: FIND_FAMILIAR_TELEPATHY_RANGE_FEET,
    sharedLanguageRequired: false,
  };
}

export function shareFindFamiliarSenses(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly fact: FindFamiliarWithin100FeetFact;
}): BattleResolutionResult {
  const connection = findFamiliarTelepathicConnection(input.state, input.fact);
  if (connection === null || connection.ownerId !== input.casterId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar shared senses require a present familiar within 100 feet of its caster.",
    );
  }
  if (currentActorId(input.state) !== input.casterId) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Find Familiar shared senses are available only on the caster's turn.",
    );
  }
  const caster = input.state.combatants.get(input.casterId);
  const familiar = input.state.combatants.get(connection.familiarId);
  if (caster === undefined || familiar === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Find Familiar shared senses require caster and familiar combatants.",
    );
  }
  if (familiar.origin.kind !== "statBlock") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar shared senses require a familiar Stat Block.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Find Familiar shared senses require an available Bonus Action.",
    );
  }
  const effect = findFamiliarSharedSensesEffect({
    casterId: input.casterId,
    familiarId: connection.familiarId,
    familiarSenses: familiar.origin.statBlock.statBlock.senses ?? [],
  });
  const nextCaster = {
    ...caster,
    activeEffects: [
      ...caster.activeEffects.filter(
        (candidate) => candidate.kind !== "findFamiliarSharedSenses",
      ),
      effect,
    ],
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.casterId, nextCaster),
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function deliverTouchSpellThroughFindFamiliar(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
  readonly fills: BattleResolutionInput["fills"];
  readonly fact: FindFamiliarWithin100FeetFact;
}): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor, input.state).find((candidate) =>
          supportedSpellInvocationMatchesRef(
            candidate,
            input.subject.invocation,
          ),
        )
      : undefined;
  if (
    actor?.origin.kind !== "character" ||
    invocation === undefined ||
    !spellInvocationIsSpellcasting(invocation)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Find Familiar touch delivery requires a supported spell invocation.",
    );
  }
  if (invocation.spell.mechanics.range.kind !== "touch") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar can deliver only spells with a range of Touch.",
    );
  }
  const connection = findFamiliarTelepathicConnection(input.state, input.fact);
  if (connection === null || connection.ownerId !== input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery requires a present familiar within 100 feet of its caster.",
    );
  }
  const familiar = input.state.combatants.get(connection.familiarId);
  if (!combatantCanTakeReactions(familiar)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Find Familiar touch delivery requires the familiar's available Reaction.",
    );
  }

  const cast = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: input.fills,
  });
  if (cast.tag !== "resolved") {
    return cast;
  }
  const nextFamiliar = cast.state.combatants.get(connection.familiarId);
  if (nextFamiliar === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery requires the familiar to remain present.",
    );
  }
  const nextState = {
    ...cast.state,
    combatants: new Map(cast.state.combatants).set(connection.familiarId, {
      ...nextFamiliar,
      reactionAvailable: false,
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function findFamiliarSharedSensesEffect(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly familiarSenses: readonly CreatureSense[];
}): FindFamiliarSharedSensesEffect {
  return {
    kind: "findFamiliarSharedSenses",
    sourceSpellId: FIND_FAMILIAR_SPELL_ID,
    sourceCombatantId: input.casterId,
    familiarId: input.familiarId,
    canSeeThroughFamiliar: true,
    canHearThroughFamiliar: true,
    familiarSenses: input.familiarSenses,
    expiresAt: { kind: "startOfTurn", combatantId: input.casterId },
  };
}
