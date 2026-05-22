// Turn-end, movement command, opportunity-attack, and readied-release resolution
// extracted from ../battle-reducer.ts. Mechanical move; no behavior change
// intended.

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-grease-ground-hazard spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { Either, Match } from "effect";

import {
  resetTurnActionEconomy,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";

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
  type Round as RoundType,
} from "@dnd/shared/types";

import {
  type BattleMovementSpeedKind,
  type BattleSubject,
} from "../battle-subjects.ts";
import { characterBattleResourceIsUseCount } from "../character-battle-resources.ts";

import { type BattleReactionTrigger } from "../battle-reaction-triggers.ts";

import {
  battleObjectId,
  type BattleObjectId,
  CombatantId,
} from "../identity.ts";

import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";

import { attackActionOptionsForActor } from "./attack-damage-apply.ts";

import { currentActorId } from "./creature-state-leaves.ts";

import {
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeActions,
} from "./creature-state.ts";

import {
  applyStartTurnDeathSavingThrow,
  applyHitPointMaximumIncreaseExpiration,
  applyTemporaryHitPoints,
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

import { maybeOpenReactionWindow, snapshotBattle } from "./dispatcher.ts";

import { hideousLaughterRepeatSavingThrowOutcomeHole } from "./hideous-laughter-repeat-save.ts";

import { needsHolesResult } from "./hole-helpers.ts";
import { maxJumpMovementReplacementDistanceFeet } from "./jump-movement-replacement.ts";
import { validateLevitatedMovementFact } from "./levitate-creature.ts";
export { resolveOpportunityAttackCommand } from "./opportunity-attacks.ts";
export {
  applyBattleMovement,
  readiedSpellInitialHoles,
  readiedMovementInitialHoles,
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
} from "./readied-release.ts";
import { applyBattleMovement } from "./readied-release.ts";

import {
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  combatantCanMoveWithBudget,
  effectiveMovementSpeed,
  effectiveWalkSpeed,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";

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

import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

import {
  applyPreparedSlotSpellDamage,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";
import {
  activeDruidWildShape,
  updateActiveDruidWildShapeResources,
} from "./druid-wild-shape.ts";
import {
  applyCommandGrovelProneToTarget,
  applyGreaseProneToTarget,
  applyWebRestrainedCondition,
  expireBattleLightEmitters,
  addMoonbeamShapeShiftSuppression,
  markWebSavedThisTurn,
  markMoonbeamSavedThisTurn,
  removeMoonbeamShapeShiftSuppression,
  removeWebRestrainedCondition,
  replaceGustOfWindLineDirection,
  resetAllMoonbeamSavedThisTurn,
  resetAllWebSavedThisTurn,
  tickDurationBattleLightEmitters,
} from "./spells-active-effects.ts";
import { revertShapeShiftedCombatantToTrueForm } from "./shape-shifting.ts";
import { validateGustOfWindLineAreaPushFacts } from "./spells-resolve-save-gates.ts";

import {
  attackActionOptionName,
  attackTargetConstraint,
} from "./statblock-attacks.ts";

import {
  refreshStatBlockStartTurnResources,
  sameStatBlockPartKey,
} from "./statblock.ts";

import type {
  ActiveOngoingFeatureOccurrence,
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleCommandApproachMovementFact,
  BattleCommandFleeMovementFact,
  BattleCommandHaltTurnSuppression,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleFlamingSphereDamageRollHole,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereSavingThrowOutcomeHole,
  BattleFlamingSphereTrigger,
  BattleAreaDifficultTerrainMovementFact,
  BattleAreaDifficultTerrainSource,
  BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole,
  BattleGustOfWindLineDirectionChoiceHole,
  BattleGustOfWindLineMovementFact,
  BattleGustOfWindLineSavingThrowOutcomeHole,
  BattleMoonbeamDamageRollHole,
  BattleMoonbeamSaveTrigger,
  BattleMoonbeamSavingThrowOutcomeHole,
  BattleMovableZoneRepositionMovementHole,
  BattleGrappleLink,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleSpikeGrowthMovementDamageRollHole,
  BattleWebRestraintSavingThrowOutcomeHole,
  BattleWebRestraintTrigger,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleHeldObjectFactsHole,
  BattleHoleId,
  BattleJumpMovementReplacementFact,
  BattleMovementHole,
  BattleMovementFillValue,
  BattleOpportunityAttackThreat,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleSleepRepeatSavingThrowOutcomeHole,
  BattleSpellAreaChoice,
  BattleSpellConditionEndTurnSavingThrowOutcomeHole,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
  BattleStatBlockRechargeRollHole,
  BattleStatBlockRechargeRollResult,
  BattleState,
  BattleTurnResources,
  BattleSavingThrowOutcomeValue,
  BattleSavingThrowFlatBonusProjection,
  SpellTurnStartDamage,
} from "../battle-reducer.ts";
import {
  DEATH_SAVING_THROW_HOLE_ID,
  MOVEMENT_HOLE_ID,
  MOVEMENT_HOLE_INSTANCE,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
} from "../battle-reducer.ts";
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
  abilityD20TestRollModeEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellTurnStartDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [],
  spellTurnStartSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellTurnStartHideousLaughterDamageRepeatSaves: readonly Extract<
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
  let combatantsAfterExpiredReadiedSpells = afterDeathSavingThrow;
  for (const casterId of expiringReadiedSpellCasterIds) {
    combatantsAfterExpiredReadiedSpells = breakCombatantConcentration(
      combatantsAfterExpiredReadiedSpells,
      casterId,
    );
  }
  const combatantsAfterEndTurnOngoingFeatures = expireEndOfTurnOngoingFeatures(
    combatantsAfterExpiredReadiedSpells,
    currentActorId(state),
    state.initiative.round,
  );
  const combatantsAfterSleepRepeatSaves = applySleepRepeatSaveFills(
    combatantsAfterEndTurnOngoingFeatures,
    currentActorId(state),
    state.initiative.round,
    sleepRepeatSaves,
  );
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
  const combatantsAfterAbilityD20TestRepeatSaves =
    applyAbilityD20TestRollModeEndTurnSaveFills(
      combatantsAfterSpellConditionRepeatSaves,
      currentActorId(state),
      abilityD20TestRollModeEndTurnSaves,
    );
  const combatantsAfterEndEffects = expireEndOfTurnEffects(
    combatantsAfterAbilityD20TestRepeatSaves,
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
  const combatantsAfterStartTurnEffects = applyStartOfTurnActiveEffects(
    combatantsAfterWebSaveReset,
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
    spellTurnStartHideousLaughterDamageRepeatSaves,
  ).combatants;
  const combatantsAfterDurationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationEffects(combatantsAfterSpellTurnStartDamage)
      : combatantsAfterSpellTurnStartDamage;
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
  const resetTurnResources = resetBattleTurnResources(
    state.currentTurnResources,
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
  const combatantsAfterCommandHalt =
    commandHalt === null
      ? combatantsAfterDamageReductionReset
      : combatantsWithCommandHaltMovementSpent(
          combatantsAfterDamageReductionReset,
          state.grapples,
          nextActorId,
        );
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterCommandHalt,
    lightEmitters: lightEmittersAfterDurationTick,
    currentTurnResources,
    readiedSpells,
    readiedMovements,
    helpAttacks,
    legendaryActionWindow: {
      afterTurnActorId: currentActorId(state),
      consumed: false,
    },
  };

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
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

function combatantsWithCommandHaltMovementSpent(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  grapples: readonly BattleGrappleLink[],
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  if (actor === undefined) {
    return combatants;
  }

  const isGrappled = grapples.some((grapple) => grapple.targetId === actorId);
  const spentFeet = Math.max(
    Number(actor.movementSpentFeet),
    ...representedMovementSpeedKinds(actor).map((kind) =>
      Number(effectiveMovementSpeed(actor, kind, isGrappled)),
    ),
  );

  return new Map(combatants).set(actorId, {
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
  if (actor === undefined) {
    return combatants;
  }
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
  if (combatant === undefined) {
    return [];
  }
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
  const key = `battle:spell-turn-start-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} turn-start damage (${expr})`,
    spellTurnStartDamage: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
  target: BattleCreatureState,
  effect: SpellTurnStartDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const damage = spellTurnStartDamageForEffect(effect);
  return damageAmountAfterTargetAdjustments(
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
    spellTurnStartDamageAmount(target, effect, roll),
    {
      concentrationSavingThrow,
      wardingBondDamageShareConcentrationSavingThrows,
      damageDisposition,
      hideousLaughterDamageRepeatSaves,
      damageSourceId: effect.sourceCombatantId,
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
  const key = `battle:spell-turn-start-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} turn-start ${effect.save.ability.toUpperCase()} save`,
    spellTurnStartSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
  if ("area" in value) {
    return "Turn-start spell Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Turn-start spell Saving Throw outcome must match the starting-turn target.";
}

type SleepPendingRepeatSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleepPendingRepeatSave" }
>;
type SpellConditionEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionEndTurnSave" }
>;
type AbilityD20TestRollModeEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "abilityD20TestRollModeEndTurnSave" }
>;
type HideousLaughterEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
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
  const key = `battle:sleep-repeat-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} repeat WIS save`,
    sleepRepeatSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
    effect.sourceSpellId,
    effect.condition,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${effect.condition} end-turn save`,
    spellConditionEndTurnSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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

function spellConditionEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellConditionEndTurnSavingThrowOutcomeHole,
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
    effect.sourceSpellId,
    effect.ability,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${effect.ability.toUpperCase()} D20 Test end-turn save`,
    abilityD20TestRollModeEndTurnSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
  if ("area" in value) {
    return "Sleep repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleep repeat Saving Throw outcome must match the ending-turn target.";
}

function validateSpellConditionEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Spell condition end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Spell condition end-turn Saving Throw outcome must match the ending-turn target.";
}

export type GreaseGroundHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "greaseGroundHazard" }
>;
export type WebRestraintHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "webRestraintHazard" }
>;
export type FlamingSphereEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "flamingSphere" }
>;
export type MoonbeamEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "moonbeam" }
>;
export type GustOfWindLineEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "gustOfWindLine" }
>;
export type CommandPendingEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "commandPending" }
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
        effect.sourceSpellId === subject.sourceSpellId &&
        effect.sourceCombatantId === subject.sourceCombatantId,
    ) ?? null
  );
}

