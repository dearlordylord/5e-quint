// Spell active-effect application extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature

// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
export { applyDirectConditionSpellEffects } from "./direct-condition-lifecycle.ts";

import { Match } from "effect";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  type DifficultyClass,
  type MovementFeet,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  SpellRecord,
} from "@dnd/surface/surface/types";
import {
  battleDancingLightId,
  battleSpellEffectOccurrenceId,
} from "../identity.ts";
import type {
  BattleAreaId,
  BattleLineDirectionId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  combatantWearingArmor,
  currentActorId,
} from "./creature-state-leaves.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import { activeEffectsWithCreatureSizeChangeReplaced } from "./creature-size-change-effects.ts";
import {
  applyHitPointMaximumIncrease,
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "./damage-apply.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "./fly-speed-grant-end-fall-cleanup.ts";
import { scalarBuffTemporaryHitPointsAmount } from "./spell-effects.ts";
import {
  battleCreatureAfterConditionRemoval,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  concentrationSpellEffectSourcesDirectlyApplyingCondition,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
  removeSpellConditionEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  type MarkedDamageRiderTransferState,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleCommandOption,
  type BattleCreatureState,
  type BattleDancingLight,
  type BattleDancingLightList,
  type BattleDancingLightsPlacementValue,
  type BattleFill,
  type BattleAntimagicFieldAffectedOngoingSpellEffect,
  type BattleIllumination,
  type BattleLightEmitter,
  type BattleLightEmitterAttachment,
  type BattleLightEmitterProjection,
  type BattleLightEmitterProjectionFact,
  type BattleMagicalDarknessAreaChoice,
  type BattleLightlyObscuredPerceptionRollMode,
  type BattleMagicalDarknessNonmagicalLightProjectionFact,
  type BattleMagicalDarknessSightProjectionFact,
  type BattleMagicalDarknessZone,
  type BattleObscurementZone,
  type BattleObjectOutline,
  type BattleSightObserver,
  type BattleSightObscurement,
  type BattleSpellAreaChoice,
  type BattleState,
  type SpellCreatedHeldObjectActiveEffect,
  type SpellCreatedHeldObjectState,
  type BattleSpecialSpeedKind,
  type SelfTransformationModeEffectPayload,
  type SelfTransformationModeKind,
  type SpellActiveEffectPostDamageRider,
  type SpellFailedSaveConditionChoiceEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellSelectedFailedSaveConditionEffect,
  type SpellLightEmissionPostDamageRider,
  type SpellPostDamageRider,
  type SpellPostDamageRiderExpiration,
  type SelectedRollModifierSpellEffect,
  type SupportedSpellInvocation,
  type BattleWebRestraintTrigger,
} from "../battle-reducer.ts";
import type { BattleObjectId } from "../identity.ts";
import {
  antimagicFieldSuppressedOngoingSpellEffectKeys,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "./antimagic-field-suppression.ts";
import { HIDEOUS_LAUGHTER_DURATION_TICKS } from "./domain-constants.ts";
import {
  battleCreatureWithSpellCreatedHeldObjectHand,
  spellCreatedHeldObjectFreeHand,
} from "./spell-created-held-object.ts";
import {
  battleCreatureWithSpellActiveEffects,
  battleCreatureWithoutSpellCreatedHeldObjectHand,
} from "../active-effect/lifecycle.ts";
import { spellInvocationEffectiveSpellLevel } from "./spells-effective-level.ts";

export const FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND = 60;
export const FAERIE_FIRE_DIM_LIGHT_RADIUS_FEET = movementFeet(10);

export type SelectFailedSaveConditionEffectResult =
  | {
      readonly tag: "selected";
      readonly effect: SpellSelectedFailedSaveConditionEffect;
    }
  | {
      readonly tag: "needsConditionChoice";
      readonly effect: SpellFailedSaveConditionChoiceEffect;
    }
  | { readonly tag: "invalidConditionChoice"; readonly message: string };

export function selectFailedSaveConditionEffect(
  effect: SpellFailedSaveConditionEffect,
  conditionChoice: SpellSelectedFailedSaveConditionEffect["condition"] | null,
): SelectFailedSaveConditionEffectResult {
  if (effect.kind === "fixed") {
    return {
      tag: "selected",
      effect: selectedConditionEffect(effect, effect.condition),
    };
  }
  if (conditionChoice === null) {
    return { tag: "needsConditionChoice", effect };
  }
  return effect.choices.includes(conditionChoice)
    ? {
        tag: "selected",
        effect: selectedConditionEffect(effect, conditionChoice),
      }
    : {
        tag: "invalidConditionChoice",
        message: "Condition choice is not available for this spell.",
      };
}

function selectedConditionEffect(
  effect: SpellFailedSaveConditionEffect,
  condition: SpellSelectedFailedSaveConditionEffect["condition"],
): SpellSelectedFailedSaveConditionEffect {
  return effect.repeatSave === null
    ? {
        condition,
        expiresAt: effect.expiresAt,
        escape: effect.escape,
        turnStartDamage: effect.turnStartDamage,
        repeatSave: null,
      }
    : {
        condition,
        expiresAt: effect.expiresAt,
        escape: null,
        turnStartDamage: null,
        repeatSave: effect.repeatSave,
      };
}
export const DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET = movementFeet(10);
export const SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET = movementFeet(5);
export const PERCEPTION_LIGHTLY_OBSCURED_ROLL_MODE = "disadvantage" as const;
const SHINING_SMITE_DIM_ADDITIONAL_RADIUS_FEET = movementFeet(0);
type DancingLightsActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "dancingLights" }
>;
type DancingLightsEffectShape =
  | Pick<
      Extract<DancingLightsActiveEffect, { readonly form: "separateLights" }>,
      "form" | "lights"
    >
  | Pick<
      Extract<
        DancingLightsActiveEffect,
        { readonly form: "combinedMediumForm" }
      >,
      "form" | "light"
    >;

export type SaveGatedAttackRollAdvantageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

export type ThaumaturgyBoomingVoiceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "thaumaturgyBoomingVoice" }
>;

export type BlurAttackRollDefenseInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "blurAttackRollDefense" }
>;

export type SeeInvisibleObserverSightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "seeInvisibleObserverSight" }
>;

export type MirrorImageHitInterceptionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "mirrorImageHitInterception" }
>;

export function isThaumaturgyBoomingVoiceEffectForInvocation(
  effect: BattleActiveEffect,
  actorId: CombatantId,
  invocation: ThaumaturgyBoomingVoiceInvocation,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "thaumaturgyBoomingVoice" }
> {
  return (
    effect.kind === "thaumaturgyBoomingVoice" &&
    effect.sourceSpellId === invocation.spell.id &&
    effect.sourceCombatantId === actorId
  );
}

export function saveGatedAttackRollAdvantageInvocationIsFaerieFire(
  invocation: SaveGatedAttackRollAdvantageInvocation,
): boolean {
  return (
    invocation.effect.kind === "faerieFireOutline" &&
    invocation.effect.sourceSpellId === invocation.spell.id
  );
}

export function activeFeatherFallDescentRateCapFeetPerRound(
  combatant: BattleCreatureState,
): typeof FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND | null {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "featherFallMitigation",
  )
    ? FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND
    : null;
}

export function featherFallLandingCleanupForCombatant(
  combatant: BattleCreatureState,
):
  | { readonly tag: "mitigated"; readonly combatant: BattleCreatureState }
  | { readonly tag: "unmitigated"; readonly combatant: BattleCreatureState } {
  const activeEffects = combatant.activeEffects.filter(
    (effect) => effect.kind !== "featherFallMitigation",
  );
  if (activeEffects.length === combatant.activeEffects.length) {
    return { tag: "unmitigated", combatant };
  }
  return {
    tag: "mitigated",
    combatant: battleCreatureWithSpellActiveEffects(combatant, activeEffects),
  };
}

