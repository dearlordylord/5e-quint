// Spell active-effect application extracted from spells-holes-fills.ts.

import { Match } from "effect";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type Round as RoundType } from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { battleDancingLightId } from "../identity.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import {
  applyHitPointMaximumIncrease,
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "./damage-apply.ts";
import { scalarBuffTemporaryHitPointsAmount } from "./spell-effects.ts";
import {
  battleCreatureAfterConditionRemoval,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionsAfterApplyingSpellConditionEffects,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
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
  type BattleIllumination,
  type BattleLightEmitter,
  type BattleLightEmitterAttachment,
  type BattleLightEmitterProjection,
  type BattleLightEmitterProjectionFact,
  type BattleLightlyObscuredPerceptionRollMode,
  type BattleObscurementZone,
  type BattleObjectOutline,
  type BattleSightObserver,
  type BattleSightObscurement,
  type BattleSpellAreaChoice,
  type BattleState,
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
} from "../battle-reducer.ts";
import type { BattleObjectId } from "../identity.ts";
import { HIDEOUS_LAUGHTER_DURATION_TICKS } from "./domain-constants.ts";

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
    invocation.spell.name === "Faerie Fire" &&
    invocation.spell.provenance.kind === "srd-5.2.1" &&
    invocation.spell.provenance.section ===
      "Spells/Descriptions-E-L#Faerie Fire" &&
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
  return [
    ...state.lightEmitters,
    ...outlineLightEmitters,
    ...state.objectOutlines.map(faerieFireObjectDimLightEmitter),
  ];
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

export function battlePerceptionRollModeForSight(
  illumination: BattleIllumination,
  observer: BattleSightObserver = { kind: "ordinarySight" },
): BattleLightlyObscuredPerceptionRollMode | undefined {
  return battleSightObscurement(illumination, observer) === "lightlyObscured"
    ? PERCEPTION_LIGHTLY_OBSCURED_ROLL_MODE
    : undefined;
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

export function battleCreatureWithSpellActiveEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterApplyingSpellConditionEffects(
          combatant.conditions,
          activeEffects,
        ),
      }
    : { ...combatant, activeEffects };
}

export function applyDirectConditionSpellEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directCondition" }
  >,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "targetActionEndedSpellCondition" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId &&
        effect.condition === invocation.activeEffect.condition,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        ...invocation.activeEffect,
        conditionHadNonSpellSource:
          conditionHadNonSpellSourceBeforeSpellEffect(
            target,
            invocation.activeEffect.condition,
          ),
      },
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
  readonly areaId: string;
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

export function applyFlamingSphereCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: string;
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
  if (target == null || target.armorClass.base.kind === "armor") {
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
        attachment: { kind: "object", objectId },
        emission: invocation.light,
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: invocation.expiresAt,
      },
    ],
  };
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
    const nextTarget =
      scalarEffect.kind === "temporaryHitPoints"
        ? temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            )
        : scalarEffect.kind === "hitPointMaximumIncrease"
          ? applyHitPointMaximumIncrease(target, {
              ...scalarEffect.activeEffect,
              sourceCombatantId: actorId,
            })
          : battleCreatureWithSpellActiveEffects(target, [
              ...target.activeEffects.filter(
                (effect) =>
                  !(
                    effect.kind === scalarEffect.activeEffect.kind &&
                    effect.sourceSpellId === invocation.spell.id
                  ),
              ),
              {
                ...scalarEffect.activeEffect,
                sourceCombatantId: actorId,
              },
            ]);
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
  }, state);
}

export function applyRollModifierSpellEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
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
    const nextEffects = invocation.activeEffects.map((effect) => ({
      ...effect,
      sourceCombatantId: actorId,
    }));
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
