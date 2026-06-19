// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// Spell profile predicates and projections (Cluster O). Mechanical extraction
// from battle-reducer.ts. Aggregates: per-procedure `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// and equality helpers.
//
// O is a leaf cluster within the spells subsystem: it depends on Q
// (spell-effects), domain constants/types from `../battle-reducer.ts`, and
// surface types only. Consumers are K (discovery), P (holes/fills), L
// (resolve), and F (turn).

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  type BattleCreatureState,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
} from "../character-battle-resources.ts";

import { supportedDamageAmountExpr } from "./spells-profile-shared.ts";
import { hasSaveGateRepeatSaves } from "./spell-procedure-profiles/_save-gate-helpers.ts";
import { chainedSpellAttackDamageProfile } from "./spell-procedure-profiles/chained-spell-attack-damage.ts";
import { attackBurstSaveDamageProfile } from "./spell-procedure-profiles/attack-burst-save-damage.ts";
import { spellHostedWeaponAttackProfile } from "./spell-procedure-profiles/spell-hosted-weapon-attack.ts";
import { weaponAttackOverrideProfile } from "./spell-procedure-profiles/weapon-attack-override.ts";
export * from "./spells-profiles-attack-damage.ts";

import { abilityD20TestRollModeSaveGateProfile } from "./spell-procedure-profiles/ability-d20-test-roll-mode-save-gate.ts";
import { antimagicFieldOngoingSpellSuppressionProfile } from "./spell-procedure-profiles/antimagic-field-ongoing-spell-suppression.ts";
import { afterHitDamageProfile } from "./spell-procedure-profiles/after-hit-damage.ts";
import { afterHitSaveGatedConditionProfile } from "./spell-procedure-profiles/after-hit-save-gated-condition.ts";
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import { commandProfile } from "./spell-procedure-profiles/command.ts";
import { heldLightProfile } from "./spell-procedure-profiles/held-light.ts";
import { heldLightHurlProfile } from "./spell-procedure-profiles/held-light-hurl.ts";
import { hideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
import { hypnoticPatternProfile } from "./spell-procedure-profiles/hypnotic-pattern.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./spell-procedure-profiles/marked-damage-rider.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import {
  objectContactDamageProfile,
  objectContactDamageRepeatProfile,
} from "./spell-procedure-profiles/object-contact-damage.ts";
import { ongoingSpellEndProfile } from "./spell-procedure-profiles/ongoing-spell-end.ts";
import {
  admitPersistentArmorEffectInvocationSpellAccess,
  persistentArmorEffectProfile,
} from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { conditionRemovalProtectionProfile } from "./spell-procedure-profiles/condition-removal-protection.ts";
import { chosenDamageResistanceProfile } from "./spell-procedure-profiles/chosen-damage-resistance.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";
import { counterspellProfile } from "./spell-procedure-profiles/counterspell.ts";
import { creatureSizeChangeProfile } from "./spell-procedure-profiles/creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./spell-procedure-profiles/creature-type-protection.ts";
import { directConditionProfile } from "./spell-procedure-profiles/direct-condition.ts";
import { directConditionRemovalProfile } from "./spell-procedure-profiles/direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./spell-procedure-profiles/direct-hit-point-restoration.ts";
import {
  dancingLightsCombinedCastProfile,
  dancingLightsRepositionProfile,
  dancingLightsSeparateCastProfile,
} from "./spell-procedure-profiles/dancing-lights.ts";
import { dragonsBreathInitialProfile } from "./spell-procedure-profiles/dragons-breath-initial.ts";
import { expeditiousRetreatDashProfile } from "./spell-procedure-profiles/expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./spell-procedure-profiles/feather-fall-mitigation.ts";
import { flamingSphereProfile } from "./spell-procedure-profiles/flaming-sphere.ts";
import { fogCloudObscurementProfile } from "./spell-procedure-profiles/fog-cloud-obscurement.ts";
import { greaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
import { gustOfWindLineProfile } from "./spell-procedure-profiles/gust-of-wind-line.ts";
import { jumpMovementReplacementProfile } from "./spell-procedure-profiles/jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./spell-procedure-profiles/levitated-creature.ts";
import { magicalDarknessPointOriginProfile } from "./spell-procedure-profiles/magical-darkness-point-origin.ts";
import { mirrorImageHitInterceptionProfile } from "./spell-procedure-profiles/mirror-image-hit-interception.ts";
import { moonbeamProfile } from "./spell-procedure-profiles/moonbeam.ts";
import { repeatedDamageAllocationProfile } from "./spell-procedure-profiles/repeated-damage-allocation.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./spell-procedure-profiles/sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./spell-procedure-profiles/save-gated-attack-roll-advantage.ts";
import { saveGatedConditionProfile } from "./spell-procedure-profiles/save-gated-condition.ts";
import { saveGatedConditionImmunityProfile } from "./spell-procedure-profiles/save-gated-condition-immunity.ts";
import { saveGatedDamageProfile } from "./spell-procedure-profiles/save-gated-damage.ts";
import { scalarBuffProfile } from "./spell-procedure-profiles/scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./spell-procedure-profiles/self-transformation-mode.ts";
import { selfTeleportProfile } from "./spell-procedure-profiles/self-teleport.ts";
import { shieldReactionProfile } from "./spell-procedure-profiles/shield-reaction.ts";
import { sleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
import { sleetStormAreaHazardProfile } from "./spell-procedure-profiles/sleet-storm-area-hazard.ts";
import { slowActivePenaltiesProfile } from "./spell-procedure-profiles/slow-active-penalties.ts";
import { spikeGrowthMovementHazardProfile } from "./spell-procedure-profiles/spike-growth-movement-hazard.ts";
import { webRestraintHazardProfile } from "./spell-procedure-profiles/web-restraint-hazard.ts";
import { spellAttackDamageProfile } from "./spell-procedure-profiles/spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-procedure-profiles/spell-attack-sequence.ts";
import {
  spellCreatedHeldObjectAttackProfile,
  spellCreatedHeldObjectProfile,
  spellCreatedHeldObjectReEvokeProfile,
} from "./spell-procedure-profiles/spell-created-held-object.ts";
import {
  spiritualWeaponAttackProxyProfile,
  spiritualWeaponRepeatAttackProfile,
} from "./spell-procedure-profiles/spiritual-weapon.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./spell-procedure-profiles/warding-bond.ts";
import { weaponDamageRiderProfile } from "./spell-procedure-profiles/weapon-damage-rider.ts";
import { afterHitDamageAndIlluminationProfile } from "./spell-procedure-profiles/after-hit-damage-and-illumination.ts";
import { afterHitTimedDamageAndSaveProfile } from "./spell-procedure-profiles/after-hit-timed-damage-and-save.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/profile.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
export * from "./spells-profiles-support.ts";
export {
  animalFriendshipSaveGateConditionSpell,
  areaSaveGateSpellRangeFeet,
  charmPersonSaveGateConditionSpell,
  colorSpraySaveGateConditionSpell,
  entangleSaveGateConditionSpell,
  faerieFireSaveGateAttackRollAdvantageSpell,
  hasSaveGateRepeatSaves,
  isViciousMockeryNextAttackRiderShape,
  saveGateTargeting,
  supportedCantripSaveGateDamageProfile,
  supportedFailedSavePostDamageRiders,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSaveGateConditionImmunityProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedSaveGateConditionSpell,
  supportedSaveGateDamageProfile,
  supportedSaveGateFailedSaveEffects,
} from "./spell-procedure-profiles/_save-gate-helpers.ts";
export {
  diceExprWithDelta,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  supportedRepeatedEffectCount,
} from "./spells-profile-shared.ts";
export { supportedPreparedSleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
export { supportedPreparedHideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
export { supportedPreparedGreaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
export { supportedPreparedCommandProfile } from "./spell-procedure-profiles/command.ts";

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
  const preparedSpells = effectiveCharacterBattlePreparedSpells(spellcasting);
  const cantrips = effectiveCharacterBattleCantrips(spellcasting);
  const admissionContext = spellAdmissionContextFor(actor, state);
  if (admissionContext === null) {
    return [];
  }

  return [
    ...preparedSpells.flatMap((spell) =>
      repeatedDamageAllocationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellAttackSequenceProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      chainedSpellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      attackBurstSaveDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedAttackRollAdvantageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      abilityD20TestRollModeSaveGateProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedConditionImmunityProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      sleepTargetAdmissionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      hideousLaughterProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      hypnoticPatternProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      slowActivePenaltiesProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      greaseGroundHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      gustOfWindLineProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      fogCloudObscurementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      magicalDarknessPointOriginProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      antimagicFieldOngoingSpellSuppressionProfile.admit(
        spell,
        admissionContext,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      flamingSphereProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spiritualWeaponAttackProxyProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spikeGrowthMovementHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      moonbeamProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      webRestraintHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      sleetStormAreaHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectContactDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectContactDamageRepeatProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spiritualWeaponRepeatAttackProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      commandProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      scalarBuffProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      selfTransformationModeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      rollModifierProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      creatureSizeChangeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      levitatedCreatureProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      wardingBondProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      creatureTypeProtectionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      blurAttackRollDefenseProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      seeInvisibleObserverSightProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      mirrorImageHitInterceptionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      conditionRemovalProtectionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      chosenDamageResistanceProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectLightProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      ongoingSpellEndProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectAttackProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectReEvokeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      conditionImmunityAndTurnStartTemporaryHitPointsProfile.admit(
        spell,
        admissionContext,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      weaponDamageRiderProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      magicWeaponEnhancementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitSaveGatedConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitTimedDamageAndSaveProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitDamageAndIlluminationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      markedDamageRiderProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      expeditiousRetreatDashProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      jumpMovementReplacementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      dragonsBreathInitialProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      selfTeleportProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      sanctuaryTargetingInterdictionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      directConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      directConditionRemovalProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      featherFallMitigationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      persistentArmorEffectProfile.admit(spell, admissionContext),
    ),
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      admitPersistentArmorEffectInvocationSpellAccess(
        actor.combatantId,
        access,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      directHitPointRestorationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      shieldReactionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      counterspellProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHellishRebukeReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      heldLightProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsSeparateCastProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsCombinedCastProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsRepositionProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      objectLightProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      heldLightHurlProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellHostedWeaponAttackProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      weaponAttackOverrideProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellAttackSequenceProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      saveGatedDamageProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      rollModifierProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      thaumaturgyBoomingVoiceProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      damageReductionProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      makeStableProfile.admit(spell, admissionContext),
    ),
  ].filter(
    (invocation) =>
      !activeOngoingFeaturesPreventSpellInvocation(actor, invocation),
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
            castingTime: { kind: "reaction" as const },
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
