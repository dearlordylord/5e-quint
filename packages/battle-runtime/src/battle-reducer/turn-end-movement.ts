// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard spell.invocation-cloudkill-area-hazard unit-feature.acrobatic-movement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.creature-space-movement-permission unit-feature.d20-test-natural-one-reroll unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-grease-ground-hazard spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { Either, Match } from "effect";
import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import {
  canSpendMovement,
  canSpendBonusAction,
  enableMovementActionBonusActionExclusion,
  markMovementSpentForMovementActionBonusActionExclusion,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  currentActing,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import { ordinaryMovementCost } from "@dnd/shared-algebras/movement-cost-algebra";
import {
  DieRollResult,
  MovementFeet,
  movementFeet,
  type Ability,
  type Round as RoundType,
} from "@dnd/shared/types";
import {
  type BattleInsectPlagueAreaMembershipTrigger,
  type BattleCloudkillAreaMembershipTrigger,
  type BattleSleetStormAreaMembershipTrigger,
  type BattleInterruptAttackExecutionSelection,
  type BattleSubject,
} from "../battle-subjects.ts";
import { characterBattleResourceIsUseCount } from "../character-battle-resource-execution.ts";
import { attackExecutionSelectionKey } from "../battle-action-options.ts";
import { type BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import {
  type BattleAreaId,
  type BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import {
  combatantWearingArmor,
  combatantWieldingShield,
  currentActorId,
} from "./creature-state-leaves.ts";
import {
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeActions,
} from "./creature-state-execution.ts";
import {
  applyStartTurnDeathSavingThrow,
  applyHitPointMaximumIncreaseExpiration,
  applyTemporaryHitPoints,
  battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks,
  breakBattleConcentration,
  breakCombatantConcentration,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  deathSavingThrowHole,
  fillsMatchingHoleIds,
  processStatBlockRechargeRolls,
  startTurnDeathSavingThrowRequired,
  statBlockRechargeRollHole,
} from "./damage-apply.ts";
import {
  d20TestNaturalOneRerollDieDecisionRequired,
  d20TestNaturalOneRerollDieIssue,
  d20TestNaturalOneRerollHoleWithOption,
  effectiveD20TestNaturalOneRerollDeathSavingThrow,
} from "./d20-test-natural-one-reroll.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  flamingSphereDamageAfterSave,
  flamingSphereMoveDistanceAccepted,
} from "./flaming-sphere-hazard-ram.ts";
import { hideousLaughterRepeatSavingThrowOutcomeHole } from "./hideous-laughter-repeat-save.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { maxJumpMovementReplacementDistanceFeet } from "./jump-movement-replacement.ts";
import { validateLevitatedMovementFact } from "./levitate-creature.ts";
import {
  moonbeamDamageAfterSave,
  moonbeamMoveDistanceAccepted,
} from "./moonbeam-movable-zone.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  combatantCanMoveWithBudget,
  creatureSizeIsLargerThanSelf,
  effectiveMovementSpeed,
  grappleTargetExemptFromDragCost,
  opportunityAttackThreatsForMovement,
  interruptAttackExecutionSelectionMatchesOption,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { invalidResult } from "./result-helpers.ts";
import { slowActionOrBonusActionTurnResources } from "./slow-active-penalties-runtime.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources,
  combatantsAfterHideousLaughterSpellEndedIfNoEffects,
  conditionsAfterApplyingSpellConditionEffects,
  conditionsAfterExpiringSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
  spellConcentrationEffectSourceFromEffect,
} from "./spell-condition-effects-helpers.ts";
import { battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects } from "./spell-created-held-object.ts";
import {
  battleCreatureWithSpellEndTargetStatePromotions,
  END_OF_NEXT_TURN_NEW_ROUND_DURATION_TICK,
  type EndOfNextTurnExpirationTiming,
  spellEndTargetStatePromotesIncapacitated,
} from "./spell-end-target-state.ts";
import { spellGrantedActionResourceTurnResources } from "./spell-granted-action-resource.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  applyPreparedSlotSpellDamage,
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import {
  activeDruidWildShape,
  combatantEffectiveSize,
  refreshActiveDruidWildShapeStartTurnExecution,
} from "./druid-wild-shape.ts";
import type { UnitSupportProcedureExecution } from "../character-execution-queries.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "./fly-speed-grant-end-fall-cleanup.ts";
import {
  applyCommandGrovelProneToTarget,
  applyGreaseProneToTarget,
  applyWebRestrainedCondition,
  expireBattleLightEmitters,
  addMoonbeamShapeShiftSuppression,
  applySleetStormAreaHazardFailedSaveEffect,
  markCloudkillAreaHazardSavedThisTurn,
  markInsectPlagueAreaHazardSavedThisTurn,
  markWebSavedThisTurn,
  markSleetStormAreaHazardSavedThisTurn,
  markMoonbeamSavedThisTurn,
  resetAllCloudkillSavedThisTurn,
  resetAllInsectPlagueSavedThisTurn,
  removeMoonbeamShapeShiftSuppression,
  removeWebRestrainedCondition,
  replaceGustOfWindLineDirection,
  resetAllMoonbeamSavedThisTurn,
  resetAllSleetStormSavedThisTurn,
  resetAllWebSavedThisTurn,
  tickDurationBattleLightEmitters,
} from "./spells-active-effects.ts";
import { revertShapeShiftedCombatantToTrueForm } from "./shape-shifting.ts";
import { validateGustOfWindLineAreaPushFacts } from "./gust-of-wind-push-facts.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import { refreshStatBlockStartTurnExecution } from "../stat-block-execution-state.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleAcrobaticMovementFact,
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleCommandApproachMovementFact,
  BattleCommandFleeMovementFact,
  BattleCommandHaltTurnSuppression,
  BattleCreatureSpaceTraversalMovementFact,
  BattleCreatureState,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleFlamingSphereDamageRollHole,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereTrigger,
  BattleAreaDifficultTerrainMovementFact,
  BattleAreaDifficultTerrainSource,
  BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole,
  BattleGustOfWindLineMovementFact,
  BattleMoonbeamDamageRollHole,
  BattleMoonbeamSaveTrigger,
  BattleMovableZoneRepositionMovementHole,
  BattleGrappleDragMovementFact,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleSpikeGrowthMovementDamageRollHole,
  BattleInsectPlagueAreaHazardDamageRollHole,
  BattleInsectPlagueAreaHazardSavingThrowOutcomeHole,
  BattleInsectPlagueAreaHazardTrigger,
  BattleCloudkillAreaHazardDamageRollHole,
  BattleCloudkillAreaHazardSavingThrowOutcomeHole,
  BattleCloudkillAreaHazardTrigger,
  BattleSleetStormAreaHazardSavingThrowOutcomeHole,
  BattleSleetStormAreaHazardTrigger,
  BattleWebRestraintTrigger,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleHoleId,
  BattleJumpMovementReplacementFact,
  BattleMovementFillValue,
  BattleOpportunityAttackThreat,
  AdmittedBattleResolutionInput,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleSleepRepeatSavingThrowOutcomeHole,
  BattleSpellAreaChoice,
  BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole,
  BattleSpellConditionEndTurnSavingThrowOutcomeHole,
  BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole,
  BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole,
  BattleSpellTurnEndDamageRollHole,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
  BattleStatBlockRechargeRollHole,
  BattleStatBlockRechargeRollResult,
  BattleState,
  BattleTurnResources,
  BattleSavingThrowOutcomeValue,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowRollModeProjection,
  SpellTurnStartDamage,
} from "../battle-state-execution.ts";
import { UNIT_FEATURE_CONDITION_END_TURN_SAVE_HOLE_KEY_PREFIX } from "./domain-constants.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import {
  DEATH_SAVING_THROW_HOLE_ID,
  MOVEMENT_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import { movementHole } from "./movement-holes.ts";
import { resetBattleTurnResources } from "./turn-resource-reset.ts";
import {
  canonicalHeldObjectIdsForActor,
  commandDropHeldObjectFactsHole,
  commandDropHeldObjectFactsHoleId,
  commandPendingEffectsForActor,
  flamingSphereRamMovementHole,
  flamingSphereRepositionMovementHole,
  flamingSphereSavingThrowOutcomeHole,
  flamingSphereTriggerLabel,
  greaseGroundHazardSavingThrowOutcomeHole,
  gustOfWindLineDirectionChoiceHole,
  gustOfWindLineSavingThrowOutcomeHole,
  hideousLaughterEffects,
  moonbeamRepositionMovementHole,
  moonbeamSavingThrowOutcomeHole,
  moonbeamTriggerLabel,
  standFromProneCostFeet,
  webRestraintSavingThrowOutcomeHole,
} from "./turn-movement-discovery.ts";
import type {
  CommandPendingEffect,
  FlamingSphereEffect,
  GreaseGroundHazardEffect,
  GustOfWindLineEffect,
  HideousLaughterEffect,
  MoonbeamEffect,
  WebRestraintHazardEffect,
} from "./turn-movement-discovery.ts";
export {
  canonicalHeldObjectIdsForActor,
  commandDropHeldObjectFactsHole,
  commandPendingEffectsForActor,
  flamingSphereRamMovementHole,
  flamingSphereRepositionMovementHole,
  flamingSphereSavingThrowOutcomeHole,
  greaseGroundHazardSavingThrowOutcomeHole,
  gustOfWindLineDirectionChoiceHole,
  gustOfWindLineSavingThrowOutcomeHole,
  moonbeamRepositionMovementHole,
  moonbeamSavingThrowOutcomeHole,
  standFromProneCostFeet,
  webRestraintSavingThrowOutcomeHole,
} from "./turn-movement-discovery.ts";
export type {
  CommandPendingEffect,
  FlamingSphereEffect,
  GreaseGroundHazardEffect,
  GustOfWindLineEffect,
  MoonbeamEffect,
  WebRestraintHazardEffect,
} from "./turn-movement-discovery.ts";

export {
  readiedMovementInitialHoles,
  readiedSpellInitialHoles,
} from "./readied-initial-holes.ts";

export function resolveEndTurn(
  state: BattleState,
  deathSavingThrowRoll?: DieRollResult,
  statBlockRechargeRolls?: readonly BattleStatBlockRechargeRollResult[],
  sleepRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  hideousLaughterRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellConditionEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellConditionCountedEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  unitFeatureConditionEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  slowActivePenaltiesEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  abilityD20TestRollModeEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellTurnEndDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [],
  spellTurnStartDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [],
  spellTurnStartSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  turnBoundaryHideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [],
  damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const [id, combatant] of state.combatants) {
    combatants.set(
      id,
      id === nextActorId
        ? resetStartOfTurnCombatant(resetPerTurnCharacterResources(combatant))
        : combatant,
    );
  }
  const afterDeathSavingThrow =
    deathSavingThrowRoll === undefined
      ? combatants
      : applyStartTurnDeathSavingThrow(
          combatants,
          nextActorId,
          deathSavingThrowRoll,
        );
  const expiringReadiedSpellCasterIds = [...state.readiedSpells]
    .filter(
      ([, readiedSpell]) => readiedSpell.expiresAt.combatantId === nextActorId,
    )
    .map(([casterId]) => casterId);
  const readiedSpells = new Map(state.readiedSpells);
  for (const casterId of expiringReadiedSpellCasterIds) {
    readiedSpells.delete(casterId);
  }
  const readiedMovements = new Map(state.readiedMovements);
  for (const [actorId, readiedMovement] of state.readiedMovements) {
    if (readiedMovement.expiresAt.combatantId === nextActorId) {
      readiedMovements.delete(actorId);
    }
  }
  const helpAttacks = state.helpAttacks.filter(
    (help) => help.expiresAt.combatantId !== nextActorId,
  );
  const flySpeedGrantEndFallCleanupFrames: BattleFlySpeedGrantEndFallCleanupFrame[] =
    [];
  let combatantsAfterExpiredReadiedSpells = afterDeathSavingThrow;
  for (const casterId of expiringReadiedSpellCasterIds) {
    const broken = breakCombatantConcentration(
      {
        ...state,
        combatants: combatantsAfterExpiredReadiedSpells,
      },
      combatantsAfterExpiredReadiedSpells,
      casterId,
    );
    combatantsAfterExpiredReadiedSpells = broken.value;
    flySpeedGrantEndFallCleanupFrames.push(
      ...broken.flySpeedGrantEndFallCleanupFrames,
    );
  }
  const combatantsAfterEndTurnOngoingFeatures = expireEndOfTurnOngoingFeatures(
    combatantsAfterExpiredReadiedSpells,
    currentActorId(state),
    state.initiative.round,
  );
  const stateAfterSleepRepeatSaves = applySleepRepeatSaveFills(
    {
      ...state,
      combatants: combatantsAfterEndTurnOngoingFeatures,
      readiedSpells,
      readiedMovements,
      helpAttacks,
    },
    currentActorId(state),
    state.initiative.round,
    sleepRepeatSaves,
  );
  const combatantsAfterSleepRepeatSaves = stateAfterSleepRepeatSaves.combatants;
  const combatantsAfterHideousLaughterRepeatSaves =
    applyHideousLaughterRepeatSaveFills(
      combatantsAfterSleepRepeatSaves,
      currentActorId(state),
      hideousLaughterRepeatSaves,
    );
  const combatantsAfterSpellConditionRepeatSaves =
    applySpellConditionEndTurnSaveFills(
      combatantsAfterHideousLaughterRepeatSaves,
      currentActorId(state),
      spellConditionEndTurnSaves,
    );
  const combatantsAfterCountedSpellConditionRepeatSaves =
    applySpellConditionCountedEndTurnSaveFills(
      combatantsAfterSpellConditionRepeatSaves,
      currentActorId(state),
      spellConditionCountedEndTurnSaves,
    );
  const combatantsAfterUnitFeatureConditionRepeatSaves =
    applyUnitFeatureConditionEndTurnSaveFills(
      combatantsAfterCountedSpellConditionRepeatSaves,
      currentActorId(state),
      unitFeatureConditionEndTurnSaves,
    );
  const combatantsAfterSlowActivePenaltyRepeatSaves =
    applySlowActivePenaltiesEndTurnSaveFills(
      combatantsAfterUnitFeatureConditionRepeatSaves,
      currentActorId(state),
      slowActivePenaltiesEndTurnSaves,
    );
  const combatantsAfterAbilityD20TestRepeatSaves =
    applyAbilityD20TestRollModeEndTurnSaveFills(
      combatantsAfterSlowActivePenaltyRepeatSaves,
      currentActorId(state),
      abilityD20TestRollModeEndTurnSaves,
    );
  const combatantsAfterSpellTurnEndDamage = applyEndTurnSpellDamageFills(
    {
      ...state,
      combatants: combatantsAfterAbilityD20TestRepeatSaves,
    },
    currentActorId(state),
    state.initiative.round,
    spellTurnEndDamageRolls,
    concentrationSavingThrows,
    damageDispositions,
    turnBoundaryHideousLaughterDamageRepeatSaves,
  ).combatants;
  const combatantsAfterEndEffects = expireEndOfTurnEffects(
    combatantsAfterSpellTurnEndDamage,
    currentActorId(state),
    state.initiative.round,
  );
  const lightEmittersAfterEndEffects = expireBattleLightEmitters(
    state.lightEmitters,
    (emitter) =>
      emitter.expiresAt.kind === "endOfTurn" &&
      emitter.expiresAt.combatantId === currentActorId(state) &&
      emitter.expiresAt.round === state.initiative.round,
  );
  const lightEmittersAfterDurationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationBattleLightEmitters(lightEmittersAfterEndEffects)
      : lightEmittersAfterEndEffects;
  const combatantsAfterStartOngoingFeatures = expireStartOfTurnOngoingFeatures(
    combatantsAfterEndEffects,
    nextActorId,
  );
  const combatantsAfterStartEffects = expireStartOfTurnEffects(
    combatantsAfterStartOngoingFeatures,
    nextActorId,
  );
  const combatantsAfterMoonbeamReset = resetAllMoonbeamSavedThisTurn(
    combatantsAfterStartEffects,
  );
  const combatantsAfterWebSaveReset = resetAllWebSavedThisTurn(
    combatantsAfterMoonbeamReset,
  );
  const combatantsAfterSleetStormSaveReset = resetAllSleetStormSavedThisTurn(
    combatantsAfterWebSaveReset,
  );
  const combatantsAfterInsectPlagueSaveReset =
    resetAllInsectPlagueSavedThisTurn(combatantsAfterSleetStormSaveReset);
  const combatantsAfterCloudkillSaveReset = resetAllCloudkillSavedThisTurn(
    combatantsAfterInsectPlagueSaveReset,
  );
  const combatantsAfterStartTurnEffects = applyStartOfTurnActiveEffects(
    combatantsAfterCloudkillSaveReset,
    nextActorId,
  );
  const combatantsAfterSpellTurnStartDamage = applyStartTurnSpellDamageFills(
    {
      ...state,
      initiative,
      combatants: combatantsAfterStartTurnEffects,
    },
    nextActorId,
    spellTurnStartDamageRolls,
    spellTurnStartSaves,
    concentrationSavingThrows,
    damageDispositions,
    turnBoundaryHideousLaughterDamageRepeatSaves,
  ).combatants;
  const durationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationEffects(combatantsAfterSpellTurnStartDamage, {
          state: {
            ...state,
            initiative,
            combatants: combatantsAfterSpellTurnStartDamage,
          },
          spellEndTargetStatePromotionTiming:
            END_OF_NEXT_TURN_NEW_ROUND_DURATION_TICK,
        })
      : {
          value: combatantsAfterSpellTurnStartDamage,
          flySpeedGrantEndFallCleanupFrames: [],
          spellEndTargetStatePromotionIds: [],
        };
  const combatantsAfterDurationTick = durationTick.value;
  flySpeedGrantEndFallCleanupFrames.push(
    ...durationTick.flySpeedGrantEndFallCleanupFrames,
  );
  const combatantsAfterRecharge =
    statBlockRechargeRolls === undefined
      ? combatantsAfterDurationTick
      : processStatBlockRechargeRolls(
          combatantsAfterDurationTick,
          nextActorId,
          statBlockRechargeRolls,
        );
  const combatantsAfterDamageReductionReset =
    resetSpellDamageReductionsForNewTurn(combatantsAfterRecharge);
  const resetTurnResources = spellGrantedActionResourceTurnResources(
    resetBattleTurnResources(state.currentTurnResources),
    combatantsAfterDamageReductionReset.get(nextActorId),
  );
  const commandHalt = commandHaltTurnSuppressionForActor(
    combatantsAfterDamageReductionReset,
    nextActorId,
    initiative.round,
  );
  const currentTurnResources = commandHaltTurnResources(
    resetTurnResources,
    commandHalt,
  );
  const currentTurnResourcesAfterSlow = slowActionOrBonusActionTurnResources(
    currentTurnResources,
    combatantsAfterDamageReductionReset.get(nextActorId),
  );
  const currentTurnResourcesAfterActionRestriction =
    moveActionBonusActionTurnResources(
      currentTurnResourcesAfterSlow,
      combatantsAfterDamageReductionReset.get(nextActorId),
    );
  const combatantsAfterCommandHalt =
    commandHalt === null
      ? combatantsAfterDamageReductionReset
      : combatantsWithCommandHaltMovementSpent(
          {
            ...stateAfterSleepRepeatSaves,
            combatants: combatantsAfterDamageReductionReset,
          },
          nextActorId,
        );
  const nextState = battleStateWithFlySpeedGrantEndFallCleanupFrames(
    {
      ...stateAfterSleepRepeatSaves,
      initiative,
      combatants: combatantsAfterCommandHalt,
      lightEmitters: lightEmittersAfterDurationTick,
      currentTurnResources: currentTurnResourcesAfterActionRestriction,
      readiedSpells,
      readiedMovements,
      helpAttacks,
      legendaryActionWindow: {
        afterTurnActorId: currentActorId(state),
        consumed: false,
      },
    },
    flySpeedGrantEndFallCleanupFrames,
  );
  const nextStateWithSpellEndTargetStateConcentrationBreaks =
    battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
      nextState,
      durationTick.spellEndTargetStatePromotionIds,
    );

  return {
    tag: "resolved",
    state: nextStateWithSpellEndTargetStateConcentrationBreaks,
    snapshot: snapshotBattle(
      nextStateWithSpellEndTargetStateConcentrationBreaks,
    ),
  };
}

