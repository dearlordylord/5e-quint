// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
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

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  AbilityModifier,
  attackBonus,
  movementFeet,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type {
  Attachment,
  DamageType,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import {
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleState,
  type BattleTurnResources,
  type BattleTurnSpellSlotUse,
  type SpellObjectContactDamageActiveEffect,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
  resourceHasUsesRemaining,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { SHIELD_MAGIC_MISSILE_SPELL_ID } from "./domain-constants.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByAntimagicField,
} from "./antimagic-field-suppression.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { parseBattleSpellEffectLevel } from "./spells-effective-level.ts";

import {
  hasSaveGateRepeatSaves,
  supportedCantripSaveGateDamageProfile,
  supportedDamageAmountExpr,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedAbilityD20TestRollModeSaveGateProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSaveGateConditionImmunityProfile,
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

const DISPEL_MAGIC_TARGET_KINDS = [
  "creature",
  "object",
  "magical_effect",
] as const;

type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingOperation = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number];
type OngoingInitialEffect = NonNullable<
  Extract<
    NonNullable<
      Extract<
        SpellRecord["mechanics"],
        { readonly family: "ongoing_effect" }
      >["initialPhase"]
    >,
    { readonly kind: "direct" }
  >["effects"]
>[number];
type OngoingInitialPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type FlamingSphereSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "damage" }
  >;
};
type GustOfWindLineSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "force_move" }
  >;
};
type WebRestraintSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "apply_condition_while_in_area_or_until_escape" }
  >;
};
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import {
  heldLightProfile,
  isProduceFlameOngoingEffectSpell,
} from "./spell-procedure-profiles/held-light.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import {
  admitPersistentArmorEffectInvocationSpellAccess,
  persistentArmorEffectProfile,
} from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import {
  supportedPreparedConditionImmunityAndTurnStartTemporaryHitPointsSpellProfile,
  supportedPreparedAfterHitDamageSpellProfile,
  supportedPreparedAfterHitDamageAndIlluminationSpellProfile,
  supportedPreparedAfterHitSaveGatedConditionSpellProfile,
  supportedPreparedAfterHitTimedDamageAndSaveSpellProfile,
  supportedPreparedConditionRemovalProtectionSpellProfile,
  supportedPreparedCreatureSizeChangeSpellProfile,
  supportedPreparedCreatureTypeProtectionSpellProfile,
  supportedPreparedDragonsBreathInitialSpellProfile,
  supportedPreparedExpeditiousRetreatDashSpellProfile,
  supportedPreparedFeatherFallMitigationSpellProfile,
  supportedPreparedJumpMovementReplacementSpellProfile,
  supportedPreparedHealingSpellProfile,
  supportedPreparedLevitatedCreatureSpellProfile,
  supportedPreparedMarkedDamageRiderSpellProfile,
  supportedPreparedMirrorImageHitInterceptionSpellProfile,
  supportedPreparedScalarBuffSpellProfile,
  supportedPreparedSelfTransformationModeSpellProfile,
  supportedPreparedSelfTeleportSpellProfile,
  supportedPreparedSpellCreatedHeldObjectProfile,
  supportedSpellCreatedHeldObjectActiveEffectProfile,
  supportedPreparedSlotSpellProfile,
  supportedPreparedWardingBondSpellProfile,
  supportedPreparedWeaponDamageRiderSpellProfile,
} from "./spells-profiles-support.ts";
export * from "./spells-profiles-support.ts";
import { supportedPreparedSanctuaryTargetingInterdictionSpellProfile } from "./sanctuary-targeting-interdiction.ts";
import {
  supportedPreparedDirectConditionRemovalSpellProfile,
  supportedPreparedDirectConditionSpellProfile,
} from "./spells-profiles-direct-condition.ts";
export * from "./spells-profiles-direct-condition.ts";
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
  supportedPreparedSaveGateConditionImmunityProfile,
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

type ActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];

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
      supportedPreparedAbilityD20TestRollModeSaveGateProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSaveGateConditionImmunityProfile(
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
      supportedPreparedGustOfWindLineProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedFogCloudObscurementProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedMagicalDarknessPointOriginProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAntimagicFieldOngoingSpellSuppressionProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedFlamingSphereProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSpiritualWeaponAttackProxyProfile(
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSpikeGrowthMovementHazardProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedMoonbeamProfile(spell, spellcasting.spellSlots),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedWebRestraintHazardProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedObjectContactDamageProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedObjectContactDamageRepeatProfile(actor, state, spell),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedSpiritualWeaponRepeatAttackProfile(actor, state, spell),
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
      supportedPreparedSelfTransformationModeSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      rollModifierProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedCreatureSizeChangeSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedLevitatedCreatureSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedWardingBondSpellProfile(
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
      blurAttackRollDefenseProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...preparedSpells.flatMap((spell) =>
      seeInvisibleObserverSightProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedMirrorImageHitInterceptionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedConditionRemovalProtectionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectLightProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedOngoingSpellEndSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedSpellCreatedHeldObjectProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedSpellCreatedHeldObjectActiveEffectProfile(actor, spell),
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
      magicWeaponEnhancementProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
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
      supportedPreparedDragonsBreathInitialSpellProfile(
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
      supportedPreparedDirectConditionSpellProfile(
        actor.combatantId,
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedDirectConditionRemovalSpellProfile(
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
      persistentArmorEffectProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      admitPersistentArmorEffectInvocationSpellAccess(
        actor.combatantId,
        access,
      ),
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
      heldLightProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...cantrips.flatMap((spell) =>
      supportedCantripDancingLightsSpellProfile(actor.combatantId, spell),
    ),
    ...cantrips.flatMap((spell) =>
      objectLightProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
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
      rollModifierProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...cantrips.flatMap((spell) =>
      thaumaturgyBoomingVoiceProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...cantrips.flatMap((spell) =>
      damageReductionProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
    ...cantrips.flatMap((spell) =>
      makeStableProfile.admit(spell, {
        actorId: actor.combatantId,
        spellcasting,
        characterLevel,
      }),
    ),
  ];
}

export function supportedCantripDancingLightsSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (
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

export function supportedPreparedOngoingSpellEndSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const range =
    spell.mechanics.family === "activation" ? spell.mechanics.range : null;
  const rangeFeet =
    range?.kind === "point" && typeof range.feet === "number"
      ? range.feet
      : null;
  if (
    spell.mechanics.family !== "activation" ||
    range === null ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 120 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return [];
  }
  const directPhase = spell.mechanics.phases[0];
  const abilityCheckPhase = spell.mechanics.phases[1];
  if (
    spell.mechanics.phases.length !== 2 ||
    directPhase === undefined ||
    abilityCheckPhase === undefined ||
    !isOngoingSpellEndDirectPhase(directPhase) ||
    !isOngoingSpellEndAbilityCheckPhase(abilityCheckPhase) ||
    ongoingSpellEndTargetHoleId(directPhase) !==
      ongoingSpellEndTargetHoleId(abilityCheckPhase)
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
            procedure: "ongoingSpellEnd",
            spell,
            actionCost: "magicAction",
            rangeFeet: movementFeet(rangeFeet),
          },
        ],
  );
}

function isOngoingSpellEndDirectPhase(phase: ActivationPhase): boolean {
  return (
    phase.kind === "direct" &&
    isOngoingSpellEndTargetAttachment(phase.attachment) &&
    phase.effects?.length === 1 &&
    phase.effects[0]?.kind === "end_ongoing_spells" &&
    phase.effects[0]?.maxSpellLevel === "caster_slot_level"
  );
}

function isOngoingSpellEndAbilityCheckPhase(phase: ActivationPhase): boolean {
  return (
    phase.kind === "ability_check_gate" &&
    String(phase.ability) === "caster_spellcasting_ability" &&
    phase.dc === 10 &&
    phase.autoSuccessIfCasterSlotGte === "target_spell_level" &&
    phase.onPass.kind === "end_ongoing_spells" &&
    phase.onPass.maxSpellLevel === "contested_spell_level" &&
    phase.onFail === undefined &&
    isOngoingSpellEndTargetAttachment(phase.attachment)
  );
}

function isOngoingSpellEndTargetAttachment(
  attachment: Extract<
    ActivationPhase,
    { readonly attachment: unknown }
  >["attachment"],
): boolean {
  const targetKinds =
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    "targetKinds" in attachment.value.selection
      ? attachment.value.selection.targetKinds
      : undefined;
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    attachment.value.selection.mode === "one" &&
    targetKinds !== undefined &&
    sameStringSet(targetKinds, DISPEL_MAGIC_TARGET_KINDS)
  );
}

function ongoingSpellEndTargetHoleId(phase: ActivationPhase): string | null {
  if (phase.kind !== "direct" && phase.kind !== "ability_check_gate") {
    return null;
  }
  const attachment = phase.attachment;
  return attachment.kind === "hole" &&
    isOngoingSpellEndTargetAttachment(attachment)
    ? attachment.holeId
    : null;
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

export function supportedPreparedMagicalDarknessPointOriginProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  const attachment = spell.mechanics.attachment;
  const darknessOperation = spell.mechanics.operations[0];
  const overlapOperation = spell.mechanics.operations[1];
  const maxSpellLevel =
    overlapOperation?.effect.kind ===
    "end_overlapping_spell_created_bright_or_dim_light"
      ? parseBattleSpellEffectLevel(overlapOperation.effect.maxSpellLevel)
      : null;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
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
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    earlyEnd.length !== 0 ||
    spell.mechanics.operations.length !== 2 ||
    darknessOperation?.trigger.kind !== "passive" ||
    darknessOperation.effect.kind !== "area_is_magical_darkness" ||
    overlapOperation?.trigger.kind !== "passive" ||
    maxSpellLevel === null ||
    area?.origin.kind !== "point_within_range" ||
    radius !== 15 ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "magicalDarknessPointOrigin",
        spell,
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(radius),
        },
        durationTicks: durationTicks.right,
        rangeFeet: movementFeet(rangeFeet),
        dispelledSpellCreatedLightMaxSpellLevel: maxSpellLevel,
      },
    ];
  });
}

export function supportedPreparedAntimagicFieldOngoingSpellSuppressionProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const profile = antimagicFieldOngoingSpellSuppressionSpell(spell);
  if (profile === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "antimagicFieldOngoingSpellSuppression",
        spell,
        targeting: {
          kind: "selfOriginEmanation",
          radiusFeet: movementFeet(profile.radiusFeet),
        },
        durationTicks: profile.durationTicks,
        rangeFeet: movementFeet(0),
      },
    ];
  });
}