export function commandPendingEffectsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CommandPendingEffect[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.filter(
    (effect): effect is CommandPendingEffect =>
      effect.kind === "commandPending" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === state.initiative.round,
  );
}

const COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:command-drop:held-object-facts",
);

export function commandDropHeldObjectFactsHole(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHeldObjectFactsHole {
  return {
    holeInstanceKey: COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE,
    holeId: commandDropHeldObjectFactsHoleId(subject),
    kind: "heldObjectFacts",
    label: "Command Drop held-object facts",
    actorId: subject.actorId,
  };
}

function commandDropHeldObjectFactsHoleId(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHoleId {
  return holeId(
    `battle:command-drop:held-object-facts:${subject.actorId}:${subject.sourceCombatantId}:${subject.sourceSpellId}`,
  );
}

export function canonicalHeldObjectIdsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleObjectId[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const loadout = actor.origin.selectedLoadout;
  return [
    ...(loadout.weapon === undefined
      ? []
      : [battleObjectId(loadout.weapon.itemId)]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [battleObjectId(loadout.offHandWeapon.itemId)]),
    ...(loadout.shield === undefined ? [] : [battleObjectId(loadout.shield)]),
  ];
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Grovel is no longer pending for this actor.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Grovel only accepts End Turn fills.",
    );
  }
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Drop is no longer pending for this actor.",
    );
  }
  const heldObjectFactFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      fill.kind === "heldObjectFacts",
  );
  if (heldObjectFactFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts were filled twice.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "heldObjectFacts" && !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop only accepts held-object facts and End Turn fills.",
    );
  }

  const canonicalObjectIds = canonicalHeldObjectIdsForActor(
    input.state,
    input.subject.actorId,
  );
  if (canonicalObjectIds !== null && heldObjectFactFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop uses canonical character loadout facts for this actor.",
    );
  }
  const heldObjectFactFill = heldObjectFactFills[0];
  if (canonicalObjectIds === null && heldObjectFactFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      commandDropHeldObjectFactsHole(input.subject),
    ]);
  }
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
  const objectIds = canonicalObjectIds ?? heldObjectFactFill?.value.objectIds;
  if (objectIds === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop requires known held-object facts.",
    );
  }
  const uniqueObjectIds = new Set(objectIds);
  if (uniqueObjectIds.size !== objectIds.length) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must not duplicate objects.",
    );
  }

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
      kind: "heldObjectDropped",
      actorId: input.subject.actorId,
      objectId,
      sourceCombatantId: input.subject.sourceCombatantId,
      sourceSpellId: input.subject.sourceSpellId,
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      if (input.fills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Command Approach cannot apply fills when no movement is available.",
        );
      }
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
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach accepts one Movement fill.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) =>
      fill.kind !== "movement" &&
      !endTurnFillKind(fill.kind) &&
      !spikeGrowthMovementEffectFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach only accepts Movement, Spike Growth damage, and End Turn fills.",
    );
  }
  const movementFill = movementFills[0]!;
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Approach hole.",
    );
  }
  const approachFact = movementFill.value.commandApproach;
  if (approachFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach requires caller-supplied shortest/direct route and proximity facts.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandApproach: approachFact,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
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
    if (movementEffects.remainingFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Command Approach did not end the turn, so End Turn fills do not apply.",
      );
    }
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
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
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee only accepts Movement, Spike Growth damage, and End Turn fills.",
    );
  }
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
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee accepts one Movement fill.",
    );
  }
  const movementFill = movementFills[0]!;
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Flee hole.",
    );
  }
  const fleeFact = movementFill.value.commandFlee;
  if (fleeFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee requires caller-supplied fastest-available moving-away route facts.",
    );
  }
  const movementBudgetFeet = battleMovementBudgetForActor(
    input.state,
    input.subject.actorId,
    movementFill.value.speedKind,
  ).remainingFeet;
  if (movementFill.value.movementCostFeet !== movementBudgetFeet) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee must spend the selected remaining Movement budget.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandFlee: fleeFact,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
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
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
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
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is GreaseGroundHazardEffect =>
      effect.kind === "greaseGroundHazard" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