export function applySpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  if (invocation.postDamageRiders.length === 0) {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const activeEffects = invocation.postDamageRiders
    .filter(isSpellActiveEffectPostDamageRider)
    .reduce((effects, rider): readonly BattleActiveEffect[] => {
      const replacedEffects = effects.filter((effect) =>
        spellPostDamageRiderReplacesActiveEffect(
          rider,
          effect,
          invocation.spell.id,
          actorId,
        ),
      );
      return [
        ...effects.filter((effect) => !replacedEffects.includes(effect)),
        spellPostDamageRiderActiveEffect({
          state,
          actorId,
          target,
          spellId: invocation.spell.id,
          rider,
        }),
      ];
    }, target.activeEffects);

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function battleLightEmitters(
  state: BattleState,
): readonly BattleLightEmitter[] {
  const suppressedEffectKeys =
    antimagicFieldSuppressedOngoingSpellEffectKeys(state);
  const outlineLightEmitters = [...state.combatants.values()].flatMap(
    (combatant): readonly BattleLightEmitter[] =>
      combatant.activeEffects.flatMap(
        (effect): readonly BattleLightEmitter[] =>
          effect.kind === "faerieFireOutline"
            ? [
                faerieFireCombatantDimLightEmitter(
                  combatant.combatantId,
                  effect,
                ),
              ]
            : effect.kind === "shiningSmiteIllumination"
              ? [
                  shiningSmiteCombatantBrightLightEmitter(
                    combatant.combatantId,
                    effect,
                  ),
                ]
              : effect.kind === "heldLight"
                ? [
                    {
                      kind: "spellLightEmitter",
                      sourceSpellId: effect.sourceSpellId,
                      sourceCombatantId: effect.sourceCombatantId,
                      attachment: {
                        kind: "combatant",
                        combatantId: combatant.combatantId,
                      },
                      emission: {
                        kind: "brightAndDim",
                        brightRadiusFeet: effect.brightRadiusFeet,
                        dimAdditionalFeet: effect.dimAdditionalFeet,
                      },
                      opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
                      expiresAt: effect.expiresAt,
                    },
                  ]
                : effect.kind === "spellCreatedHeldObject" &&
                    effect.objectState.kind === "held"
                  ? [
                      {
                        kind: "spellLightEmitter" as const,
                        sourceSpellId: effect.sourceSpellId,
                        sourceCombatantId: effect.sourceCombatantId,
                        attachment: {
                          kind: "combatant" as const,
                          combatantId: combatant.combatantId,
                        },
                        emission: {
                          kind: "brightAndDim" as const,
                          brightRadiusFeet: effect.light.brightRadiusFeet,
                          dimAdditionalFeet: effect.light.dimAdditionalFeet,
                        },
                        opaqueCoverInteraction: {
                          kind: "doesNotBlockEmission" as const,
                        },
                        expiresAt: effect.expiresAt,
                      },
                    ]
                  : effect.kind === "dancingLights"
                    ? dancingLightsFromEffect(effect).map((light) => ({
                        kind: "spellLightEmitter" as const,
                        sourceSpellId: effect.sourceSpellId,
                        sourceCombatantId: effect.sourceCombatantId,
                        attachment: {
                          kind: "dancingLight" as const,
                          lightId: light.lightId,
                          positionId: light.positionId,
                          form: effect.form,
                        },
                        emission: {
                          kind: "dim" as const,
                          radiusFeet: DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET,
                        },
                        opaqueCoverInteraction: {
                          kind: "doesNotBlockEmission" as const,
                        },
                        expiresAt: effect.expiresAt,
                      }))
                    : [],
      ),
  );
  const emitters = [
    ...state.lightEmitters,
    ...outlineLightEmitters,
    ...state.objectOutlines.map(faerieFireObjectDimLightEmitter),
  ];
  return suppressedEffectKeys.size === 0
    ? emitters
    : emitters.filter(
        (emitter) =>
          !(
            isTrackedOngoingSpellLightEmitter(emitter) &&
            suppressedEffectKeys.has(
              ongoingSpellEffectRefKey(
                ongoingSpellEffectRefForEmitter(emitter),
              ),
            )
          ),
      );
}

export function battleLightEmitterProjection(
  emitter: BattleLightEmitter,
  fact: BattleLightEmitterProjectionFact,
): BattleLightEmitterProjection | null {
  if (!lightEmitterMatchesProjectionFact(emitter, fact)) {
    return null;
  }
  if (lightEmitterOpaqueCoverBlocksEmission(emitter, fact)) {
    return null;
  }
  const illumination = illuminationFromEmissionAtDistance(
    emitter.emission,
    fact.distanceFeet,
  );
  return illumination === "darkness" ? null : { emitter, illumination };
}

export function battleIlluminationFromLightEmitters(
  emitters: readonly BattleLightEmitter[],
  facts: readonly BattleLightEmitterProjectionFact[],
): BattleIllumination {
  const projections = emitters.flatMap((emitter) =>
    facts.flatMap((fact) => {
      const projection = battleLightEmitterProjection(emitter, fact);
      return projection === null ? [] : [projection];
    }),
  );
  if (
    projections.some((projection) => projection.illumination === "brightLight")
  ) {
    return "brightLight";
  }
  return projections.some(
    (projection) => projection.illumination === "dimLight",
  )
    ? "dimLight"
    : "darkness";
}

export function battleSightObscurement(
  illumination: BattleIllumination,
  observer: BattleSightObserver = { kind: "ordinarySight" },
): BattleSightObscurement {
  return obscurementFromIllumination(
    battleIlluminationForObserver(illumination, observer),
  );
}

export function battleMagicalDarknessSightObscurement(
  zone: BattleMagicalDarknessZone,
  fact: BattleMagicalDarknessSightProjectionFact,
  observer: BattleSightObserver = { kind: "ordinarySight" },
): Extract<BattleSightObscurement, "heavilyObscured"> | null {
  if (zone.area.areaId !== fact.areaId) {
    return null;
  }
  return Match.value(observer).pipe(
    Match.when({ kind: "ordinarySight" }, () => "heavilyObscured" as const),
    Match.when({ kind: "darkvision" }, () => "heavilyObscured" as const),
    Match.exhaustive,
  );
}

export function battleMagicalDarknessNonmagicalLightIllumination(
  zone: BattleMagicalDarknessZone,
  fact: BattleMagicalDarknessNonmagicalLightProjectionFact,
): Extract<BattleIllumination, "darkness"> | null {
  return zone.area.areaId === fact.areaId ? "darkness" : null;
}

export function battlePerceptionRollModeForSight(
  illumination: BattleIllumination,
  observer: BattleSightObserver = { kind: "ordinarySight" },
): BattleLightlyObscuredPerceptionRollMode | undefined {
  return battlePerceptionRollModeForObscurement(
    battleSightObscurement(illumination, observer),
  );
}

export function battlePerceptionRollModeForObscurement(
  obscurement: BattleSightObscurement,
): BattleLightlyObscuredPerceptionRollMode | undefined {
  return Match.value(obscurement).pipe(
    Match.when("unobscured", () => undefined),
    Match.when("lightlyObscured", () => PERCEPTION_LIGHTLY_OBSCURED_ROLL_MODE),
    Match.when("heavilyObscured", () => undefined),
    Match.exhaustive,
  );
}

export function spellCreatedHeldObjectEffectForSource(
  combatant: BattleCreatureState | undefined,
  sourceCombatantId: CombatantId,
  sourceSpellId: SpellRecord["id"],
): SpellCreatedHeldObjectActiveEffect | undefined {
  return combatant?.activeEffects.find(
    (effect): effect is SpellCreatedHeldObjectActiveEffect =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.sourceCombatantId === sourceCombatantId &&
      effect.sourceSpellId === sourceSpellId,
  );
}

export function spellCreatedHeldObjectEffectsForActor(
  combatant: BattleCreatureState | undefined,
): readonly SpellCreatedHeldObjectActiveEffect[] {
  return (
    combatant?.activeEffects.filter(
      (effect): effect is SpellCreatedHeldObjectActiveEffect =>
        effect.kind === "spellCreatedHeldObject" &&
        effect.sourceCombatantId === combatant.combatantId,
    ) ?? []
  );
}

export function applySpellCreatedHeldObjectEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly activeEffect: SpellCreatedHeldObjectActiveEffect;
}):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const actor = input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  const freeHand = spellCreatedHeldObjectFreeHand(input.state, input.actorId);
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellCreatedHeldObject" &&
          effect.sourceSpellId === input.activeEffect.sourceSpellId &&
          effect.sourceCombatantId === input.activeEffect.sourceCombatantId
        ),
    ),
    input.activeEffect,
  ];
  const nextActor = battleCreatureWithSpellCreatedHeldObjectHand(
    {
      ...actor,
      activeEffects,
    },
    freeHand,
  );
  return {
    tag: "updated",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(input.actorId, nextActor),
    },
  };
}

export function setSpellCreatedHeldObjectState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly effect: SpellCreatedHeldObjectActiveEffect;
  readonly objectState: SpellCreatedHeldObjectState;
}):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const actor = input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  const activeEffects = actor.activeEffects.map((effect) =>
    effect === input.effect
      ? { ...input.effect, objectState: input.objectState }
      : effect,
  );
  const nextActor =
    input.objectState.kind === "held"
      ? spellCreatedHeldObjectHeldActor({
          state: input.state,
          actor: { ...actor, activeEffects },
          actorId: input.actorId,
        })
      : {
          tag: "updated" as const,
          actor: battleCreatureWithoutSpellCreatedHeldObjectHand({
            ...actor,
            activeEffects,
          }),
        };
  if (nextActor.tag === "invalid") {
    return nextActor;
  }
  return {
    tag: "updated",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.actorId,
        nextActor.actor,
      ),
    },
  };
}

function spellCreatedHeldObjectHeldActor(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState;
}):
  | { readonly tag: "updated"; readonly actor: BattleCreatureState }
  | { readonly tag: "invalid"; readonly message: string } {
  const freeHand = spellCreatedHeldObjectFreeHand(input.state, input.actorId);
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  return {
    tag: "updated",
    actor: battleCreatureWithSpellCreatedHeldObjectHand(input.actor, freeHand),
  };
}

