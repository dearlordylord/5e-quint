// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type {
  BattleActiveEffect,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
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
import { findFamiliarCompanionEntryForOwner } from "./find-familiar-state.ts";
import type { CombatantId } from "./identity.ts";

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
  const familiarEntry = findFamiliarCompanionEntryForOwner(state, fact.ownerId);
  if (
    familiarEntry?.companion.status !== "present" ||
    familiarEntry.companionId !== fact.familiarId
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
  const deliveryFills = findFamiliarTouchDeliveryFills({
    fills: input.fills,
    ownerId: input.subject.actorId,
    familiarId: connection.familiarId,
    spellId: invocation.spell.id,
  });
  if (deliveryFills.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", deliveryFills.message);
  }
  const cast = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: deliveryFills.fills,
  });
  if (cast.tag === "invalid") {
    return {
      ...cast,
      snapshot: snapshotBattle(input.state),
    };
  }
  if (cast.tag !== "resolved") {
    return cast;
  }
  if (!cast.state.combatants.has(connection.familiarId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery requires the familiar to remain present.",
    );
  }
  if (deliveryFills.targetChoiceCount === 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery currently supports exactly one selected target choice.",
    );
  }
  const stateWithSpentReaction = spendFindFamiliarTouchDeliveryReaction({
    state: cast.state,
    familiarId: connection.familiarId,
  });
  if (stateWithSpentReaction.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      stateWithSpentReaction.message,
    );
  }
  return {
    tag: "resolved",
    state: stateWithSpentReaction.state,
    snapshot: snapshotBattle(stateWithSpentReaction.state),
  };
}

function spendFindFamiliarTouchDeliveryReaction(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const familiar = input.state.combatants.get(input.familiarId);
  if (familiar === undefined) {
    return {
      tag: "invalid",
      message:
        "Find Familiar touch delivery requires the familiar to remain present.",
    };
  }
  return {
    tag: "resolved",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(input.familiarId, {
        ...familiar,
        reactionAvailable: false,
      }),
    },
  };
}

function findFamiliarTouchDeliveryFills(input: {
  readonly fills: BattleResolutionInput["fills"];
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly spellId: string;
}):
  | {
      readonly tag: "resolved";
      readonly fills: BattleResolutionInput["fills"];
      readonly targetChoiceCount: number;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let targetChoiceCount = 0;
  let deliveryTargetFactSeen = false;
  const fills: BattleFill[] = [];
  for (const fill of input.fills) {
    if (
      fill.kind === "spellTargetList" ||
      fill.kind === "spellTargetAllocation"
    ) {
      return {
        tag: "invalid",
        message:
          "Find Familiar touch delivery currently supports single target-choice Touch spells.",
      };
    }
    if (fill.kind !== "targetChoice") {
      fills.push(fill);
      continue;
    }
    targetChoiceCount += 1;
    if (targetChoiceCount > 1) {
      return {
        tag: "invalid",
        message:
          "Find Familiar touch delivery currently supports exactly one target choice.",
      };
    }
    const facts = fill.spatialFacts ?? [];
    const deliveryFact = facts.find((fact) =>
      findFamiliarTouchSpellTargetFactMatches({
        fact,
        ownerId: input.ownerId,
        familiarId: input.familiarId,
        targetId: fill.value,
        spellId: input.spellId,
      }),
    );
    if (deliveryFact === undefined) {
      fills.push(fill);
      continue;
    }
    deliveryTargetFactSeen = true;
    fills.push({
      ...fill,
      spatialFacts: [
        ...facts.filter((fact) => fact.kind !== "findFamiliarTouchSpellTarget"),
        {
          kind: "spellTarget",
          casterId: input.ownerId,
          targetId: fill.value,
          spellId: input.spellId,
        },
      ],
    });
  }
  if (targetChoiceCount === 0) {
    return { tag: "resolved", fills, targetChoiceCount };
  }
  return deliveryTargetFactSeen
    ? { tag: "resolved", fills, targetChoiceCount }
    : {
        tag: "invalid",
        message:
          "Find Familiar touch delivery requires a table fact that the familiar can deliver the Touch spell to the selected target.",
      };
}

function findFamiliarTouchSpellTargetFactMatches(input: {
  readonly fact: BattleTargetSpatialFact;
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly targetId: CombatantId;
  readonly spellId: string;
}): boolean {
  return (
    input.fact.kind === "findFamiliarTouchSpellTarget" &&
    input.fact.ownerId === input.ownerId &&
    input.fact.familiarId === input.familiarId &&
    input.fact.targetId === input.targetId &&
    input.fact.spellId === input.spellId
  );
}

function findFamiliarSharedSensesEffect(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly familiarSenses: readonly CreatureSense[];
}): FindFamiliarSharedSensesEffect {
  return {
    kind: "findFamiliarSharedSenses",
    source: {
      kind: "companionSharedSenses",
      ownerId: input.casterId,
      companionId: input.familiarId,
    },
    sourceCombatantId: input.casterId,
    familiarId: input.familiarId,
    canSeeThroughFamiliar: true,
    canHearThroughFamiliar: true,
    familiarSenses: input.familiarSenses,
    expiresAt: { kind: "startOfTurn", combatantId: input.casterId },
  };
}
