// Triggered reaction spell discovery and trigger matching extracted from dispatcher.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-feather-fall-mitigation spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION

import { CombatantId } from "../identity.ts";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";
import { currentActorId } from "./creature-state-leaves.ts";
import { combatantCanTakeReactions } from "./creature-state.ts";
import {
  combatantHasSpellSlotUseThisTurn,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./spells-profiles.ts";
import { shieldReactionSpellMatchesTrigger } from "./shield-reaction-trigger.ts";
import {
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellTargetListHole,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import {
  counterspellCapableReactors,
  spellCastCanTriggerCounterspell,
} from "./counterspell-reaction-discovery.ts";
import { spellCastReactionFactsHole } from "./spell-cast-interrupt-frame.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";
import type {
  BattleInterruptCheckpointInput,
  BattleInterruptProcedureChoice,
  BattleState,
  BattleTargetSpatialFact,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";

export { shieldReactionSpellMatchesTrigger } from "./shield-reaction-trigger.ts";

export function triggeredReactionSpellChoices(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): readonly BattleInterruptProcedureChoice[] {
  if (
    frame.trigger !== "attackHit" &&
    frame.trigger !== "spellCast" &&
    frame.trigger !== "afterDamage" &&
    frame.trigger !== "creatureFalls"
  ) {
    return [];
  }
  let counterspellReactors:
    | ReturnType<typeof counterspellCapableReactors>
    | undefined;
  const getCounterspellReactors = (): ReturnType<
    typeof counterspellCapableReactors
  > => (counterspellReactors ??= counterspellCapableReactors(state));
  const reactorIds =
    frame.trigger === "attackHit"
      ? [frame.targetId]
      : frame.trigger === "afterDamage"
        ? [frame.damagedId]
        : frame.trigger === "creatureFalls"
          ? featherFallTriggerReactors(frame)
          : spellCastTriggerReactors(frame);
  return reactorIds.flatMap(
    (reactorId): readonly BattleInterruptProcedureChoice[] => {
      const reactor = state.combatants.get(reactorId);
      if (
        reactor?.origin.kind !== "character" ||
        !combatantCanTakeReactions(reactor) ||
        combatantInsideActiveAntimagicFieldAura(state, reactorId)
      ) {
        return [];
      }
      return supportedSpellActs(reactor, state).flatMap(
        (invocation): readonly BattleInterruptProcedureChoice[] => {
          if (
            (invocation.procedure !== "shieldReaction" &&
              invocation.procedure !== "saveGatedDamage" &&
              invocation.procedure !== "featherFallMitigation" &&
              invocation.procedure !== "counterspell") ||
            !spellHasAvailableSpend(reactor, invocation) ||
            !triggeredReactionSpellTurnResourceAvailable(
              state,
              reactorId,
              invocation,
            ) ||
            !triggeredReactionSpellMatchesTrigger(invocation, frame, reactorId)
          ) {
            return [];
          }
          const invocationRef = supportedSpellInvocationRef(invocation);
          const spellCastReactionFactsHoles = spellCastCanTriggerCounterspell({
            casterId: reactorId,
            invocation,
            reactors: getCounterspellReactors(),
          })
            ? [spellCastReactionFactsHole({ casterId: reactorId, invocation })]
            : [];
          const initialHoles =
            invocation.procedure === "saveGatedDamage"
              ? [
                  ...spellCastReactionFactsHoles,
                  spellSavingThrowOutcomeHole(state, reactorId, invocation),
                  spellDamageHole(invocation),
                ]
              : invocation.procedure === "counterspell" &&
                  frame.trigger === "spellCast" &&
                  Number(invocation.resource.slotLevel) < frame.castLevel
                ? [
                    ...spellCastReactionFactsHoles,
                    spellSavingThrowOutcomeHole(state, reactorId, invocation),
                  ]
                : invocation.procedure === "featherFallMitigation"
                  ? [
                      ...spellCastReactionFactsHoles,
                      spellTargetListHole(state, reactorId, invocation),
                    ]
                  : spellCastReactionFactsHoles;
          return [
            {
              kind: "castTriggeredReactionSpell" as const,
              reactorId,
              invocation: invocationRef,
              initialHoles,
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
    {
      readonly procedure:
        | "shieldReaction"
        | "saveGatedDamage"
        | "featherFallMitigation"
        | "counterspell";
    }
  >,
): boolean {
  if (invocation.resource.tag !== "spellSlot") {
    return true;
  }
  return !combatantHasSpellSlotUseThisTurn(
    state.currentTurnResources,
    reactorId,
  );
}

export function triggeredReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "shieldReaction"
        | "saveGatedDamage"
        | "featherFallMitigation"
        | "counterspell";
    }
  >,
  frame: BattleInterruptCheckpointInput,
  reactorId: CombatantId,
): boolean {
  if (invocation.procedure === "shieldReaction") {
    return shieldReactionSpellMatchesTrigger(invocation, frame);
  }
  if (invocation.procedure === "saveGatedDamage") {
    return hellishRebukeReactionSpellMatchesTrigger(invocation, frame);
  }
  if (invocation.procedure === "counterspell") {
    return counterspellReactionSpellMatchesTrigger(
      invocation,
      frame,
      reactorId,
    );
  }
  return featherFallReactionSpellMatchesTrigger(invocation, frame);
}

export function counterspellReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "counterspell" }
  >,
  frame: BattleInterruptCheckpointInput,
  reactorId: CombatantId,
): boolean {
  const castingTime = topLevelSpellCastingTime(invocation.spell.mechanics);
  if (
    frame.trigger !== "spellCast" ||
    frame.casterId === reactorId ||
    invocation.spell.mechanics.family !== "triggered_reaction" ||
    castingTime?.kind !== "reaction" ||
    castingTime.trigger.kind !== "creature_casts_spell"
  ) {
    return false;
  }
  const triggerComponents = castingTime.trigger.components;
  return (
    frame.components.some((component) =>
      triggerComponents.includes(component),
    ) &&
    frame.reactionSpellTargetFacts.some(
      (fact) =>
        fact.kind === "counterspellTriggerCasterVisibleWithinRange" &&
        fact.reactorId === reactorId &&
        fact.casterId === frame.casterId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet,
    )
  );
}

export function hellishRebukeReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  const castingTime = topLevelSpellCastingTime(invocation.spell.mechanics);
  return (
    frame.trigger === "afterDamage" &&
    Number(frame.damageAmount) > 0 &&
    invocation.spell.mechanics.family === "triggered_reaction" &&
    castingTime?.kind === "reaction" &&
    castingTime.trigger.kind === "takes_damage_from_creature" &&
    frame.damagedId !== frame.damageSourceId &&
    (frame.reactionSpellTargetFacts ?? []).some(
      (fact) =>
        fact.kind === "reactionSpellDamagerVisibleWithinRange" &&
        fact.reactorId === frame.damagedId &&
        fact.damageSourceId === frame.damageSourceId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet,
    )
  );
}

export function reactionSpellTargetFactsForAfterDamage(input: {
  readonly facts: readonly BattleTargetSpatialFact[];
  readonly damagedId: CombatantId;
  readonly damageSourceId: CombatantId;
}): readonly BattleTargetSpatialFact[] {
  return input.facts.filter(
    (fact) =>
      fact.kind === "reactionSpellDamagerVisibleWithinRange" &&
      ((fact.reactorId === input.damagedId &&
        fact.damageSourceId === input.damageSourceId) ||
        (fact.reactorId === input.damageSourceId &&
          fact.damageSourceId === input.damagedId)),
  );
}

export function featherFallReactionSpellMatchesTrigger(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "featherFallMitigation" }
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  const castingTime = topLevelSpellCastingTime(invocation.spell.mechanics);
  return (
    frame.trigger === "creatureFalls" &&
    invocation.spell.mechanics.family === "triggered_reaction" &&
    castingTime?.kind === "reaction" &&
    castingTime.trigger.kind === "self_or_visible_creature_falls" &&
    frame.reactionSpellTargetFacts.some(
      (fact) =>
        fact.kind === "featherFallTriggerSelfOrVisibleCreatureWithinRange" &&
        fact.reactorId === invocation.activeEffect.sourceCombatantId &&
        fact.fallingCreatureId === frame.fallingCreatureId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet,
    )
  );
}

function featherFallTriggerReactors(
  frame: Extract<
    BattleInterruptCheckpointInput,
    { readonly trigger: "creatureFalls" }
  >,
): readonly CombatantId[] {
  return [
    ...new Set(
      frame.reactionSpellTargetFacts.flatMap((fact): readonly CombatantId[] =>
        fact.kind === "featherFallTriggerSelfOrVisibleCreatureWithinRange" &&
        fact.fallingCreatureId === frame.fallingCreatureId
          ? [fact.reactorId]
          : [],
      ),
    ),
  ];
}

function spellCastTriggerReactors(
  frame: Extract<BattleInterruptCheckpointInput, { readonly trigger: "spellCast" }>,
): readonly CombatantId[] {
  return [
    ...new Set([
      ...frame.targetIds,
      ...frame.reactionSpellTargetFacts.flatMap(
        (fact): readonly CombatantId[] =>
          fact.kind === "counterspellTriggerCasterVisibleWithinRange" &&
          fact.casterId === frame.casterId
            ? [fact.reactorId]
            : [],
      ),
    ]),
  ];
}
