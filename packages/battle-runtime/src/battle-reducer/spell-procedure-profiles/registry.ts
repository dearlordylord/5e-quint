// Canonical procedure-keyed declarations. Admission and execution registries
// project their own views from this table so procedure keys and completeness
// cannot drift into parallel sources of truth.

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
import type { SupportedSpellInvocation } from "../../battle-state-execution.ts";
import type {
  RegisteredSpellProcedureExecution,
  SpellProcedureExecutionRegistry,
} from "./execution-registry.ts";
import type { SpellProcedureExecutionDeclaration } from "./execution-profile.ts";
import type {
  SpellInvocationAdmittedByRegisteredProcedure,
  SpellProcedureAdmissionDeclaration,
  SpellProcedureDeclaration,
} from "./profile.ts";

type RegisteredSpellProcedureDeclaration<
  P extends SupportedSpellInvocation["procedure"],
> = {
  readonly procedure: P;
  readonly admission: SpellProcedureAdmissionDeclaration<
    P,
    SpellInvocationAdmittedByRegisteredProcedure<P>
  >;
  readonly execution: SpellProcedureExecutionDeclaration<P>;
};

export type RegisteredSpellProcedureDeclarations = {
  readonly [P in SupportedSpellInvocation["procedure"]]: RegisteredSpellProcedureDeclaration<P>;
};

function registeredSpellProcedureDeclaration<
  P extends SupportedSpellInvocation["procedure"],
>(
  declaration: SpellProcedureDeclaration<
    P,
    SpellInvocationAdmittedByRegisteredProcedure<P>
  >,
): RegisteredSpellProcedureDeclaration<P> {
  return {
    procedure: declaration.procedure,
    admission: { admit: declaration.admit },
    execution: {
      procedure: declaration.procedure,
      metamagicCompatibility: declaration.metamagicCompatibility,
      discoverCastAct: declaration.discoverCastAct,
      executionSchema: declaration.executionSchema,
      resolve: declaration.resolve,
    },
  };
}