function antimagicFieldOngoingSpellSuppressionSpell(spell: SpellRecord): {
  readonly radiusFeet: number;
  readonly durationTicks: ElapsedTimeTicks;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const suppressOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "suppress_ongoing_magic_effects",
  );
  if (
    spell.mechanics.level !== 8 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    attachment.kind !== "area" ||
    attachment.origin.kind !== "self" ||
    attachment.shape.kind !== "emanation" ||
    attachment.shape.radiusFeet !== 10 ||
    suppressOperation?.effect.kind !== "suppress_ongoing_magic_effects" ||
    suppressOperation.effect.suppressedTimeCountsAgainstDuration !== true ||
    !sameStringSet(suppressOperation.effect.exceptSources ?? [], [
      "artifact",
      "deity",
    ]) ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    radiusFeet: attachment.shape.radiusFeet,
    durationTicks: durationTicks.right,
  };
}

export function supportedPreparedGustOfWindLineProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const line = gustOfWindLineSpell(spell);
  if (line === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "gustOfWindLine",
        spell,
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(line.lengthFeet),
          widthFeet: movementFeet(line.widthFeet),
        },
        durationTicks: line.durationTicks,
        rangeFeet: movementFeet(0),
        pushDistanceFeet: movementFeet(line.pushDistanceFeet),
        movementCost: {
          multiplier: 2,
          appliesTo: "towardSource",
        },
      },
    ];
  });
}

function gustOfWindLineSpell(spell: SpellRecord) {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const lineHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const lineArea = lineHole?.value ?? null;
  const initialPhase = spell.mechanics.initialPhase;
  const initialSave = isGustOfWindLineSaveGate(initialPhase, lineHole?.holeId)
    ? initialPhase
    : null;
  const strongWindOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_has_strong_wind",
  );
  const movementCostOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_movement_cost_multiplier",
  );
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const directionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 4 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    lineArea?.kind !== "area" ||
    lineArea.origin.kind !== "self" ||
    lineArea.shape.kind !== "line" ||
    lineArea.shape.lengthFeet !== 60 ||
    lineArea.shape.widthFeet !== 10 ||
    initialSave === null ||
    !isGustOfWindLineSaveGate(endTurnOperation?.effect, lineHole?.holeId) ||
    strongWindOperation?.effect.kind !== "area_has_strong_wind" ||
    movementCostOperation?.effect.kind !== "area_movement_cost_multiplier" ||
    movementCostOperation.effect.multiplier !== 2 ||
    movementCostOperation.effect.appliesTo !== "toward_source" ||
    directionOperation?.effect.kind !== "reposition_attachment" ||
    directionOperation.effect.maxMoveFeet !== undefined
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    lengthFeet: lineArea.shape.lengthFeet,
    widthFeet: lineArea.shape.widthFeet,
    pushDistanceFeet: initialSave.onFail.distanceFeet,
  };
}

function isGustOfWindLineSaveGate(
  effect: OngoingOperationEffect | OngoingInitialPhase | undefined,
  areaHoleId: string | undefined,
): effect is GustOfWindLineSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    areaHoleId !== undefined &&
    effect.attachment?.kind === "hole" &&
    effect.attachment.holeId === areaHoleId &&
    effect.attachment.value.kind === "area" &&
    effect.attachment.value.origin.kind === "self" &&
    effect.attachment.value.shape.kind === "line" &&
    effect.attachment.value.shape.lengthFeet === 60 &&
    effect.attachment.value.shape.widthFeet === 10 &&
    effect.ability === "str" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "force_move" &&
    effect.onFail.movementKind === "push" &&
    effect.onFail.originDirection === "away_from_caster" &&
    effect.onFail.distanceFeet === 15
  );
}

export function supportedPreparedFlamingSphereProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const sphere = flamingSphereSpell(spell);
  if (sphere === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: sphere.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "flamingSphere",
        spell,
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginSphereDiameter",
          diameterFeet: movementFeet(sphere.diameterFeet),
        },
        durationTicks: sphere.durationTicks,
        rangeFeet: movementFeet(60),
        ramMaxMoveFeet: movementFeet(sphere.ramMaxMoveFeet),
        damage: { expr: damageExpr, damageType: "fire" },
      },
    ];
  });
}

function flamingSphereSpell(spell: SpellRecord) {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const sphereHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const sphereArea = sphereHole?.value ?? null;
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind ===
        "on_creature_ends_turn_within_distance_of_area" &&
      operation.trigger.distanceFeet === 5,
  );
  const ramOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );
  const igniteOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "ignite_objects",
  );
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 5 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    sphereHole?.holeId !== "flaming_sphere_area" ||
    sphereArea?.kind !== "area" ||
    sphereArea?.origin.kind !== "point_within_range" ||
    sphereArea.shape.kind !== "sphere" ||
    sphereArea.shape.radiusFeet !== 2.5 ||
    !isFlamingSphereSaveEffect(endTurnOperation?.effect, sphereHole?.holeId) ||
    !isFlamingSphereSaveEffect(ramOperation?.effect, sphereHole?.holeId) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !== 30 ||
    igniteOperation?.effect.kind !== "ignite_objects" ||
    igniteOperation.effect.filter.material !== "flammable" ||
    igniteOperation.effect.filter.targetRelation !== "not_worn_or_carried" ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 20 ||
    lightOperation.effect.dimAdditionalFeet !== 20
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    diameterFeet: 5,
    ramMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: endTurnOperation.effect.onFail.amount,
  };
}

