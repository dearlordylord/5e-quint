// Battle dispatcher/orchestration extracted from ../battle-reducer.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// Owns subject resolution, reaction windows, interrupted-procedure replay,
// turn snapshots, and reaction-choice orchestration.

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-feather-fall-mitigation spell.invocation-mirror-image-hit-interception spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS

import {
  canSpendAction,
  canSpendUnarmedStrikeActionResource,
  spendAction,
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
import { combatantEffectiveSize } from "./druid-wild-shape.ts";

import {
  applyAttackDamageAmount,
  breakBattleConcentration,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  fillsMatchingHoleIds,
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
import {
  applyProtectionRelevantEffectSaveOutcome,
  protectionRelevantEffectFor,
  protectionRelevantEffectSavingThrowOutcomeHole,
  validateProtectionRelevantEffectSavingThrowOutcome,
} from "./spell-condition-effects-helpers.ts";
import {
  reactionModifierReductionRoll,
  reactionRollOrDamageReductionChoices,
  spendReactionModifierResource,
} from "./reaction-modifiers.ts";
import {
  triggeredReactionSpellChoices,
  counterspellReactionSpellMatchesTrigger,
  featherFallReactionSpellMatchesTrigger,
  hellishRebukeReactionSpellMatchesTrigger,
  reactionSpellTargetFactsForAfterDamage,
  triggeredReactionSpellTurnResourceAvailable,
} from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import {
  activeSelfTransformationModeEffect,
  applySelfTransformationModeEffect,
} from "./spells-active-effects.ts";
import {
  battleStateAfterWardingBondSeparation,
  wardingBondSeparationFactsAreSatisfied,
  wardingBondSeparationFactsHole,
} from "./warding-bond.ts";
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
  applyAfterHitDamageAndIlluminationSpellEffect,
  applyAfterHitTimedDamageAndSaveSpellEffect,
  applyFailedSaveSpellConditionEffects,
  selectFailedSaveConditionEffect,
  battleLightEmitters,
  battleObscurementZones,
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
  claimPendingSpellSlotUseThisTurn,
  markSpellSlotExpendedThisTurn,
  releasePendingSpellSlotUseThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";

import {
  resolveBonusActionDashSpellAct,
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./spells-resolve.ts";
import { resolveReleaseSpellCreatedHeldObjectCommand } from "./spells-resolve-release.ts";
import {
  spellFillSet,
  spellFillSetContainsOnlySpellCastReactionFacts,
} from "./spells-resolve-fill-set.ts";
import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import {
  spendClassFeatureFreeCastResource,
  spendSpellCastResources,
  type SpellCastResourceSpendResult,
} from "./spells-resolve-resources.ts";

import { attackActionOptionName } from "./statblock-attacks.ts";

import type {
  BattleAfterDamageEvent,
  BattleAttackDamageContinuationConcentrationFrame,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackDamageEvent,
  BattleAttackHitTriggerKind,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleFeatherFallLandingResult,
  BattleInterruptFrame,
  BattleInterruptedProcedure,
  BattleObjectDamageOutcome,
  BattleObjectIgnitionOutcome,
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
  SupportedSpellInvocation,
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
  resolveFlamingSphereRepositionCommand,
  resolveFlamingSphereRamCommand,
  resolveFlamingSphereSaveCommand,
  resolveMoonbeamRepositionCommand,
  resolveMoonbeamSaveCommand,
  resolveGreaseGroundHazardSaveCommand,
  resolveWebAreaRemovedCommand,
  resolveWebRestrainedNoLongerInAreaCommand,
  resolveWebRestraintSaveCommand,
  resolveGustOfWindLineDirectionChangeCommand,
  resolveGustOfWindLineSaveCommand,
  resolveEscapeGrapple,
  resolveEscapeSpellRestraint,
  resolveGrapple,
  resolveHelpAttack,
  resolveHide,
  resolveJumpMovementReplacementCommand,
  resolveMoveCommand,
  resolveMultiattack,
  resolveMartialArtsBonusUnarmedStrike,
  resolveMonkFocusFlurryOfBlowsStrike,
  resolveMonkFocusOption,
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
  resolveDruidWildShapeUnitFeature,
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
    !subjectCanSpendStandardActionResource(
      input.state.currentTurnResources,
      input.subject,
      standardActionKind,
    )
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
  if (
    input.subject.tag === "druidWildShape" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape Bonus Action is no longer available.",
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
    if (subject.tag === "monkFocusOption") {
      return resolveMonkFocusOption({ ...input, subject });
    }
    if (subject.tag === "monkFocusFlurryOfBlowsStrike") {
      return resolveMonkFocusFlurryOfBlowsStrike({
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
    if (subject.tag === "druidWildShape") {
      return resolveDruidWildShapeUnitFeature({ ...input, subject });
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
      subject.command === "replaceSelfTransformationMode"
    ) {
      return resolveReplaceSelfTransformationModeCommand({
        ...input,
        subject,
      });
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
      subject.command === "webRestraintSave"
    ) {
      return resolveWebRestraintSaveCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "webRestrainedNoLongerInArea"
    ) {
      return resolveWebRestrainedNoLongerInAreaCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "webAreaRemoved"
    ) {
      return resolveWebAreaRemovedCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "gustOfWindLineSave"
    ) {
      return resolveGustOfWindLineSaveCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "gustOfWindLineDirectionChange"
    ) {
      return resolveGustOfWindLineDirectionChangeCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "movableZoneSave"
    ) {
      if (subject.trigger === "endsTurnWithinFiveFeetOfSphere") {
        return resolveFlamingSphereSaveCommand({
          ...input,
          subject,
          suppressedReactionTrigger: options.suppressedReactionTrigger,
        });
      }
      return resolveMoonbeamSaveCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "movableZoneReposition"
    ) {
      const actor = input.state.combatants.get(subject.sourceCombatantId);
      const hasFlamingSphere = actor?.activeEffects.some(
        (e) =>
          e.kind === "flamingSphere" &&
          e.sourceSpellId === subject.sourceSpellId &&
          e.sourceCombatantId === subject.sourceCombatantId &&
          e.areaId === subject.areaId,
      );
      if (hasFlamingSphere) {
        return resolveFlamingSphereRepositionCommand({ ...input, subject });
      }
      return resolveMoonbeamRepositionCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "movableZoneRam"
    ) {
      return resolveFlamingSphereRamCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "protectionRelevantEffectSave"
    ) {
      return resolveProtectionRelevantEffectSaveCommand({
        ...input,
        subject,
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
      subject.command === "wardingBondSeparation"
    ) {
      return resolveWardingBondSeparationCommand({ ...input, subject });
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
      subject.command === "releaseSpellCreatedHeldObject"
    ) {
      return resolveReleaseSpellCreatedHeldObjectCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "castTriggeredReactionSpell"
    ) {
      return resolveCastTriggeredReactionSpellCommand({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      });
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

function resolveWardingBondSeparationCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "wardingBondSeparation";
      }
    >;
  },
): BattleResolutionResult {
  if (input.fills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation uses one table spatial fact fill.",
    );
  }
  const target = input.state.combatants.get(input.subject.targetId);
  const effect = target?.activeEffects.find(
    (candidate) =>
      candidate.kind === "wardingBond" &&
      candidate.sourceCombatantId === input.subject.sourceCombatantId &&
      candidate.sourceSpellId === input.subject.sourceSpellId,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Warding Bond is no longer active for this connected target.",
    );
  }
  const hole = wardingBondSeparationFactsHole({
    sourceCombatantId: input.subject.sourceCombatantId,
    sourceSpellId: input.subject.sourceSpellId,
    targetId: input.subject.targetId,
  });
  const fill = input.fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  if (
    fill.kind !== "targetSpatialFacts" ||
    fill.holeId !== hole.holeId ||
    !wardingBondSeparationFactsAreSatisfied({
      sourceCombatantId: input.subject.sourceCombatantId,
      sourceSpellId: input.subject.sourceSpellId,
      targetId: input.subject.targetId,
      facts: fill.spatialFacts,
    })
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation requires a table fact that the connected creatures are beyond 60 feet.",
    );
  }
  const nextState = battleStateAfterWardingBondSeparation({
    state: input.state,
    sourceCombatantId: input.subject.sourceCombatantId,
    sourceSpellId: input.subject.sourceSpellId,
    targetId: input.subject.targetId,
  });
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
    subject.tag === "monkFocusOption" ||
    subject.tag === "monkFocusFlurryOfBlowsStrike" ||
    subject.tag === "unitFeature" ||
    subject.tag === "druidWildShape"
  ) {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" &&
    (subject.command === "move" ||
      subject.command === "standFromProne" ||
      subject.command === "jumpMovementReplacement" ||
      subject.command === "replaceSelfTransformationMode")
  );
}

function resolveReplaceSelfTransformationModeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "replaceSelfTransformationMode";
      }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Self-transformation mode replacement uses no fills.",
    );
  }
  if (input.subject.actorId !== input.subject.sourceCombatantId) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation mode replacement belongs to its source combatant.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const activeEffect = activeSelfTransformationModeEffect(actor, {
    sourceCombatantId: input.subject.sourceCombatantId,
    sourceSpellId: input.subject.sourceSpellId,
  });
  if (activeEffect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation mode replacement requires an active self-transformation effect.",
    );
  }
  if (activeEffect.mode === input.subject.mode) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation mode is already active.",
    );
  }
  const modeEffect =
    input.subject.mode === "naturalWeapons"
      ? activeEffect.naturalWeaponFacts.damage.damageTypeChoices.includes(
          input.subject.naturalWeaponDamageType,
        )
        ? {
            mode: input.subject.mode,
            naturalWeaponFacts: activeEffect.naturalWeaponFacts,
            naturalWeaponDamageType: input.subject.naturalWeaponDamageType,
          }
        : null
      : {
          mode: input.subject.mode,
          naturalWeaponFacts: activeEffect.naturalWeaponFacts,
        };
  if (modeEffect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Natural Weapons damage type is no longer available.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = applySelfTransformationModeEffect({
    state: { ...input.state, currentTurnResources: spent.right },
    actorId: input.subject.actorId,
    sourceCombatantId: activeEffect.sourceCombatantId,
    sourceSpellId: activeEffect.sourceSpellId,
    modeEffect,
    expiresAt: activeEffect.expiresAt,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveProtectionRelevantEffectSaveCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "protectionRelevantEffectSave";
      }
    >
  >,
): BattleResolutionResult {
  const effect = protectionRelevantEffectFor(
    input.state,
    input.subject.actorId,
    input.subject.sourceCombatantId,
    input.subject.sourceSpellId,
    input.subject.relevantEffect,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Protection from Evil and Good relevant-effect save requires a matching active effect on the target.",
    );
  }
  const hole = protectionRelevantEffectSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
  );
  const saveFill = input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === hole.holeId,
  );
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateProtectionRelevantEffectSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  const nextState = applyProtectionRelevantEffectSaveOutcome(
    input.state,
    input.subject.actorId,
    effect,
    saveFill.value.outcomes[0]?.succeeded === true,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function subjectRequiresActionEligibility(subject: BattleSubject): boolean {
  return (
    subject.tag === "monkFocusOption" ||
    subject.tag === "monkFocusFlurryOfBlowsStrike" ||
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
        subject.action === "shove" ||
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

function subjectCanSpendStandardActionResource(
  resources: BattleState["currentTurnResources"],
  subject: BattleSubject,
  action: StandardActionKind,
): boolean {
  if (
    subject.tag === "action" &&
    (subject.action === "grapple" || subject.action === "shove")
  ) {
    return canSpendUnarmedStrikeActionResource(resources);
  }
  return canSpendAction(resources, action);
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
          stateForContinuingReactionFrame(nextState, frame),
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

function stateForOpeningReactionFrame(
  state: BattleState,
  frame: BattleReactionFrameInput,
): BattleState | null {
  const castingState =
    frame.trigger === "spellCast" &&
    frame.castingResource.kind !== "alreadySpent"
      ? battleStateAfterTargetActionEarlyEndForActor(state, frame.casterId)
      : state;
  if (
    frame.trigger !== "spellCast" ||
    frame.spellSlotCommitment.kind === "none"
  ) {
    return castingState;
  }
  const combatantId = frame.casterId;
  if (
    castingState.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "pending" && use.combatantId === combatantId,
    )
  ) {
    return castingState;
  }
  const claimed = claimPendingSpellSlotUseThisTurn(
    castingState.currentTurnResources,
    combatantId,
  );
  return Either.isLeft(claimed)
    ? null
    : { ...castingState, currentTurnResources: claimed.right };
}

function stateAfterSpellCastDeclared(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): BattleState {
  const earlyEnded = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.casterId,
  );
  return spellRequiresVerbal(input.invocation.spell)
    ? revealHidden(earlyEnded, input.casterId)
    : earlyEnded;
}

function stateForContinuingReactionFrame(
  state: BattleState,
  frame: BattleReactionFrame,
): BattleState {
  return frame.trigger === "spellCast" &&
    frame.spellSlotCommitment.kind === "pendingCasterSpellSlot"
    ? {
        ...state,
        currentTurnResources: releasePendingSpellSlotUseThisTurn(
          state.currentTurnResources,
          frame.casterId,
        ),
      }
    : state;
}

function stateAfterCounteredSpellCast(
  state: BattleState,
  frame: Extract<BattleReactionFrame, { readonly trigger: "spellCast" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const currentFrame = currentReactionFrame(state);
  if (currentFrame?.trigger !== "spellCast") {
    return {
      tag: "invalid",
      message:
        "Counterspell can only end the current spell-cast Reaction frame.",
    };
  }
  const releasedResources =
    frame.spellSlotCommitment.kind === "none"
      ? state.currentTurnResources
      : releasePendingSpellSlotUseThisTurn(
          state.currentTurnResources,
          frame.casterId,
        );
  const wastedResources = turnResourcesAfterWastedSpellCastingResource(
    releasedResources,
    frame,
  );
  if (Either.isLeft(wastedResources)) {
    return {
      tag: "invalid",
      message: wastedResources.left,
    };
  }
  return {
    tag: "ok",
    state: {
      ...state,
      currentTurnResources: wastedResources.right,
      interruptStack: [
        ...state.interruptStack.slice(0, -1),
        reactionInterruptFrame({
          ...currentFrame,
          offeredReactors: currentFrame.eligibleReactors,
          continuation: {
            kind: "resolved",
            subject: currentFrame.continuation.subject,
          },
        }),
      ],
    },
  };
}

function turnResourcesAfterWastedSpellCastingResource(
  resources: BattleTurnResources,
  frame: Extract<BattleReactionFrame, { readonly trigger: "spellCast" }>,
): Either.Either<BattleTurnResources, string> {
  if (frame.castingResource.kind === "magicAction") {
    const spent = spendAction(resources, "magic");
    return Either.isLeft(spent)
      ? Either.left(
          "Magic action is no longer available for the countered spell.",
        )
      : Either.right(spent.right);
  }
  if (frame.castingResource.kind === "bonusAction") {
    const spent = spendActivationResource(resources, { kind: "bonusAction" });
    return Either.isLeft(spent)
      ? Either.left(
          "Bonus Action is no longer available for the countered spell.",
        )
      : Either.right(spent.right);
  }
  return Either.right(resources);
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
          stateForContinuingReactionFrame(nextState, completedFrame),
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
  > & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
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
              candidate.procedure === "featherFallMitigation" ||
              candidate.procedure === "counterspell") &&
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
      invocation?.procedure !== "featherFallMitigation" &&
      invocation?.procedure !== "counterspell")
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
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const spellCastReactionWindow = maybeOpenTriggeredReactionSpellCastWindow({
    state: input.state,
    subject: input.subject,
    frame,
    invocation,
    fills: input.fills,
    suppressedReactionTrigger: input.suppressedReactionTrigger,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
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
  if (invocation.procedure === "counterspell") {
    return resolveCounterspellReactionSpellCommand({
      ...input,
      frame,
      invocation,
    });
  }
  const shieldFillSet = spellFillSet(input.fills, invocation);
  if (shieldFillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", shieldFillSet.message);
  }
  if (!spellFillSetContainsOnlySpellCastReactionFacts(shieldFillSet, {})) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Triggered Reaction Shield spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  const castingState = stateAfterSpellCastDeclared({
    state: input.state,
    casterId: input.subject.reactorId,
    invocation,
  });
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
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.subject.reactorId,
  );
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

function maybeOpenTriggeredReactionSpellCastWindow(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >;
  readonly frame: BattleReactionFrame;
  readonly invocation: Extract<
    ReturnType<typeof supportedSpellActs>[number],
    {
      readonly procedure:
        | "shieldReaction"
        | "saveGatedDamage"
        | "featherFallMitigation"
        | "counterspell";
    }
  >;
  readonly fills: readonly BattleFill[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (input.suppressedReactionTrigger === "spellCast") {
    return null;
  }
  const fillSet = spellFillSet(input.fills, input.invocation);
  if (fillSet.tag === "invalid") {
    return null;
  }
  const targetIds = triggeredReactionSpellCastTargetIds({
    frame: input.frame,
    reactorId: input.subject.reactorId,
    invocation: input.invocation,
    fillSet,
  });
  return maybeOpenReactionWindow(
    input.state,
    spellCastReactionFrame({
      casterId: input.subject.reactorId,
      invocation: input.invocation,
      targetIds,
      reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "reaction" },
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    }),
    input.suppressedReactionTrigger,
  );
}

function triggeredReactionSpellCastTargetIds(input: {
  readonly frame: BattleReactionFrame;
  readonly reactorId: CombatantId;
  readonly invocation: Extract<
    ReturnType<typeof supportedSpellActs>[number],
    {
      readonly procedure:
        | "shieldReaction"
        | "saveGatedDamage"
        | "featherFallMitigation"
        | "counterspell";
    }
  >;
  readonly fillSet: Extract<
    ReturnType<typeof spellFillSet>,
    { readonly tag: "ok" }
  >;
}): readonly CombatantId[] {
  if (input.invocation.procedure === "shieldReaction") {
    return [input.reactorId];
  }
  if (
    input.invocation.procedure === "saveGatedDamage" &&
    input.frame.trigger === "afterDamage"
  ) {
    return [input.frame.damageSourceId];
  }
  if (
    input.invocation.procedure === "featherFallMitigation" &&
    input.fillSet.targetList !== undefined
  ) {
    return input.fillSet.targetList.targetIds;
  }
  if (
    input.invocation.procedure === "counterspell" &&
    input.frame.trigger === "spellCast"
  ) {
    return [input.frame.casterId];
  }
  return [];
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

function resolveCounterspellReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
    readonly frame: BattleReactionFrame;
    readonly invocation: Extract<
      ReturnType<typeof supportedSpellActs>[number],
      { readonly procedure: "counterspell" }
    >;
  },
): BattleResolutionResult {
  if (
    input.frame.trigger !== "spellCast" ||
    !counterspellReactionSpellMatchesTrigger(
      input.invocation,
      input.frame,
      input.subject.reactorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Counterspell requires a matching spell-cast Reaction trigger.",
    );
  }

  const fillSet = spellFillSet(input.fills, input.invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (
    !spellFillSetContainsOnlySpellCastReactionFacts(fillSet, {
      allowSavingThrowOutcomes: true,
    })
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Counterspell targets the caster from the spell-cast trigger and uses only that caster's Constitution Saving Throw when needed.",
    );
  }

  const countersAutomatically =
    Number(input.invocation.resource.slotLevel) >= input.frame.castLevel;
  if (countersAutomatically && fillSet.savingThrowOutcomes !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Counterspell cast with a sufficient spell slot does not use a Saving Throw outcome.",
    );
  }

  let triggeringCasterSaveSucceeded = false;
  if (!countersAutomatically) {
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
      input.frame.casterId,
    );
    if (savingThrowValidation !== null) {
      return invalidResult(input.state, "invalidFill", savingThrowValidation);
    }
    const outcome = fillSet.savingThrowOutcomes.outcomes[0];
    if (outcome === undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Counterspell requires the triggering caster's Saving Throw outcome.",
      );
    }
    triggeringCasterSaveSucceeded = outcome.succeeded;
  }

  const castingState = stateAfterSpellCastDeclared({
    state: input.state,
    casterId: input.subject.reactorId,
    invocation: input.invocation,
  });
  const slotted = expendSpellSlot(
    castingState,
    input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.subject.reactorId,
  );
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const counterspellState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  if (triggeringCasterSaveSucceeded) {
    return {
      tag: "resolved",
      state: counterspellState,
      snapshot: snapshotBattle(counterspellState),
    };
  }

  const counteredState = stateAfterCounteredSpellCast(
    counterspellState,
    input.frame,
  );
  if (counteredState.tag === "invalid") {
    return invalidResult(input.state, "staleSubject", counteredState.message);
  }
  return {
    tag: "resolved",
    state: counteredState.state,
    snapshot: snapshotBattle(counteredState.state),
  };
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
  const castingState = stateAfterSpellCastDeclared({
    state: input.state,
    casterId: input.subject.reactorId,
    invocation: input.invocation,
  });
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
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.subject.reactorId,
  );
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
  const concentrationLifecycleHoles =
    damageLifecycleConcentrationSavingThrowHoles({
      state: input.state,
      target,
      damageAmount,
    });
  const concentrationLifecycleFills = fillsMatchingHoleIds(
    fillSet.concentrationSavingThrows,
    concentrationLifecycleHoles,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationLifecycleFills.find(
          (fill) => fill.holeId === concentrationSave.holeId,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: input.state,
      target,
      damageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  if (concentrationSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
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
  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: input.state,
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
  const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
    fillSet.hideousLaughterDamageRepeatSaves,
    hideousLaughterSaveCheck.holes,
  );
  const castingState = stateAfterSpellCastDeclared({
    state: input.state,
    casterId: input.subject.reactorId,
    invocation: input.invocation,
  });
  const damaged = applySpellDamage(
    castingState,
    input.frame.damageSourceId,
    input.invocation,
    fillSet.damageRoll,
    false,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      saveDamageResult,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHoles,
        fillSet.damageDispositions,
        input.frame.damageSourceId,
      ),
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.subject.reactorId,
    },
  );
  const slotted = expendSpellSlot(
    damaged,
    input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.subject.reactorId,
  );
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
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
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
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination";
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
              candidate.procedure === "afterHitTimedDamageAndSave" ||
              candidate.procedure === "afterHitDamageAndIllumination") &&
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
      invocation?.procedure !== "afterHitTimedDamageAndSave" &&
      invocation?.procedure !== "afterHitDamageAndIllumination")
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
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.casterId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is no longer available for this turn.",
    );
  }
  const reactionSpellTargetFacts =
    fillValidation.tag === "validSaveGated" ||
    fillValidation.tag === "validNonSave"
      ? fillValidation.fillSet.reactionSpellTargetFacts
      : [];
  const spellCastFrame = spellCastReactionFrame({
    casterId: input.subject.casterId,
    invocation,
    targetIds: [target.combatantId],
    reactionSpellTargetFacts,
    castingResource: { kind: "bonusAction" },
    continuation: {
      kind: "replay",
      subject: input.subject,
      fills: input.fills,
    },
  });
  const spellCastReactionState =
    input.suppressedReactionTrigger === undefined
      ? stateForOpeningReactionFrame(input.state, spellCastFrame)
      : null;
  const spellCastReactionWindow =
    spellCastReactionState === null
      ? null
      : maybeOpenReactionWindowWithChoices(
          spellCastReactionState,
          spellCastFrame,
          input.suppressedReactionTrigger,
          triggeredReactionSpellChoices(spellCastReactionState, spellCastFrame),
        );
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
  const resourced =
    invocation.procedure === "afterHitDamage" &&
    invocation.resource.tag === "classFeatureFreeCast"
      ? spendAfterHitDamageFreeCastResource(
          input.state,
          input.subject.casterId,
          invocation.resource.resourceUnitId,
          invocation,
        )
      : spendSpellCastResources({
          state: input.state,
          actorId: input.subject.casterId,
          invocation,
          errorState: input.state,
        });
  if (resourced.tag === "invalid") {
    return resourced;
  }
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
          resourced.state,
          target.combatantId,
          invocation,
        )
      : invocation.procedure === "afterHitDamageAndIllumination"
        ? applyAfterHitDamageAndIlluminationSpellEffect(
            resourced.state,
            target.combatantId,
            invocation,
          )
        : resourced.state;
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

