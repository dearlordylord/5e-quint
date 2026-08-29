// Spell active-effect application extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-persistent-area-save-condition-escape-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-persistent-area-save-composite-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-stationary-persistent-area-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-translatingPersistentArea-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-area-movement-distance-damage-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spatial-melee-spell-attack-proxy-attack-proxy spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-emanation
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.paladin-sacred-weapon
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-directional-persistent-area-line unit-feature.metamagic-heightened-save-disadvantage

// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOVABLE_PERSISTENT_AREA_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.STATIONARY_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.TRANSLATING_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
export { applyDirectConditionSpellEffects } from "./direct-condition-lifecycle.ts";

import { Match } from "effect";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import {
  movementFeet,
  type Ability,
  type DifficultyClass,
} from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import type {
  BattleEffectExecutionRef,
  BattleAreaId,
  BattleLineDirectionId,
  BattleProcedureExecutionRef,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  allocateBattleEffectOccurrenceForCreature,
  allocateBattleStoredLightEmitterForCreature,
  type BattleSourcedEffectOccurrenceTemplate,
} from "../effect-execution-ref.ts";
import {
  activeEffectProcedureMatches,
  activeEffectHasSourceCombatant,
  activeEffectSourceMatches,
  activeEffectSourceRefsMatch as sourceRefsMatch,
} from "./active-effect-replacement.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-hit-point-state.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterExecutionWithMovableLightReposition,
  characterExecutionWithSpellCreatedHeldObjectProcedures,
  characterExecutionWithSpatialMeleeSpellAttackProxyRepeatAttack,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import type {
  RepositionMovableLightManifestationSpellProcedureExecution,
  SpellCreatedHeldObjectSpellProcedureExecution,
  RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution,
} from "../character-execution.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
  removeSpellConditionEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleCompelledBehaviorOption,
  type BattleCreatureState,
  type BattleMovableLight,
  type BattleIllumination,
  type BattleLightEmitter,
  type BattleLightEmitterMechanicalFacts,
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
  type BattleExecutableSpellInvocation,
  type BattleStoredLightEmitter,
  type BattleStoredLightEmitterTemplate,
  type SpatialMeleeSpellAttackProxyRepeatTargeting,
  type SpellCreatedHeldObjectActiveEffect,
  type SpellCreatedHeldObjectState,
  type SelfTransformationModeEffectPayload,
  type SpellActiveEffectPostDamageRider,
  type SpellConditionCountedRepeatSave,
  type SpellFailedSaveConditionChoiceEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellSelectedFailedSaveConditionEffect,
  type SpellLightEmissionPostDamageRider,
  type SpellPostDamageRider,
  type SpellPostDamageRiderExpiration,
  type SupportedSpellInvocation,
  type BattlePersistentAreaSaveConditionEscapeTrigger,
} from "../battle-state-execution.ts";
import {
  magicSuppressionOngoingSpellEffectKeys,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "./magic-suppression-ongoing-effect.ts";
import {
  HIDEOUS_LAUGHTER_DURATION_TICKS,
  SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET,
} from "./domain-constants.ts";
import {
  battleCreatureWithSpellCreatedHeldObjectHand,
  spellCreatedHeldObjectFreeHand,
} from "./spell-created-held-object.ts";
import {
  battleCreatureWithSpellActiveEffects,
  battleCreatureWithoutSpellCreatedHeldObjectHand,
} from "../active-effect/lifecycle.ts";
import {
  endOfNextTurnExpiration,
  END_OF_NEXT_TURN_DURING_TURN,
} from "./spell-end-target-state.ts";
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
export const MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET = movementFeet(10);
export const SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET = movementFeet(5);
export const PERCEPTION_LIGHTLY_OBSCURED_ROLL_MODE = "disadvantage" as const;
const SHINING_SMITE_DIM_ADDITIONAL_RADIUS_FEET = movementFeet(0);
const CASTER_AREA_SPELL_ACTIVE_EFFECT_KINDS = [
  "persistentAreaSaveCondition",
  "persistentAreaTrait",
  "magicalDarknessPointOrigin",
  "persistentAreaSaveDamage",
  "areaMovementDistanceDamage",
  "persistentAreaSaveConditionEscape",
  "persistentAreaSaveComposite",
  "directionalPersistentArea",
] as const satisfies ReadonlyArray<BattleActiveEffect["kind"]>;
type CasterAreaSpellActiveEffectKind =
  (typeof CASTER_AREA_SPELL_ACTIVE_EFFECT_KINDS)[number];
type CasterAreaSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: CasterAreaSpellActiveEffectKind }
>;
type CasterAreaSpellActiveEffectTemplate = Extract<
  BattleSourcedEffectOccurrenceTemplate,
  { readonly kind: CasterAreaSpellActiveEffectKind }
>;
type PersistentAreaSaveDamageEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
>;
type SavedPersistentAreaSaveDamageEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly savedThisTurn: readonly CombatantId[] }
>;
type MovablePersistentAreaActiveEffect = Extract<
  PersistentAreaSaveDamageEffect,
  {
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "magicAction";
    };
  }
>;
type StationaryPersistentAreaSaveDamageActiveEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: { readonly kind: "stationary" } }
>;
type TranslatingPersistentAreaSaveDamageActiveEffect = Extract<
  PersistentAreaSaveDamageEffect,
  { readonly lifecycle: { readonly kind: "sourceTurnTranslation" } }
>;

function isStationaryPersistentAreaSaveDamageActiveEffect(
  effect: BattleActiveEffect,
): effect is StationaryPersistentAreaSaveDamageActiveEffect {
  return (
    effect.kind === "persistentAreaSaveDamage" &&
    effect.lifecycle.kind === "stationary"
  );
}

function isTranslatingPersistentAreaSaveDamageActiveEffect(
  effect: BattleActiveEffect,
): effect is TranslatingPersistentAreaSaveDamageActiveEffect {
  return (
    effect.kind === "persistentAreaSaveDamage" &&
    effect.lifecycle.kind === "sourceTurnTranslation"
  );
}
type SingleSaveAreaActiveEffect =
  | SavedPersistentAreaSaveDamageEffect
  | Extract<
      BattleActiveEffect,
      { readonly kind: "persistentAreaSaveComposite" }
    >;
type SingleSaveAreaHazardActiveEffect = SingleSaveAreaActiveEffect;
type MovableLightActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "movableLightManifestation" }
>;
type MovableLightEffectShape =
  | Pick<
      Extract<MovableLightActiveEffect, { readonly form: "separateLights" }>,
      "form" | "lights"
    >
  | Pick<
      Extract<
        MovableLightActiveEffect,
        { readonly form: "combinedMediumForm" }
      >,
      "form" | "light"
    >;

type SpellLightEmitterTargetAttachment = Extract<
  BattleLightEmitterAttachment,
  { readonly kind: "combatant" | "object" }
>;

export type SaveGatedAttackRollAdvantageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

export function saveGatedAttackRollAdvantageInvocationIsVisibilityGrantingArea(
  invocation: Pick<SaveGatedAttackRollAdvantageInvocation, "effect">,
): boolean {
  return invocation.effect.kind === "saveGatedTargetProjection";
}