export function supportedPreparedSpiritualWeaponAttackProxyProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  const proxy = spiritualWeaponSpell(spell);
  if (proxy === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: proxy.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "spiritualWeaponAttackProxy",
        spell,
        actionCost: "bonusAction",
        targeting: { kind: "singleCombatant" },
        durationTicks: proxy.durationTicks,
        rangeFeet: movementFeet(proxy.rangeFeet),
        forceReachFeet: movementFeet(proxy.forceReachFeet),
        repeatMoveMaxFeet: movementFeet(proxy.repeatMoveMaxFeet),
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: {
            ...damageExpr,
            flat: Number(spellcastingAbilityModifier),
          },
          damageType: "force",
        },
        attackKind: "melee_spell_attack",
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function supportedSpiritualWeaponRepeatAttackProfile(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (spiritualWeaponSpell(spell) === null) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly SupportedSpellInvocation[] => {
      if (
        effect.kind !== "spiritualWeapon" ||
        effect.sourceCombatantId !== actor.combatantId ||
        effect.sourceSpellId !== spell.id ||
        (state !== undefined &&
          ongoingSpellEffectSuppressedByAntimagicField(
            state,
            antimagicFieldOngoingSpellEffectRefForActiveEffect(effect),
          )) ||
        !spiritualWeaponRepeatIsLaterTurn(effect, state)
      ) {
        return [];
      }
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "spiritualWeaponRepeatAttack",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
          targeting: { kind: "singleCombatant" },
          damage: effect.damage,
          attackKind: effect.attackKind,
          attackBonus: effect.attackBonus,
          forceReachFeet: effect.forceReachFeet,
          repeatMoveMaxFeet: effect.repeatMoveMaxFeet,
        },
      ];
    },
  );
}

function spiritualWeaponRepeatIsLaterTurn(
  effect: Extract<BattleActiveEffect, { readonly kind: "spiritualWeapon" }>,
  state: BattleState | undefined,
): boolean {
  return (
    state !== undefined &&
    (currentActorId(state) !== effect.startedOn.actorId ||
      state.initiative.round !== effect.startedOn.round)
  );
}

function spiritualWeaponSpell(spell: SpellRecord) {
  // RAW trace: .references/srd-5.2.1/Spells/Descriptions-S-Z.md:512-525.
  // This shape gate admits exactly the Spiritual Weapon subset modeled by
  // Task 8: Bonus Action level-2 cast, 60-foot force placement, Concentration
  // up to 1 minute, immediate/repeat melee Spell Attacks within 5 feet of the
  // force, 20-foot repeat move, Force damage, and +1d8 per slot level above 2.
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const forceAttachment = spell.mechanics.attachment;
  const initialAttack = spell.mechanics.initialPhase;
  const [repeatOperation, ...extraOperations] = spell.mechanics.operations;
  const repeatEffects =
    repeatOperation?.effect.kind === "composite_ongoing"
      ? repeatOperation.effect.effects
      : [];
  const [reposition, repeatAttack, ...extraRepeatEffects] = repeatEffects;
  const initialHit =
    initialAttack?.kind === "attack_roll" ? initialAttack.onHit[0] : undefined;
  const initialMiss =
    initialAttack?.kind === "attack_roll" ? initialAttack.onMiss[0] : undefined;
  const repeatHit =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onHit[0] : undefined;
  const repeatMiss =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onMiss[0] : undefined;

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    extraOperations.length !== 0 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    forceAttachment.kind !== "hole" ||
    forceAttachment.value.kind !== "location" ||
    initialAttack?.kind !== "attack_roll" ||
    initialAttack.attackKind !== "melee_spell_attack" ||
    initialAttack.attachment.kind !== "hole" ||
    !spiritualWeaponAttackTargetMatchesForce(
      initialAttack.attachment,
      forceAttachment.holeId,
    ) ||
    initialAttack.onHit.length !== 1 ||
    initialAttack.onMiss.length !== 1 ||
    !isSupportedSpiritualWeaponDamageEffect(initialHit) ||
    !isSupportedSpiritualWeaponMissEffect(initialMiss) ||
    repeatOperation.trigger.kind !== "on_caster_spends_action" ||
    repeatOperation.trigger.cost.kind !== "bonus_action" ||
    repeatOperation.trigger.laterTurnsOnly !== true ||
    repeatOperation.predicate !== undefined ||
    repeatOperation.targetLimit !== undefined ||
    repeatOperation.usageLimit !== undefined ||
    repeatOperation.effect.kind !== "composite_ongoing" ||
    extraRepeatEffects.length !== 0 ||
    reposition?.kind !== "reposition_attachment" ||
    reposition.maxMoveFeet !== 20 ||
    repeatAttack?.kind !== "attack_roll" ||
    repeatAttack.attackKind !== "melee_spell_attack" ||
    !spiritualWeaponAttackTargetMatchesForce(
      repeatAttack.attachment,
      forceAttachment.holeId,
    ) ||
    repeatAttack.onHit.length !== 1 ||
    repeatAttack.onMiss.length !== 1 ||
    !isSupportedSpiritualWeaponDamageEffect(repeatHit) ||
    !isSupportedSpiritualWeaponMissEffect(repeatMiss) ||
    !sameSpiritualWeaponDamageEffect(initialHit, repeatHit)
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    rangeFeet: 60,
    forceReachFeet: 5,
    repeatMoveMaxFeet: reposition.maxMoveFeet,
    damageAmount: initialHit.amount,
  };
}

type SupportedSpiritualWeaponDamageAmount = LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly base: DiceExpr & {
    readonly dice: 1;
    readonly dieSize: 8;
    readonly flat?: undefined;
    readonly spellcastingMod: true;
    readonly abilityModifier?: undefined;
  };
  readonly perLevel: DiceExprDelta & {
    readonly dice: 1;
    readonly dieSize: 8;
    readonly flat?: undefined;
  };
  readonly startingAtLevel: 2;
};

type SupportedSpiritualWeaponDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
> & {
  readonly damageType: "force";
  readonly amount: SupportedSpiritualWeaponDamageAmount;
};

function isSupportedSpiritualWeaponDamageEffect(
  effect: EffectAtom | undefined,
): effect is SupportedSpiritualWeaponDamageEffect {
  if (effect?.kind !== "damage") {
    return false;
  }
  return (
    effect.damageType === "force" &&
    isSupportedSpiritualWeaponDamageAmount(effect.amount)
  );
}

function isSupportedSpiritualWeaponMissEffect(
  effect: EffectAtom | undefined,
): effect is Extract<EffectAtom, { readonly kind: "none" }> {
  return effect?.kind === "none";
}

function isSupportedSpiritualWeaponDamageAmount(
  amount: DiceAmount,
): amount is SupportedSpiritualWeaponDamageAmount {
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 2 &&
    amount.base.dice === 1 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === true &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === 8 &&
    amount.perLevel.flat === undefined
  );
}

function sameSpiritualWeaponDamageEffect(
  left: SupportedSpiritualWeaponDamageEffect,
  right: SupportedSpiritualWeaponDamageEffect,
): boolean {
  return (
    left.damageType === right.damageType &&
    left.amount.axis === right.amount.axis &&
    left.amount.startingAtLevel === right.amount.startingAtLevel &&
    left.amount.base.dice === right.amount.base.dice &&
    left.amount.base.dieSize === right.amount.base.dieSize &&
    left.amount.base.flat === right.amount.base.flat &&
    left.amount.base.spellcastingMod === right.amount.base.spellcastingMod &&
    left.amount.base.abilityModifier === right.amount.base.abilityModifier &&
    left.amount.perLevel.dice === right.amount.perLevel.dice &&
    left.amount.perLevel.dieSize === right.amount.perLevel.dieSize &&
    left.amount.perLevel.flat === right.amount.perLevel.flat
  );
}

function spiritualWeaponAttackTargetMatchesForce(
  attachment: Attachment | undefined,
  forceHoleId: string,
): boolean {
  if (
    attachment?.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    attachment.value.selection.mode !== "one" ||
    attachment.value.selection.targetKinds === undefined ||
    attachment.value.selection.targetKinds.length !== 1 ||
    attachment.value.selection.targetKinds[0] !== "creature"
  ) {
    return false;
  }
  const relativePosition =
    "relativePosition" in attachment.value.selection
      ? attachment.value.selection.relativePosition
      : undefined;
  return (
    relativePosition?.kind === "within_feet_of_attachment" &&
    relativePosition.attachmentHoleId === forceHoleId &&
    relativePosition.feet === 5
  );
}

export function supportedPreparedSpikeGrowthMovementHazardProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const spikeGrowth = spikeGrowthMovementHazardSpell(spell);
  if (spikeGrowth === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "spikeGrowthMovementHazard",
        spell,
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(spikeGrowth.radiusFeet),
        },
        durationTicks: spikeGrowth.durationTicks,
        rangeFeet: movementFeet(spikeGrowth.rangeFeet),
        damage: {
          expr: spikeGrowth.damage.expr,
          damageType: spikeGrowth.damage.damageType,
        },
        damagePerFeet: movementFeet(spikeGrowth.damagePerFeet),
      },
    ];
  });
}

function spikeGrowthMovementHazardSpell(spell: SpellRecord): {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radiusFeet: number;
  readonly rangeFeet: number;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: Extract<DamageType, "piercing">;
  };
  readonly damagePerFeet: number;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const area =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value
      : null;
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const movementDamageOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_moves",
  );

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 150 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    attachment.kind !== "hole" ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== 20 ||
    difficultTerrainOperation?.effect.kind !== "area_is_difficult_terrain" ||
    movementDamageOperation?.trigger.kind !== "on_creature_moves" ||
    movementDamageOperation.trigger.perFeet !== 5 ||
    movementDamageOperation.effect.kind !== "damage" ||
    movementDamageOperation.effect.damageType !== "piercing" ||
    movementDamageOperation.effect.amount.kind !== "fixed" ||
    movementDamageOperation.effect.amount.expr.dice !== 2 ||
    movementDamageOperation.effect.amount.expr.dieSize !== 4
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    radiusFeet: area.shape.radiusFeet,
    rangeFeet: spell.mechanics.range.feet,
    damage: {
      expr: movementDamageOperation.effect.amount.expr,
      damageType: movementDamageOperation.effect.damageType,
    },
    damagePerFeet: movementDamageOperation.trigger.perFeet,
  };
}

export function supportedPreparedMoonbeamProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const moonbeam = moonbeamSpell(spell);
  if (moonbeam === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: moonbeam.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "moonbeam",
        spell,
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(moonbeam.radiusFeet),
          heightFeet: movementFeet(moonbeam.heightFeet),
        },
        durationTicks: moonbeam.durationTicks,
        rangeFeet: movementFeet(120),
        repositionMaxMoveFeet: movementFeet(moonbeam.repositionMaxMoveFeet),
        damage: { expr: damageExpr, damageType: "radiant" },
      },
    ];
  });
}

