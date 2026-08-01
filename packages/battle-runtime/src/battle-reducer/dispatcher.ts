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

import {
  spellActiveEffectForExecutionRef,
  spellActiveEffectExecutionRef,
} from "../active-effect/execution-ref.ts";
import {
  canSpendAction,
  canSpendBonusAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  damageAmount as toDamageAmount,
  type DamageAmount,
} from "@dnd/shared/types";
import { Match } from "effect";
import {
  attackDamageContinuationConcentrationFrame,
  interruptedProcedureSupportsAttackDamageChanges,
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import {
  currentInterruptCheckpoint,
  currentInterruptFrame,
  snapshotBattle,
} from "./battle-snapshot.ts";
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
import * as Either from "effect/Either";
import { type BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import {
  permanentlyDismissFindFamiliar,
  reappearAdmittedTemporarilyDismissedFindFamiliar,
  temporarilyDismissFindFamiliar,
} from "../find-familiar-lifecycle-execution.ts";
import {
  prepareTouchSpellDeliveryThroughFindFamiliar,
  shareFindFamiliarSenses as applyFindFamiliarSharedSenses,
  spendFindFamiliarTouchDeliveryReaction,
  type FindFamiliarWithin100FeetFact,
} from "../find-familiar-telepathy.ts";
import {
  companionReappearanceInitiativeHole,
  companionReappearancePlacementHole,
  findFamiliarConnectionHole,
  companionHeldObjectFactsHole,
  findFamiliarTouchDeliveryTargetHoles,
} from "../find-familiar-companion-subjects.ts";
import { findFamiliarCompanionEntryForOwner } from "../find-familiar-state.ts";
import {
  sameBattleSubject,
  type BattleSubject,
  type ActionHideSubject,
  type ActionSearchSubject,
} from "../battle-subjects.ts";
import {
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";
import { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  battleStateAfterCreatureAttackDamage,
  creatureAttackDamageHole,
  creatureAttackDamageTotal,
  creatureAttackFillSequence,
  creatureAttackHit,
  creatureAttackPilotActor,
  creatureAttackRollHole,
  creatureAttackSubjectCombatants,
} from "./creature-attack.ts";
import {
  levitatedTargetWithinSpellRangeFactPresent,
  levitateAltitudeChangeHole,
  updateLevitatedCreatureAltitude,
} from "./levitate-creature.ts";
import {
  battleSubjectActorId,
  closeLegendaryActionWindow,
  combatantCanTakeActions,
  consumeLegendaryActionWindow,
  isCharacterBattleCreatureState,
  isLegendaryAttackSubject,
  normalizeEarlyEndedOngoingFeatures,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
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
  damageRelationshipDecisionHole,
  DamageRelationshipDecisionsByHole,
} from "./damage-relationship-decisions.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { battleFillPrefixAccumulated } from "./battle-fill-equality.ts";
import {
  resolveReplayContinuation,
  resolveReplayContinuationFromState,
  type AdmittedReplayContinuationSubject,
  ReplayContinuationExecution,
} from "./replay-continuation.ts";
import {
  type AdmittedActiveInterruptProcedure,
  InterruptLifecycleExecution,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./interrupt-lifecycle.ts";
import {
  applyProtectionRelevantEffectSaveOutcome,
  conditionApplicationPreventedByCreatureTypeProtection,
  protectionRelevantEffectsForTarget,
  protectionRelevantEffectSavingThrowOutcomeHole,
  resolveBattlePossessionAttempt,
  validateProtectionRelevantEffectSavingThrowOutcome,
} from "./spell-condition-effects-helpers.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
  d20TestNaturalOneRerollHoleWithOption,
  d20TestNaturalOneRerollOutcomeDecisionRequired,
  d20TestNaturalOneRerollOutcomeIssue,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
} from "./d20-test-natural-one-reroll.ts";
import { resolveCunningStrikeAfterAttackDamage } from "./cunning-strike.ts";
import {
  hellishRebukeReactionSpellMatchesTrigger,
  reactionSpellTargetFactsForAfterDamage,
  triggeredReactionSpellTurnResourceAvailable,
} from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  battleReducerRouteForCreatureFallsInterruptWindow,
  battleReducerRouteForFeatherFallLanding,
  battleReducerRouteForInterrupt,
  battleReducerRouteForResolution,
} from "./reducer-route.ts";
import { stateAfterSpellCastDeclared } from "./spell-cast-declaration.ts";
import {
  antimagicFieldInterdictionMessage,
  battleSubjectInterdictedByAntimagicField,
} from "./antimagic-field-action-interdiction.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import { applySelfTransformationModeEffect } from "./spells-active-effects.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import {
  isAttackHitBonusActionSpellInvocation,
  isTriggeredReactionSpellInvocation,
} from "./spell-interrupt-procedure-kinds.ts";
import {
  battleStateAfterWardingBondSeparation,
  wardingBondSeparationFactsAreSatisfied,
  wardingBondSeparationFactsHole,
} from "./warding-bond.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applySpellDamage,
  featherFallLandingCleanupForCombatant,
  saveGateDamageResultForOutcome,
  damageAmountByTypeAfterSaveDamageResult,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import {
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
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
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import type {
  BattleAttackResolvers,
  BattleAttackRouteResolvers,
} from "./attack-resolvers.ts";
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
import { applyBattleMovement } from "./battle-movement.ts";
import {
  isCommandFollowUpSubject,
  isCommandMovementContinuation,
  pendingCommandObligationIssue,
  resolveCommandFollowUp,
  resumeCommandMovementContinuation,
} from "./command-procedures.ts";
import { commandHaltSuppressionIssue } from "./command-halt.ts";
import {
  isMovementProcedureSubject,
  resolveMoveAfterMovement,
  resolveMovementProcedure,
} from "./movement-procedures.ts";
import { resolveEndTurnCommand } from "./turn-boundary-lifecycle.ts";
import {
  isPersistentSpatialSpellProcedureSubject,
  resolvePersistentSpatialSpellProcedureCommand,
} from "./persistent-spatial-spell-procedures.ts";
import {
  resolveDruidWildShapeUnitFeature,
  resolveUnitFeature,
  resolveUnitFeatureHeldWeaponActivation,
} from "./unit-features.ts";
import { resolveMonkFocusOption } from "./monk-focus.ts";
import { resolveOpportunityAttackCommand } from "./opportunity-attacks.ts";
import type {
  BattleAfterDamageEvent,
  BattleActiveEffect,
  AdmittedBattleResolutionInput,
  BattleInterruptRouteOptions,
  BattleAttackDamageContinuationCunningStrikeFrame,
  BattleAttackDamageContinuationConcentrationFrame,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackHitTriggerKind,
  BattleConcentrationSavingThrowHole,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleCreatureState,
  BattleFeatherFallLandingResult,
  BattleFallDamageLandingResult,
  BattleRawFallDamage,
  BattleInterruptFrame,
  BattleInterruptedProcedure,
  BattleHole,
  BattleInterruptCheckpoint,
  BattleCunningStrikeContinuationFill,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleSnapshot,
  BattleState,
  BattleTargetSpatialFact,
  EndedFlySpeedGrant,
  SpellSlotInvocationResource,
} from "../battle-state-execution.ts";
import { KnockedOutConditionState } from "./knocked-out-state.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { battleSubjectActionEligibilityIssue } from "./action-eligibility.ts";
import {
  attackDamageEventAmountForTarget,
  battleAttackHostParticipantId,
} from "./attack-damage-events.ts";

type ResolveBattleSubjectInternalOptions = {
  readonly executionRegistry: SpellProcedureExecutionRegistry;
  readonly attackResolvers: BattleAttackRouteResolvers;
  readonly interruptRouteOptions: BattleInterruptRouteOptions;
  readonly skipD20TestNaturalOneRerollValidation?: boolean;
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
      resumeInterruptedProcedureWithExecutionRegistry(
        state,
        continuation,
        handledInterruptTrigger,
        executionRegistry,
        attackResolvers,
      ),
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

function validateD20TestNaturalOneRerollFills(
  input: AdmittedBattleResolutionInput,
  options: ResolveBattleSubjectInternalOptions,
): D20TestNaturalOneRerollFillValidation {
  const actor = input.state.combatants.get(battleSubjectActorId(input.subject));
  for (const [fillIndex, fill] of input.fills.entries()) {
    if (fill.kind === "abilityCheck") {
      const abilityCheckHole = abilityCheckHoleForFill({
        resolutionInput: input,
        options,
        fillIndex,
        fill,
      });
      const abilityCheckRollMode =
        abilityCheckHole?.kind === "abilityCheck"
          ? abilityCheckHole.rollMode
          : undefined;
      const originalNaturalD20 =
        fill.value.naturalD20 === undefined
          ? undefined
          : Number(fill.value.naturalD20);
      if (
        d20TestNaturalOneRerollRollDecisionRequired({
          actor,
          rollMode: abilityCheckRollMode,
          rolledD20s: fill.value.rolledD20s,
          originalNaturalD20,
          decision: fill.value.d20TestNaturalOneReroll,
        })
      ) {
        return {
          tag: "decisionRequired",
          fillIndex,
          holeId: fill.holeId,
          holeKind: abilityCheckHole?.kind ?? "abilityCheck",
        };
      }
      const issue = d20TestNaturalOneRerollRollIssue({
        actor,
        total: fill.value.total,
        rollMode: abilityCheckRollMode,
        rolledD20s: fill.value.rolledD20s,
        originalNaturalD20,
        decision: fill.value.d20TestNaturalOneReroll,
        requiredRollMode: abilityCheckRollMode,
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (issue !== null) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return { tag: "invalid", message: issue };
      }
      /* v8 ignore stop */
      continue;
    }
    if (fill.kind === "savingThrowOutcome") {
      const savingThrowHole = savingThrowOutcomeHoleForFill({
        resolutionInput: input,
        options,
        fillIndex,
        fill,
      });
      for (const outcome of fill.value.outcomes) {
        const target = input.state.combatants.get(outcome.targetId);
        const rollMode = savingThrowOutcomeRollModeForTarget(
          savingThrowHole,
          outcome.targetId,
        );
        const originalNaturalD20 =
          outcome.naturalD20 === undefined
            ? undefined
            : Number(outcome.naturalD20);
        if (
          d20TestNaturalOneRerollOutcomeDecisionRequired({
            actor: target,
            rollMode,
            rolledD20s: outcome.rolledD20s,
            originalNaturalD20,
            decision: outcome.d20TestNaturalOneReroll,
            withoutRoll: outcome.withoutRoll,
          })
        ) {
          return {
            tag: "decisionRequired",
            fillIndex,
            holeId: fill.holeId,
            holeKind: "savingThrowOutcome",
          };
        }
        const issue = d20TestNaturalOneRerollOutcomeIssue({
          actor: target,
          rollMode,
          rolledD20s: outcome.rolledD20s,
          originalNaturalD20,
          decision: outcome.d20TestNaturalOneReroll,
          withoutRoll: outcome.withoutRoll,
          succeeded: outcome.succeeded,
        });
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (issue !== null) {
          /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
          return { tag: "invalid", message: issue };
        }
        /* v8 ignore stop */
      }
      continue;
    }
    if (fill.kind === "concentrationSavingThrow") {
      const concentrationHole = concentrationSavingThrowHoleForFill({
        resolutionInput: input,
        options,
        fillIndex,
        fill,
      });
      const concentrationActor =
        concentrationHole === undefined
          ? undefined
          : input.state.combatants.get(concentrationHole.combatantId);
      const originalNaturalD20 =
        fill.value.naturalD20 === undefined
          ? undefined
          : Number(fill.value.naturalD20);
      if (
        d20TestNaturalOneRerollOutcomeDecisionRequired({
          actor: concentrationActor,
          rollMode: concentrationHole?.rollMode,
          rolledD20s: fill.value.rolledD20s,
          originalNaturalD20,
          decision: fill.value.d20TestNaturalOneReroll,
          withoutRoll: fill.value.withoutRoll,
        })
      ) {
        return {
          tag: "decisionRequired",
          fillIndex,
          holeId: fill.holeId,
          holeKind: "concentrationSavingThrow",
        };
      }
      const issue = d20TestNaturalOneRerollOutcomeIssue({
        actor: concentrationActor,
        rollMode: concentrationHole?.rollMode,
        rolledD20s: fill.value.rolledD20s,
        originalNaturalD20,
        decision: fill.value.d20TestNaturalOneReroll,
        withoutRoll: fill.value.withoutRoll,
        succeeded: fill.value.succeeded,
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (issue !== null) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return { tag: "invalid", message: issue };
      }
      /* v8 ignore stop */
    }
  }
  return { tag: "ok" };
}

type D20TestNaturalOneRerollDecisionHoleKind =
  | "abilityCheck"
  | "concentrationSavingThrow"
  | "savingThrowOutcome"
  | "spellcastingAbilityCheck";

type D20TestNaturalOneRerollFillValidation =
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "decisionRequired";
      readonly fillIndex: number;
      readonly holeId: BattleFill["holeId"];
      readonly holeKind: D20TestNaturalOneRerollDecisionHoleKind;
    };

function resolveD20TestNaturalOneRerollDecisionHole(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly options: Parameters<typeof resolveBattleSubjectInternal>[1];
  readonly decision: Extract<
    D20TestNaturalOneRerollFillValidation,
    { readonly tag: "decisionRequired" }
  >;
}): BattleResolutionResult {
  const pending = resolveBattleSubjectInternal(
    {
      ...input.resolutionInput,
      fills: input.resolutionInput.fills.slice(0, input.decision.fillIndex),
    },
    input.options,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (pending.tag !== "needsHoles") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop */
  let matched = false;
  const holes = pending.holes.map((hole): BattleHole => {
    if (
      hole.kind === input.decision.holeKind &&
      hole.holeId === input.decision.holeId
    ) {
      matched = true;
      return d20TestNaturalOneRerollHoleWithOption(hole);
    }
    return hole;
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!matched) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.resolutionInput.state,
      "invalidFill",
      D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
    );
  }
  /* v8 ignore stop */
  return { ...pending, holes };
}

type D20TestNaturalOneRerollAbilityCheckHole = Extract<
  BattleHole,
  { readonly kind: "abilityCheck" | "spellcastingAbilityCheck" }
>;

function abilityCheckHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly options: ResolveBattleSubjectInternalOptions;
  readonly fillIndex: number;
  readonly fill: Extract<BattleFill, { readonly kind: "abilityCheck" }>;
}): D20TestNaturalOneRerollAbilityCheckHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestNaturalOneRerollAbilityCheckHole =>
      (hole.kind === "abilityCheck" ||
        hole.kind === "spellcastingAbilityCheck") &&
      hole.holeId === input.fill.holeId,
  );
}

type D20TestNaturalOneRerollSavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;

function savingThrowOutcomeHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly options: ResolveBattleSubjectInternalOptions;
  readonly fillIndex: number;
  readonly fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
}): D20TestNaturalOneRerollSavingThrowOutcomeHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is D20TestNaturalOneRerollSavingThrowOutcomeHole =>
      hole.kind === "savingThrowOutcome" && hole.holeId === input.fill.holeId,
  );
}

function savingThrowOutcomeRollModeForTarget(
  hole: D20TestNaturalOneRerollSavingThrowOutcomeHole | undefined,
  targetId: BattleSavingThrowOutcome["targetId"],
): AttackRollMode | undefined {
  return hole?.targetRollModes.find(
    (projection) => projection.targetId === targetId,
  )?.rollMode;
}

function concentrationSavingThrowHoleForFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly options: ResolveBattleSubjectInternalOptions;
  readonly fillIndex: number;
  readonly fill: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >;
}): BattleConcentrationSavingThrowHole | undefined {
  return pendingHolesBeforeFill(input).find(
    (hole): hole is BattleConcentrationSavingThrowHole =>
      hole.kind === "concentrationSavingThrow" &&
      hole.holeId === input.fill.holeId,
  );
}

function pendingHolesBeforeFill(input: {
  readonly resolutionInput: AdmittedBattleResolutionInput;
  readonly options: ResolveBattleSubjectInternalOptions;
  readonly fillIndex: number;
}): readonly BattleHole[] {
  const pending = resolveBattleSubjectInternal(
    {
      ...input.resolutionInput,
      fills: input.resolutionInput.fills.slice(0, input.fillIndex),
    },
    {
      ...input.options,
      skipD20TestNaturalOneRerollValidation: true,
    },
  );
  if (pending.tag !== "needsHoles") {
    return [];
  }
  return pending.holes;
}