export function activeFeatherFallDescentRateCapFeetPerRound(
  combatant: BattleCreatureState,
): typeof FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND | null {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "fallingCreatureMitigationReaction",
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
    (effect) => effect.kind !== "fallingCreatureMitigationReaction",
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
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  if (invocation.procedure !== "spellAttackDamage") {
    return state;
  }
  if (
    invocation.postDamageRiders.length === 0 &&
    invocation.laterDamage === null
  ) {
    return state;
  }
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the admitted spell-attack target is resolved from the combatant map and remains present through post-damage active-effect application. */
  if (target == null) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const laterDamageApplication = (() => {
    if (invocation.laterDamage === null) {
      return {
        state,
        target,
        effects: target.activeEffects,
      };
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "spellTurnEndDamage",
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        damage: invocation.laterDamage,
        expiresAt: endOfNextTurnExpiration(
          state,
          targetId,
          END_OF_NEXT_TURN_DURING_TURN,
        ),
      },
    });
    return {
      state: {
        ...state,
        combatants: new Map(state.combatants).set(targetId, allocation.owner),
      },
      target: allocation.owner,
      effects: [...allocation.owner.activeEffects, allocation.effect],
    };
  })();
  const riderApplication = invocation.postDamageRiders
    .filter(isSpellActiveEffectPostDamageRider)
    .reduce(
      (application, rider) => {
        const effects = application.effects;
        const replacedEffects = effects.filter((effect) =>
          spellPostDamageRiderReplacesActiveEffect(
            rider,
            effect,
            invocation.sourceProcedureRef,
            actorId,
          ),
        );
        const applied = spellPostDamageRiderActiveEffect({
          state: application.state,
          actorId,
          target: application.target,
          sourceProcedureRef: invocation.sourceProcedureRef,
          rider,
        });
        return {
          state: applied.state,
          target: applied.target,
          effects: [
            ...effects.filter((effect) => !replacedEffects.includes(effect)),
            applied.effect,
          ],
        };
      },
      {
        ...laterDamageApplication,
        effects: laterDamageApplication.effects,
      },
    );

  return {
    ...riderApplication.state,
    combatants: new Map(riderApplication.state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(
        riderApplication.target,
        riderApplication.effects,
      ),
    ),
  };
}

export function battleLightEmitters(
  state: BattleState,
): readonly BattleLightEmitter[] {
  const suppressedEffectKeys = magicSuppressionOngoingSpellEffectKeys(state);
  const outlineLightEmitters = [...state.combatants.values()].flatMap(
    (combatant): readonly BattleLightEmitter[] =>
      combatant.activeEffects.flatMap(
        (effect): readonly BattleLightEmitter[] =>
          effect.kind === "saveGatedTargetProjection"
            ? [
                faerieFireCombatantDimLightEmitter(
                  combatant.combatantId,
                  effect,
                ),
              ]
            : effect.kind === "afterHitDamageAndIllumination"
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
                      sourceProcedureRef: effect.sourceProcedureRef,
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
                        sourceProcedureRef: effect.sourceProcedureRef,
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
                  : effect.kind === "paladinSacredWeapon"
                    ? paladinSacredWeaponLightEmitters(combatant, effect)
                    : effect.kind === "movableLightManifestation"
                      ? movableLightFromEffect(effect).map((light) => ({
                          kind: "spellLightEmitter" as const,
                          sourceProcedureRef: effect.sourceProcedureRef,
                          sourceCombatantId: effect.sourceCombatantId,
                          attachment: {
                            kind: "movableLight" as const,
                            lightId: light.lightId,
                            positionId: light.positionId,
                            form: effect.form,
                          },
                          emission: {
                            kind: "dim" as const,
                            radiusFeet: MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET,
                          },
                          opaqueCoverInteraction: {
                            kind: "doesNotBlockEmission" as const,
                          },
                          expiresAt: effect.expiresAt,
                        }))
                      : [],
      ),
  );
  const storedEmitters =
    suppressedEffectKeys.size === 0
      ? state.lightEmitters
      : state.lightEmitters.filter(
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
  return [
    ...storedEmitters.map(projectStoredLightEmitter),
    ...outlineLightEmitters,
    ...state.objectOutlines.map(faerieFireObjectDimLightEmitter),
  ];
}

function projectStoredLightEmitter(
  emitter: BattleStoredLightEmitter,
): BattleLightEmitter {
  const { effectRef, ...projection } = emitter;
  void effectRef;
  return projection;
}

export function battleLightEmitterProjection(
  emitter: BattleLightEmitter,
  fact: BattleLightEmitterProjectionFact,
): BattleLightEmitterProjection | null {
  if (!lightEmitterMatchesTarget(emitter, fact)) {
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

export function spellCreatedHeldObjectEffectsForActor(
  combatant: BattleCreatureState | undefined,
): readonly SpellCreatedHeldObjectActiveEffect[] {
  return (
    combatant?.activeEffects.filter(
      (effect): effect is SpellCreatedHeldObjectActiveEffect =>
        effect.kind === "spellCreatedHeldObject" &&
        activeEffectHasSourceCombatant(effect, combatant.combatantId),
    ) ?? []
  );
}

export function applySpellCreatedHeldObjectEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly activeEffect: SpellCreatedHeldObjectActiveEffect;
  readonly sourceExecution: SpellCreatedHeldObjectSpellProcedureExecution;
}):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const actor = input.state.combatants.get(input.actorId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const freeHand = spellCreatedHeldObjectFreeHand(input.state, input.actorId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const activeEffects = [...actor.activeEffects, input.activeEffect];
  const nextActor = battleCreatureWithSpellCreatedHeldObjectHand(
    {
      ...actor,
      activeEffects,
    },
    freeHand,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (nextActor.origin.kind !== "character") {
    return {
      tag: "invalid",
      message: "Spell-created held object execution owner is not a character.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const dynamicExecution =
    characterExecutionWithSpellCreatedHeldObjectProcedures(
      nextActor.origin.execution,
      [
        {
          spellRuleFacts: input.sourceExecution.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: input.activeEffect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "spellCreatedHeldObjectAttack",
          targeting: { kind: "singleCombatant" },
          damage: input.activeEffect.attack.damage,
          rangeFeet: SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET,
          attackKind: input.activeEffect.attack.attackKind,
          attackBonus: input.activeEffect.attack.attackBonus,
          sourceEffectRef: input.activeEffect.effectRef,
          sourceHeldObjectProcedureRef: input.activeEffect.sourceProcedureRef,
        },
        {
          spellRuleFacts: input.sourceExecution.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: input.activeEffect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "spellCreatedHeldObjectReEvoke",
          actionCost: "bonusAction",
          sourceEffectRef: input.activeEffect.effectRef,
          sourceHeldObjectProcedureRef: input.activeEffect.sourceProcedureRef,
        },
      ],
    );
  return {
    tag: "updated",
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(input.actorId, {
        ...nextActor,
        origin: { ...nextActor.origin, execution: dynamicExecution },
      }),
    },
  };
}

type SetSpellCreatedHeldObjectStateForActorInput = {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly effect: SpellCreatedHeldObjectActiveEffect;
  readonly objectState: SpellCreatedHeldObjectState;
};

function setSpellCreatedHeldObjectStateForActor(
  input: SetSpellCreatedHeldObjectStateForActorInput & {
    readonly objectState: Extract<
      SpellCreatedHeldObjectState,
      { readonly kind: "notHeld" }
    >;
  },
): { readonly tag: "updated"; readonly state: BattleState };
function setSpellCreatedHeldObjectStateForActor(
  input: SetSpellCreatedHeldObjectStateForActorInput,
):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string };
function setSpellCreatedHeldObjectStateForActor(
  input: SetSpellCreatedHeldObjectStateForActorInput,
):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const activeEffects = input.actor.activeEffects.map((effect) =>
    effect === input.effect
      ? { ...input.effect, objectState: input.objectState }
      : effect,
  );
  const nextActor =
    input.objectState.kind === "held"
      ? spellCreatedHeldObjectHeldActor({
          state: input.state,
          actor: { ...input.actor, activeEffects },
          actorId: input.actor.combatantId,
        })
      : {
          tag: "updated" as const,
          actor: battleCreatureWithoutSpellCreatedHeldObjectHand({
            ...input.actor,
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
        input.actor.combatantId,
        nextActor.actor,
      ),
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
  /* v8 ignore start -- @preserve -- Defensive internal guard: held-object procedures pass the actor that supplied the selected active effect, so it remains present for this synchronous transition. */
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return setSpellCreatedHeldObjectStateForActor({ ...input, actor });
}

export function releaseSpellCreatedHeldObjectState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly effectRef: BattleEffectExecutionRef;
}):
  | { readonly tag: "updated"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const actor = input.state.combatants.get(input.actorId);
  const effect = spellCreatedHeldObjectEffectsForActor(actor).find(
    (candidate) =>
      candidate.effectRef === input.effectRef &&
      activeEffectHasSourceCombatant(candidate, input.actorId),
  );
  if (actor === undefined || effect?.objectState.kind !== "held") {
    return {
      tag: "invalid",
      message: "Spell-created held object is no longer held by this actor.",
    };
  }
  return setSpellCreatedHeldObjectStateForActor({
    state: input.state,
    actor,
    effect,
    objectState: { kind: "notHeld" },
  });
}

function spellCreatedHeldObjectHeldActor(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState;
}):
  | { readonly tag: "updated"; readonly actor: BattleCreatureState }
  | { readonly tag: "invalid"; readonly message: string } {
  const freeHand = spellCreatedHeldObjectFreeHand(input.state, input.actorId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "updated",
    actor: battleCreatureWithSpellCreatedHeldObjectHand(input.actor, freeHand),
  };
}

function lightEmitterMatchesTarget(
  emitter: BattleLightEmitterMechanicalFacts,
  target: BattleLightEmitterAttachment,
): boolean {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) =>
      lightEmitterAttachmentMatchesTarget(spellEmitter.attachment, target),
    ),
    Match.when({ kind: "unitFeatureLightEmitter" }, (unitFeatureEmitter) =>
      lightEmitterAttachmentMatchesTarget(
        unitFeatureEmitter.attachment,
        target,
      ),
    ),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectEmitter) =>
        target.kind === "object" && objectEmitter.objectId === target.objectId,
    ),
    Match.exhaustive,
  );
}

