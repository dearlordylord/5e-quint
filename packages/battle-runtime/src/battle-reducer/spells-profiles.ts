// Spell profile predicates and projections (Cluster O). Mechanical extraction
// from battle-reducer.ts. Aggregates: per-procedure `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// equality helpers, and resource-availability helpers.
//
// O is a leaf cluster within the spells subsystem: it depends on Q
// (spell-effects), domain constants/types from `../battle-reducer.ts`, and
// surface types only. Consumers are K (discovery), P (holes/fills), L
// (resolve), and F (turn).

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  AbilityModifier,
  attackBonus,
  movementFeet,
  spellSlotLevel,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import {
  type BattleCreatureState,
  type BattleState,
  type BattleTurnResources,
  type BattleTurnSpellSlotUse,
  type PersistentArmorSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  CharacterBattleInvocationSpellAccessState,
  CharacterBattleSpellcastingState,
} from "../character-battle-resources.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
  resourceHasUsesRemaining,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { SHIELD_MAGIC_MISSILE_SPELL_ID } from "./domain-constants.ts";

import {
  hasSaveGateRepeatSaves,
  supportedCantripSaveGateDamageProfile,
  supportedDamageAmountExpr,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedCommandProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedPreparedGreaseGroundHazardProfile,
  supportedPreparedHideousLaughterProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./spells-profiles-save-gates.ts";
import { sameStringSet } from "./spells-profile-shared.ts";
import {
  supportedCantripSpellAttackProfile,
  supportedCantripSpellHostedWeaponAttackProfile,
  supportedCantripWeaponAttackOverrideProfile,
  supportedPreparedAttackBurstSaveDamageProfile,
  supportedPreparedChainedSpellAttackDamageProfile,
  supportedPreparedSpellAttackSequenceProfile,
  supportedPreparedSpellAttackProfile,
} from "./spells-profiles-attack-damage.ts";
export * from "./spells-profiles-attack-damage.ts";
import {
  supportedCantripDamageReductionSpellProfile,
  supportedCantripRollModifierSpellProfile,
  supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile,
  supportedPreparedAfterHitDamageSpellProfile,
  supportedPreparedAfterHitDamageAndIlluminationSpellProfile,
  supportedPreparedAfterHitSaveGatedConditionSpellProfile,
  supportedPreparedAfterHitTimedDamageAndSaveSpellProfile,
  supportedPreparedBlurAttackRollDefenseSpellProfile,
  supportedPreparedCreatureTypeProtectionSpellProfile,
  supportedPreparedExpeditiousRetreatDashSpellProfile,
  supportedPreparedFeatherFallMitigationSpellProfile,
  supportedPreparedJumpMovementReplacementSpellProfile,
  supportedPreparedHealingSpellProfile,
  supportedPreparedMarkedDamageRiderSpellProfile,
  supportedPreparedRollModifierSpellProfile,
  supportedPreparedScalarBuffSpellProfile,
  supportedPreparedSelfTeleportSpellProfile,
  supportedPreparedSlotSpellProfile,
  supportedPreparedWeaponDamageRiderSpellProfile,
  supportedCantripThaumaturgyBoomingVoiceSpellProfile,
} from "./spells-profiles-support.ts";
export * from "./spells-profiles-support.ts";
import { supportedPreparedSanctuaryTargetingInterdictionSpellProfile } from "./sanctuary-targeting-interdiction.ts";
export {
  animalFriendshipSaveGateConditionSpell,
  areaSaveGateSpellRangeFeet,
  charmPersonSaveGateConditionSpell,
  colorSpraySaveGateConditionSpell,
  diceExprWithDelta,
  entangleSaveGateConditionSpell,
  faerieFireSaveGateAttackRollAdvantageSpell,
  hasSaveGateRepeatSaves,
  isGuidingBoltNextAttackRiderShape,
  isRayOfSicknessPoisonedRiderShape,
  isShockingGraspOpportunityAttackRiderShape,
  isViciousMockeryNextAttackRiderShape,
  saveGateTargeting,
  singleTargetSpellRangeFeet,
  spellAttackKindForRedirect,
  supportedCantripSaveGateDamageProfile,
  supportedDamageAmountExpr,
  supportedFailedSavePostDamageRiders,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedCommandProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedPreparedGreaseGroundHazardProfile,
  supportedPreparedHideousLaughterProfile,
  supportedPreparedSleepTargetAdmissionProfile,
  supportedRepeatedEffectCount,
  supportedSaveGateConditionSpell,
  supportedSaveGateDamageProfile,
  supportedSaveGateFailedSaveEffects,
  supportedSpellAttackKind,
  supportedSpellPostDamageRiders,
} from "./spells-profiles-save-gates.ts";

const LIGHT_OBJECT_MAX_SIZE = "large" as const;

type ActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
type ObjectLightDirectPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
> & {
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "object";
      readonly count: 1;
      readonly filter: {
        readonly heldOrWorn: "forbidden";
        readonly maxSize: typeof LIGHT_OBJECT_MAX_SIZE;
      };
    };
  };
};

