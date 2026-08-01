// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.retaliation-reaction-attack
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard spell.invocation-spike-growth-movement-hazard spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-feather-fall-mitigation spell.invocation-mirror-image-hit-interception spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-counterspell spell.reaction-hellish-rebuke spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

import { currentInterruptFrame, snapshotBattle } from "./battle-snapshot.ts";
export {
  attackDamageContinuationConcentrationFrame,
  attackHitBonusActionSpellReactionChoices,
  interruptCheckpointFrame,
  interruptChoices,
  interruptWindowProgress,
  interruptedProcedureSubject,
  interruptedProcedureSupportsAttackDamageChanges,
  maybeOpenInterruptWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  openAfterDamageSequenceInterruptWindow,
  openBattleInterruptWindow,
  opportunityAttackReactionChoices,
  readiedMovementReactionChoices,
  readiedSpellReactionChoices,
  retaliationReactionAttackChoices,
  spendReaction,
  type BattleInterruptWindowProgress,
  type BattleOpenedInterruptWindowResult,
} from "./interrupt-execution.ts";
export {
  battleSnapshotProjection,
  battleTurnSnapshot,
  currentInterruptCheckpoint,
  currentInterruptFrame,
  interruptDecisionHole,
  interruptTriggerLabel,
  pendingInterruptSnapshot,
  snapshotBattle,
  unofferedEligibleResponders,
} from "./battle-snapshot.ts";
import {
  type BattleSubject,
  type ActionHideSubject,
  type ActionSearchSubject,
} from "../battle-subjects.ts";
import { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { resolveCreatureAttack } from "./creature-attack-procedures.ts";
import {
  battleSubjectActorId,
  isLegendaryAttackSubject,
  normalizeEarlyEndedOngoingFeatures,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
import { consumeOrCloseLegendaryActionWindow } from "./legendary-action-window.ts";
import {
  FindFamiliarProcedureExecution,
  resolveCompanionLifecycleSubject,
  resolveFindFamiliarSharedSensesSubject,
  resolveFindFamiliarTouchSpellSubject,
} from "./find-familiar-procedures.ts";
import {
  type AdmittedReplayContinuationSubject,
  ReplayContinuationExecution,
} from "./replay-continuation.ts";
import {
  InterruptContinuationExecution,
  resolveActiveInterruptContinuation,
  resolveInterruptContinuation,
} from "./interrupt-continuation.ts";
import {
  type AdmittedActiveInterruptProcedure,
  InterruptLifecycleExecution,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./interrupt-lifecycle.ts";
import { resolveCastTriggeredReactionSpellCommand } from "./triggered-reaction-spell-procedures.ts";
import {
  resolveLevitateAltitudeControlCommand,
  resolveReplaceSelfTransformationModeCommand,
} from "./active-spell-control-procedures.ts";
import {
  resolveDisperseCloudkillCommand,
  resolveDisperseFogCloudCommand,
  resolveWardingBondSeparationCommand,
} from "./spell-effect-cleanup-procedures.ts";
import {
  resolveCreatureTypeProtectionConditionAttemptCommand,
  resolveCreatureTypeProtectionPossessionAttemptCommand,
  resolveProtectionRelevantEffectSaveCommand,
} from "./protection-charm-procedures.ts";
import { resolveCastAttackHitBonusActionSpellCommand } from "./attack-hit-bonus-action-spell-procedures.ts";
import { resolveD20TestNaturalOneRerollFills } from "./d20-test-natural-one-reroll-procedures.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleReducerRouteForInterrupt } from "./interrupt-route-projection.ts";
import { battleReducerRouteForResolution } from "./reducer-route.ts";
import {
  antimagicFieldInterdictionMessage,
  battleSubjectInterdictedByAntimagicField,
} from "./antimagic-field-action-interdiction.ts";
import type { SpellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-registry.ts";
import {
  currentActorHasOpenStatBlockMultiattackDispatch,
  subjectAllowedDuringStatBlockMultiattackDispatch,
} from "./battle-discovery.ts";
import {
  resolveBonusActionDashSpellAct,
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./spells-resolve.ts";
import { resolveReleaseSpellCreatedHeldObjectCommand } from "./spells-resolve-release.ts";
import { resolveDragonsBreathExhaleCommand } from "./dragons-breath.ts";
import type { BattleAttackRouteResolvers } from "./attack-resolvers.ts";
import {
  resolveBonusActionStandardAction,
  resolveDash,
  resolveDisengage,
  resolveDodge,
  resolveEscapeGrapple,
  resolveEscapeSpellRestraint,
  resolveGrapple,
  resolveHelpAttack,
  resolveHide,
  resolveMultiattack,
  resolveReady,
  resolveReleaseGrappleCommand,
  resolveSearch,
  resolveShakeAwakeFromHypnoticPattern,
  resolveShakeAwakeFromSleep,
  resolveShove,
  resolveStatBlockBonusActionOption,
} from "./attack-resolution.ts";
import {
  resolveMartialArtsBonusUnarmedStrike,
  resolveOffHandAttack,
} from "./attack-offhand.ts";
import {
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
} from "./readied-release.ts";
import {
  isCommandFollowUpSubject,
  pendingCommandObligationIssue,
  resolveCommandFollowUp,
} from "./command-procedures.ts";
import { commandHaltSuppressionIssue } from "./command-halt.ts";
import {
  isMovementProcedureSubject,
  resolveMovementProcedure,
} from "./movement-procedures.ts";
import { resolveEndTurnCommand } from "./turn-boundary-lifecycle.ts";
import {
  isPersistentSpatialSpellProcedureSubject,
  persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn,
  resolvePersistentSpatialSpellProcedureCommand,
} from "./persistent-spatial-spell-procedures.ts";
import { resolveEndConcentrationCommand } from "./concentration-procedures.ts";
import {
  resolveDruidWildShapeUnitFeature,
  resolveUnitFeature,
  resolveUnitFeatureHeldWeaponActivation,
} from "./unit-features.ts";
import { resolveMonkFocusOption } from "./monk-focus.ts";
import { resolveOpportunityAttackCommand } from "./opportunity-attacks.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleInterruptRouteOptions,
  BattleFill,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { battleSubjectActionEligibilityIssue } from "./action-eligibility.ts";

type ResolveBattleSubjectInternalOptions = {
  readonly executionRegistry: SpellProcedureExecutionRegistry;
  readonly attackResolvers: BattleAttackRouteResolvers;
  readonly interruptRouteOptions: BattleInterruptRouteOptions;
};

export function resolveAdmittedBattleSubject(
  input: AdmittedBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(input, {
    executionRegistry,
    attackResolvers,
    interruptRouteOptions: {},
  });
}

export function resolveAdmittedReplayContinuationSubject(
  admitted: AdmittedReplayContinuationSubject,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(admitted.input, {
    executionRegistry,
    attackResolvers,
    interruptRouteOptions: admitted.interruptRouteOptions,
  });
}

function resolveAdmittedActiveInterruptSubject(
  admitted: AdmittedActiveInterruptProcedure,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(admitted.input, {
    executionRegistry,
    attackResolvers,
    interruptRouteOptions: admitted.interruptRouteOptions,
  });
}

function interruptLifecycleExecution(
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): InterruptLifecycleExecution {
  return InterruptLifecycleExecution.fromResolvers(
    (admitted) =>
      resolveAdmittedActiveInterruptSubject(
        admitted,
        executionRegistry,
        attackResolvers,
      ),
    ({ state, continuation, handledInterruptTrigger }) =>
      resolveInterruptContinuation({
        state,
        continuation,
        handledInterruptTrigger,
        execution: interruptContinuationExecution(
          executionRegistry,
          attackResolvers,
        ),
      }),
  );
}

function interruptContinuationExecution(
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): InterruptContinuationExecution {
  return InterruptContinuationExecution.fromExecution(
    replayContinuationExecution(executionRegistry, attackResolvers),
    attackResolvers,
  );
}

function replayContinuationExecution(
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): ReplayContinuationExecution {
  return ReplayContinuationExecution.fromExecutionRegistry(
    executionRegistry,
    (admitted, boundExecutionRegistry) =>
      resolveAdmittedReplayContinuationSubject(
        admitted,
        boundExecutionRegistry,
        attackResolvers,
      ),
  );
}

function resolveBattleSubjectInternal(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): BattleResolutionResult {
  const normalizedInputState = normalizeEarlyEndedOngoingFeatures(input.state);
  if (normalizedInputState !== input.state) {
    return resolveBattleSubjectInternal(
      { ...input, state: normalizedInputState },
      options,
    );
  }
  const d20TestNaturalOneRerollResult = resolveD20TestNaturalOneRerollFills({
    resolutionInput: input,
    resolvePrefix: (prefixInput) =>
      resolveBattleSubjectAfterD20TestNaturalOneReroll(prefixInput, options),
  });
  if (d20TestNaturalOneRerollResult !== undefined) {
    return d20TestNaturalOneRerollResult;
  }
  return resolveBattleSubjectAfterD20TestNaturalOneReroll(input, options);
}

function resolveBattleSubjectAfterD20TestNaturalOneReroll(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): BattleResolutionResult {
  const interruptRouteOptions = options.interruptRouteOptions;
  const handledInterruptRouteOption =
    interruptRouteOptions.handledInterruptTrigger === undefined
      ? {}
      : {
          handledInterruptTrigger:
            interruptRouteOptions.handledInterruptTrigger,
        };
  if (
    input.state.interruptStack.length > 0 &&
    interruptRouteOptions.replayingInterruptedProcedure !== true
  ) {
    const activeFrame = currentInterruptFrame(input.state);
    if (activeFrame !== null) {
      const activeContinuation = resolveActiveInterruptContinuation({
        state: input.state,
        frame: activeFrame,
        subject: input.subject,
        fills: input.fills,
        execution: interruptContinuationExecution(
          options.executionRegistry,
          options.attackResolvers,
        ),
      });
      if (activeContinuation.tag === "resolved") {
        return activeContinuation.result;
      }
      const nonContinuationFrame = activeContinuation.frame;
      /* v8 ignore start -- Defensive stale-subject rejection: these typed cleanup frames are resolved by their dedicated witness APIs, not ordinary subject dispatch. */
      if (nonContinuationFrame.kind === "flySpeedGrantEndFallCleanup") {
        return invalidResult(
          input.state,
          "staleSubject",
          "Fly Speed end-fall witness must be resolved before other battle subjects.",
        );
      }
      if (nonContinuationFrame.kind === "fallDamageLandingMitigation") {
        return invalidResult(
          input.state,
          "staleSubject",
          "Fall damage landing mitigation must be resolved before other battle subjects.",
        );
      }
      /* v8 ignore stop */
      if (nonContinuationFrame.frame.activeInterrupt !== undefined) {
        return resolveActiveInterruptProcedure({
          resolution: input,
          execution: interruptLifecycleExecution(
            options.executionRegistry,
            options.attackResolvers,
          ),
        });
      }
    }
    return invalidResult(
      input.state,
      "staleSubject",
      "A pending interrupt checkpoint must be resolved before the interrupted procedure can continue.",
    );
  }

  const actorId = battleSubjectActorId(input.subject);
  if (
    actorId !== currentActorId(input.state) &&
    !isLegendaryAttackSubject(input.state, input.subject) &&
    !isReleaseGrappleSubject(input.subject) &&
    !persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn(input.subject)
  ) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }
  /* v8 ignore start -- Defensive stale-subject rejection: rediscovery omits Legendary Actions once their post-turn window has closed. */
  if (
    isLegendaryAttackSubject(input.state, input.subject) &&
    !statBlockLegendaryActionWindowIsOpen(input.state, actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Legendary Actions are available only after another creature's turn ends.",
    );
  }
  /* v8 ignore stop */

  /* v8 ignore start -- Defensive malformed/stale subject rejection: admitted and rediscovered subjects always name a combatant still present in the battle. */
  if (!input.state.combatants.has(actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const commandObligationIssue = pendingCommandObligationIssue(
    input.state,
    input.subject,
  );
  /* v8 ignore start -- Defensive stale-subject rejection: rediscovery exposes the pending Command obligation instead of unrelated subjects. */
  if (commandObligationIssue !== null) {
    return invalidResult(input.state, "staleSubject", commandObligationIssue);
  }
  /* v8 ignore stop */
  const commandHaltIssue = commandHaltSuppressionIssue(
    input.state,
    input.subject,
  );
  if (commandHaltIssue !== null) {
    return invalidResult(input.state, "staleSubject", commandHaltIssue);
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
  if (battleSubjectInterdictedByAntimagicField(input.state, input.subject)) {
    return invalidResult(
      input.state,
      "staleSubject",
      antimagicFieldInterdictionMessage(input.state, input.subject),
    );
  }

  const actionEligibilityIssue = battleSubjectActionEligibilityIssue(
    input.state,
    input.subject,
  );
  if (actionEligibilityIssue !== null) {
    return invalidResult(input.state, "staleSubject", actionEligibilityIssue);
  }
  const result = (() => {
    const subject = input.subject;
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "endConcentration"
    ) {
      return resolveEndConcentrationCommand({ ...input, subject });
    }
    if (subject.tag === "action" && subject.action === "attack") {
      return options.attackResolvers.resolveAttack({
        ...input,
        subject,
        ...interruptRouteOptions,
      });
    }
    if (subject.tag === "pactOfTheChainFamiliarAttack") {
      return options.attackResolvers.resolvePactOfTheChainFamiliarReactionAttack(
        {
          ...input,
          subject,
          ...interruptRouteOptions,
        },
      );
    }
    if (subject.tag === "creatureAttack") {
      return resolveCreatureAttack({ ...input, subject });
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
    if (
      subject.tag === "action" &&
      subject.action === "shakeAwakeFromHypnoticPattern"
    ) {
      return resolveShakeAwakeFromHypnoticPattern({ ...input, subject });
    }
    if (subject.tag === "bonusAction" && subject.action === "offHandAttack") {
      return resolveOffHandAttack({
        ...input,
        subject,
        ...interruptRouteOptions,
      });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "martialArtsUnarmedStrike"
    ) {
      return resolveMartialArtsBonusUnarmedStrike({
        ...input,
        subject,
        ...interruptRouteOptions,
      });
    }
    if (subject.tag === "bonusActionStandardAction") {
      return resolveBonusActionStandardAction({ ...input, subject });
    }
    if (subject.tag === "monkFocusOption") {
      return resolveMonkFocusOption({ ...input, subject });
    }
    if (subject.tag === "monkFocusFlurryOfBlowsStrike") {
      return options.attackResolvers.resolveMonkFocusFlurryOfBlowsStrike({
        ...input,
        subject,
        ...interruptRouteOptions,
      });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "statBlockActionOption"
    ) {
      return resolveStatBlockBonusActionOption({ ...input, subject });
    }
    if (subject.tag === "companionLifecycle") {
      return resolveCompanionLifecycleSubject({ ...input, subject });
    }
    if (subject.tag === "findFamiliarSharedSenses") {
      return resolveFindFamiliarSharedSensesSubject({ ...input, subject });
    }
    if (subject.tag === "findFamiliarTouchSpell") {
      return resolveFindFamiliarTouchSpellSubject(
        { ...input, subject },
        FindFamiliarProcedureExecution.fromResolver((admitted) =>
          resolveBattleSubjectInternal(admitted, options),
        ),
        options.interruptRouteOptions.replayingInterruptedProcedure === true
          ? "committed"
          : "uncommitted",
      );
    }
    if (subject.tag === "actionSpell") {
      return resolveSpellAct(
        {
          ...input,
          subject,
          ...interruptRouteOptions,
        },
        options.executionRegistry,
      );
    }
    if (subject.tag === "bonusActionSpell") {
      return resolveBonusActionSpellAct(
        {
          ...input,
          subject,
          ...(interruptRouteOptions.handledInterruptTrigger === undefined
            ? {}
            : {
                handledInterruptTrigger:
                  interruptRouteOptions.handledInterruptTrigger,
              }),
        },
        options.executionRegistry,
      );
    }
    if (subject.tag === "bonusActionDashSpell") {
      return resolveBonusActionDashSpellAct(
        {
          ...input,
          subject,
          ...(interruptRouteOptions.handledInterruptTrigger === undefined
            ? {}
            : {
                handledInterruptTrigger:
                  interruptRouteOptions.handledInterruptTrigger,
              }),
        },
        options.executionRegistry,
      );
    }
    if (subject.tag === "unitFeature") {
      return resolveUnitFeature({ ...input, subject });
    }
    if (subject.tag === "unitFeatureHeldWeaponActivation") {
      return resolveUnitFeatureHeldWeaponActivation({ ...input, subject });
    }
    if (subject.tag === "druidWildShape") {
      return resolveDruidWildShapeUnitFeature({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
      return resolveEndTurnCommand(input);
    }
    if (isCommandFollowUpSubject(subject)) {
      return resolveCommandFollowUp({ ...input, subject });
    }
    if (isMovementProcedureSubject(subject)) {
      return resolveMovementProcedure({ ...input, subject });
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
      subject.command === "levitateAltitudeControl"
    ) {
      return resolveLevitateAltitudeControlCommand({ ...input, subject });
    }
    if (isPersistentSpatialSpellProcedureSubject(subject)) {
      return resolvePersistentSpatialSpellProcedureCommand({
        ...input,
        subject,
        ...handledInterruptRouteOption,
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
      subject.command === "creatureTypeProtectionConditionAttempt"
    ) {
      return resolveCreatureTypeProtectionConditionAttemptCommand({
        ...input,
        subject,
      });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "creatureTypeProtectionPossessionAttempt"
    ) {
      return resolveCreatureTypeProtectionPossessionAttemptCommand({
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
      subject.command === "disperseCloudkill"
    ) {
      return resolveDisperseCloudkillCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "wardingBondSeparation"
    ) {
      return resolveWardingBondSeparationCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseReadiedSpell"
    ) {
      return resolveReleaseReadiedSpellCommand(
        { ...input, subject },
        {
          ...handledInterruptRouteOption,
        },
      );
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
      return resolveCastTriggeredReactionSpellCommand(
        {
          ...input,
          subject,
          ...handledInterruptRouteOption,
        },
        options.executionRegistry,
      );
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "castAttackHitBonusActionSpell"
    ) {
      return resolveCastAttackHitBonusActionSpellCommand(
        {
          ...input,
          subject,
          ...handledInterruptRouteOption,
        },
        options.executionRegistry,
      );
    }
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "releaseGrapple"
    ) {
      return resolveReleaseGrappleCommand({ ...input, subject });
    }
    if (
      subject.tag === "runtimeCommand" &&
      (subject.command === "opportunityAttack" ||
        subject.command === "retaliationAttack")
    ) {
      return resolveOpportunityAttackCommand({
        ...input,
        subject,
        ...handledInterruptRouteOption,
        ...(interruptRouteOptions.pendingAttackDamageReductions === undefined
          ? {}
          : {
              pendingAttackDamageReductions:
                interruptRouteOptions.pendingAttackDamageReductions,
            }),
      });
    }
    /* v8 ignore start -- Exhaustive continuation marker: creature-fall interrupt frames store this subject under a `resolved` continuation, and resumeInterruptedProcedure returns that state before dispatching the marker. Only a forged direct resolution request reaches this arm. */
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
    /* v8 ignore stop */
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "dragonsBreathExhale"
    ) {
      return resolveDragonsBreathExhaleCommand({
        ...input,
        subject,
      });
    }
    /* v8 ignore start -- The subject union is exhausted above; this emitted tail is reachable only if a new variant is added without a dispatcher arm, which fails compilation at this assignment. */
    const exhaustive: never = subject;
    return exhaustive;
    /* v8 ignore stop */
  })();
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function actionHideSubject(subject: {
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

function actionSearchSubject(subject: {
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

function isReleaseGrappleSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
> {
  return (
    subject.tag === "runtimeCommand" && subject.command === "releaseGrapple"
  );
}

export function resolveBattleInterrupt(
  input: {
    readonly state: BattleState;
    readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  const outcome = resolveInterruptLifecycleDecision({
    ...input,
    execution: interruptLifecycleExecution(executionRegistry, attackResolvers),
  });
  return outcome.tag === "withoutInterruptRoute"
    ? outcome.result
    : {
        ...outcome.result,
        routeEvents: battleReducerRouteForInterrupt(
          input.state,
          input.fill,
          outcome.result,
        ),
      };
}

export function endTurn(
  input: {
    readonly state: BattleState;
    readonly actorId: CombatantId;
    readonly fills?: readonly BattleFill[];
  },
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  const admission = admitBattleResolutionInput({
    state: input.state,
    subject: {
      tag: "runtimeCommand",
      actorId: input.actorId,
      command: "endTurn",
    },
    fills: input.fills ?? [],
  });
  if (admission.tag === "staleCharacterProcedure") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The End Turn procedure is unavailable.",
    );
  }
  const result = resolveAdmittedBattleSubject(
    admission.input,
    executionRegistry,
    attackResolvers,
  );
  const routeEvents = battleReducerRouteForResolution(admission.input, result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

export {
  battleAttackHostParticipantId,
  attackDamageInterruptionFrame,
  parseAttackDamageInterruptionFrame,
  attackDamageEventAfterPendingReduction,
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackFillsForAttackHitReplay,
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
