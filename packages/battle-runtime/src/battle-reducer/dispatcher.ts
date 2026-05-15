// Battle dispatcher/orchestration extracted from ../battle-reducer.ts.
// Owns subject resolution, reaction windows, interrupted-procedure replay,
// turn snapshots, and reaction-choice orchestration. Mechanical move; no
// behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-feather-fall-mitigation spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  canSpendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";

import { type StandardActionKind } from "@dnd/shared/game-facts";

import {
  damageAmount as toDamageAmount,
  type DamageAmount,
  type Size,
} from "@dnd/shared/types";

import type { UnitRecord } from "@dnd/surface/surface/types";

import { Match } from "effect";

import * as Either from "effect/Either";

import { type BattleReactionTrigger } from "../battle-reaction-triggers.ts";
import type {
  FindFamiliarPresentState,
  FindFamiliarSnapshot,
} from "../find-familiar-lifecycle.ts";
import { resolvePactOfTheChainFamiliarReactionAttack } from "../find-familiar-pact-chain.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";

import {
  sameBattleSubject,
  type ActionHideSubject,
  type ActionSearchSubject,
  type BattleSubject,
} from "../battle-subjects.ts";

import { CombatantId, battleReplayStackDepth } from "../identity.ts";

import { currentActorId } from "./creature-state-leaves.ts";