export function supportedSpellActs(
  actor: BattleCreatureState,
  state?: BattleState,
): readonly SupportedSpellInvocation[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const spellcasting = actor.origin.spellcasting;
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }
  const characterLevel = actor.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  const preparedSpells = effectiveCharacterBattlePreparedSpells(spellcasting);
  const cantrips = effectiveCharacterBattleCantrips(spellcasting);

  return [
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSlotSpellProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSpellAttackSequenceProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSpellAttackProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedChainedSpellAttackDamageProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAttackBurstSaveDamageProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateDamageProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateConditionProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateAttackRollAdvantageProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSleepTargetAdmissionProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHideousLaughterProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedGreaseGroundHazardProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedFogCloudObscurementProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedCommandProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedScalarBuffSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedRollModifierSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedCreatureTypeProtectionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedBlurAttackRollDefenseSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedWeaponDamageRiderSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitDamageSpellProfile(
        actor,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitSaveGatedConditionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitTimedDamageAndSaveSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAfterHitDamageAndIlluminationSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedMarkedDamageRiderSpellProfile(
        actor,
        state,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedExpeditiousRetreatDashSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedJumpMovementReplacementSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSelfTeleportSpellProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSanctuaryTargetingInterdictionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedFeatherFallMitigationSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedPersistentSpellProfile(actor.combatantId, spell),
    ),
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      supportedInvocationPersistentSpellProfile(actor.combatantId, access),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHealingSpellProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedShieldReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedCounterspellReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHellishRebukeReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripHeldLightSpellProfile(spell),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripDancingLightsSpellProfile(actor.combatantId, spell),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripObjectLightSpellProfile(spell),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripHeldLightHurlSpellProfile(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripSpellHostedWeaponAttackProfile(
        actor,
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripWeaponAttackOverrideProfile(
        actor,
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripSpellAttackProfile(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
        characterLevel,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripSaveGateDamageProfile(spell, characterLevel),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripRollModifierSpellProfile(actor.combatantId, spell),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripThaumaturgyBoomingVoiceSpellProfile(
        actor.combatantId,
        spell,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripDamageReductionSpellProfile(actor.combatantId, spell),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripMakeStableSpellProfile(spell, characterLevel),
    ),
  ];
}

export function supportedCantripHeldLightSpellProfile(
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );
  if (
    lightOperation === undefined ||
    lightOperation.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 20 ||
    lightOperation.effect.dimAdditionalFeet !== 20
  ) {
    return [];
  }
  const duration = spell.mechanics.duration;
  if (duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  return Either.isLeft(durationTicks)
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "heldLight",
          spell,
          actionCost: "bonusAction",
          light: {
            brightRadiusFeet: movementFeet(
              lightOperation.effect.brightRadiusFeet,
            ),
            dimAdditionalFeet: movementFeet(
              lightOperation.effect.dimAdditionalFeet,
            ),
          },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

export function supportedCantripDancingLightsSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Dancing Lights" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-A-D#Dancing Lights" ||
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1
  ) {
    return [];
  }
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );
  if (
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 0 ||
    lightOperation.effect.dimAdditionalFeet !== 10 ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !== 60
  ) {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return [];
  }
  const base = {
    access: { tag: "classCantrip" as const },
    resource: { tag: "none" as const },
    spell,
    dimRadiusFeet: movementFeet(lightOperation.effect.dimAdditionalFeet),
    rangeFeet: movementFeet(spell.mechanics.range.feet),
    maxMoveFeet: movementFeet(repositionOperation.effect.maxMoveFeet),
    spacingFeet: movementFeet(20),
  };
  return [
    {
      ...base,
      procedure: "dancingLightsSeparateCast",
      actionCost: "magicAction",
      form: "separateLights",
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.right,
      },
    },
    {
      ...base,
      procedure: "dancingLightsCombinedCast",
      actionCost: "magicAction",
      form: "combinedMediumForm",
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.right,
      },
    },
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "dancingLightsReposition",
      spell,
      actionCost: "bonusAction",
      maxMoveFeet: movementFeet(repositionOperation.effect.maxMoveFeet),
      rangeFeet: movementFeet(spell.mechanics.range.feet),
      spacingFeet: movementFeet(20),
    },
  ];
}

