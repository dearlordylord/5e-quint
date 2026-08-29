// Canonical procedure-keyed declarations. Admission and execution registries
// project their own views from this table so procedure keys and completeness
// cannot drift into parallel sources of truth.

import { damageReductionProfile } from "./damage-reduction.ts";
import { abilityD20TestRollModeSaveGateProfile } from "./ability-d20-test-roll-mode-save-gate.ts";
import { afterHitDamageAndIlluminationProfile } from "./after-hit-damage-and-illumination.ts";
import { afterHitDamageProfile } from "./after-hit-damage.ts";
import { afterHitSaveGatedConditionProfile } from "./after-hit-save-gated-condition.ts";
import { afterHitTimedDamageAndSaveProfile } from "./after-hit-timed-damage-and-save.ts";
import { magicSuppressionEmanationProfile } from "./antimagic-field-ongoing-spell-suppression.ts";
import { attackBurstSaveDamageProfile } from "./attack-burst-save-damage.ts";
import { perceptionGatedAttackRollDefenseProfile } from "./blur-attack-roll-defense.ts";
import { compelledNextTurnBehaviorProfile } from "./command.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { chosenDamageResistanceProfile } from "./chosen-damage-resistance.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./condition-removal-protection.ts";
import { spellCastInterruptionReactionProfile } from "./counterspell.ts";
import {
  creatureSizeChangeProfile,
  creatureSizeDecreaseProfile,
} from "./creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./creature-type-protection.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { grantedAreaSaveDamageActionProfile } from "./dragons-breath-initial.ts";
import { movableLightManifestationProfile } from "./dancing-lights.ts";
import { grantedAlternateActionCostProfile } from "./expeditious-retreat-dash.ts";
import { fallingCreatureMitigationReactionProfile } from "./feather-fall-mitigation.ts";
import { persistentAreaTraitProfile } from "./fog-cloud-obscurement.ts";
import { persistentAreaSaveConditionProfile } from "./grease-ground-hazard.ts";
import { directionalPersistentAreaProfile } from "./gust-of-wind-line.ts";
import { heldLightHurlProfile } from "./held-light-hurl.ts";
import { heldLightProfile } from "./held-light.ts";
import { compositeTargetBuffWithAftermathProfile } from "./haste-positive.ts";
import { saveGatedConditionWithRepeatProfile } from "./hideous-laughter.ts";
import { saveGatedAreaControlProfile } from "./hypnotic-pattern.ts";
import { fixedCostMovementReplacementProfile } from "./jump-movement-replacement.ts";
import { controlledVerticalSuspensionProfile } from "./levitated-creature.ts";
import { makeStableProfile } from "./make-stable.ts";
import { weaponAttackDamageEnhancementProfile } from "./magic-weapon-enhancement.ts";
import { magicalDarknessPointOriginProfile } from "./magical-darkness-point-origin.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { duplicateHitInterceptionProfile } from "./mirror-image-hit-interception.ts";
import { persistentAreaSaveDamageProfile } from "./persistent-area-save-damage.ts";
import {
  objectContactDamageProfile,
  objectContactDamageRepeatProfile,
} from "./object-contact-damage.ts";
import { objectLightProfile } from "./object-light.ts";
import { ongoingSpellEndProfile } from "./ongoing-spell-end.ts";
import { persistentArmorEffectProfile } from "./persistent-armor-effect.ts";
import { repeatedDamageAllocationProfile } from "./repeated-damage-allocation.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { targetingSaveInterdictionProfile } from "./sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./save-gated-condition.ts";
import { saveGatedDamageProfile } from "./save-gated-damage.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./self-transformation-mode.ts";
import { selfTeleportProfile } from "./self-teleport.ts";
import { triggeredArmorDefenseProfile } from "./shield-reaction.ts";
import { stagedSaveConditionProfile } from "./sleep-target-admission.ts";
import { persistentAreaSaveCompositeProfile } from "./sleet-storm-area-hazard.ts";
import { saveGatedTurnConstraintBundleProfile } from "./slow-active-penalties.ts";
import { areaMovementDistanceDamageProfile } from "./spike-growth-movement-hazard.ts";
import { persistentAreaSaveConditionEscapeProfile } from "./web-restraint-hazard.ts";
import { spellAttackDamageProfile } from "./spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import {
  spellCreatedHeldObjectAttackProfile,
  spellCreatedHeldObjectProfile,
  spellCreatedHeldObjectReEvokeProfile,
} from "./spell-created-held-object.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spiritual-weapon.ts";
import { temporaryAbilityCheckRollModeProfile } from "./thaumaturgy-booming-voice.ts";
import { linkedDefenseResistanceDamageShareProfile } from "./warding-bond.ts";
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
  SynthesizedSpellProcedureDeclaration,
} from "./profile.ts";
import { snapshotBattle } from "../battle-snapshot.ts";
import { executeStoredGlyphSpellProcedure } from "./stored-glyph-resolution.ts";