import {
  battleSubjectActorId,
  closeLegendaryActionWindow,
  combatantCanTakeActions,
  combatantCanTakeReactions,
  combatantSnapshot,
  consumeLegendaryActionWindow,
  isLegendaryAttackSubject,
  normalizeEarlyEndedOngoingFeatures,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state.ts";

import {
  applyAttackDamageAmount,
  breakBattleConcentration,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";

import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";

import { needsHolesResult, revealHidden } from "./hole-helpers.ts";

import { opportunityAttackOptionForReactor } from "./movement-speed.ts";

import {
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  damageAmountByTypeEntriesAfterScalarReduction,
} from "./attack-damage-events.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { hideousLaughterDamageRepeatSaveFillCheck } from "./hideous-laughter-repeat-save.ts";
import {
  reactionModifierReductionRoll,
  reactionRollOrDamageReductionChoices,
  spendReactionModifierResource,
} from "./reaction-modifiers.ts";
import {
  triggeredReactionSpellChoices,
  featherFallReactionSpellMatchesTrigger,
  hellishRebukeReactionSpellMatchesTrigger,
  reactionSpellTargetFactsForAfterDamage,
  triggeredReactionSpellTurnResourceAvailable,
} from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
export {
  attackDamageEventAfterPendingReduction,
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
  damageAmountByTypeEntriesAfterScalarReduction,
} from "./attack-damage-events.ts";
export {
  attackDamageReductionRedirectResource,
  attackDamageReductionRedirectResourceAvailable,
  attackDamageReductionZeroDamageRedirectHoles,
  attackDamageReductionZeroDamageRedirectSelection,
  attackDamageReductionZeroDamageRedirectTargetChoices,
  hasAttackDamageReductionRedirectTargetSpatialFact,
  resolveAttackDamageReductionZeroDamageRedirectAfterReduction,
  spendAttackDamageReductionRedirectResource,
} from "./attack-damage-redirect.ts";

import { expendSpellSlot } from "./spell-effects.ts";

import { spellRequiresVerbal } from "./spells-discovery.ts";

import {
  applyAfterHitTimedDamageAndSaveSpellEffect,
  applyFailedSaveSpellConditionEffects,
  battleLightEmitters,
  applySpellDamage,
  applyShieldReactionSpellActiveEffect,
  featherFallLandingCleanupForCombatant,
  sameSpellInvocationRef,
  saveGateDamageResultForOutcome,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellTargetListHole,
  supportedSpellInvocationRef,
  supportedSpellInvocationMatchesRef,
  validateSpellDamageFill,
  validateSpellTargetList,
} from "./spells-holes-fills.ts";

import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";

import {
  resolveBonusActionDashSpellAct,
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./spells-resolve.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { attackActionOptionName } from "./statblock-attacks.ts";

import type {
  BattleAfterDamageEvent,
  BattleAttackDamageContinuationConcentrationFrame,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackDamageEvent,
  BattleAttackDamagePrefixFill,
  BattleAttackHitTriggerKind,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleFeatherFallLandingResult,
  BattleInterruptFrame,
  BattleInterruptedProcedure,
  BattleOpportunityAttackThreat,
  BattlePendingAttackDamageReduction,
  BattleReactionDecision,
  BattleReactionDecisionHole,
  BattleReactionFrame,
  BattleReactionFrameInput,
  BattleReactionInterruptFrame,
  BattleReactionModifierChoice,
  BattleReactionProcedureChoice,
  BattleReactionProcedureModifierChoice,
  BattleReactionProcedureSelection,
  BattleReplayContinuationFrame,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleRolledDiceFill,
  BattleSnapshot,
  BattleSpellSavingThrowOutcomeValue,
  BattleState,
  BattleTargetSpatialFact,
  AttackSpellDamageAddition,
  BattleTurnResources,
  BattleTurnSnapshot,
  SpellSlotInvocationResource,
} from "../battle-reducer.ts";
import {
  REACTION_DECISION_HOLE_ID,
  REACTION_DECISION_HOLE_INSTANCE,
  activeOngoingFeaturesPreventSpellcasting,
  applyBattleMovement,
  commandPendingEffectsForActor,
  currentActorHasOpenStatBlockMultiattackDispatch,
  discoverBattleActs,
  readiedMovementInitialHoles,
  readiedSpellInitialHoles,
  resolveAttack,
  resolveWeaponMasteryCleaveContinuation,
  resolveBonusActionStandardAction,
  resolveDash,
  resolveDisengage,
  resolveDodge,
  resolveEndTurnCommand,
  resolveCommandApproachAfterMovement,
  resolveCommandApproachCommand,
  resolveCommandDropCommand,
  resolveCommandFleeAfterMovement,
  resolveCommandFleeCommand,
  resolveCommandGrovelCommand,
  resolveGreaseGroundHazardSaveCommand,
  resolveEscapeGrapple,
  resolveEscapeSpellRestraint,
  resolveGrapple,
  resolveHelpAttack,
  resolveHide,
  resolveJumpMovementReplacementCommand,
  resolveMoveCommand,
  resolveMultiattack,
  resolveMartialArtsBonusUnarmedStrike,
  resolveOffHandAttack,
  resolveOpportunityAttackCommand,
  resolveReady,
  resolveReleaseGrappleCommand,
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
  resolveSearch,
  resolveShove,
  resolveShakeAwakeFromSleep,
  resolveStandFromProneCommand,
  resolveStatBlockBonusActionOption,
  resolveUnitFeature,
  subjectAllowedDuringStatBlockMultiattackDispatch,
} from "../battle-reducer.ts";
export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(input, {});
}

export function resolveBattleSubjectInternal(
  input: BattleResolutionInput,
  options: {
    readonly replayingInterruptedProcedure?: boolean;
    readonly suppressedReactionTrigger?: BattleReactionTrigger;
    readonly pendingAttackDamageReductions?: readonly BattlePendingAttackDamageReduction[];
    readonly pendingAttackDamageAdditions?: readonly AttackSpellDamageAddition[];
  },
): BattleResolutionResult {
  const normalizedInputState = normalizeEarlyEndedOngoingFeatures(input.state);
  if (normalizedInputState !== input.state) {
    return resolveBattleSubjectInternal(
      { ...input, state: normalizedInputState },
      options,
    );
  }
  if (
    input.state.interruptStack.length > 0 &&
    options.replayingInterruptedProcedure !== true
  ) {
    const activeFrame = currentInterruptFrame(input.state);
    if (activeFrame !== null) {
      if (activeFrame.kind === "attackDamageContinuationConcentration") {
        if (
          !sameBattleSubject(input.subject, activeFrame.continuation.subject)
        ) {
          return invalidResult(
            input.state,
            "staleSubject",
            "Attack damage Concentration save must be resolved before other battle subjects.",
          );
        }
        return resolveAttackDamageContinuationConcentration({
          state: input.state,
          frame: activeFrame,
          subject: input.subject,
          fills: input.fills,
        });
      }
      if (activeFrame.kind === "replayContinuation") {
        if (
          !sameBattleSubject(input.subject, activeFrame.continuation.subject)
        ) {
          return invalidResult(
            input.state,
            "staleSubject",
            "Interrupted attack replay must be resolved before other battle subjects.",
          );
        }
        return resolveReplayContinuation({
          state: input.state,
          frame: activeFrame,
          subject: input.subject,
          fills: input.fills,
        });
      }
      const activeReaction = activeFrame.frame.activeReaction;
      if (
        activeReaction !== undefined &&
        sameBattleSubject(input.subject, activeReaction.subject)
      ) {
        const reactionResult = resolveBattleSubjectInternal(input, {
          replayingInterruptedProcedure: true,
          ...(activeReaction.suppressedReactionTrigger === undefined
            ? {}
            : {
                suppressedReactionTrigger:
                  activeReaction.suppressedReactionTrigger,
              }),
          ...(activeReaction.pendingAttackDamageReductions === undefined
            ? {}
            : {
                pendingAttackDamageReductions:
                  activeReaction.pendingAttackDamageReductions,
              }),
          ...(activeReaction.pendingAttackDamageAdditions === undefined
            ? {}
            : {
                pendingAttackDamageAdditions:
                  activeReaction.pendingAttackDamageAdditions,
              }),
        });
        return reactionResult.tag === "resolved"
          ? completeActiveReactionProcedure(reactionResult.state)
          : reactionResult;
      }
    }
    return invalidResult(
      input.state,
      "staleSubject",
      "A pending Reaction window must be resolved before the interrupted procedure can continue.",
    );
  }

  const actorId = battleSubjectActorId(input.subject);
  if (
    actorId !== currentActorId(input.state) &&
    !isLegendaryAttackSubject(input.subject) &&
    !isReleaseGrappleSubject(input.subject)
  ) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }
  if (
    isLegendaryAttackSubject(input.subject) &&
    !statBlockLegendaryActionWindowIsOpen(input.state, actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Legendary Actions are available only after another creature's turn ends.",
    );
  }

  if (!input.state.combatants.has(actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }
  const commandPendingEffects = commandPendingEffectsForActor(
    input.state,
    actorId,
  ).filter(
    (effect) =>
      effect.option === "grovel" ||
      effect.option === "drop" ||
      effect.option === "approach" ||
      effect.option === "flee",
  );
  const commandGrovelSubject =
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandGrovel"
      ? input.subject
      : null;
  const commandDropSubject =
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandDrop"
      ? input.subject
      : null;
  const commandApproachSubject =
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandApproach"
      ? input.subject
      : null;
  const commandFleeSubject =
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandFlee"
      ? input.subject
      : null;
  const commandSubject =
    commandGrovelSubject ??
    commandDropSubject ??
    commandApproachSubject ??
    commandFleeSubject;
  if (
    commandPendingEffects.length > 0 &&
    !commandPendingEffects.some(
      (effect) =>
        ((commandGrovelSubject !== null && effect.option === "grovel") ||
          (commandDropSubject !== null && effect.option === "drop") ||
          (commandApproachSubject !== null && effect.option === "approach") ||
          (commandFleeSubject !== null && effect.option === "flee")) &&
        effect.sourceCombatantId === commandSubject?.sourceCombatantId &&
        effect.sourceSpellId === commandSubject?.sourceSpellId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "A pending Command effect must be resolved before other battle subjects.",
    );
  }
  if (
    input.state.currentTurnResources.commandHalt !== null &&
    actorId === currentActorId(input.state) &&
    subjectSuppressedByCommandHalt(input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Halt suppresses Movement, Actions, and Bonus Actions for this turn.",
    );
  }
  if (
    currentActorHasOpenStatBlockMultiattackDispatch(input.state) &&
    !subjectAllowedDuringStatBlockMultiattackDispatch(
      input.state,
      input.subject,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Pending Stat Block Multiattack dispatches must be resolved, Movement may be taken between attacks, or the turn must end before other battle subjects.",
    );
  }

  if (
    subjectRequiresActionEligibility(input.subject) &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const standardActionKind = standardActionKindForSubject(input.subject);
  if (
    isPresentFindFamiliarCombatant(input.state, actorId) &&
    subjectIsOrdinaryAttack(input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Find Familiar familiars can't attack.",
    );
  }
  if (
    standardActionKind !== null &&
    !canSpendAction(input.state.currentTurnResources, standardActionKind)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusActionStandardAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "actionSpell" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !canSpendAction(input.state.currentTurnResources, "magic"))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  if (
    (input.subject.tag === "bonusActionSpell" ||
      input.subject.tag === "bonusActionDashSpell") &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }

  if (
    input.subject.tag === "unitFeature" &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const result = (() => {
    const subject = input.subject;
    if (subject.tag === "action" && subject.action === "attack") {
      return resolveAttack({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
        ...(options.pendingAttackDamageAdditions === undefined
          ? {}
          : {
              pendingAttackDamageAdditions:
                options.pendingAttackDamageAdditions,
            }),
      });
    }
    if (subject.tag === "pactOfTheChainFamiliarAttack") {
      return resolvePactOfTheChainFamiliarReactionAttack({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
        ...(options.pendingAttackDamageAdditions === undefined
          ? {}
          : {
              pendingAttackDamageAdditions:
                options.pendingAttackDamageAdditions,
            }),
      });
    }
    if (subject.tag === "action" && subject.action === "dash") {
      return resolveDash(input);
    }
    if (subject.tag === "action" && subject.action === "disengage") {
      return resolveDisengage(input);
    }
    if (subject.tag === "action" && subject.action === "dodge") {
      return resolveDodge(input);
    }
    if (subject.tag === "action" && subject.action === "helpAttack") {
      return resolveHelpAttack({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "hide") {
      return resolveHide({ ...input, subject: actionHideSubject(subject) });
    }
    if (subject.tag === "action" && subject.action === "multiattack") {
      return resolveMultiattack({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "ready") {
      return resolveReady({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "search") {
      return resolveSearch({ ...input, subject: actionSearchSubject(subject) });
    }
    if (subject.tag === "action" && subject.action === "grapple") {
      return resolveGrapple({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "shove") {
      return resolveShove({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "escapeGrapple") {
      return resolveEscapeGrapple({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "escapeSpellRestraint") {
      return resolveEscapeSpellRestraint({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "shakeAwakeFromSleep") {
      return resolveShakeAwakeFromSleep({ ...input, subject });
    }
    if (subject.tag === "bonusAction" && subject.action === "offHandAttack") {
      return resolveOffHandAttack({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
        ...(options.pendingAttackDamageAdditions === undefined
          ? {}
          : {
              pendingAttackDamageAdditions:
                options.pendingAttackDamageAdditions,
            }),
      });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "martialArtsUnarmedStrike"
    ) {
      return resolveMartialArtsBonusUnarmedStrike({
        ...input,
        subject,
        ...(options.replayingInterruptedProcedure === undefined
          ? {}
          : {
              replayingInterruptedProcedure:
                options.replayingInterruptedProcedure,
            }),
        ...(options.suppressedReactionTrigger === undefined
          ? {}
          : { suppressedReactionTrigger: options.suppressedReactionTrigger }),
        ...(options.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                options.pendingAttackDamageReductions,
            }),
        ...(options.pendingAttackDamageAdditions === undefined
          ? {}
          : {
              pendingAttackDamageAdditions:
                options.pendingAttackDamageAdditions,
            }),
      });
    }
    if (subject.tag === "bonusActionStandardAction") {
      return resolveBonusActionStandardAction({ ...input, subject });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "statBlockActionOption"
    ) {
      return resolveStatBlockBonusActionOption({ ...input, subject });
    }
    if (subject.tag === "actionSpell") {
      return resolveSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
        replayingInterruptedProcedure: options.replayingInterruptedProcedure,
        pendingAttackDamageReductions: options.pendingAttackDamageReductions,
        pendingAttackDamageAdditions: options.pendingAttackDamageAdditions,
      });
    }
    if (subject.tag === "bonusActionSpell") {
      return resolveBonusActionSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (subject.tag === "bonusActionDashSpell") {
      return resolveBonusActionDashSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (subject.tag === "unitFeature") {
      return resolveUnitFeature({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
      return resolveEndTurnCommand(input);
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "commandGrovel"
    ) {
      return resolveCommandGrovelCommand({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "commandDrop") {
      return resolveCommandDropCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "commandApproach"
    ) {
      return resolveCommandApproachCommand({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "commandFlee") {
      return resolveCommandFleeCommand({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "move") {
      return resolveMoveCommand(input);
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "jumpMovementReplacement"
    ) {
      return resolveJumpMovementReplacementCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "greaseGroundHazardSave"
    ) {
      return resolveGreaseGroundHazardSaveCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "disperseFogCloud"
    ) {
      return resolveDisperseFogCloudCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "standFromProne"
    ) {
      return resolveStandFromProneCommand(input);
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseReadiedSpell"
    ) {
      return resolveReleaseReadiedSpellCommand(input, {
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseReadiedMovement"
    ) {
      return resolveReleaseReadiedMovementCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "castTriggeredReactionSpell"
    ) {
      return resolveCastTriggeredReactionSpellCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "castAttackHitBonusActionSpell"
    ) {
      return resolveCastAttackHitBonusActionSpellCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseGrapple"
    ) {
      return resolveReleaseGrappleCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "opportunityAttack"
    ) {
      return resolveOpportunityAttackCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
        pendingAttackDamageReductions: options.pendingAttackDamageReductions,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "creatureFalls"
    ) {
      return {
        tag: "resolved" as const,
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
    const _exhaustive: never = subject;
    return _exhaustive;
  })();
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function resolveDisperseFogCloudCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "disperseFogCloud";
      }
    >;
  },
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Fog Cloud strong-wind dispersal uses no fills.",
    );
  }
  const source = input.state.combatants.get(input.subject.sourceCombatantId);
  const fogCloud = source?.activeEffects.find(
    (effect) =>
      effect.kind === "fogCloudObscurement" &&
      effect.sourceSpellId === input.subject.sourceSpellId &&
      effect.sourceCombatantId === input.subject.sourceCombatantId &&
      effect.areaId === input.subject.areaId,
  );
  if (fogCloud === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Fog Cloud area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    input.subject.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function subjectSuppressedByCommandHalt(subject: BattleSubject): boolean {
  if (
    subject.tag === "action" ||
    subject.tag === "pactOfTheChainFamiliarAttack" ||
    subject.tag === "actionSpell" ||
    subject.tag === "bonusAction" ||
    subject.tag === "bonusActionStandardAction" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "unitFeature"
  ) {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" &&
    (subject.command === "move" ||
      subject.command === "standFromProne" ||
      subject.command === "jumpMovementReplacement")
  );
}

function subjectRequiresActionEligibility(subject: BattleSubject): boolean {
  return (
    subject.tag === "pactOfTheChainFamiliarAttack" ||
    (subject.tag === "action" &&
      (subject.action === "attack" ||
        subject.action === "dash" ||
        subject.action === "disengage" ||
        subject.action === "dodge" ||
        subject.action === "helpAttack" ||
        subject.action === "hide" ||
        subject.action === "multiattack" ||
        subject.action === "ready" ||
        subject.action === "search" ||
        subject.action === "grapple" ||
        subject.action === "escapeGrapple" ||
        subject.action === "escapeSpellRestraint" ||
        subject.action === "shakeAwakeFromSleep"))
  );
}

export function actionHideSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
}): ActionHideSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "hide",
  };
}

export function actionSearchSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
}): ActionSearchSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "search",
  };
}

export function isReleaseGrappleSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
> {
  return (
    subject.tag === "runtimeCommand" && subject.command === "releaseGrapple"
  );
}

function subjectIsOrdinaryAttack(subject: BattleSubject): boolean {
  return (
    subject.tag === "action" &&
    (subject.action === "attack" ||
      subject.action === "multiattack" ||
      subject.action === "grapple" ||
      subject.action === "shove")
  );
}

export function standardActionKindForSubject(
  subject: BattleSubject,
): StandardActionKind | null {
  if (subject.tag === "pactOfTheChainFamiliarAttack") {
    return "attack";
  }
  if (subject.tag !== "action" || isLegendaryAttackSubject(subject)) {
    return null;
  }
  if (subject.action === "shakeAwakeFromSleep") {
    return null;
  }
  return Match.value(subject.action).pipe(
    Match.when("attack", () => "attack" as const),
    Match.when("dash", () => "dash" as const),
    Match.when("disengage", () => "disengage" as const),
    Match.when("dodge", () => "dodge" as const),
    Match.when("helpAttack", () => "help" as const),
    Match.when("hide", () => "hide" as const),
    Match.when("multiattack", () => "attack" as const),
    Match.when("ready", () => "ready" as const),
    Match.when("search", () => "search" as const),
    Match.when("grapple", () => "attack" as const),
    Match.when("shove", () => "attack" as const),
    Match.when("escapeGrapple", () => "attack" as const),
    Match.when("escapeSpellRestraint", () => "utilize" as const),
    Match.exhaustive,
  );
}

export function consumeOrCloseLegendaryActionWindow(
  subject: BattleSubject,
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") return result;
  if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
    const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
    return normalized === result.state
      ? result
      : { ...result, state: normalized, snapshot: snapshotBattle(normalized) };
  }
  const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
  const state = isLegendaryAttackSubject(subject)
    ? consumeLegendaryActionWindow(normalized)
    : closeLegendaryActionWindow(normalized);
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}

export function openBattleReactionWindow(input: {
  readonly state: BattleState;
  readonly frame: BattleReactionFrame;
}): BattleState {
  return {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      reactionInterruptFrame(input.frame),
    ],
  };
}

export function reactionInterruptFrame(
  frame: BattleReactionFrame,
): BattleReactionInterruptFrame {
  return { kind: "reaction", frame };
}

export function openCreatureFallsReactionWindow(input: {
  readonly state: BattleState;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
}): BattleResolutionResult {
  const reactionWindow = maybeOpenReactionWindow(
    input.state,
    {
      trigger: "creatureFalls",
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
      continuation: {
        kind: "resolved",
        subject: {
          tag: "runtimeCommand",
          actorId: currentActorId(input.state),
          command: "creatureFalls",
          fallingCreatureId: input.fallingCreatureId,
        },
      },
    },
    undefined,
  );
  return (
    reactionWindow ?? {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    }
  );
}

export function resolveFeatherFallLanding(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
}): BattleFeatherFallLandingResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Feather Fall landing target is not in this battle.",
    };
  }
  const cleanup = featherFallLandingCleanupForCombatant(target);
  if (cleanup.tag === "unmitigated") {
    return {
      tag: "unmitigated",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      targetId: input.targetId,
      fallDamagePrevented: false,
      fallingPronePrevented: false,
    };
  }
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.targetId,
      cleanup.combatant,
    ),
  };
  return {
    tag: "mitigated",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    targetId: input.targetId,
    fallDamagePrevented: true,
    fallingPronePrevented: true,
  };
}

export function resolveBattleReaction(input: {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "reactionDecision" }>;
}): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  if (frame === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Reaction window is pending.",
    );
  }
  if (input.fill.holeId !== REACTION_DECISION_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision fill does not match the pending Reaction window.",
    );
  }

  const reactor = input.state.combatants.get(input.fill.value.reactorId);
  if (
    reactor === undefined ||
    !unofferedEligibleReactors(frame).includes(input.fill.value.reactorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision reactor is not eligible for the pending Reaction window.",
    );
  }

  if (input.fill.value.kind === "resolve") {
    const choice = admittedReactionChoice(frame, input.fill.value);
    if (choice === null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Reaction choice is not admitted for the pending Reaction window.",
      );
    }
    if (choice.kind === "reactionRollOrDamageReduction") {
      return resolveReactionRollOrDamageReduction({
        state: input.state,
        frame,
        choice,
        selection: input.fill.value.choice,
      });
    }
    if (
      choice.kind !== "castAttackHitBonusActionSpell" &&
      !combatantCanTakeReactions(reactor)
    ) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Selected reactor has no Reaction available.",
      );
    }
    const activeFrame = {
      ...frame,
      activeReaction: {
        reactorId: input.fill.value.reactorId,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
    };
    const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
    const stateWithActiveReaction = {
      ...input.state,
      interruptStack: [
        ...stackWithoutCurrent,
        reactionInterruptFrame(activeFrame),
      ],
    };
    const activeState =
      choice.kind === "castAttackHitBonusActionSpell"
        ? stateWithActiveReaction
        : spendReaction(stateWithActiveReaction, input.fill.value.reactorId);
    const reactionResult = resolveBattleSubjectInternal(
      {
        state: activeState,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
      { replayingInterruptedProcedure: true },
    );
    return reactionResult.tag === "resolved"
      ? completeActiveReactionProcedure(reactionResult.state)
      : reactionResult;
  }

  const updatedFrame = {
    ...frame,
    offeredReactors: [...frame.offeredReactors, input.fill.value.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(updatedFrame);
  const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? {
          ...input.state,
          interruptStack: stackWithoutCurrent,
        }
      : {
          ...input.state,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(updatedFrame),
          ],
        };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? completeResolvedActiveReactionIfPending(
        resumeInterruptedProcedure(
          nextState,
          frame.continuation,
          frame.trigger,
        ),
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

export function spendReaction(
  state: BattleState,
  reactorId: CombatantId,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      reactionAvailable: false,
    }),
  };
}

export function resolveReactionRollOrDamageReduction(input: {
  readonly state: BattleState;
  readonly frame: BattleReactionFrame;
  readonly choice: BattleReactionProcedureModifierChoice;
  readonly selection: BattleReactionProcedureSelection;
}): BattleResolutionResult {
  if (input.selection.kind !== "reactionRollOrDamageReduction") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction modifier selection does not match the admitted choice.",
    );
  }
  const reductionRoll = reactionModifierReductionRoll(
    input.choice.choice,
    input.selection.fills,
  );
  if (reductionRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", reductionRoll.message);
  }
  const reduction = reductionRoll.value;
  if (
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger !== "attackHit"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions must be chosen when the attack roll hits.",
    );
  }
  if (
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger === "attackHit"
  ) {
    const reactor = input.state.combatants.get(input.choice.reactorId);
    if (
      input.choice.reactorId !== input.frame.targetId ||
      reactor?.origin.kind !== "character"
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage reductions require the damaged character as the reactor.",
      );
    }
  }
  if (
    input.choice.choice.kind === "damageRollReduction" &&
    (input.frame.trigger !== "attackDamage" ||
      input.frame.continuation.damageEvent.kind !== "rolledDamage")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Damage-roll reductions require unresolved rolled attack damage.",
    );
  }
  const spent = spendReactionModifierResource(
    spendReaction(input.state, input.choice.reactorId),
    input.choice.reactorId,
    input.choice.choice,
  );
  const updatedFrame = reactionFrameAfterModifier(
    input.frame,
    input.choice.reactorId,
    input.choice.choice,
    reduction,
  );
  const completedFrame: BattleReactionFrame = {
    ...updatedFrame,
    offeredReactors: [...updatedFrame.offeredReactors, input.choice.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(completedFrame);
  const stackWithoutCurrent = spent.interruptStack.slice(0, -1);
  const nextState =
    remainingReactors.length === 0
      ? { ...spent, interruptStack: stackWithoutCurrent }
      : {
          ...spent,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(completedFrame),
          ],
        };

  return remainingReactors.length === 0
    ? completeResolvedActiveReactionIfPending(
        resumeInterruptedProcedure(
          nextState,
          completedFrame.continuation,
          completedFrame.trigger,
        ),
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

export function resolveCastTriggeredReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  >,
): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  const activeReaction = frame?.activeReaction;
  const reactor = input.state.combatants.get(input.subject.reactorId);
  const invocation =
    reactor?.origin.kind === "character"
      ? supportedSpellActs(reactor, input.state).find(
          (candidate) =>
            (candidate.procedure === "shieldReaction" ||
              candidate.procedure === "saveGatedDamage" ||
              candidate.procedure === "featherFallMitigation") &&
            supportedSpellInvocationMatchesRef(
              candidate,
              input.subject.invocation,
            ),
        )
      : undefined;
  if (
    (frame?.trigger !== "attackHit" &&
      frame?.trigger !== "spellCast" &&
      frame?.trigger !== "afterDamage" &&
      frame?.trigger !== "creatureFalls") ||
    activeReaction === undefined ||
    activeReaction.reactorId !== input.subject.reactorId ||
    !sameBattleSubject(activeReaction.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell casting requires an active matching Reaction window.",
    );
  }
  if (
    reactor?.origin.kind !== "character" ||
    (invocation?.procedure !== "shieldReaction" &&
      invocation?.procedure !== "saveGatedDamage" &&
      invocation?.procedure !== "featherFallMitigation")
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Triggered Reaction spell command requires a supported prepared Reaction spell.",
    );
  }
  if (!spellHasAvailableSpend(reactor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell no longer has its required runtime spell resource.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(reactor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (
    !triggeredReactionSpellTurnResourceAvailable(
      input.state,
      input.subject.reactorId,
      invocation,
      frame,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (invocation.procedure === "saveGatedDamage") {
    if (!isPreparedSlottedSaveGatedDamageInvocation(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Triggered Reaction spell command requires a prepared slotted Reaction spell.",
      );
    }
    return resolveHellishRebukeReactionSpellCommand({
      ...input,
      frame,
      invocation,
    });
  }
  if (invocation.procedure === "featherFallMitigation") {
    return resolveFeatherFallReactionSpellCommand({
      ...input,
      frame,
      invocation,
    });
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Triggered Reaction Shield spell does not accept table fills.",
    );
  }
  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, input.subject.reactorId)
    : input.state;
  const effected = applyShieldReactionSpellActiveEffect(
    castingState,
    input.subject.reactorId,
    invocation,
  );
  const slotted = expendSpellSlot(
    effected,
    input.subject.reactorId,
    invocation.resource.slotLevel,
  );
  const nextTurnResources =
    input.subject.reactorId === currentActorId(slotted)
      ? markSpellSlotExpendedThisTurn(slotted.currentTurnResources)
      : Either.right(slotted.currentTurnResources);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function isPreparedSlottedSaveGatedDamageInvocation(
  invocation: Extract<
    ReturnType<typeof supportedSpellActs>[number],
    { readonly procedure: "saveGatedDamage" }
  >,
): invocation is Extract<
  ReturnType<typeof supportedSpellActs>[number],
  { readonly procedure: "saveGatedDamage" }
> & {
  readonly access: { readonly tag: "prepared" };
  readonly resource: SpellSlotInvocationResource;
} {
  return (
    invocation.access.tag === "prepared" &&
    invocation.resource.tag === "spellSlot"
  );
}

function resolveFeatherFallReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly frame: BattleReactionFrame;
    readonly invocation: Extract<
      ReturnType<typeof supportedSpellActs>[number],
      { readonly procedure: "featherFallMitigation" }
    >;
  },
): BattleResolutionResult {
  if (
    input.frame.trigger !== "creatureFalls" ||
    !featherFallReactionSpellMatchesTrigger(input.invocation, input.frame)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Feather Fall requires a matching falling Reaction trigger.",
    );
  }
  const fillSet = spellFillSet(input.fills, input.invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (
    fillSet.targetId !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Feather Fall uses only falling target-list fills.",
    );
  }
  if (fillSet.targetList === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetListHole(
        input.state,
        input.subject.reactorId,
        input.invocation,
      ),
    ]);
  }
  const targetValidation = validateSpellTargetList(
    input.state,
    input.subject.reactorId,
    input.invocation,
    fillSet.targetList.targetIds,
    fillSet.targetList.spatialFacts,
  );
  if (targetValidation !== null) {
    return invalidResult(input.state, "invalidFill", targetValidation);
  }
  const castingState = spellRequiresVerbal(input.invocation.spell)
    ? revealHidden(input.state, input.subject.reactorId)
    : input.state;
  const effected: BattleState = fillSet.targetList.targetIds.reduce(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      return target === undefined
        ? state
        : {
            ...state,
            combatants: new Map(state.combatants).set(targetId, {
              ...target,
              activeEffects: [
                ...target.activeEffects,
                input.invocation.activeEffect,
              ],
            }),
          };
    },
    castingState,
  );
  const slotted = expendSpellSlot(
    effected,
    input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources =
    input.subject.reactorId === currentActorId(slotted)
      ? markSpellSlotExpendedThisTurn(slotted.currentTurnResources)
      : Either.right(slotted.currentTurnResources);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveHellishRebukeReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly frame: BattleReactionFrame;
    readonly invocation: Extract<
      ReturnType<typeof supportedSpellActs>[number],
      { readonly procedure: "saveGatedDamage" }
    > & {
      readonly access: { readonly tag: "prepared" };
      readonly resource: SpellSlotInvocationResource;
    };
  },
): BattleResolutionResult {
  if (
    input.frame.trigger !== "afterDamage" ||
    input.frame.damagedId !== input.subject.reactorId ||
    !hellishRebukeReactionSpellMatchesTrigger(input.invocation, input.frame)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hellish Rebuke requires a matching after-damage Reaction trigger.",
    );
  }
  const fillSet = spellFillSet(input.fills, input.invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackRoll !== undefined
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Hellish Rebuke targets the creature from the after-damage trigger.",
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.state,
    input.subject.reactorId,
    input.invocation,
  );
  if (fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.state, input.subject, [savingThrowHole]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    fillSet.savingThrowOutcomes,
    savingThrowHole,
    input.state,
    input.subject.reactorId,
    input.frame.damageSourceId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(input.state, "invalidFill", savingThrowValidation);
  }
  const savingThrowOutcome = fillSet.savingThrowOutcomes.outcomes[0];
  if (savingThrowOutcome === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Hellish Rebuke requires the damaging creature's Saving Throw outcome.",
    );
  }
  const saveDamageResult = saveGateDamageResultForOutcome(
    input.state,
    input.frame.damageSourceId,
    input.invocation,
    savingThrowOutcome.succeeded,
  );
  if (fillSet.damageRoll === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const target = input.state.combatants.get(input.frame.damageSourceId);
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hellish Rebuke target is no longer in the battle.",
    );
  }
  const damageAmount = spellDamageAmountForTarget(
    target,
    input.invocation,
    fillSet.damageRoll,
    saveDamageResult,
  );
  const concentrationSave = concentrationSavingThrowHole(target, damageAmount);
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : fillSet.concentrationSavingThrows.find(
          (fill) => fill.holeId === concentrationSave.holeId,
        );
  if (concentrationSave !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationSave]);
  }
  if (
    concentrationSave === null &&
    fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for the damaged Hellish Rebuke target.",
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.reactorId,
    target,
    damageAmount,
  });
  const damageDispositionHoles =
    damageDispositionHole === null ? [] : [damageDispositionHole];
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      damageDispositionHole,
    ]);
  }
  const hideousLaughterSaveCheck = hideousLaughterDamageRepeatSaveFillCheck({
    target,
    damageAmount,
    fills: fillSet.hideousLaughterDamageRepeatSaves,
  });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  if (hideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  const castingState = spellRequiresVerbal(input.invocation.spell)
    ? revealHidden(input.state, input.subject.reactorId)
    : input.state;
  const damaged = applySpellDamage(
    castingState,
    input.frame.damageSourceId,
    input.invocation,
    fillSet.damageRoll,
    false,
    {
      concentrationSavingThrow: concentrationFill,
      saveDamageResult,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHoles,
        fillSet.damageDispositions,
        input.frame.damageSourceId,
      ),
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      damageSourceId: input.subject.reactorId,
    },
  );
  const slotted = expendSpellSlot(
    damaged,
    input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources =
    input.subject.reactorId === currentActorId(slotted)
      ? markSpellSlotExpendedThisTurn(slotted.currentTurnResources)
      : Either.right(slotted.currentTurnResources);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return openAfterDamageSequenceReactionWindow({
    state: nextState,
    subject: input.subject,
    events: [
      {
        damageSourceId: input.subject.reactorId,
        damagedId: input.frame.damageSourceId,
        damageAmount: toDamageAmount(damageAmount),
        reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
          facts: input.frame.reactionSpellTargetFacts,
          damagedId: input.frame.damageSourceId,
          damageSourceId: input.subject.reactorId,
        }),
      },
    ],
    suppressedReactionTrigger: undefined,
  });
}

