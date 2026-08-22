// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard spell.invocation-grease-ground-hazard spell.invocation-flaming-sphere-hazard-ram spell.invocation-gust-of-wind-line spell.invocation-web-restraint-hazard spell.invocation-insect-plague-area-hazard spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-halt-grovel spell.invocation-command-drop-held-object spell.invocation-command-approach-route spell.invocation-command-flee-route
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-jump-movement-replacement spell.invocation-moonbeam-movable-zone spell.invocation-spike-growth-movement-hazard
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.d20-test-natural-one-reroll unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { enableMovementActionBonusActionExclusion } from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  currentActing,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type Ability,
  DieRollResult,
  movementFeet,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole,
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleCreatureState,
  BattleFill,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleHoleId,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowOutcomeValue,
  BattleSavingThrowRollModeProjection,
  BattleSleepRepeatSavingThrowOutcomeHole,
  BattleSlowActivePenaltiesEndTurnSavingThrowOutcomeHole,
  BattleSpellConditionCountedEndTurnSavingThrowOutcomeHole,
  BattleSpellConditionEndTurnSavingThrowOutcomeHole,
  BattleSpellTurnEndDamageRollHole,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
  BattleStatBlockRechargeRollHole,
  BattleStatBlockRechargeRollResult,
  BattleState,
  BattleTurnResources,
  BattleUnitFeatureConditionEndTurnSavingThrowOutcomeHole,
  SpellTurnStartDamage,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import { characterBattleResourceIsUseCount } from "../character-battle-resource-execution.ts";