export function registeredSpellProcedureDeclarations(): RegisteredSpellProcedureDeclarations {
  return {
    damageReduction: registeredSpellProcedureDeclaration(
      damageReductionProfile,
    ),
    rollModifier: registeredSpellProcedureDeclaration(rollModifierProfile),
    makeStable: registeredSpellProcedureDeclaration(makeStableProfile),
    heldLight: registeredSpellProcedureDeclaration(heldLightProfile),
    heldLightHurl: registeredSpellProcedureDeclaration(heldLightHurlProfile),
    objectLight: registeredSpellProcedureDeclaration(objectLightProfile),
    thaumaturgyBoomingVoice: registeredSpellProcedureDeclaration(
      thaumaturgyBoomingVoiceProfile,
    ),
    blurAttackRollDefense: registeredSpellProcedureDeclaration(
      blurAttackRollDefenseProfile,
    ),
    seeInvisibleObserverSight: registeredSpellProcedureDeclaration(
      seeInvisibleObserverSightProfile,
    ),
    mirrorImageHitInterception: registeredSpellProcedureDeclaration(
      mirrorImageHitInterceptionProfile,
    ),
    persistentArmorEffect: registeredSpellProcedureDeclaration(
      persistentArmorEffectProfile,
    ),
    magicWeaponEnhancement: registeredSpellProcedureDeclaration(
      magicWeaponEnhancementProfile,
    ),
    wardingBond: registeredSpellProcedureDeclaration(wardingBondProfile),
    creatureTypeProtection: registeredSpellProcedureDeclaration(
      creatureTypeProtectionProfile,
    ),
    conditionRemovalProtection: registeredSpellProcedureDeclaration(
      conditionRemovalProtectionProfile,
    ),
    chosenDamageResistance: registeredSpellProcedureDeclaration(
      chosenDamageResistanceProfile,
    ),
    hastePositive: registeredSpellProcedureDeclaration(hastePositiveProfile),
    directCondition: registeredSpellProcedureDeclaration(
      directConditionProfile,
    ),
    directConditionRemoval: registeredSpellProcedureDeclaration(
      directConditionRemovalProfile,
    ),
    conditionImmunityAndTurnStartTemporaryHitPoints:
      registeredSpellProcedureDeclaration(
        conditionImmunityAndTurnStartTemporaryHitPointsProfile,
      ),
    creatureSizeIncrease: registeredSpellProcedureDeclaration(
      creatureSizeChangeProfile,
    ),
    creatureSizeDecrease: registeredSpellProcedureDeclaration(
      creatureSizeDecreaseProfile,
    ),
    levitatedCreature: registeredSpellProcedureDeclaration(
      levitatedCreatureProfile,
    ),
    scalarBuff: registeredSpellProcedureDeclaration(scalarBuffProfile),
    directHitPointRestoration: registeredSpellProcedureDeclaration(
      directHitPointRestorationProfile,
    ),
    expeditiousRetreatDash: registeredSpellProcedureDeclaration(
      expeditiousRetreatDashProfile,
    ),
    jumpMovementReplacement: registeredSpellProcedureDeclaration(
      jumpMovementReplacementProfile,
    ),
    featherFallMitigation: registeredSpellProcedureDeclaration(
      featherFallMitigationProfile,
    ),
    selfTeleport: registeredSpellProcedureDeclaration(selfTeleportProfile),
    selfTransformationMode: registeredSpellProcedureDeclaration(
      selfTransformationModeProfile,
    ),
    dragonsBreathInitial: registeredSpellProcedureDeclaration(
      dragonsBreathInitialProfile,
    ),
    sanctuaryTargetingInterdiction: registeredSpellProcedureDeclaration(
      sanctuaryTargetingInterdictionProfile,
    ),
    markedDamageRider: registeredSpellProcedureDeclaration(
      markedDamageRiderProfile,
    ),
    weaponDamageRider: registeredSpellProcedureDeclaration(
      weaponDamageRiderProfile,
    ),
    afterHitDamage: registeredSpellProcedureDeclaration(afterHitDamageProfile),
    afterHitSaveGatedCondition: registeredSpellProcedureDeclaration(
      afterHitSaveGatedConditionProfile,
    ),
    afterHitTimedDamageAndSave: registeredSpellProcedureDeclaration(
      afterHitTimedDamageAndSaveProfile,
    ),
    afterHitDamageAndIllumination: registeredSpellProcedureDeclaration(
      afterHitDamageAndIlluminationProfile,
    ),
    weaponAttackOverride: registeredSpellProcedureDeclaration(
      weaponAttackOverrideProfile,
    ),
    spellHostedWeaponAttack: registeredSpellProcedureDeclaration(
      spellHostedWeaponAttackProfile,
    ),
    saveGatedDamage: registeredSpellProcedureDeclaration(
      saveGatedDamageProfile,
    ),
    saveGatedCondition: registeredSpellProcedureDeclaration(
      saveGatedConditionProfile,
    ),
    saveGatedConditionImmunity: registeredSpellProcedureDeclaration(
      saveGatedConditionImmunityProfile,
    ),
    saveGatedAttackRollAdvantage: registeredSpellProcedureDeclaration(
      saveGatedAttackRollAdvantageProfile,
    ),
    abilityD20TestRollModeSaveGate: registeredSpellProcedureDeclaration(
      abilityD20TestRollModeSaveGateProfile,
    ),
    sleepTargetAdmission: registeredSpellProcedureDeclaration(
      sleepTargetAdmissionProfile,
    ),
    hideousLaughter: registeredSpellProcedureDeclaration(
      hideousLaughterProfile,
    ),
    hypnoticPattern: registeredSpellProcedureDeclaration(
      hypnoticPatternProfile,
    ),
    slowActivePenalties: registeredSpellProcedureDeclaration(
      slowActivePenaltiesProfile,
    ),
    greaseGroundHazard: registeredSpellProcedureDeclaration(
      greaseGroundHazardProfile,
    ),
    gustOfWindLine: registeredSpellProcedureDeclaration(gustOfWindLineProfile),
    flamingSphere: registeredSpellProcedureDeclaration(flamingSphereProfile),
    moonbeam: registeredSpellProcedureDeclaration(moonbeamProfile),
    fogCloudObscurement: registeredSpellProcedureDeclaration(
      fogCloudObscurementProfile,
    ),
    spikeGrowthMovementHazard: registeredSpellProcedureDeclaration(
      spikeGrowthMovementHazardProfile,
    ),
    webRestraintHazard: registeredSpellProcedureDeclaration(
      webRestraintHazardProfile,
    ),
    sleetStormAreaHazard: registeredSpellProcedureDeclaration(
      sleetStormAreaHazardProfile,
    ),
    insectPlagueAreaHazard: registeredSpellProcedureDeclaration(
      insectPlagueAreaHazardProfile,
    ),
    cloudkillAreaHazard: registeredSpellProcedureDeclaration(
      cloudkillAreaHazardProfile,
    ),
    magicalDarknessPointOrigin: registeredSpellProcedureDeclaration(
      magicalDarknessPointOriginProfile,
    ),
    antimagicFieldOngoingSpellSuppression: registeredSpellProcedureDeclaration(
      antimagicFieldOngoingSpellSuppressionProfile,
    ),
    command: registeredSpellProcedureDeclaration(commandProfile),
    counterspell: registeredSpellProcedureDeclaration(counterspellProfile),
    shieldReaction: registeredSpellProcedureDeclaration(shieldReactionProfile),
    spellAttackDamage: registeredSpellProcedureDeclaration(
      spellAttackDamageProfile,
    ),
    spellAttackSequence: registeredSpellProcedureDeclaration(
      spellAttackSequenceProfile,
    ),
    spellCreatedHeldObject: registeredSpellProcedureDeclaration(
      spellCreatedHeldObjectProfile,
    ),
    spellCreatedHeldObjectAttack: registeredSpellProcedureDeclaration(
      spellCreatedHeldObjectAttackProfile,
    ),
    spellCreatedHeldObjectReEvoke: registeredSpellProcedureDeclaration(
      spellCreatedHeldObjectReEvokeProfile,
    ),
    spiritualWeaponAttackProxy: registeredSpellProcedureDeclaration(
      spiritualWeaponAttackProxyProfile,
    ),
    spiritualWeaponRepeatAttack: registeredSpellProcedureDeclaration(
      spiritualWeaponRepeatAttackProfile,
    ),
    objectContactDamage: registeredSpellProcedureDeclaration(
      objectContactDamageProfile,
    ),
    objectContactDamageRepeat: registeredSpellProcedureDeclaration(
      objectContactDamageRepeatProfile,
    ),
    ongoingSpellEnd: registeredSpellProcedureDeclaration(
      ongoingSpellEndProfile,
    ),
    chainedSpellAttackDamage: registeredSpellProcedureDeclaration(
      chainedSpellAttackDamageProfile,
    ),
    attackBurstSaveDamage: registeredSpellProcedureDeclaration(
      attackBurstSaveDamageProfile,
    ),
    repeatedDamageAllocation: registeredSpellProcedureDeclaration(
      repeatedDamageAllocationProfile,
    ),
    dancingLightsSeparateCast: registeredSpellProcedureDeclaration(
      dancingLightsSeparateCastProfile,
    ),
    dancingLightsCombinedCast: registeredSpellProcedureDeclaration(
      dancingLightsCombinedCastProfile,
    ),
    dancingLightsReposition: registeredSpellProcedureDeclaration(
      dancingLightsRepositionProfile,
    ),
  };
}

