import type { SpellCasterRequirements } from "./spell-caster-requirements.ts";
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
import type {
  SpellProcedureExecutionDeclaration,
  SpellProcedureExecutionFields,
} from "./execution-profile.ts";
import type {
  SpellInvocationAdmittedByRegisteredProcedure,
  SpellProcedureAdmissionDeclaration,
} from "./profile.ts";
import type {
  AdmittedSpellProcedureMechanics,
  SpellProcedureMechanicsInspection,
  SpellMechanicsAdmissionSource,
  SpellMechanicsInspectionView,
  SpellProcedureAdmissionIssue,
  SpellProcedureMechanicsFacts,
} from "./spell-mechanics-admission.ts";
import { snapshotBattle } from "../battle-snapshot.ts";
import { executeStoredGlyphSpellProcedure } from "./stored-glyph-resolution.ts";
import {
  glyphDurableOccurrenceAdmission,
  releaseGlyphStoredSpell,
} from "../glyph-durable-occurrence.ts";
import { spawnedCompanionLifecycleAdmission } from "./spawned-companion-lifecycle-admission.ts";
import type {
  StaticSpellMechanicsAdmissionDeclaration,
  StaticSpellMechanicsOwnerKey,
} from "./spell-mechanics-admission.ts";

type RegisteredSpellProcedureInspection<
  P extends BattleSpellProcedureKey,
  Invocation extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Facts extends object,
  Issue extends SpellProcedureAdmissionIssue<P>,
> =
  | Exclude<
      SpellProcedureMechanicsInspection<P, Facts, Invocation, Issue>,
      { readonly tag: "supported" }
    >
  | (Extract<
      SpellProcedureMechanicsInspection<P, Facts, Invocation, Issue>,
      { readonly tag: "supported" }
    > & {
      readonly admitted: {
        readonly casterRequirements: SpellCasterRequirements;
      };
    });

type RegisteredSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
  Invocation extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Facts extends object = object,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = {
  readonly procedure: P;
  readonly execution: SpellProcedureExecutionDeclaration<P>;
} & (
  | {
      readonly admission: {
        readonly kind: "authored";
        /** Context-independent mechanics admission owned by the profile. */
        readonly admitMechanics: (
          source: SpellMechanicsAdmissionSource,
        ) => RegisteredSpellProcedureInspection<P, Invocation, Facts, Issue>;
      };
    }
  | { readonly admission: { readonly kind: "synthesized" } }
);

type SpellProcedureRegistrationSource = {
  readonly procedure: BattleSpellProcedureKey;
} & (
  | {
      readonly admitMechanics: (
        source: SpellMechanicsAdmissionSource,
      ) => SpellMechanicsInspectionView;
    }
  | { readonly admission: "synthesized" }
);

type RegisteredProfileDeclaration<
  Profile extends SpellProcedureRegistrationSource,
> = {
  readonly procedure: Profile["procedure"];
  readonly execution: SpellProcedureExecutionDeclaration<Profile["procedure"]>;
} & (Profile extends {
  readonly admitMechanics: infer Admission extends (
    source: SpellMechanicsAdmissionSource,
  ) => SpellMechanicsInspectionView;
}
  ? {
      readonly admission: {
        readonly kind: "authored";
        readonly admitMechanics: (source: SpellMechanicsAdmissionSource) =>
          | Exclude<ReturnType<Admission>, { readonly tag: "supported" }>
          | (Extract<ReturnType<Admission>, { readonly tag: "supported" }> & {
              readonly admitted: {
                readonly casterRequirements: SpellCasterRequirements;
              };
            });
      };
    }
  : { readonly admission: { readonly kind: "synthesized" } });

function registeredSpellProcedureDeclaration<
  Profile extends SpellProcedureRegistrationSource,
>(
  declaration: Profile &
    SpellProcedureExecutionDeclaration<NoInfer<Profile["procedure"]>> &
    (Profile extends {
      readonly admitMechanics: infer Admission extends (
        source: SpellMechanicsAdmissionSource,
      ) => SpellMechanicsInspectionView;
    }
      ? {
          readonly admitMechanics: (
            source: SpellMechanicsAdmissionSource,
          ) => SpellProcedureMechanicsInspection<
            NoInfer<Profile["procedure"]>,
            object,
            SpellInvocationAdmittedByRegisteredProcedure<
              NoInfer<Profile["procedure"]>
            >,
            SpellProcedureAdmissionIssue<NoInfer<Profile["procedure"]>>
          >;
          readonly casterRequirements: (
            facts: Extract<
              ReturnType<Admission>,
              { readonly tag: "supported" }
            >["admitted"]["facts"],
          ) => SpellCasterRequirements;
        }
      : unknown),
): RegisteredProfileDeclaration<Profile>;

function registeredSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
  Invocation extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Codec extends SpellProcedureExecutionDeclaration<
    NoInfer<P>
  >["executionSchema"],
  Discover extends SpellProcedureExecutionDeclaration<
    NoInfer<P>
  >["discoverCastAct"],
  Resolve extends SpellProcedureExecutionDeclaration<NoInfer<P>>["resolve"],
  Facts extends object = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
