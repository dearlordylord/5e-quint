// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-component-suppression

module battleRuntimeMetamagicSubtle {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeSubtleComponentProjectionResult = {
    verbalSuppressed: bool,
    somaticSuppressed: bool,
    materialSuppressed: bool,
    materialPreserved: bool,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeMaterialComponentRequirement =
    | NoMaterialComponent
    | FocusReplaceableMaterialComponent
    | PricedMaterialComponent
    | ConsumedMaterialComponent
    | ConsumedPricedMaterialComponent
  type BattleRuntimeSpellComponentRequirements = {
    verbal: bool,
    somatic: bool,
    material: BattleRuntimeMaterialComponentRequirement,
  }
  pure def subtleSpellMaterialComponentSuppressed(
    material: BattleRuntimeMaterialComponentRequirement,
  ): bool =
    match material {
      | FocusReplaceableMaterialComponent => true
      | NoMaterialComponent => false
      | PricedMaterialComponent => false
      | ConsumedMaterialComponent => false
      | ConsumedPricedMaterialComponent => false
    }
  pure def subtleSpellMaterialComponentPreserved(
    material: BattleRuntimeMaterialComponentRequirement,
  ): bool =
    match material {
      | PricedMaterialComponent => true
      | ConsumedMaterialComponent => true
      | ConsumedPricedMaterialComponent => true
      | NoMaterialComponent => false
      | FocusReplaceableMaterialComponent => false
    }
  pure def subtleSpellComponentRequirementsAdmitted(
    components: BattleRuntimeSpellComponentRequirements,
  ): bool =
    components.verbal or
    components.somatic or
    components.material != NoMaterialComponent
  pure def subtleSpellCanModifyComponentSpell(
    components: BattleRuntimeSpellComponentRequirements,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(subtleSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    subtleSpellComponentRequirementsAdmitted(components)
  pure def resolveSubtleSpellComponentProjection(
    components: BattleRuntimeSpellComponentRequirements,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeSubtleComponentProjectionResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      subtleSpellCanModifyComponentSpell(
        components,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        verbalSuppressed: components.verbal,
        somaticSuppressed: components.somatic,
        materialSuppressed:
          subtleSpellMaterialComponentSuppressed(components.material),
        materialPreserved:
          subtleSpellMaterialComponentPreserved(components.material),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        verbalSuppressed: false,
        somaticSuppressed: false,
        materialSuppressed: false,
        materialPreserved: false,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
}