export function resolveBattleSubjectInternal(
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
  const normalizedInputState = normalizeEarlyEndedOngoingFeatures(input.state);
  if (normalizedInputState !== input.state) {
    return resolveBattleSubjectInternal(
      { ...input, state: normalizedInputState },
      options,
    );
  }
  if (options.skipD20TestNaturalOneRerollValidation !== true) {
    const d20TestNaturalOneRerollValidation =
      validateD20TestNaturalOneRerollFills(input, options);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollValidation.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        d20TestNaturalOneRerollValidation.message,
      );
    }
    /* v8 ignore stop */
    if (d20TestNaturalOneRerollValidation.tag === "decisionRequired") {
      return resolveD20TestNaturalOneRerollDecisionHole({
        resolutionInput: input,
        options,
        decision: d20TestNaturalOneRerollValidation,
      });
    }
  }
  if (
    input.state.interruptStack.length > 0 &&
    interruptRouteOptions.replayingInterruptedProcedure !== true
  ) {
    const activeFrame = currentInterruptFrame(input.state);
    if (activeFrame !== null) {
      if (activeFrame.kind === "attackDamageContinuationConcentration") {
        if (
          !sameBattleSubject(
            input.subject,
            activeFrame.continuation.participant,
          )
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
          attackResolvers: options.attackResolvers,
        });
      }
      if (activeFrame.kind === "attackDamageContinuationCunningStrike") {
        /* v8 ignore start -- Defensive stale-subject rejection: legal continuation discovery exposes only the stored Cunning Strike participant while this frame is active. */
        if (
          !sameBattleSubject(
            input.subject,
            activeFrame.continuation.participant,
          )
        ) {
          return invalidResult(
            input.state,
            "staleSubject",
            "Cunning Strike after-damage effect must be resolved before other battle subjects.",
          );
        }
        /* v8 ignore stop */
        return resolveAttackDamageContinuationCunningStrike({
          state: input.state,
          frame: activeFrame,
          subject: input.subject,
          fills: input.fills,
        });
      }
      if (activeFrame.kind === "replayContinuation") {
        return resolveReplayContinuation({
          state: input.state,
          subject: input.subject,
          fills: input.fills,
          execution: replayContinuationExecution(
            options.executionRegistry,
            options.attackResolvers,
          ),
        });
      }
      /* v8 ignore start -- Defensive stale-subject rejection: these typed cleanup frames are resolved by their dedicated witness APIs, not ordinary subject dispatch. */
      if (activeFrame.kind === "flySpeedGrantEndFallCleanup") {
        return invalidResult(
          input.state,
          "staleSubject",
          "Fly Speed end-fall witness must be resolved before other battle subjects.",
        );
      }
      if (activeFrame.kind === "fallDamageLandingMitigation") {
        return invalidResult(
          input.state,
          "staleSubject",
          "Fall damage landing mitigation must be resolved before other battle subjects.",
        );
      }
      /* v8 ignore stop */
      if (activeFrame.frame.activeInterrupt !== undefined) {
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
    !isInsectPlagueAppearanceSaveSubject(input.subject) &&
    !isCloudkillAppearanceSaveSubject(input.subject)
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
  if (
    input.subject.tag === "bonusAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !canSpendBonusAction(input.state.currentTurnResources))
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
      !canSpendBonusAction(input.state.currentTurnResources))
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
      !canSpendBonusAction(input.state.currentTurnResources))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }

  /* v8 ignore start -- Defensive stale-subject rejection: rediscovery removes action-dependent Unit features once the actor cannot act. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- Defensive stale-subject rejection: rediscovery removes Wild Shape after action eligibility or the Bonus Action is lost. */
  if (
    input.subject.tag === "druidWildShape" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !canSpendBonusAction(input.state.currentTurnResources))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape Bonus Action is no longer available.",
    );
  }
  /* v8 ignore stop */

  const result = (() => {
    const subject = input.subject;
    if (
      subject.tag === "runtimeCommand" &&
      subject.command === "endConcentration"
    ) {
      const actor = input.state.combatants.get(subject.actorId);
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (input.fills.length > 0) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "End Concentration does not accept fills.",
        );
      }
      /* v8 ignore stop */
      if (actor === undefined || actor.concentration === null) {
        return invalidResult(
          input.state,
          "staleSubject",
          "End Concentration is no longer available.",
        );
      }
      const nextState = breakBattleConcentration(input.state, subject.actorId);
      return {
        tag: "resolved" as const,
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
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
      const combatants = creatureAttackSubjectCombatants({
        state: input.state,
        subject,
      });
      if (combatants.tag === "missing") {
        return invalidResult(
          input.state,
          "missingCombatant",
          `Creature Attack combatant is not in this battle: ${combatants.combatantId}`,
        );
      }
      if (!creatureAttackPilotActor(combatants.actor)) {
        return invalidResult(
          input.state,
          "unsupportedSubject",
          "Creature Attack is available only for the narrow stat-block no-actions pilot.",
        );
      }
      if (!combatantCanTakeActions(combatants.actor)) {
        return invalidResult(
          input.state,
          "staleSubject",
          "Creature Attack requires an actor that can take actions.",
        );
      }
      const spentAttackResources = spendAction(
        input.state.currentTurnResources,
        "attack",
      );
      if (Either.isLeft(spentAttackResources)) {
        return invalidResult(
          input.state,
          "staleSubject",
          "Creature Attack requires an available Attack action.",
        );
      }
      const fills = creatureAttackFillSequence({ ...input, subject });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fills.tag === "invalid") {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(input.state, "invalidFill", fills.message);
      }
      /* v8 ignore stop */
      if (fills.tag === "empty") {
        return needsHolesResult(input.state, subject, [
          creatureAttackRollHole(subject),
        ]);
      }
      const hit = creatureAttackHit({
        state: input.state,
        target: combatants.target,
        attackRoll: fills.attackRoll,
      });
      if (!hit) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (fills.tag === "damageRoll") {
          /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
          return invalidResult(
            input.state,
            "invalidFill",
            "Creature Attack damage cannot be supplied after a missed Attack Roll.",
          );
        }
        /* v8 ignore stop */
        const nextState = {
          ...input.state,
          currentTurnResources: spentAttackResources.right,
        };
        return {
          tag: "resolved" as const,
          state: nextState,
          snapshot: snapshotBattle(nextState),
        };
      }
      if (fills.tag === "attackRoll") {
        return needsHolesResult(input.state, subject, [
          creatureAttackDamageHole(subject),
        ]);
      }
      const parsedRelationships = DamageRelationshipDecisionsByHole.parse({
        fills: input.fills,
        damageEventHoleIds: new Set([fills.damageRoll.holeId]),
        owner: "an Attack",
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (parsedRelationships.tag === "invalid") {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          parsedRelationships.message,
        );
      }
      /* v8 ignore stop */
      const relationshipCheck =
        parsedRelationships.decisionsByRelationshipHole.check(
          fills.damageRoll.holeId,
          creatureAttackDamageTotal(fills.damageRoll) <= 0
            ? null
            : damageRelationshipDecisionHole({
                state: input.state,
                damageEventHoleId: fills.damageRoll.holeId,
                damageSourceId: subject.actorId,
                targets: [
                  {
                    targetId: subject.targetId,
                    damageAmount: toDamageAmount(
                      creatureAttackDamageTotal(fills.damageRoll),
                    ),
                  },
                ],
                spatialFacts: [],
              }),
        );
      if (relationshipCheck.tag === "needsHoles") {
        return needsHolesResult(input.state, subject, relationshipCheck.holes);
      }
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (relationshipCheck.tag === "invalid") {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          relationshipCheck.message,
        );
      }
      /* v8 ignore stop */
      const nextState = battleStateAfterCreatureAttackDamage({
        state: {
          ...input.state,
          currentTurnResources: spentAttackResources.right,
        },
        actor: combatants.actor,
        target: combatants.target,
        damage: creatureAttackDamageTotal(fills.damageRoll),
        ...(relationshipCheck.decisions === undefined
          ? {}
          : { relationshipDecisions: relationshipCheck.decisions }),
      });
      return {
        tag: "resolved" as const,
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
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
        options.executionRegistry,
        options.attackResolvers,
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

function resolveCompanionLifecycleSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
): BattleResolutionResult {
  const familiarEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed direct subject: lifecycle discovery requires a retained familiar, while ordinary replay preserves its retained entry (including dismissed states). Reaching no entry requires forging a lifecycle subject for an actor that never owned one. */
  if (familiarEntry === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Familiar lifecycle act requires the actor's retained familiar.",
    );
  }
  /* v8 ignore stop */
  const familiar = familiarEntry.companion;
  if (input.subject.action === "temporarilyDismiss") {
    if (familiar.status !== "present") {
      return invalidResult(
        input.state,
        "staleSubject",
        "Familiar temporary dismissal requires the actor's present familiar.",
      );
    }
    const heldObjectIds = companionHeldObjectIdsForDismissal(input);
    /* v8 ignore start -- Malformed replay: temporary-dismiss discovery exposes held-object facts as an initial prerequisite, so execution receives this invalid helper result only when a caller omits that discovered fill. */
    if (heldObjectIds.tag === "invalid") {
      return heldObjectIds;
    }
    /* v8 ignore stop */
    return temporarilyDismissFindFamiliar({
      state: input.state,
      casterId: input.subject.actorId,
      heldObjectIds: heldObjectIds.objectIds,
    });
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.subject.action === "reappear") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar reappearance is a session-owned admitted operation.",
    );
  }
  /* v8 ignore stop */
  if (input.subject.action === "permanentlyDismiss") {
    return permanentlyDismissFindFamiliar({
      state: input.state,
      casterId: input.subject.actorId,
    });
  }
  /* v8 ignore start -- Companion lifecycle actions are exhausted above; widening the action union without a handler fails compilation at this assignment. */
  const exhaustive: never = input.subject.action;
  return exhaustive;
  /* v8 ignore stop */
}

type FindFamiliarReappearanceResolutionSubject = Omit<
  Extract<BattleSubject, { readonly tag: "companionLifecycle" }>,
  "action"
> & { readonly action: "reappear" };

/** Resolve the session-owned reappearance operation after catalog admission. */
export function resolveAdmittedFindFamiliarReappearanceSubject(input: {
  readonly state: BattleState;
  readonly subject: FindFamiliarReappearanceResolutionSubject;
  readonly fills: readonly BattleFill[];
  readonly admission: import("../find-familiar-admission-state.ts").AdmittedFindFamiliarReappearance;
}): BattleResolutionResult {
  const familiarEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.subject.actorId,
  );
  if (
    familiarEntry === null ||
    familiarEntry.companion.status !== "temporarilyDismissed"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Familiar reappearance requires the actor's temporarily dismissed familiar.",
    );
  }
  const placement = companionReappearancePlacement(input);
  if (placement.tag === "needsHoles" || placement.tag === "invalid") {
    return placement;
  }
  const initiative = companionReappearanceInitiative(input);
  if (initiative.tag === "needsHoles") {
    return initiative;
  }
  const result = reappearAdmittedTemporarilyDismissedFindFamiliar({
    state: input.state,
    casterId: input.subject.actorId,
    admission: input.admission,
    initiative: initiative.initiative,
    placement: placement.placement,
  });
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function companionReappearancePlacement(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
):
  | {
      readonly tag: "resolved";
      readonly placement: Extract<
        Extract<
          BattleFill,
          { readonly kind: "companionReappearancePlacement" }
        >["value"],
        { readonly kind: "unoccupiedSpaceWithin30Feet" }
      >;
    }
  | Extract<
      BattleResolutionResult,
      { readonly tag: "needsHoles" | "invalid" }
    > {
  const expectedHole = companionReappearancePlacementHole({
    ownerId: input.subject.actorId,
  });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<
      BattleFill,
      { readonly kind: "companionReappearancePlacement" }
    > =>
      candidate.kind === "companionReappearancePlacement" &&
      candidate.holeId === expectedHole.holeId,
  );
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [expectedHole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.value.kind !== "unoccupiedSpaceWithin30Feet") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar reappearance placement must be an unoccupied space within 30 feet.",
    );
  }
  /* v8 ignore stop */
  return { tag: "resolved", placement: fill.value };
}