>(
  declaration: SpellProcedureExecutionFields<P, Codec, Discover, Resolve> &
    (
      | SpellProcedureAdmissionDeclaration<NoInfer<P>, Invocation, Facts, Issue>
      | { readonly admission: "synthesized" }
    ),
): RegisteredSpellProcedureDeclaration<P, Invocation, Facts, Issue> {
  const execution: SpellProcedureExecutionDeclaration<P> = {
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
      admitMechanics: (source) => {
        const inspection = declaration.admitMechanics(source);
        if (inspection.tag !== "supported") return inspection;
        const admitted: AdmittedSpellProcedureMechanics<
          P,
          Facts,
          Invocation
        > & {
          readonly casterRequirements: SpellCasterRequirements;
        } = {
          ...inspection.admitted,
          casterRequirements: declaration.casterRequirements(
            inspection.admitted.facts,
          ),
        };
        return { tag: "supported", admitted };
      },
    },
    execution,
  };
}

type RegisteredStaticSpellMechanicsDeclaration<
  P extends StaticSpellMechanicsOwnerKey,
  Facts extends object,
  Issue extends SpellProcedureAdmissionIssue<P>,
> = {
  readonly procedure: P;
  readonly admission: {
    readonly kind: "authored";
    readonly admitMechanics: StaticSpellMechanicsAdmissionDeclaration<
      P,
      Facts,
      Issue
    >["admitMechanics"];
  };
};

function registeredStaticSpellMechanicsDeclaration<
  P extends StaticSpellMechanicsOwnerKey,
  Facts extends object,
  Issue extends SpellProcedureAdmissionIssue<P>,
>(
  procedure: P,
  declaration: StaticSpellMechanicsAdmissionDeclaration<P, Facts, Issue>,
): RegisteredStaticSpellMechanicsDeclaration<P, Facts, Issue> {
  return {
    procedure,
    admission: {
      kind: "authored",
      admitMechanics: declaration.admitMechanics,
    },
  };
}

type RegisteredSpellProcedureExecutionDeclarations = {
  readonly [Procedure in BattleSpellProcedureKey]: {
    readonly procedure: Procedure;
    readonly execution: SpellProcedureExecutionDeclaration<Procedure>;
  };
};

const REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS = {
  spawnedCompanionLifecycle: registeredStaticSpellMechanicsDeclaration(
    "spawnedCompanionLifecycle",
    spawnedCompanionLifecycleAdmission,
  ),
  glyphDurableOccurrence: registeredStaticSpellMechanicsDeclaration(
    "glyphDurableOccurrence",
    glyphDurableOccurrenceAdmission,
  ),
} satisfies {
  readonly [Owner in StaticSpellMechanicsOwnerKey]: RegisteredStaticSpellMechanicsDeclaration<
    Owner,
    object,
    SpellProcedureAdmissionIssue<Owner>
  >;
};

export type RegisteredStaticSpellMechanicsDeclarations =
  typeof REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS;

export function registeredStaticSpellMechanicsDeclarations(): RegisteredStaticSpellMechanicsDeclarations {
  return REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS;
}

type DamageReductionRegistration = RegisteredProfileDeclaration<
  typeof damageReductionProfile
>;
const damageReductionRegistration: DamageReductionRegistration =
  registeredSpellProcedureDeclaration<typeof damageReductionProfile>(
    damageReductionProfile,
  );

type RollModifierRegistration = RegisteredProfileDeclaration<
  typeof rollModifierProfile
>;
const rollModifierRegistration: RollModifierRegistration =
  registeredSpellProcedureDeclaration<typeof rollModifierProfile>(
    rollModifierProfile,
  );

type MakeStableRegistration = RegisteredProfileDeclaration<
  typeof makeStableProfile
>;
const makeStableRegistration: MakeStableRegistration =
  registeredSpellProcedureDeclaration<typeof makeStableProfile>(
    makeStableProfile,
  );

type HeldLightRegistration = RegisteredProfileDeclaration<
  typeof heldLightProfile
>;
const heldLightRegistration: HeldLightRegistration =
  registeredSpellProcedureDeclaration<typeof heldLightProfile>(
    heldLightProfile,
  );

type HeldLightHurlRegistration = RegisteredProfileDeclaration<
  typeof heldLightHurlProfile
>;
const heldLightHurlRegistration: HeldLightHurlRegistration =
  registeredSpellProcedureDeclaration<typeof heldLightHurlProfile>(
    heldLightHurlProfile,
  );

type ObjectLightRegistration = RegisteredProfileDeclaration<
  typeof objectLightProfile
>;
const objectLightRegistration: ObjectLightRegistration =
  registeredSpellProcedureDeclaration<typeof objectLightProfile>(
    objectLightProfile,
  );

type TemporaryAbilityCheckRollModeRegistration = RegisteredProfileDeclaration<
  typeof temporaryAbilityCheckRollModeProfile
>;
const temporaryAbilityCheckRollModeRegistration: TemporaryAbilityCheckRollModeRegistration =
  registeredSpellProcedureDeclaration<
    typeof temporaryAbilityCheckRollModeProfile
  >(temporaryAbilityCheckRollModeProfile);

type PerceptionGatedAttackRollDefenseRegistration =
  RegisteredProfileDeclaration<typeof perceptionGatedAttackRollDefenseProfile>;
const perceptionGatedAttackRollDefenseRegistration: PerceptionGatedAttackRollDefenseRegistration =
  registeredSpellProcedureDeclaration<
    typeof perceptionGatedAttackRollDefenseProfile
  >(perceptionGatedAttackRollDefenseProfile);

type SeeInvisibleObserverSightRegistration = RegisteredProfileDeclaration<
  typeof seeInvisibleObserverSightProfile
