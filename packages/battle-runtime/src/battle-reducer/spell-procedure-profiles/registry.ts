// Central registry of Spell Procedure Profiles. Admission, discovery, and
// resolution use this same typed procedure vocabulary; profile order and
// completeness are maintained here rather than in parallel dispatch lists.

import { damageReductionProfile } from "./damage-reduction.ts";
import { abilityD20TestRollModeSaveGateProfile } from "./ability-d20-test-roll-mode-save-gate.ts";
import { afterHitDamageAndIlluminationProfile } from "./after-hit-damage-and-illumination.ts";
import { afterHitDamageProfile } from "./after-hit-damage.ts";
import { afterHitSaveGatedConditionProfile } from "./after-hit-save-gated-condition.ts";
import { afterHitTimedDamageAndSaveProfile } from "./after-hit-timed-damage-and-save.ts";
import { antimagicFieldOngoingSpellSuppressionProfile } from "./antimagic-field-ongoing-spell-suppression.ts";
import { attackBurstSaveDamageProfile } from "./attack-burst-save-damage.ts";
import { blurAttackRollDefenseProfile } from "./blur-attack-roll-defense.ts";
import { commandProfile } from "./command.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { chosenDamageResistanceProfile } from "./chosen-damage-resistance.ts";
import { cloudkillAreaHazardProfile } from "./cloudkill-area-hazard.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./condition-removal-protection.ts";
import { counterspellProfile } from "./counterspell.ts";
import {
  creatureSizeChangeProfile,
  creatureSizeDecreaseProfile,
} from "./creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./creature-type-protection.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { dragonsBreathInitialProfile } from "./dragons-breath-initial.ts";
import {
  dancingLightsCombinedCastProfile,
  dancingLightsRepositionProfile,
  dancingLightsSeparateCastProfile,
} from "./dancing-lights.ts";
import { expeditiousRetreatDashProfile } from "./expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./feather-fall-mitigation.ts";
import { flamingSphereProfile } from "./flaming-sphere.ts";
import { fogCloudObscurementProfile } from "./fog-cloud-obscurement.ts";
import { greaseGroundHazardProfile } from "./grease-ground-hazard.ts";
import { gustOfWindLineProfile } from "./gust-of-wind-line.ts";
import { heldLightHurlProfile } from "./held-light-hurl.ts";
import { heldLightProfile } from "./held-light.ts";
import { hastePositiveProfile } from "./haste-positive.ts";
import { hideousLaughterProfile } from "./hideous-laughter.ts";
import { hypnoticPatternProfile } from "./hypnotic-pattern.ts";
import { insectPlagueAreaHazardProfile } from "./insect-plague-area-hazard.ts";
import { jumpMovementReplacementProfile } from "./jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./levitated-creature.ts";
import { makeStableProfile } from "./make-stable.ts";
import { magicWeaponEnhancementProfile } from "./magic-weapon-enhancement.ts";
import { magicalDarknessPointOriginProfile } from "./magical-darkness-point-origin.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { mirrorImageHitInterceptionProfile } from "./mirror-image-hit-interception.ts";
import { moonbeamProfile } from "./moonbeam.ts";
import {
  objectContactDamageProfile,
  objectContactDamageRepeatProfile,
} from "./object-contact-damage.ts";
import { objectLightProfile } from "./object-light.ts";
import { ongoingSpellEndProfile } from "./ongoing-spell-end.ts";
import { persistentArmorEffectProfile } from "./persistent-armor-effect.ts";
import { repeatedDamageAllocationProfile } from "./repeated-damage-allocation.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./save-gated-condition.ts";
import { saveGatedDamageProfile } from "./save-gated-damage.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./self-transformation-mode.ts";
import { selfTeleportProfile } from "./self-teleport.ts";
import { shieldReactionProfile } from "./shield-reaction.ts";
import { sleepTargetAdmissionProfile } from "./sleep-target-admission.ts";
import { sleetStormAreaHazardProfile } from "./sleet-storm-area-hazard.ts";
import { slowActivePenaltiesProfile } from "./slow-active-penalties.ts";
import { spikeGrowthMovementHazardProfile } from "./spike-growth-movement-hazard.ts";
import { webRestraintHazardProfile } from "./web-restraint-hazard.ts";
import { spellAttackDamageProfile } from "./spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import {
  spellCreatedHeldObjectAttackProfile,
  spellCreatedHeldObjectProfile,
  spellCreatedHeldObjectReEvokeProfile,
} from "./spell-created-held-object.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import {
  spiritualWeaponAttackProxyProfile,
  spiritualWeaponRepeatAttackProfile,
} from "./spiritual-weapon.ts";
import { thaumaturgyBoomingVoiceProfile } from "./thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./warding-bond.ts";
import { weaponAttackOverrideProfile } from "./weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./weapon-damage-rider.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureAdmissionProfile,
  SpellProcedureAnyTargetListInvocationClassifier,
  SpellProcedureMetamagicCompatibility,
} from "./profile.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import type { SpellProcedureExecutionByProcedure } from "../../character-execution.ts";