function companionReappearanceInitiative(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
):
  | {
      readonly tag: "resolved";
      readonly initiative: Extract<
        BattleFill,
        { readonly kind: "companionReappearanceInitiative" }
      >["value"];
    }
  | Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const expectedHole = companionReappearanceInitiativeHole({
    ownerId: input.subject.actorId,
  });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<
      BattleFill,
      { readonly kind: "companionReappearanceInitiative" }
    > =>
      candidate.kind === "companionReappearanceInitiative" &&
      candidate.holeId === expectedHole.holeId,
  );
  return fill === undefined
    ? needsHolesResult(input.state, input.subject, [expectedHole])
    : { tag: "resolved", initiative: fill.value };
}

function resolveFindFamiliarSharedSensesSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "findFamiliarSharedSenses" }>
  >,
): BattleResolutionResult {
  const connection = findFamiliarConnectionFact({
    state: input.state,
    ownerId: input.subject.actorId,
    companionId: input.subject.familiarId,
    fills: input.fills,
    subject: input.subject,
    actionLabel: "Familiar shared senses",
  });
  return connection.tag !== "resolved"
    ? connection
    : shareFindFamiliarSenses({
        state: input.state,
        casterId: input.subject.actorId,
        fact: connection.fact,
      });
}

export function shareFindFamiliarSenses(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly fact: FindFamiliarWithin100FeetFact;
}): BattleResolutionResult {
  const transition = applyFindFamiliarSharedSenses(input);
  return transition.tag === "invalid"
    ? invalidResult(input.state, transition.reason, transition.message)
    : {
        tag: "resolved",
        state: transition.state,
        snapshot: snapshotBattle(transition.state),
      };
}

function resolveFindFamiliarTouchSpellSubject(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "findFamiliarTouchSpell" }>
  >,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  const connection = findFamiliarConnectionFact({
    state: input.state,
    ownerId: input.subject.actorId,
    companionId: input.subject.companionId,
    fills: input.fills,
    subject: input.subject,
    actionLabel: "Familiar touch spell delivery",
  });
  if (connection.tag !== "resolved") {
    return connection;
  }
  const spellSubject = findFamiliarTouchSpellSubject(input.subject);
  const spellFills = input.fills.filter(
    (fill) =>
      !(
        fill.kind === "findFamiliarConnection" &&
        fill.holeId === connection.holeId
      ),
  );
  const delivered = deliverTouchSpellThroughFindFamiliar(
    {
      state: input.state,
      subject: spellSubject.subject,
      fills: spellFills,
      fact: connection.fact,
    },
    executionRegistry,
    attackResolvers,
  );
  return delivered.tag === "needsHoles"
    ? {
        ...delivered,
        subject: input.subject,
        holes: findFamiliarTouchDeliveryTargetHoles(delivered.holes),
      }
    : delivered;
}

export function deliverTouchSpellThroughFindFamiliar(
  input: {
    readonly state: BattleState;
    readonly subject: Extract<
      BattleSubject,
      { readonly tag: "actionSpell" | "bonusActionSpell" }
    >;
    readonly fills: BattleResolutionInput["fills"];
    readonly fact: FindFamiliarWithin100FeetFact;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  const prepared = prepareTouchSpellDeliveryThroughFindFamiliar(input);
  if (prepared.tag === "invalid") {
    return invalidResult(input.state, prepared.reason, prepared.message);
  }
  const candidate = {
    state: input.state,
    subject: input.subject,
    fills: prepared.fills,
  };
  const admission = admitBattleResolutionInput(candidate);
  if (admission.tag === "staleCharacterProcedure") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The familiar-delivered spell procedure is no longer bound to its caster.",
    );
  }
  const cast = resolveAdmittedBattleSubject(
    admission.input,
    executionRegistry,
    attackResolvers,
  );
  if (cast.tag === "invalid") {
    return { ...cast, snapshot: snapshotBattle(input.state) };
  }
  if (cast.tag !== "resolved") return cast;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!cast.state.combatants.has(prepared.familiarId)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery requires the familiar to remain present.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (prepared.targetChoiceCount === 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Find Familiar touch delivery currently supports exactly one selected target choice.",
    );
  }
  /* v8 ignore stop */
  const spent = spendFindFamiliarTouchDeliveryReaction({
    state: cast.state,
    familiarId: prepared.familiarId,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spent.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", spent.message);
  }
  /* v8 ignore stop */
  return {
    tag: "resolved",
    state: spent.state,
    snapshot: snapshotBattle(spent.state),
  };
}

function companionHeldObjectIdsForDismissal(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "companionLifecycle" }>
  >,
):
  | {
      readonly tag: "resolved";
      readonly objectIds: readonly BattleDroppedObjectOutcome["objectId"][];
    }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const companionEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.subject.actorId,
  );
  if (companionEntry?.companion.status !== "present") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Familiar dismissal held-object facts require a present familiar.",
    );
  }
  const companionId = companionEntry.companion.combatantId;
  const expectedHole = companionHeldObjectFactsHole({ companionId });
  const fill = input.fills.find(
    (
      candidate,
    ): candidate is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      candidate.kind === "heldObjectFacts" &&
      candidate.holeId === expectedHole.holeId,
  );
  /* v8 ignore start -- Malformed replay: temporary-dismiss discovery exposes this exact held-object-facts hole as an initial prerequisite, so omitting it contradicts the discovered subject contract. */
  if (fill === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Familiar temporary dismissal requires held-object facts for the familiar.",
    );
  }
  /* v8 ignore stop */
  return { tag: "resolved", objectIds: fill.value.objectIds };
}

function findFamiliarConnectionFact(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly companionId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly subject: BattleSubject;
  readonly actionLabel: string;
}):
  | {
      readonly tag: "resolved";
      readonly fact: FindFamiliarWithin100FeetFact;
      readonly holeId: BattleFill["holeId"];
    }
  | Extract<
      BattleResolutionResult,
      { readonly tag: "needsHoles" | "invalid" }
    > {
  const expectedHole = findFamiliarConnectionHole({
    ownerId: input.ownerId,
    companionId: input.companionId,
  });
  const fill = input.fills.find(
    (candidate) =>
      candidate.kind === "findFamiliarConnection" &&
      candidate.holeId === expectedHole.holeId,
  );
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [expectedHole]);
  }
  return {
    tag: "resolved",
    holeId: expectedHole.holeId,
    fact: {
      kind: "findFamiliarWithin100FeetOfOwner",
      ownerId: input.ownerId,
      familiarId: input.companionId,
    },
  };
}

