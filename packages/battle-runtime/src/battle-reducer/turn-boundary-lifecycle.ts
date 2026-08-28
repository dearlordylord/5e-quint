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
  type HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type Ability,
  DieRollResult,
  Hp,
  movementFeet,
  type Round as RoundType,
} from "@dnd/shared/types";
import { Match } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleAbilityD20TestRollModeEndTurnSavingThrowOutcomeHole,
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleCreatureState,
  BattleConcentrationSavingThrowHole,
  BattleCloudkillMovementHole,
  BattleStartTurnOccurrenceOrderHole,
  BattleFill,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleHole,
  BattleHoleId,
  BattleObjectOutcomeAccumulation,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleStartTurnOccurrenceSequenceCheckpoint,
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
import {
  battleStartTurnOccurrenceId,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
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
import {
  cloudkillMovementSavingThrowHoleId,
  resolveCloudkillMovementSaveDamageSequence,
  type CloudkillAreaHazardEffect,
  type CloudkillMovementSaveDamageRequest,
} from "./persistent-area-save-damage.ts";
import { isBattleContinuationComparableFill } from "./battle-fill-equality.ts";
import {
  projectReplayChildResult,
  replayParentContinuationFor,
  type ReplayParentContinuation,
} from "./replay-continuation.ts";
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
  readonly spellTurnStartDamageEffectsBeforeCloudkillMovement: readonly SpellTurnStartDamageEffect[];
  readonly turnStartTemporaryHitPointProcedureRefsBeforeCloudkillMovement: readonly BattleProcedureExecutionRef[];
  readonly deferStatBlockRecharge: boolean;
};

const CLOUDKILL_START_TURN_MOVE_FEET = movementFeet(10);

function cloudkillStartTurnMovementEffects(
  state: BattleState,
  sourceCombatantId: CombatantId,
): readonly CloudkillAreaHazardEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (effect): effect is CloudkillAreaHazardEffect =>
        effect.kind === "cloudkillAreaHazard" &&
        effect.sourceCombatantId === sourceCombatantId,
    ),
  );
}

function cloudkillStartTurnMovementHole(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: Pick<
    CloudkillAreaHazardEffect,
    "effectRef" | "sourceCombatantId" | "sourceProcedureRef" | "areaId"
  >,
): BattleCloudkillMovementHole {
  const key = cloudkillStartTurnMovementHoleKey(sourceTurn, effect.effectRef);
  return {
    kind: "cloudkillMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Cloudkill start-turn movement",
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    effectRef: effect.effectRef,
    areaId: effect.areaId,
    distanceFeet: CLOUDKILL_START_TURN_MOVE_FEET,
    directionRequirement: "awayFromSource",
    requiresTableSpatialFact: true,
  };
}

function cloudkillStartTurnMovementHoleKey(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effectRef: CloudkillAreaHazardEffect["effectRef"],
): string {
  return `battle:cloudkill-start-turn-movement:${effectRef}:${Number(sourceTurn.round)}`;
}

type StartTurnOccurrenceOption =
  BattleStartTurnOccurrenceOrderHole["occurrences"][number];

type StartTurnOccurrenceTraversal =
  | { readonly kind: "none" }
  | BattleStartTurnOccurrenceSequenceCheckpoint["sequence"];

function startTurnOccurrenceTraversal(
  occurrenceIds: readonly StartTurnOccurrenceOption["occurrenceId"][],
): StartTurnOccurrenceTraversal {
  const first = occurrenceIds[0];
  if (first === undefined) return { kind: "none" };
  const second = occurrenceIds[1];
  return second === undefined
    ? { kind: "single", occurrenceId: first }
    : {
        kind: "ordered",
        occurrenceIds: [first, second, ...occurrenceIds.slice(2)],
      };
}

function temporaryHitPointChoiceHole(input: {
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly occurrenceId: StartTurnOccurrenceOption["occurrenceId"];
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
  readonly sourceCombatantId: CombatantId;
  readonly existingTemporaryHitPoints: number;
  readonly grantedTemporaryHitPoints: number;
}): Extract<BattleHole, { readonly kind: "temporaryHitPointChoice" }> {
  const key = `battle:temporary-hit-point-choice:${input.sourceTurn.actorId}:${Number(input.sourceTurn.round)}:${input.occurrenceId}`;
  return {
    kind: "temporaryHitPointChoice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Choose which Temporary Hit Points to keep",
    sourceCombatantId: input.sourceCombatantId,
    sourceProcedureRef: input.sourceProcedureRef,
    effectRef: input.effectRef,
    sourceTurn: input.sourceTurn,
    occurrenceId: input.occurrenceId,
    existingTemporaryHitPoints: Hp(input.existingTemporaryHitPoints),
    grantedTemporaryHitPoints: Hp(input.grantedTemporaryHitPoints),
  };
}

type StartTurnOccurrenceHandle =
  | { readonly kind: "deathSavingThrow" }
  | { readonly kind: "statBlockRecharge" }
  | {
      readonly kind: "turnStartTemporaryHitPoints";
      readonly effect: Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      >;
    }
  | {
      readonly kind: "spellConditionTurnStartDamage";
      readonly effect: Extract<
        SpellTurnStartDamageEffect,
        { readonly kind: "spellCondition" }
      >;
    }
  | {
      readonly kind: "spellTurnStartDamageAndSave";
      readonly effect: Extract<
        SpellTurnStartDamageEffect,
        { readonly kind: "spellTurnStartDamageAndSave" }
      >;
    }
  | {
      readonly kind: "cloudkillMovement";
      readonly effect: CloudkillAreaHazardEffect;
    };

function startTurnOccurrenceOption(
  kind: StartTurnOccurrenceOption["kind"],
  identity: Readonly<Record<string, string>>,
  label: string,
): StartTurnOccurrenceOption {
  return {
    occurrenceId: battleStartTurnOccurrenceId(
      JSON.stringify({ kind, ...identity }),
    ),
    kind,
    label,
  };
}

function cloudkillMovementOccurrenceOption(
  effect: Pick<CloudkillAreaHazardEffect, "effectRef">,
): StartTurnOccurrenceOption {
  return startTurnOccurrenceOption(
    "cloudkillMovement",
    {
      effectRef: effect.effectRef,
    },
    "Move Cloudkill",
  );
}

function startTurnOccurrenceOptionForHandle(
  handle: StartTurnOccurrenceHandle,
): StartTurnOccurrenceOption {
  return Match.value(handle).pipe(
    Match.when({ kind: "deathSavingThrow" }, () =>
      startTurnOccurrenceOption(
        "deathSavingThrow",
        {},
        "Resolve Death Saving Throw",
      ),
    ),
    Match.when({ kind: "statBlockRecharge" }, () =>
      startTurnOccurrenceOption(
        "statBlockRecharge",
        {},
        "Resolve stat-block recharge",
      ),
    ),
    Match.when({ kind: "turnStartTemporaryHitPoints" }, ({ effect }) =>
      startTurnOccurrenceOption(
        "turnStartTemporaryHitPoints",
        { effectRef: effect.effectRef },
        "Grant start-turn Temporary Hit Points",
      ),
    ),
    Match.when({ kind: "spellConditionTurnStartDamage" }, ({ effect }) =>
      spellTurnStartDamageOccurrenceOption(effect),
    ),
    Match.when({ kind: "spellTurnStartDamageAndSave" }, ({ effect }) =>
      spellTurnStartDamageOccurrenceOption(effect),
    ),
    Match.when({ kind: "cloudkillMovement" }, ({ effect }) =>
      cloudkillMovementOccurrenceOption(effect),
    ),
    Match.exhaustive,
  );
}

function startTurnOccurrenceHandlesForState(
  state: BattleState,
  actorId: CombatantId,
): readonly StartTurnOccurrenceHandle[] {
  const actor = state.combatants.get(actorId);
  return [
    ...(startTurnDeathSavingThrowRequired(actor)
      ? [{ kind: "deathSavingThrow" as const }]
      : []),
    ...(statBlockRechargeRollHole(actor) === null
      ? []
      : [{ kind: "statBlockRecharge" as const }]),
    ...(actor?.activeEffects.flatMap((effect) =>
      effect.kind === "turnStartTemporaryHitPoints"
        ? [{ kind: "turnStartTemporaryHitPoints" as const, effect }]
        : [],
    ) ?? []),
    ...spellTurnStartDamageEffects(actor).map(
      (effect): StartTurnOccurrenceHandle =>
        effect.kind === "spellCondition"
          ? { kind: "spellConditionTurnStartDamage", effect }
          : { kind: "spellTurnStartDamageAndSave", effect },
    ),
    ...cloudkillStartTurnMovementEffects(state, actorId).map(
      (effect): StartTurnOccurrenceHandle => ({
        kind: "cloudkillMovement",
        effect,
      }),
    ),
  ];
}

