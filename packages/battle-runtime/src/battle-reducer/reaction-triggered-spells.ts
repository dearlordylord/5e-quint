// Triggered reaction spell discovery and trigger matching extracted from dispatcher.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-feather-fall-mitigation spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control spell.invocation-magic-suppression-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION

import { CombatantId } from "../identity.ts";
import type { SpellProcedureExecution } from "../character-execution.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import {
  combatantHasSpellSlotUseThisTurn,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { triggeredArmorDefenseSpellMatchesTrigger } from "./triggered-armor-defense-reaction.ts";
import {
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellTargetListHole,
} from "./spells-holes-fills.ts";
import {
  spellCastInterruptionReactionCapableReactors,
  spellCastCanTriggerSpellCastInterruption,
} from "./spell-cast-interruption-reaction-discovery.ts";
import { spellCastReactionFactsHole } from "./spell-cast-interrupt-frame.ts";
import { combatantInsideActiveMagicSuppressionEmanation } from "./magic-suppression-action-interdiction.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import type {
  BattleInterruptCheckpointInput,
  BattleInterruptProcedureChoice,
  BattleExecutableSpellInvocation,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";

export { triggeredArmorDefenseSpellMatchesTrigger } from "./triggered-armor-defense-reaction.ts";

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
  let spellCastInterruptionReactionReactors:
    | ReturnType<typeof spellCastInterruptionReactionCapableReactors>
    | undefined;
  const getSpellCastInterruptionReactors = (): ReturnType<
    typeof spellCastInterruptionReactionCapableReactors
  > =>
    (spellCastInterruptionReactionReactors ??=
      spellCastInterruptionReactionCapableReactors(state));
  const reactorIds =
    frame.trigger === "attackHit"
      ? [frame.targetId]
      : frame.trigger === "afterDamage"
        ? [frame.damagedId]
        : frame.trigger === "creatureFalls"
          ? fallingCreatureMitigationTriggerReactors(frame)
          : spellCastTriggerReactors(frame);
  return reactorIds.flatMap(
    (reactorId): readonly BattleInterruptProcedureChoice[] => {
      const reactor = state.combatants.get(reactorId);
      if (
        !isCharacterBattleCreatureState(reactor) ||
        !combatantCanTakeReactions(reactor) ||
        combatantInsideActiveMagicSuppressionEmanation(state, reactorId)
      ) {
        return [];
      }
      return supportedSpellActs(state, reactor).flatMap(
        (invocation): readonly BattleInterruptProcedureChoice[] => {
          const executableInvocation = invocation;
          if (
            !isTriggeredReactionSpellInvocation(executableInvocation) ||
            !spellHasAvailableSpend(reactor, executableInvocation) ||
            !triggeredReactionSpellTurnResourceAvailable(
              state,
              reactorId,
              executableInvocation,
            ) ||
            !triggeredReactionSpellMatchesTrigger(
              executableInvocation,
              frame,
              reactorId,
            )
          ) {
            return [];
          }
          const spellCastReactionFactsHoles =
            spellCastCanTriggerSpellCastInterruption({
              casterId: reactorId,
              invocation: executableInvocation,
              reactors: getSpellCastInterruptionReactors(),
            })
              ? [
                  spellCastReactionFactsHole({
                    casterId: reactorId,
                    invocation,
                  }),
                ]
              : [];
          const initialHoles =
            executableInvocation.procedure === "saveGatedDamage"
              ? [
                  ...spellCastReactionFactsHoles,
                  spellSavingThrowOutcomeHole(
                    state,
                    reactorId,
                    executableInvocation,
                  ),
                  spellDamageHole(executableInvocation),
                ]
              : executableInvocation.procedure ===
                    "spellCastInterruptionReaction" &&
                  frame.trigger === "spellCast"
                ? [
                    ...spellCastReactionFactsHoles,
                    spellSavingThrowOutcomeHole(
                      state,
                      reactorId,
                      executableInvocation,
                    ),
                  ]
                : executableInvocation.procedure ===
                    "fallingCreatureMitigationReaction"
                  ? [
                      ...spellCastReactionFactsHoles,
                      spellTargetListHole(
                        state,
                        reactorId,
                        executableInvocation,
                      ),
                    ]
                  : spellCastReactionFactsHoles;
          return [
            {
              kind: "castTriggeredReactionSpell" as const,
              reactorId,
              initialHoles,
              subject: {
                tag: "runtimeCommand" as const,
                actorId: currentActorId(state),
                command: "castTriggeredReactionSpell" as const,
                reactorId,
                procedureRef: executableInvocation.sourceProcedureRef,
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
    SpellProcedureExecution,
    {
      readonly procedure:
        | "triggeredArmorDefense"
        | "saveGatedDamage"
        | "fallingCreatureMitigationReaction"
        | "spellCastInterruptionReaction";
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
  invocation: BattleExecutableSpellInvocation<
    Extract<
      SpellProcedureExecution,
      {
        readonly procedure:
          | "triggeredArmorDefense"
          | "saveGatedDamage"
          | "fallingCreatureMitigationReaction"
          | "spellCastInterruptionReaction";
      }
    >
  >,
  frame: BattleInterruptCheckpointInput,
  reactorId: CombatantId,
): boolean {
  if (invocation.procedure === "triggeredArmorDefense") {
    return triggeredArmorDefenseSpellMatchesTrigger(invocation, frame);
  }
  if (invocation.procedure === "saveGatedDamage") {
    return afterDamageRetaliationReactionSpellMatchesTrigger(invocation, frame);
  }
  if (invocation.procedure === "spellCastInterruptionReaction") {
    return spellCastInterruptionReactionReactionSpellMatchesTrigger(
      invocation,
      frame,
      reactorId,
    );
  }
  return fallingCreatureMitigationReactionSpellMatchesTrigger(
    invocation,
    frame,
  );
}

export function spellCastInterruptionReactionReactionSpellMatchesTrigger(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      SpellProcedureExecution,
      { readonly procedure: "spellCastInterruptionReaction" }
    >
  >,
  frame: BattleInterruptCheckpointInput,
  reactorId: CombatantId,
): boolean {
  if (
    frame.trigger !== "spellCast" ||
    frame.casterId === reactorId ||
    invocation.triggerComponents.length === 0
  ) {
    return false;
  }
  return (
    frame.components.some((component) =>
      invocation.triggerComponents.includes(component),
    ) &&
    frame.reactionSpellTargetFacts.some(
      (fact) =>
        fact.kind === "spellCastInterruptionTriggerCasterVisibleWithinRange" &&
        fact.reactorId === reactorId &&
        fact.casterId === frame.casterId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
        fact.rangeFeet === invocation.rangeFeet,
    )
  );
}

export function afterDamageRetaliationReactionSpellMatchesTrigger(
  invocation: BattleExecutableSpellInvocation<
    Extract<SpellProcedureExecution, { readonly procedure: "saveGatedDamage" }>
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  const castingTime = invocation.castingTime;
  return (
    frame.trigger === "afterDamage" &&
    Number(frame.damageAmount) > 0 &&
    castingTime.kind === "reaction" &&
    frame.damagedId !== frame.damageSourceId &&
    (frame.reactionSpellTargetFacts ?? []).some(
      (fact) =>
        fact.kind === "reactionSpellDamagerVisibleWithinRange" &&
        fact.reactorId === frame.damagedId &&
        fact.damageSourceId === frame.damageSourceId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
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
      (fact.kind === "reactionSpellDamagerVisibleWithinRange" &&
        ((fact.reactorId === input.damagedId &&
          fact.damageSourceId === input.damageSourceId) ||
          (fact.reactorId === input.damageSourceId &&
            fact.damageSourceId === input.damagedId))) ||
      (fact.kind === "retaliationDamagerWithinFiveFeet" &&
        fact.damagedId === input.damagedId &&
        fact.damageSourceId === input.damageSourceId),
  );
}

export function fallingCreatureMitigationReactionSpellMatchesTrigger(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      SpellProcedureExecution,
      { readonly procedure: "fallingCreatureMitigationReaction" }
    >
  >,
  frame: BattleInterruptCheckpointInput,
): boolean {
  return (
    frame.trigger === "creatureFalls" &&
    frame.reactionSpellTargetFacts.some(
      (fact) =>
        fact.reactorId === invocation.activeEffect.sourceCombatantId &&
        fact.fallingCreatureId === frame.fallingCreatureId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
        fact.rangeFeet === invocation.rangeFeet,
    )
  );
}

function fallingCreatureMitigationTriggerReactors(
  frame: Extract<
    BattleInterruptCheckpointInput,
    { readonly trigger: "creatureFalls" }
  >,
): readonly CombatantId[] {
  return [
    ...new Set(
      frame.reactionSpellTargetFacts.flatMap((fact): readonly CombatantId[] =>
        fact.fallingCreatureId === frame.fallingCreatureId
          ? [fact.reactorId]
          : [],
      ),
    ),
  ];
}

function spellCastTriggerReactors(
  frame: Extract<
    BattleInterruptCheckpointInput,
    { readonly trigger: "spellCast" }
  >,
): readonly CombatantId[] {
  return [
    ...new Set([
      ...frame.targetIds,
      ...frame.reactionSpellTargetFacts.flatMap(
        (fact): readonly CombatantId[] =>
          fact.kind ===
            "spellCastInterruptionTriggerCasterVisibleWithinRange" &&
          fact.casterId === frame.casterId
            ? [fact.reactorId]
            : [],
      ),
    ]),
  ];
}
