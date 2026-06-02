// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE

module armorClassBase {
  type ArmorClassAbility = DexArmorClassAbility | ConArmorClassAbility | WisArmorClassAbility | ChaArmorClassAbility
  type ArmorClassBaseSource =
    | AbilitySumArmorClassBase({ base: int, abilities: List[ArmorClassAbility] })
    | LightDexArmorClassBase({ base: int })
    | MediumDexMax2ArmorClassBase({ base: int })
    | HeavyFixedArmorClassBase({ armorClass: int })

  type ArmorClassBonus =
    | ShieldArmorClassBonus({ bonus: int, wieldingShield: bool, shieldTraining: bool })

  type ArmorClassFacts = {
    dexterityModifier: int,
    constitutionModifier: int,
    wisdomModifier: int,
    charismaModifier: int,
    baseSource: ArmorClassBaseSource,
    bonuses: List[ArmorClassBonus],
  }

  pure def armorClassAbilityModifier(facts: ArmorClassFacts, ability: ArmorClassAbility): int =
    match ability {
      | DexArmorClassAbility => facts.dexterityModifier
      | ConArmorClassAbility => facts.constitutionModifier
      | WisArmorClassAbility => facts.wisdomModifier
      | ChaArmorClassAbility => facts.charismaModifier
    }

  pure def cappedDexterityModifier(dexterityModifier: int, cap: int): int =
    if (dexterityModifier > cap) cap else dexterityModifier

  pure def baseArmorClassValue(facts: ArmorClassFacts): int =
    match facts.baseSource {
      | AbilitySumArmorClassBase(data) =>
        data.base + data.abilities.foldl(0, (total, ability) =>
          total + armorClassAbilityModifier(facts, ability)
        )
      | LightDexArmorClassBase(data) =>
        data.base + facts.dexterityModifier
      | MediumDexMax2ArmorClassBase(data) =>
        data.base + cappedDexterityModifier(facts.dexterityModifier, 2)
      | HeavyFixedArmorClassBase(data) =>
        data.armorClass
    }

  pure def armorClassBonusValue(bonus: ArmorClassBonus): int =
    match bonus {
      | ShieldArmorClassBonus(data) =>
        if (data.wieldingShield and data.shieldTraining) data.bonus else 0
    }

  pure def currentArmorClass(facts: ArmorClassFacts): int = {
    val total = facts.bonuses.foldl(baseArmorClassValue(facts), (armorClass, bonus) =>
      armorClass + armorClassBonusValue(bonus)
    )
    if (total < 1) 1 else total
  }

  pure def legalArmorClassFacts(facts: ArmorClassFacts): bool = all {
    baseArmorClassValue(facts) > 0,
    facts.bonuses.foldl(true, (legal, bonus) =>
      legal and match bonus {
        | ShieldArmorClassBonus(data) => data.bonus >= 0
      }
    ),
    currentArmorClass(facts) > 0,
  }
}
