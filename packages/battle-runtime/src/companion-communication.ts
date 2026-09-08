// UNIT-PROFILE-COVERAGE: runtime-owner spell.companion-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import type { MovementFeet } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import { Match, Result } from "effect";

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
import { spawnedCompanionEntryForOwner } from "./spawned-companion-state.ts";
import { allocateBattleEffectExecutionRefForCreature } from "./effect-execution-ref.ts";
import type {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "./identity.ts";
import { spawnedCompanionLifecycleExecutionFactsForOwner } from "./companion-reaction-feature-facts.ts";

export type SpawnedCompanionWithinCommunicationRangeFact = {
  readonly kind: "companionWithinCommunicationRangeOfOwner";
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
};

export type SpawnedCompanionTelepathicConnection = {
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly rangeFeet: MovementFeet;
  readonly sharedLanguageRequired: false;
};

export type CompanionSharedSensesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spawnedCompanionSharedSenses" }
>;

export type SpawnedCompanionMechanicalTransition =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
    };

function invalidTransition(
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<SpawnedCompanionMechanicalTransition, { readonly tag: "invalid" }> {
  return { tag: "invalid", reason, message };
}

export function spawnedCompanionTelepathicConnection(
  state: BattleState,
  fact: SpawnedCompanionWithinCommunicationRangeFact,
): SpawnedCompanionTelepathicConnection | null {
  const execution = spawnedCompanionLifecycleExecutionFactsForOwner(
    state,
    fact.ownerId,
  );
  return execution === null
    ? null
    : spawnedCompanionConnection(state, fact, execution.telepathyRangeFeet);
}

function spawnedCompanionConnection(
  state: BattleState,
  fact: SpawnedCompanionWithinCommunicationRangeFact,
  rangeFeet: MovementFeet,
): SpawnedCompanionTelepathicConnection | null {
  const familiarEntry = spawnedCompanionEntryForOwner(state, fact.ownerId);
  if (
    familiarEntry?.companion.status !== "present" ||
    familiarEntry.companion.combatantId !== fact.familiarId
  ) {
    return null;
  }
  return {
    ownerId: fact.ownerId,
    familiarId: fact.familiarId,
    rangeFeet,
    sharedLanguageRequired: false,
  };
}

export function shareSpawnedCompanionSenses(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly fact: SpawnedCompanionWithinCommunicationRangeFact;
}): SpawnedCompanionMechanicalTransition {
  const execution = spawnedCompanionLifecycleExecutionFactsForOwner(
    input.state,
    input.casterId,
  );
  if (execution === null) {
    return invalidTransition(
      "invalidFill",
      "Shared senses require admitted companion lifecycle execution.",
    );
  }
  const connection = spawnedCompanionTelepathicConnection(
    input.state,
    input.fact,
  );
  if (connection === null || connection.ownerId !== input.casterId) {
    return invalidTransition(
      "invalidFill",
      `Shared senses require a present companion within ${execution.telepathyRangeFeet} feet of its owner.`,
    );
  }
  if (currentActorId(input.state) !== input.casterId) {
    return invalidTransition(
      "staleSubject",
      "Shared senses are available only on the companion owner's turn.",
    );
  }
  const caster = input.state.combatants.get(input.casterId);
  const familiar = input.state.combatants.get(connection.familiarId);
  /* v8 ignore start -- @preserve -- Discovered shared-senses acts are admitted only for a live owner/present-companion pair; a missing member requires a forged state/fact combination. */
  if (caster === undefined || familiar === undefined) {
    return invalidTransition(
      "missingCombatant",
      "Shared senses require owner and companion combatants.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Present Find Familiar companions are admitted from Stat Blocks; a non-Stat-Block companion contradicts the companion roster boundary. */
  if (familiar.origin.kind !== "statBlock") {
    return invalidTransition(
      "invalidFill",
      "Shared senses require a companion Stat Block.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = Match.value(execution.sharedSensesActionCost).pipe(
    Match.when("bonusAction", () =>
      spendActivationResource(input.state.currentTurnResources, {
        kind: "bonusAction",
      }),
    ),
    Match.exhaustive,
  );
  if (Result.isFailure(spent)) {
    return invalidTransition(
      "staleSubject",
      `Shared senses require an available ${sharedSensesActionCostLabel(execution.sharedSensesActionCost)}.`,
    );
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: caster,
  });
  const effect = spawnedCompanionSharedSensesEffect({
    casterId: input.casterId,
    familiarId: connection.familiarId,
    familiarSenses: familiar.origin.mechanics.specialSenses,
    effectRef: allocation.effectRef,
  });
  const nextCaster = {
    ...allocation.owner,
    activeEffects: [
      ...allocation.owner.activeEffects.filter(
        (candidate) => candidate.kind !== "spawnedCompanionSharedSenses",
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

function sharedSensesActionCostLabel(actionCost: "bonusAction"): string {
  return Match.value(actionCost).pipe(
    Match.when("bonusAction", () => "Bonus Action"),
    Match.exhaustive,
  );
}

export type PreparedSpawnedCompanionTouchSpellDelivery = {
  readonly tag: "prepared";
  readonly fills: BattleResolutionInput["fills"];
  readonly familiarId: CombatantId;
  readonly targetChoiceCount: number;
};

function spawnedCompanionTouchDeliveryProcedure(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >,
) {
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return null;
  const procedure = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  if (procedure === undefined) return null;
  if (!("spellRuleFacts" in procedure)) return null;
  return spellInvocationIsSpellcasting(procedure) ? procedure : null;
}

function spawnedCompanionTouchDeliveryReactionIssue(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly commitment: "uncommitted" | "committed";
  readonly actionCost: "reaction";
}): string | null {
  return Match.value(input.actionCost).pipe(
    Match.when("reaction", () => spawnedCompanionReactionIssue(input)),
    Match.exhaustive,
  );
}

function spawnedCompanionReactionIssue(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly commitment: "uncommitted" | "committed";
}): string | null {
  const familiar = input.state.combatants.get(input.familiarId);
  if (
    input.commitment === "uncommitted" &&
    !combatantCanTakeReactions(familiar)
  ) {
    return "Companion touch delivery requires the familiar's available Reaction.";
  }
  if (
    input.commitment === "committed" &&
    familiar?.reactionAvailable !== false
  ) {
    return "Companion touch delivery continuation requires its committed Reaction.";
  }
  return null;
}

export function prepareTouchSpellDeliveryThroughSpawnedCompanion(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
  readonly fills: BattleResolutionInput["fills"];
  readonly fact: SpawnedCompanionWithinCommunicationRangeFact;
  readonly reactionCommitment: "uncommitted" | "committed";
}):
  | PreparedSpawnedCompanionTouchSpellDelivery
  | Exclude<
      SpawnedCompanionMechanicalTransition,
      { readonly tag: "resolved" }
    > {
  const procedure = spawnedCompanionTouchDeliveryProcedure(
    input.state,
    input.subject,
  );
  /* v8 ignore start -- @preserve -- Familiar delivery acts retain a spellcasting procedure on a character caster; reaching this guard requires a forged owner or procedure reference. */
  if (procedure === null) {
    return invalidTransition(
      "unsupportedActOption",
      "Companion touch delivery requires a supported spell invocation.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const execution = spawnedCompanionLifecycleExecutionFactsForOwner(
    input.state,
    input.subject.actorId,
  );
  if (execution === null) {
    return invalidTransition(
      "invalidFill",
      "Companion touch delivery requires admitted lifecycle execution.",
    );
  }
  if (
    procedure.spellRuleFacts.range.kind !==
    execution.touchSpellProxy.requiredSpellRange
  ) {
    return invalidTransition(
      "invalidFill",
      `Companion touch delivery supports only spells with the admitted ${execution.touchSpellProxy.requiredSpellRange} range.`,
    );
  }
  const connection = spawnedCompanionConnection(
    input.state,
    input.fact,
    execution.touchSpellProxy.companionRangeFeet,
  );
  if (connection === null || connection.ownerId !== input.subject.actorId) {
    return invalidTransition(
      "invalidFill",
      `Companion touch delivery requires a present familiar within ${execution.touchSpellProxy.companionRangeFeet} feet of its caster.`,
    );
  }
  const reactionIssue = spawnedCompanionTouchDeliveryReactionIssue({
    state: input.state,
    familiarId: connection.familiarId,
    commitment: input.reactionCommitment,
    actionCost: execution.touchSpellProxy.companionActionCost,
  });
  if (reactionIssue !== null)
    return invalidTransition("staleSubject", reactionIssue);
  const deliveryFills = spawnedCompanionTouchDeliveryFills({
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

export function spendSpawnedCompanionTouchDeliveryReaction(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly actionCost: "reaction";
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  return Match.value(input.actionCost).pipe(
    Match.when("reaction", () => spendSpawnedCompanionReaction(input)),
    Match.exhaustive,
  );
}

function spendSpawnedCompanionReaction(input: {
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
        "Companion touch delivery requires the familiar to remain present.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (!combatantCanTakeReactions(familiar)) {
    return {
      tag: "invalid",
      message:
        "Companion touch delivery requires the familiar's available Reaction at completion.",
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

function spawnedCompanionTouchDeliveryFills(input: {
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
          "Companion touch delivery currently supports single target-choice Touch spells.",
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
          "Companion touch delivery currently supports exactly one target choice.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const facts = fill.spatialFacts ?? [];
    const deliveryFact = facts.find((fact) =>
      spawnedCompanionTouchSpellTargetFactMatches({
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
        ...facts.filter(
          (fact) => fact.kind !== "spawnedCompanionTouchSpellTarget",
        ),
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
          "Companion touch delivery requires a table fact that the familiar can deliver the Touch spell to the selected target.",
      };
}

function spawnedCompanionTouchSpellTargetFactMatches(input: {
  readonly fact: BattleTargetSpatialFact;
  readonly ownerId: CombatantId;
  readonly familiarId: CombatantId;
  readonly targetId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}): boolean {
  return (
    input.fact.kind === "spawnedCompanionTouchSpellTarget" &&
    input.fact.ownerId === input.ownerId &&
    input.fact.familiarId === input.familiarId &&
    input.fact.targetId === input.targetId &&
    input.fact.sourceProcedureRef === input.sourceProcedureRef
  );
}

function spawnedCompanionSharedSensesEffect(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly familiarSenses: readonly CreatureSense[];
  readonly effectRef: BattleEffectExecutionRef;
}): CompanionSharedSensesEffect {
  return {
    kind: "spawnedCompanionSharedSenses",
    effectRef: input.effectRef,
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