>;
const seeInvisibleObserverSightRegistration: SeeInvisibleObserverSightRegistration =
  registeredSpellProcedureDeclaration<typeof seeInvisibleObserverSightProfile>(
    seeInvisibleObserverSightProfile,
  );

type DuplicateHitInterceptionRegistration = RegisteredProfileDeclaration<
  typeof duplicateHitInterceptionProfile
>;
const duplicateHitInterceptionRegistration: DuplicateHitInterceptionRegistration =
  registeredSpellProcedureDeclaration<typeof duplicateHitInterceptionProfile>(
    duplicateHitInterceptionProfile,
  );

type PersistentArmorEffectRegistration = RegisteredProfileDeclaration<
  typeof persistentArmorEffectProfile
>;
const persistentArmorEffectRegistration: PersistentArmorEffectRegistration =
  registeredSpellProcedureDeclaration<typeof persistentArmorEffectProfile>(
    persistentArmorEffectProfile,
  );

type WeaponAttackDamageEnhancementRegistration = RegisteredProfileDeclaration<
  typeof weaponAttackDamageEnhancementProfile
>;
const weaponAttackDamageEnhancementRegistration: WeaponAttackDamageEnhancementRegistration =
  registeredSpellProcedureDeclaration<
    typeof weaponAttackDamageEnhancementProfile
  >(weaponAttackDamageEnhancementProfile);

type LinkedDefenseResistanceDamageShareRegistration =
  RegisteredProfileDeclaration<
    typeof linkedDefenseResistanceDamageShareProfile
  >;
const linkedDefenseResistanceDamageShareRegistration: LinkedDefenseResistanceDamageShareRegistration =
  registeredSpellProcedureDeclaration<
    typeof linkedDefenseResistanceDamageShareProfile
  >(linkedDefenseResistanceDamageShareProfile);

type CreatureTypeProtectionRegistration = RegisteredProfileDeclaration<
  typeof creatureTypeProtectionProfile
>;
const creatureTypeProtectionRegistration: CreatureTypeProtectionRegistration =
  registeredSpellProcedureDeclaration<typeof creatureTypeProtectionProfile>(
    creatureTypeProtectionProfile,
  );

type ConditionRemovalProtectionRegistration = RegisteredProfileDeclaration<
  typeof conditionRemovalProtectionProfile
>;
const conditionRemovalProtectionRegistration: ConditionRemovalProtectionRegistration =
  registeredSpellProcedureDeclaration<typeof conditionRemovalProtectionProfile>(
    conditionRemovalProtectionProfile,
  );

type ChosenDamageResistanceRegistration = RegisteredProfileDeclaration<
  typeof chosenDamageResistanceProfile
>;
const chosenDamageResistanceRegistration: ChosenDamageResistanceRegistration =
  registeredSpellProcedureDeclaration<typeof chosenDamageResistanceProfile>(
    chosenDamageResistanceProfile,
  );

type CompositeTargetBuffWithAftermathRegistration =
  RegisteredProfileDeclaration<typeof compositeTargetBuffWithAftermathProfile>;
const compositeTargetBuffWithAftermathRegistration: CompositeTargetBuffWithAftermathRegistration =
  registeredSpellProcedureDeclaration<
    typeof compositeTargetBuffWithAftermathProfile
  >(compositeTargetBuffWithAftermathProfile);

type DirectConditionRegistration = RegisteredProfileDeclaration<
  typeof directConditionProfile
>;
const directConditionRegistration: DirectConditionRegistration =
  registeredSpellProcedureDeclaration<typeof directConditionProfile>(
    directConditionProfile,
  );

type DirectConditionRemovalRegistration = RegisteredProfileDeclaration<
  typeof directConditionRemovalProfile
>;
const directConditionRemovalRegistration: DirectConditionRemovalRegistration =
  registeredSpellProcedureDeclaration<typeof directConditionRemovalProfile>(
    directConditionRemovalProfile,
  );

type ConditionImmunityAndTurnStartTemporaryHitPointsRegistration =
  RegisteredProfileDeclaration<
    typeof conditionImmunityAndTurnStartTemporaryHitPointsProfile
  >;
const conditionImmunityAndTurnStartTemporaryHitPointsRegistration: ConditionImmunityAndTurnStartTemporaryHitPointsRegistration =
  registeredSpellProcedureDeclaration<
    typeof conditionImmunityAndTurnStartTemporaryHitPointsProfile
  >(conditionImmunityAndTurnStartTemporaryHitPointsProfile);

type CreatureSizeIncreaseRegistration = RegisteredProfileDeclaration<
  typeof creatureSizeChangeProfile
>;
const creatureSizeIncreaseRegistration: CreatureSizeIncreaseRegistration =
  registeredSpellProcedureDeclaration<typeof creatureSizeChangeProfile>(
    creatureSizeChangeProfile,
  );

type CreatureSizeDecreaseRegistration = RegisteredProfileDeclaration<
  typeof creatureSizeDecreaseProfile
>;
const creatureSizeDecreaseRegistration: CreatureSizeDecreaseRegistration =
  registeredSpellProcedureDeclaration<typeof creatureSizeDecreaseProfile>(
    creatureSizeDecreaseProfile,
  );

type ControlledVerticalSuspensionRegistration = RegisteredProfileDeclaration<
  typeof controlledVerticalSuspensionProfile
>;
const controlledVerticalSuspensionRegistration: ControlledVerticalSuspensionRegistration =
  registeredSpellProcedureDeclaration<
    typeof controlledVerticalSuspensionProfile
  >(controlledVerticalSuspensionProfile);