export function greaseGroundHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GreaseGroundHazardEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattleGreaseGroundHazardSavingThrowOutcomeHole {
  const key = `battle:grease-ground-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${trigger === "entersArea" ? "entry" : "end-turn"} DEX save`,
    greaseGroundHazard: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === targetId,
    ),
  };
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
  if ("area" in value) {
    return "Grease ground-hazard Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Grease ground-hazard Saving Throw outcome must match the triggering target.";
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
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
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
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
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is WebRestraintHazardEffect =>
      effect.kind === "webRestraintHazard" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

export function webRestraintSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: WebRestraintHazardEffect,
  trigger: BattleWebRestraintTrigger,
): BattleWebRestraintSavingThrowOutcomeHole {
  const key = `battle:web-restraint-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${trigger === "entersArea" ? "entry" : "start-turn"} DEX save`,
    webRestraint: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === targetId,
    ),
  };
}

function validateWebRestraintSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Web Restraint Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Web Restraint Saving Throw outcome must match the triggering target.";
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
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
  const effect = webRestraintHazardEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
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
  if (savingThrowFill.kind !== "savingThrowOutcome") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires a Saving Throw outcome fill.",
    );
  }
  if (savingThrowFill.holeId !== hole.holeId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web Restraint save requires the matching Saving Throw outcome fill.",
    );
  }
  const validation = validateWebRestraintSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web no-longer-in-area cleanup uses no fills.",
    );
  }
  if (webRestraintHazardEffectFor(input.state, input.subject) === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web Restraint cleanup is no longer available.",
    );
  }
  const nextState = removeWebRestrainedCondition({
    state: input.state,
    targetId: input.subject.actorId,
    sourceCombatantId: input.subject.sourceCombatantId,
    sourceSpellId: input.subject.sourceSpellId,
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
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Web area removal uses no fills.",
    );
  }
  if (webRestraintHazardEffectFor(input.state, input.subject) === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Web area is no longer active.",
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

function resolveGreaseGroundHazardEndTurnSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
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
  if (matchingGreaseFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease received duplicate Grease Saving Throw outcome fills.",
    );
  }
  const [matchingGreaseFill] = matchingGreaseFills;
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
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const outcome = matchingGreaseFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is GustOfWindLineEffect =>
      effect.kind === "gustOfWindLine" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId &&
      effect.directionId === subject.directionId,
  );
}

export function gustOfWindLineSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GustOfWindLineEffect,
  trigger: "endsTurnInLine",
): BattleGustOfWindLineSavingThrowOutcomeHole {
  const key = `battle:gust-of-wind-line-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${effect.directionId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} end-turn STR save`,
    gustOfWindLine: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      directionId: effect.directionId,
      trigger,
      save: effect.save,
      pushDistanceFeet: effect.pushDistanceFeet,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === targetId,
    ),
  };
}