type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AttackHitBonusActionSpellCommandInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  };
type AttackHitBonusActionSpellInvocation = Extract<
  ReturnType<typeof supportedSpellActs>[number],
  {
    readonly procedure:
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave";
  }
>;
type AttackHitSaveGatedConditionInvocation = Extract<
  AttackHitBonusActionSpellInvocation,
  { readonly procedure: "afterHitSaveGatedCondition" }
>;
type AttackHitSaveGatedConditionFillSet = Extract<
  ReturnType<typeof spellFillSet>,
  { readonly tag: "ok" }
>;

export function resolveCastAttackHitBonusActionSpellCommand(
  input: AttackHitBonusActionSpellCommandInput,
): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  const activeReaction = frame?.activeReaction;
  const actor = input.state.combatants.get(input.subject.casterId);
  const target =
    frame?.trigger === "attackHit"
      ? input.state.combatants.get(frame.targetId)
      : undefined;
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor, input.state).find(
          (candidate) =>
            (candidate.procedure === "afterHitDamage" ||
              candidate.procedure === "afterHitSaveGatedCondition" ||
              candidate.procedure === "afterHitTimedDamageAndSave") &&
            supportedSpellInvocationMatchesRef(
              candidate,
              input.subject.invocation,
            ),
        )
      : undefined;
  if (
    frame?.trigger !== "attackHit" ||
    frame.continuation.kind !== "replay" ||
    activeReaction === undefined ||
    activeReaction.reactorId !== input.subject.casterId ||
    !sameBattleSubject(activeReaction.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell casting requires an active matching attack-hit window.",
    );
  }
  if (
    actor?.origin.kind !== "character" ||
    (invocation?.procedure !== "afterHitDamage" &&
      invocation?.procedure !== "afterHitSaveGatedCondition" &&
      invocation?.procedure !== "afterHitTimedDamageAndSave")
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Attack-hit Bonus Action spell command requires a supported prepared after-hit spell.",
    );
  }
  if (!combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell caster can no longer take actions.",
    );
  }
  if (target === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Attack-hit Bonus Action spell target is not in this battle.",
    );
  }
  if (
    frame.attackerId !== input.subject.casterId ||
    currentActorId(input.state) !== input.subject.casterId ||
    frame.continuation.subject.tag === "bonusAction" ||
    !afterHitSpellMatchesAttackTrigger(invocation, frame.attackHitTriggerKind)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is not available for this hit.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell no longer has its required runtime spell resource.",
    );
  }
  const fillValidation = attackHitBonusActionSpellFillValidation(
    input,
    invocation,
    target,
  );
  if (fillValidation.tag === "invalid") {
    return fillValidation.result;
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is no longer available for this turn.",
    );
  }
  const spellCastFrame = {
    trigger: "spellCast",
    casterId: input.subject.casterId,
    spellId: invocation.spell.id,
    targetIds: [target.combatantId],
    continuation: {
      kind: "replay",
      subject: input.subject,
      fills: input.fills,
    },
  } satisfies BattleReactionFrameInput;
  const spellCastReactionWindow =
    input.suppressedReactionTrigger === undefined
      ? maybeOpenReactionWindowWithChoices(
          input.state,
          spellCastFrame,
          input.suppressedReactionTrigger,
          triggeredReactionSpellChoices(input.state, spellCastFrame),
        )
      : null;
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    if (fillValidation.tag !== "validSaveGated") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit save-gated condition spell fills were not parsed.",
      );
    }
    return resolveCastAttackHitSaveGatedConditionSpellCommand(
      input,
      invocation,
      target,
      fillValidation.fillSet,
    );
  }
  const spentBonusAction = spendActivationResource(
    input.state.currentTurnResources,
    { kind: "bonusAction" },
  );
  if (Either.isLeft(spentBonusAction)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    spentBonusAction.right,
  );
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    {
      ...input.state,
      currentTurnResources: nextTurnResources.right,
    },
    input.subject.casterId,
    invocation.resource.slotLevel,
  );
  const targetCreatureType = battleCreatureType(target);
  const conditionalBonusApplies =
    invocation.procedure === "afterHitDamage" &&
    targetCreatureType !== null &&
    invocation.conditionalBonusDamage.targetCreatureTypes.includes(
      targetCreatureType,
    );
  const damage =
    invocation.procedure === "afterHitTimedDamageAndSave"
      ? invocation.immediateDamage
      : invocation.damage;
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: input.subject.casterId,
    damage: {
      expr: {
        ...damage.expr,
        dice:
          damage.expr.dice +
          (conditionalBonusApplies && invocation.procedure === "afterHitDamage"
            ? invocation.conditionalBonusDamage.expr.dice
            : 0),
      },
      damageType: damage.damageType,
    },
  };
  const nextFrame = {
    ...frame,
    continuation: {
      ...frame.continuation,
      attackDamageAdditions: [
        ...(frame.continuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
  const effected =
    invocation.procedure === "afterHitTimedDamageAndSave"
      ? applyAfterHitTimedDamageAndSaveSpellEffect(
          slotted,
          target.combatantId,
          invocation,
        )
      : slotted;
  const nextState = {
    ...effected,
    interruptStack: [
      ...effected.interruptStack.slice(0, -1),
      reactionInterruptFrame(nextFrame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.subject,
    casterId: input.subject.casterId,
    spellId: invocation.spell.id,
    targetIds: [target.combatantId],
    suppressedReactionTrigger: input.suppressedReactionTrigger,
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function maybeOpenPostCastReadySpellCastWindow(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly casterId: CombatantId;
  readonly spellId: string;
  readonly targetIds: readonly CombatantId[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  return input.suppressedReactionTrigger !== "spellCast"
    ? maybeOpenReactionWindowWithChoices(
        input.state,
        {
          trigger: "spellCast",
          casterId: input.casterId,
          spellId: input.spellId,
          targetIds: input.targetIds,
          continuation: {
            kind: "resolved",
            subject: input.subject,
          },
        },
        input.suppressedReactionTrigger,
        [
          ...readiedSpellReactionChoices(input.state, "spellCast"),
          ...readiedMovementReactionChoices(input.state, "spellCast"),
        ],
      )
    : null;
}

function attackHitBonusActionSpellFillValidation(
  input: BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject>,
  invocation: AttackHitBonusActionSpellInvocation,
  target: BattleCreatureState,
):
  | { readonly tag: "validNonSave" }
  | {
      readonly tag: "validSaveGated";
      readonly fillSet: AttackHitSaveGatedConditionFillSet;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  if (invocation.procedure !== "afterHitSaveGatedCondition") {
    return input.fills.length === 0
      ? { tag: "validNonSave" }
      : {
          tag: "invalid",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Attack-hit Bonus Action spell does not accept table fills.",
          ),
        };
  }
  const fillSetResult = attackHitSaveGatedConditionFillSet(
    input,
    invocation,
    target,
  );
  return fillSetResult.tag === "invalid"
    ? fillSetResult
    : { tag: "validSaveGated", fillSet: fillSetResult.fillSet };
}

function attackHitSaveGatedConditionFillSet(
  input: BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject>,
  invocation: AttackHitSaveGatedConditionInvocation,
  target: BattleCreatureState,
):
  | {
      readonly tag: "ok";
      readonly fillSet: AttackHitSaveGatedConditionFillSet;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return {
      tag: "invalid",
      result: invalidResult(input.state, "invalidFill", fillSet.message),
    };
  }
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit save-gated condition spells only use Saving Throw outcome fills.",
      ),
    };
  }
  if (fillSet.savingThrowOutcomes === undefined) {
    return { tag: "ok", fillSet };
  }
  const validation = validateAttackHitSavingThrowOutcome(
    fillSet.savingThrowOutcomes,
    target.combatantId,
  );
  return validation === null
    ? { tag: "ok", fillSet }
    : {
        tag: "invalid",
        result: invalidResult(input.state, "invalidFill", validation),
      };
}

function resolveCastAttackHitSaveGatedConditionSpellCommand(
  input: AttackHitBonusActionSpellCommandInput,
  invocation: AttackHitSaveGatedConditionInvocation,
  target: BattleCreatureState,
  fillSet: AttackHitSaveGatedConditionFillSet,
): BattleResolutionResult {
  const savingThrowHole = attackHitSavingThrowOutcomeHole(
    input.state,
    input.subject.casterId,
    target,
    invocation,
  );
  if (fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.state, input.subject, [savingThrowHole]);
  }

  const failedTargets = fillSet.savingThrowOutcomes.outcomes[0]!.succeeded
    ? []
    : [target.combatantId];
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: target.combatantId,
        sourceSpellId: invocation.spell.id,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.state,
    actorId: input.subject.casterId,
    invocation,
    errorState: input.state,
    startConcentration: failedTargets.length > 0,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.subject.casterId,
    failedTargets,
    invocation,
  );
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: effected,
    subject: input.subject,
    casterId: input.subject.casterId,
    spellId: invocation.spell.id,
    targetIds: [target.combatantId],
    suppressedReactionTrigger: input.suppressedReactionTrigger,
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function attackHitSavingThrowOutcomeHole(
  state: BattleState,
  casterId: CombatantId,
  target: BattleCreatureState,
  invocation: Extract<
    ReturnType<typeof supportedSpellActs>[number],
    { readonly procedure: "afterHitSaveGatedCondition" }
  >,
) {
  const base = spellSavingThrowOutcomeHole(state, casterId, invocation);
  return {
    ...base,
    label: `${invocation.spell.name} Saving Throw outcome`,
    targetRollModes: [
      ...base.targetRollModes,
      ...(creatureSizeIsLargeOrLarger(target.size)
        ? [{ targetId: target.combatantId, rollMode: "advantage" as const }]
        : []),
    ],
  };
}

function validateAttackHitSavingThrowOutcome(
  value: BattleSpellSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Single-target save-gate spell outcomes must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Single-target save-gate spell Saving Throw outcome must match the triggering hit target.";
}

function creatureSizeIsLargeOrLarger(size: Size): boolean {
  return size === "large" || size === "huge" || size === "gargantuan";
}

function afterHitSpellMatchesAttackTrigger(
  invocation: Extract<
    ReturnType<typeof supportedSpellActs>[number],
    {
      readonly procedure:
        | "afterHitDamage"
        | "afterHitSaveGatedCondition"
        | "afterHitTimedDamageAndSave";
    }
  >,
  triggerKind: BattleAttackHitTriggerKind,
): boolean {
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave"
  ) {
    return triggerKind === "meleeWeapon" || triggerKind === "unarmedStrike";
  }
  return triggerKind === "meleeWeapon" || triggerKind === "rangedWeapon";
}

export function completeResolvedActiveReactionIfPending(
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") {
    return result;
  }
  return currentReactionFrame(result.state)?.activeReaction === undefined
    ? result
    : completeActiveReactionProcedure(result.state);
}