function startTurnOccurrenceOrderHole(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  occurrences: BattleStartTurnOccurrenceOrderHole["occurrences"],
): BattleStartTurnOccurrenceOrderHole {
  const key = startTurnOccurrenceOrderHoleKey(sourceTurn);
  return {
    kind: "startTurnOccurrenceOrder",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Choose simultaneous start-turn occurrence order",
    actorId: sourceTurn.actorId,
    occurrences,
  };
}

function startTurnOccurrenceOrderHoleKey(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
): string {
  return `battle:start-turn-occurrence-order:${sourceTurn.actorId}:${Number(sourceTurn.round)}`;
}

type CloudkillMovementFill = Extract<
  BattleFill,
  { readonly kind: "cloudkillMovement" }
>;

type CloudkillMovementBoundary = {
  readonly effect: CloudkillAreaHazardEffect;
  readonly hole: BattleCloudkillMovementHole;
};

type CloudkillMovementBoundaryRequest = CloudkillMovementBoundary & {
  readonly fill: CloudkillMovementFill;
};

function cloudkillMovementAffectedCombatantIssue(
  state: BattleState,
  fills: readonly CloudkillMovementFill[],
): "duplicate" | "missing" | null {
  if (
    fills.some(
      (fill) =>
        new Set(fill.value.affectedCombatantIdsInResolutionOrder).size !==
        fill.value.affectedCombatantIdsInResolutionOrder.length,
    )
  ) {
    return "duplicate";
  }
  return fills.some((fill) =>
    fill.value.affectedCombatantIdsInResolutionOrder.some(
      (combatantId) => !state.combatants.has(combatantId),
    ),
  )
    ? "missing"
    : null;
}

type CloudkillMovementSaveSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "cloudkillAreaHazardSave";
  }
>;

function cloudkillMovementSaveSubject(
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
): CloudkillMovementSaveSubject {
  return {
    tag: "runtimeCommand",
    actorId: targetId,
    command: "cloudkillAreaHazardSave",
    areaMembershipTrigger: {
      kind: "areaMovesIntoSpace",
      areaId: effect.areaId,
      effectRef: effect.effectRef,
    },
  };
}

function cloudkillMovementSaveDamageRequests(
  requests: readonly CloudkillMovementBoundaryRequest[],
): readonly CloudkillMovementSaveDamageRequest[] {
  return requests.flatMap(({ effect, fill }) => {
    return fill.value.affectedCombatantIdsInResolutionOrder.map((targetId) => ({
      effect,
      subject: cloudkillMovementSaveSubject(targetId, effect),
    }));
  });
}

function cloudkillMovementCheckpointMatchesRequest(
  checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint,
  request: CloudkillMovementSaveDamageRequest,
): boolean {
  return (
    request.effect.effectRef === checkpoint.child.effectRef &&
    request.subject.actorId === checkpoint.child.targetId
  );
}

function completeCloudkillMovementSequenceResume(
  state: BattleState,
  fills: readonly BattleFill[],
  checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint,
  parent: ReplayParentContinuation,
  previouslyAcceptedHoleIds: readonly BattleHoleId[],
): BattleResolutionResult {
  return resolveStartTurnOccurrenceSuffixAfterMovement({
    state,
    fills,
    checkpoint,
    parent,
    previouslyAcceptedHoleIds,
  });
}

function resolveStartTurnOccurrenceSuffixAfterMovement(input: {
  readonly state: BattleState;
  readonly fills: readonly BattleFill[];
  readonly checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint;
  readonly parent: ReplayParentContinuation;
  readonly previouslyAcceptedHoleIds: readonly BattleHoleId[];
}): BattleResolutionResult {
  const { checkpoint } = input;
  const orderHoleId = holeId(
    startTurnOccurrenceOrderHoleKey(checkpoint.sourceTurn),
  );
  const orderFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "startTurnOccurrenceOrder" }
    > =>
      fill.kind === "startTurnOccurrenceOrder" && fill.holeId === orderHoleId,
  );
  if (checkpoint.sequence.kind === "single") {
    if (
      checkpoint.sequence.occurrenceId !==
        cloudkillMovementOccurrenceOption(checkpoint.child).occurrenceId ||
      orderFills.length > 0
    ) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Single start-turn occurrence continuation does not match its retained occurrence.",
      );
    }
  } else if (orderFills.length === 0) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ordered start-turn occurrence continuation lost its retained order.",
    );
  }
  if (checkpoint.sequence.kind === "ordered" && orderFills.length !== 1) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Start-turn occurrence continuation requires its exact retained order.",
    );
  }
  const currentOccurrenceId = cloudkillMovementOccurrenceOption(
    checkpoint.child,
  ).occurrenceId;
  const orderedCheckpoint =
    checkpoint.sequence.kind === "ordered" ? checkpoint.sequence : undefined;
  if (
    orderedCheckpoint !== undefined &&
    (orderFills[0]!.value.occurrenceIds.length !==
      orderedCheckpoint.occurrenceIds.length ||
      orderFills[0]!.value.occurrenceIds.some(
        (occurrenceId, index) =>
          occurrenceId !== orderedCheckpoint.occurrenceIds[index],
      ))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Start-turn occurrence continuation order differs from its canonical checkpoint.",
    );
  }
  const retainedOccurrenceIds =
    checkpoint.sequence.kind === "ordered"
      ? checkpoint.sequence.occurrenceIds
      : [checkpoint.sequence.occurrenceId];
  const currentIndex = retainedOccurrenceIds.indexOf(currentOccurrenceId);
  if (currentIndex === -1) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Start-turn occurrence continuation is not a member of its retained order.",
    );
  }
  const completedPrefixHoleIds = new Set(checkpoint.completedPrefixHoleIds);
  if (
    completedPrefixHoleIds.size !== checkpoint.completedPrefixHoleIds.length
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Start-turn occurrence continuation records each completed prefix hole once.",
    );
  }
  for (const completedHoleId of completedPrefixHoleIds) {
    const submittedFills = input.fills.filter(
      (fill) => fill.holeId === completedHoleId,
    );
    if (
      submittedFills.length !== 1 ||
      !isBattleContinuationComparableFill(submittedFills[0]!)
    ) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Start-turn occurrence continuation prefix must preserve each recorded fill exactly once.",
      );
    }
  }
  const suffix = resolveOrderedStartTurnOccurrences({
    state: input.state,
    subject: input.parent.subject,
    sourceTurn: checkpoint.sourceTurn,
    roundDurationCohort: checkpoint.roundDurationCohort,
    traversal: startTurnOccurrenceTraversal(
      retainedOccurrenceIds.slice(currentIndex + 1),
    ),
    context: {
      kind: "replay",
      previouslyAcceptedMovementFillHoleIds: [
        holeId(
          cloudkillStartTurnMovementHoleKey(
            checkpoint.sourceTurn,
            checkpoint.child.effectRef,
          ),
        ),
      ],
    },
    fills: input.fills,
    parent: input.parent,
  });
  if (suffix.tag === "result") return suffix.result;
  const acceptedHoleIds = new Set<BattleHoleId>([
    ...input.previouslyAcceptedHoleIds,
    ...suffix.acceptedHoleIds,
    ...completedPrefixHoleIds,
    ...(checkpoint.sequence.kind === "ordered" ? [orderHoleId] : []),
  ]);
  if (hasUnacceptedEndTurnFill(input.fills, acceptedHoleIds)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn replay received a fill unrelated to its retained start-turn occurrences.",
    );
  }
  const completedState = applyRoundDurationTickAfterStartTurnOccurrences(
    suffix.state,
    checkpoint.roundDurationCohort,
  );
  return {
    tag: "resolved",
    state: completedState,
    snapshot: snapshotBattle(completedState),
  };
}
function resolveCloudkillMovementSequenceResume(input: {
  readonly resolution: EndTurnResolutionInput;
  readonly parent: ReplayParentContinuation;
  readonly checkpoint: BattleStartTurnOccurrenceSequenceCheckpoint;
}): BattleResolutionResult {
  const { checkpoint, resolution } = input;
  if (
    currentActorId(resolution.state) !== checkpoint.sourceTurn.actorId ||
    resolution.state.initiative.round !== checkpoint.sourceTurn.round
  ) {
    return invalidResult(
      resolution.state,
      "staleSubject",
      "Cloudkill movement continuation no longer matches its source turn.",
    );
  }

  const boundaries = cloudkillStartTurnMovementEffects(
    resolution.state,
    checkpoint.sourceTurn.actorId,
  ).map(
    (effect): CloudkillMovementBoundary => ({
      effect,
      hole: cloudkillStartTurnMovementHole(checkpoint.sourceTurn, effect),
    }),
  );
  const movementFills = resolution.fills.filter(
    (fill): fill is CloudkillMovementFill => fill.kind === "cloudkillMovement",
  );
  const checkpointBoundary = boundaries.find(
    ({ effect }) => effect.effectRef === checkpoint.child.effectRef,
  );
  if (checkpointBoundary === undefined) {
    return completeCloudkillMovementSequenceResume(
      resolution.state,
      resolution.fills,
      checkpoint,
      input.parent,
      [cloudkillMovementSavingThrowHoleId(checkpoint)],
    );
  }
  const checkpointMovementFills = movementFills.filter(
    (fill) => fill.holeId === checkpointBoundary.hole.holeId,
  );
  if (checkpointMovementFills.length !== 1) {
    return invalidResult(
      resolution.state,
      "staleSubject",
      "Cloudkill movement continuation no longer has its exact movement facts.",
    );
  }
  const affectedCombatantIssue = cloudkillMovementAffectedCombatantIssue(
    resolution.state,
    checkpointMovementFills,
  );
  if (affectedCombatantIssue !== null) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      affectedCombatantIssue === "duplicate"
        ? "Cloudkill movement affected combatants must be unique."
        : "Cloudkill movement affected combatants must exist in the battle.",
    );
  }
  const requests = cloudkillMovementSaveDamageRequests([
    {
      ...checkpointBoundary,
      fill: checkpointMovementFills[0]!,
    },
  ]);
  const checkpointIndex = requests.findIndex((request) =>
    cloudkillMovementCheckpointMatchesRequest(checkpoint, request),
  );
  if (checkpointIndex === -1) {
    return invalidResult(
      resolution.state,
      "staleSubject",
      "Cloudkill movement continuation no longer has its exact affected occurrence.",
    );
  }
  const pendingRequests = requests
    .slice(checkpointIndex)
    .filter(
      (request) =>
        !request.effect.savedThisTurn.includes(request.subject.actorId),
    );
  if (pendingRequests.length === 0) {
    return completeCloudkillMovementSequenceResume(
      resolution.state,
      resolution.fills,
      checkpoint,
      input.parent,
      [cloudkillMovementSavingThrowHoleId(checkpoint)],
    );
  }
  const firstPendingRequest = pendingRequests[0];
  if (firstPendingRequest === undefined) {
    return invalidResult(
      resolution.state,
      "staleSubject",
      "Cloudkill movement continuation lost its pending occurrence.",
    );
  }
  const checkpointRequestPending = cloudkillMovementCheckpointMatchesRequest(
    checkpoint,
    firstPendingRequest,
  );
  const resumed = resolveCloudkillMovementSaveDamageSequence({
    advancedState: resolution.state,
    parent: input.parent,
    requests: pendingRequests,
    sourceTurn: checkpoint.sourceTurn,
    continuation: checkpointRequestPending
      ? { kind: "advancedPrefixAtCheckpoint", checkpoint }
      : { kind: "advancedPrefixAfterCheckpoint", checkpoint },
  });
  if (resumed.tag === "result") {
    return resumed.result;
  }
  return completeCloudkillMovementSequenceResume(
    resumed.state,
    resolution.fills,
    checkpoint,
    input.parent,
    [
      ...resumed.saveHoleIds,
      ...resumed.damageHoleIds,
      ...resumed.concentrationHoleIds,
      ...resumed.dispositionHoleIds,
    ],
  );
}

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
  spellTurnStartDamageEffectsBeforeCloudkillMovement,
  turnStartTemporaryHitPointProcedureRefsBeforeCloudkillMovement,
  deferStatBlockRecharge,
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
  const lightEmittersAfterDurationTick = lightEmittersAfterEndEffects;
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
  const combatantsAfterStartTurnEffects =
    applyStartOfTurnTemporaryHitPointEffects(
      combatantsAfterCloudkillSaveReset,
      nextActorId,
      turnStartTemporaryHitPointProcedureRefsBeforeCloudkillMovement,
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
    spellTurnStartDamageEffectsBeforeCloudkillMovement,
  ).combatants;
  const durationTick = {
    value: combatantsAfterSpellTurnStartDamage,
    flySpeedGrantEndFallCleanupFrames: [],
    spellEndTargetStatePromotionIds: [],
  };
  const combatantsAfterDurationTick = durationTick.value;
  flySpeedGrantEndFallCleanupFrames.push(
    ...durationTick.flySpeedGrantEndFallCleanupFrames,
  );
  const combatantsAfterRecharge = deferStatBlockRecharge
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