export function registeredSpellProcedureProfileRegistry() {
  return {
    damageReduction: damageReductionProfile,
    rollModifier: rollModifierProfile,
    makeStable: makeStableProfile,
    heldLight: heldLightProfile,
    heldLightHurl: heldLightHurlProfile,
    objectLight: objectLightProfile,
    thaumaturgyBoomingVoice: thaumaturgyBoomingVoiceProfile,
    blurAttackRollDefense: blurAttackRollDefenseProfile,
    seeInvisibleObserverSight: seeInvisibleObserverSightProfile,
    mirrorImageHitInterception: mirrorImageHitInterceptionProfile,
    persistentArmorEffect: persistentArmorEffectProfile,
    magicWeaponEnhancement: magicWeaponEnhancementProfile,
    wardingBond: wardingBondProfile,
    creatureTypeProtection: creatureTypeProtectionProfile,
    conditionRemovalProtection: conditionRemovalProtectionProfile,
    chosenDamageResistance: chosenDamageResistanceProfile,
    hastePositive: hastePositiveProfile,
    directCondition: directConditionProfile,
    directConditionRemoval: directConditionRemovalProfile,
    conditionImmunityAndTurnStartTemporaryHitPoints:
      conditionImmunityAndTurnStartTemporaryHitPointsProfile,
    creatureSizeIncrease: creatureSizeChangeProfile,
    creatureSizeDecrease: creatureSizeDecreaseProfile,
    levitatedCreature: levitatedCreatureProfile,
    scalarBuff: scalarBuffProfile,
    directHitPointRestoration: directHitPointRestorationProfile,
    expeditiousRetreatDash: expeditiousRetreatDashProfile,
    jumpMovementReplacement: jumpMovementReplacementProfile,
    featherFallMitigation: featherFallMitigationProfile,
    selfTeleport: selfTeleportProfile,
    selfTransformationMode: selfTransformationModeProfile,
    dragonsBreathInitial: dragonsBreathInitialProfile,
    sanctuaryTargetingInterdiction: sanctuaryTargetingInterdictionProfile,
    markedDamageRider: markedDamageRiderProfile,
    weaponDamageRider: weaponDamageRiderProfile,
    afterHitDamage: afterHitDamageProfile,
    afterHitSaveGatedCondition: afterHitSaveGatedConditionProfile,
    afterHitTimedDamageAndSave: afterHitTimedDamageAndSaveProfile,
    afterHitDamageAndIllumination: afterHitDamageAndIlluminationProfile,
    weaponAttackOverride: weaponAttackOverrideProfile,
    spellHostedWeaponAttack: spellHostedWeaponAttackProfile,
    saveGatedDamage: saveGatedDamageProfile,
    saveGatedCondition: saveGatedConditionProfile,
    saveGatedConditionImmunity: saveGatedConditionImmunityProfile,
    saveGatedAttackRollAdvantage: saveGatedAttackRollAdvantageProfile,
    abilityD20TestRollModeSaveGate: abilityD20TestRollModeSaveGateProfile,
    sleepTargetAdmission: sleepTargetAdmissionProfile,
    hideousLaughter: hideousLaughterProfile,
    hypnoticPattern: hypnoticPatternProfile,
    slowActivePenalties: slowActivePenaltiesProfile,
    greaseGroundHazard: greaseGroundHazardProfile,
    gustOfWindLine: gustOfWindLineProfile,
    flamingSphere: flamingSphereProfile,
    moonbeam: moonbeamProfile,
    fogCloudObscurement: fogCloudObscurementProfile,
    spikeGrowthMovementHazard: spikeGrowthMovementHazardProfile,
    webRestraintHazard: webRestraintHazardProfile,
    sleetStormAreaHazard: sleetStormAreaHazardProfile,
    insectPlagueAreaHazard: insectPlagueAreaHazardProfile,
    cloudkillAreaHazard: cloudkillAreaHazardProfile,
    magicalDarknessPointOrigin: magicalDarknessPointOriginProfile,
    antimagicFieldOngoingSpellSuppression:
      antimagicFieldOngoingSpellSuppressionProfile,
    command: commandProfile,
    counterspell: counterspellProfile,
    shieldReaction: shieldReactionProfile,
    spellAttackDamage: spellAttackDamageProfile,
    spellAttackSequence: spellAttackSequenceProfile,
    spellCreatedHeldObject: spellCreatedHeldObjectProfile,
    spellCreatedHeldObjectAttack: spellCreatedHeldObjectAttackProfile,
    spellCreatedHeldObjectReEvoke: spellCreatedHeldObjectReEvokeProfile,
    spiritualWeaponAttackProxy: spiritualWeaponAttackProxyProfile,
    spiritualWeaponRepeatAttack: spiritualWeaponRepeatAttackProfile,
    objectContactDamage: objectContactDamageProfile,
    objectContactDamageRepeat: objectContactDamageRepeatProfile,
    ongoingSpellEnd: ongoingSpellEndProfile,
    chainedSpellAttackDamage: chainedSpellAttackDamageProfile,
    attackBurstSaveDamage: attackBurstSaveDamageProfile,
    repeatedDamageAllocation: repeatedDamageAllocationProfile,
    dancingLightsSeparateCast: dancingLightsSeparateCastProfile,
    dancingLightsCombinedCast: dancingLightsCombinedCastProfile,
    dancingLightsReposition: dancingLightsRepositionProfile,
  } satisfies Record<
    SupportedSpellInvocation["procedure"],
    { readonly procedure: SupportedSpellInvocation["procedure"] }
  >;
}