function spendAfterHitDamageFreeCastResource(
  state: BattleState,
  casterId: CombatantId,
  resourceUnitId: string,
  invocation: SupportedSpellInvocation,
): SpellCastResourceSpendResult {
  const spentBonusAction = spendActivationResource(state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spentBonusAction)) {
    return invalidResult(
      state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  return spendClassFeatureFreeCastResource(
    {
      ...state,
      currentTurnResources: spentBonusAction.right,
    },
    casterId,
    resourceUnitId,
    invocation,
    state,
  );
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
          castLevel: 0,
          components: [],
          castingResource: { kind: "alreadySpent" },
          spellSlotCommitment: { kind: "none" },
          targetIds: input.targetIds,
          reactionSpellTargetFacts: [],
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
  | {
      readonly tag: "validNonSave";
      readonly fillSet: Extract<
        ReturnType<typeof spellFillSet>,
        { readonly tag: "ok" }
      >;
    }
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
    const fillSet = spellFillSet(input.fills, invocation);
    if (fillSet.tag === "invalid") {
      return {
        tag: "invalid",
        result: invalidResult(input.state, "invalidFill", fillSet.message),
      };
    }
    return spellFillSetContainsOnlySpellCastReactionFacts(fillSet, {})
      ? { tag: "validNonSave", fillSet }
      : {
          tag: "invalid",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
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
  const selectedEffect = selectFailedSaveConditionEffect(
    invocation.effect,
    null,
  );
  if (selectedEffect.tag !== "selected") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied save-gate condition spell requires a fixed failed-save condition effect.",
    );
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.subject.casterId,
    failedTargets,
    invocation,
    selectedEffect.effect,
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
      ...(creatureSizeIsLargeOrLarger(combatantEffectiveSize(target))
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
        | "afterHitTimedDamageAndSave"
        | "afterHitDamageAndIllumination";
    }
  >,
  triggerKind: BattleAttackHitTriggerKind,
): boolean {
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "afterHitDamageAndIllumination"
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
          stateForContinuingReactionFrame(nextState, frame),
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
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
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
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
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
    if (concentrationPending !== null) {
      const pendingState = {
        ...state,
        interruptStack: [
          ...state.interruptStack,
          attackDamageContinuationConcentrationFrame(
            continuation,
            suppressedReactionTrigger,
          ),
        ],
      };
      return needsHolesResult(pendingState, continuation.subject, [
        concentrationPending,
      ]);
    }
    const continuationConcentrationSavingThrows =
      attackDamageContinuationConcentrationFills(continuation);
    const damagedState = applyAttackDamageAmount(
      state,
      continuation.attackerId,
      continuation.targetId,
      damageAmount,
      continuation.deathFailuresAtZeroHp,
      continuation.damageDisposition,
      continuation.attackDamageRiders,
      continuation.weaponDamageDiceRollChoice,
      attackDamageContinuationTargetConcentrationFill(state, continuation),
      [],
      continuationConcentrationSavingThrows,
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
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
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
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
  readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
  readonly suppressedReactionTrigger: BattleReactionTrigger | undefined;
}): BattleResolutionResult {
  const [event, ...remainingEvents] = input.events;
  if (event === undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      ...(input.objectDamages.length === 0
        ? {}
        : { objectDamages: input.objectDamages }),
      ...(input.objectIgnitions.length === 0
        ? {}
        : { objectIgnitions: input.objectIgnitions }),
      ...(input.droppedObjects.length === 0
        ? {}
        : { droppedObjects: input.droppedObjects }),
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
        objectDamages: input.objectDamages,
        objectIgnitions: input.objectIgnitions,
        droppedObjects: input.droppedObjects,
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
  if (target === undefined) {
    return null;
  }
  const damageAmount = Number(
    attackDamageEventAmountForTarget(target, continuation.damageEvent),
  );
  const fills = attackDamageContinuationConcentrationFills(continuation);
  return (
    damageLifecycleConcentrationSavingThrowHoles({
      state,
      target,
      damageAmount,
    }).find((hole) => !fills.some((fill) => fill.holeId === hole.holeId)) ??
    null
  );
}

function attackDamageContinuationTargetConcentrationFill(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  const target = state.combatants.get(continuation.targetId);
  if (target === undefined) {
    return undefined;
  }
  const hole = concentrationSavingThrowHole(
    target,
    Number(attackDamageEventAmountForTarget(target, continuation.damageEvent)),
  );
  return hole === null
    ? undefined
    : attackDamageContinuationConcentrationFills(continuation).find(
        (fill) => fill.holeId === hole.holeId,
      );
}

function attackDamageContinuationConcentrationFills(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): readonly Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>[] {
  return continuation.concentrationSavingThrows;
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
      concentrationSavingThrows: [
        ...attackDamageContinuationConcentrationFills(input.frame.continuation),
        concentrationFill.value,
      ],
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
  const prefix = [
    ...continuation.fills,
    ...attackDamageContinuationConcentrationFills(continuation),
  ];
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

export function battleFillEquals(a: BattleFill, b: BattleFill): boolean {
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
  if (
    a.kind === "concentrationSavingThrow" &&
    b.kind === "concentrationSavingThrow"
  ) {
    return a.value.succeeded === b.value.succeeded;
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
    obscurementZones: battleObscurementZones(state),
    acts: discoverBattleActs(state),
    turn: battleTurnSnapshot(state),
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

export function battleTurnSnapshot(state: BattleState): BattleTurnSnapshot {
  const resources = state.currentTurnResources;
  return {
    actionResources: resources.actionResources,
    bonusActionAvailable: resources.currentHasBonusAction,
    spellSlotUsesThisTurn: resources.spellSlotUsesThisTurn,
    levelOnePlusSpellCastsThisTurn: resources.levelOnePlusSpellCastsThisTurn,
    quickenedLevelOnePlusSpellCastsThisTurn:
      resources.quickenedLevelOnePlusSpellCastsThisTurn,
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
  const reactionState = stateForOpeningReactionFrame(state, frame);
  if (reactionState === null) {
    return null;
  }
  return maybeOpenReactionWindowWithChoices(
    reactionState,
    frame,
    suppressedReactionTrigger,
    reactionChoices(reactionState, frame),
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
  const reactionState = stateForOpeningReactionFrame(state, frame);
  if (reactionState === null) {
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
  const nextState = openBattleReactionWindow({
    state: reactionState,
    frame: nextFrame,
  });
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
          invocation.procedure !== "afterHitTimedDamageAndSave" &&
          invocation.procedure !== "afterHitDamageAndIllumination") ||
        !afterHitSpellMatchesAttackTrigger(
          invocation,
          frame.attackHitTriggerKind,
        ) ||
        !spellHasAvailableSpend(actor, invocation) ||
        !spellActTurnResourceAvailable(
          state.currentTurnResources,
          frame.attackerId,
          invocation,
        )
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