function lightEmitterAttachmentMatchesTarget(
  attachment: BattleLightEmitterAttachment,
  target: BattleLightEmitterAttachment,
): boolean {
  return Match.value(attachment).pipe(
    Match.when(
      { kind: "combatant" },
      (combatantAttachment) =>
        target.kind === "combatant" &&
        combatantAttachment.combatantId === target.combatantId,
    ),
    Match.when(
      { kind: "object" },
      (objectAttachment) =>
        target.kind === "object" &&
        objectAttachment.objectId === target.objectId,
    ),
    Match.when(
      { kind: "movableLight" },
      (lightAttachment) =>
        target.kind === "movableLight" &&
        lightAttachment.lightId === target.lightId &&
        lightAttachment.positionId === target.positionId &&
        lightAttachment.form === target.form,
    ),
    Match.exhaustive,
  );
}

function lightEmitterOpaqueCoverBlocksEmission(
  emitter: BattleLightEmitterMechanicalFacts,
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
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "saveGatedTargetProjection" }
  >,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: effect.sourceProcedureRef,
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
    { readonly kind: "afterHitDamageAndIllumination" }
  >,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: effect.sourceProcedureRef,
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

function paladinSacredWeaponLightEmitters(
  combatant: BattleCreatureState,
  effect: Extract<BattleActiveEffect, { readonly kind: "paladinSacredWeapon" }>,
): readonly BattleLightEmitter[] {
  if (combatant.origin.kind !== "character") {
    return [];
  }
  const procedure = characterUnitProcedure(
    combatant.origin.execution,
    effect.sourceProcedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const execution =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "paladinSacredWeapon"
      ? procedure.execution
      : undefined;
  return execution === undefined
    ? []
    : [
        {
          kind: "unitFeatureLightEmitter",
          sourceProcedureRef: effect.sourceProcedureRef,
          sourceCombatantId: effect.sourceCombatantId,
          attachment: {
            kind: "combatant",
            combatantId: combatant.combatantId,
          },
          emission: {
            kind: "brightAndDim",
            brightRadiusFeet: execution.sacredWeapon.light.brightRadiusFeet,
            dimAdditionalFeet: execution.sacredWeapon.light.dimAdditionalFeet,
          },
          opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
          expiresAt: effect.expiresAt,
        },
      ];
}

function faerieFireObjectDimLightEmitter(
  outline: BattleObjectOutline,
): BattleLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: outline.sourceProcedureRef,
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
          effect.kind === "persistentAreaTrait"
            ? [
                {
                  kind: "spellObscurementZone",
                  sourceProcedureRef: effect.sourceProcedureRef,
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
                    sourceProcedureRef: effect.sourceProcedureRef,
                    sourceCombatantId: effect.sourceCombatantId,
                    area: {
                      kind: "pointOriginSphere",
                      areaId: effect.areaId,
                      radiusFeet: effect.radiusFeet,
                    },
                    expiresAt: effect.expiresAt,
                  },
                ]
              : effect.kind === "persistentAreaSaveConditionEscape"
                ? [
                    {
                      kind: "spellObscurementZone",
                      sourceProcedureRef: effect.sourceProcedureRef,
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
                : effect.kind === "persistentAreaSaveComposite"
                  ? [
                      {
                        kind: "spellObscurementZone",
                        sourceProcedureRef: effect.sourceProcedureRef,
                        sourceCombatantId: effect.sourceCombatantId,
                        obscurement: "heavilyObscured",
                        area: {
                          kind: "pointOriginCylinder",
                          areaId: effect.areaId,
                          radiusFeet: effect.radiusFeet,
                          heightFeet: effect.heightFeet,
                        },
                        expiresAt: effect.expiresAt,
                      },
                    ]
                  : isStationaryPersistentAreaSaveDamageActiveEffect(effect)
                    ? [
                        {
                          kind: "spellObscurementZone",
                          sourceProcedureRef: effect.sourceProcedureRef,
                          sourceCombatantId: effect.sourceCombatantId,
                          obscurement: "lightlyObscured",
                          area: {
                            kind: "pointOriginSphere",
                            areaId: effect.areaId,
                            radiusFeet: effect.radiusFeet,
                          },
                          expiresAt: effect.expiresAt,
                        },
                      ]
                    : isTranslatingPersistentAreaSaveDamageActiveEffect(effect)
                      ? [
                          {
                            kind: "spellObscurementZone",
                            sourceProcedureRef: effect.sourceProcedureRef,
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
                      : [],
      ),
  );
}

export function applySpellLightEmitterEffects(
  state: BattleState,
  actorId: CombatantId,
  attachment: SpellLightEmitterTargetAttachment,
  invocation: Extract<
    BattleExecutableSpellInvocation,
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
  return lightRiders.reduce<BattleState>((currentState, rider) => {
    const owner = currentState.combatants.get(actorId);
    if (owner === undefined) {
      return currentState;
    }
    const allocation = allocateBattleStoredLightEmitterForCreature({
      owner,
      emitter: lightEmitterFromPostDamageRider(
        currentState,
        actorId,
        attachment,
        invocation,
        rider,
      ),
    });
    return {
      ...currentState,
      combatants: new Map(currentState.combatants).set(
        actorId,
        allocation.owner,
      ),
      lightEmitters: [
        ...currentState.lightEmitters.filter(
          (emitter) =>
            !(
              emitter.kind === "spellLightEmitter" &&
              emitter.sourceProcedureRef === invocation.sourceProcedureRef &&
              emitter.sourceCombatantId === actorId &&
              lightEmitterMatchesTarget(emitter, attachment)
            ),
        ),
        allocation.emitter,
      ],
    };
  }, state);
}

export function expireBattleLightEmitters(
  emitters: readonly BattleStoredLightEmitter[],
  shouldExpire: (emitter: BattleStoredLightEmitter) => boolean,
): readonly BattleStoredLightEmitter[] {
  return emitters.filter((emitter) => !shouldExpire(emitter));
}

export function tickDurationBattleLightEmitters(
  emitters: readonly BattleStoredLightEmitter[],
): readonly BattleStoredLightEmitter[] {
  return emitters.flatMap((emitter): readonly BattleStoredLightEmitter[] => {
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

export type MovableLightCastPlan = MovableLightEffectShape;
type MovableLightEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "movableLightManifestation" }
>;

export type MovableLightRepositionPlan =
  | {
      readonly kind: "replaceEffect";
      readonly effect: MovableLightEffect;
      readonly effectShape: MovableLightEffectShape;
    }
  | {
      readonly kind: "removeEffect";
      readonly effect: MovableLightEffect;
    };

export function applyMovableLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "movableLightManifestation";
      readonly operation: "create";
    }
  >,
  plan: MovableLightCastPlan,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: action-spell admission preserves the character caster through movable-light manifestation cast application. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: caster,
    effect: {
      kind: "movableLightManifestation",
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
      expiresAt: invocation.expiresAt,
      ...plan,
    },
  });
  const owner = allocation.owner;
  /* v8 ignore start -- @preserve -- Defensive internal guard: the movable-light manifestation invocation is admitted only for a character spellcaster, and active-effect allocation preserves origin kind. */
  if (owner.origin.kind !== "character") return state;
  /* v8 ignore stop -- @preserve */
  const activeEffect = allocation.effect;
  const repositionExecution: RepositionMovableLightManifestationSpellProcedureExecution =
    {
      spellRuleFacts: invocation.spellRuleFacts,
      access: invocation.access,
      resource: { tag: "none" },
      procedure: "movableLightManifestation",
      operation: "reposition",
      actionCost: "bonusAction",
      activeEffectRef: activeEffect.effectRef,
      sourceManifestationProcedureRef: activeEffect.sourceProcedureRef,
      maxMoveFeet: invocation.maxMoveFeet,
      rangeFeet: invocation.rangeFeet,
      spacingFeet: invocation.spacingFeet,
    };
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...owner,
      activeEffects: [
        ...owner.activeEffects.filter(
          (effect) =>
            effect.kind !== "movableLightManifestation" ||
            !activeEffectSourceMatches(effect, activeEffect),
        ),
        activeEffect,
      ],
      origin: {
        ...owner.origin,
        execution: characterExecutionWithMovableLightReposition(
          owner.origin.execution,
          repositionExecution,
        ),
      },
    }),
  };
}