export type RegisteredSpellProcedureProfiles = ReturnType<
  typeof registeredSpellProcedureProfileRegistry
>;

// A profile schema intentionally may be narrower than the full source
// invocation variant: it decodes only the mechanical facts that the profile's
// admission constructor can produce. Completeness is therefore keyed by the
// procedure discriminant, while soundness requires every decoded value to be
// a valid execution for that key.
type InvalidRegisteredExecutionSchemaVariants = {
  [Procedure in keyof RegisteredSpellProcedureProfiles]: Exclude<
    RegisteredSpellProcedureProfiles[Procedure]["executionSchema"]["Type"],
    SpellProcedureExecutionByProcedure[Procedure]
  >;
}[keyof RegisteredSpellProcedureProfiles];

type RegisteredExecutionSchemaWithAny = {
  [Procedure in keyof RegisteredSpellProcedureProfiles]: 0 extends 1 &
    RegisteredSpellProcedureProfiles[Procedure]["executionSchema"]["Type"]
    ? Procedure
    : never;
}[keyof RegisteredSpellProcedureProfiles];

type RegisteredProfileProcedureMismatch = {
  [Procedure in keyof RegisteredSpellProcedureProfiles]:
    | Exclude<
        RegisteredSpellProcedureProfiles[Procedure]["procedure"],
        Procedure
      >
    | Exclude<
        Procedure,
        RegisteredSpellProcedureProfiles[Procedure]["procedure"]
      >;
}[keyof RegisteredSpellProcedureProfiles];

type RegisteredExecutionSchemaProcedureMismatch = {
  [Procedure in keyof RegisteredSpellProcedureProfiles]:
    | Exclude<
        RegisteredSpellProcedureProfiles[Procedure]["executionSchema"]["Type"]["procedure"],
        Procedure
      >
    | Exclude<
        Procedure,
        RegisteredSpellProcedureProfiles[Procedure]["executionSchema"]["Type"]["procedure"]
      >;
}[keyof RegisteredSpellProcedureProfiles];

type AssertRegisteredExecutionSchemasAreKeyed<T extends never> = T;
export type RegisteredSpellProcedureExecutionSchemaCompletenessCheck =
  AssertRegisteredExecutionSchemasAreKeyed<
    | Exclude<
        SupportedSpellInvocation["procedure"],
        keyof RegisteredSpellProcedureProfiles
      >
    | Exclude<
        keyof RegisteredSpellProcedureProfiles,
        SupportedSpellInvocation["procedure"]
      >
    | InvalidRegisteredExecutionSchemaVariants
    | RegisteredExecutionSchemaWithAny
    | RegisteredProfileProcedureMismatch
    | RegisteredExecutionSchemaProcedureMismatch
  >;

export function registeredSpellProcedureProfiles() {
  return Object.values(registeredSpellProcedureProfileRegistry());
}

export type RegisteredSpellProcedure = keyof RegisteredSpellProcedureProfiles;

type AssertNoMissingSpellProcedure<T extends never> = T;
export type RegisteredSpellProcedureCompletenessCheck =
  AssertNoMissingSpellProcedure<
    Exclude<SupportedSpellInvocation["procedure"], RegisteredSpellProcedure>
  >;

export type RegisteredSpellProcedureClassification = {
  readonly metamagicCompatibility: SpellProcedureMetamagicCompatibility;
  readonly targetListInvocation: SpellProcedureAnyTargetListInvocationClassifier;
  readonly isReadiedSpellCompatible: boolean;
};

export function registeredSpellProcedureProfile(
  procedure: SupportedSpellInvocation["procedure"],
): RegisteredSpellProcedureClassification {
  return registeredSpellProcedureProfileRegistry()[procedure];
}

export function admitRegisteredSpellProcedureProfiles(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SupportedSpellInvocation[] {
  return registeredSpellProcedureProfiles().flatMap((profile) =>
    admissionProfileFor(profile).admit(spell, ctx),
  );
}

function admissionProfileFor(
  profile: SpellProcedureAdmissionProfile,
): SpellProcedureAdmissionProfile {
  return profile;
}

// Typed lookup for callers that have already narrowed by procedure literal.
// Returns the profile with its concrete procedure, invocation, and resolve
// input types preserved.
export function spellProcedureProfileFor<P extends RegisteredSpellProcedure>(
  procedure: P,
): RegisteredSpellProcedureProfiles[P] {
  return registeredSpellProcedureProfileRegistry()[procedure];
}
