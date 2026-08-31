// Canonical procedure-keyed declarations. Admission and execution registries
// project their own views from this table so procedure keys and completeness
// cannot drift into parallel sources of truth.

import { damageReductionProfile } from "./damage-reduction.ts";
import { abilityD20TestRollModeSaveGateProfile } from "./ability-d20-test-roll-mode-save-gate.ts";
import { afterHitDamageAndIlluminationProfile } from "./after-hit-damage-and-illumination.ts";
import { afterHitDamageProfile } from "./after-hit-damage.ts";
import { afterHitSaveGatedConditionProfile } from "./after-hit-save-gated-condition.ts";
import { afterHitTimedDamageAndSaveProfile } from "./after-hit-timed-damage-and-save.ts";
import { magicSuppressionEmanationProfile } from "./magic-suppression-emanation.ts";
import { attackBurstSaveDamageProfile } from "./attack-burst-save-damage.ts";
import { perceptionGatedAttackRollDefenseProfile } from "./perception-gated-attack-roll-defense.ts";
import { compelledNextTurnBehaviorProfile } from "./compelled-next-turn-behavior.ts";
import { chainedSpellAttackDamageProfile } from "./chained-spell-attack-damage.ts";
import { chosenDamageResistanceProfile } from "./chosen-damage-resistance.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./condition-removal-protection.ts";
import { spellCastInterruptionReactionProfile } from "./spell-cast-interruption-reaction.ts";
import {
  creatureSizeChangeProfile,
  creatureSizeDecreaseProfile,
} from "./creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./creature-type-protection.ts";
import { directConditionProfile } from "./direct-condition.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";
import { grantedAreaSaveDamageActionProfile } from "./granted-area-save-damage.ts";
import { movableLightManifestationProfile } from "./movable-illumination-manifestation.ts";
import { grantedAlternateActionCostProfile } from "./bonus-action-dash.ts";
import { fallingCreatureMitigationReactionProfile } from "./falling-creature-mitigation-reaction.ts";
import { persistentAreaTraitProfile } from "./persistent-area-obscurement.ts";
import { persistentAreaSaveConditionProfile } from "./persistent-area-save-condition.ts";
import { directionalPersistentAreaProfile } from "./directional-persistent-area.ts";
import { heldLightHurlProfile } from "./held-light-hurl.ts";
import { heldLightProfile } from "./held-light.ts";
import { compositeTargetBuffWithAftermathProfile } from "./composite-target-buff.ts";
import { saveGatedConditionWithRepeatProfile } from "./staged-save-condition.ts";
import { saveGatedAreaControlProfile } from "./area-control-condition.ts";
import { fixedCostMovementReplacementProfile } from "./fixed-cost-movement-replacement.ts";
import { controlledVerticalSuspensionProfile } from "./levitated-creature.ts";
import { makeStableProfile } from "./make-stable.ts";
import { weaponAttackDamageEnhancementProfile } from "./weapon-attack-enhancement.ts";
import { magicalDarknessPointOriginProfile } from "./magical-darkness-point-origin.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";
import { duplicateHitInterceptionProfile } from "./duplicate-hit-interception.ts";
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
import { targetingSaveInterdictionProfile } from "./targeting-save-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./save-gated-condition.ts";
import { saveGatedDamageProfile } from "./save-gated-damage.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./self-transformation-mode.ts";
import { selfTeleportProfile } from "./self-teleport.ts";
import { triggeredArmorDefenseProfile } from "./triggered-armor-defense.ts";
import { stagedSaveConditionProfile } from "./hit-point-budget-condition-admission.ts";
import { persistentAreaSaveCompositeProfile } from "./persistent-area-save-composite.ts";
import { saveGatedTurnConstraintBundleProfile } from "./save-gated-turn-constraint-bundle.ts";
import { areaMovementDistanceDamageProfile } from "./area-movement-distance-damage.ts";
import { persistentAreaSaveConditionEscapeProfile } from "./persistent-area-save-condition-escape.ts";
import { spellAttackDamageProfile } from "./spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-attack-sequence.ts";
import {
  spellCreatedHeldObjectAttackProfile,
  spellCreatedHeldObjectProfile,
  spellCreatedHeldObjectReEvokeProfile,
} from "./spell-created-held-object.ts";
import { spellHostedWeaponAttackProfile } from "./spell-hosted-weapon-attack.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spatial-melee-spell-attack-proxy.ts";
import { temporaryAbilityCheckRollModeProfile } from "./temporary-ability-check-roll-mode.ts";
import { linkedDefenseResistanceDamageShareProfile } from "./linked-defense-damage-share-profile.ts";
import { weaponAttackOverrideProfile } from "./weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./weapon-damage-rider.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
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
import type { SpellProcedureMechanicsFacts } from "./spell-mechanics-admission.ts";
import { snapshotBattle } from "../battle-snapshot.ts";
import { executeStoredGlyphSpellProcedure } from "./stored-glyph-resolution.ts";

type RegisteredSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
> = {
  readonly procedure: P;
  readonly execution: SpellProcedureExecutionDeclaration<P>;
} & (
  | {
      readonly admission: {
        readonly kind: "authored";
        /** Context-independent mechanics admission owned by the profile. */
        readonly admitMechanics: SpellProcedureAdmissionDeclaration<
          P,
          SpellInvocationAdmittedByRegisteredProcedure<P>,
          Facts
        >["admitMechanics"];
      };
    }
  | { readonly admission: { readonly kind: "synthesized" } }
);

export type RegisteredSpellProcedureDeclarations = {
  readonly [P in BattleSpellProcedureKey]: RegisteredSpellProcedureDeclaration<P>;
};

function registeredSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
>(
  declaration:
    | SpellProcedureDeclaration<
        P,
        SpellInvocationAdmittedByRegisteredProcedure<P>,
        Facts
      >
    | SynthesizedSpellProcedureDeclaration<P>,
): RegisteredSpellProcedureDeclaration<P, Facts> {
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
    admission: {
      kind: "authored",
      admitMechanics: declaration.admitMechanics,
    },
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
    | Exclude<BattleSpellProcedureKey, RegisteredSpellProcedure>
    | Exclude<RegisteredSpellProcedure, BattleSpellProcedureKey>
    | RegisteredDeclarationProcedureMismatch
  >;