export function supportedCantripObjectLightSpellProfile(
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (!isLightObjectSpell(spell)) {
    return [];
  }
  const lightPhase = spell.mechanics.phases.find(isObjectLightDirectPhase);
  const maxObjectSize = lightPhase?.attachment.value.filter?.maxSize;
  const lightEffects =
    lightPhase === undefined || !("effects" in lightPhase)
      ? undefined
      : lightPhase.effects;
  const lightEffect = lightEffects?.find(
    (effect) => effect.kind === "emit_light",
  );
  if (
    lightEffect === undefined ||
    lightEffect.kind !== "emit_light" ||
    maxObjectSize === undefined ||
    lightEffect.brightRadiusFeet !== 20 ||
    lightEffect.dimAdditionalFeet !== 20
  ) {
    return [];
  }
  const duration = spell.mechanics.duration;
  if (duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  return Either.isLeft(durationTicks)
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "objectLight",
          spell,
          actionCost: "magicAction",
          targeting: { kind: "singleObject", maxSize: maxObjectSize },
          light: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(lightEffect.brightRadiusFeet),
            dimAdditionalFeet: movementFeet(lightEffect.dimAdditionalFeet),
          },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

function isObjectLightDirectPhase(
  phase: ActivationPhase,
): phase is ObjectLightDirectPhase {
  return (
    phase.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "object" &&
    phase.attachment.value.count === 1 &&
    phase.attachment.value.filter?.heldOrWorn === "forbidden" &&
    phase.attachment.value.filter?.maxSize === LIGHT_OBJECT_MAX_SIZE &&
    phase.effects?.some((effect) => effect.kind === "emit_light") === true
  );
}

export function supportedCantripMakeStableSpellProfile(
  spell: SpellRecord,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Spare the Dying" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-S-Z#Spare the Dying" ||
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targetSelection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const rangeFeet = spareTheDyingRangeFeet(
    spell.mechanics.range,
    characterLevel,
  );
  const stateFilter =
    targetSelection !== null &&
    "stateFilter" in targetSelection &&
    Array.isArray(targetSelection.stateFilter)
      ? targetSelection.stateFilter
      : [];
  if (
    targetSelection === null ||
    targetSelection.mode !== "one" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    !sameStringSet(stateFilter, ["zero_hp_not_dead"]) ||
    phase?.kind !== "direct" ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "make_stable" ||
    rangeFeet === null
  ) {
    return [];
  }
  return [
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "makeStable",
      spell,
      actionCost: "magicAction",
      rangeFeet,
    },
  ];
}

export function supportedPreparedFogCloudObscurementProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  const attachment = spell.mechanics.attachment;
  const operation = spell.mechanics.operations[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const rangeFeet =
    spell.mechanics.range.kind === "point" ? spell.mechanics.range.feet : null;
  const area =
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    "shape" in attachment.value
      ? attachment.value
      : null;
  const radius = area?.shape.kind === "sphere" ? area.shape.radiusFeet : null;
  if (
    spell.name !== "Fog Cloud" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Fog Cloud" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 120 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "area_dispersed_by_strong_wind" ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "area_is_heavily_obscured" ||
    area?.origin.kind !== "point_within_range" ||
    radius === null ||
    typeof radius !== "object" ||
    radius.kind !== "linear_per_level" ||
    radius.axis !== "slot" ||
    radius.startingAtLevel !== 1 ||
    radius.base !== 20 ||
    radius.perLevel !== 20 ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return [];
  }
  const slotRadius = radius;

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const radiusFeet =
      slotRadius.base +
      Math.max(0, Number(slot.spellLevel) - slotRadius.startingAtLevel) *
        slotRadius.perLevel;
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "fogCloudObscurement",
        spell,
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(radiusFeet),
        },
        durationTicks: durationTicks.right,
        rangeFeet: movementFeet(rangeFeet),
      },
    ];
  });
}

function spareTheDyingRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  characterLevel: number,
): MovementFeet | null {
  if (
    range.kind !== "point" ||
    typeof range.feet !== "object" ||
    range.feet.kind !== "threshold_tiers" ||
    range.feet.axis !== "character"
  ) {
    return null;
  }
  return movementFeet(
    range.feet.tiers.reduce(
      (current, tier) =>
        characterLevel >= tier.atLevel ? tier.value : current,
      range.feet.base,
    ),
  );
}

export function supportedCantripHeldLightHurlSpellProfile(
  spell: SpellRecord,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  if (!isProduceFlameOngoingEffectSpell(spell)) {
    return [];
  }
  const hurlOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.effect.kind === "attack_roll",
  );
  if (
    hurlOperation === undefined ||
    hurlOperation.effect.kind !== "attack_roll" ||
    hurlOperation.effect.attackKind !== "ranged_spell_attack" ||
    hurlOperation.effect.onHit.length !== 1 ||
    hurlOperation.effect.onMiss.length !== 1 ||
    hurlOperation.effect.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageEffect = hurlOperation.effect.onHit[0];
  if (
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "fire" ||
    damageEffect.amount === undefined
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  if (damageExpr === null) {
    return [];
  }
  return [
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "heldLightHurl",
      spell,
      targeting: { kind: "singleCreatureOrObject" },
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(60),
      attackKind: hurlOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
    },
  ];
}

export function isLightObjectSpell(spell: SpellRecord): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "activation" }
  >;
} {
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  return (
    spell.name === "Light" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-E-L#Light" &&
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "hour" &&
    spell.mechanics.duration.value.amount === 1 &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell"
  );
}

export function isProduceFlameOngoingEffectSpell(
  spell: SpellRecord,
): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "ongoing_effect" }
  >;
} {
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  return (
    spell.name === "Produce Flame" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-M-P#Produce Flame" &&
    spell.mechanics.family === "ongoing_effect" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "bonus_action" &&
    spell.mechanics.range.kind === "self" &&
    spell.mechanics.attachment.kind === "self" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "minute" &&
    spell.mechanics.duration.value.amount === 10 &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell"
  );
}

export function supportedPreparedShieldReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "triggered_reaction") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const acDeltas = effects.flatMap((effect) =>
    effect.kind === "modify_ac" ? [effect.delta] : [],
  );
  const acDelta = acDeltas[0];
  const negatedSpellIds = effects.flatMap((effect) =>
    effect.kind === "negate_named_effect" &&
    effect.scope === "damage_only" &&
    typeof effect.spellId === "string"
      ? [effect.spellId]
      : [],
  );
  const namedSpellTriggerIds =
    spell.mechanics.castingTime.kind === "reaction"
      ? reactionTriggerNamedSpellIds(spell.mechanics.castingTime)
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    !reactionTriggerIncludesHitByAttackRoll(spell.mechanics.castingTime) ||
    !sameStringSet(namedSpellTriggerIds, [SHIELD_MAGIC_MISSILE_SPELL_ID]) ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "round" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 2 ||
    acDeltas.length !== 1 ||
    acDelta?.kind !== "fixed_dice" ||
    acDelta.sign !== "+" ||
    acDelta.dice !== 5 ||
    acDelta.dieSize !== 1 ||
    !sameStringSet(negatedSpellIds, namedSpellTriggerIds)
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "shieldReaction",
            spell,
            armorClassBonus: acDelta.dice,
            negatedSpellIds,
          },
        ],
  );
}

export function supportedPreparedHellishRebukeReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Hellish Rebuke" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Hellish Rebuke" ||
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "takes_damage_from_creature" ||
    !spell.mechanics.castingTime.trigger.requiresVisibleCreature ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "damage" ||
    phase.onFail.damageType !== "fire"
  ) {
    return [];
  }
  const failedDamage = phase.onFail;
  const rangeFeet = spell.mechanics.range.feet;

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: failedDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    return damageExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "saveGatedDamage" as const,
            spell,
            ability: phase.ability,
            dc: phase.dc,
            targeting: { kind: "singleCombatant" as const },
            damage: {
              expr: damageExpr,
              damageType: "fire",
            },
            successDamage: "half" as const,
            rangeFeet: movementFeet(rangeFeet),
            failedSavePostDamageRiders: [],
            saveRollModeRule: null,
          },
        ];
  });
}

export function supportedPreparedCounterspellReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.name !== "Counterspell" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-A-D#Counterspell" ||
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "creature_casts_spell" ||
    !sameStringSet(spell.mechanics.castingTime.trigger.components ?? [], [
      "V",
      "S",
      "M",
    ]) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    !spell.mechanics.components.s ||
    spell.mechanics.components.v ||
    spell.mechanics.components.m ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    !spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "negate_triggering_spell" ||
    phase.onSuccess.kind !== "none" ||
    phase.autoSuccessIfCasterSlotGte !== "triggering_spell_level"
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "counterspell",
            spell,
            ability: "con" as const,
            dc: phase.dc,
            targeting: { kind: "singleCombatant" as const },
            rangeFeet: movementFeet(60),
          },
        ],
  );
}

export function reactionTriggerIncludesHitByAttackRoll(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): boolean {
  const trigger = castingTime.trigger;
  return trigger.kind === "hit_by_attack_roll"
    ? true
    : trigger.kind === "any_of" &&
        trigger.triggers.some(
          (candidate) => candidate.kind === "hit_by_attack_roll",
        );
}

export function reactionTriggerNamedSpellIds(
  castingTime: Extract<
    SpellRecord["mechanics"]["castingTime"],
    { kind: "reaction" }
  >,
): readonly string[] {
  return reactionTriggerNamedSpellIdsFromTrigger(castingTime.trigger);
}

export type ReactionTrigger = Extract<
  SpellRecord["mechanics"]["castingTime"],
  { kind: "reaction" }
>["trigger"];

export function reactionTriggerNamedSpellIdsFromTrigger(
  trigger: ReactionTrigger,
): readonly string[] {
  return Match.value(trigger).pipe(
    Match.when({ kind: "hit_by_attack_roll" }, () => []),
    Match.when({ kind: "takes_damage_from_creature" }, () => []),
    Match.when({ kind: "self_or_visible_creature_falls" }, () => []),
    Match.when({ kind: "targeted_by_named_spell" }, (namedSpell) => [
      namedSpell.spellId,
    ]),
    Match.when({ kind: "creature_casts_spell" }, () => []),
    Match.when({ kind: "spell_save_outcome" }, () => []),
    Match.when({ kind: "any_of" }, (anyOf) =>
      anyOf.triggers.flatMap(reactionTriggerNamedSpellIdsFromTrigger),
    ),
    Match.exhaustive,
  );
}

export function supportedPreparedPersistentSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  return supportedPersistentArmorSpellProfile(actorId, spell, {
    access: { tag: "prepared" },
    resource: { tag: "spellSlot", slotLevel: spellSlotLevel(1) },
  });
}

export function supportedInvocationPersistentSpellProfile(
  actorId: CombatantId,
  access: CharacterBattleInvocationSpellAccessState,
): readonly SupportedSpellInvocation[] {
  return Match.value(access).pipe(
    Match.when({ tag: "armorOfShadowsMageArmor" }, (armorOfShadows) =>
      supportedPersistentArmorSpellProfile(actorId, armorOfShadows.spell, {
        access: { tag: "armorOfShadows" },
        resource: { tag: "none" },
      }),
    ),
    Match.when({ tag: "pactOfTheChainFindFamiliar" }, () => []),
    Match.exhaustive,
  );
}

