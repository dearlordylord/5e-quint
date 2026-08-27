// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import { Result } from "effect";

import type {
  BattleActiveEffect,
  BattleFill,
  BattleInvalidReasonCode,
  BattleResolutionInput,
  BattleState,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { combatantCanTakeReactions } from "./battle-reducer/creature-state-execution.ts";
import { spellInvocationIsSpellcasting } from "./battle-reducer/spell-turn-resources.ts";
import { characterSpellProcedure } from "./character-execution-queries.ts";
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
  /* v8 ignore start -- @preserve -- Discovered shared-senses acts are admitted only for a live owner/present-companion pair; a missing member requires a forged state/fact combination. */
  if (caster === undefined || familiar === undefined) {
    return invalidTransition(
      "missingCombatant",
      "Find Familiar shared senses require caster and familiar combatants.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Present Find Familiar companions are admitted from Stat Blocks; a non-Stat-Block companion contradicts the companion roster boundary. */
  if (familiar.origin.kind !== "statBlock") {
    return invalidTransition(
      "invalidFill",
      "Find Familiar shared senses require a familiar Stat Block.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Result.isFailure(spent)) {
    return invalidTransition(
      "staleSubject",
      "Find Familiar shared senses require an available Bonus Action.",
    );
  }
  const effect = findFamiliarSharedSensesEffect({
    casterId: input.casterId,
    familiarId: connection.familiarId,
    familiarSenses: familiar.origin.mechanics.specialSenses,
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
    currentTurnResources: spent.success,
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
  readonly reactionCommitment: "uncommitted" | "committed";
}):
  | PreparedFindFamiliarTouchSpellDelivery
  | Exclude<FindFamiliarMechanicalTransition, { readonly tag: "resolved" }> {
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Familiar delivery acts are projected only for a character caster; reaching this guard requires a forged subject owner. */
  if (actor?.origin.kind !== "character") {
    return invalidTransition(
      "unsupportedActOption",
      "Find Familiar touch delivery requires a supported spell invocation.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const procedure = characterSpellProcedure(
    actor.origin.execution,
    input.subject.procedureRef,
    actor,
  );
  /* v8 ignore start -- @preserve -- Familiar delivery acts retain their admitted spell binding; a missing or non-spell procedure requires a forged procedure reference. */
  if (procedure === undefined || !spellInvocationIsSpellcasting(procedure)) {
    return invalidTransition(
      "unsupportedActOption",
      "Find Familiar touch delivery requires a supported spell invocation.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  if (
    input.reactionCommitment === "uncommitted" &&
    !combatantCanTakeReactions(familiar)
  ) {
    return invalidTransition(
      "staleSubject",
      "Find Familiar touch delivery requires the familiar's available Reaction.",
    );
  }
  if (
    input.reactionCommitment === "committed" &&
    familiar?.reactionAvailable !== false
  ) {
    return invalidTransition(
      "staleSubject",
      "Find Familiar touch delivery continuation requires its committed Reaction.",
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
  /* v8 ignore start -- @preserve -- Preparation and Reaction spending are one atomic reducer operation; a missing familiar requires a malformed execution callback. */
  if (familiar === undefined) {
    return {
      tag: "invalid",
      message:
        "Find Familiar touch delivery requires the familiar to remain present.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (!combatantCanTakeReactions(familiar)) {
    return {
      tag: "invalid",
      message:
        "Find Familiar touch delivery requires the familiar's available Reaction at completion.",
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
    /* v8 ignore start -- @preserve -- Familiar delivery discovery admits only spells with exactly one targetChoice hole, so list/allocation fills contradict that discovered act contract. */
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
    /* v8 ignore stop -- @preserve */
    if (fill.kind !== "targetChoice") {
      fills.push(fill);
      continue;
    }
    targetChoiceCount += 1;
    /* v8 ignore start -- @preserve -- Familiar delivery discovery proves exactly one targetChoice hole; a second target fill can only be forged outside that hole contract. */
    if (targetChoiceCount > 1) {
      return {
        tag: "invalid",
        message:
          "Find Familiar touch delivery currently supports exactly one target choice.",
      };
    }
    /* v8 ignore stop -- @preserve */
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