function moonbeamSpell(spell: SpellRecord) {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const cylinderHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const cylinderArea = cylinderHole?.value ?? null;
  const initialPhase = spell.mechanics.initialPhase;
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const moveIntoOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.trigger.laterTurnsOnly === true &&
      operation.effect.kind === "reposition_attachment",
  );
  const dimLightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_emits_dim_light",
  );

  const initialDamage = isMoonbeamSaveGate(initialPhase);
  // Shape-only admission: do not gate on spell name or provenance.
  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 5 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    cylinderHole?.holeId !== "moonbeam_cylinder" ||
    cylinderArea?.kind !== "area" ||
    cylinderArea?.origin.kind !== "point_within_range" ||
    cylinderArea.shape.kind !== "cylinder" ||
    cylinderArea.shape.radiusFeet !== 5 ||
    cylinderArea.shape.heightFeet !== 40 ||
    initialDamage === null ||
    isMoonbeamSaveGate(endTurnOperation?.effect) === null ||
    isMoonbeamSaveGate(enterOperation?.effect) === null ||
    isMoonbeamSaveGate(moveIntoOperation?.effect) === null ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !== 60 ||
    dimLightOperation?.effect.kind !== "area_emits_dim_light"
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    radiusFeet: cylinderArea.shape.radiusFeet,
    heightFeet: cylinderArea.shape.heightFeet,
    repositionMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: initialDamage.amount,
  };
}

type MoonbeamSaveGateDamage = Extract<
  Extract<
    Extract<
      SpellRecord["mechanics"],
      { readonly family: "ongoing_effect" }
    >["initialPhase"],
    { readonly kind: "save_gate" }
  >["onFail"],
  { readonly kind: "composite" }
>["effects"][number] & { readonly kind: "damage" };

type MoonbeamInitialPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];

function isMoonbeamSaveGate(
  effect: OngoingOperationEffect | MoonbeamInitialPhase | undefined,
): MoonbeamSaveGateDamage | null {
  if (effect?.kind !== "save_gate") {
    return null;
  }
  if (effect.onFail.kind !== "composite") {
    return null;
  }
  if (effect.onFail.effects.length !== 3) {
    return null;
  }
  const damage = effect.onFail.effects[0];
  if (
    damage?.kind !== "damage" ||
    damage.damageType !== "radiant" ||
    damage.amount?.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.startingAtLevel !== 2 ||
    damage.amount.base.dice !== 2 ||
    damage.amount.base.dieSize !== 10 ||
    damage.amount.perLevel.dice !== 1
  ) {
    return null;
  }
  if (
    effect.onFail.effects[1]?.kind !== "revert_shape_shift_to_true_form" ||
    effect.onFail.effects[2]?.kind !== "suppress_shape_shifting_while_in_area"
  ) {
    return null;
  }
  if (
    effect.ability !== "con" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "half_damage"
  ) {
    return null;
  }
  return damage;
}

export function supportedPreparedWebRestraintHazardProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const web = webRestraintHazardSpell(spell);
  if (web === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "webRestraintHazard",
        spell,
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCube",
          sideFeet: movementFeet(web.sideFeet),
        },
        durationTicks: web.durationTicks,
        rangeFeet: movementFeet(web.rangeFeet),
      },
    ];
  });
}

function webRestraintHazardSpell(spell: SpellRecord): {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly sideFeet: number;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const area =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value
      : null;
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const startTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_starts_turn_in_area",
  );
  const escapeOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_affected_creature_spends_action",
  );
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const lightlyObscuredOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_lightly_obscured",
  );
  const anchorOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_anchor_or_layering_requirement",
  );
  const burnAwayOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_section_burns_away",
  );

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 7 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "cube" ||
    area.shape.sideFeet !== 20 ||
    !isWebRestraintSaveGate(enterOperation?.effect) ||
    enterOperation?.usageLimit?.kind !== "once_per_turn" ||
    !isWebRestraintSaveGate(startTurnOperation?.effect) ||
    !isWebRestraintEscapeOperation(escapeOperation) ||
    difficultTerrainOperation === undefined ||
    lightlyObscuredOperation === undefined ||
    anchorOperation?.effect.kind !== "area_anchor_or_layering_requirement" ||
    burnAwayOperation?.effect.kind !== "area_section_burns_away"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    sideFeet: area.shape.sideFeet,
  };
}

function isWebRestraintSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is WebRestraintSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "apply_condition_while_in_area_or_until_escape" &&
    effect.onFail.condition === "restrained"
  );
}

function isWebRestraintEscapeOperation(
  operation: OngoingOperation | undefined,
): boolean {
  return (
    operation?.trigger.kind === "on_affected_creature_spends_action" &&
    operation.trigger.cost.kind === "action" &&
    operation.predicate?.kind === "has_condition" &&
    operation.predicate.condition === "restrained" &&
    operation.effect.kind === "ability_check_gate" &&
    operation.effect.ability === "str" &&
    operation.effect.skill === "athletics" &&
    operation.effect.dc.kind === "caster_spell_save_dc" &&
    operation.effect.onPass.kind === "remove_condition" &&
    operation.effect.onPass.condition === "restrained"
  );
}

export function supportedPreparedObjectContactDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const profile = objectContactDamageSpell(spell);
  if (profile === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: profile.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (damageExpr === null) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "objectContactDamage",
        spell,
        actionCost: "magicAction",
        targeting: { kind: "singleManufacturedMetalObject" },
        damage: {
          expr: damageExpr,
          damageType: profile.damageType,
        },
        rangeFeet: profile.rangeFeet,
        durationTicks: profile.durationTicks,
      },
    ];
  });
}

