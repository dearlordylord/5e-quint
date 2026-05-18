// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE

module characterSheetArmorClassBaseSelectedIdentityMbt {
  var qSourceUnitId: str
  var qBaseSource: str
  var qBaseArmorClass: int
  var qUsesDex: bool
  var qUsesCon: bool
  var qUsesWis: bool
  var qShieldBonus: int
  var qArmorClass: int
  var qLastResult: str

  action recordProjection(
    sourceUnitId: str,
    baseSource: str,
    baseArmorClass: int,
    usesDex: bool,
    usesCon: bool,
    usesWis: bool,
    shieldBonus: int,
    armorClass: int,
    lastResult: str,
  ): bool = all {
    qSourceUnitId' = sourceUnitId,
    qBaseSource' = baseSource,
    qBaseArmorClass' = baseArmorClass,
    qUsesDex' = usesDex,
    qUsesCon' = usesCon,
    qUsesWis' = usesWis,
    qShieldBonus' = shieldBonus,
    qArmorClass' = armorClass,
    qLastResult' = lastResult,
  }

  action init = recordProjection("none", "default_unarmored", 10, true, false, false, 0, 12, "init")

  action doSelectBarbarianUnarmoredDefense = all {
    qLastResult == "init",
    recordProjection("barbarian_unarmored_defense", "unarmored_defense", 10, true, true, false, 0, 13, "selected"),
  }

  action doSelectBarbarianUnarmoredDefenseWithShield = all {
    qLastResult == "init",
    recordProjection("barbarian_unarmored_defense", "unarmored_defense", 10, true, true, false, 2, 15, "selected"),
  }

  action doSelectMonkUnarmoredDefense = all {
    qLastResult == "init",
    recordProjection("monk_unarmored_defense", "unarmored_defense", 10, true, false, true, 0, 15, "selected"),
  }

  action step = any {
    doSelectBarbarianUnarmoredDefense,
    doSelectBarbarianUnarmoredDefenseWithShield,
    doSelectMonkUnarmoredDefense,
  }
}