type RegisteredDeclarationProcedureMismatch = {
  [Procedure in keyof RegisteredSpellProcedureDeclarations]:
    | Exclude<
        RegisteredSpellProcedureDeclarations[Procedure]["procedure"],
        Procedure
      >
    | Exclude<
        Procedure,
        RegisteredSpellProcedureDeclarations[Procedure]["procedure"]
      >;
}[keyof RegisteredSpellProcedureDeclarations];

export type RegisteredSpellProcedure =
  keyof RegisteredSpellProcedureDeclarations;

function registeredSpellProcedureExecution<P extends RegisteredSpellProcedure>(
  declaration: SpellProcedureExecutionDeclaration<P>,
  registry: SpellProcedureExecutionRegistry,
): RegisteredSpellProcedureExecution<P> {
  return {
    procedure: declaration.procedure,
    metamagicCompatibility: declaration.metamagicCompatibility,
    executionSchema: declaration.executionSchema,
    discoverCastAct: declaration.discoverCastAct,
    resolve: (resolution) => declaration.resolve(resolution, registry),
  };
}

export function registeredSpellProcedureExecutions(): SpellProcedureExecutionRegistry {
  const declarations = registeredSpellProcedureDeclarations();
  const registry: SpellProcedureExecutionRegistry = {
    executionFor: (procedure) =>
      registeredSpellProcedureExecution(
        declarations[procedure].execution,
        registry,
      ),
  };
  return registry;
}

type AssertNoMissingSpellProcedure<T extends never> = T;
export type RegisteredSpellProcedureCompletenessCheck =
  AssertNoMissingSpellProcedure<
    | Exclude<SupportedSpellInvocation["procedure"], RegisteredSpellProcedure>
    | Exclude<RegisteredSpellProcedure, SupportedSpellInvocation["procedure"]>
    | RegisteredDeclarationProcedureMismatch
  >;