type PersistentArmorSpellSource =
  | Pick<
      Extract<
        PersistentArmorSpellInvocation,
        { readonly access: { tag: "prepared" } }
      >,
      "access" | "resource"
    >
  | Pick<
      Extract<
        PersistentArmorSpellInvocation,
        { readonly access: { tag: "armorOfShadows" } }
      >,
      "access" | "resource"
    >;

function supportedPersistentArmorSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  source: PersistentArmorSpellSource,
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  if (spell.mechanics.duration.kind !== "timed") {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const requiredDurationTicks = elapsedTimeTicksFromHours(8);
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right) ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return [];
  }

  return [
    {
      ...source,
      procedure: "persistentArmorEffect",
      spell,
      rangeFeet: movementFeet(5),
      activeEffect: {
        kind: "spellBaseArmorClass",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        base: operation.effect.formula.base,
        ability: "dex",
        expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        earlyEnds: [{ kind: "targetDonsArmor" }],
      },
    },
  ];
}

export function spellHasAvailableSpend(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  const resource = invocation.resource;
  if (resource.tag === "none") {
    return true;
  }
  if (resource.tag === "classFeatureFreeCast") {
    return actor.origin.resources.some(
      (candidate) =>
        candidate.unit.id === resource.resourceUnitId &&
        resourceHasUsesRemaining(candidate),
    );
  }
  return (
    actor.origin.spellcasting?.spellSlots.some(
      (slot) =>
        slot.spellLevel === resource.slotLevel && slot.expended < slot.count,
    ) === true
  );
}

export function spellActTurnResourceAvailable(
  resources: BattleTurnResources,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): boolean {
  if (
    invocation.resource.tag === "spellSlot" &&
    combatantHasSpellSlotUseThisTurn(resources, actorId)
  ) {
    return false;
  }
  if ("actionCost" in invocation && invocation.actionCost === "bonusAction") {
    return resources.currentHasBonusAction;
  }
  if (invocation.resource.tag === "none") {
    return canSpendAction(resources, "magic");
  }
  return canSpendAction(resources, "magic");
}

export function markSpellSlotExpendedThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  if (combatantHasCommittedSpellSlotUseThisTurn(resources, combatantId)) {
    return Either.left("spell slot already expended this turn" as const);
  }
  const pending = resources.spellSlotUsesThisTurn.some(
    (use) => use.kind === "pending" && use.combatantId === combatantId,
  );
  const nextUse: BattleTurnSpellSlotUse = {
    kind: "committed",
    combatantId,
  };
  return Either.right({
    ...resources,
    spellSlotUsesThisTurn: pending
      ? resources.spellSlotUsesThisTurn.map((use) =>
          use.kind === "pending" && use.combatantId === combatantId
            ? nextUse
            : use,
        )
      : [...resources.spellSlotUsesThisTurn, nextUse],
  });
}

export function claimPendingSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): Either.Either<BattleTurnResources, "spell slot already expended this turn"> {
  return combatantHasSpellSlotUseThisTurn(resources, combatantId)
    ? Either.left("spell slot already expended this turn" as const)
    : Either.right({
        ...resources,
        spellSlotUsesThisTurn: [
          ...resources.spellSlotUsesThisTurn,
          { kind: "pending", combatantId },
        ],
      });
}

export function releasePendingSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return {
    ...resources,
    spellSlotUsesThisTurn: resources.spellSlotUsesThisTurn.filter(
      (use) => !(use.kind === "pending" && use.combatantId === combatantId),
    ),
  };
}

export function combatantHasSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.spellSlotUsesThisTurn.some(
    (use) => use.combatantId === combatantId,
  );
}

export function combatantHasCommittedSpellSlotUseThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.spellSlotUsesThisTurn.some(
    (use) => use.kind === "committed" && use.combatantId === combatantId,
  );
}