export function supportedObjectContactDamageRepeatProfile(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  spell: SpellRecord,
): readonly SupportedSpellInvocation[] {
  if (objectContactDamageSpell(spell) === null) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly SupportedSpellInvocation[] => {
      if (
        effect.kind !== "spellObjectContactDamage" ||
        effect.sourceCombatantId !== actor.combatantId ||
        effect.sourceSpellId !== spell.id ||
        (state !== undefined &&
          ongoingSpellEffectSuppressedByAntimagicField(
            state,
            antimagicFieldOngoingSpellEffectRefForActiveEffect(effect),
          )) ||
        !objectContactDamageRepeatIsDiscoverable(effect, state)
      ) {
        return [];
      }
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "objectContactDamageRepeat",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
          damage: effect.damage,
          rangeFeet: effect.rangeFeet,
        },
      ];
    },
  );
}

function objectContactDamageRepeatIsDiscoverable(
  effect: SpellObjectContactDamageActiveEffect,
  state: BattleState | undefined,
): boolean {
  return (
    state !== undefined &&
    (currentActorId(state) !== effect.startedOn.actorId ||
      state.initiative.round !== effect.startedOn.round)
  );
}

function objectContactDamageSpell(spell: SpellRecord): {
  readonly damageAmount: DiceAmount;
  readonly damageType: DamageType;
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const rangeFeet =
    spell.mechanics.range.kind === "point" ? spell.mechanics.range.feet : null;
  const attachment = spell.mechanics.attachment;
  const initialPhase = spell.mechanics.initialPhase;
  const initialEffect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const repeatOperation = spell.mechanics.operations[0];
  const repeatEffect = repeatOperation?.effect;
  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    spell.mechanics.operations.length !== 1 ||
    !isManufacturedMetalObjectAttachment(attachment) ||
    initialPhase?.kind !== "direct" ||
    !isManufacturedMetalObjectAttachment(initialPhase.attachment) ||
    !sameManufacturedMetalObjectHole(attachment, initialPhase.attachment) ||
    initialPhase.effects?.length !== 1 ||
    !isObjectContactDamageEffect(initialEffect) ||
    repeatOperation?.trigger.kind !== "on_caster_spends_action" ||
    repeatOperation.trigger.cost?.kind !== "bonus_action" ||
    repeatOperation.trigger.laterTurnsOnly !== true ||
    repeatOperation.predicate?.kind !==
      "table_witnessed_attachment_within_spell_range" ||
    !isObjectContactDamageEffect(repeatEffect) ||
    !sameObjectContactDamageEffect(initialEffect, repeatEffect)
  ) {
    return null;
  }
  return {
    damageAmount: initialEffect.amount,
    damageType: initialEffect.damageType,
    durationTicks: durationTicks.right,
    rangeFeet: movementFeet(rangeFeet),
  };
}

type ManufacturedMetalObjectAttachment = Extract<
  Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["attachment"],
  { readonly kind: "hole" }
> & {
  readonly value: {
    readonly kind: "object";
    readonly count: 1;
    readonly filter: {
      readonly manufactured: true;
      readonly material: "metal";
      readonly visibility: "caster_can_see";
    };
  };
};

function isManufacturedMetalObjectAttachment(
  attachment: Extract<
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["attachment"],
): attachment is ManufacturedMetalObjectAttachment {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "object" &&
    attachment.value.count === 1 &&
    attachment.value.filter?.manufactured === true &&
    attachment.value.filter?.material === "metal" &&
    attachment.value.filter?.visibility === "caster_can_see"
  );
}

function sameManufacturedMetalObjectHole(
  left: ManufacturedMetalObjectAttachment,
  right: ManufacturedMetalObjectAttachment,
): boolean {
  return left.holeId === right.holeId;
}

type ObjectContactDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "object_contact_damage" }
>;
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;
type SupportedHeatMetalDamageAmount = LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly base: DiceExpr & {
    readonly dice: 2;
    readonly dieSize: 8;
    readonly flat?: undefined;
    readonly spellcastingMod?: undefined;
    readonly abilityModifier?: undefined;
  };
  readonly perLevel: DiceExprDelta & {
    readonly dice: 1;
    readonly dieSize?: undefined;
    readonly flat?: undefined;
  };
  readonly startingAtLevel: 3;
};
type SupportedObjectContactDamageEffect = ObjectContactDamageEffect & {
  readonly damageType: DamageType;
  readonly amount: SupportedHeatMetalDamageAmount;
};

function isObjectContactDamageEffect(
  effect: OngoingInitialEffect | OngoingOperationEffect | undefined,
): effect is SupportedObjectContactDamageEffect {
  if (effect?.kind !== "object_contact_damage") {
    return false;
  }
  const amount = effect.amount;
  return (
    effect.contact.kind ===
      "table_witnessed_physical_contact_with_spell_object" &&
    effect.damageType === "fire" &&
    isSupportedHeatMetalDamageAmount(amount) &&
    isSupportedObjectContactHoldingOrWearingSave(effect.holdingOrWearingSave)
  );
}

function isSupportedHeatMetalDamageAmount(
  amount: DiceAmount,
): amount is SupportedHeatMetalDamageAmount {
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 3 &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === undefined
  );
}

function sameObjectContactDamageEffect(
  left: SupportedObjectContactDamageEffect,
  right: SupportedObjectContactDamageEffect,
): boolean {
  return (
    left.damageType === right.damageType &&
    left.amount.axis === right.amount.axis &&
    left.amount.startingAtLevel === right.amount.startingAtLevel &&
    left.amount.base.dice === right.amount.base.dice &&
    left.amount.base.dieSize === right.amount.base.dieSize &&
    left.amount.base.flat === right.amount.base.flat &&
    left.amount.base.spellcastingMod === right.amount.base.spellcastingMod &&
    left.amount.base.abilityModifier === right.amount.base.abilityModifier &&
    left.amount.perLevel.dice === right.amount.perLevel.dice &&
    left.amount.perLevel.dieSize === right.amount.perLevel.dieSize &&
    left.amount.perLevel.flat === right.amount.perLevel.flat &&
    left.contact.kind === right.contact.kind &&
    isSupportedObjectContactHoldingOrWearingSave(right.holdingOrWearingSave)
  );
}

