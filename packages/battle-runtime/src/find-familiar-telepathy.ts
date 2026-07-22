// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type {
  BattleActiveEffect,
  BattleFill,
  BattleInvalidReasonCode,
  BattleResolutionInput,
  BattleState,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { combatantCanTakeReactions } from "./battle-reducer/creature-state.ts";
import { spellInvocationIsSpellcasting } from "./battle-reducer/spell-turn-resources.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { findFamiliarCompanionEntryForOwner } from "./find-familiar-state.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "./identity.ts";

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

export type FindFamiliarMechanicalTransition =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
    };

function invalidTransition(
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<FindFamiliarMechanicalTransition, { readonly tag: "invalid" }> {
  return { tag: "invalid", reason, message };
}

export function findFamiliarTelepathicConnection(
  state: BattleState,
  fact: FindFamiliarWithin100FeetFact,
): FindFamiliarTelepathicConnection | null {
  const familiarEntry = findFamiliarCompanionEntryForOwner(state, fact.ownerId);
  if (
    familiarEntry?.companion.status !== "present" ||
    familiarEntry.companion.combatantId !== fact.familiarId
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
}): FindFamiliarMechanicalTransition {
  const connection = findFamiliarTelepathicConnection(input.state, input.fact);
  if (connection === null || connection.ownerId !== input.casterId) {
    return invalidTransition(
      "invalidFill",
      "Find Familiar shared senses require a present familiar within 100 feet of its caster.",
    );
  }
  if (currentActorId(input.state) !== input.casterId) {
    return invalidTransition(
      "staleSubject",
      "Find Familiar shared senses are available only on the caster's turn.",
    );
  }
  const caster = input.state.combatants.get(input.casterId);
  const familiar = input.state.combatants.get(connection.familiarId);
  if (caster === undefined || familiar === undefined) {
    return invalidTransition(
      "missingCombatant",
      "Find Familiar shared senses require caster and familiar combatants.",
    );
  }
  if (familiar.origin.kind !== "statBlock") {
    return invalidTransition(
      "invalidFill",
      "Find Familiar shared senses require a familiar Stat Block.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidTransition(
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
  };
}

export type PreparedFindFamiliarTouchSpellDelivery = {
  readonly tag: "prepared";
  readonly fills: BattleResolutionInput["fills"];
  readonly familiarId: CombatantId;
  readonly targetChoiceCount: number;
};

export function prepareTouchSpellDeliveryThroughFindFamiliar(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
  readonly fills: BattleResolutionInput["fills"];
  readonly fact: FindFamiliarWithin100FeetFact;
}):
  | PreparedFindFamiliarTouchSpellDelivery
  | Exclude<FindFamiliarMechanicalTransition, { readonly tag: "resolved" }> {
  const actor = input.state.combatants.get(input.subject.actorId);
  const procedure =
    actor?.origin.kind === "character"
      ? characterSpellProcedure(
          actor.origin.execution,
          input.subject.procedureRef,
          actor,
        )
      : undefined;
  if (
    actor?.origin.kind !== "character" ||
    procedure === undefined ||
    !spellInvocationIsSpellcasting(procedure)
  ) {
    return invalidTransition(
      "unsupportedActOption",
      "Find Familiar touch delivery requires a supported spell invocation.",
    );
  }
  if (procedure.spellRuleFacts.range.kind !== "touch") {
    return invalidTransition(
      "invalidFill",
      "Find Familiar can deliver only spells with a range of Touch.",
    );
  }
  const connection = findFamiliarTelepathicConnection(input.state, input.fact);
  if (connection === null || connection.ownerId !== input.subject.actorId) {
    return invalidTransition(
      "invalidFill",
      "Find Familiar touch delivery requires a present familiar within 100 feet of its caster.",
    );
  }
  const familiar = input.state.combatants.get(connection.familiarId);
  if (!combatantCanTakeReactions(familiar)) {
    return invalidTransition(
      "staleSubject",
      "Find Familiar touch delivery requires the familiar's available Reaction.",
    );
  }
  const deliveryFills = findFamiliarTouchDeliveryFills({
    fills: input.fills,
    ownerId: input.subject.actorId,
    familiarId: connection.familiarId,
    sourceProcedureRef: procedure.sourceProcedureRef,
  });
  if (deliveryFills.tag === "invalid") {
    return invalidTransition("invalidFill", deliveryFills.message);
  }
  return {
    tag: "prepared",
    fills: deliveryFills.fills,
    familiarId: connection.familiarId,
    targetChoiceCount: deliveryFills.targetChoiceCount,
  };
}

export function spendFindFamiliarTouchDeliveryReaction(input: {
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
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
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
        sourceProcedureRef: input.sourceProcedureRef,
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
          sourceProcedureRef: input.sourceProcedureRef,
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
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}): boolean {
  return (
    input.fact.kind === "findFamiliarTouchSpellTarget" &&
    input.fact.ownerId === input.ownerId &&
    input.fact.familiarId === input.familiarId &&
    input.fact.targetId === input.targetId &&
    input.fact.sourceProcedureRef === input.sourceProcedureRef
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