type ScalarBuffRegistration = RegisteredProfileDeclaration<
  typeof scalarBuffProfile
>;
const scalarBuffRegistration: ScalarBuffRegistration =
  registeredSpellProcedureDeclaration<typeof scalarBuffProfile>(
    scalarBuffProfile,
  );

type DirectHitPointRestorationRegistration = RegisteredProfileDeclaration<
  typeof directHitPointRestorationProfile
>;
const directHitPointRestorationRegistration: DirectHitPointRestorationRegistration =
  registeredSpellProcedureDeclaration<typeof directHitPointRestorationProfile>(
    directHitPointRestorationProfile,
  );

type GrantedAlternateActionCostRegistration = RegisteredProfileDeclaration<
  typeof grantedAlternateActionCostProfile
>;
const grantedAlternateActionCostRegistration: GrantedAlternateActionCostRegistration =
  registeredSpellProcedureDeclaration<typeof grantedAlternateActionCostProfile>(
    grantedAlternateActionCostProfile,
  );

type FixedCostMovementReplacementRegistration = RegisteredProfileDeclaration<
  typeof fixedCostMovementReplacementProfile
>;
const fixedCostMovementReplacementRegistration: FixedCostMovementReplacementRegistration =
  registeredSpellProcedureDeclaration<
    typeof fixedCostMovementReplacementProfile
  >(fixedCostMovementReplacementProfile);

type FallingCreatureMitigationReactionRegistration =
  RegisteredProfileDeclaration<typeof fallingCreatureMitigationReactionProfile>;
const fallingCreatureMitigationReactionRegistration: FallingCreatureMitigationReactionRegistration =
  registeredSpellProcedureDeclaration<
    typeof fallingCreatureMitigationReactionProfile
  >(fallingCreatureMitigationReactionProfile);

type SelfTeleportRegistration = RegisteredProfileDeclaration<
  typeof selfTeleportProfile
>;
const selfTeleportRegistration: SelfTeleportRegistration =
  registeredSpellProcedureDeclaration<typeof selfTeleportProfile>(
    selfTeleportProfile,
  );

type SelfTransformationModeRegistration = RegisteredProfileDeclaration<
  typeof selfTransformationModeProfile
>;
const selfTransformationModeRegistration: SelfTransformationModeRegistration =
  registeredSpellProcedureDeclaration<typeof selfTransformationModeProfile>(
    selfTransformationModeProfile,
  );

type GrantedAreaSaveDamageActionRegistration = RegisteredProfileDeclaration<
  typeof grantedAreaSaveDamageActionProfile
>;
const grantedAreaSaveDamageActionRegistration: GrantedAreaSaveDamageActionRegistration =
  registeredSpellProcedureDeclaration<
    typeof grantedAreaSaveDamageActionProfile
  >(grantedAreaSaveDamageActionProfile);

type TargetingSaveInterdictionRegistration = RegisteredProfileDeclaration<
  typeof targetingSaveInterdictionProfile
>;
const targetingSaveInterdictionRegistration: TargetingSaveInterdictionRegistration =
  registeredSpellProcedureDeclaration<typeof targetingSaveInterdictionProfile>(
    targetingSaveInterdictionProfile,
  );

type MarkedDamageRiderRegistration = RegisteredProfileDeclaration<
  typeof markedDamageRiderProfile
>;
const markedDamageRiderRegistration: MarkedDamageRiderRegistration =
  registeredSpellProcedureDeclaration<typeof markedDamageRiderProfile>(
    markedDamageRiderProfile,
  );

type WeaponDamageRiderRegistration = RegisteredProfileDeclaration<
  typeof weaponDamageRiderProfile
>;
const weaponDamageRiderRegistration: WeaponDamageRiderRegistration =
  registeredSpellProcedureDeclaration<typeof weaponDamageRiderProfile>(
    weaponDamageRiderProfile,
  );

type AfterHitDamageRegistration = RegisteredProfileDeclaration<
  typeof afterHitDamageProfile
>;
const afterHitDamageRegistration: AfterHitDamageRegistration =
  registeredSpellProcedureDeclaration<typeof afterHitDamageProfile>(
    afterHitDamageProfile,
  );

type AfterHitSaveGatedConditionRegistration = RegisteredProfileDeclaration<
  typeof afterHitSaveGatedConditionProfile
>;
const afterHitSaveGatedConditionRegistration: AfterHitSaveGatedConditionRegistration =
  registeredSpellProcedureDeclaration<typeof afterHitSaveGatedConditionProfile>(
    afterHitSaveGatedConditionProfile,
  );

type AfterHitTimedDamageAndSaveRegistration = RegisteredProfileDeclaration<
  typeof afterHitTimedDamageAndSaveProfile
>;
const afterHitTimedDamageAndSaveRegistration: AfterHitTimedDamageAndSaveRegistration =
  registeredSpellProcedureDeclaration<typeof afterHitTimedDamageAndSaveProfile>(
    afterHitTimedDamageAndSaveProfile,
  );

type AfterHitDamageAndIlluminationRegistration = RegisteredProfileDeclaration<
  typeof afterHitDamageAndIlluminationProfile
>;
const afterHitDamageAndIlluminationRegistration: AfterHitDamageAndIlluminationRegistration =
  registeredSpellProcedureDeclaration<
    typeof afterHitDamageAndIlluminationProfile
  >(afterHitDamageAndIlluminationProfile);

type WeaponAttackOverrideRegistration = RegisteredProfileDeclaration<
  typeof weaponAttackOverrideProfile