import { type BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { refreshStatBlockStartTurnExecution } from "../stat-block-execution-state.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  DEATH_SAVING_THROW_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { applyCommandHaltAtTurnStart } from "./command-halt.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  d20TestNaturalOneRerollDieDecisionRequired,
  d20TestNaturalOneRerollDieIssue,
  d20TestNaturalOneRerollHoleWithOption,
  effectiveD20TestNaturalOneRerollDeathSavingThrow,
} from "./d20-test-natural-one-reroll.ts";
import {
  applyHitPointMaximumIncreaseExpiration,
  applyStartTurnDeathSavingThrow,
  applyTemporaryHitPoints,
  battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks,
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
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { UNIT_FEATURE_CONDITION_END_TURN_SAVE_HOLE_KEY_PREFIX } from "./domain-constants.ts";
import {
  activeDruidWildShape,
  refreshActiveDruidWildShapeStartTurnExecution,
} from "./druid-wild-shape.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "./fly-speed-grant-end-fall-cleanup.ts";
import { hideousLaughterRepeatSavingThrowOutcomeHole } from "./hideous-laughter-repeat-save.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { slowActionOrBonusActionTurnResources } from "./slow-active-penalties-runtime.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources,
  combatantsAfterHideousLaughterSpellEndedIfNoEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
  conditionsAfterApplyingSpellConditionEffects,
  conditionsAfterExpiringSpellConditionEffects,
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
import {
  expireBattleLightEmitters,
  resetAllCloudkillSavedThisTurn,
  resetAllInsectPlagueSavedThisTurn,
  resetAllMoonbeamSavedThisTurn,
  resetAllSleetStormSavedThisTurn,
  resetAllWebSavedThisTurn,
  tickDurationBattleLightEmitters,
} from "./spells-active-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import type { HideousLaughterEffect } from "./hideous-laughter-repeat-save.ts";
import { hideousLaughterEffects } from "./hideous-laughter-repeat-save.ts";
import { resetBattleTurnResources } from "./turn-resource-reset.ts";
import {
  collectTurnBoundaryHoleFills,
  firstMissingEndTurnSaveHoleFrontier,
  firstMissingTurnBoundaryDamageHoleFrontier,
} from "./turn-boundary-hole-frontier.ts";
type ResolvedTurnBoundaryFills = {
  readonly state: BattleState;
  readonly deathSavingThrowRoll: DieRollResult | undefined;
  readonly statBlockRechargeRolls: readonly BattleStatBlockRechargeRollResult[];
  readonly sleepRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly hideousLaughterRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly spellConditionEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly spellConditionCountedEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly unitFeatureConditionEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly slowActivePenaltiesEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly abilityD20TestRollModeEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly spellTurnEndDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[];
  readonly spellTurnStartDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[];
  readonly spellTurnStartSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly turnBoundaryHideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[];
};

function resolveEndTurn({
  state,
  deathSavingThrowRoll,
  statBlockRechargeRolls,
  sleepRepeatSaves,
  hideousLaughterRepeatSaves,
  spellConditionEndTurnSaves,
  spellConditionCountedEndTurnSaves,
  unitFeatureConditionEndTurnSaves,
  slowActivePenaltiesEndTurnSaves,
  abilityD20TestRollModeEndTurnSaves,
  spellTurnEndDamageRolls,
  spellTurnStartDamageRolls,
  spellTurnStartSaves,
  turnBoundaryHideousLaughterDamageRepeatSaves,
  concentrationSavingThrows,
  damageDispositions,
}: ResolvedTurnBoundaryFills): Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
> {
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
  const readiedResponses = new Map(state.readiedResponses);
  for (const [actorId, readiedResponse] of state.readiedResponses) {
    if (readiedResponse.expiresAt.combatantId === nextActorId) {
      readiedResponses.delete(actorId);
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
      readiedResponses,
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
  const combatantsAfterRecharge = processStatBlockRechargeRolls(
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
  const stateAfterCommandHalt = applyCommandHaltAtTurnStart({
    ...stateAfterSleepRepeatSaves,
    combatants: combatantsAfterDamageReductionReset,
    initiative,
    currentTurnResources: resetTurnResources,
  });
  const currentTurnResourcesAfterSlow = slowActionOrBonusActionTurnResources(
    stateAfterCommandHalt.currentTurnResources,
    stateAfterCommandHalt.combatants.get(nextActorId),
  );
  const currentTurnResourcesAfterActionRestriction =
    moveActionBonusActionTurnResources(
      currentTurnResourcesAfterSlow,
      stateAfterCommandHalt.combatants.get(nextActorId),
    );
  const nextState = battleStateWithFlySpeedGrantEndFallCleanupFrames(
    {
      ...stateAfterSleepRepeatSaves,
      initiative,
      combatants: stateAfterCommandHalt.combatants,
      lightEmitters: lightEmittersAfterDurationTick,
      currentTurnResources: currentTurnResourcesAfterActionRestriction,
      readiedSpells,
      readiedResponses,
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

function moveActionBonusActionTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasMoveActionBonusActionRestriction(actor)
    ? enableMovementActionBonusActionExclusion(
        resources,
        Number(actor.movementSpentFeet) > 0,
      )
    : resources;
}

function combatantHasMoveActionBonusActionRestriction(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return (
    combatant !== undefined &&
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "unitFeatureCondition" &&
        effect.turnRestriction?.kind === "moveActionOrBonusAction",
    )
  );
}

function resetSpellDamageReductionsForNewTurn(
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

function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const shouldExpire = (effect: BattleActiveEffect) =>
    effect.kind === "brutalStrikeHamstring"
      ? effect.sourceCombatantId === actorId
      : "expiresAt" in effect &&
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

function applyStartOfTurnActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Defensive inconsistent-state guard: battle admission and turn reducers keep every initiative combatant in the combatant map before start-of-turn effects run. */
  if (actor === undefined) {
    return combatants;
  }
  /* v8 ignore stop -- @preserve */
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

function spellTurnStartDamageEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellTurnStartDamageEffect[] {
  /* v8 ignore start -- @preserve -- Defensive inconsistent-state guard: end-turn routing derives the next actor from admitted initiative entries, whose combatants remain in the battle map. */
  if (combatant === undefined) {
    return [];
  }
  /* v8 ignore stop -- @preserve */
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

function spellTurnEndDamageEffects(
  combatant: BattleCreatureState | undefined,
  actorId: CombatantId,
  round: RoundType,
): readonly SpellTurnEndDamageEffect[] {
  /* v8 ignore start -- @preserve -- Defensive inconsistent-state guard: the dispatcher rejects a missing current actor before turn-end damage discovery. */
  if (combatant === undefined) {
    return [];
  }
  /* v8 ignore stop -- @preserve */
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

function spellTurnEndDamageRollHole(
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

function spellTurnStartDamageRollHole(
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
  target: BattleCreatureState,
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
  return applyPreparedSlotSpellDamage(
    state,
    target.combatantId,
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
  /* v8 ignore start -- @preserve -- Malformed fill: a turn-start spell save hole is single-target and cannot carry area geometry. */
  if ("area" in value) {
    return "Turn-start spell Saving Throw outcome must not include area facts.";
  }
  /* v8 ignore stop -- @preserve */
  if (value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId) {
    return null;
  }
  /* v8 ignore next -- @preserve -- Malformed fill: the discovered turn-start spell save hole names exactly the combatant whose turn is starting. */
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

export type SlowActivePenaltiesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
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

function activeEffectsMatching<Effect extends BattleActiveEffect>(
  combatant: BattleCreatureState | undefined,
  isEffect: (effect: BattleActiveEffect) => effect is Effect,
): readonly Effect[] {
  return combatant?.activeEffects.filter(isEffect) ?? [];
}

function sleepPendingRepeatSaveEffects(
  combatant: BattleCreatureState | undefined,
  actorId: CombatantId,
  round: RoundType,
): readonly SleepPendingRepeatSaveEffect[] {
  return activeEffectsMatching(
    combatant,
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
  return activeEffectsMatching(
    combatant,
    (effect): effect is SpellConditionEndTurnSaveEffect =>
      effect.kind === "spellConditionEndTurnSave",
  );
}

function spellConditionCountedEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellConditionCountedEndTurnSaveEffect[] {
  return activeEffectsMatching(
    combatant,
    (effect): effect is SpellConditionCountedEndTurnSaveEffect =>
      effect.kind === "spellConditionCountedEndTurnSave" && !effect.lockedIn,
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
  return activeEffectsMatching(
    combatant,
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
  return activeEffectsMatching(
    combatant,
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
  return activeEffectsMatching(
    combatant,
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
  /* v8 ignore start -- @preserve -- Malformed fill: a Sleep repeat-save hole is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Sleep repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleep repeat Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop -- @preserve */
}

function validateSpellConditionEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a spell-condition end-turn save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Spell condition end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Spell condition end-turn Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop -- @preserve */
}

function validateSlowActivePenaltiesEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  /* v8 ignore start -- @preserve -- Malformed fill: a Slow end-turn save is single-target and cannot carry area geometry or an outcome for a different combatant. */
  if ("area" in value) {
    return "Slow end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Slow end-turn Saving Throw outcome must match the ending-turn target.";
  /* v8 ignore stop -- @preserve */
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
  return afterActiveEffectOccurrenceUpdate(
    updateCombatantWithActiveEffectOccurrence(
      combatants,
      targetId,
      expiringEffect,
      (target) => ({
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
    ),
    (updatedCombatants) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        updatedCombatants,
        expiringEffect,
      ),
  );
}

function removeSpellConditionEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect:
    | SpellConditionEndTurnSaveEffect
    | SpellConditionCountedEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return afterActiveEffectOccurrenceUpdate(
    updateCombatantWithActiveEffectOccurrence(
      combatants,
      targetId,
      expiringEffect,
      (target) => {
        const activeEffects = target.activeEffects.filter(
          (effect) => effect !== expiringEffect,
        );
        return battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffects,
          conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        );
      },
    ),
    (updatedCombatants) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        updatedCombatants,
        expiringEffect,
      ),
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
  return updateCombatantWithActiveEffectOccurrence(
    combatants,
    targetId,
    effect,
    (target) => ({
      ...target,
      activeEffects: target.activeEffects.map((candidate) =>
        candidate === effect ? { ...effect, ...patch } : candidate,
      ),
    }),
  ).combatants;
}

function removeUnitFeatureConditionEndTurnSaveEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: UnitFeatureConditionEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return updateCombatantWithActiveEffectOccurrence(
    combatants,
    targetId,
    expiringEffect,
    (target) => {
      const activeEffects = target.activeEffects.filter(
        (effect) => effect !== expiringEffect,
      );
      return battleCreatureWithActiveEffectsAndConditions(
        target,
        activeEffects,
        conditionsAfterExpiringSpellConditionEffects(
          target.conditions,
          activeEffects,
          [expiringEffect],
        ),
      );
    },
  ).combatants;
}

function removeSlowActivePenaltiesEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: SlowActivePenaltiesEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return afterActiveEffectOccurrenceUpdate(
    updateCombatantWithActiveEffectOccurrence(
      combatants,
      targetId,
      expiringEffect,
      (target) => ({
        ...target,
        activeEffects: target.activeEffects.filter(
          (effect) => effect !== expiringEffect,
        ),
      }),
    ),
    (updatedCombatants) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        updatedCombatants,
        expiringEffect,
      ),
  );
}

function removeHideousLaughterEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: HideousLaughterEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return afterActiveEffectOccurrenceUpdate(
    updateCombatantWithActiveEffectOccurrence(
      combatants,
      targetId,
      expiringEffect,
      (target) => {
        const activeEffects = target.activeEffects.filter(
          (effect) => effect !== expiringEffect,
        );
        return battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffects,
          conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        );
      },
    ),
    (updatedCombatants) =>
      combatantsAfterHideousLaughterSpellEndedIfNoEffects(
        updatedCombatants,
        expiringEffect,
      ),
  );
}

export type ActiveEffectOccurrenceUpdate =
  | {
      readonly tag: "updated";
      readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
    }
  | {
      readonly tag: "unchanged";
      readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
    };

export function afterActiveEffectOccurrenceUpdate(
  result: ActiveEffectOccurrenceUpdate,
  onUpdated: (
    combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  ) => ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  if (result.tag === "unchanged") {
    return result.combatants;
  }
  return onUpdated(result.combatants);
}

export function updateCombatantWithActiveEffectOccurrence<
  Effect extends BattleActiveEffect,
>(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  effectOccurrence: Effect,
  update: (target: BattleCreatureState) => BattleCreatureState,
): ActiveEffectOccurrenceUpdate {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === effectOccurrence)
  ) {
    return { tag: "unchanged", combatants };
  }
  return {
    tag: "updated",
    combatants: new Map(combatants).set(targetId, update(target)),
  };
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
      target,
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

function expireEndOfTurnEffects(
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

function expireActiveEffects(
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

function expireStartOfTurnOngoingFeatures(
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

function expireEndOfTurnOngoingFeatures(
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

function expireOngoingFeatures(
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
    (fill) => !isEndTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn does not accept battle fills for unrelated subjects.",
    );
  }
  /* v8 ignore stop -- @preserve */

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
      endTurnSavingThrowFlatBonuses(input.state, actorId, effect.save.ability),
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
        endTurnSavingThrowFlatBonuses(
          input.state,
          actorId,
          effect.save.ability,
        ),
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
      endTurnSavingThrowFlatBonuses(input.state, actorId, effect.save.ability),
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
        endTurnSavingThrowFlatBonuses(
          input.state,
          actorId,
          effect.save.ability,
        ),
      ),
    }));
  const unitFeatureConditionEndTurnSaveRequests =
    unitFeatureConditionEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: unitFeatureConditionEndTurnSavingThrowOutcomeHole(
        actorId,
        effect,
        input.state,
        endTurnSavingThrowFlatBonuses(
          input.state,
          actorId,
          effect.save.ability,
        ),
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
      endTurnSavingThrowFlatBonuses(input.state, actorId, effect.save.ability),
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
        endTurnSavingThrowFlatBonuses(
          input.state,
          actorId,
          effect.save.ability,
        ),
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
              /* v8 ignore next -- @preserve -- Internal turn-boundary invariant: this callback only runs for a start-turn effect read from nextActor, so nextActor cannot be absent here. */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    savingThrowOutcomeFills.some((fill) => fill.relationshipFacts !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Turn-boundary Saving Throw relationship facts were not requested.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  const sleepRepeatSaveCollection = collectTurnBoundaryHoleFills(
    sleepRepeatSaveRequests,
    (hole) => sleepRepeatSavingThrowOutcomeFor(savingThrowOutcomeFills, hole),
  );
  const sleepRepeatSaves = sleepRepeatSaveCollection.resolved.map(
    ({ fill }) => fill,
  );
  const hideousLaughterRepeatSaveCollection = collectTurnBoundaryHoleFills(
    hideousLaughterRepeatSaveRequests,
    (hole) =>
      hideousLaughterRepeatSavingThrowOutcomeFor(savingThrowOutcomeFills, hole),
  );
  const hideousLaughterRepeatSaves =
    hideousLaughterRepeatSaveCollection.resolved.map(({ fill }) => fill);
  const spellConditionEndTurnSaveCollection = collectTurnBoundaryHoleFills(
    spellConditionEndTurnSaveRequests,
    (hole) =>
      spellConditionEndTurnSavingThrowOutcomeFor(savingThrowOutcomeFills, hole),
  );
  const spellConditionEndTurnSaves =
    spellConditionEndTurnSaveCollection.resolved.map(({ fill }) => fill);
  const spellConditionCountedEndTurnSaveCollection =
    collectTurnBoundaryHoleFills(
      spellConditionCountedEndTurnSaveRequests,
      (hole) =>
        spellConditionCountedEndTurnSavingThrowOutcomeFor(
          savingThrowOutcomeFills,
          hole,
        ),
    );
  const spellConditionCountedEndTurnSaves =
    spellConditionCountedEndTurnSaveCollection.resolved.map(({ fill }) => fill);
  const unitFeatureConditionEndTurnSaveCollection =
    collectTurnBoundaryHoleFills(
      unitFeatureConditionEndTurnSaveRequests,
      (hole) =>
        unitFeatureConditionEndTurnSavingThrowOutcomeFor(
          savingThrowOutcomeFills,
          hole,
        ),
    );
  const unitFeatureConditionEndTurnSaves =
    unitFeatureConditionEndTurnSaveCollection.resolved.map(({ fill }) => fill);
  const slowActivePenaltiesEndTurnSaveCollection = collectTurnBoundaryHoleFills(
    slowActivePenaltiesEndTurnSaveRequests,
    (hole) =>
      slowActivePenaltiesEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        hole,
      ),
  );
  const slowActivePenaltiesEndTurnSaves =
    slowActivePenaltiesEndTurnSaveCollection.resolved.map(({ fill }) => fill);
  const abilityD20TestEndTurnSaveCollection = collectTurnBoundaryHoleFills(
    abilityD20TestEndTurnSaveRequests,
    (hole) =>
      abilityD20TestRollModeEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        hole,
      ),
  );
  const abilityD20TestEndTurnSaves =
    abilityD20TestEndTurnSaveCollection.resolved.map(({ fill }) => fill);
  const missingEndTurnSaveHoles = firstMissingEndTurnSaveHoleFrontier({
    sleepRepeat: sleepRepeatSaveCollection.missingHoles,
    hideousLaughterRepeat: hideousLaughterRepeatSaveCollection.missingHoles,
    spellCondition: spellConditionEndTurnSaveCollection.missingHoles,
    countedSpellCondition:
      spellConditionCountedEndTurnSaveCollection.missingHoles,
    unitFeatureCondition:
      unitFeatureConditionEndTurnSaveCollection.missingHoles,
    slowActivePenalties: slowActivePenaltiesEndTurnSaveCollection.missingHoles,
    abilityD20TestRollMode: abilityD20TestEndTurnSaveCollection.missingHoles,
  });
  if (missingEndTurnSaveHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingEndTurnSaveHoles,
    );
  }
  const endTurnDamageRollCollection = collectTurnBoundaryHoleFills(
    endTurnDamageRequests,
    (hole) => spellTurnEndDamageRollFor(input.fills, hole),
  );
  const endTurnDamageRolls = endTurnDamageRollCollection.resolved.map(
    ({ fill }) => fill,
  );
  const endTurnDamageRollRequests = endTurnDamageRollCollection.resolved.map(
    ({ request, fill: roll }) => ({ ...request, roll }),
  );
  const startTurnDamageRollCollection = collectTurnBoundaryHoleFills(
    startTurnDamageRequests,
    (hole) => spellTurnStartDamageRollFor(input.fills, hole),
  );
  const startTurnDamageRolls = startTurnDamageRollCollection.resolved.map(
    ({ fill }) => fill,
  );
  const startTurnDamageRollRequests =
    startTurnDamageRollCollection.resolved.map(({ request, fill: roll }) => ({
      ...request,
      roll,
    }));
  const missingTurnBoundaryDamageHoles =
    firstMissingTurnBoundaryDamageHoleFrontier({
      endTurn: endTurnDamageRollCollection.missingHoles,
      startTurn: startTurnDamageRollCollection.missingHoles,
    });
  if (missingTurnBoundaryDamageHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingTurnBoundaryDamageHoles,
    );
  }
  const turnBoundaryDamageHoleIds = new Set<BattleHoleId>(
    [...endTurnDamageHoles, ...startTurnDamageHoles].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  const startTurnSaveCollection = collectTurnBoundaryHoleFills(
    startTurnSaveRequests,
    (hole) =>
      spellTurnStartSavingThrowOutcomeFor(savingThrowOutcomeFills, hole),
  );
  const startTurnSaves = startTurnSaveCollection.resolved.map(
    ({ fill }) => fill,
  );
  const missingStartTurnSaveHoles = startTurnSaveCollection.missingHoles;
  if (missingStartTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnSaveHoles,
    ]);
  }
  const endTurnHideousLaughterDamageRepeatSaveChecks =
    endTurnDamageRollRequests.map((request) => {
      /* v8 ignore start -- @preserve -- Internal turn-boundary invariant: endTurnDamageRollRequests can contain an entry only when that effect was read from actor. */
      if (actor === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidEndTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidEndTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Internal turn-boundary invariant: startTurnDamageRollRequests can contain an entry only when that effect was read from nextActor. */
      if (nextActor === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidStartTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidStartTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
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
  const startTurnHideousLaughterDamageRepeatSaves = fillsMatchingHoleIds(
    savingThrowOutcomeFills,
    startTurnHideousLaughterDamageRepeatSaveHoles,
  );
  const endTurnHideousLaughterDamageRepeatSaves = fillsMatchingHoleIds(
    savingThrowOutcomeFills,
    endTurnHideousLaughterDamageRepeatSaveHoles,
  );
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  for (const { fill } of sleepRepeatSaveCollection.resolved) {
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of slowActivePenaltiesEndTurnSaveCollection.resolved) {
    const validation = validateSlowActivePenaltiesEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of hideousLaughterRepeatSaveCollection.resolved) {
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of spellConditionEndTurnSaveCollection.resolved) {
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of spellConditionCountedEndTurnSaveCollection.resolved) {
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of unitFeatureConditionEndTurnSaveCollection.resolved) {
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of abilityD20TestEndTurnSaveCollection.resolved) {
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const fill of startTurnHideousLaughterDamageRepeatSaves) {
    const hole = startTurnHideousLaughterDamageRepeatSaveHoles.find(
      (candidate) => candidate.holeId === fill.holeId,
    );
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      hole?.hideousLaughterRepeatSave.targetId ?? nextActorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const fill of endTurnHideousLaughterDamageRepeatSaves) {
    const hole = endTurnHideousLaughterDamageRepeatSaveHoles.find(
      (candidate) => candidate.holeId === fill.holeId,
    );
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      hole?.hideousLaughterRepeatSave.targetId ?? actorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const { fill } of startTurnSaveCollection.resolved) {
    const validation = validateSpellTurnStartSavingThrowOutcome(
      fill.value,
      nextActorId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const request of endTurnDamageRollRequests) {
    const validation = validateRolledDiceFillForDiceExpr(
      request.roll,
      request.effect.damage.expr,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  for (const request of startTurnDamageRollRequests) {
    const damage = spellTurnStartDamageForEffect(request.effect);
    const validation = validateRolledDiceFillForDiceExpr(
      request.roll,
      damage.expr,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }
  const endTurnConcentrationHoles = endTurnDamageRollRequests.flatMap(
    (request) => {
      const target = actor;
      /* v8 ignore start -- @preserve -- Internal turn-boundary invariant: an end-turn damage request exists only when its target actor supplied the source effect. */
      if (target === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Internal turn-boundary invariant: a start-turn damage request exists only when its target nextActor supplied the source effect. */
      if (target === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollIssue !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      );
    }
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  const effectiveDeathSavingThrowFill =
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? effectiveD20TestNaturalOneRerollDeathSavingThrow(deathSavingThrowFill)
      : undefined;

  return resolveEndTurn({
    state: input.state,
    deathSavingThrowRoll: effectiveDeathSavingThrowFill?.value,
    statBlockRechargeRolls:
      rechargeRollFill?.kind === "statBlockRechargeRoll"
        ? rechargeRollFill.value
        : [],
    sleepRepeatSaves,
    hideousLaughterRepeatSaves,
    spellConditionEndTurnSaves,
    spellConditionCountedEndTurnSaves,
    unitFeatureConditionEndTurnSaves,
    slowActivePenaltiesEndTurnSaves,
    abilityD20TestRollModeEndTurnSaves: abilityD20TestEndTurnSaves,
    spellTurnEndDamageRolls: endTurnDamageRolls,
    spellTurnStartDamageRolls: startTurnDamageRolls,
    spellTurnStartSaves: startTurnSaves,
    turnBoundaryHideousLaughterDamageRepeatSaves,
    concentrationSavingThrows: concentrationSavingThrowFills,
    damageDispositions: damageDispositionFills,
  });
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

export function isEndTurnFillKind(kind: BattleFill["kind"]): boolean {
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
    /* v8 ignore next -- @preserve -- DieRollResult is parsed as a PositiveInteger, so only the d6 upper bound remains a reachable recharge-fill failure. */
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

function resetStartOfTurnCombatant(
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

function resetPerTurnCharacterResources(
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