function lightEmitterMatchesProjectionFact(
  emitter: BattleLightEmitter,
  fact: BattleLightEmitterProjectionFact,
): boolean {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) =>
      lightEmitterAttachmentMatchesFact(spellEmitter.attachment, fact),
    ),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectEmitter) =>
        fact.kind === "object" && objectEmitter.objectId === fact.objectId,
    ),
    Match.exhaustive,
  );
}

function lightEmitterAttachmentMatchesFact(
  attachment: BattleLightEmitterAttachment,
  fact: BattleLightEmitterProjectionFact,
): boolean {
  return Match.value(attachment).pipe(
    Match.when(
      { kind: "combatant" },
      (combatantAttachment) =>
        fact.kind === "combatant" &&
        combatantAttachment.combatantId === fact.combatantId,
    ),
    Match.when(
      { kind: "object" },
      (objectAttachment) =>
        fact.kind === "object" && objectAttachment.objectId === fact.objectId,
    ),
    Match.when(
      { kind: "dancingLight" },
      (lightAttachment) =>
        fact.kind === "dancingLight" &&
        lightAttachment.lightId === fact.lightId &&
        lightAttachment.positionId === fact.positionId &&
        lightAttachment.form === fact.form,
    ),
    Match.exhaustive,
  );
}

function lightEmitterOpaqueCoverBlocksEmission(
  emitter: BattleLightEmitter,
  fact: BattleLightEmitterProjectionFact,
): boolean {
  return (
    fact.kind === "object" &&
    fact.opaqueCover &&
    emitter.kind === "spellLightEmitter" &&
    emitter.opaqueCoverInteraction.kind === "blocksEmission"
  );
}

function illuminationFromEmissionAtDistance(
  emission: BattleLightEmitter["emission"],
  distanceFeet: number,
): BattleIllumination {
  return Match.value(emission).pipe(
    Match.when({ kind: "dim" }, (dim) =>
      distanceFeet <= dim.radiusFeet ? "dimLight" : "darkness",
    ),
    Match.when({ kind: "brightAndDim" }, (brightAndDim) =>
      distanceFeet <= brightAndDim.brightRadiusFeet
        ? "brightLight"
        : distanceFeet <=
            brightAndDim.brightRadiusFeet + brightAndDim.dimAdditionalFeet
          ? "dimLight"
          : "darkness",
    ),
    Match.exhaustive,
  );
}

function battleIlluminationForObserver(
  illumination: BattleIllumination,
  observer: BattleSightObserver,
): BattleIllumination {
  if (
    observer.kind !== "darkvision" ||
    observer.distanceFeet > observer.rangeFeet
  ) {
    return illumination;
  }
  return Match.value(illumination).pipe(
    Match.when("brightLight", () => "brightLight" as const),
    Match.when("dimLight", () => "brightLight" as const),
    Match.when("darkness", () => "dimLight" as const),
    Match.exhaustive,
  );
}

function obscurementFromIllumination(
  illumination: BattleIllumination,
): BattleSightObscurement {
  return Match.value(illumination).pipe(
    Match.when("brightLight", () => "unobscured" as const),
    Match.when("dimLight", () => "lightlyObscured" as const),
    Match.when("darkness", () => "heavilyObscured" as const),
    Match.exhaustive,
  );
}

function faerieFireCombatantDimLightEmitter(
  combatantId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "faerieFireOutline" }>,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: effect.sourceSpellId,
    sourceCombatantId: effect.sourceCombatantId,
    attachment: { kind: "combatant", combatantId },
    emission: {
      kind: "dim",
      radiusFeet: FAERIE_FIRE_DIM_LIGHT_RADIUS_FEET,
    },
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
    expiresAt: effect.expiresAt,
  };
}

function shiningSmiteCombatantBrightLightEmitter(
  combatantId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "shiningSmiteIllumination" }
  >,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: effect.sourceSpellId,
    sourceCombatantId: effect.sourceCombatantId,
    attachment: { kind: "combatant", combatantId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET,
      dimAdditionalFeet: SHINING_SMITE_DIM_ADDITIONAL_RADIUS_FEET,
    },
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
    expiresAt: effect.expiresAt,
  };
}

function faerieFireObjectDimLightEmitter(
  outline: BattleObjectOutline,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: outline.sourceSpellId,
    sourceCombatantId: outline.sourceCombatantId,
    attachment: { kind: "object", objectId: outline.objectId },
    emission: {
      kind: "dim",
      radiusFeet: FAERIE_FIRE_DIM_LIGHT_RADIUS_FEET,
    },
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
    expiresAt: outline.expiresAt,
  };
}

export function battleObscurementZones(
  state: BattleState,
): readonly BattleObscurementZone[] {
  return [...state.combatants.values()].flatMap(
    (combatant): readonly BattleObscurementZone[] =>
      combatant.activeEffects.flatMap(
        (effect): readonly BattleObscurementZone[] =>
          effect.kind === "fogCloudObscurement"
            ? [
                {
                  kind: "spellObscurementZone",
                  sourceSpellId: effect.sourceSpellId,
                  sourceCombatantId: effect.sourceCombatantId,
                  obscurement: "heavilyObscured",
                  area: {
                    kind: "pointOriginSphere",
                    areaId: effect.areaId,
                    radiusFeet: effect.radiusFeet,
                  },
                  expiresAt: effect.expiresAt,
                },
              ]
            : effect.kind === "magicalDarknessPointOrigin"
              ? [
                  {
                    kind: "spellMagicalDarknessZone",
                    sourceSpellId: effect.sourceSpellId,
                    sourceCombatantId: effect.sourceCombatantId,
                    area: {
                      kind: "pointOriginSphere",
                      areaId: effect.areaId,
                      radiusFeet: effect.radiusFeet,
                    },
                    expiresAt: effect.expiresAt,
                  },
                ]
              : effect.kind === "webRestraintHazard"
                ? [
                    {
                      kind: "spellObscurementZone",
                      sourceSpellId: effect.sourceSpellId,
                      sourceCombatantId: effect.sourceCombatantId,
                      obscurement: "lightlyObscured",
                      area: {
                        kind: "pointOriginCube",
                        areaId: effect.areaId,
                        sideFeet: effect.sideFeet,
                      },
                      expiresAt: effect.expiresAt,
                    },
                  ]
                : [],
      ),
  );
}

export function applySpellLightEmitterEffects(
  state: BattleState,
  actorId: CombatantId,
  attachment: BattleLightEmitterAttachment,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLightHurl" | "spellAttackDamage" }
  >,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  const lightRiders = invocation.postDamageRiders.filter(
    isSpellLightEmissionPostDamageRider,
  );
  if (lightRiders.length === 0) {
    return state;
  }
  const nextEmitters = lightRiders.reduce(
    (emitters, rider): readonly BattleLightEmitter[] => [
      ...emitters.filter(
        (emitter) =>
          !(
            emitter.sourceSpellId === invocation.spell.id &&
            emitter.sourceCombatantId === actorId &&
            lightEmitterMatchesAttachment(emitter, attachment)
          ),
      ),
      lightEmitterFromPostDamageRider(
        state,
        actorId,
        attachment,
        invocation,
        rider,
      ),
    ],
    state.lightEmitters,
  );
  return { ...state, lightEmitters: nextEmitters };
}

export function expireBattleLightEmitters(
  emitters: readonly BattleLightEmitter[],
  shouldExpire: (emitter: BattleLightEmitter) => boolean,
): readonly BattleLightEmitter[] {
  return emitters.filter((emitter) => !shouldExpire(emitter));
}

export function tickDurationBattleLightEmitters(
  emitters: readonly BattleLightEmitter[],
): readonly BattleLightEmitter[] {
  return emitters.flatMap((emitter): readonly BattleLightEmitter[] => {
    if (emitter.kind === "objectInvisibleRevealLightEmitter") {
      return [emitter];
    }
    if (emitter.expiresAt.kind !== "duration") {
      return [emitter];
    }
    const remainingTicks = Number(emitter.expiresAt.durationTicks) - 1;
    return remainingTicks <= 0
      ? []
      : [
          {
            ...emitter,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(remainingTicks),
            },
          },
        ];
  });
}

function sameLightEmitterAttachment(
  left: BattleLightEmitterAttachment,
  right: BattleLightEmitterAttachment,
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "combatant" },
      (leftCombatant) =>
        right.kind === "combatant" &&
        leftCombatant.combatantId === right.combatantId,
    ),
    Match.when(
      { kind: "object" },
      (leftObject) =>
        right.kind === "object" && leftObject.objectId === right.objectId,
    ),
    Match.when(
      { kind: "dancingLight" },
      (leftLight) =>
        right.kind === "dancingLight" &&
        leftLight.lightId === right.lightId &&
        leftLight.positionId === right.positionId &&
        leftLight.form === right.form,
    ),
    Match.exhaustive,
  );
}