>;
const weaponAttackOverrideRegistration: WeaponAttackOverrideRegistration =
  registeredSpellProcedureDeclaration<typeof weaponAttackOverrideProfile>(
    weaponAttackOverrideProfile,
  );

type SpellHostedWeaponAttackRegistration = RegisteredProfileDeclaration<
  typeof spellHostedWeaponAttackProfile
>;
const spellHostedWeaponAttackRegistration: SpellHostedWeaponAttackRegistration =
  registeredSpellProcedureDeclaration<typeof spellHostedWeaponAttackProfile>(
    spellHostedWeaponAttackProfile,
  );

type SaveGatedDamageRegistration = RegisteredProfileDeclaration<
  typeof saveGatedDamageProfile
>;
const saveGatedDamageRegistration: SaveGatedDamageRegistration =
  registeredSpellProcedureDeclaration<typeof saveGatedDamageProfile>(
    saveGatedDamageProfile,
  );

type SaveGatedConditionRegistration = RegisteredProfileDeclaration<
  typeof saveGatedConditionProfile
>;
const saveGatedConditionRegistration: SaveGatedConditionRegistration =
  registeredSpellProcedureDeclaration<typeof saveGatedConditionProfile>(
    saveGatedConditionProfile,
  );

type SaveGatedConditionImmunityRegistration = RegisteredProfileDeclaration<
  typeof saveGatedConditionImmunityProfile
>;
const saveGatedConditionImmunityRegistration: SaveGatedConditionImmunityRegistration =
  registeredSpellProcedureDeclaration<typeof saveGatedConditionImmunityProfile>(
    saveGatedConditionImmunityProfile,
  );

type SaveGatedAttackRollAdvantageRegistration = RegisteredProfileDeclaration<
  typeof saveGatedAttackRollAdvantageProfile
>;
const saveGatedAttackRollAdvantageRegistration: SaveGatedAttackRollAdvantageRegistration =
  registeredSpellProcedureDeclaration<
    typeof saveGatedAttackRollAdvantageProfile
  >(saveGatedAttackRollAdvantageProfile);

type StagedSaveConditionRegistration = RegisteredProfileDeclaration<
  typeof stagedSaveConditionProfile
>;
const stagedSaveConditionRegistration: StagedSaveConditionRegistration =
  registeredSpellProcedureDeclaration<typeof stagedSaveConditionProfile>(
    stagedSaveConditionProfile,
  );

type SaveGatedConditionWithRepeatRegistration = RegisteredProfileDeclaration<
  typeof saveGatedConditionWithRepeatProfile
>;
const saveGatedConditionWithRepeatRegistration: SaveGatedConditionWithRepeatRegistration =
  registeredSpellProcedureDeclaration<
    typeof saveGatedConditionWithRepeatProfile
  >(saveGatedConditionWithRepeatProfile);

type SaveGatedAreaControlRegistration = RegisteredProfileDeclaration<
  typeof saveGatedAreaControlProfile
>;
const saveGatedAreaControlRegistration: SaveGatedAreaControlRegistration =
  registeredSpellProcedureDeclaration<typeof saveGatedAreaControlProfile>(
    saveGatedAreaControlProfile,
  );

type SaveGatedTurnConstraintBundleRegistration = RegisteredProfileDeclaration<
  typeof saveGatedTurnConstraintBundleProfile
>;
const saveGatedTurnConstraintBundleRegistration: SaveGatedTurnConstraintBundleRegistration =
  registeredSpellProcedureDeclaration<
    typeof saveGatedTurnConstraintBundleProfile
  >(saveGatedTurnConstraintBundleProfile);

type PersistentAreaSaveConditionRegistration = RegisteredProfileDeclaration<
  typeof persistentAreaSaveConditionProfile
>;
const persistentAreaSaveConditionRegistration: PersistentAreaSaveConditionRegistration =
  registeredSpellProcedureDeclaration<
    typeof persistentAreaSaveConditionProfile
  >(persistentAreaSaveConditionProfile);

type DirectionalPersistentAreaRegistration = RegisteredProfileDeclaration<
  typeof directionalPersistentAreaProfile
>;
const directionalPersistentAreaRegistration: DirectionalPersistentAreaRegistration =
  registeredSpellProcedureDeclaration<typeof directionalPersistentAreaProfile>(
    directionalPersistentAreaProfile,
  );

type PersistentAreaSaveDamageRegistration = RegisteredProfileDeclaration<
  typeof persistentAreaSaveDamageProfile
>;
const persistentAreaSaveDamageRegistration: PersistentAreaSaveDamageRegistration =
  registeredSpellProcedureDeclaration<typeof persistentAreaSaveDamageProfile>(
    persistentAreaSaveDamageProfile,
  );

type PersistentAreaTraitRegistration = RegisteredProfileDeclaration<
  typeof persistentAreaTraitProfile
>;
const persistentAreaTraitRegistration: PersistentAreaTraitRegistration =
  registeredSpellProcedureDeclaration<typeof persistentAreaTraitProfile>(
    persistentAreaTraitProfile,
  );

type AreaMovementDistanceDamageRegistration = RegisteredProfileDeclaration<
  typeof areaMovementDistanceDamageProfile
>;
const areaMovementDistanceDamageRegistration: AreaMovementDistanceDamageRegistration =
  registeredSpellProcedureDeclaration<typeof areaMovementDistanceDamageProfile>(
    areaMovementDistanceDamageProfile,
  );

