// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE

module characterSheetArmorClassBaseSelectedIdentityMbt {
  import armorClassBase.* from "../shared-algebras/proofs/rule-core/armor-class-base"

  type CharacterSheetArmorClassBaseSelectedIdentityOutcome =
    | CharacterSheetArmorClassBaseSelectedIdentityInit
    | CharacterSheetArmorClassBaseSelectedIdentitySelected

  type CharacterSheetArmorClassBaseSelectedIdentityState = {
    sourceUnitId: str,
    baseSource: str,
    baseArmorClass: int,
    usesDex: bool,
    usesCon: bool,
    usesWis: bool,
    shieldBonus: int,
    armorClass: int,
    outcome: CharacterSheetArmorClassBaseSelectedIdentityOutcome,
  }

  var qState: CharacterSheetArmorClassBaseSelectedIdentityState

  action recordProjection(
    sourceUnitId: str,
    baseSource: str,
    baseArmorClass: int,
    usesDex: bool,
    usesCon: bool,
    usesWis: bool,
    shieldBonus: int,
    armorClass: int,
    outcome: CharacterSheetArmorClassBaseSelectedIdentityOutcome,
  ): bool = all {
    qState' = {
      sourceUnitId: sourceUnitId,
      baseSource: baseSource,
      baseArmorClass: baseArmorClass,
      usesDex: usesDex,
      usesCon: usesCon,
      usesWis: usesWis,
      shieldBonus: shieldBonus,
      armorClass: armorClass,
      outcome: outcome,
    },
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
      CharacterSheetArmorClassBaseSelectedIdentityInit,
    )

  action doSelectBarbarianUnarmoredDefense = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
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
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
    ),
  }

  action doSelectBarbarianUnarmoredDefenseWithShield = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
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
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
    ),
  }

  action doSelectMonkUnarmoredDefense = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
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
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
    ),
  }

  action doProjectLightArmor = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
    recordProjection(
      "armor_leather",
      "armor",
      11,
      true,
      false,
      false,
      0,
      armorClassFromFacts(2, LightDexArmorClassBase({ base: 11 }), 0),
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
    ),
  }

  action doProjectMediumArmorDexCap = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
    recordProjection(
      "armor_chain_shirt",
      "armor",
      13,
      true,
      false,
      false,
      0,
      armorClassFromFacts(3, MediumDexMax2ArmorClassBase({ base: 13 }), 0),
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
    ),
  }

  action doProjectHeavyArmorWithShield = all {
    qState.outcome == CharacterSheetArmorClassBaseSelectedIdentityInit,
    recordProjection(
      "armor_chain_mail",
      "armor",
      16,
      false,
      false,
      false,
      2,
      armorClassFromFacts(2, HeavyFixedArmorClassBase({ armorClass: 16 }), 2),
      CharacterSheetArmorClassBaseSelectedIdentitySelected,
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
