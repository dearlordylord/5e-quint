// Triggered reaction spell discovery and trigger matching extracted from dispatcher.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
































import {
CombatantId
} from "../identity.ts";






import {
currentActorId
} from "./creature-state-leaves.ts";

import {
combatantCanTakeReactions
} from "./creature-state.ts";












import {
supportedSpellInvocationRef
} from "./spells-holes-fills.ts";

import {
reactionTriggerIncludesHitByAttackRoll,
reactionTriggerNamedSpellIds,
spellHasAvailableSpend,
supportedSpellActs
} from "./spells-profiles.ts";






import type {
BattleReactionFrameInput,
BattleReactionProcedureChoice,
BattleState,
SupportedSpellInvocation
} from "../battle-reducer.ts";
import {
activeOngoingFeaturesPreventSpellcasting
} from "../battle-reducer.ts";
export function triggeredReactionSpellChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  if (frame.trigger !== "attackHit" && frame.trigger !== "spellCast") {
    return [];
  }
  const reactorIds =
    frame.trigger === "attackHit" ? [frame.targetId] : frame.targetIds;
  return reactorIds.flatMap(
    (reactorId): readonly BattleReactionProcedureChoice[] => {
      const reactor = state.combatants.get(reactorId);
      if (
        reactor?.origin.kind !== "character" ||
        !combatantCanTakeReactions(reactor) ||
        activeOngoingFeaturesPreventSpellcasting(reactor)
      ) {
        return [];
      }
      return supportedSpellActs(reactor).flatMap(
        (invocation): readonly BattleReactionProcedureChoice[] => {
          if (
            invocation.procedure !== "shieldReaction" ||
            !spellHasAvailableSpend(reactor, invocation) ||
            !triggeredReactionSpellTurnResourceAvailable(
              state,
              reactorId,
              invocation,
              frame,
            ) ||
            !shieldReactionSpellMatchesTrigger(invocation, frame)
          ) {
            return [];
          }
          const invocationRef = supportedSpellInvocationRef(invocation);
          return [
            {
              kind: "castTriggeredReactionSpell" as const,
              reactorId,
              invocation: invocationRef,
              initialHoles: [],
              subject: {
                tag: "runtimeCommand" as const,
                actorId: currentActorId(state),
                command: "castTriggeredReactionSpell" as const,
                reactorId,
                invocation: invocationRef,
              },
            },
          ];
        },
      );
    },
  );
}

export function triggeredReactionSpellTurnResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  if (reactorId !== currentActorId(state)) {
    return true;
  }
  if (state.currentTurnResources.spellSlotExpendedThisTurn) {
    return false;
  }
  return !currentActorHasPendingSlottedSpellCast(state, invocation, frame);
}

export function currentActorHasPendingSlottedSpellCast(
  state: BattleState,
  reactionInvocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  if (
    frame.trigger !== "spellCast" ||
    frame.casterId !== currentActorId(state)
  ) {
    return false;
  }
  const caster = state.combatants.get(frame.casterId);
  if (caster?.origin.kind !== "character") {
    return false;
  }
  return supportedSpellActs(caster).some(
    (candidate) =>
      candidate.spell.id === frame.spellId &&
      candidate.spell.id !== reactionInvocation.spell.id &&
      candidate.resource.tag === "spellSlot",
  );
}

export function shieldReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
  frame: BattleReactionFrameInput,
): boolean {
  const castingTime = invocation.spell.mechanics.castingTime;
  if (castingTime.kind !== "reaction") {
    return false;
  }
  if (frame.trigger === "attackHit") {
    return reactionTriggerIncludesHitByAttackRoll(castingTime);
  }
  const namedSpellTriggerIds = reactionTriggerNamedSpellIds(castingTime);
  return (
    frame.trigger === "spellCast" &&
    namedSpellTriggerIds.includes(frame.spellId) &&
    invocation.negatedSpellIds.includes(frame.spellId)
  );
}
