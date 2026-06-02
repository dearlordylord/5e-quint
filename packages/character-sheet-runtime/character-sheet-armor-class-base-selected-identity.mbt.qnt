// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE

module characterSheetArmorClassBaseSelectedIdentityMbt {
  import armorClassBase.* from "../shared-algebras/proofs/rule-core/armor-class-base"

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

  pure def armorClassFromFacts(
    dexterityModifier: int,
    baseSource: ArmorClassBaseSource,
    shieldBonus: int,
  ): int =
    currentArmorClass({
      dexterityModifier: dexterityModifier,
      constitutionModifier: 1,
      wisdomModifier: 3,
      charismaModifier: 0,
      baseSource: baseSource,
      bonuses: if (shieldBonus == 0) List() else List(ShieldArmorClassBonus({
        bonus: shieldBonus,
        wieldingShield: true,
        shieldTraining: true,
      })),
    })

  action init = recordProjection(
    "none",
    "default_unarmored",
    10,
    true,
    false,
    false,
    0,
    armorClassFromFacts(
      2,
      AbilitySumArmorClassBase({ base: 10, abilities: List(DexArmorClassAbility) }),
      0,
    ),
    "init",
  )

  action doSelectBarbarianUnarmoredDefense = all {
    qLastResult == "init",
    recordProjection(
      "barbarian_unarmored_defense",
      "unarmored_defense",
      10,
      true,
      true,
      false,
      0,
      armorClassFromFacts(
        2,
        AbilitySumArmorClassBase({
          base: 10,
          abilities: List(DexArmorClassAbility, ConArmorClassAbility),
        }),
        0,
      ),
      "selected",
    ),
  }

  action doSelectBarbarianUnarmoredDefenseWithShield = all {
    qLastResult == "init",
    recordProjection(
      "barbarian_unarmored_defense",
      "unarmored_defense",
      10,
      true,
      true,
      false,
      2,
      armorClassFromFacts(
        2,
        AbilitySumArmorClassBase({
          base: 10,
          abilities: List(DexArmorClassAbility, ConArmorClassAbility),
        }),
        2,
      ),
      "selected",
    ),
  }

  action doSelectMonkUnarmoredDefense = all {
    qLastResult == "init",
    recordProjection(
      "monk_unarmored_defense",
      "unarmored_defense",
      10,
      true,
      false,
      true,
      0,
      armorClassFromFacts(
        2,
        AbilitySumArmorClassBase({
          base: 10,
          abilities: List(DexArmorClassAbility, WisArmorClassAbility),
        }),
        0,
      ),
      "selected",
    ),
  }

  action doProjectLightArmor = all {
    qLastResult == "init",
    recordProjection(
      "armor_leather",
      "armor",
      11,
      true,
      false,
      false,
      0,
      armorClassFromFacts(2, LightDexArmorClassBase({ base: 11 }), 0),
      "selected",
    ),
  }

  action doProjectMediumArmorDexCap = all {
    qLastResult == "init",
    recordProjection(
      "armor_chain_shirt",
      "armor",
      13,
      true,
      false,
      false,
      0,
      armorClassFromFacts(3, MediumDexMax2ArmorClassBase({ base: 13 }), 0),
      "selected",
    ),
  }

  action doProjectHeavyArmorWithShield = all {
    qLastResult == "init",
    recordProjection(
      "armor_chain_mail",
      "armor",
      16,
      false,
      false,
      false,
      2,
      armorClassFromFacts(2, HeavyFixedArmorClassBase({ armorClass: 16 }), 2),
      "selected",
    ),
  }

  action step = any {
    doSelectBarbarianUnarmoredDefense,
    doSelectBarbarianUnarmoredDefenseWithShield,
    doSelectMonkUnarmoredDefense,
    doProjectLightArmor,
    doProjectMediumArmorDexCap,
    doProjectHeavyArmorWithShield,
  }
}