function findFamiliarTouchSpellSubject(
  subject: Extract<BattleSubject, { readonly tag: "findFamiliarTouchSpell" }>,
): {
  readonly tag: "resolved";
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
} {
  const base = {
    actorId: subject.actorId,
    procedureRef: subject.procedureRef,
    mode: subject.mode,
    ...(subject.metamagic === undefined
      ? {}
      : { metamagic: subject.metamagic }),
  };
  return subject.spellAction === "action"
    ? {
        tag: "resolved",
        subject: {
          tag: "actionSpell",
          ...base,
        },
      }
    : {
        tag: "resolved",
        subject: {
          tag: "bonusActionSpell",
          ...base,
        },
      };
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Fog Cloud strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const fogCloud = [...input.state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect) =>
        effect.kind === "fogCloudObscurement" &&
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
    fogCloud.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveDisperseCloudkillCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "disperseCloudkill";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill strong-wind dispersal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const cloudkill = [...input.state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (effect) =>
        effect.kind === "cloudkillAreaHazard" &&
        effect.areaId === input.subject.areaId,
    );
  if (cloudkill === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Cloudkill area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    cloudkill.sourceCombatantId,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation uses one table spatial fact fill.",
    );
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(input.subject.targetId);
  const effect = target?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "wardingBond" }
    > =>
      candidate.kind === "wardingBond" &&
      spellActiveEffectExecutionRef(candidate) === input.subject.effectRef,
  );
  if (
    effect === undefined ||
    effect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Warding Bond is no longer active for this connected target.",
    );
  }
  const hole = wardingBondSeparationFactsHole({
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    targetId: input.subject.targetId,
  });
  const fill = input.fills[0];
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fill.kind !== "targetSpatialFacts" ||
    fill.holeId !== hole.holeId ||
    !wardingBondSeparationFactsAreSatisfied({
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      targetId: input.subject.targetId,
      facts: fill.spatialFacts,
    })
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Warding Bond separation requires a table fact that the connected creatures are beyond 60 feet.",
    );
  }
  /* v8 ignore stop */
  const nextState = battleStateAfterWardingBondSeparation({
    state: input.state,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    targetId: input.subject.targetId,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveLevitateAltitudeControlCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "levitateAltitudeControl";
      }
    >
  >,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for Levitate altitude control.",
    );
  }
  const target = input.state.combatants.get(input.subject.targetId);
  const selectedEffect =
    target === undefined
      ? undefined
      : spellActiveEffectForExecutionRef(
          target.activeEffects,
          input.subject.effectRef,
        );
  const effect =
    selectedEffect?.kind === "spellLevitatedCreature"
      ? selectedEffect
      : undefined;
  if (
    target === undefined ||
    effect === undefined ||
    effect.sourceCombatantId !== input.subject.actorId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Levitate altitude control is no longer active for the target.",
    );
  }
  const hole = levitateAltitudeChangeHole({
    actorId: input.subject.actorId,
    targetId: input.subject.targetId,
    maxDistanceFeet: effect.maxAltitudeChangeFeet,
  });
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 1) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control uses one altitude-change fill.",
    );
  }
  /* v8 ignore stop */
  if (fill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.kind !== "levitateAltitudeChange" || fill.holeId !== hole.holeId) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control requires the selected altitude-change fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hole.directions.includes(fill.value.direction) ||
    fill.value.distanceFeet <= 0 ||
    fill.value.distanceFeet > hole.maxDistanceFeet ||
    !Number.isInteger(fill.value.distanceFeet)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude change must be a positive whole number no greater than the spell limit.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !levitatedTargetWithinSpellRangeFactPresent({
      facts: fill.spatialFacts,
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      targetId: input.subject.targetId,
      rangeFeet: effect.rangeFeet,
    })
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Levitate altitude control requires a table fact that the target remains within the spell's range.",
    );
  }
  /* v8 ignore stop */
  const spentState = {
    ...input.state,
    currentTurnResources: Either.getOrThrow(
      spendAction(input.state.currentTurnResources, "magic"),
    ),
  };
  const nextState = updateLevitatedCreatureAltitude({
    state: spentState,
    targetId: input.subject.targetId,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    change: fill.value,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Self-transformation mode replacement uses no fills.",
    );
  }
  /* v8 ignore stop */
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
  const spent = Either.getOrThrow(
    spendAction(input.state.currentTurnResources, "magic"),
  );
  const selectedEffect = spellActiveEffectForExecutionRef(
    actor.activeEffects,
    input.subject.effectRef,
  );
  const activeEffect =
    selectedEffect?.kind === "selfTransformation" ? selectedEffect : undefined;
  if (
    activeEffect === undefined ||
    activeEffect.sourceCombatantId !== input.subject.actorId
  ) {
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
        : /* v8 ignore next -- Discovered-subject invariant: the selected damage type comes from these immutable active-effect choices. */
          null
      : {
          mode: input.subject.mode,
          naturalWeaponFacts: activeEffect.naturalWeaponFacts,
        };
  /* v8 ignore start -- Stale forged subject: discovery derives Natural Weapons choices from this same active effect, whose immutable procedure facts remain attached for its lifetime. */
  if (modeEffect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Natural Weapons damage type is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = applySelfTransformationModeEffect({
    state: { ...input.state, currentTurnResources: spent },
    actorId: input.subject.actorId,
    sourceCombatantId: activeEffect.sourceCombatantId,
    sourceProcedureRef: activeEffect.sourceProcedureRef,
    modeEffect,
    expiresAt: activeEffect.expiresAt,
    effectRef: spellActiveEffectExecutionRef(activeEffect),
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
  const effect = protectionRelevantEffectsForTarget(
    input.state,
    input.subject.actorId,
  ).find(
    (candidate) =>
      spellActiveEffectExecutionRef(candidate) === input.subject.effectRef,
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
  if (
    hole.protectionRelevantEffectSave.relevantEffect !==
    input.subject.relevantEffect
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Protection relevant-effect identity no longer matches the selected active effect.",
    );
  }
  const saveFill = input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === hole.holeId,
  );
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFill.relationshipFacts !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Protection from Evil and Good save relationship facts were not requested.",
    );
  }
  /* v8 ignore stop */
  const validation = validateProtectionRelevantEffectSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
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

function resolveCreatureTypeProtectionConditionAttemptCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "creatureTypeProtectionConditionAttempt";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Creature Type Protection condition attempts do not accept fills.",
    );
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(input.subject.actorId);
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection condition attempt requires a known target.",
    );
  }
  if (
    !conditionApplicationPreventedByCreatureTypeProtection(
      input.state,
      input.subject.sourceCombatantId,
      target,
      input.subject.condition,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection condition attempt requires a scoped protected condition.",
    );
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
}

function resolveCreatureTypeProtectionPossessionAttemptCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "creatureTypeProtectionPossessionAttempt";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length !== 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Creature Type Protection possession attempts do not accept fills.",
    );
  }
  /* v8 ignore stop */
  const disposition = resolveBattlePossessionAttempt({
    state: input.state,
    sourceCombatantId: input.subject.sourceCombatantId,
    targetId: input.subject.actorId,
  });
  if (disposition.tag === "invalid") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection possession attempt requires known source and target creature types.",
    );
  }
  if (
    disposition.tag !== "prevented" ||
    disposition.prevention !== "creatureTypeProtection"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Creature Type Protection possession attempt requires scoped possession prevention.",
    );
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
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

function isInsectPlagueAppearanceSaveSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "insectPlagueAreaHazardSave";
  }
> {
  return (
    subject.tag === "runtimeCommand" &&
    subject.command === "insectPlagueAreaHazardSave" &&
    subject.areaMembershipTrigger.kind === "appearsInArea"
  );
}

function isCloudkillAppearanceSaveSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "cloudkillAreaHazardSave";
  }
> {
  return (
    subject.tag === "runtimeCommand" &&
    subject.command === "cloudkillAreaHazardSave" &&
    subject.areaMembershipTrigger.kind === "appearsInArea"
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
  const state = isLegendaryAttackSubject(normalized, subject)
    ? consumeLegendaryActionWindow(normalized)
    : closeLegendaryActionWindow(normalized);
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}

export function openCreatureFallsInterruptWindow(input: {
  readonly state: BattleState;
  readonly fallingCreatureId: CombatantId;
  readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
}): BattleResolutionResult {
  const reactionWindow = maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "creatureFalls",
      fallingCreatureId: input.fallingCreatureId,
      reactionSpellTargetFacts: input.reactionSpellTargetFacts,
      landingMitigations: [],
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
  const result = reactionWindow ?? {
    tag: "resolved" as const,
    state: input.state,
    snapshot: snapshotBattle(input.state),
  };
  const routeEvents = battleReducerRouteForCreatureFallsInterruptWindow(result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

export type FlyEndCanStopFallReason = "hovering" | "otherMeans";

export type FlySpeedGrantEndFallWitness =
  | { readonly kind: "notAloft" }
  | {
      readonly kind: "canStopFall";
      readonly reason: FlyEndCanStopFallReason;
    }
  | {
      readonly kind: "cannotStopFall";
      readonly reactionSpellTargetFacts: readonly BattleTargetSpatialFact[];
    };

export type FlySpeedGrantEndFallWitnessResult =
  | {
      readonly tag: "notAloft";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
    }
  | {
      readonly tag: "canStopFall";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
      readonly reason: FlyEndCanStopFallReason;
    }
  | {
      readonly tag: "falls";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly targetId: CombatantId;
      readonly endedEffect: EndedFlySpeedGrant;
      readonly reaction: BattleResolutionResult;
    }
  | {
      readonly tag: "invalid";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
      readonly reason:
        | "missingCombatant"
        | "cleanupFrameMissing"
        | "effectStillActive";
      readonly message: string;
    };

export function resolveFlySpeedGrantEndFallCleanup(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly witness: FlySpeedGrantEndFallWitness;
}): FlySpeedGrantEndFallWitnessResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Fly Speed end-fall witness target is not in this battle.",
    };
  }
  const cleanup = flySpeedGrantEndFallCleanupFrame(input.state, input.targetId);
  if (cleanup === null) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "cleanupFrameMissing",
      message:
        "Fly Speed end-fall witness requires a pending cleanup frame emitted by Fly effect cleanup.",
    };
  }
  const cleanupFrame = cleanup.frame;
  /* v8 ignore start -- Malformed internal state: cleanup frames are emitted only after the ended Fly Speed grant has been removed, so a frame retaining that exact effect contradicts the cleanup transition. */
  if (target.activeEffects.includes(cleanupFrame.endedEffect)) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "effectStillActive",
      message:
        "Fly Speed end-fall witness can only resolve after the emitted Fly effect cleanup removed the ended grant.",
    };
  }
  /* v8 ignore stop */
  const cleanedState = battleStateWithoutInterruptStackFrame(
    input.state,
    cleanup.frameIndex,
  );
  if (input.witness.kind === "notAloft") {
    return {
      tag: "notAloft",
      state: cleanedState,
      snapshot: snapshotBattle(cleanedState),
      targetId: input.targetId,
      endedEffect: cleanupFrame.endedEffect,
    };
  }
  if (input.witness.kind === "canStopFall") {
    return {
      tag: "canStopFall",
      state: cleanedState,
      snapshot: snapshotBattle(cleanedState),
      targetId: input.targetId,
      endedEffect: cleanupFrame.endedEffect,
      reason: input.witness.reason,
    };
  }
  const reaction = openCreatureFallsInterruptWindow({
    state: cleanedState,
    fallingCreatureId: input.targetId,
    reactionSpellTargetFacts: input.witness.reactionSpellTargetFacts,
  });
  return {
    tag: "falls",
    state: reaction.tag === "invalid" ? cleanedState : reaction.state,
    snapshot: reaction.snapshot,
    targetId: input.targetId,
    endedEffect: cleanupFrame.endedEffect,
    reaction,
  };
}