function roundDurationCohort(
  state: BattleState,
): BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"] {
  const wrapsRound =
    Number(nextInitiative(state.initiative).round) >
    Number(state.initiative.round);
  if (!wrapsRound) return { activeEffectRefs: [], lightEmitterRefs: [] };
  return {
    activeEffectRefs: [...state.combatants].flatMap(([, combatant]) =>
      combatant.activeEffects
        .filter(isTickingDurationActiveEffect)
        .map((effect) => effect.effectRef),
    ),
    lightEmitterRefs: state.lightEmitters.flatMap((emitter) =>
      emitter.kind !== "objectInvisibleRevealLightEmitter" &&
      emitter.expiresAt.kind === "duration"
        ? [emitter.effectRef]
        : [],
    ),
  };
}

function applyRoundDurationTickAfterStartTurnOccurrences(
  state: BattleState,
  cohort: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"],
): BattleState {
  if (
    cohort.activeEffectRefs.length === 0 &&
    cohort.lightEmitterRefs.length === 0
  )
    return state;
  const activeEffectRefs = new Set(cohort.activeEffectRefs);
  const durationTick = tickDurationEffects(
    state.combatants,
    {
      state,
      spellEndTargetStatePromotionTiming:
        END_OF_NEXT_TURN_NEW_ROUND_DURATION_TICK,
    },
    activeEffectRefs,
  );
  const lightEmitterRefs = new Set(cohort.lightEmitterRefs);
  const stateAfterTick = battleStateWithFlySpeedGrantEndFallCleanupFrames(
    {
      ...state,
      combatants: durationTick.value,
      lightEmitters: state.lightEmitters.flatMap((emitter) =>
        lightEmitterRefs.has(emitter.effectRef)
          ? tickDurationBattleLightEmitters([emitter])
          : [emitter],
      ),
    },
    durationTick.flySpeedGrantEndFallCleanupFrames,
  );
  return battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
    stateAfterTick,
    durationTick.spellEndTargetStatePromotionIds,
  );
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

function applyStartOfTurnTemporaryHitPointEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  sourceProcedureRefs: readonly BattleProcedureExecutionRef[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return sourceProcedureRefs.reduce((nextCombatants, sourceProcedureRef) => {
    const actor = nextCombatants.get(actorId);
    /* v8 ignore start -- @preserve -- Defensive inconsistent-state guard: battle admission and turn reducers keep every initiative combatant in the combatant map before start-of-turn effects run. */
    if (actor === undefined) return nextCombatants;
    /* v8 ignore stop -- @preserve */
    const effect = actor.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      > =>
        candidate.kind === "turnStartTemporaryHitPoints" &&
        candidate.sourceProcedureRef === sourceProcedureRef,
    );
    if (effect === undefined || effect.amount <= Number(actor.tempHp)) {
      return nextCombatants;
    }
    return new Map(nextCombatants).set(
      actorId,
      applyTemporaryHitPoints(actor, effect.amount),
    );
  }, combatants);
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

function spellTurnStartDamageOccurrenceOption(
  effect: SpellTurnStartDamageEffect,
): StartTurnOccurrenceOption {
  return startTurnOccurrenceOption(
    effect.kind === "spellCondition"
      ? "spellConditionTurnStartDamage"
      : "spellTurnStartDamageAndSave",
    { effectRef: effect.effectRef },
    "Resolve start-turn spell damage",
  );
}

