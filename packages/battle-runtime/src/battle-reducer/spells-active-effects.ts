// Spell active-effect application extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.paladin-sacred-weapon
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line unit-feature.metamagic-heightened-save-disadvantage

// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
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
import {
  movementFeet,
  type Ability,
  type DifficultyClass,
} from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import type {
  BattleActiveEffectExecutionRef,
  BattleAreaId,
  BattleLineDirectionId,
  BattleProcedureExecutionRef,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import { allocateBattleActiveEffectRefForCreature } from "../active-effect/execution-ref.ts";
import {
  activeEffectProcedureMatches,
  activeEffectHasSourceCombatant,
  activeEffectSourceMatches,
  activeEffectSourceRefsMatch as sourceRefsMatch,
} from "./active-effect-replacement.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-hit-point-state.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterExecutionWithDancingLightsReposition,
  characterExecutionWithSpellCreatedHeldObjectProcedures,
  characterExecutionWithSpiritualWeaponRepeatAttack,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import type {
  DancingLightsRepositionSpellProcedureExecution,
  SpellCreatedHeldObjectSpellProcedureExecution,
  SpiritualWeaponRepeatAttackSpellProcedureExecution,
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
  type BattleCommandOption,
  type BattleCreatureState,
  type BattleDancingLight,
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
  type BattleExecutableSpellInvocation,
  type BattleStoredLightEmitter,
  type SpiritualWeaponRepeatTargeting,
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
  type BattleWebRestraintTrigger,
} from "../battle-state-execution.ts";
import {
  antimagicFieldSuppressedOngoingSpellEffectKeys,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "./antimagic-field-suppression.ts";
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
export const DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET = movementFeet(10);
export const SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET = movementFeet(5);
export const PERCEPTION_LIGHTLY_OBSCURED_ROLL_MODE = "disadvantage" as const;
const SHINING_SMITE_DIM_ADDITIONAL_RADIUS_FEET = movementFeet(0);
const CASTER_AREA_SPELL_ACTIVE_EFFECT_KINDS = [
  "greaseGroundHazard",
  "fogCloudObscurement",
  "magicalDarknessPointOrigin",
  "flamingSphere",
  "spikeGrowthHazard",
  "moonbeam",
  "webRestraintHazard",
  "sleetStormAreaHazard",
  "insectPlagueAreaHazard",
  "cloudkillAreaHazard",
  "gustOfWindLine",
] as const satisfies ReadonlyArray<BattleActiveEffect["kind"]>;
type CasterAreaSpellActiveEffectKind =
  (typeof CASTER_AREA_SPELL_ACTIVE_EFFECT_KINDS)[number];
type CasterAreaSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: CasterAreaSpellActiveEffectKind }
>;
const SINGLE_SAVE_AREA_ACTIVE_EFFECT_KINDS = [
  "moonbeam",
  "sleetStormAreaHazard",
  "insectPlagueAreaHazard",
  "cloudkillAreaHazard",
] as const satisfies ReadonlyArray<BattleActiveEffect["kind"]>;
type SingleSaveAreaActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: (typeof SINGLE_SAVE_AREA_ACTIVE_EFFECT_KINDS)[number] }
>;
type SingleSaveAreaHazardActiveEffect = Exclude<
  SingleSaveAreaActiveEffect,
  { readonly kind: "moonbeam" }
>;
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

type SpellLightEmitterTargetAttachment = Extract<
  BattleLightEmitterAttachment,
  { readonly kind: "combatant" | "object" }
>;

export type SaveGatedAttackRollAdvantageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