export function repositionMovableLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  plan: MovableLightRepositionPlan,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the admitted movable-light manifestation reposition subject retains its caster while the active effect is replayed. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: caster.activeEffects.flatMap((effect) => {
        if (
          effect.kind !== "movableLightManifestation" ||
          effect.effectRef !== plan.effect.effectRef ||
          effect.sourceProcedureRef !== plan.effect.sourceProcedureRef ||
          effect.sourceCombatantId !== actorId ||
          plan.effect.sourceCombatantId !== actorId
        ) {
          return [effect];
        }
        return plan.kind === "removeEffect"
          ? []
          : [{ ...effect, ...plan.effectShape }];
      }),
    }),
  };
}

export function movableLightFromEffect(
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "movableLightManifestation" }
  >,
): readonly BattleMovableLight[] {
  return effect.form === "combinedMediumForm" ? [effect.light] : effect.lights;
}

function lightEmitterFromPostDamageRider(
  state: BattleState,
  actorId: CombatantId,
  attachment: SpellLightEmitterTargetAttachment,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
  rider: SpellLightEmissionPostDamageRider,
): BattleStoredLightEmitterTemplate {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    state,
    actorId,
    actorId,
    rider.expiresAt,
  );
  const base = {
    sourceProcedureRef: invocation.sourceProcedureRef,
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
        sourceProcedureRef: invocation.sourceProcedureRef,
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

export function activeSelfTransformationModeEffect(
  combatant: BattleCreatureState | undefined,
  source?: {
    readonly sourceCombatantId: CombatantId;
  },
): SelfTransformationModeActiveEffect | undefined {
  return combatant?.activeEffects.find(
    (effect): effect is SelfTransformationModeActiveEffect =>
      effect.kind === "selfTransformation" &&
      (source === undefined ||
        activeEffectHasSourceCombatant(effect, source.sourceCombatantId)),
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

export function applySelfTransformationModeEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly modeEffect: SelfTransformationModeEffectPayload;
  readonly expiresAt: SelfTransformationModeActiveEffect["expiresAt"];
  readonly effectRef: BattleEffectExecutionRef;
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the selected self-transformation target is admitted from the combatant map and retained through effect application. */
  if (actor === undefined) {
    return input.state;
  }
  /* v8 ignore stop -- @preserve */
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "selfTransformation" &&
          activeEffectSourceMatches(effect, input)
        ),
    ),
    {
      kind: "selfTransformation" as const,
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.sourceCombatantId,
      effectRef: input.effectRef,
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
    BattleExecutableSpellInvocation,
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
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: validated failed-save target ids are selected from the current combatant map before post-damage riders are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    let allocatedTarget = target;
    let activeEffects = target.activeEffects;
    for (const rider of activeEffectRiders) {
      const allocation = allocateBattleEffectOccurrenceForCreature({
        owner: allocatedTarget,
        effect: {
          kind: "nextAttackRollBySelf",
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          mode: rider.mode,
          expiresAt: activeEffectExpirationForPostDamageRider(
            state,
            actorId,
            target.combatantId,
            rider.expiresAt,
          ),
        },
      });
      allocatedTarget = allocation.owner;
      activeEffects = [
        ...activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId)
            ),
        ),
        allocation.effect,
      ];
    }
    combatants.set(targetId, { ...allocatedTarget, activeEffects });
  }
  return { ...state, combatants };
}

export function applyFailedSaveSpellConditionEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "afterHitSaveGatedCondition"
        | "saveGatedCondition"
        | "saveGatedDamage";
    }
  >,
  appliedEffect: SpellSelectedFailedSaveConditionEffect,
  savingThrowDisadvantageAbilityChoice?: Ability | undefined,
  heightenedSpellTargetId: CombatantId | undefined = undefined,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  let nextState = state;
  for (const targetId of targetIds) {
    const target = nextState.combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: validated failed-save target ids are selected from the current combatant map before condition effects are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
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
          activeEffect.kind === "spellConditionEndTurnSave" ||
          activeEffect.kind === "spellConditionCountedEndTurnSave") &&
        sourceRefsMatch(activeEffect, sourceProcedureRef, sourceCombatantId) &&
        activeEffect.condition === appliedEffect.condition,
    );
    const expiresAt = activeEffectExpirationForPostDamageRider(
      state,
      actorId,
      target.combatantId,
      appliedEffect.expiresAt,
    );
    const selectedEffectTemplate = (() => {
      if (appliedEffect.repeatSave === null) {
        return {
          kind: "spellCondition" as const,
          sourceProcedureRef: invocation.sourceProcedureRef,
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
        };
      }
      return isCountedSpellConditionRepeatSave(appliedEffect.repeatSave)
        ? {
            kind: "spellConditionCountedEndTurnSave" as const,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
            condition: appliedEffect.condition,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                appliedEffect.condition,
              ),
            save: appliedEffect.repeatSave.save,
            successes: 0,
            failures: 0,
            successThreshold: appliedEffect.repeatSave.successThreshold,
            failureThreshold: appliedEffect.repeatSave.failureThreshold,
            savingThrowDisadvantageAbility:
              savingThrowDisadvantageAbilityChoice ??
              appliedEffect.repeatSave.savingThrowDisadvantageAbilities[0],
            lockedIn: false,
            expiresAt,
          }
        : {
            kind: "spellConditionEndTurnSave" as const,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
            condition: appliedEffect.condition,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                appliedEffect.condition,
              ),
            heightenedSpellTargetDisadvantage:
              spellConditionEndTurnSaveHeightenedRollMode(
                targetId,
                heightenedSpellTargetId,
              ),
            save: appliedEffect.repeatSave,
            expiresAt,
          };
    })();
    const selectedEffect = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: selectedEffectTemplate,
    });
    const activeEffects = [
      ...selectedEffect.owner.activeEffects.filter(
        (effect) => !replacing.includes(effect),
      ),
      selectedEffect.effect,
    ];
    nextState = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(
          selectedEffect.owner,
          activeEffects,
        ),
      ),
    };
  }
  const targetConcentrationReconciled = targetIds.reduce(
    (nextState, targetId) =>
      breakConcentrationIfCombatantIsIncapacitated(nextState, targetId),
    nextState,
  );
  return clearSourceConcentrationIfRepeatSaveConditionSpellHasNoEffects(
    targetConcentrationReconciled,
    actorId,
    invocation.sourceProcedureRef,
    appliedEffect,
  );
}