function flySpeedGrantEndFallCleanupFrame(
  state: BattleState,
  targetId: CombatantId,
): {
  readonly frameIndex: number;
  readonly frame: Extract<
    BattleInterruptFrame,
    { readonly kind: "flySpeedGrantEndFallCleanup" }
  >;
} | null {
  for (let index = state.interruptStack.length - 1; index >= 0; index -= 1) {
    const frame = state.interruptStack[index];
    if (
      frame?.kind === "flySpeedGrantEndFallCleanup" &&
      frame.targetId === targetId
    ) {
      return { frameIndex: index, frame };
    }
  }
  return null;
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
  return resolveFeatherFallLandingForTarget(input.state, target);
}

function resolveFeatherFallLandingForTarget(
  state: BattleState,
  target: BattleCreatureState,
): Exclude<BattleFeatherFallLandingResult, { readonly tag: "invalid" }> {
  const cleanup = featherFallLandingCleanupForCombatant(target);
  if (cleanup.tag === "unmitigated") {
    return {
      tag: "unmitigated",
      state,
      snapshot: snapshotBattle(state),
      targetId: target.combatantId,
      fallDamagePrevented: false,
      fallingPronePrevented: false,
    };
  }
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(
      target.combatantId,
      cleanup.combatant,
    ),
  };
  const result = {
    tag: "mitigated",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    targetId: target.combatantId,
    fallDamagePrevented: true,
    fallingPronePrevented: true,
  } as const satisfies BattleFeatherFallLandingResult;
  const routeEvents = battleReducerRouteForFeatherFallLanding(result);
  return routeEvents === undefined ? result : { ...result, routeEvents };
}

export function resolveFallDamageLanding(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly fallDamage: BattleRawFallDamage;
}): BattleFallDamageLandingResult {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      reason: "missingCombatant",
      message: "Fall damage landing target is not in this battle.",
    };
  }
  const featherFall = resolveFeatherFallLandingForTarget(input.state, target);
  const mitigationFrameIndex = fallDamageLandingMitigationFrameIndex(
    featherFall.state,
    input.targetId,
  );
  const mitigationFrame =
    mitigationFrameIndex === null
      ? null
      : featherFall.state.interruptStack[mitigationFrameIndex];
  const slowFallReductionAmount =
    mitigationFrame?.kind === "fallDamageLandingMitigation"
      ? Number(mitigationFrame.reductionAmount)
      : 0;
  const effectiveFallDamageNumber = featherFall.fallDamagePrevented
    ? 0
    : Math.max(0, Number(input.fallDamage.amount) - slowFallReductionAmount);
  const withoutMitigationFrame =
    mitigationFrameIndex === null
      ? featherFall.state
      : battleStateWithoutInterruptStackFrame(
          featherFall.state,
          mitigationFrameIndex,
        );
  const landedTarget = withoutMitigationFrame.combatants.get(input.targetId);
  const afterFallingProne =
    landedTarget === undefined || effectiveFallDamageNumber === 0
      ? withoutMitigationFrame
      : {
          ...withoutMitigationFrame,
          combatants: new Map(withoutMitigationFrame.combatants).set(
            input.targetId,
            battleCreatureAfterFallingProne(landedTarget),
          ),
        };
  const effectiveFallDamage = toDamageAmount(effectiveFallDamageNumber);
  return {
    tag: "landed",
    state: afterFallingProne,
    snapshot: snapshotBattle(afterFallingProne),
    targetId: input.targetId,
    incomingFallDamage: input.fallDamage.amount,
    effectiveFallDamage,
    fallDamagePrevented: effectiveFallDamage === 0,
    fallingPronePrevented: effectiveFallDamage === 0,
    slowFallReductionAmount: toDamageAmount(slowFallReductionAmount),
    featherFallMitigated: featherFall.tag === "mitigated",
  };
}

function fallDamageLandingMitigationFrameIndex(
  state: BattleState,
  targetId: CombatantId,
): number | null {
  for (let index = state.interruptStack.length - 1; index >= 0; index -= 1) {
    const frame = state.interruptStack[index];
    if (
      frame?.kind === "fallDamageLandingMitigation" &&
      frame.targetId === targetId
    ) {
      return index;
    }
  }
  return null;
}

function battleStateWithoutInterruptStackFrame(
  state: BattleState,
  frameIndex: number,
): BattleState {
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, frameIndex),
      ...state.interruptStack.slice(frameIndex + 1),
    ],
  };
}

function battleCreatureAfterFallingProne(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        conditions: applyCondition(combatant.conditions, "prone"),
      }
    : {
        ...combatant,
        conditions: KnockedOutConditionState(
          applyCondition(combatant.conditions, "prone"),
        ),
      };
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
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(input.state);
  const activeInterrupt = frame?.activeInterrupt;
  const reactor = input.state.combatants.get(input.subject.reactorId);
  const invocation =
    reactor?.origin.kind === "character"
      ? characterSpellProcedure(
          reactor.origin.execution,
          input.subject.procedureRef,
          reactor,
        )
      : undefined;
  if (
    (frame?.trigger !== "attackHit" &&
      frame?.trigger !== "spellCast" &&
      frame?.trigger !== "afterDamage" &&
      frame?.trigger !== "creatureFalls") ||
    activeInterrupt === undefined ||
    activeInterrupt.responderId !== input.subject.reactorId ||
    !sameBattleSubject(activeInterrupt.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell casting requires an active matching interrupt checkpoint.",
    );
  }
  if (
    reactor?.origin.kind !== "character" ||
    invocation === undefined ||
    !isTriggeredReactionSpellInvocation(invocation)
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
  if (
    activeOngoingFeaturesPreventSpellInvocation(
      input.state,
      reactor,
      invocation,
    )
  ) {
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

  const spellCastReactionWindow = maybeOpenTriggeredReactionSpellCastInterrupt({
    state: input.state,
    subject: input.subject,
    frame,
    invocation,
    fills: input.fills,
    ...(input.handledInterruptTrigger === undefined
      ? {}
      : { handledInterruptTrigger: input.handledInterruptTrigger }),
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
    const fillSet = spellFillSet(
      input.fills,
      invocation,
      input.subject.procedureRef,
      input.subject.actorId,
      input.state,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame },
      actorId: input.subject.reactorId,
      invocation,
      fillSet,
    });
  }
  return resolveDirectTriggeredReactionSpellCommand(
    {
      ...input,
      frame,
      invocation,
    },
    executionRegistry,
  );
}

type TriggeredReactionSpellExecution =
  | Extract<
      BattleSpellProcedureExecution,
      {
        readonly procedure:
          | "shieldReaction"
          | "featherFallMitigation"
          | "counterspell";
      }
    >
  | (Extract<
      BattleSpellProcedureExecution,
      { readonly procedure: "saveGatedDamage" }
    > & {
      readonly castingTime: { readonly kind: "reaction" };
    });

type DirectTriggeredReactionSpellExecution = Extract<
  TriggeredReactionSpellExecution,
  {
    readonly procedure:
      | "shieldReaction"
      | "featherFallMitigation"
      | "counterspell";
  }
>;