export function saveGatedAttackRollAdvantageInvocationIsFaerieFire(
  invocation: Pick<SaveGatedAttackRollAdvantageInvocation, "effect">,
): boolean {
  return invocation.effect.kind === "faerieFireOutline";
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
  /* v8 ignore start -- Defensive internal guard: the admitted spell-attack target is resolved from the combatant map and remains present through post-damage active-effect application. */
  if (target == null) {
    return state;
  }
  /* v8 ignore stop */
  const laterDamageEffect =
    invocation.laterDamage === null
      ? []
      : [
          {
            kind: "spellTurnEndDamage" as const,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
            damage: invocation.laterDamage,
            expiresAt: endOfNextTurnExpiration(
              state,
              targetId,
              END_OF_NEXT_TURN_DURING_TURN,
            ),
          },
        ];
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
        state,
        target,
        effects: [
          ...target.activeEffects,
          ...laterDamageEffect,
        ] as readonly BattleActiveEffect[],
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
                    : effect.kind === "dancingLights"
                      ? dancingLightsFromEffect(effect).map((light) => ({
                          kind: "spellLightEmitter" as const,
                          sourceProcedureRef: effect.sourceProcedureRef,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  /* v8 ignore stop */
  const freeHand = spellCreatedHeldObjectFreeHand(input.state, input.actorId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  /* v8 ignore stop */
  const activeEffects = [
    ...actor.activeEffects.filter((effect) => {
      const sameSourceReplay =
        effect.kind === "spellCreatedHeldObject" &&
        activeEffectSourceMatches(effect, input.activeEffect);
      if (sameSourceReplay) {
        /* v8 ignore next -- Pure replay/idempotency guard: `spendConfiguredSpellCastResources` breaks prior Concentration before initial held-object application; legal re-evocation uses `setSpellCreatedHeldObjectState` after release instead. */
        return false;
      }
      return true;
    }),
    input.activeEffect,
  ];
  const nextActor = battleCreatureWithSpellCreatedHeldObjectHand(
    {
      ...actor,
      activeEffects,
    },
    freeHand,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (nextActor.origin.kind !== "character") {
    return {
      tag: "invalid",
      message: "Spell-created held object execution owner is not a character.",
    };
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Defensive internal guard: held-object procedures pass the actor that supplied the selected active effect, so it remains present for this synchronous transition. */
  if (actor === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object actor is not in this battle.",
    };
  }
  /* v8 ignore stop */
  return setSpellCreatedHeldObjectStateForActor({ ...input, actor });
}

export function releaseSpellCreatedHeldObjectState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly effectRef: BattleActiveEffectExecutionRef;
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (freeHand === undefined) {
    return {
      tag: "invalid",
      message: "Spell-created held object requires a free hand.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "updated",
    actor: battleCreatureWithSpellCreatedHeldObjectHand(input.actor, freeHand),
  };
}

function lightEmitterMatchesTarget(
  emitter: BattleLightEmitter,
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
      { kind: "dancingLight" },
      (lightAttachment) =>
        target.kind === "dancingLight" &&
        lightAttachment.lightId === target.lightId &&
        lightAttachment.positionId === target.positionId &&
        lightAttachment.form === target.form,
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
    { readonly kind: "shiningSmiteIllumination" }
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
          effect.kind === "fogCloudObscurement"
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
              : effect.kind === "webRestraintHazard"
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
                : effect.kind === "sleetStormAreaHazard"
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
                  : effect.kind === "insectPlagueAreaHazard"
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
                    : effect.kind === "cloudkillAreaHazard"
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
  const nextEmitters = lightRiders.reduce<readonly BattleStoredLightEmitter[]>(
    (emitters, rider): readonly BattleStoredLightEmitter[] => [
      ...emitters.filter(
        (emitter) =>
          !(
            emitter.kind === "spellLightEmitter" &&
            emitter.sourceProcedureRef === invocation.sourceProcedureRef &&
            emitter.sourceCombatantId === actorId &&
            lightEmitterMatchesTarget(emitter, attachment)
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

export type DancingLightsCastPlan = DancingLightsEffectShape;
type DancingLightsEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "dancingLights" }
>;

export type DancingLightsRepositionPlan =
  | {
      readonly kind: "replaceEffect";
      readonly effect: DancingLightsEffect;
      readonly effectShape: DancingLightsEffectShape;
    }
  | {
      readonly kind: "removeEffect";
      readonly effect: DancingLightsEffect;
    };

export function applyDancingLightsSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >,
  plan: DancingLightsCastPlan,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- Defensive internal guard: action-spell admission preserves the character caster through Dancing Lights cast application. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: caster,
  });
  const owner = allocation.owner;
  /* v8 ignore start -- Defensive internal guard: the Dancing Lights invocation is admitted only for a character spellcaster, and active-effect allocation preserves origin kind. */
  if (owner.origin.kind !== "character") return state;
  /* v8 ignore stop */
  const activeEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "dancingLights" }
  > = {
    kind: "dancingLights",
    effectRef: allocation.effectRef,
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
    expiresAt: invocation.expiresAt,
    ...plan,
  };
  const repositionExecution: DancingLightsRepositionSpellProcedureExecution = {
    spellRuleFacts: invocation.spellRuleFacts,
    access: { tag: "classCantrip" },
    resource: { tag: "none" },
    procedure: "dancingLightsReposition",
    actionCost: "bonusAction",
    activeEffectRef: activeEffect.effectRef,
    sourceDancingLightsProcedureRef: activeEffect.sourceProcedureRef,
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
            effect.kind !== "dancingLights" ||
            !activeEffectSourceMatches(effect, activeEffect),
        ),
        activeEffect,
      ],
      origin: {
        ...owner.origin,
        execution: characterExecutionWithDancingLightsReposition(
          owner.origin.execution,
          repositionExecution,
        ),
      },
    }),
  };
}

export function repositionDancingLightsSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  plan: DancingLightsRepositionPlan,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- Defensive internal guard: the admitted Dancing Lights reposition subject retains its caster while the active effect is replayed. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects: caster.activeEffects.flatMap((effect) => {
        if (
          effect.kind !== "dancingLights" ||
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

export function dancingLightsFromEffect(
  effect: Extract<BattleActiveEffect, { readonly kind: "dancingLights" }>,
): readonly BattleDancingLight[] {
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
): BattleStoredLightEmitter {
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
  readonly effectRef: BattleActiveEffectExecutionRef;
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  /* v8 ignore start -- Defensive internal guard: the selected self-transformation target is admitted from the combatant map and retained through effect application. */
  if (actor === undefined) {
    return input.state;
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- Defensive internal guard: validated failed-save target ids are selected from the current combatant map before post-damage riders are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
    const activeEffects = activeEffectRiders.reduce(
      (effects, rider): readonly BattleActiveEffect[] => [
        ...effects.filter(
          (effect) =>
            !(
              effect.kind === "nextAttackRollBySelf" &&
              sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId)
            ),
        ),
        {
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
    /* v8 ignore start -- Defensive internal guard: validated failed-save target ids are selected from the current combatant map before condition effects are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
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
    const selectedEffect = (() => {
      if (appliedEffect.repeatSave === null) {
        const allocation = allocateBattleActiveEffectRefForCreature({
          owner: target,
        });
        return {
          owner: allocation.owner,
          effect: {
            kind: "spellCondition" as const,
            effectRef: allocation.effectRef,
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
          } satisfies BattleActiveEffect,
        };
      }
      return isCountedSpellConditionRepeatSave(appliedEffect.repeatSave)
        ? {
            owner: target,
            effect: {
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
            } satisfies BattleActiveEffect,
          }
        : {
            owner: target,
            effect: {
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
            } satisfies BattleActiveEffect,
          };
    })();
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

export function applySleepPendingRepeatSaveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
  >,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "sleepPendingRepeatSave" &&
        sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId),
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "sleepPendingRepeatSave" as const,
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "hideousLaughter" }
  >,
  heightenedSpellTargetId: CombatantId | undefined = undefined,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  const combatants = new Map(state.combatants);
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "hideousLaughter" &&
        sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId),
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "hideousLaughter" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        conditionHadNonSpellProneSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "prone"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        repeatSaveRollMode: hideousLaughterRepeatSaveRollMode(
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

function hideousLaughterRepeatSaveRollMode(
  targetId: CombatantId,
  heightenedSpellTargetId: CombatantId | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
>["repeatSaveRollMode"] {
  return targetId === heightenedSpellTargetId ? "disadvantage" : null;
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "greaseGroundHazard" }
  >;
  readonly heightenedSpellTargetId: CombatantId | null;
}): BattleState {
  const stateWithActiveEffect = battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "greaseGroundHazard" as const,
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

function battleStateAfterReplacingCasterActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly activeEffect: CasterAreaSpellActiveEffect;
}): BattleState {
  const caster = input.state.combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const combatants = new Map(input.state.combatants).set(input.actorId, {
    ...caster,
    activeEffects: [
      ...caster.activeEffects.filter(
        (activeEffect) =>
          !sameCasterAreaSpellOccurrence(activeEffect, input.activeEffect),
      ),
      input.activeEffect,
    ],
  });
  return { ...input.state, combatants };
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
  activeEffect: CasterAreaSpellActiveEffect,
): boolean {
  return (
    isCasterAreaSpellActiveEffect(candidate) &&
    candidate.kind === activeEffect.kind &&
    activeEffectSourceMatches(candidate, activeEffect) &&
    candidate.areaId === activeEffect.areaId
  );
}

export function applyFogCloudObscurementCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "fogCloudObscurement" as const,
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
  const dispelledLightEffectIds = new Set(
    input.areaChoice.spellCreatedLightOverlaps.map(
      (overlap) => overlap.sourceEffectId,
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
          dispelledLightEffectIds.has(emitter.sourceEffectId)
        ),
    ),
  };
}

export function applyFlamingSphereCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "flamingSphere" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "flamingSphere" as const,
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

export function applySpiritualWeaponAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly forcePositionId: BattleTablePositionId;
  readonly repeatTargeting: SpiritualWeaponRepeatTargeting;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spiritualWeaponAttackProxy" }
  >;
}): BattleState {
  const combatants = new Map(input.state.combatants);
  const caster = combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: caster,
  });
  const activeEffect = {
    kind: "spiritualWeapon" as const,
    effectRef: allocation.effectRef,
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
      kind: "concentration" as const,
      combatantId: input.actorId,
      durationTicks: input.invocation.durationTicks,
    },
  } satisfies Extract<BattleActiveEffect, { readonly kind: "spiritualWeapon" }>;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spiritualWeapon" &&
          activeEffectSourceMatches(effect, activeEffect)
        ),
    ),
    activeEffect,
  ];
  const owner = allocation.owner;
  if (owner.origin.kind !== "character") return input.state;
  const repeatExecution = {
    procedure: "spiritualWeaponRepeatAttack" as const,
    activeEffectRef: activeEffect.effectRef,
    activeEffectSourceProcedureRef: activeEffect.sourceProcedureRef,
  } satisfies SpiritualWeaponRepeatAttackSpellProcedureExecution;
  combatants.set(input.actorId, {
    ...owner,
    activeEffects,
    origin: {
      ...owner.origin,
      execution: characterExecutionWithSpiritualWeaponRepeatAttack(
        owner.origin.execution,
        repeatExecution,
      ),
    },
  });
  return { ...input.state, combatants };
}

export function repositionSpiritualWeaponAttackProxyEffect(input: {
  readonly state: BattleState;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
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
      effect.kind === "spiritualWeapon" &&
      effect.effectRef === input.invocation.activeEffect.effectRef
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "spikeGrowthMovementHazard" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "spikeGrowthHazard" as const,
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

export function applyMoonbeamCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "moonbeam" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "moonbeam" as const,
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

export function applyWebRestraintHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "webRestraintHazard" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "webRestraintHazard" as const,
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

export function applySleetStormAreaHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "sleetStormAreaHazard" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "sleetStormAreaHazard" as const,
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

export function applyInsectPlagueAreaHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "insectPlagueAreaHazard" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "insectPlagueAreaHazard" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
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

export function applyCloudkillAreaHazardCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "cloudkillAreaHazard" }
  >;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "cloudkillAreaHazard" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
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

export function applyGustOfWindLineCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "gustOfWindLineArea" }
  >;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "gustOfWindLine" }
  >;
  readonly heightenedSpellTargetId: CombatantId | null;
}): BattleState {
  return battleStateAfterReplacingCasterActiveEffect({
    state: input.state,
    actorId: input.actorId,
    activeEffect: {
      kind: "gustOfWindLine" as const,
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

export function replaceGustOfWindLineDirection(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly areaId: BattleAreaId;
  readonly directionId: BattleLineDirectionId;
}): BattleState {
  const source = input.state.combatants.get(input.sourceCombatantId);
  if (source === undefined) {
    return input.state;
  }
  const activeEffects = source.activeEffects.map((effect) =>
    effect.kind === "gustOfWindLine" &&
    activeEffectSourceMatches(effect, input) &&
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

const SINGLE_SAVE_AREA_ACTIVE_EFFECT_KIND_SET: ReadonlySet<
  BattleActiveEffect["kind"]
> = new Set(SINGLE_SAVE_AREA_ACTIVE_EFFECT_KINDS);

function isSingleSaveAreaActiveEffect(
  activeEffect: BattleActiveEffect,
): activeEffect is SingleSaveAreaActiveEffect {
  return SINGLE_SAVE_AREA_ACTIVE_EFFECT_KIND_SET.has(activeEffect.kind);
}

function resetAllSingleSaveAreaEffectsForTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  kind: SingleSaveAreaActiveEffect["kind"],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const next = new Map(combatants);
  for (const [id, combatant] of next) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      isSingleSaveAreaActiveEffect(effect) &&
      effect.kind === kind &&
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

export function resetAllMoonbeamSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(combatants, "moonbeam");
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

export function resetAllSleetStormSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    "sleetStormAreaHazard",
  );
}

export function resetAllInsectPlagueSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    "insectPlagueAreaHazard",
  );
}

export function resetAllCloudkillSavedThisTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return resetAllSingleSaveAreaEffectsForTurn(
    combatants,
    "cloudkillAreaHazard",
  );
}

export function markMoonbeamSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  /* v8 ignore start -- Defensive internal guard: Moonbeam trigger resolution receives the active effect from its still-present concentration owner. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
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
    activeEffectSourceMatches(current, effect) &&
    current.areaId === effect.areaId
  );
}

export function addMoonbeamShapeShiftSuppression(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "moonbeam" }>,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  /* v8 ignore start -- Defensive internal guard: Moonbeam shape-shift suppression is applied from an active effect owned by the still-present concentration caster. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Defensive internal guard: Moonbeam shape-shift restoration is applied from an active effect owned by the still-present concentration caster. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Defensive internal guard: Web save tracking receives the active hazard from its still-present concentration owner. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
  if (alreadySaved) {
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

function markSingleSaveAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: SingleSaveAreaHazardActiveEffect,
): BattleState {
  const caster = state.combatants.get(effect.sourceCombatantId);
  /* v8 ignore start -- Defensive internal guard: single-save area tracking receives the active hazard from its still-present concentration owner. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
  if (effect.savedThisTurn.includes(targetId)) {
    return state;
  }
  const activeEffects = caster.activeEffects.map((current) =>
    current === effect
      ? {
          ...effect,
          savedThisTurn: [...effect.savedThisTurn, targetId],
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

export function markSleetStormAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "sleetStormAreaHazard" }
  >,
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(state, targetId, effect);
}

export function markInsectPlagueAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "insectPlagueAreaHazard" }
  >,
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(state, targetId, effect);
}

export function markCloudkillAreaHazardSavedThisTurn(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "cloudkillAreaHazard" }>,
): BattleState {
  return markSingleSaveAreaHazardSavedThisTurn(state, targetId, effect);
}

export function applyWebRestrainedCondition(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "webRestraintHazard" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- Defensive internal guard: Web failed-save outcomes are validated against the current combatant map before restraint is applied. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop */
  const replacing = target.activeEffects.filter(
    (candidate) =>
      candidate.kind === "spellCondition" &&
      activeEffectSourceMatches(candidate, effect) &&
      candidate.condition === "restrained",
  );
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: target,
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter(
      (candidate) => !replacing.includes(candidate),
    ),
    {
      kind: "spellCondition" as const,
      effectRef: allocation.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
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
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    ),
  };
}

export function removeWebRestrainedCondition(input: {
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

export function applyGreaseProneToTarget(
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

export function applySleetStormAreaHazardFailedSaveEffect(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  return breakBattleConcentration(
    applyProneToTarget(state, targetId),
    targetId,
  );
}

export function applyCommandPendingEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "command" }
  >,
  option: BattleCommandOption,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  let nextState = state;
  for (const targetId of targetIds) {
    const target = nextState.combatants.get(targetId);
    /* v8 ignore start -- Defensive internal guard: Command failed-save target ids are validated against the current combatant map before pending effects are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
    const allocation = allocateBattleActiveEffectRefForCreature({
      owner: target,
    });
    nextState = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...allocation.owner,
        activeEffects: [
          ...allocation.owner.activeEffects.filter(
            (effect) =>
              !(
                effect.kind === "commandPending" &&
                sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId)
              ),
          ),
          {
            kind: "commandPending",
            effectRef: allocation.effectRef,
            option,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
            expiresAt: endOfNextTurnExpiration(
              state,
              targetId,
              END_OF_NEXT_TURN_DURING_TURN,
            ),
          },
        ],
      }),
    };
  }
  return nextState;
}

export function applyCommandGrovelProneToTarget(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "commandPending" }>,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- Defensive internal guard: Grovel resolution receives the current target and its pending Command effect from the admitted turn-start command. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- Defensive internal guard: prone target ids come from validated spell or feature saving-throw outcomes over the current combatant map. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
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
    /* v8 ignore start -- Defensive internal guard: Faerie Fire failed-save target ids are validated against the current combatant map before outlines are applied. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
    const nextEffect = {
      ...invocation.effect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "faerieFireOutline" &&
            activeEffectSourceMatches(effect, nextEffect)
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
            outline.sourceProcedureRef === invocation.sourceProcedureRef &&
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >,
): BattleState {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    /* v8 ignore start -- Defensive internal guard: protection-spell failed-save target ids are validated against the current combatant map before immunities are applied. */
    if (target === undefined) {
      return nextState;
    }
    /* v8 ignore stop */
    const nextEffects = invocation.activeEffects.map((effect) => ({
      ...effect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        target,
        effect.condition,
      ),
    }));
    const activeEffects = [
      ...target.activeEffects.filter((effect) => {
        const sameSourceReplay =
          effect.kind === "conditionImmunity" &&
          sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId) &&
          invocation.activeEffects.some(
            (candidate) => candidate.condition === effect.condition,
          );
        if (sameSourceReplay) {
          /* v8 ignore next -- Pure replay/idempotency guard: save-gated spell resolution spends the slot and breaks prior Concentration before this application, so a legal Calm Emotions subject cannot retain a matching source immunity. */
          return false;
        }
        return true;
      }),
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
  invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageInvocation>,
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
  return Match.value(input.rider).pipe(
    Match.when({ kind: "speedDelta" }, (rider) => ({
      state: input.state,
      target: input.target,
      effect: {
        kind: "speedDelta" as const,
        sourceProcedureRef: input.sourceProcedureRef,
        sourceCombatantId: input.actorId,
        deltaFeet: rider.deltaFeet,
        expiresAt,
      },
    })),
    Match.when({ kind: "condition" }, (rider) => {
      const allocation = allocateBattleActiveEffectRefForCreature({
        owner: input.target,
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
        effect: {
          kind: "spellCondition" as const,
          effectRef: allocation.effectRef,
          sourceProcedureRef: input.sourceProcedureRef,
          sourceCombatantId: input.actorId,
          condition: rider.condition,
          conditionHadNonSpellSource:
            conditionHadNonSpellSourceBeforeSpellEffect(
              input.target,
              rider.condition,
            ),
          escape: null,
          turnStartDamage: null,
          expiresAt,
        },
      };
    }),
    Match.when({ kind: "opportunityAttackDenied" }, () => ({
      state: input.state,
      target: input.target,
      effect: {
        kind: "opportunityAttackDenied" as const,
        sourceProcedureRef: input.sourceProcedureRef,
        sourceCombatantId: input.actorId,
        expiresAt,
      },
    })),
    Match.when({ kind: "nextAttackRollAgainstTarget" }, (rider) => ({
      state: input.state,
      target: input.target,
      effect: {
        kind: "nextAttackRollAgainstSelf" as const,
        sourceProcedureRef: input.sourceProcedureRef,
        sourceCombatantId: input.actorId,
        mode: rider.mode,
        expiresAt,
      },
    })),
    Match.when({ kind: "hitPointRegainPrevented" }, () => ({
      state: input.state,
      target: input.target,
      effect: {
        kind: "hitPointRegainPrevented" as const,
        sourceProcedureRef: input.sourceProcedureRef,
        sourceCombatantId: input.actorId,
        expiresAt,
      },
    })),
    Match.when({ kind: "invisibleBenefitDenied" }, () => ({
      state: input.state,
      target: input.target,
      effect: {
        kind: "invisibleBenefitDenied" as const,
        sourceProcedureRef: input.sourceProcedureRef,
        sourceCombatantId: input.actorId,
        expiresAt,
      },
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
    return endOfNextTurnExpiration(
      state,
      casterId,
      END_OF_NEXT_TURN_DURING_TURN,
    );
  }
  if (expiresAt === "concentration") {
    return { kind: "concentration", combatantId: casterId };
  }
  return endOfNextTurnExpiration(state, targetId, END_OF_NEXT_TURN_DURING_TURN);
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
  /* v8 ignore start -- Defensive internal guard: the admitted held-light hurl subject retains its caster through effect teardown. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop */
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

export function applyDragonsBreathInitialSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  spellSaveDc: DifficultyClass,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "dragonsBreathInitial" }
  >,
  procedureRef: BattleProcedureExecutionRef,
): BattleState {
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- Defensive internal guard: Dragon's Breath initial targeting is validated against the current combatant map before its granted effect is applied. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop */
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: target,
  });
  const allocatedTarget = allocation.owner;
  const sourceProcedureRef = invocation.sourceProcedureRef;
  const sourceCombatantId = actorId;
  const nextEffect: BattleActiveEffect = {
    ...invocation.activeEffect,
    sourceProcedureRef: procedureRef,
    sourceCombatantId: actorId,
    damageType,
    spellSaveDc,
    effectRef: allocation.effectRef,
  };
  const activeEffects = [
    ...allocatedTarget.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "dragonsBreath" &&
          sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId)
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...allocatedTarget,
      activeEffects,
    }),
  };
}

export function applyShieldReactionSpellActiveEffect(
  state: BattleState,
  reactorId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "shieldReaction" }
  >,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  /* v8 ignore start -- Defensive internal guard: the admitted Shield interrupt retains its reactor through active-effect application. */
  if (reactor === undefined) {
    return state;
  }
  /* v8 ignore stop */

  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      activeEffects: [
        ...reactor.activeEffects.filter((effect) => {
          const sameSourceReplay =
            effect.kind === "spellArmorClassBonus" &&
            activeEffectProcedureMatches(effect, invocation.sourceProcedureRef);
          if (sameSourceReplay) {
            /* v8 ignore next -- Pure replay/idempotency guard: the interrupt lifecycle spends the Reaction before `resolveShieldReaction`, and Shield's start-of-turn expiry runs before the next reaction window, so a legal Shield cast cannot retain this matching bonus. */
            return false;
          }
          return true;
        }),
        {
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
      ],
    }),
  };
}
