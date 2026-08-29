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
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
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

import { Match } from "effect";
import { resolveReportReadyTriggerCommand } from "./ready-trigger.ts";
import { optionalProperty } from "../optional-property.ts";

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
  interruptDecisionFrontier,
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
import {
  battleSubjectActorId,
  combatantCanTakeActions,
  isLegendaryAttackSubject,
  normalizeEarlyEndedOngoingFeatures,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
import { consumeOrCloseLegendaryActionWindow } from "./legendary-action-window.ts";
import {
  CompanionLifecycleProcedureExecution,
  resolveCompanionLifecycleSubject,
  resolveSpawnedCompanionSharedSensesSubject,
  resolveSpawnedCompanionTouchSpellSubject,
} from "./companion-lifecycle-procedures.ts";
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
  resolveControlledVerticalSuspensionAltitudeControlCommand,
  resolveReplaceSelfTransformationModeCommand,
} from "./active-spell-control-procedures.ts";
import {
  resolveDisperseTranslatingPersistentAreaCommand,
  resolveDispersePersistentAreaTraitCommand,
  resolveLinkedDefenseResistanceDamageShareSeparationCommand,
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
  magicSuppressionInterdictionMessage,
  battleSubjectInterdictedByMagicSuppressionEmanation,
} from "./magic-suppression-action-interdiction.ts";
import type { SpellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-registry.ts";
import {
  currentActorHasOpenStatBlockMultiattackDispatch,
  subjectAllowedDuringStatBlockMultiattackDispatch,
  isStatBlockBattleCreatureState,
} from "./battle-discovery.ts";
import {
  resolveBonusActionDashSpellAct,
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./spells-resolve.ts";
import { resolveReleaseSpellCreatedHeldObjectCommand } from "./spells-resolve-release.ts";
import { resolveGrantedAreaSaveDamageActionCommand } from "./granted-area-save-damage.ts";
import type { BattleAttackRouteResolvers } from "./attack-resolvers.ts";
import {
  resolveBonusActionDash,
  resolveBonusActionDisengage,
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
  resolveShakeAwakeFromSaveGatedAreaControl,
  resolveShakeAwakeFromHitPointBudgetCondition,
  resolveShove,
  resolveStatBlockBonusActionOption,
} from "./attack-resolution.ts";
import {
  statBlockBonusActionOptionBindings,
  statBlockMultiattackBindings,
  statBlockProcedureResourcesAvailable,
} from "../stat-block-execution-state.ts";
import {
  resolveMartialArtsBonusUnarmedStrike,
  resolveOffHandAttack,
} from "./attack-offhand.ts";
import {
  resolveReleaseReadiedActionCommand,
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
} from "./readied-release.ts";
import {
  isCompelledBehaviorFollowUpSubject,
  pendingCompelledBehaviorObligationIssue,
  resolveCompelledHaltEndTurn,
  resolveCompelledBehaviorFollowUp,
} from "./compelled-behavior-procedures.ts";
import { compelledHaltSuppressionIssue } from "./compelled-behavior-halt.ts";
import {
  isMovementProcedureSubject,
  resolveMovementProcedure,
} from "./movement-procedures.ts";
import { resolveEndTurnCommand } from "./turn-boundary-lifecycle.ts";
import {
  isPersistentSpatialSpellProcedureSubject,
  isPersistentAreaSubjectAllowedOutsideCurrentActorTurn,
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
  AdmittedBonusActionStandardActionBattleResolutionInput,
  BattleInterruptRouteOptions,
  BattleFill,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { bonusActionDashTemporaryHitPointsProfilesForActor } from "./hole-helpers.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { battleSubjectActionEligibilityIssue } from "./action-eligibility.ts";

type ResolveBattleSubjectInternalOptions = {
  readonly executionRegistry: SpellProcedureExecutionRegistry;
  readonly attackResolvers: BattleAttackRouteResolvers;
  readonly interruptRouteOptions: BattleInterruptRouteOptions;
  readonly readiedActionActorId?: CombatantId;
};

export function resolveAdmittedBattleSubject(
  input: AdmittedBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
  interruptRouteOptions: BattleInterruptRouteOptions = {},
): BattleResolutionResult {
  return resolveBattleSubjectInternal(input, {
    executionRegistry,
    attackResolvers,
    interruptRouteOptions,
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
    ({ state, continuation, handledInterruptOccurrence }) =>
      resolveInterruptContinuation({
        state,
        continuation,
        handledInterruptOccurrence,
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
    const normalizedAdmission = admitBattleResolutionInput({
      ...input,
      state: normalizedInputState,
    });
    /* v8 ignore start -- @preserve -- Normalization changes only active-effect lifecycle state and preserves every admitted procedure binding. */
    if (normalizedAdmission.tag === "staleCharacterProcedure") {
      return invalidResult(
        normalizedInputState,
        "staleSubject",
        "The selected character procedure reference is no longer bound to this actor.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return resolveBattleSubjectInternal(normalizedAdmission.input, options);
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

function interruptSubjectRequiresCheckpoint(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): boolean {
  return (
    input.state.interruptStack.length > 0 &&
    options.interruptRouteOptions.replayingInterruptedProcedure !== true &&
    options.readiedActionActorId === undefined &&
    !(
      input.subject.tag === "runtimeCommand" &&
      input.subject.command === "reportReadyTrigger"
    )
  );
}

function resolvePendingInterruptSubject(input: {
  readonly input: AdmittedBattleResolutionInput;
  readonly options: ResolveBattleSubjectInternalOptions;
}): BattleResolutionResult | null {
  if (!interruptSubjectRequiresCheckpoint(input.input, input.options)) {
    return null;
  }
  const activeFrame = currentInterruptFrame(input.input.state);
  if (activeFrame !== null) {
    const activeContinuation = resolveActiveInterruptContinuation({
      state: input.input.state,
      frame: activeFrame,
      subject: input.input.subject,
      fills: input.input.fills,
      execution: interruptContinuationExecution(
        input.options.executionRegistry,
        input.options.attackResolvers,
      ),
    });
    if (activeContinuation.tag === "resolved") {
      return activeContinuation.result;
    }
    const nonContinuationFrame = activeContinuation.frame;
    /* v8 ignore start -- @preserve -- Defensive stale-subject rejection: these typed cleanup frames are resolved by their dedicated witness APIs, not ordinary subject dispatch. */
    if (nonContinuationFrame.kind === "grantedFlightEndFallCleanup") {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Fly Speed end-fall witness must be resolved before other battle subjects.",
      );
    }
    if (nonContinuationFrame.kind === "fallDamageLandingMitigation") {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Fall damage landing mitigation must be resolved before other battle subjects.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (nonContinuationFrame.frame.activeInterrupt !== undefined) {
      return resolveActiveInterruptProcedure({
        resolution: input.input,
        execution: interruptLifecycleExecution(
          input.options.executionRegistry,
          input.options.attackResolvers,
        ),
      });
    }
  }
  return invalidResult(
    input.input.state,
    "staleSubject",
    "A pending interrupt checkpoint must be resolved before the interrupted procedure can continue.",
  );
}

function handledInterruptOccurrenceForRoute(
  options: BattleInterruptRouteOptions,
) {
  return options.replayingInterruptedProcedure === true
    ? options.handledInterruptOccurrence
    : undefined;
}

function handledInterruptTriggerForRoute(
  options: BattleInterruptRouteOptions,
  occurrence: ReturnType<typeof handledInterruptOccurrenceForRoute>,
) {
  return options.replayingInterruptedProcedure === true
    ? occurrence?.trigger
    : options.handledInterruptTrigger;
}

function replayObjectOutcomesRouteOption(options: BattleInterruptRouteOptions) {
  return options.replayingInterruptedProcedure === true
    ? optionalProperty("replayObjectOutcomes", options.objectOutcomes)
    : {};
}

function interruptConsumerRouteOptions(
  options: BattleInterruptRouteOptions,
  occurrence: ReturnType<typeof handledInterruptOccurrenceForRoute>,
  handledInterruptRouteOption: ReturnType<
    typeof optionalProperty<
      "handledInterruptTrigger",
      ReturnType<typeof handledInterruptTriggerForRoute>
    >
  >,
  replayParentRouteOption: ReturnType<
    typeof optionalProperty<
      "replayParentPosition",
      BattleInterruptRouteOptions["replayParentPosition"]
    >
  >,
) {
  if (
    options.replayingInterruptedProcedure === true &&
    occurrence !== undefined
  ) {
    return {
      replayingInterruptedProcedure: true as const,
      handledInterruptTrigger: occurrence.trigger,
      ...replayParentRouteOption,
      ...optionalProperty(
        "pendingAttackDamageReductions",
        options.pendingAttackDamageReductions,
      ),
      ...optionalProperty(
        "pendingAttackDamageAdditions",
        options.pendingAttackDamageAdditions,
      ),
    };
  }
  return handledInterruptRouteOption;
}

function handledSaveFailedOccurrenceForRoute(
  occurrence: ReturnType<typeof handledInterruptOccurrenceForRoute>,
) {
  return occurrence?.trigger === "saveFailed" ? occurrence : undefined;
}

function battleSubjectInterruptRouteProjection(
  options: BattleInterruptRouteOptions,
) {
  const handledInterruptOccurrence =
    handledInterruptOccurrenceForRoute(options);
  const handledInterruptTrigger = handledInterruptTriggerForRoute(
    options,
    handledInterruptOccurrence,
  );
  const handledInterruptRouteOption = optionalProperty(
    "handledInterruptTrigger",
    handledInterruptTrigger,
  );
  const replayParentRouteOption = optionalProperty(
    "replayParentPosition",
    options.replayParentPosition,
  );
  const handledSaveFailedOccurrence = handledSaveFailedOccurrenceForRoute(
    handledInterruptOccurrence,
  );
  return {
    handledInterruptOccurrence,
    handledInterruptTrigger,
    handledInterruptRouteOption,
    replayParentRouteOption,
    replayObjectOutcomesOption: replayObjectOutcomesRouteOption(options),
    interruptConsumerOptions: interruptConsumerRouteOptions(
      options,
      handledInterruptOccurrence,
      handledInterruptRouteOption,
      replayParentRouteOption,
    ),
    persistentSpatialReplayRouteOption: {
      ...optionalProperty(
        "handledSaveFailedOccurrence",
        handledSaveFailedOccurrence,
      ),
      ...replayParentRouteOption,
    },
  };
}

function battleSubjectActorAdmissionResult(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): BattleResolutionResult | null {
  const actorId = battleSubjectActorId(input.subject);
  if (battleSubjectHasWrongActor(input, options, actorId)) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }
  /* v8 ignore start -- @preserve -- Defensive stale-subject rejection: rediscovery omits Legendary Actions once their post-turn window has closed. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Defensive malformed/stale subject rejection: admitted and rediscovered subjects always name a combatant still present in the battle. */
  if (!input.state.combatants.has(actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function battleSubjectHasWrongActor(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
  actorId: CombatantId,
): boolean {
  return (
    actorId !== currentActorId(input.state) &&
    actorId !== options.readiedActionActorId &&
    options.interruptRouteOptions.replayParentPosition === undefined &&
    !isLegendaryAttackSubject(input.state, input.subject) &&
    !isReleaseGrappleSubject(input.subject) &&
    !isPersistentAreaSubjectAllowedOutsideCurrentActorTurn(input.subject)
  );
}

function battleSubjectObligationAdmissionResult(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): BattleResolutionResult | null {
  const compelledBehaviorObligationIssue =
    pendingCompelledBehaviorObligationIssue(input.state, input.subject);
  /* v8 ignore start -- @preserve -- Defensive stale-subject rejection: rediscovery exposes the pending Command obligation instead of unrelated subjects. */
  if (compelledBehaviorObligationIssue !== null) {
    return invalidResult(
      input.state,
      "staleSubject",
      compelledBehaviorObligationIssue,
    );
  }
  /* v8 ignore stop -- @preserve */
  const compelledHaltIssue = compelledHaltSuppressionIssue(
    input.state,
    input.subject,
  );
  if (compelledHaltIssue !== null) {
    return invalidResult(input.state, "staleSubject", compelledHaltIssue);
  }
  if (
    options.readiedActionActorId === undefined &&
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
    battleSubjectInterdictedByMagicSuppressionEmanation(
      input.state,
      input.subject,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      magicSuppressionInterdictionMessage(input.state, input.subject),
    );
  }
  const actionEligibilityIssue = battleSubjectActionEligibilityIssue(
    input.state,
    input.subject,
  );
  return actionEligibilityIssue === null
    ? null
    : invalidResult(input.state, "staleSubject", actionEligibilityIssue);
}

function resolveBattleSubjectAfterD20TestNaturalOneReroll(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): BattleResolutionResult {
  const interruptRouteOptions = options.interruptRouteOptions;
  const route = battleSubjectInterruptRouteProjection(interruptRouteOptions);
  const {
    handledInterruptTrigger,
    handledInterruptRouteOption,
    replayParentRouteOption,
    replayObjectOutcomesOption,
    interruptConsumerOptions,
    persistentSpatialReplayRouteOption,
  } = route;
  const pendingInterruptResult = resolvePendingInterruptSubject({
    input,
    options,
  });
  if (pendingInterruptResult !== null) return pendingInterruptResult;

  const actorAdmission = battleSubjectActorAdmissionResult(input, options);
  if (actorAdmission !== null) return actorAdmission;
  const obligationAdmission = battleSubjectObligationAdmissionResult(
    input,
    options,
  );
  if (obligationAdmission !== null) return obligationAdmission;
  const result = (() => {
    if (input.admissionKind !== "general") {
      return resolveSpecializedAdmission(input);
    }
    const subject = input.subject;
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "endConcentration"
    ) {
      return resolveEndConcentrationCommand({ ...input, subject });
    }
    if (subject.tag === "action") {
      if (subject.action === "attack") {
        return options.attackResolvers.resolveAttack({
          ...input,
          subject,
          ...interruptConsumerOptions,
        });
      }
      if (subject.action === "dash") {
        return resolveDash({ ...input, subject });
      }
      if (subject.action === "disengage") {
        return resolveDisengage(input);
      }
      if (subject.action === "dodge") {
        return resolveDodge(input);
      }
      if (subject.action === "helpAttack") {
        return resolveHelpAttack({ ...input, subject });
      }
      if (subject.action === "hide") {
        return resolveHide({ ...input, subject: actionHideSubject(subject) });
      }
      if (subject.action === "multiattack") {
        return resolveMultiattackSubject(input, subject);
      }
      if (subject.action === "ready") {
        return resolveReady({ ...input, subject });
      }
      if (subject.action === "search") {
        return resolveSearch({
          ...input,
          subject: actionSearchSubject(subject),
        });
      }
      if (subject.action === "grapple") {
        return resolveGrapple({ ...input, subject });
      }
      if (subject.action === "shove") {
        return resolveShove({ ...input, subject });
      }
      if (subject.action === "escapeGrapple") {
        return resolveEscapeGrapple({ ...input, subject });
      }
      if (subject.action === "escapeSpellRestraint") {
        return resolveEscapeSpellRestraint({ ...input, subject });
      }
      if (subject.action === "shakeAwakeFromStagedCondition") {
        return resolveShakeAwakeFromHitPointBudgetCondition({
          ...input,
          subject,
        });
      }
      if (subject.action === "shakeAwakeFromAreaControl") {
        return resolveShakeAwakeFromSaveGatedAreaControl({ ...input, subject });
      }
    }
    if (subject.tag === "companionAttack") {
      return options.attackResolvers.resolvePactOfTheChainFamiliarReactionAttack(
        {
          ...input,
          subject,
          ...interruptRouteOptions,
        },
      );
    }
    if (subject.tag === "bonusAction" && subject.action === "offHandAttack") {
      return resolveOffHandAttack({
        ...input,
        subject,
        ...interruptConsumerOptions,
      });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "martialArtsUnarmedStrike"
    ) {
      return resolveMartialArtsBonusUnarmedStrike({
        ...input,
        subject,
        ...interruptConsumerOptions,
      });
    }
    if (subject.tag === "monkFocusOption") {
      return resolveMonkFocusOption({ ...input, subject });
    }
    if (subject.tag === "monkFocusFlurryOfBlowsStrike") {
      return options.attackResolvers.resolveMonkFocusFlurryOfBlowsStrike({
        ...input,
        subject,
        ...interruptConsumerOptions,
      });
    }
    if (
      subject.tag === "bonusAction" &&
      subject.action === "statBlockActionOption"
    ) {
      return resolveStatBlockBonusActionOptionSubject(input, subject);
    }
    if (subject.tag === "companionLifecycle") {
      return resolveCompanionLifecycleSubject({ ...input, subject });
    }
    if (subject.tag === "spawnedCompanionSharedSenses") {
      return resolveSpawnedCompanionSharedSensesSubject({ ...input, subject });
    }
    if (subject.tag === "spawnedCompanionTouchSpellProxy") {
      return resolveSpawnedCompanionTouchSpellSubject(
        { ...input, subject },
        CompanionLifecycleProcedureExecution.fromResolver((admitted) =>
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
          ...interruptConsumerOptions,
        },
        options.executionRegistry,
      );
    }
    if (subject.tag === "bonusActionSpell") {
      return resolveBonusActionSpellAct(
        {
          ...input,
          subject,
          ...(handledInterruptTrigger === undefined
            ? {}
            : {
                handledInterruptTrigger,
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
          ...(handledInterruptTrigger === undefined
            ? {}
            : {
                handledInterruptTrigger,
              }),
        },
        options.executionRegistry,
      );
    }
    if (subject.tag === "unitFeatureHeldWeaponActivation") {
      return resolveUnitFeatureHeldWeaponActivation({ ...input, subject });
    }
    if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
      return input.state.currentTurnResources.compelledHalt === null
        ? resolveEndTurnCommand({
            ...input,
            ...handledInterruptRouteOption,
            ...replayParentRouteOption,
          })
        : resolveCompelledHaltEndTurn({
            ...input,
            subject,
            ...handledInterruptRouteOption,
            ...replayParentRouteOption,
          });
    }
    if (isCompelledBehaviorFollowUpSubject(subject)) {
      return resolveCompelledBehaviorFollowUp({
        ...input,
        subject,
        ...handledInterruptRouteOption,
        ...replayParentRouteOption,
        ...replayObjectOutcomesOption,
      });
    }
    if (isMovementProcedureSubject(subject)) {
      return resolveMovementProcedure({
        ...input,
        subject,
        ...handledInterruptRouteOption,
      });
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
      subject.command === "controlledVerticalSuspensionAltitudeControl"
    ) {
      return resolveControlledVerticalSuspensionAltitudeControlCommand({
        ...input,
        subject,
      });
    }
    if (isPersistentSpatialSpellProcedureSubject(subject)) {
      return resolvePersistentSpatialSpellProcedureCommand({
        ...input,
        subject,
        ...persistentSpatialReplayRouteOption,
      });
    }
    if (subject.tag === "runtimeCommand") {
      if (subject.command === "protectionRelevantEffectSave") {
        return resolveProtectionRelevantEffectSaveCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "creatureTypeProtectionConditionAttempt") {
        return resolveCreatureTypeProtectionConditionAttemptCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "creatureTypeProtectionPossessionAttempt") {
        return resolveCreatureTypeProtectionPossessionAttemptCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "endPersistentAreaTraitForEnvironment") {
        return resolveDispersePersistentAreaTraitCommand({ ...input, subject });
      }
      if (subject.command === "endPersistentAreaSaveDamageForEnvironment") {
        return resolveDisperseTranslatingPersistentAreaCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "linkedDefenseResistanceDamageShareSeparation") {
        return resolveLinkedDefenseResistanceDamageShareSeparationCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "releaseReadiedSpell") {
        return resolveReleaseReadiedSpellCommand(
          { ...input, subject },
          {
            ...handledInterruptRouteOption,
          },
        );
      }
      if (subject.command === "releaseReadiedMovement") {
        return resolveReleaseReadiedMovementCommand({ ...input, subject });
      }
      if (subject.command === "releaseReadiedAction") {
        return resolveReleaseReadiedActionCommand(
          { ...input, subject },
          (readiedActionInput) => {
            const admission = admitBattleResolutionInput(readiedActionInput);
            if (admission.tag === "staleCharacterProcedure") {
              return invalidResult(
                readiedActionInput.state,
                "staleSubject",
                "The readied action is no longer bound to its responder.",
              );
            }
            return resolveBattleSubjectInternal(admission.input, {
              ...options,
              readiedActionActorId: subject.reactorId,
            });
          },
        );
      }
      if (subject.command === "reportReadyTrigger") {
        return resolveReportReadyTriggerCommand({ ...input, subject });
      }
      if (subject.command === "releaseSpellCreatedHeldObject") {
        return resolveReleaseSpellCreatedHeldObjectCommand({
          ...input,
          subject,
        });
      }
      if (subject.command === "castTriggeredReactionSpell") {
        return resolveCastTriggeredReactionSpellCommand(
          {
            ...input,
            subject,
            ...handledInterruptRouteOption,
          },
          options.executionRegistry,
        );
      }
      if (subject.command === "castAttackHitBonusActionSpell") {
        return resolveCastAttackHitBonusActionSpellCommand(
          {
            ...input,
            subject,
            ...handledInterruptRouteOption,
          },
          options.executionRegistry,
        );
      }
      if (subject.command === "releaseGrapple") {
        return resolveReleaseGrappleCommand({ ...input, subject });
      }
      if (
        subject.command === "releaseReadiedAttack" ||
        subject.command === "opportunityAttack" ||
        subject.command === "retaliationAttack"
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
      /* v8 ignore start -- @preserve -- Exhaustive continuation marker: creature-fall interrupt frames store this subject under a `resolved` continuation, and resumeInterruptedProcedure returns that state before dispatching the marker. Only a forged direct resolution request reaches this arm. */
      if (subject.command === "creatureFalls") {
        return {
          tag: "resolved" as const,
          state: input.state,
          snapshot: snapshotBattle(input.state),
        };
      }
      /* v8 ignore stop -- @preserve */
      if (subject.command === "grantedAreaSaveDamageAction") {
        return resolveGrantedAreaSaveDamageActionCommand({
          ...input,
          subject,
        });
      }
    }
    /* v8 ignore start -- @preserve -- The subject union is exhausted above; this emitted tail is reachable only if a new variant is added without a dispatcher arm, which fails compilation at this assignment. */
    const exhaustive: never = subject;
    return exhaustive;
    /* v8 ignore stop -- @preserve */
  })();
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function resolveSpecializedAdmission(
  input: Exclude<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  >,
): BattleResolutionResult {
  return Match.value(input).pipe(
    Match.when({ admissionKind: "unitFeature" }, resolveUnitFeature),
    Match.when(
      { admissionKind: "druidWildShape" },
      resolveDruidWildShapeUnitFeature,
    ),
    Match.when(
      { admissionKind: "bonusActionStandardAction" },
      resolveBonusActionStandardActionSubject,
    ),
    Match.when(
      { admissionKind: "bonusActionStandardActionRejection" },
      (rejectionInput) =>
        invalidResult(
          rejectionInput.state,
          rejectionInput.bonusActionStandardActionRejection.reason,
          rejectionInput.bonusActionStandardActionRejection.message,
        ),
    ),
    Match.exhaustive,
  );
}

function resolveBonusActionStandardActionSubject(
  input: AdmittedBonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  return Match.value(input).pipe(
    Match.when(
      {
        bonusActionStandardActionAdmission: {
          procedure: { kind: "grantedAlternateActionCost" },
        },
      },
      (dashInput) =>
        resolveBonusActionDash({
          ...dashInput,
          actor: dashInput.bonusActionStandardActionAdmission.actor,
          dashTemporaryHitPoints: { kind: "notGranted" },
        }),
    ),
    Match.when(
      {
        bonusActionStandardActionAdmission: {
          procedure: { kind: "dashTemporaryHitPoints" },
        },
      },
      (dashInput) => {
        const actor = dashInput.bonusActionStandardActionAdmission.actor;
        const resource = bonusActionDashTemporaryHitPointsProfilesForActor(
          actor,
        ).find(
          (entry) => entry.procedureRef === dashInput.subject.procedureRef,
        )?.resource;
        return resolveBonusActionDash({
          ...dashInput,
          actor,
          dashTemporaryHitPoints:
            resource === undefined
              ? { kind: "unavailable" }
              : { kind: "available", resource },
        });
      },
    ),
    Match.when(
      {
        bonusActionStandardActionAdmission: {
          procedure: { kind: "supportedAlternateActionCost" },
        },
      },
      (alternateActionInput) =>
        resolveSupportedAlternateActionCost(alternateActionInput),
    ),
    Match.exhaustive,
  );
}

function resolveSupportedAlternateActionCost(
  input: Extract<
    AdmittedBonusActionStandardActionBattleResolutionInput,
    {
      readonly bonusActionStandardActionAdmission: {
        readonly procedure: {
          readonly kind: "supportedAlternateActionCost";
        };
      };
    }
  >,
): BattleResolutionResult {
  const actor = input.bonusActionStandardActionAdmission.actor;
  const subject = input.subject;
  return Match.value(subject).pipe(
    Match.when({ action: "dash" }, (dashSubject) =>
      resolveBonusActionDash({
        ...input,
        subject: dashSubject,
        actor,
        dashTemporaryHitPoints: { kind: "notGranted" },
      }),
    ),
    Match.when({ action: "disengage" }, (disengageSubject) =>
      resolveBonusActionDisengage({
        ...input,
        subject: disengageSubject,
        actor,
      }),
    ),
    Match.when({ action: "hide" }, (hideSubject) =>
      resolveHide({ ...input, subject: hideSubject, actor }),
    ),
    Match.exhaustive,
  );
}

function resolveMultiattackSubject(
  input: Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  >,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "multiattack" }
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Multiattack accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  const multiattackBinding = statBlockMultiattackBindings(
    actor.origin.execution,
  ).find((binding) => binding.procedureRef === subject.procedureRef);
  if (multiattackBinding === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  return resolveMultiattack({
    ...input,
    subject,
    fills: [],
    actor,
    multiattackBinding,
  });
}

function resolveStatBlockBonusActionOptionSubject(
  input: Extract<
    AdmittedBattleResolutionInput,
    { readonly admissionKind: "general" }
  >,
  subject: Extract<
    BattleSubject,
    { readonly tag: "bonusAction"; readonly action: "statBlockActionOption" }
  >,
): BattleResolutionResult {
  const actor = input.state.combatants.get(subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  const optionBinding = statBlockBonusActionOptionBindings(
    actor.origin.execution,
  ).find((binding) => binding.procedureRef === subject.procedureRef);
  if (optionBinding === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  const standardAction = optionBinding.procedure.standardActions.find(
    (candidate) => candidate === subject.standardAction,
  );
  if (standardAction === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  if (
    !statBlockProcedureResourcesAvailable(
      actor.origin.execution,
      optionBinding.procedureRef,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stat Block Bonus Action resource is no longer available.",
    );
  }
  return resolveStatBlockBonusActionOption({
    ...input,
    subject,
    actor,
    optionBinding,
    standardAction,
  });
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