function isSupportedObjectContactHoldingOrWearingSave(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  const fallbackRolls = save.onFailure.fallback.on;
  return (
    save.appliesIf.kind === "table_witnessed_holding_or_wearing_spell_object" &&
    save.ability === "con" &&
    save.dc.kind === "caster_spell_save_dc" &&
    save.onSuccess.kind === "none" &&
    save.onFailure.kind === "drop_if_possible_else_disadvantage" &&
    save.onFailure.dropCapabilityWitness.kind ===
      "table_witnessed_drop_capability" &&
    save.onFailure.dropCapabilityWitness.subject === "damaged_creature" &&
    save.onFailure.dropCapabilityWitness.object === "spell_object" &&
    save.onFailure.dropResultWitness.kind === "table_witnessed_drop_result" &&
    save.onFailure.dropResultWitness.subject === "damaged_creature" &&
    save.onFailure.dropResultWitness.object === "spell_object" &&
    save.onFailure.fallbackWhen === "object_not_dropped" &&
    save.onFailure.fallback.kind === "modify_roll_advantage" &&
    save.onFailure.fallback.mode === "disadvantage" &&
    fallbackRolls.length === 2 &&
    fallbackRolls.includes("attack_roll") &&
    fallbackRolls.includes("ability_check") &&
    save.onFailure.fallback.expiresOn.kind === "caster_turn_start"
  );
}

function isFlamingSphereSaveEffect(
  effect: OngoingOperationEffect | undefined,
  areaHoleId: string | undefined,
): effect is FlamingSphereSaveEffect {
  if (effect?.kind !== "save_gate") {
    return false;
  }
  const amount = effect.onFail.kind === "damage" ? effect.onFail.amount : null;
  return (
    areaHoleId !== undefined &&
    effect.attachment?.kind === "hole" &&
    effect.attachment.holeId === areaHoleId &&
    effect.attachment.value.kind === "area" &&
    effect.attachment.value.origin.kind === "point_within_range" &&
    effect.attachment.value.shape.kind === "sphere" &&
    effect.attachment.value.shape.radiusFeet === 2.5 &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "fire" &&
    amount?.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 2 &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 6 &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === 6
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
  options?: {
    readonly actionCostOverride?: "magicAction" | "bonusAction";
  },
): boolean {
  if (
    spellInvocationIsLevelOnePlus(invocation) &&
    combatantHasQuickenedLevelOnePlusSpellCastThisTurn(resources, actorId)
  ) {
    return false;
  }
  if (
    invocation.resource.tag === "spellSlot" &&
    combatantHasSpellSlotUseThisTurn(resources, actorId)
  ) {
    return false;
  }
  const actionCost =
    options?.actionCostOverride ??
    ("actionCost" in invocation ? invocation.actionCost : "magicAction");
  if (actionCost === "bonusAction") {
    return resources.currentHasBonusAction;
  }
  if (invocation.resource.tag === "none") {
    return canSpendAction(resources, "magic");
  }
  return canSpendAction(resources, "magic");
}

export function spellInvocationIsLevelOnePlus(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spell.mechanics.level >= 1
  );
}

export function spellInvocationIsSpellcasting(
  invocation: SupportedSpellInvocation,
): boolean {
  return !(
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "dancingLightsReposition" ||
    (invocation.procedure === "markedDamageRider" &&
      invocation.action === "transfer")
  );
}

export function markLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return combatantHasLevelOnePlusSpellCastThisTurn(resources, combatantId)
    ? resources
    : {
        ...resources,
        levelOnePlusSpellCastsThisTurn: [
          ...resources.levelOnePlusSpellCastsThisTurn,
          combatantId,
        ],
      };
}

export function markInvocationLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleTurnResources {
  return spellInvocationIsLevelOnePlus(invocation)
    ? markLevelOnePlusSpellCastThisTurn(resources, combatantId)
    : resources;
}

export function markQuickenedLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): BattleTurnResources {
  return combatantHasQuickenedLevelOnePlusSpellCastThisTurn(
    resources,
    combatantId,
  )
    ? resources
    : {
        ...resources,
        quickenedLevelOnePlusSpellCastsThisTurn: [
          ...resources.quickenedLevelOnePlusSpellCastsThisTurn,
          combatantId,
        ],
      };
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
  return Either.right(
    markLevelOnePlusSpellCastThisTurn(
      {
        ...resources,
        spellSlotUsesThisTurn: pending
          ? resources.spellSlotUsesThisTurn.map((use) =>
              use.kind === "pending" && use.combatantId === combatantId
                ? nextUse
                : use,
            )
          : [...resources.spellSlotUsesThisTurn, nextUse],
      },
      combatantId,
    ),
  );
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

export function combatantHasLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.levelOnePlusSpellCastsThisTurn.includes(combatantId);
}

export function combatantHasQuickenedLevelOnePlusSpellCastThisTurn(
  resources: BattleTurnResources,
  combatantId: CombatantId,
): boolean {
  return resources.quickenedLevelOnePlusSpellCastsThisTurn.includes(
    combatantId,
  );
}