function spellTurnStartDamageConcentrationSavingThrowHoles(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: SpellTurnStartDamageEffect;
  readonly damageAmount: number;
  readonly sourceTurn: {
    readonly actorId: CombatantId;
    readonly round: RoundType;
  };
}): readonly BattleConcentrationSavingThrowHole[] {
  const occurrenceId = spellTurnStartDamageOccurrenceOption(
    input.effect,
  ).occurrenceId;
  return damageLifecycleConcentrationSavingThrowHoles({
    state: input.state,
    target: input.target,
    damageAmount: input.damageAmount,
  }).map((hole) => {
    const key = `battle:spell-turn-start-damage-concentration:${input.sourceTurn.actorId}:${Number(input.sourceTurn.round)}:${occurrenceId}:${hole.combatantId}`;
    return {
      ...hole,
      holeId: holeId(key),
      holeInstanceKey: holeInstanceKey(key),
    };
  });
}

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
  const key = `battle:spell-turn-end-damage:${targetId}:${effect.effectRef}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell turn-end damage (${expr})`,
    spellTurnEndDamage: {
      targetId,
      effectRef: effect.effectRef,
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

function spellTurnEndDamageDownstreamHoles<
  Hole extends {
    readonly holeId: BattleHoleId;
    readonly holeInstanceKey: HoleInstanceKey;
  },
>(effect: SpellTurnEndDamageEffect, holes: readonly Hole[]): readonly Hole[] {
  return holes.map((hole) => {
    const key = `battle:spell-turn-end-damage-downstream:${effect.effectRef}:${hole.holeId}`;
    return {
      ...hole,
      damageOccurrence: {
        kind: "spellTurnEndDamage" as const,
        effectRef: effect.effectRef,
      },
      holeId: holeId(key),
      holeInstanceKey: holeInstanceKey(key),
    };
  });
}

function spellTurnEndDamageDownstreamFillsForRawHoles<
  Hole extends {
    readonly holeId: BattleHoleId;
    readonly holeInstanceKey: HoleInstanceKey;
  },
  Fill extends { readonly holeId: BattleHoleId },
>(
  effect: SpellTurnEndDamageEffect,
  rawHoles: readonly Hole[],
  fills: readonly Fill[],
): readonly Fill[] {
  const exactHoles = spellTurnEndDamageDownstreamHoles(effect, rawHoles);
  return rawHoles.flatMap((rawHole, index) => {
    const exactHole = exactHoles[index];
    const fill = fills.find(
      (candidate) => candidate.holeId === exactHole?.holeId,
    );
    return fill === undefined ? [] : [{ ...fill, holeId: rawHole.holeId }];
  });
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
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: SpellTurnStartDamageEffect,
): BattleSpellTurnStartDamageRollHole {
  const damage = spellTurnStartDamageForEffect(effect);
  const expr = `${damage.expr.dice}d${damage.expr.dieSize}`;
  const occurrenceId =
    spellTurnStartDamageOccurrenceOption(effect).occurrenceId;
  const key = `battle:spell-turn-start-damage:${sourceTurn.actorId}:${Number(sourceTurn.round)}:${occurrenceId}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell turn-start damage (${expr})`,
    spellTurnStartDamage: {
      targetId: sourceTurn.actorId,
      effectRef: effect.effectRef,
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
  hideousLaughterDamageRepeatSaveEventKey?: string,
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
      hideousLaughterDamageRepeatSaveEventKey,
      damageSourceId: effect.sourceCombatantId,
      spatialFacts: [],
    },
  );
}