function spellConditionEndTurnSaveHeightenedRollMode(
  targetId: CombatantId,
  heightenedSpellTargetId: CombatantId | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionEndTurnSave" }
>["heightenedSpellTargetDisadvantage"] {
  return targetId === heightenedSpellTargetId
    ? { kind: "heightenedSpellTargetDisadvantage" }
    : null;
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
  sourceProcedureRef: BattleProcedureExecutionRef,
  appliedEffect: SpellSelectedFailedSaveConditionEffect,
): BattleState {
  if (
    appliedEffect.repeatSave === null ||
    isCountedSpellConditionRepeatSave(appliedEffect.repeatSave) ||
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
        sourceProcedureRef,
      },
    ),
  };
}

function isCountedSpellConditionRepeatSave(
  repeatSave: SpellSelectedFailedSaveConditionEffect["repeatSave"],
): repeatSave is SpellConditionCountedRepeatSave {
  return (
    repeatSave !== null && "kind" in repeatSave && repeatSave.kind === "counted"
  );
}

export function applyStagedSaveConditionPendingRepeatEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "stagedSaveCondition" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "stagedSaveConditionPendingRepeat" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          "incapacitated",
        ),
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        repeatAt: endOfNextTurnExpiration(
          state,
          targetId,
          END_OF_NEXT_TURN_DURING_TURN,
        ),
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
        },
      },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects,
      allocation.effect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    );
  }
  const effected: BattleState = { ...state, combatants };
  return targetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    effected,
  );
}

export function applySaveGatedConditionWithRepeatEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedConditionWithRepeat" }
  >,
  heightenedSpellTargetId: CombatantId | undefined = undefined,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "saveGatedConditionWithRepeat" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        conditionHadNonSpellProneSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "prone"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        repeatSaveRollMode: saveGatedConditionWithRepeatRepeatSaveRollMode(
          targetId,
          heightenedSpellTargetId,
        ),
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
    });
    const activeEffects = [
      ...allocation.owner.activeEffects,
      allocation.effect,
    ];
    const affectedTarget = battleCreatureWithSpellActiveEffects(
      allocation.owner,
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

function saveGatedConditionWithRepeatRepeatSaveRollMode(
  targetId: CombatantId,
  heightenedSpellTargetId: CombatantId | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "saveGatedConditionWithRepeat" }
>["repeatSaveRollMode"] {
  return targetId === heightenedSpellTargetId ? "disadvantage" : null;
}

export function applyPersistentAreaSaveConditionCastEffects(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "persistentAreaSaveConditionArea" }
  >;
  readonly failedTargetIds: readonly CombatantId[];
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaSaveCondition" }
  >;
  readonly heightenedSpellTargetId: CombatantId | null;
}): BattleState {
  const stateWithActiveEffect = battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveCondition" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.area.areaId,
      heightenedSpellTargetDisadvantage:
        input.heightenedSpellTargetId === null
          ? null
          : {
              kind: "heightenedSpellTargetDisadvantage" as const,
              targetId: input.heightenedSpellTargetId,
            },
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
  return {
    ...stateWithActiveEffect,
    combatants: applyProneToCombatants(
      new Map(stateWithActiveEffect.combatants),
      input.failedTargetIds,
    ),
  };
}

function updateEffectOwnerActiveEffects(input: {
  readonly state: BattleState;
  readonly effectOwnerId: CombatantId;
  readonly update: (
    activeEffects: readonly BattleActiveEffect[],
  ) => readonly BattleActiveEffect[];
}): BattleState {
  const effectOwner = input.state.combatants.get(input.effectOwnerId);
  if (effectOwner === undefined) {
    return input.state;
  }
  const combatants = new Map(input.state.combatants).set(input.effectOwnerId, {
    ...effectOwner,
    activeEffects: input.update(effectOwner.activeEffects),
  });
  return { ...input.state, combatants };
}

function appendCombatantIdOnce(
  values: readonly CombatantId[],
  targetId: CombatantId,
): readonly CombatantId[] {
  return values.includes(targetId) ? values : [...values, targetId];
}

function battleStateAfterReplacingCasterActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly activeEffect: CasterAreaSpellActiveEffectTemplate;
}): BattleState {
  const owner = input.state.combatants.get(input.actorId);
  if (owner === undefined) return input.state;
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner,
    effect: input.activeEffect,
  });
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...allocation.owner,
      activeEffects: [
        ...allocation.owner.activeEffects.filter(
          (activeEffect) =>
            !sameCasterAreaSpellOccurrence(activeEffect, input.activeEffect),
        ),
        allocation.effect,
      ],
    }),
  };
}

const CASTER_AREA_SPELL_ACTIVE_EFFECT_KIND_SET: ReadonlySet<
  BattleActiveEffect["kind"]
> = new Set(CASTER_AREA_SPELL_ACTIVE_EFFECT_KINDS);

function isCasterAreaSpellActiveEffect(
  activeEffect: BattleActiveEffect,
): activeEffect is CasterAreaSpellActiveEffect {
  return CASTER_AREA_SPELL_ACTIVE_EFFECT_KIND_SET.has(activeEffect.kind);
}

function sameCasterAreaSpellOccurrence(
  candidate: BattleActiveEffect,
  activeEffect: CasterAreaSpellActiveEffectTemplate,
): boolean {
  return (
    isCasterAreaSpellActiveEffect(candidate) &&
    candidate.kind === activeEffect.kind &&
    activeEffectSourceMatches(candidate, activeEffect) &&
    candidate.areaId === activeEffect.areaId
  );
}

export function applyPersistentAreaTraitCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaTrait" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaTrait" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
}

export function applyMagicalDarknessPointOriginCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaChoice: BattleMagicalDarknessAreaChoice;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >;
}): BattleState {
  if (!input.state.combatants.has(input.actorId)) {
    return input.state;
  }
  const stateWithActiveEffect = battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "magicalDarknessPointOrigin" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.areaChoice.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
  const dispelledLightEffectRefs = new Set(
    input.areaChoice.spellCreatedLightOverlaps.map(
      (overlap) => overlap.effectRef,
    ),
  );
  return {
    ...stateWithActiveEffect,
    lightEmitters: input.state.lightEmitters.filter(
      (emitter) =>
        !(
          isTrackedOngoingSpellLightEmitter(emitter) &&
          emitter.sourceSpellLevel <=
            input.invocation.dispelledSpellCreatedLightMaxSpellLevel &&
          dispelledLightEffectRefs.has(emitter.effectRef)
        ),
    ),
  };
}

export function applyRamMovablePersistentAreaCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "bonusAction";
      };
    }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveDamage" as const,
      lifecycle: input.invocation.lifecycle,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
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
  });
}

export function applySpatialMeleeSpellAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly forcePositionId: BattleTablePositionId;
  readonly repeatTargeting: SpatialMeleeSpellAttackProxyRepeatTargeting;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "spatialMeleeSpellAttackProxy";
      readonly operation: "createAndAttack";
    }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: caster,
    effect: {
      kind: "spatialMeleeSpellAttackProxy",
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      sourceSpellLevel: spellInvocationEffectiveSpellLevel(input.invocation),
      forcePositionId: input.forcePositionId,
      forceReachFeet: input.invocation.forceReachFeet,
      repeatMoveMaxFeet: input.invocation.repeatMoveMaxFeet,
      repeatTargeting: input.repeatTargeting,
      startedOn: {
        actorId: input.actorId,
        round: input.state.initiative.round,
      },
      damage: input.invocation.damage,
      attackKind: input.invocation.attackKind,
      attackBonus: input.invocation.attackBonus,
      expiresAt: {
        kind: "concentration",
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
  const activeEffect = allocation.effect;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spatialMeleeSpellAttackProxy" &&
          activeEffectSourceMatches(effect, activeEffect)
        ),
    ),
    activeEffect,
  ];
  const owner = allocation.owner;
  if (owner.origin.kind !== "character") return input.state;
  const repeatExecution = {
    procedure: "spatialMeleeSpellAttackProxy" as const,
    operation: "repositionAndAttack" as const,
    activeEffectRef: activeEffect.effectRef,
    activeEffectSourceProcedureRef: activeEffect.sourceProcedureRef,
  } satisfies RepeatSpatialMeleeSpellAttackProxySpellProcedureExecution;
  combatants.set(input.actorId, {
    ...owner,
    activeEffects,
    origin: {
      ...owner.origin,
      execution: characterExecutionWithSpatialMeleeSpellAttackProxyRepeatAttack(
        owner.origin.execution,
        repeatExecution,
      ),
    },
  });
  return { ...input.state, combatants };
}

export function repositionSpatialMeleeSpellAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "spatialMeleeSpellAttackProxy";
      readonly operation: "repositionAndAttack";
    }
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
      effect.kind === "spatialMeleeSpellAttackProxy" &&
      effect.effectRef === input.invocation.activeEffect.effectRef
        ? { ...effect, forcePositionId: input.forcePositionId }
        : effect,
    ),
  });
  return { ...input.state, combatants };
}

export function applyAreaMovementDistanceDamageCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "areaMovementDistanceDamage" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "areaMovementDistanceDamage" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
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
  });
}

export function applyMovablePersistentAreaCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "magicAction";
      };
    }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveDamage" as const,
      lifecycle: input.invocation.lifecycle,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
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
  });
}

export function applyPersistentAreaSaveConditionEscapeCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaSaveConditionEscape" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveConditionEscape" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
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
  });
}

export function applyPersistentAreaSaveCompositeCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaSaveComposite" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveComposite" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      heightFeet: input.invocation.targeting.heightFeet,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      savedThisTurn: [],
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
}

export function applyStationaryPersistentAreaAreaHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "stationary" };
    }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveDamage" as const,
      lifecycle: input.invocation.lifecycle,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      appearanceOccurrence: {
        actorId: currentActing(input.state.initiative),
        round: input.state.initiative.round,
      },
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      damage: input.invocation.damage,
      savedThisTurn: [],
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
}

export function applyTranslatingPersistentAreaAreaHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
    }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "persistentAreaSaveDamage" as const,
      lifecycle: input.invocation.lifecycle,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      appearanceOccurrence: {
        actorId: currentActing(input.state.initiative),
        round: input.state.initiative.round,
      },
      areaId: input.areaId,
      radiusFeet: input.invocation.targeting.radiusFeet,
      save: {
        ability: input.invocation.ability,
        dc: input.invocation.dc,
      },
      damage: input.invocation.damage,
      savedThisTurn: [],
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  });
}

export function applyDirectionalPersistentAreaCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "directionalPersistentAreaArea" }
  >;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "directionalPersistentArea" }
  >;
  readonly heightenedSpellTargetId: CombatantId | null;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "directionalPersistentArea" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.area.areaId,
      directionId: input.area.directionId,
      heightenedSpellTargetDisadvantage:
        input.heightenedSpellTargetId === null
          ? null
          : {
              kind: "heightenedSpellTargetDisadvantage" as const,
              targetId: input.heightenedSpellTargetId,
            },
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
  });
}

export function replaceDirectionalPersistentAreaDirection(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly effectRef: BattleEffectExecutionRef;
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
}): BattleState {
  const source = input.state.combatants.get(input.sourceCombatantId);
  if (source === undefined) {
    return input.state;
  }
  const activeEffects = source.activeEffects.map((effect) =>
    effect.kind === "directionalPersistentArea" &&
    effect.effectRef === input.effectRef &&
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

function isSingleSaveAreaActiveEffect(
  activeEffect: BattleActiveEffect,
): activeEffect is SingleSaveAreaActiveEffect {
  return (
    activeEffect.kind === "persistentAreaSaveComposite" ||
    (activeEffect.kind === "persistentAreaSaveDamage" &&
      "savedThisTurn" in activeEffect)
  );
}

function resetAllSingleSaveAreaEffectsForTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  matchesLifecycle: (effect: SingleSaveAreaActiveEffect) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const next = new Map(combatants);
  for (const [id, combatant] of next) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      isSingleSaveAreaActiveEffect(effect) &&
      matchesLifecycle(effect) &&
      effect.savedThisTurn.length > 0
        ? { ...effect, savedThisTurn: [] as readonly CombatantId[] }
        : effect,
    );
    if (activeEffects.some((e, i) => e !== combatant.activeEffects[i])) {
      next.set(id, { ...combatant, activeEffects });
    }
  }
  return next;
}

export function resetAllMovablePersistentAreaSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    (effect) =>
      effect.kind === "persistentAreaSaveDamage" &&
      effect.lifecycle.kind === "casterActionReposition",
  );
}

export function resetAllPersistentAreaSaveConditionEscapeSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const next = new Map(combatants);
  for (const [id, combatant] of next) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      effect.kind === "persistentAreaSaveConditionEscape" &&
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

export function resetAllPersistentAreaSaveCompositeSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    (effect) => effect.kind === "persistentAreaSaveComposite",
  );
}

export function resetAllStationaryPersistentAreaSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    (effect) =>
      effect.kind === "persistentAreaSaveDamage" &&
      effect.lifecycle.kind === "stationary",
  );
}

export function resetAllTranslatingPersistentAreaSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    (effect) =>
      effect.kind === "persistentAreaSaveDamage" &&
      effect.lifecycle.kind === "sourceTurnTranslation",
  );
}

export function markMovablePersistentAreaSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    MovablePersistentAreaActiveEffect,
    { readonly kind: "persistentAreaSaveDamage" }
  >,
): BattleState {
  return updateEffectOwnerActiveEffects({
    state,
    effectOwnerId: effect.sourceCombatantId,
    update: (activeEffects) =>
      activeEffects.map((current) =>
        movablePersistentAreaEffectMatches(current, effect)
          ? {
              ...current,
              savedThisTurn: appendCombatantIdOnce(
                current.savedThisTurn,
                targetId,
              ),
            }
          : current,
      ),
  });
}

function movablePersistentAreaEffectMatches(
  current: BattleActiveEffect,
  effect: Extract<
    MovablePersistentAreaActiveEffect,
    { readonly kind: "persistentAreaSaveDamage" }
  >,
): current is Extract<
  MovablePersistentAreaActiveEffect,
  { readonly kind: "persistentAreaSaveDamage" }