type PersistentAreaSaveConditionEscapeRegistration =
  RegisteredProfileDeclaration<typeof persistentAreaSaveConditionEscapeProfile>;
const persistentAreaSaveConditionEscapeRegistration: PersistentAreaSaveConditionEscapeRegistration =
  registeredSpellProcedureDeclaration<
    typeof persistentAreaSaveConditionEscapeProfile
  >(persistentAreaSaveConditionEscapeProfile);

type PersistentAreaSaveCompositeRegistration = RegisteredProfileDeclaration<
  typeof persistentAreaSaveCompositeProfile
>;
const persistentAreaSaveCompositeRegistration: PersistentAreaSaveCompositeRegistration =
  registeredSpellProcedureDeclaration<
    typeof persistentAreaSaveCompositeProfile
  >(persistentAreaSaveCompositeProfile);

type MagicalDarknessPointOriginRegistration = RegisteredProfileDeclaration<
  typeof magicalDarknessPointOriginProfile
>;
const magicalDarknessPointOriginRegistration: MagicalDarknessPointOriginRegistration =
  registeredSpellProcedureDeclaration<typeof magicalDarknessPointOriginProfile>(
    magicalDarknessPointOriginProfile,
  );

type MagicSuppressionEmanationRegistration = RegisteredProfileDeclaration<
  typeof magicSuppressionEmanationProfile
>;
const magicSuppressionEmanationRegistration: MagicSuppressionEmanationRegistration =
  registeredSpellProcedureDeclaration<typeof magicSuppressionEmanationProfile>(
    magicSuppressionEmanationProfile,
  );

type CompelledNextTurnBehaviorRegistration = RegisteredProfileDeclaration<
  typeof compelledNextTurnBehaviorProfile
>;
const compelledNextTurnBehaviorRegistration: CompelledNextTurnBehaviorRegistration =
  registeredSpellProcedureDeclaration<typeof compelledNextTurnBehaviorProfile>(
    compelledNextTurnBehaviorProfile,
  );

type SpellCastInterruptionReactionRegistration = RegisteredProfileDeclaration<
  typeof spellCastInterruptionReactionProfile
>;
const spellCastInterruptionReactionRegistration: SpellCastInterruptionReactionRegistration =
  registeredSpellProcedureDeclaration<
    typeof spellCastInterruptionReactionProfile
  >(spellCastInterruptionReactionProfile);

type TriggeredArmorDefenseRegistration = RegisteredProfileDeclaration<
  typeof triggeredArmorDefenseProfile
>;
const triggeredArmorDefenseRegistration: TriggeredArmorDefenseRegistration =
  registeredSpellProcedureDeclaration<typeof triggeredArmorDefenseProfile>(
    triggeredArmorDefenseProfile,
  );

type SpellAttackDamageRegistration = RegisteredProfileDeclaration<
  typeof spellAttackDamageProfile
>;
const spellAttackDamageRegistration: SpellAttackDamageRegistration =
  registeredSpellProcedureDeclaration<typeof spellAttackDamageProfile>(
    spellAttackDamageProfile,
  );

type SpellAttackSequenceRegistration = RegisteredProfileDeclaration<
  typeof spellAttackSequenceProfile
>;
const spellAttackSequenceRegistration: SpellAttackSequenceRegistration =
  registeredSpellProcedureDeclaration<typeof spellAttackSequenceProfile>(
    spellAttackSequenceProfile,
  );

type SpellCreatedHeldObjectRegistration = RegisteredProfileDeclaration<
  typeof spellCreatedHeldObjectProfile
>;
const spellCreatedHeldObjectRegistration: SpellCreatedHeldObjectRegistration =
  registeredSpellProcedureDeclaration<typeof spellCreatedHeldObjectProfile>(
    spellCreatedHeldObjectProfile,
  );

type SpellCreatedHeldObjectAttackRegistration = RegisteredProfileDeclaration<
  typeof spellCreatedHeldObjectAttackProfile
>;
const spellCreatedHeldObjectAttackRegistration: SpellCreatedHeldObjectAttackRegistration =
  registeredSpellProcedureDeclaration<
    typeof spellCreatedHeldObjectAttackProfile
  >(spellCreatedHeldObjectAttackProfile);

type SpellCreatedHeldObjectReEvokeRegistration = RegisteredProfileDeclaration<
  typeof spellCreatedHeldObjectReEvokeProfile
>;
const spellCreatedHeldObjectReEvokeRegistration: SpellCreatedHeldObjectReEvokeRegistration =
  registeredSpellProcedureDeclaration<
    typeof spellCreatedHeldObjectReEvokeProfile
  >(spellCreatedHeldObjectReEvokeProfile);

type SpatialMeleeSpellAttackProxyRegistration = RegisteredProfileDeclaration<
  typeof spatialMeleeSpellAttackProxyProfile
>;
const spatialMeleeSpellAttackProxyRegistration: SpatialMeleeSpellAttackProxyRegistration =
  registeredSpellProcedureDeclaration<
    typeof spatialMeleeSpellAttackProxyProfile
  >(spatialMeleeSpellAttackProxyProfile);

type ObjectContactDamageRegistration = RegisteredProfileDeclaration<
  typeof objectContactDamageProfile
>;
const objectContactDamageRegistration: ObjectContactDamageRegistration =
  registeredSpellProcedureDeclaration<typeof objectContactDamageProfile>(
    objectContactDamageProfile,
  );

type ObjectContactDamageRepeatRegistration = RegisteredProfileDeclaration<
  typeof objectContactDamageRepeatProfile
