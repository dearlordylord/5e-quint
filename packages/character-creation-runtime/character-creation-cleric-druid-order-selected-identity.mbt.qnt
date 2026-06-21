// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_OPTION.PROJECTION

module characterCreationClericDruidOrderSelectedIdentityMbt {
  type CharacterCreationClericDruidOrderSelectedIdentityOutcome =
    | CharacterCreationClericDruidOrderSelectedIdentityInit
    | CharacterCreationClericDruidOrderSelectedIdentityClericProtector
    | CharacterCreationClericDruidOrderSelectedIdentityClericThaumaturge
    | CharacterCreationClericDruidOrderSelectedIdentityDruidMagician
    | CharacterCreationClericDruidOrderSelectedIdentityDruidWarden

  type CharacterCreationClericDruidOrderSelectedIdentityState = {
    outcome: CharacterCreationClericDruidOrderSelectedIdentityOutcome,
    selectedOrderUnitId: str,
    selectedOrderOptionId: str,
    extraCantripUnitId: str,
    selectedOrderOptionCount: int,
    selectedSuborderClassChoiceFeatureCount: int,
    orderUnitRefPresent: bool,
    extraCantripUnitRefPresent: bool,
    martialWeaponProficiencyPresent: bool,
    heavyArmorTrainingPresent: bool,
    mediumArmorTrainingPresent: bool,
    abilityCheckBonusKind: str,
    abilityCheckBonusFeatureCount: int,
    totalLevel: int,
  }

  var qState: CharacterCreationClericDruidOrderSelectedIdentityState

  action recordProjection(
    outcome: CharacterCreationClericDruidOrderSelectedIdentityOutcome,
    selectedOrderUnitId: str,
    selectedOrderOptionId: str,
    extraCantripUnitId: str,
    selectedOrderOptionCount: int,
    selectedSuborderClassChoiceFeatureCount: int,
    orderUnitRefPresent: bool,
    extraCantripUnitRefPresent: bool,
    martialWeaponProficiencyPresent: bool,
    heavyArmorTrainingPresent: bool,
    mediumArmorTrainingPresent: bool,
    abilityCheckBonusKind: str,
    abilityCheckBonusFeatureCount: int,
    totalLevel: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      selectedOrderUnitId: selectedOrderUnitId,
      selectedOrderOptionId: selectedOrderOptionId,
      extraCantripUnitId: extraCantripUnitId,
      selectedOrderOptionCount: selectedOrderOptionCount,
      selectedSuborderClassChoiceFeatureCount: selectedSuborderClassChoiceFeatureCount,
      orderUnitRefPresent: orderUnitRefPresent,
      extraCantripUnitRefPresent: extraCantripUnitRefPresent,
      martialWeaponProficiencyPresent: martialWeaponProficiencyPresent,
      heavyArmorTrainingPresent: heavyArmorTrainingPresent,
      mediumArmorTrainingPresent: mediumArmorTrainingPresent,
      abilityCheckBonusKind: abilityCheckBonusKind,
      abilityCheckBonusFeatureCount: abilityCheckBonusFeatureCount,
      totalLevel: totalLevel,
    },
  }

  action init =
    recordProjection(
      CharacterCreationClericDruidOrderSelectedIdentityInit,
      "none",
      "none",
      "none",
      0,
      0,
      false,
      false,
      false,
      false,
      false,
      "none",
      0,
      1,
    )

  action doSelectClericProtectorOrder = all {
    qState.outcome == CharacterCreationClericDruidOrderSelectedIdentityInit,
    recordProjection(
      CharacterCreationClericDruidOrderSelectedIdentityClericProtector,
      "cleric_divine_order",
      "protector",
      "none",
      1,
      0,
      true,
      false,
      true,
      true,
      true,
      "none",
      0,
      1,
    ),
  }

  action doSelectClericThaumaturgeOrder = all {
    qState.outcome == CharacterCreationClericDruidOrderSelectedIdentityInit,
    recordProjection(
      CharacterCreationClericDruidOrderSelectedIdentityClericThaumaturge,
      "cleric_divine_order",
      "thaumaturge",
      "light",
      1,
      0,
      true,
      true,
      false,
      false,
      true,
      "int_arcana_religion_wis_min1",
      1,
      1,
    ),
  }

  action doSelectDruidMagicianOrder = all {
    qState.outcome == CharacterCreationClericDruidOrderSelectedIdentityInit,
    recordProjection(
      CharacterCreationClericDruidOrderSelectedIdentityDruidMagician,
      "druid_primal_order",
      "magician",
      "guidance",
      1,
      0,
      true,
      true,
      false,
      false,
      false,
      "int_arcana_nature_wis_min1",
      1,
      1,
    ),
  }

  action doSelectDruidWardenOrder = all {
    qState.outcome == CharacterCreationClericDruidOrderSelectedIdentityInit,
    recordProjection(
      CharacterCreationClericDruidOrderSelectedIdentityDruidWarden,
      "druid_primal_order",
      "warden",
      "none",
      1,
      0,
      true,
      false,
      true,
      false,
      true,
      "none",
      0,
      1,
    ),
  }

  action step = any {
    doSelectClericProtectorOrder,
    doSelectClericThaumaturgeOrder,
    doSelectDruidMagicianOrder,
    doSelectDruidWardenOrder,
  }
}