function lightEmitterMatchesAttachment(
  emitter: BattleLightEmitter,
  attachment: BattleLightEmitterAttachment,
): boolean {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) =>
      sameLightEmitterAttachment(spellEmitter.attachment, attachment),
    ),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectRevealEmitter) =>
        attachment.kind === "object" &&
        objectRevealEmitter.objectId === attachment.objectId,
    ),
    Match.exhaustive,
  );
}

export function applyDancingLightsSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >,
  placement: Extract<
    BattleDancingLightsPlacementValue,
    { readonly mode: "cast" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const dancingLights = dancingLightsForCastPlacement(
    actorId,
    invocation,
    placement,
  );
  if (dancingLights === null) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "dancingLights" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "dancingLights",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          expiresAt: invocation.expiresAt,
          ...dancingLights,
        },
      ],
    }),
  };
}

export function repositionDancingLightsSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >,
  placement: Extract<
    BattleDancingLightsPlacementValue,
    { readonly mode: "reposition" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: caster.activeEffects.flatMap((effect) => {
        if (
          effect.kind !== "dancingLights" ||
          effect.sourceSpellId !== invocation.spell.id ||
          effect.sourceCombatantId !== actorId
        ) {
          return [effect];
        }
        const moved = dancingLightsForReposition(
          effect,
          placement,
          invocation.rangeFeet,
        );
        return moved === null ? [] : [{ ...effect, ...moved }];
      }),
    }),
  };
}

function dancingLightsForCastPlacement(
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >,
  placement: Extract<
    BattleDancingLightsPlacementValue,
    { readonly mode: "cast" }
  >,
): DancingLightsEffectShape | null {
  if (
    invocation.procedure === "dancingLightsCombinedCast" &&
    placement.form === "combinedMediumForm"
  ) {
    return {
      form: "combinedMediumForm",
      light: {
        lightId: battleDancingLightId(
          `${actorId}:${invocation.spell.id}:combinedMediumForm:1`,
        ),
        positionId: placement.light.positionId,
      },
    };
  }
  if (
    invocation.procedure === "dancingLightsSeparateCast" &&
    placement.form === "separateLights"
  ) {
    const lights = dancingLightListFromArray(
      placement.lights.map((light, index) => ({
        lightId: battleDancingLightId(
          `${actorId}:${invocation.spell.id}:separateLights:${index + 1}`,
        ),
        positionId: light.positionId,
      })),
    );
    if (lights === null) {
      return null;
    }
    return {
      form: "separateLights",
      lights,
    };
  }
  return null;
}

function dancingLightsForReposition(
  effect: Extract<BattleActiveEffect, { readonly kind: "dancingLights" }>,
  placement: Extract<
    BattleDancingLightsPlacementValue,
    { readonly mode: "reposition" }
  >,
  rangeFeet: number,
): DancingLightsEffectShape | null {
  if (
    effect.form === "combinedMediumForm" &&
    placement.form === "combinedMediumForm"
  ) {
    if (placement.light.distanceFromCasterFeet > rangeFeet) {
      return null;
    }
    return {
      form: "combinedMediumForm",
      light: {
        lightId: effect.light.lightId,
        positionId: placement.light.positionId,
      },
    };
  }
  if (effect.form !== "separateLights" || placement.form !== "separateLights") {
    return null;
  }
  const currentDancingLightById = new Map(
    effect.lights.map((dancingLight) => [dancingLight.lightId, dancingLight]),
  );
  const lights = placement.lights.flatMap((candidate) => {
    const current = currentDancingLightById.get(candidate.lightId);
    return current === undefined || candidate.distanceFromCasterFeet > rangeFeet
      ? []
      : [{ lightId: current.lightId, positionId: candidate.positionId }];
  });
  const narrowedLights = dancingLightListFromArray(lights);
  return narrowedLights === null
    ? null
    : { form: "separateLights", lights: narrowedLights };
}

function dancingLightListFromArray(
  lights: readonly BattleDancingLight[],
): BattleDancingLightList | null {
  if (new Set(lights.map((light) => light.lightId)).size !== lights.length) {
    return null;
  }
  return lights.length === 1
    ? [lights[0]!]
    : lights.length === 2
      ? [lights[0]!, lights[1]!]
      : lights.length === 3
        ? [lights[0]!, lights[1]!, lights[2]!]
        : lights.length === 4
          ? [lights[0]!, lights[1]!, lights[2]!, lights[3]!]
          : null;
}

export function dancingLightsFromEffect(
  effect: Extract<BattleActiveEffect, { readonly kind: "dancingLights" }>,
): readonly BattleDancingLight[] {
  return effect.form === "combinedMediumForm" ? [effect.light] : effect.lights;
}

function lightEmitterFromPostDamageRider(
  state: BattleState,
  actorId: CombatantId,
  attachment: BattleLightEmitterAttachment,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
  rider: SpellLightEmissionPostDamageRider,
): BattleLightEmitter {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    state,
    actorId,
    actorId,
    rider.expiresAt,
  );
  const base = {
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
  };
  return attachment.kind === "object" &&
    rider.emission.kind === "dim" &&
    Number(rider.emission.radiusFeet) === 10 &&
    expiresAt.kind === "endOfTurn" &&
    invocation.postDamageRiders.some(
      (postDamageRider) => postDamageRider.kind === "invisibleBenefitDenied",
    )
    ? {
        kind: "objectInvisibleRevealLightEmitter",
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        objectId: attachment.objectId,
        emission: rider.emission,
        expiresAt,
      }
    : {
        ...base,
        kind: "spellLightEmitter",
        attachment,
        emission: rider.emission,
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt,
      };
}

function isSpellActiveEffectPostDamageRider(
  rider: SpellPostDamageRider,
): rider is SpellActiveEffectPostDamageRider {
  return rider.kind !== "lightEmission";
}

function isSpellLightEmissionPostDamageRider(
  rider: SpellPostDamageRider,
): rider is SpellLightEmissionPostDamageRider {
  return rider.kind === "lightEmission";
}

export type SelfTransformationModeActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "selfTransformation" }
>;

const SELF_TRANSFORMATION_MODE_LABELS = {
  aquaticAdaptation: "Aquatic Adaptation",
  changeAppearance: "Change Appearance",
  naturalWeapons: "Natural Weapons",
} as const satisfies Record<SelfTransformationModeKind, string>;

export function selfTransformationModeLabel(
  mode: SelfTransformationModeKind,
): string {
  return SELF_TRANSFORMATION_MODE_LABELS[mode];
}

export function activeSelfTransformationModeEffect(
  combatant: BattleCreatureState | undefined,
  source?: {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: SpellRecord["id"];
  },
): SelfTransformationModeActiveEffect | undefined {
  return combatant?.activeEffects.find(
    (effect): effect is SelfTransformationModeActiveEffect =>
      effect.kind === "selfTransformation" &&
      (source === undefined ||
        (effect.sourceCombatantId === source.sourceCombatantId &&
          effect.sourceSpellId === source.sourceSpellId)),
  );
}

export function battleCreatureCanBreatheUnderwater(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    activeSelfTransformationModeEffect(combatant)?.mode === "aquaticAdaptation"
  );
}

export function activeSelfTransformationNaturalWeaponsEffect(
  combatant: BattleCreatureState | undefined,
):
  | Extract<
      SelfTransformationModeActiveEffect,
      { readonly mode: "naturalWeapons" }
    >
  | undefined {
  const effect = activeSelfTransformationModeEffect(combatant);
  return effect?.mode === "naturalWeapons" ? effect : undefined;
}

export function selfTransformationModeSpecialSpeedKind(
  effect: BattleActiveEffect,
): BattleSpecialSpeedKind | null {
  return effect.kind === "selfTransformation" &&
    effect.mode === "aquaticAdaptation"
    ? "swim"
    : null;
}

export function applySelfTransformationModeEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly modeEffect: SelfTransformationModeEffectPayload;
  readonly expiresAt: SelfTransformationModeActiveEffect["expiresAt"];
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return input.state;
  }
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "selfTransformation" &&
          effect.sourceCombatantId === input.sourceCombatantId &&
          effect.sourceSpellId === input.sourceSpellId
        ),
    ),
    {
      kind: "selfTransformation" as const,
      sourceSpellId: input.sourceSpellId,
      sourceCombatantId: input.sourceCombatantId,
      ...input.modeEffect,
      expiresAt: input.expiresAt,
    },
  ];
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.actorId,
      battleCreatureWithSpellActiveEffects(actor, activeEffects),
    ),
  };
}