export function reactionFrameAfterModifier(
  frame: BattleReactionFrame,
  reactorId: CombatantId,
  choice: BattleReactionModifierChoice,
  reduction: number,
): BattleReactionFrame {
  if (frame.trigger === "attackHit" && choice.kind === "attackRollReduction") {
    return {
      ...frame,
      attackRoll: {
        ...frame.attackRoll,
        total: frame.attackRoll.total - reduction,
      },
      continuation:
        frame.continuation.kind === "replay"
          ? {
              ...frame.continuation,
              fills: reactionModifiedAttackRollFills(
                frame.continuation.fills,
                frame.attackRoll.total - reduction,
              ),
            }
          : frame.continuation,
    };
  }
  if (
    frame.trigger === "attackHit" &&
    choice.kind === "attackDamageReduction" &&
    frame.continuation.kind === "replay"
  ) {
    return {
      ...frame,
      continuation: {
        ...frame.continuation,
        attackDamageReductions: [
          ...(frame.continuation.attackDamageReductions ?? []),
          {
            reactorId,
            unitId: choice.unitId,
            label: choice.label,
            reduction: choice.reduction,
            reductionAmount: reduction,
            ...(choice.zeroDamageRedirect === undefined
              ? {}
              : { zeroDamageRedirect: choice.zeroDamageRedirect }),
          },
        ],
      },
    };
  }
  if (
    frame.trigger === "attackDamage" &&
    choice.kind === "damageRollReduction"
  ) {
    const nextDamageEntries = damageAmountByTypeEntriesAfterScalarReduction(
      attackDamageEventEntries(frame.continuation.damageEvent),
      choice.reduction.kind,
      reduction,
    );
    const nextDamageEvent =
      frame.continuation.damageEvent.kind === "rolledDamage"
        ? ({
            kind: "rolledDamage" as const,
            damageRollByType: nextDamageEntries,
          } satisfies BattleAttackDamageEvent)
        : ({
            kind: "aggregateDamage" as const,
            damageByTypeBeforeTargetAdjustments: nextDamageEntries,
          } satisfies BattleAttackDamageEvent);
    return {
      ...frame,
      continuation: {
        ...frame.continuation,
        damageEvent: nextDamageEvent,
      },
    };
  }
  return frame;
}