function spellTurnStartSavingThrowOutcomeHole(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
  targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[] = [],
): BattleSpellTurnStartSavingThrowOutcomeHole {
  const key = spellTurnStartSavingThrowOutcomeHoleKey(sourceTurn, effect);
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Turn-start ${effect.save.ability.toUpperCase()} save`,
    spellTurnStartSave: {
      targetId: sourceTurn.actorId,
      effectRef: effect.effectRef,
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
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): string {
  const occurrenceId =
    spellTurnStartDamageOccurrenceOption(effect).occurrenceId;
  return `battle:spell-turn-start-save:${sourceTurn.actorId}:${Number(sourceTurn.round)}:${occurrenceId}`;
}

export function spellTurnStartSavingThrowOutcomeHoleId(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): BattleHoleId {
  return holeId(spellTurnStartSavingThrowOutcomeHoleKey(sourceTurn, effect));
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
      (candidate) => candidate.effectRef !== effect.effectRef,
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
      effectRef: effect.effectRef,
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
            effect.effectRef !== expiringEffect.effectRef &&
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
          (effect) => effect.effectRef !== expiringEffect.effectRef,
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
        candidate.effectRef === effect.effectRef
          ? { ...effect, ...patch }
          : candidate,
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
        (effect) => effect.effectRef !== expiringEffect.effectRef,
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
          (effect) => effect.effectRef !== expiringEffect.effectRef,
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
          (effect) => effect.effectRef !== expiringEffect.effectRef,
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
    !target.activeEffects.some(
      (effect) => effect.effectRef === effectOccurrence.effectRef,
    )
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
        (candidate) => candidate.effectRef !== effect.effectRef,
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
  effects: readonly SpellTurnStartDamageEffect[] = spellTurnStartDamageEffects(
    state.combatants.get(actorId),
  ),
): BattleState {
  return effects.reduce((nextState, effect) => {
    const hole = spellTurnStartDamageRollHole(
      { actorId, round: state.initiative.round },
      effect,
    );
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
    const concentrationLifecycleHoles =
      spellTurnStartDamageConcentrationSavingThrowHoles({
        state: nextState,
        target,
        effect,
        damageAmount,
        sourceTurn: {
          actorId,
          round: nextState.initiative.round,
        },
      });
    const concentrationHole = concentrationLifecycleHoles.find(
      (candidate) => candidate.combatantId === actorId,
    );
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
      concentrationHole === undefined
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationLifecycleFills,
            concentrationHole,
          ),
      concentrationLifecycleFills,
      damageDispositionForTarget(
        startTurnDamageDispositionHoles(
          nextState,
          { actorId, round: nextState.initiative.round },
          [{ effect, roll }],
        ),
        damageDispositions,
        actorId,
      ),
      hideousLaughterLifecycleFills,
    );
    if (effect.kind !== "spellTurnStartDamageAndSave") {
      return damaged;
    }
    const saveHole = spellTurnStartSavingThrowOutcomeHole(
      { actorId, round: state.initiative.round },
      effect,
    );
    const save = spellTurnStartSavingThrowOutcomeFor(saves, saveHole);
    const succeeded = save?.value.outcomes[0]?.succeeded === true;
    return succeeded
      ? removeSpellTurnStartDamageAndSaveEffect(damaged, actorId, effect)
      : damaged;
  }, state);
}

type StartTurnOccurrenceStep =
  | {
      readonly tag: "advanced";
      readonly state: BattleState;
      readonly acceptedHoleIds: ReadonlySet<BattleHoleId>;
    }
  | { readonly tag: "result"; readonly result: BattleResolutionResult };

function activeSpellTurnStartDamageEffect(
  state: BattleState,
  actorId: CombatantId,
  offered: SpellTurnStartDamageEffect,
): SpellTurnStartDamageEffect | undefined {
  const actor = state.combatants.get(actorId);
  return spellTurnStartDamageEffects(actor).find(
    (candidate) => candidate.effectRef === offered.effectRef,
  );
}

function startTurnDamageEventKey(
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  effect: SpellTurnStartDamageEffect,
): string {
  return `battle:start-turn-damage-event:${sourceTurn.actorId}:${Number(sourceTurn.round)}:${spellTurnStartDamageOccurrenceOption(effect).occurrenceId}`;
}

function resolveSpellTurnStartDamageOccurrence(input: {
  readonly state: BattleState;
  readonly resultState: BattleState;
  readonly subject: BattleSubject;
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly offeredEffect: SpellTurnStartDamageEffect;
  readonly fills: readonly BattleFill[];
}): StartTurnOccurrenceStep {
  const effect = activeSpellTurnStartDamageEffect(
    input.state,
    input.sourceTurn.actorId,
    input.offeredEffect,
  );
  if (effect === undefined) {
    return { tag: "advanced", state: input.state, acceptedHoleIds: new Set() };
  }
  const target = input.state.combatants.get(input.sourceTurn.actorId);
  if (target === undefined) {
    return { tag: "advanced", state: input.state, acceptedHoleIds: new Set() };
  }
  const rollHole = spellTurnStartDamageRollHole(input.sourceTurn, effect);
  const rollFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === rollHole.holeId,
  );
  if (rollFills.length === 0) {
    return {
      tag: "result",
      result: needsHolesResult(input.resultState, input.subject, [rollHole]),
    };
  }
  if (rollFills.length !== 1) {
    return {
      tag: "result",
      result: invalidResult(
        input.resultState,
        "invalidFill",
        "Start-turn damage roll must answer its exact occurrence once.",
      ),
    };
  }
  const roll = rollFills[0]!;
  const rollValidation = validateRolledDiceFillForDiceExpr(
    roll,
    spellTurnStartDamageForEffect(effect).expr,
  );
  if (rollValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(input.resultState, "invalidFill", rollValidation),
    };
  }
  const damageAmount = spellTurnStartDamageAmount(
    input.state,
    target,
    effect,
    roll,
  );
  const concentrationHoles = spellTurnStartDamageConcentrationSavingThrowHoles({
    state: input.state,
    target,
    effect,
    damageAmount,
    sourceTurn: input.sourceTurn,
  });
  const concentrationFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const exactConcentrationFills = fillsMatchingHoleIds(
    concentrationFills,
    concentrationHoles,
  );
  const missingConcentrationHoles = concentrationHoles.filter(
    (hole) =>
      concentrationSavingThrowFillFor(exactConcentrationFills, hole) ===
      undefined,
  );
  if (missingConcentrationHoles.length > 0) {
    return {
      tag: "result",
      result: needsHolesResult(
        input.resultState,
        input.subject,
        missingConcentrationHoles,
      ),
    };
  }
  if (exactConcentrationFills.length !== concentrationHoles.length) {
    return {
      tag: "result",
      result: invalidResult(
        input.resultState,
        "invalidFill",
        "Start-turn damage Concentration fills must answer each exact occurrence once.",
      ),
    };
  }
  const dispositionHoles = startTurnDamageDispositionHoles(
    input.state,
    input.sourceTurn,
    [{ effect, roll }],
  );
  const dispositionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const exactDispositionFills = fillsMatchingHoleIds(
    dispositionFills,
    dispositionHoles,
  );
  const dispositionIssue = damageDispositionFillsValidation({
    holes: dispositionHoles,
    fills: exactDispositionFills,
  });
  if (dispositionIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.resultState, "invalidFill", dispositionIssue),
    };
  }
  const missingDispositionHoles = dispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(exactDispositionFills, hole) === undefined,
  );
  if (missingDispositionHoles.length > 0) {
    return {
      tag: "result",
      result: needsHolesResult(
        input.resultState,
        input.subject,
        missingDispositionHoles,
      ),
    };
  }
  const damageEventKey = startTurnDamageEventKey(input.sourceTurn, effect);
  const hideousHoles = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
    state: input.state,
    target,
    damageAmount,
    damageEventKey,
  });
  const savingThrowFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  const exactHideousFills = fillsMatchingHoleIds(
    savingThrowFills,
    hideousHoles,
  );
  const hideousCheck = damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
    state: input.state,
    target,
    damageAmount,
    fills: exactHideousFills,
    damageEventKey,
  });
  if (hideousCheck.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(
        input.resultState,
        "invalidFill",
        hideousCheck.message,
      ),
    };
  }
  if (hideousCheck.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(
        input.resultState,
        input.subject,
        hideousCheck.holes,
      ),
    };
  }
  const saveHole =
    effect.kind === "spellTurnStartDamageAndSave"
      ? spellTurnStartSavingThrowOutcomeHole(
          input.sourceTurn,
          effect,
          savingThrowFlatBonusProjections(
            input.state,
            effect.save.ability,
          ).filter(
            (projection) => projection.targetId === input.sourceTurn.actorId,
          ),
        )
      : undefined;
  const save =
    saveHole === undefined
      ? undefined
      : spellTurnStartSavingThrowOutcomeFor(savingThrowFills, saveHole);
  const exactSaveFills =
    saveHole === undefined
      ? []
      : savingThrowFills.filter((fill) => fill.holeId === saveHole.holeId);
  if (exactSaveFills.length > 1) {
    return {
      tag: "result",
      result: invalidResult(
        input.resultState,
        "invalidFill",
        "Start-turn ending save must answer its exact occurrence once.",
      ),
    };
  }
  if (saveHole !== undefined && save === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.resultState, input.subject, [saveHole]),
    };
  }
  if (save !== undefined) {
    const saveIssue = validateSpellTurnStartSavingThrowOutcome(
      save.value,
      input.sourceTurn.actorId,
    );
    if (saveIssue !== null) {
      return {
        tag: "result",
        result: invalidResult(input.resultState, "invalidFill", saveIssue),
      };
    }
  }
  const rawConcentrationHoles = damageLifecycleConcentrationSavingThrowHoles({
    state: input.state,
    target,
    damageAmount,
  });
  const rawConcentrationFills = rawConcentrationHoles.flatMap((rawHole) => {
    const exactHole = concentrationHoles.find(
      (hole) => hole.combatantId === rawHole.combatantId,
    );
    const fill =
      exactHole === undefined
        ? undefined
        : concentrationSavingThrowFillFor(exactConcentrationFills, exactHole);
    return fill === undefined ? [] : [{ ...fill, holeId: rawHole.holeId }];
  });
  const mainConcentrationHole = rawConcentrationHoles.find(
    (hole) => hole.combatantId === input.sourceTurn.actorId,
  );
  const damaged = applySpellTurnStartDamage(
    input.state,
    target,
    effect,
    roll,
    mainConcentrationHole === undefined
      ? undefined
      : concentrationSavingThrowFillFor(
          rawConcentrationFills,
          mainConcentrationHole,
        ),
    rawConcentrationFills,
    damageDispositionForTarget(
      dispositionHoles,
      exactDispositionFills,
      input.sourceTurn.actorId,
    ),
    exactHideousFills,
    damageEventKey,
  );
  const nextState =
    effect.kind === "spellTurnStartDamageAndSave" &&
    save?.value.outcomes[0]?.succeeded === true
      ? removeSpellTurnStartDamageAndSaveEffect(
          damaged,
          input.sourceTurn.actorId,
          effect,
        )
      : damaged;
  return {
    tag: "advanced",
    state: nextState,
    acceptedHoleIds: new Set([
      rollHole.holeId,
      ...concentrationHoles.map((hole) => hole.holeId),
      ...dispositionHoles.map((hole) => hole.holeId),
      ...hideousHoles.map((hole) => hole.holeId),
      ...(saveHole === undefined ? [] : [saveHole.holeId]),
    ]),
  };
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
    const rawConcentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const exactConcentrationHole =
      concentrationHole === null
        ? null
        : spellTurnEndDamageDownstreamHoles(effect, [concentrationHole])[0]!;
    const concentrationLifecycleFills =
      spellTurnEndDamageDownstreamFillsForRawHoles(
        effect,
        rawConcentrationLifecycleHoles,
        concentrationSavingThrows,
      );
    const rawHideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: nextState,
        target,
        damageAmount,
      });
    const hideousLaughterLifecycleFills =
      spellTurnEndDamageDownstreamFillsForRawHoles(
        effect,
        rawHideousLaughterLifecycleHoles,
        hideousLaughterDamageRepeatSaves,
      );
    const exactConcentrationFill =
      exactConcentrationHole === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationSavingThrows,
            exactConcentrationHole,
          );
    const concentrationFill =
      exactConcentrationFill === undefined || concentrationHole === null
        ? undefined
        : { ...exactConcentrationFill, holeId: concentrationHole.holeId };
    const rawDispositionHoles = endTurnDamageDispositionRawHoles(
      nextState,
      actorId,
      [{ effect, roll }],
    );
    const rawDispositionFills = spellTurnEndDamageDownstreamFillsForRawHoles(
      effect,
      rawDispositionHoles,
      damageDispositions,
    );
    return applyPreparedSlotSpellDamage(nextState, actorId, damageAmount, {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      damageDisposition: damageDispositionForTarget(
        rawDispositionHoles,
        rawDispositionFills,
        actorId,
      ),
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: effect.sourceCombatantId,
      spatialFacts: [],
    });
  }, state);
}

type OrderedStartTurnOccurrenceSequenceResult =
  | {
      readonly tag: "advanced";
      readonly state: BattleState;
      readonly acceptedHoleIds: ReadonlySet<BattleHoleId>;
      readonly matchedMovementFillHoleIds: ReadonlySet<BattleHoleId>;
      readonly movementSaveHoleIds: ReadonlySet<BattleHoleId>;
      readonly movementDamageHoleIds: ReadonlySet<BattleHoleId>;
      readonly movementConcentrationHoleIds: ReadonlySet<BattleHoleId>;
      readonly movementDispositionHoleIds: ReadonlySet<BattleHoleId>;
    }
  | { readonly tag: "result"; readonly result: BattleResolutionResult };

function resolveOrderedStartTurnOccurrences(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly roundDurationCohort: BattleStartTurnOccurrenceSequenceCheckpoint["roundDurationCohort"];
  readonly traversal: StartTurnOccurrenceTraversal;
  readonly fills: readonly BattleFill[];
  readonly parent: ReplayParentContinuation;
  readonly context:
    | {
        readonly kind: "root";
        readonly resultState: BattleState;
        readonly offeredHandles: readonly StartTurnOccurrenceHandle[];
      }
    | {
        readonly kind: "replay";
        readonly previouslyAcceptedMovementFillHoleIds: readonly BattleHoleId[];
      };
}): OrderedStartTurnOccurrenceSequenceResult {
  const acceptedHoleIds = new Set<BattleHoleId>();
  const matchedMovementFillHoleIds = new Set<BattleHoleId>();
  const previouslyAcceptedMovementFillHoleIds =
    input.context.kind === "replay"
      ? input.context.previouslyAcceptedMovementFillHoleIds
      : [];
  for (const id of previouslyAcceptedMovementFillHoleIds) {
    matchedMovementFillHoleIds.add(id);
    acceptedHoleIds.add(id);
  }
  const movementSaveHoleIds = new Set<BattleHoleId>();
  const movementDamageHoleIds = new Set<BattleHoleId>();
  const movementConcentrationHoleIds = new Set<BattleHoleId>();
  const movementDispositionHoleIds = new Set<BattleHoleId>();
  const movementFills = input.fills.filter(
    (fill): fill is CloudkillMovementFill => fill.kind === "cloudkillMovement",
  );
  let prefixState = input.state;
  const resultState = (): BattleState =>
    input.context.kind === "replay" ? prefixState : input.context.resultState;

  const occurrenceIds =
    input.traversal.kind === "none"
      ? []
      : input.traversal.kind === "single"
        ? [input.traversal.occurrenceId]
        : input.traversal.occurrenceIds;
  for (const occurrenceId of occurrenceIds) {
    const handle =
      (input.context.kind === "root"
        ? input.context.offeredHandles.find(
            (candidate) =>
              startTurnOccurrenceOptionForHandle(candidate).occurrenceId ===
              occurrenceId,
          )
        : undefined) ??
      startTurnOccurrenceHandlesForState(
        prefixState,
        input.sourceTurn.actorId,
      ).find(
        (candidate) =>
          startTurnOccurrenceOptionForHandle(candidate).occurrenceId ===
          occurrenceId,
      );
    if (handle === undefined) continue;
    if (handle.kind === "deathSavingThrow") {
      const actor = prefixState.combatants.get(input.sourceTurn.actorId);
      if (!startTurnDeathSavingThrowRequired(actor)) continue;
      const hole = deathSavingThrowHole(input.sourceTurn.actorId);
      const fills = input.fills.filter(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "deathSavingThrow" }> =>
          fill.kind === "deathSavingThrow" && fill.holeId === hole.holeId,
      );
      if (fills.length === 0) {
        return {
          tag: "result",
          result: needsHolesResult(resultState(), input.subject, [hole]),
        };
      }
      if (fills.length !== 1) {
        return {
          tag: "result",
          result: invalidResult(
            resultState(),
            "invalidFill",
            "Death Saving Throw must answer its exact ordered occurrence once.",
          ),
        };
      }
      const fill = fills[0]!;
      if (
        d20TestNaturalOneRerollDieDecisionRequired({
          actor,
          originalNaturalD20: Number(fill.value),
          decision: fill.d20TestNaturalOneReroll,
        })
      ) {
        return {
          tag: "result",
          result: needsHolesResult(resultState(), input.subject, [
            d20TestNaturalOneRerollHoleWithOption(hole),
          ]),
        };
      }
      const rerollIssue = d20TestNaturalOneRerollDieIssue({
        actor,
        originalNaturalD20: Number(fill.value),
        decision: fill.d20TestNaturalOneReroll,
      });
      if (rerollIssue !== null) {
        return {
          tag: "result",
          result: invalidResult(resultState(), "invalidFill", rerollIssue),
        };
      }
      prefixState = {
        ...prefixState,
        combatants: applyStartTurnDeathSavingThrow(
          prefixState.combatants,
          input.sourceTurn.actorId,
          effectiveD20TestNaturalOneRerollDeathSavingThrow(fill).value,
        ),
      };
      acceptedHoleIds.add(hole.holeId);
      continue;
    }
    if (handle.kind === "statBlockRecharge") {
      const hole = statBlockRechargeRollHole(
        prefixState.combatants.get(input.sourceTurn.actorId),
      );
      if (hole === null) continue;
      const fills = input.fills.filter(
        (
          fill,
        ): fill is Extract<
          BattleFill,
          { readonly kind: "statBlockRechargeRoll" }
        > =>
          fill.kind === "statBlockRechargeRoll" && fill.holeId === hole.holeId,
      );
      if (fills.length === 0) {
        return {
          tag: "result",
          result: needsHolesResult(resultState(), input.subject, [hole]),
        };
      }
      if (
        fills.length !== 1 ||
        !statBlockRechargeRollFillMatchesHole(fills[0]!.value, hole)
      ) {
        return {
          tag: "result",
          result: invalidResult(
            resultState(),
            "invalidFill",
            "Stat Block Recharge roll must match its exact ordered occurrence once.",
          ),
        };
      }
      prefixState = {
        ...prefixState,
        combatants: processStatBlockRechargeRolls(
          prefixState.combatants,
          input.sourceTurn.actorId,
          fills[0]!.value,
        ),
      };
      acceptedHoleIds.add(hole.holeId);
      continue;
    }
    if (handle.kind === "turnStartTemporaryHitPoints") {
      const exactEffect = prefixState.combatants
        .get(input.sourceTurn.actorId)
        ?.activeEffects.find(
          (
            effect,
          ): effect is Extract<
            BattleActiveEffect,
            { readonly kind: "turnStartTemporaryHitPoints" }
          > =>
            effect.kind === "turnStartTemporaryHitPoints" &&
            effect.effectRef === handle.effect.effectRef,
        );
      if (exactEffect === undefined) continue;
      const actor = prefixState.combatants.get(input.sourceTurn.actorId);
      if (actor === undefined) continue;
      const grantedTemporaryHitPoints = Math.max(0, exactEffect.amount);
      if (grantedTemporaryHitPoints === 0) continue;
      if (Number(actor.tempHp) === 0) {
        prefixState = {
          ...prefixState,
          combatants: new Map(prefixState.combatants).set(
            input.sourceTurn.actorId,
            applyTemporaryHitPoints(actor, grantedTemporaryHitPoints),
          ),
        };
        continue;
      }
      const occurrenceId =
        startTurnOccurrenceOptionForHandle(handle).occurrenceId;
      const hole = temporaryHitPointChoiceHole({
        sourceTurn: input.sourceTurn,
        occurrenceId,
        sourceProcedureRef: exactEffect.sourceProcedureRef,
        effectRef: exactEffect.effectRef,
        sourceCombatantId: exactEffect.sourceCombatantId,
        existingTemporaryHitPoints: Number(actor.tempHp),
        grantedTemporaryHitPoints,
      });
      const fills = input.fills.filter(
        (
          fill,
        ): fill is Extract<
          BattleFill,
          { readonly kind: "temporaryHitPointChoice" }
        > =>
          fill.kind === "temporaryHitPointChoice" &&
          fill.holeId === hole.holeId,
      );
      if (fills.length === 0) {
        return {
          tag: "result",
          result: needsHolesResult(resultState(), input.subject, [hole]),
        };
      }
      if (fills.length !== 1) {
        return {
          tag: "result",
          result: invalidResult(
            resultState(),
            "invalidFill",
            "Temporary Hit Point choice must answer its exact occurrence once.",
          ),
        };
      }
      acceptedHoleIds.add(hole.holeId);
      if (fills[0]!.value === "replaceWithGranted") {
        prefixState = {
          ...prefixState,
          combatants: new Map(prefixState.combatants).set(
            input.sourceTurn.actorId,
            { ...actor, tempHp: Hp(grantedTemporaryHitPoints) },
          ),
        };
      }
      continue;
    }
    if (
      handle.kind === "spellConditionTurnStartDamage" ||
      handle.kind === "spellTurnStartDamageAndSave"
    ) {
      const step = resolveSpellTurnStartDamageOccurrence({
        state: prefixState,
        resultState: resultState(),
        subject: input.subject,
        sourceTurn: input.sourceTurn,
        offeredEffect: handle.effect,
        fills: input.fills,
      });
      if (step.tag === "result") return step;
      prefixState = step.state;
      for (const id of step.acceptedHoleIds) acceptedHoleIds.add(id);
      continue;
    }
    const effect = cloudkillStartTurnMovementEffects(
      prefixState,
      input.sourceTurn.actorId,
    ).find((candidate) => candidate.effectRef === handle.effect.effectRef);
    if (effect === undefined) continue;
    const hole = cloudkillStartTurnMovementHole(input.sourceTurn, effect);
    const matchingFills = movementFills.filter(
      (fill) => fill.holeId === hole.holeId,
    );
    if (matchingFills.length === 0) {
      if (
        movementFills.some(
          (fill) => !matchedMovementFillHoleIds.has(fill.holeId),
        )
      ) {
        return {
          tag: "result",
          result: invalidResult(
            resultState(),
            "invalidFill",
            "Cloudkill movement fill does not match the next ordered occurrence.",
          ),
        };
      }
      return {
        tag: "result",
        result: needsHolesResult(resultState(), input.subject, [hole]),
      };
    }
    if (matchingFills.length !== 1) {
      return {
        tag: "result",
        result: invalidResult(
          resultState(),
          "invalidFill",
          "Cloudkill movement fills must match each ordered occurrence exactly once.",
        ),
      };
    }
    const fill = matchingFills[0]!;
    const completedPrefixHoleIds = [...acceptedHoleIds].sort();
    matchedMovementFillHoleIds.add(fill.holeId);
    acceptedHoleIds.add(fill.holeId);
    const affectedIssue = cloudkillMovementAffectedCombatantIssue(prefixState, [
      fill,
    ]);
    if (affectedIssue !== null) {
      return {
        tag: "result",
        result: invalidResult(
          resultState(),
          "invalidFill",
          affectedIssue === "duplicate"
            ? "Cloudkill movement affected combatants must be unique."
            : "Cloudkill movement affected combatants must exist in the battle.",
        ),
      };
    }
    if (input.traversal.kind === "none") {
      return {
        tag: "result",
        result: invalidResult(
          resultState(),
          "staleSubject",
          "Cloudkill movement lost its owning start-turn occurrence sequence.",
        ),
      };
    }
    const resolution = resolveCloudkillMovementSaveDamageSequence({
      advancedState: prefixState,
      parent: input.parent,
      requests: cloudkillMovementSaveDamageRequests([{ effect, hole, fill }]),
      sourceTurn: input.sourceTurn,
      continuation: {
        kind: "turnBoundaryReplay",
        sequence: input.traversal,
        completedPrefixHoleIds,
        roundDurationCohort: input.roundDurationCohort,
      },
    });
    if (resolution.tag === "result") return resolution;
    prefixState = resolution.state;
    for (const id of resolution.saveHoleIds) {
      acceptedHoleIds.add(id);
      movementSaveHoleIds.add(id);
    }
    for (const id of resolution.damageHoleIds) {
      acceptedHoleIds.add(id);
      movementDamageHoleIds.add(id);
    }
    for (const id of resolution.concentrationHoleIds) {
      acceptedHoleIds.add(id);
      movementConcentrationHoleIds.add(id);
    }
    for (const id of resolution.dispositionHoleIds) {
      acceptedHoleIds.add(id);
      movementDispositionHoleIds.add(id);
    }
  }
  return {
    tag: "advanced",
    state: prefixState,
    acceptedHoleIds,
    matchedMovementFillHoleIds,
    movementSaveHoleIds,
    movementDamageHoleIds,
    movementConcentrationHoleIds,
    movementDispositionHoleIds,
  };
}

function endTurnDamageDispositionHoles(
  state: BattleState,
  actorId: CombatantId,
  damageRolls: readonly {
    readonly effect: SpellTurnEndDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[],
): readonly BattleAttackDamageDispositionHole[] {
  return damageRolls.flatMap(({ effect, roll }) =>
    spellTurnEndDamageDownstreamHoles(
      effect,
      endTurnDamageDispositionRawHoles(state, actorId, [{ effect, roll }]),
    ),
  );
}

function endTurnDamageDispositionRawHoles(
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
    const dispositionHole = zeroHitPointReplacementDispositionHole({
      damageSourceId: effect.sourceCombatantId,
      target,
      damageAmount: spellTurnEndDamageAmount(state, target, effect, roll),
    });
    return dispositionHole === null ? [] : [dispositionHole];
  });
}

function startTurnDamageDispositionHoles(
  state: BattleState,
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  damageRolls: readonly {
    readonly effect: SpellTurnStartDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[],
): readonly BattleAttackDamageDispositionHole[] {
  return damageRolls.flatMap(({ effect, roll }) => {
    const target = state.combatants.get(sourceTurn.actorId);
    if (target === undefined) {
      return [];
    }
    const occurrenceId =
      spellTurnStartDamageOccurrenceOption(effect).occurrenceId;
    const key = `battle:spell-turn-start-damage-disposition:${sourceTurn.actorId}:${Number(sourceTurn.round)}:${occurrenceId}`;
    return (
      zeroHitPointReplacementDispositionHole({
        damageSourceId: effect.sourceCombatantId,
        target,
        damageAmount: spellTurnStartDamageAmount(state, target, effect, roll),
        holeKey: {
          holeId: holeId(key),
          holeInstanceKey: holeInstanceKey(key),
          label: "Start-turn spell damage disposition",
        },
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
  cohortEffectRefs?: ReadonlySet<BattleEffectExecutionRef>,
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
        if (
          !isTickingDurationActiveEffect(effect) ||
          (cohortEffectRefs !== undefined &&
            !cohortEffectRefs.has(effect.effectRef))
        ) {
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

type EndTurnResolutionInput = BattleResolutionInput & {
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
  readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
};

export function resolveEndTurnCommand(
  input: EndTurnResolutionInput,
): BattleResolutionResult {
  const parent = replayParentContinuationFor(input);
  const result = resolveEndTurnCommandForParent(input, parent);
  return input.replayParentPosition === undefined
    ? projectReplayChildResult(parent, result)
    : result;
}

export function resolveDelegatedEndTurnCommand(
  parentInput: BattleResolutionInput & {
    readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
    readonly replayObjectOutcomes?: BattleObjectOutcomeAccumulation;
  },
  endTurnInput: BattleResolutionInput,
): BattleResolutionResult {
  const parent = replayParentContinuationFor({
    state: endTurnInput.state,
    subject: parentInput.subject,
    fills: parentInput.fills,
    ...(parentInput.replayObjectOutcomes === undefined
      ? {}
      : { objectOutcomes: parentInput.replayObjectOutcomes }),
  });
  const result = resolveEndTurnCommandForParent(
    {
      ...endTurnInput,
      ...(parentInput.replayParentPosition === undefined
        ? {}
        : { replayParentPosition: parentInput.replayParentPosition }),
    },
    parent,
  );
  return parentInput.replayParentPosition === undefined
    ? projectReplayChildResult(parent, result)
    : result;
}

function resolveEndTurnCommandForParent(
  input: EndTurnResolutionInput,
  parent: ReplayParentContinuation,
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

  if (input.replayParentPosition !== undefined) {
    return resolveCloudkillMovementSequenceResume({
      resolution: input,
      parent,
      checkpoint: input.replayParentPosition,
    });
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
  const rechargeHole = statBlockRechargeRollHole(nextActor);
  const nextSourceTurn = {
    actorId: nextActorId,
    round: initiative.round,
  };
  const boundaryRoundDurationCohort = roundDurationCohort(input.state);
  const startTurnOccurrenceHandles = startTurnOccurrenceHandlesForState(
    input.state,
    nextActorId,
  );
  const startTurnOccurrences = startTurnOccurrenceHandles.map(
    startTurnOccurrenceOptionForHandle,
  );
  if (
    new Set(startTurnOccurrences.map(({ occurrenceId }) => occurrenceId))
      .size !== startTurnOccurrences.length
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Start-turn occurrences must have unique execution identities.",
    );
  }
  const startTurnOccurrenceOrderHoles =
    startTurnOccurrences.length < 2
      ? []
      : [
          startTurnOccurrenceOrderHole(nextSourceTurn, [
            startTurnOccurrences[0]!,
            startTurnOccurrences[1]!,
            ...startTurnOccurrences.slice(2),
          ]),
        ];
  const startTurnOccurrenceOrderFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "startTurnOccurrenceOrder" }
    > => fill.kind === "startTurnOccurrenceOrder",
  );
  const unmatchedStartTurnOccurrenceOrderFill =
    startTurnOccurrenceOrderFills.find(
      (fill) =>
        !startTurnOccurrenceOrderHoles.some(
          (hole) => hole.holeId === fill.holeId,
        ),
    );
  if (
    unmatchedStartTurnOccurrenceOrderFill !== undefined ||
    startTurnOccurrenceOrderHoles.some(
      (hole) =>
        startTurnOccurrenceOrderFills.filter(
          (fill) => fill.holeId === hole.holeId,
        ).length > 1,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Start-turn occurrence ordering fills must match the current turn boundary exactly once.",
    );
  }
  const startTurnOccurrenceOrderFill = startTurnOccurrenceOrderFills[0];
  if (startTurnOccurrenceOrderFill !== undefined) {
    const expectedIds = new Set(
      startTurnOccurrences.map(({ occurrenceId }) => occurrenceId),
    );
    const submittedIds = startTurnOccurrenceOrderFill.value.occurrenceIds;
    if (
      submittedIds.length !== expectedIds.size ||
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.some((id) => !expectedIds.has(id))
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Start-turn occurrence order must be an exact permutation of the offered occurrences.",
      );
    }
  }
  const missingStartTurnOccurrenceOrderHoles =
    startTurnOccurrenceOrderHoles.filter(
      (hole) =>
        !startTurnOccurrenceOrderFills.some(
          (fill) => fill.holeId === hole.holeId,
        ),
    );
  if (missingStartTurnOccurrenceOrderHoles.length > 0) {
    if (input.fills.some((fill) => fill.kind === "cloudkillMovement")) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Start-turn movement fills require the exact occurrence order first.",
      );
    }
    return needsHolesResult(
      input.state,
      input.subject,
      missingStartTurnOccurrenceOrderHoles,
    );
  }
  const matchedStartTurnOccurrenceHandles =
    startTurnOccurrenceOrderFill === undefined
      ? startTurnOccurrenceHandles
      : startTurnOccurrenceOrderFill.value.occurrenceIds.map(
          (occurrenceId) =>
            startTurnOccurrenceHandles[
              startTurnOccurrences.findIndex(
                (occurrence) => occurrence.occurrenceId === occurrenceId,
              )
            ],
        );
  if (
    matchedStartTurnOccurrenceHandles.some((handle) => handle === undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Start-turn occurrence order contains an unknown occurrence.",
    );
  }
  const orderedStartTurnOccurrenceHandles =
    matchedStartTurnOccurrenceHandles.filter(
      (handle): handle is StartTurnOccurrenceHandle => handle !== undefined,
    );
  const initialHoles = [
    ...sleepRepeatSaveHoles,
    ...hideousLaughterRepeatSaveHoles,
    ...spellConditionEndTurnSaveHoles,
    ...unitFeatureConditionEndTurnSaveHoles,
    ...slowActivePenaltiesEndTurnSaveHoles,
    ...abilityD20TestEndTurnSaveHoles,
    ...endTurnDamageHoles,
  ];
  const missingInitialHoles = initialHoles.filter(
    (hole) => !input.fills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingInitialHoles.length > 0) {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: missingInitialHoles,
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
  const startTurnDamageRollRequestsBeforeCloudkillMovement: readonly {
    readonly effect: SpellTurnStartDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[] = [];
  const missingTurnBoundaryDamageHoles =
    firstMissingTurnBoundaryDamageHoleFrontier({
      endTurn: endTurnDamageRollCollection.missingHoles,
      startTurn: [],
    });
  if (missingTurnBoundaryDamageHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingTurnBoundaryDamageHoles,
    );
  }
  const turnBoundaryDamageHoleIds = new Set<BattleHoleId>(
    endTurnDamageHoles.map((hole) => hole.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.filter(
      (fill) =>
        fill.kind === "rolledDice" &&
        turnBoundaryDamageHoleIds.has(fill.holeId),
    ).length !== endTurnDamageRolls.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate rolled dice fills for turn-boundary damage.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
      const rawHoles = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: input.state,
        target: actor,
        damageAmount,
      });
      const check = damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: input.state,
        target: actor,
        damageAmount,
        fills: spellTurnEndDamageDownstreamFillsForRawHoles(
          request.effect,
          rawHoles,
          savingThrowOutcomeFills,
        ),
      });
      return check.tag === "invalid"
        ? check
        : {
            ...check,
            holes: spellTurnEndDamageDownstreamHoles(
              request.effect,
              check.holes,
            ),
          };
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
    startTurnDamageRollRequestsBeforeCloudkillMovement.map((request) => {
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
      ...endTurnHideousLaughterDamageRepeatSaveHoles,
    ].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    savingThrowOutcomeFills.filter((fill) =>
      savingThrowOutcomeHoleIds.has(fill.holeId),
    ).length !==
    sleepRepeatSaves.length +
      hideousLaughterRepeatSaves.length +
      spellConditionEndTurnSaves.length +
      spellConditionCountedEndTurnSaves.length +
      unitFeatureConditionEndTurnSaves.length +
      slowActivePenaltiesEndTurnSaves.length +
      abilityD20TestEndTurnSaves.length +
      endTurnHideousLaughterDamageRepeatSaves.length
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
  for (const request of startTurnDamageRollRequestsBeforeCloudkillMovement) {
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
      return spellTurnEndDamageDownstreamHoles(
        request.effect,
        damageLifecycleConcentrationSavingThrowHoles({
          state: input.state,
          target,
          damageAmount: spellTurnEndDamageAmount(
            input.state,
            target,
            request.effect,
            request.roll,
          ),
        }),
      );
    },
  );
  const startTurnConcentrationHoles =
    startTurnDamageRollRequestsBeforeCloudkillMovement.flatMap((request) => {
      const target = nextActor;
      /* v8 ignore start -- @preserve -- Internal turn-boundary invariant: a start-turn damage request exists only when its target nextActor supplied the source effect. */
      if (target === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
      return spellTurnStartDamageConcentrationSavingThrowHoles({
        state: input.state,
        target,
        effect: request.effect,
        damageAmount: spellTurnStartDamageAmount(
          input.state,
          target,
          request.effect,
          request.roll,
        ),
        sourceTurn: nextSourceTurn,
      });
    });
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
    concentrationSavingThrowFills.filter((fill) =>
      concentrationHoleIds.has(fill.holeId),
    ).length !== turnBoundaryConcentrationHoles.length
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
    ...startTurnDamageRollRequestsBeforeCloudkillMovement.flatMap((request) =>
      startTurnDamageDispositionHoles(input.state, nextSourceTurn, [request]),
    ),
  ];
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: fillsMatchingHoleIds(damageDispositionFills, damageDispositionHoles),
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
  const advancedTurn = resolveEndTurn({
    state: input.state,
    deathSavingThrowRoll: undefined,
    statBlockRechargeRolls: [],
    sleepRepeatSaves,
    hideousLaughterRepeatSaves,
    spellConditionEndTurnSaves,
    spellConditionCountedEndTurnSaves,
    unitFeatureConditionEndTurnSaves,
    slowActivePenaltiesEndTurnSaves,
    abilityD20TestRollModeEndTurnSaves: abilityD20TestEndTurnSaves,
    spellTurnEndDamageRolls: endTurnDamageRolls,
    spellTurnStartDamageRolls: [],
    spellTurnStartSaves: [],
    turnBoundaryHideousLaughterDamageRepeatSaves,
    concentrationSavingThrows: concentrationSavingThrowFills.filter((fill) =>
      concentrationHoleIds.has(fill.holeId),
    ),
    damageDispositions: damageDispositionFills,
    spellTurnStartDamageEffectsBeforeCloudkillMovement: [],
    turnStartTemporaryHitPointProcedureRefsBeforeCloudkillMovement: [],
    deferStatBlockRecharge: true,
  });
  const orderedOccurrenceResolution = resolveOrderedStartTurnOccurrences({
    state: advancedTurn.state,
    subject: input.subject,
    sourceTurn: nextSourceTurn,
    roundDurationCohort: boundaryRoundDurationCohort,
    traversal: startTurnOccurrenceTraversal(
      orderedStartTurnOccurrenceHandles.map(
        (handle) => startTurnOccurrenceOptionForHandle(handle).occurrenceId,
      ),
    ),
    context: {
      kind: "root",
      resultState: input.state,
      offeredHandles: orderedStartTurnOccurrenceHandles,
    },
    fills: input.fills,
    parent,
  });
  if (orderedOccurrenceResolution.tag === "result") {
    return orderedOccurrenceResolution.result;
  }
  const cloudkillMovementFills = input.fills.filter(
    (fill): fill is CloudkillMovementFill => fill.kind === "cloudkillMovement",
  );
  if (
    cloudkillMovementFills.some(
      (fill) =>
        !orderedOccurrenceResolution.matchedMovementFillHoleIds.has(
          fill.holeId,
        ),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Cloudkill movement fill does not belong to an applicable ordered occurrence.",
    );
  }
  const orderedOccurrenceHoleIds = orderedOccurrenceResolution.acceptedHoleIds;
  const movementAffectedResolution = {
    tag: "resolved" as const,
    state: orderedOccurrenceResolution.state,
    saveHoleIds: orderedOccurrenceResolution.movementSaveHoleIds,
    damageHoleIds: orderedOccurrenceResolution.movementDamageHoleIds,
    concentrationHoleIds:
      orderedOccurrenceResolution.movementConcentrationHoleIds,
    dispositionHoleIds: orderedOccurrenceResolution.movementDispositionHoleIds,
  };
  const acceptedEndTurnHoleIds = new Set<BattleHoleId>([
    ...savingThrowOutcomeHoleIds,
    ...turnBoundaryDamageHoleIds,
    ...concentrationHoleIds,
    ...damageDispositionHoles.map((hole) => hole.holeId),
    ...orderedOccurrenceHoleIds,
    ...(startTurnOccurrenceOrderFill === undefined
      ? []
      : [startTurnOccurrenceOrderFill.holeId]),
  ]);
  if (hasUnacceptedEndTurnFill(input.fills, acceptedEndTurnHoleIds)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received a fill unrelated to its current turn-boundary holes.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const finalState = applyRoundDurationTickAfterStartTurnOccurrences(
    movementAffectedResolution.state,
    boundaryRoundDurationCohort,
  );
  return {
    tag: "resolved",
    state: finalState,
    snapshot: snapshotBattle(finalState),
  };
}

const END_TURN_FILL_KINDS = [
  "attackDamageDisposition",
  "cloudkillMovement",
  "startTurnOccurrenceOrder",
  "temporaryHitPointChoice",
  "concentrationSavingThrow",
  "deathSavingThrow",
  "rolledDice",
  "savingThrowOutcome",
  "statBlockRechargeRoll",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;

const END_TURN_FILL_KIND_SET: ReadonlySet<BattleFill["kind"]> = new Set(
  END_TURN_FILL_KINDS,
);

function hasUnacceptedEndTurnFill(
  fills: readonly BattleFill[],
  acceptedHoleIds: ReadonlySet<BattleHoleId>,
): boolean {
  return fills.some(
    (fill) =>
      END_TURN_FILL_KIND_SET.has(fill.kind) &&
      !acceptedHoleIds.has(fill.holeId),
  );
}

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