function commandHaltTurnSuppressionForActor(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): BattleCommandHaltTurnSuppression | null {
  const actor = combatants.get(actorId);
  const halted =
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "commandPending" &&
        effect.option === "halt" &&
        effect.expiresAt.combatantId === actorId &&
        effect.expiresAt.round === round,
    ) ?? false;
  return halted ? { kind: "commandHalt" } : null;
}

function commandHaltTurnResources(
  resources: BattleTurnResources,
  commandHalt: BattleCommandHaltTurnSuppression | null,
): BattleTurnResources {
  return commandHalt === null
    ? resources
    : {
        ...resources,
        actionResources: [],
        currentHasBonusAction: false,
        commandHalt,
      };
}

function moveActionBonusActionTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasMoveActionBonusActionRestriction(actor)
    ? enableMovementActionBonusActionExclusion(
        resources,
        Number(actor?.movementSpentFeet ?? 0) > 0,
      )
    : resources;
}

function combatantHasMoveActionBonusActionRestriction(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.activeEffects.some(
      (effect) =>
        effect.kind === "unitFeatureCondition" &&
        effect.turnRestriction?.kind === "moveActionOrBonusAction",
    ) ?? false
  );
}

function combatantsWithCommandHaltMovementSpent(
  state: BattleState,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state.combatants;
  }

  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const spentFeet = Math.max(
    Number(actor.movementSpentFeet),
    ...representedMovementSpeedKinds(actor).map((kind) =>
      Number(effectiveMovementSpeed(state, actor, kind, isGrappled)),
    ),
  );

  return new Map(state.combatants).set(actorId, {
    ...actor,
    movementSpentFeet: movementFeet(spentFeet),
  });
}

export function resetSpellDamageReductionsForNewTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const activeEffects = combatant.activeEffects.map((effect) =>
        (effect.kind === "spellDamageReduction" ||
          effect.kind === "jumpMovementReplacement") &&
        effect.usedThisTurn
          ? { ...effect, usedThisTurn: false }
          : effect,
      );
      return activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
        ? [id, { ...combatant, activeEffects }]
        : [id, combatant];
    }),
  );
}

export function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const shouldExpire = (effect: BattleActiveEffect) =>
    "expiresAt" in effect &&
    effect.expiresAt.kind === "startOfTurn" &&
    effect.expiresAt.combatantId === actorId;
  const expiringSpellSources = [...combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "nextAttackRollBySelf" }
      > => effect.kind === "nextAttackRollBySelf" && shouldExpire(effect),
    ),
  );
  return combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources(
    expireActiveEffects(combatants, shouldExpire),
    expiringSpellSources.flatMap((effect) => {
      const source = spellConcentrationEffectSourceFromEffect(effect);
      return source === null ? [] : [source];
    }),
  );
}

export function applyStartOfTurnActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  /* v8 ignore start -- Defensive inconsistent-state guard: battle admission and turn reducers keep every initiative combatant in the combatant map before start-of-turn effects run. */
  if (actor === undefined) {
    return combatants;
  }
  /* v8 ignore stop */
  const temporaryHitPoints = actor.activeEffects
    .filter(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      > => effect.kind === "turnStartTemporaryHitPoints",
    )
    .reduce(
      (highest, effect) => Math.max(highest, effect.amount),
      Number(actor.tempHp),
    );
  if (temporaryHitPoints === Number(actor.tempHp)) {
    return combatants;
  }
  return new Map(combatants).set(
    actorId,
    applyTemporaryHitPoints(actor, temporaryHitPoints),
  );
}

export function spellTurnStartDamageEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellTurnStartDamageEffect[] {
  /* v8 ignore start -- Defensive inconsistent-state guard: end-turn routing derives the next actor from admitted initiative entries, whose combatants remain in the battle map. */
  if (combatant === undefined) {
    return [];
  }
  /* v8 ignore stop */
  return combatant.activeEffects.filter(
    (effect): effect is SpellTurnStartDamageEffect =>
      (effect.kind === "spellCondition" &&
        effect.turnStartDamage !== null &&
        hasCondition(combatant.conditions, effect.condition)) ||
      effect.kind === "spellTurnStartDamageAndSave",
  );
}

type SpellTurnStartDamageEffect =
  | (Extract<BattleActiveEffect, { readonly kind: "spellCondition" }> & {
      readonly turnStartDamage: SpellTurnStartDamage;
    })
  | Extract<
      BattleActiveEffect,
      { readonly kind: "spellTurnStartDamageAndSave" }
    >;

export function spellTurnEndDamageEffects(
  combatant: BattleCreatureState | undefined,
  actorId: CombatantId,
  round: RoundType,
): readonly SpellTurnEndDamageEffect[] {
  /* v8 ignore start -- Defensive inconsistent-state guard: the dispatcher rejects a missing current actor before turn-end damage discovery. */
  if (combatant === undefined) {
    return [];
  }
  /* v8 ignore stop */
  return combatant.activeEffects.filter(
    (effect): effect is SpellTurnEndDamageEffect =>
      effect.kind === "spellTurnEndDamage" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === round,
  );
}

type SpellTurnEndDamageEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellTurnEndDamage" }
>;

export function spellTurnEndDamageRollHole(
  targetId: CombatantId,
  effect: SpellTurnEndDamageEffect,
): BattleSpellTurnEndDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:spell-turn-end-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell turn-end damage (${expr})`,
    spellTurnEndDamage: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      damage: effect.damage,
    },
  };
}

function spellTurnEndDamageRollFor(
  fills: readonly BattleFill[],
  hole: BattleSpellTurnEndDamageRollHole,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === hole.holeId,
  );
}

function spellTurnEndDamageAmount(
  state: BattleState,
  target: BattleCreatureState,
  effect: SpellTurnEndDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  return damageAmountAfterTargetAdjustments(
    state,
    target,
    rolledDiceTotal(roll.value) + (effect.damage.expr.flat ?? 0),
    effect.damage.damageType,
  );
}

function spellTurnStartDamageForEffect(
  effect: SpellTurnStartDamageEffect,
): SpellTurnStartDamage {
  return effect.kind === "spellCondition"
    ? effect.turnStartDamage
    : effect.damage;
}

function spellTurnStartDamageTrigger(
  effect: SpellTurnStartDamageEffect,
): BattleSpellTurnStartDamageRollHole["spellTurnStartDamage"]["trigger"] {
  if (effect.kind === "spellCondition") {
    return { kind: "condition", condition: effect.condition };
  }
  return {
    kind: "saveToEnd",
    ability: effect.save.ability,
    dc: effect.save.dc,
  };
}

export function spellTurnStartDamageRollHole(
  targetId: CombatantId,
  effect: SpellTurnStartDamageEffect,
): BattleSpellTurnStartDamageRollHole {
  const damage = spellTurnStartDamageForEffect(effect);
  const expr = `${damage.expr.dice}d${damage.expr.dieSize}`;
  const key = `battle:spell-turn-start-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell turn-start damage (${expr})`,
    spellTurnStartDamage: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      trigger: spellTurnStartDamageTrigger(effect),
      damage,
    },
  };
}

function spellTurnStartDamageRollFor(
  fills: readonly BattleFill[],
  hole: BattleSpellTurnStartDamageRollHole,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === hole.holeId,
  );
}

function spellTurnStartDamageAmount(
  state: BattleState,
  target: BattleCreatureState,
  effect: SpellTurnStartDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const damage = spellTurnStartDamageForEffect(effect);
  return damageAmountAfterTargetAdjustments(
    state,
    target,
    rolledDiceTotal(roll.value) + (damage.expr.flat ?? 0),
    damage.damageType,
  );
}

function applySpellTurnStartDamage(
  state: BattleState,
  targetId: CombatantId,
  effect: SpellTurnStartDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined,
  wardingBondDamageShareConcentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  damageDisposition: ReturnType<typeof damageDispositionForTarget>,
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return applyPreparedSlotSpellDamage(
    state,
    targetId,
    spellTurnStartDamageAmount(state, target, effect, roll),
    {
      concentrationSavingThrow,
      wardingBondDamageShareConcentrationSavingThrows,
      damageDisposition,
      hideousLaughterDamageRepeatSaves,
      damageSourceId: effect.sourceCombatantId,
      spatialFacts: [],
    },
  );
}

function spellTurnStartSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSpellTurnStartSavingThrowOutcomeHole {
  const key = spellTurnStartSavingThrowOutcomeHoleKey(targetId, effect);
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Turn-start ${effect.save.ability.toUpperCase()} save`,
    spellTurnStartSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: [],
    targetFlatBonuses,
  };
}

function spellTurnStartSavingThrowOutcomeHoleKey(
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): string {
  return `battle:spell-turn-start-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}`;
}

export function spellTurnStartSavingThrowOutcomeHoleId(
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): BattleHoleId {
  return holeId(spellTurnStartSavingThrowOutcomeHoleKey(targetId, effect));
}

function spellTurnStartSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellTurnStartSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateSpellTurnStartSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a turn-start spell save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Turn-start spell Saving Throw outcome must not include area facts.";
  }
  /* v8 ignore stop */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- Malformed fill: the discovered turn-start spell save hole names exactly the combatant whose turn is starting. */
  return "Turn-start spell Saving Throw outcome must match the starting-turn target.";
}

type SleepPendingRepeatSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleepPendingRepeatSave" }
>;

type SpellConditionEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionEndTurnSave" }
>;

type SpellConditionCountedEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionCountedEndTurnSave" }
>;

type UnitFeatureConditionEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "unitFeatureConditionEndTurnSave" }
>;

type AbilityD20TestRollModeEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "abilityD20TestRollModeEndTurnSave" }
>;

type DurationActiveEffect = Extract<
  Exclude<
    BattleActiveEffect,
    | Extract<BattleActiveEffect, { readonly kind: "sleepPendingRepeatSave" }>
    | Extract<BattleActiveEffect, { readonly kind: "sleepUnconscious" }>
    | Extract<BattleActiveEffect, { readonly kind: "spellDashBonusAction" }>
    | Extract<BattleActiveEffect, { readonly kind: "commandPending" }>
  >,
  { readonly expiresAt: BattleActiveEffectExpiration }
> & {
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "duration" }
  >;
};

function sleepPendingRepeatSaveEffects(
  combatant: BattleCreatureState | undefined,
  actorId: CombatantId,
  round: RoundType,
): readonly SleepPendingRepeatSaveEffect[] {
  if (combatant === undefined) {
    return [];
  }
  return combatant.activeEffects.filter(
    (effect): effect is SleepPendingRepeatSaveEffect =>
      effect.kind === "sleepPendingRepeatSave" &&
      effect.repeatAt.combatantId === actorId &&
      effect.repeatAt.round === round,
  );
}

function sleepRepeatSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SleepPendingRepeatSaveEffect,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSleepRepeatSavingThrowOutcomeHole {
  const key = `battle:sleep-repeat-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Repeat WIS save",
    sleepRepeatSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: [],
    targetFlatBonuses,
  };
}

function sleepRepeatSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSleepRepeatSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function endTurnSavingThrowFlatBonuses(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
): readonly BattleSavingThrowFlatBonusProjection[] {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? []
    : savingThrowFlatBonusProjections(state, ability).filter(
        (projection) => projection.targetId === actorId,
      );
}

export function sleepRepeatSaveSavingThrowHoleIds(
  state: BattleState,
  actorId: CombatantId,
): ReadonlySet<BattleHoleId> {
  const actor = state.combatants.get(actorId);
  return new Set(
    [
      ...sleepPendingRepeatSaveEffects(
        actor,
        actorId,
        state.initiative.round,
      ).map((effect) =>
        sleepRepeatSavingThrowOutcomeHole(
          actorId,
          effect,
          endTurnSavingThrowFlatBonuses(state, actorId, effect.save.ability),
        ),
      ),
    ].map((hole) => hole.holeId),
  );
}

export function conditionSpellEndTurnRepeatSaveHoleIds(
  state: BattleState,
  actorId: CombatantId,
): ReadonlySet<BattleHoleId> {
  const actor = state.combatants.get(actorId);
  return new Set(
    [
      ...hideousLaughterEffects(actor).map((effect) =>
        hideousLaughterRepeatSavingThrowOutcomeHole(
          actorId,
          effect,
          "endTurn",
          undefined,
          endTurnSavingThrowFlatBonuses(state, actorId, effect.save.ability),
        ),
      ),
      ...spellConditionEndTurnSaveEffects(actor).map((effect) =>
        spellConditionEndTurnSavingThrowOutcomeHole(
          actorId,
          effect,
          state,
          endTurnSavingThrowFlatBonuses(state, actorId, effect.save.ability),
        ),
      ),
      ...spellConditionCountedEndTurnSaveEffects(actor).map((effect) =>
        spellConditionCountedEndTurnSavingThrowOutcomeHole(
          actorId,
          effect,
          state,
          endTurnSavingThrowFlatBonuses(state, actorId, effect.save.ability),
        ),
      ),
    ].map((hole) => hole.holeId),
  );
}

function spellConditionEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellConditionEndTurnSaveEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SpellConditionEndTurnSaveEffect =>
          effect.kind === "spellConditionEndTurnSave",
      );
}

function spellConditionCountedEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellConditionCountedEndTurnSaveEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SpellConditionCountedEndTurnSaveEffect =>
          effect.kind === "spellConditionCountedEndTurnSave" &&
          !effect.lockedIn,
      );
}

function spellConditionEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SpellConditionEndTurnSaveEffect,
  state?: BattleState,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSpellConditionEndTurnSavingThrowOutcomeHole {
  const key = [
    "battle:spell-condition-end-turn-save",
    targetId,
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
    effect.condition,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.condition} end-turn save`,
    spellConditionEndTurnSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      condition: effect.condition,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      state === undefined
        ? []
        : savingThrowRollModeProjections(
            state,
            effect.save.ability,
            {
              condition: effect.condition,
            },
            spellConditionEndTurnSaveHeightenedRollModeProjection(
              effect,
              targetId,
            ),
          ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses,
  };
}

function spellConditionEndTurnSaveHeightenedRollModeProjection(
  effect: SpellConditionEndTurnSaveEffect,
  targetId: CombatantId,
): BattleSavingThrowRollModeProjection | undefined {
  return effect.heightenedSpellTargetDisadvantage === null
    ? undefined
    : { targetId, rollMode: "disadvantage" };
}

function spellConditionEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellConditionEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function spellConditionCountedEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SpellConditionCountedEndTurnSaveEffect,
  state?: BattleState,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole {
  const key = [
    "battle:spell-condition-counted-end-turn-save",
    targetId,
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
    effect.condition,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.condition} counted end-turn save`,
    spellConditionCountedEndTurnSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      condition: effect.condition,
      save: effect.save,
      successes: effect.successes,
      failures: effect.failures,
      successThreshold: effect.successThreshold,
      failureThreshold: effect.failureThreshold,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      state === undefined
        ? []
        : savingThrowRollModeProjections(state, effect.save.ability).filter(
            (projection) => projection.targetId === targetId,
          ),
    targetFlatBonuses,
  };
}

function spellConditionCountedEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function unitFeatureConditionEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly UnitFeatureConditionEndTurnSaveEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is UnitFeatureConditionEndTurnSaveEffect =>
          effect.kind === "unitFeatureConditionEndTurnSave",
      );
}

function unitFeatureConditionEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: UnitFeatureConditionEndTurnSaveEffect,
  state?: BattleState,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole {
  const key =
    UNIT_FEATURE_CONDITION_END_TURN_SAVE_HOLE_KEY_PREFIX +
    [
      targetId,
      effect.sourceCombatantId,
      effect.sourceProcedureRef,
      effect.condition,
    ]
      .map(String)
      .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.condition} end-turn save`,
    unitFeatureConditionEndTurnSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      condition: effect.condition,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      state === undefined
        ? []
        : savingThrowRollModeProjections(state, effect.save.ability, {
            condition: effect.condition,
          }).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses,
  };
}

function unitFeatureConditionEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function slowActivePenaltiesEffects(
  combatant: BattleCreatureState | undefined,
): readonly SlowActivePenaltiesEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SlowActivePenaltiesEffect =>
          effect.kind === "slowActivePenalties",
      );
}

function slowActivePenaltiesEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SlowActivePenaltiesEffect,
  state?: BattleState,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole {
  const key = [
    "battle:slow-active-penalties-end-turn-save",
    targetId,
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "End-turn WIS save",
    slowActivePenaltiesEndTurnSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      state === undefined
        ? []
        : savingThrowRollModeProjections(state, effect.save.ability).filter(
            (projection) => projection.targetId === targetId,
          ),
    targetFlatBonuses,
  };
}

function slowActivePenaltiesEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function abilityD20TestRollModeEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly AbilityD20TestRollModeEndTurnSaveEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is AbilityD20TestRollModeEndTurnSaveEffect =>
          effect.kind === "abilityD20TestRollModeEndTurnSave",
      );
}

