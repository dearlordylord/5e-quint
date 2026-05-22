// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_OPTION.PROJECTION

module characterCreationClericDruidOrderSelectedIdentityMbt {
  var qLastResult: str
  var qSelectedOrderUnitId: str
  var qSelectedOrderOptionId: str
  var qExtraCantripUnitId: str
  var qSelectedOrderOptionCount: int
  var qSelectedSuborderClassChoiceFeatureCount: int
  var qOrderUnitRefPresent: bool
  var qExtraCantripUnitRefPresent: bool
  var qMartialWeaponProficiencyPresent: bool
  var qHeavyArmorTrainingPresent: bool
  var qMediumArmorTrainingPresent: bool
  var qAbilityCheckBonusKind: str
  var qAbilityCheckBonusFeatureCount: int
  var qTotalLevel: int

  action recordProjection(
    lastResult: str,
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
    qLastResult' = lastResult,
    qSelectedOrderUnitId' = selectedOrderUnitId,
    qSelectedOrderOptionId' = selectedOrderOptionId,
    qExtraCantripUnitId' = extraCantripUnitId,
    qSelectedOrderOptionCount' = selectedOrderOptionCount,
    qSelectedSuborderClassChoiceFeatureCount' = selectedSuborderClassChoiceFeatureCount,
    qOrderUnitRefPresent' = orderUnitRefPresent,
    qExtraCantripUnitRefPresent' = extraCantripUnitRefPresent,
    qMartialWeaponProficiencyPresent' = martialWeaponProficiencyPresent,
    qHeavyArmorTrainingPresent' = heavyArmorTrainingPresent,
    qMediumArmorTrainingPresent' = mediumArmorTrainingPresent,
    qAbilityCheckBonusKind' = abilityCheckBonusKind,
    qAbilityCheckBonusFeatureCount' = abilityCheckBonusFeatureCount,
    qTotalLevel' = totalLevel,
  }

  action init =
    recordProjection("init", "none", "none", "none", 0, 0, false, false, false, false, false, "none", 0, 1)

  action doSelectClericProtectorOrder = all {
    qLastResult == "init",
    recordProjection("clericProtector", "cleric_divine_order", "protector", "none", 1, 0, true, false, true, true, true, "none", 0, 1),
  }

  action doSelectClericThaumaturgeOrder = all {
    qLastResult == "init",
    recordProjection("clericThaumaturge", "cleric_divine_order", "thaumaturge", "light", 1, 0, true, true, false, false, true, "int_arcana_religion_wis_min1", 1, 1),
  }

  action doSelectDruidMagicianOrder = all {
    qLastResult == "init",
    recordProjection("druidMagician", "druid_primal_order", "magician", "guidance", 1, 0, true, true, false, false, false, "int_arcana_nature_wis_min1", 1, 1),
  }

  action doSelectDruidWardenOrder = all {
    qLastResult == "init",
    recordProjection("druidWarden", "druid_primal_order", "warden", "none", 1, 0, true, false, true, false, true, "none", 0, 1),
  }

  action step = any {
    doSelectClericProtectorOrder,
    doSelectClericThaumaturgeOrder,
    doSelectDruidMagicianOrder,
    doSelectDruidWardenOrder,
  }
}