export function reactionModifiedAttackRollFills(
  fills: readonly BattleFill[],
  total: number,
): readonly BattleFill[] {
  return fills.flatMap<BattleFill>((fill) => {
    if (fill.kind === "attackRoll") {
      return [{ ...fill, value: { ...fill.value, total } }];
    }
    return fill.kind === "rolledDice" ||
      fill.kind === "concentrationSavingThrow"
      ? []
      : [fill];
  });
}

export function admittedReactionChoice(
  frame: BattleReactionFrame,
  decision: Extract<BattleReactionDecision, { readonly kind: "resolve" }>,
): BattleReactionProcedureChoice | null {
  return (
    frame.choices.find(
      (choice) =>
        choice.kind === decision.choice.kind &&
        choice.reactorId === decision.reactorId &&
        sameReactionProcedureChoice(choice, decision.choice),
    ) ?? null
  );
}

export function sameReactionProcedureChoice(
  choice: BattleReactionProcedureChoice,
  decisionChoice: BattleReactionProcedureSelection,
): boolean {
  if (
    choice.kind === "reactionRollOrDamageReduction" &&
    decisionChoice.kind === "reactionRollOrDamageReduction"
  ) {
    return (
      choice.choice.unitId === decisionChoice.unitId &&
      choice.choice.kind === decisionChoice.modifierKind
    );
  }
  if (
    choice.kind === "releaseReadiedSpell" &&
    decisionChoice.kind === "releaseReadiedSpell"
  ) {
    return choice.readiedSpellCasterId === decisionChoice.readiedSpellCasterId;
  }
  if (
    choice.kind === "releaseReadiedMovement" &&
    decisionChoice.kind === "releaseReadiedMovement"
  ) {
    return (
      choice.readiedMovementActorId === decisionChoice.readiedMovementActorId
    );
  }
  if (
    choice.kind === "castTriggeredReactionSpell" &&
    decisionChoice.kind === "castTriggeredReactionSpell"
  ) {
    return sameSpellInvocationRef(choice.invocation, decisionChoice.invocation);
  }
  if (
    choice.kind === "castAttackHitBonusActionSpell" &&
    decisionChoice.kind === "castAttackHitBonusActionSpell"
  ) {
    return sameSpellInvocationRef(choice.invocation, decisionChoice.invocation);
  }
  return (
    choice.kind === "opportunityAttack" &&
    decisionChoice.kind === "opportunityAttack" &&
    choice.reactorId === decisionChoice.reactorId
  );
}