function abilityD20TestRollModeEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: AbilityD20TestRollModeEndTurnSaveEffect,
  state?: BattleState,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole {
  const key = [
    "battle:ability-d20-test-end-turn-save",
    targetId,
    effect.sourceCombatantId,
    effect.sourceProcedureRef,
    effect.ability,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.ability.toUpperCase()} D20 Test end-turn save`,
    abilityD20TestRollModeEndTurnSave: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      affectedAbility: effect.ability,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes:
      state === undefined
        ? []
        : savingThrowRollModeProjections(state, effect.save.ability).filter(
            (projection) => projection.targetId === targetId,
          ),
    targetFlatBonuses,
  };
}

function abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function hideousLaughterRepeatSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleHideousLaughterRepeatSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateSleepRepeatSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Sleep repeat-save hole is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Sleep repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleep repeat Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop */
}

function validateSpellConditionEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a spell-condition end-turn save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Spell condition end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Spell condition end-turn Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop */
}

function validateSlowActivePenaltiesEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Slow end-turn save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Slow end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Slow end-turn Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop */
}

export type SleetStormAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleetStormAreaHazard" }
>;

export type InsectPlagueAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "insectPlagueAreaHazard" }
>;

export type CloudkillAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "cloudkillAreaHazard" }
>;

export type SlowActivePenaltiesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
>;

export function commandPendingEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "commandGrovel"
        | "commandDrop"
        | "commandApproach"
        | "commandFlee";
    }
  >,
  option: CommandPendingEffect["option"],
): CommandPendingEffect | null {
  return (
    commandPendingEffectsForActor(state, subject.actorId).find(
      (effect) =>
        effect.option === option &&
        spellActiveEffectExecutionRef(effect) === subject.effectRef,
    ) ?? null
  );
}

function stateWithoutCommandPendingEffect(
  state: BattleState,
  actorId: CombatantId,
  effect: CommandPendingEffect,
): BattleState {
  const target = state.combatants.get(actorId);
  return target === undefined
    ? state
    : {
        ...state,
        combatants: new Map(state.combatants).set(actorId, {
          ...target,
          activeEffects: target.activeEffects.filter(
            (candidate) => candidate !== effect,
          ),
        }),
      };
}

export function resolveCommandGrovelCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandGrovel";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "grovel",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Grovel subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Grovel is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: the discovered Command Grovel subject exposes only the holes belonging to the delegated End Turn resolution. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Grovel only accepts End Turn fills.",
    );
  }
  /* v8 ignore stop */
  const proned = applyCommandGrovelProneToTarget(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: proned,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

export function resolveCommandDropCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandDrop";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "drop",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Drop subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Drop is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const heldObjectFactFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      fill.kind === "heldObjectFacts",
  );
  /* v8 ignore start -- Malformed fill set: one Command Drop held-object-facts hole cannot be filled more than once. */
  if (heldObjectFactFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts were filled twice.",
    );
  }
  /* v8 ignore stop */
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "heldObjectFacts" && !endTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: Command Drop exposes only its held-object-facts hole and the delegated End Turn holes. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop only accepts held-object facts and End Turn fills.",
    );
  }
  /* v8 ignore stop */

  const canonicalObjectIds = canonicalHeldObjectIdsForActor(
    input.state,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill set: a character actor's admitted loadout is the canonical held-object source, so an external held-object fill would contradict it. */
  if (canonicalObjectIds !== null && heldObjectFactFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop uses canonical character loadout facts for this actor.",
    );
  }
  /* v8 ignore stop */
  const heldObjectFactFill = heldObjectFactFills[0];
  if (canonicalObjectIds === null && heldObjectFactFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      commandDropHeldObjectFactsHole(input.subject),
    ]);
  }
  /* v8 ignore start -- Malformed fill: the supplied held-object facts must answer the exact hole derived from this discovered Command Drop subject. */
  if (
    heldObjectFactFill !== undefined &&
    heldObjectFactFill.holeId !==
      commandDropHeldObjectFactsHoleId(input.subject)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must use the selected Command Drop hole.",
    );
  }
  /* v8 ignore stop */
  const objectIds = canonicalObjectIds ?? heldObjectFactFill?.value.objectIds;
  /* v8 ignore start -- Internal protocol invariant: the preceding needsHoles return guarantees either canonical loadout facts or a supplied held-object fill. */
  if (objectIds === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop requires known held-object facts.",
    );
  }
  /* v8 ignore stop */
  const uniqueObjectIds = new Set(objectIds);
  /* v8 ignore start -- Malformed fill: held-object facts represent a set of object identities and therefore cannot repeat an identity. */
  if (uniqueObjectIds.size !== objectIds.length) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must not duplicate objects.",
    );
  }
  /* v8 ignore stop */

  const withoutPending = stateWithoutCommandPendingEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills.filter((fill) => fill.kind !== "heldObjectFacts"),
  });
  const droppedObjects: readonly BattleDroppedObjectOutcome[] = objectIds.map(
    (objectId) => ({
      kind: "objectDropped",
      actorId: input.subject.actorId,
      objectId,
      source: {
        kind: "spell",
        sourceCombatantId: effect.sourceCombatantId,
        sourceProcedureRef: effect.sourceProcedureRef,
      },
    }),
  );
  if (endTurnResult.tag === "needsHoles") {
    return { ...endTurnResult, state: input.state, subject: input.subject };
  }
  if (endTurnResult.tag === "invalid") {
    return endTurnResult;
  }
  return { ...endTurnResult, droppedObjects };
}

export function resolveCommandApproachCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandApproach";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Approach subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      /* v8 ignore start -- Malformed fill set: a Command Approach subject with no available movement exposes no fill holes, so callers cannot supply fills. */
      if (input.fills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Command Approach cannot apply fills when no movement is available.",
        );
      }
      /* v8 ignore stop */
      const withoutPending = stateWithoutCommandPendingEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      return {
        tag: "resolved",
        state: withoutPending,
        snapshot: snapshotBattle(withoutPending),
      };
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed fill set: Command Approach exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach accepts one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const unsupportedFill = input.fills.find(
    (fill) =>
      fill.kind !== "movement" &&
      !endTurnFillKind(fill.kind) &&
      !spikeGrowthMovementEffectFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: Command Approach exposes only Movement, Spike Growth damage, and delegated End Turn holes. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach only accepts Movement, Spike Growth damage, and End Turn fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for Command Approach. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Approach hole.",
    );
  }
  /* v8 ignore stop */
  const approachFact = movementFill.value.commandApproach;
  /* v8 ignore start -- Malformed fill: a Command Approach Movement value must carry the route/proximity facts required by that command. */
  if (approachFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach requires caller-supplied shortest/direct route and proximity facts.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandApproach: approachFact,
    },
  );
  /* v8 ignore start -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or Command Approach constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandApproachMovement",
          subject: input.subject,
          movement: movement.movement,
          movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
          endTurnFills: extraFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandApproachAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
    endTurnFills: extraFills,
  });
}

export function resolveCommandApproachAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandApproach" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly movedWithinFiveFeetOfCaster: boolean;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- Malformed continuation: an interrupted Command Approach continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  if (!input.movedWithinFiveFeetOfCaster) {
    /* v8 ignore start -- Malformed continuation fills: Command Approach delegates End Turn holes only when the admitted route reached within five feet of the caster. */
    if (movementEffects.remainingFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Command Approach did not end the turn, so End Turn fills do not apply.",
      );
    }
    /* v8 ignore stop */
    return {
      tag: "resolved",
      state: withoutPending,
      snapshot: snapshotBattle(withoutPending),
    };
  }
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: movementEffects.remainingFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

export function resolveCommandFleeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandFlee";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Flee subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  const unsupportedFill = input.fills.find(
    (fill) =>
      fill.kind !== "movement" &&
      !endTurnFillKind(fill.kind) &&
      !spikeGrowthMovementEffectFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: Command Flee exposes only Movement, Spike Growth damage, and delegated End Turn holes. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee only accepts Movement, Spike Growth damage, and End Turn fills.",
    );
  }
  /* v8 ignore stop */
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      const withoutPending = stateWithoutCommandPendingEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      const endTurnResult = resolveEndTurnCommand({
        state: withoutPending,
        subject: {
          tag: "runtimeCommand",
          actorId: input.subject.actorId,
          command: "endTurn",
        },
        fills: input.fills,
      });
      return endTurnResult.tag === "needsHoles"
        ? { ...endTurnResult, state: input.state, subject: input.subject }
        : endTurnResult;
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed fill set: Command Flee exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee accepts one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for Command Flee. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Flee hole.",
    );
  }
  /* v8 ignore stop */
  const fleeFact = movementFill.value.commandFlee;
  /* v8 ignore start -- Malformed fill: a Command Flee Movement value must carry the fastest-available moving-away route facts required by that command. */
  if (fleeFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee requires caller-supplied fastest-available moving-away route facts.",
    );
  }
  /* v8 ignore stop */
  const movementBudgetFeet = battleMovementBudgetForActor(
    input.state,
    input.subject.actorId,
    movementFill.value.speedKind,
  ).remainingFeet;
  /* v8 ignore start -- Malformed fill: Command Flee requires the route to consume the selected remaining Movement budget exactly. */
  if (movementFill.value.movementCostFeet !== movementBudgetFeet) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee must spend the selected remaining Movement budget.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandFlee: fleeFact,
    },
  );
  /* v8 ignore start -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or Command Flee constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandFleeMovement",
          subject: input.subject,
          movement: movement.movement,
          endTurnFills: extraFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandFleeAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    endTurnFills: extraFills,
  });
}

export function resolveCommandFleeAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- Malformed continuation: an interrupted Command Flee continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: movementEffects.remainingFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

function greaseGroundHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >,
): GreaseGroundHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is GreaseGroundHazardEffect =>
      effect.kind === "greaseGroundHazard",
  );
}

function activeEffectForArea<
  TEffect extends BattleActiveEffect & { readonly areaId: BattleAreaId },
>(
  state: BattleState,
  areaId: BattleAreaId | string,
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
): TEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is TEffect =>
        isExpectedEffect(candidate) && candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
}

function greaseGroundHazardSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleGreaseGroundHazardSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateGreaseGroundHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Grease entry save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Grease ground-hazard Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Grease ground-hazard Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

export function resolveGreaseGroundHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  if (input.subject.trigger === "endsTurnInArea") {
    return resolveGreaseGroundHazardEndTurnSaveCommand(input);
  }
  return resolveGreaseGroundHazardEntrySaveCommand(input);
}

function resolveGreaseGroundHazardEntrySaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Grease hazard subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grease ground-hazard save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const savingThrowFill = greaseGroundHazardSavingThrowOutcomeFor(
    input.fills.filter(
      (
        fill,
      ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
        fill.kind === "savingThrowOutcome",
    ),
    hole,
  );
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Grease save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function webRestraintHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "webRestraintSave"
        | "webRestrainedNoLongerInArea"
        | "webAreaRemoved";
    }
  >,
): WebRestraintHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is WebRestraintHazardEffect =>
      effect.kind === "webRestraintHazard",
  );
}

function validateWebRestraintSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Web restraint save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Web Restraint Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Web Restraint Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function webRestraintSaveAlreadyResolved(
  effect: WebRestraintHazardEffect,
  targetId: CombatantId,
  trigger: BattleWebRestraintTrigger,
): boolean {
  return trigger === "entersArea"
    ? effect.entrySavedThisTurn.includes(targetId)
    : effect.startTurnSavedThisTurn.includes(targetId);
}

export function resolveWebRestraintSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webRestraintSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Web restraint subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint save is no longer available.",
    );
  }
  if (
    webRestraintSaveAlreadyResolved(
      effect,
      input.subject.actorId,
      input.subject.trigger,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint save was already resolved for this target this turn.",
    );
  }
  const hole = webRestraintSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this Web restraint subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const validation = validateWebRestraintSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Web save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const marked = markWebSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const nextEffect = webRestraintHazardEffectFor(marked, input.subject);
  const nextState =
    !outcome.succeeded && nextEffect !== undefined
      ? applyWebRestrainedCondition(marked, input.subject.actorId, nextEffect)
      : marked;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function sleetStormAreaHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "sleetStormAreaHazardSave";
    }
  >,
): SleetStormAreaHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaMembershipTrigger.areaId,
    (effect): effect is SleetStormAreaHazardEffect =>
      effect.kind === "sleetStormAreaHazard",
  );
}

const bySleetStormAreaMembershipTriggerKind = Match.discriminator("kind");

function sleetStormAreaHazardTriggerFromMembershipFact(
  trigger: BattleSleetStormAreaMembershipTrigger,
): BattleSleetStormAreaHazardTrigger {
  return Match.value(trigger).pipe(
    bySleetStormAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    bySleetStormAreaMembershipTriggerKind(
      "turnStartInArea",
      () => "startsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function sleetStormAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: SleetStormAreaHazardEffect,
  trigger: BattleSleetStormAreaHazardTrigger,
): BattleSleetStormAreaHazardSavingThrowOutcomeHole {
  const key = `battle:sleet-storm-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    sleetStormAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function validateSleetStormAreaHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Sleet Storm membership save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Sleet Storm Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleet Storm Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function sleetStormAreaHazardSaveAlreadyResolved(
  effect: SleetStormAreaHazardEffect,
  targetId: CombatantId,
): boolean {
  return effect.savedThisTurn.includes(targetId);
}

export function resolveSleetStormAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "sleetStormAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Sleet Storm subject exposes at most its one Saving Throw outcome hole. */
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save accepts exactly one Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const effect = sleetStormAreaHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleet Storm save is no longer available.",
    );
  }
  const trigger = sleetStormAreaHazardTriggerFromMembershipFact(
    input.subject.areaMembershipTrigger,
  );
  if (sleetStormAreaHazardSaveAlreadyResolved(effect, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleet Storm save was already resolved for this target this turn.",
    );
  }
  const hole = sleetStormAreaHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    trigger,
  );
  const [savingThrowFill] = input.fills;
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  /* v8 ignore start -- Internal protocol invariant: the fill-kind gate above leaves only a Saving Throw outcome when the optional first fill is present. */
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save requires a Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fill: the supplied Saving Throw outcome must answer the exact hole derived from this Sleet Storm subject. */
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleet Storm save requires the matching Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const validation = validateSleetStormAreaHazardSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Sleet Storm save outcome must answer the discovered single-target hole for the triggering actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const marked = markSleetStormAreaHazardSavedThisTurn(
    input.state,
    input.subject.actorId,
    effect,
  );
  const nextState = outcome.succeeded
    ? marked
    : applySleetStormAreaHazardFailedSaveEffect(marked, input.subject.actorId);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function insectPlagueAreaHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "insectPlagueAreaHazardSave";
    }
  >,
): InsectPlagueAreaHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaMembershipTrigger.areaId,
    (effect): effect is InsectPlagueAreaHazardEffect =>
      effect.kind === "insectPlagueAreaHazard",
  );
}

const byInsectPlagueAreaMembershipTriggerKind = Match.discriminator("kind");

function insectPlagueAreaHazardTriggerFromMembershipFact(
  trigger: BattleInsectPlagueAreaMembershipTrigger,
): BattleInsectPlagueAreaHazardTrigger {
  return Match.value(trigger).pipe(
    byInsectPlagueAreaMembershipTriggerKind(
      "appearsInArea",
      () => "appearsInArea" as const,
    ),
    byInsectPlagueAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byInsectPlagueAreaMembershipTriggerKind(
      "turnEndInArea",
      () => "endsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function insectPlagueAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardSavingThrowOutcomeHole {
  const key = `battle:insect-plague-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${insectPlagueAreaHazardTriggerLabel(trigger)} CON save`,
    insectPlagueAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function insectPlagueAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:insect-plague-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${insectPlagueAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    insectPlagueAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function insectPlagueAreaHazardTriggerLabel(
  trigger: BattleInsectPlagueAreaHazardTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance"),
    Match.when("entersArea", () => "entry"),
    Match.when("endsTurnInArea", () => "end-turn"),
    Match.exhaustive,
  );
}

function validateInsectPlagueAreaHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: an Insect Plague membership save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Insect Plague Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Insect Plague Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function validateInsectPlagueAreaHazardDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleInsectPlagueAreaHazardDamageRollHole,
): string | null {
  return validateRolledDiceFillForDiceExpr(
    fill,
    hole.insectPlagueAreaHazard.damage.expr,
  );
}

function insectPlagueAreaHazardSaveAlreadyResolved(
  effect: InsectPlagueAreaHazardEffect,
  targetId: CombatantId,
): boolean {
  return effect.savedThisTurn.includes(targetId);
}

type PersistentAreaHazardDamageEffect =
  | InsectPlagueAreaHazardEffect
  | CloudkillAreaHazardEffect;

function persistentAreaHazardAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: PersistentAreaHazardDamageEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    applySaveDamageResult(rolledDamage, input.saveSucceeded ? "half" : "full"),
    input.effect.damage.damageType,
  );
}

function applyPersistentAreaHazardDamage(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: PersistentAreaHazardDamageEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  return applyPreparedSlotSpellDamage(
    input.state,
    input.targetId,
    persistentAreaHazardAdjustedDamage({
      state: input.state,
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      ...(input.concentrationSavingThrow === undefined
        ? {}
        : { concentrationSavingThrow: input.concentrationSavingThrow }),
      spatialFacts: [],
    },
  );
}

export function resolveInsectPlagueAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "insectPlagueAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Insect Plague subject exposes only its save, damage, and possible Concentration holes. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Insect Plague save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = insectPlagueAreaHazardEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent hazard target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Insect Plague save is no longer available.",
    );
  }
  const trigger = insectPlagueAreaHazardTriggerFromMembershipFact(
    input.subject.areaMembershipTrigger,
  );
  if (
    trigger !== "appearsInArea" &&
    insectPlagueAreaHazardSaveAlreadyResolved(effect, input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Insect Plague save was already resolved for this target this turn.",
    );
  }
  const saveHole = insectPlagueAreaHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    trigger,
  );
  const damageHole = insectPlagueAreaHazardDamageRollHole(
    input.subject.actorId,
    effect,
    trigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- Malformed fill set: each Insect Plague save and damage hole can be answered only once. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Insect Plague save received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateInsectPlagueAreaHazardSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Insect Plague save outcome must answer the discovered single-target hole for the triggering actor. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateInsectPlagueAreaHazardDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- Malformed fill: the Insect Plague damage roll must match the exact dice expression carried by its discovered damage hole. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = persistentAreaHazardAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- Malformed fill set: a damaged concentrating target exposes at most one Concentration save hole. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Insect Plague save received duplicate Concentration save fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  const consumedHoleIds = new Set([
    saveHole.holeId,
    damageHole.holeId,
    ...(concentrationHole === null ? [] : [concentrationHole.holeId]),
  ]);
  /* v8 ignore start -- Malformed fill set: every supplied Insect Plague fill must answer one of the holes derived for this exact replay subject. */
  if (input.fills.some((fill) => !consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Insect Plague save received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  const afterDamage = applyPersistentAreaHazardDamage({
    state: input.state,
    targetId: input.subject.actorId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    ...(concentrationFill === undefined
      ? {}
      : { concentrationSavingThrow: concentrationFill }),
  });
  const afterMark =
    trigger === "appearsInArea"
      ? afterDamage
      : markInsectPlagueAreaHazardSavedThisTurn(
          afterDamage,
          input.subject.actorId,
          effect,
        );
  return {
    tag: "resolved",
    state: afterMark,
    snapshot: snapshotBattle(afterMark),
  };
}

function cloudkillAreaHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "cloudkillAreaHazardSave";
    }
  >,
): CloudkillAreaHazardEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaMembershipTrigger.areaId,
    (effect): effect is CloudkillAreaHazardEffect =>
      effect.kind === "cloudkillAreaHazard",
  );
}

const byCloudkillAreaMembershipTriggerKind = Match.discriminator("kind");

