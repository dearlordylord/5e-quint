// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellDefensiveEffectCore {
  // RAW anchors:
  // - Spells/Descriptions-M-P.md: Mage Armor target admission, base AC
  //   calculation, and early ending when the target dons armor.
  // - Rules-Glossary.md: Armor Class and alternate base AC calculations.
  // - Playing-the-Game.md: Base AC calculation and spell AC modifiers.
  // - Equipment.md: wearing and donning armor.
  // - UBIQUITOUS_LANGUAGE.md: Armor Class and Donning/Doffing.

  type MageArmorDefensiveEffectFacts = {
    willingTarget: bool,
    targetWearingArmor: bool,
    dexterityModifier: int,
  }

  type MageArmorDefensiveEffect =
    | NoMageArmorDefensiveEffect
    | MageArmorActiveDefensiveEffect({ baseArmorClass: int })

  pure def mageArmorBaseArmorClassOffset: int = 13
  pure def mageArmorMinimumDexterityModifier: int = -5
  pure def mageArmorMaximumDexterityModifier: int = 10
  pure def mageArmorMinimumBaseArmorClass: int =
    mageArmorBaseArmorClass(mageArmorMinimumDexterityModifier)
  pure def mageArmorMaximumBaseArmorClass: int =
    mageArmorBaseArmorClass(mageArmorMaximumDexterityModifier)

  pure def mageArmorTargetAdmitted(facts: MageArmorDefensiveEffectFacts): bool =
    facts.willingTarget and not(facts.targetWearingArmor)

  pure def mageArmorDexterityModifierInBounds(dexterityModifier: int): bool = all {
    dexterityModifier >= mageArmorMinimumDexterityModifier,
    dexterityModifier <= mageArmorMaximumDexterityModifier,
  }

  pure def legalMageArmorDefensiveEffectFacts(facts: MageArmorDefensiveEffectFacts): bool =
    mageArmorTargetAdmitted(facts) and mageArmorDexterityModifierInBounds(facts.dexterityModifier)

  pure def mageArmorBaseArmorClass(dexterityModifier: int): int =
    mageArmorBaseArmorClassOffset + dexterityModifier

  pure def resolveMageArmorDefensiveEffect(
    facts: MageArmorDefensiveEffectFacts
  ): MageArmorDefensiveEffect =
    if (legalMageArmorDefensiveEffectFacts(facts)) {
      MageArmorActiveDefensiveEffect({ baseArmorClass: mageArmorBaseArmorClass(facts.dexterityModifier) })
    } else {
      NoMageArmorDefensiveEffect
    }

  pure def endMageArmorDefensiveEffectIfTargetDonsArmor(
    effect: MageArmorDefensiveEffect,
    targetDonsArmor: bool
  ): MageArmorDefensiveEffect =
    if (targetDonsArmor) NoMageArmorDefensiveEffect else effect

  pure def mageArmorDefensiveEffectBaseArmorClass(effect: MageArmorDefensiveEffect): int =
    match effect {
      | MageArmorActiveDefensiveEffect(v) => v.baseArmorClass
      | NoMageArmorDefensiveEffect => 0
    }

  pure def legalMageArmorDefensiveEffect(effect: MageArmorDefensiveEffect): bool =
    match effect {
      | MageArmorActiveDefensiveEffect(v) => all {
          v.baseArmorClass >= mageArmorMinimumBaseArmorClass,
          v.baseArmorClass <= mageArmorMaximumBaseArmorClass,
        }
      | NoMageArmorDefensiveEffect => true
    }
}