> {
  return (
    current.kind === "persistentAreaSaveDamage" &&
    current.lifecycle.kind === "casterActionReposition" &&
    current.lifecycle.actionCost === "magicAction" &&
    current.effectRef === effect.effectRef &&
    current.areaId === effect.areaId
  );
}

export function addMovablePersistentAreaShapeShiftSuppression(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    MovablePersistentAreaActiveEffect,
    { readonly kind: "persistentAreaSaveDamage" }
  >,
): BattleState {
  return updateEffectOwnerActiveEffects({
    state,
    effectOwnerId: effect.sourceCombatantId,
    update: (activeEffects) =>
      activeEffects.map((current) =>
        movablePersistentAreaEffectMatches(current, effect)
          ? {
              ...current,
              shapeShiftSuppressed: appendCombatantIdOnce(
                current.shapeShiftSuppressed,
                targetId,
              ),
            }
          : current,
      ),
  });
}

export function removeMovablePersistentAreaShapeShiftSuppression(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    MovablePersistentAreaActiveEffect,
    { readonly kind: "persistentAreaSaveDamage" }
  >,
): BattleState {
  return updateEffectOwnerActiveEffects({
    state,
    effectOwnerId: effect.sourceCombatantId,
    update: (activeEffects) =>
      activeEffects.map((current) =>
        movablePersistentAreaEffectMatches(current, effect)
          ? {
              ...current,
              shapeShiftSuppressed: current.shapeShiftSuppressed.filter(
                (combatantId) => combatantId !== targetId,
              ),
            }
          : current,
      ),
  });
}

export function markPersistentAreaSaveConditionEscapeSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "persistentAreaSaveConditionEscape" }
  >,
  trigger: BattlePersistentAreaSaveConditionEscapeTrigger,
): BattleState {
  return updateEffectOwnerActiveEffects({
    state,
    effectOwnerId: effect.sourceCombatantId,
    update: (activeEffects) =>
      activeEffects.map((current) =>
        current === effect && trigger === "entersArea"
          ? {
              ...current,
              entrySavedThisTurn: appendCombatantIdOnce(
                current.entrySavedThisTurn,
                targetId,
              ),
            }
          : current === effect
            ? {
                ...current,
                startTurnSavedThisTurn: appendCombatantIdOnce(
                  current.startTurnSavedThisTurn,
                  targetId,
                ),
              }
            : current,
      ),
  });
}

function markSingleSaveAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: SingleSaveAreaHazardActiveEffect,
  effectOwnerId: CombatantId = effect.sourceCombatantId,
): BattleState {
  return updateEffectOwnerActiveEffects({
    state,
    effectOwnerId,
    update: (activeEffects) => {
      let updated = false;
      return activeEffects.map((current) => {
        const matches =
          !updated &&
          current.kind === effect.kind &&
          current.effectRef === effect.effectRef;
        if (!matches) return current;
        updated = true;
        return {
          ...effect,
          savedThisTurn: appendCombatantIdOnce(effect.savedThisTurn, targetId),
        };
      });
    },
  });
}

export function markPersistentAreaSaveCompositeSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "persistentAreaSaveComposite" }
  >,
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(state, targetId, effect);
}

export function markStationaryPersistentAreaAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  locatedEffect: {
    readonly effectOwnerId: CombatantId;
    readonly effect: StationaryPersistentAreaSaveDamageActiveEffect;
  },
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(
    state,
    targetId,
    locatedEffect.effect,
    locatedEffect.effectOwnerId,
  );
}

export function markTranslatingPersistentAreaAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  locatedEffect: {
    readonly effectOwnerId: CombatantId;
    readonly effect: TranslatingPersistentAreaSaveDamageActiveEffect;
  },
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(
    state,
    targetId,
    locatedEffect.effect,
    locatedEffect.effectOwnerId,
  );
}

export function applyPersistentAreaSaveConditionEscapeRestrainedCondition(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "persistentAreaSaveConditionEscape" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: PersistentAreaSaveConditionEscape failed-save outcomes are validated against the current combatant map before restraint is applied. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const replacing = target.activeEffects.filter(
    (candidate) =>
      candidate.kind === "spellCondition" &&
      activeEffectSourceMatches(candidate, effect) &&
      candidate.condition === "restrained",
  );
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      kind: "spellCondition",
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      condition: "restrained",
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        target,
        "restrained",
      ),
      escape: {
        kind: "abilityCheck",
        ability: "str",
        skill: "athletics",
        allowedActor: "target",
        successEnds: "condition",
      },
      turnStartDamage: null,
      expiresAt: effect.expiresAt,
    },
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter(
      (candidate) => !replacing.includes(candidate),
    ),
    allocation.effect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    ),
  };
}

export function removePersistentAreaSaveConditionEscapeRestrainedCondition(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
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
      activeEffectSourceMatches(candidate, input) &&
      candidate.condition === "restrained",
  );
  return effect === undefined
    ? input.state
    : removeSpellConditionEffect(input.state, input.targetId, effect);
}

export function applyPersistentAreaSaveConditionProneToTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return applyProneToTarget(state, targetId);
}

export function applyProneToTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return {
    ...state,
    combatants: applyProneToCombatants(new Map(state.combatants), [targetId]),
  };
}

export function applyPersistentAreaSaveCompositeFailedSaveEffect(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return breakBattleConcentration(
    applyProneToTarget(state, targetId),
    targetId,
  );
}

export function applyCompelledNextTurnBehaviorEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "compelledNextTurnBehavior" }
  >,
  option: BattleCompelledBehaviorOption,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  let nextState = state;
  for (const targetId of targetIds) {
    const target = nextState.combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: Command failed-save target ids are validated against the current combatant map before pending effects are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "compelledNextTurnBehavior",
        option,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        expiresAt: endOfNextTurnExpiration(
          state,
          targetId,
          END_OF_NEXT_TURN_DURING_TURN,
        ),
      },
    });
    nextState = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...allocation.owner,
        activeEffects: [
          ...allocation.owner.activeEffects.filter(
            (effect) =>
              !(
                effect.kind === "compelledNextTurnBehavior" &&
                sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId)
              ),
          ),
          allocation.effect,
        ],
      }),
    };
  }
  return nextState;
}

export function applyExecuteCompelledGrovelProneToTarget(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "compelledNextTurnBehavior" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: Grovel resolution receives the current target and its pending Command effect from the admitted turn-start command. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
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

function applyProneToCombatants(
  combatants: Map<CombatantId, BattleCreatureState>,
  targetIds: readonly CombatantId[],
): Map<CombatantId, BattleCreatureState> {
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: prone target ids come from validated spell or feature saving-throw outcomes over the current combatant map. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
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

export function applyFailedSaveAttackRollAdvantageEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  area: BattleSpellAreaChoice | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageInvocation>,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: Faerie Fire failed-save target ids are validated against the current combatant map before outlines are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        ...invocation.effect,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
      },
    });
    combatants.set(targetId, {
      ...allocation.owner,
      activeEffects: [...allocation.owner.activeEffects, allocation.effect],
    });
  }
  return {
    ...state,
    combatants,
    objectOutlines: [
      ...state.objectOutlines,
      ...saveGatedTargetProjectionObjects(actorId, area, invocation),
    ],
  };
}

export function applySaveGatedConditionImmunityEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    /* v8 ignore start -- @preserve -- Defensive internal guard: protection-spell failed-save target ids are validated against the current combatant map before immunities are applied. */
    if (target === undefined) {
      return nextState;
    }
    /* v8 ignore stop -- @preserve */
    let allocatedTarget = target;
    const nextEffects: BattleActiveEffect[] = [];
    for (const effect of invocation.activeEffects) {
      const allocation = allocateBattleEffectOccurrenceForCreature({
        owner: allocatedTarget,
        effect: {
          ...effect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          conditionHadNonSpellSource:
            conditionHadNonSpellSourceBeforeSpellEffect(
              target,
              effect.condition,
            ),
        },
      });
      allocatedTarget = allocation.owner;
      nextEffects.push(allocation.effect);
    }
    const activeEffects = [...allocatedTarget.activeEffects, ...nextEffects];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(allocatedTarget, activeEffects),
      ),
    };
  }, state);
}

function saveGatedTargetProjectionObjects(
  actorId: CombatantId,
  area: BattleSpellAreaChoice | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageInvocation>,
): readonly BattleObjectOutline[] {
  if (
    area?.kind !== "saveGatedTargetProjectionArea" ||
    !saveGatedAttackRollAdvantageInvocationIsVisibilityGrantingArea(invocation)
  ) {
    return [];
  }
  return area.affectedObjectIds.map((objectId) => ({
    kind: "saveGatedTargetProjectionObject",
    objectId,
    sourceProcedureRef: invocation.sourceProcedureRef,
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

type SpellPostDamageRiderActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "speedDelta"
      | "spellCondition"
      | "opportunityAttackDenied"
      | "nextAttackRollAgainstSelf"
      | "hitPointRegainPrevented"
      | "invisibleBenefitDenied";
  }
>;

function isSpellPostDamageRiderActiveEffect(
  effect: BattleActiveEffect,
  rider: SpellActiveEffectPostDamageRider,
): effect is SpellPostDamageRiderActiveEffect {
  return effect.kind === activeEffectKindForSpellPostDamageRider(rider);
}

export function spellPostDamageRiderReplacesActiveEffect(
  rider: SpellActiveEffectPostDamageRider,
  effect: BattleActiveEffect,
  sourceProcedureRef: BattleProcedureExecutionRef,
  actorId: CombatantId,
): boolean {
  if (
    !isSpellPostDamageRiderActiveEffect(effect, rider) ||
    !activeEffectProcedureMatches(effect, sourceProcedureRef)
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

function spellPostDamageRiderActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly target: BattleCreatureState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly rider: SpellActiveEffectPostDamageRider;
}): {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: BattleActiveEffect;
} {
  const expiresAt = activeEffectExpirationForPostDamageRider(
    input.state,
    input.actorId,
    input.target.combatantId,
    spellPostDamageRiderExpiration(input.rider),
  );
  const effect = Match.value(input.rider).pipe(
    Match.when({ kind: "speedDelta" }, (rider) => ({
      kind: "speedDelta" as const,
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      deltaFeet: rider.deltaFeet,
      expiresAt,
    })),
    Match.when({ kind: "condition" }, (rider) => ({
      kind: "spellCondition" as const,
      sourceProcedureRef: input.sourceProcedureRef,
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
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "nextAttackRollAgainstTarget" }, (rider) => ({
      kind: "nextAttackRollAgainstSelf" as const,
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      mode: rider.mode,
      expiresAt,
    })),
    Match.when({ kind: "hitPointRegainPrevented" }, () => ({
      kind: "hitPointRegainPrevented" as const,
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.when({ kind: "invisibleBenefitDenied" }, () => ({
      kind: "invisibleBenefitDenied" as const,
      sourceProcedureRef: input.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      expiresAt,
    })),
    Match.exhaustive,
  );
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: input.target,
    effect,
  });
  return {
    state: {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.target.combatantId,
        allocation.owner,
      ),
    },
    target: allocation.owner,
    effect: allocation.effect,
  };
}

type PostDamageRiderExpirationInput =
  | SpellPostDamageRiderExpiration
  | Extract<
      SpellFailedSavePostDamageRider,
      { readonly kind: "nextAttackRollByTarget" }
    >["expiresAt"]
  | SpellFailedSaveConditionEffect["expiresAt"]
  | undefined;

type StructuredPostDamageRiderExpiration = Extract<
  PostDamageRiderExpirationInput,
  { readonly kind: "duration" | "concentration" }
>;

type NamedPostDamageRiderExpiration = Exclude<
  PostDamageRiderExpirationInput,
  StructuredPostDamageRiderExpiration | undefined
>;

function expirationForStructuredPostDamageRider(
  expiresAt: StructuredPostDamageRiderExpiration,
  casterId: CombatantId,
): BattleActiveEffectExpiration {
  return Match.value(expiresAt).pipe(
    Match.when({ kind: "duration" }, (duration) => duration),
    Match.when({ kind: "concentration" }, ({ durationTicks }) => ({
      kind: "concentration" as const,
      combatantId: casterId,
      durationTicks,
    })),
    Match.exhaustive,
  );
}

function expirationForNamedPostDamageRider(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  expiresAt: NamedPostDamageRiderExpiration,
): BattleActiveEffectExpiration {
  return Match.value(expiresAt).pipe(
    Match.when("startOfTargetNextTurn", () => ({
      kind: "startOfTurn" as const,
      combatantId: targetId,
    })),
    Match.when("endOfCasterNextTurn", () =>
      endOfNextTurnExpiration(state, casterId, END_OF_NEXT_TURN_DURING_TURN),
    ),
    Match.when("concentration", () => ({
      kind: "concentration" as const,
      combatantId: casterId,
    })),
    Match.when("endOfTargetNextTurn", () =>
      endOfNextTurnExpiration(state, targetId, END_OF_NEXT_TURN_DURING_TURN),
    ),
    Match.exhaustive,
  );
}

export function activeEffectExpirationForPostDamageRider(
  state: BattleState,
  casterId: CombatantId,
  targetId: CombatantId,
  expiresAt: PostDamageRiderExpirationInput,
): BattleActiveEffectExpiration {
  if (expiresAt === undefined) {
    return { kind: "startOfTurn", combatantId: casterId };
  }
  if (typeof expiresAt === "object") {
    return expirationForStructuredPostDamageRider(expiresAt, casterId);
  }
  return expirationForNamedPostDamageRider(
    state,
    casterId,
    targetId,
    expiresAt,
  );
}

export function endHeldLightSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "heldLightHurl" }
  >,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the admitted held-light hurl subject retains its caster through effect teardown. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: caster.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "heldLight" &&
            effect.effectRef === invocation.sourceEffectRef &&
            activeEffectHasSourceCombatant(effect, actorId)
          ),
      ),
    }),
  };
}

export function applyGrantedAreaSaveDamageActionSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  spellSaveDc: DifficultyClass,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "grantedAreaSaveDamageAction" }
  >,
  procedureRef: BattleProcedureExecutionRef,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: Dragon's Breath initial targeting is validated against the current combatant map before its granted effect is applied. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      ...invocation.activeEffect,
      sourceProcedureRef: procedureRef,
      sourceCombatantId: actorId,
      damageType,
      spellSaveDc,
    },
  });
  const activeEffects = [...allocation.owner.activeEffects, allocation.effect];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...allocation.owner,
      activeEffects,
    }),
  };
}

export function applyTriggeredArmorDefenseSpellActiveEffect(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "triggeredArmorDefense" }
  >,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the admitted Shield interrupt retains its reactor through active-effect application. */
  if (reactor === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */

  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: reactor,
    effect: {
      kind: "spellArmorClassBonus",
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: reactorId,
      bonus: invocation.armorClassBonus,
      negatesRepeatedDamageAllocation:
        invocation.negatesRepeatedDamageAllocation,
      expiresAt: {
        kind: "startOfTurn",
        combatantId: reactorId,
      },
    },
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...allocation.owner,
      activeEffects: [...allocation.owner.activeEffects, allocation.effect],
    }),
  };
}