export function applyFailedSaveSpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
): BattleState {
  const activeEffectRiders = invocation.failedSavePostDamageRiders.filter(
    (
      rider,
    ): rider is Extract<
      SpellFailedSavePostDamageRider,
      { readonly kind: "nextAttackRollByTarget" }
    > => rider.kind === "nextAttackRollByTarget",
  );
  if (activeEffectRiders.length === 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const activeEffects = activeEffectRiders.reduce(
      (effects, rider): readonly BattleActiveEffect[] => [
        ...effects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              "sourceSpellId" in effect &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "nextAttackRollBySelf",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          mode: rider.mode,
          expiresAt: activeEffectExpirationForPostDamageRider(
            state,
            actorId,
            target.combatantId,
            rider.expiresAt,
          ),
        },
      ],
      target.activeEffects,
    );
    combatants.set(targetId, { ...target, activeEffects });
  }
  return { ...state, combatants };
}

export function applyFailedSaveSpellConditionEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure: "afterHitSaveGatedCondition" | "saveGatedCondition";
    }
  >,
  appliedEffect: SpellSelectedFailedSaveConditionEffect,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    if (
      conditionApplicationPreventedByCreatureTypeProtection(
        state,
        actorId,
        target,
        appliedEffect.condition,
      )
    ) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (activeEffect) =>
        (activeEffect.kind === "spellCondition" ||
          activeEffect.kind === "spellConditionEndTurnSave") &&
        activeEffect.sourceSpellId === invocation.spell.id &&
        activeEffect.sourceCombatantId === actorId &&
        activeEffect.condition === appliedEffect.condition,
    );
    const expiresAt = activeEffectExpirationForPostDamageRider(
      state,
      actorId,
      target.combatantId,
      appliedEffect.expiresAt,
    );
    const nextEffect =
      appliedEffect.repeatSave === null
        ? {
            kind: "spellCondition" as const,
            sourceSpellId: invocation.spell.id,
            sourceCombatantId: actorId,
            condition: appliedEffect.condition,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                appliedEffect.condition,
              ),
            escape: appliedEffect.escape,
            turnStartDamage: appliedEffect.turnStartDamage,
            expiresAt,
          }
        : {
            kind: "spellConditionEndTurnSave" as const,
            sourceSpellId: invocation.spell.id,
            sourceCombatantId: actorId,
            condition: appliedEffect.condition,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                appliedEffect.condition,
              ),
            save: appliedEffect.repeatSave,
            expiresAt,
          };
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      nextEffect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
  }
  const effected: BattleState = { ...state, combatants };
  const targetConcentrationReconciled = targetIds.reduce(
    (nextState, targetId) =>
      breakConcentrationIfCombatantIsIncapacitated(nextState, targetId),
    effected,
  );
  return clearSourceConcentrationIfRepeatSaveConditionSpellHasNoEffects(
    targetConcentrationReconciled,
    actorId,
    invocation.spell.id,
    appliedEffect,
  );
}

function breakConcentrationIfCombatantIsIncapacitated(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  return combatant !== undefined &&
    combatant.concentration !== null &&
    hasCondition(combatant.conditions, "incapacitated")
    ? breakBattleConcentration(state, combatantId)
    : state;
}

function clearSourceConcentrationIfRepeatSaveConditionSpellHasNoEffects(
  state: BattleState,
  sourceCombatantId: CombatantId,
  sourceSpellId: string,
  appliedEffect: SpellSelectedFailedSaveConditionEffect,
): BattleState {
  if (
    appliedEffect.repeatSave === null ||
    typeof appliedEffect.expiresAt !== "object" ||
    appliedEffect.expiresAt.kind !== "concentration"
  ) {
    return state;
  }
  return {
    ...state,
    combatants: combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
      state.combatants,
      {
        sourceCombatantId,
        sourceSpellId,
      },
    ),
  };
}

export function applySleepPendingRepeatSaveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "sleepPendingRepeatSave" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "sleepPendingRepeatSave" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          "incapacitated",
        ),
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        repeatAt: endOfNextTurnExpiration(state, targetId),
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
        },
      },
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
  }
  const effected: BattleState = { ...state, combatants };
  return targetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    effected,
  );
}

export function applyHideousLaughterEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "hideousLaughter" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "hideousLaughter" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "hideousLaughter" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        conditionHadNonSpellProneSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "prone"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: HIDEOUS_LAUGHTER_DURATION_TICKS,
        },
      },
    ];
    const affectedTarget = battleCreatureWithSpellActiveEffects(
      target,
      activeEffects,
    );
    combatants.set(targetId, affectedTarget);
  }
  const effected: BattleState = { ...state, combatants };
  const incapacitatedTargetIds = targetIds.filter((targetId) => {
    const target = combatants.get(targetId);
    return (
      target !== undefined && hasCondition(target.conditions, "incapacitated")
    );
  });
  return incapacitatedTargetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    effected,
  );
}

export function applyGreaseGroundHazardCastEffects(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "greaseGroundArea" }
  >;
  readonly failedTargetIds: readonly CombatantId[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "greaseGroundHazard" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster !== undefined) {
    const replacing = caster.activeEffects.filter(
      (effect) =>
        effect.kind === "greaseGroundHazard" &&
        effect.sourceSpellId === input.invocation.spell.id &&
        effect.sourceCombatantId === input.actorId &&
        effect.areaId === input.area.areaId,
    );
    const activeEffects = [
      ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "greaseGroundHazard" as const,
        sourceSpellId: input.invocation.spell.id,
        sourceCombatantId: input.actorId,
        areaId: input.area.areaId,
        save: {
          ability: input.invocation.ability,
          dc: input.invocation.dc,
        },
        expiresAt: {
          kind: "duration" as const,
          durationTicks: input.invocation.durationTicks,
        },
      },
    ];
    combatants.set(input.actorId, { ...caster, activeEffects });
  }
  return {
    ...input.state,
    combatants: applyGreaseProneToCombatants(combatants, input.failedTargetIds),
  };
}

export function applyFogCloudObscurementCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "fogCloudObscurement" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "fogCloudObscurement" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyMagicalDarknessPointOriginCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaChoice: BattleMagicalDarknessAreaChoice;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "magicalDarknessPointOrigin" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaChoice.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "magicalDarknessPointOrigin" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaChoice.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  const dispelledLightEffectIds = new Set(
    input.areaChoice.spellCreatedLightOverlaps.map(
      (overlap) => overlap.sourceEffectId,
    ),
  );
  return {
    ...input.state,
    combatants,
    lightEmitters: input.state.lightEmitters.filter(
      (emitter) =>
        !(
          isTrackedOngoingSpellLightEmitter(emitter) &&
          emitter.sourceSpellLevel <=
            input.invocation.dispelledSpellCreatedLightMaxSpellLevel &&
          dispelledLightEffectIds.has(emitter.sourceEffectId)
        ),
    ),
  };
}

export function applyAntimagicFieldOngoingSpellSuppressionCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "antimagicFieldOngoingSpellSuppression" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "antimagicFieldOngoingSpellSuppression" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const suppressedOngoingSpellEffects = input.affectedOngoingSpellEffects
    .filter((effect) => effect.sourceKind === "ordinarySpell")
    .map((effect) => effect.effect);
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "antimagicFieldOngoingSpellSuppression" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      suppressedOngoingSpellEffects,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyFlamingSphereCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "flamingSphere" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "flamingSphere" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "flamingSphere" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      damage: input.invocation.damage,
      ramMaxMoveFeet: input.invocation.ramMaxMoveFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applySpiritualWeaponAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly forcePositionId: BattleTablePositionId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponAttackProxy" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spiritualWeapon" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    {
      kind: "spiritualWeapon" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      sourceEffectId: spiritualWeaponSpellEffectOccurrenceId(
        input.state,
        input.actorId,
        input.invocation,
      ),
      sourceSpellLevel: spellInvocationEffectiveSpellLevel(input.invocation),
      forcePositionId: input.forcePositionId,
      forceReachFeet: input.invocation.forceReachFeet,
      repeatMoveMaxFeet: input.invocation.repeatMoveMaxFeet,
      startedOn: {
        actorId: input.actorId,
        round: input.state.initiative.round,
      },
      damage: input.invocation.damage,
      attackKind: input.invocation.attackKind,
      attackBonus: input.invocation.attackBonus,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

function spiritualWeaponSpellEffectOccurrenceId(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponAttackProxy" }
  >,
) {
  const prefix = `${actorId}:${invocation.spell.id}:spiritual-weapon:`;
  const actor = state.combatants.get(actorId);
  const nextOrdinal =
    Math.max(
      0,
      ...(actor?.activeEffects.flatMap((effect) => {
        if (
          effect.kind !== "spiritualWeapon" ||
          !effect.sourceEffectId.startsWith(prefix)
        ) {
          return [];
        }
        const ordinal = Number(effect.sourceEffectId.slice(prefix.length));
        return Number.isInteger(ordinal) && ordinal > 0 ? [ordinal] : [];
      }) ?? []),
    ) + 1;
  return battleSpellEffectOccurrenceId(`${prefix}${nextOrdinal}`);
}

export function repositionSpiritualWeaponAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponRepeatAttack" }
  >;
  readonly forcePositionId: BattleTablePositionId;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(
    input.invocation.activeEffect.sourceCombatantId,
  );
  if (caster === undefined) {
    return input.state;
  }
  combatants.set(input.invocation.activeEffect.sourceCombatantId, {
    ...caster,
    activeEffects: caster.activeEffects.map((effect) =>
      effect === input.invocation.activeEffect
        ? { ...effect, forcePositionId: input.forcePositionId }
        : effect,
    ),
  });
  return { ...input.state, combatants };
}

export function applySpikeGrowthMovementHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spikeGrowthMovementHazard" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "spikeGrowthHazard" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "spikeGrowthHazard" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      damage: input.invocation.damage,
      damagePerFeet: input.invocation.damagePerFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyMoonbeamCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "moonbeam" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "moonbeam" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "moonbeam" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      damage: input.invocation.damage,
      repositionMaxMoveFeet: input.invocation.repositionMaxMoveFeet,
      savedThisTurn: [],
      shapeShiftSuppressed: [],
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyWebRestraintHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "webRestraintHazard" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "webRestraintHazard" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "webRestraintHazard" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      sideFeet: input.invocation.targeting.sideFeet,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      entrySavedThisTurn: [],
      startTurnSavedThisTurn: [],
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function applyGustOfWindLineCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "gustOfWindLineArea" }
  >;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "gustOfWindLine" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const replacing = caster.activeEffects.filter(
    (effect) =>
      effect.kind === "gustOfWindLine" &&
      effect.sourceSpellId === input.invocation.spell.id &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.area.areaId,
  );
  const activeEffects = [
    ...caster.activeEffects.filter((effect) => !replacing.includes(effect)),
    {
      kind: "gustOfWindLine" as const,
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      areaId: input.area.areaId,
      directionId: input.area.directionId,
      castTurn: {
        actorId: input.actorId,
        round: input.state.initiative.round,
      },
      line: {
        lengthFeet: input.invocation.targeting.lengthFeet,
        widthFeet: input.invocation.targeting.widthFeet,
      },
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      pushDistanceFeet: input.invocation.pushDistanceFeet,
      movementCost: input.invocation.movementCost,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  combatants.set(input.actorId, { ...caster, activeEffects });
  return { ...input.state, combatants };
}

export function replaceGustOfWindLineDirection(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
}): BattleState {
  const source = input.state.combatants.get(input.sourceCombatantId);
  if (source === undefined) {
    return input.state;
  }
  const activeEffects = source.activeEffects.map((effect) =>
    effect.kind === "gustOfWindLine" &&
    effect.sourceCombatantId === input.sourceCombatantId &&
    effect.sourceSpellId === input.sourceSpellId &&
    effect.areaId === input.areaId
      ? { ...effect, directionId: input.directionId }
      : effect,
  );
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.sourceCombatantId, {
      ...source,
      activeEffects,
    }),
  };
}

export function resetAllMoonbeamSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const next = new Map(combatants);
  for (const [id, combatant] of next) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      effect.kind === "moonbeam" && effect.savedThisTurn.length > 0
        ? { ...effect, savedThisTurn: [] as readonly CombatantId[] }
        : effect,
    );
    if (activeEffects.some((e, i) => e !== combatant.activeEffects[i])) {
      next.set(id, { ...combatant, activeEffects });
    }
  }
  return next;
}

export function resetAllWebSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const next = new Map(combatants);
  for (const [id, combatant] of next) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      effect.kind === "webRestraintHazard" &&
      (effect.entrySavedThisTurn.length > 0 ||
        effect.startTurnSavedThisTurn.length > 0)
        ? {
            ...effect,
            entrySavedThisTurn: [] as readonly CombatantId[],
            startTurnSavedThisTurn: [] as readonly CombatantId[],
          }
        : effect,
    );
    if (
      activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
    ) {
      next.set(id, { ...combatant, activeEffects });
    }
  }
  return next;
}

export function markMoonbeamSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  if (caster === undefined) {
    return state;
  }
  if (effect.savedThisTurn.includes(targetId)) {
    return state;
  }
  const activeEffects = caster.activeEffects.map((current) =>
    moonbeamEffectMatches(current, effect)
      ? {
          ...current,
          savedThisTurn: [...current.savedThisTurn, targetId],
        }
      : current,
  );
  const combatants = new Map(state.combatants);
  combatants.set(effect.sourceCombatantId, {
    ...caster,
    activeEffects,
  });
  return { ...state, combatants };
}

function moonbeamEffectMatches(
  current: BattleActiveEffect,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): current is Extract<BattleActiveEffect, { readonly kind: "moonbeam" }> {
  return (
    current.kind === "moonbeam" &&
    current.sourceCombatantId === effect.sourceCombatantId &&
    current.sourceSpellId === effect.sourceSpellId &&
    current.areaId === effect.areaId
  );
}

export function addMoonbeamShapeShiftSuppression(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  if (caster === undefined) {
    return state;
  }
  const activeEffects = caster.activeEffects.map((current) =>
    moonbeamEffectMatches(current, effect)
      ? current.shapeShiftSuppressed.includes(targetId)
        ? current
        : {
            ...current,
            shapeShiftSuppressed: [...current.shapeShiftSuppressed, targetId],
          }
      : current,
  );
  const combatants = new Map(state.combatants);
  combatants.set(effect.sourceCombatantId, {
    ...caster,
    activeEffects,
  });
  return { ...state, combatants };
}

export function removeMoonbeamShapeShiftSuppression(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  if (caster === undefined) {
    return state;
  }
  const activeEffects = caster.activeEffects.map((current) =>
    moonbeamEffectMatches(current, effect)
      ? {
          ...current,
          shapeShiftSuppressed: current.shapeShiftSuppressed.filter(
            (combatantId) => combatantId !== targetId,
          ),
        }
      : current,
  );
  const combatants = new Map(state.combatants);
  combatants.set(effect.sourceCombatantId, {
    ...caster,
    activeEffects,
  });
  return { ...state, combatants };
}

export function markWebSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "webRestraintHazard" }>,
  trigger: BattleWebRestraintTrigger,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  const alreadySaved =
    trigger === "entersArea"
      ? effect.entrySavedThisTurn.includes(targetId)
      : effect.startTurnSavedThisTurn.includes(targetId);
  if (caster === undefined || alreadySaved) {
    return state;
  }
  const activeEffects = caster.activeEffects.map((current) =>
    current === effect && trigger === "entersArea"
      ? {
          ...current,
          entrySavedThisTurn: [...current.entrySavedThisTurn, targetId],
        }
      : current === effect
        ? {
            ...current,
            startTurnSavedThisTurn: [
              ...current.startTurnSavedThisTurn,
              targetId,
            ],
          }
        : current,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(effect.sourceCombatantId, {
      ...caster,
      activeEffects,
    }),
  };
}

export function applyWebRestrainedCondition(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "webRestraintHazard" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (candidate) =>
      candidate.kind === "spellCondition" &&
      candidate.sourceSpellId === effect.sourceSpellId &&
      candidate.sourceCombatantId === effect.sourceCombatantId &&
      candidate.condition === "restrained",
  );
  const activeEffects = [
    ...target.activeEffects.filter(
      (candidate) => !replacing.includes(candidate),
    ),
    {
      kind: "spellCondition" as const,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      condition: "restrained" as const,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        target,
        "restrained",
      ),
      escape: {
        kind: "abilityCheck" as const,
        ability: "str" as const,
        skill: "athletics" as const,
        allowedActor: "target" as const,
        successEnds: "condition" as const,
      },
      turnStartDamage: null,
      expiresAt: effect.expiresAt,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function removeWebRestrainedCondition(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: SpellRecord["id"];
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  const effect = target?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCondition" }
    > =>
      candidate.kind === "spellCondition" &&
      candidate.sourceSpellId === input.sourceSpellId &&
      candidate.sourceCombatantId === input.sourceCombatantId &&
      candidate.condition === "restrained",
  );
  return effect === undefined
    ? input.state
    : removeSpellConditionEffect(input.state, input.targetId, effect);
}

export function applyGreaseProneToTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return {
    ...state,
    combatants: applyGreaseProneToCombatants(new Map(state.combatants), [
      targetId,
    ]),
  };
}

export function applyCommandPendingEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
  option: BattleCommandOption,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    combatants.set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "commandPending" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "commandPending",
          option,
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          expiresAt: endOfNextTurnExpiration(state, targetId),
        },
      ],
    });
  }
  return { ...state, combatants };
}

export function applyCommandGrovelProneToTarget(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "commandPending" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
          activeEffects: target.activeEffects.filter(
            (candidate) => candidate !== effect,
          ),
        },
        applyCondition(target.conditions, "prone"),
      ),
    ),
  };
}

function applyGreaseProneToCombatants(
  combatants: Map<CombatantId, BattleCreatureState>,
  targetIds: readonly CombatantId[],
): Map<CombatantId, BattleCreatureState> {
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    combatants.set(
      targetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(target.conditions, "prone"),
      ),
    );
  }
  return combatants;
}

export function applyAfterHitTimedDamageAndSaveSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "afterHitTimedDamageAndSave" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "spellTurnStartDamageAndSave" &&
      effect.sourceSpellId === invocation.spell.id &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
  );
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyAfterHitDamageAndIlluminationSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "afterHitDamageAndIllumination" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "shiningSmiteIllumination" &&
      effect.sourceSpellId === invocation.spell.id &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
  );
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyFailedSaveAttackRollAdvantageEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  area: BattleSpellAreaChoice | undefined,
  invocation: SaveGatedAttackRollAdvantageInvocation,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const nextEffect = {
      ...invocation.effect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "faerieFireOutline" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    combatants.set(targetId, { ...target, activeEffects });
  }
  return {
    ...state,
    combatants,
    objectOutlines: [
      ...state.objectOutlines.filter(
        (outline) =>
          !(
            outline.sourceSpellId === invocation.spell.id &&
            outline.sourceCombatantId === actorId
          ),
      ),
      ...faerieFireObjectOutlines(actorId, area, invocation),
    ],
  };
}

export function applySaveGatedConditionImmunityEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = invocation.activeEffects.map((effect) => ({
      ...effect,
      sourceCombatantId: actorId,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        target,
        effect.condition,
      ),
    }));
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "conditionImmunity" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId &&
            invocation.activeEffects.some(
              (candidate) => candidate.condition === effect.condition,
            )
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

function faerieFireObjectOutlines(
  actorId: CombatantId,
  area: BattleSpellAreaChoice | undefined,
  invocation: SaveGatedAttackRollAdvantageInvocation,
): readonly BattleObjectOutline[] {
  if (
    area?.kind !== "faerieFireArea" ||
    !saveGatedAttackRollAdvantageInvocationIsFaerieFire(invocation)
  ) {
    return [];
  }
  return area.affectedObjectIds.map((objectId) => ({
    kind: "faerieFireObjectOutline",
    objectId,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    expiresAt: { kind: "concentration", combatantId: actorId },
  }));
}

export function activeEffectKindForSpellPostDamageRider(
  rider: SpellActiveEffectPostDamageRider,
): BattleActiveEffect["kind"] {
  return Match.value(rider).pipe(
    Match.when({ kind: "speedDelta" }, () => "speedDelta" as const),
    Match.when({ kind: "condition" }, () => "spellCondition" as const),
    Match.when(
      { kind: "opportunityAttackDenied" },
      () => "opportunityAttackDenied" as const,
    ),
    Match.when(
      { kind: "nextAttackRollAgainstTarget" },
      () => "nextAttackRollAgainstSelf" as const,
    ),
    Match.when(
      { kind: "hitPointRegainPrevented" },
      () => "hitPointRegainPrevented" as const,
    ),
    Match.when(
      { kind: "invisibleBenefitDenied" },
      () => "invisibleBenefitDenied" as const,
    ),
    Match.exhaustive,
  );
}

export function spellPostDamageRiderReplacesActiveEffect(
  rider: SpellActiveEffectPostDamageRider,
  effect: BattleActiveEffect,
  spellId: SpellRecord["id"],
  actorId: CombatantId,
): boolean {
  if (
    effect.kind !== activeEffectKindForSpellPostDamageRider(rider) ||
    !("sourceSpellId" in effect) ||
    effect.sourceSpellId !== spellId
  ) {
    return false;
  }
  return rider.kind === "speedDelta" || effect.sourceCombatantId === actorId;
}

export function spellPostDamageRiderExpiration(
  rider: SpellActiveEffectPostDamageRider,
): SpellPostDamageRiderExpiration | undefined {
  return "expiresAt" in rider ? rider.expiresAt : undefined;
}

export function spellPostDamageRiderActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly target: BattleCreatureState;
  readonly spellId: SpellRecord["id"];
  readonly rider: SpellActiveEffectPostDamageRider;
}): BattleActiveEffect {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    input.state,
    input.actorId,
    input.target.combatantId,
    spellPostDamageRiderExpiration(input.rider),
  );
  return Match.value(input.rider).pipe(
    Match.when({ kind: "speedDelta" }, (rider) => ({
      kind: "speedDelta" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      deltaFeet: rider.deltaFeet,
      expiresAt,
    })),
    Match.when({ kind: "condition" }, (rider) => ({
      kind: "spellCondition" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      condition: rider.condition,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        input.target,
        rider.condition,
      ),
      escape: null,
      turnStartDamage: null,
      expiresAt,
    })),
    Match.when({ kind: "opportunityAttackDenied" }, () => ({
      kind: "opportunityAttackDenied" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "nextAttackRollAgainstTarget" }, (rider) => ({
      kind: "nextAttackRollAgainstSelf" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      mode: rider.mode,
      expiresAt,
    })),
    Match.when({ kind: "hitPointRegainPrevented" }, () => ({
      kind: "hitPointRegainPrevented" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "invisibleBenefitDenied" }, () => ({
      kind: "invisibleBenefitDenied" as const,
      sourceSpellId: input.spellId,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.exhaustive,
  );
}

export function activeEffectExpirationForPostDamageRider(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  expiresAt:
    | SpellPostDamageRiderExpiration
    | Extract<
        SpellFailedSavePostDamageRider,
        { readonly kind: "nextAttackRollByTarget" }
      >["expiresAt"]
    | SpellFailedSaveConditionEffect["expiresAt"]
    | undefined,
): BattleActiveEffectExpiration {
  if (typeof expiresAt === "object" && expiresAt.kind === "duration") {
    return expiresAt;
  }
  if (typeof expiresAt === "object" && expiresAt.kind === "concentration") {
    return {
      kind: "concentration",
      combatantId: casterId,
      durationTicks: expiresAt.durationTicks,
    };
  }
  if (expiresAt === undefined) {
    return { kind: "startOfTurn", combatantId: casterId };
  }
  if (expiresAt === "startOfTargetNextTurn") {
    return { kind: "startOfTurn", combatantId: targetId };
  }
  if (expiresAt === "endOfCasterNextTurn") {
    return endOfNextTurnExpiration(state, casterId);
  }
  if (expiresAt === "concentration") {
    return { kind: "concentration", combatantId: casterId };
  }
  return endOfNextTurnExpiration(state, targetId);
}

export function endOfNextTurnExpiration(
  state: BattleState,
  combatantId: CombatantId,
): Extract<BattleActiveEffectExpiration, { readonly kind: "endOfTurn" }> {
  const stillToAct = state.initiative.stillToAct.some(
    (entry) => entry.creature === combatantId,
  );
  const round =
    currentActorId(state) === combatantId || !stillToAct
      ? ((state.initiative.round + 1) as RoundType)
      : state.initiative.round;
  return {
    kind: "endOfTurn",
    combatantId,
    round,
  };
}

export function applyPersistentSpellActiveEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "persistentArmorEffect" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || combatantWearingArmor(target)) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

export function applyHeldLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLight" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
    }),
  };
}

export function endHeldLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLightHurl" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: caster.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "heldLight" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
    }),
  };
}

export function applyWeaponAttackOverrideSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponAttackOverride" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "spellWeaponAttackOverride" &&
              effect.sourceSpellId === invocation.spell.id &&
              effect.sourceCombatantId === actorId
            ),
        ),
        invocation.activeEffect,
      ],
    }),
  };
}

export function applyObjectLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectLight" }
  >,
): BattleState {
  const retainedEmitters =
    invocation.targeting.object.kind === "lightCantripObject"
      ? state.lightEmitters.filter(
          (emitter) =>
            !(
              emitter.sourceSpellId === invocation.spell.id &&
              emitter.sourceCombatantId === actorId
            ),
        )
      : state.lightEmitters;
  return {
    ...state,
    lightEmitters: [
      ...retainedEmitters,
      {
        kind: "spellLightEmitter",
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        sourceEffectId: objectLightSpellEffectOccurrenceId(
          state,
          actorId,
          objectId,
          invocation,
        ),
        sourceSpellLevel: spellInvocationEffectiveSpellLevel(invocation),
        attachment: { kind: "object", objectId },
        emission: invocation.light,
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: invocation.expiresAt,
      },
    ],
  };
}

function objectLightSpellEffectOccurrenceId(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectLight" }
  >,
) {
  const prefix = `${actorId}:${invocation.spell.id}:${objectId}:object-light:`;
  const nextOrdinal =
    Math.max(
      0,
      ...state.lightEmitters.flatMap((emitter) => {
        if (
          emitter.kind !== "spellLightEmitter" ||
          !("sourceEffectId" in emitter) ||
          !emitter.sourceEffectId.startsWith(prefix)
        ) {
          return [];
        }
        const ordinal = Number(emitter.sourceEffectId.slice(prefix.length));
        return Number.isInteger(ordinal) && ordinal > 0 ? [ordinal] : [];
      }),
    ) + 1;
  return battleSpellEffectOccurrenceId(`${prefix}${nextOrdinal}`);
}