export function completeActiveReactionProcedure(
  state: BattleState,
): BattleResolutionResult {
  const frame = currentReactionFrame(state);
  const activeReaction = frame?.activeReaction;
  if (frame === null || activeReaction === undefined) {
    return invalidResult(
      state,
      "staleSubject",
      "No active Reaction procedure is pending completion.",
    );
  }
  const { activeReaction: _completedReaction, ...inactiveFrame } = frame;
  const completedFrame: BattleReactionFrame = {
    ...inactiveFrame,
    offeredReactors: [...frame.offeredReactors, activeReaction.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(completedFrame);
  const stackWithoutCurrent = state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? { ...state, interruptStack: stackWithoutCurrent }
      : {
          ...state,
          interruptStack: [
            ...stackWithoutCurrent,
            reactionInterruptFrame(completedFrame),
          ],
        };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? completeResolvedActiveReactionIfPending(
        resumeInterruptedProcedure(
          nextState,
          frame.continuation,
          frame.trigger,
        ),
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

export function suppressReactionTriggerForActiveReaction(
  state: BattleState,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleState {
  const frame = currentReactionFrame(state);
  if (frame?.activeReaction === undefined) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      reactionInterruptFrame({
        ...frame,
        activeReaction: {
          ...frame.activeReaction,
          suppressedReactionTrigger,
        },
      }),
    ],
  };
}

export function resumeInterruptedProcedure(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleResolutionResult {
  if (continuation.kind === "resolved") {
    return {
      tag: "resolved",
      state,
      snapshot: snapshotBattle(state),
    };
  }
  if (continuation.kind === "afterDamageSequence") {
    return openAfterDamageSequenceReactionWindow({
      state,
      subject: continuation.subject,
      events: continuation.events,
      suppressedReactionTrigger:
        suppressedReactionTrigger === "afterDamage"
          ? undefined
          : suppressedReactionTrigger,
    });
  }
  if (continuation.kind === "weaponMasteryCleave") {
    return resolveWeaponMasteryCleaveContinuation({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      suppressedReactionTrigger:
        suppressedReactionTrigger === "afterDamage"
          ? undefined
          : suppressedReactionTrigger,
    });
  }
  if (continuation.kind === "movement") {
    const nextState = applyBattleMovement(state, continuation.movement);
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (continuation.kind === "movementThenAfterDamageSequence") {
    return openAfterDamageSequenceReactionWindow({
      state: applyBattleMovement(state, continuation.movement),
      subject: continuation.subject,
      events: continuation.events,
      suppressedReactionTrigger:
        suppressedReactionTrigger === "afterDamage"
          ? undefined
          : suppressedReactionTrigger,
    });
  }
  if (continuation.kind === "commandApproachMovement") {
    return resolveCommandApproachAfterMovement({
      state,
      subject: continuation.subject,
      movement: continuation.movement,
      movedWithinFiveFeetOfCaster: continuation.movedWithinFiveFeetOfCaster,
      endTurnFills: continuation.endTurnFills,
    });
  }
  if (continuation.kind === "commandFleeMovement") {
    return resolveCommandFleeAfterMovement({
      state,
      subject: continuation.subject,
      movement: continuation.movement,
      endTurnFills: continuation.endTurnFills,
    });
  }
  if (continuation.kind === "attackDamage") {
    const damageAmount = attackDamageContinuationAmount(state, continuation);
    if (damageAmount === null) {
      return invalidResult(
        state,
        "invalidFill",
        "Attack damage target is no longer available.",
      );
    }
    const concentrationPending = attackDamageContinuationConcentrationHole(
      state,
      continuation,
    );
    if (
      concentrationPending !== null &&
      continuation.concentrationSavingThrow === undefined
    ) {
      const {
        concentrationSavingThrow: _pendingConcentrationSavingThrow,
        ...continuationWithoutConcentration
      } = continuation;
      const pendingState = {
        ...state,
        interruptStack: [
          ...state.interruptStack,
          attackDamageContinuationConcentrationFrame(
            continuationWithoutConcentration,
            suppressedReactionTrigger,
          ),
        ],
      };
      return needsHolesResult(pendingState, continuation.subject, [
        concentrationPending,
      ]);
    }
    const damagedState = applyAttackDamageAmount(
      state,
      continuation.attackerId,
      continuation.targetId,
      damageAmount,
      continuation.deathFailuresAtZeroHp,
      continuation.damageDisposition,
      continuation.attackDamageRiders,
      continuation.weaponDamageDiceRollChoice,
      continuation.concentrationSavingThrow,
    );
    return openAfterDamageSequenceReactionWindow({
      state: damagedState,
      subject: continuation.subject,
      events: [
        {
          damageSourceId: continuation.attackerId,
          damagedId: continuation.targetId,
          damageAmount,
          reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
            facts: attackDamageContinuationTargetSpatialFacts(continuation),
            damagedId: continuation.targetId,
            damageSourceId: continuation.attackerId,
          }),
        },
      ],
      suppressedReactionTrigger,
    });
  }

  return resolveReplayContinuationFromState(
    state,
    continuation,
    suppressedReactionTrigger,
    continuation.fills,
  );
}

export function openAfterDamageSequenceReactionWindow(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly events: readonly BattleAfterDamageEvent[];
  readonly suppressedReactionTrigger: BattleReactionTrigger | undefined;
}): BattleResolutionResult {
  const [event, ...remainingEvents] = input.events;
  if (event === undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  const reactionWindow = maybeOpenReactionWindow(
    input.state,
    {
      trigger: "afterDamage",
      damageSourceId: event.damageSourceId,
      damagedId: event.damagedId,
      damageAmount: event.damageAmount,
      reactionSpellTargetFacts: event.reactionSpellTargetFacts,
      continuation: {
        kind: "afterDamageSequence",
        subject: input.subject,
        events: remainingEvents,
      },
    },
    input.suppressedReactionTrigger,
  );
  return (
    reactionWindow ??
    openAfterDamageSequenceReactionWindow({
      ...input,
      events: remainingEvents,
    })
  );
}

function attackDamageContinuationTargetSpatialFacts(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): readonly BattleTargetSpatialFact[] {
  return (
    continuation.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice",
    )?.spatialFacts ?? []
  );
}

export function replayContinuationFrame(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleReplayContinuationFrame {
  return {
    kind: "replayContinuation",
    continuation,
    suppressedReactionTrigger,
  };
}

export function resolveReplayContinuation(input: {
  readonly state: BattleState;
  readonly frame: BattleReplayContinuationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resolveReplayContinuationFromState(
    stateWithoutFrame,
    input.frame.continuation,
    input.frame.suppressedReactionTrigger,
    input.fills,
  );
}

export function resolveReplayContinuationFromState(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  suppressedReactionTrigger: BattleReactionTrigger,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  const result = resolveBattleSubjectInternal(
    {
      state,
      subject: continuation.subject,
      fills,
    },
    {
      replayingInterruptedProcedure: true,
      suppressedReactionTrigger,
      ...(continuation.attackDamageReductions === undefined
        ? {}
        : {
            pendingAttackDamageReductions: continuation.attackDamageReductions,
          }),
      ...(continuation.attackDamageAdditions === undefined
        ? {}
        : {
            pendingAttackDamageAdditions: continuation.attackDamageAdditions,
          }),
    },
  );
  if (
    result.tag !== "needsHoles" ||
    result.state.interruptStack.length !== state.interruptStack.length
  ) {
    return result;
  }
  const activeReaction = currentReactionFrame(result.state)?.activeReaction;
  if (
    activeReaction !== undefined &&
    sameBattleSubject(activeReaction.subject, continuation.subject)
  ) {
    const pendingState =
      activeReactionWithReplayContinuationAttackDamageChanges(
        result.state,
        continuation,
      );
    return {
      ...result,
      state: pendingState,
      snapshot: snapshotBattle(pendingState),
    };
  }
  const pendingState = {
    ...result.state,
    interruptStack: [
      ...result.state.interruptStack,
      replayContinuationFrame(continuation, suppressedReactionTrigger),
    ],
  };
  return {
    ...result,
    state: pendingState,
    snapshot: snapshotBattle(pendingState),
  };
}

export function activeReactionWithReplayContinuationAttackDamageChanges(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
): BattleState {
  if (
    continuation.attackDamageReductions === undefined &&
    continuation.attackDamageAdditions === undefined
  ) {
    return state;
  }
  const frame = currentReactionFrame(state);
  if (frame?.activeReaction === undefined) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      reactionInterruptFrame({
        ...frame,
        activeReaction: {
          ...frame.activeReaction,
          ...(continuation.attackDamageReductions === undefined
            ? {}
            : {
                pendingAttackDamageReductions:
                  continuation.attackDamageReductions,
              }),
          ...(continuation.attackDamageAdditions === undefined
            ? {}
            : {
                pendingAttackDamageAdditions:
                  continuation.attackDamageAdditions,
              }),
        },
      }),
    ],
  };
}

export function attackDamageContinuationConcentrationFrame(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleAttackDamageContinuationConcentrationFrame {
  return {
    kind: "attackDamageContinuationConcentration",
    continuation,
    suppressedReactionTrigger,
  };
}

export function attackDamageContinuationAmount(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): DamageAmount | null {
  const target = state.combatants.get(continuation.targetId);
  return target === undefined
    ? null
    : attackDamageEventAmountForTarget(target, continuation.damageEvent);
}

export function attackDamageContinuationConcentrationHole(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): BattleConcentrationSavingThrowHole | null {
  const target = state.combatants.get(continuation.targetId);
  return target === undefined
    ? null
    : concentrationSavingThrowHole(
        target,
        Number(
          attackDamageEventAmountForTarget(target, continuation.damageEvent),
        ),
      );
}

export function resolveAttackDamageContinuationConcentration(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationConcentrationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const concentrationSave = attackDamageContinuationConcentrationHole(
    input.state,
    input.frame.continuation,
  );
  if (concentrationSave === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw is no longer available for the damaged target.",
    );
  }
  const concentrationFill = attackDamageContinuationConcentrationFill(
    input.frame.continuation,
    input.fills,
  );
  if (concentrationFill.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", concentrationFill.message);
  }
  if (concentrationFill.value === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationSave]);
  }
  if (concentrationFill.value.holeId !== concentrationSave.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill does not match the damaged target.",
    );
  }
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resumeInterruptedProcedure(
    stateWithoutFrame,
    {
      ...input.frame.continuation,
      concentrationSavingThrow: concentrationFill.value,
    },
    input.frame.suppressedReactionTrigger,
  );
}