function maybeOpenTriggeredReactionSpellCastInterrupt(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >;
  readonly frame: BattleInterruptCheckpoint;
  readonly invocation: TriggeredReactionSpellExecution;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (input.handledInterruptTrigger === "spellCast") {
    return null;
  }
  const fillSet = spellFillSet(
    input.fills,
    input.invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  if (fillSet.tag === "invalid") {
    return null;
  }
  const targetIds = triggeredReactionSpellCastTargetIds({
    frame: input.frame,
    reactorId: input.subject.reactorId,
    invocation: input.invocation,
    fillSet,
  });
  return maybeOpenInterruptWindow(
    input.state,
    spellCastInterruptFrame({
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
    input.handledInterruptTrigger,
  );
}

function triggeredReactionSpellCastTargetIds(input: {
  readonly frame: BattleInterruptCheckpoint;
  readonly reactorId: CombatantId;
  readonly invocation: TriggeredReactionSpellExecution;
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
    TriggeredReactionSpellExecution,
    { readonly procedure: "saveGatedDamage" }
  >,
): invocation is Extract<
  TriggeredReactionSpellExecution,
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

const byDirectTriggeredReactionProcedure = Match.discriminator("procedure");

function resolveDirectTriggeredReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
    readonly frame: BattleInterruptCheckpoint;
    readonly invocation: DirectTriggeredReactionSpellExecution;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const fillSet = spellFillSet(
    input.fills,
    input.invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const { invocation, ...resolutionInput } = input;
  return Match.value(invocation).pipe(
    byDirectTriggeredReactionProcedure("counterspell", (invocation) =>
      spellProcedureExecutionFor(executionRegistry, "counterspell").resolve({
        input: resolutionInput,
        actorId: input.subject.reactorId,
        invocation,
        fillSet,
      }),
    ),
    byDirectTriggeredReactionProcedure("featherFallMitigation", (invocation) =>
      spellProcedureExecutionFor(
        executionRegistry,
        "featherFallMitigation",
      ).resolve({
        input: resolutionInput,
        actorId: input.subject.reactorId,
        invocation,
        fillSet,
      }),
    ),
    byDirectTriggeredReactionProcedure("shieldReaction", (invocation) =>
      spellProcedureExecutionFor(executionRegistry, "shieldReaction").resolve({
        input: resolutionInput,
        actorId: input.subject.reactorId,
        invocation,
        fillSet,
      }),
    ),
    Match.exhaustive,
  );
}

export function resolveTriggeredReactionSaveGatedDamage(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly frame: BattleInterruptCheckpoint;
    readonly invocation: Extract<
      TriggeredReactionSpellExecution,
      { readonly procedure: "saveGatedDamage" }
    > & {
      readonly access: { readonly tag: "prepared" };
      readonly resource: SpellSlotInvocationResource;
    };
  },
  fillSet: Extract<ReturnType<typeof spellFillSet>, { readonly tag: "ok" }>,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackRoll !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hellish Rebuke targets the creature from the after-damage trigger.",
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.state,
    input.subject.reactorId,
    input.frame.damageSourceId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", savingThrowValidation);
  }
  /* v8 ignore stop */
  const savingThrowOutcome = fillSet.savingThrowOutcomes.outcomes[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowOutcome === undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hellish Rebuke requires the damaging creature's Saving Throw outcome.",
    );
  }
  /* v8 ignore stop */
  const saveDamageResult = saveGateDamageResultForOutcome(
    input.state,
    input.frame.damageSourceId,
    input.invocation,
    savingThrowOutcome.succeeded,
  );
  if (fillSet.damageRoll === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    input.invocation,
    false,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(input.frame.damageSourceId);
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hellish Rebuke target is no longer in the battle.",
    );
  }
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    input.invocation,
    fillSet.damageRoll,
    "full",
  );
  const damageSource = input.state.combatants.get(input.subject.reactorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      fillSet.damageRoll.holeId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    fillSet.sourceDamageRollPenaltyRolls,
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const damageAmount = damageAmountByTypeAfterTargetAdjustments(
    input.state,
    target,
    damageAmountByTypeAfterSaveDamageResult(
      sourcePenalty.damageByType,
      saveDamageResult,
    ),
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
    fillSet.hideousLaughterDamageRepeatSaves,
    hideousLaughterSaveCheck.holes,
  );
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHoles,
    fillSet.damageDispositions,
    input.frame.damageSourceId,
  );
  const relationshipCheck = fillSet.damageRelationshipDecisions.check(
    fillSet.damageRoll.holeId,
    damageAmount <= 0
      ? null
      : damageRelationshipDecisionHole({
          state: input.state,
          damageEventHoleId: fillSet.damageRoll.holeId,
          damageSourceId: input.subject.reactorId,
          targets: [
            {
              targetId: input.frame.damageSourceId,
              damageAmount: toDamageAmount(damageAmount),
              damageDisposition,
            },
          ],
          spatialFacts: fillSet.targetSpatialFacts,
        }),
  );
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop */
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
      damageDisposition,
      sourceDamageRollPenaltyRoll,
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.subject.reactorId,
      spatialFacts: fillSet.targetSpatialFacts,
      ...(relationshipCheck.decisions === undefined
        ? {}
        : { relationshipDecisions: relationshipCheck.decisions }),
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
  return openAfterDamageSequenceInterruptWindow({
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
    handledInterruptTrigger: undefined,
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
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };
type AttackHitBonusActionSpellInvocation = Extract<
  BattleSpellProcedureExecution,
  {
    readonly procedure:
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination";
  }
>;

export function resolveCastAttackHitBonusActionSpellCommand(
  input: AttackHitBonusActionSpellCommandInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(input.state);
  const activeInterrupt = frame?.activeInterrupt;
  const actor = input.state.combatants.get(input.subject.casterId);
  const target =
    frame?.trigger === "attackHit"
      ? input.state.combatants.get(frame.targetId)
      : undefined;
  const invocation =
    actor?.origin.kind === "character"
      ? characterSpellProcedure(
          actor.origin.execution,
          input.subject.procedureRef,
          actor,
        )
      : undefined;
  if (
    frame?.trigger !== "attackHit" ||
    frame.continuation.kind !== "replay" ||
    activeInterrupt === undefined ||
    activeInterrupt.responderId !== input.subject.casterId ||
    !sameBattleSubject(activeInterrupt.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell casting requires an active matching attack-hit window.",
    );
  }
  if (
    !isCharacterBattleCreatureState(actor) ||
    invocation === undefined ||
    !isAttackHitBonusActionSpellInvocation(invocation)
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
  if (
    activeOngoingFeaturesPreventSpellInvocation(input.state, actor, invocation)
  ) {
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
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: input.fills,
    });
  }
  if (!interruptedProcedureSupportsAttackDamageChanges(frame.continuation)) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "After-hit damage cannot modify a stored-glyph replay continuation.",
    );
  }
  const attackDamageChangeFrame = {
    ...frame,
    continuation: frame.continuation,
  };
  const fillValidation = attackHitBonusActionSpellFillValidation(
    input,
    invocation,
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
  if (invocation.procedure === "afterHitDamage") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit damage spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  if (invocation.procedure === "afterHitDamageAndIllumination") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit damage and illumination spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit timed damage and save spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  return invalidResult(
    input.state,
    "unsupportedActOption",
    "Attack-hit Bonus Action spell command requires a supported prepared after-hit spell.",
  );
}

function attackHitBonusActionSpellFillValidation(
  input: BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject>,
  invocation: AttackHitBonusActionSpellInvocation,
):
  | {
      readonly tag: "validNonSave";
      readonly fillSet: Extract<
        ReturnType<typeof spellFillSet>,
        { readonly tag: "ok" }
      >;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    input.subject.actorId,
    input.state,
  );
  if (fillSet.tag === "invalid") {
    return {
      tag: "invalid",
      result: invalidResult(input.state, "invalidFill", fillSet.message),
    };
  }
  return fillsBelongToSpellCastHoles(input.fills)
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