export function gustOfWindLineDirectionChoiceHole(
  effect: GustOfWindLineEffect,
): BattleGustOfWindLineDirectionChoiceHole {
  const key = `battle:gust-of-wind-line-direction:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${effect.directionId}`;
  return {
    kind: "gustOfWindLineDirectionChoice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} Line direction`,
    sourceCombatantId: effect.sourceCombatantId,
    sourceSpellId: effect.sourceSpellId,
    areaId: effect.areaId,
    directionId: effect.directionId,
    requiresTableSpatialFact: true,
  };
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  const effect = gustOfWindLineEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
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
  if (matchingGustFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Gust of Wind received duplicate Gust of Wind Saving Throw outcome fills.",
    );
  }
  const [matchingGustFill] = matchingGustFills;
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
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const outcome = matchingGustFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
    actor === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
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
  if (
    input.fills.some((fill) => fill.kind !== "gustOfWindLineDirectionChoice")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change accepts only direction-choice fills.",
    );
  }
  const hole = gustOfWindLineDirectionChoiceHole(effect);
  const directionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "gustOfWindLineDirectionChoice" }
    > => fill.kind === "gustOfWindLineDirectionChoice",
  );
  if (!everyFillUsesHoleId(directionFills, hole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received a fill for an unrelated hole.",
    );
  }
  if (directionFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Gust of Wind Line direction change received duplicate fills.",
    );
  }
  const directionFill = directionFills[0];
  if (directionFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
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
    sourceSpellId: effect.sourceSpellId,
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
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is FlamingSphereEffect =>
      effect.kind === "flamingSphere" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

function flamingSphereTriggerLabel(
  trigger: BattleFlamingSphereTrigger,
): "ram" | "end-within-5-feet" {
  if (trigger === "rammedBySphere") {
    return "ram";
  }
  if (trigger === "endsTurnWithinFiveFeetOfSphere") {
    return "end-within-5-feet";
  }
  const _: never = trigger;
  return _;
}

export function flamingSphereRamMovementHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
): BattleFlamingSphereRamMovementHole {
  const key = `battle:flaming-sphere-ram-movement:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}`;
  return {
    kind: "movableZoneRamMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ram movement`,
    movableZone: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereRepositionMovementHole(
  effect: FlamingSphereEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:flaming-sphere-reposition-movement:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} reposition movement`,
    movableZone: {
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereSavingThrowOutcomeHole {
  const key = `battle:flaming-sphere-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${flamingSphereTriggerLabel(trigger)} DEX save`,
    movableZone: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === targetId,
    ),
  };
}

function flamingSphereDamageRollHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereDamageRollHole {
  const key = `battle:flaming-sphere-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${flamingSphereTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Movable zone saving throw outcome must match the triggering target.";
}

function validateFlamingSphereDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleFlamingSphereDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone damage must use the selected damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(
    fill.value,
    hole.movableZone.damage.expr,
  );
  return validation === null ? null : validation.reason;
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
  return Number(fill.value.moveFeet) <= Number(hole.movableZone.maxMoveFeet)
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
  return Number(fill.value.moveFeet) <= Number(hole.movableZone.maxMoveFeet)
    ? null
    : "Movable zone reposition movement distance exceeds the spell's maximum.";
}

function flamingSphereAdjustedDamage(input: {
  readonly target: BattleCreatureState;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = input.saveSucceeded
    ? Math.floor(rolledDamage / 2)
    : rolledDamage;
  return damageAmountAfterTargetAdjustments(
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
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
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
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (effect === undefined || target === undefined) {
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
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
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
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const adjustedDamage = flamingSphereAdjustedDamage({
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
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone end-within-5-feet save received duplicate sphere fills.",
    );
  }
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
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  const effect = flamingSphereEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition is no longer available.",
    );
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone reposition requires an available Bonus Action.",
    );
  }
  const movementHole = flamingSphereRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "movableZoneRepositionMovement" }
    > => fill.kind === "movableZoneRepositionMovement",
  );
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate sphere fills.",
    );
  }
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRepositionMovement(
    movementFill,
    movementHole,
  );
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  const nextState = {
    ...input.state,
    currentTurnResources: {
      ...input.state.currentTurnResources,
      currentHasBonusAction: false,
    },
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
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
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.targetId);
  if (
    effect === undefined ||
    target === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Movable zone ram is no longer available.",
    );
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
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
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRamMovement(
    movementFill,
    movementHole,
  );
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.targetId,
  );
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const saveOutcome = saveFill.value.outcomes[0]!;
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    if (concentrationFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Movable zone ram received a fill for an unrelated hole.",
      );
    }
  } else {
    const damageValidation = validateFlamingSphereDamageRoll(
      damageFill,
      damageHole,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
  }
  const concentrationHole =
    damageFill === undefined
      ? null
      : concentrationSavingThrowHole(
          target,
          flamingSphereAdjustedDamage({
            target,
            effect,
            damageFill,
            saveSucceeded: saveOutcome.succeeded,
          }),
        );
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
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone ram received duplicate sphere fills.",
    );
  }
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.targetId,
        sourceSpellId: effect.sourceSpellId,
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
  const nextState = {
    ...damaged,
    currentTurnResources: {
      ...damaged.currentTurnResources,
      currentHasBonusAction: false,
    },
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
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is MoonbeamEffect =>
      effect.kind === "moonbeam" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

function moonbeamTriggerLabel(
  trigger: BattleMoonbeamSaveTrigger,
):
  | "appears-in-area"
  | "area-moves-into-space"
  | "enters-area"
  | "ends-turn-in-area" {
  if (trigger === "appearsInArea") {
    return "appears-in-area";
  }
  if (trigger === "areaMovesIntoSpace") {
    return "area-moves-into-space";
  }
  if (trigger === "entersArea") {
    return "enters-area";
  }
  if (trigger === "endsTurnInArea") {
    return "ends-turn-in-area";
  }
  const _: never = trigger;
  return _;
}

export function moonbeamSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: MoonbeamEffect,
  trigger: BattleMoonbeamSaveTrigger,
): BattleMoonbeamSavingThrowOutcomeHole {
  const key = `battle:moonbeam-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${moonbeamTriggerLabel(trigger)} CON save`,
    movableZone: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
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
    targetFlatBonuses: savingThrowFlatBonusProjections(state).filter(
      (projection) => projection.targetId === targetId,
    ),
  };
}