>;
const objectContactDamageRepeatRegistration: ObjectContactDamageRepeatRegistration =
  registeredSpellProcedureDeclaration<typeof objectContactDamageRepeatProfile>(
    objectContactDamageRepeatProfile,
  );

type OngoingSpellEndRegistration = RegisteredProfileDeclaration<
  typeof ongoingSpellEndProfile
>;
const ongoingSpellEndRegistration: OngoingSpellEndRegistration =
  registeredSpellProcedureDeclaration<typeof ongoingSpellEndProfile>(
    ongoingSpellEndProfile,
  );

type ChainedSpellAttackDamageRegistration = RegisteredProfileDeclaration<
  typeof chainedSpellAttackDamageProfile
>;
const chainedSpellAttackDamageRegistration: ChainedSpellAttackDamageRegistration =
  registeredSpellProcedureDeclaration<typeof chainedSpellAttackDamageProfile>(
    chainedSpellAttackDamageProfile,
  );

type AttackBurstSaveDamageRegistration = RegisteredProfileDeclaration<
  typeof attackBurstSaveDamageProfile
>;
const attackBurstSaveDamageRegistration: AttackBurstSaveDamageRegistration =
  registeredSpellProcedureDeclaration<typeof attackBurstSaveDamageProfile>(
    attackBurstSaveDamageProfile,
  );

type RepeatedDamageAllocationRegistration = RegisteredProfileDeclaration<
  typeof repeatedDamageAllocationProfile
>;
const repeatedDamageAllocationRegistration: RepeatedDamageAllocationRegistration =
  registeredSpellProcedureDeclaration<typeof repeatedDamageAllocationProfile>(
    repeatedDamageAllocationProfile,
  );

type MovableLightManifestationRegistration = RegisteredProfileDeclaration<
  typeof movableLightManifestationProfile
>;
const movableLightManifestationRegistration: MovableLightManifestationRegistration =
  registeredSpellProcedureDeclaration<typeof movableLightManifestationProfile>(
    movableLightManifestationProfile,
  );

const REGISTERED_INVOCATION_SPELL_PROCEDURE_DECLARATIONS = {
  damageReduction: damageReductionRegistration,
  rollModifier: rollModifierRegistration,
  makeStable: makeStableRegistration,
  heldLight: heldLightRegistration,
  heldLightHurl: heldLightHurlRegistration,
  objectLight: objectLightRegistration,
  temporaryAbilityCheckRollMode: temporaryAbilityCheckRollModeRegistration,
  perceptionGatedAttackRollDefense:
    perceptionGatedAttackRollDefenseRegistration,
  seeInvisibleObserverSight: seeInvisibleObserverSightRegistration,
  duplicateHitInterception: duplicateHitInterceptionRegistration,
  persistentArmorEffect: persistentArmorEffectRegistration,
  weaponAttackDamageEnhancement: weaponAttackDamageEnhancementRegistration,
  linkedDefenseResistanceDamageShare:
    linkedDefenseResistanceDamageShareRegistration,
  creatureTypeProtection: creatureTypeProtectionRegistration,
  conditionRemovalProtection: conditionRemovalProtectionRegistration,
  chosenDamageResistance: chosenDamageResistanceRegistration,
  compositeTargetBuffWithAftermath:
    compositeTargetBuffWithAftermathRegistration,
  directCondition: directConditionRegistration,
  directConditionRemoval: directConditionRemovalRegistration,
  conditionImmunityAndTurnStartTemporaryHitPoints:
    conditionImmunityAndTurnStartTemporaryHitPointsRegistration,
  creatureSizeIncrease: creatureSizeIncreaseRegistration,
  creatureSizeDecrease: creatureSizeDecreaseRegistration,
  controlledVerticalSuspension: controlledVerticalSuspensionRegistration,
  scalarBuff: scalarBuffRegistration,
  directHitPointRestoration: directHitPointRestorationRegistration,
  grantedAlternateActionCost: grantedAlternateActionCostRegistration,
  fixedCostMovementReplacement: fixedCostMovementReplacementRegistration,
  fallingCreatureMitigationReaction:
    fallingCreatureMitigationReactionRegistration,
  selfTeleport: selfTeleportRegistration,
  selfTransformationMode: selfTransformationModeRegistration,
  grantedAreaSaveDamageAction: grantedAreaSaveDamageActionRegistration,
  targetingSaveInterdiction: targetingSaveInterdictionRegistration,
  markedDamageRider: markedDamageRiderRegistration,
  weaponDamageRider: weaponDamageRiderRegistration,
  afterHitDamage: afterHitDamageRegistration,
  afterHitSaveGatedCondition: afterHitSaveGatedConditionRegistration,
  afterHitTimedDamageAndSave: afterHitTimedDamageAndSaveRegistration,
  afterHitDamageAndIllumination: afterHitDamageAndIlluminationRegistration,
  weaponAttackOverride: weaponAttackOverrideRegistration,
  spellHostedWeaponAttack: spellHostedWeaponAttackRegistration,
  saveGatedDamage: saveGatedDamageRegistration,
  saveGatedCondition: saveGatedConditionRegistration,
  saveGatedConditionImmunity: saveGatedConditionImmunityRegistration,
  saveGatedAttackRollAdvantage: saveGatedAttackRollAdvantageRegistration,
  abilityD20TestRollModeSaveGate: registeredSpellProcedureDeclaration(
    abilityD20TestRollModeSaveGateProfile,
  ),
  stagedSaveCondition: stagedSaveConditionRegistration,
  saveGatedConditionWithRepeat: saveGatedConditionWithRepeatRegistration,
  saveGatedAreaControl: saveGatedAreaControlRegistration,
  saveGatedTurnConstraintBundle: saveGatedTurnConstraintBundleRegistration,
  persistentAreaSaveCondition: persistentAreaSaveConditionRegistration,
  directionalPersistentArea: directionalPersistentAreaRegistration,
  persistentAreaSaveDamage: persistentAreaSaveDamageRegistration,
  persistentAreaTrait: persistentAreaTraitRegistration,
  areaMovementDistanceDamage: areaMovementDistanceDamageRegistration,
  persistentAreaSaveConditionEscape:
    persistentAreaSaveConditionEscapeRegistration,
  persistentAreaSaveComposite: persistentAreaSaveCompositeRegistration,
  magicalDarknessPointOrigin: magicalDarknessPointOriginRegistration,
  magicSuppressionEmanation: magicSuppressionEmanationRegistration,
  compelledNextTurnBehavior: compelledNextTurnBehaviorRegistration,
  spellCastInterruptionReaction: spellCastInterruptionReactionRegistration,
  triggeredArmorDefense: triggeredArmorDefenseRegistration,
  spellAttackDamage: spellAttackDamageRegistration,
  spellAttackSequence: spellAttackSequenceRegistration,
  spellCreatedHeldObject: spellCreatedHeldObjectRegistration,
  spellCreatedHeldObjectAttack: spellCreatedHeldObjectAttackRegistration,
  spellCreatedHeldObjectReEvoke: spellCreatedHeldObjectReEvokeRegistration,
  spatialMeleeSpellAttackProxy: spatialMeleeSpellAttackProxyRegistration,
  objectContactDamage: objectContactDamageRegistration,
  objectContactDamageRepeat: objectContactDamageRepeatRegistration,
  ongoingSpellEnd: ongoingSpellEndRegistration,
  chainedSpellAttackDamage: chainedSpellAttackDamageRegistration,
  attackBurstSaveDamage: attackBurstSaveDamageRegistration,
  repeatedDamageAllocation: repeatedDamageAllocationRegistration,
  movableLightManifestation: movableLightManifestationRegistration,
} satisfies RegisteredSpellProcedureExecutionDeclarations;