function afterHitSpellMatchesAttackTrigger(
  invocation: Pick<AttackHitBonusActionSpellInvocation, "procedure">,
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

export function resumeInterruptedProcedure(
  state: BattleState,
  continuation: Exclude<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptTrigger: BattleInterruptTrigger,
  attackResolvers: BattleAttackResolvers,
): BattleResolutionResult {
  if (continuation.kind === "resolved") {
    return {
      tag: "resolved",
      state,
      snapshot: snapshotBattle(state),
    };
  }
  if (continuation.kind === "afterDamageSequence") {
    return openAfterDamageSequenceInterruptWindow({
      state,
      subject: continuation.subject,
      events: continuation.events,
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "weaponMasteryCleave") {
    return attackResolvers.resolveWeaponMasteryCleaveContinuation({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "huntersPreyHordeBreaker") {
    return attackResolvers.resolveHuntersPreyHordeBreakerContinuation({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "movement") {
    return resolveMoveAfterMovement({
      state,
      subject: continuation.subject,
      movement: continuation.movement,
      remainingFills: [],
    });
  }
  if (continuation.kind === "movementThenAfterDamageSequence") {
    return openAfterDamageSequenceInterruptWindow({
      state: applyBattleMovement(state, continuation.movement),
      subject: continuation.subject,
      events: continuation.events,
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (isCommandMovementContinuation(continuation)) {
    return resumeCommandMovementContinuation(state, continuation);
  }
  if (continuation.kind === "attackDamage") {
    const damageAmount = attackDamageContinuationAmount(state, continuation);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageAmount === null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        state,
        "invalidFill",
        "Attack damage target is no longer available.",
      );
    }
    /* v8 ignore stop */
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
            handledInterruptTrigger,
          ),
        ],
      };
      return needsHolesResult(pendingState, continuation.participant, [
        concentrationPending,
      ]);
    }
    const continuationConcentrationSavingThrows =
      attackDamageContinuationConcentrationFills(continuation);
    const damagedState = applyAttackDamageAmount({
      state,
      attackerId: attackDamageInterruptionParticipantId(continuation),
      targetId: continuation.target.combatantId,
      damageAmount,
      deathFailuresAtZeroHp: attackDamageDeathFailuresAtZeroHp(continuation),
      damageDisposition: continuation.continuation.damageDisposition,
      attackDamageRiders: continuation.continuation.attackDamageRiders,
      weaponDamageDiceRollChoice:
        continuation.continuation.weaponDamageDiceRollChoice,
      concentrationSavingThrow: attackDamageContinuationTargetConcentrationFill(
        state,
        continuation,
      ),
      wardingBondDamageShareConcentrationSavingThrows:
        continuationConcentrationSavingThrows,
      spatialFacts: attackDamageContinuationTargetSpatialFacts(continuation),
      relationshipDecisions: continuation.continuation.relationshipDecisions,
    });
    const afterDamageEvent = {
      damageSourceId: attackDamageInterruptionParticipantId(continuation),
      damagedId: continuation.target.combatantId,
      damageAmount,
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: attackDamageContinuationTargetSpatialFacts(continuation),
        damagedId: continuation.target.combatantId,
        damageSourceId: attackDamageInterruptionParticipantId(continuation),
      }),
    } satisfies BattleAfterDamageEvent;
    return resolveAttackDamageContinuationCunningStrike({
      state: damagedState,
      frame: {
        kind: "attackDamageContinuationCunningStrike",
        continuation,
        afterDamageEvent,
        handledInterruptTrigger,
      },
      subject: continuation.participant,
      fills: attackDamageContinuationCunningStrikePrefixFills(continuation),
    });
  }

  continuation satisfies never;
  throw new Error("Unhandled interrupted procedure variant.");
}

function resumeInterruptedProcedureWithExecutionRegistry(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
  handledInterruptTrigger: BattleInterruptTrigger,
  executionRegistry: SpellProcedureExecutionRegistry,
  attackResolvers: BattleAttackRouteResolvers,
): BattleResolutionResult {
  return continuation.kind === "replay"
    ? resolveReplayContinuationFromState({
        state,
        continuation,
        handledInterruptTrigger,
        fills: continuation.fills,
        execution: replayContinuationExecution(
          executionRegistry,
          attackResolvers,
        ),
      })
    : resumeInterruptedProcedure(
        state,
        continuation,
        handledInterruptTrigger,
        attackResolvers,
      );
}

export function resolveAttackDamageContinuationCunningStrike(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationCunningStrikeFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const continuation = input.frame.continuation;
  if (continuation.continuation.cunningStrike === undefined) {
    return openAfterDamageSequenceInterruptWindow({
      state: input.state,
      subject: continuation.participant,
      events: [input.frame.afterDamageEvent],
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: input.frame.handledInterruptTrigger,
    });
  }
  const stateWithoutCurrentFrame =
    currentInterruptFrame(input.state)?.kind ===
    "attackDamageContinuationCunningStrike"
      ? {
          ...input.state,
          interruptStack: input.state.interruptStack.slice(0, -1),
        }
      : input.state;
  const nextFill = attackDamageContinuationCunningStrikeFill(
    input.frame,
    input.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (nextFill.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", nextFill.message);
  }
  /* v8 ignore stop */
  const cunningStrike = {
    ...continuation.continuation.cunningStrike,
    fills:
      nextFill.value === undefined
        ? continuation.continuation.cunningStrike.fills
        : [...continuation.continuation.cunningStrike.fills, nextFill.value],
  };
  const fillSet = attackDamageContinuationCunningStrikeFillSet(
    cunningStrike.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const resolved = resolveCunningStrikeAfterAttackDamage({
    state: stateWithoutCurrentFrame,
    selected: cunningStrike.selected,
    savingThrow: fillSet.savingThrow,
    movement: fillSet.movement,
    toolPossession: fillSet.toolPossession,
    endTurnCover: fillSet.endTurnCover,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (resolved.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", resolved.message);
  }
  /* v8 ignore stop */
  if (resolved.tag === "needsHoles") {
    const pendingFrame: BattleAttackDamageContinuationCunningStrikeFrame = {
      ...input.frame,
      continuation: {
        ...continuation,
        continuation: {
          ...continuation.continuation,
          cunningStrike,
        },
      },
    };
    const pendingState = {
      ...stateWithoutCurrentFrame,
      interruptStack: [
        ...stateWithoutCurrentFrame.interruptStack,
        pendingFrame,
      ],
    };
    return needsHolesResult(pendingState, input.subject, resolved.holes);
  }
  return openAfterDamageSequenceInterruptWindow({
    state: resolved.state,
    subject: continuation.participant,
    events: [input.frame.afterDamageEvent],
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: input.frame.handledInterruptTrigger,
  });
}

function attackDamageContinuationTargetSpatialFacts(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): readonly BattleTargetSpatialFact[] {
  return continuation.target.spatialFacts;
}

function attackDamageInterruptionParticipantId(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): CombatantId {
  return battleAttackHostParticipantId(continuation.participant);
}

function attackDamageDeathFailuresAtZeroHp(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): 1 | 2 {
  return Match.value(continuation.criticalConsequence.kind).pipe(
    Match.when("ordinaryHit", (): 1 => 1),
    Match.when("criticalHit", (): 2 => 2),
    Match.exhaustive,
  );
}

export function attackDamageContinuationAmount(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): DamageAmount | null {
  const target = state.combatants.get(continuation.target.combatantId);
  return target === undefined
    ? null
    : attackDamageEventAmountForTarget(state, target, continuation.damageInput);
}

export function attackDamageContinuationConcentrationHole(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): BattleConcentrationSavingThrowHole | null {
  const target = state.combatants.get(continuation.target.combatantId);
  if (target === undefined) {
    return null;
  }
  const damageAmount = Number(
    attackDamageEventAmountForTarget(state, target, continuation.damageInput),
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
  const target = state.combatants.get(continuation.target.combatantId);
  if (target === undefined) {
    return undefined;
  }
  const hole = concentrationSavingThrowHole(
    target,
    Number(
      attackDamageEventAmountForTarget(state, target, continuation.damageInput),
    ),
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
  return continuation.continuation.concentrationSavingThrows;
}

export function resolveAttackDamageContinuationConcentration(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationConcentrationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly attackResolvers: BattleAttackRouteResolvers;
}): BattleResolutionResult {
  const concentrationSave = attackDamageContinuationConcentrationHole(
    input.state,
    input.frame.continuation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSave === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw is no longer available for the damaged target.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill = attackDamageContinuationConcentrationFill(
    input.frame.continuation,
    input.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFill.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", concentrationFill.message);
  }
  /* v8 ignore stop */
  if (concentrationFill.value === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationSave]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFill.value.holeId !== concentrationSave.holeId) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill does not match the damaged target.",
    );
  }
  /* v8 ignore stop */
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollOutcomeIssue({
    actor: input.state.combatants.get(concentrationSave.combatantId),
    rollMode: concentrationSave.rollMode,
    rolledD20s: concentrationFill.value.value.rolledD20s,
    originalNaturalD20:
      concentrationFill.value.value.naturalD20 === undefined
        ? undefined
        : Number(concentrationFill.value.value.naturalD20),
    decision: concentrationFill.value.value.d20TestNaturalOneReroll,
    withoutRoll: concentrationFill.value.value.withoutRoll,
    succeeded: concentrationFill.value.value.succeeded,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resumeInterruptedProcedure(
    stateWithoutFrame,
    {
      ...input.frame.continuation,
      continuation: {
        ...input.frame.continuation.continuation,
        concentrationSavingThrows: [
          ...attackDamageContinuationConcentrationFills(
            input.frame.continuation,
          ),
          concentrationFill.value,
        ],
      },
    },
    input.frame.handledInterruptTrigger,
    input.attackResolvers,
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
  const prefix = attackDamageContinuationConcentrationFills(continuation);
  const submitted = fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const accumulated = battleFillPrefixAccumulated(prefix, submitted);
  const remaining = accumulated ? submitted.slice(prefix.length) : submitted;
  if (remaining.length === 0) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return { tag: "ok", value: undefined };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    remaining.length !== 1 ||
    remaining[0]?.kind !== "concentrationSavingThrow"
  ) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return {
      tag: "invalid",
      message:
        "Attack damage Concentration continuation accepts the pending Concentration Saving Throw after the original attack fills.",
    };
  }
  /* v8 ignore stop */
  return { tag: "ok", value: remaining[0] };
}

function attackDamageContinuationCunningStrikeFill(
  frame: BattleAttackDamageContinuationCunningStrikeFrame,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly value: BattleCunningStrikeContinuationFill | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const prefix = frame.continuation.continuation.cunningStrike?.fills ?? [];
  const submitted = fills.filter(isCunningStrikeContinuationFill);
  const accumulated = battleFillPrefixAccumulated(prefix, submitted);
  const remaining = accumulated ? submitted.slice(prefix.length) : submitted;
  if (remaining.length === 0) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return { tag: "ok", value: undefined };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    remaining.length !== 1 ||
    !isCunningStrikeContinuationFill(remaining[0]!)
  ) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return {
      tag: "invalid",
      message:
        "Cunning Strike continuation accepts one requested Cunning Strike after-damage fill after the original attack fills.",
    };
  }
  /* v8 ignore stop */
  return { tag: "ok", value: remaining[0] };
}

function attackDamageContinuationCunningStrikePrefixFills(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
): readonly BattleFill[] {
  return [
    ...attackDamageContinuationConcentrationFills(continuation),
    ...(continuation.continuation.cunningStrike?.fills ?? []),
  ];
}

function isCunningStrikeContinuationFill(
  fill: BattleFill,
): fill is BattleCunningStrikeContinuationFill {
  return (
    fill.kind === "savingThrowOutcome" ||
    fill.kind === "movement" ||
    fill.kind === "toolPossessionFacts" ||
    fill.kind === "cunningStrikeEndTurnCoverFacts"
  );
}

function attackDamageContinuationCunningStrikeFillSet(
  fills: readonly BattleCunningStrikeContinuationFill[],
):
  | {
      readonly tag: "ok";
      readonly savingThrow:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly movement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
      readonly toolPossession:
        | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
        | undefined;
      readonly endTurnCover:
        | Extract<
            BattleFill,
            { readonly kind: "cunningStrikeEndTurnCoverFacts" }
          >
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let movement: Extract<BattleFill, { readonly kind: "movement" }> | undefined;
  let toolPossession:
    | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
    | undefined;
  let endTurnCover:
    | Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "savingThrowOutcome") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrow !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      savingThrow = fill;
      continue;
    }
    if (fill.kind === "movement") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (movement !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike movement was filled twice.",
        };
      }
      /* v8 ignore stop */
      movement = fill;
      continue;
    }
    if (fill.kind === "cunningStrikeEndTurnCoverFacts") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (endTurnCover !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike end-turn cover facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      endTurnCover = fill;
      continue;
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (toolPossession !== undefined) {
      /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
      return {
        tag: "invalid",
        message: "Cunning Strike tool-possession facts were filled twice.",
      };
    }
    /* v8 ignore stop */
    toolPossession = fill;
  }
  return { tag: "ok", savingThrow, movement, toolPossession, endTurnCover };
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