function moonbeamDamageRollHole(
  targetId: CombatantId,
  effect: MoonbeamEffect,
  trigger: BattleMoonbeamSaveTrigger,
): BattleMoonbeamDamageRollHole {
  const key = `battle:moonbeam-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${moonbeamTriggerLabel(trigger)} damage`,
    movableZone: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

export function moonbeamRepositionMovementHole(
  effect: MoonbeamEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:moonbeam-reposition-movement:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} reposition movement`,
    movableZone: {
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.repositionMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

function validateMoonbeamSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Movable zone saving throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Movable zone saving throw outcome must match the triggering target.";
}

function validateMoonbeamDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleMoonbeamDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone save damage must use the selected damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(
    fill.value,
    hole.movableZone.damage.expr,
  );
  return validation === null ? null : validation.reason;
}

function validateMoonbeamRepositionMovement(
  fill: Extract<BattleFill, { readonly kind: "movableZoneRepositionMovement" }>,
  hole: BattleMovableZoneRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Movable zone reposition movement must use the selected movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Movable zone reposition movement distance must be a positive integer.";
  }
  return Number(fill.value.moveFeet) <= Number(hole.movableZone.maxMoveFeet)
    ? null
    : "Movable zone reposition movement distance exceeds the spell's maximum.";
}

function moonbeamAdjustedDamage(input: {
  readonly target: BattleCreatureState;
  readonly effect: MoonbeamEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = input.saveSucceeded
    ? Math.floor(rolledDamage / 2)
    : rolledDamage;
  return damageAmountAfterTargetAdjustments(
    input.target,
    saveAdjustedDamage,
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
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
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
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
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
  const effect = moonbeamEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (effect === undefined || target === undefined) {
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
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate fills.",
    );
  }
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
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
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
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const adjustedDamage = moonbeamAdjustedDamage({
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
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone save received duplicate concentration save fills.",
    );
  }
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
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Moonbeam Cylinder exit cleanup uses no fills.",
    );
  }
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
  if (
    input.fills.some((fill) => fill.kind !== "movableZoneRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition accepts only movement fills.",
    );
  }
  const effect = moonbeamEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
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
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received a fill for an unrelated hole.",
    );
  }
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movable zone reposition received duplicate fills.",
    );
  }
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateMoonbeamRepositionMovement(
    movementFill,
    movementHole,
  );
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
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
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = sleepPendingRepeatSaveEffects(actor, actorId, round);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const target = nextCombatants.get(actorId);
    if (target === undefined) {
      return nextCombatants;
    }
    const hole = sleepRepeatSavingThrowOutcomeHole(actorId, effect);
    const save = sleepRepeatSavingThrowOutcomeFor(saves, hole);
    if (save === undefined) {
      return nextCombatants;
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
      return new Map(nextCombatants).set(
        actorId,
        battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffectsWithoutPending,
          conditionsWithoutPending,
        ),
      );
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
      sourceSpellId: effect.sourceSpellId,
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
    return breakCombatantConcentration(
      new Map(nextCombatants).set(
        actorId,
        battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffects,
          conditionsAfterApplyingSpellConditionEffects(
            conditionsWithoutPending,
            activeEffects,
          ),
        ),
      ),
      actorId,
    );
  }, combatants);
}

function hideousLaughterEffects(
  combatant: BattleCreatureState | undefined,
): readonly HideousLaughterEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is HideousLaughterEffect =>
          effect.kind === "hideousLaughter",
      );
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
        (effect) => effect !== expiringEffect,
      ),
    }),
    expiringEffect,
  );
}

function removeSpellConditionEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: SpellConditionEndTurnSaveEffect,
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
    const damageAmount = spellTurnStartDamageAmount(target, effect, roll);
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
        damageAmount: spellTurnStartDamageAmount(target, effect, roll),
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

export function tickDurationEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const expiredConcentrationSources: ConcentrationEffectSource[] = [];
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
            "sourceSpellId" in effect &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration"
          ) {
            expiredConcentrationSources.push({
              combatantId: effect.expiresAt.combatantId,
              sourceSpellId: effect.sourceSpellId,
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
  return expireConcentrationDurationSources(
    tickedCombatants,
    expiredConcentrationSources,
  );
}

type ConcentrationEffectSource = {
  readonly combatantId: CombatantId;
  readonly sourceSpellId: string;
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

function expireConcentrationDurationSources(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  sources: readonly ConcentrationEffectSource[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const uniqueSources = [
    ...new Map(
      sources.map((source) => [
        `${source.combatantId}\u0000${source.sourceSpellId}`,
        source,
      ]),
    ).values(),
  ];
  return uniqueSources.reduce(
    (currentCombatants, source) =>
      expireConcentrationDurationSource(currentCombatants, source),
    combatants,
  );
}

function expireConcentrationDurationSource(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: ConcentrationEffectSource,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter((effect) =>
        activeEffectExpiresWithConcentrationSource(effect, source),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !expiring.includes(effect),
      );
      const concentrationExpired =
        id === source.combatantId &&
        combatant.concentration?.effectKind === "spellEffect" &&
        combatant.concentration.sourceSpellId === source.sourceSpellId;
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

function activeEffectExpiresWithConcentrationSource(
  effect: BattleActiveEffect,
  source: ConcentrationEffectSource,
): boolean {
  if (
    effect.sourceCombatantId !== source.combatantId ||
    !("sourceSpellId" in effect) ||
    effect.sourceSpellId !== source.sourceSpellId
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

export function resetBattleTurnResources(
  resources: BattleTurnResources,
): BattleTurnResources {
  const { lightWeaponAttackMade: _lightWeaponAttackMade, ...base } =
    resetTurnActionEconomy(resources);
  return {
    ...base,
    commandHalt: null,
    jumpDistanceMultiplier: null,
    spellSlotUsesThisTurn: [],
    levelOnePlusSpellCastsThisTurn: [],
    quickenedLevelOnePlusSpellCastsThisTurn: [],
    attackRollMadeThisTurn: false,
    attackDamageRidersUsedThisTurn: [],
    weaponDamageDiceRollChoicesUsedThisTurn: [],
    dashMovementBonusFeet: movementFeet(0),
    disengaged: false,
  };
}

export function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn does not accept battle fills for unrelated subjects.",
    );
  }

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
        : wardingBondSavingThrowFlatBonusProjectionsForTarget(actor),
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
          : wardingBondSavingThrowFlatBonusProjectionsForTarget(actor),
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
        : wardingBondSavingThrowFlatBonusProjectionsForTarget(actor),
    ),
  }));
  const spellConditionEndTurnSaveHoles = spellConditionEndTurnSaveRequests.map(
    (request) => request.hole,
  );
  const abilityD20TestEndTurnSaveRequests =
    abilityD20TestRollModeEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: abilityD20TestRollModeEndTurnSavingThrowOutcomeHole(
        actorId,
        effect,
        input.state,
        actor === undefined
          ? []
          : wardingBondSavingThrowFlatBonusProjectionsForTarget(actor),
      ),
    }));
  const abilityD20TestEndTurnSaveHoles = abilityD20TestEndTurnSaveRequests.map(
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
                : wardingBondSavingThrowFlatBonusProjectionsForTarget(
                    nextActor,
                  ),
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
    ...abilityD20TestEndTurnSaveHoles,
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
  const startTurnDamageHoleIds = new Set<BattleHoleId>(
    startTurnDamageHoles.map((hole) => hole.holeId),
  );
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "rolledDice" && !startTurnDamageHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn rolled dice fills must match a requested start-turn damage hole.",
    );
  }
  if (
    input.fills.filter((fill) => fill.kind === "rolledDice").length !==
    startTurnDamageRolls.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate rolled dice fills for start-turn damage.",
    );
  }
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
  const startTurnHideousLaughterDamageRepeatSaveChecks =
    startTurnDamageRollRequests.map((request) => {
      if (nextActor === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      const damageAmount = spellTurnStartDamageAmount(
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
  if (invalidStartTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidStartTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
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
  const savingThrowOutcomeHoleIds = new Set<BattleHoleId>(
    [
      ...sleepRepeatSaveHoles,
      ...hideousLaughterRepeatSaveHoles,
      ...spellConditionEndTurnSaveHoles,
      ...abilityD20TestEndTurnSaveHoles,
      ...startTurnSaveHoles,
      ...startTurnHideousLaughterDamageRepeatSaveHoles,
    ].map((hole) => hole.holeId),
  );
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
  if (
    savingThrowOutcomeFills.length !==
    sleepRepeatSaves.length +
      hideousLaughterRepeatSaves.length +
      spellConditionEndTurnSaves.length +
      abilityD20TestEndTurnSaves.length +
      startTurnSaves.length +
      startTurnHideousLaughterDamageRepeatSaves.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Saving Throw outcome fills.",
    );
  }
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
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
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
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
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
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
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
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const fill of startTurnHideousLaughterDamageRepeatSaves) {
    const hole = startTurnHideousLaughterDamageRepeatSaveHoles.find(
      (candidate) => candidate.holeId === fill.holeId,
    );
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      hole?.hideousLaughterRepeatSave.targetId ?? nextActorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
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
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const request of startTurnDamageRollRequests) {
    const damage = spellTurnStartDamageForEffect(request.effect);
    const validation = validateRolledDiceForDiceExpr(
      request.roll.value,
      damage.expr,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation.reason);
    }
  }
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
          target,
          request.effect,
          request.roll,
        ),
      });
    },
  );
  const missingConcentrationHoles = startTurnConcentrationHoles.filter(
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
    startTurnConcentrationHoles.map((hole) => hole.holeId),
  );
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
      "Concentration Saving Throw fill is only valid for a concentrating start-turn damage target.",
    );
  }
  if (
    concentrationSavingThrowFills.length !== startTurnConcentrationHoles.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Concentration Saving Throw fills for start-turn damage.",
    );
  }
  const damageDispositionHoles = startTurnDamageRollRequests.flatMap(
    (request) =>
      startTurnDamageDispositionHoles(input.state, nextActorId, [request]),
  );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: damageDispositionFills,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
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

  return resolveEndTurn(
    input.state,
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? deathSavingThrowFill.value
      : undefined,
    rechargeRollFill?.kind === "statBlockRechargeRoll"
      ? rechargeRollFill.value
      : undefined,
    sleepRepeatSaves,
    hideousLaughterRepeatSaves,
    spellConditionEndTurnSaves,
    abilityD20TestEndTurnSaves,
    startTurnDamageRolls,
    startTurnSaves,
    startTurnHideousLaughterDamageRepeatSaves,
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
    if (result.roll < 1 || result.roll > 6) return false;
    const targetIndex = rechargeHole.rechargeTargets.findIndex(
      (target, index) =>
        !matchedTargetIndexes.has(index) &&
        sameStatBlockPartKey(target, result.target),
    );
    if (targetIndex === -1) return false;
    matchedTargetIndexes.add(targetIndex);
  }
  return true;
}

export function resolveMoveCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires a Movement fill first.",
    );
  }
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
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
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
  if (input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires a Movement fill first.",
    );
  }
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
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Jump movement replacement hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
    { jumpMovementReplacement: effect },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }

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
    const reactionWindow = maybeOpenReactionWindow(
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
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
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
        effect.sourceCombatantId === subject.sourceCombatantId &&
        effect.sourceSpellId === subject.sourceSpellId &&
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
    effect.sourceSpellId === consumedEffect.sourceSpellId
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
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  const cost = standFromProneCostFeet(input.state, input.subject.actorId);
  if (actor === undefined || cost === null) {
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

export function standFromProneCostFeet(
  state: BattleState,
  actorId: CombatantId,
): number | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !hasCondition(actor.conditions, "prone")) {
    return null;
  }
  if (hideousLaughterEffects(actor).length > 0) {
    return null;
  }
  const speed = effectiveWalkSpeed(
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  const cost = Math.floor(Number(speed) / 2);
  const remaining = battleMovementBudgetForActor(state, actorId).remainingFeet;
  if (cost <= 0 || Number(remaining) < cost) return null;
  return cost;
}

export function movementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const budget = battleMovementBudgetForActor(state, actorId);
  return movementHoleWithBudget(
    actorId,
    budget.remainingFeet,
    budget.speedKinds.map((speedKind) => ({
      kind: speedKind.kind,
      movementBudgetFeet: speedKind.remainingFeet,
    })),
  );
}

export function readiedMovementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const actor = state.combatants.get(actorId);
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const speedKinds =
    actor === undefined
      ? []
      : representedMovementSpeedKinds(actor).map((kind) => ({
          kind,
          movementBudgetFeet: effectiveMovementSpeed(actor, kind, isGrappled),
        }));
  return movementHoleWithBudget(
    actorId,
    readiedMovementBudgetForActor(state, actorId),
    speedKinds,
  );
}

export function movementHoleWithBudget(
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
  speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[] = [{ kind: "walk", movementBudgetFeet }],
): BattleMovementHole {
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet,
    speedKinds,
  };
}

export function readiedMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): MovementFeet {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? movementFeet(0)
    : effectiveMovementSpeed(
        actor,
        speedKind,
        state.grapples.some((grapple) => grapple.targetId === actorId),
      );
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
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  const areaMovementCostValidation = validateAreaMovementCostFacts(
    state,
    fill.value,
  );
  if (areaMovementCostValidation !== null) {
    return {
      tag: "invalid",
      message: areaMovementCostValidation,
    };
  }
  const areaExtraCostFeet = areaMovementExtraCostFeet(state, fill.value);
  const jumpMovementValidation = validateJumpMovementReplacementFact(
    state,
    moverId,
    fill.value.jumpMovementReplacement,
    options.jumpMovementReplacement,
    fill.value.movementCostFeet,
    areaExtraCostFeet,
  );
  if (jumpMovementValidation !== null) {
    return {
      tag: "invalid",
      message: jumpMovementValidation,
    };
  }
  const levitatedMovementValidation = validateLevitatedMovementFact({
    combatant: mover,
    fact: fill.value.levitatedMovement,
    speedKind: fill.value.speedKind,
    movementCostFeet: fill.value.movementCostFeet,
    areaExtraCostFeet,
  });
  if (levitatedMovementValidation !== null) {
    return {
      tag: "invalid",
      message: levitatedMovementValidation,
    };
  }
  const commandApproachValidation = validateCommandApproachMovementFact(
    fill.value.commandApproach,
    options.commandApproach,
  );
  if (commandApproachValidation !== null) {
    return {
      tag: "invalid",
      message: commandApproachValidation,
    };
  }
  const commandFleeValidation = validateCommandFleeMovementFact(
    fill.value.commandFlee,
    options.commandFlee,
  );
  if (commandFleeValidation !== null) {
    return {
      tag: "invalid",
      message: commandFleeValidation,
    };
  }
  const movementCost = ordinaryMovementCost(
    movementFeet(fill.value.movementCostFeet),
    fill.value.speedKind,
  );
  if (Number(movementCost.costFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) => attackActionOptionName(option) === threat.attackName,
    );
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    if (attackTargetConstraint(attack).kind !== "meleeReach") {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat must name a melee attack option.",
      };
    }
    const threatKey = `${reactorId}\u0000${threat.attackName}`;
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
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
      ...(fill.value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: fill.value.areaDifficultTerrain }),
      ...(fill.value.jumpMovementReplacement === undefined
        ? {}
        : { jumpMovementReplacement: fill.value.jumpMovementReplacement }),
      ...(fill.value.levitatedMovement === undefined
        ? {}
        : { levitatedMovement: fill.value.levitatedMovement }),
    },
  };
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
      effect.sourceSpellId === source.sourceSpellId &&
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
  const key = `battle:spike-growth-movement-damage:${targetId}:${request.effect.sourceCombatantId}:${request.effect.sourceSpellId}:${request.effect.areaId}:${request.distanceFeet}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${request.effect.sourceSpellId} movement damage`,
    spikeGrowthMovement: {
      targetId,
      sourceSpellId: request.effect.sourceSpellId,
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
  const validation = validateRolledDiceForDiceExpr(
    fill.value,
    hole.spikeGrowthMovement.damage.expr,
  );
  return validation === null ? null : validation.reason;
}

function spikeGrowthMovementDamageAmount(
  target: BattleCreatureState,
  request: SpikeGrowthMovementDamageRequest,
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  return damageAmountAfterTargetAdjustments(
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
      if (unconsumedRolledDiceFills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Spike Growth movement damage fill does not match the pending damage hole.",
        );
      }
      return needsHolesResult(input.state, input.subject, [damageHole]);
    }
    consumedFills.add(damageFill);
    const damageValidation = validateSpikeGrowthMovementDamageRoll(
      damageFill,
      damageHole,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }

    const damageAmount = spikeGrowthMovementDamageAmount(
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
      if (
        concentrationSavingThrowFills.some((fill) => !consumedFills.has(fill))
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration saving throw fill does not match the pending movement damage hole.",
        );
      }
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
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    const missingDispositionHole = damageDispositionHoles.find(
      (hole) =>
        damageDispositionFillFor(
          damageDispositionFills.filter((fill) => !consumedFills.has(fill)),
          hole,
        ) === undefined,
    );
    if (missingDispositionHole !== undefined) {
      if (damageDispositionFills.some((fill) => !consumedFills.has(fill))) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Damage disposition fill does not match the pending movement damage hole.",
        );
      }
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
      },
    );
  }
  const remainingFills = input.extraFills.filter(
    (fill) => !consumedFills.has(fill),
  );
  if (
    remainingFills.some((fill) => spikeGrowthMovementEffectFillKind(fill.kind))
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move received a fill that does not match a pending Spike Growth movement damage hole.",
    );
  }

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
  if (movementEffects.remainingFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move only accepts Movement, Spike Growth damage, Concentration, and damage disposition fills.",
    );
  }
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
            effect.sourceSpellId === terrainSource.sourceSpellId &&
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
            effect.sourceSpellId === terrainSource.sourceSpellId &&
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
            effect.sourceSpellId === terrainSource.sourceSpellId &&
            effect.areaId === terrainSource.areaId,
        ) === true,
    ),
    Match.exhaustive,
  );
}

function areaDifficultTerrainSourceKey(
  source: BattleAreaDifficultTerrainSource,
): string {
  return `${source.kind}\u0000${source.sourceCombatantId}\u0000${source.sourceSpellId}\u0000${source.areaId}`;
}

function validateAreaDifficultTerrainMovementFact(
  state: BattleState,
  fact: BattleAreaDifficultTerrainMovementFact | undefined,
): AreaMovementCostFactResult {
  if (fact === undefined) {
    return { tag: "notApplicable" };
  }
  if (fact.kind !== "areaDifficultTerrain") {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact has the wrong kind.",
    };
  }
  if (fact.sources.length === 0) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain movement fact requires a source.",
    };
  }
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
  if (
    !Number.isInteger(fact.difficultTerrainDistanceFeet) ||
    fact.difficultTerrainDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Area Difficult Terrain distance must be a positive integer.",
    };
  }
  if (
    Number(fact.difficultTerrainDistanceFeet) > Number(fact.totalDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Area Difficult Terrain distance cannot exceed total Movement distance.",
    };
  }
  const sourceKeys = new Set<string>();
  let spikeGrowthDamageDistanceFeet = 0;
  for (const source of fact.sources) {
    const key = areaDifficultTerrainSourceKey(source);
    if (sourceKeys.has(key)) {
      return {
        tag: "invalid",
        message: "Area Difficult Terrain movement fact repeats a source.",
      };
    }
    sourceKeys.add(key);
    if (source.kind === "spikeGrowthHazard") {
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
      if (Number(source.damageDistanceFeet) > Number(fact.totalDistanceFeet)) {
        return {
          tag: "invalid",
          message:
            "Spike Growth movement damage distance cannot exceed total Movement distance.",
        };
      }
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
      spikeGrowthDamageDistanceFeet += Number(source.damageDistanceFeet);
    }
    if (!activeAreaDifficultTerrainSourceMatches(state, source)) {
      return {
        tag: "invalid",
        message:
          "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
      };
    }
  }
  if (
    spikeGrowthDamageDistanceFeet > Number(fact.difficultTerrainDistanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Spike Growth movement damage distances cannot exceed Difficult Terrain distance.",
    };
  }
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
  if (fact.kind !== "gustOfWindLineMovement") {
    return {
      tag: "invalid",
      message: "Gust of Wind Line movement fact has the wrong kind.",
    };
  }
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line total distance must be a positive integer.",
    };
  }
  if (
    !Number.isInteger(fact.closerDistanceFeet) ||
    fact.closerDistanceFeet <= 0
  ) {
    return {
      tag: "invalid",
      message: "Gust of Wind Line closer distance must be a positive integer.",
    };
  }
  if (Number(fact.closerDistanceFeet) > Number(fact.totalDistanceFeet)) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line closer distance cannot exceed total Movement distance.",
    };
  }
  const source = state.combatants.get(fact.sourceCombatantId);
  const effect = source?.activeEffects.find(
    (candidate): candidate is GustOfWindLineEffect =>
      candidate.kind === "gustOfWindLine" &&
      candidate.sourceCombatantId === fact.sourceCombatantId &&
      candidate.sourceSpellId === fact.sourceSpellId &&
      candidate.areaId === fact.areaId &&
      candidate.directionId === fact.directionId,
  );
  if (effect === undefined) {
    return {
      tag: "invalid",
      message:
        "Gust of Wind Line movement fact does not match an active Gust of Wind Line.",
    };
  }
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

function validateAreaMovementCostFacts(
  state: BattleState,
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
  const areaCosts = [difficultTerrain, gust].filter(
    (
      result,
    ): result is Extract<AreaMovementCostFactResult, { readonly tag: "ok" }> =>
      result.tag === "ok",
  );
  if (areaCosts.length === 0) {
    return null;
  }
  const firstAreaCost = areaCosts[0];
  if (firstAreaCost === undefined) {
    return null;
  }
  const remainingAreaCosts = areaCosts.slice(1);
  if (
    remainingAreaCosts.some(
      (areaCost) =>
        Number(areaCost.totalDistanceFeet) !==
        Number(firstAreaCost.totalDistanceFeet),
    )
  ) {
    return "Area movement-cost facts must agree on total Movement distance.";
  }
  if (
    value.jumpMovementReplacement !== undefined ||
    value.levitatedMovement?.altitudeChange !== undefined
  ) {
    return null;
  }
  const expectedCostFeet = movementFeet(
    Number(firstAreaCost.totalDistanceFeet) +
      areaCosts.reduce(
        (total, areaCost) => total + Number(areaCost.extraCostFeet),
        0,
      ),
  );
  if (Number(value.movementCostFeet) === Number(expectedCostFeet)) {
    return null;
  }
  if (difficultTerrain.tag === "ok" && gust.tag === "ok") {
    return "Combined area Difficult Terrain and Gust of Wind movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain and 1 extra foot for every foot moved closer to the caster through the Line.";
  }
  return difficultTerrain.tag === "ok"
    ? "Area Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through Difficult Terrain."
    : "Gust of Wind Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.";
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
  if (fact.kind !== "jumpMovementReplacement") {
    return "Jump movement replacement fact has the wrong kind.";
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
  if (
    fact.landing.kind !== "legalLanding" ||
    (fact.landing.difficultTerrainAcrobatics !== "notRequired" &&
      fact.landing.difficultTerrainAcrobatics !== "passed" &&
      fact.landing.difficultTerrainAcrobatics !== "failed")
  ) {
    return "Jump movement replacement requires caller-supplied legal landing facts.";
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
  return fact.kind === "commandApproachShortestDirectRouteTowardCaster"
    ? null
    : "Command Approach route fact has the wrong kind.";
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
  return fact.kind === "commandFleeFastestAvailableRouteAwayFromCaster"
    ? null
    : "Command Flee route fact has the wrong kind.";
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
    return updateActiveDruidWildShapeResources(
      resetCombatant,
      refreshStatBlockStartTurnResources(
        wildShape.effect.resources,
        wildShape.form.statBlock,
      ),
    );
  }
  if (resetCombatant.origin.kind !== "statBlock") {
    return resetCombatant;
  }
  return {
    ...resetCombatant,
    origin: {
      ...resetCombatant.origin,
      resources: refreshStatBlockStartTurnResources(
        resetCombatant.origin.resources,
        resetCombatant.origin.statBlock.statBlock,
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