function cloudkillAreaHazardTriggerFromMembershipFact(
  trigger: BattleCloudkillAreaMembershipTrigger,
): BattleCloudkillAreaHazardTrigger {
  return Match.value(trigger).pipe(
    byCloudkillAreaMembershipTriggerKind(
      "appearsInArea",
      () => "appearsInArea" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "areaMovesIntoSpace",
      () => "movesIntoSpace" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "turnEndInArea",
      () => "endsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function cloudkillAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardSavingThrowOutcomeHole {
  const key = `battle:cloudkill-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${cloudkillAreaHazardTriggerLabel(trigger)} CON save`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function cloudkillAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:cloudkill-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${cloudkillAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function cloudkillAreaHazardTriggerLabel(
  trigger: BattleCloudkillAreaHazardTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance"),
    Match.when("movesIntoSpace", () => "cloud-movement"),
    Match.when("entersArea", () => "entry"),
    Match.when("endsTurnInArea", () => "end-turn"),
    Match.exhaustive,
  );
}

function validateCloudkillAreaHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Cloudkill membership save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Cloudkill Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Cloudkill Saving Throw outcome must match the triggering target.";
  /* v8 ignore stop */
}

function validateCloudkillAreaHazardDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleCloudkillAreaHazardDamageRollHole,
): string | null {
  return validateRolledDiceFillForDiceExpr(
    fill,
    hole.cloudkillAreaHazard.damage.expr,
  );
}

function cloudkillAreaHazardSaveAlreadyResolved(
  effect: CloudkillAreaHazardEffect,
  targetId: CombatantId,
): boolean {
  return effect.savedThisTurn.includes(targetId);
}

export function resolveCloudkillAreaHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "cloudkillAreaHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: the discovered Cloudkill subject exposes only its save, damage, and possible Concentration holes. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = cloudkillAreaHazardEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent hazard target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Cloudkill save is no longer available.",
    );
  }
  const trigger = cloudkillAreaHazardTriggerFromMembershipFact(
    input.subject.areaMembershipTrigger,
  );
  if (
    trigger !== "appearsInArea" &&
    cloudkillAreaHazardSaveAlreadyResolved(effect, input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Cloudkill save was already resolved for this target this turn.",
    );
  }
  const saveHole = cloudkillAreaHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    trigger,
  );
  const damageHole = cloudkillAreaHazardDamageRollHole(
    input.subject.actorId,
    effect,
    trigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- Malformed fill set: each Cloudkill save and damage hole can be answered only once. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill save received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateCloudkillAreaHazardSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the Cloudkill save outcome must answer the discovered single-target hole for the triggering actor. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateCloudkillAreaHazardDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- Malformed fill: the Cloudkill damage roll must match the exact dice expression carried by its discovered damage hole. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = persistentAreaHazardAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- Malformed fill set: a damaged concentrating target exposes at most one Concentration save hole. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill save received duplicate Concentration save fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  const consumedHoleIds = new Set([
    saveHole.holeId,
    damageHole.holeId,
    ...(concentrationHole === null ? [] : [concentrationHole.holeId]),
  ]);
  /* v8 ignore start -- Malformed fill set: every supplied Cloudkill fill must answer one of the holes derived for this exact replay subject. */
  if (input.fills.some((fill) => !consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill save received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  const afterDamage = applyPersistentAreaHazardDamage({
    state: input.state,
    targetId: input.subject.actorId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    ...(concentrationFill === undefined
      ? {}
      : { concentrationSavingThrow: concentrationFill }),
  });
  const afterMark =
    trigger === "appearsInArea"
      ? afterDamage
      : markCloudkillAreaHazardSavedThisTurn(
          afterDamage,
          input.subject.actorId,
          effect,
        );
  return {
    tag: "resolved",
    state: afterMark,
    snapshot: snapshotBattle(afterMark),
  };
}

export function resolveWebRestrainedNoLongerInAreaCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webRestrainedNoLongerInArea";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: Web no-longer-in-area cleanup is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web no-longer-in-area cleanup uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint cleanup is no longer available.",
    );
  }
  const nextState = removeWebRestrainedCondition({
    state: input.state,
    targetId: input.subject.actorId,
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
  });
  return nextState === input.state
    ? invalidResult(
        input.state,
        "staleSubject",
        "Web Restraint cleanup is no longer available.",
      )
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

export function resolveWebAreaRemovedCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "webAreaRemoved";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed fill set: Web area removal is a discovered no-input transition and exposes no holes. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web area removal uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web area is no longer active.",
    );
  }
  const nextState = breakBattleConcentration(
    input.state,
    effect.sourceCombatantId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveGreaseGroundHazardEndTurnSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGreaseFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- Malformed fill set: the end-turn Grease save hole can be answered only once. */
  if (matchingGreaseFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease received duplicate Grease Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const [matchingGreaseFill] = matchingGreaseFills;
  /* v8 ignore start -- Malformed fill: the value answering the Grease save hole must be a Saving Throw outcome. */
  if (
    matchingGreaseFill !== undefined &&
    matchingGreaseFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease requires a Grease Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  if (matchingGreaseFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          hole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    matchingGreaseFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill: the end-turn Grease save outcome must answer the discovered single-target hole for the ending actor. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const outcome = matchingGreaseFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  const endTurnResult = resolveEndTurnCommand({
    state: nextState,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

function gustOfWindLineEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "gustOfWindLineSave" | "gustOfWindLineDirectionChange";
    }
  >,
): GustOfWindLineEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is GustOfWindLineEffect =>
      effect.kind === "gustOfWindLine" &&
      effect.directionId === subject.directionId,
  );
}

function validateGustOfWindLineSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
  effect: GustOfWindLineEffect,
): string | null {
  if (!("area" in value)) {
    return "Gust of Wind Line Saving Throw outcome requires Line area facts.";
  }
  const area: BattleSpellAreaChoice = value.area;
  if (
    area.kind !== "gustOfWindLineArea" ||
    area.areaId !== effect.areaId ||
    area.directionId !== effect.directionId ||
    area.originAnchorId !== effect.sourceCombatantId
  ) {
    return "Gust of Wind Line Saving Throw outcome must match the active Line area.";
  }
  if (
    area.affectedTargetIds.length !== 1 ||
    area.affectedTargetIds[0] !== targetId ||
    value.outcomes.length !== 1 ||
    value.outcomes[0]?.targetId !== targetId
  ) {
    return "Gust of Wind Line Saving Throw outcome must match the ending-turn target.";
  }
  return validateGustOfWindLineAreaPushFacts({
    area,
    failedTargetIds: value.outcomes[0]?.succeeded === true ? [] : [targetId],
    pushDistanceFeet: effect.pushDistanceFeet,
  });
}

export function resolveGustOfWindLineSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "gustOfWindLineSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  const effect = gustOfWindLineEffectFor(input.state, input.subject);
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Gust of Wind Line save is no longer available.",
    );
  }
  const hole = gustOfWindLineSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGustFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingGustFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Gust of Wind received duplicate Gust of Wind Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const [matchingGustFill] = matchingGustFills;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    matchingGustFill !== undefined &&
    matchingGustFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Gust of Wind requires a Gust of Wind Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop */
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  if (matchingGustFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          hole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateGustOfWindLineSavingThrowOutcome(
    matchingGustFill.value,
    input.subject.actorId,
    effect,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const outcome = matchingGustFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const endTurnResult = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

export function resolveGustOfWindLineDirectionChangeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "gustOfWindLineDirectionChange";
      }
    >
  >,
): BattleResolutionResult {
  const effect = gustOfWindLineEffectFor(input.state, input.subject);
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state) ||
    (effect.castTurn.actorId === input.subject.actorId &&
      effect.castTurn.round === input.state.initiative.round) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Gust of Wind Line direction change is no longer available.",
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "gustOfWindLineDirectionChoice")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change accepts only direction-choice fills.",
    );
  }
  /* v8 ignore stop */
  const hole = gustOfWindLineDirectionChoiceHole(effect);
  const directionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "gustOfWindLineDirectionChoice" }
    > => fill.kind === "gustOfWindLineDirectionChoice",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(directionFills, hole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (directionFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const directionFill = directionFills[0];
  if (directionFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: the availability check above and this spend read the same turn resources, with no intervening state transition. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Gust of Wind Line direction change requires an available Bonus Action.",
    );
  }
  const nextState = replaceGustOfWindLineDirection({
    state: {
      ...input.state,
      currentTurnResources: spent.right,
    },
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    areaId: effect.areaId,
    directionId: directionFill.value.directionId,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function flamingSphereEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "movableZoneSave"
        | "movableZoneReposition"
        | "movableZoneRam";
    }
  >,
): FlamingSphereEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is FlamingSphereEffect => effect.kind === "flamingSphere",
  );
}

function flamingSphereDamageRollHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereDamageRollHole {
  const key = `battle:flaming-sphere-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${flamingSphereTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function savingThrowOutcomeFillForHole(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: { readonly holeId: BattleHoleId },
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function rolledDiceFillForHole(
  fills: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  hole: { readonly holeId: BattleHoleId },
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function everyFillUsesHoleId(
  fills: readonly { readonly holeId: BattleHoleId }[],
  expectedHoleId: BattleHoleId,
): boolean {
  return fills.every((fill) => fill.holeId === expectedHoleId);
}

function validateFlamingSphereSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Flaming Sphere ram save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- Malformed fill: the discovered Flaming Sphere ram save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateFlamingSphereDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleFlamingSphereDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone damage must use the selected damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

function validateFlamingSphereRamMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRamMovement" }>,
  hole: BattleFlamingSphereRamMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone ram movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone ram movement distance must be a positive integer.";
  }
  return flamingSphereMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone ram movement distance exceeds the spell's maximum.";
}

function validateFlamingSphereRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return flamingSphereMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : "Movable zone reposition movement distance exceeds the spell's maximum.";
}

function flamingSphereAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = flamingSphereDamageAfterSave({
    rolledDamage,
    savingThrowSucceeded: input.saveSucceeded,
  });
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    saveAdjustedDamage,
    input.effect.damage.damageType,
  );
}

function applyFlamingSphereDamage(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  return applyPreparedSlotSpellDamage(
    input.state,
    input.targetId,
    flamingSphereAdjustedDamage({
      state: input.state,
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
      spatialFacts: [],
    },
  );
}

export function resolveFlamingSphereSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent movable-zone target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  // Dispatcher only routes here when trigger === "endsTurnWithinFiveFeetOfSphere".
  const flamingSphereTrigger = input.subject
    .trigger as BattleFlamingSphereTrigger;
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    flamingSphereTrigger,
  );
  const damageHole = flamingSphereDamageRollHole(
    input.subject.actorId,
    effect,
    flamingSphereTrigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) =>
      fill.holeId !== saveHole.holeId &&
      fill.holeId !== damageHole.holeId &&
      fill.holeId !== concentrationHoleId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          saveHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          damageHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateFlamingSphereDamageRoll(
    damageFill,
    damageHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = flamingSphereAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          concentrationHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const damaged = applyFlamingSphereDamage({
    state: input.state,
    targetId: input.subject.actorId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const endTurnResult = resolveEndTurnCommand({
    state: damaged,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

export function resolveFlamingSphereRepositionCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneReposition";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition is no longer available.",
    );
  }
  if (!canSpendBonusAction(input.state.currentTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop */
  const movementHole = flamingSphereRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Bonus Action.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveFlamingSphereRamCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneRam";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "movableZoneRamMovement" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram accepts only movement, save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.targetId);
  if (
    effect === undefined ||
    target === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram is no longer available.",
    );
  }
  if (!canSpendBonusAction(input.state.currentTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram requires an available Bonus Action.",
    );
  }
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementHole = flamingSphereRamMovementHole(
    input.subject.targetId,
    effect,
  );
  const damageHole = flamingSphereDamageRollHole(
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRamMovement" }
    > => fill.kind === "movableZoneRamMovement",
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice",
  );
  const concentrationFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !everyFillUsesHoleId(movementFills, movementHole.holeId) ||
    !everyFillUsesHoleId(saveFills, saveHole.holeId) ||
    !everyFillUsesHoleId(damageFills, damageHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    movementFills.length > 1 ||
    saveFills.length > 1 ||
    damageFills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRamMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.targetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (concentrationFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Movable zone ram received a fill for an unrelated hole.",
      );
    }
    /* v8 ignore stop */
  } else {
    const damageValidation = validateFlamingSphereDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop */
  }
  const concentrationHole =
    damageFill === undefined
      ? null
      : concentrationSavingThrowHole(
          target,
          flamingSphereAdjustedDamage({
            state: input.state,
            target,
            effect,
            damageFill,
            saveSucceeded: saveOutcome.succeeded,
          }),
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    concentrationHole === null
      ? concentrationFills.length > 0
      : !everyFillUsesHoleId(concentrationFills, concentrationHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.targetId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (damageFill === undefined) {
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  const damaged = applyFlamingSphereDamage({
    state: input.state,
    targetId: input.subject.targetId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const spent = spendActivationResource(damaged.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: admission proves the Bonus Action, and synchronous Flaming Sphere damage preserves current turn resources before this spend. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram requires an available Bonus Action.",
    );
  }
  /* v8 ignore stop */
  const nextState = {
    ...damaged,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function moonbeamEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "movableZoneSave"
        | "movableZoneReposition"
        | "moonbeamCylinderExit";
    }
  >,
): MoonbeamEffect | undefined {
  return activeEffectForArea(
    state,
    subject.areaId,
    (effect): effect is MoonbeamEffect => effect.kind === "moonbeam",
  );
}

function moonbeamDamageRollHole(
  targetId: CombatantId,
  effect: MoonbeamEffect,
  trigger: BattleMoonbeamSaveTrigger,
): BattleMoonbeamDamageRollHole {
  const key = `battle:moonbeam-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${moonbeamTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function validateMoonbeamSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- Malformed fill: a Moonbeam membership save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  /* v8 ignore stop */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- Malformed fill: the discovered Moonbeam save hole names exactly its triggering target. */
  return "Movable zone saving throw outcome must match the triggering target.";
}

function validateMoonbeamDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleMoonbeamDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone save damage must use the selected damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(fill, hole.movableZone.damage.expr);
}

function validateMoonbeamRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected movement hole.";
  }
  if (!Number.isInteger(fill.value.moveFeet)) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return moonbeamMoveDistanceAccepted({
    moveFeet: Number(fill.value.moveFeet),
    maxMoveFeet: Number(hole.movableZone.maxMoveFeet),
  })
    ? null
    : Number(fill.value.moveFeet) > 0
      ? "Movable zone reposition movement distance exceeds the spell's maximum."
      : "Movable zone reposition movement distance must be a positive integer.";
}

function moonbeamAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: MoonbeamEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    moonbeamDamageAfterSave({
      rolledDamage,
      savingThrowSucceeded: input.saveSucceeded,
    }),
    input.effect.damage.damageType,
  );
}

function applyMoonbeamDamage(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: MoonbeamEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  return applyPreparedSlotSpellDamage(
    input.state,
    input.targetId,
    moonbeamAdjustedDamage({
      state: input.state,
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
      spatialFacts: [],
    },
  );
}

function applyMoonbeamShapeShiftRider(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: MoonbeamEffect;
  readonly saveSucceeded: boolean;
}): BattleState {
  if (input.saveSucceeded) {
    return input.state;
  }
  const reversion = revertShapeShiftedCombatantToTrueForm({
    state: input.state,
    combatantId: input.targetId,
  });
  if (reversion.tag !== "reverted") {
    return reversion.state;
  }
  return addMoonbeamShapeShiftSuppression(
    reversion.state,
    input.targetId,
    input.effect,
  );
}

export function resolveMoonbeamSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneSave";
      }
    >;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save accepts only save, damage, and Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    effect === undefined ||
    /* v8 ignore next -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent movable-zone target before routing this subject here. */
    target === undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone save is no longer available.",
    );
  }
  const isEndTurn = input.subject.trigger === "endsTurnInArea";
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  if (effect.savedThisTurn.includes(input.subject.actorId)) {
    if (isEndTurn) {
      const endTurnResult = resolveEndTurnCommand({
        state: input.state,
        subject: endTurnSubject,
        fills: input.fills,
      });
      return endTurnResult.tag === "needsHoles"
        ? { ...endTurnResult, subject: input.subject }
        : endTurnResult;
    }
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  // Dispatcher only routes here when trigger is a BattleMoonbeamSaveTrigger
  // (not "endsTurnWithinFiveFeetOfSphere" which routes to flamingSphere).
  const moonbeamTrigger = input.subject.trigger as BattleMoonbeamSaveTrigger;
  const saveHole = moonbeamSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    moonbeamTrigger,
  );
  const damageHole = moonbeamDamageRollHole(
    input.subject.actorId,
    effect,
    moonbeamTrigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnFills = isEndTurn
    ? input.fills.filter(
        (fill) =>
          fill.holeId !== saveHole.holeId &&
          fill.holeId !== damageHole.holeId &&
          fill.holeId !== concentrationHoleId,
      )
    : [];
  const endTurnProbe = isEndTurn
    ? resolveEndTurnCommand({
        state: input.state,
        subject: endTurnSubject,
        fills: endTurnFills,
      })
    : null;
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    if (endTurnProbe?.tag === "invalid") {
      return endTurnProbe;
    }
    return needsHolesResult(input.state, input.subject, [
      saveHole,
      ...(endTurnProbe?.tag === "needsHoles" ? endTurnProbe.holes : []),
    ]);
  }
  const saveValidation = validateMoonbeamSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  /* v8 ignore stop */
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    if (endTurnProbe?.tag === "invalid") {
      return endTurnProbe;
    }
    return needsHolesResult(input.state, input.subject, [
      damageHole,
      ...(endTurnProbe?.tag === "needsHoles" ? endTurnProbe.holes : []),
    ]);
  }
  const damageValidation = validateMoonbeamDamageRoll(damageFill, damageHole);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const adjustedDamage = moonbeamAdjustedDamage({
    state: input.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate concentration save fills.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    if (endTurnProbe?.tag === "invalid") {
      return endTurnProbe;
    }
    return needsHolesResult(input.state, input.subject, [
      concentrationHole,
      ...(endTurnProbe?.tag === "needsHoles" ? endTurnProbe.holes : []),
    ]);
  }
  if (endTurnProbe?.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe?.tag === "invalid") {
    return endTurnProbe;
  }
  const afterDamage = applyMoonbeamDamage({
    state: input.state,
    targetId: input.subject.actorId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const afterShapeShiftRider = applyMoonbeamShapeShiftRider({
    state: afterDamage,
    targetId: input.subject.actorId,
    effect,
    saveSucceeded: saveOutcome.succeeded,
  });
  const afterMark = markMoonbeamSavedThisTurn(
    afterShapeShiftRider,
    input.subject.actorId,
    effect,
  );
  if (isEndTurn) {
    const endTurnResult = resolveEndTurnCommand({
      state: afterMark,
      subject: endTurnSubject,
      fills: endTurnFills,
    });
    return endTurnResult.tag === "needsHoles"
      ? { ...endTurnResult, subject: input.subject }
      : endTurnResult;
  }
  return {
    tag: "resolved",
    state: afterMark,
    snapshot: snapshotBattle(afterMark),
  };
}

export function resolveMoonbeamCylinderExitCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "moonbeamCylinderExit";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Moonbeam Cylinder exit cleanup uses no fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !effect.shapeShiftSuppressed.includes(input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Moonbeam shape-shift suppression is no longer active.",
    );
  }
  const nextState = removeMoonbeamShapeShiftSuppression(
    input.state,
    input.subject.actorId,
    effect,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMoonbeamRepositionCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "movableZoneReposition";
      }
    >;
  },
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  /* v8 ignore stop */
  const effect = moonbeamEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== effect.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition is no longer available.",
    );
  }
  const movementHole = moonbeamRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate fills.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateMoonbeamRepositionMovement(
    movementFill,
    movementHole,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  /* v8 ignore stop */
  const spendResult = spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spendResult)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Magic action.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spendResult.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applySleepRepeatSaveFills(
  state: BattleState,
  actorId: CombatantId,
  round: RoundType,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const actor = state.combatants.get(actorId);
  const effects = sleepPendingRepeatSaveEffects(actor, actorId, round);
  if (actor === undefined || effects.length === 0) {
    return state;
  }
  return effects.reduce((nextState, effect) => {
    const nextCombatants = nextState.combatants;
    const target = nextCombatants.get(actorId);
    if (target === undefined) {
      return nextState;
    }
    const hole = sleepRepeatSavingThrowOutcomeHole(actorId, effect);
    const save = sleepRepeatSavingThrowOutcomeFor(saves, hole);
    if (save === undefined) {
      return nextState;
    }
    const activeEffectsWithoutPending = target.activeEffects.filter(
      (candidate) => candidate !== effect,
    );
    const conditionsWithoutPending =
      conditionsAfterExpiringSpellConditionEffects(
        target.conditions,
        activeEffectsWithoutPending,
        [effect],
      );
    const succeeded = save.value.outcomes[0]?.succeeded === true;
    if (succeeded) {
      return {
        ...nextState,
        combatants: new Map(nextCombatants).set(
          actorId,
          battleCreatureWithActiveEffectsAndConditions(
            target,
            activeEffectsWithoutPending,
            conditionsWithoutPending,
          ),
        ),
      };
    }
    const targetWithoutPending: BattleCreatureState =
      target.positiveHpUnconscious === null
        ? {
            ...target,
            activeEffects: activeEffectsWithoutPending,
            conditions: conditionsWithoutPending,
          }
        : {
            ...target,
            activeEffects: activeEffectsWithoutPending,
          };
    const unconsciousEffect: Extract<
      BattleActiveEffect,
      { readonly kind: "sleepUnconscious" }
    > = {
      kind: "sleepUnconscious" as const,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        targetWithoutPending,
        "unconscious",
      ),
      expiresAt: {
        kind: "concentration" as const,
        combatantId: effect.sourceCombatantId,
      },
    };
    const activeEffects = [...activeEffectsWithoutPending, unconsciousEffect];
    const nextMap = new Map(nextCombatants).set(
      actorId,
      battleCreatureWithActiveEffectsAndConditions(
        target,
        activeEffects,
        conditionsAfterApplyingSpellConditionEffects(
          conditionsWithoutPending,
          activeEffects,
        ),
      ),
    );
    const stateWithSleepFailure = {
      ...nextState,
      combatants: nextMap,
    };
    const broken = breakCombatantConcentration(
      stateWithSleepFailure,
      nextMap,
      actorId,
    );
    const brokenState = battleStateWithFlySpeedGrantEndFallCleanupFrames(
      {
        ...stateWithSleepFailure,
        combatants: broken.value,
      },
      broken.flySpeedGrantEndFallCleanupFrames,
    );
    return battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
      brokenState,
      broken.spellEndTargetStatePromotionIds,
    );
  }, state);
}

function applyHideousLaughterRepeatSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = hideousLaughterEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = hideousLaughterRepeatSavingThrowOutcomeHole(
      actorId,
      effect,
      "endTurn",
    );
    const save = hideousLaughterRepeatSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeHideousLaughterEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function applySpellConditionEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = spellConditionEndTurnSaveEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = spellConditionEndTurnSavingThrowOutcomeHole(actorId, effect);
    const save = spellConditionEndTurnSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeSpellConditionEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function applySpellConditionCountedEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = spellConditionCountedEndTurnSaveEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = spellConditionCountedEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
    );
    const save = spellConditionCountedEndTurnSavingThrowOutcomeFor(saves, hole);
    const succeeded = save?.value.outcomes[0]?.succeeded;
    if (succeeded === undefined) {
      return nextCombatants;
    }
    if (succeeded) {
      const successes = effect.successes + 1;
      return successes >= effect.successThreshold
        ? removeSpellConditionEffectFromCombatants(
            nextCombatants,
            actorId,
            effect,
          )
        : updateSpellConditionCountedEndTurnSaveEffect(
            nextCombatants,
            actorId,
            effect,
            { successes },
          );
    }
    const failures = effect.failures + 1;
    return updateSpellConditionCountedEndTurnSaveEffect(
      nextCombatants,
      actorId,
      effect,
      {
        failures,
        lockedIn: failures >= effect.failureThreshold,
      },
    );
  }, combatants);
}

function applyUnitFeatureConditionEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = unitFeatureConditionEndTurnSaveEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = unitFeatureConditionEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
    );
    const save = unitFeatureConditionEndTurnSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeUnitFeatureConditionEndTurnSaveEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function applySlowActivePenaltiesEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = slowActivePenaltiesEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = slowActivePenaltiesEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
    );
    const save = slowActivePenaltiesEndTurnSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeSlowActivePenaltiesEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function applyAbilityD20TestRollModeEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = abilityD20TestRollModeEndTurnSaveEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = abilityD20TestRollModeEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
    );
    const save = abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
      saves,
      hole,
    );
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeAbilityD20TestRollModeEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function removeAbilityD20TestRollModeEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: AbilityD20TestRollModeEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  return combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
    new Map(combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (effect) =>
          effect !== expiringEffect &&
          !(
            effect.kind === "sourceDamageRollPenalty" &&
            effect.sourceProcedureRef === expiringEffect.sourceProcedureRef &&
            effect.sourceCombatantId === expiringEffect.sourceCombatantId
          ),
      ),
    }),
    expiringEffect,
  );
}

function removeSpellConditionEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect:
    | SpellConditionEndTurnSaveEffect
    | SpellConditionCountedEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        }
      : { ...target, activeEffects };
  return combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
    new Map(combatants).set(targetId, nextCombatant),
    expiringEffect,
  );
}

function updateSpellConditionCountedEndTurnSaveEffect(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  effect: SpellConditionCountedEndTurnSaveEffect,
  patch: Partial<
    Pick<
      SpellConditionCountedEndTurnSaveEffect,
      "successes" | "failures" | "lockedIn"
    >
  >,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((candidate) => candidate === effect)
  ) {
    return combatants;
  }
  return new Map(combatants).set(targetId, {
    ...target,
    activeEffects: target.activeEffects.map((candidate) =>
      candidate === effect ? { ...effect, ...patch } : candidate,
    ),
  });
}

function removeUnitFeatureConditionEndTurnSaveEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: UnitFeatureConditionEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        }
      : { ...target, activeEffects };
  return new Map(combatants).set(targetId, nextCombatant);
}

function removeSlowActivePenaltiesEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: SlowActivePenaltiesEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  return combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
    new Map(combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (effect) => effect !== expiringEffect,
      ),
    }),
    expiringEffect,
  );
}

function removeHideousLaughterEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: HideousLaughterEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        }
      : { ...target, activeEffects };
  return combatantsAfterHideousLaughterSpellEndedIfNoEffects(
    new Map(combatants).set(targetId, nextCombatant),
    expiringEffect,
  );
}

function battleCreatureWithActiveEffectsAndConditions(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
  conditions: BattleCreatureState["conditions"],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? { ...combatant, activeEffects, conditions }
    : { ...combatant, activeEffects };
}

function removeSpellTurnStartDamageAndSaveEffect(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (candidate) => candidate !== effect,
      ),
    }),
  };
}

function applyStartTurnSpellDamageFills(
  state: BattleState,
  actorId: CombatantId,
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[],
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const actor = state.combatants.get(actorId);
  const effects = spellTurnStartDamageEffects(actor);
  return effects.reduce((nextState, effect) => {
    const hole = spellTurnStartDamageRollHole(actorId, effect);
    const roll = spellTurnStartDamageRollFor(rolls, hole);
    const target = nextState.combatants.get(actorId);
    if (roll === undefined || target === undefined) {
      return nextState;
    }
    const damageAmount = spellTurnStartDamageAmount(
      nextState,
      target,
      effect,
      roll,
    );
    const concentrationHole = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const concentrationLifecycleFills = fillsMatchingHoleIds(
      concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
      hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    const damaged = applySpellTurnStartDamage(
      nextState,
      actorId,
      effect,
      roll,
      concentrationHole === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationLifecycleFills,
            concentrationHole,
          ),
      concentrationLifecycleFills,
      damageDispositionForTarget(
        startTurnDamageDispositionHoles(nextState, actorId, [{ effect, roll }]),
        damageDispositions,
        actorId,
      ),
      hideousLaughterLifecycleFills,
    );
    if (effect.kind !== "spellTurnStartDamageAndSave") {
      return damaged;
    }
    const saveHole = spellTurnStartSavingThrowOutcomeHole(actorId, effect);
    const save = spellTurnStartSavingThrowOutcomeFor(saves, saveHole);
    const succeeded = save?.value.outcomes[0]?.succeeded === true;
    return succeeded
      ? removeSpellTurnStartDamageAndSaveEffect(damaged, actorId, effect)
      : damaged;
  }, state);
}

function applyEndTurnSpellDamageFills(
  state: BattleState,
  actorId: CombatantId,
  round: RoundType,
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[],
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const actor = state.combatants.get(actorId);
  const effects = spellTurnEndDamageEffects(actor, actorId, round);
  return effects.reduce((nextState, effect) => {
    const hole = spellTurnEndDamageRollHole(actorId, effect);
    const roll = spellTurnEndDamageRollFor(rolls, hole);
    const target = nextState.combatants.get(actorId);
    if (roll === undefined || target === undefined) {
      return nextState;
    }
    const damageAmount = spellTurnEndDamageAmount(
      nextState,
      target,
      effect,
      roll,
    );
    const concentrationHole = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const concentrationLifecycleFills = fillsMatchingHoleIds(
      concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
      hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    return applyPreparedSlotSpellDamage(nextState, actorId, damageAmount, {
      concentrationSavingThrow:
        concentrationHole === null
          ? undefined
          : concentrationSavingThrowFillFor(
              concentrationLifecycleFills,
              concentrationHole,
            ),
      wardingBondDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      damageDisposition: damageDispositionForTarget(
        endTurnDamageDispositionHoles(nextState, actorId, [{ effect, roll }]),
        damageDispositions,
        actorId,
      ),
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: effect.sourceCombatantId,
      spatialFacts: [],
    });
  }, state);
}

function endTurnDamageDispositionHoles(
  state: BattleState,
  actorId: CombatantId,
  damageRolls: readonly {
    readonly effect: SpellTurnEndDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[],
): readonly BattleAttackDamageDispositionHole[] {
  return damageRolls.flatMap(({ effect, roll }) => {
    const target = state.combatants.get(actorId);
    if (target === undefined) {
      return [];
    }
    return (
      zeroHitPointReplacementDispositionHole({
        damageSourceId: effect.sourceCombatantId,
        target,
        damageAmount: spellTurnEndDamageAmount(state, target, effect, roll),
      }) ?? []
    );
  });
}

function startTurnDamageDispositionHoles(
  state: BattleState,
  actorId: CombatantId,
  damageRolls: readonly {
    readonly effect: SpellTurnStartDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[],
): readonly BattleAttackDamageDispositionHole[] {
  return damageRolls.flatMap(({ effect, roll }) => {
    const target = state.combatants.get(actorId);
    if (target === undefined) {
      return [];
    }
    return (
      zeroHitPointReplacementDispositionHole({
        damageSourceId: effect.sourceCombatantId,
        target,
        damageAmount: spellTurnStartDamageAmount(state, target, effect, roll),
      }) ?? []
    );
  });
}

export function expireEndOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireActiveEffects(
    combatants,
    (effect) =>
      "expiresAt" in effect &&
      effect.expiresAt.kind === "endOfTurn" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === round,
  );
}

type DurationTickContext = {
  readonly state: BattleState;
  readonly spellEndTargetStatePromotionTiming: EndOfNextTurnExpirationTiming;
};

export function tickDurationEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  context?: DurationTickContext,
): {
  readonly value: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
  readonly spellEndTargetStatePromotionIds: readonly CombatantId[];
} {
  const expiredConcentrationSources: ConcentrationEffectSource[] = [];
  const flySpeedGrantEndFallCleanupFrames: BattleFlySpeedGrantEndFallCleanupFrame[] =
    [];
  const spellEndTargetStatePromotionIds: CombatantId[] = [];
  const tickedCombatants = new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring: BattleActiveEffect[] = [];
      const activeEffects: BattleActiveEffect[] = [];
      for (const effect of combatant.activeEffects) {
        if (!isTickingDurationActiveEffect(effect)) {
          activeEffects.push(effect);
          continue;
        }
        const remainingTicks = Number(effect.expiresAt.durationTicks) - 1;
        if (remainingTicks <= 0) {
          expiring.push(effect);
          if (
            "sourceProcedureRef" in effect &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration"
          ) {
            expiredConcentrationSources.push({
              combatantId: effect.expiresAt.combatantId,
              sourceProcedureRef: effect.sourceProcedureRef,
            });
          }
          continue;
        }
        // `isTickingDurationActiveEffect` proves this is a BattleActiveEffect
        // whose expiration can be ticked. Replacing only the branded duration
        // count preserves the original discriminant and variant fields; TS
        // cannot re-correlate that nested update across the union, so this cast
        // restores the already-proven union type.
        const ticked = {
          ...effect,
          expiresAt: {
            ...effect.expiresAt,
            durationTicks: elapsedTimeTicks(remainingTicks),
          },
        } as BattleActiveEffect;
        activeEffects.push(ticked);
      }
      if (
        context !== undefined &&
        expiring.some(spellEndTargetStatePromotesIncapacitated)
      ) {
        spellEndTargetStatePromotionIds.push(id);
      }
      flySpeedGrantEndFallCleanupFrames.push(
        ...flySpeedGrantEndFallCleanupFramesForExpiredEffects(id, expiring),
      );
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      const nextCombatantWithHeldObjectState =
        battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
          nextCombatantBase,
        );
      const nextCombatantWithEndState =
        context === undefined
          ? nextCombatantWithHeldObjectState
          : battleCreatureWithSpellEndTargetStatePromotions({
              state: context.state,
              combatant: nextCombatantWithHeldObjectState,
              expiringEffects: expiring,
              timing: context.spellEndTargetStatePromotionTiming,
            });
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantWithEndState,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
  const concentrationExpired =
    expireConcentrationDurationSourcesWithFlySpeedGrantEndFallCleanupFrames(
      tickedCombatants,
      expiredConcentrationSources,
      context,
    );
  return {
    value: concentrationExpired.value,
    flySpeedGrantEndFallCleanupFrames: [
      ...flySpeedGrantEndFallCleanupFrames,
      ...concentrationExpired.flySpeedGrantEndFallCleanupFrames,
    ],
    spellEndTargetStatePromotionIds: [
      ...spellEndTargetStatePromotionIds,
      ...concentrationExpired.spellEndTargetStatePromotionIds,
    ],
  };
}

type ConcentrationEffectSource = {
  readonly combatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

function activeEffectDurationTicks(
  effect: BattleActiveEffect,
): DurationActiveEffect["expiresAt"]["durationTicks"] | null {
  if (
    effect.kind === "sleepPendingRepeatSave" ||
    effect.kind === "sleepUnconscious" ||
    !("expiresAt" in effect)
  ) {
    return null;
  }
  if (effect.expiresAt.kind === "duration") {
    return effect.expiresAt.durationTicks;
  }
  return effect.expiresAt.kind === "concentration" &&
    effect.expiresAt.durationTicks !== undefined
    ? effect.expiresAt.durationTicks
    : null;
}

type TickingDurationActiveEffect = BattleActiveEffect & {
  readonly expiresAt:
    | DurationActiveEffect["expiresAt"]
    | (Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & {
        readonly durationTicks: DurationActiveEffect["expiresAt"]["durationTicks"];
      });
};

function isTickingDurationActiveEffect(
  effect: BattleActiveEffect,
): effect is TickingDurationActiveEffect {
  return activeEffectDurationTicks(effect) !== null;
}

function expireConcentrationDurationSourcesWithFlySpeedGrantEndFallCleanupFrames(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  sources: readonly ConcentrationEffectSource[],
  context?: DurationTickContext,
): {
  readonly value: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
  readonly spellEndTargetStatePromotionIds: readonly CombatantId[];
} {
  const uniqueSources = [
    ...new Map(
      sources.map((source) => [
        `${source.combatantId}\u0000${source.sourceProcedureRef}`,
        source,
      ]),
    ).values(),
  ];
  const initial: {
    readonly value: ReadonlyMap<CombatantId, BattleCreatureState>;
    readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
    readonly spellEndTargetStatePromotionIds: readonly CombatantId[];
  } = {
    value: combatants,
    flySpeedGrantEndFallCleanupFrames: [],
    spellEndTargetStatePromotionIds: [],
  };
  return uniqueSources.reduce((current, source) => {
    const expired =
      expireConcentrationDurationSourceWithFlySpeedGrantEndFallCleanupFrames(
        current.value,
        source,
        context,
      );
    return {
      value: expired.value,
      flySpeedGrantEndFallCleanupFrames: [
        ...current.flySpeedGrantEndFallCleanupFrames,
        ...expired.flySpeedGrantEndFallCleanupFrames,
      ],
      spellEndTargetStatePromotionIds: [
        ...current.spellEndTargetStatePromotionIds,
        ...expired.spellEndTargetStatePromotionIds,
      ],
    };
  }, initial);
}

function expireConcentrationDurationSourceWithFlySpeedGrantEndFallCleanupFrames(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: ConcentrationEffectSource,
  context?: DurationTickContext,
): {
  readonly value: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
  readonly spellEndTargetStatePromotionIds: readonly CombatantId[];
} {
  const flySpeedGrantEndFallCleanupFrames: BattleFlySpeedGrantEndFallCleanupFrame[] =
    [];
  const spellEndTargetStatePromotionIds: CombatantId[] = [];
  const value = new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter((effect) =>
        activeEffectExpiresWithConcentrationSource(effect, source),
      );
      if (
        context !== undefined &&
        expiring.some(spellEndTargetStatePromotesIncapacitated)
      ) {
        spellEndTargetStatePromotionIds.push(id);
      }
      flySpeedGrantEndFallCleanupFrames.push(
        ...flySpeedGrantEndFallCleanupFramesForExpiredEffects(id, expiring),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !expiring.includes(effect),
      );
      const concentrationExpired =
        id === source.combatantId &&
        combatant.concentration?.effectKind === "spellEffect" &&
        combatant.concentration.sourceProcedureRef ===
          source.sourceProcedureRef;
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              concentration: concentrationExpired
                ? null
                : combatant.concentration,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : {
              ...combatant,
              concentration: concentrationExpired
                ? null
                : combatant.concentration,
              activeEffects,
            };
      const nextCombatantWithHeldObjectState =
        battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
          nextCombatantBase,
        );
      const nextCombatantWithEndState =
        context === undefined
          ? nextCombatantWithHeldObjectState
          : battleCreatureWithSpellEndTargetStatePromotions({
              state: context.state,
              combatant: nextCombatantWithHeldObjectState,
              expiringEffects: expiring,
              timing: context.spellEndTargetStatePromotionTiming,
            });
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantWithEndState,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
  return {
    value,
    flySpeedGrantEndFallCleanupFrames,
    spellEndTargetStatePromotionIds,
  };
}

function activeEffectExpiresWithConcentrationSource(
  effect: BattleActiveEffect,
  source: ConcentrationEffectSource,
): boolean {
  if (
    effect.sourceCombatantId !== source.combatantId ||
    !("sourceProcedureRef" in effect) ||
    effect.sourceProcedureRef !== source.sourceProcedureRef
  ) {
    return false;
  }
  return (
    ("expiresAt" in effect && effect.expiresAt.kind === "concentration") ||
    effect.kind === "selfAttackRollAndAbilityCheckRollMode"
  );
}

export function expireActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (effect: BattleActiveEffect) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter(shouldExpire);
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !shouldExpire(effect),
      );
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
          nextCombatantBase,
        ),
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
}

export function expireStartOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "startOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId,
  );
}

export function expireEndOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "endOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId &&
      ongoingFeature.expiresAt.round === round,
  );
}

export function expireOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (occurrence: ActiveOngoingFeatureOccurrence) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        activeOngoingFeatureOccurrences: new Map(
          [...combatant.activeOngoingFeatureOccurrences].filter(
            ([, occurrence]) => !shouldExpire(occurrence),
          ),
        ),
      },
    ]),
  );
}