type RegisteredSpellProcedureDeclaration<
  P extends SupportedSpellInvocation["procedure"],
> = {
  readonly procedure: P;
  readonly execution: SpellProcedureExecutionDeclaration<P>;
} & (
  | {
      readonly admission: {
        readonly kind: "authored";
        readonly admit: SpellProcedureAdmissionDeclaration<
          P,
          SpellInvocationAdmittedByRegisteredProcedure<P>
        >["admit"];
      };
    }
  | { readonly admission: { readonly kind: "synthesized" } }
);

export type RegisteredSpellProcedureDeclarations = {
  readonly [P in SupportedSpellInvocation["procedure"]]: RegisteredSpellProcedureDeclaration<P>;
};

function registeredSpellProcedureDeclaration<
  P extends SupportedSpellInvocation["procedure"],
>(
  declaration:
    | SpellProcedureDeclaration<
        P,
        SpellInvocationAdmittedByRegisteredProcedure<P>
      >
    | SynthesizedSpellProcedureDeclaration<P>,
): RegisteredSpellProcedureDeclaration<P> {
  const execution = {
    procedure: declaration.procedure,
    discoverCastAct: declaration.discoverCastAct,
    executionSchema: declaration.executionSchema,
    resolve: declaration.resolve,
  };
  if ("admission" in declaration) {
    return {
      procedure: declaration.procedure,
      admission: { kind: "synthesized" },
      execution,
    };
  }
  return {
    procedure: declaration.procedure,
    admission: { kind: "authored", admit: declaration.admit },
    execution,
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
    temporaryAbilityCheckRollMode: registeredSpellProcedureDeclaration(
      temporaryAbilityCheckRollModeProfile,
    ),
    perceptionGatedAttackRollDefense: registeredSpellProcedureDeclaration(
      perceptionGatedAttackRollDefenseProfile,
    ),
    seeInvisibleObserverSight: registeredSpellProcedureDeclaration(
      seeInvisibleObserverSightProfile,
    ),
    duplicateHitInterception: registeredSpellProcedureDeclaration(
      duplicateHitInterceptionProfile,
    ),
    persistentArmorEffect: registeredSpellProcedureDeclaration(
      persistentArmorEffectProfile,
    ),
    weaponAttackDamageEnhancement: registeredSpellProcedureDeclaration(
      weaponAttackDamageEnhancementProfile,
    ),
    linkedDefenseResistanceDamageShare: registeredSpellProcedureDeclaration(
      linkedDefenseResistanceDamageShareProfile,
    ),
    creatureTypeProtection: registeredSpellProcedureDeclaration(
      creatureTypeProtectionProfile,
    ),
    conditionRemovalProtection: registeredSpellProcedureDeclaration(
      conditionRemovalProtectionProfile,
    ),
    chosenDamageResistance: registeredSpellProcedureDeclaration(
      chosenDamageResistanceProfile,
    ),
    compositeTargetBuffWithAftermath: registeredSpellProcedureDeclaration(
      compositeTargetBuffWithAftermathProfile,
    ),
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
    controlledVerticalSuspension: registeredSpellProcedureDeclaration(
      controlledVerticalSuspensionProfile,
    ),
    scalarBuff: registeredSpellProcedureDeclaration(scalarBuffProfile),
    directHitPointRestoration: registeredSpellProcedureDeclaration(
      directHitPointRestorationProfile,
    ),
    grantedAlternateActionCost: registeredSpellProcedureDeclaration(
      grantedAlternateActionCostProfile,
    ),
    fixedCostMovementReplacement: registeredSpellProcedureDeclaration(
      fixedCostMovementReplacementProfile,
    ),
    fallingCreatureMitigationReaction: registeredSpellProcedureDeclaration(
      fallingCreatureMitigationReactionProfile,
    ),
    selfTeleport: registeredSpellProcedureDeclaration(selfTeleportProfile),
    selfTransformationMode: registeredSpellProcedureDeclaration(
      selfTransformationModeProfile,
    ),
    grantedAreaSaveDamageAction: registeredSpellProcedureDeclaration(
      grantedAreaSaveDamageActionProfile,
    ),
    targetingSaveInterdiction: registeredSpellProcedureDeclaration(
      targetingSaveInterdictionProfile,
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
    stagedSaveCondition: registeredSpellProcedureDeclaration(
      stagedSaveConditionProfile,
    ),
    saveGatedConditionWithRepeat: registeredSpellProcedureDeclaration(
      saveGatedConditionWithRepeatProfile,
    ),
    saveGatedAreaControl: registeredSpellProcedureDeclaration(
      saveGatedAreaControlProfile,
    ),
    saveGatedTurnConstraintBundle: registeredSpellProcedureDeclaration(
      saveGatedTurnConstraintBundleProfile,
    ),
    persistentAreaSaveCondition: registeredSpellProcedureDeclaration(
      persistentAreaSaveConditionProfile,
    ),
    directionalPersistentArea: registeredSpellProcedureDeclaration(
      directionalPersistentAreaProfile,
    ),
    persistentAreaSaveDamage: registeredSpellProcedureDeclaration(
      persistentAreaSaveDamageProfile,
    ),
    persistentAreaTrait: registeredSpellProcedureDeclaration(
      persistentAreaTraitProfile,
    ),
    areaMovementDistanceDamage: registeredSpellProcedureDeclaration(
      areaMovementDistanceDamageProfile,
    ),
    persistentAreaSaveConditionEscape: registeredSpellProcedureDeclaration(
      persistentAreaSaveConditionEscapeProfile,
    ),
    persistentAreaSaveComposite: registeredSpellProcedureDeclaration(
      persistentAreaSaveCompositeProfile,
    ),
    magicalDarknessPointOrigin: registeredSpellProcedureDeclaration(
      magicalDarknessPointOriginProfile,
    ),
    magicSuppressionEmanation: registeredSpellProcedureDeclaration(
      magicSuppressionEmanationProfile,
    ),
    compelledNextTurnBehavior: registeredSpellProcedureDeclaration(
      compelledNextTurnBehaviorProfile,
    ),
    spellCastInterruptionReaction: registeredSpellProcedureDeclaration(
      spellCastInterruptionReactionProfile,
    ),
    triggeredArmorDefense: registeredSpellProcedureDeclaration(
      triggeredArmorDefenseProfile,
    ),
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
    spatialMeleeSpellAttackProxy: registeredSpellProcedureDeclaration(
      spatialMeleeSpellAttackProxyProfile,
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
    movableLightManifestation: registeredSpellProcedureDeclaration(
      movableLightManifestationProfile,
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
    executionSchema: declaration.executionSchema,
    discoverCastAct: declaration.discoverCastAct,
    resolve: (resolution) => {
      const result = declaration.resolve(resolution, registry);
      return executionResultWithSnapshot(result, resolution.input.state);
    },
  };
}

function executionResultWithSnapshot(
  result: ReturnType<
    RegisteredSpellProcedureExecution<RegisteredSpellProcedure>["resolve"]
  >,
  errorState: Parameters<
    RegisteredSpellProcedureExecution<RegisteredSpellProcedure>["resolve"]
  >[0]["input"]["state"],
) {
  const snapshotState = result.tag === "invalid" ? errorState : result.state;
  return {
    ...result,
    snapshot: snapshotBattle(snapshotState),
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
    resolveStoredGlyph: (resolution) =>
      executionResultWithSnapshot(
        executeStoredGlyphSpellProcedure(resolution, registry),
        resolution.input.state,
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