export function attackDamageContinuationConcentrationFill(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const prefix = continuation.fills;
  const accumulated =
    fills.length >= prefix.length &&
    prefix.every((fill, index) => battleFillEquals(fill, fills[index]!));
  const remaining = accumulated ? fills.slice(prefix.length) : fills;
  if (remaining.length === 0) {
    return { tag: "ok", value: undefined };
  }
  if (
    remaining.length !== 1 ||
    remaining[0]?.kind !== "concentrationSavingThrow"
  ) {
    return {
      tag: "invalid",
      message:
        "Attack damage Concentration continuation accepts the pending Concentration Saving Throw after the original attack fills.",
    };
  }
  return { tag: "ok", value: remaining[0] };
}

export function battleFillEquals(
  a: BattleAttackDamagePrefixFill,
  b: BattleFill,
): boolean {
  if (a.kind !== b.kind || a.holeId !== b.holeId) {
    return false;
  }
  if (a.kind === "targetChoice" && b.kind === "targetChoice") {
    return a.value === b.value;
  }
  if (a.kind === "attackRoll" && b.kind === "attackRoll") {
    return (
      a.value.total === b.value.total &&
      a.value.naturalD20 === b.value.naturalD20 &&
      a.value.rollMode === b.value.rollMode &&
      a.value.activatedOngoingFeatureUnitId ===
        b.value.activatedOngoingFeatureUnitId
    );
  }
  if (a.kind === "rolledDice" && b.kind === "rolledDice") {
    return (
      rolledDiceGroupsEqual(a.value, b.value) &&
      attackDamageRiderSelectionsEqual(
        a.selectedAttackDamageRiderUnitIds,
        b.selectedAttackDamageRiderUnitIds,
      )
    );
  }
  if (
    a.kind === "attackDamageDisposition" &&
    b.kind === "attackDamageDisposition"
  ) {
    return a.value.kind === b.value.kind;
  }
  return false;
}

export function rolledDiceGroupsEqual(
  a: BattleRolledDiceFill["value"],
  b: BattleRolledDiceFill["value"],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (group, index) =>
        group.results.length === b[index]?.results.length &&
        group.results.every(
          (result, resultIndex) => result === b[index]?.results[resultIndex],
        ),
    )
  );
}

export function attackDamageRiderSelectionsEqual(
  a: readonly UnitRecord["id"][] | undefined,
  b: readonly UnitRecord["id"][] | undefined,
): boolean {
  return (
    (a ?? []).length === (b ?? []).length &&
    (a ?? []).every((unitId, index) => unitId === (b ?? [])[index])
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
}): BattleResolutionResult {
  const result = resolveBattleSubject({
    state: input.state,
    subject: {
      tag: "runtimeCommand",
      actorId: input.actorId,
      command: "endTurn",
    },
    fills: input.fills ?? [],
  });

  return result;
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  const normalizedState = normalizeEarlyEndedOngoingFeatures(state);
  if (normalizedState !== state) {
    return snapshotBattle(normalizedState);
  }
  const turnOrder = [...initiativeOrder(state.initiative)];

  return {
    battleId: state.battleId,
    round: state.initiative.round,
    currentActorId: currentActorId(state),
    turnOrder,
    combatants: turnOrder.flatMap((id) => {
      const combatant = state.combatants.get(id);
      return combatant == null ? [] : [combatantSnapshot(state, combatant)];
    }),
    findFamiliars: [...state.findFamiliars].map(([ownerId, familiar]) => {
      if (familiar.status !== "present") {
        return { ...familiar, ownerId };
      }
      return {
        ...familiar,
        ownerId,
        initiative: requirePresentFamiliarCombatantInitiative(state, familiar),
      };
    }),
    lightEmitters: battleLightEmitters(state),
    acts: discoverBattleActs(state),
    turn: battleTurnSnapshot(state.currentTurnResources),
    readiedResponses: {
      spells: [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      })),
      movements: [...state.readiedMovements].map(
        ([actorId, readiedMovement]) => ({
          actorId,
          ...readiedMovement,
        }),
      ),
    },
    helpAttackMarkers: state.helpAttacks,
    pendingReaction: pendingReactionSnapshot(state),
  };
}