export function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn does not accept battle fills for unrelated subjects.",
    );
  }
  /* v8 ignore stop */

  const initiative = nextInitiative(input.state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = input.state.combatants.get(nextActorId);
  const actorId = currentActorId(input.state);
  const actor = input.state.combatants.get(actorId);
  const sleepRepeatSaveRequests = sleepPendingRepeatSaveEffects(
    actor,
    actorId,
    input.state.initiative.round,
  ).map((effect) => ({
    effect,
    hole: sleepRepeatSavingThrowOutcomeHole(
      actorId,
      effect,
      actor === undefined
        ? []
        : savingThrowFlatBonusProjections(
            input.state,
            effect.save.ability,
          ).filter((projection) => projection.targetId === actorId),
    ),
  }));
  const sleepRepeatSaveHoles = sleepRepeatSaveRequests.map(
    (request) => request.hole,
  );
  const hideousLaughterRepeatSaveRequests = hideousLaughterEffects(actor).map(
    (effect) => ({
      effect,
      hole: hideousLaughterRepeatSavingThrowOutcomeHole(
        actorId,
        effect,
        "endTurn",
        undefined,
        actor === undefined
          ? []
          : savingThrowFlatBonusProjections(
              input.state,
              effect.save.ability,
            ).filter((projection) => projection.targetId === actorId),
      ),
    }),
  );
  const hideousLaughterRepeatSaveHoles = hideousLaughterRepeatSaveRequests.map(
    (request) => request.hole,
  );
  const spellConditionEndTurnSaveRequests = spellConditionEndTurnSaveEffects(
    actor,
  ).map((effect) => ({
    effect,
    hole: spellConditionEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
      input.state,
      actor === undefined
        ? []
        : savingThrowFlatBonusProjections(
            input.state,
            effect.save.ability,
          ).filter((projection) => projection.targetId === actorId),
    ),
  }));
  const spellConditionEndTurnSaveHoles = spellConditionEndTurnSaveRequests.map(
    (request) => request.hole,
  );
  const spellConditionCountedEndTurnSaveRequests =
    spellConditionCountedEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: spellConditionCountedEndTurnSavingThrowOutcomeHole(
        actorId,
        effect,
        input.state,
        actor === undefined
          ? []
          : savingThrowFlatBonusProjections(
              input.state,
              effect.save.ability,
            ).filter((projection) => projection.targetId === actorId),
      ),
    }));
  const unitFeatureConditionEndTurnSaveRequests =
    unitFeatureConditionEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: unitFeatureConditionEndTurnSavingThrowOutcomeHole(
        actorId,
        effect,
        input.state,
        actor === undefined
          ? []
          : savingThrowFlatBonusProjections(
              input.state,
              effect.save.ability,
            ).filter((projection) => projection.targetId === actorId),
      ),
    }));
  const unitFeatureConditionEndTurnSaveHoles =
    unitFeatureConditionEndTurnSaveRequests.map((request) => request.hole);
  const slowActivePenaltiesEndTurnSaveRequests = slowActivePenaltiesEffects(
    actor,
  ).map((effect) => ({
    effect,
    hole: slowActivePenaltiesEndTurnSavingThrowOutcomeHole(
      actorId,
      effect,
      input.state,
      actor === undefined
        ? []
        : savingThrowFlatBonusProjections(
            input.state,
            effect.save.ability,
          ).filter((projection) => projection.targetId === actorId),
    ),
  }));
  const slowActivePenaltiesEndTurnSaveHoles =
    slowActivePenaltiesEndTurnSaveRequests.map((request) => request.hole);
  const abilityD20TestEndTurnSaveRequests =
    abilityD20TestRollModeEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: abilityD20TestRollModeEndTurnSavingThrowOutcomeHole(
        actorId,
        effect,
        input.state,
        actor === undefined
          ? []
          : savingThrowFlatBonusProjections(
              input.state,
              effect.save.ability,
            ).filter((projection) => projection.targetId === actorId),
      ),
    }));
  const abilityD20TestEndTurnSaveHoles = abilityD20TestEndTurnSaveRequests.map(
    (request) => request.hole,
  );
  const endTurnDamageEffects = spellTurnEndDamageEffects(
    actor,
    actorId,
    input.state.initiative.round,
  );
  const endTurnDamageRequests = endTurnDamageEffects.map((effect) => ({
    effect,
    hole: spellTurnEndDamageRollHole(actorId, effect),
  }));
  const endTurnDamageHoles = endTurnDamageRequests.map(
    (request) => request.hole,
  );
  const needsDeathSavingThrow = startTurnDeathSavingThrowRequired(nextActor);
  const rechargeHole = statBlockRechargeRollHole(nextActor);
  const startTurnDamageEffects = spellTurnStartDamageEffects(nextActor);
  const startTurnDamageRequests = startTurnDamageEffects.map((effect) => ({
    effect,
    hole: spellTurnStartDamageRollHole(nextActorId, effect),
  }));
  const startTurnDamageHoles = startTurnDamageRequests.map(
    (request) => request.hole,
  );
  const startTurnSaveRequests = startTurnDamageEffects.flatMap((effect) =>
    effect.kind === "spellTurnStartDamageAndSave"
      ? [
          {
            effect,
            hole: spellTurnStartSavingThrowOutcomeHole(
              nextActorId,
              effect,
              nextActor === undefined
                ? []
                : savingThrowFlatBonusProjections(
                    input.state,
                    effect.save.ability,
                  ).filter((projection) => projection.targetId === nextActorId),
            ),
          },
        ]
      : [],
  );
  const startTurnSaveHoles = startTurnSaveRequests.map(
    (request) => request.hole,
  );
  const initialHoles = [
    ...sleepRepeatSaveHoles,
    ...hideousLaughterRepeatSaveHoles,
    ...spellConditionEndTurnSaveHoles,
    ...unitFeatureConditionEndTurnSaveHoles,
    ...slowActivePenaltiesEndTurnSaveHoles,
    ...abilityD20TestEndTurnSaveHoles,
    ...endTurnDamageHoles,
    ...(needsDeathSavingThrow ? [deathSavingThrowHole(nextActorId)] : []),
    ...(rechargeHole === null ? [] : [rechargeHole]),
    ...startTurnDamageHoles,
    ...startTurnSaveHoles,
  ];
  if (initialHoles.length > 0 && input.fills.length === 0) {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: initialHoles,
      snapshot: snapshotBattle(input.state),
    };
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  const rechargeRollFill = input.fills.find(
    (fill) => fill.kind === "statBlockRechargeRoll",
  );
  const concentrationSavingThrowFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const damageDispositionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const savingThrowOutcomeFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    savingThrowOutcomeFills.some((fill) => fill.relationshipFacts !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Turn-boundary Saving Throw relationship facts were not requested.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((fill) => fill.kind === "deathSavingThrow").length > 1 ||
    input.fills.filter((fill) => fill.kind === "statBlockRechargeRoll").length >
      1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate fills for a single requested hole.",
    );
  }
  /* v8 ignore stop */
  const sleepRepeatSaves = sleepRepeatSaveRequests.flatMap((request) => {
    const fill = sleepRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    return fill === undefined ? [] : [fill];
  });
  const hideousLaughterRepeatSaves = hideousLaughterRepeatSaveRequests.flatMap(
    (request) => {
      const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    },
  );
  const spellConditionEndTurnSaves = spellConditionEndTurnSaveRequests.flatMap(
    (request) => {
      const fill = spellConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    },
  );
  const spellConditionCountedEndTurnSaves =
    spellConditionCountedEndTurnSaveRequests.flatMap((request) => {
      const fill = spellConditionCountedEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const unitFeatureConditionEndTurnSaves =
    unitFeatureConditionEndTurnSaveRequests.flatMap((request) => {
      const fill = unitFeatureConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const slowActivePenaltiesEndTurnSaves =
    slowActivePenaltiesEndTurnSaveRequests.flatMap((request) => {
      const fill = slowActivePenaltiesEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const abilityD20TestEndTurnSaves = abilityD20TestEndTurnSaveRequests.flatMap(
    (request) => {
      const fill = abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    },
  );
  const missingSleepRepeatSaveHoles = sleepRepeatSaveRequests.flatMap(
    (request) =>
      sleepRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
  );
  if (missingSleepRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSleepRepeatSaveHoles,
    ]);
  }
  const missingHideousLaughterRepeatSaveHoles =
    hideousLaughterRepeatSaveRequests.flatMap((request) =>
      hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingHideousLaughterRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingHideousLaughterRepeatSaveHoles,
    ]);
  }
  const missingSpellConditionEndTurnSaveHoles =
    spellConditionEndTurnSaveRequests.flatMap((request) =>
      spellConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingSpellConditionEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSpellConditionEndTurnSaveHoles,
    ]);
  }
  const missingSpellConditionCountedEndTurnSaveHoles =
    spellConditionCountedEndTurnSaveRequests.flatMap((request) =>
      spellConditionCountedEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingSpellConditionCountedEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSpellConditionCountedEndTurnSaveHoles,
    ]);
  }
  const missingUnitFeatureConditionEndTurnSaveHoles =
    unitFeatureConditionEndTurnSaveRequests.flatMap((request) =>
      unitFeatureConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingUnitFeatureConditionEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingUnitFeatureConditionEndTurnSaveHoles,
    ]);
  }
  const missingSlowActivePenaltiesEndTurnSaveHoles =
    slowActivePenaltiesEndTurnSaveRequests.flatMap((request) =>
      slowActivePenaltiesEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingSlowActivePenaltiesEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSlowActivePenaltiesEndTurnSaveHoles,
    ]);
  }
  const missingAbilityD20TestEndTurnSaveHoles =
    abilityD20TestEndTurnSaveRequests.flatMap((request) =>
      abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingAbilityD20TestEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingAbilityD20TestEndTurnSaveHoles,
    ]);
  }
  const endTurnDamageRolls = endTurnDamageRequests.flatMap((request) => {
    const fill = spellTurnEndDamageRollFor(input.fills, request.hole);
    return fill === undefined ? [] : [fill];
  });
  const endTurnDamageRollRequests = endTurnDamageRequests.flatMap((request) => {
    const roll = spellTurnEndDamageRollFor(input.fills, request.hole);
    return roll === undefined ? [] : [{ ...request, roll }];
  });
  const missingEndTurnDamageHoles = endTurnDamageRequests.flatMap((request) =>
    spellTurnEndDamageRollFor(input.fills, request.hole) === undefined
      ? [request.hole]
      : [],
  );
  if (missingEndTurnDamageHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingEndTurnDamageHoles,
    ]);
  }
  const startTurnDamageRolls = startTurnDamageRequests.flatMap((request) => {
    const fill = spellTurnStartDamageRollFor(input.fills, request.hole);
    return fill === undefined ? [] : [fill];
  });
  const startTurnDamageRollRequests = startTurnDamageRequests.flatMap(
    (request) => {
      const roll = spellTurnStartDamageRollFor(input.fills, request.hole);
      return roll === undefined ? [] : [{ ...request, roll }];
    },
  );
  const missingStartTurnDamageHoles = startTurnDamageRequests.flatMap(
    (request) =>
      spellTurnStartDamageRollFor(input.fills, request.hole) === undefined
        ? [request.hole]
        : [],
  );
  if (missingStartTurnDamageHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnDamageHoles,
    ]);
  }
  const turnBoundaryDamageHoleIds = new Set<BattleHoleId>(
    [...endTurnDamageHoles, ...startTurnDamageHoles].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "rolledDice" &&
        !turnBoundaryDamageHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn rolled dice fills must match a requested turn-boundary damage hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((fill) => fill.kind === "rolledDice").length !==
    endTurnDamageRolls.length + startTurnDamageRolls.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate rolled dice fills for turn-boundary damage.",
    );
  }
  /* v8 ignore stop */
  const startTurnSaves = startTurnSaveRequests.flatMap((request) => {
    const fill = spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    return fill === undefined ? [] : [fill];
  });
  const missingStartTurnSaveHoles = startTurnSaveRequests.flatMap((request) =>
    spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    ) === undefined
      ? [request.hole]
      : [],
  );
  if (missingStartTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnSaveHoles,
    ]);
  }
  const endTurnHideousLaughterDamageRepeatSaveChecks =
    endTurnDamageRollRequests.map((request) => {
      if (actor === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      const damageAmount = spellTurnEndDamageAmount(
        input.state,
        actor,
        request.effect,
        request.roll,
      );
      const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: input.state,
        target: actor,
        damageAmount,
      });
      return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: input.state,
        target: actor,
        damageAmount,
        fills: fillsMatchingHoleIds(savingThrowOutcomeFills, holes),
      });
    });
  const invalidEndTurnHideousLaughterDamageRepeatSaveCheck =
    endTurnHideousLaughterDamageRepeatSaveChecks.find(
      (check) => check.tag === "invalid",
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidEndTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidEndTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const endTurnHideousLaughterDamageRepeatSaveHoles =
    endTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" || check.tag === "ok" ? [...check.holes] : [],
    );
  const missingEndTurnHideousLaughterDamageRepeatSaveHoles =
    endTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    );
  if (missingEndTurnHideousLaughterDamageRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingEndTurnHideousLaughterDamageRepeatSaveHoles,
    ]);
  }
  const startTurnHideousLaughterDamageRepeatSaveChecks =
    startTurnDamageRollRequests.map((request) => {
      if (nextActor === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      const damageAmount = spellTurnStartDamageAmount(
        input.state,
        nextActor,
        request.effect,
        request.roll,
      );
      const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: input.state,
        target: nextActor,
        damageAmount,
      });
      return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: input.state,
        target: nextActor,
        damageAmount,
        fills: fillsMatchingHoleIds(savingThrowOutcomeFills, holes),
      });
    });
  const invalidStartTurnHideousLaughterDamageRepeatSaveCheck =
    startTurnHideousLaughterDamageRepeatSaveChecks.find(
      (check) => check.tag === "invalid",
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidStartTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidStartTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const startTurnHideousLaughterDamageRepeatSaveHoles =
    startTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" || check.tag === "ok" ? [...check.holes] : [],
    );
  const missingStartTurnHideousLaughterDamageRepeatSaveHoles =
    startTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    );
  if (missingStartTurnHideousLaughterDamageRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnHideousLaughterDamageRepeatSaveHoles,
    ]);
  }
  const startTurnHideousLaughterDamageRepeatSaves =
    startTurnHideousLaughterDamageRepeatSaveHoles.flatMap((hole) => {
      const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const endTurnHideousLaughterDamageRepeatSaves =
    endTurnHideousLaughterDamageRepeatSaveHoles.flatMap((hole) => {
      const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const turnBoundaryHideousLaughterDamageRepeatSaves = [
    ...endTurnHideousLaughterDamageRepeatSaves,
    ...startTurnHideousLaughterDamageRepeatSaves,
  ];
  const savingThrowOutcomeHoleIds = new Set<BattleHoleId>(
    [
      ...sleepRepeatSaveHoles,
      ...hideousLaughterRepeatSaveHoles,
      ...spellConditionEndTurnSaveHoles,
      ...spellConditionCountedEndTurnSaveRequests.map(
        (request) => request.hole,
      ),
      ...unitFeatureConditionEndTurnSaveHoles,
      ...slowActivePenaltiesEndTurnSaveHoles,
      ...abilityD20TestEndTurnSaveHoles,
      ...startTurnSaveHoles,
      ...endTurnHideousLaughterDamageRepeatSaveHoles,
      ...startTurnHideousLaughterDamageRepeatSaveHoles,
    ].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "savingThrowOutcome" &&
        !savingThrowOutcomeHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn Saving Throw outcome fills must match a requested end-turn or turn-start spell save hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    savingThrowOutcomeFills.length !==
    sleepRepeatSaves.length +
      hideousLaughterRepeatSaves.length +
      spellConditionEndTurnSaves.length +
      spellConditionCountedEndTurnSaves.length +
      unitFeatureConditionEndTurnSaves.length +
      slowActivePenaltiesEndTurnSaves.length +
      abilityD20TestEndTurnSaves.length +
      startTurnSaves.length +
      endTurnHideousLaughterDamageRepeatSaves.length +
      startTurnHideousLaughterDamageRepeatSaves.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  for (const request of sleepRepeatSaveRequests) {
    const fill = sleepRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of slowActivePenaltiesEndTurnSaveRequests) {
    const fill = slowActivePenaltiesEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSlowActivePenaltiesEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of hideousLaughterRepeatSaveRequests) {
    const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of spellConditionEndTurnSaveRequests) {
    const fill = spellConditionEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of spellConditionCountedEndTurnSaveRequests) {
    const fill = spellConditionCountedEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of unitFeatureConditionEndTurnSaveRequests) {
    const fill = unitFeatureConditionEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of abilityD20TestEndTurnSaveRequests) {
    const fill = abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const fill of startTurnHideousLaughterDamageRepeatSaves) {
    const hole = startTurnHideousLaughterDamageRepeatSaveHoles.find(
      (candidate) => candidate.holeId === fill.holeId,
    );
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      hole?.hideousLaughterRepeatSave.targetId ?? nextActorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const fill of endTurnHideousLaughterDamageRepeatSaves) {
    const hole = endTurnHideousLaughterDamageRepeatSaveHoles.find(
      (candidate) => candidate.holeId === fill.holeId,
    );
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      hole?.hideousLaughterRepeatSave.targetId ?? actorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of startTurnSaveRequests) {
    const fill = spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellTurnStartSavingThrowOutcome(
      fill.value,
      nextActorId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of endTurnDamageRollRequests) {
    const validation = validateRolledDiceFillForDiceExpr(
      request.roll,
      request.effect.damage.expr,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  for (const request of startTurnDamageRollRequests) {
    const damage = spellTurnStartDamageForEffect(request.effect);
    const validation = validateRolledDiceFillForDiceExpr(
      request.roll,
      damage.expr,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop */
  }
  const endTurnConcentrationHoles = endTurnDamageRollRequests.flatMap(
    (request) => {
      const target = actor;
      if (target === undefined) {
        return [];
      }
      return damageLifecycleConcentrationSavingThrowHoles({
        state: input.state,
        target,
        damageAmount: spellTurnEndDamageAmount(
          input.state,
          target,
          request.effect,
          request.roll,
        ),
      });
    },
  );
  const startTurnConcentrationHoles = startTurnDamageRollRequests.flatMap(
    (request) => {
      const target = nextActor;
      if (target === undefined) {
        return [];
      }
      return damageLifecycleConcentrationSavingThrowHoles({
        state: input.state,
        target,
        damageAmount: spellTurnStartDamageAmount(
          input.state,
          target,
          request.effect,
          request.roll,
        ),
      });
    },
  );
  const turnBoundaryConcentrationHoles = [
    ...endTurnConcentrationHoles,
    ...startTurnConcentrationHoles,
  ];
  const missingConcentrationHoles = turnBoundaryConcentrationHoles.filter(
    (hole) =>
      concentrationSavingThrowFillFor(concentrationSavingThrowFills, hole) ===
      undefined,
  );
  if (missingConcentrationHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingConcentrationHoles,
    );
  }
  const concentrationHoleIds = new Set<BattleHoleId>(
    turnBoundaryConcentrationHoles.map((hole) => hole.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "concentrationSavingThrow" &&
        !concentrationHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating turn-boundary damage target.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    concentrationSavingThrowFills.length !==
    turnBoundaryConcentrationHoles.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Concentration Saving Throw fills for turn-boundary damage.",
    );
  }
  /* v8 ignore stop */
  const damageDispositionHoles = [
    ...endTurnDamageRollRequests.flatMap((request) =>
      endTurnDamageDispositionHoles(input.state, actorId, [request]),
    ),
    ...startTurnDamageRollRequests.flatMap((request) =>
      startTurnDamageDispositionHoles(input.state, nextActorId, [request]),
    ),
  ];
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: damageDispositionFills,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(damageDispositionFills, hole) === undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingDamageDispositionHoles,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    (needsDeathSavingThrow &&
      deathSavingThrowFill?.kind !== "deathSavingThrow") ||
    (!needsDeathSavingThrow && deathSavingThrowFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      needsDeathSavingThrow
        ? "End Turn requires a Death Saving Throw fill for the next actor."
        : "End Turn does not accept battle fills.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    (rechargeHole !== null &&
      rechargeRollFill?.kind !== "statBlockRechargeRoll") ||
    (rechargeHole === null && rechargeRollFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      rechargeHole !== null
        ? "End Turn requires a Stat Block Recharge roll fill for the next actor."
        : "End Turn does not accept a Stat Block Recharge roll fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    deathSavingThrowFill?.kind === "deathSavingThrow" &&
    deathSavingThrowFill.holeId !== DEATH_SAVING_THROW_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Death Saving Throw fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  if (deathSavingThrowFill?.kind === "deathSavingThrow") {
    if (
      d20TestNaturalOneRerollDieDecisionRequired({
        actor: nextActor,
        originalNaturalD20: Number(deathSavingThrowFill.value),
        decision: deathSavingThrowFill.d20TestNaturalOneReroll,
      })
    ) {
      return needsHolesResult(input.state, input.subject, [
        d20TestNaturalOneRerollHoleWithOption(
          deathSavingThrowHole(nextActorId),
        ),
      ]);
    }
    const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollDieIssue({
      actor: nextActor,
      originalNaturalD20: Number(deathSavingThrowFill.value),
      decision: deathSavingThrowFill.d20TestNaturalOneReroll,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollIssue !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      );
    }
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    rechargeRollFill.holeId !== STAT_BLOCK_RECHARGE_ROLL_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    !statBlockRechargeRollFillMatchesHole(rechargeRollFill.value, rechargeHole)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill must provide one d6 result for each requested target.",
    );
  }
  /* v8 ignore stop */
  const effectiveDeathSavingThrowFill =
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? effectiveD20TestNaturalOneRerollDeathSavingThrow(deathSavingThrowFill)
      : undefined;

  return resolveEndTurn(
    input.state,
    effectiveDeathSavingThrowFill?.value,
    rechargeRollFill?.kind === "statBlockRechargeRoll"
      ? rechargeRollFill.value
      : undefined,
    sleepRepeatSaves,
    hideousLaughterRepeatSaves,
    spellConditionEndTurnSaves,
    spellConditionCountedEndTurnSaves,
    unitFeatureConditionEndTurnSaves,
    slowActivePenaltiesEndTurnSaves,
    abilityD20TestEndTurnSaves,
    endTurnDamageRolls,
    startTurnDamageRolls,
    startTurnSaves,
    turnBoundaryHideousLaughterDamageRepeatSaves,
    concentrationSavingThrowFills,
    damageDispositionFills,
  );
}

const END_TURN_FILL_KINDS = [
  "attackDamageDisposition",
  "concentrationSavingThrow",
  "deathSavingThrow",
  "rolledDice",
  "savingThrowOutcome",
  "statBlockRechargeRoll",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;

const END_TURN_FILL_KIND_SET: ReadonlySet<BattleFill["kind"]> = new Set(
  END_TURN_FILL_KINDS,
);

function endTurnFillKind(kind: BattleFill["kind"]): boolean {
  return END_TURN_FILL_KIND_SET.has(kind);
}

export function statBlockRechargeRollFillMatchesHole(
  value: readonly BattleStatBlockRechargeRollResult[],
  rechargeHole: BattleStatBlockRechargeRollHole | null,
): boolean {
  if (rechargeHole === null) return value.length === 0;
  if (value.length !== rechargeHole.rechargeTargets.length) return false;

  const matchedTargetIndexes = new Set<number>();
  for (const result of value) {
    /* v8 ignore next -- DieRollResult is parsed as a PositiveInteger, so only the d6 upper bound remains a reachable recharge-fill failure. */
    if (result.roll < 1) return false;
    if (result.roll > 6) return false;
    const targetIndex = rechargeHole.rechargeTargets.findIndex(
      (target, index) =>
        !matchedTargetIndexes.has(index) && target === result.target,
    );
    if (targetIndex === -1) return false;
    matchedTargetIndexes.add(targetIndex);
  }
  return true;
}

export function resolveMoveCommand(
  input: AdmittedBattleResolutionInput,
): BattleResolutionResult {
  if (!canSpendMovement(input.state.currentTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movement is no longer available for the current actor.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires a Movement fill first.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((candidate) => candidate.kind === "movement").length !==
    1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveMoveAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    fills: input.fills,
  });
}

type JumpMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "jumpMovementReplacement" }
>;

export function resolveJumpMovementReplacementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "jumpMovementReplacement";
      }
    >
  >,
): BattleResolutionResult {
  const effect = jumpMovementReplacementEffectForSubject(
    input.state,
    input.subject,
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Jump movement replacement is not available.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires a Movement fill first.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter((candidate) => candidate.kind === "movement").length !==
    1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires exactly one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const fill = input.fills[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Jump movement replacement hole.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
    { jumpMovementReplacement: effect },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */

  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const consumedState = markJumpMovementReplacementUsed(
      input.state,
      input.subject.actorId,
      effect,
    );
    const reactionWindow = maybeOpenInterruptWindow(
      consumedState,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    extraFills: input.fills.slice(1),
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop */
  const consumedState = markJumpMovementReplacementUsed(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  return {
    tag: "resolved",
    state: consumedState,
    snapshot: snapshotBattle(consumedState),
  };
}

function jumpMovementReplacementEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >,
): JumpMovementReplacementEffect | null {
  const actor = state.combatants.get(subject.actorId);
  if (actor === undefined) {
    return null;
  }
  return (
    actor.activeEffects.find(
      (effect): effect is JumpMovementReplacementEffect =>
        effect.kind === "jumpMovementReplacement" &&
        spellActiveEffectExecutionRef(effect) === subject.effectRef &&
        !effect.usedThisTurn,
    ) ?? null
  );
}

function markJumpMovementReplacementUsed(
  state: BattleState,
  actorId: CombatantId,
  consumedEffect: JumpMovementReplacementEffect,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const activeEffects = actor.activeEffects.map((effect) =>
    effect.kind === "jumpMovementReplacement" &&
    effect.sourceCombatantId === consumedEffect.sourceCombatantId &&
    effect.sourceProcedureRef === consumedEffect.sourceProcedureRef
      ? { ...effect, usedThisTurn: true }
      : effect,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeEffects,
    }),
  };
}

export function resolveStandFromProneCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  const cost = standFromProneCostFeet(input.state, input.subject.actorId);
  if (
    actor === undefined ||
    cost === null ||
    !canSpendMovement(input.state.currentTurnResources)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stand from Prone is no longer available.",
    );
  }
  const nextActor = {
    ...battleCreatureStateWithKnockOutPreservedConditions(
      actor,
      removeCondition(actor.conditions, "prone"),
    ),
    movementSpentFeet: movementFeet(Number(actor.movementSpentFeet) + cost),
  };
  const nextState = {
    ...input.state,
    currentTurnResources:
      input.subject.actorId === currentActorId(input.state)
        ? markMovementSpentForMovementActionBonusActionExclusion(
            input.state.currentTurnResources,
          )
        : input.state.currentTurnResources,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function parseBattleMovement(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  options: {
    readonly movementBudgetFeet?: MovementFeet;
    readonly spendsTurnMovement?: boolean;
    readonly jumpMovementReplacement?: JumpMovementReplacementEffect;
    readonly commandApproach?: BattleCommandApproachMovementFact;
    readonly commandFlee?: BattleCommandFleeMovementFact;
  } = {},
):
  | { readonly tag: "ok"; readonly movement: BattleResolvedMovement }
  | { readonly tag: "invalid"; readonly message: string } {
  const movementBudgetFeet =
    options.movementBudgetFeet ??
    battleMovementBudgetForActor(state, moverId, fill.value.speedKind)
      .remainingFeet;
  const mover = state.combatants.get(moverId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  const movementCostFactValidation = validateMovementCostFacts(
    state,
    moverId,
    fill.value,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementCostFactValidation !== null) {
    return {
      tag: "invalid",
      message: movementCostFactValidation,
    };
  }
  /* v8 ignore stop */
  const acrobaticMovementValidation = validateAcrobaticMovementFact(
    state,
    mover,
    fill.value.acrobaticMovement,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (acrobaticMovementValidation !== null) {
    return {
      tag: "invalid",
      message: acrobaticMovementValidation,
    };
  }
  /* v8 ignore stop */
  const creatureSpaceTraversalValidation =
    validateCreatureSpaceTraversalMovementFact(
      state,
      mover,
      fill.value.creatureSpaceTraversal,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (creatureSpaceTraversalValidation !== null) {
    return {
      tag: "invalid",
      message: creatureSpaceTraversalValidation,
    };
  }
  /* v8 ignore stop */
  const areaExtraCostFeet = areaMovementExtraCostFeet(state, fill.value);
  const jumpMovementValidation = validateJumpMovementReplacementFact(
    state,
    moverId,
    fill.value.jumpMovementReplacement,
    options.jumpMovementReplacement,
    fill.value.movementCostFeet,
    areaExtraCostFeet,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (jumpMovementValidation !== null) {
    return {
      tag: "invalid",
      message: jumpMovementValidation,
    };
  }
  /* v8 ignore stop */
  const levitatedMovementValidation = validateLevitatedMovementFact({
    combatant: mover,
    fact: fill.value.levitatedMovement,
    speedKind: fill.value.speedKind,
    movementCostFeet: fill.value.movementCostFeet,
    areaExtraCostFeet,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (levitatedMovementValidation !== null) {
    return {
      tag: "invalid",
      message: levitatedMovementValidation,
    };
  }
  /* v8 ignore stop */
  const commandApproachValidation = validateCommandApproachMovementFact(
    fill.value.commandApproach,
    options.commandApproach,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (commandApproachValidation !== null) {
    return {
      tag: "invalid",
      message: commandApproachValidation,
    };
  }
  /* v8 ignore stop */
  const commandFleeValidation = validateCommandFleeMovementFact(
    fill.value.commandFlee,
    options.commandFlee,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (commandFleeValidation !== null) {
    return {
      tag: "invalid",
      message: commandFleeValidation,
    };
  }
  /* v8 ignore stop */
  const movementCost = ordinaryMovementCost(
    movementFeet(fill.value.movementCostFeet),
    fill.value.speedKind,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Number(movementCost.costFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  /* v8 ignore stop */
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    /* v8 ignore stop */
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) =>
        interruptAttackExecutionSelectionMatchesOption(threat, option),
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attackTargetConstraint(attack).kind !== "meleeReach") {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat must name a melee attack option.",
      };
    }
    /* v8 ignore stop */
    const threatKey = opportunityAttackThreatIdentityKey(reactorId, threat);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
    /* v8 ignore stop */
    seen.add(threatKey);
    provokedOpportunityAttacks.push(threat);
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      speedKind: fill.value.speedKind,
      movementCostFeet: movementCost.costFeet,
      provokedOpportunityAttacks,
      spendsTurnMovement: options.spendsTurnMovement ?? true,
      ...(fill.value.acrobaticMovement === undefined
        ? {}
        : { acrobaticMovement: fill.value.acrobaticMovement }),
      ...(fill.value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: fill.value.areaDifficultTerrain }),
      ...(fill.value.grappleDrag === undefined
        ? {}
        : { grappleDrag: fill.value.grappleDrag }),
      ...(fill.value.creatureSpaceTraversal === undefined
        ? {}
        : { creatureSpaceTraversal: fill.value.creatureSpaceTraversal }),
      ...(fill.value.jumpMovementReplacement === undefined
        ? {}
        : { jumpMovementReplacement: fill.value.jumpMovementReplacement }),
      ...(fill.value.levitatedMovement === undefined
        ? {}
        : { levitatedMovement: fill.value.levitatedMovement }),
    },
  };
}

function opportunityAttackThreatIdentityKey(
  reactorId: CombatantId,
  selection: BattleInterruptAttackExecutionSelection,
): string {
  return JSON.stringify([reactorId, attackExecutionSelectionKey(selection)]);
}

type SpikeGrowthHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spikeGrowthHazard" }
>;

type SpikeGrowthMovementDamageRequest = {
  readonly effect: SpikeGrowthHazardEffect;
  readonly distanceFeet: MovementFeet;
  readonly damage: SpikeGrowthHazardEffect["damage"];
};

function spikeGrowthHazardEffectFor(
  state: BattleState,
  source: Extract<
    BattleAreaDifficultTerrainSource,
    { readonly kind: "spikeGrowthHazard" }
  >,
): SpikeGrowthHazardEffect | undefined {
  const combatant = state.combatants.get(source.sourceCombatantId);
  return combatant?.activeEffects.find(
    (effect): effect is SpikeGrowthHazardEffect =>
      effect.kind === "spikeGrowthHazard" &&
      effect.sourceCombatantId === source.sourceCombatantId &&
      effect.sourceProcedureRef === source.sourceProcedureRef &&
      effect.areaId === source.areaId,
  );
}

function scaledSpikeGrowthDamage(
  effect: SpikeGrowthHazardEffect,
  distanceFeet: MovementFeet,
): SpikeGrowthHazardEffect["damage"] | null {
  const increments = Math.floor(
    Number(distanceFeet) / Number(effect.damagePerFeet),
  );
  if (increments <= 0) {
    return null;
  }
  return {
    expr: {
      dice: effect.damage.expr.dice * increments,
      dieSize: effect.damage.expr.dieSize,
      ...(effect.damage.expr.flat === undefined
        ? {}
        : { flat: effect.damage.expr.flat * increments }),
    },
    damageType: effect.damage.damageType,
  };
}

function spikeGrowthMovementDamageRequests(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly SpikeGrowthMovementDamageRequest[] {
  const areaDifficultTerrain = movement.areaDifficultTerrain;
  if (areaDifficultTerrain === undefined) {
    return [];
  }
  return areaDifficultTerrain.sources.flatMap((source) => {
    if (source.kind !== "spikeGrowthHazard") {
      return [];
    }
    const effect = spikeGrowthHazardEffectFor(state, source);
    if (effect === undefined) {
      return [];
    }
    const damage = scaledSpikeGrowthDamage(effect, source.damageDistanceFeet);
    return damage === null
      ? []
      : [
          {
            effect,
            distanceFeet: source.damageDistanceFeet,
            damage,
          },
        ];
  });
}

function spikeGrowthMovementDamageRollHole(
  targetId: CombatantId,
  request: SpikeGrowthMovementDamageRequest,
): BattleSpikeGrowthMovementDamageRollHole {
  const key = `battle:spike-growth-movement-damage:${targetId}:${request.effect.sourceCombatantId}:${request.effect.sourceProcedureRef}:${request.effect.areaId}:${request.distanceFeet}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Movement damage",
    spikeGrowthMovement: {
      targetId,
      sourceProcedureRef: request.effect.sourceProcedureRef,
      sourceCombatantId: request.effect.sourceCombatantId,
      areaId: request.effect.areaId,
      distanceFeet: request.distanceFeet,
      damage: request.damage,
    },
    critical: false,
  };
}

function validateSpikeGrowthMovementDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleSpikeGrowthMovementDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Spike Growth movement damage must use the selected damage hole.";
  }
  return validateRolledDiceFillForDiceExpr(
    fill,
    hole.spikeGrowthMovement.damage.expr,
  );
}

function spikeGrowthMovementDamageAmount(
  state: BattleState,
  target: BattleCreatureState,
  request: SpikeGrowthMovementDamageRequest,
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  return damageAmountAfterTargetAdjustments(
    state,
    target,
    rolledDiceTotal(fill.value) + (request.damage.expr.flat ?? 0),
    request.damage.damageType,
  );
}

function spikeGrowthMovementEffectFillKind(kind: BattleFill["kind"]): boolean {
  return (
    kind === "rolledDice" ||
    kind === "concentrationSavingThrow" ||
    kind === "attackDamageDisposition"
  );
}

type MovementEffectsAfterMovementResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly remainingFills: readonly BattleFill[];
    }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" | "needsHoles" }>;

export function resolveMovementEffectsAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly movement: BattleResolvedMovement;
  readonly extraFills: readonly BattleFill[];
}): MovementEffectsAfterMovementResult {
  const rolledDiceFills = input.extraFills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice",
  );
  const concentrationSavingThrowFills = input.extraFills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const damageDispositionFills = input.extraFills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const consumedFills = new Set<BattleFill>();

  const movedState = applyBattleMovement(input.state, input.movement);
  const requests = spikeGrowthMovementDamageRequests(
    movedState,
    input.movement,
  );
  if (requests.length === 0) {
    return {
      tag: "resolved",
      state: movedState,
      remainingFills: input.extraFills,
    };
  }

  let nextState = movedState;
  for (const request of requests) {
    const target = nextState.combatants.get(input.movement.moverId);
    if (target === undefined) {
      return {
        tag: "resolved",
        state: nextState,
        remainingFills: input.extraFills.filter(
          (fill) => !consumedFills.has(fill),
        ),
      };
    }
    const damageHole = spikeGrowthMovementDamageRollHole(
      input.movement.moverId,
      request,
    );
    const unconsumedRolledDiceFills = rolledDiceFills.filter(
      (fill) => !consumedFills.has(fill),
    );
    const damageFill = rolledDiceFillForHole(
      unconsumedRolledDiceFills,
      damageHole,
    );
    if (damageFill === undefined) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (unconsumedRolledDiceFills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Spike Growth movement damage fill does not match the pending damage hole.",
        );
      }
      /* v8 ignore stop */
      return needsHolesResult(input.state, input.subject, [damageHole]);
    }
    consumedFills.add(damageFill);
    const damageValidation = validateSpikeGrowthMovementDamageRoll(
      damageFill,
      damageHole,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop */

    const damageAmount = spikeGrowthMovementDamageAmount(
      input.state,
      target,
      request,
      damageFill,
    );
    const concentrationHole = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationFill =
      concentrationHole === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationSavingThrowFills.filter(
              (fill) =>
                fill.holeId === concentrationHole.holeId &&
                !consumedFills.has(fill),
            ),
            concentrationHole,
          );
    if (concentrationHole !== null && concentrationFill === undefined) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        concentrationSavingThrowFills.some((fill) => !consumedFills.has(fill))
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration saving throw fill does not match the pending movement damage hole.",
        );
      }
      /* v8 ignore stop */
      return needsHolesResult(input.state, input.subject, [concentrationHole]);
    }
    if (concentrationFill !== undefined) {
      consumedFills.add(concentrationFill);
    }

    const damageDispositionHole = zeroHitPointReplacementDispositionHole({
      damageSourceId: request.effect.sourceCombatantId,
      target,
      damageAmount,
    });
    const damageDispositionHoles =
      damageDispositionHole === null ? [] : [damageDispositionHole];
    const damageDispositionValidation = damageDispositionFillsValidation({
      holes: damageDispositionHoles,
      fills: damageDispositionFills.filter(
        (fill) =>
          !consumedFills.has(fill) &&
          damageDispositionHoles.some((hole) => hole.holeId === fill.holeId),
      ),
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    /* v8 ignore stop */
    const missingDispositionHole = damageDispositionHoles.find(
      (hole) =>
        damageDispositionFillFor(
          damageDispositionFills.filter((fill) => !consumedFills.has(fill)),
          hole,
        ) === undefined,
    );
    if (missingDispositionHole !== undefined) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageDispositionFills.some((fill) => !consumedFills.has(fill))) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Damage disposition fill does not match the pending movement damage hole.",
        );
      }
      /* v8 ignore stop */
      return needsHolesResult(input.state, input.subject, [
        missingDispositionHole,
      ]);
    }
    for (const hole of damageDispositionHoles) {
      const dispositionFill = damageDispositionFillFor(
        damageDispositionFills.filter((fill) => !consumedFills.has(fill)),
        hole,
      );
      if (dispositionFill !== undefined) {
        consumedFills.add(dispositionFill);
      }
    }

    nextState = applyPreparedSlotSpellDamage(
      nextState,
      input.movement.moverId,
      damageAmount,
      {
        damageSourceId: request.effect.sourceCombatantId,
        concentrationSavingThrow: concentrationFill,
        damageDisposition: damageDispositionForTarget(
          damageDispositionHoles,
          damageDispositionFills,
          input.movement.moverId,
        ),
        wardingBondDamageShareConcentrationSavingThrows: [],
        hideousLaughterDamageRepeatSaves: [],
        spatialFacts: [],
      },
    );
  }
  const remainingFills = input.extraFills.filter(
    (fill) => !consumedFills.has(fill),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    remainingFills.some((fill) => spikeGrowthMovementEffectFillKind(fill.kind))
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move received a fill that does not match a pending Spike Growth movement damage hole.",
    );
  }
  /* v8 ignore stop */

  return {
    tag: "resolved",
    state: nextState,
    remainingFills,
  };
}

export function resolveMoveAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly movement: BattleResolvedMovement;
  readonly fills: readonly BattleFill[];
}): BattleResolutionResult {
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.fills.slice(1),
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
  /* v8 ignore stop */
  return {
    tag: "resolved",
    state: movementEffects.state,
    snapshot: snapshotBattle(movementEffects.state),
  };
}

const byAreaDifficultTerrainSourceKind = Match.discriminator("kind");

function activeAreaDifficultTerrainSourceMatches(
  state: BattleState,
  source: BattleAreaDifficultTerrainSource,
): boolean {
  const sourceCombatant = state.combatants.get(source.sourceCombatantId);
  return Match.value(source).pipe(
    byAreaDifficultTerrainSourceKind(
      "greaseGroundHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "greaseGroundHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "webAreaHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "webRestraintHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "sleetStormHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "sleetStormAreaHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "insectPlagueHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "insectPlagueAreaHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    byAreaDifficultTerrainSourceKind(
      "spikeGrowthHazard",
      (terrainSource) =>
        sourceCombatant?.activeEffects.some(
          (effect) =>
            effect.kind === "spikeGrowthHazard" &&
            effect.sourceCombatantId === terrainSource.sourceCombatantId &&
            effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    Match.exhaustive,
  );
}

function areaDifficultTerrainSourceKey(
  source: BattleAreaDifficultTerrainSource,
): string {
  return `${source.kind}\u0000${source.sourceCombatantId}\u0000${source.sourceProcedureRef}\u0000${source.areaId}`;
}

function validateAreaDifficultTerrainMovementFact(
  state: BattleState,
  fact: BattleAreaDifficultTerrainMovementFact | undefined,
): AreaMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.kind !== "areaDifficultTerrain") {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact has the wrong kind.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.sources.length === 0) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact requires a source.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message:
        "Area Difficult Terrain total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.difficultTerrainDistanceFeet) ||
    fact.difficultTerrainDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    Number(fact.difficultTerrainDistanceFeet) > Number(fact.totalDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Area Difficult Terrain distance cannot exceed total Movement distance.",
    };
  }
  /* v8 ignore stop */
  const sourceKeys = new Set<string>();
  let spikeGrowthDamageDistanceFeet = 0;
  for (const source of fact.sources) {
    const key = areaDifficultTerrainSourceKey(source);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sourceKeys.has(key)) {
      return {
        tag: "invalid",
        message: "Area Difficult Terrain movement fact repeats a source.",
      };
    }
    /* v8 ignore stop */
    sourceKeys.add(key);
    if (source.kind === "spikeGrowthHazard") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        !Number.isInteger(source.damageDistanceFeet) ||
        source.damageDistanceFeet <= 0
      ) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance must be a positive integer.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (Number(source.damageDistanceFeet) > Number(fact.totalDistanceFeet)) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance cannot exceed total Movement distance.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        Number(source.damageDistanceFeet) >
        Number(fact.difficultTerrainDistanceFeet)
      ) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance cannot exceed Difficult Terrain distance.",
        };
      }
      /* v8 ignore stop */
      spikeGrowthDamageDistanceFeet += Number(source.damageDistanceFeet);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!activeAreaDifficultTerrainSourceMatches(state, source)) {
      return {
        tag: "invalid",
        message:
          "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
      };
    }
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    spikeGrowthDamageDistanceFeet > Number(fact.difficultTerrainDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Spike Growth movement damage distances cannot exceed Difficult Terrain distance.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: fact.difficultTerrainDistanceFeet,
  };
}

function validateGustOfWindLineMovementFact(
  state: BattleState,
  fact: BattleGustOfWindLineMovementFact | undefined,
): AreaMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fact.kind !== "gustOfWindLineMovement") {
    return {
      tag: "invalid",
      message: "Gust of Wind Line movement fact has the wrong kind.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.closerDistanceFeet) ||
    fact.closerDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line closer distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Number(fact.closerDistanceFeet) > Number(fact.totalDistanceFeet)) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line closer distance cannot exceed total Movement distance.",
    };
  }
  /* v8 ignore stop */
  const source = state.combatants.get(fact.sourceCombatantId);
  const effect = source?.activeEffects.find(
    (candidate): candidate is GustOfWindLineEffect =>
      candidate.kind === "gustOfWindLine" &&
      candidate.sourceCombatantId === fact.sourceCombatantId &&
      candidate.sourceProcedureRef === fact.sourceProcedureRef &&
      candidate.areaId === fact.areaId &&
      candidate.directionId === fact.directionId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (effect === undefined) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line movement fact does not match an active Gust of Wind Line.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: movementFeet(
      Number(fact.closerDistanceFeet) * (effect.movementCost.multiplier - 1),
    ),
  };
}

type AreaMovementCostFactResult =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly totalDistanceFeet: MovementFeet;
      readonly extraCostFeet: MovementFeet;
    };

const ACROBATIC_MOVEMENT_REPEATED_PATH_MESSAGE =
  "Acrobatic Movement path witness repeats a traversal path.";

const ACROBATIC_MOVEMENT_MISSING_PROFILE_MESSAGE =
  "Acrobatic Movement requires a selected Acrobatic Movement support profile.";

const ACROBATIC_MOVEMENT_EQUIPMENT_MESSAGE =
  "Acrobatic Movement requires the mover to be unarmored and not wielding a Shield.";

const ACROBATIC_MOVEMENT_TURN_MESSAGE =
  "Acrobatic Movement can be used only on the mover's turn.";

function validateAcrobaticMovementFact(
  state: BattleState,
  mover: BattleCreatureState,
  fact: BattleAcrobaticMovementFact | undefined,
): string | null {
  if (fact === undefined) {
    return null;
  }
  const profile = acrobaticMovementProfileForCombatant(mover);
  if (profile === null) {
    return ACROBATIC_MOVEMENT_MISSING_PROFILE_MESSAGE;
  }
  /* v8 ignore start -- Defensive internal guard: movement dispatch admits only the current actor before the typed movement fill reaches this parser. */
  if (currentActorId(state) !== mover.combatantId) {
    return ACROBATIC_MOVEMENT_TURN_MESSAGE;
  }
  /* v8 ignore stop */
  if (
    combatantWearingArmor(state, mover) ||
    combatantWieldingShield(state, mover)
  ) {
    return ACROBATIC_MOVEMENT_EQUIPMENT_MESSAGE;
  }
  const seenPaths = new Set<string>();
  for (const path of fact.paths) {
    if (seenPaths.has(path)) {
      return ACROBATIC_MOVEMENT_REPEATED_PATH_MESSAGE;
    }
    seenPaths.add(path);
  }
  return null;
}

function acrobaticMovementProfileForCombatant(
  combatant: BattleCreatureState,
): Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "acrobaticMovement" }
> | null {
  if (combatant.origin.kind !== "character") {
    return null;
  }
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "acrobaticMovement"
    ) {
      return procedure.execution;
    }
  }
  return null;
}

const CREATURE_SPACE_TRAVERSAL_MISSING_PROFILE_MESSAGE =
  "Creature-space traversal requires a selected occupied-creature-space movement permission profile.";

const CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE =
  "Creature-space traversal cannot name the mover as the occupied creature.";

const CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE =
  "Creature-space traversal movement fact repeats an occupied creature.";

const CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE =
  "Creature-space traversal references an unknown occupied creature.";

const CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE =
  "Creature-space traversal requires each occupied creature to be larger than the mover.";

const CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE =
  "Creature-space traversal cannot end in an occupied creature space.";

const CREATURE_SPACE_TRAVERSAL_VALIDATION_MESSAGES = new Set<string>([
  CREATURE_SPACE_TRAVERSAL_MISSING_PROFILE_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE,
  CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE,
]);

export function isCreatureSpaceTraversalMovementFactValidationMessage(
  message: string,
): boolean {
  return CREATURE_SPACE_TRAVERSAL_VALIDATION_MESSAGES.has(message);
}

function validateCreatureSpaceTraversalMovementFact(
  state: BattleState,
  mover: BattleCreatureState,
  fact: BattleCreatureSpaceTraversalMovementFact | undefined,
): string | null {
  if (fact === undefined) {
    return null;
  }
  if (creatureSpaceMovementPermissionProfileForCombatant(mover) === null) {
    return CREATURE_SPACE_TRAVERSAL_MISSING_PROFILE_MESSAGE;
  }
  const seenOccupants = new Set<CombatantId>();
  for (const occupiedSpace of fact.occupiedSpaces) {
    if (occupiedSpace.occupantId === mover.combatantId) {
      return CREATURE_SPACE_TRAVERSAL_SELF_OCCUPANT_MESSAGE;
    }
    if (seenOccupants.has(occupiedSpace.occupantId)) {
      return CREATURE_SPACE_TRAVERSAL_REPEATED_OCCUPANT_MESSAGE;
    }
    seenOccupants.add(occupiedSpace.occupantId);
    const occupant = state.combatants.get(occupiedSpace.occupantId);
    if (occupant === undefined) {
      return CREATURE_SPACE_TRAVERSAL_UNKNOWN_OCCUPANT_MESSAGE;
    }
    if (
      !creatureSizeIsLargerThanSelf(
        combatantEffectiveSize(mover),
        combatantEffectiveSize(occupant),
      )
    ) {
      return CREATURE_SPACE_TRAVERSAL_SAME_SIZE_MESSAGE;
    }
  }
  if (
    fact.destination.kind === "unoccupiedSpace" &&
    fact.occupiedSpaces.some(
      (occupiedSpace) =>
        occupiedSpace.positionId === fact.destination.positionId,
    )
  ) {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  if (fact.destination.kind === "occupiedCreatureSpace") {
    return CREATURE_SPACE_TRAVERSAL_OCCUPIED_STOP_MESSAGE;
  }
  return null;
}

function creatureSpaceMovementPermissionProfileForCombatant(
  combatant: BattleCreatureState,
): Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "creatureSpaceMovementPermission" }
> | null {
  if (combatant.origin.kind !== "character") {
    return null;
  }
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === "creatureSpaceMovementPermission"
    ) {
      return procedure.execution;
    }
  }
  return null;
}

function validateMovementCostFacts(
  state: BattleState,
  moverId: CombatantId,
  value: BattleMovementFillValue,
): string | null {
  const difficultTerrain = validateAreaDifficultTerrainMovementFact(
    state,
    value.areaDifficultTerrain,
  );
  if (difficultTerrain.tag === "invalid") {
    return difficultTerrain.message;
  }
  const gust = validateGustOfWindLineMovementFact(
    state,
    value.gustOfWindLineMovement,
  );
  if (gust.tag === "invalid") {
    return gust.message;
  }
  const grappleDrag = validateGrappleDragMovementFact(
    state,
    moverId,
    value.grappleDrag,
  );
  if (grappleDrag.tag === "invalid") {
    return grappleDrag.message;
  }
  const areaCosts = [difficultTerrain, gust].filter(
    (
      result,
    ): result is Extract<AreaMovementCostFactResult, { readonly tag: "ok" }> =>
      result.tag === "ok",
  );
  if (areaCosts.length === 0) {
    if (grappleDrag.tag !== "ok") {
      return null;
    }
  }
  if (grappleDrag.tag === "ok" && value.jumpMovementReplacement !== undefined) {
    return "Grapple drag movement facts cannot be combined with Jump movement replacement.";
  }
  if (
    grappleDrag.tag === "ok" &&
    value.levitatedMovement?.altitudeChange !== undefined
  ) {
    return "Grapple drag movement facts cannot be combined with Levitate altitude-change movement.";
  }
  const firstAreaCost = areaCosts[0];
  const allCosts =
    grappleDrag.tag === "ok" ? [...areaCosts, grappleDrag] : areaCosts;
  const firstCost = allCosts[0];
  if (firstCost === undefined) {
    return null;
  }
  const remainingAreaCosts = areaCosts.slice(1);
  if (
    firstAreaCost !== undefined &&
    remainingAreaCosts.some(
      (areaCost) =>
        Number(areaCost.totalDistanceFeet) !==
        Number(firstAreaCost.totalDistanceFeet),
    )
  ) {
    return "Area movement-cost facts must agree on total Movement distance.";
  }
  if (
    allCosts
      .slice(1)
      .some(
        (cost) =>
          Number(cost.totalDistanceFeet) !==
          Number(firstCost.totalDistanceFeet),
      )
  ) {
    return "Movement-cost facts must agree on total Movement distance.";
  }
  if (
    value.jumpMovementReplacement !== undefined ||
    value.levitatedMovement?.altitudeChange !== undefined
  ) {
    return null;
  }
  const expectedCostFeet = movementFeet(
    Number(firstCost.totalDistanceFeet) +
      allCosts.reduce((total, cost) => total + Number(cost.extraCostFeet), 0),
  );
  if (Number(value.movementCostFeet) === Number(expectedCostFeet)) {
    return null;
  }
  if (grappleDrag.tag === "ok" && areaCosts.length > 0) {
    return "Combined movement-cost facts must spend total distance plus all area and non-exempt grapple drag extra movement costs.";
  }
  if (grappleDrag.tag === "ok") {
    return "Grapple drag movement must spend total distance plus 1 extra foot for every foot a non-exempt Grappled target is dragged.";
  }
  if (difficultTerrain.tag === "ok" && gust.tag === "ok") {
    return "Combined area Difficult Terrain and Gust of Wind movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain and 1 extra foot for every foot moved closer to the caster through the Line.";
  }
  return difficultTerrain.tag === "ok"
    ? "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain."
    : "Gust of Wind Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.";
}

type GrappleDragMovementCostFactResult =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly totalDistanceFeet: MovementFeet;
      readonly extraCostFeet: MovementFeet;
    };

function validateGrappleDragMovementFact(
  state: BattleState,
  moverId: CombatantId,
  fact: BattleGrappleDragMovementFact | undefined,
): GrappleDragMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Grapple drag total distance must be a positive integer.",
    };
  }
  /* v8 ignore stop */
  const seenTargets = new Set<CombatantId>();
  let extraCostFeet = 0;
  for (const target of fact.targets) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!Number.isInteger(target.distanceFeet) || target.distanceFeet <= 0) {
      return {
        tag: "invalid",
        message: "Grapple drag target distance must be a positive integer.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (Number(target.distanceFeet) > Number(fact.totalDistanceFeet)) {
      return {
        tag: "invalid",
        message:
          "Grapple drag target distance cannot exceed total Movement distance.",
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seenTargets.has(target.targetId)) {
      return {
        tag: "invalid",
        message: "Grapple drag movement fact repeats a target.",
      };
    }
    /* v8 ignore stop */
    seenTargets.add(target.targetId);
    const link = state.grapples.find(
      (candidate) =>
        candidate.grapplerId === moverId &&
        candidate.targetId === target.targetId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (link === undefined) {
      return {
        tag: "invalid",
        message:
          "Grapple drag movement fact must reference a creature Grappled by the mover.",
      };
    }
    /* v8 ignore stop */
    const grappler = state.combatants.get(link.grapplerId);
    const draggedTarget = state.combatants.get(link.targetId);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (grappler === undefined || draggedTarget === undefined) {
      return {
        tag: "invalid",
        message: "Grapple drag movement fact references a stale Grapple link.",
      };
    }
    /* v8 ignore stop */
    if (!grappleTargetExemptFromDragCost(grappler, draggedTarget)) {
      extraCostFeet += Number(target.distanceFeet);
    }
  }
  return {
    tag: "ok",
    totalDistanceFeet: fact.totalDistanceFeet,
    extraCostFeet: movementFeet(extraCostFeet),
  };
}

function areaMovementExtraCostFeet(
  state: BattleState,
  value: BattleMovementFillValue,
): MovementFeet {
  const difficultTerrain = validateAreaDifficultTerrainMovementFact(
    state,
    value.areaDifficultTerrain,
  );
  const gust = validateGustOfWindLineMovementFact(
    state,
    value.gustOfWindLineMovement,
  );
  return movementFeet(
    [difficultTerrain, gust].reduce(
      (total, result) =>
        result.tag === "ok" ? total + Number(result.extraCostFeet) : total,
      0,
    ),
  );
}

function validateJumpMovementReplacementFact(
  state: BattleState,
  moverId: CombatantId,
  fact: BattleJumpMovementReplacementFact | undefined,
  effect: JumpMovementReplacementEffect | undefined,
  movementCostFeet: MovementFeet,
  areaExtraCostFeet: MovementFeet,
): string | null {
  if (effect === undefined) {
    return fact === undefined
      ? null
      : "Jump movement replacement facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Jump movement replacement requires caller-supplied jump distance and landing facts.";
  }
  const expectedMovementCostFeet = movementFeet(
    Number(effect.movementCostFeet) + Number(areaExtraCostFeet),
  );
  if (movementCostFeet !== expectedMovementCostFeet) {
    return "Jump movement replacement must spend the spell's Movement cost plus any area movement costs.";
  }
  if (!Number.isInteger(fact.distanceFeet) || fact.distanceFeet <= 0) {
    return "Jump movement replacement distance must be a positive integer.";
  }
  if (
    Number(fact.distanceFeet) >
    Number(maxJumpMovementReplacementDistanceFeet(state, moverId, effect))
  ) {
    return "Jump movement replacement distance exceeds the active maximum.";
  }
  return null;
}

function validateCommandApproachMovementFact(
  fact: BattleCommandApproachMovementFact | undefined,
  expected: BattleCommandApproachMovementFact | undefined,
): string | null {
  if (expected === undefined) {
    return fact === undefined
      ? null
      : "Command Approach route facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Command Approach requires caller-supplied route facts.";
  }
  return null;
}

function validateCommandFleeMovementFact(
  fact: BattleCommandFleeMovementFact | undefined,
  expected: BattleCommandFleeMovementFact | undefined,
): string | null {
  if (expected === undefined) {
    return fact === undefined
      ? null
      : "Command Flee route facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Command Flee requires caller-supplied route facts.";
  }
  return null;
}

export function resetStartOfTurnCombatant(
  combatant: BattleCreatureState,
): BattleCreatureState {
  const resetCombatant = {
    ...combatant,
    dodging: false,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
  };
  const wildShape = activeDruidWildShape(resetCombatant);
  if (wildShape !== null) {
    return refreshActiveDruidWildShapeStartTurnExecution(resetCombatant);
  }
  if (resetCombatant.origin.kind !== "statBlock") {
    return resetCombatant;
  }
  return {
    ...resetCombatant,
    origin: {
      ...resetCombatant.origin,
      execution: refreshStatBlockStartTurnExecution(
        resetCombatant.origin.execution,
      ),
    },
  };
}

export function resetPerTurnCharacterResources(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.origin.kind !== "character") {
    return combatant;
  }

  return {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: combatant.origin.resources.map((resource) =>
        characterBattleResourceIsUseCount(resource)
          ? { ...resource, usedThisTurn: false }
          : resource,
      ),
    },
  };
}