export function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider" }
  >,
  selectedAbility?: Ability,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const transfer: MarkedDamageRiderTransferState = {
    kind: "awaitingTargetDrop",
    retargetTiming:
      invocation.action === "transfer"
        ? invocation.activeEffect.transfer.retargetTiming
        : invocation.retargetTiming,
  };
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    {
      kind: "spellMarkedDamageRider" as const,
      sourceSpellId: invocation.spell.id,
      sourceCombatantId: actorId,
      targetCombatantId: targetId,
      transfer,
      abilityCheckBehavior:
        invocation.action === "transfer"
          ? invocation.activeEffect.abilityCheckBehavior
          : markedDamageRiderActiveAbilityCheckBehavior(
              invocation.abilityCheckBehavior,
              selectedAbility,
            ),
      damage: invocation.damage,
      expiresAt: existingExpiresAt,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects,
    }),
  };
}

function markedDamageRiderActiveAbilityCheckBehavior(
  behavior: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider"; readonly action: "cast" }
  >["abilityCheckBehavior"],
  selectedAbility: Ability | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>["abilityCheckBehavior"] {
  return Match.value(behavior).pipe(
    Match.when({ kind: "none" }, () => ({ kind: "none" as const })),
    Match.when({ kind: "findingAdvantage" }, (findingAdvantage) => ({
      kind: "findingAdvantage" as const,
      ability: findingAdvantage.ability,
      skills: findingAdvantage.skills,
    })),
    Match.when({ kind: "chosenAbilityDisadvantage" }, () =>
      selectedAbility === undefined
        ? { kind: "none" as const }
        : { kind: "abilityDisadvantage" as const, ability: selectedAbility },
    ),
    Match.exhaustive,
  );
}

export function applyScalarBuffSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
  temporaryHitPointsRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined,
): BattleState {
  const scalarEffect = invocation.effect;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    if (scalarEffect.kind === "temporaryHitPoints") {
      const nextTarget =
        temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            );
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    if (scalarEffect.kind === "hitPointMaximumIncrease") {
      const nextTarget = applyHitPointMaximumIncrease(target, {
        ...scalarEffect.activeEffect,
        sourceCombatantId: actorId,
      });
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === scalarEffect.activeEffect.kind &&
        effect.sourceSpellId === invocation.spell.id,
    );
    const nextTarget = battleCreatureWithSpellActiveEffects(target, [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        ...scalarEffect.activeEffect,
        sourceCombatantId: actorId,
      },
    ]);
    const applied = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
    return battleStateWithFlySpeedGrantEndFallCleanupFrames(
      applied,
      flySpeedGrantEndFallCleanupFramesForExpiredEffects(targetId, replacing),
    );
  }, state);
}

export function applyRollModifierSpellEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
): BattleState {
  return applyRollModifierSpellEffectsByTarget(
    state,
    targetIds.map((targetId) => ({ targetId, effect: selectedEffect })),
  );
}

export function applyRollModifierSpellEffectsByTarget(
  state: BattleState,
  targetEffects: readonly {
    readonly targetId: CombatantId;
    readonly effect: SelectedRollModifierSpellEffect;
  }[],
): BattleState {
  return targetEffects.reduce((nextState, targetEffect) => {
    const { targetId, effect: selectedEffect } = targetEffect;
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === selectedEffect.kind &&
            effect.sourceSpellId === selectedEffect.sourceSpellId
          ),
      ),
      selectedEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyThaumaturgyBoomingVoiceSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: ThaumaturgyBoomingVoiceInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeEffects: [
        ...actor.activeEffects.filter(
          (effect) =>
            !isThaumaturgyBoomingVoiceEffectForInvocation(
              effect,
              actorId,
              invocation,
            ),
        ),
        {
          ...invocation.activeEffect,
          sourceCombatantId: actorId,
        },
      ],
    }),
  };
}

export function applyCreatureTypeProtectionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "creatureTypeProtection" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyCreatureSizeChangeSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease" }
  >,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const replacement = activeEffectsWithCreatureSizeChangeReplaced(
      target.activeEffects,
      nextEffect,
    );
    const withReplacement = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects: replacement.activeEffects,
      }),
    };
    const combatants = replacement.displacedEffects.reduce<
      ReadonlyMap<CombatantId, BattleCreatureState>
    >(
      (nextCombatants, effect) =>
        combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
          nextCombatants,
          {
            sourceCombatantId: effect.sourceCombatantId,
            sourceSpellId: effect.sourceSpellId,
          },
        ),
      withReplacement.combatants,
    );
    return { ...withReplacement, combatants };
  }, state);
}

export function applyLevitatedCreatureSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "levitatedCreature" }
  >,
  initialRiseFeet: MovementFeet,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
      altitudeFeet: initialRiseFeet,
    };
    const displacedEffects = target.activeEffects.filter(
      (effect) => effect.kind === "spellLevitatedCreature",
    );
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) => effect.kind !== "spellLevitatedCreature",
      ),
      nextEffect,
    ];
    const withReplacement = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
    const combatants = displacedEffects.reduce<
      ReadonlyMap<CombatantId, BattleCreatureState>
    >(
      (nextCombatants, effect) =>
        combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
          nextCombatants,
          {
            sourceCombatantId: effect.sourceCombatantId,
            sourceSpellId: effect.sourceSpellId,
          },
        ),
      withReplacement.combatants,
    );
    return { ...withReplacement, combatants };
  }, state);
}

export function applyConditionRemovalProtectionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionRemovalProtection" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const condition = invocation.protection.conditionSaveRollMode.condition;
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const nextEffects = [
      {
        ...invocation.protection.conditionSaveRollMode,
        sourceCombatantId: actorId,
      },
      {
        ...invocation.protection.damageResistance,
        sourceCombatantId: actorId,
      },
    ];
    const activeEffects = [
      ...cleansedTarget.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionSavingThrowRollMode" ||
              effect.kind === "damageResistance") &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...cleansedTarget,
        activeEffects,
      }),
    };
  }, state);
}

export function applyDirectConditionRemovalSpellEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  condition: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directConditionRemoval" }
  >["conditionChoices"][number],
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const concentrationSources =
      concentrationSpellEffectSourcesDirectlyApplyingCondition(
        target,
        condition,
      );
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const combatantsWithTarget: ReadonlyMap<CombatantId, BattleCreatureState> =
      new Map(nextState.combatants).set(targetId, cleansedTarget);
    return {
      ...nextState,
      combatants: concentrationSources.reduce<
        ReadonlyMap<CombatantId, BattleCreatureState>
      >(
        (nextCombatants, source) =>
          combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
            nextCombatants,
            source,
          ),
        combatantsWithTarget,
      ),
    };
  }, state);
}

export function applyDamageReductionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "damageReduction" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellDamageReduction" &&
          effect.sourceSpellId === invocation.spell.id
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyJumpMovementReplacementSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "jumpMovementReplacement" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "jumpMovementReplacement" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

export function applyDragonsBreathInitialSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  spellSaveDc: DifficultyClass,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dragonsBreathInitial" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect: BattleActiveEffect = {
    ...invocation.activeEffect,
    sourceCombatantId: actorId,
    damageType,
    spellSaveDc,
  };
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "dragonsBreath" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function applyBlurAttackRollDefenseSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BlurAttackRollDefenseInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const nextEffect = {
    ...invocation.activeEffect,
    sourceCombatantId: actorId,
  };
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "blurred" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actorId,
      battleCreatureWithSpellActiveEffects(actor, activeEffects),
    ),
  };
}

export function applySeeInvisibleObserverSightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: SeeInvisibleObserverSightInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const nextEffect = {
    ...invocation.activeEffect,
    sourceCombatantId: actorId,
  };
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "seeInvisibleAndEthereal" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actorId,
      battleCreatureWithSpellActiveEffects(actor, activeEffects),
    ),
  };
}

export function applyMirrorImageHitInterceptionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: MirrorImageHitInterceptionInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const nextEffect = {
    ...invocation.activeEffect,
    sourceCombatantId: actorId,
  };
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "mirrorImageDuplicates" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actorId,
      battleCreatureWithSpellActiveEffects(actor, activeEffects),
    ),
  };
}

export function applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = invocation.activeEffects.map((effect) =>
      effect.kind === "conditionImmunity"
        ? {
            ...effect,
            sourceCombatantId: actorId,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                effect.condition,
              ),
          }
        : { ...effect, sourceCombatantId: actorId },
    );
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceSpellId === invocation.spell.id
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

export function applyShieldReactionSpellActiveEffect(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      activeEffects: [
        ...reactor.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "spellArmorClassBonus" &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        {
          kind: "spellArmorClassBonus",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: reactorId,
          bonus: invocation.armorClassBonus,
          negatedSpellIds: invocation.negatedSpellIds,
          expiresAt: {
            kind: "startOfTurn",
            combatantId: reactorId,
          },
        },
      ],
    }),
  };
}