type RegisteredSpellProcedureDeclarationMap =
  typeof REGISTERED_INVOCATION_SPELL_PROCEDURE_DECLARATIONS &
    typeof REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS;

const REGISTERED_SPELL_PROCEDURE_DECLARATIONS: RegisteredSpellProcedureDeclarations =
  {
    ...REGISTERED_INVOCATION_SPELL_PROCEDURE_DECLARATIONS,
    ...REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS,
  };

export type RegisteredSpellProcedureDeclarations = {
  readonly [P in keyof RegisteredSpellProcedureDeclarationMap]: P extends BattleSpellProcedureKey
    ? Omit<RegisteredSpellProcedureDeclarationMap[P], "execution"> & {
        readonly execution: SpellProcedureExecutionDeclaration<P>;
      }
    : RegisteredSpellProcedureDeclarationMap[P];
};

export function registeredSpellProcedureDeclarations(): RegisteredSpellProcedureDeclarations {
  return REGISTERED_SPELL_PROCEDURE_DECLARATIONS;
}

type RegisteredSpellMechanicsInspection =
  RegisteredSpellProcedureDeclarations[keyof RegisteredSpellProcedureDeclarations]["admission"] extends infer Admission
    ? Admission extends {
        readonly kind: "authored";
        readonly admitMechanics: (
          source: SpellMechanicsAdmissionSource,
        ) => infer Inspection;
      }
      ? Inspection
      : never
    : never;

export type RegisteredSpellProcedureAdmissionIssue = Extract<
  RegisteredSpellMechanicsInspection,
  { readonly tag: "unsupported" }
>["issues"][number];

export type RegisteredAdmittedSpellMechanics = Extract<
  RegisteredSpellMechanicsInspection,
  { readonly tag: "supported" }
>["admitted"];

export type RegisteredAdmittedStaticSpellMechanics = Extract<
  RegisteredAdmittedSpellMechanics,
  { readonly binding: "static" }
>;

type RegisteredStaticSpellMechanicsInspection =
  RegisteredStaticSpellMechanicsDeclarations[keyof RegisteredStaticSpellMechanicsDeclarations]["admission"]["admitMechanics"] extends (
    source: SpellMechanicsAdmissionSource,
  ) => infer Inspection
    ? Inspection
    : never;

export type RegisteredStaticSpellMechanicsAdmissionIssue = Extract<
  RegisteredStaticSpellMechanicsInspection,
  { readonly tag: "unsupported" }
>["issues"][number];

export type RegisteredSpellProcedureMechanicsAdmission = {
  readonly admitMechanics: (
    source: SpellMechanicsAdmissionSource,
  ) => SpellMechanicsInspectionView<
    RegisteredAdmittedSpellMechanics,
    RegisteredSpellProcedureAdmissionIssue
  >;
};

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

export type RegisteredSpellProcedure = BattleSpellProcedureKey;

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
  const declarations: RegisteredSpellProcedureExecutionDeclarations =
    REGISTERED_INVOCATION_SPELL_PROCEDURE_DECLARATIONS;
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
    releaseStoredGlyph: (input) =>
      releaseGlyphStoredSpell({ ...input, executionRegistry: registry }),
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