export function battleTurnSnapshot(
  resources: BattleTurnResources,
): BattleTurnSnapshot {
  return {
    actionResources: resources.actionResources,
    bonusActionAvailable: resources.currentHasBonusAction,
    spellSlotExpendedThisTurn: resources.spellSlotExpendedThisTurn,
    attackRollMadeThisTurn: resources.attackRollMadeThisTurn,
    attackDamageRidersUsedThisTurn: resources.attackDamageRidersUsedThisTurn,
    weaponDamageDiceRollChoicesUsedThisTurn:
      resources.weaponDamageDiceRollChoicesUsedThisTurn,
    weaponMasteryCleaveAttackersUsedThisTurn:
      resources.weaponMasteryCleaveAttackersUsedThisTurn,
    ...(resources.lightWeaponAttackMade === undefined
      ? {}
      : { lightWeaponAttackMade: resources.lightWeaponAttackMade }),
    dashMovementBonusFeet: resources.dashMovementBonusFeet,
    disengaged: resources.disengaged,
  };
}

function requirePresentFamiliarCombatantInitiative(
  state: BattleState,
  familiar: FindFamiliarPresentState,
): Extract<FindFamiliarSnapshot, { readonly status: "present" }>["initiative"] {
  const combatant = state.combatants.get(familiar.familiarId);
  if (combatant === undefined) {
    throw new Error("Present Find Familiar snapshot requires a combatant.");
  }
  return combatant.initiative;
}

export function pendingReactionSnapshot(
  state: BattleState,
): BattleSnapshot["pendingReaction"] {
  const frame = currentReactionFrame(state);
  return frame === null
    ? null
    : {
        trigger: frame.trigger,
        decisionHole: reactionDecisionHole(frame),
        choices: frame.choices,
        stackDepth: battleReplayStackDepth(state.interruptStack.length),
      };
}

export function currentInterruptFrame(
  state: BattleState,
): BattleInterruptFrame | null {
  return state.interruptStack[state.interruptStack.length - 1] ?? null;
}

export function currentReactionFrame(
  state: BattleState,
): BattleReactionFrame | null {
  const frame = currentInterruptFrame(state);
  return frame?.kind === "reaction" ? frame.frame : null;
}

export function reactionDecisionHole(
  frame: BattleReactionFrame,
): BattleReactionDecisionHole {
  return {
    holeInstanceKey: REACTION_DECISION_HOLE_INSTANCE,
    holeId: REACTION_DECISION_HOLE_ID,
    kind: "reactionDecision",
    label: `${reactionTriggerLabel(frame.trigger)} reaction decision`,
    trigger: frame.trigger,
    eligibleReactors: unofferedEligibleReactors(frame),
  };
}

export function reactionTriggerLabel(trigger: BattleReactionTrigger): string {
  return Match.value(trigger).pipe(
    Match.when("attackHit", () => "Attack hit"),
    Match.when("attackDamage", () => "Attack damage"),
    Match.when("spellCast", () => "Spell cast"),
    Match.when("saveFailed", () => "Failed save"),
    Match.when("afterDamage", () => "After damage"),
    Match.when("creatureFalls", () => "Creature falls"),
    Match.when("opportunityAttack", () => "Opportunity Attack"),
    Match.exhaustive,
  );
}

export function unofferedEligibleReactors(
  frame: BattleReactionFrame,
): readonly CombatantId[] {
  const offered = new Set(frame.offeredReactors);
  return frame.eligibleReactors.filter((reactorId) => !offered.has(reactorId));
}

export function maybeOpenReactionWindow(
  state: BattleState,
  frame: BattleReactionFrameInput,
  suppressedReactionTrigger: BattleReactionTrigger | undefined,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  return maybeOpenReactionWindowWithChoices(
    state,
    frame,
    suppressedReactionTrigger,
    reactionChoices(state, frame),
  );
}

function maybeOpenReactionWindowWithChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
  suppressedReactionTrigger: BattleReactionTrigger | undefined,
  choices: readonly BattleReactionProcedureChoice[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (frame.trigger === suppressedReactionTrigger) {
    return null;
  }
  if (choices.length === 0) {
    return null;
  }
  const eligibleReactors = [
    ...new Set(choices.map((choice) => choice.reactorId)),
  ];
  const frameCommon = {
    eligibleReactors,
    offeredReactors: [],
    choices,
  } satisfies Pick<
    BattleReactionFrame,
    "eligibleReactors" | "offeredReactors" | "choices"
  >;
  const nextFrame: BattleReactionFrame = Match.value(frame).pipe(
    Match.when({ trigger: "attackHit" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "attackDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "spellCast" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "saveFailed" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "afterDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "creatureFalls" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "opportunityAttack" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.exhaustive,
  );
  const nextState = openBattleReactionWindow({ state, frame: nextFrame });
  const decisionHole = reactionDecisionHole(nextFrame);
  return {
    tag: "needsHoles",
    state: nextState,
    subject: frame.continuation.subject,
    holes: [decisionHole],
    snapshot: snapshotBattle(nextState),
  };
}

export function readiedSpellReactionChoices(
  state: BattleState,
  trigger: BattleReactionTrigger,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [...state.readiedSpells].flatMap(
    ([casterId, readiedSpell]) => {
      const reactor = state.combatants.get(casterId);
      if (
        readiedSpell.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor)
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedSpell" as const,
          reactorId: casterId,
          readiedSpellCasterId: casterId,
          initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedSpell" as const,
            readiedSpellCasterId: casterId,
          },
        },
      ];
    },
  );
  return readiedChoices;
}

export function readiedMovementReactionChoices(
  state: BattleState,
  trigger: BattleReactionTrigger,
): readonly BattleReactionProcedureChoice[] {
  return [...state.readiedMovements].flatMap(
    ([readiedMovementActorId, readiedMovement]) => {
      const reactor = state.combatants.get(readiedMovementActorId);
      const initialHoles = readiedMovementInitialHoles(
        state,
        readiedMovementActorId,
      );
      if (
        readiedMovement.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor) ||
        initialHoles.length === 0
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedMovement" as const,
          reactorId: readiedMovementActorId,
          readiedMovementActorId,
          initialHoles,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedMovement" as const,
            readiedMovementActorId,
          },
        },
      ];
    },
  );
}

export function reactionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [
    ...readiedSpellReactionChoices(state, frame.trigger),
    ...readiedMovementReactionChoices(state, frame.trigger),
  ];
  const attackHitBonusActionSpellChoices =
    attackHitBonusActionSpellReactionChoices(state, frame);
  const triggeredSpellChoices = triggeredReactionSpellChoices(state, frame);
  const modifierChoices = reactionRollOrDamageReductionChoices(state, frame);
  return frame.trigger === "opportunityAttack"
    ? [
        ...readiedChoices,
        ...triggeredSpellChoices,
        ...modifierChoices,
        ...opportunityAttackReactionChoices(
          state,
          frame.moverId,
          frame.threats,
        ),
      ]
    : [
        ...readiedChoices,
        ...attackHitBonusActionSpellChoices,
        ...triggeredSpellChoices,
        ...modifierChoices,
      ];
}

export function attackHitBonusActionSpellReactionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  if (
    frame.trigger !== "attackHit" ||
    frame.continuation.subject.tag === "bonusAction" ||
    frame.attackerId !== currentActorId(state)
  ) {
    return [];
  }
  const actor = state.combatants.get(frame.attackerId);
  const target =
    frame.trigger === "attackHit"
      ? state.combatants.get(frame.targetId)
      : undefined;
  if (
    actor?.origin.kind !== "character" ||
    target === undefined ||
    !combatantCanTakeActions(actor) ||
    !state.currentTurnResources.currentHasBonusAction ||
    activeOngoingFeaturesPreventSpellcasting(actor)
  ) {
    return [];
  }
  return supportedSpellActs(actor, state).flatMap(
    (invocation): readonly BattleReactionProcedureChoice[] => {
      if (
        (invocation.procedure !== "afterHitDamage" &&
          invocation.procedure !== "afterHitSaveGatedCondition" &&
          invocation.procedure !== "afterHitTimedDamageAndSave") ||
        !afterHitSpellMatchesAttackTrigger(
          invocation,
          frame.attackHitTriggerKind,
        ) ||
        !spellHasAvailableSpend(actor, invocation) ||
        state.currentTurnResources.spellSlotExpendedThisTurn
      ) {
        return [];
      }
      const invocationRef = supportedSpellInvocationRef(invocation);
      const initialHoles =
        invocation.procedure === "afterHitSaveGatedCondition"
          ? [
              attackHitSavingThrowOutcomeHole(
                state,
                frame.attackerId,
                target,
                invocation,
              ),
            ]
          : [];
      return [
        {
          kind: "castAttackHitBonusActionSpell" as const,
          reactorId: frame.attackerId,
          invocation: invocationRef,
          initialHoles,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "castAttackHitBonusActionSpell" as const,
            casterId: frame.attackerId,
            invocation: invocationRef,
          },
        },
      ];
    },
  );
}

export function opportunityAttackReactionChoices(
  state: BattleState,
  moverId: CombatantId,
  threats: readonly BattleOpportunityAttackThreat[],
): readonly BattleReactionProcedureChoice[] {
  return threats.flatMap((threat) => {
    const reactorId = threat.reactorId;
    const reactor = state.combatants.get(reactorId);
    if (reactor === undefined) {
      return [];
    }
    const attack = opportunityAttackOptionForReactor(
      state,
      reactorId,
      moverId,
      threat.attackName,
    );
    if (attack === undefined) return [];
    return [
      {
        kind: "opportunityAttack" as const,
        reactorId,
        initialHoles: [],
        subject: {
          tag: "runtimeCommand" as const,
          actorId: currentActorId(state),
          command: "opportunityAttack" as const,
          reactorId,
          targetId: moverId,
          attackName: attackActionOptionName(attack),
        },
      },
    ];
  });
}
